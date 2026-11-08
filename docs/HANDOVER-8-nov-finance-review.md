# Handover, 8 Nov 2026: Finance reviewed. Next: Emails

## Finance round: seven decisions, all Yes (Wesley, 8 Nov)
Asked in the chat and put on Arjun's review card (task `mw7pk4bn23xr`). Every block was dry-run through `brainnotes.planAll` and `skillupdates.planAll` before posting; all passed first time.

| # | Desk | Change | How it landed |
|---|---|---|---|
| 1 | All of Finance | `80-Finance/MOC-Finance.md` lists only real notes: billing, personal-budget, water bill, Imran's Diner sales, the numbers ledger (first table is demo), the VAT Rules sheet (never copy a rate into a note), and the gap: no Imran's Diner costed recipes. `invoicing-rules`, `payables-rules`, `contractor-terms` sit on one line marked "never quote them as rules". | PENDING |
| 2 | All of Sales | `60-Sales/MOC-Sales.md` the same: pipeline, client-list, `10-Business/icp`, offer-ladder, the proposal skill and Drive master, Kayana. `sales-playbook`, `pipeline-rules`, `proposal-template` marked demo; the demo rule "inbound leads are qualified within the hour" is gone. | PENDING |
| 3 | Ivana, Arjun | `10-Business/billing.md`: invoices are Google Docs from the master v2 in the Drive Invoicing folder, which the desks may read (the note used to say Canva and "agents never read that folder"). Last number INV014 (YSF Advisory, Oct 2026, £2,000.00, dated 4 Nov, due 11 Nov), next INV015. INV014 sent and unpaid (Wesley, 8 Nov). | PENDING |
| 4 | Everyone | `00-Meta/numbers-ledger.md`: the first table (14 clients, $38,400 MRR, 23 days, 41%) is labelled as the template's demo data above and below. Nothing deleted. | PENDING |
| 5 | Maggie, Reggie | VAT handoff. `vat-analyser` gains "A VAT change from Reggie" (confirm at the source, propose the sheet row, name live clients it touches). `vat-rules-feed.md`: RECONCILIATION → Maggie (recon), and "Not recorded" replaced by the research ladder. `menu-engineering`: the ex-VAT rate comes from the VAT Rules sheet by country and channel, not "Norway 1.15". `regulatory-watch` shape step 7: each VAT change is a DECISION `to: recon`. | PENDING |
| 6 | Maggie (recon) | Brief: Creamy is NOK; VAT changes come from Reggie's Monday watch; ask Wesley for Imran's Diner's costed recipe sheet before any menu engineering there. | PENDING |
| 7 | Ivana, Arjun | Ivana's job line: checks the invoices Wesley receives so he can pay them (she never pays). Arjun's tools: + google sheets (vat-analyser reads the VAT Rules sheet). | PENDING |

- **Budi (apay):** no change. Brief, skill and ledger match.
- **Roster backup** from before the edits: `data/brain-backups/2026-11-08-fin-review/office.agents.local.before.json`.

## Still open for Finance
- **INV014** is due 11 Nov 2026. If it is not paid by then, Ivana's payment-reconciliation skill puts it under "Needs a look".
- **Reggie's first run with the handoff** is Monday 9 Nov at 08:30. Check that a VAT change (if any) comes out as a `to: recon` decision on his card.
- **Gaps only Wesley can fill:** Imran's Diner costed recipes (upload the recipe sheet); a payables process for invoices he receives (today Ivana only checks them); Manual Magic AI's outstanding lines and which INV011 file was sent.
- The numbers ledger's demo table is labelled, not removed. Delete it by hand if Wesley wants it gone.

## Next department: Emails
- **Desks:** Esme (elead, lead), Callum (cmail), Imani (imail), Vikram (vmail), Kofi (kmail).
- **First fix to propose:** `50-Emails/MOC-Emails.md` lists the demo notes `email-rules`, `vendor-list` and `contractor-terms`. Use the same fix as decisions 1 and 2 above (replace-section on the H1 `MOC — Emails`, real notes listed, demo notes on one line).
- **Known Emails gap:** no real vendor or contractor list.
- **Method:** the same. Read each desk (job line, brief, tools, skills from `/api/skills`, lessons in `<brain>/Agents Office/feedback/<id>.md`, recent `data/tasks.json` by slice, the Brain), ask in chat with AskUserQuestion, then post one card for the lead.

### The card pattern (scripts were in this session's scratchpad, temporary)
- Write the DECISION blocks to a text file. Brain changes are BRAIN UPDATE blocks (`replace-text` with a one-line `find:`, or `replace-section`; the H1 works when the note has only H1). Skill changes are SKILL UPDATE blocks (at most 6 per decision). Roster edits are `to: claude-code` with an ask starting "Run with Grace:".
- Dry run: parse with `decisions.parse`, then `brainnotes.planAll(BRAIN, brainnotes.parse(d.text), {deny: []})` and `skillupdates.planAll(<brain>/Agents Office/skills, skillupdates.parse(d.text), {agentIds})`. Use forward slashes in the Brain path inside a bash heredoc.
- Post `{dept, agent: <lead id>, text}` to `/api/tasks`, where the text tells the lead to output one line plus the blocks exactly as written.
- Careful: a note whose only H1 holds H2 sections (the numbers ledger) cannot take a replace-section on the H1; it would replace the whole note. Use replace-text.

## Start prompt for the next chat
"Read docs/HANDOVER-8-nov-finance-review.md and walk me through Emails desk by desk."
