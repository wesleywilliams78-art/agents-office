# Handover, 7 Nov 2026 (later): Imran's Diner, SFBB photos read into T3

Follows `docs/HANDOVER-7-nov-imrans-gaps.md`. Artefact: https://claude.ai/artifact/VkBYkfEUjjeUHpjBkdVyG8 (source `sites/imrans-diner-visit/index.html`, unchanged). Only its database was written (collection `visit/nov26/areas`).

## Decided this chat
- **T15 sm2** and **T8 sm3**: marked "Could not show". T15 sm2 points to T15 sm1 and T12 sm2 (no action tracker). T8 sm3 notes that the family does the cash-up privately and the Presto report sits in the portal, so it is pooled with F2 sm1, F3 sm2, F8 sm1 and T12 sm4 in the Presto-portal follow-up.
- **T3 sm4** (HACCP file): first left open, then set to "Shown" once Wesley said the folder is on site and every filled-in page is photographed.
- Wesley's recollection ("updated about seven times, last in 2025") is not in the photos: the pack was first completed 31-12-25 and the review table is blank. The note says so.

## Done
- Read 54 SFBB photos (photos 5 to 58 in T3; the pack is "Safer Food, Better Business for Caterers", the FSA small-caterer pack, not a HACCP plan for this menu). Full findings are in `T3.f.sm4_n`.
- Added a marked "From the SFBB photos" line to T3 q1, q3 and q6. Existing text kept.
- Not read: photos 1 to 4 (fridge sheets and an invoice) and blank pages 7, 8, 33, 46, 51, 53 to 56. Photos in other areas (T2 has 55, T14 27, T1 36 and so on) were not looked at.

## Findings worth carrying into the report
- Pack contradicts the recordings: probe "checked weekly" and "morning and evening" on paper vs "never calibrated" aloud; "digital display" ticked vs fridges read from the dial.
- Allergens: "We don't prepare any food for allergic consumers", "do not offer allergen free"; where the information is kept and how allergy orders are identified are blank.
- No separate probes, veg sink or equipment for raw and ready-to-eat. Pest contractor ticked, every check question blank. Cleaning schedule and "Prove it" blank. Diary has two filled weeks (29-12-25, 5-1-26), "No problem" every day, none after.
- Suppliers list: four, one named as a halal butcher, no contacts, no halal certificate in the photos.

## Still open
- T3 q4 (missed temperature check) is empty; the pack says nothing on it.
- Leads, not answers, from the pack: T2 pest (q4), T7 halal (q8, suppliers list), T11 sm1 (allergen information), T9 (training record shows three starters, first-day methods only). Not written.
- Slots Wesley's own notes could fill, by kind: office paperwork (T5, T6 sm4, T7, T8 sm4 and q2/q5/q7), Friday-night floor notes (F11 all, F5, F6, F4, F1, F7, T14, T11 sm1), Thursday close-out (T15 q1, q3 to q7). Needs a follow-up visit: T9 q6, T10 q1 and q3, T11 q4 to q7, T12 q4 and q7. Counts after this chat: about 28 show-me and 63 questions still empty.
- Carried over: reasons for 22 blank "Could not show" marks; 43 pains without photos; food-margin figures (59.63%, about 51%, about 53%); shift-manager scope; `data/kitchen-imrans.json` lacks Day 2 timings; a few "brother"/"father" wordings (role titles only in the artefact); page-code ideas (Report tab, sort Pains by score).

## Working notes
- Photos are assets, not documents: each doc has `photos: [{id, pid, at, cap}]`. Download with `Artifact` `action: read`, `url`, `path: <id>`, `out_dir` (one call per photo; `paths` does not work for assets). Asset ids are the `id` field.
- Contact sheets with PIL (`python -I`) made the triage cheap; portrait photos are 901x1600 and legible at full size.
- ArtifactData `update` merges nested `f` fields without wiping siblings. Pin writes with `if_version`; versions move.
- Fill only empty fields; append marked lines to filled ones. Pay, discipline or anything about one person is "Office review only". Role titles only, no staff names, in the artefact.
- Bash strips backslashes in inline node; write scripts to files.
- The browser pane hit a sign-in page earlier, so the live page has not been looked at.

## Start prompt for a new chat
"Read docs/HANDOVER-7-nov-imrans-gaps-2.md. Then tell me which of the open items I can fill from my own notes, and ask me yes/no whether to read the photos in the other areas (T2, T14, T1 and the rest) for the leads."
