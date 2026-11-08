# Handover, 8 Nov 2026 (late morning): AIOS dashboard hub 4 → hub 5

How the hub works is unchanged: memory `aios-hub-chat-sessions.md`, group "AIOS dashboard" = `cg-7acfdc6a-ea97-41d1-9f80-702999a28fd3`. Start every task as a fresh linked session with a full brief; send follow-ups to the session that has the context. Turn-end notes from hub 4's sessions reach hub 4, not you: check with list_sessions {"linked": true} and list_events before saying anything is done.

**Step 1 for hub 5: archive hub 4** (`local_288064cf-868a-4806-ab4f-12f9ecd7d8a0`) once you've read this, per the new rule (memory `offer-handover-then-new-chat.md`): archive, never delete, never its side sessions; if it's mid-turn, wait for it to go idle first.

## Sessions from hub 4
| Session | id | State at handover |
|---|---|---|
| Penny, the Manual Magic desk (`penny-desk`) | `local_b5cd5603-059d-40a6-bf3f-8765f17c0700` | Desk `penny` (Delivery, AIOS desk), skill `manual-magic`, portrait `assets/people/penny.png` (untracked on purpose: real client photo). MMU-08 Upload IP script written (~82 s, eight screens, read-only); TEST build queued with Grace. No test video yet. |
| Theo's result card (`theo-panel`) | `local_d9e8602b-6e10-4b0a-8364-327db9952274` | Done: Theo's reply is one small card on the Office map. Committed in 0293526. |
| ENAMETOOLONG + Yousif recap (`enametoolong`) | `local_33f366c1-3aec-49dc-87e4-fa1387c35c96` | Fixed: every Claude run takes its prompt on stdin (2458a6e, rest in 0293526). Wesley's Yousif request reran: Esme's recap email and a 37-line action list **wait for his OK**; Nora's follow-on tasks were running at 11:12. |
| Matrix into the AIOS office (`matrix-office`) | `local_3ba45459-bc13-46b4-a010-143fbcfb677a` | Finished tasks no longer write matrix cards; a sent card closes when its task is approved (8186bda); SEND goes through Nora with a 20 s undo (f0e830d). 92 open. **Waiting on Wesley:** show each department's open matrix count on its Office tile? |
| Sends survive restarts (`resend-on-restart`) | `local_4784dc65-2bd6-4e20-8bf5-bc4f90878dca` | Done, committed in 0293526; proven on a spare copy; live after the next real restart. |
| hub 3's sessions | cc-box, skills-under-nora, ip-librarian, finance-review | Grace (the Claude Code box, Grace Hopper portrait, "Ask Grace") live and committed in 0293526. Skills under Nora committed (2a14c83). Department reviews went Sales → Operations → Finance (`finance-review` `local_52068ee0-9462-4159-9508-12ee0f3961ef`, idle). |

## Done in hub 4 itself
- Rule: when a chat hands over, the new chat archives the old one (memory updated).
- Tab pill follows tabs that change width (09115c1).
- **Why the office kept going down:** `scripts/restart-office.mjs` started the new office from a detached PowerShell, which on this PC runs nothing, so every session "restart" left it down. Fixed (1e0e1a0): plain PowerShell `Start-Process`, output in `data/office.out.log` / `office.err.log`, previous run as `office.*.prev.log`. CLAUDE.md and memory `restart-office-myself.md` now say restart only with the script. **Not yet proven by a live restart** (it correctly refused at 11:12: five tasks running). Also seen once: an unknown `timeout 25 node serve.mjs` holding port 4520 at 11:07; source not found.
- The office now running was started by hand with logs (pid at ~11:11).
- Batch commit of the morning's shared-file work (0293526). Nothing pushed since 9f23234: ask before pushing (a push sends every commit on main).
- Permission prompts: Wesley chose **Bypass permissions with no block list**. He flips it himself in Settings → Claude Code (and the hub's mode menu); not confirmed done. Don't raise the block list again.

## Open for Wesley
- Brian's first audit card: 8 fixes to approve; three facts only he knows (ledger top figures placeholder or real? Yousif or Yusuf? is Heath still the Imran's Diner contact?).
- Yousif recap email + action list: review in the office.
- Matrix: department counts on the Office tiles (yes/no, in `matrix-office`).
- Penny's MMU-08 test video once Grace builds it.
- From hub 3, still unanswered: C: storage clean-up (ACE-Step 53 GB and Earshot 18 GB caches); `lead-review` skill for the other five leads (offer as yes/no); Operator's Ledger episodes split; Madeira footage clean-up (ask first). Always-on server: he said not now.
- `assets/people/jeremy.png` (Yerémi) is untracked, origin unknown; left out of git.
