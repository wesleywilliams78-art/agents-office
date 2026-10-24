# DESIGN.md — The Operator's Ledger (series design system)

Applies to all 10 episodes. Each episode folder reads this file and does not change it. The brand comes from `motion.md` and the brain skill `Agents Office/skills/brand-visual-system`. Where they disagree with this file, they win, except where this file names an exception.

All design decisions were settled on 24 Oct 2026.

---

## Format
- **Pilot output:** 1080 × 1350 (4:5), 30 fps, MP4 (H.264, AAC). This is the LinkedIn feed format.
- **Safe area:** a centred 1080 × 1080 square (y = 135 to 1215). All text, numbers, characters and captions stay inside it, so 9:16 and 16:9 versions can be recomposed later without redesign. Only backgrounds and mountains reach the full frame.
- **Margins:** about 8% (86 px) inside the safe area.

## Colour
| Token | Hex | Use |
|---|---|---|
| `--bone` | `#F3F2F2` | Default background; text and line art on red or ink |
| `--ink` | `#201E1D` | Line art, numbers and text on bone; caption band; the profit segment |
| `--red` | `#EC3013` | Statement backgrounds (cold open, the question), emphasis, the loss state, the seal |
| `--deep-red` | `#B6240E` | Red text smaller than 32 px on bone only (legibility) |

- Bone is the default background. A red background is a statement: one per scene at most, used for the cold open and the closing question.
- Profit is shown in ink, or bone on red. Loss is shown in red. Never use green.
- No gradients, shadows, glows or textures.
- **Character palette (style v2, decided 24 Oct 2026; replaces "brand colours only").** Characters, buildings and props, plus the cost segments in charts (sand), may also use these colours. Type stays bone, ink and red, and so does every chart meaning: profit is ink, loss is red.

| Token | Hex | Use |
|---|---|---|
| `--sand` | `#E9D8BD` | Happy shop facade, counter top, chart cost segments |
| `--stone` | `#C8BFB3` | Struggling shop facade |
| `--ochre` | `#F2C14E` | Lit windows, pencil, earrings, small accents |
| `--sage` | `#7E9C82` | Doors, plants, the counter |
| `--blush` | `#F4A28C` | Cheeks only |
| `--mustard` / `--mustard-deep` | `#E3A23B` / `#B9781F` | Athena's blazer and lapels |
| skin and hair | real tones (Athena: `#C68A5E` skin, `#2E2422` hair) | Characters only; the cast varies |

- Athena never wears red: red means loss.

## Type
- **Headlines and big numerals:** Newsreader Light (300), sentence case, never bold. Small titles use Newsreader Regular (400). Newsreader is not in `assets/fonts/` yet: load it from Google Fonts, or download it into `assets/fonts/newsreader/` before the first render.
- **Body, labels, numbers in charts, captions:** Archivo (`assets/fonts/archivo/`, Regular and Medium). Archivo has tabular figures: set `font-variant-numeric: tabular-nums` on every number that counts, so the digits don't jitter.
- **Kickers** (for example "SITE 1" and "ILLUSTRATIVE FIGURES, WEEKLY"): Archivo, ALL CAPS, letter-spacing about .22em.
- Curly quotes only. British English. Use £ with comma thousands separators, and a true minus sign (−£300, not -£300).
- No more than about 8 words on screen at once, outside the captions.
- **Text is flush left.** Never centre text, including headlines. The safe area is centred; the text inside it is not.

## Line art and characters
- **Style v2 (24 Oct 2026): warm and lightly cartoonish, not chibi.** Flat colour fills with a single 5 px ink outline (at the figure's native size) and rounded joins. Heads are about a quarter of body height. Shapes keep square corners except faces, hair and hands. The v1 thin line art is kept in `characters/athena/_line-art-v1/` for reference.
- Faces carry personality: oval eyes with one highlight, brows that act, a small nose line, blush on the cheeks, and a mouth per expression.
- The cast is diverse and modern, in everyday work clothes with varied hair, headwear and build. No period costume and no caricatured features.
- **Quality bar:** an illustrated dragon was rejected as amateur. Every character must look like a professional editorial illustrator drew it: clean geometry, consistent proportions, an on-grid pose. If a character sheet doesn't clear that bar, fix it before any scene uses it.
- Characters move with simple actions only: pose swaps, head turns, a pointing arm, blinks, small bobs. No walk cycles and no lip-sync.

### Athena, the Operator (recurring lead)
- A multi-site hospitality owner who appears in every episode. She is the series' signature asset, so her design never changes.
- **Name:** Athena. Otherworldly and wise, but drawn as a modern working operator, not a goddess. There is no armour, helmet, owl or classical costume.
- **Signature prop:** her ledger, a small square-cornered notebook she carries or writes in. It ties her to the series name.
- **Look (Option A "The Blazer", restyled as v2 variant B on 24 Oct 2026):** medium-brown skin and dark hair in a high bun with a pencil through it, gold square earrings, a loose curl, a mustard blazer over a bone shirt, ink trousers and deep-red shoes, with the ledger (ink cover, ochre label, red ribbon) held to her chest. The bun and pencil are her signature silhouette at thumbnail size. Rejected options are in `characters/athena/options/` and `characters/style-test/`.
- **Poses** (reusable SVG files in `characters/athena/`, usage rules in its `README.md`): standing neutral, looking left, looking right, head-scratch, pointing, worried, at counter writing, arms folded.
- Expressions: neutral, puzzled, worried, resolved. Each one is a swap of the mouth and eye positions only.

## Recurring motifs
- **Mountains:** the brand's flat, layered ridges, using `assets/brand/mountains-ink-on-bone.svg`, `mountains-white-on-red.svg` or `mountains-bone-on-ink.svg`, rising from the bottom edge. Title and end cards only. They have no outline, which is the one exception to the line-art style.
- **Shopfronts** (`characters/shops/`, built by the same script as Athena): a coloured shop with an ink sign board ("SITE 1", "SITE 10"), a red-and-bone striped awning, and windows for eyes. A thriving site has a sand front, lit ochre windows, blush, a smile, a sage door and a planter. A struggling site has a stone front, dark half-lidded windows, a droopy awning, a crooked sign, a wobbly mouth and a crack. Never use real brand names, logos or locations.
- **The WRW logo (decided 24 Oct 2026; replaces the 略 seal, which is retired from this series):** the rounded red tile with the white WRW mark (`brand/WRW-logo-white-on-red.svg`; other variants are in `brand/`). It appears once, on the end card, at 128 px. The rounded corners are the agreed exception to the square-corner rule. Use the file exactly as supplied: its red is `#FF3131`; never recolour it to the series red.

## Motion
**Calm and precise (decided 24 Oct 2026).** This series deliberately departs from the bouncy house rule in `motion.md`, which still applies to the Art of Operations reels. The numbers must be readable.

- Entrances use `power3.out` / `power4.out`, lasting 0.4–0.8 s. There is no `back`, `elastic` or `bounce`.
- Bars and stacks grow from the baseline with `power3.out`.
- Numbers count up and land with no overshoot.
- Each beat has one main movement. Secondary moves (a blink, a small bob) may run alongside it.
- The WRW logo stamp on the end card is the one allowed overshoot: scale from 1.15 to 1 with a 3° rotation settling to 0, using `power3.out`.

These rules also apply:
- Numbers count up. Bars grow from the baseline. Hold every key line for 1 s or more.
- Cut on the voiceover beat. Change scenes with a hard colour wipe (bone, red or ink panel sliding up) or a simple cut. No crossfades.
- Check `/hyperframes-registry` (for example `data-chart`, kinetic type and captions) before hand-building charts or captions, then restyle any block to these tokens.

## Captions
- Burned in, word-synced, 2 lines maximum, Archivo Medium about 44 px.
- **Centred horizontally (decided 24 Oct 2026).** This is the one exception to the flush-left rule; every other piece of text stays flush left.
- Bone on an ink band, in the lower third inside the safe area (the band sits within y = 1000 to 1200).
- Captions are not optional, because most LinkedIn viewers watch muted. Also export an `.srt` file to upload with the post.

## Audio
- **Voiceover (decided 24 Oct 2026, replaces the Kokoro pilot voice):** Wesley's cloned voice.
  - **Source:** VoiceStudio profile "Wesley" (`ca7acc09`) on the **VoxCPM2** engine. Its Apache-2.0 weights are cleared for commercial use; never use VoiceStudio's default OmniVoice engine, which is CC-BY-NC.
  - **Reference:** a 26 s clean read in the series voice: calm, unhurried, warm. The clone copies the delivery as well as the timbre, so re-record the reference to change the feel.
  - **Generation:** one sentence at a time with a 0.42 s breath between sentences (`ep01-unit-economics/.vo/vox_lines.py`).
  - **De-plosive (always):** the reference has mic wind on "p" and "b" sounds, and the clone copies it. Run `.vo/deplosive.py` on every generated line: a 75 Hz low cut, plus a crossfade to a 180 Hz high-passed copy only during detected bursts. It cuts the pops by 9–25 dB without changing the lengths. Verify with `.vo/plosives.py`. A new reference recorded with a pop filter, or with the mic off to the side, would fix it at source.
  - **Checking:** transcribe every line with VoiceStudio's Whisper large-v3 (`.vo/whisper_words.py`). That checks every word was read and gives the exact word timings that drive the captions and the animation beats.
  - **Retiming:** when the voice changes, retime with `.vo/retime.py` (old word time → new word time). Don't hand-edit the timings.
  - Rejected: Kokoro voices (too synthetic) and the designed VoxCPM2 narrators F and M (close, but not Wesley).
  - Consent is to be recorded on the profile by Wesley himself.
- **Final loudness:** after the render, normalise the soundtrack to −15 LUFS with two-pass `loudnorm` (`linear=true`), then a true-peak limiter (`alimiter` at 192 kHz, limit 0.78). The video stream is copied. Target about −16 LUFS and −1.5 dBTP or lower, with no clipping. The cloned voice is quieter than the music, so the mix alone lands around −21 LUFS.
- **Pace:** write to about 145 words a minute. No scene's voiceover may run more than 1 s past its slot.
- **Music:** a subtle, low bed with no lyrics, ducked under the voice.
- **Sound effects:** used sparingly. A soft tick when a number lands, a low thud when a loss appears.

## End card (every episode, 3 s hold)
- Ink background, with `mountains-bone-on-ink.svg` drawing in along the bottom.
- Flush left: series kicker "THE OPERATOR'S LEDGER", then the episode title in Newsreader, then the WRW logo stamping in (scale plus a slight rotation), then "WRW HOSPITALITY", then "Wesley Williams". There is no job title (decided 24 Oct 2026).
- **Brand line (decided 24 Oct 2026):** "WRW Hospitality" only, set as an Archivo kicker above Wesley's name. YSF Advisory does not appear.

## LinkedIn package (every episode)
1. The 4:5 MP4.
2. An `.srt` captions file.
3. A thumbnail PNG (1080 × 1350): the episode's strongest single frame, with the headline inside the safe area.
4. The post copy: a hook line, three short lines, then the episode question. Keep it under 1,300 characters.
5. A 30 s cut-down (optional; build it after the full episode is approved).
