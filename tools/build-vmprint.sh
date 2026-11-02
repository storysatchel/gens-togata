#!/bin/sh
set -eu

root=$(git rev-parse --show-toplevel)
cd "$root"
git submodule update --init -- vendor/vmprint
revision=$(git -C vendor/vmprint rev-parse HEAD)
patches=$(ls tools/patches/*.patch 2>/dev/null || true)
# The build identity is the pinned upstream commit plus the exact patches applied to it.
identity="$revision $(cat $patches 2>/dev/null | sha256sum | cut -d' ' -f1)"
stamp=vendor/vmprint/node_modules/.gens-togata-built
if [ -f "$stamp" ] && [ "$(cat "$stamp")" = "$identity" ] && \
  [ -f vendor/vmprint/engine/dist/index.mjs ] && \
  [ -f vendor/vmprint/contracts/dist/index.mjs ] && \
  [ -f vendor/vmprint/contexts/pdf/dist/index.mjs ] && \
  [ -f vendor/vmprint/font-managers/local/dist/index.js ]; then
  exit 0
fi

# Build from the pristine pinned tree: apply declared patches, then always restore the submodule.
if ! git -C vendor/vmprint diff --quiet; then
  echo "vendor/vmprint has uncommitted changes; restore it before building" >&2
  exit 1
fi
revert() {
  for patch in $patches; do
    git -C vendor/vmprint apply -R "$root/$patch" 2>/dev/null || true
  done
}
trap revert EXIT
for patch in $patches; do
  git -C vendor/vmprint apply "$root/$patch"
done

npm ci --prefix vendor/vmprint --ignore-scripts --no-audit --no-fund
npm run build --prefix vendor/vmprint --workspace=@vmprint/contracts
npm run build --prefix vendor/vmprint --workspace=@vmprint/engine
npm run build --prefix vendor/vmprint --workspace=@vmprint/local-fonts
npm run build --prefix vendor/vmprint --workspace=@vmprint/context-pdf
printf '%s\n' "$identity" > "$stamp"
