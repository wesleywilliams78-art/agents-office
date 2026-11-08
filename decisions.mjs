// Decisions (Wesley, 7 Nov 2026): a result that needs the owner's yes or no before something is done ends with DECISION
// blocks instead of "Yes / No" lines in the text. The review card shows each as a Yes/No switch preset to the agent's
// recommendation; APPROVE starts a task for every yes and records every no, so nothing he said yes to is left undone.
// A decision whose text is BRAIN UPDATE blocks (8 Nov 2026, Brian's fixes) is not a task: on a yes serve.mjs files those
// blocks exactly as they were on the card, through brainnotes.mjs with its guard rails and backups.

export const INSTRUCTIONS = 'DECISIONS\n' +
  'When something should only be done after the owner says yes (write to a sheet or file, move a date, correct a record, draft an email, read something further), never write "Yes / No" questions in the text. End your result with one block per decision, exactly like this:\n' +
  'DECISION\nask: <the question, one line>\nrecommend: yes | no\nto: <the seat id that does it on yes; leave this line out for yourself>\ntitle: <short task title, under 80 characters>\n---\n<the task that runs if he says yes: exactly what to do, where (file, sheet, tab, row, link), and the exact text or values to write. That seat has not seen this conversation.>\nEND DECISION\n' +
  'The owner sees each one as a Yes/No switch on the review card, preset to your recommendation, and approving starts a task for every yes. So never say it has been done. One action per decision, at most eight. A fact only the owner knows is not a decision: ask it in one line in the text. A Brain note change is a BRAIN UPDATE block, not a decision.';

const MAX = 8;
const fixFences = t => String(t || '').replace(/```[a-z]*[ \t]*\r?\n(?=[ \t]*DECISION[ \t]*\r?\n)/g, '').replace(/(END DECISION)[ \t]*\r?\n[ \t]*```/g, '$1');
const BLOCK = /^[ \t]*DECISION[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n([\s\S]*?)\r?\n[ \t]*END DECISION[ \t]*$/gm;

export function parse(text) {
  const t = fixFences(text), out = [];
  for (const m of t.matchAll(BLOCK)) {
    if (out.length >= MAX) break;
    const h = {};
    for (const line of m[1].split(/\r?\n/)) { const k = /^\s*(ask|recommend|to|title)\s*:\s*(.*)$/i.exec(line); if (k) h[k[1].toLowerCase()] = k[2].trim(); }
    out.push({ ask: (h.ask || '').slice(0, 300), rec: /^\W*no\b/i.test(h.recommend || '') ? 'no' : 'yes', to: h.to || '', title: (h.title || '').slice(0, 90), text: m[2].trim().slice(0, /^[ 	]*(BRAIN|SKILL) UPDATE[ 	]*$/m.test(m[2]) ? 40000 : 6000) }); // a decision that carries its Brain or skill update whole is applied as written on a yes (8 Nov 2026), so it is not cut
  }
  return out;
}

export function strip(text) {
  return fixFences(text).replace(BLOCK, '').replace(/\n{3,}/g, '\n\n').trim();
}

// what the review card and the task record hold: one entry per decision, numbered, with the problem if it cannot run
// "pco", "PROJECT CO-ORDINATOR", "project-co-ordinator" all find the seat, the writer's own included (unlike a handoff); ambiguous or unknown names find nothing
const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
export function plan(blocks, agents, from) {
  const self = agents.find(a => a.id === from);
  const seat = to => { const n = norm(to); if (!n) return self; const hit = agents.filter(a => [a.id, a.name, a.role].some(x => norm(x) === n)); return hit.length === 1 ? hit[0] : null; };
  return blocks.map((b, i) => {
    const a = seat(b.to);
    const problem = !b.ask ? 'no question' : !a ? `no seat called "${b.to}"` : !b.text ? 'no instructions for a yes' : '';
    return { n: i + 1, ask: b.ask, rec: b.rec, to: a ? a.id : '', toName: a ? a.name : b.to, dept: a ? a.department : '', title: b.title || b.ask.slice(0, 80), text: b.text, ok: !problem, problem };
  });
}

// the owner's switches ({ "1": true, "2": false }) onto the plan; a decision he did not touch keeps the recommendation
export function answer(list, picks) {
  const p = picks && typeof picks === 'object' ? picks : {};
  for (const d of list || []) { const v = p[d.n] ?? p[String(d.n)]; d.yes = typeof v === 'boolean' ? v : d.rec === 'yes'; }
  return list;
}

// the record kept in the result, so the finished task says what he decided and what it started
export function summary(list, nameOf) {
  return (list || []).map(d => !d.ok ? `– ${d.ask} (not on the card: ${d.problem})`
    : d.yes ? `✓ Yes: ${d.ask}${d.fired === 'skill' ? (d.applied?.ok ? ` → skill changed: ${d.applied.message}` : ` → skill not changed: ${d.applied?.message || '?'}`) : d.fired === 'filed' ? ` → filed to the Brain: ${(d.filed || []).map(f => `${f.ok ? '✓' : '✗'} ${f.note} (${f.mode}${f.ok ? '' : ': ' + f.message})`).join(', ')}` : d.fired && d.fired !== 'duplicate' ? ` → ${nameOf(d.to)} started "${d.title}"` : d.fired === 'duplicate' ? ` → ${nameOf(d.to)} already has "${d.title}" from the last 12 hours` : ''}`
    : `✗ No: ${d.ask}`).join('\n');
}
