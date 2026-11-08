# Handover, 7 Nov 2026: AIOS dashboard hub 1 → hub 2

## How the hub works (Wesley, 7 Nov)
- This chat is the **AIOS dashboard hub**. Every new task starts from here as a **fresh** linked session (start_session, full brief, not a fork) and is filed in the sidebar group **AIOS dashboard** (`cg-7acfdc6a-ea97-41d1-9f80-702999a28fd3`).
- Keep heavy work out of the hub. The hub stays on Opus so motion tasks inherit Opus; give routine tasks Sonnet.
- At the 250k context alert the hub writes a note like this one and starts the next hub itself (fresh, linked, filed in the group). The rule is in memory: `aios-hub-chat-sessions.md`.
- The sidebar heading "agents-office" is only the folder name. Detaching from AJ Sahni's `origin` remote is a separate decision, not planned.

## Done in hub 1 (7 Nov)
- **Portugal pill recap (Tuesday Edition 03)**: built in green `#046A38` (Wesley's choice; the cover's field is actually red `#FF3131`). Files are in `videos/franchise-entry-report/issues/03-portugal/recap/` (four sizes, covers, sheets, `EDITION.md` with QA) and in Drive › Wesley Tuesday Content › Edition 03 - Portugal (https://drive.google.com/drive/folders/1DagA-Fi9QaiwSKmx0xq-pb-yRYqxCQLL), and were sent to Telegram. **Superseded:** the Wednesday video is now the En Route style, not the pill. Ask Wesley whether to keep or bin the pill files in Drive.
- **Madeira or the Algarve? Reel** (Instagram, Wed 11 Nov 11:00): built to match Lisbon or Porto? exactly (Wesley's choice: no labels, no close card, guide beat). Files are in `output/library/video/portugal-city-compare/` (`madeira-or-the-algarve.mp4`, `-no-audio.mp4`, `-cover.png`, `CAPTION-madeira-or-the-algarve.txt`, licence `FOOTAGE-madeira-or-the-algarve.md`). Sent to Telegram as 36 MB previews, because the masters are 60 MB, over Telegram's 50 MB cap. Lisbon hashes are unchanged (608 files). Not posted.
  - **Open:** once Wesley says the Reel is live, ask before deleting `footage/p30100487.mp4`, `p33050416`, `p36765873`, `p40000897` and `frames-madeira/`.

## Running
- **Portugal En Route recap (Wed 11 Nov 08:00, LinkedIn and Instagram)**: session `portugal-en-route` (`local_a12aaa82-c509-42a7-8bd7-2994b588b1d1`), started from hub 1 and filed in the group. It brings Wesley a yes/no footage list before any download, and a yes/no on reusing music take 13. Due Tue 10 Nov, 18:00. Check its output before telling Wesley it is done.

## Lessons from hub 1
- Pexels blocks the in-app browser and the web reader with a bot check, which Wesley also can't pass in the pane. Use **Claude in Chrome** (his own Chrome) to open clip pages; the download URL is in the page's `__NEXT_DATA__` (`medium.attributes.video.video_files`).
- The country-row side reels (`connectors/motion-studio/series/country-row/city-template.html`) have no place labels and no close card. Office briefs that describe them otherwise are wrong; match the finished reel.
- The Tuesday pill render pipe writes full-range `yuvj420p`. Re-encode with `scale=in_range=pc:out_range=tv` for `yuv420p`.
- A PowerShell guard hook blocks any command containing `format=` (it reads as a disk wipe); leave it out of ffmpeg filters.
- Telegram's file cap is 50 MB; send preview copies of bigger masters.
