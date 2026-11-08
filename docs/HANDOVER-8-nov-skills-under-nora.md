# Handover: Skills under Nora (8 Nov 2026)

## Where things stand
- Built and committed in `2a14c83` (not pushed). The SKILLS tab has left the AIOS bar. Nora's Office card has a Skills line ("N suggestions waiting · M never used"). It pulls up the Skills sheet, the Brain sheet's way. `#skills` opens it.
- Every skill suggestion is a yes/no that carries the exact `SKILL UPDATE` edit (`skillupdates.mjs`). The modes are add-rule, replace-text, replace-section, append and create.
  - A yes applies the edit and backs up the old file first: `data/brain-backups/skill__<name>__<file>.<time>.bak`.
  - A no is remembered in `data/skill-proposals.json` (`declined`) and is never offered again.
  - Guards: only `<brain>/Agents Office/skills/`, the loader limits (6,000 / 4,000 / 8,000), front matter name and desk ids kept valid, no secrets.
- Two ways in:
  - SUGGEST A REVISION on a skill card, then APPLY: `/api/skill-audit/answer`.
  - A DECISION on any desk's review card that carries SKILL UPDATE blocks: `skillDecision()` / `answerSkillDecision()` in `serve.mjs`.
- Brian's work:
  - His routine `skills-review` runs Fri 16:00 (ops, waits for review).
  - His skill `skills-review` and its `template.md` live in the Brain.
  - His read-only tool `skill_audit` is in `connectors/brain-reader`.
- Proven 8 Nov: RUN NOW gave one edit (creamy-sop). Wesley approved it. The skill changed and the backup exists.
- Checks: `npm run check` 102/102, including yes with backup, no writes nothing, limits and paths refused, and create + replace-section.
- Screenshots: `output/aios-mockups/shots/skills-sheet/`.

## Decided
- Nora owns how the office works, so skills sit under her. Brian does the weekly legwork; his Sunday Brain audit is unchanged.
- A suggestion must never bounce back to Wesley as text to copy. A yes gets the change made.

## Open, next
1. Brian's first write-up opened with "copy these blocks into Claude Code" for two jobs:
   - Wiring Chrome to mlead, gfx, qa and crep, and Plaud to ada.
   - Moving detail out of seven near-limit skills.
   The cause is the house-style skill `claude-code-prompt`, which is bound to everyone. The moves can now be yes/no edits: the `create` mode was added after his run. The wiring waits on the `cc-box` session's `to: claude-code` decisions (uncommitted when this was written).
2. A second RUN NOW of `skills-review` should now put the seven moves on the card as yes/no. Check that it does, and that no "copy this" block comes back.
3. Old text-only suggestions in `data/skill-proposals.json` (`text` without `pending`, six skills) no longer show. Clear them or leave them.

## Files
`skillupdates.mjs`, `skillaudit.mjs`, `serve.mjs` (skill-audit routes, skillDecision), `decisions.mjs`, `src/aios.html` (skillSheet, renderSkills, Nora's skLine), `src/review.js`, `connectors/brain-reader/mcp.mjs`, `check.mjs`.
Brain: `Agents Office/skills/skills-review/`, `Agents Office/routines.json`.
Memory: `aios-chief-of-staff-centred.md`.
