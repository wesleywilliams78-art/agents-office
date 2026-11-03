// Shared paths and the socket client for the Blender Studio connector.
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(HERE, '..', '..');
export const KIT = path.join(HERE, 'sitekit.py');
export const OUT = path.join(ROOT, 'output', 'blender');
export const BLENDER_EXE = process.env.BLENDER_EXE || 'C:\\Program Files (x86)\\Steam\\steamapps\\common\\Blender\\blender.exe';
export const PORT = +(process.env.BLENDER_STUDIO_PORT || 9877);
const TOKEN_FILE = path.join(os.homedir(), '.blender-studio', 'token');

// One call: send Python to the open Blender, get { ok, stdout, result } or { ok: false, error }.
export function send(code, { timeout = 120, label = 'change' } = {}) {
  let token = '';
  try { token = fs.readFileSync(TOKEN_FILE, 'utf8').trim(); } catch {}
  return new Promise(resolve => {
    const sock = net.connect({ host: '127.0.0.1', port: PORT });
    let buf = '';
    const done = r => { sock.destroy(); resolve(r); };
    sock.setTimeout((timeout + 10) * 1000, () => done({ ok: false, error: 'No answer from Blender in time.' }));
    sock.on('connect', () => sock.write(JSON.stringify({ token, code, kit: KIT, label, timeout }) + '\n'));
    sock.on('data', d => { buf += d; if (buf.endsWith('\n')) { try { done(JSON.parse(buf)); } catch { done({ ok: false, error: 'Bad reply from Blender.' }); } } });
    sock.on('error', e => done({ ok: false, offline: e.code === 'ECONNREFUSED', error: e.code === 'ECONNREFUSED' ? 'Blender is not open, or the Blender Studio bridge is not enabled in it.' : e.message }));
  });
}
