# Gens Togata

*An Imperial Rome setting for the Genesys Roleplaying Game.*

A fan-made setting supplement for [Genesys](https://www.fantasyflightgames.com/en/products/genesys/),
published under the Genesys Foundry Community Content Agreement. It covers status-based
archetypes, careers, Roman gear and vehicles, adversaries, a full social-encounter engine
(the Senate, oratory, the law-court, patron–client), ready-to-run scenarios, and GM advice.

## Single source of truth

Content and presentation are decoupled. One source file renders to multiple formats.

| Source | Responsibility |
| --- | --- |
| `content.yaml` | **The source of truth.** Typed content blocks only — no markup. |
| `src/templates/styles.ts` | Typed VMPrint styles and print typography. |
| `src/content/` | YAML loading and document/block types. |
| `src/templates/` | Typed VMPrint document, chapter, TOC, and block builders. |
| `src/inline/` | Converts light inline markup into styled VMPrint text runs. |
| `src/output/` | VMPrint PDF rendering and separate narration formatting. |
| `src/render.ts` | CLI entry point: YAML → paged PDF and narration. |
| `src/excerpt.ts` | Reuses the PDF builders to render selected chapters. |
| `tools/importer.py` | One-time HTML→YAML migration (retired; kept for provenance). |

Inline emphasis in `content.yaml` uses light markdown the renderers translate:
`**bold**`, `*italic*`, and `[[keyword]]` for domain-styled runs (dice symbols, tags).

Paragraphs with `style: opening` use the full text width and a distinct quotation treatment; they can continue onto subsequent pages.

A paragraph can place a sidebar at a specific point in its text: add one `{{sidebar}}` marker and a `sidebar` field containing `type: sidebar`, `title`, and `body` (a list of paragraphs). Both outputs read the sidebar at the marker. In the PDF, sidebar paragraphs have a thin vertical rule and flow within the column; they do not float into the page margin.

## Build

Requires [Bun](https://bun.sh/), Git, Node.js, and npm. `make` initializes the VMPrint submodule and builds its packages from upstream's locked dependencies before installing this project's locked dependencies. A fresh checkout can also be prepared explicitly with `sh tools/build-vmprint.sh && bun install --frozen-lockfile`.

```sh
make pdf        # content.yaml -> VMPrint PDF + narration
make styleguide # styleguide.yaml -> style-guide PDF
make audio      # content.yaml -> narration only
make excerpt    # default: Chapter 1 preview PDF
make clean
bun run typecheck # TypeScript static check
make test         # inline semantics, continuation fidelity, TOC targets, and full-width separation
```

[VMPrint](https://github.com/cosmiciron/vmprint) lays out typed document objects and writes the paged PDF without JSX, intermediate HTML, or a headless browser. Native VMPrint columns handle text flow and pagination; presentation is defined in `src/templates/styles.ts`, not CSS or a custom page-measurement loop. The narration renderer remains a separate output path over the same YAML data.
Body copy uses 7 pt type with 1.4 line-height and justified alignment. Specialized text, including sidebars and stat blocks, uses its own sizes and alignment. The PDF renderer registers the bundled text fonts and Genesys glyph font for embedding, so dice symbols remain glyphs rather than substituted text.
VMPrint source is pinned by the `vendor/vmprint` Git submodule to commit [`a69394f06aa08bd97da11f92a718758eb5ea403d`](https://github.com/cosmiciron/vmprint/commit/a69394f06aa08bd97da11f92a718758eb5ea403d); its packages are built locally from that revision, not the npm releases with the same version numbers. Upstream's `package-lock.json` pins its build dependencies, and `bun.lock` pins the application dependencies. Font registration uses the packaged WOFF text fonts and the Genesys TTF; WOFF2 composite-glyph embedding fails in PDFKit. Full-width headings, tables, opening quotations, and notes separate native two-column stories. Contents page numbers are resolved from layout in fixed-width cells; `pdf-lib` adds matching TOC links, bookmarks, and document metadata without changing geometry.
At this revision, upstream's `test:zone-continue` fails its nested story/column-span check inside an expandable continued zone (`engine/tests/zone-map-continue.spec.ts:886`). The rulebook does not use that composition. Do not rely on it until upstream fixes the regression and the fixture passes.
The source PDF page is 5.5 × 8.5 inches (396 × 612 pt). `make folio` (and CI) imposes it 2-up on letter paper in 16-page signatures for duplex booklet printing, using [`pdfimpose`](https://framagit.org/spalax/pdfimpose) (`hardcover --signature 2x1 --group 4`), run pinned through `uvx` — install [uv](https://docs.astral.sh/uv/); no TeX needed.
Always verify the PDF visually (overflow/overlap are silent) before release.

## Releases (CI/CD)

GitHub Actions (`.github/workflows/release.yml`):

- **PRs** — builds the whole-page rulebook PDF, 2-up folio PDF, and style-guide PDF; uploads all three as build artifacts.
- **push to `main`** — if the build passes, cuts the next patch release automatically (latest `vX.Y.Z` → `vX.Y.(Z+1)`), tagging the commit and publishing all three PDFs and the narration transcript. Skipped when the commit already carries a `v*` tag.
- **push a `v*` tag** — publishes a release at that version. Use this for minor/major bumps; later patches continue from it.

- `Gens-Togata-vX.Y.Z.pdf` — whole-page rulebook PDF.
- `Gens-Togata-vX.Y.Z-folio.pdf` — 2-up booklet-imposed PDF for letter paper, in signatures of 4 sheets (16 pages) each; print duplex using the short-edge flip setting, then fold and nest each 4-sheet group separately.
- `Gens-Togata-Style-Guide-vX.Y.Z.pdf` — style-guide PDF.
- `Gens-Togata-vX.Y.Z-transcript.txt` — narration transcript.

```sh
git tag v0.21.0 && git push origin v0.21.0   # minor/major bump; patches are automatic
```

## Licensing

Tooling (`src/`, `tools/`, workflows) is MIT (see `LICENSE`). The game **content**
in `content.yaml` is published under the Genesys Foundry Community Content Agreement;
Genesys and the Genesys Foundry are trademarks of Fantasy Flight Games. This is an
unofficial, non-commercial fan supplement drawn from the public historical record.
