# Handover: tuning the agents one seat at a time (5 Nov 2026)

## Where it stands
Wesley wants every seat tuned to world-class quality, one agent per round. Five are done. Nothing is committed (`office.agents.local.json` is git-ignored; skills live in the Brain).

| Seat | id | What changed | Skill |
|---|---|---|---|
| RESEARCH | riley | does, brief, tools + web, chrome | new `market-research` |
| INTEL | scout | does, brief | new `decision-memo`; KATE line removed from `app-teardown` |
| NEWSLETTER | newt | does, brief | `scaling-without-borders` rewritten; Editions 32–34 filed verbatim in `20-Brand/scaling-without-borders.md` with the shape read from them |
| GRAPHICS DESIGNER | gfx | does (mojibake fixed), brief | new `design-craft`: Step 0 Branded / Country pieces / Open, and the `RESTRICTED: … Approve?` line |
| LINKEDIN | ada | does, brief (current rhythm, voice file wins on his profile) | `linkedin-posts` rewritten: true-thing source order, six tests, close and hashtag rules fixed |

`npm run check` passed 89/89 after each round. Edition 35 was redrafted in the office (task `mw2rps5pxp9g`, passed lead review) and filed at `20-Brand/scaling-without-borders-edition-35-draft.md`; three items there need Wesley.

## How a round runs (Wesley agreed this pattern)
1. Read the seat in `office.agents.json`, its override in `office.agents.local.json`, every skill bound to it, `feedback/<id>.md`, and its recent tasks in `data/tasks.json` (by slice, `node -e` filter on `agent`).
2. Find the weak spots in the real output (stale rules, rules that contradict, generic output, missing judgement).
3. Propose as yes/no items, recommendation first: `does`, `brief` (≤ 2,000 chars), and an improved or new Brain skill (body ≤ 6,000; keep `## Rules` for leadlessons.mjs). Principles from renowned thinkers are written as tests, never naming or imitating them in output.
4. Drafts go to the shared notes folder first; write only on Wesley's yes; back up the old skill there; run `npm run check`; suggest one task to try it; offer the next seat.

Shared notes folder (drafts and `*.before.md` backups): `C:\Users\Wesley\AppData\Local\Claude-Data\claude_pzs8sxrjxfjjc\side-session-notes\local_c943076c-91b3-4a03-b985-7755424197f7\`

## Decided by Wesley in these rounds
- GRAPHICS DESIGNER asks itself first: branded (brand rules hold) or open (widen palette and craft). If rules hold a branded piece back, it builds on-brand, then asks with a RESTRICTED line.
- WRW red `#EC3013` is for WRW Hospitality's own pieces. The Franchise Entry Report and its carousels and reels use the country's colours from `issue.json`. (In memory: brand-kit.)
- On Wesley's personal LinkedIn his voice file beats house-style and humanizer: one light emoji after the hook unless serious, his dashes kept, no hashtags.

## Next
Marketing: INSTAGRAM ORGANIC (`iggy`), then VIDEO EDITOR (`vid`), then MARKETING LEAD (`mlead`). Then Sales, Emails, Ops, Finance, Delivery in roster order.

## Follow-ups noticed, not done
- Office agents' results open with "Sonnet 5.5 · high is right for this.": Wesley's global `~/.claude/CLAUDE.md` model rule reaches the headless agent runs.
- The Edition 35 task (needsOk false) filed its BRAIN UPDATE without an approval, against the "files only when approved" rule in CLAUDE.md. Worth checking in `brainnotes.mjs` / the lead-review pass.
- Agents cannot see the stills `video_build` returns, so GRAPHICS cannot check its own look (connector change, its own task).
- `40-Marketing/newsletter.md` still says "Monthly… subject lines A/B tested": stale.
- `20-Brand/linkedin-voice.md` "Proof I can use" is empty: Wesley to add outcomes he will put his name to.
- `design-craft` is at 5,914 of 6,000 characters: little room for lead lessons.

## Start prompt for the new chat
> Read docs/HANDOVER-5-nov-agent-tuning.md, then tune INSTAGRAM ORGANIC (iggy) the same way: read the seat, skills, corrections and recent tasks, and propose does, brief and skill as yes/no before writing anything.
