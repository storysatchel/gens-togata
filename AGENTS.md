# AGENTS.md — Gens Togata

Authoring and build conventions for this repository. Read before editing content or code.

## What this is
*Gens Togata* — a fan-made setting supplement for the **Genesys** roleplaying game, set in ancient Rome. Published under the Genesys Foundry Community Content Agreement; unofficial and non-commercial.

## Architecture — source of truth is decoupled from presentation
- `content.yaml` is the **single source of truth**: `meta` and an ordered `elements` array of native VMPrint elements. Do not reintroduce chapter/block wrappers or put generated cover or contents pages into the shared source tree. `styleguide.yaml` uses the same model.
- Assign authored nodes stable, unique `properties.sourceId` strings; never derive identities from array positions. Use `properties.semanticRole` to record meaning, not appearance: chapter and part headings, ordinary headings, asides, notes, and inline `dice:<name>`, `result:<name>`, and `note-ref` runs.
- Use native `content` and `children`, stories with explicit `columns` and `gutter`, native lists and tables, and story-child `columnSpan` for short full-width headings and tables. A `columnSpan` element cannot split across pages and is dropped if taller than the space left, so long full-width material such as endnotes goes after its story at the root level. List items are `list-item` children; table rows and cells are `table-row` and `table-cell` children. Preserve logical reading order, including asides embedded within prose, and preserve endnote numbers.
- Styles are named by element type or `properties.style`; the typed VMPrint theme controls presentation without encoding semantics in typography. `src/content/` loads and validates the logical source; `src/templates/` supplies presentation. Keep output adapters thin and reuse the source tree instead of maintaining a parallel content model.
- Two-column text uses native VMPrint stories and pagination, not manually measured pages or a custom column splitter. Keep page geometry at **396 × 612 pt** and express styles and dimensions in points.
- `src/render.ts` is the CLI entry point: `content.yaml` → PDF via [VMPrint](https://github.com/cosmiciron/vmprint) and `src/output/speech.ts` renders `audio/*.txt` by traversing the logical tree in reading order.
- Never parse rendered output to recover content or infer semantic roles from glyphs. Never hard-code book prose in renderer modules or the theme. Preserve bundled text-font registration and embedded `Genesys` glyphs when changing the PDF output path.
- Register text fonts from the npm packages' WOFF files, not WOFF2 (PDFKit fails to subset some WOFF2 composite glyphs). Contents numbers come from VMPrint layout; `src/output/navigation.ts` uses that geometry only to add PDF metadata, bookmarks, and links.

## Citations & attribution
- **No inline attribution.** Do **not** name the source in the prose ("Mommsen writes", "as Cato notes", "according to…", "(Grounded in …)"). A quotation stands on its own, carrying only a superscript endnote marker. **All attribution lives in the endnotes** (and the Appendix bibliography).
- Represent references as semantic `text` runs with `properties.semanticRole: note-ref`, preserving the printed number. Keep each chapter's numbered notes in order matching its references.

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
