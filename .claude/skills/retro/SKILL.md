---
name: retro
description: "Retrospective on a coding session, or an audit of the always-loaded files (CLAUDE.md, MEMORY.md). Propose it with a yes/no when a session repeated a mistake or burned tokens, or when those files have grown."
---

<!-- Adapted from mattpocock/skills (MIT, Matt Pocock). See ../THIRD-PARTY.md. -->

The user has asked for a **retrospective**. You are suggesting improvements to the coding agent's **environment** to improve future runs. Suggest only: change nothing until the user approves each candidate.

## Steps

1. Call the Skill tool with `writing-for-agents` for the writing style guide.

2. Read the primary sources for the session the user specifies. Session logs are `.jsonl` files under `C:\Users\Wesley\.claude\projects\C--Users-Wesley-agents-office\`. If the user doesn't specify a session, default to the current one. For "audit the always-loaded files" with no session, measure instead: size of `CLAUDE.md`, `~/.claude/CLAUDE.md`, the memory `MEMORY.md` and `docs/INDEX.md` (`wc -c`), and run the `token-check` skill for the baseline.

3. Look for candidates for improvement in these categories.

- **Navigation**: how easy was it for the agent to find the right files? Are there hidden dependencies between files? Would a **navigation pointer** (a line in `docs/INDEX.md`) make it easier? _Use when_ the session took a long time to find a piece of information.
- **Automated checks**: are there automated checks that could catch errors the agent made? Read the repo's own check first (`npm run check`, `check.mjs`), so a check that already exists but sits unwired or silently broken is the finding, not a reinvention. There is no test suite and no CI here; a missing check for a mistake that recurred is a finding. _Use when_ the agent made a mistake an automated check could have caught.
- **Rules**: classify the violation first. A **mechanical** one (a fixed pattern, a banned call, a file-location rule) gets a deterministic check in `check.mjs`; default to building the check over writing the rule. Reserve prose rules for genuine **judgement calls**. _Use when_ the same mistake came back.
- **Steering files**: `CLAUDE.md` is pushed into every session, so it should hold navigation pointers and the rules that must always apply. Detail used by only some tasks (the roster, routines, connectors, Chief of Staff, Motion Studio, Blender) belongs in a doc or skill reached by a pointer. _Use when_ the file is large, here or in the global scope.
- **Tool economy**: did the agent make expensive tool calls that could be streamlined? Is any custom tooling (CLIs, MCP servers) particularly token-inefficient? _Use when_ the agent made an expensive tool call.
- **No-ops**: look for instructions in steering files that don't change the agent's behaviour. _Use when_ the steering files are large and unwieldy.
- **Information access**: look for ways to give the agent information it lacked (server logs, read-only access to a service). _Use when_ a crucial piece of information was not available.

4. Present these candidates to the user, in order of severity, each with the file, the lines, and the proposed move (to where) and the size it saves.

## Keep, always

Moving is allowed; deleting is not, for these. Propose where they would live, and keep a pointer in `CLAUDE.md`:

- The Telegram rules (allow-listed commands, the shutdown confirmation, the "not set up" answer).
- Email is never sent by an agent; approvals, sends, posts and payments stay with Wesley.
- The D: media rule and the "do not touch `src/` or `serve.mjs`" scope rule.
- The model-for-the-task line in the global `CLAUDE.md`.

## Reference

### Implementation vs Review

All work goes through two stages: implementation and review. The implementation agent has the most **context pressure**: exploration, writing code, debugging failures. The review agent receives a diff, so it needs no exploration. Reviewers (`/code-review`, the `verifier`) should carry the standards; the implementer should not have to hold them all.

### Files

- `CLAUDE.md`: pushed to the context window of every agent in this repo. Use it sparingly, mostly for **navigation pointers**.
- Docs: reference files pointed to by other files. Look for an existing doc before writing a new one.
- Skills: use skills for docs (their description goes into the agent's context window), or for user-invoked commands. Follow `writing-for-agents`.
