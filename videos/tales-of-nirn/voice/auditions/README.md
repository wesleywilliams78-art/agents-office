# Narrator auditions (1 Nov 2026)

Five synthetic voices, designed from a text description with VoxCPM2 in VoiceStudio on this PC. None is a real person. Each one reads the opening paragraph of *Night Falls on Sentinel*.

| File | Voice | Seed | Median pitch |
|------|-------|------|--------------|
| 1-the-hearth.m4a | An older British man in his sixties, very deep and warm voice, low pitch, slow and soothing bedtime storyteller, soft gentle gravel, intimate and close | 11 | 86 Hz |
| 2-the-scholar.m4a | A middle-aged English man, deep velvety baritone, low pitch, calm and unhurried, smooth and rich, close-mic audiobook narrator, gentle | 23 | 90 Hz |
| 3-the-northman.m4a | A middle-aged man with a soft Scandinavian accent, deep bass voice, very low pitch, calm, slow, grounded and soothing storyteller | 37 | 111 Hz |
| 4-the-alto.m4a | An older British woman, low warm alto voice, low pitch, slow and soothing, slightly smoky and soft, a gentle bedtime storyteller | 41 | 191 Hz |
| 5-the-night-reader.m4a | A woman in her forties, deep contralto voice, low pitch, hushed and intimate, very slow and calm, velvety soft whispery audiobook narrator | 53 | 127 Hz |

**How they were made:** `POST http://127.0.0.1:3900/generate` with `engine=voxcpm2`, `instruct=<voice above>`, `seed=<seed>` and `speed=0.9`. Whisper confirmed every word was read.

**The finish** (ffmpeg, applied to every file):
- High-pass at 55 Hz, +2.5 dB warmth at 140 Hz, −1.5 dB at 3.2 kHz.
- Light de-essing, then 2.2:1 compression.
- A faint brown-noise room tone underneath.
- Loudness set to −16 LUFS with a −1.5 dB true-peak ceiling.

`raw/` holds the untreated WAVs.

**Once one is picked:** save it as a design profile in VoiceStudio (`POST /profiles`, `kind=design`) so the voice stays the same across episodes, then generate the full episode sentence by sentence with a breath between sentences.
