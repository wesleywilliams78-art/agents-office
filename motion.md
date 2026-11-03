# Motion brand: WRW Consulting / The Art of Operations

Read this before writing any animation, video or motion graphic. The brand is its **palette, its fonts and its logo**. Everything else is craft, led by the brief and the prompt. On 27 Oct 2026 Wesley lifted the look rules that were restricting motion quality: no gradients, no circles, no rounded corners, flush left only, headlines never bold. For motion, this file overrides the brain skill `Agents Office/skills/brand-visual-system` on those points. The brain skill still governs documents. Navy `#13274d` and orange `#ff914d` are retired and are not brand colours.

## Idea
Modernist, confident, with a nod to classical Chinese ink landscapes when the theme calls for it: ridges, mist, ink. Calm, strategic, personal in tone; the motion can be as lively and rich as the piece needs.

## Colour
| Role | Hex | Use |
|---|---|---|
| Bone | `#F3F2F2` | Light ground; type on red or ink |
| Ink | `#201E1D` | Dark ground; headlines on bone |
| Red | `#EC3013` | The accent: kickers, numerals, rules, a red ground |
| Deep red | `#B6240E` | Darker red: shading, small red text on bone |
| Warm grey | `#4A4644` | Body copy on bone, quiet shapes |
| Light rule grey | `#D6D2CF` | Dividers, light shapes |

**Variants are welcome** when a piece needs more colour than bone, ink and red: tints and shades between these six, such as red into bone (a light coral) or red into deep red, and **gradients built from them**, such as red to deep red along a bar. Stay inside these hues and nothing outside them.

## Type
- Newsreader (serif) and Archivo (sans) are the brand fonts. Use either, in any weight on hand (Newsreader 300; Archivo 400 and 500), in any case or alignment the piece needs.
- When a brief asks for one typeface, use Archivo.
- Curly quotes only.

## Mountains (when the theme uses them)
Two or three layered smooth-bezier ridges rising from the bottom edge: back ridges higher and paler, the front ridge lowest and most solid. Ink on bone; white on red (back ~30%, front ~92% opacity); bone on ink at 7–16% (faint mist).

## Logo
The WRW logo. Use the white mark (`kit/logos/wrw-mark-white.png`) on red and ink and the ink mark (`kit/logos/wrw-mark-ink.png`) on bone; the tiles `wrw-logo-red-square.png` / `wrw-logo-ink-square.png` where a tile is wanted. Top-left is the usual place on a working frame. On an end title it may lock up with the title. Keep it crisp at 120 px wide or more. **Never draw 略 or 兵**: `assets/brand/seal-*.svg` are retired and must not appear in any video. **One exception (Wesley, 30 Oct 2026):** the Art of Operations Instagram reels keep the 略 (strategy) seal on their end card, because it is in theme with the book; the reel studio draws it.

## Motion
- Everything that pops, lands, drops or settles moves on real springs (`M.spring`), tuned to the piece: lively presets for energy, near-critical ones for a firm, expensive feel. The engine refuses CSS motion and fake bounce curves.
- Several things moving at once is fine; stagger 80–150 ms so it reads as choreography. Hold a key line long enough to read.
- Colour changes are crafted transitions, never a bang (owner's rule, 25 Oct 2026). When the ground changes colour, take half a second to two seconds and let it grow out of the piece (a tide of colour, ink bleeding, mist clearing, shapes widening to become the new ground), landing on the beat with the sound carrying it. Default crossfades read as cheap. The Motion Studio engine fails a ground change inside two frames.
- The theme is the rule, not the content: tell the story with new imagery, type and structure.
- Side graphics should look like a professional motion editor made them. Wesley rejected a hand-drawn dragon as amateur. Geometry, charts, grids, 3D, morphing shapes and kinetic type all work. For The Art of Operations, the 6×5 grid of square "sites" building in a diagonal wave (see `videos/art-of-operations-title`) is a proven side graphic.

## Instagram reels (Art of Operations)
- 15 s, 9:16, English then Chinese, text and a single figure centred. Grid plan: three rows, one colour each: black, white (bone), red. See memory `instagram-reel-format`.
- LTX footage must be graded to the brand palette (neutral ink and grey, one red accent) before use; never ship the raw sepia cast.
