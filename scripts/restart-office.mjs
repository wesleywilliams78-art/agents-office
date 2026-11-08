// Restart the office the way CLAUDE.md says (8 Nov 2026), as one command the Claude Code box may run without asking:
// refuse while a task is doing or running, stop the node serve.mjs listening on the office port, start a new one minimized so
// it outlives whoever ran this, and wait until /api/matrix answers. Exit 1 with the reason if any step fails.
// A Claude Code box run survives this: it was started detached and the new office picks its log back up.
import { execFileSync, spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from '../config.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = loadConfig().port || 4520, base = `http://127.0.0.1:${port}`;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const get = async p => { const r = await fetch(base + p, { signal: AbortSignal.timeout(5000) }); return r.json(); };
const fail = m => { console.log('Not restarted: ' + m); process.exit(1); };

let busy = [];
try { const t = await get('/api/tasks'); busy = (Array.isArray(t) ? t : t.tasks || []).filter(x => x.state === 'doing' || x.state === 'running'); } catch { console.log('The office is not answering now; starting it.'); }
if (busy.length) fail(`${busy.length} task(s) running: ${busy.map(x => `"${x.title}" (${x.agent})`).join(', ')}. Wait for ${busy.length > 1 ? 'them' : 'it'} to finish.`);

const pids = new Set();
try { for (const l of execFileSync('netstat', ['-ano', '-p', 'TCP'], { encoding: 'utf8' }).split('\n')) { const m = new RegExp(`:${port}\\s+\\S+\\s+LISTENING\\s+(\\d+)`).exec(l); if (m) pids.add(+m[1]); } } catch {}
for (const pid of pids) {
  let cmd = ''; try { cmd = execFileSync('powershell', ['-NoProfile', '-Command', `(Get-CimInstance Win32_Process -Filter "ProcessId=${pid}").CommandLine`], { encoding: 'utf8' }); } catch {}
  if (!/serve\.mjs/i.test(cmd)) fail(`port ${port} is held by something that is not the office (pid ${pid}).`);
  try { process.kill(pid); } catch (e) { fail(`could not stop pid ${pid}: ${e.message}`); }
}
for (let i = 0; i < 20 && pids.size; i++) { await sleep(300); try { await get('/api/health'); } catch { break; } }

spawn('powershell', ['-NoProfile', '-Command', `Start-Process "${process.execPath}" -ArgumentList serve.mjs -WorkingDirectory "${ROOT}" -WindowStyle Minimized`], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
for (let i = 0; i < 120; i++) { await sleep(1000); try { await get('/api/matrix'); console.log(`Office restarted on ${base}${pids.size ? ` (stopped pid ${[...pids].join(', ')})` : ''}.`); process.exit(0); } catch {} }
fail('the new office did not answer within 2 minutes. Check its minimized window.');
