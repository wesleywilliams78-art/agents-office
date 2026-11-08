// Skill updates (8 Nov 2026): the exact edit a suggestion makes to one of the owner's skills, carried out only on his yes.
// Brian's Friday skills review and SUGGEST A REVISION in the Skills sheet both put each suggestion as a yes/no that carries
// SKILL UPDATE blocks. Nothing here runs without that yes. Agents never write a skill themselves.
// Guard rails: skill folders in <brain>/Agents Office/skills/ only (never the shipped skills/), an existing file inside
// that folder, the loader's limits checked on the result before writing, no secrets, the front matter's name kept and its
// agents/departments still valid, the old version copied to the backup folder first. A no is remembered (proposals file).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { parseSkill } from './skills.mjs';
import { SECRET } from './brainnotes.mjs';
import { DEPT_KEYS } from './src/data.js';

export const INSTRUCTIONS = 'SKILL UPDATES\n' +
  'A change to one of the owner\'s skills is never made by you. Each change you suggest goes inside a DECISION, and the text of that decision is one or more blocks exactly like this:\n' +
  'SKILL UPDATE\nskill: <skill name, the folder name>\nfile: SKILL.md | <a file beside it, e.g. template.md>\nmode: add-rule | replace-text | replace-section | append | create\nfind: <exact text to replace; replace-text only>\nsection: <the exact heading; replace-section only>\nreason: <one line>\n---\n<the new text>\nEND SKILL UPDATE\n' +
  'add-rule adds one line under "## Rules" (write the rule only, no dash). replace-text swaps one exact piece found once in the file. replace-section rewrites everything under one heading (leave the heading out). append adds to the end. create makes a new file beside SKILL.md (with replace-section on SKILL.md in the same decision, that moves detail out of a skill near its limit). ' +
  'A yes applies it exactly as written, with no second review, so copy find text character for character from the file you read.';

export const LIMITS = { body: 6000, perFile: 4000, files: 8000 };
const MODES = ['add-rule', 'replace-text', 'replace-section', 'append', 'create'];
const MAX_BLOCKS = 6;
const TEXT = /\.(md|txt|csv|json|ya?ml|html?|xml|tsv)$/i;
const HEAD = /^(#{1,6})\s+(.*?)\s*#*\s*$/;
const hnorm = s => String(s).toLowerCase().replace(/^#+\s*/, '').replace(/[:\s]+$/, '').trim();
const lf = s => String(s).replace(/\r\n/g, '\n');

export function parse(text) {
  const t = String(text || '').replace(/```[a-z]*[ \t]*\r?\n(?=[ \t]*SKILL UPDATE)/g, '').replace(/(END SKILL UPDATE)[ \t]*\r?\n[ \t]*```/g, '$1');
  const re = /^[ \t]*SKILL UPDATE[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n([\s\S]*?)\r?\n[ \t]*END SKILL UPDATE[ \t]*$/gm, out = [];
  for (let m; (m = re.exec(t));) {
    const h = {};
    for (const line of m[1].split(/\r?\n/)) { const k = /^\s*(skill|file|mode|find|section|reason)\s*:\s*(.*)$/i.exec(line); if (k) h[k[1].toLowerCase()] = k[2].trim(); }
    out.push({ skill: h.skill || '', file: h.file || 'SKILL.md', mode: (h.mode || '').toLowerCase(), find: h.find || '', section: h.section || '', reason: h.reason || '', body: lf(m[2]).trim() });
  }
  return out;
}

/** The same suggestion, however it is spaced: what a no is remembered by. */
export const keyOf = blocks => crypto.createHash('sha1').update(blocks.map(b => [b.skill, b.file, b.mode, b.find, b.section, b.body].map(x => String(x).replace(/\s+/g, ' ').trim().toLowerCase()).join('|')).join('\n')).digest('hex').slice(0, 16);

function addRule(text, rule) {
  const line = '- ' + rule.replace(/^\s*[-*]\s+/, '').replace(/\s+/g, ' ').trim();
  const m = text.match(/^##\s+Rules\b[^\n]*\n/im);
  if (!m) return text.replace(/\s*$/, '') + '\n\n## Rules\n' + line + '\n';
  const start = m.index + m[0].length, rest = text.slice(start), next = rest.search(/^#{1,2}\s/m), end = next < 0 ? text.length : start + next;
  const after = text.slice(end);
  return text.slice(0, end).replace(/\s*$/, '\n') + line + '\n' + (after ? '\n' + after : '');
}
function spliceSection(text, section, body) {
  const lines = text.split('\n');
  const start = lines.findIndex(l => { const m = HEAD.exec(l); return m && hnorm(m[2]) === hnorm(section); });
  const level = HEAD.exec(lines[start])[1].length;
  let end = lines.length;
  for (let j = start + 1; j < lines.length; j++) { const m = HEAD.exec(lines[j]); if (m && m[1].length <= level) { end = j; break; } }
  const mine = body.split('\n'); const first = HEAD.exec(mine[0] || ''); if (first && hnorm(first[2]) === hnorm(section)) mine.shift();
  return [...lines.slice(0, start + 1), '', ...mine, ...(end < lines.length ? ['', ...lines.slice(end)] : [''])].join('\n');
}

/**
 * Plan every block of one suggestion. Writes nothing. Blocks on the same file are planned one after the other, so a
 * second edit sees the first. Returns { ok, problem, plans: [{ skill, file, mode, ok, problem }], writes: Map(abs → { before, after, crlf }) }.
 */
export function planAll(skillsDir, blocks, { agentIds = [] } = {}) {
  const root = path.resolve(skillsDir), ids = new Set(agentIds), writes = new Map(), plans = [];
  const fail = (b, problem) => { plans.push({ skill: b.skill, file: b.file, mode: b.mode, ok: false, problem }); };
  if (!blocks.length) return { ok: false, problem: 'no SKILL UPDATE blocks', plans, writes };
  if (blocks.length > MAX_BLOCKS) return { ok: false, problem: `at most ${MAX_BLOCKS} edits in one suggestion`, plans, writes };
  for (const b of blocks) {
    const name = String(b.skill || '').trim().toLowerCase(), file = String(b.file || 'SKILL.md').trim();
    if (!MODES.includes(b.mode)) { fail(b, 'mode must be add-rule, replace-text, replace-section, append or create'); continue; }
    if (!/^[a-z0-9][a-z0-9._-]*$/.test(name)) { fail(b, 'not a skill name'); continue; }
    if (!/^[A-Za-z0-9][A-Za-z0-9._ -]*$/.test(file) || file.includes('..') || !TEXT.test(file)) { fail(b, 'not a file in the skill\'s folder'); continue; }
    const dir = path.resolve(root, name), abs = path.resolve(dir, file);
    if (path.dirname(dir) !== root || path.dirname(abs) !== dir) { fail(b, 'outside Agents Office/skills/'); continue; }
    if (!fs.existsSync(path.join(dir, 'SKILL.md'))) { fail(b, `no skill called ${name} in the Brain (a shipped skill is copied into the Brain first)`); continue; }
    const exists = fs.existsSync(abs) || writes.has(abs);
    if (b.mode === 'create' ? exists || file === 'SKILL.md' : !exists) { fail(b, b.mode === 'create' ? `${name} already has a file called ${file}` : `${name} has no file called ${file}`); continue; }
    if (!b.body) { fail(b, 'no new text'); continue; }
    if (SECRET.some(re => re.test(b.body))) { fail(b, 'looks like it holds a password, key, card number or bank detail'); continue; }
    const cur = writes.get(abs) || (b.mode === 'create' ? { before: '', after: '', crlf: false, created: true, skill: name, file } : (() => { const raw = fs.readFileSync(abs, 'utf8'); return { before: raw, after: lf(raw), crlf: raw.includes('\r\n'), skill: name, file }; })());
    let next = cur.after;
    if (b.mode === 'create') next = b.body + '\n'; // a new file beside SKILL.md: how detail moves out of a skill near its limit
    else if (b.mode === 'replace-text') {
      if (!b.find) { fail(b, 'replace-text needs find:'); continue; }
      const n = next.split(lf(b.find)).length - 1;
      if (!n) { fail(b, 'the text to replace is not in the file'); continue; }
      if (n > 1) { fail(b, 'the text to replace is in the file more than once: give a longer piece'); continue; }
      next = next.replace(lf(b.find), () => b.body);
    } else if (b.mode === 'replace-section') {
      if (!b.section) { fail(b, 'replace-section needs section:'); continue; }
      const hits = next.split('\n').filter(l => { const m = HEAD.exec(l); return m && hnorm(m[2]) === hnorm(b.section); });
      if (hits.length !== 1) { fail(b, hits.length ? `more than one section called "${b.section}"` : `no section called "${b.section}"`); continue; }
      next = spliceSection(next, b.section, b.body);
    } else if (b.mode === 'add-rule') {
      if (b.body.includes('\n')) { fail(b, 'a rule is one line'); continue; }
      next = addRule(next, b.body);
    } else next = next.replace(/\s*$/, '\n') + '\n' + b.body + '\n';
    if (next === cur.after || (b.mode !== 'replace-text' && b.mode !== 'replace-section' && cur.after.replace(/\s+/g, ' ').includes(b.body.replace(/^\s*[-*]\s+/, '').replace(/\s+/g, ' ')))) { fail(b, 'that is already in the skill'); continue; }
    // the loader's limits and the front matter, on the result
    if (file === 'SKILL.md') {
      const was = parseSkill(cur.before), now = parseSkill(next);
      if (!now.body) { fail(b, 'the skill would be empty'); continue; }
      if (now.body.length > LIMITS.body) { fail(b, `SKILL.md would be ${now.body.length} characters, over ${LIMITS.body}: move detail into a file beside it`); continue; }
      const nameWas = String(was.meta.name || name).toLowerCase(), nameNow = String(now.meta.name || name).toLowerCase();
      if (nameWas !== nameNow) { fail(b, 'the skill\'s name cannot change this way'); continue; }
      const list = v => v === undefined ? [] : Array.isArray(v) ? v : String(v).split(',').map(s => s.trim()).filter(Boolean);
      const bad = list(now.meta.agents).map(s => s.toLowerCase()).filter(id => !ids.has(id));
      if (bad.length) { fail(b, `not a desk: ${bad.join(', ')}`); continue; }
      const badD = list(now.meta.departments).map(s => s.toLowerCase()).filter(k => !DEPT_KEYS.includes(k));
      if (badD.length) { fail(b, `not a department: ${badD.join(', ')}`); continue; }
      const boundWas = list(was.meta.agents).length + list(was.meta.departments).length, boundNow = list(now.meta.agents).length + list(now.meta.departments).length;
      if (boundWas && !boundNow) { fail(b, 'the skill would lose its desks and go to every seat'); continue; }
    } else {
      if (next.trim().length > LIMITS.perFile) { fail(b, `${file} would be ${next.trim().length} characters, over ${LIMITS.perFile}`); continue; }
      let total = 0;
      for (const f of fs.readdirSync(dir)) { if (f === 'SKILL.md' || f.startsWith('.') || !TEXT.test(f)) continue; const p = path.join(dir, f); if (!fs.statSync(p).isFile()) continue; total += (p === abs ? next : (writes.get(p)?.after ?? fs.readFileSync(p, 'utf8'))).trim().length; }
      for (const [p, w] of writes) if (w.created && path.dirname(p) === dir && p !== abs) total += w.after.trim().length; // new files planned earlier in this suggestion
      if (cur.created && !writes.has(abs)) total += next.trim().length;
      if (total > LIMITS.files) { fail(b, `the files beside SKILL.md would be ${total} characters, over ${LIMITS.files}`); continue; }
    }
    writes.set(abs, { ...cur, after: next });
    plans.push({ skill: name, file, mode: b.mode, ok: true, problem: '' });
  }
  const no = plans.filter(p => !p.ok);
  return { ok: !no.length, problem: no.map(p => `${p.skill || '?'}/${p.file} (${p.problem})`).join('; '), plans, writes };
}

/** Carry out one suggestion the owner said yes to: all of it or none of it, each changed file backed up first. */
export function applyAll(skillsDir, blocks, { agentIds = [], backupDir } = {}) {
  const p = planAll(skillsDir, blocks, { agentIds });
  if (!p.ok) return { ok: false, message: p.problem, plans: p.plans, backups: [] };
  if (!backupDir) return { ok: false, message: 'no backup folder', plans: p.plans, backups: [] };
  fs.mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-'), backups = [];
  for (const [abs, w] of p.writes) { if (w.created) continue; const bk =path.join(backupDir, `skill__${w.skill}__${w.file}.${stamp}.bak`); fs.copyFileSync(abs, bk); backups.push(bk); }
  for (const [abs, w] of p.writes) fs.writeFileSync(abs, w.crlf ? w.after.replace(/\n/g, '\r\n') : w.after);
  return { ok: true, message: p.plans.map(x => `${x.skill}/${x.file} (${x.mode})`).join(', '), plans: p.plans, backups };
}

// what the owner said no to, per skill, in the proposals file (data/skill-proposals.json, shared with skillaudit.mjs)
export function isDeclined(proposals, blocks) { const k = keyOf(blocks), names = [...new Set(blocks.map(b => String(b.skill).toLowerCase()))]; return names.map(n => (proposals[n]?.declined || []).find(d => d.key === k)).find(Boolean) || null; }
export function remember(proposals, blocks, ask) {
  const k = keyOf(blocks);
  for (const n of new Set(blocks.map(b => String(b.skill).toLowerCase()))) { const p = proposals[n] || (proposals[n] = {}); p.declined = [...(p.declined || []).filter(d => d.key !== k), { key: k, ask: String(ask || '').slice(0, 300), at: Date.now() }].slice(-40); }
  return proposals;
}
