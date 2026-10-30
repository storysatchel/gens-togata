---
name: rpg-publish
description: Condense a finished, critique-revised adventure into a run-at-the-table document — a read-once PREP layer that quarantines the reasoning, and a TABLE layer of pure primitives (register-tagged read-aloud, mechanics, dialog, a Choices→consequence table, and a Complications bank). Dual-audience with the GM/Player wall (ADR 0002) and hyperlinked cross-references, then offer to render to print PDF and a wiki. Use when the author wants to finalize, publish, condense, tighten, or make an adventure shareable/table-ready; NOT for authoring (rpg-dev), critique (rpg-critic), or applying a critique (rpg-revise).
---

# RPG Publish — Condense an Adventure to What You Run at the Table

Turn a discursive adventure — one that's been through [rpg-dev](../rpg-dev/SKILL.md) and
the [rpg-critic](../rpg-critic/SKILL.md)/[rpg-revise](../rpg-revise/SKILL.md) loop — into a
**run-at-the-table document**. You are **compressing and reorganizing, not rewriting**. The
critique loop already decided what the adventure *says*; publish decides how little a GM has to
read, mid-scene, to run it.

## The golden rule (this is the whole skill)

**At the table, the GM's eye lands on a beat and knows — in seconds, without reading a paragraph —
what to say, what to roll, and what the players' choices do.**

The failure mode is optimizing for *comprehension* (a GM who reads the doc understands the
design) instead of *running* (a GM mid-scene, under time pressure, acts). Comprehension is a
**prep-time** goal and it gets **one** home — the PREP layer, read once. Everything else is a
**table-time** primitive.

## The two layers

**PREP — read once, never at the table.** All the *why*: the real situation, why each mechanic is
what it is, the causal chains, the reveal logic. This is the ONE place reasoning lives. It appears
as:
- a top-level **GM Briefing** (the whole truth in tight beats — the *only* place the truth is
  explained), and
- short `> PREP` note-boxes at the head of an NPC or scene when a beat needs its *why* to run right.

**TABLE — glance during play.** Everything else, as primitives. No prose paragraph a GM must read
while the players wait. See the field kit below.

**The compression target is REASONING, not flavor.** Cut causal chains, restatement, and authorial
reassurance. **Never** cut read-aloud, an NPC's Look, dialog lines, clock values, or a
consequence — those are what you run. When in doubt: if it changes what happens at the table, keep
it; if it explains *why* it happens, move it to PREP and link.

## The table field kit

**Scenes** — in play order, floating scenes marked. Each scene, in this order:
- **Read-aloud** — see the read-aloud craft rules below. Boxed, verbatim, register-tagged.
- **Situation** — 1–2 lines: what's true here and what's coming. Not backstory (that's PREP).
- **Mechanics** — clocks (size · what fills · what it triggers), numbers, rolls, and any
  **mandatory beat** ("fires no matter what"). Bulleted, scannable.
- **Choices → consequence** — a **table**: *if the crew does X → this clock/flag/scene changes.*
  This is the load-bearing field. It answers "what are the specific choices players might make and
  what does each do." Concrete state changes, not theme.
- **Complications** — the Blades consequence-bank: a bulleted stock of ready complications to drop
  on a mixed/bad roll or when the scene needs teeth. Distinct from Choices→consequence (that's
  *players choose X*; this is *loose ammo you spend*). Mark any that **must fire**.
- **Dialog** — verbatim NPC lines for this scene, attributed, one per bullet.
- **Exit** — where each way out leads; the cut point; the link to the next scene.

**NPCs** — lead with the majors. Each:
- **Look** — the fixed sensory signature, **preserved near-losslessly**. This is the one field where
  evocative specificity earns its length. Keep the telling physical detail and the character it
  reveals; do not telegraph it into a nonsense shorthand.
- **Want** — one line. The driving goal.
- **Lever** — what the crew can *do* with them: the fact/tool/opening they offer, and (for Blades
  cargo/pressure NPCs) the **As cargo / As pressure** complication + one-use lifeline, with its cost.
- **Lines** — 2–4 verbatim dialog lines, collected here (not scattered), each tagged with its beat.
- Put the NPC's *secret and why* in a `> PREP` box or link it to the GM Briefing — **not** as a prose
  "Secret" field restated three times across the doc.

**Also:** Description + Player Pitch (player-facing sell, spoiler-free), a scannable **GM Summary**
(clocks / cast one-liners / the shape / the 3–6 things that break the session if forgotten), optional
**Pregens** and **Handouts**, and a terse **GM Notes** for rulings and dials that aren't any one
scene's. State each fact **once**, in its right home, and link.

## Read-aloud craft (the author called this out specifically)

- **Verbatim and speakable.** Read-aloud is text the GM says out loud, not a description of the
  scene for the GM to paraphrase. Write the words.
- **Key thing first.** Lead with the load-bearing sensory hit; let the rest follow.
- **Register-tag it, and match the scene's tempo.** `*(slow, sensory)*` when the crew has time to
  look; `*(clipped — chaos)*` when it's fast and dangerous — short, 1–2 punches, sentence fragments.
  A scene that shifts tempo gets **two boxes** (e.g. a calm arrival and a hot turn), each tagged.
- Keep it short. A read-aloud box is a hit, not a paragraph of scene-setting.

## Workflow — one pass, then review

1. **Read everything first** — the source and any `*-critique*.md` (honour choices already made).
   Confirm the source path; write to `<slug>-published.md` **beside the source**; never touch the source.
   Walk the context stack (`../rpg-dev/scripts/context_stack.py <source>`) to see what the adventure
   sits inside — a campaign doc holding a running clock, portraits in a parent `image/`, an
   `art_style.md` if you generate anything. Use it to check you aren't compressing away something
   the stack expects this adventure to carry.
2. **Draft the whole document in one pass** into the structure above ([TEMPLATE.md](TEMPLATE.md)).
   Quarantine reasoning into PREP; make every table field a primitive; tag audience; cross-link.
3. **Report the cuts** — a short list of what you compressed, merged, or moved to PREP, especially
   judgment calls, so the author can restore anything load-bearing. Never bury a real cut.
4. **Offer to render.** Scripts ship under `scripts/` (resolve relative to this SKILL.md):
   `scripts/pdf.sh <file>` (print packet; needs `pandoc`+`xelatex`), `scripts/wiki.sh <file>`
   (self-contained, browsable wiki HTML — sidebar nav and a GM/Player toggle that honours the
   audience wall; needs `pandoc`), `scripts/gen-cards.py` (pregen cards), `scripts/render-cards.sh`
   (card HTML → one-page PDF; needs headless Chrome). Offer, don't assume.

## The audience wall (ADR 0002 — fail-safe)

Content is **GM by default**. Promote only genuinely player-facing content:
- **Player-facing:** Description, Player Pitch, each Pregen's player card fields → tag the heading
  `{.player}` (cascades to nested headings until the next same-or-higher one).
- **Demote a spoiler** inside a player section back to GM: `::: gm … :::` (block) or `[…]{.gm}` (inline).
- **When unsure, leave it GM.** A `> PREP` box is GM by definition. A forgotten tag hides, never leaks.

## Cross-linking (structured references only)

Linkify **structured** references — `(Scene 3)`, a named NPC block, `GM Briefing`, a named clock —
with markdown anchors: `[Scene 3](#3-the-yammie-protest)`, `[Cordelia](#cordelia-ashworth)`. **Never
auto-link bare names in prose.** Put `\newpage` before each major section for clean print pagination.

**Links stay inside the published document.** The context stack is a prep-time convenience; at the
table there is no repo. Anything inherited that the GM needs mid-scene — a recurring NPC's Look, a
clock carried from the campaign doc, a rule the system file defines — gets **inlined as a primitive**,
not linked upward. A published doc that needs a parent directory open to run has failed the golden
rule. Say so in the cut report when you inline something this way.

## Stance

- Publish reorganizes and compresses **existing** content — it never adds material or re-critiques. A
  genuine contradiction spotted while condensing goes in the cut report, not a silent fix (that's
  [rpg-critic](../rpg-critic/SKILL.md)/[rpg-revise](../rpg-revise/SKILL.md)).
- One adventure = one `-published.md`; regenerable, so a re-run nukes and replaces it.
- **If a sentence explains *why*, it belongs in PREP or is cut. If it tells the GM what to say, roll,
  or resolve, it belongs in a table field, verbatim and terse.** That test resolves almost every call.
