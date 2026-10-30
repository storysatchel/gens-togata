# Style study — tuning an `art_style.md` against real reference art

When generated images are "close but not it" and rewording the style block isn't
converging, stop adjusting adjectives and measure. Two scripts, both in `scripts/`:

- **`style_metrics.py`** — measures *how* an image is rendered: drawn-line and hatching
  density, halftone periodicity, where the grain sits (flat fields vs. shading
  transitions), flat/ramp/edge shares, black and white share, chroma, hue count, cream
  border, aspect. Input is a CSV of `group,path,crop`.
- **`style_study.py`** — runs a matrix of subjects × prompt versions × variants through
  Gemini from a `study.json`, then builds one contact sheet per subject and measures every
  image against the reference group. Resumable; `prompts` writes the exact prompt text
  without spending anything.

Both need `opencv-python` and `numpy`; `run` also needs `google-genai` and `GEMINI_API_KEY`.

## The loop

1. **Reference set.** Pick 10–15 target plates of the kind you're generating (figures and
   scenes, not logos or handouts). Crop out typography with the `crop` column —
   lettering skews the black/white and edge numbers. Add 10–15 of your current generated
   images as a second group.
2. **Measure before theorizing.** `style_metrics.py ref.csv --sheet sheet.png`. Look for
   metrics where the groups don't overlap at all; those are the real differences. Metrics
   where they match tell you what *not* to fix.
3. **Look at the same scale.** Crop both groups to the same pixel density and view them
   side by side. Names for a style ("riso", "screenprint", "cut-paper") are where the
   first analysis goes wrong; the crops show what the marks actually are.
4. **Write versions that each change one thing.** Keep the current prompt as version A.
   Fix subjects, vary only the style/palette/framing blocks. Three subjects (a portrait, a
   recreation of one reference plate from text, an action scene) and three variants each
   separate a real effect from sampling noise. 5 versions × 3 subjects × 3 ≈ 45 images,
   about US$1.75.
5. **`style_study.py run`, then `review`.** Rank by eye first, then check the numbers.
   The author's eye decides; the metrics catch what the eye adapts to.
6. **Fold the winner into `art_style.md`** — master block, palette rule, negative prompt —
   and record the failure modes the study surfaced in its working notes.

## Lessons that generalize

- **The style vocabulary an LLM reaches for is a guess.** An analysis written from
  thumbnails produces confident print-history terms that may not describe the marks.
  Each term also has strong associations in the image model ("halftone" → comic
  dots everywhere, "cut-paper" → collage cartoon).
- **Bans matter as much as asks.** A negative prompt that forbids the reference's actual
  shading technique ("no gradients, no airbrush") forces the model to fake it with
  whatever is allowed — usually hatching.
- **Accents must come from the scene.** A colour assigned for emphasis reads as forced; one
  that is a light, a glow or a material in the scene reads as natural.
- **A style reference image** pulls rendering closest but leaks its palette and garments;
  guard it with "take subject, composition and every colour from the text."
- **Set the aspect through the API** (`cast-npc.py --aspect`), not the text.
