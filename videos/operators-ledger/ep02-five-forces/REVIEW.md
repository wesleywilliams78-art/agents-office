# REVIEW — The Operator's Ledger, Episode 02 "Five forces"

**Output:** `renders/operators-ledger-ep02-five-forces.mp4`. 1080 × 1350 (4:5), 30 fps, 106.9 s, 5.2 MB. The thumbnail is `stills/thumbnail-frame0.png`.

## How it was made
- **Script:** written to the `operators-ledger-episode` skill and plan row 02, with sources checked (see the brief).
- **Voice:** Wesley's clone (VoiceStudio `ca7acc09`, VoxCPM2). Generated one sentence at a time, then de-plosived.
- **Re-takes:**
  - Scene 2 was reworded: "one site's street" was heard as "one side street".
  - Scene 4 was slowed to 0.88× (it came out at 170 wpm).
- **Read check:** every line was transcribed with Whisper. The read is correct; the only differences are digits for numbers and homophones ("sights", "entrance").
- **Build:** scenes are cued from the words: each scene finds its beat with `w("word")`. `.vo/build.py` sets each scene's length from the voice and writes `index.html`, the captions and the effect cues. If the voice is re-generated, re-run `build.py`; nothing needs hand-retiming.
- **Music:** ACE-Step, series prompt (job `mmvmf19ha5gm`, 115 s) at 0.15 volume, matched to Episode 01's balance.
- **Effects:** a thud on −£300, and ticks on 90p, £6, 12 and 21.

## Measured, not heard
- `check`: 0 errors. One warning kept: the dense captions track.
- **Final audio:** −15.7 LUFS, −1.8 dBTP, no clipping.
- **Frame 0:** a finished poster (title, Athena, SITE 10).
- **Not done:** nobody has listened to the final mix. The exact Porter quote on labour still needs checking against the 1979 article.

## Weakest shot
- **Scene 6:** Athena is small beside the scorecard. With more time, give her a larger crop or bring the table closer.
