---
name: systematic-debugging
description: Use when the user says "diagnose" or "debug this", or something is broken, failing, crashed or slow and the cause is not obvious, or a first fix has already failed. Covers `npm run check` failures, jobs, renders and the listener, LTX, media and connector pipelines. Build a red loop and find the root cause before proposing another fix.
---
# Systematic debugging

Merged and cut down for this repo from mattpocock/skills `diagnosing-bugs` (MIT, Matt Pocock) and obra/superpowers `systematic-debugging` (MIT, Jesse Vincent). See `../THIRD-PARTY.md`. A one-line typo does not need it.

**Rule: no fix until you can name the cause, with evidence from a loop that goes red on this bug.**

## Redact
Show commands and output, but write `<REDACTED>` for every token, key, chat id or password (Telegram, Google, Stripe and the like). Run loops against env vars so the secret never appears in what you show. If redacted output is not enough, say so and ask.

## 1. Build a red loop (the skill)
Get one command, already run once, that goes red on the user's exact symptom, and is fast (seconds), repeatable and runnable unattended. Not "runs without erroring": it must catch this bug. Try, in order:

1. A case in `check.mjs`, or a Node script with a fixture input.
2. An HTTP call to the running server (`curl` against `localhost:4520`).
3. A headless-browser script (Playwright) asserting on DOM, console or network.
4. Replay a captured payload, log or job file through the code path alone.
5. A throwaway harness: the smallest slice of the system that hits the path.
6. Repeat the trigger 100 times for a flaky bug, until the failure rate is high enough to work with.
7. `git bisect run` when it broke between two known states; or run old and new side by side and diff.
8. Last resort: ask Wesley for one exact observation at a time.

Then tighten it: faster, sharper (assert the symptom itself), more deterministic (pin time, seed, isolate files). If no loop can be built, stop, list what you tried, and ask for access, a captured artifact, or permission to add temporary logging. Do not theorise without a loop.

Before building one, check memory and `docs/INDEX.md` for a known signature (LTX 410 = GPU down; a deaf Telegram listener). Check what changed: `git diff`, config, the D: drive, sleep or reboot.

## 2. Reproduce and minimise
Watch it go red. Confirm it is the user's failure, not a neighbour. Then cut inputs, steps and config one at a time, re-running after each cut, until every remaining piece is load-bearing.

## 3. Hypothesise
Write 3-5 ranked hypotheses before testing any. Each one predicts: "If X is the cause, changing Y makes it vanish." No prediction, no hypothesis. Show the list to Wesley first; do not block on it if he is away.

## 4. Instrument
One variable at a time, each probe tied to a prediction. Prefer a debugger or REPL, then targeted logs at the boundaries that separate the hypotheses; never "log everything and grep". Tag every debug line `[DEBUG-xxxx]` so cleanup is one grep. For slowness, measure a baseline first, then bisect.

## 5. Fix and lock it in
Turn the minimised repro into a failing check at a seam that exercises the real bug (a check at the wrong seam gives false confidence; no good seam is itself a finding, so say so). Watch it fail, apply one change with no "while I'm here" edits, watch it pass, then re-run the original loop. Delegated work: confirm in `git diff`, not from the agent's report.

## 6. Clean up
- Original loop no longer goes red; `npm run check` read in full.
- `[DEBUG-` prefix grepped and removed; throwaway files deleted.
- The confirmed cause is stated in the commit or the reply, so the next debugger learns.

## Three strikes
After three failed fixes, stop. Say what each revealed, ask whether the design is wrong (shared state, coupling, a step that cannot work as built), and talk to Wesley before a fourth.

## Back to step 1 if you think
"Quick fix now, investigate later" · "just try X" · "it is probably X" · "one more attempt" after two failures · each fix exposes a new problem elsewhere.

## Hard limits
- If D: is missing, stop and tell Wesley; media folders are never recreated on C:.
- Never fail a plugin or service on purpose to test a theory.
- Never report "no root cause" without writing down what you checked.
