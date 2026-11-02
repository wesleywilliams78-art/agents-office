---
name: manual-magic-university
description: Make a Manual Magic University tutorial, a narrated screen recording of the Manual Magic AI platform (demo account) for one user-guide section, in Wesley's cloned voice. Use when Wesley asks for a Manual Magic University video, an MMU-NN video, a tutorial or explainer of the Manual Magic platform, or to re-record one after the platform changed.
---
# Manual Magic University videos

Use this for any narrated screen-recorded tutorial of the Manual Magic AI platform, one per user-guide section, for the University onboarding area. A motion graphic for Manual Magic is **not** this. That is the Motion Studio (`videos/manual-magic-ai/01-…`).

The tools live in `videos/manual-magic-ai/university/`. Read its `README.md` before running anything. Each video is a folder `videos/mmu-NN/` with one `script.mjs`, which holds the steps, captions, narration and the Playwright actions.

## Gates (stop and ask Wesley if any one fails)
1. **NDA signed** with Manual Magic AI. Until it is, nothing recorded leaves Wesley and Penny. Ask Wesley before the first login of a session if you don't know.
2. **Demo account only** ("Demo Operations Manual"). If the top-left manual name is anything else, stop.
3. **No passwords in files.** Wesley logs in by hand (`node recorder/login.mjs`), and the session is saved to `.auth/state.json`, which is git-ignored. If the session has expired, ask him to log in again. Never type a password yourself.
4. **Voice:** VoiceStudio on 127.0.0.1:3900, profile **"Wesley"**. If it isn't running, ask Wesley to start it. Never swap in another voice.
5. **Penny approves every video** before it's used. Wesley signs off the pilot before the batch starts.

## Process (in order)
1. **Script:** write `videos/mmu-NN/script.mjs` from the guide section (v1.1, `G:\My Drive\006 - Manual Magic\Manual_Magic_AI_User_Guide_29_10_26 - Wes edited.docx`). Use a hospitality example.
2. **Discover:** run `node recorder/discover.mjs <page>`. It saves a screenshot and the real labels. Fix the selectors to match. Don't guess. The platform has drifted from the guide: the left-hand icons have no labels, the manual opens from **MANUAL** in the top bar, and Upload IP / Add SOP / Ask Wizard / BOARD appear on the **Dashboard only**.
3. **Narrate:** run `node recorder/narrate.mjs mmu-NN`, which gives one clip per step. The narration comes first because each step is held on screen for its line plus a breath, so the sync is built in.
4. **Rehearse:** run `node recorder/record.mjs mmu-NN --rehearse` until every step passes. A rehearsal never presses a button that saves, creates, publishes or deletes (`ui.commit`).
5. **Record:** run `node recorder/record.mjs mmu-NN` once.
6. **Edit:** run `node recorder/edit.mjs mmu-NN`. It cuts the waits (keeping 1 s either side), adds the opening and end cards, lays the narration on each step, and makes the H.264 MP4.
7. **Check:** use the list below, looking at the contact sheet frame by frame. Then deliver.

## Learned on the pilot (2 Nov 2026)
- **Add SOP on the Dashboard opens the SOP Board** (`/board`). The Create SOP form (`/board/create`) opens from the orange + (a `div.btn-primary`, not a button). The guide's Section 9 says otherwise, and that is raised with Penny.
- **A new SOP's page shows "Created by Penelope Hopkinson".** Never film it. Go from Create straight to the board.
- **Anything that saves goes through `ui.commit`**, pressed once, in the real take only. To re-take after it has saved, use `record.mjs --reuse`, which shows the click without pressing and uses the existing item, so the demo account never gets duplicates. `--test` makes a full recorded take that saves nothing, for Wesley to review first.
- The platform gets 1920×988. The caption bar is a separate 92 px strip added in the edit, so it never covers a field.
- A native dropdown's list isn't captured on video. Show it inline (`select.size = n`), pick, then fold it back.
- Voice: **max quality pinned on every call** (64 steps, post-processing), at the script's `pace` (0.9, for viewers whose first language isn't English). The cursor, typing and holds slow to match.
- Music: `music: { file, gainDb: -24 }` in the script. It's ducked under the voice and faded at both ends. The house bed is `assets/music/warm-piano-pads-long.wav` (Wesley's pick, 2 Nov).
- Opening sound: `sting: { file: 'assets/sound/whoosh.wav', peak: 1.9, gainDb: -4 }`, a synthesised whoosh (`assets/sound/whoosh.py`) that builds over the title card and peaks on the cut into the platform. Not a jingle (Wesley, 2 Nov).
- In Git Bash, never pass `/` as an argument: it becomes a Windows path. Run `discover.mjs` with no path for the Dashboard.
- Wesley reviews a test video before the real take.

## Style
- Pace slow enough to follow: each caption stays up at least 2.5 s and covers its narration line plus 0.8 s.
- Cursor always visible. It glides with easing and pauses about 0.4 s before each click.
- One short caption per step, in the bottom bar: navy #042549, orange #f5842c step badge, white Jost.
- Words: **Category** for the six manual parts (the SOP Board names), **SOP** for a procedure, **never "chapter"**.
- Length 60 to 120 s. Opening card (2 s): "Manual Magic University · [Section title]". End card (2 s): "Next: [next video title]", where the next video is the next guide section in order.
- Captions and narration may be tightened. Steps and labels must match the screen exactly. Don't claim a platform behaviour the guide doesn't state.

## Output
Save to `G:\My Drive\006 - Manual Magic\Manual Magic University\`: `MMU-NN <Title>.mp4`, `MMU-NN script.md`, and the recorder plus that video's script in `recording-scripts\` (`edit.mjs --deliver` does this). Never upload anywhere else. Send to Wesley on Telegram with `notify.mjs telegramVideo()` only if he asks.

## Check before handing over
- Every caption matches the on-screen label exactly
- No wait longer than 1 s left in
- Each narration line starts within 0.5 s of its step (edit.mjs prints the offsets)
- No password, email address or client data visible (check every frame on the contact sheet)
- Cursor visible throughout, no jumps
- MP4, H.264, yuv420p, 1080p, faststart (plays on a phone)

## The series (after the pilot is signed off)
02 Dashboard · 03–07 Set-up (Business Details, Target Reader, Brand Voice, Logo and colours) · 08 Upload IP · 09 Create an SOP (pilot) · 10 Overview · 11 Editor · 12–14 Checklist, FAQ, Storyboard · 15 Assets · 16 QR and Preview · 17 Publish · 18 Export · 19 Wizard (upload a source document first) · 20 Team. **Wait for Penny's answer** on Export (the Gamma question) and Team (seat limits).
