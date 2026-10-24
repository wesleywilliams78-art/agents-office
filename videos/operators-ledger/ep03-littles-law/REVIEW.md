# REVIEW — The Operator's Ledger, Episode 03 "Little's Law"

**Output:** `renders/operators-ledger-ep03-littles-law.mp4`. 1080 × 1350 (4:5), 30 fps, 86.6 s, 4.4 MB. The thumbnail is `renders/…-thumbnail.png`, the poster frame.

## How it was made
- **Script:** written to the `operators-ledger-episode` skill and plan row 03. The row's example was corrected first: "12 ÷ 4 an hour = 3 hours" was the wrong scale for a café.
- **Voice:** Wesley's clone, one sentence at a time, then de-plosived. Whisper confirms every word; the only differences are digits for numbers.
- **Build:** scenes are cued from the words with `.vo/build.py`, the same pattern as Episode 02.
- **Library additions:** six guests and a till counter, added before use.
- **Music:** ACE-Step, series prompt (job `mmvmg4rp59m3`), at 0.17 volume to match Episode 02's balance.
- **Effects:** a tick on the 6-minute wait, a thud as guests leave, a tick on £510, and a tick on the 4-minute wait.

## Measured, not heard
- `check`: 0 errors. Two warnings kept:
  - repeated guest images in the 12-person queue, which is deliberate;
  - an info note about guests walking past a container edge.
- **Final audio:** −15.8 LUFS, −1.7 dBTP, no clipping. The effect onsets match their pictures.
- **Frame 0:** a finished poster.
- **Not done:** nobody has listened to the final mix yet.

## Weakest shot
- **Scene 2:** the lower third of the frame is empty after the formula turns round. With more time, add the small queue from scene 3 under it, so the formula sits on the real thing.
