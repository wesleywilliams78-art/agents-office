# Handover, 7 Nov 2026: Delivery named and skilled, Fitz the fit-out desk, Theo attachments, headless fix

## Where things stand
- **Delivery is fully set up.** Every desk has a first name, a headshot (`assets/people/<id>.png`, Canva generate-image, the 7 Nov prompt pattern), a job line, a brief and a skill of its own. No TO BRIEF badge.
  - Owen (dlead, lead), Priya (pco), Quinn (qa), Marcus (crep), Cassie (cass), Dina (dasst), Bea (ona).
  - Names, briefs, job lines and tools are in `office.agents.local.json` (gitignored). Portraits are committed (6cc8282, 2d1743d).
  - New skills in the Brain: `drive-filing` (Cassie), `document-from-master` (Dina), `client-onboarding` (Bea).
- **Fitz (fit, FIT-OUT)** is an AIOS desk under Owen (`<brain>/Agents Office/aios-desks.json`). Portrait `assets/people/fit.png`.
  - Skill `layout-review` with a report template.
  - Evidence base is four Brain notes, each under the 9,000-character pin cap: `70-Delivery/layout-canon-flow.md`, `layout-canon-quick-service.md`, `layout-canon-coffee-and-restaurant.md` and `layout-canon-uk-rules.md`.
  - Built on the published canon (FCSI and FE&S, FSA, Reg. 852/2004, Approved Documents B, H and M, La Marzocco, US drive-thru studies), not one named person: Wesley chose this after research found nobody who stands out.
- **Theo's ask bar takes attachments** (📎, drop or paste). Each file goes through `/api/upload` into the Brain, and the note travels to the Prompt Engineer and the Chief of Staff in the `attachments` field (src/aios.html, commit e06456c).
- **Drawings get a floor-plan read on upload** (serve.mjs `DRAWING_PROMPT`, `DRAWING_NAME`, `DRAWING_TEXT`).
  - A PDF named like a drawing, or with a title block or scale, of 8 pages or fewer goes to vision. The layout read comes first and the text layer follows.
  - Images and scans get the same read when they are plans.
- **Headless fix** (d1a4e85): every office `claude -p` run passes `mcp.HEADLESS` (`--append-system-prompt`), so Wesley's global "model for the task" line stays out of desk results.
  - 32 old task results carry it. They were left as they are.
  - `--setting-sources` does not exclude `~/.claude/CLAUDE.md`, so don't rely on it.
  - The global CLAUDE.md also now says the rule is for interactive chats only.

## Next
1. **First Fitz test (2 minutes):** in the office, type "Fitz, review the layout in `Upload - Test QSR layout - mw7115lt` as a QSR with drive-thru", or attach a real plan with 📎. Read the result against `layout-review/template.md`. Fold any correction into the skill.
2. **Deepen the canon:** the Metric Handbook restaurant chapter (UK m² per cover), and the Birchfield & Sparrowe and Katsigris & Thomas space chapters. Only their contents pages were read. Gaps are listed at the end of `layout-canon-coffee-and-restaurant.md`.
3. **Name and photograph the next department,** one per round, as a yes/no: Emails, Sales, Operations, Finance. Use the same pattern: a name that nods to the job, a matching headshot, a brief and a skill where the badge says so.

## Files
- Research master (full 26,800-character version with all sources): `C:\Users\Wesley\AppData\Local\Claude-Data\claude_pzs8sxrjxfjjc\side-session-notes\local_327e8fea-1c75-43bf-9eb8-a8742b86b749\layout-canon-research.md`
- Test drawing: the scratchpad `drawtest/Test QSR layout.pdf` from that session. Its upload note is in the Brain `Agents Office/` folder.
- Other sessions' uncommitted edits to `src/aios.html` (Tokens tab `deskLabel`) and `docs/INDEX.md` were left alone.
