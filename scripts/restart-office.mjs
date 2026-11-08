// Restart the office the way CLAUDE.md says (8 Nov 2026), as one command the Claude Code box may run without asking:
// refuse while a task is doing or running, stop the node serve.mjs listening on the office port, start a new one minimized so
// it outlives whoever ran this, and wait until /api/matrix answers. Exit 1 with the reason if any step fails.
// A Claude Code box run survives this: it was started detached and the new office picks its log back up.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from '../config.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = loadConfig().port || 4520, base = `http://127.0.0.1:${port}`;
const sleep = ms => new Promise(r => setTimeout(r, ms));
// node:http, not fetch (8 Nov 2026): process.exit after a fetch trips a libuv assertion on Windows (exit code 9, also on success)
const get = p => new Promise((res, rej) => {
  const q = http.get(base + p, { timeout: 5000, agent: false }, r => { let b = ''; r.setEncoding('utf8'); r.on('data', d => b += d); r.on('end', () => { try { res(JSON.parse(b)); } catch (e) { rej(e); } }); });
  q.on('timeout', () => q.destroy(new Error('timeout'))); q.on('error', rej);
});
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

// keep a log (8 Nov 2026: the office stopped three times with nothing to say why): this run's output in data/office.out.log and
// office.err.log, the run before it kept beside them as office.*.prev.log
const log = n => path.join(ROOT, 'data', `office.${n}.log`);
for (const n of ['out', 'err']) try { fs.renameSync(log(n), log(`${n}.prev`)); } catch {}
// started through WMI (8 Nov 2026): every Claude Code session runs inside a Windows job, and a Start-Process child stays in it,
// so archiving the session that ran this killed the office (hub 4 → hub 5). Win32_Process.Create makes the office outside any
// job, minimized (ShowWindow 7), with cmd keeping the logs. (Earlier: a detached PowerShell ran nothing at all.)
const line = `cmd /c ""${process.execPath}" serve.mjs 1>"${log('out')}" 2>"${log('err')}""`;
try {
  const rc = execFileSync('powershell', ['-NoProfile', '-Command', `$s = New-CimInstance -ClassName Win32_ProcessStartup -ClientOnly -Property @{ShowWindow=[uint16]7}; (Invoke-CimMethod Win32_Process -MethodName Create -Arguments @{CommandLine='${line}'; CurrentDirectory='${ROOT}'; ProcessStartupInformation=$s}).ReturnValue`], { encoding: 'utf8', windowsHide: true }).trim();
  if (rc !== '0') fail(`Windows would not start the office (Win32_Process.Create returned ${rc}).`);
} catch (e) { fail(`could not start the office: ${e.message}`); }
// no process.exit on success: exiting while fetch's socket closes trips a libuv assertion on Windows (exit code 9 after a good restart)
let up = false;
for (let i = 0; i < 120 && !up; i++) { await sleep(1000); try { await get('/api/matrix'); up = true; } catch {} }
if (!up) fail('the new office did not answer within 2 minutes. Check its minimized window.');
console.log(`Office restarted on ${base}${pids.size ? ` (stopped pid ${[...pids].join(', ')})` : ''}.`);
