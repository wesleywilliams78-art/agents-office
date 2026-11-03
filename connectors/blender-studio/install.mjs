// Installs the Blender Studio bridge as a Blender add-on, so it starts every time Blender opens (Steam or not).
// Writes a small stub into Blender's add-ons folder that loads bridge.py from this repo, then enables it.
// node connectors/blender-studio/install.mjs        (Blender must be closed, or it overwrites the preferences on quit)
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { BLENDER_EXE, HERE } from './shared.mjs';

if (!fs.existsSync(BLENDER_EXE)) { console.error('Blender not found at ' + BLENDER_EXE + '. Set BLENDER_EXE.'); process.exit(1); }
const ver = execFileSync(BLENDER_EXE, ['--version'], { encoding: 'utf8', windowsHide: true }).match(/Blender (\d+\.\d+)/)?.[1];
if (!ver) { console.error('Could not read the Blender version.'); process.exit(1); }
const addons = path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'Blender Foundation', 'Blender', ver, 'scripts', 'addons');
fs.mkdirSync(addons, { recursive: true });

const stub = `# Written by agents-office/connectors/blender-studio/install.mjs. Loads the bridge from the repo.
bl_info = {
    "name": "Blender Studio Bridge",
    "author": "WRW Hospitality",
    "version": (1, 0, 0),
    "blender": (4, 2, 0),
    "category": "System",
    "description": "Lets Claude Code drive this Blender session over a local socket (127.0.0.1 only).",
}
import importlib.util

_PATH = r"${path.join(HERE, 'bridge.py')}"
_mod = None


def register():
    global _mod
    spec = importlib.util.spec_from_file_location("blender_studio_core", _PATH)
    _mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(_mod)
    _mod.start()


def unregister():
    if _mod:
        _mod.stop()
`;
fs.writeFileSync(path.join(addons, 'blender_studio_bridge.py'), stub);
execFileSync(BLENDER_EXE, ['-b', '--python-expr', "import bpy, addon_utils; addon_utils.enable('blender_studio_bridge', default_set=True, persistent=True); bpy.ops.wm.save_userpref(); print('BRIDGE ENABLED')"], { stdio: 'inherit', windowsHide: true });
console.log(`Installed for Blender ${ver}: ${addons}\\blender_studio_bridge.py. Open Blender and the bridge listens on 127.0.0.1.`);
