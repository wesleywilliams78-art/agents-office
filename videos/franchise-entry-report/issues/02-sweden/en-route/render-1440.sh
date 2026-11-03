#!/bin/bash
# 1440p finals (2 Nov 2026): every size rendered at 1440 on its short side, from the 4K/1440 enhanced proxies (./proxies-1440.sh).
# Music: take 13 (slap-funk French house, ACE-Step, mastered by music-samples/master.py) with the effects bed, finished to -14 LUFS.
# Effects-only copies for Instagram, where Wesley adds music in the app.
set -e
cd "$(dirname "$0")"; mkdir -p out1440
specs=("2560 1440 16x9" "1440 2560 9x16" "1440 1800 4x5" "1440 1440 1x1"); [ -n "$ONLY" ] && specs=("$ONLY")
for spec in "${specs[@]}"; do
  set -- $spec
  node render.mjs en-route.html $1 $2 out1440/$3.mp4 3
  ffmpeg -y -loglevel error -i out1440/$3/video.mp4 -i music-samples/13-slap-house-b.wav -map 0:v -map 1:a -c:v libx264 -profile:v high -preset slow -crf 17 -pix_fmt yuv420p \
    -af loudnorm=I=-14:TP=-1.5:LRA=11 -ar 48000 -c:a aac -b:a 256k -t 60 -movflags +faststart "out1440/WRW-Sweden-En-Route-$3.mp4"
  ffmpeg -y -loglevel error -i out1440/$3/video.mp4 -i fx.wav -map 0:v -map 1:a -c:v libx264 -profile:v high -preset slow -crf 17 -pix_fmt yuv420p \
    -c:a aac -b:a 192k -t 60 -movflags +faststart "out1440/WRW-Sweden-En-Route-$3-effects-only.mp4"
  echo "done $3"
done
