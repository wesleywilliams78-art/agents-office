"""The living still: the sharp key image, with exactly three things moving at a steady pace —
1. the hearth fire and the candle flames (the generated clip, slowed and blended in through mask.png),
2. smoke from the hearth (in the same clip),
3. night clouds drifting past the back window (made here, behind the glass only, the leading untouched).
Writes a seamless loop: the fire clip repeats a whole number of times and the clouds come back to where they began.
  python -I livingstill.py <key.png> <fire-slow.mp4> <mask.png> <out.mp4> [--debug-window <png>]"""
import sys, subprocess
import numpy as np
from PIL import Image, ImageFilter

KEY, FIRE, MASK, OUT = sys.argv[1:5]
W, H, FPS = 1920, 1080, 24
FIRE_LOOPS = 4                                  # the master loop is 4 fire loops long
WIN = (8, 268, 122, 528)                        # x0, y0, x1, y1 of the window in the still
SPEED = 3.0                                     # cloud drift, px per second (steady, slow)

key = np.asarray(Image.open(KEY).convert('RGB'), np.float32)
mask = np.asarray(Image.open(MASK).convert('L').resize((W, H)), np.float32)[..., None] / 255

# the glass: bright blue panes inside the window, not the leading, not the moonlit stone beside it
x0, y0, x1, y1 = WIN
win = key[y0:y1, x0:x1]
r, g, b = win[..., 0], win[..., 1], win[..., 2]
glass = ((b > 90) & (b > r + 45)).astype(np.float32)
glass = np.asarray(Image.fromarray((glass * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8)), np.float32)[..., None] / 255
if '--debug-window' in sys.argv:
    dbg = win.copy(); dbg[..., 0] = np.maximum(dbg[..., 0], glass[..., 0] * 255)
    Image.fromarray(dbg.astype(np.uint8)).resize(((x1 - x0) * 4, (y1 - y0) * 4), Image.NEAREST).save(sys.argv[sys.argv.index('--debug-window') + 1])

# fire clip length -> master loop length -> the cloud tile has to wrap in exactly that time
n_fire = int(subprocess.run(['ffprobe', '-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries', 'stream=nb_read_frames', '-of', 'csv=p=0', FIRE], capture_output=True, text=True).stdout.strip())
N = n_fire * FIRE_LOOPS
period_px = int(round(SPEED * N / FPS))         # the cloud field is periodic in x with this width
ww, wh = x1 - x0, y1 - y0

def periodic_clouds(tw, th, seed=5):
    """Soft fractal clouds, periodic across the width so the drift wraps without a seam."""
    rng = np.random.default_rng(seed)
    fx = np.fft.fftfreq(tw)[None, :]; fy = np.fft.fftfreq(th * 3)[:, None]
    f = np.sqrt(fx ** 2 + (fy * 0.6) ** 2); f[0, 0] = 1
    spec = (rng.normal(size=(th * 3, tw)) + 1j * rng.normal(size=(th * 3, tw))) / f ** 1.9
    spec[0, 0] = 0
    c = np.real(np.fft.ifft2(spec))[:th]
    c = (c - c.min()) / (c.max() - c.min())
    c = np.clip((c - 0.42) / 0.4, 0, 1) ** 1.4   # gaps of clear sky between the cloud banks
    return c
clouds = periodic_clouds(period_px, wh)

def frame_clouds(i):
    off = SPEED * i / FPS
    xs = (np.arange(ww) + off) % period_px
    k = np.floor(xs).astype(int); t = (xs - k)[None, :]
    return clouds[:, k] * (1 - t) + clouds[:, (k + 1) % period_px] * t   # sub-pixel, so the drift is smooth

def fire_frames():   # streamed, one pass of the clip per fire loop (holding it all would need gigabytes)
    for _ in range(FIRE_LOOPS):
        dec = subprocess.Popen(['ffmpeg', '-v', 'error', '-i', FIRE, '-vf', 'crop=1920:1080:0:4', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE)
        for _ in range(n_fire): yield np.frombuffer(dec.stdout.read(W * H * 3), np.uint8).reshape(H, W, 3)
        dec.stdout.close(); dec.wait()

enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                        '-c:v', 'libx264', '-crf', '14', '-preset', 'slow', '-tune', 'film', '-pix_fmt', 'yuv420p', OUT], stdin=subprocess.PIPE)
for i, fr_ in enumerate(fire_frames()):
    f = key * (1 - mask) + fr_.astype(np.float32) * mask
    c = frame_clouds(i)[..., None]
    pane = f[y0:y1, x0:x1]
    lit = pane * (0.62 + 0.85 * c) + np.array([8, 12, 22], np.float32) * c     # moonlit cloud banks over a darker sky
    f[y0:y1, x0:x1] = pane * (1 - glass) + lit * glass
    enc.stdin.write(np.clip(f, 0, 255).astype(np.uint8).tobytes())
enc.stdin.close(); enc.wait()
print(f'wrote {OUT}: {N} frames ({N / FPS:.2f}s), fire {n_fire} frames x {FIRE_LOOPS}, clouds wrap every {period_px}px')
