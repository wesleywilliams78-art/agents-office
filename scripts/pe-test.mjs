// Run the Prompt Engineer over Wesley's past Chief of Staff messages (first pass only, no answers) and write a report.
// usage: node scripts/pe-test.mjs <out.md> [count=8] [skip=0]
// The report holds his real prompts, so write it outside the repo.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from '../config.mjs';
import { loadRoster } from '../roster.mjs';
import { engineer, rosterText } from '../promptengineer.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const [out, count = '8', skip = '0'] = process.argv.slice(2);
if (!out) { console.error('usage: node scripts/pe-test.mjs <out.md> [count] [skip]'); process.exit(1); }

// a 4th argument is a JSON file holding an array of prompt strings (fresh, not yet in the Brain); otherwise Wesley's past messages are used
const msgs = process.argv[5]
  ? JSON.parse(fs.readFileSync(process.argv[5], 'utf8'))
  : JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'assistant.json'), 'utf8')).messages
    .filter(m => m.who === 'user' && m.text && !/^\[Attached by Wesley/.test(m.text) && String(m.text).trim().length > 40)
    .map(m => String(m.text).trim());
const pick = msgs.slice(-(Number(count) + Number(skip))).slice(0, Number(count));
const roster = rosterText(loadRoster(loadConfig().brainPath).agents);

const lines = [`# Prompt engineer test run (${new Date().toISOString().slice(0, 16)})`, `Model sonnet · high · ${pick.length} prompts · first pass only`, ''];
let total = 0;
const runOne = async (req, i) => {
  const t0 = Date.now();
  try {
    const { result: r, used, cost } = await engineer({ request: req, roster });
    total += cost || 0;
    return { i, req, r, used, cost, s: Math.round((Date.now() - t0) / 1000) };
  } catch (e) { return { i, req, err: e.message, s: Math.round((Date.now() - t0) / 1000) }; }
};
const results = [];
for (let k = 0; k < pick.length; k += 3) results.push(...await Promise.all(pick.slice(k, k + 3).map((q, j) => runOne(q, k + j + 1))));

for (const x of results) {
  lines.push(`## ${x.i}. ${x.req.replace(/\s+/g, ' ').slice(0, 90)}…`, '', `> ${x.req.replace(/\s+/g, ' ')}`, '');
  if (x.err) { lines.push(`FAILED after ${x.s}s: ${x.err}`, ''); continue; }
  const r = x.r, b = r.brief || {};
  lines.push(`status: ${r.status} · dept: ${r.department_hint} · ${x.s}s · $${(x.cost || 0).toFixed(3)} · tools: ${x.used.join(', ') || 'none'}`, '');
  if (r.status === 'pass') { lines.push('PASS: goes straight to the Chief of Staff', ''); continue; }
  if (r.proposals?.length) { lines.push('Proposals (yes/no):'); r.proposals.forEach((p, n) => lines.push(`${n + 1}. Problem: ${p.problem}`, `   Fix: ${p.fix}`, `   If yes: ${p.if_yes}`, `   If no: ${p.if_no}`, `   Changes: ${Object.keys(p.apply || {}).join(', ') || 'nothing'}`)); lines.push(''); }
  lines.push(`- outcome: ${b.outcome}`, `- inputs: ${b.inputs}`, `- deliverable: ${b.deliverable}`, `- acceptance:`, ...(b.acceptance || []).map(a => `  - ${a}`), `- constraints: ${b.constraints}`, `- authority: ${b.authority}`, `- deadline: ${b.deadline}`, `- assumptions:`, ...(b.assumptions || []).map(a => `  - ${a}`), '', `Read-back: ${r.readback}`, '');
}
lines.push(`Total cost: $${total.toFixed(3)}`);
fs.writeFileSync(out, lines.join('\n'));
console.log('wrote', out, 'cost $' + total.toFixed(3), 'failed', results.filter(x => x.err).length);
