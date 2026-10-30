# RPG NPC Cast — worked example & reference-image mode

Companion to [SKILL.md](SKILL.md). The prompt recipe, the register/stance rules, and the
default-fighting rules live there; this file holds one full worked prompt, one worked
correction, and the image-to-image path.

## Worked example (Tilda, the frightened witness)

Note the single register at full intensity, pinned to the eyes and a braced stillness — not
a pile of emotions, and not washed out to a calm blank.

> Candid 35mm film photograph, muted desaturated color, soft window light, grain, shallow
> focus. Head-and-shoulders portrait of a slight, sharp-featured woman of about 19 —
> heart-shaped face, wide-set pale eyes, small delicate features (in the vein of a young
> Carey Mulligan), a blunt mod fringe dyed black. No makeup, no smile, unposed. One clear
> register — quiet dread: she stares fixedly past the camera, eyes held wide and unblinking,
> jaw tight, shoulders drawn up, as if listening for footsteps. Not crying, not composed —
> braced; the fear lives in her eyes and her stillness, nowhere else. An oversized cream
> fisherman's jumper; she holds a worn leather shop ledger against her chest; bitten nails.
> Behind her the dim, cluttered interior of a 1960s curio shop, warm lamplight, deep
> shadows. Not glamorous.

## Worked correction (an imposing NPC, flat-screenprint house look)

A first batch of three that failed *identically* on four axes, and the clause rewrites that
fixed all four on the next batch of three. The subject: a heavy, powerful industrialist past
seventy, with a brass prosthetic forearm and an augment socket at the temple.

| Wanted | First attempt | What came back (3/3) | Rewrite that worked (3/3) |
|---|---|---|---|
| He looms | "low angle looking slightly up so he looms and overfills the plate, shoulders pressed against the edges, crown cropped" | Centered, eye-level, full standing figure with headroom — reads slim and ordinary | "camera placed **BELOW** the level of his chest and tilted up […] crown cropped by the top edge, shoulders run off both edges, cut off at mid-chest […] **do not** show his waist, hips or legs; **do not** center him as a small standing figure in a room; **do not** shoot at eye level" |
| A brass arm | "a polished brass mechanical hand held up into the frame" | A raised, open-palmed wooden artist's mannequin hand — a gesture, not a limb | "the arm hangs **down** at his side with the brass hand closed around a length of steel bar stock […] a working limb, not a gesture, never raised, never open-palmed, never a wooden artist's mannequin hand" |
| An augment socket | "a faint guttering blue at one temple" | A blue sticking plaster | "a small fitting set into the skull where bone has been replaced by machined metal, leaking a faint cold blue glow rendered as stippled grain — absolutely **not** a bandage, sticker, plaster or bruise" |
| Flat colour plates | Environment listed as a lathe, a shelf of castings, a chandelier, tall arched windows, a concrete floor | Blended facial shading, cross-hatch texture — the flat house look lost | Cut to a chandelier silhouette, one work-lamp, and one huge hard-edged cast shadow on a bare wall; plus "the face is built from only two or three flat grey plates meeting at one hard shadow edge down one side — no blended or airbrushed shading, no soft modelling" |

Two things to take from it. The failures were **unanimous**, which is what identifies a clause
the model isn't reading — three more samples would have produced three more of the same. And
the environment cut was not cosmetic: dropping the object inventory is what let the flat
treatment and the cast-shadow device come back.

## Reference-image mode (stronger likeness)

Drop the photo — an actor headshot or a film still — into `image/source/`, then pass it
with `-r` to restyle it instead of generating from scratch. Repeat `-r` for several
references. Write the prompt as an *edit*: keep the face, change everything else (age it,
add the stress, the period costume, the setting, the film-stock look).

```
~/work/bin/python <skill>/scripts/cast-npc.py -a <adventure-dir> --npc "Tilda Merrick" \
    -r <adventure-dir>/image/source/mckenzie.jpg -p "Keep this face. Restyle as: <clauses 1,3–7>"
```
