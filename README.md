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
Always verify the PDF visually (overflow/overlap are silent) before release.

## Releases (CI/CD)

GitHub Actions (`.github/workflows/release.yml`):

- **push to `main` / PRs** — renders the PDF and uploads it as a build artifact (validation).
- **push a `v*` tag** — builds the PDF and publishes a GitHub Release with the PDF
  and narration transcript attached.

```sh
git tag v0.1.0 && git push origin v0.1.0   # -> release with the PDF attached
```

## Licensing

Tooling (`render.py`, `tools/`, workflows) is MIT (see `LICENSE`). The game **content**
in `content.yaml` is published under the Genesys Foundry Community Content Agreement;
Genesys and the Genesys Foundry are trademarks of Fantasy Flight Games. This is an
unofficial, non-commercial fan supplement drawn from the public historical record.
