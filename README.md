# Gens Togata

*An Imperial Rome setting for the Genesys Roleplaying Game.*

A fan-made setting supplement for [Genesys](https://www.fantasyflightgames.com/en/products/genesys/),
published under the Genesys Foundry Community Content Agreement. It covers status-based
archetypes, careers, Roman gear and vehicles, adversaries, a full social-encounter engine
(the Senate, oratory, the law-court, patron–client), ready-to-run scenarios, and GM advice.

## Single source of truth

Content and presentation are decoupled. One source file renders to multiple formats.

| File | Role |
|------|------|
| `content.yaml` | **The source of truth.** Typed content blocks only — no markup. |
| `styles.css` | All print presentation. |
| `render.py` | The only code that knows about display: `to_html()` → PDF, `to_speech()` → narration. |
| `tools/importer.py` | One-time HTML→YAML migration (retired; kept for provenance). |

Inline emphasis in `content.yaml` uses light markdown the renderers translate:
`**bold**`, `*italic*`, and `[[keyword]]` for domain-styled runs (dice symbols, tags).

## Build

Requires [`uv`](https://docs.astral.sh/uv/) and WeasyPrint's system libraries (Pango, fonts).

```sh
make pdf      # content.yaml -> build/book.html -> dist/Gens Togata.pdf
make audio    # content.yaml -> audio/part_*.txt + audio/transcript.txt (narration)
make clean
```

`render.py` writes the HTML and the narration transcript; WeasyPrint turns the HTML into the PDF.
The source PDF page is 5.5 × 8.5 inches (396 × 612 pt). CI also creates a letter-size 2-up folio PDF for duplex booklet printing.
Always verify the PDF visually (overflow/overlap are silent) before release.

## Releases (CI/CD)

GitHub Actions (`.github/workflows/release.yml`):

- **push to `main` / PRs** — builds the whole-page rulebook PDF, 2-up folio PDF, and style-guide PDF; uploads all three as build artifacts.
- **push a `v*` tag** — publishes all three PDFs and the narration transcript.

- `Gens-Togata-vX.Y.Z.pdf` — whole-page rulebook PDF.
- `Gens-Togata-vX.Y.Z-folio.pdf` — 2-up booklet-imposed PDF for letter paper; print duplex using the short-edge flip setting.
- `Gens-Togata-Style-Guide-vX.Y.Z.pdf` — style-guide PDF.
- `Gens-Togata-vX.Y.Z-transcript.txt` — narration transcript.

```sh
git tag v0.1.0 && git push origin v0.1.0   # -> release with all three PDFs attached
```

## Licensing

Tooling (`render.py`, `tools/`, workflows) is MIT (see `LICENSE`). The game **content**
in `content.yaml` is published under the Genesys Foundry Community Content Agreement;
Genesys and the Genesys Foundry are trademarks of Fantasy Flight Games. This is an
unofficial, non-commercial fan supplement drawn from the public historical record.
