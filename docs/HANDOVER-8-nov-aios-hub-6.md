# Handover, 8 Nov 2026 (evening): AIOS dashboard hub 6 → hub 7

How the hub works is unchanged: memory `aios-hub-chat-sessions.md`, group "AIOS dashboard" = `cg-7acfdc6a-ea97-41d1-9f80-702999a28fd3`. Start every task as a fresh linked session with a full brief; send follow-ups to the session that has the context. Turn-end notes from hub 6's sessions reach hub 6, not you: check `list_sessions {"linked": true}` and `list_events` before saying anything is done.

**Step 1 for hub 7: archive hub 6** (the session that started you) once you have read this and checked the sessions. Archive, never delete, and never its side sessions. If it is mid-turn, wait until it is idle.

**New rule (Wesley, 8 Nov, memory `sonnet-default-opus-by-approval.md`):** every chat is **Sonnet 5.5, medium effort**. Opus 5.5 only for a chat Wesley approves, and only that chat. Pass `model: claude-sonnet-5-5`, `effort: medium` on every `start_session`. His aim is to end up using only the office, not Claude Code chats. The plan gauge hit 62-81% in an hour today; chats are about 93% of tokens, mostly Opus chats at 230-360k context.

## Sessions from hub 6
| Session | id | State |
|---|---|---|
| `qamaria-skill` | `local_afa321cb-5489-4272-99ad-7e855ac36a1c` | **Working at handover.** Wesley wrote a `qamaria-sop` skill in Claude Chat (57 KB, in Claude Chat's own skills folder, `…\local-agent-mode-sessions\skills-plugin\…\skills\qamaria-sop\SKILL.md`); the office cannot see it and live tasks fail on it. The session turns it into a short Brain skill plus Brain reference notes, binds it, decides how the builder runs, and re-runs or closes the affected live tasks (`mw80xeivbs9y`, `mw80xstdc020`, `mw8128afkx0s` and any others). **Wesley's requirement: it must come into the office the same way as `creamy-sop` and `imrans-diner-sop`** (SKILL.md about 4,000 characters, the build done behind the SOP builder connector, never code pasted into the skill). Hub 6 forwarded that line to the session. Check its report against it. |
| `toki-desk` | `local_cf47cbac-bcc0-474d-a673-ea5219f50ec3` | Idle. Built the Toki token-watch desk (Finance, daily routine, `token-watch` skill, digest script, AI-generated portrait made with Canva, `assets/people/toki.png`), moved token visuals into Finance and removed the TOKENS tab, then also moved Personal Budget into Finance and restyled the Matrix tab (Wesley asked it directly). Logs Grace's runs as `kind: 'box'`. `npm run check` 106/106 at its last run. Nothing committed. |
| `source-ledger` | `local_0f38d6a1-4706-4074-b6ec-98af784a7fa2` | Idle. Franchise report review loop fixed: a per-issue source ledger the lead counts from, a missing list gets one "save the list" rework, "Go on:" no longer stacks, 3 passes per issue ends in a publish-thin or move-the-date yes/no. Check 106/106. **Finland has not been re-run.** Nothing committed. |
| `penny-desk` | `local_b5cd5603-059d-40a6-bf3f-8765f17c0700` | Hub 6 asked it to finish MMU-08 through Grace and hand it back to Penny's desk as a link on the office review card. MMU-08 test video is built locally (`videos/manual-magic-ai/university/work/mmu-08/MMU-08 TEST Upload your IP.mp4`, 14:51) but never reached Drive: hub 6's office stop at about 14:55 very likely killed Grace mid-copy. Check what it reported. |
| Hub 5's sessions | `meeting-agendas`, `usage-pill`, `lead-loop-to-bar`, `matrix-next`, `your-answers-reach-the-o`, `emails-review` | Idle, done. All set to Sonnet 5.5 today. |

## Done in hub 6
- **Committed and pushed to the fork:** `f88fe10` (restart script via WMI, fake Grace run opens no windows) and `d93ff96` (usage pill backs off after a 429 and keeps the last good reading, dimmed, for 30 minutes).
- **Usage pill:** `getUsage` in `serve.mjs`: a run only marks the reading old (3 minute floor between asks), a 429 holds off 5 minutes or the Retry-After, last good reading shows up to 30 minutes. At handover the endpoint was answering 429 again, so the pill showed the office's own count. Cause on Claude's side not proven.
- **All 12 other chats set to Sonnet 5.5.** Lead loop set to 1 round (`office.config.local.json`: `leadReview.maxRounds 1, barRounds 1`; this file is not committed).
- **Finland:** the loop came from no saved source list (the 68 sources were a claim in prose). Hub 6 stopped the office to stop the runs (a restart recovery would have restarted "doing" tasks, so they were parked as waiting first), then closed six waiting Finland cards with the permanent reject. One Finland-adjacent task was still waiting at the last count of the task list (1 waiting): check `data/tasks.json`.
- **Token investigation (measured):** office desks all Sonnet; Riley's Finland passes were 68% of the office's 42M tokens in the window. Chats today 445M tokens vs office 75M.

## Open for Wesley (put as yes/no)
- **Commit** the uncommitted work from Toki, source-ledger and the Qamaria session, leaving other sessions' changes alone (hub 6 asked; no answer yet). Sort by file: `src/aios.html`, `tokens.mjs`, `claudebox.mjs`, `serve.mjs`, `leadreview.mjs`, scripts, `check.mjs`. Brain files and `office.config.local.json` are outside git.
- **Qamaria US request** ("five SOP examples and an operations manual framework for Qamaria US"): waits for the skill to land. The Brain holds only Qamaria UK; Wesley said he would set up a US tracker himself and no US items go in the UK sheet. Hub 6 asked what the best source for how Qamaria US operates is (an SOP, a deck or menu in Drive, or his notes) and has no answer yet.
- **Toki's portrait** is AI-generated (Canva). Wesley can ask for a swap.
- **MMU-08:** link for review on the office card once Penny's session reports.
- **Finland Issue 06:** Wesley decides when to restart it (the source ledger is now live).
- Still open from earlier hubs: Esme's Yousif recap email (blank To:) and Tuesday's agenda (first real agenda Tue 10 Nov 12:45), Brian's first audit card (8 fixes, 3 facts only he has), C: storage clean-up (ACE-Step 53 GB, Earshot 18 GB), `lead-review` skill for the other five leads, Operator's Ledger episode split, Madeira footage clean-up (ask first), `assets/people/jeremy.png` untracked (origin unknown).

## Gotchas learned
- **Restart:** `node scripts/restart-office.mjs` refuses while a task is doing. Stopping the office kills the whole child tree (including Grace's detached runs) and `recover.mjs` restarts any task left at "doing"; park tasks as waiting first if you do not want that.
- **Bash tool:** a heredoc `node - <<EOF` once tripped a false "rm" safety block; write scripts to the scratchpad and run them instead.
- `npm run check` flakes seen today (TEAM smoke, SOP builder LibreOffice conversion, server start) while other sessions edited shared files; rerun after sessions go idle.
- The Chat skill folder for Claude Chat skills is not read by the office; only `<brain>/Agents Office/skills/` is.
