# Handover, 7 Nov 2026: the GRAPHICS DESIGNER can see (acceptance test in progress)

## Where things stand
- **Built and checked (7 Nov, Opus 5.5).** The `gfx` desk can look at its own slides. Plan: `docs/plan-agent-visibility.md`.
  - `connectors/video-studio/look.mjs` (new): a numbered contact sheet of a finished job's slides, or one slide, drawn by the installed Chrome. Output `output/video/<job>-look/`.
  - `connectors/video-studio/mcp.mjs`: new tool `video_look` (job_id, optional slide; returns text + PNG image block; refuses missing, unfinished and out-of-range). `video_build`'s `next` now says to look before reporting.
  - `check.mjs`: new step "video studio look" (fixture job, PNG block, refusals, gfx brief, look.md size). `npm run check` was 90/90.
  - Brain `Agents Office/skills/design-craft/look.md` (new, 2,583 chars) + one pointer line in its `SKILL.md` (body 5,967 / 6,000).
  - `office.agents.local.json` gfx brief: "You cannot see images…" → "You can see your work: look at your slides with video_look before you return them."
- **Proof so far.** Blind tests by Wesley: header (6 Nov) lost, Edition 33 carousel (7 Nov) won. A spike proved a `claude -p` agent with Read denied sees an MCP image result.
- **ACCEPTANCE TEST PASSED 7 Nov: Wesley picked the desk that can see (sheet A). See memory visual-check-skill.**
- **Nothing committed.** Commit only if Wesley asks; push only `git push fork main`.

## Acceptance test, half done
Same task text for both runs (in the scratchpad `poll.mjs` of the old chat; the text is below), posted to Marketing, routed to `gfx`:
> GRAPHICS DESIGNER: build a 5-slide Instagram carousel (format 4:5, deliver stills) for Franchise Entry Report Issue 04, Kenya, with the video studio, using report 04-kenya for the colours. Use these words exactly, one slide each, in this order: 1) Kenya is open, with no franchise law found. Pick the partner before the category. 2) 257: Simbisa counters in Kenya, Jun 2026, the largest food network we found. 3) 14.4%: average bank lending rate, Sep 2026, against a policy rate of 8.75%. 4) £0.58: all-in hourly cost of a Nairobi waiter or cook at the legal floor (Estimate). 5) Chicken, coffee and forecourts are growing. This is a design test for Wesley: make the slides only, do not post or send anything.

- **OLD run (blind desk):** done. Task `mw66s2hxryp3`, studio job `xmw66sf1lodj`, slides in `output/video/xmw66sf1lodj-slides/`. Run with the old brief, old SKILL.md line, no look.md and HEAD's `mcp.mjs` (no `video_look`); all four files were then restored byte-for-byte (verified with `cmp`).
- **NEW run (desk that can see):** done. Task `mw66u63t82ym`, final studio job `xmw66wed6unk`, slides in `output/video/xmw66wed6unk-slides/`. It called `video_look`, rebuilt (dropped an added series line on slide 1, moved slide 3 from ink to the Kenya green, folded "(Estimate)" into the label), and reported `Studio fault, slides 1 and 5: the underline under "partner" and "growing" runs through the descenders`. All on Sonnet.

## Next
1. When the NEW task is done, draw both sheets with the same renderer: `node -e "import('./connectors/video-studio/look.mjs').then(m=>{const j=require('./data/video/jobs/<id>.json');console.log(m.look(j).file)})"`.
2. Copy them as `sheet-A.png` / `sheet-B.png` into `output/library/kenya-carousel-blind-test/`, the A/B order chosen at random, and keep the key out of sight until Wesley picks. Send both with SendUserFile, unlabelled; ask which he would rather post (yes/no style buttons A / B).
3. Reveal. Pass = he picks the NEW one. If he picks OLD or has no preference: switch the gfx brief back (keep the tool) and say so, per the plan.
4. Record the result in memory `visual-check-skill.md` (score now 1 loss, 1 win before this test) and note the number of `video_look` calls and rebuilds the desk used, plus the image token cost if visible in `data/tokens.jsonl`.
5. Both test tasks sit in WAITING on the board; ask Wesley whether to reject them (they post nothing).

## Known limits and follow-ups (offer as yes/no, not started)
- Studio faults the desk can see but not fix: the emphasis underline is drawn through descenders, and a long kicker can wrap a lone word (`connectors/video-studio/compose.mjs`). `look.md` tells the desk to report them as `Studio fault: …`.
- One unrelated flaky check: "smoke: TEAM in the bar" failed once, passed twice.

## Rules from Wesley this thread (already in memory)
- Decisions as yes/no with a recommendation; prove a chat version before building for the office; judge visuals by his blind pick, not by brand rules (`newsletter-header-bold-look`, `visual-check-skill`).
