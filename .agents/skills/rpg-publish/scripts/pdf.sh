#!/usr/bin/env bash
# Convert a Markdown file to print-ready PDF.
# Usage: ./pdf.sh input.md [output.pdf]
set -euo pipefail

INPUT="${1:?Usage: ./pdf.sh input.md [output.pdf]}"
OUTPUT="${2:-${INPUT%.md}.pdf}"

pandoc "$INPUT" \
  -o "$OUTPUT" \
  --pdf-engine=xelatex \
  -V geometry:margin=1in \
  -V fontsize=11pt \
  -V mainfont="DejaVu Serif" \
  -V monofont="DejaVu Sans Mono" \
  -V colorlinks=true \
  -V linkcolor=black \
  -V urlcolor=black \
  --highlight-style=tango

echo "Written: $OUTPUT"
