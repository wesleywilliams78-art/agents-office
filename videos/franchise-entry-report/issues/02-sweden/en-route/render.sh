#!/bin/bash
# Renders the four sizes and muxes the score. Proxies first: ./proxies.sh (needs the approved footage downloaded).
set -e
cd "$(dirname "$0")"; mkdir -p out
[ -f audio.wav ] || python -I score.py audio.wav
specs=("1920 1080 16x9" "1080 1920 9x16" "1080 1350 4x5" "1440 1440 1x1"); [ -n "$ONLY" ] && specs=("$ONLY")
for spec in "${specs[@]}"; do
  set -- $spec
  node render.mjs en-route.html $1 $2 out/$3.mp4 3
  ffmpeg -y -loglevel error -i out/$3/video.mp4 -i audio.wav -map 0:v -map 1:a -c:v libx264 -profile:v high -preset slow -crf 18 -pix_fmt yuv420p \
    -c:a aac -b:a 192k -t 60 -movflags +faststart "out/WRW-Sweden-En-Route-$3.mp4"
  echo "done $3"
done
