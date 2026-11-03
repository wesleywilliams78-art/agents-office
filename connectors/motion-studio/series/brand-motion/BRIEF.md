# WRW brand motion: idents, openers, teasers, loops

Wesley's brief (27 Oct 2026): short, music-led motion that makes an impression rather than teaching. It is built on Prompt Motion's showreel prompt, which this studio ran as "Twelve bars" (`reference-twelve-bars-wrw.jpg`; video `output/library/video/prompt-motion-showreel/Twelve bars - WRW brand.mp4`), with the WRW palette, Archivo and the WRW logo applied. Its rules (something on every beat, no hold over half a second, every shot made from the last, a loop) are tuned for rhythm, energy and memory, not comprehension.

**Not for explaining a concept step by step.** Explainers get their own brief. Wesley found this format fights a lesson: slowed down with words, it loses its creativity; kept fast, the idea goes by unread. This brief is separate from the Monday explainers (`ledger-fresh`, `operators-ledger`) too. Where this brief and `motion.md` disagree, this brief wins.

## What it is for
| Kind | Length | Use |
|---|---|---|
| **Ident or logo sting** | 5–8 s | A WRW Hospitality reveal for the start or end of any video |
| **Series opener** | 6–10 s | A title sequence made once and reused every week (The Operator's Ledger, the Franchise Entry Report, the Wednesday Toolkit), so each series looks owned |
| **Teaser or launch** | 10–15 s | A new series, tool or report, or an event: one idea, one line |
| **Loop** | 6–15 s, seamless | A LinkedIn banner, website hero or event screen |
| **Capability reel** | 15–30 s | What WRW does (scale, systems, new markets) as visual metaphor, not explanation |
| **Post hook** | 3–6 s, looping | The top of a post, to stop the scroll before the real content explains |

If Wesley doesn't say which kind, pick the one his words point to and say which in the concept line.

## The prompt
<direction>
A short motion piece of the kind above, made with the craft of a world-class motion designer's showreel. Music-led, no voice.
Concept: your pick (e.g. "everything is the same twelve bars"). Commit to it and name it in one line before you start. Every shot is made out of the previous one: shapes, type and colour transform into the next scene instead of cutting or fading. Use plenty of shapes, so the same pieces become a grid, a tower, a chart, a ring.
Words: as few as possible. A title, a series name, one line or a single label; never sentences that need reading.
Type: Archivo, the brand sans, as the one typeface (400 and 500 are in `kit/fonts/`).
Palette: the WRW palette. Ink `#201E1D` and bone `#F3F2F2` are the black and white; red `#EC3013` leads. Where more colours are needed, use brand variants: light coral (red mixed 42% into bone), deep red `#B6240E`, rule grey `#D6D2CF`, warm grey `#4A4644`. Gradients built from these (red into deep red along a bar, bone into rule grey) are welcome.
One consistent camera language.
Show range, as the length allows: kinetic type, shape morphing, a 2D-to-3D moment, a data or UI moment, an end title. A sting may need only two or three; a capability reel uses them all.
Banned: particle bursts, glows, lens flares, camera shake, RGB split, crossfades, generic gradients (palette gradients are fine), bouncy easing, holds longer than half a second, anything that looks like a template.
</direction>

<structure>
120 BPM, something happens on every beat.
First bar: hook. Then one technique per bar, each flowing out of the last. Last full bar: the strongest moment. Final half bar: end title with the WRW logo (the white mark, `kit/logos/wrw-mark-white.png`, on ink), and the final frame matches the first so it loops. The first frame is therefore a finished title card: the thumbnail.
</structure>

<build>
1. One composition at 1920×1080, 60 fps, unless the use calls for another shape (9:16 for a reel or story, 1:1 or 4:5 for a feed post, a banner's own size). Every style is computed from time inside `render(t)`: no CSS animations, no timers, no state carried between frames.
2. Spring and exponential easing written as functions of time: `M.spring` tuned near critical (damping ≈ 2·√stiffness), firm with no visible bounce, and `M.p(…, 'expo.in' | 'expo.out' | 'expo.inOut')`. Blur follows speed and direction on fast moves: `subframes: 3` in `M.scene`.
3. The soundtrack in code with the sound kit in `score(S)`: a kick on every beat, a riser into the last full bar, a hit on each scene change (`S.impact`), with bass, pads, plucks and ticks on the same grid. A sting ends on one clear hit with the logo.
4. The engine renders with Playwright at 60 fps, 3 subframes per frame blended with ffmpeg `tmix`, then muxes the audio: motion_draft, then motion_final.
5. Before the full render, render one frame per beat and look at them. Fix anything cluttered, off the beat, overlapping or hard to read.
</build>

<start>
Tell Wesley the concept (and which kind of piece it is) and show a beat-by-beat storyboard, then build it without asking anything else. Give him the final MP4.
</start>

## Craft lessons (from Twelve bars and the unit economics pieces, 27 Oct 2026)
- **One state, many layouts.** Keep every shape in one array and write a layout for each beat. Each change rides its own spring and the changes are added together, so any frame comes from t alone and nothing ever cuts. Shapes waiting off stage have zero width *and* zero height, or they flash across as chips.
- **Colour never blends.** An RGB blend between palette colours passes through ones outside it. Change colour with a hard-edged wipe along the shape.
- **Kinetic type as a rigid roll:** each letter leaves on the same spring that brings in the next word's letter, a fixed distance apart, inside a window, so words never collide.
- **Shade 3D relative to the camera:** the face turned to the lens is the pure colour at any angle, so the 2D and 3D sections match and colours stay rich while orbiting.
- **A living camera:** a slow breathing zoom plus a sideways drift a quarter-cycle out of step, faded out at frame 0 and over the end title. Without it, even short holds read as dead to the engine.
- **3 subframes** smear normal fast moves well. On the most violent moves (long shapes swinging round) the samples show as copies, so slow those a little.
- **Look at a still on every beat before rendering.** It catches sequences landing late, cropped 3D, colours off the palette and colliding words.
- **Fonts:** the kit's Archivo stops at Medium 500 and carries large type well. Heavier weights need a download Wesley approves.

## References and starting sources
- **Twelve bars (WRW):** the showreel itself. `output/library/video/prompt-motion-showreel/` (source `source/src-wrw.html`).
- **Unit economics, twelve bars:** 25 s, 48 shapes, a good teaser or post hook for a unit economics post. `output/library/video/unit-economics-twelve/` (source `source/index.html`).
