import sys, pathlib, json
from playwright.sync_api import sync_playwright
W,H=int(sys.argv[1]),int(sys.argv[2]); out=pathlib.Path(sys.argv[3]); out.mkdir(parents=True,exist_ok=True)
times=[float(x) for x in sys.argv[4].split(",")] if len(sys.argv)>4 else [i*0.5 for i in range(120)]
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={"width":W,"height":H})
    msgs=[]; pg.on("console", lambda m: msgs.append(m.text)); pg.on("pageerror", lambda e: msgs.append("ERR "+str(e)))
    pg.goto(pathlib.Path("" + (sys.argv[5] if len(sys.argv)>5 else "norway-motion.html") + "").resolve().as_uri()); pg.evaluate("window.ready")
    for t in times:
        pg.evaluate(f"seek({t})"); pg.screenshot(path=str(out/f"b{t:06.2f}.png"))
    json.dump(pg.evaluate("window.EVENTS"), open(out/"events.json","w"))
    b.close()
print("\n".join(msgs[:20]))
