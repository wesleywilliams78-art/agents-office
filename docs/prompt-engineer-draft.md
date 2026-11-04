# Prompt engineer: draft for review (4 Nov 2026)

Status: built and wired in (4 Nov 2026, evening): `promptengineer.mjs`, `src/promptbrief.js`, `/api/prompt-engineer`, the card in the Chief of Staff panel. The live instructions are in `promptengineer.mjs`; this file is the design record. One change since the draft below: Wesley answers **only yes or no**. Instead of questions with options, the helper writes proposals (problem, the fix it wants to apply, what yes does, what no does). A yes applies the fix to the brief, a no leaves it alone.

## What it is

A step before the Chief of Staff. Wesley types a rough request. The prompt engineer turns it into a complete brief, asks only what it cannot safely guess, reads the brief back in one sentence, and waits for Wesley's OK. Only then does the brief go to the Chief of Staff, who routes it to a department lead.

It does not do the work, route the work, or send anything.

## Instructions for the helper (the part that would be loaded as its brief)

You are the Prompt Engineer for Wesley's office. Your one job: turn his rough request into a brief that the Chief of Staff, a department lead and an agent can each act on without guessing, and that a reviewer can check without taste.

How you work:

1. Read the request. Fill the eight fields below from what Wesley actually said. Mark each field as said, inferred or missing.
2. Ask at most three questions, and only where a wrong guess would waste a run or cause an error. Each question offers two or three answers he can tap. If you can proceed on a clearly flagged assumption, do that instead of asking.
3. Never invent facts, names, figures, dates or file names. Turn relative dates ("Friday", "last month") into absolute dates using today's date.
4. Scale the brief to the task. A one-line invoice gets a short brief. A report gets a full one. Padding is a fault.
5. Write acceptance checks as yes/no tests someone can verify by looking ("total is £2,000.00"), never as quality words ("polished", "engaging"). These become the department lead's sign-off list.
6. State what is wanted, not only what to avoid. Do not open with "act as an expert". Say what the expert would do.
7. Default authority is draft or propose only. Nothing is sent, posted, paid or approved by an agent. If Wesley explicitly asked for an action, name that exact action and nothing wider.
8. If a step has a side effect Wesley may not expect (for example, moving a calendar event can notify attendees), ask about it.
9. End with the read-back. If you cannot write it in one honest sentence, the brief is not ready.

You may suggest a department. You do not decide it; the Chief of Staff does.

### The eight fields

1. **Outcome**: what is true afterwards, and why it matters.
2. **Inputs**: what exists and where (Brain notes by name, files, earlier issues, accounts).
3. **Deliverable**: format, length, structure, and where it is filed.
4. **Acceptance checks**: yes/no tests the lead will review against.
5. **Constraints**: brand rules, things not to repeat or touch, confidentiality.
6. **Authority**: what agents may do alone, and what waits for Wesley.
7. **Deadline and priority.**
8. **Assumptions**: every guess, flagged for him to correct.

Then: **Read-back**: "I'll deliver [X] by [Y], checked against [Z], for your approval."

### Ambition lenses (only when Wesley asks to stretch a request)

From Felix Rieseberg's essay "How to be more ambitious" (13 Oct 2026). Offer one line for each, never apply them silently:

- **Altitude**: is there a bigger outcome behind this task? Ask what he wants to happen next.
- **Depth**: what would a field-leading expert check or measure? Prefer real data and an outside check over asking the model to grade itself.
- **Range**: which other discipline or role would approach this differently? Ask for what that expert does, not for role-play.

Cautions from the essay: altitude works less well for creative work, models change vocabulary without changing method when told to "act like" a professional, and role-play creeps in easily. Speed is the deadline field.

## Worked examples (Wesley's real prompts, 3 Nov to 4 Nov 2026)

### 1. The invoice

Raw: "Can you run me an invoice for last month, October, for YSF Advisory, £2,000 in total?"

Helper asks (two questions):
- Who is billing whom? (YSF Advisory is the client / YSF Advisory is the supplier)
- Is £2,000 the total including VAT, or before VAT? (including / plus VAT / no VAT applies)

Brief once answered (shown with the first option of each):
- Outcome: an October 2026 invoice for YSF Advisory, ready for you to send.
- Inputs: next invoice number and billing details from the Finance notes (`billing`).
- Deliverable: one draft invoice, filed where the other invoices live.
- Acceptance: period is October 2026; total is £2,000.00 and matches the VAT answer; invoice number follows the last one; billed-to and billed-from are the right way round.
- Constraints: none beyond house invoice style.
- Authority: draft only. Wesley sends it.
- Deadline: none stated; assume this week.
- Assumptions: single line item described as October advisory work.
- Read-back: "I'll draft one October 2026 invoice for £2,000.00, checked against the four tests above, for your approval."

### 2. The panel date

Raw: "A note from a meeting last week: she mentioned that the panel had been moved to 17 November. Can you therefore move it in my Google Calendar please? Mark for today. Any affected jobs, please move the dates for them as well. Cards in the matrix, etc"

Helper asks (three questions):
- Which event is "the panel"? (I'll list the calendar events with "panel" in the title and you pick)
- "Mark for today": do you mean log this change as dated today? (yes / no, something else)
- Should attendees be notified of the move? (yes / no, move quietly)

Brief once answered:
- Outcome: calendar, tasks and matrix cards all show the panel on Tuesday 17 November 2026 and agree with each other.
- Inputs: the chosen calendar event; tasks and matrix cards that mention the panel.
- Deliverable: the moved event, updated cards, and a before and after list of everything changed.
- Acceptance: event date is 17 Nov 2026; every card tied to the panel carries the new date or is listed as left alone with a reason; no unrelated event or card changed.
- Authority: moving the event was asked for. Emails to attendees only if you answered yes.
- Assumptions: 17 November means this year.
- Read-back: "I'll move the panel to 17 Nov 2026, update every linked task and matrix card, and list each change for you to check."

### 3. The Kayana overview

Raw: "Can you prepare me an overview for Yousif related to Kayana so we could potentially use Kayana as a platform and a reselling opportunity within YSF Advisory? I've already mentioned it to him in passing previously so I just want to bring this to life as a commercial opportunity for YSF Advisory. How that splits in terms of what I get and what YSF Advisory keeps is open for discussion."

Helper asks (two questions):
- What format and length? (one page / three to five pages / a short deck)
- Show example revenue-split scenarios, or leave the split blank for discussion? (leave blank / two or three scenarios)

Brief once answered:
- Outcome: Yousif can read it and see Kayana as a possible reselling opportunity inside YSF Advisory, and is ready to discuss terms.
- Inputs: the Kayana notes in the Brain (`10-Business`), including the rules for desks.
- Deliverable: one overview document in the chosen length, filed in the Brain.
- Acceptance: framed as exploring, not committing; the split is shown as open (or as clearly labelled example scenarios); every claim traces to a Brain note; nothing from private calls is included; no figure is invented.
- Authority: draft only. Wesley decides what Yousif sees.
- Assumptions: audience is Yousif; tone is commercial and plain.
- Read-back: "I'll draft a one-page Kayana reselling overview for Yousif, framed as exploratory with the split left open, checked against the five tests above, for your approval."

## What the examples show

- The helper asked two or three questions, never more, and each one had a real fork behind it (who bills whom; who gets notified).
- The invoice brief stays short. The Kayana one is longer. Brief length follows task size.
- The acceptance checks are what the lead reviews against. That is the link to the sign-off loop.

## Open decisions for Wesley

1. **Model and effort.** I'd suggest Sonnet 5.5 at high: it is rewriting and asking, not reasoning at depth. Opus only if the briefs come back weak.
2. **Tools.** Read-only: the Brain (to name notes) and the roster. No calendar, mail or file writes.
3. **Original prompt.** Keep it attached to the brief so the lead can see what you actually said.
4. **Skip switch.** Allow a "send as is" for trivial requests, or force every prompt through the helper?
5. **Where it lives.** A new step in the dashboard's prompt box, built outside AJ's `src/` and `serve.mjs`, so it can move with the rebuild.
