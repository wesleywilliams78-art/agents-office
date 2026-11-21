#!/bin/bash
# run.sh [NN|all] : build SOPs + pack, export PDFs, report pages, run checks. Run from the build folder.
set -e
cd "$(dirname "$0")"
[ -f bg_first.png ] || python3 motif_light.py .
rm -rf out && mkdir -p out/pdf
node build_sop.js "${1:-all}" out
node build_pack.js out
for f in out/*.docx; do soffice --headless --convert-to pdf --outdir out/pdf "$f" >/dev/null 2>&1; done
echo '--- pages (SOP: usually 4-5 incl. checklist; no section may split) ---'
for f in out/pdf/*.pdf; do echo "$(pdfinfo "$f" | awk '/Pages/{print $2}')  $(basename "$f")"; done
echo '--- checks ---'
node numbering.js
for f in out/pdf/*.pdf; do
  t=$(pdftotext "$f" -)
  echo "$t" | grep -q '{{' && echo "UNRENDERED TOKEN in $f"
  echo "$t" | grep -qiE 'WRW|YSF' && echo "BANNED NAME in $f"
  echo "$t" | grep -qi 'square' && [[ "$f" == *QUK-SOP-0* ]] && echo "SQUARE MENTIONED in SOP $f"
done
echo 'checks done'
