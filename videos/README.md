# Videos: where things live

One master folder per series. Nothing sits loose at this level.

```
videos/
  art-of-operations/        the Instagram reel series
    masters/                the two master compositions (title, vertical)
    clips/                  clip-01 … clip-09, and -v2 for a revised take
    delivered/              the finished MP4s sent to Wesley, and the grid wall
  operators-ledger/         the animated series
    brand/  characters/  voice/      shared by every episode
    episodes/               ep01-unit-economics, ep02-…, one folder each
    wednesday/              The Operator's Toolkit: w01-breakeven, w02-…, one folder each
  franchise-entry-report/   the Friday country report (PDF, plus an explainer video)
    issues/                 01-norway, 02-…, one folder each
  manual-magic-ai/          client explainers for Manual Magic AI (its own brand, not WRW)
    tools/                  beatgrid.py, the numpy beat and downbeat measure
    01-operational-insurance/   the 60 s Operational Insurance™ UI-motion loop
  consultants-corner/       YouTube: Consultants' Corner, three 3-hour background-music playlists (ACE-Step, live-band briefs)
    samples/                briefs.json, generate.mjs (composer LM on), studio.py (score + master), takes/, masters/
  tales-of-nirn/            Tales of Nirn: Elder Scrolls in-game books as puppet-theatre episodes (fan series, new Instagram account)
    plan/                   PILOT.md
    voice/auditions/        the five designed narrator auditions
```

## Rules
1. **A new series gets its own master folder here.** A new clip or episode goes inside its series, never at this level.
2. **Names:** clips are `clip-NN` (two digits). A revised take is `clip-NN-v2`, kept beside the original until the old one is no longer needed. Episodes are `epNN-short-name`. Report issues are `NN-country` (`01-norway`).
3. **Each clip or episode is a self-contained HyperFrames project** (index.html, hyperframes.json, assets, fonts). It must not point at paths outside its own folder, so it can be moved or archived whole.
4. **Finished files that Wesley has approved** are copied to `delivered/` (Art of Operations) or the episode's `renders/` (Operators' Ledger). Never overwrite a delivered file: a revision gets a new version name.
5. **Reel and video work the office makes** (title cards, carousels, voiced Reels from the video studio) is not filed here. It lives in `output/library/`, which has an INDEX.md.
6. Run `npm run storage` for sizes and a clean-up report. Render folders are the large part (about 20 MB a clip).

## Storage: media on D: (3 Nov 2026)
- Every heavy folder (`renders`, `out`, `out1440`, `proxies`, `stills`, `footage`, `frames`, `work`, `music-samples`) lives on the external drive at `D:\Agents Office Mediaideos\…`, with a junction at its path here.
- After a build, run `npm run media` to move any new heavy folder across.
- Source files stay here on C: in git.
- Never copy media back to C:.
- If D: is not plugged in, stop: don't rebuild the folders on C:.
- Full rule: Brain `00-Meta/media-storage.md`.
