"""The living still, take 2 (Wesley, 2 Nov: the fire must look real, TV quality; the candle and clouds are right).
Three motions on the sharp key image, all at a steady pace:
1. the hearth fire and its smoke: close-up takes generated at 1080p of the hearth alone (still/fire2/fire-*.mp4, drawn from
   the hearth crop scaled up, so the flames carry about twice the detail), played at their natural speed and woven into one
   continuous fire: segments from the takes in turn, each handing over to the next with a half-second crossfade,
   the last handing back to the first so the minute loops without a seam;
2. the candles: kept from the earlier loop (motion/fire-slow.mp4), which Wesley approved;
3. clouds drifting past the window (as before).
  python -I livingstill2.py <key.png> <out.mp4> <fire take> [<fire take> ...]"""
import sys, subprocess
import numpy as np
from PIL import Image, ImageFilter

KEY, OUT, TAKES = sys.argv[1], sys.argv[2], sys.argv[3:]
W, H, FPS = 1920, 1080, 24
CANDLE = 'fire-slow.mp4'; N_CANDLE = 358; N = N_CANDLE * 4          # the minute loop, as before (1432 frames)
BOX = (437, 210, 907, 510)                                          # where the hearth close-up sits in the still (x, y, w, h)
SEGS, XF, OFF = 14, 12, 6                                           # fire segments per minute, crossfade frames, frames skipped at a take's start
WIN = (8, 268, 122, 528); SPEED = 3.0                               # the window and the cloud drift

key = np.asarray(Image.open(KEY).convert('RGB'), np.float32)

def ellipse_mask(regions, blur):
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32); m = np.zeros((H, W), np.float32)
    for cx, cy, rx, ry, s in regions:
        m = np.maximum(m, ((((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2) <= 1) * s)
    return np.asarray(Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(blur)), np.float32) / 255

# the fire and smoke mask, kept inside the close-up's box with a soft inner edge
fire_m = ellipse_mask([(890, 600, 150, 125, 1.0), (885, 360, 125, 150, 0.9)], 22)
bx, by, bw, bh = BOX; inner = np.zeros((H, W), np.float32); inner[by + 24:by + bh - 24, bx + 24:bx + bw - 24] = 1
inner = np.asarray(Image.fromarray((inner * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(10)), np.float32) / 255
fire_m = (fire_m * inner)[..., None]
cand_m = ellipse_mask([(793, 765, 26, 48, 1.0), (1524, 612, 18, 30, 1.0)], 6)[..., None]

def read_all(path, size=None, crop=None):
    vf = ','.join(x for x in (crop, f'scale={size[0]}:{size[1]}:flags=lanczos' if size else None) if x)
    args = ['ffmpeg', '-v', 'error', '-i', path] + (['-vf', vf] if vf else []) + ['-f', 'rawvideo', '-pix_fmt', 'rgb24', '-']
    raw = subprocess.run(args, capture_output=True).stdout; fw, fh = size if size else (W, H)
    return np.frombuffer(raw, np.uint8).reshape(-1, fh, fw, 3)

takes = [read_all(t, size=(bw, bh)) for t in TAKES]                 # each take, scaled down into the box
# match each take's colour to the still around the fire, so there is no tonal edge
ring = (fire_m[by:by + bh, bx:bx + bw, 0] > 0.05) & (fire_m[by:by + bh, bx:bx + bw, 0] < 0.6)
still_box = key[by:by + bh, bx:bx + bw]
for k, t in enumerate(takes):
    g = still_box[ring].mean(0) / (t[:24].astype(np.float32).mean(0)[ring].mean(0) + 1e-6)
    takes[k] = np.clip(t.astype(np.float32) * np.clip(g, 0.8, 1.25), 0, 255).astype(np.uint8)

# the weave: segment j starts at s_j, runs into the next start by XF frames, from take j % len(takes)
starts = [round(j * N / SEGS) for j in range(SEGS + 1)]
def fire_at(t):
    out = np.zeros((bh, bw, 3), np.float32); wsum = 0.0
    for j in range(SEGS):
        s0, s1 = starts[j], starts[j + 1]
        for tt in (t, t + N):                                       # the last segment runs past N into the first frames
            if s0 <= tt < s1 + XF:
                f = OFF + (tt - s0); tk = takes[j % len(takes)]; f = min(f, len(tk) - 1)
                w = 1.0
                if tt >= s1: w = 1 - (tt - s1 + 1) / (XF + 1)         # handing over to the next segment
                if j > 0 and tt < s0 + XF: w = min(w, (tt - s0 + 1) / (XF + 1))
                if j == 0 and tt < XF: w = min(w, (tt + 1) / (XF + 1))
                out += tk[f].astype(np.float32) * w; wsum += w
    return out / max(wsum, 1e-6)

# the clouds (as in livingstill.py)
x0, y0, x1, y1 = WIN; win = key[y0:y1, x0:x1]
glass = ((win[..., 2] > 90) & (win[..., 2] > win[..., 0] + 45)).astype(np.float32)
glass = np.asarray(Image.fromarray((glass * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8)), np.float32)[..., None] / 255
period = int(round(SPEED * N / FPS)); ww, wh = x1 - x0, y1 - y0
rng = np.random.default_rng(5); fx = np.fft.fftfreq(period)[None, :]; fy = np.fft.fftfreq(wh * 3)[:, None]
f_ = np.sqrt(fx ** 2 + (fy * 0.6) ** 2); f_[0, 0] = 1
spec = (rng.normal(size=(wh * 3, period)) + 1j * rng.normal(size=(wh * 3, period))) / f_ ** 1.9; spec[0, 0] = 0
cl = np.real(np.fft.ifft2(spec))[:wh]; cl = (cl - cl.min()) / (cl.max() - cl.min()); cl = np.clip((cl - 0.42) / 0.4, 0, 1) ** 1.4
def clouds(i):
    xs = (np.arange(ww) + SPEED * i / FPS) % period; k = np.floor(xs).astype(int); t = (xs - k)[None, :]
    return (cl[:, k] * (1 - t) + cl[:, (k + 1) % period] * t)[..., None]

dec = subprocess.Popen(['ffmpeg', '-v', 'error', '-stream_loop', '3', '-i', CANDLE, '-vf', 'crop=1920:1080:0:4', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE)
enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                        '-c:v', 'libx264', '-crf', '13', '-preset', 'slow', '-tune', 'film', '-pix_fmt', 'yuv420p', OUT], stdin=subprocess.PIPE)
for i in range(N):
    cf = np.frombuffer(dec.stdout.read(W * H * 3), np.uint8).reshape(H, W, 3).astype(np.float32)
    f = key * (1 - cand_m) + cf * cand_m                             # the approved candles
    fb = f[by:by + bh, bx:bx + bw]; m = fire_m[by:by + bh, bx:bx + bw]
    f[by:by + bh, bx:bx + bw] = fb * (1 - m) + fire_at(i) * m        # the new fire and smoke
    c = clouds(i); pane = f[y0:y1, x0:x1]
    f[y0:y1, x0:x1] = pane * (1 - glass) + (pane * (0.62 + 0.85 * c) + np.array([8, 12, 22], np.float32) * c) * glass
    enc.stdin.write(np.clip(f, 0, 255).astype(np.uint8).tobytes())
dec.stdout.close(); dec.wait(); enc.stdin.close(); enc.wait()
print(f'wrote {OUT}: {N} frames ({N / FPS:.2f}s), fire from {len(TAKES)} takes in {SEGS} segments')
