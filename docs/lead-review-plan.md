# Lead review and bounce loop: plan (4 Nov 2026)

Step 4 of `docs/HANDOVER-4-nov-aios-office-v2.md`. **Status 4 Nov (late): build order steps 1 to 3 done, defaults confirmed by Wesley, ships off; step 4 (the watched live trial) is next.** The reviewer's own `agentSystem` carries the lead's brief and skills; a bounced desk sees "Your department lead read your previous version…" (a small branch in `run()`). Build it on **Opus 5.5 · high** (multi-file change in `serve.mjs`).

**Update 4 Nov (night):** the loop is live for marketing. The review now has two reads (the desk's rules, then a world-class bar) and a one-line "dial" read for Wesley; its prompt is slim (about $0.25 a round, not $0.75); the persona is a Brain skill `lead-review` bound to `mlead`. Decision 4 is being reversed in the next build: the lead may propose one lesson per task, and only Wesley's yes writes it into a skill. See `docs/HANDOVER-4-nov-lead-lessons-build.md`.

**Update 8 Nov (Wesley): a missed target is never forwarded.** Every lead's review starts with READ 0, THE TARGETS: a number stated in the request, the desk's rules or skills (55 sources, 4,000 words), or the desk's own "not at the bar". A miss is never a pass: it goes back as rework naming the target, what was reached and routes not yet tried (the browser, Wayback, annual reports, more searches, or a better seat in the department via `to`). Target misses get `leadReview.barRounds` rework rounds (default 3, 1 to 5). A round that repeats an earlier route, or a rework that comes back unchanged, ends the loop. Wesley sees the task only when the target is met, or "exhausted": every route tried, what each gave, why no more, and a yes/no DECISION on how to go on (`decisionBlock`). Rule breaches still escalate after `maxRounds` as before. A desk's draft that says "not at the bar" is sent back even if the lead passes it. In `leadreview.mjs`; card wording in `src/aios.html`; checks in `check.mjs`.

## What it does
A desk finishes a draft. Before it reaches you, the department lead reads it against the brief. Pass: it goes to you marked "signed off by the lead". Bounce: the desk reworks it with the lead's feedback, up to **2 bounces**, then the lead escalates and you get it with the open concerns shown. The lead's sign-off is never approval to send; you still tick everything.

```
desk drafts -> lead reviews -> pass ------------------------------> Awaiting you (signed off)
                   | bounce (round 1, 2)
                   v
              desk reworks -> lead reviews again
                   | still bouncing after round 2
                   v
              Awaiting you (escalated, concerns shown)
```

## Where it hooks in
`runServerTaskNow` (`serve.mjs` ~731) calls `run(task, feedback, mode)` once and then post-processes the result (handoffs, filing, `NEXT:` line) before setting `state: 'waiting'`. The loop wraps that one `run()` call, so post-processing runs once, on the final draft:

```
const out = await runWithLeadReview(task, feedback, mode, answer)   // replaces the bare run() for non-approve turns
```

Nothing else in the waiting, approve, reject or learn paths changes. Wesley's reject still reruns the desk with his feedback; the lead loop then starts again from round 0 on the new draft. `task.revisions` stays "times Wesley sent it back".

## Task data (new, on the task)
`task.leadReview = { phase: 'review' | 'rework' | 'signed' | 'escalated', round: 0..2, by: <lead id>, log: [{ round, verdict, feedback, at }], open: '<last concerns>' }`. Saved with `persist(task)` at each change so the trail moves live. `task.state` stays `doing` while the lead reviews or the desk reworks, so the office UI and every existing path behave as today.

## When it applies (all must hold)
- `leadReview.enabled` and the task's department is in `leadReview.departments` (starts as `["marketing"]`).
- The task will wait for you (`needsOk` or `REVIEW_ALL`) and this is not an approve turn or an answer turn.
- The desk is not the lead itself, and it is not a team task (a team lead already writes the final from the pieces).
- The run did not error.

## The review itself
- New `leadreview.mjs`, pure and testable: `applies()`, `reviewPrompt()`, `parseVerdict()`, and `runLoop({ task, review, rerun, max })` with the model calls injected.
- One short model call per round through `askX`, **no tools**, the lead's own system prompt (`agentSystem`, as `runTeamLead` does) plus "you are reviewing a desk's draft, not writing it". Inputs: the task text (which carries the brief's acceptance checks), the draft, the desk's name and role.
- Output: `{ verdict: 'pass'|'bounce', feedback, checks: [{check, met}] }`. The lead may bounce only for an unmet acceptance check, a number or claim the desk did not read in a note, a breach of the department's skill or house rules, or the wrong format or length. Not taste.
- Feedback to the desk is prefixed "From the lead, round N:" and goes in through the existing `feedback` argument.
- If the verdict cannot be read, fail open: treat as pass, note "lead review could not be read", so a draft never stalls.
- Limit: the lead checks the draft against the brief and rules, not against the Brain, so it cannot catch a wrong fact it did not read. That is a later upgrade.

## What changes where
| File | Change |
|---|---|
| `leadreview.mjs` (new) | the functions above |
| `serve.mjs` | read `cfg.leadReview`; the `runWithLeadReview` wrapper (about 25 lines); append "Signed off by X after N round(s)" or "Escalated: <concerns>" to `task.ask` |
| `office.config.json` | `"leadReview": { "enabled": false, "departments": ["marketing"], "maxRounds": 2, "model": "sonnet", "effort": "medium" }` |
| `check.mjs` | tests with a fake model: pass first time; bounce then pass; bounce twice then escalated at round 2; unreadable verdict passes; lead's own task and team task skipped; `enabled: false` changes nothing |
| `src/aios.html` | trail: `review` phase fills Lead review; `rework` stays in Agents with "Rework · lead round N"; `signed` and `escalated` land in Awaiting you with a tag. Amber (in review) for the stage, the lead node and desks in rework. Lead review column loses its "not built" text |
| docs | `docs/INDEX.md` pointer, handover step 4 |

Not touched: `src/tasks.js`, `src/review.js`, the office UI, the learn path. `serve.mjs` and `check.mjs` carry other uncommitted work, so commit by hunk as before.

## Cost
One extra short call per round, no tools; the worst case is 3 reviews and 2 extra desk runs on one task. Tokens tab shows it as its own kind of run (`lead-review`). Check the real figure after the first five tasks before widening past marketing.

## Build order
1. `leadreview.mjs` and its checks (no model needed).
2. The hook in `serve.mjs`, with `enabled: false`.
3. The AIOS trail and amber, tested with faked phases as before.
4. One watched live trial: a real marketing task with it switched on, then leave it on for marketing.

## Decisions (yes/no; each default is what the plan above assumes)
1. **Marketing only, desk work that waits for you; not the lead's own tasks, not team tasks.** Yes: as written. No: you name the scope.
2. **Review on Sonnet 5.5 at medium, no tools.** Yes: cheap and quick. No: it uses the lead's own model and effort, which costs more.
3. **Two bounces, then escalate to you with the concerns shown, never auto-reject.** Yes: as written. No: you pick another limit.
4. **The lead's bounces teach nothing.** Only your rejections write lessons to a desk. Yes: as written. No: lead feedback also feeds the lessons file. *Reversed 4 Nov (night), with Wesley's yes: the lead may propose one lesson per task, and only his yes on the AIOS card writes it (`leadlessons.mjs`).*
5. **Ships switched off, turned on for marketing after one watched trial.** Yes: as written. No: on from the first commit.
