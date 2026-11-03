# Handover: AIOS "Tokens" section (3 Nov 2026)

For a fresh Claude Code chat in `C:\Users\Wesley\agents-office`. Read `CLAUDE.md` and `docs/INDEX.md` first, then this. Do not build beyond this brief without asking Wesley.

## Why
Wesley hits context limits quickly and wants to optimise token burn and judge ROI. He wants a **Tokens** section on the AIOS dashboard (http://localhost:4520/aios, source `src/aios.html`) showing what tokens go on, in which chat and which office job, in visual form.

## Data sources
1. **Claude Code chats.** `~/.claude/projects/<proj>/*.jsonl` carry per-message `usage` (input, output, cache read, cache creation, model). History is recoverable. Stream the files line by line, they are large. Last 8 days (probe): about 2.0B cache-read tokens on opus-5-5 against about 4.6M output; a handful of very long sessions dominate.
2. **Office jobs.** Runs use `--output-format stream-json --verbose --no-session-persistence` (spawn sites in `serve.mjs` around lines 156, 248, 291, 318). The final `result` event carries usage and cost, but the office does not save it: 0 of 379 tasks in `data/tasks.json` have any usage field. **History before the change is not recoverable.** `data/tasks.json` is large, read it by slice.
3. **Plan window.** The `get_usage` / `list_sessions` tools give a snapshot only; optional.

## Build (in order)
1. Capture `usage`, `total_cost_usd`, `model` and `duration_ms` from each run's final result event and store on the task (`task.usage`). Cover all four spawn sites, including team pieces, the Chief of Staff (`assistant.mjs`) and the Motion Director (`motion.mjs`) if they spawn separately. Add the desk, department, routine id and revise count so jobs can be grouped.
2. A transcript scanner (new `tokens.mjs`) that totals per session and per day from the jsonl files, with a short cache (re-scan only changed files).
3. `GET /api/tokens` in `serve.mjs` returning headline totals, by-day (chats vs office jobs), by-chat, by-job (desk, department, routine, model).
4. A Tokens section in `src/aios.html`: headline row (today / 7 days / 30 days), stacked by-day bars, by-chat table (turns, peak context, cache-read share, verdict such as "should have handed over"), by-job table (runs, tokens, cost, approved, revised).
5. `npm run check` coverage for the new endpoint and capture, then restart the office (`Start-Process node serve.mjs`).

## ROI measures to show
- Cost per approved deliverable (Reel, FER issue, newsletter), including revisions.
- Rework rate: share of jobs that got `revise:` (per desk).
- Cache-read tokens per output token in chats (flags bloated chats).
- Model fit: Opus spend on jobs Sonnet could do.
- Time to approval.

## Constraints
- Local only; no usage data leaves the machine. Answer only to local origins like the other `/api` routes.
- Windows PowerShell 5.1: no `&&`; use script files for quoting; Node edit scripts must handle CRLF.
- Mark the office-job view as "from <date capture started>" so empty history is not misread.
- Keep to the existing AIOS visual style; check at 1905x920.
- Do not touch `office.agents.json`, skills or the Brain for this work.

## Context from the old chat
- context-mode was trialled and removed (it blocked Brain reads and missed connector output).
- Wesley's working rule: offer a handover and a new chat when a chat gets heavy.
