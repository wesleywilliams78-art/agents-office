// Agents Office: lead review and bounce loop (4 Nov 2026). Plan: docs/lead-review-plan.md.
// A desk finishes a draft; before it reaches the owner the department lead reads it against the request. Pass: it goes
// to the owner "signed off by the lead". Bounce: the desk reworks it with the lead's feedback, up to maxRounds bounces,
// then the lead escalates and the owner gets it with the open concerns shown. The sign-off is never approval to send.
// Pure: the model calls are injected (serve.mjs passes them), so check.mjs runs every path with a fake model.

import * as lessons from './leadlessons.mjs';

// barRounds (Wesley, 8 Nov 2026): a draft that misses a stated target (55 sources, 4,000 words, the desk's own "not at the bar")
// is never forwarded to clear the list. It goes back as rework naming what is missing and a route not yet tried, up to barRounds
// rework rounds; the owner sees it only when the target is met, or with the "exhausted" list (every route, what it gave, why no more).
export const DEFAULTS ={ enabled: false, departments: ['marketing'], maxRounds: 2, barRounds: 3, model: 'sonnet', effort: 'medium' };

/** office.config.json → { enabled, departments, maxRounds (1 to 3), barRounds (1 to 5), model, effort }. Switched off unless the config says true. */
export function settings(cfg) {
  const s = { ...DEFAULTS, ...((cfg && cfg.leadReview) || {}) };
  s.enabled = s.enabled === true;
  s.departments = (Array.isArray(s.departments) ? s.departments : DEFAULTS.departments).map(d => String(d).toLowerCase());
  s.maxRounds = Math.min(3, Math.max(1, parseInt(s.maxRounds, 10) || DEFAULTS.maxRounds));
  s.barRounds = Math.min(5, Math.max(s.maxRounds, parseInt(s.barRounds, 10) || DEFAULTS.barRounds));
  return s;
}

/** The desk's own words that it is short of its target, or ''. A lead's pass over these is turned into a target bounce. */
const SELF_MISS = /[^.\n]{0,80}\b(not at the bar|below the bar|short of (?:the |its )?(?:bar|target))\b[^.\n]{0,80}/i; // not "do not build": that can be a real recommendation; the lead's prompt covers it
export function selfMiss(draft) { const m = SELF_MISS.exec(String(draft || '')); return m ? m[0].trim().slice(0, 200) : ''; }
const routeKey = r => String(r || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

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
export function reviewPrompt({ task, draft, desk, lead, round = 0, max = 2, barMax = max, log = [], ownerFeedback = '', skills = [] }) {
  const asked = [...new Set(log.flatMap(l => l.routes || []))];
  const extra = `LEAD REVIEW\nYou are the manager of ${desk.name}${desk.role ? ` (${desk.role})` : ''} and you are reviewing the draft below before the owner sees it. You review as a world-class practitioner of this craft, not as a proofreader. You do not rewrite the draft: you pass it, or you send it back with specific direction.\n` +
    'READ 0, THE TARGETS (first, every time). List each stated target: a number in the owner\'s request or in the desk\'s rules and skills (a source count, a word count, a number of items or categories), and anything the draft says about itself being short ("not at the bar", "do not build", "N of M"). A missed target is never a pass, and never something to send the owner to get it off the list: it goes back as rework. Fill "bar" with the target and what the draft reached. Fill "routes" with the concrete routes the desk has NOT yet tried that could close the gap, each new: the browser (the owner\'s Chrome) for script-driven pages, locators and tables that would not fetch; the Wayback Machine for earlier figures; annual reports and filings; official statistics; more and different searches; or a better-placed seat in the department ("to": its id, never you). Fill "tried" with every route the desk has tried so far and what each gave, read from the draft. ' +
    `Only when every route is truly spent and nothing more is possible, the verdict is "exhausted": "tried" complete, "why" says why nothing more is possible, and "decision" is one yes/no for the owner on how to go on (ask, your recommend, and the task to run on yes). Target misses get up to ${barMax} rounds of rework; this is rework round ${round} of ${barMax}.\n` +
    (asked.length ? `Routes already asked for in earlier rounds (do not ask for them again unless the draft shows they were not tried): ${asked.join('; ')}\n` : '') +
    'Then two reads, in this order.\n' +
    'READ 1, THE RULES. Check the draft against: the owner\'s request and any acceptance checks in it; the standing instructions, skills and lessons the desk worked under (below, "RULES THE DESK WORKED UNDER"); and the house and brand rules in the company notes and the notes the desk read (brand names and structure, proof figures, formats, what is never said). A breach is a bounce.\n' +
    'READ 2, THE BAR. Ask: would this move the dial for the owner as a person and a business, or is it merely acceptable? World-class means a sharp hook, one clear point, specific rather than generic, a reason for the right reader to act, in the owner\'s voice. If it is flat, generic, or has no point of view, bounce it, and say exactly what is weak and what the stronger move is (a sharper line, a different angle, a cut).\n' +
    'Bounce for: (1) an unmet acceptance check; (2) a specific figure, name, date or claim presented as fact with no source and not marked (assumed); (3) a breach of the desk\'s rules or the house and brand rules; (4) the wrong format or length; (5) it would not move the dial, with a concrete fix. Do not bounce for wording you would merely have chosen differently. Every bounce must say what to change, so the desk can act on it in one pass.\n' +
    (round >= max ? `The desk has already reworked it ${round} time${round === 1 ? '' : 's'}: bounce only for a missed target, a rule breach or a clear failure of the bar.\n` : '') +
    `LESSON (optional). If you bounce, or pass a draft that could have been better, and the fix is one the desk should apply to every future piece of this kind, add one lesson: a short imperative rule, general, no client or company names, no figures or numbers. Name the skill it belongs in${skills.length ? ` (the desk followed: ${skills.join(', ')})` : ' (the desk followed no skill; leave skill empty)'}. The owner decides whether it is adopted. Leave it out when the problem was specific to this piece.\n` +
    'Reply with JSON only, nothing else: {"verdict":"pass"|"bounce"|"exhausted","dial":"<one sentence: would this move the dial for the owner, and why>","feedback":"<what to change, numbered, under 150 words, empty on pass>","checks":[{"check":"<one rule or acceptance check, or the bar>","met":true|false}],"bar":{"missed":true|false,"what":"<target against what the draft reached>"},"routes":["<a route not yet tried>"],"to":"<seat id, or empty for the same desk>","tried":[{"route":"<route>","gave":"<what it gave>"}],"why":"<exhausted only>","decision":{"ask":"<one line>","recommend":"yes"|"no","task":"<what runs on yes>"},"lesson":{"skill":"<name>","rule":"<one sentence>"}}. Leave out bar, routes, to, tried, why and decision when no target is missed.';
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
  let v = String(j.verdict || '').toLowerCase().trim();
  if (v !== 'pass' && v !== 'bounce' && v !== 'exhausted') return unread;
  const s = (x, n) => String(x || '').trim().slice(0, n);
  const bar = j.bar && j.bar.missed === true ? s(j.bar.what, 300) || 'a stated target is missed' : '';
  const target = bar ? {
    bar, to: s(j.to, 40),
    routes: (Array.isArray(j.routes) ? j.routes : []).map(r => s(r, 200)).filter(Boolean).slice(0, 6),
    tried: (Array.isArray(j.tried) ? j.tried : []).map(t => ({ route: s(t?.route, 200), gave: s(t?.gave, 300) })).filter(t => t.route).slice(0, 12),
    why: s(j.why, 600),
    ...(j.decision && s(j.decision.ask, 10) ? { decision: { ask: s(j.decision.ask, 300), recommend: /^\W*no\b/i.test(String(j.decision.recommend || '')) ? 'no' : 'yes', task: s(j.decision.task, 2000) } } : {}),
  } : null;
  if (v === 'exhausted' && !target) v = 'bounce'; // "exhausted" only means something against a missed target
  if (v === 'pass' && target) v = 'bounce'; // a missed target is never a pass
  const checks = (Array.isArray(j.checks) ? j.checks : []).map(c => ({ check: String(c?.check || '').slice(0, 200), met: c?.met !== false })).filter(c => c.check).slice(0, 12);
  let feedback = String(j.feedback || '').trim().slice(0, 1200);
  if (v === 'bounce' && !feedback) feedback = checks.filter(c => !c.met).map((c, i) => `${i + 1}. ${c.check}`).join(' ');
  if (v === 'bounce' && !feedback && target) feedback = `Target missed: ${target.bar}.`;
  const dial = String(j.dial || '').trim().slice(0, 300);
  if (v === 'bounce' && !feedback) return { verdict: 'pass', feedback: '', dial, checks, unreadable: true }; // a bounce that says nothing cannot be acted on
  const lesson = lessons.parse(j.lesson); // optional; a malformed one is dropped (leadlessons.mjs)
  return { verdict: v, feedback: v === 'pass' ? '' : feedback, dial, checks, unreadable: false, ...(target ? { target } : {}), ...(lesson ? { lesson } : {}) };
}

/** Run the loop on a finished first draft. review({ out, round, log }) → the lead's reply text; rerun(feedback, out) → the desk's
 *  new run result. task.leadReview is kept current and onChange(task) fires at each step so the trail moves live.
 *  Resolves { out, leadReview } where out is the final draft's run result. */
export async function runLoop({ task, out, review, rerun, max = 2, barMax = max, by = '', onChange = () => {}, now = Date.now }) {
  barMax = Math.max(max, barMax);
  const lr = task.leadReview = { phase: 'review', round: 0, by, log: [], open: '' };
  const done = phase => { lr.phase = phase; onChange(task); return { out, leadReview: lr }; };
  // a missed target reaches the owner only as "exhausted": every route tried, what each gave, why no more, and one yes/no
  const exhaust = (v, why) => {
    const t = v.target || {};
    lr.exhausted = { target: lr.target, tried: t.tried?.length ? t.tried : (lr.tried || []), why, ...(t.decision ? { decision: t.decision } : {}) };
    lr.open = `Target missed after every route: ${lr.target}. ${why}`; return done('escalated');
  };
  for (;;) {
    lr.phase = 'review'; onChange(task);
    let v; try { v = parseVerdict(await review({ out, round: lr.round, log: lr.log })); } catch { v = { verdict: 'pass', feedback: '', checks: [], unreadable: true }; } // fail open
    const own = v.verdict === 'pass' ? selfMiss(out.result) : '';
    if (own) v = { ...v, verdict: 'bounce', unreadable: false, feedback: `Your draft says it is short of its target ("${own}"). It does not go to the owner below the bar: take the routes your draft lists as next or not yet tried, now, and report what each gave.`, target: { bar: own, routes: ['the routes the draft itself lists as next or not yet tried'], tried: [], why: '', to: '' } };
    const asked = new Set(lr.log.flatMap(l => l.routes || []).map(routeKey));
    const routes = v.target ? (v.target.routes.length ? v.target.routes : [v.feedback]) : [];
    const fresh = routes.filter(r => !asked.has(routeKey(r))), newSeat = v.target?.to && !lr.log.some(l => l.to === v.target.to) ? v.target.to : '';
    lr.log.push({ round: lr.round, verdict: v.verdict, feedback: v.feedback, dial: v.dial || '', checks: v.checks, ...(v.unreadable ? { unreadable: true } : {}), ...(v.target ? { bar: v.target.bar, routes, ...(v.target.to ? { to: v.target.to } : {}) } : {}), at: now() });
    lr.dial = v.dial || ''; // the lead's latest read of whether this moves the dial, shown to the owner on the card
    if (v.lesson) lr.proposed = v.lesson; // one lesson per task: the latest the lead offered; serve.mjs vets it before the owner sees it
    if (v.verdict === 'pass') { lr.open = ''; if (v.unreadable) lr.unreadable = true; return done('signed'); }
    if (v.target) { lr.target = v.target.bar; if (v.target.tried.length) lr.tried = v.target.tried; }
    if (v.verdict === 'exhausted') return exhaust(v, v.target.why || 'The lead found no route left to try.');
    if (v.target && !fresh.length && !newSeat) return exhaust(v, 'The lead could name no route that had not already been tried, so another run would repeat the last one.');
    const cap = lr.target ? barMax : max;
    if (lr.round >= cap) {
      if (lr.target) return exhaust(v, `The cap of ${cap} rework rounds was reached.${fresh.length ? ' Not yet tried: ' + fresh.join('; ') + '.' : ''}`);
      lr.open = v.feedback; return done('escalated');
    }
    lr.round++; lr.phase = 'rework'; lr.open = v.feedback; onChange(task);
    const fb = `From the lead, round ${lr.round}: ${v.feedback}` + (v.target ? `\nTarget: ${v.target.bar}. Routes to try this round, none of them tried before: ${fresh.map((r, i) => `${i + 1}. ${r}`).join(' ')}. Say in your result what each route gave.` : '');
    const before = String(out.result || '').trim();
    try { out = await rerun(fb, out, newSeat); }
    catch (e) { lr.open = `${v.feedback} (The desk could not rework it: ${e.message})`; return done('escalated'); } // keep the last draft that exists
    if (lr.target && String(out.result || '').trim() === before) return exhaust(v, 'The rework came back unchanged, so another identical run would add nothing.');
  }
}

/** The yes/no the owner gets with an exhausted target: the lead's own, or "go on with what was found". A DECISION block (decisions.mjs). */
export function decisionBlock(lr, title = '') {
  const x = lr && lr.exhausted; if (!x) return '';
  const tried = x.tried.length ? x.tried.map((t, i) => `${i + 1}. ${t.route}: ${t.gave || 'nothing new'}`).join('\n') : '(see the result above)';
  const d = x.decision || { ask: `Go on with what was found (${x.target}), every gap marked with the routes tried?`, recommend: 'yes', task: `Wesley accepted the shortfall on "${title}" (${x.target}) after every route was tried. Finish the deliverable from what you have, mark each gap with the routes tried, and hand it to the next step your task names.` };
  return `\n\nDECISION\nask: ${d.ask}\nrecommend: ${d.recommend}\ntitle: ${('Go on: ' + title).slice(0, 80)}\n---\n${d.task}\n\nRoutes tried:\n${tried}\nEND DECISION`;
}

/** The line added to the review card's ask: who signed off, or what is still open. */
export function askLine(lr, leadName = 'the lead') {
  if (!lr) return '';
  const n = lr.round, read = lr.dial ? ` The lead's read: ${lr.dial}` : '';
  if (lr.phase === 'signed') return `\n\nLead review: signed off by ${leadName}${n ? ` after ${n} round${n === 1 ? '' : 's'} of rework` : ''}.${lr.unreadable ? ' (The lead\'s verdict could not be read, so this passed unchecked.)' : read} That is not approval to send; that is yours.`;
  const x = lr.exhausted;
  if (lr.phase === 'escalated' && x) return `\n\nLead review: ${leadName} sent this back ${n} time${n === 1 ? '' : 's'} against its target (${x.target}) and every route is now spent. Routes tried: ${x.tried.length ? x.tried.map((t, i) => `${i + 1}. ${t.route}: ${t.gave || 'nothing new'}`).join(' ') : 'see the result'}. Why nothing more: ${x.why} Decide on the card how to go on.`;
  if (lr.phase === 'escalated') return `\n\nLead review: ${leadName} escalated this after ${n} round${n === 1 ? '' : 's'} of rework. Still open: ${lr.open}${read}`;
  return '';
}
