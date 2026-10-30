#!/usr/bin/env python3
"""Generate a landscape-letter character card sheet from an adventure Markdown file.

Reads a section (default `## Pregens`), pulls the chosen fields (default
Look / Bio / Vice) from each `###` character block, and writes an HTML sheet
that render-cards.sh turns into a one-page PDF.

    ~/work/bin/python gen-cards.py ../blades_68/the-heros-return.md
        -> ../blades_68/the-heros-return-cards.html

    # reproduce the hand-made layout order:
    ~/work/bin/python gen-cards.py ../blades_68/the-heros-return.md \\
        --order Zen,Doc,Sarge,Tavi,Wren,Cass
"""
import argparse
import html
import re
import sys
from pathlib import Path

# --- whitespace / one-page-fit knobs (edit and re-run) ---
CSS = """
  :root{
    --page-margin: 0.40in;
    --gap: 0.14in;
    --pad: 0.10in;
    --body: 8.6pt;      /* main fit dial */
    --lh: 1.16;
    --name: 14pt;
    --ink: #111;
    --rule: #bdbdbd;
  }
  @page { size: letter landscape; margin: var(--page-margin); }
  *{ box-sizing: border-box; }
  html,body{ margin:0; padding:0; }
  body{
    font-family: "Libre Franklin", "Franklin Gothic", Arial, sans-serif;
    color: var(--ink); font-size: var(--body); line-height: var(--lh);
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .sheet{
    display: grid; grid-template-columns: 1fr 1fr; grid-auto-rows: 1fr;
    gap: var(--gap); height: 100vh;
  }
  @media screen { .sheet{ height: 7.7in; width: 10.2in; margin: 0 auto; } }
  .card{ padding: var(--pad) var(--pad) var(--pad) 0; border-top: 0.6pt solid var(--rule); }
  .card:nth-child(odd){ padding-right: calc(var(--pad) + 0.10in); border-right: 0.6pt solid var(--rule); }
  .card:nth-child(-n+2){ border-top: none; }
  .name{
    font-family: "Anton", "Franklin Gothic", Impact, sans-serif; font-weight: 400;
    font-size: var(--name); line-height: 1.0; letter-spacing: .2px; margin: 0 0 .06in 0;
  }
  ul{ margin:0; padding-left: .14in; }
  li{ margin: 0 0 .045in 0; }
  li:last-child{ margin-bottom:0; }
  .lbl{ font-weight: 700; }
  b{ font-weight: 700; } em{ font-style: italic; }
"""


def md_inline(text: str) -> str:
    """Escape HTML, then convert **bold** and *italic* to tags."""
    text = html.escape(text, quote=False)
    text = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", text)
    text = re.sub(r"\*(.+?)\*", r"<em>\1</em>", text)
    return text


def parse_cards(md: str, section: str, fields: list[str]) -> list[dict]:
    """Return [{'name': ..., <field>: ..., ...}] for each ### block in a section."""
    m = re.search(
        rf"^## {re.escape(section)}\b.*?(?=^## |\Z)", md, re.S | re.M
    )
    if not m:
        sys.exit(f"Could not find a '## {section}' section.")
    cards = []
    for block in re.split(r"^### ", m.group(0), flags=re.M)[1:]:
        lines = block.splitlines()
        card = {"name": lines[0].strip()}
        for line in lines[1:]:
            fm = re.match(r"\s*-\s*\*\*(\w[\w ]*?):\*\*\s*(.*)", line)
            if fm and fm.group(1) in fields:
                card[fm.group(1)] = fm.group(2).strip()
        cards.append(card)
    return cards


def apply_order(cards: list[dict], keys: list[str]) -> list[dict]:
    """Reorder by substring match on the card name; unlisted keep document order."""
    if not keys:
        return cards
    ranked = []
    for key in keys:
        hit = next(
            (c for c in cards if key.lower() in c["name"].lower() and c not in ranked),
            None,
        )
        if hit:
            ranked.append(hit)
    ranked += [c for c in cards if c not in ranked]
    return ranked


def render_card(card: dict, fields: list[str]) -> str:
    items = [
        f'        <li><span class="lbl">{f}:</span> {md_inline(card[f])}</li>'
        for f in fields
        if f in card
    ]
    lis = "\n".join(items)
    return (
        '    <article class="card">\n'
        f'      <h2 class="name">{md_inline(card["name"])}</h2>\n'
        f"      <ul>\n{lis}\n      </ul>\n"
        "    </article>"
    )


def build_html(cards: list[dict], fields: list[str], title: str) -> str:
    body = "\n\n".join(render_card(c, fields) for c in cards)
    return (
        '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
        f"<title>{html.escape(title)}</title>\n"
        f"<style>{CSS}</style>\n</head>\n<body>\n"
        f'  <section class="sheet">\n\n{body}\n\n  </section>\n</body>\n</html>\n'
    )


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("source", type=Path, help="adventure Markdown file")
    ap.add_argument(
        "dest",
        type=Path,
        nargs="?",
        help="output HTML (default: <source>-cards.html)",
    )
    ap.add_argument("--section", default="Pregens", help="H2 section to read")
    ap.add_argument(
        "--fields", default="Look,Bio,Vice", help="comma-separated fields, in card order"
    )
    ap.add_argument(
        "--order",
        default="",
        help="comma-separated name substrings for card layout order (default: document order)",
    )
    ap.add_argument("--title", help="HTML <title> (default: from source filename)")
    args = ap.parse_args()

    dest = args.dest or args.source.with_name(f"{args.source.stem}-cards.html")
    fields = [f.strip() for f in args.fields.split(",") if f.strip()]
    order = [k.strip() for k in args.order.split(",") if k.strip()]
    title = args.title or args.source.stem.replace("-", " ").title()

    cards = apply_order(
        parse_cards(args.source.read_text(encoding="utf-8"), args.section, fields),
        order,
    )
    dest.write_text(build_html(cards, fields, title), encoding="utf-8")
    print(f"wrote {dest} ({len(cards)} cards)")


if __name__ == "__main__":
    main()
