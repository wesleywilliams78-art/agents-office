# Episode 03, v3 (2 Nov 2026): Little's Law, upped

**Locked by Wesley on 2 Nov 2026 for Mon 9 Nov.** It is filed in Drive › 009 - WRW Hospitality › Operators Ledger Episodes as `Operators Ledger - Ep 03 - Littles Law.mp4`, with its thumbnail and captions. The 24 Oct original is kept there, renamed `(original 24 Oct)`.

Wesley asked for a newer, higher-grade Little's Law for Mon 9 Nov, in line with Episodes 01 and 02 (the white-ground "modern" look), with new motion and the rules loosened a little. It is built on the approved modern version: the same story, numbers, captions, jazz trio and Wesley's approved narration `ep03v2`, with new motion. The modern version stays in `../renders/` beside it.

- **Video:** `../renders/operators-ledger-ep03-littles-law-v3.mp4` (1080 × 1350, 1:47.5, 30 fps, −15 LUFS). Captions: `…-v3.srt`. Thumbnail (frame 0): `…-v3-thumbnail.png`.
- **Engine checks (final):** no errors or warnings; no overlapping text at any quarter second; frame 0 held; every colour change a managed transition; no dead stretches; 0 hard cuts; Wesley's voice.

## What's new
1. **The wait is a stopwatch.** The episode's new running device is a red arc on a ten-minute dial.
   - The sums read "12 ÷ 2 =" into the dial, which holds "?" and then sweeps to 6 on "six-minute wait", with a light overshoot.
   - At the verdict it reappears on 6 and winds back to 4 on "four minutes" as the second till opens.
2. **The loss prints as a till receipt.** On ink, a till slip feeds up out of a slot, a line on each word:
   - SITE 10 · LUNCH;
   - walked on, a day: 10;
   - each would spend: £8.50;
   - days a week: × 6;
   - lost weekly: −£510, in red.

   A receipt-printer chatter sounds on each line.
3. **Money walks out.** Every guest who sees the line and walks on pops a red £ coin that floats off.
4. **Two tills at the verdict.** Alternate guests step in at the red-framed second door.
5. **A livelier camera.** The whips into clues one, two and three use an underdamped spring (stiffness 95, damping 13) with a small overshoot, instead of the calm spring.

## Build
- `index.html` is the composition (series `ledger-fresh`).
- `node run.mjs <stills|draft|final>` renders through the Motion Studio engine with narration `ep03v2`. Output goes to `output/motion/ledger03v3<mode>/`.
