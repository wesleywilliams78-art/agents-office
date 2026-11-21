// Franchise Entry Report: the source ledger (Wesley, 8 Nov 2026). Finland Issue 06 went round for 16 tasks because the bar ("55 named
// sources") was a number in prose and the list was never saved. Now every research pass APPENDS its sources to one file per issue,
// videos/franchise-entry-report/issues/<NN>-<country>/sources.json, and the lead review counts from that file, never from the draft's words.
// Pure and file-only, so check.mjs and the franchise-report connector (franchise_sources_add / franchise_sources_read) share it.
import fs from 'node:fs';
import path from 'node:path';

export const BAR = { sources: 55, words: 3000, maxPasses: 3 }; // words: the gate's floor in ferfile.mjs (the target is about 4,000)
const FIELDS = ['name', 'url', 'accessed', 'claim', 'stream', 'type'];
const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const pad = n => String(parseInt(n, 10)).padStart(2, '0');
export const issuesDir = root => path.join(root, 'videos', 'franchise-entry-report', 'issues');
const SPIN_OFF = /\b(recap|carousel|reel|row|stories|story|video|slides?|post|walkthrough|caption)\b/i;
const COUNTRY = '([A-Z][a-z]+(?: (?:of )?[A-Z][a-z]+)?)';

/** Which issue a task is about: { nn, country, key: '06-finland' } or null. A delivered issue (issue.json on file) is not researched again. */
export function issueRef(root, task) {
  const text = `${task?.title || ''}\n${task?.text || ''}`;
  if (task?.ferIssue && /^\d{2}-[a-z-]+$/.test(task.ferIssue)) return { nn: task.ferIssue.slice(0, 2), key: task.ferIssue, country: task.ferIssue.slice(3) };
  if (!/franchise entry report/i.test(text) || SPIN_OFF.test(String(task?.title || ''))) return null;
  const m = /issue\s*0*(\d{1,2})\b/i.exec(text); if (!m) return null;
  const nn = pad(m[1]);
  const I = '[Ii]ssue\\s*0*' + m[1] + '\\b', SEP = '[\\s,:;(–-]{1,6}';
  const c = new RegExp(I + SEP + COUNTRY).exec(text) || new RegExp(COUNTRY + SEP + I).exec(text) || /\b(?:[Rr]eport|[Ii]ssue)\b[^.\n]{0,40}\bfor ([A-Z][a-z]+)\b/.exec(text);
  let country = c ? slug(c[1]) : '';
  const dir = issuesDir(root), have = fs.existsSync(dir) ? fs.readdirSync(dir).find(f => f.startsWith(nn + '-')) : '';
  if (have) { if (fs.existsSync(path.join(dir, have, 'issue.json'))) return null; country = have.slice(3); }
  if (!country || /^(the|this|friday|issue|research|streams?)$/.test(country)) return null;
  return { nn, country, key: `${nn}-${country}` };
}

export const ledgerPath = (root, key) => path.join(issuesDir(root), key, 'sources.json');
export function read(root, key) {
  try { const j = JSON.parse(fs.readFileSync(ledgerPath(root, key), 'utf8')); return { issue: key, entries: Array.isArray(j.entries) ? j.entries : [], passes: Array.isArray(j.passes) ? j.passes : [] }; }
  catch { return null; }
}
const write = (root, key, led) => { const p = ledgerPath(root, key); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, JSON.stringify(led, null, 1) + '\n'); };
const norm = u => String(u || '').trim().toLowerCase().replace(/^https?:\/\/(www\.)?/, '').replace(/[#?].*$/, '').replace(/\/+$/, '');
const sk = e => norm(e.url) || String(e.name || '').trim().toLowerCase();

/** Distinct sources: a named source with a URL (or a name) that is not already counted, and a claim it supports. */
export function count(led) { const seen = new Set(); for (const e of led?.entries || []) { const k = sk(e); if (k && e.name && e.claim) seen.add(k); } return seen.size; }

/** Append entries (what a research pass calls through the connector). Duplicates by URL are skipped, not counted twice. */
export function append(root, key, entries, pass = '') {
  const led = read(root, key) || { issue: key, entries: [], passes: [] }, have = new Set(led.entries.map(sk)), rejected = [];
  let added = 0;
  for (const raw of Array.isArray(entries) ? entries : []) {
    const e = Object.fromEntries(FIELDS.map(f => [f, String(raw?.[f] ?? '').trim().slice(0, 400)]));
    if (!e.name || !e.claim || !(e.url || e.type)) { rejected.push(`${e.name || '(no name)'}: needs name, claim and a URL (or an evidence type)`); continue; }
    if (have.has(sk(e))) { rejected.push(`${e.name}: already in the list`); continue; }
    have.add(sk(e)); led.entries.push({ n: led.entries.length + 1, ...e, accessed: e.accessed || new Date().toISOString().slice(0, 10), ...(pass ? { pass } : {}) }); added++;
  }
  write(root, key, led);
  return { added, rejected, total: count(led), bar: BAR.sources };
}

/** The server notes each reviewed pass here, so the pass cap survives across the tasks a decision starts. */
export function notePass(root, key, taskId, facts) {
  const led = read(root, key) || { issue: key, entries: [], passes: [] };
  if (!led.passes.some(p => p.task === taskId)) led.passes.push({ task: taskId, at: new Date().toISOString(), sources: facts.sources, words: facts.words ?? null });
  write(root, key, led); return led.passes.length;
}

/** Words of the finished report (every string in the ISSUE JSON), or 0 when the draft carries none. Machine-counted. */
export function reportWords(result) {
  const m = /ISSUE JSON\s*(?:```(?:json)?)?\s*([\s\S]*?)\s*(?:```)?\s*END ISSUE JSON/i.exec(String(result || '')); if (!m) return 0;
  try { let n = 0; const walk = o => { if (typeof o === 'string') n += o.split(/\s+/).filter(Boolean).length; else if (Array.isArray(o)) o.forEach(walk); else if (o && typeof o === 'object') Object.values(o).forEach(walk); }; walk(JSON.parse(m[1])); return n; } catch { return 0; }
}

/** The lead review's facts for one draft. kind: 'none' (not a report task) | 'missing' | 'short' | 'met' | 'capped' | 'accepted'.
 *  Counts come from the ledger file and the draft's text, never from numbers the draft states. */
export function check(root, task, result, { bar = BAR } = {}) {
  const ref = issueRef(root, task); if (!ref) return { kind: 'none' };
  const led = read(root, ref.key), sources = count(led), words = reportWords(result), passes = led?.passes?.filter(p => p.task !== task.id).length || 0;
  const f = { ref, sources, words, passes, need: bar.sources, needWords: bar.words, file: `videos/franchise-entry-report/issues/${ref.key}/sources.json` };
  const label = `Issue ${ref.nn} ${ref.country.replace(/(^|-)([a-z])/g, (_, a, b) => (a ? ' ' : '') + b.toUpperCase())}`;
  const short = [sources < bar.sources && `${sources} of ${bar.sources} sources in the saved list`, words && words < bar.words && `${words} of ${bar.words} words (machine-counted)`].filter(Boolean);
  const out = { ...f, maxPasses: bar.maxPasses, line: `Counted by the office from ${f.file}: ${sources} distinct sources (bar ${bar.sources})${words ? `; ${words} words in the report text (bar ${bar.words})` : ''}; ${passes} earlier pass${passes === 1 ? '' : 'es'} on this issue.` };
  if (task.by === 'decision') return { ...out, kind: 'accepted', bar: '' }; // Wesley already said yes on the card (publish thin, or save the list): counted, not sent round again
  const done = o => ({ ...o, ...(o.kind === 'missing' || o.kind === 'capped' ? { decide: decision(o) } : {}) });
  if (!led || !led.entries.length) return done({ ...out, kind: 'missing', bar: `no saved source list for ${label} (${f.file} does not exist or is empty); the bar of ${bar.sources} cannot be checked`,
    feedback: `The source list for ${label} was never saved, so the bar of ${bar.sources} named sources cannot be checked. Do NOT run new research. Save the sources you have already found by calling franchise_sources_add (issue "${ref.key}"): one entry each with name, url, accessed, claim, stream, type. Then end with the count the tool returns. Do not state a count in words.`,
    routes: ['save the sources already found with franchise_sources_add (no new research)'] });
  if (!short.length) return { ...out, kind: 'met', bar: '' };
  if (passes >= bar.maxPasses) return done({ ...out, kind: 'capped', bar: short.join('; '), feedback: '', routes: [] });
  return { ...out, kind: 'short', bar: short.join('; ') };
}

/** The yes/no for Wesley once the pass cap is reached, or once the list is still missing: never "go on" with another full pass. */
export function decision(f, title = '') {
  const short = f.kind === 'missing' ? `no saved list (${f.file})` : `${f.sources} of ${f.need} sources saved`, label = `Issue ${f.ref.nn} ${f.ref.country.replace(/(^|-)([a-z])/g, (_, a, b) => (a ? ' ' : '') + b.toUpperCase())}`;
  if (f.kind === 'missing') return { ask: `Save the ${label} sources now, with no new research?`, recommend: 'yes', task: `Call franchise_sources_read for "${f.ref.key}". If it is empty, save every source named in the earlier passes' notes in the Brain with franchise_sources_add. Do NOT search for anything new. Report the count the tool returns and nothing else.` };
  const near = f.sources >= Math.round(f.need * 0.8);
  return { ask: `${label} has had ${f.passes + 1} research passes and sits at ${short}. Publish it as openly thin?`, recommend: near ? 'yes' : 'no',
    task: `Wesley chose to publish ${label} as openly thin. Build the seven pages from the saved list (${f.file}) and the notes already filed. No new research. Say at the top of the report that it is below the bar of ${f.need} sources (${f.sources} saved) and mark each gap with the routes tried. If you answer No on the card instead, the date moves and nothing runs.` };
}
