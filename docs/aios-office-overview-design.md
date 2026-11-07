# AIOS office overview: how to show the whole office (design, 7 Nov 2026)

Guidance only. Nothing in `src/` or `serve.mjs` has changed. Mockups: `output/aios-mockups/` (open the HTML files, or the pictures in `shots/`). Skill used: ui-ux-pro-max (its generic slate palette was ignored; the AIOS dark tokens stay).

## The model: one office, four levels, one "for you" panel

| Level | What you see | How you get there |
|---|---|---|
| 1 · The office | Theo across the top with the ask box (every request comes in here). Nora in the centre. Six department tiles around her, three each side, joined to her by straight lines. Each tile: lead, desks as small faces with a status dot, what is running now, counts (working · lead review · for you). | The Office tab (today's Hierarchy tab, renamed). |
| 2 · A department | Breadcrumb of faces (Nora › Mara). The lead's band: what she is reviewing, her numbers. Every desk as a card: face, name, title, the task it is on, status. Below: the department's work in five stages (Nora → lead plans → desks → lead review → you). | Click a tile. |
| 3 · A desk | A drawer slides in from the right over the department, so you keep your place. Person, model, skills, rules, what they are on now, what is waiting for you from them, what they finished lately. | Click a desk card. |
| 4 · A task | Inside the drawer: the trail, one face per hand-over (you, Theo, Nora, lead, desk, lead review, you), live steps, the latest picture of the work. REVIEW opens the review pop-up you already use. | Click a task anywhere. |

**Going in and out.** Click goes in one level. Esc or the browser's Back goes out one level. The breadcrumb jumps to any level. Every level has its own link (`#office/marketing/gfx/<task>`), so a link from Telegram or Overview opens the right spot.

**Live state.** Four states, each a dot plus a word, never colour alone: Working (green), Needs you (red), Lead review (amber), Idle (grey). Failed is a hollow red ring. The top bar says "Live · updated 4 s ago" and turns grey ("Paused, last update 2 min ago") if the office stops answering, so a quiet screen never lies.

**"Waiting on you" at every level.** Red only ever means you. A red count sits on the department tile, the desk card and the task. The For You panel is always on the right and narrows to where you are: whole office (5), Marketing (3), Greta (1), this task. Every item has REVIEW, which opens the existing pop-up.

**From 1 department to 6, plus extra desks.** All six tiles are there from day one. A department not yet in the AIOS shows dashed, "Not in AIOS yet", with its office counts, so the layout never reshuffles when one joins (its line turns solid). AIOS desks (`aios-desks.json`) sit inside their department, never as a seventh tile. A tile shows up to 10 faces, working and needs-you first, then "+N". A department page shows four desks per row. Past 12 desks, the idle ones fold into one "6 idle" row.

## Why this beats the obvious alternatives

- **Today's vertical chain:** fine for one department; six would be six screens of scrolling.
- **A classic org chart (top-down tree):** six leads and 40-plus desks across one screen makes every label tiny.
- **A zoomable canvas like the Brain tab:** it looks high-tech, but you lose your place and labels collide.
- **One tab per department:** it hides Nora and gives no single picture of the office.
- **The 3D office:** it belongs to AJ, it's slow, and you're moving away from it.

## Pictures

- `shots/level-map.png`: the four levels on one page.
- `shots/level-1-office.png`: the office, Nora in the centre.
- `shots/level-2-department.png`: Marketing.
- `shots/level-3-4-desk-task.png`: Greta's drawer with a task trail.
- `shots/today-hierarchy.png`: today's Hierarchy tab, for comparison.

All are checked at 1905 × 920, dark theme. The figures in the mockups are made up but plausible. The desks, names, roles and portraits are real.

## Build plan (src/aios.html, about two working days)

1. **Level 1, the office map.** A new office view in the Hierarchy block, with the tab renamed Office. Tiles come from the roster plus `aios-desks.json` and `/api/tasks`; `PILOT` decides which tiles are solid. Theo's band takes over the ask box. About 4 hours, including the visual check.
2. **Going in and out.** Hash links, the face breadcrumb, Esc and Back. About 2 hours.
3. **Level 2, a department.** Turn today's Marketing chain, desk cards and task trail into one view that works for any department in `PILOT`. About 3 hours; most of it exists.
4. **Levels 3 and 4, the drawer.** Desk details, the trail stepper, and REVIEW calling the existing pop-up. About 4 hours. The live step log needs a source. If tasks don't already record their steps, the drawer shows the stage trail only, and the step log becomes a later `serve.mjs` change.
5. **The For You panel** filtered to the current level. About 2 hours.
6. **Check.** `npm run check`, then render at 1905 × 920 (dark and light), 1440 and 375. At 375 the tiles stack under Nora and For You becomes a button. About 1 hour.

Level 1 first: it's the picture you asked for, and it works on its own. Today's Hierarchy stays reachable from a tile click until step 3 lands.

## Built (7 Nov 2026): Level 1

- **What landed.** The Hierarchy tab now opens on the office map: Theo's band with the ask box, Nora in the centre, a tile per department, and For You on the right. Clicking a solid tile (a department in `PILOT`) opens today's chain for that department, with a breadcrumb back. Esc goes back; inside the review pop-up or while typing, Esc keeps its own job. Code: `renderOffice`, `tile`, `wires` and `go` in the Hierarchy script of `src/aios.html`; `placeAsk()` moves the ask box.
- **Any number of departments.** The list is the pilot departments first, then the rest in `DEPTS` order, then any department the roster adds later. Half go each side, alternating left and right; an odd one out sits centred under Nora. So 6 is 3+3, 7 is 3+3 plus one below, 8 is 4+4. Tested with fake departments at 7, 8 and 9.
- **Not yet.** Hash links and Back (step 2), the desk and task drawer (step 4).

## Built (7 Nov 2026): step 3, the department page (and step 5)

- Clicking Marketing opens the department page in place of the vertical chain. Mara's band shows what she's reviewing and four numbers. Below it is a card per desk (face, name, title, the task it's on, status, done count, a red count when it waits on you), and For You narrowed to the department. Below that is the five-stage trail, now headed "Work in Marketing", which keeps its lesson yes/no and REVIEW buttons.
- Clicking a desk opens its card with the brief, model, skills and tools; this stands in until the step 4 drawer. Esc closes an open desk first, then goes back to the office. Desks stay in roster order. Past 12 desks, the idle ones fold into one "N idle desks · show" card.
- Theo's band and the ask box now sit at the top of every Hierarchy view. The red Hierarchy hero is gone. The chain helpers it used (`node`, `link`, `face`, `desk`, `bubble`) have been removed. Their old `.hx-node`, `.hx-link`, `.hx-desk` and `.hx-say` CSS is still in the file, unused.
- "Needs you" in the trail is red now (`--hx-need`), so red means you on every level.

## Built (7 Nov 2026): step 4, the desk and task drawer (levels 3 and 4)

- Clicking a desk card on the department page opens a drawer from the right over the page; the page stays where it was. The desk card no longer expands.
- **The desk:** face with status dot, first name, title, who it reports to, and chips for the model, the number of skills, the brief and standing rules. BRIEF AND SKILLS shows what it does, the brief, every skill and its tools.
- **The task it's on:** the title and its status (a dot plus a word), then the trail of seven faces: you (or the routine, or the desk that handed it over), Theo, Nora, the lead, the desk, the lead's review, you. Done steps are ringed green, the current one has a halo (amber while the lead reads it, red when it waits on you), later steps are dimmed and steps a task didn't pass through are dashed ("Not this time", "Went direct", "No review"). Below it: what happened, newest first, with times (asked, started, the lead's verdicts with their feedback, waiting, approved), and the task's plan beside it. REVIEW appears when it waits on you.
- **No live step log.** Tasks don't record their steps as they work; they keep the plan, the start and finish times, team pieces and the lead's review rounds. The drawer says so in one line. A live log would need `serve.mjs` to record the desk's steps; that waits on Wesley's yes.
- **Waiting for you from this desk:** each item with REVIEW (red) for an OK, or OPEN for a Claude Code step or a suggested hand-over. **Done lately:** the last three, each opening its result read-only in the same pop-up.
- **Going out:** Esc closes the review pop-up first, then the drawer (focus goes back to the desk card), then the department. The ✕, the dimmed page and the department pill in the drawer's breadcrumb also close it; Office · Nora goes to the office map.
- Checked at 1905 × 920 dark and light, 1440 and 375 (at 375 the trail runs top to bottom and the breadcrumb drops the office pill). Pictures: `shots/built-step4-*.png`.
- Code: `deskDrawer`, `trailSteps`, `taskLog` and `drawer` in the Hierarchy script of `src/aios.html`; styles `.hxd-*`; the container is `#hxDr`. The stand-in's `.hxo-k2d` and `.hxo-tags` styles are gone.

## Built (7 Nov 2026): step 2, links and Back

- Every level has its own address: `#hierarchy` (the office), `#hierarchy/marketing` (a department), `#hierarchy/marketing/gfx` (Greta's drawer open). A link from Telegram, Overview or a bookmark opens that spot, and a reload keeps it.
- Each click in (a department tile, a desk card) is one step in the browser's history, so Back goes out one level and Forward goes back in. Esc, the ✕ and the breadcrumbs go out the same way: when the level you're leaving was opened from this page they use Back, so history never piles up.
- Leaving the tab and coming back keeps your place (`#hierarchy/marketing`). A link to a department not in the AIOS yet lands on the office, and one to a desk that isn't there lands on its department. Either way the address bar is corrected to match.
- Checked with a script: links, Back, Forward, Esc twice, the drawer's Office pill, switching tabs, and the two wrong links. All pass, with no page errors.
- Code: `route` (beside `setCat`) splits the hash into the tab and the place inside it; `nav`, `apply`, `hxPath` and `window.hxRoute` in the Hierarchy script. A task-level link (`/<task>`) isn't there yet: the drawer always shows the task the desk is on.
