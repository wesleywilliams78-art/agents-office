// "Needs you" (V3.12, 2 Nov 2026): which Claude Code sessions on this PC are waiting on Wesley, from the hooks in his user settings
// (scripts/attention-hook.mjs). Each hook says what just happened in one session:
//   UserPromptSubmit → working (he replied; Claude is on it)   Stop → waiting (Claude finished its turn)
//   Notification     → needs (a permission prompt) or waiting  SessionEnd → gone
// The title is the session's name in the desktop sidebar (custom-title in the transcript), else his first request; the last line is
// Claude's last words. Transcripts are read only under ~/.claude/projects. The Telegram listener's turns are left out (they are
// answered on Telegram). Kept in data/attention.json; a session quiet for 3 days drops off, and a waiting one can be dismissed.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const file = dataDir => path.join(dataDir, 'attention.json');
const PROJECTS = path.join(os.homedir(), '.claude', 'projects');
const KEEP = 3 * 86400000;
export const load = dataDir => { try { return JSON.parse(fs.readFileSync(file(dataDir), 'utf8')); } catch { return { sessions: {} }; } };
const save = (dataDir, s) => { fs.mkdirSync(dataDir, { recursive: true }); fs.writeFileSync(file(dataDir), JSON.stringify(s, null, 2)); };

// the text of a transcript line's message, or '' (tool results and the app's own wrappers are not words anyone wrote)
const textOf = j => {
  const c = j && j.message && j.message.content;
  const t = typeof c === 'string' ? c : Array.isArray(c) ? c.filter(b => b && b.type === 'text').map(b => b.text).join('\n') : '';
  return String(t || '').trim();
};
const readSlice = (f, from, len) => { const fd = fs.openSync(f, 'r'); try { const b = Buffer.alloc(len); const n = fs.readSync(fd, b, 0, len, from); return b.subarray(0, n).toString('utf8'); } finally { fs.closeSync(fd); } };
export function readTranscript(f) {
  const out = { title: '', first: '', last: '', telegram: false };
  const abs = path.resolve(String(f || ''));
  if (!abs.toLowerCase().startsWith(PROJECTS.toLowerCase() + path.sep) || !/\.jsonl$/i.test(abs) || !fs.existsSync(abs)) return out;
  const size = fs.statSync(abs).size;
  const lines = t => t.split('\n').map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  const head = lines(readSlice(abs, 0, Math.min(size, 96000))), tail = size > 96000 ? lines(readSlice(abs, Math.max(0, size - 400000), Math.min(size, 400000))) : head;
  for (const j of [...head, ...tail]) if (j.type === 'custom-title' && j.customTitle) out.title = j.customTitle;
  const firstUser = head.find(j => j.type === 'user' && textOf(j) && !/^<(command|local-command|system-reminder)/.test(textOf(j)));
  out.first = firstUser ? textOf(firstUser) : '';
  out.telegram = /<channel source="telegram"/.test(out.first);
  const lastA = [...tail].reverse().find(j => j.type === 'assistant' && textOf(j));
  out.last = lastA ? textOf(lastA) : '';
  return out;
}

const STATE = { UserPromptSubmit: 'working', Stop: 'waiting', SubagentStop: null, SessionEnd: 'gone' };
export function hook(dataDir, b) {
  const id = String(b.session || '').replace(/[^\w-]/g, '').slice(0, 64); if (!id) return null;
  let state = b.event === 'Notification' ? (/permission/i.test(b.message || '') ? 'needs' : 'waiting') : STATE[b.event];
  if (!state) return null;
  const s = load(dataDir), now = Date.now(), cur = s.sessions[id] || { id, startedAt: now };
  if (state === 'gone') { delete s.sessions[id]; save(dataDir, s); return { id, state }; }
  // an idle reminder after Claude has already finished changes nothing; a permission prompt answered goes back to working on the next hook
  if (b.event === 'Notification' && state === 'waiting' && cur.state === 'waiting') return cur;
  const t = state === 'working' && cur.title ? { title: cur.title, first: cur.first, telegram: cur.telegram, last: cur.last } : readTranscript(b.transcript);
  if (t.telegram) { if (s.sessions[id]) { delete s.sessions[id]; save(dataDir, s); } return null; }
  Object.assign(cur, { state, at: now, cwd: String(b.cwd || cur.cwd || ''), transcript: String(b.transcript || cur.transcript || ''), entry: String(b.entry || cur.entry || ''),
    title: t.title || cur.title || '', first: (t.first || cur.first || '').slice(0, 400), last: state === 'working' ? cur.last || '' : (t.last || '').slice(-600),
    message: state === 'needs' ? String(b.message || '').slice(0, 200) : '', dismissed: false });
  s.sessions[id] = cur;
  for (const [k, v] of Object.entries(s.sessions)) if (now - (v.at || 0) > KEEP) delete s.sessions[k];
  save(dataDir, s);
  return cur;
}
export function dismiss(dataDir, id) { const s = load(dataDir); if (s.sessions[id]) { s.sessions[id].dismissed = true; save(dataDir, s); return true; } return false; }
export function list(dataDir, now = Date.now()) { return Object.values(load(dataDir).sessions).filter(v => now - (v.at || 0) <= KEEP).sort((a, b) => a.at - b.at); }
