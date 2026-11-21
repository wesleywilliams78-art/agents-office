# Episode 04 Brief, v2: STP (built in the current Ledger look, matching Ep 03 v3)
**Series:** The Operator's Ledger · **Plan row:** 04 · v1 is untouched (`operators-ledger-ep04-stp.mp4`, `episode-04-brief.md`).
**Video:** `renders/operators-ledger-ep04-stp-v2.mp4` (1080 × 1350, 30 fps, 1:29.0, −15.5 LUFS, −1.8 dBTP). Captions `renders/…-v2.srt`. Thumbnail `renders/…-v2-thumbnail.png` (frame 0). Stills in `stills/…-v2-frame-NN-at-Ts.png`. Source: `v2/` (`build.mjs` writes every composition from the real voice timings).

## Script and storyboard (voice measured, not guessed)
| # | Time | Voiceover | On screen (≤ 8 words at once) |
|---|---|---|---|
| 1 | 0.0–9.0 s | "Same menu. Same brand. One site is packed at seven a.m. The other on Saturday. Who is each one for?" | "Same menu. Two sites. Who is each for?" from frame 0. Athena between SITE 1 (station platform) and SITE 10. |
| 2 | 9.0–19.2 s | "Site one is at a station: twenty thousand pounds a week. Site ten, a residential street: thirteen thousand. Both sell to everyone." | SITE 1 £20,000 · SITE 10 £13,000 (count up). Footer ILLUSTRATIVE FIGURES, WEEKLY. |
| 3 | 19.2–39.4 s | "It's called STP. Segmentation first: split people by who they are and when they come. Wendell Smith set that out in nineteen fifty-six. At the station, seven a.m. commuters bring eleven thousand pounds. On site ten's street, Saturday brunch brings five thousand seven hundred and twenty." | SEGMENTATION · 7am commuters £11,000 · Saturday brunch £5,720. Bars fill on the spoken figures. Footer. |
| 4 | 39.4–53.1 s | "Targeting: pick the segment you serve better than anyone nearby. Commuters are fifty-five percent of site one's week. Brunch is forty-four percent of site ten's. Each is its biggest single group." | TARGETING · 55% of £20,000 · 44% of £13,000. Other groups step back. Footer. |
| 5 | 53.1–65.4 s | "Positioning: the one promise that group hears. The commuter wants speed: served before the train. The brunch table wants time: nobody hurries you. Same menu, different promise." | POSITIONING · Served before the train · Nobody hurries you (station platform and brunch table props). |
| 6 | 65.4–73.0 s | "So here's the call. Site one is for the seven a.m. commuter. Site ten is for the Saturday brunch table." | Site 1: 7am commuters · Site 10: Saturday brunch. Athena in front of both shopfronts, pointing. |
| 7 | 73.0–82.1 s | "Every site is for someone. Say who. Your question for Monday: which customers bring each site the most sales?" | Red ground rises from the baseline; "Which customers bring each site the most sales?" builds word by word. |
| 8 | 82.1–85.5 s | "This is the Operator's Ledger." | The question card holds. |
| 9 | 85.5–89.0 s | (music only) | End card: The Operator's Ledger, Episode 4 STP, WRW logo, WRW HOSPITALITY, Wesley Williams. |

## Numbers check (all illustrative, weekly)
- Site 1: 2,500 orders × £4.40 = £11,000. Rest £9,000 (lunch £4,000 + afternoon £2,000 + weekend £3,000). Total £20,000. Share 55%.
- Site 10: 260 guests × £22.00 = £5,720. Rest £7,280 (Sunday brunch £2,600 + weekday lunch £2,080 + weekday coffee £1,300 + evenings £1,300). Total £13,000. Share 44.0%.
- Order counts, ticket values and guest counts are (assumed). The bars are drawn to scale from these segments.

## Sources
- Segmentation: Wendell R. Smith, "Product Differentiation and Market Segmentation as Alternative Marketing Strategies", *Journal of Marketing* 21(1), July 1956, pp. 3–8, DOI 10.1177/002224295602100102 (checked on Crossref).
- Positioning: Al Ries and Jack Trout, *Advertising Age*, 1972, and "Positioning: The Battle for Your Mind", 1981. Not voiced.
- STP as one sequence is credited to Kotler: unverified, so not named anywhere.

## Ledger line
Case 04 · Framework: STP · Verdict: site 1 is for the 7am commuter, site 10 for the Saturday brunch table · Lesson: every site is for someone, so say who and promise them one thing.

## LinkedIn draft (about 740 characters)
Same menu. Same brand. One site is packed at 7am. The other fills up on Saturday morning.

Who is each one for?

If you can't say, both sites end up making the same offer to everyone.

Episode 4 of The Operator's Ledger works it through with STP: segmentation, targeting, positioning.

Split the people around a site by who they are and when they come. Pick the group you serve best. Promise them one thing.

In the example, a station site takes £11,000 of its £20,000 a week from the 7am commuter. A residential site takes £5,720 of its £13,000 from Saturday brunch. Same menu, a different promise at each.

Illustrative figures, weekly.

Your question for Monday: which customers bring each site the most sales?

## Checks
- Hook on screen from frame 0 (static poster, no entrance motion), so within the first 3 s.
- No scene above 8 on-screen words (scenes 1, 5, 6, 7 are exactly 8; footer and the art's SITE sign boards not counted). Engine check: 0 errors.
- Run time 89.0 s (60–90). Verdict (scene 6) comes last, before the question (scene 7).

## What I assumed
- **Look:** "current Ledger design" = Ep 03 v3 (bone ground, red eyebrow, two-tone Newsreader, plain ink captions, no band). Ep 03 v3 itself is 3D blocks from the Motion Studio engine; v2 is HyperFrames with Athena, shopfronts and bars as briefed, in that look. Captions follow Ep 03 (no ink band), a change from DESIGN.md's band.
- **Voice:** Wesley's clone (VoiceStudio, VoxCPM2, profile ca7acc09), de-plosived. The model's long inner pauses were capped at 0.2 s (breath between sentences 0.2 s, not 0.42) to fit 90 s; no words cut. STP voiced as S, T, P; "a.m." as the letters A M. I have not listened to the final mix.
- **Music:** the Ep 04 v1 series bed (ACE-Step), trimmed to length; the Ep 03 jazz-trio bed is not a separate file. Soft tick on each figure landing.
- **End card** holds 3.5 s (not the 5 s in the script) to stay under 90 s. Scenes 7 and 8 share one red card.
- **New props** added to `characters/props/`: `station-platform.svg`, `brunch-table.svg` (hand-drawn in the library style; not in `build_poses.py`).
- Scene 4's non-target groups use sand segments with unlabelled dividers, to stay under 8 words.
