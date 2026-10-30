#!/usr/bin/env bash
# Render an HTML card sheet to a one-page landscape-letter PDF.
# Usage: ./render-cards.sh input.html [output.pdf]
set -euo pipefail
in="${1:?Usage: ./render-cards.sh input.html [output.pdf]}"
out="${2:-${in%.html}.pdf}"
google-chrome --headless=new --disable-gpu --no-sandbox \
  --no-pdf-header-footer \
  --print-to-pdf="$out" \
  "file://$(readlink -f "$in")"
echo "wrote $out"
