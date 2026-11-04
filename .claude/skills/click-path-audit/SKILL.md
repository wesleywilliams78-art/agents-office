---
name: click-path-audit
description: Use when a button, tab or toggle in the office UI does nothing or leaves the screen in the wrong state, and reading the code finds no missing handler or error. Also after a refactor that touches shared UI state in src/aios.html, src/main.js, src/tasks.js or src/review.js. Traces each handler call by call to find steps that undo each other, race, or never reach the real action.
---
# Click-path audit

Adapted for this repo from affaan-m/ECC `skills/click-path-audit` (MIT, Affaan Mustafa). See `../THIRD-PARTY.md`. Not for API bugs (use `systematic-debugging`) or styling.

**Rule: judge the final state against what the button label promises, not against whether each function works.** Each function can be correct while the click still does nothing.

## Where state lives here
- `src/aios.html`: one shared object `S` (tab `cat`, filters `rShow` `mShow` `nShow` `kShow`, sets `openSeat` `openItem` `proposing`, flag `busy`), changed by handlers that then re-render.
- `src/main.js`, `src/tasks.js`, `src/review.js`: module variables, DOM classes and values from `/api/*` responses.
Re-read the real files; do not trust this list.

## Steps
1. **Scope.** One tab or one panel, or the handlers a change touched. A whole-app audit is expensive; do it only before a release, one section at a time.
2. **Map side effects first.** For every function that writes shared state, write `name → sets {…} resets {…}`. Mark any function that clears state it does not own (a render that rebuilds a list and drops `openItem`, a tab switch that resets a filter, a refresh that clears `busy`).
3. **Trace each touchpoint** (button, tab, toggle, form submit, poll tick): list its calls in order. For each call: what it reads, what it writes, what it resets, whether it is async.
4. **Check the six patterns:**
   - *Sequential undo*: a later call resets what an earlier call set.
   - *Async race*: two fetches or timers write the same field; the last to resolve wins.
   - *Stale value*: a handler or timer uses a copy of state taken before an `await`.
   - *Missing transition*: the label says Save, Send or Approve but the handler only validates or sets a flag, or calls an endpoint that no longer exists (check the route in `serve.mjs`).
   - *Dead branch*: an `if` whose condition is always false at that point.
   - *Interference*: a poll, interval or render that overwrites a value the click just set.
5. **Say what the user sees.** For each touchpoint, one line: expected, actual, verdict.
6. **Prove it.** A suspected bug is a hypothesis until it is seen: click it in the preview browser (or script the click) and read the DOM or `S` afterwards. Follow `systematic-debugging` to fix.

## Report, one per bug
```
CLICK-PATH-NN [CRITICAL/HIGH/MEDIUM/LOW]
Touchpoint: <label> in <file:line>
Pattern: <one of the six>
Trace: 1. call → sets … / 2. call → RESETS … ← conflict
Expected / Actual:
Fix: <specific>
```

## Rules
- Read-only until Wesley says to fix. Report first.
- Never click anything that sends, posts, pays or approves during the audit. Trace those by reading only.
- Do not report a pattern you did not see in the code or on screen.
- Say which touchpoints you did not trace.
