# Qamaria builder (part of the sop-builder connector)

`sop_build` with `client: "qamaria"` (mcp.mjs, `buildQamaria`) copies qlib.js, numbering.js, build_sop.js, gaps.js and motif_light.py to a scratch `_build` folder inside `output/sops/<date> qamaria <name>/`, writes the content as `sops/sop01.js`, builds the Word file, converts it to PDF with LibreOffice, checks 4 to 6 pages, then deletes `_build`. `sop_review`, `sop_fix` and `sop_deliver` (sop-qa) work on these folders.

- `gaps.js` is the master gap register (fixed ids; `new_gaps` on sop_build appends). Mirror new entries in Brain `30-Customers/qamaria-sop-gaps-register.md`.
- Not in the connector: `build_pack.js` and `pack.js` (gaps list and cover note for a whole set) and `run.sh` (the full-set build with text checks). Run them by hand or via Grace in a copy of this folder with the set's `sops/sopNN.js` files; needs poppler (`pdfinfo`, `pdftotext`) for run.sh.
- The content files for QUK-SOP-01 to 05 are not in the repo (Claude Chat project doc `claude/qamaria-uk-sop-sources.md`).
- Rules: Brain `30-Customers/qamaria-sop-rules.md`; skeleton and schema: `qamaria-sop-skeleton.md`.
