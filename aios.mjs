// AIOS — the office's operating picture (V3.9).
// Two jobs, both for the dashboard at /aios:
//   · the Eisenhower matrix: action items the office pulls out of what the owner feeds it (notes from a
//     meeting, the result of a task, an email thread), sorted urgent × important and assigned to a seat.
//     Stored in data/matrix.json — runtime state, like data/tasks.json, never in the brain.
//   · the extract prompt: Claude reads the input against the roster and returns the next actions,
//     including the gaps (work no seat covers, or facts the office is missing to proceed).
import fs from 'node:fs';
import path from 'node:path';

export const QUADRANTS = {
  do:       { urgent: true,  important: true,  name: 'DO NOW',   hint: 'Urgent and important' },
  plan:     { urgent: false, important: true,  name: 'SCHEDULE', hint: 'Important, not urgent' },
  delegate: { urgent: true,  important: false, name: 'DELEGATE', hint: 'Urgent, not important' },
  drop:     { urgent: false, important: false, name: 'DROP',     hint: 'Neither' },
};
export const quadrantOf = (urgent, important) => urgent ? (important ? 'do' : 'delegate') : (important ? 'plan' : 'drop');

const file = dataDir => path.join(dataDir, 'matrix.json');
export function load(dataDir) { try { const j = JSON.parse(fs.readFileSync(file(dataDir), 'utf8')); return { items: j.items || [], feeds: j.feeds || [] }; } catch { return { items: [], feeds: [] }; } }
export function save(dataDir, m) { fs.mkdirSync(dataDir, { recursive: true }); fs.writeFileSync(file(dataDir), JSON.stringify(m, null, 2)); }

// the prompt: the roster goes in so each action lands on a real seat, and a seat that does not exist shows up as a gap
export function extractPrompt({ business, roster, input, source, today, existing = [], clients = [] }) {
  const system = `You are the chief of staff for ${business}, a business whose departments are run by AI agents. ` +
    'The owner hands you information that came out of a piece of work. Your job is to say what needs to be done next because of it, ' +
    'place each action on the Eisenhower matrix, and hand it to the seat that should own it. Return ONLY a JSON object — no prose, no code fences.';
  const clientLine = clients.length ? `\n\nCLIENTS/ACCOUNTS THE OWNER TRACKS (id — name)\n${clients.map(c => `${c.id} — ${c.name}`).join('\n')}\nIf this action is clearly about one of these, set "client" to its id. If it is not about any of them, leave "client" empty — do not guess.` : '';
  const user = `Today is ${today}.\n\nTHE OFFICE (department · id · name · what they do)\n${roster}\n\n` +
    `WHERE THIS CAME FROM\n${source || 'The owner pasted it in.'}\n\n` +
    (existing.length ? `ALREADY ON THE MATRIX, WHATEVER ITS STATE (open, sent to a seat, or finished lately). Do not list any of these again, even worded differently. A line ending [done: …] was closed by the owner with that answer: treat the answer as a fact, never ask for it again, and do not raise an action that the answer already settles:\n${existing.map(t => '- ' + t).join('\n')}\n\n` : '') + `THE INFORMATION\n"""\n${String(input).slice(0, 12000)}\n"""${clientLine}\n\n` +
    'Find the actions that follow from it: as many as genuinely follow, usually 2 to 6, never padding. Do not list the work that was just done. If nothing follows, return an empty items list. Include the gaps — something that must happen that nobody has picked up, ' +
    'a decision the owner has to make, or a fact the office is missing before it can proceed.\n' +
    'Never list housekeeping: checking, re-checking, QA, proofreading, word-for-word comparisons, fixing a line or a comma, re-filing, merging or deleting duplicate notes, tidying a tracker, or confirming wording. The desk that did the work does those itself. List only what moves the business: a deliverable, a decision for the owner, a fact the office lacks, a chase, or a deadline.\n' +
    'A block headed BRAIN UPDATE, or a section headed FILED TO THE BRAIN, is a note change already proposed to the owner or already filed: it is not an action, so never list filing it.\n' +
    'If the information says an action could not be completed (nothing could be saved, filed or written, a tool or access was missing), do NOT list that same action again: that is how the matrix fills with copies. List at most one gap about the missing capability, and only if nothing above already covers it.\n' +
    'Urgent = has a deadline or a cost of delay inside the next 7 days, or someone is waiting on it. Important = moves revenue, a client relationship, compliance, or the owner\'s stated goals. Be strict: not everything is both.\n' +
    'Return: {"summary":"<one sentence: what this information means for the office>","items":[{"title":"<imperative, max 80 chars>","detail":"<one or two sentences: what exactly, and the evidence from the input>","urgent":<bool>,"important":<bool>,"dept":"<emails|sales|marketing|ops|fin|delivery|owner>","agent":"<an id from the office, or \\"\\" when no seat fits or it is the owner\'s call>","gap":"<empty, or: no-seat (no agent covers this) | owner-decision | missing-info>","due":"<YYYY-MM-DD if the input implies one, else empty>","why":"<one short phrase: why this quadrant>","client":"<a client id from the list above, or empty>"}]}';
  return { system, user };
}

const DEPTS = ['emails', 'sales', 'marketing', 'ops', 'fin', 'delivery', 'owner'];
const GAPS = ['no-seat', 'owner-decision', 'missing-info'];
export function normalise(j, agents, feedId, clients = []) {
  const clientIds = clients.map(c => c.id);
  const items = (Array.isArray(j.items) ? j.items : []).slice(0, 12).map((x, i) => {
    const urgent = !!x.urgent, important = !!x.important;
    const agent = agents.find(a => a.id === x.agent);
    const dept = agent ? agent.department : DEPTS.includes(x.dept) ? x.dept : 'owner';
    let gap = GAPS.includes(x.gap) ? x.gap : '';
    if (!agent && !gap) gap = dept === 'owner' ? 'owner-decision' : 'no-seat';
    return { id: `${feedId}-${i}`, feed: feedId, title: String(x.title || '').slice(0, 100) || 'Untitled action', detail: String(x.detail || '').slice(0, 600),
      urgent, important, q: quadrantOf(urgent, important), dept, agent: agent ? agent.id : '', gap, due: /^\d{4}-\d{2}-\d{2}$/.test(x.due || '') ? x.due : '',
      why: String(x.why || '').slice(0, 120), client: clientIds.includes(x.client) ? x.client : '', state: 'open', addedAt: Date.now() };
  }).filter(x => x.title);
  return { summary: String(j.summary || '').slice(0, 400), items };
}

// A finished task's result often restates the action it was sent to do, worded a little differently, and the reader
// would raise it again. These two checks catch the same action coming back: the words it is made of, and the
// anchors in it (an amount, an invoice number, an acronym, a file name).
const STOP = new Set(('the a an and or of to in on for with from by at is are be as it its this that into under over via then than will can should must not no do does did ' +
  'make mark add update check confirm record file write read paste send get give set log store verify fix decide whether once re').split(' '));
const words = t => String(t).toLowerCase().replace(/[£â]/g, ' ').match(/[a-z0-9]+(?:\.[0-9]+)?/g)?.filter(w => w.length > 1 && !STOP.has(w)) || [];
const anchorsOf = t => new Set((String(t).match(/\b[A-Z]{2,}\d*\b|\b\w+\.md\b|\d[\d.,]*\d/g) || []).map(a => a.toLowerCase()));
export function similar(a, b) {
  const wa = new Set(words(a)), wb = new Set(words(b)); if (!wa.size || !wb.size) return false;
  const both = [...wa].filter(w => wb.has(w)).length, j = both / (wa.size + wb.size - both);
  if (j >= 0.65) return true; // one different word in a short title (Gas / Water direct debit) must stay a different action
  const xa = anchorsOf(a), xb = anchorsOf(b), shared = [...xa].filter(x => xb.has(x)).length;
  return shared >= 2 && j >= 0.25;
}
// known = titles already handled (open, sent, or finished lately); returns the items that are genuinely new
export function dedupe(items, known) {
  const kept = [], dropped = [];
  for (const it of items) (known.some(k => similar(it.title, k)) || kept.some(k => similar(it.title, k.title)) ? dropped : kept).push(it);
  return { kept, dropped };
}

// V3.12 (30 Oct): a desk can put cards on the matrix itself. It ends its result with
//   MATRIX ITEMS
//   - <task> | due YYYY-MM-DD | priority high|medium|low | owner wesley|<seat id> | calendar yes|no
//   END MATRIX ITEMS
// and the office files them when the owner approves the task (never before). Urgent = due within 7 days of today;
// important = priority high or medium. "calendar yes" means the desk is putting it on Google Calendar too.
export const MATRIX_BLOCK = /MATRIX ITEMS\s*\n([\s\S]*?)\nEND MATRIX ITEMS/;
export function parseMatrixBlock(text, agents, feedId, now = Date.now()) {
  const m = MATRIX_BLOCK.exec(String(text || '').split('\r\n').join('\n')); if (!m) return null;
  const items = [];
  for (const raw of m[1].split('\n')) {
    const line = raw.replace(/^\s*[-*•]\s*/, '').trim(); if (!line) continue;
    const parts = line.split('|').map(p => p.trim()); const title = parts.shift(); if (!title) continue;
    const field = k => (parts.find(p => p.toLowerCase().startsWith(k + ' ')) || '').slice(k.length + 1).trim();
    const due = /^20\d{2}-\d{2}-\d{2}$/.test(field('due')) ? field('due') : '';
    const pr = (field('priority') || 'medium').toLowerCase(), who = field('owner').toLowerCase();
    const agent = agents.find(a => a.id === who);
    const days = due ? (Date.parse(due + 'T12:00:00') - now) / 86400000 : null;
    const urgent = days !== null ? days <= 7 : pr === 'high', important = pr !== 'low';
    items.push({ id: `${feedId}-${items.length}`, feed: feedId, title: title.slice(0, 100), detail: '', urgent, important, q: quadrantOf(urgent, important),
      dept: agent ? agent.department : 'owner', agent: agent ? agent.id : '', gap: '', due, why: `priority ${pr}${due ? ', due ' + due : ''}`, client: '',
      state: 'open', addedAt: now, onCalendar: /^y/i.test(field('calendar')) });
    if (items.length >= 20) break;
  }
  return items;
}

// the edits the page may make to an item
export function patch(item, b) {
  if (b.q && QUADRANTS[b.q]) { item.q = b.q; item.urgent = QUADRANTS[b.q].urgent; item.important = QUADRANTS[b.q].important; }
  if (['open', 'sent', 'done', 'dropped'].includes(b.state)) { item.state = b.state; item[b.state + 'At'] = Date.now(); }
  if (typeof b.outcome === 'string') { const o = b.outcome.trim().slice(0, 600); if (o) item.outcome = o; else delete item.outcome; } // what happened, in the owner's words, when he closes a card
  if (typeof b.title === 'string' && b.title.trim()) item.title = b.title.trim().slice(0, 100);
  if (typeof b.task === 'string') item.task = b.task;
  if (typeof b.due === 'string' && (b.due === '' || /^20\d{2}-\d{2}-\d{2}$/.test(b.due))) { // a real year (20xx) — rejects a native date input's half-typed "0001" etc.
    if (b.due !== item.due && item.calendar) delete item.calendar; // the old reminder was for the old date — let the tag come back so it can be re-added for the new one
    item.due = b.due;
  }
  return item;
}
