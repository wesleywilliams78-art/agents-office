---
name: doubt-driven-development
description: Use before an irreversible or non-obvious step in the office: a release (`release.mjs --push`), deleting, moving or migrating files or data (`storage.mjs`, `media-to-d.mjs`, `data/*.json`), a change to what agents may send, post or pay, or a claim like "this is safe" that nothing yet proves. Propose it with a yes/no first. A fresh-context reviewer tries to disprove the decision before it stands. Not for renames, formatting, reading or one-line fixes.
---
# Doubt-driven development

Adapted for this repo from addyosmani/agent-skills `skills/doubt-driven-development` (MIT, Addy Osmani). See `../THIRD-PARTY.md`. This is a check on a decision before it stands. `verifier` checks a result afterwards; `/code-review` judges a finished change.

**Rule: the reviewer gets the artifact and the contract, never your conclusion or your reasoning, and is told to disprove, not approve.**

## Steps
1. **Claim.** Write the decision in two or three lines, and why it matters. If you cannot, you have a hunch, not a decision.
   `CLAIM: moving output/library to D: loses nothing. MATTERS: the only copy of finished reels.`
2. **Extract.** The smallest reviewable unit: the diff, the command with its real paths, or the proposal in 3 to 5 sentences. Add the contract it must satisfy (what must stay true). Include any caller, guard or test that cuts against the claim. Strip your reasoning. If it is more than one read, split it.
3. **Doubt.** Start a fresh-context subagent (`general-purpose`, told to read and not edit). Prompt, verbatim:
   > Adversarial review. Find what is wrong with this artifact. Assume the author is overconfident. Look for unstated assumptions, edge cases not handled, hidden coupling, ways the contract could be broken, conventions it may break, failures under unexpected input. Do not validate or summarise. List issues, or say plainly you found none after a thorough look.
   > ARTIFACT: … CONTRACT: …
   Do not pass the claim. Ask for "issues that would make this fail the contract", so it does not nitpick.
4. **Reconcile.** You stay in charge. Re-read the artifact against each finding, then classify, first match wins: *contract unclear* (fix the contract, go again); *real and fixable* (fix it, go again); *real but accepted* (say the trade-off to Wesley); *noise* (the reviewer lacked context; note it).
5. **Stop** when findings are trivial or already considered, after **two** rounds (then show Wesley what is still open), or when Wesley says go.

## Rules
- Only for non-trivial steps: new branching logic, anything crossing a module, a claim the code cannot prove, or an effect that cannot be undone. Do not doubt every keystroke.
- Never run it from inside a subagent, or in a routine or scheduled run: flag the open question for Wesley instead.
- Do not send the artifact to any outside tool or service for a second opinion. It stays on this machine.
- Do not re-run on an unchanged artifact. Do not treat the reviewer as the verdict: disagreement is information.
- Warning sign: two rounds with real findings and none you acted on means you are validating, not doubting. Stop and tell Wesley.
- Say in the reply what was doubted, what was found, and what you did about each.
