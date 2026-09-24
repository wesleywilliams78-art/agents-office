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
export function extractPrompt({ business, roster, input, source, today, existing = [] }) {
  const system = `You are the chief of staff for ${business}, a business whose departments are run by AI agents. ` +
    'The owner hands you information that came out of a piece of work. Your job is to say what needs to be done next because of it, ' +
    'place each action on the Eisenhower matrix, and hand it to the seat that should own it. Return ONLY a JSON object — no prose, no code fences.';
  const user = `Today is ${today}.\n\nTHE OFFICE (department · id · name · what they do)\n${roster}\n\n` +
    `WHERE THIS CAME FROM\n${source || 'The owner pasted it in.'}\n\n` +
    (existing.length ? `ALREADY ON THE MATRIX (do not list these again)\n${existing.map(t => '- ' + t).join('\n')}\n\n` : '') + `THE INFORMATION\n"""\n${String(input).slice(0, 12000)}\n"""\n\n` +
    'Find the actions that follow from it: as many as genuinely follow, usually 2 to 6, never padding. Do not list the work that was just done. If nothing follows, return an empty items list. Include the gaps — something that must happen that nobody has picked up, ' +
    'a decision the owner has to make, or a fact the office is missing before it can proceed.\n' +
    'Urgent = has a deadline or a cost of delay inside the next 7 days, or someone is waiting on it. Important = moves revenue, a client relationship, compliance, or the owner\'s stated goals. Be strict: not everything is both.\n' +
    'Return: {"summary":"<one sentence: what this information means for the office>","items":[{"title":"<imperative, max 80 chars>","detail":"<one or two sentences: what exactly, and the evidence from the input>","urgent":<bool>,"important":<bool>,"dept":"<emails|sales|marketing|ops|fin|delivery|owner>","agent":"<an id from the office, or \\"\\" when no seat fits or it is the owner\'s call>","gap":"<empty, or: no-seat (no agent covers this) | owner-decision | missing-info>","due":"<YYYY-MM-DD if the input implies one, else empty>","why":"<one short phrase: why this quadrant>"}]}';
  return { system, user };
}

const DEPTS = ['emails', 'sales', 'marketing', 'ops', 'fin', 'delivery', 'owner'];
const GAPS = ['no-seat', 'owner-decision', 'missing-info'];
export function normalise(j, agents, feedId) {
  const items = (Array.isArray(j.items) ? j.items : []).slice(0, 12).map((x, i) => {
    const urgent = !!x.urgent, important = !!x.important;
    const agent = agents.find(a => a.id === x.agent);
    const dept = agent ? agent.department : DEPTS.includes(x.dept) ? x.dept : 'owner';
    let gap = GAPS.includes(x.gap) ? x.gap : '';
    if (!agent && !gap) gap = dept === 'owner' ? 'owner-decision' : 'no-seat';
    return { id: `${feedId}-${i}`, feed: feedId, title: String(x.title || '').slice(0, 100) || 'Untitled action', detail: String(x.detail || '').slice(0, 600),
      urgent, important, q: quadrantOf(urgent, important), dept, agent: agent ? agent.id : '', gap, due: /^\d{4}-\d{2}-\d{2}$/.test(x.due || '') ? x.due : '',
      why: String(x.why || '').slice(0, 120), state: 'open', addedAt: Date.now() };
  }).filter(x => x.title);
  return { summary: String(j.summary || '').slice(0, 400), items };
}

// the edits the page may make to an item
export function patch(item, b) {
  if (b.q && QUADRANTS[b.q]) { item.q = b.q; item.urgent = QUADRANTS[b.q].urgent; item.important = QUADRANTS[b.q].important; }
  if (['open', 'sent', 'done', 'dropped'].includes(b.state)) { item.state = b.state; item[b.state + 'At'] = Date.now(); }
  if (typeof b.title === 'string' && b.title.trim()) item.title = b.title.trim().slice(0, 100);
  if (typeof b.task === 'string') item.task = b.task;
  return item;
}
