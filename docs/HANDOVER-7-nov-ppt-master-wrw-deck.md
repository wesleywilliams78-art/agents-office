# Handover, 7 Nov 2026: PPT Master review and the wrw-deck skill

## Where things stand
- PPT Master (hugohe3/ppt-master v6.8.0, MIT) was reviewed, trialled on the Kenya Issue 04 report and **not adopted**. Built-in `pptx` skill beat it on time and layouts (full numbers in memory `github-tool-review-approach`).
- Built our own skill instead: `.claude/skills/wrw-deck/` (SKILL.md, wrw-deck.cjs, example.cjs, render.py). **Committed as 5d94aa6. Not pushed** (`git push fork main` when wanted).
- Engine: pptxgenjs 4.0.1 (MIT) in `C:\Users\Wesley\tools\pptxgenjs`, not in the repo. Scripts are `.cjs` because the repo is ES-module.
- A fresh session built the 12-slide Kenya deck from the skill alone: 171k tokens, 36 calls, ~5 min, 1 chart + 3 tables, notes on all slides. `npm run check` 93/93.

## Decided
- WRW decks go through `wrw-deck`: one accent colour per deck (red `FF3131`, a country's flag colour, or the client's), Georgia headings, Arial body, nothing under 11 pt, native charts and tables, notes on every slide, house © line on the last slide via `close()`.
- Office agents cannot use it (no shell); only Claude Code can.

## Not done / open
- The WRW chip is a text outline, not the red wordmark (`assets/brand/WRW-logo-red-on-white.svg`).
- Decks were checked in LibreOffice only, never opened in PowerPoint.
- System `python` has no python-pptx; count objects from the zip or use a scratch venv.
- The Kenya PDF in `videos/franchise-entry-report/issues/04-kenya/` has no Harley/QSR disclosure line that its `ISSUE.md` requires. Not our decks' fault; the report needs it before 13 Nov.
- Other uncommitted work in the tree (THIRD-PARTY.md, CLAUDE.md, check.mjs, serve.mjs, dist/, `cold-reader` skill) is not from this chat.

## Where the files are
- Skill: `.claude/skills/wrw-deck/`. Trial decks and renders (scratch, may be cleared): `C:\Users\Wesley\AppData\Local\Temp\claude\2a91e41da8133fe5\942217d5-fdb5-4090-bf8c-24db26d4c911\scratchpad\{pptm-trial,wd,wd2}`.
- Review notes: memory `github-tool-review-approach` (PPT Master, comparison and wrw-deck entries at the end).

## Start prompt for the new chat
> Read docs/HANDOVER-7-nov-ppt-master-wrw-deck.md. Then use the wrw-deck skill to build <the deck>. Ask me only for the source and the accent colour.
