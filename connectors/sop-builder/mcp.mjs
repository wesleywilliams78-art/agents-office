// SOP builder: the MCP server the office agents talk to (stdio, JSON-RPC, no dependencies).
// An agent writes the content of an SOP as structured JSON; this builds the finished files in the client's house style:
// the full SOP and one-pager as dark Word documents, and an A3 wall poster as a PDF. Files land in output/sops/ and are
// downloadable from the office at /files/sops/<folder>/<file>. Nothing is sent anywhere.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { buildPoster } from './poster.mjs';
const require = createRequire(import.meta.url);
const { BRANDS } = require('./brands.cjs');
const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, '..', '..', 'output', 'sops');
const SAMPLE = fs.readFileSync(path.join(HERE, 'content.sample.json'), 'utf8');
// LibreOffice turns each Word file into the PDF that reads true in every viewer (Word's dark mode recolours the .docx), and lets the page count be checked.
const SOFFICE = [process.env.SOFFICE, 'C:\\Program Files\\LibreOffice\\program\\soffice.com', 'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.com'].find(p => p && fs.existsSync(p));
// Finished drafts land at the top level of Wesley's My Drive (Google Drive for desktop syncs the folder), next to the CV master. Never inside any of his folders.
const DRIVE_DIR = process.env.SOP_DRIVE_DIR || 'G:\\My Drive';
function deliver(files, brandName, base) {
  if (!fs.existsSync(DRIVE_DIR)) return { error: 'Google Drive for desktop is not available at ' + DRIVE_DIR };
  const out = [];
  for (const f of files.filter(x => /\.(docx|pdf)$/i.test(x))) {
    const label = path.basename(f).slice(base.length); // " - Full SOP.docx", " - Poster.pdf"
    let name = brandName + ' - ' + base + label, n = 1;
    while (fs.existsSync(path.join(DRIVE_DIR, name))) name = brandName + ' - ' + base + ' (' + (++n) + ')' + label; // never overwrite anything already in his Drive
    fs.copyFileSync(f, path.join(DRIVE_DIR, name)); out.push(name);
  }
  return { files: out };
}
const pdfPages = file => { try { const s = fs.readFileSync(file).toString('latin1'); return (s.match(/\/Type\s*\/Page[^s]/g) || []).length; } catch { return 0; } };
function toPdf(docx, outDir) {
  if (!SOFFICE) return null;
  execFileSync(SOFFICE, ['--headless', '--convert-to', 'pdf', '--outdir', outDir, docx], { timeout: 180000, stdio: 'ignore' });
  const pdf = path.join(outDir, path.basename(docx, '.docx') + '.pdf'); return fs.existsSync(pdf) ? pdf : null;
}

const TOOLS = [
  { name: 'sop_schema', description: 'The exact JSON skeleton an SOP is written in (every key, with bracketed placeholders), plus the limits. Call this first, copy the keys exactly, and replace every placeholder with real content or leave it in [brackets] when the source does not give the fact.', inputSchema: { type: 'object', properties: {} } },
  { name: 'sop_build', description: 'Build the finished SOP files for Imran\'s Diner or Creamy from the content JSON: the full SOP (Word), the one-pager (Word) and, only when asked, the A3 wall poster (PDF). Returns the file names, download links and any placeholders still unfilled. It writes files only on this computer; nothing is sent.', inputSchema: { type: 'object', required: ['client', 'content'], properties: {
    client: { type: 'string', enum: Object.keys(BRANDS), description: 'imrans-diner or creamy' },
    content: { type: 'object', description: 'The SOP content, shaped exactly like the sop_schema skeleton.' },
    formats: { type: 'array', items: { type: 'string', enum: ['full', 'onepager', 'poster'] }, description: 'Default: full and onepager. Add poster only when a poster was asked for or clearly earns its place.' },
    deliver_to_drive: { type: 'boolean', description: 'true for a finished or final-draft SOP: copies the Word and PDF files to the top level of Wesley\'s My Drive for his review. Never into a folder. Leave false for tests and drafts still being worked.' },
    filename: { type: 'string', description: 'A short file name base, e.g. "5.5 Guest Journey". Defaults to the SOP title.' },
  } } },
  { name: 'sop_review', description: 'Quality-check a built SOP folder (default: the most recent). Returns the full text of each Word file, the page counts, the placeholders still open, numbers that appear in the one-pager but not in the full SOP, and forbidden words. Read the text against the SOP quality skill; this tool only does the mechanical part.', inputSchema: { type: 'object', properties: { folder: { type: 'string', description: 'Folder name or any part of it, from sop_list. Omit for the newest.' } } } },
  { name: 'sop_deliver', description: 'Copy the Word and PDF files of a built SOP folder to the top level of Wesley\'s My Drive for his review. Refuses if a page count is wrong, and never delivers the same folder twice. Use it only after the SOP has passed review.', inputSchema: { type: 'object', required: ['folder'], properties: { folder: { type: 'string', description: 'Folder name or any part of it, from sop_list.' } } } },
  { name: 'sop_list', description: 'The ten most recent SOP builds and their files.', inputSchema: { type: 'object', properties: {} } },
];

const text = o => ({ content: [{ type: 'text', text: typeof o === 'string' ? o : JSON.stringify(o, null, 2) }] });
const fail = s => ({ isError: true, content: [{ type: 'text', text: s }] });
const slug = s => String(s).replace(/[^A-Za-z0-9 .&'-]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 70) || 'SOP';
const strings = (v, acc = []) => { if (typeof v === 'string') acc.push(v); else if (Array.isArray(v)) v.forEach(x => strings(x, acc)); else if (v && typeof v === 'object') Object.values(v).forEach(x => strings(x, acc)); return acc; };

function check(c, formats) {
  const errs = [], warns = [], req = ['title', 'shortTitle', 'purpose', 'meta', 'howToUse', 'intro', 'introNote', 'standards', 'roles', 'metrics', 'tools'];
  if (formats.includes('full')) for (const k of req) if (c[k] == null) errs.push(`missing "${k}"`);
  if (!Array.isArray(c.title) || !c.title[0]) errs.push('title must be a list of one or two short lines');
  const rows = (a, n, what) => { if (Array.isArray(a) && a.length > n) errs.push(`${what} has ${a.length} rows; the limit is ${n}`); };
  if (formats.includes('full')) { rows(c.standards?.rows, 7, 'standards'); rows(c.roles?.rows, 7, 'roles'); rows(c.metrics?.rows, 6, 'metrics'); rows(c.tools?.steps, 6, 'tools steps'); rows(c.tools?.resources, 6, 'resources'); }
  if (formats.includes('onepager')) {
    const o = c.onepager; if (!o) errs.push('missing "onepager" block (write it from the full content)');
    else { rows(o.standards, 5, 'onepager standards'); rows(o.roles, 4, 'onepager roles'); rows(o.steps, 6, 'onepager steps'); rows(o.metrics, 4, 'onepager metrics');
      for (const s of strings(o)) if (s.length > 170) warns.push(`one-pager text is long (${s.length} characters): "${s.slice(0, 50)}…"; one sentence per cell keeps it to one page`); }
  }
  if (formats.includes('poster')) {
    const p = c.poster; if (!p) errs.push('missing "poster" block');
    else if (p.layout === 'B') { if (!Array.isArray(p.stops) || !p.stops.length) errs.push('layout B needs stops'); else { rows(p.stops, 8, 'poster stops'); p.stops.forEach(s => { if (String(s.stage || '').split(/\s+/).length > 3) warns.push(`stage "${s.stage}" is over 3 words`); if (String(s.standard || '').length > 60) warns.push(`stop standard over 60 characters: "${s.standard}"`); }); } }
    else { rows(p.standards?.rows, 4, 'poster standards'); rows(p.roles?.rows, 4, 'poster roles'); rows(p.metrics?.rows, 3, 'poster metrics'); rows(p.roles?.procedure, 3, 'poster core procedure'); rows(p.tools?.steps, 4, 'poster tool steps'); rows(p.tools?.resources, 3, 'poster resources'); for (const k of ['intro', 'standards', 'roles', 'metrics', 'tools']) if (p[k] == null) errs.push(`poster is missing "${k}"`); }
  }
  const placeholders = [...new Set(strings(c).flatMap(s => s.match(/\[[^\]]{2,}\]/g) || []))];
  return { errs, warns, placeholders };
}

function build(a) {
  const brand = BRANDS[a.client]; if (!brand) return fail('client must be one of ' + Object.keys(BRANDS).join(', '));
  const c = a.content; if (!c || typeof c !== 'object') return fail('content must be the SOP JSON');
  const formats = (Array.isArray(a.formats) && a.formats.length ? a.formats : ['full', 'onepager']).filter(f => ['full', 'onepager', 'poster'].includes(f));
  const { errs, warns, placeholders } = check(c, formats);
  if (errs.length) return fail('Not built. Fix these first:\n- ' + errs.join('\n- ') + '\nCall sop_schema for the exact shape.');
  const base = slug(a.filename || (c.shortTitle || c.title.join(' ')).replace(/[\[\]]/g, ''));
  const dirName = new Date().toISOString().slice(0, 10) + ' ' + brand.id + ' ' + base;
  const dir = path.join(OUT, dirName); fs.mkdirSync(dir, { recursive: true });
  const files = [], pages = []; let badPages = false;
  try {
    const word = formats.filter(f => f !== 'poster');
    if (word.length) {
      const py = process.env.PYTHON || 'python';
      execFileSync(py, ['-I', path.join(HERE, 'make_bg.py'), dir, brand.c.GROUND, brand.c.ACCENT, brand.c.WAVE2, brand.c.SECOND], { timeout: 120000, stdio: 'ignore' });
      const job = path.join(dir, 'job.json'); fs.writeFileSync(job, JSON.stringify({ brand: brand.id, content: c, outDir: dir, base, formats: word, bgFirst: path.join(dir, 'bg_first.png'), bgInner: path.join(dir, 'bg_inner.png') }));
      const docs = JSON.parse(execFileSync(process.execPath, [path.join(HERE, 'build.cjs'), job], { timeout: 120000, encoding: 'utf8' }).trim().split('\n').pop());
      files.push(...docs);
      if (SOFFICE) for (const d of docs) {
        const pdf = toPdf(d, dir); if (!pdf) { warns.push('could not make a PDF of ' + path.basename(d)); continue; }
        files.push(pdf); const n = pdfPages(pdf), want = /Full SOP/.test(d) ? 3 : 1;
        pages.push({ file: path.basename(pdf), pages: n }); if (n && n !== want) badPages = true; if (n && n !== want) warns.push(path.basename(d) + ' runs to ' + n + ' pages; it should be ' + want + '. Cut words (never shrink the type) and build again.');
      } else warns.push('LibreOffice is not installed, so no PDFs were made and page counts are not checked');
      for (const f of ['job.json', 'bg_first.png', 'bg_inner.png']) { try { if (f !== 'job.json' || true) fs.rmSync(path.join(dir, f)); } catch {} }
    }
    if (formats.includes('poster')) { const r = buildPoster(brand.id, c, dir, base); if (r.pdf) files.push(r.pdf); if (r.html) files.push(r.html); if (r.note) warns.push(r.note); }
  } catch (e) { return fail('The build failed: ' + String(e.message || e).slice(0, 400)); }
  let drive; if (a.deliver_to_drive === true) drive = badPages ? 'NOT delivered: a document has the wrong page count. Cut words, build again, and it will be delivered once every page count is right. Nothing was put in My Drive.' : deliver(files, brand.name, base);
  if (drive?.files) fs.writeFileSync(path.join(dir, '.delivered'), JSON.stringify(drive.files));
  const link = f => '/files/sops/' + encodeURIComponent(dirName) + '/' + encodeURIComponent(path.basename(f));
  return text({ built: files.map(f => ({ file: path.basename(f), kb: Math.round(fs.statSync(f).size / 1024), download: link(f) })), folder: dir, deliveredToMyDrive: drive,
    pageCounts: pages.length ? pages : undefined, unfilledPlaceholders: placeholders.length ? placeholders.slice(0, 40) : 'none', warnings: warns.length ? warns : undefined,
    note: 'The PDFs read true in every viewer; the Word files are the editable source (Word\'s dark mode recolours them). Tell Wesley which placeholders are unfilled and send the gaps as questions, never inside the documents.' });
}

function findFolder(q) {
  let all; try { all = fs.readdirSync(OUT).filter(d => fs.statSync(path.join(OUT, d)).isDirectory()).sort().reverse(); } catch { return null; }
  if (!q) return all.find(d => fs.readdirSync(path.join(OUT, d)).some(f => /\.docx$/.test(f))) || null; // newest build with Word files
  const hits = all.filter(d => d.toLowerCase().includes(String(q).toLowerCase()));
  return hits[0] || null;
}
const numbersIn = s => new Set((s.match(/\d+(?:[.,]\d+)?\s?(?:°C|°|kg|g|ml|l|%|min|mins|hours?|hrs?|h|cups?|days?)?/gi) || []).map(x => x.replace(/\s+/g, '').toLowerCase()));
function review(a) {
  const folder = findFolder(a.folder); if (!folder) return fail('No SOP folder found' + (a.folder ? ' matching "' + a.folder + '"' : '') + '. Call sop_list.');
  const dir = path.join(OUT, folder), docs = fs.readdirSync(dir).filter(f => /\.docx$/i.test(f)).sort();
  if (!docs.length) return fail('No Word files in ' + folder);
  const py = process.env.PYTHON || 'python', out = { folder, documents: [], checks: [] }; const texts = {};
  for (const d of docs) {
    let t = ''; try { t = execFileSync(py, ['-I', path.join(HERE, 'docx_text.py'), path.join(dir, d)], { encoding: 'utf8', timeout: 60000 }); } catch (e) { out.checks.push('could not read ' + d); continue; }
    const pdf = path.join(dir, d.replace(/\.docx$/i, '.pdf')), want = /Full SOP/.test(d) ? 3 : 1, n = fs.existsSync(pdf) ? pdfPages(pdf) : null;
    texts[/Full SOP/.test(d) ? 'full' : /One Pager/i.test(d) ? 'one' : d] = t;
    out.documents.push({ file: d, pages: n, shouldBe: want, text: t.slice(0, 14000) });
    if (n && n !== want) out.checks.push('FAIL ' + d + ' is ' + n + ' pages; it should be ' + want);
    const ph = [...new Set(t.match(/\[[^\]]{2,}\]/g) || [])]; if (ph.length) out.checks.push(d + ': ' + ph.length + ' open placeholder(s): ' + ph.slice(0, 12).join(' ; '));
    const bad = t.match(/\b(V2|version 2|readiness|gap analysis|TODO|lorem)\b/gi); if (bad) out.checks.push('FAIL ' + d + ' contains words that must not be in an SOP: ' + [...new Set(bad)].join(', '));
  }
  if (texts.full && texts.one) { const f = numbersIn(texts.full), extra = [...numbersIn(texts.one)].filter(x => !f.has(x) && /\d/.test(x) && x.length > 1); if (extra.length) out.checks.push('NUMBERS in the one-pager that are not in the full SOP (check they match): ' + extra.slice(0, 20).join(', ')); }
  if (!out.checks.length) out.checks.push('no mechanical problems found');
  return text(out);
}
function deliverFolder(a) {
  const folder = findFolder(a.folder); if (!folder) return fail('No SOP folder found matching "' + a.folder + '". Call sop_list.');
  const dir = path.join(OUT, folder), mark = path.join(dir, '.delivered');
  if (fs.existsSync(mark)) return fail('Already delivered: ' + fs.readFileSync(mark, 'utf8') + '. Nothing was copied again.');
  const m = folder.match(/^\d{4}-\d{2}-\d{2} (\S+) (.+)$/), brand = m && BRANDS[m[1]]; if (!brand) return fail('Cannot tell the client from the folder name ' + folder);
  const files = fs.readdirSync(dir).filter(f => /\.(docx|pdf)$/i.test(f)).map(f => path.join(dir, f));
  for (const f of files.filter(x => /\.pdf$/i.test(x))) { const n = pdfPages(f), want = /Full SOP/.test(f) ? 3 : /One Pager/i.test(f) ? 1 : 0; if (want && n !== want) return fail('Not delivered: ' + path.basename(f) + ' is ' + n + ' pages; it should be ' + want + '.'); }
  const r = deliver(files, brand.name, m[2]); if (!r.error) fs.writeFileSync(mark, JSON.stringify(r.files));
  return text({ deliveredToMyDrive: r });
}

const tools = {
  sop_review: review,
  sop_deliver: deliverFolder,
  sop_schema() { return text({ clients: Object.keys(BRANDS), limits: { onepager: 'at most 5 standards, 4 roles rows, 6 steps, 4 metrics, one sentence per cell', posterA: 'standards 4, roles 4, metrics 3, core procedure 3, tool steps 4, resources 3', posterB: 'at most 8 stops, stage 1-3 words, standard under 60 characters' }, skeleton: JSON.parse(SAMPLE) }); },
  sop_build: build,
  sop_list() {
    try { return text(fs.readdirSync(OUT).sort().reverse().slice(0, 10).map(d => ({ folder: d, files: fs.readdirSync(path.join(OUT, d)).map(f => ({ file: f, download: '/files/sops/' + encodeURIComponent(d) + '/' + encodeURIComponent(f) })) }))); } catch { return text([]); }
  },
};

const send = o => process.stdout.write(JSON.stringify(o) + '\n');
readline.createInterface({ input: process.stdin }).on('line', line => {
  let m; try { m = JSON.parse(line); } catch { return; }
  if (m.id === undefined) return;
  const ok = result => send({ jsonrpc: '2.0', id: m.id, result }), err = (code, message) => send({ jsonrpc: '2.0', id: m.id, error: { code, message } });
  try {
    if (m.method === 'initialize') return ok({ protocolVersion: m.params?.protocolVersion || '2025-03-26', capabilities: { tools: {} }, serverInfo: { name: 'sop-builder', version: '1.0.0' } });
    if (m.method === 'ping') return ok({});
    if (m.method === 'tools/list') return ok({ tools: TOOLS });
    if (m.method === 'tools/call') { const t = tools[m.params?.name]; return t ? ok(t(m.params.arguments || {})) : err(-32602, 'Unknown tool: ' + m.params?.name); }
    err(-32601, 'Method not found: ' + m.method);
  } catch (e) { ok(fail('Internal error: ' + (e.message || e))); }
});
