# Handover, 7 Nov 2026: AIOS office levels, built, Delivery in, live step log

**Where it stands.** All four levels of the design in `docs/aios-office-overview-design.md` are built in `src/aios.html` (the Office tab, called Hierarchy until 7 Nov) and committed: `dd6ea58` (pushed to the fork), then `a8a635c`, `db5a4b1`, `9aa176a`, `1320754` (not pushed; push is `git push fork main`). The doc's "Built" sections say what each step does. The mockups Wesley approved and the screenshots of what was built are in `output/aios-mockups/` (`shots/built-*.png`).
- **Level 1, the office map:** Theo's band with the ask box, Nora in the centre, a tile per department, For You on the right.
- **Department page:** the lead's band, desk cards, For You for the department, the "Work in <dept>" trail.
- **Desk and task drawer:** opens from the right when you click a desk card.
  - The desk itself.
  - The task it's on, with a seven-face trail. Dashed faces are steps the task skipped; the current step has a halo (amber while the lead reads it, red when it waits on Wesley).
  - A timeline, the live steps of this run (`task.steps`, kept by `serve.mjs`) and the task's plan.
  - What's waiting for Wesley from that desk (REVIEW opens the existing pop-up).
  - What it finished lately.
- **Links and Back:** `#office`, `#office/<dept>`, `#office/<dept>/<desk>` (old `#hierarchy/…` links still land; inside the page the tab's id is still `hierarchy`). Each level in is one history step. Back, Esc, the ✕ and the breadcrumbs go out one level.

**Decided.**
- Red always means Wesley.
- Status is always a dot plus a word.
- Departments not in `PILOT` show dashed, and links to them land on the office.
- The drawer shows the task the desk is on now; there are no task-level links.

**Done 7 Nov (evening), each on Wesley's yes.**
1. `dd6ea58` pushed to the fork.
2. **Delivery** joined `PILOT` (`a8a635c`): the busiest department after Marketing (42 tasks in 14 days).
3. **The tab is "Office"** (`db5a4b1`). `route()` maps `office` to the internal `hierarchy` id; `hxPath` writes `#office/…`.
4. **Live step log** (`9aa176a`). `askX` in `serve.mjs` records each run's start, every tool call (with its query, URL or note) and each line the desk writes, on `task.steps` (last 40, reset at each run). It saves at most every 3 s, only the steps and only while the task is `doing`. `liveSteps` in the drawer shows them above the plan, marked LIVE while running. A team piece shows only that desk's steps. Tested on a real read-only task (`mw6vbbifyz5t`, Delivery, waiting for Wesley).
5. **Dead CSS removed** (`1320754`).

**Open.**
- Delivery's six desks have no first names or portraits yet (Marketing's do), so they show initials.
- Desks read Wesley's global `~/.claude/CLAUDE.md`: 20 results contain its "Sonnet 5.5 · high is right for this." line. A desk run should not load his personal instructions.

**Where the code is.** All of it is in the Hierarchy script of `src/aios.html`:
- `blockOf`, `fc`, `stp`, `keyOf`, `rail`, `deskCard`, `renderOffice`.
- The drawer: `deskDrawer`, `trailSteps`, `taskLog`, `liveSteps`, `drawer` (container `#hxDr`, styles `.hxd-*`).
- Navigation: `nav`, `apply`, `hxPath`, `window.hxRoute`.
- `route()` sits beside `setCat` and splits the hash into the tab and the place inside it.

**How to check.**
- Run `npm run check` (96 checks).
- Render with playwright-core and the installed Chrome at 1905×920 dark, plus light, 1440 and 375.
- At most two fix rounds, then send Wesley the screenshots.
- Other sessions edit `src/aios.html` too. When committing, stage only your own hunks: the Tokens-tab `deskLabel` lines were another session's and are still uncommitted.
