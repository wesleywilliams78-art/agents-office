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
  'One task may change up to 3 different notes and up to 12 sections in all (for example every day of a week in one note, one block per day). Anything beyond that is refused, so if you need more, finish what fits and say plainly what is left. ' +
  'Check the note first and only file what is new: an update already in the note is refused. Keep each one short and factual, in the note\'s own style. Never include passwords, API keys, card numbers or bank sort codes and account numbers.';

const MODES = ['append', 'replace-section', 'create', 'replace-text', 'move', 'archive']; // 8 Nov 2026, Brian's fixes: replace-text swaps one exact piece of a line (a broken link, a stale fact);
// move renames or refiles a note and rewrites the [[links]] to it; archive moves it under 99-Archive/ (nothing is ever deleted). Both back up every note they touch.
const ARCHIVE = '99-Archive', MAX_RELINK = 25;
const MAX_BODY = 20000, MAX_PER_TASK = 3, MAX_UPDATES = 12; // different notes per task, and updates in all

export function parse(text) {
  const t = String(text || '').replace(/```[a-z]*[ \t]*\r?\n(?=[ \t]*BRAIN UPDATE)/g, '').replace(/(END BRAIN UPDATE)[ \t]*\r?\n[ \t]*```/g, '$1');
  const re = /^[ \t]*BRAIN UPDATE[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n([\s\S]*?)\r?\n[ \t]*END BRAIN UPDATE[ \t]*$/gm, out = [];
  for (let m; (m = re.exec(t));) {
    const h = {};
    for (const line of m[1].split(/\r?\n/)) { const k = /^\s*(note|mode|section|find|to|reason)\s*:\s*(.*)$/i.exec(line); if (k) h[k[1].toLowerCase()] = k[2].trim(); }
    out.push({ note: h.note || '', mode: (h.mode || '').toLowerCase(), section: h.section || '', find: h.find || '', to: h.to || '', reason: h.reason || '', body: m[2].trim() });
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
export const SECRET = [/\bsort\s*code\b/i, /\b(?:\d[ -]?){13,19}\b/, /\bIBAN\b/i, /\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/, /\b(?:password|passcode|api[_ -]?key|secret|token)\s*[:=]\s*\S+/i, /\bsk-[A-Za-z0-9_-]{16,}/];
const norm = s => String(s).toLowerCase().replace(/^#+\s*/, '').replace(/[:\s]+$/, '').trim();
const HEAD = /^(#{1,6})\s+(.*?)\s*#*\s*$/;

// where a note is, and whether the change is allowed and possible. Writes nothing.
export function plan(brain, b, { deny = [] } = {}) {
  const r = { note: b.note, mode: b.mode, section: b.section, ok: false, problem: '', rel: '' };
  const fail = p => { r.problem = p; return r; };
  if (!MODES.includes(b.mode)) return fail('mode must be append, replace-section, replace-text, create, move or archive');
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
  if (b.mode === 'append' && !exists) { b.mode = 'create'; r.mode = 'create'; } // appending to a note that is not there yet starts the note
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
    if (b.mode === 'move' || b.mode === 'archive') {
      const lower = n.toLowerCase();
      if (b.mode === 'archive' && lower.startsWith(ARCHIVE.toLowerCase() + '/')) return fail('that note is already archived');
      let to = b.mode === 'archive' ? `${ARCHIVE}/${n}` : String(b.to || '').trim().replace(/\\/g, '/').replace(/^\.?\/+/, '');
      if (!to) return fail('move needs to: the new folder/name.md');
      if (!/\.md$/i.test(to)) to += '.md';
      if (to.split('/').some(s => !s || s === '.' || s === '..' || s.startsWith('.') || /[:*?"<>|]/.test(s))) return fail('not a valid path to move to');
      if (to.split('/')[0].toLowerCase() === 'agents office' || to.toLowerCase() === 'claude.md') return fail('a note cannot be moved there');
      if (deny.some(d => to.toLowerCase().startsWith(String(d).toLowerCase()))) return fail('that folder is switched off for agents in office.config.json');
      const toAbs = path.resolve(brain, to), toRel = path.relative(brain, toAbs);
      if (toRel.startsWith('..') || path.isAbsolute(toRel)) return fail('outside the brain');
      if (to.toLowerCase() === lower) return fail('that is where it already is');
      if (all.some(x => x.toLowerCase() === to.toLowerCase())) return fail(`there is already a note at ${to}`);
      const linkers = linkersOf(brain, all, n);
      if (b.mode === 'move' && linkers.length > MAX_RELINK) return fail(`${linkers.length} notes link to it, more than ${MAX_RELINK}: list it for Claude Code`);
      r.to = to; r.toAbs = toAbs; r.linkers = b.mode === 'move' ? linkers.length : 0;
    }
    if (b.mode === 'replace-text') {
      if (!b.find) return fail('replace-text needs find: the exact text to replace');
      if (b.find === b.body) return fail('the new text is the same as the old');
      const n = text.split(b.find).length - 1;
      if (!n) return fail('the text to replace is not in that note');
      if (n > 1) return fail('the text to replace is in that note more than once: give a longer piece');
    }
  }
  r.ok = true; return r;
}

// A task may change up to MAX_PER_TASK different notes and up to MAX_UPDATES sections in all. The limit used to be three updates in total, so a week of
// day-by-day sections in one note (five updates) silently lost the last two, and the follow-up tasks re-did it in a loop.
export function planAll(brain, blocks, opts) {
  const notes = new Set();
  return blocks.map((b, i) => {
    const key = String(b.note || '').trim().toLowerCase();
    if (i >= MAX_UPDATES) return { note: b.note, mode: b.mode, ok: false, problem: `only ${MAX_UPDATES} updates per task` };
    if (!notes.has(key) && notes.size >= MAX_PER_TASK) return { note: b.note, mode: b.mode, ok: false, problem: `only ${MAX_PER_TASK} different notes per task` };
    notes.add(key); return plan(brain, b, opts);
  });
}

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

// [[links]] to a note, outside the agents' own area and the rules file. A bare-name link counts only when no other note has that name.
const LINK = /(!?\[\[)([^\]|#^]+)([^\]]*\]\])/g;
const canLink = x => !/^agents office\//i.test(x) && x.toLowerCase() !== 'claude.md';
const targets = (all, rel) => { const noExt = rel.replace(/\.md$/i, '').toLowerCase(), base = noExt.split('/').pop(), unique = all.filter(x => x.split('/').pop().replace(/\.md$/i, '').toLowerCase() === base).length === 1; return k => { k = k.trim().toLowerCase().replace(/\.md$/, ''); return k === noExt || (unique && k === base); }; };
function linkersOf(brain, all, rel) { const hit = targets(all, rel); return all.filter(x => x !== rel && canLink(x)).filter(x => { const t = fs.readFileSync(path.join(brain, x), 'utf8'); for (const m of t.matchAll(LINK)) if (hit(m[2])) return true; return false; }); }
const backup = (backupDir, rel, abs) => { if (!backupDir) return; fs.mkdirSync(backupDir, { recursive: true }); fs.copyFileSync(abs, path.join(backupDir, `${rel.replace(/\//g, '__')}.${new Date().toISOString().replace(/[:.]/g, '-')}.md`)); };

// files the allowed updates; the previous version of a changed note is copied to backupDir first
export function applyAll(brain, blocks, { deny = [], backupDir } = {}) {
  const plans = planAll(brain, blocks, { deny }), done = [];
  plans.forEach((p, i) => {
    const out = { note: p.rel || p.note, mode: p.mode, ok: false, message: p.problem };
    if (p.ok) {
      try {
        const b = blocks[i], exists = fs.existsSync(p.abs);
        if (exists) backup(backupDir, p.rel, p.abs);
        if (p.mode === 'move' || p.mode === 'archive') { // the note goes to its new place; for a move, every link to it follows (each linking note backed up first)
          let relinked = 0;
          if (p.mode === 'move') {
            const all = listNotes(brain), hit = targets(all, p.rel), newBase = p.to.replace(/\.md$/i, '').split('/').pop(), baseFree = !all.some(x => x !== p.rel && x.split('/').pop().replace(/\.md$/i, '').toLowerCase() === newBase.toLowerCase());
            for (const x of linkersOf(brain, all, p.rel)) {
              const ax = path.join(brain, x), t = fs.readFileSync(ax, 'utf8');
              const nt = t.replace(LINK, (m, a, k, rest) => hit(k) ? a + (baseFree && !k.includes('/') ? newBase : p.to.replace(/\.md$/i, '')) + rest : m);
              if (nt !== t) { backup(backupDir, x, ax); fs.writeFileSync(ax, nt); relinked++; }
            }
          }
          fs.mkdirSync(path.dirname(p.toAbs), { recursive: true }); fs.renameSync(p.abs, p.toAbs);
          out.ok = true; out.message = `${p.mode === 'archive' ? 'archived' : 'moved'} to ${p.to}${p.mode === 'move' ? `, links updated in ${relinked} note${relinked === 1 ? '' : 's'}` : ''}`; done.push(out); return;
        }
        if (p.mode === 'create') { fs.mkdirSync(path.dirname(p.abs), { recursive: true }); fs.writeFileSync(p.abs, b.body + '\n'); }
        else if (p.mode === 'append') fs.writeFileSync(p.abs, fs.readFileSync(p.abs, 'utf8').replace(/\s*$/, '\n') + '\n' + b.body + '\n');
        else if (p.mode === 'replace-text') { const t = fs.readFileSync(p.abs, 'utf8'), i = t.indexOf(b.find); fs.writeFileSync(p.abs, t.slice(0, i) + b.body + t.slice(i + b.find.length)); }
        else fs.writeFileSync(p.abs, spliceSection(fs.readFileSync(p.abs, 'utf8'), b.section, b.body));
        out.ok = true; out.message = p.mode === 'create' ? 'created' : p.mode === 'append' ? 'added to the end' : p.mode === 'replace-text' ? 'text replaced' : `section "${b.section}" replaced`;
      } catch (e) { out.message = e.message; }
    }
    done.push(out);
  });
  return done;
}
