"""From the build's concat list, write timings.tsv: line, start s, end s, text (the clock every shot is cut to)."""
import sys, os, wave
D, V = sys.argv[1], sys.argv[2]; W = os.path.join(D, "work", V)
dur = lambda f: (lambda w: w.getnframes() / w.getframerate())(wave.open(os.path.join(W, f)))
lines = [l.rstrip("\n").split("\t")[2] for l in open(os.path.join(D, "lines.tsv"), encoding="utf-8")]
t = 0.0; rows = []
for entry in open(os.path.join(W, "list.txt")):
    f = entry.strip()[6:-1]; d = dur(f)
    if f[:3].isdigit() and not f.startswith("g"): rows.append((int(f[:3]), t, t + d))
    t += d
with open(os.path.join(D, "timings.tsv"), "w", encoding="utf-8") as o:
    o.write("line\tstart\tend\ttext\n")
    for n, a, b in rows: o.write(f"{n}\t{a:.2f}\t{b:.2f}\t{lines[n-1]}\n")
print(f"{len(rows)} lines, total {t:.1f}s ({t/60:.1f} min)")
