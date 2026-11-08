# Handover, 7 Nov 2026 (night): build the full-width Office

**Wesley's yes (7 Nov, 21:xx):** "Yeah, build that." He loved the mock-up. Build it into the live AIOS (`src/aios.html`, served at `/aios`, no restart needed unless `serve.mjs` changes). About half a day. Run on Opus 5.5.

**The mock-up to match:** `output/aios-mockups/04-office-wide.html` (open it in Chrome at 1905×920; click the red tab). Pictures: `output/aios-mockups/shots/04-office-wide.png` and `04-office-wide-for-you-open.png`. Its CSS and the `draw()` script that lays out the arrows are meant to be lifted into the build.

## What to build
1. **Tabs across the top, on every tab.** The left `.side` column (`.shell` grid, `#side button[data-go]`, group labels Today / The business / The office, the Clients sub-nav, counts `nMatrix`, `nSkills`…) becomes one bar under the header: logo + "Wes's Office", the tab pills with thin separators between groups, then the live pill, "open the office" and AUTO on the right. Keep every `data-go` and `setCat`/`route` behaviour. The Clients sub-dashboards (`isDash`) need a home: a small dropdown under CLIENTS, or a second row shown only on Clients.
2. **Width.** The Office tab fills the whole screen width (no `.wrap` max-width). Every other tab keeps a readable width, centred (today's 1560 px).
3. **The office map** (`renderOffice` and `wires` in the Hierarchy script) as in the mock-up:
   - Theo's band: a slim pill at the top centre holding the ask box (`placeAsk()` moves the one `#pe` element; keep its ids).
   - Nora: a big card in the centre with a red glow.
   - "You · N waiting" pill at the bottom; REVIEW opens For You.
   - Departments in two columns: pilot tiles solid, the others dashed with "Not in AIOS yet".
   - The flows, drawn in one SVG from measured boxes:
     - Theo → Nora: dotted, labelled "Your ask".
     - Nora → each department: white with a moving dot when the department is in `PILOT`; faint dashed when it isn't.
     - A department with items for you → You: red, labelled "N back to you".
   - Ridges across the full width behind it all.
4. **For You as a pull-out.** A red tab fixed to the right edge with the count. Click it to slide out a 440 px panel (today's For You list, `fyItems`, REVIEW calling the existing `data-review` pop-up); ✕ or Esc closes it. On a department page it narrows to that department, as now.
5. **Reskin.** Keep every new colour as a token on `:root` (dark and light), so a reskin for resale changes only those lines.

## Known weak points to fix in the build (seen in the mock-up at 1440)
- The top bar's right-hand pills run over SOCIAL: at ≤1600 px shrink them (the live dot alone, or move them into a ⋯ menu).
- Theo's band squeezes out the ask box: let the ask take the space and the label wrap under the name.
- The red return lines cut through the lower tiles: route them below the tiles (from each tile's inner bottom corner down the gutter), or start them at the badge.
- Phone (375): the tabs scroll sideways in the top bar, the tiles stack under Nora, no arrows, For You stays a tab.

## How to check
- `npm run check` (96 checks).
- Render with playwright-core and the installed Chrome at 1905×920 in dark and light, at 1440×900 and at 375×812.
- The visual-check skill is approved for this build: at most two fix rounds, then send Wesley the pictures.
- Also check that Overview, Matrix, Clients (and a sub-dashboard), Budget, Brain, Skills, Tokens and Social still work under the new top bar.

## Things to know
- **Other sessions edit `src/aios.html`.** The Tokens-tab `deskLabel` lines (three hunks) are another session's and stay uncommitted.
  - **Wrong way:** don't commit with `git apply --unidiff-zero`; it put lines in the wrong place once.
  - **Right way:** write the index copy from the working file with the other session's hunks reversed (`git hash-object -w` then `git update-index --cacheinfo`), as done for `9aa176a` and `1320754`.
- **Unpushed:** five commits after `dd6ea58` (Delivery, Office rename, live step log, dead CSS, docs). Push only with `git push fork main`, on Wesley's yes.
- **State:** the Office tab, Delivery in `PILOT`, and the live step log in the drawer are described in `docs/HANDOVER-7-nov-aios-office-levels.md` and in `docs/aios-office-overview-design.md` (Built sections).
- **Open items:**
  - A task card was proposed: "Stop desk runs loading Wesley's global CLAUDE.md" (desks echo his model line).
  - Delivery's desks have no first names or portraits yet.
- **The goal behind it (Wesley, 7 Nov):** the Office should be visually striking, "like a painting", the centrepiece someone sees and goes "what is this?". The AIOS is meant to be replicated and reskinned for resale.
