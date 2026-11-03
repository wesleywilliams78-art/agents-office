// The Franchise Entry Report desk's hands: rebuild an issue's PDF from its issue.json and LOOK at the pages, so a design fix can be tried and checked
// without a shell. Served over MCP (stdio). It runs one fixed build (build2.mjs) on one issue folder under videos/franchise-entry-report/issues/ and
// writes only into that issue's revisions/ folder: the delivered PDF is never replaced, and nothing is posted, copied to Drive or sent.
//   franchise_report_read   the issue's issue.json (or one section of it), to see the data behind a page
//   franchise_report_build  rebuild the PDF into revisions/<time>/ and return the page count plus images of the pages asked for
//   franchise_report_edit   apply exact field edits to a copy of issue.json, check it, build it as revisions/<time>-edit/, and return a
//                           REVISION READY line. The live issue is replaced only when Wesley approves the card (ferfile.promote, server side).
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { execFile } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ISSUES = path.resolve(HERE, '..', '..', 'videos', 'franchise-entry-report', 'issues');
const BUILDER = path.join(HERE, 'build2.mjs');
const text = o => ({ content: [{ type: 'text', text: typeof o === 'string' ? o : JSON.stringify(o, null, 1) }] });
const fail = m => ({ content: [{ type: 'text', text: m }], isError: true });

/** "03", "3" or "03-portugal" → the one issue folder. Anything else is refused. */
function issueDir(ref) {
  const s = String(ref ?? '').trim().toLowerCase();
  if (!/^\d{1,2}(-[a-z-]+)?$/.test(s)) throw new Error('Give the issue as its number, for example 03 or 03-portugal.');
  const n = parseInt(s, 10);
  const hit = fs.readdirSync(ISSUES, { withFileTypes: true }).filter(d => d.isDirectory() && parseInt(d.name, 10) === n && (s.includes('-') ? d.name === s : true));
  if (hit.length !== 1) throw new Error(hit.length ? 'More than one folder matches that issue.' : `There is no issue ${s}. The issues are: ${fs.readdirSync(ISSUES).join(', ')}.`);
  const dir = path.join(ISSUES, hit[0].name);
  if (!fs.existsSync(path.join(dir, 'issue.json'))) throw new Error(`Issue ${hit[0].name} has no issue.json yet, so there is nothing to build.`);
  return dir;
}

const ROOT = path.resolve(HERE, '..', '..');
const rel = p => path.relative(ROOT, p).replace(/\\/g, '/');
const stampNow = () => new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

// ---- field edits: "white.gaps.0.gap" or "white.gaps[0].gap" ----
const parsePath = p => String(p || '').replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean);
function walk(obj, keys) { // the parent of the last key, or an error naming the first missing step
  let cur = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i], next = Array.isArray(cur) ? cur[+k] : cur?.[k];
    if (next === undefined || next === null || typeof next !== 'object') return { error: `"${keys.slice(0, i + 1).join('.')}" does not exist or is not a section` };
    cur = next;
  }
  return { parent: cur, key: keys[keys.length - 1] };
}
const kind = v => Array.isArray(v) ? 'list' : v === null ? 'null' : typeof v;
const PROTECTED = ['issue', 'country', 'days.sources'];
function applyEdit(j, e, i) {
  const keys = parsePath(e.path), label = `edit ${i + 1} (${e.path})`;
  if (!keys.length) throw new Error(`${label}: no path`);
  if (PROTECTED.some(p => e.path === p) && !('append' in e)) throw new Error(`${label}: "${e.path}" cannot be replaced; add a source with append instead`);
  const w = walk(j, keys); if (w.error) throw new Error(`${label}: ${w.error}`);
  const { parent, key } = w, isArr = Array.isArray(parent), k = isArr ? +key : key, has = isArr ? k >= 0 && k < parent.length : Object.prototype.hasOwnProperty.call(parent, k);
  if (isArr && !/^\d+$/.test(key)) throw new Error(`${label}: "${key}" is not a position in a list (use a number, counting from 0)`);
  if (e.remove) {
    if (!has) throw new Error(`${label}: nothing there to remove`);
    if (isArr) parent.splice(k, 1); else delete parent[k];
    return `${e.path}: removed`;
  }
  if ('append' in e) {
    const target = has ? parent[k] : undefined;
    if (!Array.isArray(target)) throw new Error(`${label}: append needs a list at that path`);
    target.push(e.append); return `${e.path}: item ${target.length - 1} added`;
  }
  if ('find' in e) {
    if (!has || typeof parent[k] !== 'string') throw new Error(`${label}: find and replace needs text at that path`);
    const n = parent[k].split(e.find).length - 1;
    if (n === 0) throw new Error(`${label}: "${String(e.find).slice(0, 60)}" is not in the text (read the section first; match it exactly)`);
    if (n > 1 && !e.all) throw new Error(`${label}: "${String(e.find).slice(0, 60)}" appears ${n} times; make it unique or pass all: true`);
    parent[k] = parent[k].split(e.find).join(e.replace ?? ''); return `${e.path}: replaced ${n} time(s)`;
  }
  if (!('value' in e)) throw new Error(`${label}: give value, find and replace, append or remove`);
  if (has && kind(parent[k]) !== kind(e.value) && !e.change_type) throw new Error(`${label}: it holds ${kind(parent[k])}, not ${kind(e.value)}; send the same kind of value (pass change_type: true only if you mean it)`);
  if (isArr && !has) throw new Error(`${label}: position ${k} is past the end of the list; use append`);
  const added = !has; parent[k] = e.value; return `${e.path}: ${added ? 'added' : 'set'}`;
}

/** Text the builder already prints around a field: written into the data as well, it appears twice on the page. */
function doubles(j) {
  const out = [], w = j.regulation?.wage || {};
  if (/^\s*Total/i.test(w.total || '')) out.push('regulation.wage.total starts with "Total"; the page already prints "Total ≈"');
  if (/≈|\/\s*hr/i.test(w.allIn || '')) out.push('regulation.wage.allIn holds "≈" or "/hr"; the page already prints both');
  if (/^\s*\**ESTIMATE/i.test(w.method || '')) out.push('regulation.wage.method starts with ESTIMATE; the page already shows an ESTIMATE tag');
  if (/^\s*Not legal/i.test(j.regulation?.advice || '')) out.push('regulation.advice starts with "Not legal…"; the page already prints "Not legal or tax advice."');
  const scan = (o, at) => { if (Array.isArray(o)) o.forEach((x, i) => scan(x, `${at}.${i}`)); else if (o && typeof o === 'object') {
    if (typeof o.body === 'string' && o.src && /\[S[\d, S]+\]\s*$/.test(o.body)) out.push(`${at}.body ends with its source codes; the page prints src after it`);
    for (const [k, v] of Object.entries(o)) scan(v, `${at}.${k}`); } };
  scan(j, '$');
  const s = JSON.stringify(j), rep = s.match(/\b([A-Za-z]{3,})\s+\1\b/g); if (rep) out.push('repeated word(s): ' + [...new Set(rep)].slice(0, 5).join(', '));
  return out.map(x => x.replace('$.', ''));
}

/** Images of the pages asked for (at most 4), as MCP content. */
async function shots(pdf, pages) {
  const want = [...new Set((Array.isArray(pages) ? pages : []).map(Number).filter(n => n >= 1 && n <= 7))].slice(0, 4); if (!want.length) return [];
  const { PDFParse } = await import('pdf-parse'); const parser = new PDFParse({ data: fs.readFileSync(pdf) }), content = [];
  try { const s = await parser.getScreenshot({ partial: want, desiredWidth: 1000 }); for (const p of s.pages || []) { content.push({ type: 'text', text: `Page ${p.pageNumber}` }); content.push({ type: 'image', data: Buffer.from(p.data).toString('base64'), mimeType: 'image/png' }); } }
  finally { await parser.destroy().catch(() => {}); }
  return content;
}

const run = (file, args, ms) => new Promise((resolve, reject) => execFile(file, args, { timeout: ms, windowsHide: true, maxBuffer: 8 * 1024 * 1024 }, (e, so, se) => e ? reject(new Error((se || so || e.message).toString().trim().slice(-1500))) : resolve(so)));

const TOOLS = [
  { name: 'franchise_report_read', description: 'Read an issue\'s issue.json, the data every page of the Franchise Entry Report is built from. Pass section (for example "regulation", "route", "cover") to read one part; with no section you get the list of sections and their sizes. Read only.', inputSchema: { type: 'object', required: ['issue'], properties: { issue: { type: 'string', description: 'Issue number, e.g. 03 or 03-portugal.' }, section: { type: 'string' } } } },
  { name: 'franchise_report_edit', description: 'Correct a Franchise Entry Report: apply exact field edits to a copy of the issue\'s issue.json, check it, and rebuild the PDF as a revision you can look at. This is how a fix pass is made: never return a patch or a partial ISSUE JSON. Paths name one field, with list positions as numbers counting from 0: "cover.verdict", "white.gaps.0.gap", "rising.chart.items.0.star". Each edit is one of: { path, value } (replace; same kind of value as before), { path, find, replace } (change part of a text; find must match exactly once, or pass all: true), { path, remove: true } (delete a field or a list item), { path, append } (add an item to a list, e.g. a new source to days.sources). Read the section first with franchise_report_read. All edits apply together or none do. Call it again with from_revision to build on an earlier revision in the same task. The live issue and its PDF are untouched: when Wesley approves your card, the server replaces them with this revision. End your result with the REVISION READY line it returns, exactly.', inputSchema: { type: 'object', required: ['issue', 'edits', 'why'], properties: { issue: { type: 'string', description: 'Issue number, e.g. 04 or 04-kenya.' }, edits: { type: 'array', items: { type: 'object' }, description: 'The field edits, in order.' }, why: { type: 'string', description: 'One line: what this revision fixes.' }, from_revision: { type: 'string', description: 'Optional: the revision folder an earlier edit returned, to build on it.' }, pages: { type: 'array', items: { type: 'number' }, description: 'Page numbers (1 to 7) to return as images, at most 4.' } } } },
  { name: 'franchise_report_build', description: 'Rebuild an issue\'s 7-page PDF from its current issue.json with the standard builder, and look at it. The PDF is written to that issue\'s revisions/<time>/ folder (the delivered PDF is never replaced). Returns the page count and an image of each page in "pages" (up to 4 per call, default none). It only rebuilds what is on file: to correct the content, use franchise_report_edit, which edits and rebuilds in one step. It cannot change the layout code: a design change to the template goes to Claude Code as a written brief.', inputSchema: { type: 'object', required: ['issue'], properties: { issue: { type: 'string', description: 'Issue number, e.g. 03 or 03-portugal.' }, pages: { type: 'array', items: { type: 'number' }, description: 'Page numbers (1 to 7) to return as images, at most 4.' } } } },
];

const HANDLERS = {
  async franchise_report_read(a) {
    const dir = issueDir(a.issue), j = JSON.parse(fs.readFileSync(path.join(dir, 'issue.json'), 'utf8'));
    if (!a.section) return text({ issue: path.basename(dir), sections: Object.fromEntries(Object.entries(j).map(([k, v]) => [k, JSON.stringify(v).length + ' characters'])) });
    if (!(a.section in j)) return fail(`No section "${a.section}". Sections: ${Object.keys(j).join(', ')}.`);
    return text(j[a.section]);
  },
  async franchise_report_edit(a) {
    const dir = issueDir(a.issue), name = path.basename(dir);
    if (!Array.isArray(a.edits) || !a.edits.length) return fail('Send at least one edit.');
    let base = path.join(dir, 'issue.json');
    if (a.from_revision) {
      const r = path.resolve(ROOT, String(a.from_revision));
      if (!r.startsWith(path.join(dir, 'revisions') + path.sep) || !fs.existsSync(path.join(r, 'issue.json'))) return fail('from_revision must be a revision folder of this issue that holds an issue.json.');
      base = path.join(r, 'issue.json');
    }
    const j = JSON.parse(fs.readFileSync(base, 'utf8')), applied = [];
    try { a.edits.forEach((e, i) => applied.push(applyEdit(j, e, i))); } catch (e) { return fail(`Nothing applied. ${e.message}`); }
    const { gate } = await import(pathToFileURL(path.join(ROOT, 'ferfile.mjs')).href);
    const g = gate(j); if (g.fatal.length) return fail('Nothing applied: the edits would break the report: ' + g.fatal.join(', '));
    const out = path.join(dir, 'revisions', stampNow() + '-edit'); fs.mkdirSync(out, { recursive: true });
    fs.writeFileSync(path.join(out, 'issue.json'), JSON.stringify(j, null, 1) + '\n');
    fs.writeFileSync(path.join(out, 'edits.json'), JSON.stringify({ issue: name, why: a.why, base: rel(base), at: new Date().toISOString(), edits: a.edits }, null, 1));
    const pdf = path.join(out, `WRW-Franchise-Entry-Report-${name}.pdf`);
    const so = await run(process.execPath, [BUILDER, path.join(out, 'issue.json'), pdf], 180000);
    let fit = []; try { fit = JSON.parse(String(so).trim().split('\n').pop()).fit || []; } catch {}
    const over = fit.filter(f => f.over > 0).map(f => 'page ' + f.page), small = fit.filter(f => f.scale < 0.7).map(f => `page ${f.page} shrank to ${Math.round(f.scale * 100)}%`);
    const report = { revision: rel(out), why: a.why, applied, checks: { doubled_text: doubles(j), against_the_bar: g.notes, sources: g.sources, words: g.words, does_not_fit: over, shrunk: small },
      ready: !doubles(j).length && !g.notes.length && !over.length,
      next: 'Fix anything under checks with another edit (from_revision = this revision), look at the pages, then end your result with the line below. Wesley approves the card and the server makes this revision the live issue.',
      line: `REVISION READY: ${rel(out)}` };
    return { content: [{ type: 'text', text: JSON.stringify(report, null, 1) }, ...await shots(pdf, a.pages)] };
  },
  async franchise_report_build(a) {
    const dir = issueDir(a.issue), name = path.basename(dir), stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const out = path.join(dir, 'revisions', stamp), pdf = path.join(out, `WRW-Franchise-Entry-Report-${name}-revision.pdf`);
    fs.mkdirSync(out, { recursive: true });
    await run(process.execPath, [BUILDER, path.join(dir, 'issue.json'), pdf], 180000);
    const { PDFParse } = await import('pdf-parse'); const parser = new PDFParse({ data: fs.readFileSync(pdf) });
    try {
      const info = await parser.getInfo().catch(() => null), total = info?.total ?? info?.pages?.length ?? null;
      const want = [...new Set((Array.isArray(a.pages) ? a.pages : []).map(Number).filter(n => n >= 1 && n <= (total || 7)))].slice(0, 4);
      const content = [{ type: 'text', text: JSON.stringify({ built: path.relative(path.resolve(HERE, '..', '..'), pdf).replace(/\\/g, '/'), pages: total, sevenPages: total === 7, note: 'A revision for review. The delivered PDF is untouched; Wesley approves before anything replaces it.' }, null, 1) }];
      if (want.length) {
        const shots = await parser.getScreenshot({ partial: want, desiredWidth: 1000 });
        for (const p of shots.pages || []) { content.push({ type: 'text', text: `Page ${p.pageNumber}` }); content.push({ type: 'image', data: Buffer.from(p.data).toString('base64'), mimeType: 'image/png' }); }
      }
      return { content };
    } finally { await parser.destroy().catch(() => {}); }
  },
};

const send = o => process.stdout.write(JSON.stringify(o) + '\n');
readline.createInterface({ input: process.stdin }).on('line', async line => {
  let m; try { m = JSON.parse(line); } catch { return; }
  const { id, method, params } = m;
  try {
    if (method === 'initialize') return send({ jsonrpc: '2.0', id, result: { protocolVersion: params?.protocolVersion || '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'franchise-report', version: '1.0.0' } } });
    if (method === 'tools/list') return send({ jsonrpc: '2.0', id, result: { tools: TOOLS } });
    if (method === 'tools/call') {
      const h = HANDLERS[params?.name]; if (!h) return send({ jsonrpc: '2.0', id, result: fail('Unknown tool ' + params?.name) });
      try { return send({ jsonrpc: '2.0', id, result: await h(params.arguments || {}) }); } catch (e) { return send({ jsonrpc: '2.0', id, result: fail(String(e.message || e)) }); }
    }
    if (id !== undefined) send({ jsonrpc: '2.0', id, result: {} });
  } catch (e) { if (id !== undefined) send({ jsonrpc: '2.0', id, error: { code: -32603, message: String(e.message || e) } }); }
});
