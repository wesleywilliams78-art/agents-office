# Handover, 8 Nov 2026: Orla's six decisions closed, Sales reviewed. Next: Operations

## Orla's card (task `mw7mo382eqdn`): approved, all six Yes
Wesley flipped decision 5 (lead review) from the recommended No to Yes.

| # | Decision | State |
|---|---|---|
| 1 | Drive → Sales, Emails | Done. `mcp.departments["Google Drive"]` = ops, delivery, fin, sales, emails in `office.config.local.json` (gitignored). `/api/mcp` confirms. |
| 2 | Read client-dashboard + regulatory-watch | Orla's read is the result of task `mw7mun9v5obt` (7 points, below). Nothing changed yet. |
| 3 | Reggie's routine | Done by another session: `regulatory-watch`, Mondays 08:30, needsOk false. |
| 4 | 11 demo notes | Done by another session. A 12th, `30-Customers/icp.md` (byte-identical demo ICP), was marked in the Sales round. |
| 5 | Lead review, four new departments | `leadReview.departments` = all six. The `lead-review` skill stays bound only to mlead (it is a Head of Marketing persona). Esme, Lexi, Orla and Arjun review against each desk's own brief, skills and lessons. Wesley chose not to write a Sales persona yet. |
| 6 | Compact office map | Done by another session (new Nora-centred map; tiles end at 858 of 920 px at 1905×920). |

## Sales round (Wesley's answers, all Yes except the Sales review skill)
- **Lexi:** brief now says WRW Hospitality and Yousif. New routine `pipeline-weekly` (Mondays 09:00, read-only, needsOk false).
- **Enzo:** no change. `30-Customers/icp.md` marked demo and points to `10-Business/icp.md`.
- **Ines:** brief adds "a referral through Yousif is warm" and "no bad-fit definition yet: name the missing signals and let Wesley decide".
- **Pablo:** brief adds Enzo's guard rails (no guessed contacts, no log-ins, no bulk scraping or bought data, never contacts a target).
- **Piper:** job line now says Commitment → proposal on the WRW master in Drive + a cover-email draft. The proposal skill says ex VAT (was GST). `offer-ladder.md` points to the proposal skill and the Drive master, not the demo template. The master (`1DsZ5WKuY8oXaZyb_f7E74Lc4ipjPqTc4nJctcuJzF6c`) opens through Drive.
- **Femi:** `pipeline.md` entries now carry `Last contact:`. Chapati and Karak Chai are "(date to confirm)"; Kayana is 4 Nov (Matt's email).
- **Fixes in passing:** `pipeline.md` Folo → Femi, Yusuf → Yousif; call-prep's client list path → `30-Customers/client-list.md`.
- **Backups** of every Brain file and the roster before the edits: `data/brain-backups/2026-11-08-sales-review/`.
- **Still open for Sales:** no bad-fit definition in the ICP (only Wesley can say), no enrichment connector. Chapati and Karak Chai went cold and were dropped from the pipeline (Wesley, 8 Nov); the old entries are in the backup folder as `pipeline-before-drop.md`.

## Operations: start here
Desks: Orla (olead, lead), Sana (scout), Leon (legal), Reggie (comply), Archie (report), Dasha (dash). Same method: per desk, show job, brief, tools, skills, lessons and Brain; one yes/no per fix; roster writes go to `office.agents.local.json`; skills go to the Brain.

Orla's read (task `mw7mun9v5obt`) already lists the fixes to put to Wesley:
- **client-dashboard (Dasha):** names Creamy, but there is no `Dashboards/Creamy-Dashboard.md` and no Creamy section in the numbers ledger. `Dashboards/Imrans-Diner-Dashboard.md` is stale (says no monthly report; 30 Oct a part-day, but the ledger has 501 orders). Imran's Diner has two ledger sections (sales uploads and the October close-out); name both.
- **regulatory-watch (Reggie):** Qamaria is in `client-trackers.md`, not `client-list.md`. `layout-canon-uk-rules.md` is England-only, so say England or add a location check. The UK row is missing customer toilets (1976 Act s.20), extract planning (EMAQ+), the Equality Act 2010 and the fire safety Order. The skill points to `vat-analyser`, which is bound only to recon and alead.
- Reggie's first routine run is Monday 9 Nov, 08:30: read that result in the round.
- From the 8 Nov handover: no compliance process, reporting cadence or contract basics of Wesley's own (the demo notes are marked); `numbers-ledger.md`'s first table is demo data.

Start prompt: "Read docs/HANDOVER-8-nov-sales-review.md and walk me through Operations desk by desk."
