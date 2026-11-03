# The Art of Operations: series brief for motion

Read this before making anything for The Art of Operations. Where it disagrees with `motion.md` (the generic WRW motion notes), **this wins** for this series.

## What it is
The Art of Operations is Wesley Williams's book and its Instagram series, under WRW Hospitality. It gives operators a modern take on the strategic wisdom of Sun Tzu's *The Art of War*. Running a multi-site operation can feel like a battle, and the wisdom in the book was gathered over a career fought in the battles of the operational field. The lines are Wesley's maxims for operators, in the spirit of Sun Tzu. Never attribute a line to Sun Tzu unless it is his.

**The feeling:** oriental, calm, authoritative, strategic, grounded. A general looking over a misty plain before dawn. Stillness that holds power. Never playful, bouncy, busy, techy or corporate. No dashboards, no grids of squares, no counters, no UI.

## The look (match the nine delivered reels; see reference-grid.png and reference-plates.jpg)
- **Vast, quiet landscapes** in ink tones: near-black misty ground, a low sea of cloud between dark ridges, a thin faint red glow on the horizon (the only colour), the upper half empty, and **one tiny distant figure**: a rider with a plain pennant, a sentry, a boat, a banner, a tiger on a rock. Ancient Chinese, battle-inspired, never fairy-like, never Western (no brimmed hats).
- **Three colourways, one per grid row:** black (ink and grey, red horizon glow), white (bone paper, ink silhouettes), red (a duotone of ink to red #EC3013). Exact brand hex only: bone #F3F2F2, ink #201E1D, red #EC3013, deep red #B6240E.
- **Type centred** (the one exception to flush left): Newsreader Light, large (about 86 px at 1080 wide, line height 1.16), bone on dark grounds, ink on bone. **Exactly one key word** in red (deep red #B6240E on bone; ink #201E1D key word on the red row). Nothing else dimmed. Chinese below or after, Noto Serif SC Light (`kit/series/art-of-operations/zh.css`), about 100 px, no full stop at line ends.
- **Atmosphere is allowed here:** soft mist, fog banks and haze (blurred flat shapes, low-opacity layers, canvas filters). Ridges stay flat fills. Still never: circles, suns, shadows, glows on type, icons, emoji, rounded corners, brush-stroke textures, calligraphy fonts, dragons, lanterns.
- **The WRW logo** (`kit/logos/wrw-mark-ink.png` on white grounds, `wrw-mark-white.png` on black and red). Small, single. It replaced the 略 seal on 24 Oct 2026: never draw 略 or 兵, and never use `kit/brand/seal-*.svg`.

## The motion language
- **Slow and certain.** A near-still camera: a slow push of about 3% over 15 s. Mist drifts. The figure barely moves. Nothing hurries.
- **Calm is not static.** The engine fails any half second where less than 0.4% of the picture visibly changes, and a slow push alone does not count. The plates are still photographs, so the life must be painted over them: banks of mist with visible edges drifting across (30 to 60 px a second), a pennant stirring, ripples on water, haze breathing, a faint red horizon glow swelling. Always at least one of these on screen.
- **Springs, heavily damped:** use the presets `calm`, `breath` and `weight` (no visible bounce, or one small settle for `weight`). Never `pop`, `drop`, `wobble`.
- **Type reveals word by word from below a mask** (rise about 1.6 lines, stagger 0.10 to 0.16 s, each word settling over about 1.2 s), lines entering 0.7 to 1 s apart. Words leave by rising out of the mask, quick and together (stagger 0.02 s). Hold each line long enough to read twice.
- **Colour changes are crafted transitions, never a bang.** When the ground moves between black, red and white (or dark and light), it takes half a second to two seconds and grows out of the world of the series, landing on the beat with the bell carrying it. Ideas, not a menu: ink bleeding up through rice paper from the key word until the page is ink; a bank of mist rolling across and clearing onto the new colour; a ridge or a banner passing across the lens; the thin red horizon glow rising to flood the sky; dusk falling to night or night breaking to dawn; red spreading like ink in water. No slides, no wipes with hard edges, no flashes, no zooms that call attention to themselves.
- **The theme is the rule, not the content.** Stay true to the mood (oriental, calm, authoritative, strategic, grounded) and the visual language, but tell the story your own way: new scenes, new imagery, type that carries meaning, structure and sound. The nine reels show the world; they are not a storyboard to copy.
- **The end card** (from about 2.4 s before the end): the WRW logo lands (scale 1.4 to 1 on `weight`), then "THE ART OF OPERATIONS" (Archivo caps, 26 px, tracking .22em), a short red rule drawing on, then "WESLEY WILLIAMS" (24 px). In a 9:16 reel: logo at y 160, kicker 248, rule 298, name 322, all centred.
- **The 15 s reel skeleton** (for reference and rhythm): open from the ground colour over 1.6 s; English from 1.5 s, line by line; English leaves at 7.0 s; Chinese from 8.4 s; logo at 12.6 s; close to the ground colour from 13.8 s.

## The sound
The series score is **a Chinese plucked lute with a bell striking on each transition**. Synthesise it (never import audio):
- `S.string` (a plucked lute, Karplus-Strong) in a pentatonic mode (`S.scale('D', 'minor', 3)`), sparse phrases, a tremolo roll (`S.roll`) into key moments.
- `S.bell` on every transition and as the logo lands; `S.drone` underneath (low, quiet); `S.wind` for air.
- `S.taiko` only for weight at the title or a turning point, sparingly. No kick-drum loops, no hats, no claps, no synth bass, no risers that sound like EDM.
- Tempo 60 to 75 bpm (60, 72 or 75 divide 30 fps cleanly). Calm, spacious, a lot of silence between notes.

## The nine maxims so far (key word in brackets; plates in kit/series/art-of-operations/plates/)
1. black · rider in the mist · "The better it's done, the more [invisible] it becomes."
2. black · sentry above a sea of cloud · "Dashboards tell you what already happened. [People] tell you what's about to."
3. black · timber hall, water clock · "No amount of VC funding is immune to the physics of [cash flow]."
4. white · tiger on a rock · "When you are ready to deploy your resources, appear [inactive]."
5. white · sand table with pennants · "The winner is the one who runs the most [simulations] before the first currency is spent."
6. white · a spire in the haze · "A single, [laser-focused] business unit outperforms a fractured one every time."
7. red · a boat on still water · "The market moves toward [excellence]; it does not need to be pushed."
8. red · a road between walls, a lone rider · "Attack their operational [gaps]. Launch exactly where they are too slow to respond."
9. red · a banner on a ridge · "Deep data analysis leads to [victory]; shallow analysis leads to [defeat]."

The plates (1080×1920, no text) may be used as backgrounds with code-painted mist, parallax and type over them, which keeps a piece visibly part of the series. Code-painted landscapes in the same spirit are equally welcome.
