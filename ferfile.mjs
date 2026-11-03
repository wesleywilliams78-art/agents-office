// Franchise Entry Report: when the team's finished issue comes back, pull out its ISSUE JSON block, check it against the bar, file it
// under videos/franchise-entry-report/issues/NN-country/ and build the A4 PDF from it (connectors/franchise-report/build2.mjs).
// The gate is deliberately honest: a thin report still gets its PDF (so Wesley can see it), but the result says exactly where it falls
// short of Norway, never "done".
import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';

// A task BUILDS the report when its title says so ("Build / Write / Produce / Rerun / Fix … Franchise Entry Report …"), or when its result
// actually carries the report (an ISSUE JSON block or a REVISION READY line). Anything else that merely mentions the report and an issue
// number (a carousel, a country row, a recap, a review, a schedule change) is work FROM the report: it gets no "A4 PDF" line.
const BUILD_VERB = /\b(build|write|produce|rerun|rebuild|refresh|redo|fix|fixes|apply|revise|update)\b/i, SPIN_OFF = /\b(recap|carousel|reel|row|stories|story|video|slides?|post|walkthrough|caption)\b/i;
export const isIssue = (task, result) => {
  const title = String(task?.title || ''), both = `${title} ${task?.text || ''}`;
  if (!/franchise entry report/i.test(both)) return false;
  if (/franchise entry report/i.test(title) && BUILD_VERB.test(title) && !SPIN_OFF.test(title)) return true;
  return !!result && (/ISSUE JSON[\s\S]*END ISSUE JSON/i.test(String(result)) || !!revisionLine(result));
};
const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const KEYS = { cover: ['verdict', 'stats'], market: ['headline', 'intro', 'tiles', 'eats', 'sowhat'], rising: ['headline', 'rows', 'chart', 'reading'], white: ['headline', 'gaps', 'matrix', 'position'], regulation: ['headline', 'rows', 'tiles', 'wage'], route: ['headline', 'routes', 'fits', 'risks'], days: ['headline', 'moves', 'check', 'method', 'sources'] };
const words = o => JSON.stringify(o).replace(/"[A-Za-z]+":/g, ' ').replace(/[{}\[\]",]/g, ' ').split(/\s+/).filter(Boolean).length;

/** The JSON object between ISSUE JSON and END ISSUE JSON (or a fenced block after ISSUE JSON). */
export function extract(result) {
  const m = /ISSUE JSON\s*(?:```(?:json)?)?\s*([\s\S]*?)\s*(?:```)?\s*END ISSUE JSON/i.exec(String(result));
  if (!m) return { error: 'no ISSUE JSON block in the result' };
  try { return { data: JSON.parse(m[1].replace(/^﻿/, '')) }; } catch (e) { return { error: 'the ISSUE JSON does not parse: ' + e.message }; }
}

/** Problems against the bar. Missing keys are fatal (nothing to build); thinness is reported but does not stop the PDF. */
export function gate(d) {
  const fatal = [], notes = [];
  for (const [k, subs] of Object.entries(KEYS)) { if (!d[k]) { fatal.push(`missing ${k}`); continue; } for (const s of subs) if (d[k][s] === undefined) fatal.push(`missing ${k}.${s}`); }
  for (const k of ['issue', 'country', 'dateLong', 'colour']) if (!d[k]) fatal.push(`missing ${k}`);
  if (fatal.length) return { fatal, notes };
  const n = d.days.sources.length, w = words(d);
  if (n < 55) notes.push(`only ${n} sources (the bar is 55 or more; Norway had 62)`);
  if (w < 3000) notes.push(`only about ${w} words (the bar is about 4,000)`);
  if (d.rising.rows.length < 10) notes.push(`${d.rising.rows.length} of the 10 category rows`);
  const empty = d.rising.rows.filter(r => !r.evidence || /^\s*$/.test(r.evidence)).map(r => r.cat); if (empty.length) notes.push('empty evidence: ' + empty.join(', '));
  const cited = new Set([...JSON.stringify(d).matchAll(/\bS(\d{1,3})\b/g)].map(m => +m[1])), over = [...cited].filter(i => i > n || i < 1);
  if (over.length) notes.push('source codes with no entry in the list: S' + over.slice(0, 8).join(', S'));
  const unused = d.days.sources.map((_, i) => i + 1).filter(i => !cited.has(i)); if (unused.length) notes.push(`${unused.length} listed sources are never cited`);
  if (/\[S\d*\]?\s*\?|\{\{|TODO|to be confirmed|placeholder/i.test(JSON.stringify(d))) notes.push('a placeholder or unresolved token is still in the text');
  const hand = d.white.position?.quote ? '' : 'no "If I had a brand" quote';
  if (hand) notes.push(hand);
  return { fatal, notes, words: w, sources: n };
}

/** The revision a desk built with franchise_report_edit, named by the REVISION READY line it ends its result with (the last one wins). */
export const revisionLine = text => { const m = [...String(text || '').matchAll(/REVISION READY:\s*(\S+)/g)].pop(); return m ? m[1].replace(/[`.,;]+$/, '') : null; };
function revisionDir(root, rel) {
  const issues = path.join(root, 'videos', 'franchise-entry-report', 'issues'), abs = path.resolve(root, rel);
  const parts = path.relative(issues, abs).split(path.sep);
  if (parts.length !== 3 || parts[0].startsWith('..') || parts[1] !== 'revisions' || !/-edit$/.test(parts[2])) throw new Error(`${rel} is not an edit revision of an issue`);
  const pdf = fs.existsSync(abs) ? fs.readdirSync(abs).find(f => /\.pdf$/i.test(f)) : null;
  if (!pdf || !fs.existsSync(path.join(abs, 'issue.json'))) throw new Error(`${rel} has no issue.json and PDF`);
  return { abs, issueDir: path.join(issues, parts[0]), pdf: path.join(abs, pdf) };
}

/** On Wesley's APPROVE: make the edited revision the live issue (issue.json, PDF, HTML). The live files are copied to revisions/<time>-replaced/ first. */
export function promote(root, text) {
  const rel = revisionLine(text); if (!rel) return null;
  const r = revisionDir(root, rel), live = r.issueDir, stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const livePdf = fs.readdirSync(live).find(f => /^WRW-Franchise-Entry-Report-.*\.pdf$/i.test(f) && !/revision/i.test(f)) || path.basename(r.pdf);
  const keep = path.join(live, 'revisions', stamp + '-replaced'); fs.mkdirSync(keep, { recursive: true });
  for (const f of ['issue.json', livePdf, livePdf.replace(/\.pdf$/i, '.html')]) if (fs.existsSync(path.join(live, f))) fs.copyFileSync(path.join(live, f), path.join(keep, f));
  fs.copyFileSync(path.join(r.abs, 'issue.json'), path.join(live, 'issue.json'));
  fs.copyFileSync(r.pdf, path.join(live, livePdf));
  const html = r.pdf.replace(/\.pdf$/i, '.html'); if (fs.existsSync(html)) fs.copyFileSync(html, path.join(live, livePdf.replace(/\.pdf$/i, '.html')));
  const rp = p => path.relative(root, p).replace(/\\/g, '/');
  return { promoted: rel, live: rp(path.join(live, livePdf)), backup: rp(keep), text: `The approved revision is now the live issue: ${rp(path.join(live, livePdf))} (from ${rel}). The version it replaced is kept in ${rp(keep)}. Nothing was posted or copied to Drive.` };
}

/** Returns { ok, pdf, dir, notes, reason }. Never throws. */
export function build(root, task, result) {
  return new Promise(resolve => {
    try {
      const ex = extract(result);
      if (ex.error && revisionLine(result)) { // a fix made with franchise_report_edit: already built as a revision, nothing to file
        try { const r = revisionDir(root, revisionLine(result)), g = gate(JSON.parse(fs.readFileSync(path.join(r.abs, 'issue.json'), 'utf8')));
          return resolve({ ok: true, edited: true, revision: true, pdf: r.pdf, dir: r.abs, words: g.words, sources: g.sources, notes: g.notes }); }
        catch (e) { return resolve({ ok: false, reason: e.message }); }
      }
      if (ex.error) return resolve({ ok: false, reason: ex.error });
      // A block that only carries the sections it corrected (a QA fix) is merged into the issue already on file and built as a REVISION under
      // that issue's revisions/ folder: the delivered issue.json and PDF are never overwritten. A complete block is filed as before.
      let data = ex.data, revision = null;
      if (gate(data).fatal.length) {
        const n = String(data.issue || (/issue\s*0*(\d+)/i.exec(`${task?.title || ''} ${task?.text || ''}`) || [])[1] || '').padStart(2, '0'), issues = path.join(root, 'videos', 'franchise-entry-report', 'issues');
        const hit = n !== '00' && fs.existsSync(issues) ? fs.readdirSync(issues).find(f => f.startsWith(n + '-') && fs.existsSync(path.join(issues, f, 'issue.json'))) : null;
        if (hit) {
          const old = JSON.parse(fs.readFileSync(path.join(issues, hit, 'issue.json'), 'utf8')), merged = { ...old };
          for (const [k, v] of Object.entries(data)) merged[k] = v && typeof v === 'object' && !Array.isArray(v) && old[k] && typeof old[k] === 'object' && !Array.isArray(old[k]) ? { ...old[k], ...v } : v;
          data = merged; revision = path.join(issues, hit, 'revisions', new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19));
        }
      }
      const g = gate(data); if (g.fatal.length) return resolve({ ok: false, reason: 'the JSON is incomplete: ' + g.fatal.slice(0, 6).join(', ') });
      const d = data, num = String(d.issue).padStart(2, '0'), dir = revision || path.join(root, 'videos', 'franchise-entry-report', 'issues', `${num}-${slug(d.country)}`);
      fs.mkdirSync(dir, { recursive: true });
      const json = path.join(dir, 'issue.json'), pdf = path.join(dir, `WRW-Franchise-Entry-Report-${num}-${String(d.country).trim().replace(/\s+/g, '-')}${revision ? '-revision' : ''}.pdf`);
      fs.writeFileSync(json, JSON.stringify(d, null, 2));
      execFile(process.execPath, [path.join(root, 'connectors', 'franchise-report', 'build2.mjs'), json, pdf], { cwd: root, timeout: 180000, windowsHide: true }, (err, out, errOut) => {
        if (err) return resolve({ ok: false, dir, notes: g.notes, reason: (errOut || err.message).toString().slice(0, 300) });
        let fit = []; try { fit = JSON.parse(out.trim().split('\n').pop()).fit || []; } catch {}
        const over = fit.filter(f => f.over > 0).map(f => 'page ' + f.page), small = fit.filter(f => f.scale < 0.7).map(f => `page ${f.page} had to shrink to ${Math.round(f.scale * 100)}%`);
        resolve({ ok: !over.length, pdf, dir, revision: !!revision, words: g.words, sources: g.sources, notes: [...g.notes, ...(over.length ? ['does not fit on: ' + over.join(', ')] : []), ...small] });
      });
    } catch (e) { resolve({ ok: false, reason: e.message }); }
  });
}

/** The line added to the result. */
export const report = b => b.reason ? `Not built: ${b.reason}` : `${b.ok ? 'Built' : 'Built with problems'}${b.edited ? ' as an EDITED REVISION (it becomes the live issue, PDF and issue.json, when you approve this card; the old version is kept)' : b.revision ? ' as a REVISION (the delivered issue.json and PDF are untouched; the corrected sections were merged into the issue on file)' : ''}: ${b.pdf}\nAbout ${b.words} words, ${b.sources} sources. ${b.notes?.length ? 'Short of the Norway bar: ' + b.notes.join('; ') + '.' : 'Meets the bar.'}`;
