# Episode 05 (Span of control) v1: build note (20 Nov 2026)
Ledger-fresh look (Motion Studio, 3D blocks, no Athena). Built from `../episode-05-brief.md`.
Video `../renders/operators-ledger-ep05-span-of-control-v1.mp4` (1080 × 1350, 30 fps, 89.5 s incl. end card, {{LUFS}}). Captions `…-v1.srt`, thumbnail `…-v1-thumbnail.png` (frame 0), contact sheets `ep05-v1-contact-sheet-1/2.jpg`. Render: `node run.mjs <stills|draft|final>`. Used: stills, one draft, then the final.

## Voice
`ep05v1` is Wesley's VoiceStudio clone (`narrate.mjs`), the brief's lines word for word. Numbers are spelled out and "P&L" is voiced as "P and L". No author is named for span of control, because the source is unverified.

The run is 188 spoken words. Inter-sentence breath is 0.2 s, as in Ep 04, applied in memory only; `series.json` is untouched. VoiceStudio was off, so I started it.

Whisper did not hear the "and" in "P and L". It is probably elided ("P 'n' L"), but nobody has listened.

## Clock
Each scene starts on the half-beat grid (100 bpm) after the last word of the line before:

| Scene | Starts at |
|---|---|
| Stakes | 8.4 s |
| Tool | 14.4 s |
| Hours | 23.1 s |
| Sites | 32.4 s |
| Trouble | 47.1 s |
| Verdict | 58.8 s |
| Lesson | 75.0 s |
| End card | 87.0 s |

Total 89.5 s, so nothing was cut. The lesson waits 0.6 s longer than the other scenes so the verdict's "8 sites." holds before the wipe. The brief's time column is updated to match.

## New devices
- **The week as a stepped stand.** Five nine-hour days (Mon to Fri), 45 one-hour slots, an ink rail on each step and the day printed on its face. It fills the hero band in every pose, which fixes Ep 04's small, low wide shot.
- **Site pieces.** Each is three ink hour cubes plus a thin road slab, with the site number on its first cube. They drop onto the rail on a spring, one tick each.
- **Overflow falls.** Hours with no rail left under them fall off Friday's end, tumble, turn red and settle on the floor in rows of four, one row per site.
  - Hook: 11 hours fall.
  - Clue 2: the same 11 hours fall again, now counted.
  - Clue 3: five whole sites fall.
- **The 45 built from cubes.** On "There is a week" the 45 hours on the stand rise into a voxel "45". On "Start with the hours" they tip back down in order, Mon to Fri. A dolly rides the wave and the ticks climb in pitch as it counts.
- **Admin and open hours.** Twelve cubes turn warm grey on "Twelve". The other 33 shrink away on "thirty-three", leaving outlined open slots. The nine spare slots light up on "Nine spare".
- **Trouble.** Site 4's piece flashes red with a phone buzz and stays red. An eight-hour red slab drops into Friday with an impact. The one spare slot lights up, then five sites fall and five cafés turn red.
- **Verdict on ink, slow orbit.** One slab gives 6 sites. A second slab lands on Thursday and two pieces lift off, giving 4. For "Cut each visit to three hours" both go and eight three-hour pieces drop in, giving 8.
  - The wipe back to bone floods out of the slab.
- **The hire.** The unhired week (stand plus red pile) sits inside a red frame. A second stand slides in ("Manager 2"), and the five fallen sites lift off the floor onto it, turning from red back to ink. Site 7 gets a red frame.
- **Monday card.** The other pieces fade back and site 1 shows "?" on its top.
- **Cafés.** The 11 sites stand as small Ep 03 café blocks in a street beside the stand. They rise as their pieces land. Site 11 (at the front) slips and turns red in the stakes. Sites 7 to 11 turn red when they go unvisited.
- **Camera.**
  - A whip to Friday's end on "Eleven", with a roll kick.
  - A low whip to the fallen hours (stakes, clue 2, clue 3).
  - A whip to the cafés.
  - A close top-down for one site, then a top-down for the packing.
  - A Friday close-up for the slab.
  - The dolly along the count.
  - A slow orbit in the verdict.

## Rules deliberately broken, and why
1. **One 45-slot rail became a stepped stand of five nine-hour days.** One rail in a 1080 frame is about 24 px a cube (measured). The five days keep all 45 slots and the overflow off the end of the week, make "45 hours = five nine-hour days" visible, and keep the hero large.
2. **Labels on the object.** Site numbers on the cubes, days on the steps, "Manager 2" over the second stand.
3. **Gravity.** Cubes fall and tumble, the series' first fall. They settle on a real spring, not a bounce curve.
4. **The camera moves in every scene**, with whips and roll kicks throughout, not only between clues.
5. **Half-beat cuts.** Ep 04 cut on full beats. Half beats kept the run under 90 s without cutting a word, and the engine allows them.
6. **The hook headline is three lines, the last in red ("11, chaos.").** Red is used there for the overflow figure the episode is about.
7. **The trouble sound is synthesised**, a sawtooth buzz in two bursts. The brief asked for the Openverse bank, but the library has no phone buzz, and fetching one means downloading a file, which needs Wesley's OK.

## On screen versus the brief
- The brief's verdict text "6 sites. Hire at site 7." lands with the lesson line, as "6 sites a manager. / Hire at site 7.", because that is where "hire" is spoken.
- The verdict itself runs "Not a number of sites. / The hours left.", then "1 in trouble: 6 sites.", "2 in trouble: 4 sites." and "3-hour visits: 8 sites."
- Clue 2 opens with "Each site: 4 hours. / 3 on site, 1 road." before "6 sites: 9 spare. / 11 sites: 11 short."
- Every figure is in the numbers check and voiced. "ILLUSTRATIVE FIGURES, WEEKLY" sits top right on the hours, sites and trouble scenes.

## Checks passed (engine, final)
{{CHECKS}}

## Not verified
{{NOTVERIFIED}}

## Suggested changes (not made)
- Look note and skill: add the stepped week stand, falling hours, the voxel numeral, the slab, and the second stand for the hire as ledger-fresh devices if Wesley approves v1.
- Brief template: estimate the length on a half-beat grid. With full-beat cuts this script would have run 90.1 s.
- The engine's still picker gives the first 12 extra stills to the cut moments, so stills asked for by time are mostly dropped. I used a scratch peek script, `peek.mjs` in this session's scratchpad, to look at chosen seconds. Worth folding into the engine.
- Ask Wesley whether to fetch a CC0 phone-buzz recording into the library for a v2.
