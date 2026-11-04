# Handover: build the lead review and bounce loop (4 Nov 2026, late evening)

Read this, then `docs/lead-review-plan.md` (the plan), then start. Earlier context: `docs/HANDOVER-4-nov-aios-office-v2.md`.

## Start here
1. Run on **Opus 5.5 · high** (multi-file change in `serve.mjs` and `check.mjs`).
2. **Ask Wesley the one yes/no first:** "Confirm the five defaults in `docs/lead-review-plan.md`?" He has not answered it. Yes = build as written. If he changes one, edit the plan's decision line, then build.
3. Follow the plan's build order: `leadreview.mjs` + checks, then the `serve.mjs` hook (switched off), then the AIOS trail and amber, then one watched live trial.

## Where things stand (all committed on `main`)
| Commit | What |
|---|---|
| `174cc5f` | Prompt engineer: `/api/prompt-engineer`, `src/promptbrief.js`, office panel card, AIOS "Ask the office" box on Overview |
| `7a918b5` | Hierarchy tab as a Roles copy (since replaced) |
| `3a6271d` | Hierarchy tab as a picture in the Overview hero look: prompt engineer > Chief of Staff > lead > desks (unlimited, read from the roster, `PILOT = ['marketing']`) |
| `5c477ee` | Five-stage task trail under the chart, click-a-desk filter |
| `947d245` | The lead review plan |

All AIOS work is in `src/aios.html`. The Hierarchy block is its own `<script>` at the end of the file (`window.renderHierarchy`, ids `hx*`, `data-hseat`, `hxt*`); `render()` calls it. The trail maps task fields to stages in `stageOf()` there: `next`/`scheduled` = Chief, team task with no pieces or all pieces done = Lead, `doing` = Agents, `waiting` = Awaiting you; stage 4 (Lead review) is empty and dashed until this build. `Rework · round N` is currently Wesley's `revisions`.

## Proven this session
- Office restarted; `/api/prompt-engineer` ran for real (28 to 93 s); the AIOS box sent a brief to the chief end to end.
- `npm run check` was 85/85 at every commit. One smoke test ("TEAM in the bar") failed once and passed on re-run; treat as flaky.

## Do not trip on these
- **Commit by hunk.** `serve.mjs`, `check.mjs`, `src/tasks.js`, `src/review.js`, `src/main.js`, `src/braingraph.js`, the motion-studio files, `motion.mjs`, `scripts/media-to-d.mjs`, `dist/command-centre-v2.html` and some docs hold other uncommitted work (permanently-reject toggle, motion/sound). Stage only your hunks: `git diff -U0 file > patch`, drop the other hunks, `git apply --cached --unidiff-zero`. Never `git add .` or `-a`.
- **`/src/*.js` is not served.** The browser cannot import `src/` modules; `aios.html` is one file with inline scripts.
- **Class names:** `.live` already styles the header dot; the trail arrows use `.flow`. `.seg button` has one generic click handler (sets `S[box.id]`, calls `render()`), so a new filter group needs an id and a default for `undefined`.
- **Testing the page:** a hash-only navigate does not reload (use `location.reload()` or add a query string). Freeze the 5 s refresh with `window.poll = () => {}` before faking tasks in `S.tasks`. Resize to 1905x920 and 390x844, then reset with the `desktop` preset. Test the real office route without sending real tasks: stub `fetch` for `/api/assistant` (a real send can add a task that starts after 20 s).
- **Restart the office:** it runs in a cmd window titled "Agents Office" (`npm start`). Restart only when no task is running (`/api/tasks`, all `done`).
- **Task states** are `next`, `scheduled`, `doing`, `waiting`, `done` (plus `closed: true`). Team tasks: `task.team.pieces[{agent, state}]`, `task.agent` is the lead.
- The Roles tab is untouched and Wesley rarely uses it; Hierarchy is the build surface (memory `aios-is-the-build-surface`).

## Next after this build
- Step 5 of the earlier handover: the licence (permission email to `aj@sahni.ai`, or a clean-room inventory of which AIOS files stand alone).
- Widen `leadReview.departments` beyond marketing only after the first five tasks' cost is checked in the Tokens tab.
- Later: the lead checks facts against the Brain (not in this build); Duet and Plaud One as intake at the prompt-engineer level; attachments in the AIOS "Ask the office" box.

## Start prompt for the new chat
> Read docs/HANDOVER-4-nov-lead-review-build.md and docs/lead-review-plan.md. Ask me the yes/no on the five defaults first, then build the lead review loop in the planned order.
