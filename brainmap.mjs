// The Brain as a map of Wesley's work: five strands at the top (Manual Magic AI, YSF Advisory, WRW Hospitality, Employment, Personal), the desks that serve
// them underneath (a desk bridges to every strand it has worked for), and every note under its strands, task notes faded. Nothing in the vault is changed:
// which strand a note or a task belongs to is worked out here from what it names, and from the notes it links to.
//   buildMap({ vault, agents }) → { strands, nodes, links, stats }
//   nodes: { id, kind: strand | agent | note | task | upload, label, group, strands: [ids], agent?, excerpt, size }
//   links: [a, b, kind, weight]   (indexes into nodes; kind: serves | task | belongs | wiki)
import fs from 'node:fs';
import path from 'node:path';
import { readVault, readOfficeNotes } from './graph-build.mjs';

export const STRANDS = [
  { id: 'manual', label: 'Manual Magic AI', colour: '#C9A2F0', re: /manual magic|magia|penny hopkinson|music for life/gi },
  { id: 'ysf', label: 'YSF Advisory', colour: '#8FD3F4', re: /\bysf\b|ysf1|imran|tawheed|tawhed|tahi\b|creamy|creams\b|creems|qamaria|revly|square (demo|call|technical)|deliveroo|uber eats|\bINV\d+/gi },
  { id: 'wrw', label: 'WRW Hospitality', colour: '#FF7A66', re: /\bwrw\b|operator'?s ledger|operator'?s toolkit|franchise entry report|art of operations|brand kit|content week|content calendar|instagram|\breel\b|carousel|stories|linkedin|hospitality|franchis/gi },
  { id: 'employment', label: 'Employment', colour: '#7FD99A', re: /\bcv\b|résumé|resume|head of retail|interview|heavenly desserts|achievement|job (offer|application|search)|recruiter|employment|employer|role proposal|operations director/gi },
  { id: 'personal', label: 'Personal', colour: '#F2B33D', re: /personal budget|\bbudget\b|water bill|united utilities|\brent\b|netflix|subscription|utilit|mortgage|\bbills?\b|scaling without borders|diary|reminder to pay|payday|tax return/gi },
];
const SID = STRANDS.map(s => s.id);

/** Which strands a piece of text belongs to: every strand it names, the clear leaders only. */
export function classify(title, text) {
  const hay = String(title || '') + ' ' + String(title || '') + ' ' + String(title || '') + '\n' + String(text || '').slice(0, 4000);
  const score = STRANDS.map(s => (hay.match(s.re) || []).length);
  const max = Math.max(...score); if (!max) return [];
  return STRANDS.filter((s, i) => score[i] >= Math.max(1, max * 0.34)).map(s => s.id);
}

const front = t => { const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(t); const o = {}; if (m) for (const l of m[1].split(/\r?\n/)) { const k = /^([A-Za-z_]+):\s*(.*)$/.exec(l); if (k) o[k[1].toLowerCase()] = k[2].trim(); } return { fm: o, body: m ? t.slice(m[0].length) : t }; };
const excerpt = body => body.replace(/^#+\s.*$/m, '').replace(/\[\[([^\]|#]+)[^\]]*\]\]/g, '$1').replace(/[*_`>#|-]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 420);

export function buildMap({ vault, agents }) {
  const { notes, raw } = readVault(vault);
  const office = readOfficeNotes(vault);
  const nodes = [], idx = new Map(), links = [], seen = new Set();
  const add = n => { n.i = nodes.length; nodes.push(n); idx.set(n.id, n.i); return n; };
  const link = (a, b, kind, w = 1) => { if (a == null || b == null || a === b) return; const k = (a < b ? a + ':' + b : b + ':' + a) + kind; if (seen.has(k)) return; seen.add(k); links.push([a, b, kind, w]); };

  for (const s of STRANDS) add({ id: 's:' + s.id, kind: 'strand', label: s.label, group: 'strand', strands: [s.id], colour: s.colour, excerpt: '' });
  const agentIdx = new Map();
  for (const a of agents) { const n = add({ id: 'a:' + a.id, kind: 'agent', label: a.name, group: a.department, dept: a.department, lead: !!a.lead, strands: [], excerpt: String(a.does || '').slice(0, 300) }); agentIdx.set(a.id, n.i); }
  const byName = new Map(agents.map(a => [String(a.name).toUpperCase(), a.id]));

  // the notes written by hand (the real Brain) …
  const real = [];
  for (const [name, n] of notes) { const { body } = front(n.text); const nd = add({ id: 'n:' + name, kind: 'note', label: name, group: n.group, strands: classify(name, body), excerpt: excerpt(body), name }); real.push([name, n.text, nd]); }
  // … and the notes the office wrote: one per task
  const tally = new Map(); // agent id → strand → count
  const tasks = [];
  for (const o of office) {
    const { fm, body } = front(o.text); const up = /^Upload - /.test(o.name);
    const aid = byName.get(String(fm.agent || '').toUpperCase()) || null;
    const st = classify(o.name.replace(/^\d{4}-\d\d-\d\d /, ''), body);
    const nd = add({ id: 'n:' + o.name, kind: up ? 'upload' : 'task', label: o.name.replace(/^\d{4}-\d\d-\d\d /, ''), group: 'Agents Office', strands: st, agent: aid, date: (o.name.match(/^\d{4}-\d\d-\d\d/) || [''])[0], excerpt: excerpt(body), name: o.name });
    tasks.push([o.name, o.text, nd]);
    if (aid && !up) { const t = tally.get(aid) || {}; for (const s of st) t[s] = (t[s] || 0) + 1; t._n = (t._n || 0) + 1; tally.set(aid, t); }
  }

  // which strands each desk serves: those it has actually worked for (two or more tasks, or a tenth of its work), else what its job description names
  const WORK_MIN = 2, doneStrands = new Map();
  const serveOf = a => { // real work only: two or more tasks, and a fifth of its busiest strand; else what its job names; else its team lead's
    const t = tally.get(a.id) || {}, top = Math.max(0, ...SID.map(s => t[s] || 0));
    let served = SID.filter(s => (t[s] || 0) >= Math.max(WORK_MIN, top * 0.2)), how = 'work';
    if (!served.length) { served = classify(a.name, [a.does, a.brief].join(' ')); how = 'job'; }
    return { served, how, t };
  };
  const order = [...agents.filter(a => a.lead), ...agents.filter(a => !a.lead)]; // leads first: a desk with nothing of its own sits with its lead
  for (const a of order) {
    const n = agentIdx.get(a.id); let { served, how, t } = serveOf(a);
    if (!served.length) { const lead = agents.find(x => x.lead && x.department === a.department); const ls = lead && lead.id !== a.id ? doneStrands.get(lead.id) : null; if (ls && ls.length) { served = ls; how = 'team'; } }
    doneStrands.set(a.id, served);
    nodes[n].strands = served; nodes[n].served = how; nodes[n].tasks = t._n || 0; nodes[n].counts = Object.fromEntries(SID.map(s => [s, t[s] || 0]));
    for (const s of served) link(n, idx.get('s:' + s), 'serves', 1 + Math.min(2, (t[s] || 0) / 8));
  }
  // wiki links between notes (real or office)
  const rawAll = raw.slice(); for (const [name, text] of tasks.map(x => [x[0], x[1]])) for (const m of text.matchAll(/\[\[([^\]|#]+)/g)) rawAll.push([name, m[1].trim().split('/').pop()]);
  for (const [a, b] of rawAll) { const x = idx.get('n:' + a), y = idx.get('n:' + b); if (x != null && y != null) link(x, y, 'wiki', 0.7); }
  // task notes hang off the desk that did them, and off the strands they concern; real notes hang off their strands
  for (const nd of nodes) {
    if (nd.kind === 'task' || nd.kind === 'upload') {
      if (nd.agent && agentIdx.has(nd.agent)) link(nd.i, agentIdx.get(nd.agent), 'task', 1);
      const ss = nd.strands.length ? nd.strands : (nd.agent ? nodes[agentIdx.get(nd.agent)].strands : []);
      if (!nd.agent || nd.strands.length) for (const s of ss.slice(0, 3)) link(nd.i, idx.get('s:' + s), 'belongs', ss.length === 1 ? 2.6 : 1.1);
    } else if (nd.kind === 'note') for (const s of nd.strands) link(nd.i, idx.get('s:' + s), 'belongs', nd.strands.length === 1 ? 1 : 0.6);
  }
  const deg = new Array(nodes.length).fill(0); for (const [a, b] of links) { deg[a]++; deg[b]++; } nodes.forEach((n, i) => { n.size = deg[i]; });
  const count = k => nodes.filter(n => n.kind === k).length;
  return { strands: STRANDS.map(({ id, label, colour }) => ({ id, label, colour })), nodes, links, stats: { notes: count('note'), tasks: count('task'), uploads: count('upload'), agents: count('agent'), links: links.length, unplaced: nodes.filter(n => (n.kind === 'note' || n.kind === 'task' || n.kind === 'upload') && !n.strands.length && !n.agent).length } };
}
