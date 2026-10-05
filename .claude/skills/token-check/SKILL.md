---
name: token-check
description: Measure this project's token use from session transcripts and compare with the saved baseline. Use when asked to check, audit or compare token usage.
---
# Checking token use

Run `node scripts/token-measure.mjs` and show its table. Do not recompute the numbers by hand or read the transcripts yourself.

1. Run the script (read-only, no model cost).
2. Compare the newest sessions with `docs/token-baseline.md`: preload, largest context, cache read.
3. Report in a few lines: what moved, and which session is the biggest consumer.
