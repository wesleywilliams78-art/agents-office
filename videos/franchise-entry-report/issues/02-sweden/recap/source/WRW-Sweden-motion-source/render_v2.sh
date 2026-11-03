#!/bin/bash
set -e
cd /home/claude/motion
export PAGE=norway-motion-v2.html
for spec in "1440 1440 1x1" "1080 1350 4x5" "1080 1920 9x16" "1920 1080 16x9"; do
  set -- $spec
  python3 render.py $1 $2 out2/$3.mp4 2
  ffmpeg -y -loglevel error -i out2/$3/video.mp4 -i audio-v2.wav -map 0:v -map 1:a -c:v libx264 -profile:v high -preset slow -crf 18 -pix_fmt yuv420p \
    -c:a aac -b:a 192k -t 60 -movflags +faststart "out2/WRW-Norway-Franchise-Entry-motion-v2-$3.mp4"
  echo "done $3"
done
