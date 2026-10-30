#!/usr/bin/env bash
# Render a published adventure Markdown file to a self-contained, browsable wiki HTML page.
# Honors the audience wall (ADR 0002): a GM/Player toggle hides everything GM-only —
# ::: gm ::: blocks, [..]{.gm} spans, PREP boxes, and any section not tagged {.player}.
# Single file, theme-aware, no network. Usage: ./wiki.sh input.md [output.html]
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INPUT="${1:?Usage: ./wiki.sh input.md [output.html]}"
OUTPUT="${2:-${INPUT%.md}.html}"

pandoc "$INPUT" \
  -f markdown -t html5 \
  --standalone \
  --section-divs \
  --toc --toc-depth=3 \
  --lua-filter="$DIR/wiki-filter.lua" \
  --template="$DIR/wiki-template.html" \
  -o "$OUTPUT"

echo "wrote $OUTPUT"
