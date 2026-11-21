#!/bin/bash
# 1440p proxies for the Portugal En Route recap, built as Sweden's final (2 Nov 2026): landscape at full 4K (3840x2160) so every
# 1440p size scales DOWN, portrait at 1440x2560, and an enhancement pass on every clip: light denoise, then local contrast (13x13)
# and fine detail (5x5). Graded, all-intra 30 fps, seek-exact in Chrome. Footage: output/library/video/portugal-en-route/LICENCE.md.
# name | source | start s | output seconds | speed (0.6 = 50p slowed to 30) | portrait crop centre (0-1) | optional pre-crop
set -e
cd "$(dirname "$0")"; F=../../../../../output/library/video/portugal-en-route/footage; mkdir -p proxies1440
GRADE="eq=contrast=1.05:saturation=0.9,colorbalance=rs=-0.03:bs=0.04:rh=0.04:bh=-0.03,curves=all='0/0.025 1/0.985'"
ENH="hqdn3d=1.2:1.2:3:3,unsharp=lx=13:ly=13:la=0.55:cx=5:cy=5:ca=0,unsharp=lx=5:ly=5:la=0.7:cx=5:cy=5:ca=0"
mk() { n=$1; src=$F/$2.mp4; ss=$3; dur=$4; sp=$5; cx=$6; pre="${7:+$7,}"
  srcdur=$(python -c "print($dur*$sp+0.2)")
  base="${pre}setpts=PTS/$sp,fps=30,$GRADE"
  ffmpeg -y -loglevel error -ss $ss -t $srcdur -i $src -vf "$base,scale=3840:2160:force_original_aspect_ratio=increase:flags=lanczos,crop=3840:2160,$ENH" -t $dur -an -c:v libx264 -preset veryfast -crf 16 -g 1 -bf 0 -pix_fmt yuv420p -movflags +faststart proxies1440/$n-l.mp4
  ffmpeg -y -loglevel error -ss $ss -t $srcdur -i $src -vf "$base,crop=ih*9/16:ih:(iw-ih*9/16)*$cx:0,scale=1440:2560:flags=lanczos,$ENH" -t $dur -an -c:v libx264 -preset veryfast -crf 16 -g 1 -bf 0 -pix_fmt yuv420p -movflags +faststart proxies1440/$n-p.mp4
  echo "$n done"; }
mk c0 recap-00-lisbon-aerial 0.5 7 1 0.5 &
mk c1 recap-01-lisbon-rua-augusta-arch 3.6 6 0.6 0.47 &
mk c2 recap-01-lisbon-street 2.0 6 0.6 0.55 &
wait
mk c3 recap-02-bread-paper-bag 0.5 10.5 1 0.38 &
mk c4 recap-03-cheeseburger 3.0 6 1 0.45 &
mk c5 recap-03-food-in-a-box 9.5 6 1 0.45 &
wait
mk c6 recap-04-porto-bridge-aerial 2.0 6 1 0.3 &
# the top of the bridge clip carries a port lodge's sign: cropped off before scaling
mk c7 recap-04-porto-bridge 3.0 6 1 0.5 "crop=iw*0.8:ih*0.8:iw*0.1:ih*0.2" &
mk c8 recap-05-algarve-cliffs 2.0 9.5 1 0.08 &
mk c9 recap-00-lisbon-aerial 13.0 7 1 0.5 &
wait
