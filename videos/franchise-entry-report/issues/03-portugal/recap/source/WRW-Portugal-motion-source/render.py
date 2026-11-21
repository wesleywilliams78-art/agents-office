"""Render norway-motion.html at a given size: 60 fps, 4 subframes per frame blended with ffmpeg tmix (motion blur).
Usage: render.py W H out.mp4 [workers] [first_frame] [n_frames]"""
import sys, subprocess, pathlib, time
from concurrent.futures import ProcessPoolExecutor
FPS, SUB, DUR = 60, 4, 60
HERE = pathlib.Path(__file__).resolve().parent

def chunk(args):
    W, H, f0, f1, path = args
    from playwright.sync_api import sync_playwright
    ff = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", str(FPS * SUB), "-c:v", "mjpeg", "-i", "-",
        "-vf", f"tmix=frames={SUB}:weights='1 1 1 1',select='eq(mod(n\\,{SUB})\\,{SUB-1})',setpts=N/({FPS}*TB)",
        "-r", str(FPS), "-c:v", "libx264", "-preset", "veryfast", "-crf", "12", "-pix_fmt", "yuv420p", path], stdin=subprocess.PIPE)
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(viewport={"width": W, "height": H})
        import os; pg.goto((HERE / os.environ.get("PAGE", "norway-motion.html")).as_uri()); pg.evaluate("window.ready")
        for f in range(f0, f1):
            for k in range(SUB):
                pg.evaluate(f"seek({f / FPS + k / (FPS * SUB)})")
                ff.stdin.write(pg.screenshot(type="jpeg", quality=93))
        b.close()
    ff.stdin.close(); ff.wait()
    return path

if __name__ == "__main__":
    W, H, out = int(sys.argv[1]), int(sys.argv[2]), sys.argv[3]
    workers = int(sys.argv[4]) if len(sys.argv) > 4 else 2
    first = int(sys.argv[5]) if len(sys.argv) > 5 else 0
    n = int(sys.argv[6]) if len(sys.argv) > 6 else FPS * DUR
    tmp = pathlib.Path(out).with_suffix(""); tmp.mkdir(exist_ok=True)
    bounds = [first + round(i * n / workers) for i in range(workers + 1)]
    jobs = [(W, H, bounds[i], bounds[i + 1], str(tmp / f"c{i}.mp4")) for i in range(workers)]
    t0 = time.time()
    with ProcessPoolExecutor(workers) as ex: parts = list(ex.map(chunk, jobs))
    (tmp / "list.txt").write_text("".join(f"file '{pathlib.Path(p).name}'\n" for p in parts))
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", str(tmp / "list.txt"), "-c", "copy", str(tmp / "video.mp4")], check=True)
    print(f"{W}x{H}: {n} frames in {time.time() - t0:.0f}s -> {tmp / 'video.mp4'}")
