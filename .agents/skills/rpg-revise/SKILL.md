---
name: rpg-revise
description: Fold a human-answered rpg-critic critique log back into the adventure module it critiques — walk findings in order, apply the fixes the author accepted, ask when a response is ambiguous or design-level, and keep setting/rules canon by grepping the reference files. Use when the author has replied inline to a critique and wants the changes applied to the module, or mentions revising/resolving a critique, applying critic findings, or "action the critique"; NOT for producing the critique (rpg-critic) or first-draft authoring (rpg-dev).
---

# RPG Revise — Apply a Critique Back to the Module

Close the loop between [rpg-critic](../rpg-critic/SKILL.md) and [rpg-dev](../rpg-dev/SKILL.md).
The critique file is a **dialogue log**: rpg-critic wrote stable-ID findings, the author replied
on the `→ Response:` lines. Your job is to turn those replies into concrete edits in the module,
one finding at a time, without breaking canon.

The author's response is the authority, not the critic's proposed fix. A response may *accept*,
*reject*, *redirect* ("the fix is X instead"), or just *nudge* ("maybe Concord lets her up") —
read intent, don't pattern-match keywords. `→ Status:` is usually blank; that's normal.

## Workflow

1. **Gather inputs.** The critique file (`*-critique*.md`). Read its metadata header to find the
   **module** it critiques and the **reference files** (setting/lore, campaign notes, system rules)
   it was checked against. Confirm the module path with the author before editing anything.
   If the header lists no reference files, or the module has moved since, recover them by walking
   the module's context stack — `../rpg-dev/scripts/context_stack.py <module-path>`; the
   directories above the module are where canon lives
   ([CONTEXT-STACK.md](../rpg-dev/CONTEXT-STACK.md)).
2. **Read the whole module and the whole critique first.** Parse every finding into ID, severity,
   the critic's point + proposed fix, the author's Response, and Status. Build the work list.
3. **Do the Z section first.** Section Z is author→LLM directives (rename an entity, drop an NPC,
   weave in a theme). These ripple across the whole module, so applying them first means every
   later edit already uses the new names/structure. Then work A→G in file order.
4. **For each finding, classify the response** (see below) and act. Grep before you edit.
5. **Record the resolution** on that finding's `→ Status:` line as you go — never silently.
6. **Report** at the end: what was applied, what still needs the author, what was skipped.

## Classifying each response

- **Clear directive** (accept, or "do X instead") → apply it. Don't ask; just do it and record.
- **Nudge / "maybe" / open question / poses a question back** → this needs a design decision.
  Use **AskUserQuestion** with 2–4 concrete options for the edit you'd make (the author picks or
  uses "Other" to steer). Write only after they choose. Item by item.
- **Rejected / deferred** → leave the module untouched; mark Status and move on.
- **No response at all** → ask whether to apply the critic's proposed fix as-is, or skip. Don't
  invent an answer for a finding the author hasn't weighed in on.

Batch only *tightly related* questions (e.g. Z4 drops an NPC and B2 is about that NPC). Otherwise
keep it one finding at a time, as instructed.

## Keep the module coherent — grep, don't guess

Every edit lives inside a larger document; a local fix can contradict something three scenes away
or a fact in the lore.

- **Before editing**, grep the module for the entity the finding touches (NPC, location, rule,
  clock) to find *every* place it appears — a rename or a drop must hit all of them, not just the
  scene the finding cites.
- **When a fix asserts a fact about the world** (a name, a faction, a rule, a timeline), grep the
  **reference files** to confirm the module now agrees with canon. Bend the module, not the setting,
  unless the author says otherwise. Cite the reference file + section in your Status note. Where two
  layers of the stack disagree, the **narrower wins** — a campaign doc that has moved a faction on
  beats the system book, and that is not a contradiction to fix.
- **When a fix changes a number or a rule** (pool size, a clock, an ability), grep the module for
  the other places that number/rule is stated and reconcile them so the game stays internally
  consistent — the kind of contradiction rpg-critic flags in section A.
- Preserve the module's voice and [TEMPLATE.md](../rpg-dev/TEMPLATE.md) structure. Write direct
  prose and concrete examples into the file, matching rpg-dev's terse, table-ready style.

## Recording resolutions

After acting on a finding, fill its `→ Status:` line in the critique file so the log stays a
durable record of what happened. Revision is iterative — a re-run of rpg-critic on the revised
module reads these Status lines to see what was already addressed, so mark every finding:

- `accepted — applied: {one line on the edit + where}` — done in the module.
- `redirected — applied: {what you did per the author's alternative}`
- `discuss — {the open question}` — waiting on the author; leave the module unchanged.
- `rejected` / `deferred` — per the author; module unchanged.

Leave `→ Response:` lines untouched — they're the author's. Don't delete findings; the file is the
record. When new work surfaces mid-revision, add it to the module's **Open Threads**, not here.

## Stance

- The author's reply wins over the critic's proposed fix, and over your own read.
- A design nudge is an invitation to propose a concrete edit, not license to improvise the module.
- Never apply a 🔴 structural fix and a contradicting one elsewhere — reconcile numbers and names
  across the whole file, then record where.
