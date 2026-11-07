// Agents Office: the design audit (Wesley, 7 Nov 2026). Anything with a visual is audited by the GRAPHICS DESIGNER before the
// department lead reads it and before the owner sees it: "it should be sent to the graphic designer to make sure they've audited
// it and they're happy with the output". QA and the lead come after the audit, never instead of it.
// A draft that names video-studio jobs (slides, stills, an MP4 under output/video) is a visual. The designer opens each job with
// video_look, judges it against the design-audit skill, and passes it or sends it back with numbered fixes; the desk (or, on a
// team task, the lead who built it) reworks it, up to maxRounds, then the owner gets it with what is still open.
// The designer's own drafts are not audited a second time: she looks at her own work in the same run (design-craft, look.md).
// Pure: the model calls are injected (serve.mjs passes them), so check.mjs runs every path with a fake model.

import { parseVerdict } from './leadreview.mjs';

export const DEFAULTS = { enabled: false, desk: 'gfx', departments: ['emails', 'sales', 'marketing', 'ops', 'fin', 'delivery'], maxRounds: 2, model: 'sonnet', effort: 'medium' };
export const PREFIX = 'From the design audit'; // the rework line run() and the team synth recognise

/** office.config.json → { enabled, desk, departments, maxRounds (1 to 3), model, effort }. Off unless the config says true. */
export function settings(cfg) {
  const s = { ...DEFAULTS, ...((cfg && cfg.designAudit) || {}) };
  s.enabled = s.enabled === true;
  s.desk = String(s.desk || DEFAULTS.desk);
  s.departments = (Array.isArray(s.departments) ? s.departments : DEFAULTS.departments).map(d => String(d).toLowerCase());
  s.maxRounds = Math.min(3, Math.max(1, parseInt(s.maxRounds, 10) || DEFAULTS.maxRounds));
  return s;
}

/** The video-studio jobs a draft names: output/video/<id>-slides, -stills, <id>.mp4, or "job <id>". exists(id) drops ids with no job file. */
export function jobsIn(text, exists = () => true) {
  const s = String(text || ''), ids = new Set();
  for (const m of s.matchAll(/output[\\/]+video[\\/]+(x[a-z0-9]{6,16})(?=-slides|-stills|-look|\.mp4)/gi)) ids.add(m[1].toLowerCase());
  for (const m of s.matchAll(/\bjob\b[\s:`*(]*(x[a-z0-9]{6,16})\b/gi)) ids.add(m[1].toLowerCase());
  return [...ids].filter(id => exists(id)).slice(0, 6);
}

/** All must hold: on, the department is in, the task waits for the owner, a draft or redraft (not an approve or an answer turn),
 *  the desk is not the designer herself, and the draft names at least one studio job. */
export function applies({ cfg, task, desk, approve = false, answer = false, waits = true, jobs = [] }) {
  if (!cfg || !cfg.enabled || !task || !desk) return false;
  if (approve || answer || !waits) return false;
  if (desk.id === cfg.desk) return false;
  if (!cfg.departments.includes(String(task.dept || desk.department || '').toLowerCase())) return false;
  return jobs.length > 0;
}

/** The designer's instructions for one audit: the system extra and the user message. */
export function auditPrompt({ task, draft, desk, jobs, round = 0, max = 2, log = [] }) {
  const extra = 'DESIGN AUDIT\nThe owner\'s rule: anything with a visual is audited by you before the department lead or QA reads it and before the owner sees it. ' +
    `You are auditing visuals that ${desk.name} made. You audit; you do not rebuild and you do not rewrite the words.\n` +
    'Follow your design-audit skill. First open every job below with video_look (the contact sheet, then any weak slide at full size with `slide`). Never judge a visual you have not looked at.\n' +
    'Judge it against the bar in design-audit: impact (one focal point, readable at grid size), first frame finished, type (never touching an edge or crossing a colour edge, no word alone on a last line, no split hyphenated word, contrast, small lines readable on a phone), repetition, and the brand or series sub-guidelines that fit (WRW brand kit, a report\'s own country colours, Art of Operations, Tales of Nirn, newsletter headers, client brands).\n' +
    'Send it back for: a breach of the brand or series rules; a fault a viewer would notice (cut-off or crossing type, unreadable small text, a word alone, an underline through letters, a flat or forgettable first slide); the wrong format. Each fix must be specific and doable with the studio (which slide, what to change). Do not send it back for taste you cannot name as a rule, or for a word or figure (say so instead: the words are not yours to change).\n' +
    (round >= max ? `This is the last round (the desk has already reworked it ${round} time${round === 1 ? '' : 's'}): send it back only for a brand breach or a fault a viewer would clearly notice; the owner reads it next either way.\n` : '') +
    'Reply with JSON only, nothing else: {"verdict":"pass"|"bounce","dial":"<one sentence: what a viewer sees first and whether it lands>","feedback":"<numbered fixes by slide, under 150 words, empty on pass>","checks":[{"check":"<one rule from the bar>","met":true|false}],"looked":["<job ids you opened with video_look>"]}';
  const earlier = log.filter(l => l.verdict === 'bounce' && l.feedback).map(l => `Round ${l.round + 1}: ${l.feedback}`).join('\n');
  const user = `Task: ${task.title}\nOwner's request: ${task.text}\n\nStudio jobs to audit: ${jobs.join(', ')}` +
    (earlier ? `\n\nYour earlier fixes (check each one was made):\n${earlier}` : '') +
    `\n\nDRAFT BY ${desk.name}\n${String(draft || '').slice(0, 8000)}`;
  return { extra, user };
}

/** The designer's reply → the lead-review verdict shape, plus which jobs she says she opened. */
export function parseAudit(text) {
  const v = parseVerdict(text);
  let looked = [];
  try { const s = String(text || '').replace(/```json|```/g, ''); const j = JSON.parse(s.slice(s.indexOf('{'), s.lastIndexOf('}') + 1)); looked = (Array.isArray(j.looked) ? j.looked : []).map(x => String(x).toLowerCase()).slice(0, 6); } catch {}
  delete v.lesson; // the audit proposes no lessons; the lead's loop does that
  return { ...v, looked };
}

/** Run the loop on a finished draft. audit({ out, jobs, round, log }) → { text, used } (the designer's reply and the tools her run
 *  called); rerun(feedback, out) → the desk's new run result. task.designAudit is kept current and onChange(task) fires at each step.
 *  A draft never stalls: an unreadable verdict or a failed audit run passes it on, marked. Resolves { out, designAudit }. */
export async function runLoop({ task, out, jobsOf, audit, rerun, max = 2, by = '', onChange = () => {}, now = Date.now }) {
  const da = task.designAudit = { phase: 'audit', round: 0, by, log: [], open: '' };
  for (;;) {
    const jobs = jobsOf(out.result);
    da.jobs = jobs; da.phase = 'audit'; onChange(task);
    if (!jobs.length) { da.phase = 'skipped'; da.open = 'the reworked draft names no studio job to look at'; onChange(task); return { out, designAudit: da }; }
    let v, used = [];
    try { const r = await audit({ out, jobs, round: da.round, log: da.log }); used = r.used || []; v = parseAudit(r.text); }
    catch (e) { v = { verdict: 'pass', feedback: '', checks: [], unreadable: true, looked: [], failed: String(e.message || e).slice(0, 200) }; }
    const sawIt = used.some(u => /video_look/.test(u)); // her run must have called video_look: a verdict on a picture she did not open is marked
    da.log.push({ round: da.round, verdict: v.verdict, feedback: v.feedback, dial: v.dial || '', checks: v.checks, looked: v.looked, sawIt, ...(v.unreadable ? { unreadable: true } : {}), ...(v.failed ? { failed: v.failed } : {}), at: now() });
    da.dial = v.dial || '';
    if (v.verdict === 'pass') { da.phase = 'passed'; da.open = ''; da.sawIt = sawIt; if (v.unreadable) da.unreadable = true; onChange(task); return { out, designAudit: da }; }
    if (da.round >= max) { da.phase = 'escalated'; da.open = v.feedback; da.sawIt = sawIt; onChange(task); return { out, designAudit: da }; }
    da.round++; da.phase = 'rework'; da.open = v.feedback; onChange(task);
    try { out = await rerun(`${PREFIX}, round ${da.round}: ${v.feedback}`, out); }
    catch (e) { da.phase = 'escalated'; da.open = `${v.feedback} (The desk could not rework it: ${e.message})`; onChange(task); return { out, designAudit: da }; }
  }
}

/** The line added to the review card's ask: what the designer found. */
export function askLine(da, name = 'the graphics designer') {
  if (!da) return '';
  const n = da.round, read = da.dial ? ` Her read: ${da.dial}` : '', blind = da.sawIt === false ? ' (Her run did not open the visuals with video_look, so treat this as unchecked.)' : '';
  if (da.phase === 'passed') return `\n\nDesign audit: passed by ${name}${n ? ` after ${n} round${n === 1 ? '' : 's'} of rework` : ''}.${da.unreadable ? ' (Her verdict could not be read, so this passed unchecked.)' : read}${blind}`;
  if (da.phase === 'escalated') return `\n\nDesign audit: ${name} still has fixes open after ${n} round${n === 1 ? '' : 's'} of rework: ${da.open}${read}${blind}`;
  if (da.phase === 'skipped') return `\n\nDesign audit: not done, ${da.open}.`;
  return '';
}
