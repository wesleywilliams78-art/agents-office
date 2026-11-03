"""Burned-in captions for Tales of Nirn (Wesley, 2 Nov: legible, Skyrim-style, low in the frame over the table; on every video,
never relying on Instagram's own). Writes an ASS subtitle file for one stretch of an episode.

The words are the book's own (from lines.tsv, with the voice's phonetic respellings put back to the real names). Each line of
the read is shown in short chunks of at most two lines of text, timed within the line by its length in characters; the line's
start and end come from the read's timings (timings.tsv), scaled by the read's speed.
Style: the series' condensed capitals face in sentence case (Skyrim's subtitles are Futura Condensed; Tw Cen MT Condensed is the
nearest installed), warm white with a soft dark edge, centred, low over the table.
  python -I captions.py <narration dir> <out.ass> --from <s> --to <s> [--speed 0.8] [--vertical] [--skip-first]"""
import sys, os, re

D, OUT = sys.argv[1], sys.argv[2]
arg = lambda k, d=None: sys.argv[sys.argv.index(k) + 1] if k in sys.argv else d
A, B = float(arg('--from', 0)), float(arg('--to', 1e9)); SPEED = float(arg('--speed', 0.8))
VERT = '--vertical' in sys.argv; SKIP1 = '--skip-first' in sys.argv

REAL = {'Ar-kay': 'Arkay', 'Lo-tun': 'Lhotun', 'Grek-lith': 'Greklith', 'Awb-kee': 'Aubki', 'Ar-thah-go': 'Arthago',
        'Ka-jee-tee': 'Khajiiti', 'Sell-eh-noo': 'Selenu', 'Ill-ee-ack': 'Iliac', 'Joe-mick': 'Jomic', 'Ha-bah-la': 'Haballa',
        'AL-ih-ker': "Alik'r", 'Al-ee-keer': "Alik'r", 'Al-ih-keer': "Alik'r", 'WEL-tun': 'Weltan'}   # captions read lines.tsv, which keeps the real spellings; these only catch respellings
text = [l.rstrip('\n').split('\t')[2] for l in open(os.path.join(D, 'lines.tsv'), encoding='utf-8')]
rows = [l.rstrip('\n').split('\t') for l in open(os.path.join(D, 'timings.tsv'), encoding='utf-8')][1:]
when = {int(r[0]): (float(r[1]) / SPEED, float(r[2]) / SPEED) for r in rows}

W, H = (1080, 1920) if VERT else (1920, 1080)
SIZE = 58 if VERT else 50
MAXCH = 30 if VERT else 46                      # characters per caption line
MARGIN_V = int(arg('--margin', 230 if VERT else 96))   # an episode can lift or lower them to keep its focal point clear                  # from the bottom: down on the tabletop (Wesley, 2 Nov)

def tidy(s):
    for k, v in REAL.items(): s = s.replace(k, v)
    s = s.replace('...', '…')
    return s.strip()

def chunks(s):
    """Split a line into captions of at most two lines of MAXCH characters, breaking after punctuation where possible."""
    words = s.split(); out = []; cur = []
    def full(c): return len(' '.join(c)) > MAXCH * 2 - 4
    for w in words:
        if cur and full(cur + [w]): out.append(cur); cur = []
        cur.append(w)
        if len(' '.join(cur)) > MAXCH * 1.2 and re.search(r'[,.;:!?…"]$', w): out.append(cur); cur = []
    if cur: out.append(cur)
    if len(out) > 1 and len(' '.join(out[-1])) < 10:   # no orphan scrap at the end
        last = out.pop(); out[-1] += last
    return [' '.join(c) for c in out]

def wrap(s):
    if len(s) <= MAXCH: return s
    words = s.split(); best = None
    for i in range(1, len(words)):
        a, b = ' '.join(words[:i]), ' '.join(words[i:])
        score = max(len(a), len(b)) + (0 if re.search(r'[,.;:!?…]$', words[i - 1]) else 3)
        if best is None or score < best[0]: best = (score, a, b)
    return best[1] + r'\N' + best[2]

def ts(t):
    t = max(0, t); h = int(t // 3600); m = int(t % 3600 // 60); s = t % 60
    return f'{h}:{m:02d}:{s:05.2f}'

events = []
for n, s in enumerate(text, 1):
    if n not in when or (SKIP1 and n == 1): continue
    a, b = when[n]
    if b < A or a > B: continue
    parts = chunks(tidy(s)); total = sum(len(p) for p in parts); t = a
    for k, p in enumerate(parts):
        d = (b - a) * len(p) / total
        end = t + d if k < len(parts) - 1 else b + 0.35            # hand over cleanly; the line's last words hold a beat
        events.append((t - A, end - A, wrap(p))); t += d
# never two captions on screen at once: trim any hold that runs into the next caption
events.sort()
for i in range(len(events) - 1):
    if events[i][1] > events[i + 1][0]: events[i] = (events[i][0], events[i + 1][0] - 0.02, events[i][2])

head = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Nirn,Tw Cen MT Condensed,{SIZE},&H00E4EEF4,&H00E4EEF4,&H00101010,&H96000000,0,0,0,0,100,100,1.2,0,1,2.4,1.2,2,60,60,{MARGIN_V},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
with open(OUT, 'w', encoding='utf-8') as f:
    f.write(head)
    for a, b, s in events:
        if b > 0: f.write(f'Dialogue: 0,{ts(a)},{ts(b)},Nirn,,0,0,0,,{{\\blur1.2\\fad(120,160)}}{s}\n')
print(f'{len(events)} captions -> {OUT}')
