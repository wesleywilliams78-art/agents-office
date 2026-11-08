# Handover, 8 Nov 2026: Operations reviewed. Next: Finance (or Emails)

## Operations round: eight decisions, all Yes (Wesley, 8 Nov, about 10:12)
They were put to Wesley twice: in the chat, and on Orla's review card (task `mw7o3bdpwcks`). He approved the card, so the office made five of the changes itself. Claude Code made the other three (the roster edits), because the running server refused `to: claude-code` decisions with "no seat called claude-code". It was started at 09:58, before the Claude Code box edits to `decisions.mjs` and `serve.mjs` landed, and the restart after this round loads them.

| # | Desk | Change | How it landed |
|---|---|---|---|
| 1 | Orla, Reggie | Qamaria (UK) added to `30-Customers/client-list.md` (Wesley is Ops Director, Yousif master franchisee, tracker in `client-trackers`; Qamaria US is separate, never KATE) | Filed by the card (backup in `data/brain-backups/`) |
| 2 | All of Ops | `90-Operations/MOC-Operations.md` now lists only real notes. The three demo notes (`legal-basics`, `compliance-checklist`, `reporting-cadence`) appear on one line marked "demo, never quote as rules". Every Ops task reads this map. | Filed by the card |
| 3 | Leon (legal) | Tools: gmail and google drive (PandaDoc is not connected). Job line: "Reads every agreement, NDA or contract before Wesley signs or sends it…" | `office.agents.local.json` |
| 4 | Reggie (comply) | Brief says he runs every Monday at 08:30 (routine `regulatory-watch`). google sheets added to his tools. | `office.agents.local.json` |
| 5 | Reggie | `regulatory-watch` skill, "What to watch" section: live clients from the client list, sites' nation from the trackers note, the rules note is England only, with a nation check for the other UK nations. Customer toilets (1976 Act s.20), EMAQ+ extract planning, the Equality Act 2010 and the fire safety Order are added. The VAT Rules sheet is named by its link; a VAT change goes to Maggie (recon). | Skill update by the card (backup in `data/brain-backups/`) |
| 6 | Dasha (dash) | `client-dashboard` skill: names every ledger section under the client (Imran's Diner has two). A client with no dashboard note (Creamy) gets one built from the uploads, so step 1 no longer stops dead. | Skill update by the card |
| 7 | Dasha | Task `mw7oaxqzud0c`: bring `Dashboards/Imrans-Diner-Dashboard.md` up to date. Build `Dashboards/Creamy-Dashboard.md` and a Creamy ledger section from the uploads. Her Brain updates come back as one Yes/No on her card, and nothing is filed without Wesley's yes. | Started by the card |
| 8 | Archie (report) | Brief rewritten to match the tailor-cv skill and his standing rule. The Google Doc CV (MASTER) is the one CV; changes are drafted, then made only after Wesley's OK; never a second full CV. Also fixes a "for for" typo. | `office.agents.local.json` |

- **Sana (scout):** no change. Her brief, her three skills and her recent memos are the standard for the department.
- **Roster backup** from before the edits: `data/brain-backups/2026-11-08-ops-review/office.agents.local.before.json`.
- `npm run check`: 102/102.

## Still open for Operations
- **Reggie's first routine run** is Monday 9 Nov at 08:30. Read the result: does it check Qamaria's and Imran's Diner's nation, and does it pass VAT to Maggie?
- **Dasha's card** (task `mw7oaxqzud0c`): approved by Wesley at 10:19. Filed: `Dashboards/Imrans-Diner-Dashboard.md` (rewritten), `Dashboards/Creamy-Dashboard.md` (new) and a Creamy section in `00-Meta/numbers-ledger.md`. Creamy's currency is NOK (Wesley, 8 Nov 2026), now recorded in the Creamy dashboard note, its ledger section, the client-dashboard skill and Dasha's brief. Dasha also flagged Strømmen's April 2026 order count as an outlier and left it out.
- **Office restarted** at about 10:25. Leon's, Reggie's and Archie's changes are live on `/api/health`.
- **Gaps only Wesley can fill:** contract basics of his own (a standard client agreement for Leon to check against); a compliance process; a reporting cadence; a house dashboard spec beyond Imran's Diner. Until he gives them, the desks stay general.
- `00-Meta/numbers-ledger.md`'s first table is still demo data (Dasha's brief says never quote it).

## Next department: Finance (recommended), then Emails
Finance first: Reggie now hands VAT changes to Maggie, and the Finance map has the same fault Operations had.
- **Desks:** Arjun (alead, lead), Ivana (invo), Budi (apay), Maggie (recon).
- **First fix to propose:** `80-Finance/MOC-Finance.md` still lists the demo notes `invoicing-rules` and `payables-rules` (and `contractor-terms`) as the house rules. Use the same fix as decision 2 above. `50-Emails/MOC-Emails.md` has the same problem (`email-rules`, `vendor-list`, `contractor-terms`), and so does `60-Sales/MOC-Sales.md` (`sales-playbook`, `pipeline-rules`). Sales was reviewed before this fault was spotted, so put a Sales map fix to Wesley as well.
- **Known Finance gap:** no Imran's Diner costed recipes in the Brain for Maggie's menu engineering.
- **Method:** the same as this round. Write the eight-or-fewer decisions as one card for the lead, using the pattern below, and ask the same questions in chat. If Wesley approves the card, the office does the Brain, skill and desk-task decisions itself. Check `fired` on each decision afterwards and do any that did not fire. A `to: claude-code` decision runs only once the server has the Claude Code box loaded.

### The card pattern
The script for this round is in this session's scratchpad (temporary). The parts:
- **A Brain note change:** the decision's text is one BRAIN UPDATE block (`replace-text` with `find:`, or `replace-section`; the H1 heading works as a section).
- **A skill change:** the decision's text is SKILL UPDATE blocks (`skillupdates.mjs`).
- **Work for a desk:** a plain task with `to: <id>`. If the desk's result changes notes, tell it to put its BRAIN UPDATE blocks inside a DECISION. A decision task runs without review, so bare BRAIN UPDATE blocks are never filed.
- **A roster or config change:** `to: claude-code`.
- **Before posting:** run every block through `brainnotes.planAll` and `skillupdates.planAll` (dry, nothing written). All eight passed first time this round.

## Start prompt for the next chat
"Read docs/HANDOVER-8-nov-ops-review.md and walk me through Finance desk by desk."
