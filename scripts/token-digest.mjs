// Token digest (8 Nov 2026) for Toki, the token-watch desk. Turns data/tokens.jsonl, /api/tokens and /api/usage into one short
// Markdown note (under ~3,000 characters), printed and written to <brain>/80-Finance/token-digest.md (overwritten each run).
// Plain node, read only apart from that one file. `node scripts/token-digest.mjs [--no-write]`
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from '../config.mjs';
import { readLedger, dayOf } from '../tokens.mjs';
import { loadRoster } from '../roster.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), DATA = path.join(ROOT, 'data');
const cfg = loadConfig(), DAY = 864e5, now = Date.now();
const get = async p => { try { const r = await fetch(`http://localhost:${cfg.port}${p}`, { signal: AbortSignal.timeout(20000) }); return r.ok ? await r.json() : null; } catch { return null; } };
const tot = r => (r.in || 0) + (r.out || 0) + (r.cr || 0) + (r.cw || 0);
const k = n => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? Math.round(n / 1e3) + 'k' : String(Math.round(n));
const usd = n => '$' + n.toFixed(2);
const model = m => /opus/i.test(m) ? 'Opus' : /sonnet/i.test(m) ? 'Sonnet' : /haiku/i.test(m) ? 'Haiku' : m || '?';
const NAMES = { task: 'desk work', piece: 'team piece', lead: 'team final', plan: 'team plan', 'lead-review': 'lead review', route: 'routing', chat: 'desk chat', chief: 'Chief of Staff', box: 'Grace (Claude box)' };

const ledger = readLedger(DATA);
const yKey = dayOf(now - DAY), wFrom = now - 7 * DAY;
const sel = { y: ledger.filter(r => dayOf(r.at) === yKey), w: ledger.filter(r => r.at >= wFrom) };
const sum = rows => ({ runs: rows.length, tok: rows.reduce((n, r) => n + tot(r), 0), cost: rows.reduce((n, r) => n + (r.cost || 0), 0) });
function group(rows, key, n = 5) {
  const m = new Map();
  for (const r of rows) { const g = m.get(key(r)) || m.set(key(r), { k: key(r), runs: 0, tok: 0, cost: 0 }).get(key(r)); g.runs++; g.tok += tot(r); g.cost += r.cost || 0; }
  return [...m.values()].sort((a, b) => b.tok - a.tok).slice(0, n);
}
const line = g => `${g.k} ${k(g.tok)} (${g.runs} runs, ${usd(g.cost)})`;
const list = (rows, key, n) => rows.length ? group(rows, key, n).map(line).join(' · ') : 'nothing';

const [tk, us] = await Promise.all([get('/api/tokens'), get('/api/usage')]);
const out = [];
out.push(`# Token digest — ${new Date(now).toISOString().slice(0, 16).replace('T', ' ')} UTC`, '', 'Office runs from data/tokens.jsonl (tokens = input+output+cache). Numbers here are the only numbers to quote.', '');
const sy = sum(sel.y), sw = sum(sel.w);
out.push(`## Totals`, `- Yesterday (${yKey}): ${k(sy.tok)} tokens, ${sy.runs} runs, ${usd(sy.cost)}`, `- Last 7 days: ${k(sw.tok)} tokens, ${sw.runs} runs, ${usd(sw.cost)}`);
if (us?.ok && us.session) out.push(`- Plan gauge: session ${us.session.percent ?? '?'}%, week ${us.week?.percent ?? '?'}%${us.old ? ' (old reading: ' + (us.reason || 'endpoint busy') + ')' : ''}`);
else if (us?.ok) out.push(`- Plan gauge: no percentage right now (${us.reason || 'endpoint busy'}); the office itself used ${k(us.window?.tokens || 0)} tokens this session window`);
else out.push('- Plan gauge: unavailable (office not answering)');
// 11 Nov 2026 (Wesley): desks read as "Priya (Project Tracker & Status Reports)", not the agent id (pco, qa)
const WHO = {}; try { for (const a of loadRoster(cfg.brainPath).agents) WHO[a.id] = a.person ? `${a.person} (${a.role || a.name})` : a.role || a.name || a.id; } catch {}
const name = id => id ? (WHO[id] || id) : 'no desk';
out.push('', '## Yesterday', `- By desk: ${list(sel.y, r => name(r.agent), 5)}`, `- By department: ${list(sel.y, r => r.dept || 'none', 6)}`, `- By kind: ${list(sel.y, r => NAMES[r.kind] || r.kind || 'other', 6)}`);
const rt = sel.y.filter(r => r.routine); // routine is on the ledger row only when the task had one
out.push(`- By routine: ${list(rt, r => r.routine, 5)}`);
out.push('', '## This week', `- By desk: ${list(sel.w, r => name(r.agent), 6)}`, `- By kind: ${list(sel.w, r => NAMES[r.kind] || r.kind || 'other', 6)}`, `- By routine: ${list(sel.w.filter(r => r.routine), r => r.routine, 5)}`);
out.push('', '## Top 5 runs this week');
for (const r of [...sel.w].sort((a, b) => tot(b) - tot(a)).slice(0, 5)) out.push(`- ${k(tot(r))} · ${name(r.agent)} · ${NAMES[r.kind] || r.kind}${r.mode ? '/' + r.mode : ''} · task ${r.task || '-'} · ${r.turns || 0} turns · ${model(r.model)} · ${usd(r.cost || 0)}`);
// rework: second and later passes on a task, and lead-review rounds
const rev = sel.w.filter(r => r.mode === 'revise'), lr = sel.w.filter(r => r.kind === 'lead-review');
const lrTasks = new Map(); for (const r of lr) lrTasks.set(r.task, (lrTasks.get(r.task) || 0) + 1);
const rounds = [...lrTasks.values()].filter(n => n > 1).length;
out.push('', '## Rework (7 days)', `- Revise passes: ${rev.length} runs, ${k(rev.reduce((n, r) => n + tot(r), 0))}, ${usd(rev.reduce((n, r) => n + (r.cost || 0), 0))}`, `- Lead review: ${lr.length} reads, ${k(lr.reduce((n, r) => n + tot(r), 0))}; ${rounds} task(s) went more than one round (limit now ${cfg.leadReview?.maxRounds ?? '?'} rounds, bar ${cfg.leadReview?.barRounds ?? '?'})`);
// model fit: anything bigger than Sonnet that is not Opus by design
const big = sel.w.filter(r => /opus|fable/i.test(r.model || '') && !['motion', 'critic', 'chief'].includes(r.kind));
out.push('', '## Model fit', big.length ? `- Bigger than Sonnet outside motion/critic/Chief: ${list(big, r => `${name(r.agent)} on ${model(r.model)}`, 5)}` : '- Every desk run this week was on Sonnet or Haiku (motion, critic and Chief of Staff excepted).');
// chats
out.push('', '## Claude Code chats (active in last 24 h)');
const chats = (tk?.chats || []).filter(c => c.last >= now - DAY).sort((a, b) => b.total - a.total).slice(0, 5);
if (!tk) out.push('- /api/tokens unavailable.');
else if (!chats.length) out.push('- None active.');
else for (const c of chats) out.push(`- "${String(c.title || c.project).slice(0, 40)}" · ${(c.models || []).map(model).filter((v, i, a) => a.indexOf(v) === i).join('+')} · ${k(c.total)} tokens · context now ${k(c.lastCtx)}, peak ${k(c.peak)} · ${c.turns} turns${c.verdict?.key === 'handover' ? ' · ' + c.verdict.text : ''}`);
if (tk?.coach && tk.coach.kind !== 'ok') out.push(`- Office coach flags: ${tk.coach.kind}`);
const text = out.join('\n') + '\n';
if (!process.argv.includes('--no-write') && cfg.brainPath) {
  const f = path.join(cfg.brainPath, '80-Finance', 'token-digest.md');
  try { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, text); } catch (e) { console.error('could not write digest:', e.message); }
}
process.stdout.write(text);
