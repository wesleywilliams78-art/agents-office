# Index: what to open, and when

Start here. Open only what the task needs; read big files by slice.

## Instructions and guides
- `CLAUDE.md` (loaded every session): how to change agents, skills, routines, connectors.
- `SKILLS.md`: full guide to writing a skill. Open once before writing your first.
- `README.md`: what the product does. Open only when the product description must be updated.
- `CHANGELOG.md` (15 KB): release history. Open only for release notes.
- `docs/token-baseline.md`: measured token numbers (5 Oct 2026). Compare against it after changes.
- `docs/token-habits.md`: session habits to save tokens.
- `docs/chief-of-staff.md`: Chief of Staff + Prompt Engineer. Open before changing how tasks are added.
- `docs/claude-code-box.md`: the Claude Code box at the bottom of For You (8 Nov 2026): headless Claude Code in the repo, risky calls held for Wesley's yes/no (`claudebox-policy.mjs`, `scripts/claude-box-hook.mjs`), desks' `to: claude-code` decisions, phone access gated to his Tailscale login. Open before changing what the box may do or who may use it.
- `docs/lead-review-plan.md`: lead review and bounce loop (`leadreview.mjs`, `runWithLeadReview` in `serve.mjs`, AIOS Hierarchy trail). Built 4 Nov, ships off (`leadReview.enabled`). Open before changing how a desk's draft reaches Wesley. Lead-proposed lessons (`leadlessons.mjs`, `POST /api/lead-lesson`, the card in AIOS Hierarchy's Awaiting you column) built 4 Nov: `docs/HANDOVER-4-nov-lead-lessons-build.md`.
- `docs/HANDOVER-6-nov-kitchen-map.md`: Imran's Diner Kitchen page in the AIOS (map from the sketch, dish replay, walks, improve marks; model in `data/kitchen-imrans.json`). Next: day-two timed orders, then the whole product list grouped by route (both done; see `docs/HANDOVER-7-nov-kitchen-map.md`).
- `docs/plan-agent-visibility.md`: plan (7 Nov, not built) to let the GRAPHICS DESIGNER look at its own slides through a `video_look` tool in `connectors/video-studio`. Evidence: two blind tests (1 loss, 1 win) and a spike proving MCP images reach headless agents. Open before building it. Opus 5.5 · high.
- `docs/HANDOVER-7-nov-agent-visibility.md`: the GRAPHICS DESIGNER can see (`video_look`); blind acceptance test half done (old run finished, new run in progress). Start here for the next chat.
- `docs/HANDOVER-7-nov-marketing-review.md`: marketing department review, tidy pass, desk first names and portraits (`person` field, `assets/people/`); five yes/no decisions waiting, REPORT EDITOR seat first.
- `docs/motion-studio.md`: Motion Director, engine rules, style library. Open before any motion work.
- `docs/blender-studio.md`: Blender bridge and site kits. Open before Blender work.
- `docs/site-updates.md`: reviewed website edits and guard rails. Open before changing the site flow.
- `docs/HANDOVER-7-nov-mmu-series.md`: Manual Magic University videos MMU-02 to 06 delivered (awaiting Penny); autosave rules and recorder changes; MMU-07 logo and colours is next. Start here for the next MMU video.
- `.claude/skills/wrw-deck/` (7 Nov 2026): WRW-branded PowerPoint decks (pptxgenjs in `C:\Users\Wesley\tools\pptxgenjs`). Claude Code only, office agents have no shell. Open its `SKILL.md` before building any `.pptx`; handover `docs/HANDOVER-7-nov-ppt-master-wrw-deck.md`.

## Config and roster
- `office.agents.json`: shipped agent defaults. Do not edit unless asked.
- `office.agents.local.json` (17 KB): the owner's agent edits. Read one agent by id, not the whole file.
- `office.config.json` / `office.config.local.json`: connectors, brain path, tools. Small, safe to read.

## Code (open only when changing code)
- `serve.mjs` (79 KB): the server. Search for the function you need; never read whole.
- `check.mjs` (80 KB): `npm run check` tests. Run it rather than reading it.
- `aios.mjs` matrix and dedupe · `budget.mjs` personal budget · `brainnotes.mjs` reviewed Brain updates · `siteupdates.mjs` reviewed website edits and the /site/ route · `recover.mjs` restart recovery · `mcp.mjs` connectors · `routines.mjs` schedules · `teams.mjs` agent teams · `skills.mjs` skill loader · `skillaudit.mjs` + `skillupdates.mjs` the Skills sheet under Nora's card on the AIOS Office (8 Nov 2026; Skills left the tab bar, `#skills` opens the sheet): the audit, and suggestions as yes/no `SKILL UPDATE` edits a yes applies with a backup in `data/brain-backups/` (a no is remembered in `data/skill-proposals.json`); Brian's `skills-review` routine fills it every Friday 16:00 · `roster.mjs` roster loader · `onboard.mjs` set-up interview · `learn.mjs` corrections · `tokens.mjs` token use (chat transcripts and the office's run ledger, `GET /api/tokens`, the AIOS Tokens section).
- `promptengineer.mjs` + `src/promptbrief.js`: the Prompt Engineer in front of the Chief of Staff (4 Nov 2026): a brief plus yes/no proposals, route `/api/prompt-engineer`. Design and worked examples: `docs/prompt-engineer-draft.md`. Try it outside the office: `node scripts/pe-test.mjs <out.md> [count] [skip] [prompts.json]` (write the report outside the repo).
- `connectors/ltx-local/`: the local video connector (free LTX 2.5 on this machine). Start at its `README.md`; `mcp.mjs` is the agents' tools, `worker.mjs` owns the GPU.
- `connectors/motion-studio/`: the motion graphics render engine (Playwright paints every frame in Chrome, ffmpeg stitches, the score is synthesised, with recorded sounds from the Openverse library (`sfx.mjs`), a critic scores the stills only on request). Start at its `README.md`. `motion.mjs` is the Motion Director (the MOTION STUDIO tab in the side panel).
- `connectors/diagram-studio/` (7 Nov 2026): workflow, lifecycle, timeline, org-chart and service-blueprint diagrams as pictures for every desk and for Claude Code, drawn by the Archify engine. Start at its `README.md`. Pictures go to `output/library/diagrams/`.

## Where things live (4 Nov 2026)
- **The office** (code, agents, skills, `connectors/`, `data/`): `C:\Users\Wesley\agents-office`. Our own tool servers are small scripts in `connectors/<name>/mcp.mjs`.
- **Third-party engines** (own Python venv, models, 2 GB and up): `C:\Users\Wesley\tools\<name>`: ACE-Step-1.5 (music, 37 GB), earshot (audio checker, 2.3 GB; the Motion Studio calls it through `connectors/motion-studio/earshot.mjs`, path overridable with `EARSHOT_DIR`), archify (diagram engine, Node only, 18 MB; called by `connectors/diagram-studio`, overridable with `ARCHIFY_HOME`). Never inside the repo, never moved (a venv breaks when moved). Engine logs go in `tools\logs`; `ace-api.log` stays put (the music worker writes it).
- **The Brain**: `C:\Users\Wesley\Agents Office Brain` (`brain` in `office.config.local.json`).
- **Heavy media**: `D:\Agents Office Media`, reached through junctions at the usual `output/` and `videos/` paths.
- **Elsewhere**: Blender (Steam) with its bridge token in `~\.blender-studio`; LTX in `AppData\Local\LTXDesktop`; VoiceStudio on 127.0.0.1:3900; plugins and caches in `~\.claude`, `~\.hyperframes`. Every MCP server is registered in `~\.claude.json` (`claude mcp list`).

## Data (large; never read whole)
- `data/tasks.json` (630 KB, over 100k tokens): read by task id or the last 20 entries.
- `data/matrix.json` (500 KB): read by item id or the open items only.
- `data/budget.json` (45 KB): use the AIOS budget view or `GET /api/budget`.
- `data/office.log`: tail the last 50 lines.
- `data/tokens.jsonl`: one line per office Claude run (from 3 Nov 2026); `data/tokens-cache.json` is the transcript scanner's cache, safe to delete.
- `data/brain-backups/`: only when restoring a Brain note.
