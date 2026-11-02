#!/bin/sh
set -eu

root=$(git rev-parse --show-toplevel)
cd "$root"
git submodule update --init -- vendor/vmprint
revision=$(git -C vendor/vmprint rev-parse HEAD)
stamp=vendor/vmprint/node_modules/.gens-togata-built
if [ -f "$stamp" ] && [ "$(cat "$stamp")" = "$revision" ] && \
  [ -f vendor/vmprint/engine/dist/index.mjs ] && \
  [ -f vendor/vmprint/contracts/dist/index.mjs ] && \
  [ -f vendor/vmprint/contexts/pdf/dist/index.mjs ] && \
  [ -f vendor/vmprint/font-managers/local/dist/index.js ]; then
  exit 0
fi
npm ci --prefix vendor/vmprint --ignore-scripts --no-audit --no-fund
npm run build --prefix vendor/vmprint --workspace=@vmprint/contracts
npm run build --prefix vendor/vmprint --workspace=@vmprint/engine
npm run build --prefix vendor/vmprint --workspace=@vmprint/local-fonts
npm run build --prefix vendor/vmprint --workspace=@vmprint/context-pdf
printf '%s\n' "$revision" > "$stamp"
