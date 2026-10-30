# Gens Togata

*An Imperial Rome setting for the Genesys Roleplaying Game.*

A fan-made setting supplement for [Genesys](https://www.fantasyflightgames.com/en/products/genesys/),
published under the Genesys Foundry Community Content Agreement. It covers status-based
archetypes, careers, Roman gear and vehicles, adversaries, a full social-encounter engine
(the Senate, oratory, the law-court, patron–client), ready-to-run scenarios, and GM advice.

## Single source of truth

Content and presentation are decoupled. One source file renders to multiple formats.

| `content.yaml` | **The source of truth.** Typed content blocks only — no markup. |
| `styles.css` | Print presentation rules consumed by Takumi. |
| `src/content/` | YAML loading and document/block types. |
| `src/templates/` | Cohesive TSX templates for the document, chapters, TOC, and block families. |
| `src/inline/` | Converts the content's light inline markup into safe JSX. |
| `src/output/` | Takumi PDF rendering and separate narration formatting. |
| `src/render.tsx` | CLI entry point: YAML → paged PDF and narration. |
| `src/excerpt.tsx` | Reuses the PDF templates to render selected chapters. |
| `tools/importer.py` | One-time HTML→YAML migration (retired; kept for provenance). |

Inline emphasis in `content.yaml` uses light markdown the renderers translate:
`**bold**`, `*italic*`, and `[[keyword]]` for domain-styled runs (dice symbols, tags).

## Build

Requires [Bun](https://bun.sh/) and the locked npm dependencies (`bun install`).

```sh
make pdf        # content.yaml -> Takumi PDF + narration
make styleguide # styleguide.yaml -> style-guide PDF
make audio      # content.yaml -> narration only
make excerpt    # default: Chapter 1 preview PDF
make clean
bun run typecheck # TypeScript static check
```

`takumi-pdf` renders `.tsx` templates directly to a paged PDF; no intermediate HTML or headless browser is required. The narration renderer remains a separate output path over the same YAML data.
The source PDF page is 5.5 × 8.5 inches (396 × 612 pt). CI also creates a letter-size 2-up folio PDF for duplex booklet printing.
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
