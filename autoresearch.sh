#!/bin/sh
# Primary metric: non-blank lines of maintained code (TypeScript, shell, Python, patches).
# The workload must stay correct: typecheck, tests, and both PDF builds must pass or the run fails.
set -eu
cd "$(dirname "$0")"

bun run typecheck >/dev/null
bun test ./tests/*.test.ts >/dev/null 2>&1
make pdf styleguide audio >/dev/null 2>&1

count() {
  find "$@" -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.sh' -o -name '*.py' -o -name '*.patch' \) 2>/dev/null \
    | xargs -r cat | grep -c '[^[:space:]]' || true
}

total=$(count src tools tests)
echo "METRIC maintained_loc=$total"
echo "METRIC src_loc=$(count src)"
echo "METRIC tools_loc=$(count tools)"
echo "METRIC tests_loc=$(count tests)"
echo "METRIC content_lines=$(cat content.yaml styleguide.yaml | wc -l)"
echo "METRIC rulebook_pages=$(pdfinfo 'dist/Gens Togata.pdf' | awk '/^Pages:/{print $2}')"
echo "METRIC transcript_words=$(wc -w < audio/transcript.txt)"
