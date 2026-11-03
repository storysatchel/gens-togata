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
| `src/templates/` | Typed theme and PDF document presentation, including generated material. |
| `src/output/` | PDF output and narration from the logical content tree. |
| `src/render.ts` | CLI entry point: YAML → paged PDF and narration. |

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

Use native headings (`h1`, `h2`, `h3`, `scenario`), stories with explicit `columns`
and `gutter`, and native lists and tables. Roles distinguish chapter and part
headings, asides, and notes. Inline semantic runs are `text` elements whose roles
(`dice:ability`, `result:success`, `note-ref`, `keyword`) carry meaning without
inferring it from a glyph; the theme supplies their appearance. Preserve endnote
numbers and place aside elements in their intended reading order. See
`styleguide.yaml` for component examples.

A story child may use `columnSpan: all` for a short full-width heading or table. A
`columnSpan` element cannot split across pages: one taller than the space left is
silently dropped along with the rest of its story. Put long full-width material,
such as chapter endnotes, after the story at the root level instead.

The cover, contents, and footer are generated at output time, not authored. Narration
walks the logical tree in reading order rather than recovering text from the PDF.
`audioPart` on each chapter heading assigns it to one of the narration files.

### Validation

The YAML parser rejects duplicate mapping keys rather than silently replacing authored values.
`loadDocument` checks what VMPrint's own loader does not: every element has a unique
`sourceId` (the `toc-` prefix is reserved), and every `note-ref` has a matching `note`
in its chapter. VMPrint validates structure and styles when the document is laid out.
`tests/book.test.ts` lays out both sources and checks that every authored element
appears exactly once with its full text, inside the margins, and that contents
entries appear in reading order with their resolved page numbers.
`tests/source.test.ts` and `tests/speech.test.ts` cover the loader, theme application
by role, and narration.

## Build

Requires [Bun](https://bun.sh/), Git, Node.js, and npm. `make` initializes the VMPrint
submodule and builds its packages from their locked dependencies before installing
this project's. A fresh checkout can be prepared explicitly with
`sh tools/build-vmprint.sh && bun install --frozen-lockfile`.

`bash autoresearch.sh` requires installed dependencies, a cached `pdfimpose==2.10.0`,
and a clean, built VMPrint checkout at the pinned revision, with installed package builds
matching the checkout. Its Bun install and folio build run offline.
It checks authored text, identities, and roles; the rulebook, style guide, and folio text,
fonts, metadata, page counts, and dimensions; selected rendered pages and bookmarks; and
every narration file against the baseline.
Update the fingerprints deliberately when the publication or rendering toolchain changes.

```sh
make pdf          # content.yaml -> rulebook PDF + narration
make folio        # 2-up booklet PDF for letter paper
make styleguide   # styleguide.yaml -> style-guide PDF
make audio        # content.yaml -> narration only (audio/)
make test         # project tests
bun run typecheck # TypeScript static check
make clean
```

The source page is 5.5 × 8.5 in (396 × 612 pt). `make folio` (and CI) imposes it 2-up on
letter paper in 16-page signatures for duplex booklet printing, using
[`pdfimpose`](https://framagit.org/spalax/pdfimpose) (`hardcover --signature 2x1
--group 4`), run pinned through `uvx`; install [uv](https://docs.astral.sh/uv/). Always
verify the PDF visually before release: overflow and overlap are silent.

### Typography and output

Body copy is 7 pt Libre Baskerville with 1.4 line-height, justified; sidebars, stat
blocks, and other specialized text have their own sizes. The theme is `src/templates/styles.ts`.
Fonts are registered from the packaged WOFF files plus the Genesys TTF (PDFKit fails
to subset some WOFF2 composite glyphs), and the Genesys glyphs are embedded so dice
symbols stay glyphs. VMPrint generates the contents from chapter, part, and heading
roles; `pdf-lib` adds bookmarks and document metadata. Contents entries are not
currently clickable.

### VMPrint engine

[VMPrint](https://github.com/cosmiciron/vmprint) lays out the document; there is no
JSX, HTML intermediate, or headless browser. It is vendored as the `vendor/vmprint`
submodule from the [`gavmor/vmprint`](https://github.com/gavmor/vmprint) fork,
built locally rather than taken from the npm releases. The fork includes fixes for
story continuations, heading publication, multi-page contents, and PDF text clipping.
The contents gathers heading signals after pagination and can replay layout to
settle; a page-limited preview does not guarantee a populated contents.

Upstream's own `test:zone-continue` fails at this revision (a nested story/column-span
check inside an expandable continued zone). The book does not use that composition.

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
