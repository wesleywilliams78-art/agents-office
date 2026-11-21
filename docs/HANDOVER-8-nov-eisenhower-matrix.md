# Handover: Eisenhower matrix feeding the AIOS office (8 Nov 2026)

## Where it stands
- Matrix: 92 open, 2 sent (one failed task, one missing). It was 155 open this morning.
- 35 open cards sit with a department (Marketing 8, Emails 12, Operations 5, Delivery 9, Sales 0, Finance 1). The other 57 are questions only Wesley can answer (`dept: owner`).

## Decided and built (each a yes from Wesley)
1. **Clean-up.** 50 cards dropped with a reason (28 office-build jobs, 11 copies, 11 out of date); 123 SENT cards whose task finished marked done. Backup: `data/matrix.json.backup-2026-11-08-cleanup`. List: `output/matrix-cleanup-8-nov.md`.
2. **Auto-feed off.** `office.config.local.json` → `aios.autoFeed: false`. Cards now come only from meetings/uploads read in, and from a desk's MATRIX ITEMS block on approval.
3. **A card closes itself.** `settleMatrixCard` in `serve.mjs` (commit 8186bda): approved → done; rejected for good or failed → open again.
4. **SEND through Nora.** `matrixApi` send calls `addTask({ by: 'chief' })` and marks `task.matrix` (commit f0e830d). 20 s undo; the page and the desk trail say "From the matrix".
5. **Counts on the Office map.** Each department tile has a MATRIX count (commit a241775).
6. **Your answers in For You.** The open `dept: owner` cards sit under For You on the office map (not on a department page), most pressing first, five shown with SHOW ALL. Each has a one-line box: ANSWER posts `{ state: 'done', outcome }` to `/api/matrix/<id>`, so the server files it in the Brain with `writeAnswerNote` (same as DONE on the matrix). "Not now" hides one for a week in this browser only (localStorage `aiosFyaLater`). The page redraw never wipes a half-typed answer. Code: `fyaPanel` in `src/aios.html`. Shots: `output/aios-mockups/shots/your-answers/`. Commit ba60965.
7. **AJ's office links retired.** "Open the office" on the Overview hero now opens the AIOS Office map (`#office`); the Social "CALENDAR ↗" link to `/` is gone. No link to `/` is left in `src/aios.html`. Commit 3d8f97f.
8. **A tile's MATRIX count opens the matrix for that department.** The count on an Office-map tile is a button to `#matrix/<dept>`; the matrix shows only that department's cards with a "show every department" link (`S.mDept`, set in `route()`, used in `renderMatrix`). The Matrix tab itself clears the filter. A tile with 0 cards keeps a plain count. Commit de4ada5.
9. **The matrix dressed like the Office map.** One CSS block scoped to `#matrixSec` (Office-map tokens `--ox-*`), department chips in `#mDept` (including `#matrix/owner`, Yours to answer), `itemHtml` shows face, name, job and department, overdue red / due-soon amber, + Calendar only on dated cards. Same data attributes and buttons. Shots: `output/aios-mockups/shots/matrix-redesign/` (v2 = final). Commit 507e5bd.
10. **An ANSWER that asks for work reaches the office.** The box posts to `/api/matrix/<id>/answer`; `readAnswer` in `serve.mjs` (one Sonnet call) sorts it: work → `addTask({ by: 'chief' })` to the desk he names or the right department, card `sent` with `task.matrix`; "remind me / ask me again <day>" → a scheduled task for 09:00 that day with Esme (`emails` · `elead`), `task.matrixReopen` puts the question back under Your answers when it fires; anything else → done + `writeAnswerNote` as before (also the fallback if the read fails, and the page says so). `settleMatrixCard` now settles every sent card a task carries (one task held three). `markSentCards` at start-up gives any sent card's task its mark: the 11 tasks hub 5 made got it, 8 finished ones closed their 10 cards, 3 Thursday reminders wait. Tested on three throwaway cards (deleted). Code in 49d48d8 (swept into the agendas commit) and the follow-up commit.

## Next (not yet proposed)
- All three candidates from this note are built. Nothing else is queued for the matrix.

## Known, not ours
- `/aios` logs `ReferenceError: Cannot access 'skIsOpen' before initialization` in `skillSheet` when it opens on `#matrix` (Skills sheet code).
- `scripts/restart-office.mjs` once started an office that never answered (11:05); a manual Start-Process worked. Cause unknown.

## Files
Diagrams: `output/library/diagrams/2026-11-08 the-matrix-today (mw7pbl9x)` and `… the-matrix-proposed (mw7pbww3)`.
