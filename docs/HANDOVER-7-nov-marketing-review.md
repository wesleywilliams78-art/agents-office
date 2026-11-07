# Handover, 7 Nov 2026: marketing department review, tidy, desk names and portraits

## Where things stand
- **Review done** (Sonnet 5.5). Seven marketing seats checked against the business (`10-Business/business-model.md`, `icp.md`, `offer-ladder.md`), the brands and rhythm (`20-Brand/brands.md`) and 144 past marketing tasks. Finding: the seats' own briefs are strong; the problems were at the seams.
- **Tidy pass done** (approved by Wesley):
  - `office.agents.local.json`: MARKETING LEAD "does" no longer says ad budget or AJ, dead tools `meta`/`clarity` gone, brief cut to ~1,600 chars (points at skills). INSTAGRAM AGENT renamed **INSTAGRAM**, new "does", `clarity` gone. GRAPHICS DESIGNER role "Design Agent", brief now says routine resizes/template fills go to DESIGNER ASSISTANT (dasst). VIDEO EDITOR "does" says what it really builds (the weekly series are built in Claude Code).
  - Brain skills: "INSTAGRAM ORGANIC/AGENT" → "INSTAGRAM" in art-of-operations-reel, instagram-carousel, instagram-country-row, reel-from-topic, social-video, content-week; content-week's Tuesday build now describes the 3 Nov Instagram cycle.
  - Brain `routines.json`: `content-plan` and `content-build` rewritten to the 3 Nov cycle (Mon/Wed city-by-city, Tue/Thu carousels, Fri recap; Tue personal photo post, Thu walkthrough). `toolkit-library` **paused** (Toolkit dropped 28 Oct but it still fired on 3 Nov).
  - `20-Brand/content-calendar.md`: desk name replaced (20 mentions).
- **Desk names and portraits live** (Opus 5.5): Mara (mlead), Riley, Newt, Greta (gfx), Ada, Iggy, Vic (vid).
  - `person` field in the roster (`roster.mjs` EDITABLE), passed through `reloadRoster`/`agentsOut` in `serve.mjs` with `portrait`; portraits are `assets/people/<id>.png|jpg|webp`, served at `/people/<file>`.
  - Shown on AIOS Hierarchy (desk cards and the lead box) and Roles (seat rows) in `src/aios.html`.
  - Two new checks in `check.mjs`; `CLAUDE.md` documents the field. `npm run check` 93/93.
  - Portraits made with Canva `generate-image`, 200×200, prompt pattern: "Hyper-realistic professional headshot photograph of <person>, head and shoulders, <hair>, <expression>, <clothes>. Soft natural window light, plain warm off-white studio backdrop, 85mm portrait lens, shallow depth of field, natural skin texture, looks like a real corporate team photo. No text, no logos, no watermark." Square. Keep it for any new desk so the set matches.
- Office server restarted 7 Nov ~14:40 as a hidden `node serve.mjs` (its old parent shell was gone).
- **Nothing committed.** Push only with `git push fork main`.

## Waiting on Wesley (yes/no, recommendation first)
1. **Add a REPORT EDITOR seat: yes.** The Franchise Entry Report has no owner: mlead wrote/rebuilt/fixed issues 02–04 (~15 of its 57 tasks) and then reviews the same work. Seat owns `franchise-entry-report`; lead goes back to checking. One tuning round. Needs a first name + portrait.
2. **Add PROOF (case stories, £ proof bank, client clearance register): yes, after 1.** Nothing owns proof; `website-qa` demands a proof inventory.
3. **Add a "franchisor expanding abroad" segment to `10-Business/icp.md`: yes.** Content targets brands franchising abroad; the ICP note doesn't, so the Inbound Leads Manager could qualify a "DM us PORTUGAL" lead out. Fact only Wesley has.
4. **Paid ads planned?** If not, strike the paid-ad lens from the `lead-review` skill and leave `ad-playbook.md` as history. If yes, put "ad budget" back on the lead.
5. **Names and portraits for the other five departments: yes, one department per round.**
6. Later, not now: a lead-path/website seat once the site is hosted.

## Where things are
- Review evidence: task history in `data/tasks.json` (dept marketing), routines in `<brain>/Agents Office/routines.json`, skills in `<brain>/Agents Office/skills/`.
- Roster before the tidy: copy kept only in this session's scratchpad; `git diff office.agents.local.json` is not available (the file is gitignored), so the old text is in this chat's transcript if needed.

## Start prompt for the next chat
"Read docs/HANDOVER-7-nov-marketing-review.md and put decision 1 (REPORT EDITOR seat) to me as a yes/no."
