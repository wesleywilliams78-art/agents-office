# Handover: AIOS as the new office, and the prompt engineer (4 Nov 2026, evening)

## The direction (Wesley, 4 Nov)
- **Build in the AIOS dashboard, not the office.** `src/aios.html` (one plain HTML file, about 330 KB, no build step, served at http://localhost:4520/aios by `serve.mjs`). The 3D office (AJ Sahni's Agents Office) keeps running in the background. Change it only where something cannot be done otherwise, and say so first.
- **Why:** the office is AJ Sahni's product under PolyForm Noncommercial 1.0.0 plus Sahni.ai's extra terms (no commercial use, no rebranding, no fronting another agent system; see `LICENSE`). The AIOS modules are Wesley's commits but run inside that codebase, so they cannot be licensed commercially as they stand. The long-term aim is an AIOS that stands on its own, rebuilt clean. Today the AIOS still uses the office's server (`serve.mjs`) and data (`data/tasks.json`, the roster). Keep new AIOS work in separate modules so it can move.
- **Claude Duet** (support article 17631495): a US-only research preview, a phone app on his Claude account with no API or embed. It cannot reach localhost. It will be the on-the-move surface; the AIOS stays the one place that holds state. Later, Duet and the office both read and write a shared store. Nothing to build for Duet until it reaches the UK.
- **Inboxes:** WRW, YSF Advisory, Qamaria (and maybe Manual Magic), Gmail or Outlook. Connect each one directly; no forwarding. Untested: whether one Gmail connector holds several accounts. Microsoft 365 needs authorising.

## The design agreed
- **Hierarchy:** Wesley → prompt engineer → Chief of Staff → department lead → agent → lead review (bounce with feedback, at most 2 rounds, then escalate to Wesley) → Chief of Staff → Wesley. Lead sign-off is not approval to send; nothing goes out without Wesley.
- **Pilot: Marketing** (mlead, riley, newt, gfx, ada, iggy, vid).
- **The view:** an org chart (Wesley, Chief, Marketing lead, six desks). Colour shows state: blue needs you, amber in review or rework, teal being worked, grey idle. Solid arrows go down (assign and feedback); dashed arrows go up (sign-off). Under it, a five-stage trail: Chief, Lead, Agents, Lead review, Awaiting you, with a "Rework · round N" badge; clicking a desk filters the cards. The mock-up was a chat widget only. Nothing is in the AIOS yet.
- **The yes/no rule** (memory `yes-no-proposals`): every decision is put as problem, fix, if yes, if no. YES applies it, NO leaves it. No open questions, no menus.

## Built tonight (in the office, kept; uncommitted)
- `promptengineer.mjs`: Sonnet 5.5 at high, read-only Brain tools. It returns an eight-field brief, a read-back, and up to three yes/no proposals; questions and chat come back as `pass`.
- `src/promptbrief.js`: applies the yes/no answers and writes the brief text for the chief.
- `serve.mjs`: `POST /api/prompt-engineer` (same origin check as the chief). The chief accepts up to 9,000 characters for an engineered brief.
- `assistant.mjs`: the chief adds an approved BRIEF as written.
- `src/assistant.js`: the yes/no card and the ENGINEER ON/OFF toggle in the office's Chief of Staff panel. This is what Wesley did not want as the main surface; it stays, but the AIOS gets its own.
- `scripts/pe-test.mjs`: run prompts through it (the report holds real prompts, so write it outside the repo).
- `docs/prompt-engineer-draft.md`: the design, the formula, Felix Rieseberg's lenses (altitude, depth, range; speed is the deadline field) and worked examples.
- Docs: `CLAUDE.md` (Chief of Staff section), `docs/INDEX.md`.
- Tested: 19 prompt runs, about $4.60 in all, $0.07 to $0.39 and 7 to 82 s each. The page flow was tested with stubbed calls. `npm run check` passes 85/85.
- **Not live** until the office restarts (`npm start` in the "Agents Office" window). The route has not run in the real server yet.

## Next (in the AIOS)
1. ~~Restart the office and prove `/api/prompt-engineer`.~~ **Done 4 Nov, evening:** office restarted, one real request returned a brief and a yes/no proposal in 93 s.
2. ~~Prompt-engineer composer in `src/aios.html`.~~ **Built 4 Nov, uncommitted:** "Ask the office" panel at the top of Overview (`#pe`, own CSS block and own `<script>` at the end of the file). `/src/*.js` is not served, so `applyAnswers` and `briefText` are inlined as copies of `src/promptbrief.js`; keep the two in step. Tested in the browser with both API calls stubbed (yes/no, brief text, send with `engineered: true`, task chip with undo). Not yet run end to end with a real send. No attachments in the AIOS box yet.
3. The Marketing org chart and trail as a new AIOS section (side menu: Overview, Matrix, Clients, Budget, Roles, Skills, Tokens, Social). Read live state from `/api/tasks` and the roster. **Built 4 Nov, first cut:** the **Hierarchy** tab (under Roles in The office) is a picture in the Overview hero look, not a Roles copy: red hero with live stats, then prompt engineer (ingestion; chips for Ask box, Telegram straight to chief, Duet and Plaud One planned) > Chief of Staff > head of department > a bay of desks. Desks are read from the roster for each department in `PILOT` (marketing only, one line to widen) in a wrapping grid, so there is no cap on seats. Colour is live: blue needs you, teal working, grey idle, red last run failed; amber (in lead review) waits for step 4. Own script block at the end of `src/aios.html` (`window.renderHierarchy`, ids `hx*`, `data-hseat`); Roles is untouched. The **task trail** is under the chart: Chief of Staff (next, scheduled) > Lead (team task with no pieces yet, or all pieces done) > Agents (doing, or a team piece running) > Lead review (empty and dashed, not built) > Awaiting you (waiting, with a link to the review card). A task a desk has reworked after your bounce carries "Rework · round N". Clicking a desk opens it and filters the trail to that desk (team pieces count); click again or SHOW ALL DESKS to clear. Open work in step 4: give Lead review real tasks and the bounce loop (max 2 rounds, then escalate), then amber.
4. The lead review and bounce loop for Marketing. **Planned 4 Nov:** see `docs/lead-review-plan.md` (hook, task data, rules, files, tests, cost, five yes/no decisions). Not built; build it on Opus 5.5 high once the five defaults are confirmed.
5. Licence: draft the permission email to `aj@sahni.ai`, or map which AIOS files stand alone, as a clean-room inventory.
6. Commit only this work's files (`git status` also shows other people's unrelated changes).
