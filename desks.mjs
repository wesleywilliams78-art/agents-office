// AIOS extra desks (7 Nov 2026). The office's 35 seats are fixed (roster.mjs); the AIOS can add
// desks beyond them, one file in the owner's brain:
//   <brain>/Agents Office/aios-desks.json   {"desks": [{ id, department, name, role, does, tools, brief, model, effort, person }]}
// A desk joins one of the six departments, is never a lead, and gets every field rule the seats
// get (roster.validate). The 3D office ignores ids it has no desk for; the AIOS draws them.
import fs from 'node:fs';
import path from 'node:path';
import { DEPTS } from './src/data.js';
import { validate } from './roster.mjs';

export const desksFile = brainPath => path.join(brainPath, 'Agents Office', 'aios-desks.json');
const ID = /^[a-z][a-z0-9-]{1,23}$/;

// returns { desks, problems }; `taken` is the ids already in the roster
export function validateDesks(doc, taken = []) {
  const problems = [], desks = [], ids = new Set(taken);
  const list = Array.isArray(doc?.desks) ? doc.desks : null;
  if (!list) return { desks, problems: ['the file must be {"desks": [...]}'] };
  for (const e of list) {
    const id = String(e?.id || '').trim();
    if (!ID.test(id)) { problems.push(`desk "${id}": id must be 2–24 lower-case letters, digits or dashes — skipped`); continue; }
    if (ids.has(id)) { problems.push(`desk "${id}": that id is already taken — skipped`); continue; }
    if (!DEPTS[e.department]) { problems.push(`desk "${id}": department must be one of ${Object.keys(DEPTS).join(', ')} — skipped`); continue; }
    if (e.lead) { problems.push(`desk "${id}": an added desk cannot be a lead — skipped`); continue; }
    if (!String(e.name || '').trim() || !String(e.does || '').trim()) { problems.push(`desk "${id}": needs a name and a "does" — skipped`); continue; }
    const blank = { id, department: e.department, lead: false, name: '', role: '', does: '', tools: [], brief: '', model: '', effort: '', person: '' };
    const { lead, ...fields } = e;
    const r = validate({ agents: [fields] }, [blank]);
    problems.push(...r.problems.map(p => p.replace(/^"/, 'desk "')));
    desks.push({ ...r.agents[0], added: true }); ids.add(id);
  }
  return { desks, problems };
}

export function loadDesks(brainPath, taken) {
  const p = desksFile(brainPath);
  if (!fs.existsSync(p)) return { desks: [], problems: [] };
  let doc; try { doc = JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return { desks: [], problems: [`not valid JSON (${e.message.split('\n')[0]}) — ignored`] }; }
  return validateDesks(doc, taken);
}
