// Blender Studio connector: Claude Code drives Wesley's open Blender session (stdio, JSON-RPC, no dependencies).
// Blender runs the bridge add-on (bridge.py, installed by install.mjs), which takes Python over 127.0.0.1 and runs it on
// Blender's main thread with sitekit.py already loaded. Arbitrary Python: keep this server out of the office agents' hands
// (it is in mcp.deny in office.config.local.json).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';
import { spawn } from 'node:child_process';
import { BLENDER_EXE, HERE, OUT, send } from './shared.mjs';

const TOOLS = [
  { name: 'blender_status', description: 'Is Blender open with the bridge? Shows the version, the open file, whether it has unsaved changes, and how many objects (and how many the site kit made).', inputSchema: { type: 'object', properties: {} } },
  { name: 'blender_launch', description: 'Open Blender (the Steam install) with the bridge, optionally on a .blend file, and wait until it answers. Only when blender_status says it is not open.', inputSchema: { type: 'object', properties: { file: { type: 'string', description: 'Optional .blend file to open.' } } } },
  { name: 'blender_exec', description: 'Run Python in the open Blender session, on its main thread, as one undo step (Ctrl+Z in Blender takes it back). `bpy` and every sitekit function (setup, room, door, window, wall, item, run, table, banquette, zone, flow, label, gap, aisles, report, cam_plan, cam_iso, cam_eye, render, clear, box, CATALOGUE) are already defined, and variables persist between calls. Set `result = ...` to get a value back; print() output comes back too.', inputSchema: { type: 'object', required: ['code'], properties: {
    code: { type: 'string', description: 'Python to run.' },
    label: { type: 'string', description: 'A few words for the undo history, e.g. "kitchen line".' },
    timeout_seconds: { type: 'integer', description: 'Default 120, max 900 (Cycles renders).' },
  } } },
  { name: 'blender_view', description: 'Screenshot the largest 3D Viewport so you can see what Wesley sees. Optionally turn the view first (this moves his viewport).', inputSchema: { type: 'object', properties: { view: { type: 'string', enum: ['top', 'front', 'back', 'left', 'right', 'camera', 'all'], description: 'top/front/back/left/right: that axis view; camera: through the scene camera; all: frame everything. Leave out to capture the view as it is.' } } } },
  { name: 'blender_scene', description: 'What the site kit has built: items per collection with size and position, zone areas, seats, and the kitchen pinch points under 1.0 m.', inputSchema: { type: 'object', properties: {} } },
  { name: 'blender_render', description: 'Render the scene camera to output/blender/<project>/<name>.png and show it. workbench = clean plan drawing (seconds), eevee = lit draft, cycles = final.', inputSchema: { type: 'object', required: ['project', 'name'], properties: {
    project: { type: 'string', description: 'Folder, lower-case-with-dashes, e.g. imrans-diner-kitchen.' },
    name: { type: 'string', description: 'File name without extension, e.g. plan-v1.' },
    engine: { type: 'string', enum: ['workbench', 'eevee', 'cycles'] },
    camera: { type: 'string', description: 'Camera object name; default the scene camera.' },
    width: { type: 'integer' }, height: { type: 'integer' }, samples: { type: 'integer' },
  } } },
  { name: 'blender_save', description: 'Save the open file. With project and name it saves as output/blender/<project>/<name>.blend; without, it saves the file where it already is.', inputSchema: { type: 'object', properties: { project: { type: 'string' }, name: { type: 'string' } } } },
];

const text = o => ({ content: [{ type: 'text', text: typeof o === 'string' ? o : JSON.stringify(o, null, 2) }] });
const fail = s => ({ isError: true, content: [{ type: 'text', text: s }] });
const slug = s => /^[a-z0-9][a-z0-9-]{0,60}$/.test(String(s || ''));
const py = s => JSON.stringify(s); // a JSON string is a valid Python string literal
const image = (file, note) => ({ content: [{ type: 'text', text: note }, { type: 'image', mimeType: 'image/png', data: fs.readFileSync(file).toString('base64') }] });

async function run(code, opts) {
  const r = await send(code, opts);
  if (!r.ok) return { err: fail((r.error || 'Failed.') + (r.stdout ? '\n--- output ---\n' + r.stdout : '')) };
  return { r };
}

const STATUS = `s = bpy.context.scene
result = {"blender": bpy.app.version_string, "file": bpy.data.filepath or "(unsaved)", "unsavedChanges": bpy.data.is_dirty, "scene": s.name,
  "objects": len(s.objects), "siteKitObjects": sum(1 for o in s.objects if o.get("sitekit")), "units": s.unit_settings.system, "camera": s.camera.name if s.camera else None}`;

function addonInstalled() {
  const base = path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'Blender Foundation', 'Blender');
  try { return fs.readdirSync(base).some(v => fs.existsSync(path.join(base, v, 'scripts', 'addons', 'blender_studio_bridge.py'))); } catch { return false; }
}

const tools = {
  async blender_status() {
    const r = await send(STATUS);
    if (r.offline) return text({ open: false, note: 'Blender is not answering. Open it (blender_launch, or from Steam once the add-on is installed with `node connectors/blender-studio/install.mjs`).' });
    return r.ok ? text({ open: true, ...r.result }) : fail(r.error);
  },
  async blender_launch(a) {
    const probe = await send(STATUS, { timeout: 5 });
    if (probe.ok) return text({ alreadyOpen: true, ...probe.result });
    if (!fs.existsSync(BLENDER_EXE)) return fail('Blender not found at ' + BLENDER_EXE + '. Set BLENDER_EXE.');
    const args = [];
    if (a.file) { if (!fs.existsSync(a.file)) return fail('No such file: ' + a.file); args.push(a.file); }
    if (!addonInstalled()) args.push('--python', path.join(HERE, 'bridge.py'));
    spawn(BLENDER_EXE, args, { detached: true, stdio: 'ignore' }).unref();
    for (let i = 0; i < 45; i++) {
      await new Promise(r => setTimeout(r, 2000));
      const r = await send(STATUS, { timeout: 5 });
      if (r.ok) return text({ launched: true, ...r.result });
    }
    return fail('Blender started but the bridge did not answer within 90 seconds. Check Blender opened, and that the add-on "Blender Studio Bridge" is enabled in Preferences > Add-ons.');
  },
  async blender_exec(a) {
    const code = String(a.code || '');
    if (!code.trim()) return fail('No code.');
    const { r, err } = await run(code, { label: String(a.label || 'change'), timeout: Math.min(900, Math.max(5, +a.timeout_seconds || 120)) });
    if (err) return err;
    return text({ result: r.result ?? null, output: r.stdout || undefined });
  },
  async blender_view(a) {
    const file = path.join(os.tmpdir(), `blender-view-${Date.now()}.png`);
    const op = { top: "bpy.ops.view3d.view_axis(type='TOP')", front: "bpy.ops.view3d.view_axis(type='FRONT')", back: "bpy.ops.view3d.view_axis(type='BACK')",
      left: "bpy.ops.view3d.view_axis(type='LEFT')", right: "bpy.ops.view3d.view_axis(type='RIGHT')", camera: 'bpy.ops.view3d.view_camera()', all: 'bpy.ops.view3d.view_all()' }[a.view] || 'pass';
    const code = `best = None
for w in bpy.context.window_manager.windows:
    for ar in w.screen.areas:
        if ar.type == "VIEW_3D" and (best is None or ar.width * ar.height > best[1].width * best[1].height):
            best = (w, ar)
if best is None:
    raise RuntimeError("No 3D Viewport is open in Blender.")
w, ar = best
reg = next(r for r in ar.regions if r.type == "WINDOW")
prefs, r = bpy.context.preferences.view, bpy.context.scene.render
smooth, pct = prefs.smooth_view, r.resolution_percentage
prefs.smooth_view, r.resolution_percentage = 0, 50  # no view animation, a half-size image is plenty to look at
try:
    with bpy.context.temp_override(window=w, area=ar, region=reg):
        ${op}
        bpy.ops.render.opengl(view_context=True)  # draws the viewport as you see it, off-screen
    bpy.data.images["Render Result"].save_render(filepath=${py(file)})
finally:
    prefs.smooth_view, r.resolution_percentage = smooth, pct
result = ${py(file)}`;
    const { err } = await run(code, { label: 'view', timeout: 30 });
    if (err) return err;
    if (!fs.existsSync(file)) return fail('Blender did not write the screenshot.');
    const out = image(file, 'The 3D Viewport' + (a.view ? ` (${a.view})` : '') + '.');
    fs.rmSync(file, { force: true });
    return out;
  },
  async blender_scene() {
    const { r, err } = await run('result = {**report(), "pinchPoints": aisles("Kitchen", 1.0)}', { label: 'report' });
    return err || text(r.result);
  },
  async blender_render(a) {
    if (!slug(a.project) || !slug(a.name)) return fail('project and name: lower-case letters, digits and dashes.');
    const dir = path.join(OUT, a.project); fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, a.name + '.png');
    const engine = a.engine || 'workbench';
    const args = [py(file), `engine=${py(engine)}`, `width=${+a.width || 1920}`, `height=${+a.height || 1080}`, `samples=${+a.samples || (engine === 'cycles' ? 128 : 64)}`];
    if (a.camera) args.push(`camera=${py(a.camera)}`);
    const { err } = await run(`result = render(${args.join(', ')})`, { label: 'render', timeout: engine === 'cycles' ? 900 : 300 });
    if (err) return err;
    return image(file, 'Saved ' + file);
  },
  async blender_save(a) {
    let code;
    if (a.project || a.name) {
      if (!slug(a.project) || !slug(a.name)) return fail('project and name: lower-case letters, digits and dashes.');
      const dir = path.join(OUT, a.project); fs.mkdirSync(dir, { recursive: true });
      code = `bpy.ops.wm.save_as_mainfile(filepath=${py(path.join(dir, a.name + '.blend'))})\nresult = bpy.data.filepath`;
    } else code = 'if not bpy.data.filepath:\n    raise RuntimeError("This file has never been saved. Give a project and a name.")\nbpy.ops.wm.save_mainfile()\nresult = bpy.data.filepath';
    const { r, err } = await run(code, { label: 'save' });
    return err || text({ saved: r.result });
  },
};

const sendMsg = o => process.stdout.write(JSON.stringify(o) + '\n');
readline.createInterface({ input: process.stdin }).on('line', line => {
  let m; try { m = JSON.parse(line); } catch { return; }
  if (m.id === undefined) return;
  const ok = result => sendMsg({ jsonrpc: '2.0', id: m.id, result }), err = (code, message) => sendMsg({ jsonrpc: '2.0', id: m.id, error: { code, message } });
  try {
    if (m.method === 'initialize') return ok({ protocolVersion: m.params?.protocolVersion || '2025-03-26', capabilities: { tools: {} }, serverInfo: { name: 'blender-studio', version: '1.0.0' } });
    if (m.method === 'ping') return ok({});
    if (m.method === 'tools/list') return ok({ tools: TOOLS });
    if (m.method === 'tools/call') { const t = tools[m.params?.name]; return t ? Promise.resolve(t(m.params.arguments || {})).then(ok, e => ok(fail('Internal error: ' + (e.message || e)))) : err(-32602, 'Unknown tool: ' + m.params?.name); }
    err(-32601, 'Method not found: ' + m.method);
  } catch (e) { ok(fail('Internal error: ' + (e.message || e))); }
});
