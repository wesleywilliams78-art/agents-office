# Motion studio

The office's own headless render engine for motion graphics, driven by the **Motion Director** in the side panel (the MOTION STUDIO tab, `motion.mjs`). Free and local.

## How a frame is made

A composition is one HTML page that can paint any moment from the time alone:

```js
M.scene({ width: 1080, height: 1920, fps: 30, duration: 10, bpm: 120, cuts: [4, 12],
  setup() { /* build the DOM once */ },
  render(t) { /* set every element for time t */ },
  score(S) { /* place every sound on the beat grid */ } });
```

`engine.mjs` opens it with Playwright in this PC's Chrome (headless), takes the clock away (Date, performance.now, rAF, Math.random and CSS animations all follow the frame's time), calls `render(i / fps)` for every frame, captures each one from the compositor over CDP and pipes it into ffmpeg. Long pieces are painted in parallel lanes and joined without re-encoding. Declare intended reading holds with `holds: [[from, to], …]` (seconds, ≤ 8 s each): the dead-frame scan allows stillness inside them. A series whose `series.json` sets `loudness` and has no narration gets its score finished to that target. Set `subframes: 3` (2–4) in `M.scene` for motion blur: each frame is painted that many times across its shutter and ffmpeg's `tmix` averages the samples. `score(S)` runs in the same page in an `OfflineAudioContext`, so the music and effects are synthesised on the same grid as the cuts.

## The loop

| Tool | What it does |
|---|---|
| `motion_preview` | Stills on the beat grid as contact sheets, plus the checks. Seconds. |
| `motion_draft` | Every frame at half size with the score; every frame scanned for dead stretches, hard colour cuts and off-beat cuts. Pass `critic: true` to have the **critic** (`critic.mjs`, a separate Opus 5.5) score the stills as advice; off by default, it costs a full model run. |
| `motion_final` | Full size, from a draft that breaks no rule (no dead frames, no hard colour cut). There is no score gate. |
| `motion_job` · `motion_source` · `motion_list` · `motion_cancel` | Status (with the contact sheets as images), source for edits, queue. |

## House rules (enforced; nothing renders if one is broken)

- Real spring physics (`M.spring`, closed-form damped oscillator) for every pop, land, drop and stamp. No CSS transitions, keyframes, `element.animate`, or back/elastic/bounce curves.
- Every sound synthesised with `kit/sound-kit.js`. No audio files, no internet.
- Cuts declared on beats; hard cuts found off the beat are errors. Dead stretches (nothing moves for 0.4 s, outside the frame-0 hold and a short end rest) are errors.
- The same moment painted twice must be the same picture.
- Colour transitions: a change of ground colour inside two frames (a hard colour cut) is an error; stills are always taken before, on and after each declared cut.
- Brand notes (rounded corners, shadows, gradients, circles, retired colours) are warnings for the Director.

## Narrated series
A series whose `series.json` says `"narration": true` (The Operator's Ledger) may carry Wesley's narration, the one audio that is not synthesised. `motion_narrate` makes it (`voice.mjs`): the cloned voice from VoiceStudio (VoxCPM2, profile in `series.json`), sentence by sentence with breaths, the series' de-plosive script, then Whisper word timings aligned to the script; or his own recordings; or a stand-in for drafts (a final is refused with it). The page gets the timings as `narration/words.js` (`M.cue`, `M.at`, `M.caption`); the engine mixes the lines at `voice: [{ line, at }]`, ducks the score under them, finishes the loudness (two-pass `loudnorm`, limiter) and writes `captions.srt`.

## Files

- `kit/` copied beside every composition: `motion-kit.js` (springs, beat grid, pulse, tween, split, ridges), `sound-kit.js` (drums, bass, pads, plucks, risers, whooshes, impacts, stamps), `brand.css`; fonts, the WRW logos and the ridge SVGs are added (the 略 seal SVGs are retired) from `connectors/video-studio/brand` and `assets/brand`.
- `kit/three/` (three.js r185) and `kit/gsap/` (GSAP 3.14.2 with SplitText, DrawSVG, MorphSVG) are copied into every project from `node_modules` (pinned in package.json). GSAP may only move through a paused timeline seeked in `render(t)`; three.js only renders inside `render(t)`. The engine refuses anything else.
- `examples/scale-is-a-system.html`: the worked example the Director reads.
- Jobs: `data/motion/jobs/`, projects `data/motion/projects/<id>/`, output `output/motion/<id>/` (stills, contact sheets, `score.wav`, `draft.mp4` or `<title>.mp4`). Worker log `data/motion/worker.log`.

| `brain_search` / `brain_read` | Read-only access to Wesley's Brain (27 Oct 2026): find a note by name or text and read it in full, including uploaded master prompts (`Upload - ...`). Needed so the Director can follow a prompt he pastes or uploads. |
