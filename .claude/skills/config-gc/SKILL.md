---
name: config-gc
description: Use when Wesley asks to clean up, slim down or audit the Claude Code setup, complains about too many skills, noisy hooks or slow starts, or after a large skill pack or plugin was added. Propose it with a yes/no roughly monthly. Finds skills never used, stale memory, orphaned hooks, redundant permissions and dead connectors, then proposes removals one at a time.
---
# Config GC

Adapted for this repo from affaan-m/ECC `skills/config-gc` (MIT, Affaan Mustafa). See `../THIRD-PARTY.md`. Not for cleaning source code, chat history or the office's data.

**Rule: scan and propose; delete nothing on your own. One item, one yes/no, with the evidence.** Age is a signal, not a verdict: a skill used twice a year (tax, quarterly review) is not dead.

## Scope
- Project `.claude/` (skills, agents, settings), the memory folder and `MEMORY.md`, `C:\Users\Wesley\.claude\` (skills, `settings.json` hooks and permissions), MCP servers in the session, scheduled tasks.
- Never: `D:\Agents Office Media`, `output/`, `videos/`, `data/`, the Brain, `src/`, `skills/` (the office's shipped skills), `.claude\skills\synced`, or anything outside the above.

## Channels and signals
1. **Skills** (`.claude/skills`, `~\.claude\skills`): never invoked in the transcripts; two skills with the same job; a description that never matches how Wesley asks. To check use, search the session logs under `~\.claude\projects\C--Users-Wesley-agents-office\*.jsonl` for the skill name inside Skill tool calls, and say how many sessions and which dates you searched.
2. **Memory** (`MEMORY.md` and its files): two lines for one topic; a note contradicted by a newer one; a date that has passed; a file missing from the index; an index line over 150 characters. Merge by reading both and keeping the newer truth; never truncate.
3. **Hooks** (`~\.claude\settings.json` and `.claude/settings*.json`): a script on disk that no hook references; a hook that points at a missing file. Do not remove the handover nudge or the Telegram listener hooks.
4. **Permissions** (`permissions.allow`): duplicates; a narrow entry already covered by a wildcard; a one-off grant from an old experiment. Highest value per minute.
5. **MCP servers**: one that fails to connect (openwa is known down: check memory `openwa-trial-resume` before calling it dead), functional duplicates, none used in recent sessions. Servers the office needs stay (see `office.config.json`).
6. **Scheduled tasks**: one-shots already fired; a task whose script no longer exists. Leave `AgentsOffice-*` tasks alone unless the script is missing.
7. **Caches** under `~\.claude\` (`file-history`, `shell-snapshots`, `logs`): list the largest over 30 days old. Check disk with `npm run storage` before suggesting anything else.

## Steps
1. Scan the channels asked for (all if none named). For each candidate record path, channel, signal, size, last modified.
2. Rank by confidence: broken or orphaned first, merely old last. Cap a run at 15 candidates.
3. Show the ranked table, then take the candidates one at a time as a yes/no: what it is, the evidence, what happens if yes (moved, not deleted), what happens if no. Recommended answer first.
4. On yes, **soft-delete**: move to `.claude/_gc_trash/<date>/` (or `~\.claude\_gc_trash\<date>\`). For `settings.json`, copy it to `settings.json.bak-<date>` first and remove only the named entry. Hard delete only if Wesley says so.
5. Append to `gc_log.md` in the same trash folder's parent: time, item, why, how to undo.
6. Finish with what was moved, the space freed, and a next review date about 30 days out.

## Rules
- State what you did not search (older logs, other projects) before calling anything unused.
- Check dates and memory before calling something stale (see `github-tool-review-approach`).
- Do not judge the setup harshly or generously: report what the evidence shows.
- Run `npm run check` after any change to project files.
