// The Claude Code box (8 Nov 2026): the one place in the office where Claude Code gets file and shell tools. Wesley types in the box
// at the bottom of For You (or says yes to a desk's "Run in Claude Code" decision) and the office runs `claude -p` in the repo,
// one message at a time, resuming the same conversation until he starts a new one. The desks still never get these tools.
//
// Permissions: every tool call goes through scripts/claude-box-hook.mjs (PreToolUse), the only rules the run has:
//   --settings      adds the hook; --setting-sources user drops the repo's local allow list; --permission-mode dontAsk refuses
//                   anything the hook did not allow (nothing is ever prompted in a terminal nobody sees)
//   the hook        claudebox-policy.mjs decides allow / ask / deny; an "ask" is a hold here, shown in the box as a yes/no,
//                   and the hook waits for the answer (10 minutes, then it is a no)
// Runs outlive an office restart: claude is started detached with its output in a log file under data/claude-box/, and the
// office (this one or the next) tails that file. State, history, queue and holds live in data/claude-box.json.
import { spawn, execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const HOLD_MS = 10 * 60 * 1000; // no answer in 10 minutes is a no
const RUN_MS = 90 * 60 * 1000; // a run still going after 90 minutes is stopped
const KEEP = 200; // messages kept in the history

export const PROMPT = 'You are Claude Code in the Agents Office "Claude Code box", where you are called Grace (after Grace Hopper): a headless run (claude -p) that Wesley drives from the office page on his PC or phone. It is not an interactive chat, so do not open with a model line. ' +
  'Reply short and plain; he reads it on a phone. Routine work runs at once (reading, editing files in the repo or the Brain, npm run check, git commit). Risky actions (push, reset, branch switches, deleting or moving files, installs, settings, anything that sends, posts or pays, anything outside the repo and the Brain) are held for his yes or no in the box automatically: just make the call. ' +
  'If a call is refused, do not try another way to do the same thing: say what you wanted to do and why, and stop. ' +
  'To restart the office run `node scripts/restart-office.mjs` (it checks no task is running first); never stop node processes yourself. Never send email: a Gmail draft at most. Never push unless he asks. Other Claude sessions share this folder: commit only your own changes, never stash, reset or switch branches.';

export function create({ root, data, port, bin, binArgs = [], env, ctx, blocked = () => [], prompt = PROMPT, model, effort, onDone, log = console.log }) { // ctx and blocked are read at each run (the connectors are found after start)
  const dir = path.join(data, 'claude-box'), file = path.join(data, 'claude-box.json');
  fs.mkdirSync(path.join(dir, 'scratch'), { recursive: true });
  let S = { sessionId: '', messages: [], queue: [], holds: [], run: null, seq: 0 };
  try { S = { ...S, ...JSON.parse(fs.readFileSync(file, 'utf8')) }; } catch {}
  const save = () => { try { fs.writeFileSync(file + '.tmp', JSON.stringify(S, null, 1)); fs.renameSync(file + '.tmp', file); } catch (e) { log('claude box: could not save, ' + e.message); } };
  const id = p => `${p}${Date.now().toString(36)}${(++S.seq).toString(36)}`;
  const msg = m => { const x = { id: id('m'), at: Date.now(), ...m }; S.messages.push(x); if (S.messages.length > KEEP) S.messages.splice(0, S.messages.length - KEEP); return x; };
  const find = mid => S.messages.find(m => m.id === mid);
  const alive = pid => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } };
  let child = null, tailer = null;

  function send(text, source = null) { // Wesley's message, or a desk step he said yes to
    text = String(text || '').trim().slice(0, 20000); if (!text) throw new Error('say something first');
    const item = { id: id('q'), text, source, fresh: !!source, at: Date.now() };
    msg(source ? { who: 'desk', text, source, item: item.id } : { who: 'you', text, item: item.id });
    S.queue.push(item); save(); pump(); return item;
  }
  function newConversation() { S.sessionId = ''; msg({ who: 'system', text: 'New conversation. Claude Code starts fresh from the next message.' }); save(); }

  function pump() {
    if (S.run || !S.queue.length) return;
    const item = S.queue.shift(), token = crypto.randomBytes(18).toString('hex'), logFile = path.join(dir, `run-${item.id}.jsonl`);
    const out = msg({ who: 'claude', text: '', tools: [], partial: true, item: item.id, ...(item.source ? { source: item.source } : {}) });
    const settings = { hooks: { PreToolUse: [{ matcher: '*', hooks: [{ type: 'command', command: `"${process.execPath}" "${path.join(root, 'scripts', 'claude-box-hook.mjs')}"`, timeout: Math.round(HOLD_MS / 1000) + 90 }] }] } };
    const resume = S.sessionId && !item.fresh ? ['--resume', S.sessionId] : [];
    // the message goes in on stdin and the box prompt as a file: Windows caps a command line at 32,767 characters (spawn ENAMETOOLONG)
    const inFile = path.join(dir, `run-${item.id}.prompt.txt`), sysFile = path.join(dir, 'append-system-prompt.txt'); fs.writeFileSync(inFile, item.text); fs.writeFileSync(sysFile, prompt);
    const args = ['-p', '--output-format', 'stream-json', '--verbose', '--permission-mode', 'dontAsk', '--permission-prompts', 'none', '--setting-sources', 'user', '--settings', JSON.stringify(settings), '--append-system-prompt-file', sysFile, '--no-chrome', ...(blocked().length ? ['--disallowedTools', ...blocked()] : []), ...(model ? ['--model', model] : []), ...(effort ? ['--effort', effort] : []), ...resume];
    const fd = fs.openSync(logFile, 'a'), inFd = fs.openSync(inFile, 'r');
    try {
      child = spawn(bin, [...binArgs, ...args], { cwd: root, detached: true, windowsHide: true, stdio: [inFd, fd, fd], env: { ...env, CLAUDE_BOX_TOKEN: token, CLAUDE_BOX_URL: `http://127.0.0.1:${port}`, CLAUDE_BOX_CTX: JSON.stringify({ ...(typeof ctx === 'function' ? ctx() : ctx), runStart: Date.now() }) } });
    } catch (e) { fs.closeSync(fd); fs.closeSync(inFd); out.text = 'Claude Code did not start: ' + e.message; out.partial = false; out.error = true; save(); return pump(); }
    fs.closeSync(fd); fs.closeSync(inFd);
    S.run = { item, msgId: out.id, pid: child.pid, log: logFile, offset: 0, token, startedAt: Date.now(), buf: '' };
    child.on('exit', () => { child = null; setTimeout(tick, 300); });
    child.unref(); save(); watch();
    log(`⌨ claude box: ${item.source ? `desk step from ${item.source.agentName || item.source.agent} ("${item.source.title}")` : item.text.slice(0, 70)}${resume.length ? ' · same conversation' : ' · new conversation'}`);
  }

  function watch() { if (!tailer) tailer = setInterval(tick, 700); }
  function tick() {
    const r = S.run; if (!r) { clearInterval(tailer); tailer = null; return; }
    let chunk = '';
    try { const size = fs.statSync(r.log).size; if (size > r.offset) { const fd = fs.openSync(r.log, 'r'), b = Buffer.alloc(size - r.offset); fs.readSync(fd, b, 0, b.length, r.offset); fs.closeSync(fd); r.offset = size; chunk = b.toString('utf8'); } } catch {}
    if (chunk) { const lines = (r.buf + chunk).split('\n'); r.buf = lines.pop(); for (const l of lines) event(r, l); save(); }
    const running = child ? true : alive(r.pid);
    if (running && Date.now() - r.startedAt > RUN_MS) { stop('it ran for 90 minutes'); return; }
    if (!running) finish(r);
  }
  function event(r, line) {
    let j; try { j = JSON.parse(line); } catch { return; }
    const m = find(r.msgId); if (!m) return;
    if (j.session_id && j.type === 'system' && j.subtype === 'init') { S.sessionId = j.session_id; m.conv = j.session_id; }
    if (j.type === 'assistant') for (const c of j.message?.content || []) {
      if (c.type === 'text' && c.text.trim()) m.text = (m.text ? m.text + '\n\n' : '') + c.text.trim();
      if (c.type === 'tool_use') m.tools.push({ id: c.id, name: c.name, label: toolLabel(c.name, c.input), at: Date.now() });
    }
    if (j.type === 'user') for (const c of j.message?.content || []) if (c.type === 'tool_result') {
      const t = m.tools.find(x => x.id === c.tool_use_id); if (!t) continue;
      t.done = Date.now(); if (c.is_error) { t.error = true; const e = typeof c.content === 'string' ? c.content : (c.content || []).map(x => x.text || '').join(' '); if (/hook error/i.test(e)) t.refused = e.replace(/^.*?hook error:\s*/i, '').slice(0, 200); }
    }
    if (j.type === 'result') { if (j.session_id) S.sessionId = j.session_id; m.cost = j.total_cost_usd; m.error = !!j.is_error; if (j.result && !m.text.includes(j.result.trim())) m.text = (m.text ? m.text + '\n\n' : '') + j.result.trim(); m.result = true; }
  }
  function finish(r) {
    if (r.buf) { event(r, r.buf); r.buf = ''; }
    const m = find(r.msgId);
    if (m) { m.partial = false; if (!m.result && !m.text) { m.error = true; m.text = 'Claude Code stopped without an answer.' + tailOf(r.log); } m.ms = Date.now() - r.startedAt; }
    for (const h of S.holds) if (h.run === r.item.id && h.state === 'waiting') { h.state = 'no'; h.why = 'the run ended'; }
    S.run = null; S.holds = S.holds.filter(h => Date.now() - h.at < 24 * 3600 * 1000).slice(-30); save();
    clearInterval(tailer); tailer = null;
    log(`⌨ claude box: ${m?.error ? 'stopped with an error' : 'done'}${m?.tools?.length ? ' · ' + m.tools.length + ' tool call(s)' : ''}`);
    if (r.item.source && onDone) { try { onDone(r.item, { ok: !m?.error, text: m?.text || '', refused: (m?.tools || []).filter(t => t.refused).map(t => t.label) }); } catch (e) { log('claude box: ' + e.message); } }
    setTimeout(pump, 200);
  }
  const tailOf = f => { try { const t = fs.readFileSync(f, 'utf8').split('\n').filter(l => l.trim() && !l.startsWith('{')).slice(-3).join(' ').slice(0, 300); return t ? ' ' + t : ''; } catch { return ''; } };
  function stop(why = 'you stopped it') {
    const r = S.run; if (!r) return false;
    try { if (process.platform === 'win32') execFileSync('taskkill', ['/PID', String(r.pid), '/T', '/F'], { stdio: 'ignore' }); else process.kill(-r.pid); } catch {}
    const m = find(r.msgId); if (m) m.text = (m.text ? m.text + '\n\n' : '') + `Stopped: ${why}.`;
    child = null; finish(r); return true;
  }

  // holds: a risky call waiting for Wesley. The hook creates one and polls it; the box shows it as a yes/no
  function hold(token, h) {
    const r = S.run; if (!r || !token || token !== r.token) return null;
    const x = { id: id('h'), run: r.item.id, msgId: r.msgId, at: Date.now(), state: 'waiting', tool: String(h.tool || '').slice(0, 80), label: String(h.label || h.tool || '').slice(0, 300), reason: String(h.reason || '').slice(0, 200), detail: String(h.detail || '').slice(0, 1500) };
    S.holds.push(x); save(); log(`⌨ claude box: holding for your yes or no: ${x.label}`); return x;
  }
  function holdState(token, hid) {
    const x = S.holds.find(h => h.id === hid); if (!x) return null;
    const r = S.run; if (!r || token !== r.token || x.run !== r.item.id) return { state: 'no', why: 'the run is over' };
    if (x.state === 'waiting' && Date.now() - x.at > HOLD_MS) { x.state = 'expired'; save(); }
    return { state: x.state, why: x.why || '' };
  }
  function answer(hid, yes, who) {
    const x = S.holds.find(h => h.id === hid); if (!x) throw new Error('no such question');
    if (x.state !== 'waiting') return x;
    if (Date.now() - x.at > HOLD_MS) { x.state = 'expired'; save(); return x; }
    x.state = yes ? 'yes' : 'no'; x.by = who; x.answeredAt = Date.now(); save();
    log(`⌨ claude box: ${yes ? 'yes' : 'no'} from ${who}: ${x.label}`); return x;
  }

  function state() {
    for (const x of S.holds) if (x.state === 'waiting' && Date.now() - x.at > HOLD_MS) x.state = 'expired';
    const r = S.run, m = r && find(r.msgId), now = m && [...(m.tools || [])].reverse().find(t => !t.done);
    return { messages: S.messages.slice(-80), busy: !!r, startedAt: r?.startedAt || 0, tool: now ? now.label : '', holds: S.holds.filter(h => h.state === 'waiting'), queued: S.queue.map(q => ({ id: q.id, text: q.text.slice(0, 140), source: q.source })), conversation: S.sessionId ? S.sessionId.slice(0, 8) : '' };
  }
  function resumeAfterRestart() { // the office restarted while a run was going: keep tailing it (or finish it), then carry on with the queue
    if (S.run) { log(`⌨ claude box: picking up the run that was going (${alive(S.run.pid) ? 'still running' : 'finished while the office was down'})`); watch(); tick(); }
    else pump();
  }
  return { send, newConversation, stop, hold, holdState, answer, state, resumeAfterRestart, get busy() { return !!S.run; } };
}

export function toolLabel(name, input = {}) {
  const f = p => String(p || '').replace(/^.*[\\/](agents-office|Agents Office Brain)[\\/]/i, '').slice(-80);
  if (name === 'Bash' || name === 'PowerShell') return (input.description ? input.description + ': ' : '') + String(input.command || '').split('\n')[0].slice(0, 120);
  if (name === 'Read') return 'Read ' + f(input.file_path);
  if (name === 'Edit' || name === 'MultiEdit') return 'Edit ' + f(input.file_path);
  if (name === 'Write') return 'Write ' + f(input.file_path);
  if (name === 'Grep') return `Search for "${String(input.pattern || '').slice(0, 50)}"`;
  if (name === 'Glob') return 'Find ' + String(input.pattern || '').slice(0, 60);
  if (name === 'WebFetch') return 'Read ' + String(input.url || '').slice(0, 80);
  if (name === 'WebSearch') return 'Search the web: ' + String(input.query || '').slice(0, 60);
  if (name === 'Task' || name === 'Agent') return 'Helper: ' + String(input.description || '').slice(0, 60);
  if (name === 'TodoWrite') return 'Update its plan';
  return name.replace(/^mcp__/, '').replace(/__/g, ' · ');
}
