# Handover, 7 Nov 2026: AIOS office levels, step 4 next

**Where it stands.** The design is in `docs/aios-office-overview-design.md`: four levels, the build plan, and what's built. Wesley approved the mockups in `output/aios-mockups/` (open `03-desk-task.html` for step 4). Built and live in `src/aios.html`, not committed:
- Level 1, the office map: Theo's band with the ask box, Nora in the centre, any number of department tiles, For You on the right.
- Step 3, the department page: Mara's band, desk cards, For You filtered to the department, then the "Work in <dept>" trail.

**Next: step 4, the desk and task drawer.** Clicking a desk card opens a drawer from the right over the department page; it does not leave the page.
- The drawer shows the desk: face, name, title, model, skills, standing rules, tools.
- **Now:** the task it's on, with a trail of one face per hand-over: you, Theo, Nora, lead, desk, lead review, you. The current step is ringed green and later steps are dimmed.
- **Waiting for you from this desk:** each item's REVIEW calls the existing review pop-up (`data-review`).
- **Done lately:** three items.
- It replaces today's stand-in, where clicking a desk expands its card (`deskCard`'s `more` block). Esc closes the drawer before leaving the department; the review pop-up (`#rv.on`) keeps its own Esc.
- The live step log in the mockup needs a source. Check whether tasks record their steps (`data/tasks.json` fields, `serve.mjs`). If they don't, show the stage trail only and say so; don't add `serve.mjs` changes without a yes/no to Wesley.

**After that: step 2.** Hash links (`#hierarchy/marketing/gfx`) and the browser Back button; `setCat` in `src/aios.html` uses `history.replaceState('#'+c)`.

**Where the code is.** In the Hierarchy script of `src/aios.html` (search for "the office map (level 1)"):
- Shared pieces: `blockOf`, `fc`, `stp`, `keyOf`, `rail`, `deskCard`, `renderOffice`, `go`.
- The `view` state is `'office'` or a department key.
- `sel` is the open desk.
- The ask box is placed by `placeAsk()`.
- The styles are the `.hxo-*` rules beside the `--hx-need` variable (red since 7 Nov).

**Rules Wesley gave.** Red always means him. Status is always a dot plus a word. Text never crosses a colour edge or touches anything. No wavy curves. Check at 1905×920, plus 1440, 375 and light theme.

**How to check.**
- Run `npm run check` (95 checks).
- Render with playwright-core and the installed Chrome (`C:/Program Files/Google/Chrome/Application/chrome.exe`) at 1905×920, `colorScheme: 'dark'`, on `http://localhost:4520/aios#hierarchy`. Click `[data-hxdept="marketing"]`, then `[data-hseat="gfx"]`.
- Look at the picture, fix, at most two rounds, then send Wesley the screenshots.
- Other sessions share this folder: edit `src/aios.html` with targeted edits only, and don't commit unless he asks.
