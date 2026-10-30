#!/usr/bin/env python3
"""Run a prompt-matrix style study: subjects x prompt versions x variants, then compare.

A study is a directory holding a study.json:

    {
      "model": "gemini-2.5-flash-image",        optional, this is the default
      "variants": 3,                            images per (subject, version)
      "reference_manifest": "../ref.csv",       optional; style_metrics manifest whose
                                                "book" rows are the target style
      "blocks":   {"NEW_STYLE": "...", ...},    reusable prompt text
      "subjects": {"nell": {"subject": "...", "palette": "...",
                            "aspect": "1:1", "ref": "path/to/style-ref.png"}, ...},
      "versions": {"B2": {"prompt": ["NEW_STYLE", "@subject", "@palette", "NEG"]},
                   "D":  {"prompt": [...], "aspect": "2:3"},
                   "E":  {"prompt": [...], "reference": "@ref"}}
    }

A version's prompt is a list of parts joined by blank lines: a bare name is a block, "@x"
is field x of the subject. Aspect comes from the version, else the subject, else 1:1. A
"reference" image is attached as a style reference (paths relative to study.json).

    style_study.py prompts <study>   write out/<subject>/<version>.prompt.txt, no API calls
    style_study.py run <study>       generate missing images (needs GEMINI_API_KEY)
    style_study.py review <study>    contact sheet per subject + metrics per version

Generation is resumable: existing images are skipped, so a failed run is re-run as-is.
Images land in out/<subject>/<version>-<n>.png; review writes sheet-<subject>.png and
metrics.csv next to study.json.
"""

import argparse
import concurrent.futures as cf
import csv
import json
import sys
import time
from pathlib import Path

import cv2
import numpy as np

sys.path.insert(0, str(Path(__file__).parent))
import style_metrics  # noqa: E402

DEFAULT_MODEL = "gemini-2.5-flash-image"
MAX_TRIES = 3
CELL = 360


def load_study(study_dir: Path):
    cfg = json.loads((study_dir / "study.json").read_text(encoding="utf-8"))
    for key in ("blocks", "subjects", "versions"):
        if key not in cfg:
            sys.exit(f"style_study: study.json has no '{key}'")
    return cfg


def resolve(part, cfg, subject, name):
    if part.startswith("@"):
        field = part[1:]
        if field not in subject:
            sys.exit(f"style_study: subject '{name}' has no field '{field}'")
        return subject[field]
    if part not in cfg["blocks"]:
        sys.exit(f"style_study: no block named '{part}'")
    return cfg["blocks"][part]


def jobs(cfg, study_dir: Path):
    """Yield (subject, version, prompt, aspect, reference-path-or-None)."""
    for sname, subj in cfg["subjects"].items():
        for vname, ver in cfg["versions"].items():
            prompt = "\n\n".join(resolve(p, cfg, subj, sname) for p in ver["prompt"])
            aspect = ver.get("aspect") or subj.get("aspect") or "1:1"
            ref = ver.get("reference")
            if ref:
                ref = resolve(ref, cfg, subj, sname) if ref.startswith("@") else ref
                ref = (study_dir / ref).resolve()
                if not ref.is_file():
                    sys.exit(f"style_study: reference not found: {ref}")
            yield sname, vname, prompt, aspect, ref


def write_prompts(cfg, study_dir: Path):
    out = study_dir / "out"
    for sname, vname, prompt, aspect, ref in jobs(cfg, study_dir):
        d = out / sname
        d.mkdir(parents=True, exist_ok=True)
        meta = f"\n\n[aspect: {aspect}]" + (f"\n[reference: {ref.name}]" if ref else "")
        (d / f"{vname}.prompt.txt").write_text(prompt + meta + "\n", encoding="utf-8")
    print(f"style_study: prompts written under {out}")


def generate_one(client, types, model, prompt, aspect, ref, dest: Path):
    contents = [prompt]
    if ref:
        mime = "image/png" if ref.suffix.lower() == ".png" else "image/jpeg"
        contents.append(types.Part.from_bytes(data=ref.read_bytes(), mime_type=mime))
    cfg = types.GenerateContentConfig(response_modalities=["IMAGE"],
                                      image_config=types.ImageConfig(aspect_ratio=aspect))
    err = "no image returned"
    for attempt in range(1, MAX_TRIES + 1):
        try:
            r = client.models.generate_content(model=model, contents=contents, config=cfg)
            for part in r.candidates[0].content.parts:
                if getattr(part, "inline_data", None) and part.inline_data.data:
                    dest.write_bytes(part.inline_data.data)
                    return f"ok   {dest.parent.name}/{dest.name}"
        except Exception as e:  # transient 5xx / quota; retried with backoff
            err = str(e)[:200]
        time.sleep(3 * attempt)
    return f"FAIL {dest.parent.name}/{dest.name}: {err}"


def run(cfg, study_dir: Path, workers: int):
    try:
        from google import genai
        from google.genai import types
    except ImportError:
        sys.exit("style_study: google-genai not installed: "
                 "uv pip install --python ~/work/bin/python google-genai")
    write_prompts(cfg, study_dir)
    client = genai.Client()
    model = cfg.get("model", DEFAULT_MODEL)
    n = int(cfg.get("variants", 3))
    todo = []
    for sname, vname, prompt, aspect, ref in jobs(cfg, study_dir):
        for i in range(1, n + 1):
            dest = study_dir / "out" / sname / f"{vname}-{i}.png"
            if not dest.exists():
                todo.append((prompt, aspect, ref, dest))
    print(f"style_study: {len(todo)} image(s) to generate with {model}")
    with cf.ThreadPoolExecutor(workers) as ex:
        futs = [ex.submit(generate_one, client, types, model, *t) for t in todo]
        for f in cf.as_completed(futs):
            print(f.result(), flush=True)


def contact_sheets(cfg, study_dir: Path):
    n = int(cfg.get("variants", 3))
    versions = list(cfg["versions"])
    for sname in cfg["subjects"]:
        sheet = np.full((len(versions) * CELL, 70 + n * CELL, 3), 255, np.uint8)
        for r, v in enumerate(versions):
            cv2.putText(sheet, v, (8, r * CELL + CELL // 2), cv2.FONT_HERSHEY_SIMPLEX,
                        1.0, (0, 0, 0), 2)
            for c in range(n):
                f = study_dir / "out" / sname / f"{v}-{c + 1}.png"
                img = cv2.imread(str(f)) if f.exists() else None
                if img is None:
                    continue
                s = (CELL - 8) / max(img.shape[:2])
                t = cv2.resize(img, (int(img.shape[1] * s), int(img.shape[0] * s)),
                               interpolation=cv2.INTER_AREA)
                y, x = r * CELL, 70 + c * CELL
                sheet[y:y + t.shape[0], x:x + t.shape[1]] = t
        out = study_dir / f"sheet-{sname}.png"
        cv2.imwrite(str(out), sheet)
        print(f"style_study: {out}")


def review(cfg, study_dir: Path):
    contact_sheets(cfg, study_dir)
    rows = []
    ref = cfg.get("reference_manifest")
    if ref:
        man = (study_dir / ref).resolve()
        root = man.parent.parent
        for r in csv.DictReader(man.open()):
            if r["group"] == "book":
                rows.append(("0-book", root / r["path"], r.get("crop")))
    for f in sorted((study_dir / "out").glob("*/*.png")):
        rows.append((f.stem.rsplit("-", 1)[0], f, None))
    if not rows:
        sys.exit("style_study: nothing to measure — run the study first")

    results = []
    for group, path, crop in rows:
        m = style_metrics.measure(style_metrics.load(path, crop))
        results.append({"group": group, "file": f"{path.parent.name}/{path.name}", **m})
    with open(study_dir / "metrics.csv", "w", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=list(results[0]))
        w.writeheader()
        w.writerows(results)

    keys = [k for k in results[0] if k not in ("group", "file")]
    print(f"{'group':10}" + "".join(f"{k:>11}" for k in keys))
    for g in sorted({r["group"] for r in results}):
        sub = [r for r in results if r["group"] == g]
        print(f"{g:10}" + "".join(f"{np.mean([float(r[k]) for r in sub]):11.3f}" for k in keys))
    print(f"style_study: per-image numbers in {study_dir / 'metrics.csv'}")


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("command", choices=["prompts", "run", "review"])
    ap.add_argument("study", help="study directory containing study.json")
    ap.add_argument("--workers", type=int, default=6, help="parallel API calls for run")
    args = ap.parse_args()
    study_dir = Path(args.study).resolve()
    cfg = load_study(study_dir)
    if args.command == "prompts":
        write_prompts(cfg, study_dir)
    elif args.command == "run":
        run(cfg, study_dir, args.workers)
    else:
        review(cfg, study_dir)


if __name__ == "__main__":
    main()
