#!/usr/bin/env bash
# Render an Operator's Ledger episode and finish its soundtrack (DESIGN.md, "Final loudness").
# Usage: bash videos/operators-ledger/tools/render_finish.sh <episode-dir> <output-name.mp4>
# Steps: frame-0 poster check, HyperFrames render, two-pass loudnorm to -15 LUFS with a true-peak limiter
# (video stream copied), then a measurement printout.
set -euo pipefail
EP="$1"; OUT="$2"
cd "$EP"
npx hyperframes snapshot --at 0 --json > /dev/null 2>&1 && echo "frame 0 snapshot taken (check it reads as a poster)"
npx hyperframes render -o renders/_raw.mp4 -q delivery 2>&1 | grep -E "Render complete|MB ·|rror" || true
J=$(ffmpeg -hide_banner -i renders/_raw.mp4 -af loudnorm=I=-15:TP=-1.5:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
LN=$(echo "$J" | python -c "
import json,sys; d=json.load(sys.stdin)
print('loudnorm=I=-15:TP=-1.5:LRA=11:measured_I=%s:measured_TP=%s:measured_LRA=%s:measured_thresh=%s:offset=%s:linear=true' % (d['input_i'],d['input_tp'],d['input_lra'],d['input_thresh'],d['target_offset']))")
ffmpeg -y -loglevel error -i renders/_raw.mp4 -map 0:v -map 0:a -c:v copy \
  -af "$LN,aresample=192000,alimiter=limit=0.78:attack=3:release=60:level=false,aresample=48000" \
  -ar 48000 -c:a aac -b:a 192k "renders/$OUT"
rm renders/_raw.mp4
npx hyperframes audio "renders/$OUT" --json 2>/dev/null | python -c "
import json,sys; d=json.load(sys.stdin)['items'][0]; l=d['loudness']
print('finished: %.1f s, %.1f LUFS, %.1f dBTP, clipping %d' % (d['duration'], l['lufsIntegrated'], l['truePeakDb'], l['clipping']['count']))"
