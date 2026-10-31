# AGENTS.md — Gens Togata

Authoring and build conventions for this repository. Read before editing content or code.

## What this is
*Gens Togata* — a fan-made setting supplement for the **Genesys** roleplaying game, set in ancient Rome. Published under the Genesys Foundry Community Content Agreement; unofficial and non-commercial.

## Architecture — source of truth is decoupled from presentation
- `content.yaml` is the **single source of truth**: metadata + chapters of typed blocks (`h3`, `p`, `list`, `table`, `statblock`, `sidebar`, `procedure`, `scenario`, `endnotes`, …). It knows nothing of markup.
- `styles.css` is presentation only.
- `src/content/` loads YAML and declares the typed content model. `src/templates/` contains reusable TSX templates; `src/inline/` handles inline markup.
- Two-column pages are laid out by `src/templates/flow.tsx`, not CSS (takumi-pdf has no multicol): it measures candidate pages with takumi's `measure()`, fills the left column to the page foot before the right, splits paragraphs/lists/tables/endnotes at word or item boundaries, and emits explicit `.page` boxes tagged `recto`/`verso` so outer-column sidebars float into the correct margin. Page geometry lives in `src/templates/page.ts`; keep `measure` options in step with the `render` options.
- `src/render.tsx` is the CLI entry point: `content.yaml` → PDF via `takumi-pdf`; `src/output/speech.ts` renders `audio/*.txt` from the same content model.
- Never parse rendered output to recover content. Never hard-code book prose in renderer modules or `styles.css`.

## Citations & attribution
- **No inline attribution.** Do **not** name the source in the prose ("Mommsen writes", "as Cato notes", "according to…", "(Grounded in …)"). A quotation stands on its own, carrying only a superscript endnote marker `{{N}}`. **All attribution lives in the endnotes** (and the Appendix bibliography).
- Endnote apparatus: inline `{{N}}` renders as a superscript; a block of `type: endnotes` (with `title` + ordered `items`) renders the numbered **Notes** list at the end of the chapter. Order `items` to match the markers 1..N.

## Quotation & copyright (fair use in a game product is narrow)
- **Verbatim quotes only from public-domain sources** (US: first published before 1931). Facts and history are never copyrightable — paraphrase modern scholarship freely, in your own words.
- **Watch translation dates.** An ancient text is public domain, but a *recent translation* carries the translator's copyright. Use pre-1931 translations — e.g. Mommsen (trans. Dickson), Cato/Varro (trans. Harrison, 1913), Seneca (trans. **Gummere**, 1917 — *not* Hadas, 1958). Verify the exact wording against the public-domain source before quoting; never reconstruct a quote from memory.
- Modern scholarship (Marin, Gargola, Watts, Scheidel, Millar, …): **cite or paraphrase only — never quote verbatim.** Reading-list / bibliography citations are always safe (titles aren't copyrightable). Attribution does not cure infringement.

## Voice
- Speak literally about documented Roman reality. No hyperbole or LLM-slop (e.g. "mattered more than any die roll").
- Keep mechanics honest to Genesys: status and origin **feed** the dice (difficulty, boost/setback, available options, stakes); they do not override rolls.
- Treat Latin terms as **diegetic vocabulary**, like the names of peoples or institutions in a fantasy setting: use the Latin term naturally in the sentence, not as a parenthetical label attached to an English substitute. On first use, italicize the term and explain it in context, preferably with a concise appositive set off by commas. Continue using the term where appropriate, repeating the explanation when readers need it. Keep explanations historically accurate rather than treating loose translations as exact equivalents.

  | English-first parenthetical | Preferred Latin-first appositive |
  | --- | --- |
  | A freedman (*libertus*) owed duties to his former owner. | A *libertus*, a man freed from slavery, owed duties to his former owner. |
  | A client (*cliens*) visited a patron. | A *cliens*, or client, visited a patron. |

- Make game terminology accessible: introduce setting-specific terms in plain English, explain unfamiliar mechanics when they first matter, and use established Genesys terms consistently. Say what players or the GM actually do and what a rule changes; do not rely on jargon or a Latin label as an explanation.
- Prefer concrete, qualified claims to sweeping generalizations. Name the people, institutions, action, and conditions that matter; distinguish historical description from game procedure. Make each pronoun's referent unmistakable, repeating a noun when needed. Avoid unsupported contrasts such as “not X but Y”: establish both sides if the contrast is relevant, or state the positive claim directly.
- Quotations must follow **Quotation & copyright** above: use only verified public-domain wording and translations, with a superscript endnote marker. Keep source and translator attribution in the endnotes and bibliography, never in the surrounding prose; paraphrase modern scholarship in your own words and cite it as appropriate.

## Build & release
- Build: `make pdf` → `dist/Gens Togata.pdf`. Source page is **5.5in × 8.5in (396 × 612 pt)**; verify with `pdfinfo`.
- Release: every green push to `main` auto-cuts the next patch release (`vX.Y.Z` → `vX.Y.Z+1`); push a `vX.Y.0` tag for minor/major bumps. CI publishes the whole-page PDF, a letter-size 2-up folio PDF (imposed by `pdfimpose` via `uvx` in 16-page signatures), and narration transcript. Print the folio duplex with the short-edge flip setting. Verify the page sizes and that the `Genesys` glyph font is embedded.
