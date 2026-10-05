// Reviewed Brain updates — the one way an agent changes a note in the brain.
// Agents have no file tools. A finished task may end with BRAIN UPDATE blocks (see INSTRUCTIONS); the owner sees them
// on the review card and the office files them only when the owner approves. Nothing here runs without that approval.
// Guard rails: Markdown notes inside the brain only, never the agents' own area (skills, lessons, task notes) or the
// brain's rules file, no passwords/keys/card or bank details, the old version is kept, an identical update is refused.
import fs from 'node:fs';
import path from 'node:path';

export const INSTRUCTIONS = 'BRAIN NOTES\n' +
  'You cannot edit notes yourself. When the task is to record, file, correct or maintain something in a Brain note (an existing one or a new one), end your result with one block per note, exactly like this:\n' +
  'BRAIN UPDATE\nnote: <folder/name.md>\nmode: append | replace-section | create\nsection: <the exact heading to replace; replace-section only>\nreason: <one line>\n---\n<the markdown to file>\nEND BRAIN UPDATE\n' +
  'The owner sees it on the review card and it is filed only when he approves, so never say it has been filed. append adds to the end of a note, replace-section rewrites the content under one heading (leave the heading out of your text), create makes a note that does not exist yet. ' +
  'Check the note first and only file what is new: an update already in the note is refused. Keep each one short and factual, in the note\'s own style. Never include passwords, API keys, card numbers or bank sort codes and account numbers.';

const MODES = ['append', 'replace-section', 'create'];
const MAX_BODY = 20000, MAX_PER_TASK = 3;

export function parse(text) {
  const t = String(text || '').replace(/```[a-z]*[ \t]*\r?\n(?=[ \t]*BRAIN UPDATE)/g, '').replace(/(END BRAIN UPDATE)[ \t]*\r?\n[ \t]*```/g, '$1');
  const re = /^[ \t]*BRAIN UPDATE[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n([\s\S]*?)\r?\n[ \t]*END BRAIN UPDATE[ \t]*$/gm, out = [];
  for (let m; (m = re.exec(t));) {
    const h = {};
    for (const line of m[1].split(/\r?\n/)) { const k = /^\s*(note|mode|section|reason)\s*:\s*(.*)$/i.exec(line); if (k) h[k[1].toLowerCase()] = k[2].trim(); }
    out.push({ note: h.note || '', mode: (h.mode || '').toLowerCase(), section: h.section || '', reason: h.reason || '', body: m[2].trim() });
  }
  return out;
}

function listNotes(brain, dir = '', acc = []) {
  for (const e of fs.readdirSync(path.join(brain, dir), { withFileTypes: true })) {
    if (e.name.startsWith('.')) continue;
    const rel = dir ? `${dir}/${e.name}` : e.name;
    if (e.isDirectory()) listNotes(brain, rel, acc); else if (/\.md$/i.test(e.name)) acc.push(rel);
  }
  return acc;
}
const SECRET = [/\bsort\s*code\b/i, /\b(?:\d[ -]?){13,19}\b/, /\bIBAN\b/i, /\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/, /\b(?:password|passcode|api[_ -]?key|secret|token)\s*[:=]\s*\S+/i, /\bsk-[A-Za-z0-9_-]{16,}/];
const norm = s => String(s).toLowerCase().replace(/^#+\s*/, '').replace(/[:\s]+$/, '').trim();
const HEAD = /^(#{1,6})\s+(.*?)\s*#*\s*$/;

// where a note is, and whether the change is allowed and possible. Writes nothing.
export function plan(brain, b, { deny = [] } = {}) {
  const r = { note: b.note, mode: b.mode, section: b.section, ok: false, problem: '', rel: '' };
  const fail = p => { r.problem = p; return r; };
  if (!MODES.includes(b.mode)) return fail('mode must be append, replace-section or create');
  if (!b.body) return fail('nothing to file');
  if (b.body.length > MAX_BODY) return fail('too long for one update');
  if (SECRET.some(re => re.test(b.body))) return fail('looks like it holds a password, key, card number or bank detail, which never goes in the brain');
  let n = String(b.note || '').trim().replace(/\\/g, '/').replace(/^\.?\/+/, '');
  if (!n) return fail('no note named');
  if (!/\.md$/i.test(n)) n += '.md';
  const segs = n.split('/');
  if (segs.some(s => !s || s === '.' || s === '..' || s.startsWith('.') || /[:*?"<>|]/.test(s))) return fail('not a valid note path');
  const all = listNotes(brain);
  const exact = all.find(x => x.toLowerCase() === n.toLowerCase());
  if (exact) n = exact;
  else if (segs.length === 1) { // a bare name: find the one note called that
    const hits = all.filter(x => x.split('/').pop().toLowerCase() === n.toLowerCase());
    if (hits.length === 1) n = hits[0];
    else if (hits.length > 1) return fail(`more than one note is called ${n}: give the folder`);
    else if (b.mode === 'create') return fail('name the folder for a new note, for example 80-Finance/name.md');
  }
  const top = n.split('/')[0].toLowerCase();
  if (top === 'agents office') return fail('the agents\' own area (skills, lessons, task notes) is not changed this way');
  if (n.toLowerCase() === 'claude.md') return fail('the brain\'s rules file is not changed this way');
  if (deny.some(d => n.toLowerCase().startsWith(String(d).toLowerCase()))) return fail('this note is switched off for agents in office.config.json');
  const abs = path.resolve(brain, n), rel = path.relative(brain, abs);
  if (rel.startsWith('..') || path.isAbsolute(rel)) return fail('outside the brain');
  r.rel = n; r.abs = abs;
  const exists = fs.existsSync(abs);
  if (b.mode === 'create' && exists) return fail('that note already exists: use append or replace-section');
  if (b.mode !== 'create' && !exists) return fail('no such note: use create');
  if (exists) {
    const text = fs.readFileSync(abs, 'utf8');
    if (b.mode === 'append' && text.includes(b.body)) return fail('that is already in the note');
    if (b.mode === 'replace-section') {
      if (!b.section) return fail('replace-section needs the section heading');
      const hits = text.split(/\r?\n/).filter(l => { const m = HEAD.exec(l); return m && norm(m[2]) === norm(b.section); });
      if (!hits.length) return fail(`no section called "${b.section}" in that note`);
      if (hits.length > 1) return fail(`more than one section called "${b.section}"`);
    }
  }
  r.ok = true; return r;
}

export function planAll(brain, blocks, opts) { return blocks.map((b, i) => i >= MAX_PER_TASK ? { note: b.note, mode: b.mode, ok: false, problem: `only ${MAX_PER_TASK} updates per task` } : plan(brain, b, opts)); }

function spliceSection(text, section, body) {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex(l => { const m = HEAD.exec(l); return m && norm(m[2]) === norm(section); });
  const level = HEAD.exec(lines[start])[1].length;
  let end = lines.length;
  for (let j = start + 1; j < lines.length; j++) { const m = HEAD.exec(lines[j]); if (m && m[1].length <= level) { end = j; break; } }
  const mine = body.split(/\r?\n/);
  const first = HEAD.exec(mine[0] || ''); if (first && norm(first[2]) === norm(section)) mine.shift(); // the agent repeated the heading
  return [...lines.slice(0, start + 1), '', ...mine, ...(end < lines.length ? ['', ...lines.slice(end)] : [''])].join('\n');
}

// files the allowed updates; the previous version of a changed note is copied to backupDir first
export function applyAll(brain, blocks, { deny = [], backupDir } = {}) {
  const plans = planAll(brain, blocks, { deny }), done = [];
  plans.forEach((p, i) => {
    const out = { note: p.rel || p.note, mode: p.mode, ok: false, message: p.problem };
    if (p.ok) {
      try {
        const b = blocks[i], exists = fs.existsSync(p.abs);
        if (exists && backupDir) { fs.mkdirSync(backupDir, { recursive: true }); fs.copyFileSync(p.abs, path.join(backupDir, `${p.rel.replace(/\//g, '__')}.${new Date().toISOString().replace(/[:.]/g, '-')}.md`)); }
        if (p.mode === 'create') { fs.mkdirSync(path.dirname(p.abs), { recursive: true }); fs.writeFileSync(p.abs, b.body + '\n'); }
        else if (p.mode === 'append') fs.writeFileSync(p.abs, fs.readFileSync(p.abs, 'utf8').replace(/\s*$/, '\n') + '\n' + b.body + '\n');
        else fs.writeFileSync(p.abs, spliceSection(fs.readFileSync(p.abs, 'utf8'), b.section, b.body));
        out.ok = true; out.message = p.mode === 'create' ? 'created' : p.mode === 'append' ? 'added to the end' : `section "${b.section}" replaced`;
      } catch (e) { out.message = e.message; }
    }
    done.push(out);
  });
  return done;
}
