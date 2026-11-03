# Handover, 3 Nov 2026: Social on the AIOS, the office calendar, the Instagram rhythm

Start a new chat with: **"Read docs/HANDOVER-3-nov-social-calendar-aios.md and carry on from Next."**

## Where things stand
- **Committed and pushed** to `fork` (wesleywilliams78-art/agents-office): `a4216de`, Social on the AIOS plus the office calendar work. Checked on a clean copy, 82/82.
  - **Social** (`/aios#social`, `social.mjs`, `/api/social`, `/api/files`). One card per workstream (WRW Hospitality IG, The Art of Operations, Tales of Nirn, collab LinkedIn, Wesley LinkedIn, Scaling Without Borders), each showing only its next post. The buttons:
    - **HAND TO THE CHIEF OF STAFF** adds a Marketing task (`by: chief`, 20 s undo).
    - **WHERE IT IS** lists the files: the calendar's Files column, the Content Calendar folder, and every path or link the result names. Each has OPEN and SAVE A COPY.
    - **SIGN OFF.**
    - **MARK POSTED** is the calendar's own tick.
    - State lives in `data/social.json`. `addTask()` in `serve.mjs` is now the single path for the task bar, the Chief of Staff and Social.
  - **Office calendar (P).** DAY view. Google layer. Social posts sit under a SOCIAL line in DAY and WEEK. The Art of Operations has its own place and colour. Posts load without waiting for the connector list.
- **Also pushed:** `41521be`, Social moved under "The office" in the AIOS menu.
  - That commit also swept in another session's unfinished Tokens change in `src/aios.html`: the chats list now splits into "last 24 hours" and a folded "OLDER THAN 24 HOURS". It went in by mistake.
  - The committed state passes 82/82 on a clean copy. The session that owns the Tokens change should know it is already in.
- **Local only (gitignored):** `office.agents.local.json` has MARKETING LEAD (`mlead`) on Sonnet, effort still high. It takes effect on the next office restart.
- **Other sessions' uncommitted work** is still in the tree: `mcp.mjs`, `notify.mjs`, `sites/`, the Kenya issue, `src/braingraph.js`, other handovers. Leave it out of commits.

## Decided by Wesley (3 Nov)
- **The Art of Operations:** one Reel a day on its own account. Reel 13 was posted today; 14 is Wed 4 Nov and 15 is Thu 5 Nov. Reels 16 to 25 (Fri 6 to Sun 15 Nov) need producing. 14 and 15 v3 are still waiting on his approval.
- **WRW Hospitality Instagram is a five-day cycle**, each day on the report from the previous Friday:
  - **Mon** city-by-city Reel, shared to Stories with a poll.
  - **Tue** carousel: who owns the market and where the gap is.
  - **Wed** city-by-city, the second pair.
  - **Thu** carousel: what it costs to open and what blocks you.
  - **Fri** the 60 s recap cut for Instagram, ending "New today: <country> on LinkedIn". The new report goes on LinkedIn the same day.
- **Carousels:** 8 slides at 4:5. Built only from the final PDF.
- **Separate accounts:** WRW Hospitality, The Art of Operations and Tales of Nirn are separate Instagram accounts, so their posting times don't compete.
- **Where the rules live:**
  - Brain `20-Brand/content-calendar.md`
  - Brain `20-Brand/brands.md`
  - Brain skills: `content-week`, `instagram-country-row` (rewritten for two pairs) and the new `instagram-carousel` (with `template.md`, bound to iggy, gfx and mlead).
- **Social section:** Wesley deals only with the next task in each workstream. He hands off, then reviews what comes back.

## Next
1. Restart the office (`npm start`) so the Marketing Lead runs on Sonnet. Check `/api/tasks` first: nothing should be in state "doing".
2. **Wesley's actions:**
   - Set up a saved reply on the WRW Instagram account for "<COUNTRY>" DMs, sending the report link.
   - Approve or reject the Marketing Lead's recommendation card in the office.
   - OK the Portugal footage download, about 962 MB, for Mon 9 Nov.
   - Approve 14 and 15 v3.
3. **Production due:**
   - The Sweden carousel for Thu 5 Nov.
   - The Sweden recap cut for Instagram, Fri 6 Nov. The source is `videos/franchise-entry-report/issues/02-sweden/recap`.
   - Art of Operations Reels 16 to 18.
   - Issue 03 Portugal has research gaps (3 market tiles, wage floor, licensing) before Friday. Its carousels wait for the final PDF.
4. **Watch:**
   - The first real Social hand-off. Check that the result names its files, so WHERE IT IS fills.
   - A hand-off whose text says "Reel" plus "build", "post" or "ready" becomes a team job (lead plus desks).
   - The Marketing Lead's team split wrongly to RESEARCH once.

## Where things are
- **Code:** `social.mjs`, `serve.mjs` (`addTask`, `/api/social`, `/api/files`), `src/aios.html` (Social section), `src/calendar.js` + `src/shell.html` (DAY view, SOCIAL line), `weekpack.mjs` (Art of Operations place, `files`), `check.mjs` (the social step).
- **Brain:** `20-Brand/content-calendar.md` (the Art of Operations and WRW rows), `20-Brand/brands.md`, and `Agents Office/skills/` `instagram-carousel`, `instagram-country-row` and `content-week`.
- **Memory:** `aios-social-section`, `weekly-content-rhythm-28-oct` (the Instagram cycle, separate accounts).
- **Commits on `fork/main`:** `7ebc2b4` (Google Calendar), `a4216de` (Social and the calendar), `41521be` (the menu move).
- **Committing in this repo:** other sessions leave uncommitted work in shared files. Before `git add`, run `git diff <file>` and commit only your own hunks. `41521be` is what happens when that check is skipped.
