# Episode 04 (STP) v3: build note (19 Nov 2026)
Video `renders/operators-ledger-ep04-stp-v3.mp4`: 1080 x 1350, 30 fps, 89.1 s including the 3.5 s end card (from the word-timed voiceover), -16.1 LUFS, -1.8 dBTP. Captions `…-v3.srt`; thumbnail = frame 0; stills `renders/scene-01-hook.png` to `scene-09-end-card.png`. Source `v3/` (`node build.mjs` regenerates it from the voice timings). v1 and v2 untouched.

## Checks passed
- `hyperframes check`: 0 errors, 0 contrast failures, 0 layout issues (one note: 53 caption clips on one track).
- Frame size 1080 x 1350 as Ep 03 v3. Fonts Newsreader Light + Archivo; bone/ink/red tokens; red eyebrow, two-tone headlines; plain word-by-word captions (spoken ink, current word red, next grey); Monday card then ink wave to the end card.
- On-screen words: scene 1 = 7 (+ series tag as a label), 2 = 6, 3 = 7, 4 = 7, 5 = 8, 6 = 8, 7 = 8. Labels ILLUSTRATIVE FIGURES, WEEKLY on scenes 2, 3, 4. No DOI, no real brands. Smith 1956 voiced once, no STP author named.
- Voice: Wesley's clone, same lines as v2 (script unchanged), music bed as v2 (ducked), tick on each figure.
- Numbers: 11,000/20,000 = 55%; 5,720/13,000 = 44%.

## Differences from Ep 03 v3
- Ep 03 v3 is Motion Studio 3D blocks with no Athena. Athena, the shopfronts and props are the series' flat characters, in Ep 03 v3's type, colour, caption and card layout. Not 3D.
- Verdict stays on bone (Ep 03's is on ink: Athena's black trousers and the outlines vanish on ink).
- No "THE VERDICT" or "FOR MONDAY" eyebrows (they would break the 8-word limit). Frame 0 keeps the series tag as a label.
- End card has no headline or "Next case" line (none in the brief); episode line reads EPISODE 4 · STP; wave and layout otherwise as Ep 03.
- New prop `characters/props/residential-street.svg`. Run time 89.1 s vs 107.5 s for Ep 03 (90 s limit).
- I have not listened to the final mix.
