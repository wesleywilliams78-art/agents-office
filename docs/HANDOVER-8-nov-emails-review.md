# Handover, 8 Nov 2026: Communications (was Emails) reviewed. The department rounds are closed

All six departments have now had their round: Marketing, Delivery, Sales, Operations, Finance and Communications.

## The rename (Wesley, 8 Nov): labels only
The department is shown as **Communications**, and Esme's line on the AIOS reads "Head of Communications". The key `emails`, the seat ids, Esme's own title (EXECUTIVE ASSISTANT, "Executive Assistant to Wesley") and the Brain folder `50-Emails` / note `MOC-Emails` are unchanged.

| Where | Change |
|---|---|
| `src/aios.html` | `DEPTS.emails.name` is now `COMMUNICATIONS`, which covers tiles, the department page, crumbs, task rows and "Head of …". The prompt engineer's `DEPT_NAME` says Communications too. |
| `assistant.mjs` | Nora's system prompt says "Communications (key emails: Wesley's inbox, diary and admin mail)". |
| `routines.mjs` | `NAMES.emails` is Communications, so routine replies and refusals use it. `check.mjs` line 1093 was updated to match. |
| Not changed (Wesley said no) | The Brain folder and note names (`pins.mjs` names `MOC-Emails`). AJ's 3D office (`src/data.js`, `src/tasks.js`, `src/assistant.js`'s `/task` aliases, the dist build, the EMAILS smoke check). |

## Communications round: eight decisions, all Yes in chat
These went on Esme's review card (task `mw7rmhr7pklp`). Every block passed `brainnotes.planAll` / `skillupdates.planAll` on the first dry run. Wesley approved the card at 13:58, and all eight fired. Decisions 1 to 6 were filed and checked in the files. Decision 7 started Vikram's task `mw7wegy9af86`. Decision 8 was queued behind another job in the Claude Code box (`qmw7wegy91j`; the box cannot cancel a queued item). Claude Code made the four roster changes by hand at about 14:10, with a backup at `data/brain-backups/2026-11-08-emails-review/office.agents.local.before-roster-fixes.json`. When Grace reaches the queued item, the changes are already in: say no to any edit she asks to make for it.

| # | Desk | Change | Kind |
|---|---|---|---|
| 1 | All | `MOC-Emails` is titled Communications and lists the real notes: client-list, contact-aliases, held-messages, the Qamaria Square terms, the meeting preps and drafts. The future `vendors-and-contractors` note is listed, reply times are "none set", and the three demo notes sit on one line. Older facts that tasks had appended are kept under "## Filed here by earlier tasks". | BRAIN UPDATE ×5 (replace-text) |
| 2 | Esme | `executive-assistant`: mail goes to the desks by name (Callum, Imani, Vikram, Kofi), and the demo reply times are gone | SKILL UPDATE ×2 |
| 3 | Callum | `client-reply`: Qamaria (UK) is added, "Penny Hopkinson" is spelt right, and the client list wins if the two disagree | SKILL UPDATE |
| 4 | Imani, Vikram, Kofi | "Yousif", not "Yusuf", in `internal-mail` and `vendor-contractor-review` | SKILL UPDATE ×2 |
| 5 | All | "Yousif" in `30-Customers/client-list.md` | BRAIN UPDATE |
| 6 | Vikram, Kofi | `vendor-contractor-review` reads `50-Emails/vendors-and-contractors.md` first, and each new rate comes back as a yes/no BRAIN UPDATE on it | SKILL UPDATE ×2 |
| 7 | Vikram | Task: draft the first real vendor and contractor list. It is filed only on Wesley's yes on Vikram's own card | desk task `to: vmail` |
| 8 | Callum, Imani, Vikram, Kofi | Roster: Qamaria (UK) in Callum's brief, Yousif in Imani's brief, a job line for Vikram that matches Kofi's, Google Drive for both | `to: claude-code` (Grace) |

- **Kofi and Imani:** no other change. Imani has had one task since September and Kofi none, because almost all of the department's mail goes to Esme (98 of 112 tasks).
- **Roster backup** from before the round: `data/brain-backups/2026-11-08-emails-review/office.agents.local.before.json`.
- **`npm run check`:** 104/104 with the rename. After the roster edit, two runs each failed one check outside this round, a different one each time: "server: starts" (port clash) and the SOP builder's LibreOffice PDF conversion. Other sessions were running checks and builds at the same time. Rerun when the PC is quiet.

## Still open
- **Vikram's list** comes back as its own card. The first run (`mw7wegy9af86`) failed with "claude not found on PATH" before the restart. It was posted again as `mw7wxg7exgw1` after the restart, and that run started. Read it before saying yes: every row should name a source.
- **Routing:** Nora sends client mail to Esme rather than Callum. Esme's skill now hands mail on by desk. If Callum still gets nothing in a week, look at how Nora picks the desk.
- **Gaps only Wesley can fill:** real reply times, if he ever wants them, and a payables process (from the Finance round).

## After the rounds
Each department has a map of real notes, briefs that match its skills, and its gaps named. What comes next is not another round: watch the first routine runs (Reggie on Monday 9 Nov at 08:30) and fold corrections into the skills as they arrive.
