# Sweden, Issue 02: the En Route recap (Wednesday, 4 Nov 2026)

This is the Wednesday video for Franchise Entry Report Issue 02, built on 1 Nov 2026. It takes over from the pill-style recap.

**The style** is location-led, after the travel-intro look Wesley pointed to (the Artlist "En Route Intro"). The parts are our own:
- real Swedish footage in rounded film-gate windows on ink;
- SWEDEN in giant Swedish-yellow capitals;
- handwritten place names in Pristina, with coordinates;
- a dotted route line whose yellow dot springs from chapter to chapter;
- an inked passport ENTRY stamp;
- ridge tides (the brand mountains) for every ground change;
- a filmic grade: grain, gate weave, flicker and light leaks.

**Spec:**
- 60 s, 30 fps with 2 blended subframes.
- Sizes: 16:9, 9:16, 4:5 and 1:1.
- Score: 120 BPM, synthesised in `score.py`, about −14 LUFS.

## The film (bar = 2 s)
| Time | Chapter | On screen | Footage |
|---|---|---|---|
| 0–6 | Title | Frame 0 is the finished thumbnail: SWEDEN over Stockholm at sunset. At 5 s it shrinks into the first window. | Stockholm aerial (mustafa Aksoy) |
| 6–16 | 01 The market | 10.61m people, up just 5,000 in H1 2026 · 24% eat restaurant food every week (55% monthly) | Charles XII statue, Nationalmuseum (Stockholm) |
| 16–26 | 02 The tax tilt | Takeaway 6% against eating in 12%, until 31 Dec 2027 · "Takeaway pays half the VAT of a seated meal." | Food truck (generic) |
| 26–36 | 03 What's moving | Fast food +5.6% against −0.8% for lunch and evening restaurants · Pizza Hut Sweden BANKRUPT 9 SEP 2026, 18 restaurants closed · "Pizza and coffee chains are failing." | Cinnamon rolls (generic) |
| 36–46 | 04 The route in | One strong Swedish operator (master or area partner) · ENTRY stamp · KFC reached 24 sites through one franchisee · Staff, all in: ≈ £17.76 an hour (estimate) | Malmö aerial, Malmö canal |
| 46–54 | 05 The verdict | "If I had a brand, I would go in where the tax tilt helps me: quick, takeaway-led, through one strong Swedish operator." | Gotland shore |
| 54–60 | Close | — ISSUE 02 — · SWEDEN · A new country every Friday · WRW Hospitality | Stockholm sunset |

Every figure comes from the published `issue.json` (the 28 Oct revision). Population is **10.61m** (SCB, 30 Jun 2026), not the 10.62m in the earlier pill recap.

## Build
1. Download the footage listed in `output/library/video/sweden-en-route/LICENCE.md`.
2. `./proxies.sh` makes graded, all-intra 30 fps proxies in landscape (2560×1440) and portrait (1080×1920). The Nationalmuseum clip is HLG and is tone-mapped.
3. `python -I score.py audio.wav`
4. `./render.sh` writes `out/WRW-Sweden-En-Route-<size>.mp4`. `ONLY="1920 1080 16x9" ./render.sh` renders one size.
5. `node stills.mjs <W> <H> <dir> <t,t,...>` makes the stills gate.

`proxies/`, `out/` and `stills/` are rebuildable and are not committed.

## The music (Wesley, 2 Nov 2026): local slap-funk French house
The synthesised score read as AI. Wesley picked **take 13**, a slap-funk French house track, after four rounds. His reference was the vibe and consistency of "Around the World": one steady groove that rides the minute. The track is our own, made locally with ACE-Step 1.5 (job `mmvz53h9nmo3`, `output/music/`). It copies no song's melody, it has no vocals, and nobody holds a claim on it.
- **The prompt that worked:** "French house funk instrumental, 120 BPM, radio-ready production. Driving four-on-the-floor kick and a relentless slap bass groove: one funky repeating riff, tight, punchy, in the pocket … Funky but disciplined: every part repeats, nothing busy, nothing messy." The full text is in the job record.
- **The lesson from the rounds:** asking for "funkier" alone gives a busy, choppy groove. Brief it as a producer would: kick front and centre, ONE two-bar riff repeating, sparse off-beat parts, no fills.
- **Pick by measurement:** `python -I music-samples/master.py score <takes…>` scores each take on kick lock (the low end on the 120 BPM grid), loop repeat (each two-bar phrase against the next) and clutter. Take 13's raw take scored 5.61 / 0.721 / 3.9, against the first funky take's 2.77 / 0.708 / 4.3.
- **Master:** `python -I music-samples/master.py master <take.mp3> fx.wav <out.wav>` runs the chain:
  - kick-phase align to the video grid;
  - EQ: rumble out, +1.5 dB at 60 Hz, −3 dB at 320 Hz, +2.5 dB at 2.8 kHz, a touch of air;
  - 2:1 glue compression;
  - a synth kick under the kicks the track already has (72 of 120 beats, never in the breaks);
  - a short sidechain pump;
  - the effects bed;
  - −14 LUFS when muxed.

  Take 13 mastered: kick lock 7.27, kicks within 10 ms of each beat.
- **Finals:** `out/WRW-Sweden-En-Route-<size>.mp4`, at −13.6 LUFS. The synth-score versions are kept in `out/synth-score/`. Every sample is in `music-samples/` (1–13).
- **Instagram** still adds its own music in the app, over the effects-only 9:16.

## Filed in Drive (2 Nov 2026)
Drive › 009 - WRW Hospitality › Wesley Tuesday Content › Edition 02 - Sweden › **En Route (Wednesday)**:
- the four finals with take 13;
- the four frame-0 covers (`WRW-Sweden-En-Route-cover-<size>.png`);
- `Instagram (effects only)/` with the four effects-only cuts, for adding music in the app.

The files were copied through Google Drive for desktop (G:), and all 12 were checked byte for byte against the originals.

## The Canva route (1 Nov 2026, kept as an option)
The synthesised score reads as AI, so LinkedIn gets a licensed track from Canva Pro instead. Canva's licence allows this only on these terms:
- the track must be marked "Commercial use allowed" (never "Popular music · Only personal use allowed");
- it must be used inside a Canva design and exported from Canva;
- the audio must never be downloaded or extracted on its own;
- the track can't be remixed;
- each design carries one track licence.

Instagram keeps adding its own music in the app.

1. `python -I score.py audio.wav fx.wav` writes the effects-only bed: shutters, stamps, pens and whooshes, at their full-mix level. It is muxed as `out/WRW-Sweden-En-Route-<size>-effects-only.mp4`.
2. Wesley picks the track in Canva and makes a short test export. The beat grid (tempo, first downbeat) is measured from that export; it's timing information only, and the audio is not kept.
3. The timing table in `en-route.html` (scene and event times) is moved onto the track's downbeats, then the four sizes and the effects-only bed are re-rendered.
4. Wesley uploads the effects-only MP4 to Canva, places the track at 0:00, sets the volume, and exports. The Canva export is the file that gets posted.

## 1440p re-render (2 Nov 2026)
Wesley saw a soft, grainy first ten seconds. The Stockholm aerial is soft at source (drone at sunset, about 650 on a sharpness measure against 2,900 for the Charles XII shot), and it filled the frame under the film grain.

**The fix:**
- `./proxies-1440.sh` makes landscape proxies at full 4K and portrait ones at 1440×2560.
- Every clip gets an enhancement pass: light denoise, then 13×13 local contrast and 5×5 detail.
- The grain overlay is eased from 0.10 to 0.07.
- `./render-1440.sh` renders every size at 1440 on its short side: 2560×1440, 1440×2560, 1440×1800 and 1440×1440.

**The result:** take 13 at −13.6 LUFS, plus effects-only copies. Sharpness is about 3 to 4 times the 1080 version at every point in the minute (the opening seconds about 4×).

**Files:**
- `out1440/` is canonical. `out/` is the superseded 1080p set.
- In Drive, the 1080p files moved to `1080p (superseded 2 Nov)` in both folders.

**Note:** Drive and LinkedIn previews start on a low-quality stream and sharpen after a few seconds. Judge quality on the downloaded file.

**Drive tidy (3 Nov 2026):**
- Drive ran out of storage, so the 1440p uploads stalled.
- Wesley binned the two `1080p (superseded 2 Nov)` folders and the `Instagram (effects only)` folder; its 9:16 duplicated the Instagram-row recap.
- The effects-only masters are still on this PC in `out1440/`.
