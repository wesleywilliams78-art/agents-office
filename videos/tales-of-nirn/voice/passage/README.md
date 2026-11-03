# Final two: the full passage (1 Nov 2026)

`hearth-passage.m4a` and `night-reader-passage.m4a`: the opening of *Night Falls on Sentinel*, up to "You come highly recommended." That's 246 words, about 2 minutes each.

- **Voice held steady:** each line is cloned from the first 15 s of that voice's audition (`ref/`), so the voice stays the same from line to line. VoxCPM2 in VoiceStudio, with seed 11 for the Hearth and 53 for the Night Reader.
- **Script:** `lines.tsv` holds one sentence per line: the pause after it in ms, a breath flag, then the text.
- **Pace:** each line is slowed to 0.8× with rubberband, keeping the formants so the voice isn't deepened. That gives about 145 words a minute while speaking and about 124 overall with the pauses.
- **Pauses:** 450–550 ms inside a thought, 700–1,000 ms between sentences, 1.1–1.5 s at a turn or before a beat.
- **Breaths:** a soft synthesised inhale at the start of each new thought.
- **Finish:** the same as the auditions. Warmth, de-essing, light compression, room tone, −16 LUFS.
- **Rebuild:** `bash build-passage.sh <this folder> hearth 0.8`

## Chosen: the Night Reader (1 Nov)
Wesley: "very seductive, watch the P's." `night-reader-passage-v2.m4a` has the fix:
- `../deplosive.py` softens the low wind, then `../softp.py` (`--db 6 --jump 18`) dips the sharp release of each P, B, T and K by 6 dB for 30 ms.
- The warmth is now +1.5 dB at 160 Hz (was +2.5 dB at 140 Hz), and the compressor attack is 6 ms (was 15).
- VoiceStudio profile: *Tales of Nirn Narrator* (`cb93021e`).
- Rebuild: `bash build-passage.sh <this folder> night-reader 0.8 night-reader-soft night-reader-passage-v2`
