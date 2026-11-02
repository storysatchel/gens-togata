# Gens Togata

*An Imperial Rome setting for the Genesys Roleplaying Game.*

A fan-made setting supplement for [Genesys](https://www.fantasyflightgames.com/en/products/genesys/),
published under the Genesys Foundry Community Content Agreement. It covers status-based
archetypes, careers, Roman gear and vehicles, adversaries, a full social-encounter engine
(the Senate, oratory, the law-court, patron–client), ready-to-run scenarios, and GM advice.

## Single source of truth

Content and presentation are decoupled. The rulebook and style guide use the same
VMPrint-native logical document format; the PDF and narration are separate views of
the authored content.

| Source | Responsibility |
| --- | --- |
| `content.yaml` | **The source of truth:** metadata and authored VMPrint elements. |
| `styleguide.yaml` | A document in the same format demonstrating the components. |
| `src/content/` | YAML loading, source validation, and document types. |
| `src/content/compositions.ts` | Authoring helpers for native tables and adversaries. |
| `src/templates/` | Typed theme and PDF document presentation, including generated material. |
| `src/output/` | PDF output and narration from the logical content tree. |
| `src/render.ts` | CLI entry point: YAML → paged PDF and narration. |
| `src/excerpt.ts` | Renders a selection of the document as a PDF. |

### Authoring the document

The YAML root contains `meta` (title, subtitle, tagline, system, and legal text)
and `elements`, an ordered array of VMPrint elements. It has no `chapters` or
`blocks` wrapper. Elements use `content` and, where needed, nested `children`.
Give authored elements stable, unique `properties.sourceId` values: identities
must survive insertion or reordering and must not be derived from positions.
Use `properties.semanticRole` for meaning, independently of visual styling.

For example, a chapter heading and a two-column story are expressed directly:

```yaml
meta:
  title: Example
  subtitle: A supplement
  tagline: An example document
  system: Genesys
  legal: []
elements:
  - type: h1
    content: The Forum
    properties:
      sourceId: forum-chapter
      semanticRole: chapter
  - type: story
    content: ""
    columns: 2
    gutter: 12
    balance: false
    properties:
      sourceId: forum-story
    children:
      - type: p
        content: Citizens gather in the Forum.
        properties:
          sourceId: forum-introduction
```

Use native headings (`h1`, `h2`, `h3`, and `scenario`), stories with explicit
`columns` and `gutter`, and native lists and tables. A story child can use
`columnSpan` for full-width material. Roles distinguish, for example, chapter and
part headings, asides, and notes. Inline semantic runs are `text` elements:
roles such as `dice:ability`, `result:success`, and `note-ref` carry meaning
without inferring it from a glyph. Preserve endnote numbers and place aside
elements in their intended reading order. See `styleguide.yaml` for component
examples.

For generated source, `composeTable(columns, rows)` and
`composeAdversary(profile)` in `src/content/compositions.ts` build native
elements. Assign stable unique `sourceId` values to every returned element and
run before saving; the YAML stores the expanded elements, not helper calls.



`tests/book.test.ts` lays out both sources and checks that every authored element appears exactly once with its full text, inside the margins, with resolved navigation.

Source validation checks the logical document before output. Cover and contents
are presentation-generated, not authored into the shared tree. Narration walks
that logical tree in reading order rather than recovering text from PDF layout;
the typed theme controls visual presentation rather than source meaning.

## Build

Requires [Bun](https://bun.sh/), Git, Node.js, and npm. `make` initializes the VMPrint submodule and builds its packages from upstream's locked dependencies before installing this project's locked dependencies. A fresh checkout can also be prepared explicitly with `sh tools/build-vmprint.sh && bun install --frozen-lockfile`.

```sh
make pdf        # content.yaml -> VMPrint PDF + narration
make styleguide # styleguide.yaml -> style-guide PDF
make audio      # content.yaml -> narration only
make excerpt    # default: Chapter 1 preview PDF
make clean
bun run typecheck # TypeScript static check
make test         # project tests
```

[VMPrint](https://github.com/cosmiciron/vmprint) lays out typed document objects and writes the paged PDF without JSX, intermediate HTML, or a headless browser. Native VMPrint columns handle text flow and pagination; the typed theme defines presentation without CSS or a custom page-measurement loop. Narration traverses the same logical document independently of PDF layout.
Body copy uses 7 pt type with 1.4 line-height and justified alignment. Specialized text, including sidebars and stat blocks, uses its own sizes and alignment. The PDF renderer registers the bundled text fonts and Genesys glyph font for embedding, so dice symbols remain glyphs rather than substituted text.
VMPrint source is pinned by the `vendor/vmprint` Git submodule to commit [`a69394f06aa08bd97da11f92a718758eb5ea403d`](https://github.com/cosmiciron/vmprint/commit/a69394f06aa08bd97da11f92a718758eb5ea403d); its packages are built locally from that revision, not the npm releases with the same version numbers. Upstream's `package-lock.json` pins its build dependencies, and `bun.lock` pins the application dependencies. Font registration uses the packaged WOFF text fonts and the Genesys TTF; WOFF2 composite-glyph embedding fails in PDFKit. Contents page numbers are resolved from layout in fixed-width cells; `pdf-lib` adds matching TOC links, bookmarks, and document metadata without changing geometry.
Upstream's own `test:zone-continue` fails at this revision (nested story/column-span check inside an expandable continued zone, `engine/tests/zone-map-continue.spec.ts:886`); the rulebook does not use that composition, so do not rely on it until upstream fixes it.

The pinned tree is patched at build time by `tools/patches/*.patch` (applied by `tools/build-vmprint.sh`, then reverted so the submodule stays at the pinned commit; the build stamp records the commit and the patch hash). `vmprint-story-continuation.patch` fixes `StoryPackager.pourColumns`, which emitted a block twice when it did not fit the last column of a multi-column story (reproduces on upstream v1.4.0 and `a69394f`; the engine's own `test:engine`, `test:flat`, `test:strip`, `test:modules`, `test:publication`, `test:spatial-ir`, `test:scripting`, `test:standard-fonts` and `test:collider-field` are unchanged by it). `tests/vmprint-revision.test.ts` guards it. Drop the patch when upstream carries an equivalent fix.
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
