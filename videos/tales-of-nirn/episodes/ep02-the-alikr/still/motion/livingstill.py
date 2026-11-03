"""Episode 2's living still (The Alik'r, a desert camp at night). Three things move, slowly and steadily:
1. the campfire, its smoke and its sparks: the close-up take (still/fire/fire-s101.mp4, generated from the fire crop scaled up),
   played at natural speed and woven from different points of the take with half-second crossfades, so it never visibly repeats
   and the minute loops without a seam;
2. fine sand lifting off the far dune crests and drifting left on the night wind: made here, along the image's own skyline
   (found per column, where the night sky meets the sand), only where the skyline is dune, never the ruins or the tent;
3. the smoke in the fire take rises through the night air above the camp.
  python -I livingstill.py <key.png> <out.mp4> <fire take>"""
import sys, subprocess
import numpy as np
from PIL import Image, ImageFilter

KEY, OUT, TAKE = sys.argv[1:4]
W, H, FPS = 1920, 1080, 24
N = 1432                                    # the minute loop
BOX = (560, 640, 720, 405)                  # where the fire close-up sits (x, y, w, h)
SEGS, XF = 16, 12
OFFS = [0, 9, 4, 14, 2, 11, 6, 16, 1, 8, 13, 3, 10, 5, 15, 7]   # a different start in the take for every segment

key = np.asarray(Image.open(KEY).convert('RGB'), np.float32)

def soft(m, r): return np.asarray(Image.fromarray((np.clip(m, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r)), np.float32) / 255
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
fire_m = np.zeros((H, W), np.float32)
for cx, cy, rx, ry in ((905, 880, 150, 170), (900, 730, 130, 140)):
    fire_m = np.maximum(fire_m, ((((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2) <= 1).astype(np.float32))
bx, by, bw, bh = BOX; inner = np.zeros((H, W), np.float32); inner[by + 20:by + bh - 4, bx + 20:bx + bw - 20] = 1
fire_m = (soft(fire_m, 18) * soft(inner, 8))[..., None]

raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', TAKE, '-vf', f'crop=1920:1080:0:4,scale={bw}:{bh}:flags=lanczos', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True).stdout
take = np.frombuffer(raw, np.uint8).reshape(-1, bh, bw, 3)
ring = (fire_m[by:by + bh, bx:bx + bw, 0] > 0.05) & (fire_m[by:by + bh, bx:bx + bw, 0] < 0.6)
g = key[by:by + bh, bx:bx + bw][ring].mean(0) / (take[:24].astype(np.float32).mean(0)[ring].mean(0) + 1e-6)
take = np.clip(take.astype(np.float32) * np.clip(g, 0.8, 1.25), 0, 255).astype(np.uint8)
starts = [round(j * N / SEGS) for j in range(SEGS + 1)]
assert max(starts[j + 1] - starts[j] for j in range(SEGS)) + XF + max(OFFS) < len(take), 'segments longer than the take'

def fire_at(t):
    out = np.zeros((bh, bw, 3), np.float32); ws = 0.0
    for j in range(SEGS):
        s0, s1 = starts[j], starts[j + 1]
        for tt in (t, t + N):
            if s0 <= tt < s1 + XF:
                w = 1.0
                if tt >= s1: w = 1 - (tt - s1 + 1) / (XF + 1)
                if tt < s0 + XF: w = min(w, (tt - s0 + 1) / (XF + 1))
                out += take[OFFS[j] + tt - s0].astype(np.float32) * w; ws += w
    return out / max(ws, 1e-6)

# the skyline: for each column, the first row below the sky that is sand (blue gives way to warm)
b, r = key[..., 2], key[..., 0]
sky = (b > r + 25)
crest = np.full(W, -1)
for x in range(W):
    col = sky[300:700, x]; idx = np.where(~col)[0]
    if len(idx): crest[x] = 300 + idx[0]
dune = (crest >= 415) & (crest <= 500)                                  # dune crests only (ruins and tent rise higher)
dune = np.convolve(dune.astype(float), np.ones(31) / 31, 'same') > 0.9  # whole stretches, not stray columns
crest_s = np.convolve(np.where(crest > 0, crest, 450), np.ones(9) / 9, 'same')
above = (crest_s[None, :] - yy)                                          # pixels above the crest line
band = np.clip(1 - above / 28, 0, 1) * (above > -3) * dune[None, :]      # a haze reaching ~28 px above the crest
band = soft(band, 2)[..., None]
SAND = np.array([205, 182, 150], np.float32)

rng = np.random.default_rng(3); PER = 640                                # a periodic noise field, so the drift loops
def field(seed, sx, sy):
    fx = np.fft.fftfreq(PER)[None, :]; fy = np.fft.fftfreq(64)[:, None]
    f = np.sqrt((fx * sx) ** 2 + (fy * sy) ** 2); f[0, 0] = 1
    sp = (rng.normal(size=(64, PER)) + 1j * rng.normal(size=(64, PER))) / f ** 1.6; sp[0, 0] = 0
    z = np.real(np.fft.ifft2(sp)); return (z - z.min()) / (z.max() - z.min())
veil = np.clip((field(1, 1.0, 3.0) - 0.45) / 0.35, 0, 1) ** 1.3
SPEED = PER / (N / FPS)                                                   # one full field in the minute (about 10.7 px/s)

dst = np.zeros((H, W), np.float32)
enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                        '-c:v', 'libx264', '-crf', '13', '-preset', 'slow', '-tune', 'film', '-pix_fmt', 'yuv420p', OUT], stdin=subprocess.PIPE)
ys = np.clip((crest_s[None, :] - yy + 3) / 34 * 63, 0, 63).astype(int)   # map height above the crest into the field's rows
for i in range(N):
    f = key.copy()
    fb = f[by:by + bh, bx:bx + bw]; m = fire_m[by:by + bh, bx:bx + bw]
    f[by:by + bh, bx:bx + bw] = fb * (1 - m) + fire_at(i) * m
    xs = ((np.arange(W) + SPEED * i / FPS) % PER).astype(int)               # drifting right to left
    v = veil[ys, xs[None, :]][..., None] * band * 0.32
    f = f * (1 - v) + SAND * v
    enc.stdin.write(np.clip(f, 0, 255).astype(np.uint8).tobytes())
enc.stdin.close(); enc.wait()
print(f'wrote {OUT}: {N} frames, fire from one take in {SEGS} segments, sand on {int(dune.sum())} columns of skyline')
