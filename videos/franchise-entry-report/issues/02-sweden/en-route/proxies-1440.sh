#!/bin/bash
# 1440p proxies (2 Nov 2026, after Wesley saw a soft opening): landscape at full 4K (3840x2160) so every 1440p size scales DOWN,
# portrait at 1440x2560, and an enhancement pass on every clip: light denoise first, then local contrast (13x13) and fine detail (5x5).
# The Stockholm aerial is soft at source (drone at sunset), so the pass matters most there. Graded, all-intra 30 fps, seek-exact in Chrome.
# name | source | start s | output seconds | speed (0.625 = 48p slowed, 0.5 = 60p slowed) | portrait crop centre (0-1)
set -e
cd "$(dirname "$0")"; F=../../../../../output/library/video/sweden-en-route/footage; mkdir -p proxies1440
HLG="zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,tonemap=tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv,format=yuv420p,"
GRADE="eq=contrast=1.05:saturation=0.9,colorbalance=rs=-0.03:bs=0.04:rh=0.04:bh=-0.03,curves=all='0/0.025 1/0.985'"
ENH="hqdn3d=1.2:1.2:3:3,unsharp=lx=13:ly=13:la=0.55:cx=5:cy=5:ca=0,unsharp=lx=5:ly=5:la=0.7:cx=5:cy=5:ca=0"
mk() { n=$1; src=$F/$2.mp4; ss=$3; dur=$4; sp=$5; cx=$6; pre=""; [ "$7" = hlg ] && pre="$HLG"
  srcdur=$(python -c "print($dur*$sp+0.2)")
  base="${pre}setpts=PTS/$sp,fps=30,$GRADE"
  ffmpeg -y -loglevel error -ss $ss -t $srcdur -i $src -vf "$base,scale=3840:2160:force_original_aspect_ratio=increase:flags=lanczos,crop=3840:2160,$ENH" -t $dur -an -c:v libx264 -preset veryfast -crf 16 -g 1 -bf 0 -pix_fmt yuv420p -movflags +faststart proxies1440/$n-l.mp4
  ffmpeg -y -loglevel error -ss $ss -t $srcdur -i $src -vf "$base,crop=ih*9/16:ih:(iw-ih*9/16)*$cx:0,scale=1440:2560:flags=lanczos,$ENH" -t $dur -an -c:v libx264 -preset veryfast -crf 16 -g 1 -bf 0 -pix_fmt yuv420p -movflags +faststart proxies1440/$n-p.mp4
  echo "$n done"; }
mk c0 recap-00-stockholm-aerial-sunset 3.0 7 0.625 0.45 &
mk c1 recap-01-stockholm-charles-xii 4.0 6 1 0.7 &
mk c2 recap-01-stockholm-nordiska-museet 30 6 1 0.5 hlg &
wait
mk c3 recap-02-food-truck-cashless 11.5 10.5 1 0.55 &
mk c4 spare-cinnamon-rolls 2 6 1 0.5 &
mk c5 recap-03-cinnamon-rolls 4 6 1 0.4 &
wait
mk c6 spare-malmo-canal-aerial 1 6 1 0.4 &
mk c7 recap-04-malmo-canal 8 6 0.5 0.45 &
mk c8 recap-06-gotland-clouds 2 9.5 1 0.5 &
mk c9 recap-00-stockholm-aerial-sunset 14.3 7 0.625 0.55 &
wait
