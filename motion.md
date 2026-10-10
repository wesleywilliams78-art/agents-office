# Motion brand: WRW Consulting / The Art of Operations

Read this before writing any animation, video or motion graphic. Source of truth is the brain skill `Agents Office/skills/brand-visual-system` (`SKILL.md` + `reference.md`); if they change, this file follows them. Navy `#13274d` and orange `#ff914d` are retired. Never use them.

## Idea
Modernist, minimal, with an implied nod to classical Chinese ink landscapes: flat colour grounds, soft curved mountain ridges, one small red seal, large light serif type set flush left. Calm, strategic, personal. Never loud or decorated. No brushstrokes, dragons, lanterns or calligraphy fonts.

## Colour
| Role | Hex | Use |
|---|---|---|
| Bone | `#F3F2F2` | Default ground; type on red/ink |
| Ink | `#201E1D` | Headlines on bone, dark ground, mountain fill |
| Red | `#EC3013` | Seal, kickers, numerals, rules, the one red ground |
| Deep red | `#B6240E` | Small red text on bone |
| Warm grey | `#4A4644` | Body copy on bone |
| Light rule grey | `#D6D2CF` | Dividers |

Grounds by purpose: **bone** = default; **red** = a statement (cover, section divider, one number to land); **ink** = serious or reflective (closing, risk).

## Type
- Newsreader (serif): headlines, titles, numerals. Light 300 for headlines, Regular 400 for small titles.
- Archivo (sans): kickers in ALL CAPS, letter-spacing about .22em, and body copy.
- Curly quotes only.

## Mountains
Two or three layered smooth-bezier ridges rising from the bottom edge. Back ridges higher and paler, front ridge lowest and most solid. Flat fills, no outline, texture, gradient or trees. Ink on bone; white on red (back ~30%, front ~92% opacity); bone on ink at 7-16% (faint mist). No suns, moons, circles or arcs.

## Seal
Small square, sharp corners, top-left margin, with 略 centred (decided 9 Oct, confirmed 10 Oct 2026; 兵 is retired). Newsreader has no Chinese glyphs, so never set it in Newsreader: use `assets/brand/seal-red.svg` / `seal-bone.svg` (the glyph is a vector path), or Noto Serif SC Light where a font is needed. Red square with bone character on bone and ink grounds; bone square with red character on red. The only Eastern motif. Small, singular, never repeated on a screen.

## Layout rules
- Flush left always. Never centre text.
- Square corners. No shadows, gradients, glows, textures, rounded corners.
- Red used sparingly. Headlines never bold.
- No stock photos, icons, emoji.
- Generous margins (about 8%).

## Motion (owner confirmed: lively, bouncy, lots going on; the calm is in the look, not the movement)
- Visuals stay strictly on-brand (palette, flat shapes, square corners, flush left). Motion can be energetic.
- Bounce is wanted: `back.out(1.4-2.5)` for pops, `elastic.out(1,.5)` for bars and stamps, `bounce.out` for dropped numerals. Smooth moves use `power4.out` / `power4.inOut`.
- Several things moving at once is fine, but stagger 80-150ms so it reads as choreography. Hold the key line 1s+ so it can be read.
- Scenes change by hard colour wipes (bone, red, ink panels sliding up), not crossfades.
- Graphics allowed (all flat, square, no outlines on mountains): layered ridges that rise with overshoot and drift, ruler ticks, squares that drop and land, hairline rules that draw on, bar charts, count-up numerals, bordered square cards, the seal stamping in (scale + slight rotation).
- Mask-up text reveals line by line or word by word, with overshoot.
- No dragons or illustrated characters: the owner rejected a hand-drawn dragon as amateur. Side graphics must look like a professional motion editor made them: geometric, on-grid, and tied to the book's meaning.
- Preferred side graphic: a 6x5 grid of square "sites" that builds in a diagonal wave, fills in sequence, and ends on one accent cell (see `videos/art-of-operations-title`). Square cells echo the seal.
- Decoration should always tie to the book or the brand; the earlier ruler-ticks-and-falling-square had no meaning and was removed.
- Still never: circles, suns, gradients, shadows, glows, icons, emoji, rounded corners, brush textures.
