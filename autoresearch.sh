#!/bin/sh
# Primary metric: non-blank lines of maintained code (TypeScript, shell, Python, patches).
# The workload must stay correct: typecheck, tests, and both PDF builds must pass or the run fails.
set -eu
export LC_ALL=C.UTF-8 TZ=UTC
cd "$(dirname "$0")"
# Dependencies and the pinned VMPrint build must already be available offline.
test -d node_modules
revision=$(git rev-parse :vendor/vmprint)
test "$(git -C vendor/vmprint rev-parse HEAD)" = "$revision"
test -z "$(git -C vendor/vmprint status --porcelain)"
test -f vendor/vmprint/node_modules/.gens-togata-built
test "$(cat vendor/vmprint/node_modules/.gens-togata-built)" = "$revision"
test -f vendor/vmprint/engine/dist/index.mjs

# Bun's file dependencies can otherwise retain an older built copy.
check_vmprint() {
  diff -qr vendor/vmprint/engine/dist node_modules/@vmprint/engine/dist >/dev/null
  diff -qr vendor/vmprint/contracts/dist node_modules/@vmprint/contracts/dist >/dev/null
  diff -qr vendor/vmprint/contexts/pdf/dist node_modules/@vmprint/context-pdf/dist >/dev/null
  diff -qr vendor/vmprint/font-managers/local/dist node_modules/@vmprint/local-fonts/dist >/dev/null
  diff -qr vendor/vmprint/font-managers/local/assets node_modules/@vmprint/local-fonts/assets >/dev/null
}
check_vmprint
bun run typecheck >/dev/null
bun test ./tests/*.test.ts >/dev/null 2>&1
UV_OFFLINE=1 make BUN_INSTALL_FLAGS=--offline pdf styleguide audio folio >/dev/null 2>&1
check_vmprint

# Authored content, identities, and semantic roles must survive code simplification.
source_hash() {
  bun -e '
    import { loadDocument } from "./src/content/load";
    import { walkElements } from "./src/templates/document";
    const document = await loadDocument(process.argv[1]);
    const entries = [...walkElements(document.elements)].map(e => [e.type, e.content, e.properties?.sourceId, e.properties?.semanticRole, e.properties?.audioPart, e.properties?.noteNumber, e.properties?.partLabel, e.properties?.partTitle]);
    console.log(new Bun.CryptoHasher("sha256").update(JSON.stringify(entries)).digest("hex"));
  ' "$1"
}
test "$(source_hash content.yaml)" = ae741cf4490794cd1fa606bbe38bc4136b9c2ee25d9574b1ff766af6790dc430
test "$(source_hash styleguide.yaml)" = 1f91f58f7c1758243285e8e763bc5532b22d88cef22d17ac89ae0ce245a3da91

# Preserve the rendered text and every narration part, not just their counts.
audio_hash=$( (export LC_ALL=C; sha256sum audio/part_*.txt audio/transcript.txt) | sha256sum | cut -d ' ' -f1)
book_hash=$(pdftotext -raw 'dist/Gens Togata.pdf' - | sha256sum | cut -d ' ' -f1)
guide_hash=$(pdftotext -raw 'dist/Gens Togata - Style Guide.pdf' - | sha256sum | cut -d ' ' -f1)
folio_hash=$(pdftotext -raw 'dist/Gens Togata - Folio.pdf' - | sha256sum | cut -d ' ' -f1)
test "$audio_hash" = 77e75fbff22565f2d61f368746b9b86b0276fd6eb5a6db8331fcb2aa01f70b0c
test "$book_hash" = bda984db8d46aad712adaba2c71b09f78303e1cc30ede812cb0999ba9953ce5f
test "$guide_hash" = 3e21a0e08198bbf90e658d6bb63dcbb2203887483970f0d7107fb6f2e7d05c91
test "$folio_hash" = c347349d60452485c11464ff7430face3a1b65cf2df1d22fd449b96e60ee6940
book_pages=$(pdfinfo 'dist/Gens Togata.pdf' | awk '/^Pages:/{print $2}')
test "$book_pages" = 98
test "$(pdfinfo 'dist/Gens Togata - Style Guide.pdf' | awk '/^Pages:/{print $2}')" = 8
test "$(pdfinfo 'dist/Gens Togata - Folio.pdf' | awk '/^Pages:/{print $2}')" = 56
test "$(pdfinfo 'dist/Gens Togata - Folio.pdf' | awk '/^Page size:/{print $3, $4, $5}')" = "792 x 612"
# Metadata is part of the published PDF, independent of its visible text.
check_metadata() {
  pdfinfo "$1" | awk -F ': *' -v subject="$2" -v creator="$3" '
    $1 == "Title" && $2 == "Gens Togata" { title_ok = 1 }
    $1 == "Subject" && $2 == subject { subject_ok = 1 }
    $1 == "Creator" && index($0, creator) { creator_ok = 1 }
    END { exit !(title_ok && subject_ok && creator_ok) }
  '
}
check_metadata 'dist/Gens Togata.pdf' 'Roleplaying in Imperial Rome' 'Gens Togata / VMPrint'
check_metadata 'dist/Gens Togata - Style Guide.pdf' 'Style Guide & Component Showcase' 'Gens Togata / VMPrint'
check_metadata 'dist/Gens Togata - Folio.pdf' 'Roleplaying in Imperial Rome' 'Created with PdfImpose'
# Source PDFs declare their language for readers and assistive technology.
bun -e '
  import { PDFDocument, PDFName } from "pdf-lib";
  for (const path of process.argv.slice(1)) {
    const pdf = await PDFDocument.load(await Bun.file(path).arrayBuffer());
    if (pdf.catalog.get(PDFName.of("Lang"))?.decodeText() !== "en") throw new Error(`${path}: missing English language metadata`);
  }
' 'dist/Gens Togata.pdf' 'dist/Gens Togata - Style Guide.pdf'
# Text extraction cannot detect missing artwork, glyphs, or changed layouts.
raster_hash() {
  pdftoppm -f "$2" -l "$2" -r 144 -png -singlefile "$1" | sha256sum | cut -d ' ' -f1
}
test "$(raster_hash 'dist/Gens Togata.pdf' 1)" = ec411598dd26d5f306a6f065145ae28316445731a851e605747c3f5a428df1d1
test "$(raster_hash 'dist/Gens Togata - Style Guide.pdf' 1)" = d79ca62cd68ab169cf0f56ba7cf7fed6fe6c8fe74d35adc72a500c368e630d21
test "$(raster_hash 'dist/Gens Togata.pdf' 10)" = ff6c6c7a93a246524e7fb7bc41426f4e4d82c21f577c7ee1d865e1c55881046d
test "$(raster_hash 'dist/Gens Togata.pdf' 14)" = ba71367bdb82e5a224059d04acbdcae7f4d83e651ec9eb91c8ab3a2d6cae71d4
test "$(raster_hash 'dist/Gens Togata - Style Guide.pdf' 8)" = 98ef46efada08fb5346e3f28990169b008e18287ec84a7b5e02403e6bf05109a
test "$(raster_hash 'dist/Gens Togata - Folio.pdf' 1)" = 88281088349714bf6e1efdf783b521e4e0fcc580e632cf3e93ffea1f1d5ab3f6
test "$(raster_hash 'dist/Gens Togata - Folio.pdf' 28)" = ab21ae2a3fb3016242bbe6b2eac21de8d5a5662f4c3895c7c476d730d3b4b1e5
# PDF outlines include bookmark labels and physical destination pages.
outline_hash() {
  pdftohtml -i -xml -stdout -hidden "$1" | awk '/<outline>/{printing=1} printing {print} /<\/outline>/{printing=0}' | sha256sum | cut -d ' ' -f1
}
test "$(outline_hash 'dist/Gens Togata.pdf')" = 9a3ba935bf2bbaabb7d81d70be0ee7b0c3061760348ecfade28a1f0e32e3c782
test "$(outline_hash 'dist/Gens Togata - Style Guide.pdf')" = f227bb3502a14866d213c119164375bfea43482cde1dad0913f43b34856323ce
for pdf in 'dist/Gens Togata.pdf' 'dist/Gens Togata - Style Guide.pdf'; do
  test "$(pdfinfo "$pdf" | awk '/^Page size:/{print $3, $4, $5}')" = "396 x 612"
done
for pdf in 'dist/Gens Togata.pdf' 'dist/Gens Togata - Style Guide.pdf' 'dist/Gens Togata - Folio.pdf'; do
  pdffonts "$pdf" | awk '
    $(NF-4) == "yes" && $1 ~ /LibreBaskerville-Regular$/ { regular = 1 }
    $(NF-4) == "yes" && $1 ~ /LibreBaskerville-Bold$/ { bold = 1 }
    $(NF-4) == "yes" && $1 ~ /LibreBaskerville-Italic$/ { italic = 1 }
    $(NF-4) == "yes" && $1 ~ /GenesysGlyphsAndDice$/ { genesys = 1 }
    END { exit !(regular && bold && italic && genesys) }
  '
done

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
echo "METRIC rulebook_pages=$book_pages"
echo "METRIC transcript_words=$(wc -w < audio/transcript.txt)"
