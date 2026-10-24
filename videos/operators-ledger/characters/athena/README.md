# Athena — pose library (style v2)

Athena is the Operator: The Operator's Ledger's recurring lead. She was chosen as Option A ("The Blazer") on 24 Oct 2026 and restyled the same day as warm, lightly cartoonish variant B: medium-brown skin, dark hair, a mustard blazer and a pencil through her bun. Earlier work is kept for reference: `_line-art-v1/` holds the first thin line-art poses, `options/` the rejected looks, and `../style-test/` the colour variants.

## Poses
| File | Use |
|---|---|
| `athena-standing-neutral.svg` | Default: ledger held to the chest |
| `athena-looking-left.svg` / `athena-looking-right.svg` | Head turns (only the face shifts, so a swap reads as a turn) |
| `athena-head-scratch.svg` | Puzzled; ledger at her side (Episode 01, scene 1) |
| `athena-pointing.svg` | Pointing to screen right at a chart or number |
| `athena-worried.svg` | Expression drop when a loss lands (Episode 01, scene 4) |
| `athena-at-counter-writing.svg` | Writing in the open ledger at a sage counter (Episode 01, scene 6) |
| `athena-arms-folded.svg` | Confident close |

Shopfronts live in `../shops/`:
- `site-1.svg` is the thriving site.
- `site-10.svg` is the struggling site.
- `site-10-early.svg` is SITE 10 before it goes drab.
- `site.svg` is a generic shop.

## Rules for using them
- Every pose shares one viewBox (`-260 -150 520 800`): head centre at 0,0, feet at y 600, which is 93.75% of the height. To stand her on a line at y = G in an image box of height H, set the box's top to G − 0.9375 × H. Swap poses in place at the same position and scale; never nudge one to fit.
- The colours are fixed and work on bone, red and ink grounds. Athena never wears red, because red means loss.
- To mirror her, use `transform: scaleX(-1)` on the whole image. Never mirror the face alone.
- Pointing points to screen right. To point left, mirror the whole pose.

## Changing her
Edit `build_poses.py` and run it from the repo root:

```bash
python videos/operators-ledger/characters/athena/build_poses.py videos/operators-ledger/characters
```

It rewrites every pose, the shopfronts, the pose sheet and `index.html`. Her design is fixed for the series, so change her once, here, and never per episode. Then copy the files into each episode's `assets/athena/` and `assets/shops/`.
