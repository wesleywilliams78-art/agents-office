# Handover, 4 Nov 2026: GitHub tool review done, AIOS Brain tab built

Follows `docs/HANDOVER-4-nov-skills-review.md`. Everything below is committed as `9b1d1cb` and pushed to `fork main`.

## Done in this chat

**GitHub tool review** (memory `github-tool-review-approach`), five repos:

| Repo | Verdict | Taken |
|---|---|---|
| ECC (affaan-m) | Mostly duplicates what we have | `click-path-audit`, `config-gc` skills (MIT) |
| Karpathy skills | Four rules worth having | Folded into `CLAUDE.md` "Code changes" |
| Ponytail | One rule worth having | "Grep every caller" rule in `CLAUDE.md` |
| Agent Skills (addyosmani) | One skill fills a gap | `doubt-driven-development` skill (MIT) |
| Graphify | Code-first, Python, LLM pass for docs; not installed | Built our own Brain map instead (below) |

- MIT notices for all lifted skills: `.claude/skills/THIRD-PARTY.md`.
- `config-gc` was run once. It removed the `openwa` MCP server. Backup and log: `C:\Users\Wesley\.claude\_gc_trash\2026-11-04\` and `_gc_trash\gc_log.md`.
- `CLAUDE.md` gained the git remotes warning: push only with `git push fork main`.

**AIOS Brain tab** (left menu, BRAIN):
- `brainmap.mjs` `analyse(m)` computes hubs, bottlenecks, clusters, crossing strands, unlinked notes, notes with no strand, and the notes the office's task notes used in the last 14 days.
  - Bottlenecks are betweenness: the share of shortest paths between other notes that run through a note. Clusters use Louvain.
  - It runs locally with no model, in about 6 ms.
- `serve.mjs`: `/api/brainmap` now carries `analysis` and is cached for 20 s.
- `src/aios.html`: section `#brainSec`, `.bm-*` CSS, and the final script `window.brainTab`. It draws a canvas force map you can colour by strand or cluster, search, drag, pan and zoom, with a LOCAL GRAPH view. Toggles: UNLINKED, STRANDS, DESKS, TASK NOTES. The side panel shows the selected note and the insights.
- `check.mjs`: a "brain map analysis" step runs on a small test vault and must give the same answer every run.
- Checked in the browser at 1905×920. `npm run check` passed 89/89.
- On the live Brain it found:
  - hubs `index` (14 links), `MOC-Marketing`, `MOC-Sales`, `numbers-ledger`;
  - bottlenecks `index` and `MOC-Marketing` (about 10% of paths each);
  - 13 clusters, 8 crossings (for example `billing` → `personal-budget`), 47 unlinked notes and 22 notes with no strand.

## Not done yet

- **Restart the office** (`npm start`). Until then the live AIOS Brain tab draws the map but the insight lists stay empty.
- Escape does not clear the selected note; clicking an empty part of the map does. Not wired, on purpose.
- `src/braingraph.js` says 607 notes in its header, but the live Brain has 106. Not traced.
- **Another session's uncommitted work.** It is the lead lessons and motion studio work:
  - `leadlessons.mjs` and `connectors/motion-studio/*`;
  - the `.hxt-*` hunks in `src/aios.html`, plus hunks in `serve.mjs` and `check.mjs`;
  - `docs/lead-review-plan.md` and others.

  That session commits it, not this one.
- The earlier `npm run check` failures on the TEAM smoke test and the SOP builder came and went. They passed on re-run and were not investigated.

## Open items (each one is a yes/no to put to Wesley)

1. Fold an "out of scope" step into the `grilling` skill.
2. Investigate the flaky TEAM and SOP checks (`systematic-debugging`).
3. Re-check the design-pack skills around 2 Dec.
4. Shorten the 33 long lines in the memory index (`MEMORY.md`).
5. Add a `CLAUDE.md` size guard to `check.mjs`.
6. `release.mjs`: the `docs/` pointers dangle in the public release.
7. A one-off Graphify trial on the code (not the Brain), if ever wanted.
8. An "open in Obsidian" link on the Brain tab's selected-note card.
9. Act on what the map shows: link the 47 unlinked notes, give the 22 notes with no strand a strand, and decide whether the 8 crossings (for example `billing` → `personal-budget`) should stay.

## Rules carried forward

- Every decision is a yes/no with my recommendation first, one skill per question.
- Push only with `git push fork main`. `origin` is AJ Sahni's repo.
- Another session may be editing `src/aios.html`. Stage only your own hunks: `git diff -U0`, filter, then `git apply --cached --unidiff-zero`.
- New features go in `src/aios.html` (memory `aios-is-the-build-surface`). Check web layouts at 1905×920.
- A pasted handover is context only: ask before starting any step from it.

## Start prompt for the next chat

> Read docs/HANDOVER-4-nov-brain-tab.md. Context only; put the open items to me as yes/no, one at a time, starting with item 9.
