#!/bin/sh
set -eu

cd "$(git rev-parse --show-toplevel)"
git submodule update --init -- vendor/vmprint
revision=$(git -C vendor/vmprint rev-parse HEAD)
stamp=vendor/vmprint/node_modules/.gens-togata-built
# The stamp lives in vendor/vmprint/node_modules, so it disappears with the dependencies it vouches for.
if [ -f "$stamp" ] && [ "$(cat "$stamp")" = "$revision" ] && [ -f vendor/vmprint/engine/dist/index.mjs ]; then
  exit 0
fi
npm ci --prefix vendor/vmprint --ignore-scripts --no-audit --no-fund
for workspace in contracts engine local-fonts context-pdf; do
  npm run build --prefix vendor/vmprint --workspace=@vmprint/$workspace
done
printf '%s\n' "$revision" > "$stamp"
