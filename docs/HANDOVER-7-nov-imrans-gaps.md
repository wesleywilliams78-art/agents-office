# Handover, 7 Nov 2026: Imran's Diner artefact, gap-filling

Follows `docs/HANDOVER-7-nov-imrans-day2.md`. Artefact: https://claude.ai/artifact/VkBYkfEUjjeUHpjBkdVyG8 (source `sites/imrans-diner-visit/index.html`, unchanged). Only its database was written (collection `visit/nov26/areas`; docs keyed T1-T15, F1-F11, META and `P-...`).

## Done this chat
- Checked Day 2 pains P-d2-01 to 18 and F11 display and rank (by reading the code and simulating; the browser pane hit a sign-in page, so the live page was not looked at).
- Fixed: blank pain deleted; P-tr07 frequency set to Every shift; P-d2-04, 06, 16 reworded; P-d2-13 flagged office-only.
- Filled 39 documents from both transcripts (empty slots only, Wesley's text kept): questions answered 111 to 131 of 194, show-me 62 to 68 of 95, every area has a rating and a quote, pains missing `man` 29 to 12.
- Classified the 43 "Could not show" marks as resolved findings, not gaps (21 have a reason, 22 blank).
- Final batch: marked T7 sm3, F6 sm1, T15 sm1, T15 sm3 "Could not show" (each points to the matching item); answered T3 q6, F7 q3, T9 q7 as absences. F7 q3 is inferred from silence on both recordings.

## Still open
- Three judgement calls for Wesley: T3 sm4 (HACCP file), T8 sm3 (cash sheet and end-of-day report), T15 sm2.
- Real gaps both recordings are silent on: about 20 show-me and 60 questions (waste, halal, first aid, data protection fee, personnel files, rotas, the close, stock, F11). These need Wesley's own notes or a follow-up visit.
- Optional: reasons for the 22 blank "Could not show" marks; pool the Presto-portal items (F2 sm1, F3 sm2, F8 sm1, T12 sm4, T8 sm3) into one follow-up.
- 43 pains have no photos. Three food-margin figures still to reconcile (59.63%, about 51%, about 53%). Shift-manager scope. Kitchen model `data/kitchen-imrans.json` not updated with Day 2 timings. A few "brother"/"father" wordings remain. Rule: role titles only in the artefact.
- Page-code ideas not started: Report tab reading the F10/F11 summaries; sorting the Pains tab by score.

## Working notes
- ArtifactData: export docs with `out_dir`, edit the JSON, write back with `batch` of `set` using `file_path` and `if_version` (up to 50, atomic). Re-read versions first; they move.
- Fill only empty fields. Pay, discipline or anything about one person is "Office review only".
- Bash strips backslashes in inline node; write scripts to files with forward-slash paths.

## Start prompt for a new chat
"Read docs/HANDOVER-7-nov-imrans-gaps.md. Then ask me for my call on the three judgement items (T3 sm4, T8 sm3, T15 sm2) as yes/no, and tell me which of the remaining gaps I can fill from my own notes."
