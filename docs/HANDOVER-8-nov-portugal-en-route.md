# Handover, 8 Nov 2026: Portugal En Route recap done; social card links broken

## Where things stand
- **Portugal En Route recap (Issue 03, Wed 11 Nov): built.** Four 1440p finals, effects-only cuts and frame-0 covers are in `videos/franchise-entry-report/issues/03-portugal/en-route/out1440/` (a junction to D:). The README in that folder has the chapters, a source table tracing every figure to Issue 03, footage, music and QA.
  - 60 s, −13.7 LUFS, −1.4 dBTP. Music: take 13, re-mastered over Portugal's effects bed.
  - Footage: nine new Pexels clips, record in `output/library/video/portugal-en-route/LICENCE.md`.
  - Drive: covers only, in Wesley Tuesday Content › Edition 03 - Portugal › En Route (Wednesday). The finals (about 1.07 GB) are not on Drive: Wesley chose covers only because Drive space was tight.
  - Telegram: the 9:16 cover and four 50 MB-safe previews (`out1440/telegram/`) were sent.
  - Not committed, posted or scheduled.
- **Decided by Wesley (7 Nov):**
  - new clips, not the city-compare reel clips;
  - take 13 again;
  - pale green `#9FD3AE` for the giant word and the accents on dark; `#046A38` for grounds and stamps;
  - Drive gets covers only.
- **Fix to carry back to Sweden:** Portugal's first mux peaked at +1.5 dBTP. `03-portugal/en-route/render-1440.sh` now puts a limiter after loudnorm. Sweden's script does not have it.

## Broken: links on the social calendar card (open, handed to a new chat on 8 Nov)
- On the Marketing department page (`/aios#office/marketing`), the Social section shows the next post per workstream (`social.mjs`, `/api/social`, `weekpack.mjs`).
- The card for **Real Story Share, city by city, Portugal (Lisbon and Porto)**, due Mon 9 Nov, no longer shows where the videos are, so Wesley cannot click through to them. This used to work.
- The Social section moved from its own tab into the Marketing page on 8 Nov (memory `aios-social-section`), so that move is a likely place to look, but nothing is confirmed.
- The files the card should point to: `output/library/video/portugal-city-compare/` (`Lisbon or Porto.mp4`, `Lisbon or Porto (no audio).mp4`, README with the caption).

## Next
1. Fix the social card links (the new chat).
2. Optional: add the limiter to Sweden's `render-1440.sh` so a re-render matches.
3. When Drive has space: upload the four Portugal finals and check them byte for byte.

## Start prompt for a new chat
"Read docs/HANDOVER-8-nov-portugal-en-route.md and carry on from Next."
