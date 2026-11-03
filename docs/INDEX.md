# Index: what to open, and when

Start here. Open only what the task needs; read big files by slice.

## Instructions and guides
- `CLAUDE.md` (loaded every session): how to change agents, skills, routines, connectors.
- `SKILLS.md`: full guide to writing a skill. Open once before writing your first.
- `README.md`: what the product does. Open only when the product description must be updated.
- `CHANGELOG.md` (15 KB): release history. Open only for release notes.
- `docs/token-baseline.md`: measured token numbers (5 Oct 2026). Compare against it after changes.
- `docs/token-habits.md`: session habits to save tokens.

## Config and roster
- `office.agents.json`: shipped agent defaults. Do not edit unless asked.
- `office.agents.local.json` (17 KB): the owner's agent edits. Read one agent by id, not the whole file.
- `office.config.json` / `office.config.local.json`: connectors, brain path, tools. Small, safe to read.

## Code (open only when changing code)
- `serve.mjs` (79 KB): the server. Search for the function you need; never read whole.
- `check.mjs` (80 KB): `npm run check` tests. Run it rather than reading it.
- `aios.mjs` matrix and dedupe · `budget.mjs` personal budget · `brainnotes.mjs` reviewed Brain updates · `siteupdates.mjs` reviewed website edits and the /site/ route · `recover.mjs` restart recovery · `mcp.mjs` connectors · `routines.mjs` schedules · `teams.mjs` agent teams · `skills.mjs` skill loader · `roster.mjs` roster loader · `onboard.mjs` set-up interview · `learn.mjs` corrections · `tokens.mjs` token use (chat transcripts and the office's run ledger, `GET /api/tokens`, the AIOS Tokens section).
- `connectors/ltx-local/`: the local video connector (free LTX 2.5 on this machine). Start at its `README.md`; `mcp.mjs` is the agents' tools, `worker.mjs` owns the GPU.
- `connectors/motion-studio/`: the motion graphics render engine (Playwright paints every frame in Chrome, ffmpeg stitches, the score is synthesised, a critic scores the stills only on request). Start at its `README.md`. `motion.mjs` is the Motion Director (the MOTION STUDIO tab in the side panel).

## Data (large; never read whole)
- `data/tasks.json` (630 KB, over 100k tokens): read by task id or the last 20 entries.
- `data/matrix.json` (500 KB): read by item id or the open items only.
- `data/budget.json` (45 KB): use the AIOS budget view or `GET /api/budget`.
- `data/office.log`: tail the last 50 lines.
- `data/tokens.jsonl`: one line per office Claude run (from 3 Nov 2026); `data/tokens-cache.json` is the transcript scanner's cache, safe to delete.
- `data/brain-backups/`: only when restoring a Brain note.
