# The Operator's Ledger, visual walk-through: recipe build (style 02)

**The visual companion to the Monday Operator's Ledger episode** (Wesley, 27 Oct 2026). Monday's episode deals with one case: its figures, its puzzle and its question, walked through by voice with its own template and calmer mood. That is done once it airs. This video takes **the same concept and explains it in general**, visually: livelier, more striking, music-led, no voice. **Never reuse Monday's figures, case or question.** Use a generic illustrative example that shows how the concept works for any business. It is not a separate series: it belongs to The Operator's Ledger and carries that week's episode number and topic. Its style is Wesley's recipe-build prompt (style 02): the concept's named parts poured into one glass, one ingredient per bar, ending on a recipe card and a question.

**Use it for:** a model built from named parts (a stack such as unit economics or a P&L; an assessment such as Five Forces; a multiplier such as LTV or Little's Law). If that week's model fails the fit test (a 2×2, a process chain, a cycle), say so and stop: it needs another style. Idents, openers, teasers and loops belong to `brand-motion`; the narrated Monday episode itself to `ledger-fresh`. Where this brief and `motion.md` disagree, this brief wins.

The document has three parts, in the order the prompt itself sets out its three layers:
1. **Studio notes:** how the style runs in this engine. These win over the style prompt where they differ.
2. **The WRW pack:** the brand layer.
3. **The style prompt:** Wesley's document, verbatim. Its recipe-card template is section 16.

---

## 1. Studio notes (this engine)

**Frame 0 is the thumbnail.** Wesley's standing rule is that frame 0 is a finished, held title card. So open on the title already set over the empty vessel, held for the first 0.3 s, and let the hook question resolve over bar 2. The style prompt's "title b1" becomes "title on screen at frame 0".

**Build in the Motion Studio engine, not a second pipeline.** Section 10's own `window.seek(t)` and ffmpeg commands describe what the engine already does, so follow the engine:
- the composition paints everything in `render(t)`;
- `M.scene({ width: 1080, height: 1080, fps: 60, subframes: 3, bpm: 100, duration, cuts, holds, score })`;
- `motion_preview`, then `motion_draft`, then `motion_final`, with `series: 'recipe-build'`.

The engine samples its three subframes at i, i+⅓ and i+⅔ of a frame rather than centred. That difference is accepted. The 4:5 and 9:16 re-layouts are separate compositions at those sizes.

**Declare the reading holds.** Put every intended still hold (the insight, the closing question, the recipe card, the key ingredient's second bar) in `holds: [[from, to], …]` in seconds, each 8 s at most. The engine's dead-frame scan then allows stillness inside them, as section 5.3 asks. Outside a declared hold, something must stay alive: the liquid's idle surface, a pour, a settle.

**Loudness:** the series file sets −14 LUFS with the limiter at −1.5 dBTP (AAC encoding adds about 0.1 dB, so the delivered file lands under the −1 dBTP the style asks for). The engine finishes the score to that on its own.

**Sound:** use the sound kit, never audio files:
- the bar voices, written for this style: `S.felt` (source in), `S.pour(t, dur, { from, to })` (rising pitch as the glass fills), `S.droplet` (settle), `S.paper` (measure lands), `S.ice`, `S.swirl(t, dur)` (stir), `S.clink` (garnish), `S.page` (recipe card);
- the music from the jazz voices: `S.chord` and `S.keys` for soft keys, `S.brush` for the brushed pulse. Keep it about 8 dB under the effects, and keys only during the holds.

**Text:**
- **Draw measures and captions as DOM or SVG text, not canvas text.** The engine then checks every quarter second that no two pieces overlap.
- **Tabular figures:** use them where the font supports them. If a value counts up, lay the line out by its final text (`tpl`), so nothing after it jitters.
- **Blur:** text must never be blurred while settling. Keep text moves small (opacity and the 6 px y-offset), because the subframe blur smears anything that moves fast.

**Weights:** the kit's Archivo has 400 and 500. Use 500 wherever the style asks for 600; the values at 44 px and above carry it. Heavier weights would need a font download Wesley approves.

**What carries over from the other briefs:**
- colour changes as hard-edged wipes, never blends;
- 3D shaded relative to the camera (the admire phase is 2D, so this rarely applies);
- shapes waiting off stage get zero width *and* zero height.

**Status:** this is version 1.0 of the style and still untested. The first production sets version 1.1. After it is approved, write its lessons at the end of this file.

---

## 2. The WRW pack

| # | Requirement (style §15) | WRW |
|---|---|---|
| 1 | Light ground, ink, card, muted text | Ground **bone** `#F3F2F2` (L* 96) · ink **`#201E1D`** (L* 11) · card **`#FBFAFA`** with ink text and a 1 px rule-grey `#D6D2CF` edge · muted text **warm grey `#4A4644`** |
| 2 | Layer ramp, 3–5 neutrals ≥ 12 L* apart, plus one accent | Neutrals, darkest to lightest: **ink `#201E1D` L* 11** · **warm grey `#4A4644` L* 30** · **mid warm grey `#6A6564` L* 43** · **light warm grey `#8A8685` L* 56** · **pale warm grey `#B2AEAB` L* 71** · **rule grey `#D6D2CF` L* 84**. Choose the steps for the number of ingredients so that each neighbour is at least 12 apart. The ramp includes ink, so a sixth ingredient can be served. **Accent: red `#EC3013`, L* 52, on the key ingredient only.** The layer directly under the red must be ink, warm grey, pale warm grey or rule grey (11, 30, 71 or 84). **Never mid or light warm grey (43, 56): their edge with the red disappears in greyscale.** Deep red `#B6240E` (L* 40) and coral `#EF7E6C` (L* 65) are not layer colours; coral is for the garnish. |
| 3 | Display and UI faces, licence, tabular figures | **Archivo** (SIL Open Font License), 400 and 500, self-hosted from `kit/fonts/`, for both display and UI. Values at ≥ 44 px in 500. |
| 4 | Logo, where, clear space | The WRW mark. On the light ground use the ink mark (`kit/logos/wrw-mark-ink.png`); on an ink panel, the white mark. **Sign-off only**, at least 120 px wide, with clear space all round equal to the mark's height. |
| 5 | Garnish style | Flat shapes in pack colours: a **citrus wheel** (coral rim, bone segments, warm-grey pith lines) or a **rosemary sprig** (warm grey stem, mid-grey needles). One per video. |
| 6 | Voice, series, episode, CTA, Next | British English; £ with comma thousands; a true minus sign (−); sentence case for captions, Archivo caps with letter-spacing for chips. **Series: The Operator's Ledger**, with that week's episode number and topic (from `videos/operators-ledger/EPISODES.md`). **The worked example is generic:** round, illustrative figures that show how the concept works in general, chosen fresh, never Monday's numbers or case. Label them "Illustrative". **The closing question is general too:** one question about the concept that any owner could ask of their own business, not Monday's question. Sign-off: THE OPERATOR'S LEDGER · Episode N: Topic, the WRW mark, WRW HOSPITALITY, Wesley Williams (no job title). **Next:** "Next Monday: " plus the next episode's topic from the plan. **CTA:** "Every Monday on The Operator's Ledger". |
| 7 | Filing and naming | Inside the episode's own folder: `videos/operators-ledger/episodes/epNN-topic/recipe/` (one master folder per series, nothing loose in `videos/`). Files: `operators-ledger-epNN-topic-recipe-1080.mp4` (and `-1350`, `-1920` for re-layouts), `…-cover-1080.png` at the settled recipe card, the source, the beat contact sheet, and the recipe card and storyboard as signed off. |

**Truth (style §2):** worked examples carry the "Illustrative" chip. A real figure needs a source line, and if a source is missing, stop and ask.

---

## 3. The style prompt (Wesley's document, verbatim)

# Recipe Build Motion Prompt

**Style 02 in the motion library.** Brand-agnostic. Use it for explainers that build an idea out of named parts, the way a drink is built from ingredients.
**Version:** 1.0 · 27 Oct 2026
**Origin:** adapted from a 60-second cocktail recipe prompt (kept verbatim in the appendix). It is rebuilt here for business explainers such as the MBA series.
**Status:** untested. The first production will set version 1.1.

> **How this document works.** It is the style only. It covers how a recipe-build video looks, moves, sounds, is built and is checked. It contains no brand. Every production combines three layers:
>
> 1. **This style prompt.** It never changes per video.
> 2. **A brand or series pack.** It holds colours, the layer ramp, type, logo, voice, series name and filing.
> 3. **A recipe card and storyboard.** These cover this episode's ingredients, measures and bar map (section 16).
>
> When the layers disagree:
> - The pack wins on brand matters.
> - This prompt wins on motion, build and QA.
> - The recipe card can override either one only where it says so and gives a reason.

---

## 1. What the style is

A single vessel stands in the same spot for the whole video. One by one, the parts of an idea are poured into it. Each part is an ingredient. Its value, rating or quantity is the measurement, set in clean type beside the level line as it settles.

When the vessel is full, the final touches turn the parts into one idea:
- **The stir** combines the parts into the result.
- **The garnish** adds the insight.
- **The admire moment** has the camera ease in, then the measures re-form into a recipe card, so the viewer leaves with the whole formula in one frame.

The viewer should feel they watched something being made, and that they could make it themselves.

**Defining traits:**
- **One vessel, one spot.** The glass never moves. Only the camera does, and only for the finish.
- **One ingredient per bar.** Each part arrives, pours, settles and is labelled on the beat.
- **Layers stay readable.** Each ingredient keeps its own visible band until the stir, so the viewer can see the composition. In business models the composition is the lesson.
- **Measures accumulate.** A measurement never disappears once shown. By the end, every part and its measure is still on screen.
- **Product-shot look.** A soft studio backdrop, a crisp vessel and clean liquid, rendered in code.
- **Curiosity over completeness.** The video opens a question and lands one insight. It does not teach the whole model.

**Honest limit.** The engine is HTML and SVG, so the look is a stylised product shot rather than photography. It gives you rim highlights, specular streaks, a contact shadow and clean liquid with a meniscus, but not photorealism. Photoreal liquid needs a generative video model, and those cannot hold exact type or brand colour. Keep generative footage out of this style.

---

## 2. Model fit test (run before anything else)

Not every model is a recipe. Decide the mapping first. If none fits, use another style from the library.

| Model shape | Examples | The vessel holds | Each ingredient | Measure shown as | The headspace (empty part at the top) means |
|---|---|---|---|---|---|
| **Stack** (parts add up to a whole) | Unit economics, P&L, cost build-up, price build | The price or the total | A cost or component | Money and percentage, e.g. £3.60 · 30% | What's left: margin |
| **Assessment** (parts rated, not measured) | Porter's Five Forces, PESTLE, risk factors | The pressure or exposure | A force or factor | Word rating plus a jigger count: Low ● / Medium ●● / High ●●● | What's left for you |
| **Multiplier** (parts multiply) | Little's Law, LTV = AOV × frequency × lifespan, revenue = covers × spend | The result | One factor | The factor's value. The multiplier is shown as repeat pours: "2 a minute, for 15 minutes" becomes 15 quick pours of 2 | Capacity left, or none |
| **Does not fit** | 2×2 matrices (BCG, Ansoff), process chains (value chain), cycles (PDCA) | n/a | n/a | n/a | Use another style |

**Measurement honesty rules:**
- **Real figures** are shown only if they are sourced. Each one carries a muted source line.
- **Worked-example figures** are allowed but must be labelled once on screen with a chip saying "Illustrative".
- **Assessment ratings** are judgements. Show them as words and jiggers, never as a computed score. Label them once as "Assessment" or "Illustrative".
- The headspace is shown visually and is never given a number, unless the model really produces one, as unit economics does with margin.

---

## 3. Inputs to ask for

1. **The pack.** Ask for the brand or series pack. If none exists, ask for:
   - palette and layer ramp (section 6.3)
   - fonts and their licence
   - logo files
   - voice rules
   - series name, CTA and filing location
2. **The model and its shape** (section 2). Ask for the worked example: the business, the figures and their source, or a confirmation that they are illustrative.
3. **The one insight.** The single line the garnish carries.
4. **The closing question.** The question the viewer is left with.
5. **Sizes.** The 1080 × 1080 master, plus optional re-layouts at 4:5 and 9:16.

Then list the recipe card with measurements and show the storyboard (section 16). After that, build without asking anything else, **unless one of these applies:**
- no pack exists
- a figure is presented as real but has no source
- the model fails the fit test

In those cases stop and ask.

---

## 4. Direction (creative rules)

A 60-second recipe explainer, from an empty vessel to the finished idea. Each ingredient and its measure goes into the vessel in turn:
- the pour
- the level rising
- the measure, in clean type beside the level line

Then come the final touches: the stir, the garnish, and a moment to admire it, ending on the recipe card and a question.

**Style:** clean, bright product photography in motion, rendered in code. A soft studio backdrop, a crisp vessel and clean liquid. One light source, upper left, consistent in every frame.

**Banned:**
- stock clip art and icon-pack illustrations
- glows
- generic gradients. The only exception is the studio light pool in section 6.1.
- particle bursts and splash clouds
- bouncy easing
- measurements you'd have to pause to read
- any text that leaves before it can be read aloud once
- photoreal or generative footage
- more than one accent ingredient

---

## 5. Rhythm and timing

### 5.1 The grid at 100 BPM

| Unit | Seconds | Frames at 60 fps |
|---|---|---|
| Beat | 0.6 | 36 |
| Bar (4 beats) | 2.4 | 144 |
| 60 s video | 25 bars | 3,600 |
| 30 s cut | 12.5 bars (12 bars plus a 1.2 s sign-off hold) | 1,800 |

### 5.2 The ingredient bar (the core unit)

Every ingredient uses the same four beats, so the rhythm becomes familiar:

| Beat | What happens |
|---|---|
| b1 | The ingredient's source (bottle, jigger or tagged pour spout) slides into the pour position above the vessel and settles on a spring. Its name label appears on it |
| b2 | The pour. The stream falls and the level rises. The stream length is proportional to the volume |
| b3 | The level settles with a small surface ripple. A hairline leader draws from the new level line out to the measure column |
| b4 | The measure lands in the column, fully settled. The source exits upward |

The measure stays on screen from b4 until the recipe card. Read time therefore keeps adding up, which is how this style avoids the "key points moved too fast" problem.

### 5.3 Read-time rules (numeric)

- **Minimum fully-settled hold** for any text = (words ÷ 2.5) s + 0.5 s.
- **Key ingredient** (the accent): two bars, not one. The second bar holds the full frame still while a one-line caption explains why it matters.
- **Insight (garnish) and closing question:** each holds for at least 2 bars (4.8 s) fully settled. No other motion is allowed in the frame during that hold, apart from the liquid's idle surface movement.
- **Recipe card:** holds for at least 3 bars (7.2 s).
- **Ingredients:** 3 to 6 per video. With more than 6, the measures cannot be read in a 60 s cut, so split the episode.

### 5.4 Default bar map for 60 s (25 bars)

| Bars | Time | Phase | Content |
|---|---|---|---|
| 1–2 | 0:00.0–0:04.8 | Open | Empty vessel in the studio. Title b1; the hook question resolves over bar 2 |
| 3 | 0:04.8–0:07.2 | The glass | Vessel label (what it holds) and an "Illustrative" or source chip. A scale ruler fades in on the vessel's side |
| 4–9 | 0:07.2–0:21.6 | Ingredients | One per bar (section 5.2). The key ingredient takes two bars. Five ingredients plus the key-ingredient hold = 6 bars |
| 10–11 | 0:21.6–0:26.4 | Stir | The parts combine into the result (section 7.4). The result value or line lands |
| 12–14 | 0:26.4–0:33.6 | Garnish | The garnish lands on the rim. The insight resolves and holds for 2 bars |
| 15–18 | 0:33.6–0:43.2 | Admire → recipe card | Camera eases in over bar 15 and holds through bar 16. Over bar 17 it eases out while the measure column re-forms into the recipe card (the formula). Bar 18 holds |
| 19–22 | 0:43.2–0:52.8 | Closing question | The question resolves and holds for 2 bars, then optional "levers" chips arrive one per bar |
| 23–25 | 0:52.8–1:00.0 | Sign-off | Series name and episode, "Next: …", logo, follow line. The final frame holds |

With fewer ingredients, give the spare bars to the garnish and the closing question. Never give them to faster pours.

---

## 6. The look

### 6.1 Studio

- **Ground:** the pack's light ground colour.
- **Light pool:** the one permitted gradient. It is a single soft radial pool behind the vessel. The luminance change is no more than 4% from centre to edge, and it is fixed for the whole video. It must read as studio light, not as a gradient.
- **Surface:** a seamless sweep, with no horizon line.
- **Contact shadow:** a soft ellipse under the vessel only, in ink at 12–18% opacity, blurred about 24 px at 1080. It is the only shadow in the frame.

### 6.2 The vessel

- Drawn in SVG with a clear glass body.
- **Outline:** the pack's ink at 35% opacity, 2 px.
- **Rim:** a 1.5 px white highlight along the rim.
- **Specular streak:** one vertical white streak at 40% opacity on the left wall, with a second thin streak at 15% on the right wall.
- **Shape:** a straight-sided highball by default, so equal measures produce equal heights. That keeps the composition honest.
- **Tapered vessels are banned for stack and multiplier models**, because the same measure would look different at different heights.
- **Size and position:** occupies 42–48% of frame height, with its centre at x = 38% of frame width. The right-hand side is free for the measure column.
- **Scale ruler:** a hairline ruler on the vessel's right wall, ticked in the model's unit. Assessment models get one tick per jigger.
- **Never moves.** No slide, tilt or bounce. The camera does the moving.

### 6.3 Liquid and the layer ramp

The pack defines a **layer ramp**: 3–5 neutral tints plus one accent.
- Adjacent layers must differ in lightness by at least 12 L* (CIELAB lightness), so the bands stay readable at feed size. **This includes the accent.** An accent can share its lightness with a neutral, in which case the edge between them disappears in greyscale and for many colour-blind viewers. So never place the accent next to a neutral of similar lightness.
- The accent goes to the key ingredient only.

Each layer is drawn with:
- a flat body fill
- a top surface ellipse 6% lighter than the body
- a 1 px meniscus line where the liquid meets the glass
- a faint refraction offset: the glass outline behind the liquid is shifted 2 px

**Order:** pour from least to most important, so the key ingredient lands last and on top, where the eye already is.

### 6.4 Type and the measure column

- **Column position:** a left-aligned column at x = 60% of frame width. Each measure sits on the y of its layer's top line, joined by a hairline leader.
- **Measure line:** two parts at most.
  - Name: the UI face, weight 500, at least 28 px at 1080.
  - Value: the display or UI face, weight 600, at least 44 px at 1080, with tabular figures.
- **Value length:** no more than 3 tokens, e.g. "£3.60 · 30%" or "High ●●●".
- **Units:** always shown.
- **No wrapping:** if a line wraps at 1080, cut words.
- **Collisions:** if two layers are too thin for their measures, nudge measures apart vertically by up to 24 px and angle the leader. Never overlap two measures.
- **Captions:** short lines in a caption band at the bottom 18% of the frame, never over the vessel. At most 12 words.
- **Source and "Illustrative" chips:** muted, at least 20 px at 1080, placed top-right.

---

## 7. Motion

### 7.1 Easing (functions of time, no CSS animation)

**Spring step** (from value a to value b starting at t₀; τ = t − t₀; ωd = ω√(1−ζ²)):

```
x(τ) = b − (b − a)·e^(−ζωτ)·( cos(ωd·τ) + (ζω/ωd)·sin(ωd·τ) )
```

**Exponential ease** (for levels and the camera):

```
x(τ) = b + (a − b)·e^(−τ/T)
```

A value that changes target several times is the sum of one response per change, so every value stays a pure function of time.

| Preset | Type | Settings | Use |
|---|---|---|---|
| `place` | spring | ζ 0.86, ω 18 | Sources sliding into pour position; chips |
| `type` | spring | ζ 0.90, ω 22 | Text entering |
| `level` | exponential | T 0.16 s | Liquid level following the poured volume |
| `slosh` | spring | ζ 0.55, ω 24, amplitude ≤ 3 px at 1080 | Liquid surface only (physical, not UI). Settles within one beat |
| `camera` | exponential | T 0.45 s | Camera ease in and out |

Never use ζ below 0.75 on anything except the liquid surface.

### 7.2 The pour

- **Volume:** the stream runs from the spout to the current surface. Its duration is proportional to the ingredient's volume, at no more than 0.9 s; larger volumes increase the flow rate, not the time.
- **Level:** the level's target equals the poured volume so far. In other words, the level is the integral of the flow, eased with `level`.
- **Stream shape:** a tapered ribbon in the layer colour, slightly narrower at the bottom, with one specular line.
- **Impact:** the stream's impact makes one ring ripple on the surface. No droplets or splash.
- **Multiplier models:** the source makes n quick pours inside the bar. Each pour is at least 3 frames, there is a 2-frame gap between pours, and a counter ticks beside the source. If n is above 15, show 5 pours, then a "× n" tag, then one long pour of the remainder.

### 7.3 Motion blur

- **Speed-based blur:** blur follows speed and direction on fast moves.
  - Apply an SVG `feGaussianBlur` with `stdDeviation` set separately per axis.
  - Each axis = |velocity on that axis (px/s)| ÷ 240, clamped to 0–10 px.
  - Velocity is the analytic derivative of the position function, not a frame difference.
- **Subframe blending:** the subframes then add true motion blur at render (section 10).
- **Text:** never blur text while it is settling. Text uses opacity and a 6 px y-offset only.

### 7.4 Final touches

- **Stir.**
  - A bar spoon drops in on b1 and makes two slow swirls over bars 10–11.
  - **Stack and assessment models:** layers stay distinct. They draw closer together, and a bracket draws the whole filled height with the result label: the total, or "Pressure on price".
  - **Multiplier models:** the poured factors visibly combine into one colour. The result number rolls up with tabular figures.
- **Garnish.** A single garnish lands on the rim on a `place` spring: a citrus wheel or a sprig, drawn as flat shapes in the pack colours. It sits on the headspace, and a bracket labels the headspace with its meaning (section 2). The insight line resolves in the caption band.
- **Admire.**
  - The camera eases in to 1.3× on the vessel and the garnish. The measure column stays fully legible, so the crop keeps the column in frame.
  - It holds, then eases back out.
  - As it does, the column slides left under the vessel and re-forms into the recipe card. This is a list of every ingredient and its measure, with an operator between lines (+, ×), ending in "= result". It is one card in the white or card colour with ink text.

---

## 8. Camera

- The camera is one transform on the stage wrapper.
- It is fixed (scale 1, centred) from frame 0 until the admire phase. The vessel is in the same spot throughout.
- It eases in and out once, in the admire phase, with the `camera` preset.
- Never set `will-change` on a scaled wrapper, or text rasterises soft.

---

## 9. Audio (composed in code, owned outright)

Build the soundtrack with the Web Audio API in an `OfflineAudioContext`. Render it to a WAV of exactly the video length (60.000 s at 48 kHz, stereo).

**Music.**
- Light and sparse at 100 BPM: soft keys and a brushed or shaker pulse.
- Four chords per 8 bars.
- About 8 dB under the sound effects.
- It drops to keys only during the insight and closing-question holds, so the words land.

**Sound effects, placed on the event time from the shared timeline:**

| Event | Recipe |
|---|---|
| Source in (b1) | Soft felt tap: a 120 Hz sine thump with a 60 ms decay |
| Pour (b2) | Band-passed white noise. The band's centre rises from about 600 Hz to about 1,400 Hz as the vessel fills, because a filling glass rises in pitch. Fade in 30 ms, fade out 80 ms |
| Level settles (b3) | A very quiet single droplet: a 900 Hz sine with a fast pitch drop |
| Measure lands (b4) | Paper tick: filtered noise burst, 20 ms |
| Ice (optional, first ingredient only) | Three short clicks: band-passed noise at 3 kHz, 15 ms each, 70 ms apart |
| Stir | Low swirl: noise through a slow-moving filter, 2 bars |
| Garnish lands | Glass clink: inharmonic partials at 2,400 / 3,900 / 5,600 Hz with exponential decays of 0.5, 0.35 and 0.2 s |
| Recipe card | Soft page turn: noise sweep, 250 ms |

**Mix and loudness:**
- Integrated loudness about −14 LUFS, true peak at or below −1 dBTP. Check with ffmpeg's `ebur128` and re-check against current platform guidance.
- The video must work fully muted. All meaning is on screen.

**Export:** encode the rendered `AudioBuffer` to 16-bit PCM WAV in the page, return it to Playwright as base64 and write it to disk.

---

## 10. Build and render

1. **File.** One HTML file at 1080 × 1080 (the master). Every style is computed from time inside `window.seek(t)`:
   - no CSS animations or transitions
   - no timers or requestAnimationFrame loops
   - no state carried between frames

   Fonts are self-hosted. Set `window.ready = true` after `document.fonts.ready` and all images decode.
2. **Timeline.** One ordered array of events `{t, type, target, value}` is built from the bar map. Visuals and sound effects both read from it, so moving an event moves its sound.
3. **Frames.**
   - Render with Playwright at 60 fps, with 3 subframes per frame at t = (n + (k + 0.5)/3) / 60, for k = 0, 1, 2.
   - Seek, wait for `window.ready` and two animation frames, then screenshot.
4. **Blend and encode.** The command below was tested on synthetic frames; it gives one clean 3-subframe average per output frame:

```bash
ffmpeg -framerate 180 -i sub_%06d.png \
  -vf "tmix=frames=3:weights='1 1 1',select='eq(mod(n\,3)\,2)',setpts=N/(60*TB)" \
  -r 60 -c:v libx264 -profile:v high -pix_fmt yuv420p -crf 12 -preset veryfast \
  -frames:v 3600 video_intermediate.mp4

ffmpeg -i video_intermediate.mp4 -i soundtrack.wav \
  -c:v libx264 -profile:v high -pix_fmt yuv420p -crf 18 -preset slow \
  -c:a aac -b:a 192k -movflags +faststart -t 60.000 final.mp4
```

5. **Stills gate.** Before the full render, render one frame per beat (100 stills for 60 s) as a contact sheet and look at every one. Fix anything:
   - cluttered
   - off the beat
   - overlapping
   - cropped
   - hard to read
   - under-held (check against section 5.3)
6. **Re-layouts (optional).**
   - 4:5 (1080 × 1350): the vessel stays at the same position; the measure column and caption band get the extra height.
   - 9:16 (1080 × 1920): the measure column moves below the vessel. Keep text out of the top 14% and bottom 20%.
   - Re-lay out each size; never crop.

---

## 11. QA checklist

**Story**
- [ ] The model passes the fit test; the vessel, measures and headspace map correctly.
- [ ] 3–6 ingredients; exactly one accent, on the key ingredient.
- [ ] One insight, one closing question.

**Read time**
- [ ] Every text meets the hold formula in section 5.3.
- [ ] Insight and question each hold for at least 4.8 s fully settled, with nothing else moving.
- [ ] Recipe card holds for at least 7.2 s.
- [ ] No measure ever leaves before the recipe card.
- [ ] Every measure's value is at least 44 px at 1080, at most 3 tokens, with units.

**Look**
- [ ] The vessel never moves.
- [ ] One light direction; one shadow.
- [ ] Adjacent layers differ by at least 12 L*.
- [ ] No banned items. The light pool changes luminance by no more than 4%.
- [ ] Nothing overlaps or crops at any delivered size.

**Truth**
- [ ] Every real figure has a source line.
- [ ] Worked examples carry an "Illustrative" chip.
- [ ] Ratings are shown as words and jiggers, never as scores.
- [ ] The recipe card matches the measures exactly.

**Audio and file**
- [ ] Every sound effect lands on its event, within 1 frame.
- [ ] About −14 LUFS, true peak at or below −1 dBTP.
- [ ] Works muted.
- [ ] 3,600 frames (for 60 s), H.264 High yuv420p, +faststart, AAC 192 kbps, under 50 MB.

---

## 12. Gotchas

- A tapered glass makes equal measures look unequal. Use straight sides for anything quantitative.
- Thin layers squeeze their measures together. Plan the column spacing in the storyboard, not in the build.
- A level that rises on a spring overshoots, which reads as wrong. Use the exponential ease, and put the springiness only in the surface `slosh`.
- Blurring text during motion makes measures unreadable in stills. Never blur text.
- If the camera's crop in the admire phase cuts off the measure column, the viewer loses the composition at the moment it matters.
- Fonts not loaded before frame 0 render in a fallback face.
- Wait for `document.fonts.ready`.
- Pours that get faster to fit more ingredients break the rhythm. Cut an ingredient instead.
- Generic "cocktail" colours (blue curaçao, neon) break the brand. Only use the pack's layer ramp.

---

## 13. Deliverables

- An MP4 for each size.
- A cover PNG for each size, taken at the frame where the recipe card is fully settled. That frame is the most useful single image.
- The source zip: HTML, fonts, timeline, audio script and WAV.
- The beat contact sheet.
- The recipe card and storyboard as signed off.

**Naming** (the pack may override):
- `{Series}-{Episode}-{Model}-recipe-{size}.mp4`
- `{Series}-{Episode}-{Model}-cover-{size}.png`
- `{Series}-{Episode}-{Model}-source.zip`

---

## 14. Variants

| Variant | Difference | Use |
|---|---|---|
| **Classic build** | As written | Most models |
| **Two glasses** | Two vessels side by side, built in alternating bars. Use 3 ingredients each, at most | Before-and-after, or comparing two businesses |
| **30-second build** | 12.5 bars: open 1 bar, 3–4 ingredients, stir and garnish combined in 2 bars, recipe card 3 bars, sign-off 1 bar plus a 1.2 s hold | Teasers and Reels cut-downs |

---

## 15. Pack requirements for this style

A pack used with this style must define:
1. Light ground, ink, white or card colour, muted text colour.
2. The layer ramp: 3–5 neutral tints at least 12 L* apart, plus one accent. Give hex values and the calculated L* for each.
3. Display and UI faces, their licence, and tabular figures available.
4. Logo files, where the logo may appear (default: sign-off only) and its clear space.
5. Garnish style: which garnish shapes, drawn in pack colours.
6. Voice rules, series name, episode format, CTA and "Next" line.
7. Filing location and naming.

---

## 16. Recipe card and storyboard template

### 16.1 Recipe card

| Field | Entry |
|---|---|
| Pack | |
| Series and episode | |
| Model and shape (section 2) | |
| Worked example | (business; real and sourced, or illustrative) |
| Vessel holds | |
| Headspace means | |
| Ingredients, in pour order (least → most important) | 1. Name · measure · source |
| Key ingredient (accent) and its one-line caption | |
| Stir result | |
| Garnish insight (≤ 12 words) | |
| Closing question (≤ 12 words) | |
| Levers chips (optional, ≤ 3) | |
| Recipe card formula | |
| Source line(s) | |

### 16.2 Storyboard

Times are from the first downbeat. 1 bar = 2.4 s; beats b1–b4.

| Bars | Time | Phase | On the beats | Text on screen (exact) | Hold check |
|---|---|---|---|---|---|
| | | | | | |

---

## Appendix. The original prompt (kept verbatim)

The cocktail prompt this style was adapted from. Where it differs from the sections above, the sections above win.

<direction>
A 60-second recipe explainer for a cocktail of your choice, from an empty glass to the finished drink.
Show each ingredient and its measurement as it goes into the glass: the pour, the level rising, the measure in clean type beside it. Then the final touches (stirring and any garnish) and a moment to admire it.
Style: clean, bright product photography in motion: a soft background, crisp liquid and glass.
Banned: stock clip art, glows, generic gradients, measurements you'd have to pause to read.
</direction>

<structure>
100 BPM. One ingredient per bar, the glass in the same spot throughout, the camera easing in for the finish.
</structure>

<build>
1. One HTML file at 1080x1080. Every style is computed from time inside window.seek(t): no CSS animations, no timers, no state carried between frames.
2. Use spring and exponential easing written as functions of time. Blur follows speed and direction on fast moves.
3. Write a soundtrack in code with the Web Audio API (OfflineAudioContext): a pour, ice or clink sound on each step, under light music. Render it to WAV.
4. Render with Playwright at 60fps, 3 subframes per frame blended with ffmpeg tmix for motion blur, then mux the audio.
5. Before the full render, render one frame per beat and look at them. Fix anything cluttered, off the beat, overlapping or hard to read.
</build>

<start>
List the recipe with measurements, then show a storyboard, then build it without asking me anything else. Give me the final MP4.
</start>
