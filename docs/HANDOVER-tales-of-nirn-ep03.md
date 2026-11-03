# Handover: Tales of Nirn, Ep03 onwards (3 Nov 2026)

## Goal
Tales of Nirn is Wesley's fan series: Elder Scrolls in-game books read aloud as narrated "living stills", on Instagram (`@talesofnirn`) and on YouTube.
- One Reel a day. An episode is 3–5 Reels, each under 3 minutes.
- Book order: Skyrim books first, then Oblivion, then Morrowind.
- Keep it separate from WRW Hospitality.

## Done
- **Ep01 *Night Falls on Sentinel*:** five Reels, five 16:9 parts and the full episode are in Drive. Parts 1–2 are posted.
- **Ep02 *The Alik'r*:** three Reels and the full episode, approved and in Drive.
- **Calendar:** dated through Sun 15 Nov in Brain `20-Brand/content-calendar.md`. Tales of Nirn cards sort last in each day (`src/calendar.js` `postEvents`). Built and checked, **not committed**.
- **Queue:** Brain `40-Marketing/tales-of-nirn.md`.

## Decisions (and why)
- **Narrator:** only the curated female narrator reads, on every Reel and cut (Wesley's rule).
  - Voice settings: `voice/passage/ref/night-reader.wav`, seed 53, with a "woman narrator… contralto" instruct.
  - `voice/gate.py` (pitch) and `redo-gated.sh` (pitch plus Whisper) reject male-sounding takes.
- **Speed:** Ep01 is slowed with atempo 0.8. Ep02 onwards runs at 1.0, which Wesley preferred.
- **Pronunciation:** spellings go in each episode's `narration/respell.sed`. `captions.py` restores the real names on screen.
- **Sound:** fire crackle only, well under the voice. No music.
- **Captions:** always burned in, Tw Cen MT Condensed, at most two lines.
- **Look:** a realistic living still with LTX fire. No puppets, no blurred Reel bands, no extensions below the scene.
- **Delivery:** to Drive `010 - Tales of Nirn/Episode NN - <Book>/`, never through Telegram (Telegram's re-encoding adds clicks).
- **Rights:** a ZeniMax credit on the last part of each episode. Book text and our own art only. Never clone a real actor's voice.
- **GPU:** never run VoiceStudio (:3900) and LTX (:8799) at the same time on the 16 GB GPU.

## Files
`videos/tales-of-nirn/`:
- `titles.py`, `captions.py`
- `voice/`: `gate.py`, `redo-gated.sh`, `declick.py`, `deplosive.py`, `build-clean.sh`
- `episodes/ep01-…/` and `episodes/ep02-the-alikr/`: `cut.sh`, `splits.txt`, `narration/`, `still/motion/livingstill.py`, `still/tall/tall.py`

The series memory `tales-of-nirn-series.md` has the full pipeline.

## What is left
1. **Ep03 *Immortal Blood*** (about 1,700 words, 3 Reels). It posts Tue 10 Nov, so Wesley must approve by Sat 7 Nov:
   - his pick of four key images;
   - the vampire tribe pronunciations;
   - Reel 1.
2. **Ep04 *A Game at Dinner*** (about 2,500 words, 3–4 Reels). It posts from Fri 13 Nov and needs the same approvals.
3. **Commit:** commit `src/calendar.js` (and the rebuilt `dist/`) only when Wesley asks.

## Very next step
Build the Immortal Blood key images:
1. Get the book text and count the words.
2. Draft the scene. A chapel at night fits the opening line.
3. Generate 4 Z-Image candidates at 1920×1088 on local LTX, with cloud generation off.
4. List the tribe names with proposed spellings.
5. Send both to Wesley for his pick.
6. Then follow Ep02's pipeline: copy `ep02-the-alikr/` as the template for narration, the living still, `cut.sh` and Drive.
