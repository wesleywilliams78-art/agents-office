// Agents Office: lead-proposed lessons (4 Nov 2026). Handover: docs/HANDOVER-4-nov-lead-lessons-build.md.
// When the lead bounces a draft, or passes one that could have been better, it may propose ONE general rule for the skill the
// desk followed. Nothing is written until the owner says yes on the AIOS card; a yes appends the rule under the skill's
// "## Rules" heading (no model call, the old file backed up first). No fitting skill: the rule goes to the desk's standing rules.
import fs from 'node:fs';
import path from 'node:path';

const BODY_MAX = 6000; // the skill loader trims a body past this (skills.mjs LIMITS.body)
const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** The verdict's lesson field → { skill, rule } or null. Malformed is dropped, never guessed. */
export function parse(j) {
  if (!j || typeof j !== 'object') return null;
  const rule = String(j.rule || '').replace(/\s+/g, ' ').trim(), skill = String(j.skill || '').trim().toLowerCase();
  if (rule.length < 8 || rule.length > 240) return null;
  return { skill, rule };
}

/** Vet and place a proposed lesson. skills: the loaded skills; deskSkills: task.skills; clients: names never allowed in a rule;
 *  seen: rules the owner already answered on this task. → { lesson } or { refused: '<why>' }. */
export function vet({ lesson, skills = [], deskSkills = [], clients = [], seen = [] }) {
  if (!lesson || !lesson.rule) return { refused: 'no lesson' };
  const rule = lesson.rule;
  if (/[0-9£$€%]/.test(rule)) return { refused: 'it carries a figure' };
  const n = ' ' + norm(rule) + ' ';
  const who = clients.map(c => String(c || '').trim()).filter(c => c.length > 2).find(c => n.includes(' ' + norm(c) + ' '));
  if (who) return { refused: `it names ${who}` };
  if (seen.some(s => norm(s) === norm(rule))) return { refused: 'already answered on this task' };
  const usable = s => s && s.source === 'brain'; // never write into the repo's shipped skills
  const followed = deskSkills.map(name => skills.find(s => s.name === name)).filter(usable);
  const named = followed.find(s => s.name === lesson.skill);
  const pick = named || followed.find(s => !s.everyone);
  const at = Date.now();
  if (!pick) return { lesson: { skill: '', rule, target: 'rules', status: 'proposed', at } };
  return { lesson: { skill: pick.name, rule, target: 'skill', ...(pick.everyone ? { shared: true } : {}), status: 'proposed', at } };
}

/** The question on the card. */
export function card(lesson, leadName, deskName) {
  if (!lesson) return '';
  const where = lesson.target === 'skill' ? `adding this rule to ${lesson.skill}` : `adding this to ${deskName}'s standing rules`;
  return `${leadName} suggests ${where}: "${lesson.rule}"${/[.!?]$/.test(lesson.rule) ? '' : '.'} Tell ${deskName} to adopt it from now on?` +
    (lesson.shared ? ` (${lesson.skill} is shared: this affects every desk.)` : '');
}

/** Append the rule under "## Rules" in the skill file. Backs up first, skips a duplicate, refuses past the body cap.
 *  → { ok: true, path, backup } | { ok: true, skipped: '<why>' } | { ok: false, reason } */
export function applyToSkill({ file, skillsDir, rule, backupDir, date = new Date().toISOString().slice(0, 10) }) {
  const abs = path.resolve(file), root = path.resolve(skillsDir);
  if (!abs.startsWith(root + path.sep) || path.basename(abs) !== 'SKILL.md') return { ok: false, reason: 'the skill is not in the brain\'s skills folder' };
  if (!fs.existsSync(abs)) return { ok: false, reason: 'the skill file is gone' };
  const text = fs.readFileSync(abs, 'utf8');
  if (norm(text).includes(norm(rule))) return { ok: true, skipped: 'the rule is already in the skill' };
  const nl = text.includes('\r\n') ? '\r\n' : '\n', line = `- ${rule} (lead, ${date})`;
  let out; const m = text.match(/^##\s+Rules\b[^\n]*\n/im);
  if (m) {
    const start = m.index + m[0].length, rest = text.slice(start), next = rest.search(/^#{1,2}\s/m);
    const end = next < 0 ? text.length : start + next;
    const before = text.slice(0, end).replace(/\s*$/, nl), after = text.slice(end);
    out = before + line + nl + (after ? nl + after : '');
  } else out = text.replace(/\s*$/, '') + nl + nl + '## Rules' + nl + line + nl;
  const body = out.replace(/^﻿?---\r?\n[\s\S]*?\r?\n---\r?\n?/, '').trim();
  if (body.length > BODY_MAX) return { ok: false, reason: `the skill would pass ${BODY_MAX.toLocaleString('en-GB')} characters (${body.length.toLocaleString('en-GB')}); fold some rules together first` };
  fs.mkdirSync(backupDir, { recursive: true });
  const backup = path.join(backupDir, `skill__${path.basename(path.dirname(abs))}__SKILL.${new Date().toISOString().replace(/[:.]/g, '-')}.md`);
  fs.copyFileSync(abs, backup);
  fs.writeFileSync(abs, out);
  return { ok: true, path: abs, backup };
}
