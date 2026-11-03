# Blender Studio bridge: runs inside Blender and lets Claude Code drive the open session.
# A socket on 127.0.0.1 only, one JSON line in, one JSON line out, guarded by a token in ~/.blender-studio/token.
# The code runs on Blender's main thread (a timer), so it is safe to touch bpy, and every call is one undo step.
# Loaded by the add-on stub that install.mjs writes, or directly: blender.exe --python bridge.py
import bpy, socket, threading, json, queue, io, contextlib, traceback, os, secrets

PORT = int(os.environ.get("BLENDER_STUDIO_PORT", "9877"))
HOME = os.path.join(os.path.expanduser("~"), ".blender-studio")
TOKEN_FILE = os.path.join(HOME, "token")
_jobs = queue.Queue()
_state = {"sock": None, "ns": None, "kit": None, "kit_mtime": 0}


def _token():
    os.makedirs(HOME, exist_ok=True)
    if os.path.exists(TOKEN_FILE):
        t = open(TOKEN_FILE, encoding="utf-8").read().strip()
        if t:
            return t
    t = secrets.token_hex(24)
    with open(TOKEN_FILE, "w", encoding="utf-8") as f:
        f.write(t)
    return t


def _namespace(kit):
    # One namespace for the whole session, so variables survive between calls. The kit is re-read when it changes.
    if _state["ns"] is None:
        _state["ns"] = {"bpy": bpy, "__name__": "blender_studio"}
    ns = _state["ns"]
    if kit and os.path.exists(kit):
        m = os.path.getmtime(kit)
        if kit != _state["kit"] or m != _state["kit_mtime"]:
            exec(compile(open(kit, encoding="utf-8").read(), kit, "exec"), ns)
            _state["kit"], _state["kit_mtime"] = kit, m
    return ns


def _jsonable(v):
    try:
        json.dumps(v)
        return v
    except TypeError:
        return repr(v)


def _run(job):
    out = io.StringIO()
    try:
        ns = _namespace(job.get("kit"))
        ns.pop("result", None)
        with contextlib.redirect_stdout(out), contextlib.redirect_stderr(out):
            exec(compile(job["code"], "<claude>", "exec"), ns)
        try:
            bpy.ops.ed.undo_push(message="Claude: " + job.get("label", "change")[:60])
        except Exception:
            pass
        return {"ok": True, "stdout": out.getvalue()[-20000:], "result": _jsonable(ns.get("result"))}
    except Exception:
        return {"ok": False, "stdout": out.getvalue()[-20000:], "error": traceback.format_exc()[-8000:]}


def _pump():
    while True:
        try:
            job = _jobs.get_nowait()
        except queue.Empty:
            return 0.05
        job["reply"] = _run(job)
        job["done"].set()


def _serve(sock, token):
    while True:
        try:
            conn, _ = sock.accept()
        except OSError:
            return
        threading.Thread(target=_handle, args=(conn, token), daemon=True).start()


def _handle(conn, token):
    with conn:
        try:
            buf = b""
            while not buf.endswith(b"\n"):
                chunk = conn.recv(65536)
                if not chunk:
                    break
                buf += chunk
            msg = json.loads(buf.decode("utf-8"))
            if not secrets.compare_digest(str(msg.get("token", "")), token):
                reply = {"ok": False, "error": "Bad token."}
            else:
                job = {"code": str(msg.get("code", "")), "kit": msg.get("kit"), "label": str(msg.get("label", "change")), "done": threading.Event()}
                _jobs.put(job)
                if job["done"].wait(float(msg.get("timeout", 120))):
                    reply = job["reply"]
                else:
                    reply = {"ok": False, "error": "Timed out waiting for Blender. It may be busy (a render, a modal tool or a dialog)."}
        except Exception as e:
            reply = {"ok": False, "error": "Bridge error: %s" % e}
        try:
            conn.sendall((json.dumps(reply) + "\n").encode("utf-8"))
        except OSError:
            pass


def start():
    if bpy.app.background or _state["sock"]:
        return
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        s.bind(("127.0.0.1", PORT))
    except OSError:
        print("Blender Studio bridge: port %d is taken (another Blender has it). Not started." % PORT)
        s.close()
        return
    s.listen(4)
    _state["sock"] = s
    threading.Thread(target=_serve, args=(s, _token()), daemon=True).start()
    if not bpy.app.timers.is_registered(_pump):
        bpy.app.timers.register(_pump, persistent=True)
    print("Blender Studio bridge: listening on 127.0.0.1:%d" % PORT)


def stop():
    if bpy.app.timers.is_registered(_pump):
        bpy.app.timers.unregister(_pump)
    if _state["sock"]:
        _state["sock"].close()
        _state["sock"] = None


if __name__ == "__main__":
    start()
