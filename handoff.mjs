// Handoffs: a finished task may end with HANDOFF blocks naming the next seat (in the same or another department).
// The owner sees them on the review card; approving the task starts each one as a new task for that seat.
// Nothing is handed over by a rejected task, and a task that skipped review hands nothing over.

export const INSTRUCTIONS = 'HANDOFF\n' +
  'When your work is meant to be checked or continued by another seat, end your result with one block per handoff, exactly like this:\n' +
  'HANDOFF\nto: <the seat\'s id or name, e.g. qa>\ntitle: <short task title, under 80 characters>\n---\n<everything that seat needs, written as the task: what to do, which files or folders, what to ignore. It has not seen this conversation.>\nEND HANDOFF\n' +
  'The owner sees it on the review card and the task starts when he approves yours, so never say it has already been sent. At most three.';

const MAX = 3;

export function parse(text) {
  const t = String(text || '').replace(/```[a-z]*[ \t]*\r?\n(?=[ \t]*HANDOFF)/g, '').replace(/(END HANDOFF)[ \t]*\r?\n[ \t]*```/g, '$1');
  const re = /^[ \t]*HANDOFF[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n([\s\S]*?)\r?\n[ \t]*END HANDOFF[ \t]*$/gm, out = [];
  for (let m; (m = re.exec(t)) && out.length < MAX;) {
    const h = {};
    for (const line of m[1].split(/\r?\n/)) { const k = /^\s*(to|title)\s*:\s*(.*)$/i.exec(line); if (k) h[k[1].toLowerCase()] = k[2].trim(); }
    out.push({ to: h.to || '', title: (h.title || '').slice(0, 90), text: m[2].trim().slice(0, 6000) });
  }
  return out;
}

export function strip(text) {
  return String(text || '').replace(/```[a-z]*[ \t]*\r?\n(?=[ \t]*HANDOFF)/g, '').replace(/(END HANDOFF)[ \t]*\r?\n[ \t]*```/g, '$1')
    .replace(/^[ \t]*HANDOFF[ \t]*\r?\n[\s\S]*?\r?\n---[ \t]*\r?\n[\s\S]*?\r?\n[ \t]*END HANDOFF[ \t]*$/gm, '').replace(/\n{3,}/g, '\n\n').trim();
}

const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
// "qa", "QUALITY ASSURANCE CHECKER", "QA Checker" all find the seat; ambiguous or unknown names find nothing
export function resolve(to, agents, from) {
  const n = norm(to); if (!n) return null;
  const hit = agents.filter(a => norm(a.id) === n || norm(a.name) === n || norm(a.role) === n);
  if (hit.length === 1 && hit[0].id !== from) return hit[0];
  return null;
}

// what the review card and the task record hold: one entry per handoff, with the problem if it cannot be sent
export function plan(blocks, agents, from) {
  return blocks.map(b => {
    const a = resolve(b.to, agents, from);
    return { to: a ? a.id : '', toName: a ? a.name : b.to, dept: a ? a.department : '', title: b.title || (a ? 'Handed over' : ''), text: b.text, ok: !!a && !!b.text, problem: !a ? `no seat called "${b.to}"` : !b.text ? 'no instructions' : '' };
  });
}

// A step only Claude Code can do (skill claude-code-prompt): "YOUR ONE STEP: …" above one or more fenced blocks that open
// "This is a separate task for Claude Code". Returns { what, prompts } for the Hierarchy bubble and Telegram, or null.
export function claudeCode(text) {
  const t = String(text || ''), prompts = [];
  for (const m of t.matchAll(/```[a-z]*[ \t]*\r?\n([\s\S]*?)\r?\n[ \t]*```/g)) {
    const b = m[1].trim(); if (/^This is a separate task for Claude Code/i.test(b) && !prompts.includes(b)) prompts.push(b.slice(0, 6000));
    if (prompts.length >= 3) break;
  }
  if (!prompts.length) return null;
  const i = t.search(/YOUR ONE STEP:/i), f = i < 0 ? -1 : t.indexOf('```', i);
  const what = i < 0 ? '' : t.slice(i, f > i ? f : i + 400).replace(/^YOUR ONE STEP:[^\n]*\n?/i, '').trim().slice(0, 300);
  return { what, prompts };
}

// "NEXT: qa — check the one-pager" at the end of a result: the writer's suggestion for the owner's HAND OVER button. Returns { next, text } with the line removed.
export function takeNext(text, agents, from) {
  const t = String(text || ''), m = /^[ \t*_]*NEXT:[ \t*_]*(.+?)[ \t]*[—–]+[ \t]*(.+?)[ \t*_]*$/m.exec(t);
  if (!m) return { next: null, text: t };
  const seat = resolve(m[1], agents, from);
  return { next: { to: seat ? seat.id : '', toName: seat ? seat.name : m[1].trim(), what: m[2].trim().slice(0, 300) }, text: t.replace(m[0], '').replace(/\n{3,}/g, '\n\n').trim() };
}
