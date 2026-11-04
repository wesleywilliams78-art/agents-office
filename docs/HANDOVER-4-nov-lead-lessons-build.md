# Handover: lead-proposed lessons (4 Nov 2026, night)

Read this, then `docs/lead-review-plan.md`. Earlier context: `docs/HANDOVER-4-nov-aios-office-v2.md`, `docs/HANDOVER-4-nov-lead-review-build.md`.

## Start here
1. Run on **Opus 5.5 · high** (new module, an endpoint in `serve.mjs`, a card in `src/aios.html`).
2. **Ask Wesley the one yes/no first:** "Confirm the six defaults below?" He has agreed to the idea ("the lead proposes a lesson, I say yes or no, the skill updates") but not these details. Yes = build as written; if he changes one, edit the decision line here, then build.
3. Build order: `leadlessons.mjs` + checks (no model), then the verdict field and the `serve.mjs` endpoint, then the AIOS card, then one watched live trial.

## What is built and live (uncommitted, see "Commit by hunk")
| What | Where |
|---|---|
| Lead review and bounce loop, on for marketing (`leadReview.enabled` in `office.config.local.json`; ships off in `office.config.json`) | `leadreview.mjs` (new), `runWithLeadReview` + `reviewSystem` in `serve.mjs` |
| Two reads in the review: the desk's rules, then a world-class bar ("would this move the dial for Wesley"); the lead's one-line `dial` read shows on the card | `reviewPrompt` in `leadreview.mjs` |
| Slim review prompt: lead's brief, the desk's rules (brief, skills, lessons), company notes, the desk's non-upload notes at 4,000 chars. No uploads, no lead skills | `reviewSystem` in `serve.mjs` |
| Persona skill `lead-review` bound to `mlead`: a panel of voices by discipline, three or four lenses per piece, principles as tests, never imitation | Brain: `Agents Office/skills/lead-review/SKILL.md` (4,448 chars). `reviewSystem` loads any skill of that name bound to the lead |
| AIOS Hierarchy: Lead review stage filled, amber (`--hx-rev`) for the lead node and a desk in rework, badges (signed off, escalated, lead rework), open concerns on the card | `src/aios.html` |
| Note picker no longer pulls long uploads in on common words (separate session) | `pickNotes` in `pins.mjs`, called from `relevantNotesBase` |
| Tokens tab labels the run kind `lead-review` | `tokens.mjs` |

## Proven live (marketing hooks task, same text each time)
| Trial | Desk | Lead review | Task total | Lead's verdict |
|---|---|---|---|---|
| 1, first build | $0.78 | $0.75 | $1.52 | pass |
| 2, review slimmed | $0.70 | $0.24 | $0.94 | pass, said four hooks were "plain and safe" and accepted them |
| 3, persona skill + picker fix | $0.35 | $0.25 | $0.60 | pass, dial line named the two strongest hooks and why |

Not yet seen live: a **bounce**, the rework, and an escalation. They are covered by the fake-model checks (`lead review: scope, verdicts…` in `check.mjs`) and by faked phases on the AIOS page only. Strictness of the persona is therefore unproven: trial 3 passed a better draft; it did not reject a weak one. Writing a deliberately weak task would test it.

## Next build: lead-proposed lessons (defaults to confirm)
The idea: when the lead bounces a draft, or passes one with "could have done better", it may add **one proposed lesson** to its verdict. Wesley gets a yes/no card from the lead ("Marketing Lead suggests adding this rule to `linkedin-posts`: …. Tell ADA to adopt it from now on?"). A yes writes it into the skill. This reverses decision 4 of the plan ("lead bounces teach nothing") but only Wesley's yes writes anything.

Existing parts to reuse: `learn.mjs` (corrections → `feedback/<agent>.md`, standing rules read before every task); the skill audit proposals (`proposeFromRejection`, `makeProposal`, `/api/skill-audit/*` in `serve.mjs`), which today wait in the Skills tab for Wesley to apply by hand; `data/brain-backups/` and `brainnotes.mjs` for the backup pattern.

1. **One lesson per task, general.** The lead states one short imperative rule, no client names, no figures, and names the skill it belongs in. Verdict JSON gains `"lesson":{"skill":"<name>","rule":"<sentence>"}`, optional.
2. **Target:** the non-shared skill the desk followed (`task.skills`), as `proposeFromRejection` picks it. A shared skill (`everyone`, e.g. `house-style`) is allowed but the card says it affects every desk. No fitting skill: the rule goes to the desk's standing rules via `learn.record`.
3. **Apply is deterministic, no model call:** append `- <rule> (lead, <date>)` under the skill's `## Rules` heading in `<brain>/Agents Office/skills/<name>/SKILL.md`. Back up the old file to `data/brain-backups/` first. Refuse, and say why on the card, if the body would pass 6,000 characters. Skip a rule already present.
4. **Where Wesley sees it:** a card on the task in the AIOS Hierarchy tab (the Awaiting you column) and in the task's ask line; buttons call a new `POST /api/lead-lesson` with `{ task, decision: 'yes'|'no' }`. Not from Telegram.
5. **State:** `task.leadReview.lesson = { skill, rule, status: 'proposed'|'applied'|'declined', at }`. A declined rule is not proposed again for that task.
6. **On with the loop** (marketing), since nothing is written without his yes.

Checks to add: the verdict parses a lesson and drops a malformed one; a lesson naming a client or a number is refused; apply appends once, backs up, respects the cap, skips a duplicate; a shared skill is tagged; `no` writes nothing; no skill falls back to `learn.record`.

Open question for later: should Wesley's own rejections use the same apply button (today they only create a suggestion to apply by hand)? Same endpoint would serve both; not in this build unless he asks.

## Do not trip on these
- **Commit by hunk. Nothing from this session is committed.** `serve.mjs`, `check.mjs` and `src/aios.html` hold this session's work, the other session's picker hunks, and older uncommitted work (permanently-reject toggle, motion and sound, `src/tasks.js`, `src/review.js`, `src/main.js`, `src/braingraph.js`, the motion-studio files). Stage only your hunks: `git diff -U0 file > patch`, drop the other hunks, `git apply --cached --unidiff-zero`. Never `git add .` or `-a`. New files to add: `leadreview.mjs`, `docs/HANDOVER-4-nov-lead-lessons-build.md`. `pins.mjs`, `tokens.mjs`, `office.config.json` and the three docs edited today are this session's alone. `office.config.local.json` is ignored by git.
- **Persona and skills live in the Brain**, not the repo (`C:\Users\Wesley\Agents Office Brain\Agents Office\skills\`). Skills reload before every task, so no restart for a skill change. A restart is needed for `serve.mjs` changes.
- **Restart the office** only when no task is running (`/api/tasks`, all `done` or `waiting`): kill `node serve.mjs` and its `npm start`, then start `cmd /k "title Agents Office && cd /d C:\Users\Wesley\agents-office && npm start"`.
- **Three trial tasks are waiting on Wesley** (`mw2owmotg3t8`, `mw2p8dj43vqx`, `mw2pv5ziwkqn`), duplicates of the same hooks task. They send nothing; he can reject two. Do not approve them for him.
- **Flaky checks:** "SOP builder … imrans-diner did not build" failed once on a LibreOffice conversion and passed on re-run; "TEAM in the bar" flaked once earlier. Re-run before treating either as real. Last full run: all passing except as noted.
- **Testing the AIOS page:** `/aios?v=1#hierarchy`; freeze the 5 s refresh with `window.poll = () => {}`, fake `S.tasks` including `leadReview: { phase, round, by, open }`, call `render()`. A hash-only navigate does not reload.
- **Cost:** the lead review is about $0.25 a round and a desk rerun is the desk's full cost, so a task that bounces twice is roughly four times a plain one. Check the Tokens tab (kind `lead-review`) after the first five real tasks before widening `leadReview.departments` past marketing.

## Later (not in this build)
- The lead checks facts against the Brain (today it checks the request, rules, and the notes the desk read).
- Widen the loop to other departments once the cost is known; each lead needs its own `lead-review` skill and persona.
- The licence step from `docs/HANDOVER-4-nov-aios-office-v2.md` (permission email to `aj@sahni.ai`, or a clean-room inventory of which AIOS files stand alone).
- Duet and Plaud One as intake at the prompt-engineer level; attachments in the AIOS "Ask the office" box.

## Start prompt for the new chat
> Read docs/HANDOVER-4-nov-lead-lessons-build.md and docs/lead-review-plan.md. Ask me the yes/no on the six defaults first, then build the lead-proposed lessons in the planned order.
