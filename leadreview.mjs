// Agents Office: lead review and bounce loop (4 Nov 2026). Plan: docs/lead-review-plan.md.
// A desk finishes a draft; before it reaches the owner the department lead reads it against the request. Pass: it goes
// to the owner "signed off by the lead". Bounce: the desk reworks it with the lead's feedback, up to maxRounds bounces,
// then the lead escalates and the owner gets it with the open concerns shown. The sign-off is never approval to send.
// Pure: the model calls are injected (serve.mjs passes them), so check.mjs runs every path with a fake model.

import * as lessons from './leadlessons.mjs';

export const DEFAULTS ={ enabled: false, departments: ['marketing'], maxRounds: 2, model: 'sonnet', effort: 'medium' };

/** office.config.json → { enabled, departments, maxRounds (1 to 3), model, effort }. Switched off unless the config says true. */
export function settings(cfg) {
  const s = { ...DEFAULTS, ...((cfg && cfg.leadReview) || {}) };
  s.enabled = s.enabled === true;
  s.departments = (Array.isArray(s.departments) ? s.departments : DEFAULTS.departments).map(d => String(d).toLowerCase());
  s.maxRounds = Math.min(3, Math.max(1, parseInt(s.maxRounds, 10) || DEFAULTS.maxRounds));
  return s;
}

/** All must hold: on, the department is in, the task waits for the owner, a desk's first draft or redraft (not an approve or
 *  an answer turn), the desk is not the lead, it is not a team task (that lead already writes the final), and there is a draft. */
export function applies({ cfg, task, desk, approve = false, answer = false, waits = true, result = '' }) {
  if (!cfg || !cfg.enabled || !task || !desk) return false;
  if (approve || answer || !waits) return false;
  if (desk.lead || task.team) return false;
  if (!cfg.departments.includes(String(task.dept || desk.department || '').toLowerCase())) return false;
  return !!String(result || '').trim();
}

/** The lead's instructions for one review: the system extra and the user message. */
export function reviewPrompt({ task, draft, desk, lead, round = 0, max = 2, log = [], ownerFeedback = '', skills = [] }) {
  const extra = `LEAD REVIEW\nYou are the manager of ${desk.name}${desk.role ? ` (${desk.role})` : ''} and you are reviewing the draft below before the owner sees it. You review as a world-class practitioner of this craft, not as a proofreader. You do not rewrite the draft: you pass it, or you send it back with specific direction.\n` +
    'Two reads, in this order.\n' +
    'READ 1, THE RULES. Check the draft against: the owner\'s request and any acceptance checks in it; the standing instructions, skills and lessons the desk worked under (below, "RULES THE DESK WORKED UNDER"); and the house and brand rules in the company notes and the notes the desk read (brand names and structure, proof figures, formats, what is never said). A breach is a bounce.\n' +
    'READ 2, THE BAR. Ask: would this move the dial for the owner as a person and a business, or is it merely acceptable? World-class means a sharp hook, one clear point, specific rather than generic, a reason for the right reader to act, in the owner\'s voice. If it is flat, generic, or has no point of view, bounce it, and say exactly what is weak and what the stronger move is (a sharper line, a different angle, a cut).\n' +
    'Bounce for: (1) an unmet acceptance check; (2) a specific figure, name, date or claim presented as fact with no source and not marked (assumed); (3) a breach of the desk\'s rules or the house and brand rules; (4) the wrong format or length; (5) it would not move the dial, with a concrete fix. Do not bounce for wording you would merely have chosen differently. Every bounce must say what to change, so the desk can act on it in one pass.\n' +
    (round >= max ? `This is the last round (the desk has already reworked it ${round} time${round === 1 ? '' : 's'}): bounce only for a rule breach or a clear failure of the bar; the owner reads it next either way.\n` : '') +
    `LESSON (optional). If you bounce, or pass a draft that could have been better, and the fix is one the desk should apply to every future piece of this kind, add one lesson: a short imperative rule, general, no client or company names, no figures or numbers. Name the skill it belongs in${skills.length ? ` (the desk followed: ${skills.join(', ')})` : ' (the desk followed no skill; leave skill empty)'}. The owner decides whether it is adopted. Leave it out when the problem was specific to this piece.\n` +
    'Reply with JSON only, nothing else: {"verdict":"pass"|"bounce","dial":"<one sentence: would this move the dial for the owner, and why>","feedback":"<what to change, numbered, under 150 words, empty on pass>","checks":[{"check":"<one rule or acceptance check, or the bar>","met":true|false}],"lesson":{"skill":"<name>","rule":"<one sentence>"}}';
  const earlier = log.filter(l => l.verdict === 'bounce' && l.feedback).map(l => `Round ${l.round + 1}: ${l.feedback}`).join('\n');
  const user = `Task: ${task.title}\nOwner's request: ${task.text}` + (ownerFeedback ? `\nThe owner had sent an earlier version back with: "${ownerFeedback}". The draft must now answer that.` : '') +
    (earlier ? `\n\nYour earlier feedback to the desk (check each point was fixed):\n${earlier}` : '') +
    `\n\nDRAFT BY ${desk.name}\n${String(draft || '').slice(0, 12000)}`;
  return { extra, user };
}

/** The lead's reply → { verdict, feedback, checks, unreadable }. Anything that cannot be read passes: a draft never stalls. */
export function parseVerdict(text) {
  const unread = { verdict: 'pass', feedback: '', checks: [], unreadable: true };
  let j; try { const s = String(text || '').replace(/```json|```/g, ''); const a = s.indexOf('{'), b = s.lastIndexOf('}'); if (a < 0 || b < a) return unread; j = JSON.parse(s.slice(a, b + 1)); } catch { return unread; }
  const v = String(j.verdict || '').toLowerCase().trim();
  if (v !== 'pass' && v !== 'bounce') return unread;
  const checks = (Array.isArray(j.checks) ? j.checks : []).map(c => ({ check: String(c?.check || '').slice(0, 200), met: c?.met !== false })).filter(c => c.check).slice(0, 12);
  let feedback = String(j.feedback || '').trim().slice(0, 1200);
  if (v === 'bounce' && !feedback) feedback = checks.filter(c => !c.met).map((c, i) => `${i + 1}. ${c.check}`).join(' ');
  const dial = String(j.dial || '').trim().slice(0, 300);
  if (v === 'bounce' && !feedback) return { verdict: 'pass', feedback: '', dial, checks, unreadable: true }; // a bounce that says nothing cannot be acted on
  const lesson = lessons.parse(j.lesson); // optional; a malformed one is dropped (leadlessons.mjs)
  return { verdict: v, feedback: v === 'pass' ? '' : feedback, dial, checks, unreadable: false, ...(lesson ? { lesson } : {}) };
}

/** Run the loop on a finished first draft. review({ out, round, log }) → the lead's reply text; rerun(feedback, out) → the desk's
 *  new run result. task.leadReview is kept current and onChange(task) fires at each step so the trail moves live.
 *  Resolves { out, leadReview } where out is the final draft's run result. */
export async function runLoop({ task, out, review, rerun, max = 2, by = '', onChange = () => {}, now = Date.now }) {
  const lr = task.leadReview = { phase: 'review', round: 0, by, log: [], open: '' };
  for (;;) {
    lr.phase = 'review'; onChange(task);
    let v; try { v = parseVerdict(await review({ out, round: lr.round, log: lr.log })); } catch { v = { verdict: 'pass', feedback: '', checks: [], unreadable: true }; } // fail open
    lr.log.push({ round: lr.round, verdict: v.verdict, feedback: v.feedback, dial: v.dial || '', checks: v.checks, ...(v.unreadable ? { unreadable: true } : {}), at: now() });
    lr.dial = v.dial || ''; // the lead's latest read of whether this moves the dial, shown to the owner on the card
    if (v.lesson) lr.proposed = v.lesson; // one lesson per task: the latest the lead offered; serve.mjs vets it before the owner sees it
    if (v.verdict === 'pass') { lr.phase = 'signed'; lr.open = ''; if (v.unreadable) lr.unreadable = true; onChange(task); return { out, leadReview: lr }; }
    if (lr.round >= max) { lr.phase = 'escalated'; lr.open = v.feedback; onChange(task); return { out, leadReview: lr }; }
    lr.round++; lr.phase = 'rework'; lr.open = v.feedback; onChange(task);
    try { out = await rerun(`From the lead, round ${lr.round}: ${v.feedback}`, out); }
    catch (e) { lr.phase = 'escalated'; lr.open = `${v.feedback} (The desk could not rework it: ${e.message})`; onChange(task); return { out, leadReview: lr }; } // keep the last draft that exists
  }
}

/** The line added to the review card's ask: who signed off, or what is still open. */
export function askLine(lr, leadName = 'the lead') {
  if (!lr) return '';
  const n = lr.round, read = lr.dial ? ` The lead's read: ${lr.dial}` : '';
  if (lr.phase === 'signed') return `\n\nLead review: signed off by ${leadName}${n ? ` after ${n} round${n === 1 ? '' : 's'} of rework` : ''}.${lr.unreadable ? ' (The lead\'s verdict could not be read, so this passed unchecked.)' : read} That is not approval to send; that is yours.`;
  if (lr.phase === 'escalated') return `\n\nLead review: ${leadName} escalated this after ${n} round${n === 1 ? '' : 's'} of rework. Still open: ${lr.open}${read}`;
  return '';
}
