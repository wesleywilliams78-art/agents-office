# Handover: reviewing GitHub tools for the office (4 Nov 2026)

## Where things stand
Wesley is reviewing Claude Code GitHub repos to see if pulling them in improves outcomes on our actual work. Two done, more to come. Approach is in memory `github-tool-review-approach`; every decision goes to him as yes/no (memory `yes-no-proposals`, rule in `~/.claude/CLAUDE.md`).

## Decided
- **Superpowers (obra/superpowers):** not installed. Hook is safe, but its mandatory workflow (brainstorm, plan, TDD, subagents) clashes with "finished work from one prompt", we have no test suite, and its brainstorming skill fires on non-code creative work. One idea taken: `systematic-debugging` (merged with Pocock's, below).
- **Matt Pocock skills (mattpocock/skills):** plugin not installed (27 skills, half assume an issue tracker). Four lifted into `.claude/skills/` with MIT notices in `.claude/skills/THIRD-PARTY.md`: `grilling` (+ `grill-me`, typed-only), `retro` (made model-invocable so it can be proposed), `writing-for-agents` (+ `SKILL-MECHANICS.md`), and `systematic-debugging` (his red-loop + ranked hypotheses + tagged logs, plus Superpowers' three strikes).
- `.claude/agents/verifier.md`: now must show command output before PASS and confirm delegated changes in `git diff`.
- **Retro run on the always-loaded files.** Moved four sections out of `CLAUDE.md` into `docs/` unchanged (`chief-of-staff.md`, `motion-studio.md`, `blender-studio.md`, `site-updates.md`), pointers left in a "Feature guides" block, `docs/INDEX.md` updated. 30,948 to 23,007 bytes (about 2,000 tokens per session). `npm run check` 85/85. Original saved in the chat scratchpad as `CLAUDE.md.before-move`.
- **Memory index shortened** (10.8 KB to 8.7 KB), duplicate yes/no note merged into `yes-no-proposals`, five stale notes fixed (not merged). Backup: scratchpad `memory-before-condense`.
- Finding withdrawn: the handover nudge was installed 3 Nov 14:46, so the 970k-token sessions predate it.

## Not done / open
- Nothing from this chat is committed. Files: `.claude/agents/verifier.md`, `.claude/skills/*` (new), `CLAUDE.md`, `docs/INDEX.md`, the four new `docs/*.md`. (`docs/HANDOVER-4-nov-aios-office-v2.md` and `docs/prompt-engineer-draft.md` belong to another session.) `CLAUDE.md` already had uncommitted edits from others.
- The new skills have not been run on a real task. `grilling` may need "grill me" to fire; `writing-for-agents` adds a description to every session (make it typed-only if it fires too often).
- Retro leftovers, each a yes/no: check past transcripts for skills never invoked and disable them; add a size guard on `CLAUDE.md` to `check.mjs`; 32 of 56 memory-index lines are still over 150 characters.
- The Chief of Staff / Telegram `ask` do not yet propose skills in yes/no form (the Prompt Engineer already does yes/no for tasks).
- `scripts/release.mjs` ships `CLAUDE.md` but not `docs/`, so the pointers dangle in the public release (it already referenced unshipped files).
- Unread in the Pocock repo: `tdd`, `teach`, `research`, the repo's `scripts/`. Read but not adopted: `to-questionnaire` (worth a try for client fact-gathering), `wait-what` (needs a `GLOSSARY.md`), `handoff`.

## Rules Wesley gave this chat (all saved)
- Skills and decisions run on yes/no, he does not remember skill names.
- Do not judge our own setup too harshly or too well when reviewing a tool.
- Check dates and memory before reporting a problem.

## Start prompt for the next chat
"Continue the GitHub tool review from `docs/HANDOVER-4-nov-skills-review.md`. Next repo: <name>. Same approach as memory `github-tool-review-approach`."
