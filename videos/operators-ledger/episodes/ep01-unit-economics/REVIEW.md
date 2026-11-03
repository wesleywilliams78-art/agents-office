# REVIEW — The Operator's Ledger, Episode 01 "Unit economics" (v3)

## v3 (24 Oct 2026)
- **End card:** the WRW logo (rounded red tile, white mark) replaces the 略 seal. The sign-off is now "Wesley Williams", with no job title.
- **Voice:** de-plosive pass on all seven lines (75 Hz low cut, plus burst-only 180 Hz high-pass crossfades). Pops are 9–25 dB lower, and a Whisper re-check is still word-perfect. Lengths are unchanged, so no retime was needed.
- **Loudness:** two-pass loudnorm plus a true-peak limiter. The result is −15.8 LUFS and −1.8 dBTP, with no clipping (the first pass without a limiter clipped at +0.9 dBTP).
- **Kept for comparison:** `renders/…-v2-before-deplosive.mp4`.

## v2

**Output:** `renders/operators-ledger-ep01-unit-economics.mp4`. 1080 × 1350 (4:5), 30 fps, 104.7 s, H.264/AAC, 5.5 MB.
The first cut (Kokoro "George" voice, 90 s) is kept as `renders/operators-ledger-ep01-unit-economics-v1-george.mp4`, with its source in `.vo/backup-george/`.

## What changed from v1
- **Voice:** Wesley's cloned voice (VoiceStudio profile `ca7acc09`, VoxCPM2, Apache-2.0). Each line was generated one sentence at a time with 0.42 s breaths, at about 120 wpm.
- **Timing:** retimed to the new read. Every animation beat was keyed to an old word time and now follows the same word in the new read (`.vo/retime.py`). Scenes grew by 0.6–5.5 s each, so the film is now 104.7 s.
- **Captions:** centred horizontally, still at the bottom. Their timings now come from Whisper large-v3 word timestamps on the actual voice, not estimates.
- **Music:** a new 112 s ACE-Step bed (job `mmvmdhehecoz`) from the same prompt, at 0.125 volume.
- **Effects:** all six moved with their pictures:
  - ticks at 19.9, 24.6, 33.2, 44.8 and 73.6 s;
  - the bass impact on −£300 at 60.1 s.

## Measured, not heard
- `check`: 0 errors. The one warning kept is the dense captions track, which is intended: every caption group is on one track.
- **Read accuracy:** every line was transcribed. All words were read correctly; the only differences are the transcriber writing numbers as digits.
- **Rendered audio:** −15.5 LUFS integrated, −1.0 dBTP true peak, no clipping. That's after two-pass `loudnorm` to −15 LUFS; the raw mix was −21.3 LUFS. Onsets confirm each effect lands on its picture.
- Nobody has listened to the final mix yet. Please check the voice-to-music balance on a phone speaker.

## Open
- Wesley to record consent on the VoiceStudio "Wesley" profile.
- The LinkedIn post copy in the brief needs approval. Its running-time line now reads "in under two minutes", to match the 105 s film.
- **Weakest shot (unchanged): scene 2.** The profit block floats above the dropped slices.
