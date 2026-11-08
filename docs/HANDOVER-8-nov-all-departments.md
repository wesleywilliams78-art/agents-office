# Handover, 8 Nov 2026: all six departments named, briefed and live in the AIOS

Done overnight (7–8 Nov) while Wesley slept. Defaults, built to be refined one department at a time.

## Where things stand
- **All six departments are in the AIOS.** `PILOT` in `src/aios.html` now lists marketing, delivery, emails, sales, ops and fin. Every tile is solid, every department page and desk drawer opens. No TO BRIEF badges, no initials. Commit `dfddfed`.
- **21 new desk names and portraits** (`person` in `office.agents.local.json`, `assets/people/<id>.png`, Canva generate-image with the 7 Nov prompt pattern, all 21 kept first time). Commit `b8dca24`.

| Department | Lead | Desks |
|---|---|---|
| Emails | Esme (elead) | Callum (cmail), Imani (imail), Vikram (vmail), Kofi (kmail) |
| Sales | Lexi (lexi) | Enzo (enzo), Ines (ilm), Pablo (pros), Piper (piper), Femi (folo) |
| Operations | Orla (olead) | Sana (scout), Leon (legal), Reggie (comply), Archie (report), Dasha (dash) |
| Finance | Arjun (alead) | Ivana (invo), Budi (apay), Maggie (recon) |

- **New briefs** where there were none: Enzo, Piper, Orla, Reggie, Dasha, Maggie. Existing briefs were kept as written; only the garbled dashes (25 of them) were fixed.
- **Job lines rewritten** where they contradicted the brief or the office: Orla (said "AJ"), Lexi ("reps' call lists"), Callum, Imani, Kofi, Ines, Pablo, Enzo, Reggie, Dasha.
- **Dead tools removed:** fullenrich, imessage, apollo and pandadoc are not connected on this machine. Enzo, Pablo and Reggie now use web and Chrome. Enzo's role is now "Prospect Research Agent".
- **Two new skills** in the Brain (`Agents Office/skills/`), both defaults:
  - `client-dashboard` → Dasha. Written from the four Imran's Diner dashboard tasks (30 Oct–3 Nov) and Wesley's corrections on them.
  - `regulatory-watch` → Reggie. The watch list comes from what the Brain already holds: `70-Delivery/layout-canon-uk-rules.md`, `Operations/norway-franchise-law.md` and the VAT Rules sheet.
- **check.mjs:** the interview check now reads the Brain roster file itself, because the owner's local roster briefs every Sales desk. `npm run check` 96/96.
- Office restarted 8 Nov about 09:15; checked at 1905×920 (screenshot `output/aios-mockups/shots/all-departments-8-nov.png`).

## Waiting on Wesley (yes/no, recommendation first, none of these done)
1. **Wire Google Drive to Sales: yes.** Piper's proposal skill copies the WRW proposal master in Drive, but Drive is wired only to Ops, Delivery and Finance (`mcp.departments` in `office.config.local.json`). Emails too, for Esme's brief.
2. **Keep `client-dashboard` and `regulatory-watch` as written: yes.** Read each once. Neither is a process you described.
3. **A monthly regulatory-watch routine for Reggie: yes.** Read-only, so it would not wait for your OK.
4. **Mark the 11 template notes as demo: yes.** These Brain notes are byte-for-byte the office's shipped examples, not yours: `60-Sales/sales-playbook.md`, `pipeline-rules.md`, `90-Operations/legal-basics.md`, `compliance-checklist.md`, `reporting-cadence.md`, `80-Finance/invoicing-rules.md`, `payables-rules.md`, `50-Emails/email-rules.md`, `vendor-list.md`, `contractor-terms.md`, `10-Business/proposal-template.md`. `pipeline-rules.md` clashes with the sales-framework skill (6 stages against 8). The briefs now tell the desks to ignore them.
5. **Lead review for the four new departments: not yet.** Only Marketing has it; Delivery was activated without it. Add one department at a time after Delivery.
6. **Compact the office map so six solid tiles fit at 1905×920: yes.** The bottom row now sits 116 px below the fold (the page scrolls; nothing is clipped).

## Gaps (the Brain had no source, so the briefs stay general)
- **Sales:** no playbook or pipeline rules of your own; `icp.md` has no bad-fit definition; no enrichment or Apollo connector.
- **Operations:** no compliance process, reporting cadence or contract basics of your own; no house dashboard spec beyond the Imran's Diner work.
- **Finance:** no Imran's Diner costed recipes in the Brain for Maggie's menu engineering.
- **Emails:** no real vendor or contractor list.
- `00-Meta/numbers-ledger.md`'s first table (14 clients, $38,400 MRR) is demo data. Dasha's brief says never quote it.

## Start here in the morning
Open `#office/sales` and read the six Sales desks in their drawers. Answer decision 1 (Drive) first, because Piper cannot finish a proposal without it. Then Operations, Finance and Emails, one per round, in the same way as Marketing and Delivery.

## Files
- Roster before tonight: `C:\Users\Wesley\AppData\Local\Temp\claude\38fd8dfc9966ab97\5079ba4b-493b-4e85-924f-6c671405c817\scratchpad\office.agents.local.before.json` (temporary folder; the roster file itself is gitignored).
- Other sessions' uncommitted edits to `src/aios.html` were left alone. Only the `PILOT` line was committed.
