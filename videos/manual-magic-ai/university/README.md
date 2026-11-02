# Manual Magic University recorder

Narrated screen recordings of the Manual Magic AI platform, one per user-guide section, in Wesley's cloned voice. The process and rules are in the project skill `.claude/skills/manual-magic-university/SKILL.md`.

Run everything from this folder (`videos/manual-magic-ai/university` in the agents-office repo). It uses the repo's `playwright-core`, this PC's Chrome, ffmpeg, and VoiceStudio on 127.0.0.1:3900 (profile "Wesley"). The copy in Google Drive (`recording-scripts\`) is an archive. Run it from the repo, not from Drive.

```
node recorder/login.mjs                         Wesley logs in to the DEMO account by hand. Saves .auth/state.json (git-ignored, never shared)
node recorder/discover.mjs / --click "Add SOP"  screenshot plus real labels of a page → work/discover/
node recorder/narrate.mjs mmu-09                one voice clip per step → work/mmu-09/voice/
node recorder/record.mjs mmu-09 --rehearse      runs every step without recording and never presses Create (add --fast, --headed)
node recorder/record.mjs mmu-09                 the one real take → work/mmu-09/recording.webm + timeline.json
node recorder/edit.mjs mmu-09                   cuts, cards, voice → work/mmu-09/MMU-09 ….mp4, contact sheet, script.md
node recorder/edit.mjs mmu-09 --deliver         also copies the MP4, script.md and these scripts to G:\My Drive\006 - Manual Magic\Manual Magic University
```

**When the platform changes:** run `discover.mjs` on the page, fix the selectors in `videos/mmu-NN/script.mjs`, rehearse, then record again. Narration only needs redoing if the words changed (`narrate.mjs mmu-NN --only 3`).

**A new video:** copy `videos/mmu-09/script.mjs` to `videos/mmu-NN/`. Each step has `screen` (for the script sheet), `caption` (`*word*` shows in orange), `narration`, and `act(page, ui)`. In `act`, `ui.click`, `ui.type` and `ui.point` move the visible cursor. `ui.wait(fn)` marks a wait for the edit to cut. `ui.commit(locator)` is any click that saves something in the platform, and a rehearsal skips it.

`recorder/lib.mjs` draws the cursor and click ring in the page, which gets 1920×988. `edit.mjs` adds the caption bar (#042549 / #f5842c / Jost) as a 92 px strip underneath, keeps 1 s either side of each cut (0.2 s for a blank page load) and corrects Playwright's video offset from the recorded length.

**Sound:** `assets/sound/whoosh.wav` is the opening whoosh, made by `python -I assets/sound/whoosh.py assets/sound/whoosh.wav`. The music bed `assets/music/warm-piano-pads-long.wav` isn't in git (21 MB). Rebuild it from the mp3 with:
`ffmpeg -i assets/music/warm-piano-pads.mp3 -i assets/music/warm-piano-pads.mp3 -i assets/music/warm-piano-pads.mp3 -filter_complex "[0][1]acrossfade=d=4:c1=qsin:c2=qsin[a];[a][2]acrossfade=d=4:c1=qsin:c2=qsin" -ar 48000 assets/music/warm-piano-pads-long.wav`
