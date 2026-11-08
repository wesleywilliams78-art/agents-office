# Handover, 8 Nov 2026 (morning): AIOS dashboard hub 3 → hub 4

How the hub works is unchanged: `docs/HANDOVER-7-nov-aios-hub.md` (hub 1), memory `aios-hub-chat-sessions.md`. Group "AIOS dashboard" = `cg-7acfdc6a-ea97-41d1-9f80-702999a28fd3`. Start every task as a fresh linked session with a full brief; send follow-ups to the session that has the context (SendMessage). Turn-end notes from hub 3's sessions reach hub 3, not you: check them with list_sessions {"linked": true} and list_events before saying anything is done.

## Sessions from hub 3
| Session | id | State at handover |
|---|---|---|
| Name, portrait, activate last four depts (`all-depts-live`) | `local_1370ee0d-a726-4068-b977-7a4ba2d6c006` | Done. All six departments live (PILOT has all six), 21 desks named and photographed. Commits b8dca24, dfddfed, 9f23234, pushed. Started `dept-review-sales` (`local_38a1c764-5e54-4459-961f-521e1010d813`), which was **waiting on Wesley** at handover. |
| Brian, IP Librarian (`ip-librarian`) | `local_2089fd74-1f93-41d1-9919-eeeaf03fd61f` | Working. Desk `brian` (Operations, AIOS desk), skill `brain-audit`, Sunday 18:00 routine, a yes on his DECISION files straight to the Brain (5bcc1a8, c2c3b3a). Hub 3 queued five report fixes (headings not "1.", facts-only-Wesley-knows at the top, card header wording, nothing deferred to "next week", archive templates as a yes/no). Check they landed. |
| Office map fits 1905×920 (`office-fit`) | `local_cf2eb36f-ac85-477e-950d-1281200241d8` | Fit done (335318f, screenshots sent on Telegram). Hub 3 queued: red "back to you" labels touch the You pill at 1440, and two waiting departments on one side stack their labels. Check it fixed both. |
| Skills under Nora (`skills-under-nora`) | `local_7d506317-733f-48b2-8af0-59ad87f75030` | Working. Skills tab off the top bar, a line on Nora's card opens a Skills sheet, suggestions as yes/no that edit the skill on a yes (with backup), Brian's Friday 16:00 `skills-review` routine. |
| Claude Code box (`cc-box`) | `local_c92835f9-9bdb-418c-bd45-9cef4d0cddba` | Working. Box at the foot of For You runs headless Claude Code in the repo; risky actions (delete, push, install, settings, send/post/pay) ask yes/no in the box; desks' Claude Code steps become a "Run in Claude Code" yes that runs by itself (replaces the `claude-code-prompt` paste blocks); phone/other PCs via Tailscale Serve from day one, gated to Wesley's login. Runs doubt-driven-development on the permission design first. |

Older sessions (hub 2's) are idle; see `docs/HANDOVER-7-nov-aios-hub-2.md`. Deep Work hour 1 had 104 takes generating on 7 Nov evening; it reports to hub 2's line, check it if Wesley asks.

## Done in hub 3 itself
- Pushed to fork twice (last `9f23234`); later commits (5bcc1a8 onwards) are **not pushed**. Ask before pushing; a push sends every commit on main, other sessions' too.
- Ran five office-written Claude Code blocks: Google Drive wired to sales and emails (`office.config.local.json` mcp.departments, keeps ops/delivery/fin); lead review on for all six departments (`leadReview.departments`); `regulatory-watch` routine (Reggie, `comply`, Mondays 08:30, no review) in the Brain's routines.json; DEMO NOTE line on 11 shipped template notes in the Brain; tiles compaction went to `office-fit`. Office restarted 09:38 on 8 Nov. No commits needed (config gitignored, Brain outside repo).
- `lead-review` skill is written for the Head of Marketing only, so it is bound only to `mlead`. Each other lead needs its own version (same method, its department's world-class bar). Not started; offer as yes/no.
- Red "back to you" line: one S-curve when a tile is level with the You pill (committed inside 6a31e3d).
- Storage on C: (7 Nov): page file at its 80 GB cap (setting 32–80 GB; a restart shrinks it to 32), ACE-Step `tools\ACE-Step-1.5\.cache\acestep\tmp` 53 GB, Earshot `tools\earshot\.cache\decoded` 18 GB. Offered: Deep Work session clears both caches after hour 1 and keeps them on D:. **Wesley has not answered.** Also `Downloads\Wesley_Data_Request.zip` 3.75 GB.
- YouTube: the Consultants' Corner pill is a visible youtube-nocookie embed started by his click, so plays should count as embedded views; repeats from one viewer are discounted.

## Open for Wesley
- Brian's first audit card: 8 fixes waiting for his approve; three facts only he knows (ledger top figures placeholder or real? Yousif or Yusuf? is Heath still the Imran's Diner contact?).
- Operator's Ledger episodes split (`videos/operators-ledger/plan/build_episodes.py`, rows 51–100 to a second note): a correct job, will become a "Run in Claude Code" yes once `cc-box` lands, or run it as a session if he asks first.
- Always-on server for the office (so it runs with the PC off): Wesley said **not now** on 8 Nov. Don't raise it again unless he does.
- Madeira footage clean-up once the Reel is live (hub 1 list). Ask first.

## Rules Wesley gave in hub 3 (check memory before relying on them)
- Every line on the Office map must be clean and smooth: no kinks, text never touching anything.
- Skills belong under Nora (management view); Brian does the weekly legwork.
- Suggestions must be yes/no that get carried out on a yes; never information that bounces back to him un-actioned. Agents feed Claude Code themselves; only risky actions ask.
- The Claude Code box works from his phone and other PCs from the start.
