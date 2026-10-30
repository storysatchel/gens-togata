---
name: rpg-npc-cast
description: Generate portrait images for an adventure's NPCs from their casting notes using Gemini 2.5 Flash Image ("Nano Banana"), de-glamorizing the suggested actors so faces fit a stressed, in-period, in-setting character instead of a smiling red-carpet photo. Use when the user wants to cast, illustrate, portrait, or generate images/faces for NPCs in an rpg-dev adventure file, or mentions Nano Banana / Gemini image generation for a module.
---

# RPG NPC Cast — Portraits from casting notes

Turn an NPC's written **Visual** and **Cast** notes into a portrait that looks like a
real person under real pressure in the setting — not the actor smiling on a red carpet.
You write the prompt (the judgment); [scripts/cast-npc.py](scripts/cast-npc.py) does the
mechanical part.

## Two routes

Same prompt recipe and layout either way — pick based on what the user pays for:

- **API route** — the script calls Gemini and files the images automatically. Needs a
  billing-enabled Gemini API project (the free tier's image quota is 0; a consumer Google
  AI Pro/Advanced subscription does **not** grant API access). roughly 4 US cents per image.
- **Prep route (free with AI Pro)** — `--prep` sets up the folders and hands you the prompt;
  you generate in the Gemini app / AI Studio UI (covered by AI Pro), download the image
  into `image/source/`, and `--promote` it to current. No API key, no per-image cost.

## Setup (once)

- Install the SDK (API route only): `uv pip install --python ~/work/bin/python google-genai`
- API route also needs a key from [Google AI Studio](https://aistudio.google.com/apikey)
  on a billing-enabled project: `export GEMINI_API_KEY=...` (also accepts `GOOGLE_API_KEY`).
- Prep route needs neither.

## Layout

`cast-npc.py` owns a per-adventure folder so the current face is always one grab from the top:

```
<adventure-dir>/image/
    <npc>.png            current portrait (latest generation, auto-promoted)
    source/
        <npc>-v1.png …   superseded portraits and extra variants
        <actor>.jpg      reference images you drop in for -r
```

The script creates `image/` and `image/source/` on every run. `--npc "Tilda Merrick"`
slugifies to `tilda-merrick`. Put reference images under `image/source/` yourself.

**Pass `-a` as an absolute path.** It is resolved against the current working directory,
which part-way through a session is often no longer the repo root. A relative path that
worked earlier will then quietly build a nested duplicate tree (`<adv>/<adv>/image/…`) and
file the portraits in it — the script reports success and the paths it prints look right,
so the only symptom is that the portrait you asked for never changes.

## Workflow

1. **Locate** the adventure file and the NPC(s) to cast. Read each NPC's
   Role/Wants/Secret/Voice/**Visual**/**Cast**, and the **Premise** for period and place.
   Then walk the context stack for the setting's house look:
   ```
   ~/work/bin/python ../rpg-dev/scripts/context_stack.py <adventure-dir> --asset art_style
   ```
   It prints the nearest `art_style.md` (adventure overrides campaign overrides system) or
   exits 1 if the project has none. See [CONTEXT-STACK.md](../rpg-dev/CONTEXT-STACK.md).
2. **Write the prompt** per NPC using the recipe below. Confirm one prompt with the user
   before generating the whole cast — the house look should be agreed first.
3. **Generate** — one of:
   - *API route:*
     ```
     ~/work/bin/python <skill>/scripts/cast-npc.py -a <adventure-dir-or-.md> \
         --npc "Tilda Merrick" -n 3 -p "<prompt>"
     ```
     The first image becomes current `image/<npc>.png` (any prior current archived to
     `source/` as `-vN`); extra variants (`-n 3`) land in `source/` to choose from.
   - *Prep route:* add `--prep` (drop `-n`) — saves the prompt to
     `image/source/<npc>.prompt.txt` and prints it. Paste into the Gemini app, download the
     result into `image/source/`, then promote it (step 4).
4. **Review** — read the variants against *each other* before reading them against the brief
   (see Diagnosing a bad batch below), then iterate on the prompt and regenerate, or promote a
   variant/download: `cast-npc.py -a <dir> --npc "Tilda Merrick" --promote tilda-merrick-v2.png`.
   A refusal exits with code 2 and prints what the model said.
5. **Record** the portrait under the NPC, e.g. `- **Portrait:** ![Tilda](image/tilda-merrick.png)`.

## The prompt recipe

Build each prompt from these clauses, in order. The first clause is the **house look** —
keep it identical across every NPC so the cast reads as one production. When it comes from an
`art_style.md` in the context stack, that clause is not yours to compose: it is the setting's,
shared by every adventure under it.

1. **Medium / house look** — **if the stack has an `art_style.md`, its master style block
   *is* this clause. Paste it verbatim** and obey the rest of that file: its palette rule,
   its negative prompt, its period content rules, and one of its compositional devices (one
   or two, never stacked). Do not paraphrase a style block — it is tuned wording, and
   rewording it is how a cast drifts apart between sessions.

   With no `art_style.md`, write the clause yourself — e.g. *"Candid 35mm film photograph,
   muted desaturated color, soft available light, grain, shallow depth of field"* — agree it
   with the user, and once it's working **offer to save it as `art_style.md` at the broadest
   layer it's true for** (usually the system directory, so the whole setting inherits it),
   with the master block, the palette rule, and the negative prompt as separate sections.
2. **Subject + age + likeness** — describe the *features* implied by the cast actor at the
   right age ("a slight, sharp-featured woman of about 19, heart-shaped face, wide-set pale
   eyes"). You may add "in the vein of a young <actor>" as a cue, but expect the model to
   sometimes refuse a named celebrity — if it does, drop the name and keep the description.
3. **De-glamorize** — *no smile, no makeup glam, no studio/red-carpet lighting;* natural
   skin, tired, unposed.
4. **Register** — if rpg-dev gives the NPC a **Register**, use that emotion directly (most
   NPCs have a fixed one at introduction — Tilda is always frightened, Anselm always
   threatening). Otherwise derive the direction from their **Stance**:
   - *Sympathetic* → the register **pulls the player in**: need, warmth under strain, appeal
     (Tilda's fear).
   - *Antagonistic* → it **pushes or threatens**: menace, appetite, cold contempt (Anselm's
     patient hunger).
   - *Ambiguous* → it **withholds**: a face you can't read, an unsettling calm that could
     break either way.

   Either way, render **one** emotion, at **full intensity**, pinned to a
   **specific physical tell** (the eyes + a held stillness: "eyes fixed past the camera, jaw
   tight, braced — the feeling lives there and nowhere else"), never a list. Two failure
   modes: *stacking* signifiers averages into generic "sad"; *diluting* to "a faint
   undercurrent" washes the character into a pretty blank. Focus, not volume. Iterate by
   re-aiming this one clause.
5. **Period + costume** — from the Visual line and the Premise's era.
6. **Environment** — the light and place where the players meet them. Give it as **reduced
   geometry and silhouettes, never an inventory of objects** — "the flat rectangle of a
   chair-back and a doorframe behind him, reduced to plain geometric shapes" holds a
   stylized look; "a lathe, a shelf of castings, a chandelier and tall arched windows"
   reads as an instruction to *render*, and the face comes back softly modelled with the
   house style gone. Budget about two background elements. A near-empty background is also
   what gives a strong cast shadow room to work as its own graphic shape.
7. **Framing** — *head-and-shoulders portrait, single subject.* For any composition that
   departs from that, see Fighting the defaults below — a positive description of the shot
   you want is not enough on its own.
8. **Palette** — only if `art_style.md` defines palette regimes. Pick the regime from the
   NPC's emotional register, not from the literal colors of the place they're standing in,
   and hold to that file's accent rule.

### Fighting the defaults

The model has strong priors about what a portrait is, and **a positive instruction gets
averaged into the prior rather than replacing it.** Describing the shot you want, however
vividly, loses to the default; naming the default and forbidding it wins. Whenever you
depart from a centered, eye-level, headroom-above medium shot, write all three of:

- **the camera as a physical fact** — where it is in space relative to the body
  ("camera placed BELOW the level of his chest and tilted up"), not the effect you hope for
  ("shot so that he looms");
- **which edge crops what** — "the crown of his head is cropped by the top edge, his
  shoulders run off both left and right edges, cut off at mid-chest by the bottom";
- **an explicit prohibition naming the default** — "do not show his waist, hips or legs; do
  not center him as a small standing figure in a room; do not shoot at eye level."

**Scale (imposing NPCs)** is the usual case: left alone the default *neutralizes size*, and a
6'4" enforcer comes out an ordinary bloke. Use the three clauses above with a low angle and
slight wide-lens foreshortening, and avoid seated or leaning-on-forearms poses — they shrink
the subject and read as harmless. The same three-part treatment is what to reach for any time
a composition clause is being ignored.

### Anything that isn't real

Prosthetics, implants, ghosts, glowing anomalies — the model resolves underspecified
strangeness to **the nearest mundane object**, reliably and repeatably. "A faint guttering
blue at one temple" is a sticking plaster every single time. Give three things:

- **mechanism** — what it physically is ("a fitting set into the skull where bone has been
  replaced by machined metal, leaking a cold blue glow rendered as stippled grain");
- **attachment and action** — what it joins to and what it is doing right now. An unattached
  or idle feature becomes a prop: "a brass hand held up into the frame" returns a raised
  wooden artist's mannequin hand; "the arm hangs down at his side, the brass hand closed
  around a length of steel bar stock" returns a working limb;
- **a disavowal** — name the mundane thing it must not be mistaken for ("absolutely not a
  bandage, sticker, plaster or bruise"; "a working limb, not a gesture, never raised, never
  open-palmed"). You can usually predict the wrong object from the first batch and name it.

### Diagnosing a bad batch

Generate `-n 3` and use the variants as a **test, not a menu**. Whether the three fail the
same way tells you what to fix:

- **All three fail identically** — the clause is not being read. Rewrite it; regenerating is
  wasted money. Unanimity across variants is the signal, and it is reliable enough to act on
  after one batch.
- **The three differ** — the clause is landing and you are seeing sampling spread. Regenerate,
  or promote the best.

Subjects that depart from ordinary human physicality (imposing bodies, manufactured or
non-human faces) need the most rounds; reach for the two sections above early with those
rather than after three disappointing batches.

See [RECIPE.md](RECIPE.md) for a full worked example (Tilda) and the reference-image (`-r`)
restyle mode.

## Notes

- One subject per image; generate supporting NPCs separately, not as a group shot.
- Keep the house-look clause byte-identical across the cast for visual cohesion — and when
  it comes from an `art_style.md` at system scope, that cohesion covers every adventure in
  the setting, not just this module's cast. Improve the shared style by editing that file,
  never by tweaking the clause in one prompt.
- `cast-npc.py` is a thin wrapper: model default `gemini-2.5-flash-image`, override with
  `--model`. Filenames come from `--npc`; you never pass an output path.
- `--aspect 2:3` (or any of 1:1, 3:2, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9) sets the output
  shape through the API, not the prompt text, and overrides a `-r` reference's shape — an
  approved square plate plus a "reproduce exactly, extend the scene to a tall frame" prompt
  comes back as the same plate in the new shape. Every result is checked against the
  requested ratio and a mismatch prints a WARNING. Use it whenever `art_style.md` asks for
  a non-square plate.
- When the house look is close but rewording isn't converging, measure it against the
  reference art instead: see [STYLE-STUDY.md](STYLE-STUDY.md).
