# Handover, 7 Nov 2026: AIOS full-width Office, top bar, Consultants' Corner, Original Nuttah, light mode, Roles retired

## Where things stand
All of this is built in `src/aios.html`, checked (`npm run check` 96/96) and committed on `main`.
- **Pushed to `fork`:** 3287814 (full-width Office, tabs across the top, For You as a pull-out), cc3150f (WRW Office bar, live pill bottom-right, Consultants' Corner player, Original Nuttah trigger), f944361 (the player starts on the three-hour video).
- **Committed, not pushed:** efee7eb (now-playing pill, it pauses for Original Nuttah, logo/Office/tabs levelled), 303d855 (light theme readable), d72da14 (Roles retired). Push only on Wesley's yes: `git push fork main`.
- **Not mine, left uncommitted:** the Tokens-tab `deskLabel` lines in `src/aios.html` (another session's). Every commit here staged the file through an index copy with those lines reversed.

## What was decided
- The bar reads the WRW logo plus **Office**. There's no "Open the 3D office" link. The live version pill sits faint in the bottom-right corner.
- **Consultants' Corner** pill (top right) is a now-playing bar. It shows:
  - the cover, which spins while playing;
  - the title and time;
  - an equaliser;
  - its own play/pause button;
  - a progress line.

  How it works:
  - It reads YouTube's embed API through postMessage, using `enablejsapi=1` on the youtube-nocookie embed.
  - It starts on `https://www.youtube.com/watch?v=INMPrT880yQ` (the first three hours, Morning Jazz for Deep Work).
  - A link pasted with CHANGE THE LINK replaces it, stored in localStorage `aios.ccPlaylist`.
  - Below 1420 px wide it shows only the cover, equaliser and button, so the bar stays on one row.
- **Original Nuttah:** every 20th finished task plays `output/music/original-nuttah.mp3` (on D:) from 0:34 on the PC's speakers.
  - Code is in `nuttah.mjs`, hooked in `serve.mjs` at the two places a task becomes done. The count is kept in `data/nuttah.json`.
  - `nuttah.events` emits `play`/`end`, and `GET /api/nuttah/events` (SSE) streams them. Open dashboards pause the YouTube player and resume it afterwards.
  - `POST /api/nuttah/test` rehearses the pause without sound.
- **Light mode** was made readable through tokens only:
  - global light `--grey #4f4a47` and `--faint #736d68`;
  - solid white `--ox-card`;
  - half-strength pink ridges, on the Office's own background and the page's.

  Dark mode is untouched; Wesley loves it as it is.
- **Roles retired.** Its content now lives elsewhere:
  - Every department opens from the Office map. Emails, Sales, Operations and Finance open read-only, with a "Not in AIOS yet · read only" tag.
  - Briefing gaps show as "N to brief" on the tiles, a To brief count on the department band, and "No brief · No skill" on desk cards.
  - The News feed is a panel on Overview.
  - `#roles` links open the Office.

## What is next
Nothing is open in this thread except the push. Ideas, none asked for:
- turning the read-only departments into full AIOS departments (widen `PILOT`);
- adding the next Consultants' Corner uploads as a playlist link.

## Where things are
- UI: `src/aios.html`. Top bar `header.top`, pill `#ccPill` with its script block "Consultants' Corner (7 Nov 2026)", Office script `PILOT`/`okView`/`tile`/`deskCard`, News feed `aside.news.wide`.
- Server: `nuttah.mjs`; `serve.mjs`, where the `/api/nuttah/*` routes sit just above `/api/health`.
- Screenshot helpers used: Playwright with the installed Chrome (`node_modules/playwright-core`, import via a `file:///` URL).
