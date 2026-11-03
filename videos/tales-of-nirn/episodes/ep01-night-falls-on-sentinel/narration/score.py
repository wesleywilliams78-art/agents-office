"""Score each heard line against the script: word-level similarity, and flag anything under 0.85."""
import sys, os, re, difflib
D = sys.argv[1]
norm = lambda s: re.sub(r"[^a-z0-9' ]", " ", s.lower().replace("-", "")).split()
lines = [l.rstrip("\n").split("\t")[2] for l in open(os.path.join(D, "lines.tsv"), encoding="utf-8")]
bad = []
for i, want in enumerate(lines, 1):
    p = os.path.join(D, "lines", "heard", f"{i:03d}.txt")
    if not os.path.exists(p): continue
    got = open(p, encoding="utf-8").read().strip()
    r = difflib.SequenceMatcher(None, norm(want), norm(got)).ratio()
    if r < 0.85: bad.append(i); print(f"{i:03d} {r:.2f}\n  want: {want}\n  got:  {got}")
print("FLAGGED:", " ".join(f"{i:03d}" for i in bad) or "none")
