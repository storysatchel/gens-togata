#!/usr/bin/env python3
"""Generate an NPC portrait with Gemini 2.5 Flash Image ("Nano Banana").

A thin, reliable wrapper around the image model. The caller writes the prompt (the
creative work); this script handles the API call, the on-disk layout, and errors.

It owns a per-adventure layout so the current face is always one grab from the top:

    <adventure-dir>/image/
        <npc>.png              current portrait (the latest generation, auto-promoted)
        source/
            <npc>-v1.png ...   superseded portraits and extra variants
            <actor>.jpg        reference images you drop in for -r

    # text-to-image; writes image/tilda-merrick.png (old one archived to source/)
    ~/work/bin/python cast-npc.py -a ../ashfall -npc "Tilda Merrick" -p "Candid film ..."

    # 3 variants: first becomes current, the rest land in source/ as -vN
    ~/work/bin/python cast-npc.py -a ../ashfall.md --npc tilda -n 3 -p "..."

    # restyle reference images you placed in image/source/ (image-to-image)
    ~/work/bin/python cast-npc.py -a ../ashfall --npc tilda \
        -r ../ashfall/image/source/mckenzie.jpg -p "Keep this face. Restyle as ..."

    # tall 2:3 plate; the returned image is checked against the requested ratio
    ~/work/bin/python cast-npc.py -a ../ashfall --npc tilda --aspect 2:3 -p "..."

    # promote a chosen variant (or a manual download) to current, no generation
    ~/work/bin/python cast-npc.py -a ../ashfall --npc tilda --promote tilda-v2.png

    # prep route (free, no API): save the prompt to generate by hand in the Gemini app
    ~/work/bin/python cast-npc.py -a ../ashfall --npc tilda --prep -p "..."

Generation requires GEMINI_API_KEY (or GOOGLE_API_KEY) on a billing-enabled project and
google-genai in the interpreter; --prep and --promote need neither.

"""
import argparse
import base64
import mimetypes
import os
import re
import shutil
import sys
import time
from pathlib import Path

DEFAULT_MODEL = "gemini-2.5-flash-image"
MAX_TRIES = 3
ASPECTS = ["1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"]
# The model snaps to its own pixel grid (2:3 comes back 832x1248), so allow a little slack.
ASPECT_TOLERANCE = 0.03


def die(msg: str, code: int = 1) -> "None":
    print(f"cast-npc: {msg}", file=sys.stderr)
    sys.exit(code)


def slugify(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.strip().lower()).strip("-")
    return slug or die("could not derive a filename slug from --npc")


def adventure_dir(arg: str) -> Path:
    """Accept the module directory or its .md file; return the directory."""
    p = Path(arg)
    return p.parent if p.suffix.lower() == ".md" else p


def layout(adv: Path, slug: str):
    base = adv / "image"
    source = base / "source"
    base.mkdir(parents=True, exist_ok=True)
    source.mkdir(exist_ok=True)
    return base, source, base / f"{slug}.png"


def next_variant_path(source: Path, slug: str) -> Path:
    used = [
        int(m.group(1))
        for f in source.glob(f"{slug}-v*.png")
        if (m := re.fullmatch(rf"{re.escape(slug)}-v(\d+)", f.stem))
    ]
    return source / f"{slug}-v{(max(used) + 1) if used else 1}.png"


def archive_current(current: Path, source: Path, slug: str):
    """Move an existing current portrait into source/ as the next -vN, keeping history."""
    if current.exists():
        shutil.move(str(current), str(next_variant_path(source, slug)))


def read_prompt(args) -> str:
    if args.prompt:
        return args.prompt
    if args.prompt_file:
        return Path(args.prompt_file).read_text(encoding="utf-8").strip()
    if not sys.stdin.isatty():
        text = sys.stdin.read().strip()
        if text:
            return text
    die("no prompt: pass -p/--prompt, --prompt-file, or pipe it on stdin")


def load_reference_parts(paths, types):
    parts = []
    for p in paths:
        path = Path(p)
        if not path.is_file():
            die(f"reference image not found: {p}")
        mime = mimetypes.guess_type(path.name)[0] or "image/png"
        parts.append(types.Part.from_bytes(data=path.read_bytes(), mime_type=mime))
    return parts


def extract_image(response):
    """Return image bytes from the first inline_data part, or (None, text)."""
    texts = []
    for cand in (getattr(response, "candidates", None) or []):
        content = getattr(cand, "content", None)
        for part in (getattr(content, "parts", None) or []):
            inline = getattr(part, "inline_data", None)
            if inline and getattr(inline, "data", None):
                data = inline.data
                if isinstance(data, str):  # some SDK versions return base64
                    data = base64.b64decode(data)
                return data, None
            if getattr(part, "text", None):
                texts.append(part.text)
    return None, "\n".join(texts).strip()


def image_size(data: bytes):
    """(width, height) of image bytes, or None if Pillow is missing or can't read them."""
    try:
        import io
        from PIL import Image
        return Image.open(io.BytesIO(data)).size
    except Exception:
        return None


def check_aspect(data: bytes, aspect: str, dest: Path):
    size = image_size(data)
    if size is None:
        print(f"cast-npc: could not read {dest.name} to check its aspect ratio", file=sys.stderr)
        return
    w, h = size
    want_w, want_h = (int(v) for v in aspect.split(":"))
    want, got = want_w / want_h, w / h
    if abs(got - want) / want > ASPECT_TOLERANCE:
        print(f"cast-npc: WARNING {dest.name} is {w}x{h} ({got:.2f}), not the requested "
              f"{aspect} ({want:.2f})", file=sys.stderr)


def generate(client, model, contents, config=None):
    last_err = None
    for attempt in range(1, MAX_TRIES + 1):
        try:
            return client.models.generate_content(model=model, contents=contents, config=config)
        except Exception as e:  # transient 5xx / network / quota backoff
            last_err = e
            if attempt < MAX_TRIES:
                time.sleep(2 * attempt)
    die(f"API call failed after {MAX_TRIES} tries: {last_err}")


def promote(source: Path, current: Path, slug: str, chosen: str):
    src = Path(chosen)
    if not src.is_absolute() and not src.exists():
        src = source / chosen
    if not src.is_file():
        die(f"variant to promote not found: {chosen}")
    if src.resolve() == current.resolve():
        die("that image is already the current portrait")
    archive_current(current, source, slug)
    shutil.move(str(src), str(current))
    print(current)


def main():
    ap = argparse.ArgumentParser(description="Generate an NPC portrait via Gemini 2.5 Flash Image.")
    ap.add_argument("-a", "--adventure", required=True,
                    help="adventure directory or its .md file; portraits go in <dir>/image/")
    ap.add_argument("--npc", required=True, help="NPC name; slugified for filenames")
    ap.add_argument("-p", "--prompt", help="the image prompt")
    ap.add_argument("--prompt-file", help="read the prompt from this file instead")
    ap.add_argument("-r", "--reference", action="append", default=[],
                    help="reference image to restyle (repeatable); enables image-to-image")
    ap.add_argument("-n", "--variants", type=int, default=1, help="how many images to generate")
    ap.add_argument("--promote", metavar="FILE",
                    help="promote a source/ image to current (no generation)")
    ap.add_argument("--prep", action="store_true",
                    help="set up the layout and save the prompt for manual generation in "
                         "the Gemini app (no API call; use with AI Pro)")
    ap.add_argument("--aspect", choices=ASPECTS,
                    help="output aspect ratio, e.g. 2:3; the result is checked against it "
                         "(default: the model's choice — square, or the reference's shape)")
    ap.add_argument("--model", default=DEFAULT_MODEL, help=f"model id (default {DEFAULT_MODEL})")
    args = ap.parse_args()

    slug = slugify(args.npc)
    base, source, current = layout(adventure_dir(args.adventure), slug)

    if args.promote:
        promote(source, current, slug, args.promote)
        return

    if args.prep:
        prompt_file = source / f"{slug}.prompt.txt"
        prompt_file.write_text(read_prompt(args) + "\n", encoding="utf-8")
        print(prompt_file.read_text(encoding="utf-8"), end="")
        print(f"cast-npc: prompt saved -> {prompt_file}\n"
              f"  1. paste it into the Gemini app / AI Studio (covered by AI Pro)\n"
              + (f"     choose aspect ratio {args.aspect} there\n" if args.aspect else "")
              + f"  2. save the downloaded image into {source}/\n"
              f"  3. promote it:  cast-npc.py -a {args.adventure!r} --npc {args.npc!r} "
              f"--promote <file>", file=sys.stderr)
        return

    if not (os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")):
        die("set GEMINI_API_KEY (from Google AI Studio) in the environment first")
    try:
        from google import genai
        from google.genai import types
    except ImportError:
        die("google-genai not installed for this interpreter: "
            "uv pip install --python ~/work/bin/python google-genai")

    contents = [read_prompt(args), *load_reference_parts(args.reference, types)]
    client = genai.Client()
    config = None
    if args.aspect:
        config = types.GenerateContentConfig(
            image_config=types.ImageConfig(aspect_ratio=args.aspect))

    for i in range(1, args.variants + 1):
        image, text = extract_image(generate(client, args.model, contents, config))
        if image is None:
            note = f" Model said: {text}" if text else ""
            die(f"no image returned (variant {i}) — likely refused or filtered.{note}", code=2)
        if i == 1:
            archive_current(current, source, slug)  # old current -> source/<slug>-vN.png
            dest = current
        else:
            dest = next_variant_path(source, slug)
        dest.write_bytes(image)
        print(dest)
        if args.aspect:
            check_aspect(image, args.aspect, dest)

    extra = f" ({args.variants - 1} variant(s) in {source}/)" if args.variants > 1 else ""
    print(f"cast-npc: current portrait -> {current}{extra}", file=sys.stderr)


if __name__ == "__main__":
    main()
