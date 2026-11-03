// Reviewed site updates — the one way an agent changes the WRW Hospitality website (sites/wrw-hospitality).
// Agents have no file tools. A finished task may end with SITE UPDATE blocks (see instructions()); the owner sees them on
// the review card and the office applies them only when the owner approves, the same way as Brain updates (brainnotes.mjs).
// Guard rails: files inside the site folder only, .html .css .js .svg only, never js/vendor/ or js/config.js (the booking
// and form settings), a find must match exactly once, no outside address the site does not already use, no passwords or
// keys, never "WRW Consulting" or YSF Advisory. The previous version of a changed file is copied to the backup folder first.
import fs from 'node:fs';
import path from 'node:path';

export const instructions = url => 'SITE UPDATES\n' +
  `The WRW Hospitality website runs at ${url} while the office is running. Look at it in the browser (Chrome), at phone width (375 px) and at desktop width (1440 px). ` +
  `The browser window may not get narrower than the screen, so for each width open ${url.replace(/site\/$/, 'site-preview/')}?page=index.html&w=375 (or w=768, w=1440): the page runs inside a frame exactly that wide and lays out as it does on that screen. Scroll inside the frame; the frame is #frame and can be inspected from the preview page. ` +
  `To read a file exactly as it is written, open it with ?src on the end, for example ${url}index.html?src or ${url}css/site.css?src. ` +
  'You cannot edit files yourself. To change the site, end your result with one block per change, exactly like this:\n' +
  'SITE UPDATE\nfile: <path inside the site, e.g. index.html or css/site.css>\nreason: <one line>\n--- find\n<the exact text to change, copied from the ?src view, long enough to appear only once in that file>\n--- replace\n<the new text>\nEND SITE UPDATE\n' +
  'For a new file write mode: create under the file line and give only a --- replace part holding the whole file (.html, .css or .svg). ' +
  'The owner sees every change on the review card and it is applied only when he approves, so never say it has been applied. Up to 12 changes per task; if you need more, finish what fits and say plainly what is left. ' +
  'js/vendor/ and js/config.js are off limits. Keep the brand colours (bone #F7F2EA, ink #201A19, red #FF3131, deep red #B81F1F). Never add an outside web address the site does not already use, and never write passwords or keys.';

const EXT_EDIT = ['.html', '.css', '.js', '.svg'], EXT_CREATE = ['.html', '.css', '.svg'];
const MAX_BODY = 40000, MAX_UPDATES = 12;
const SECRET = [/\b(?:password|passcode|api[_ -]?key|secret|token)\s*[:=]\s*\S+/i, /\bsk-[A-Za-z0-9_-]{16,}/, /\bsort\s*code\b/i, /\b(?:\d[ -]?){13,19}\b/];
const BANNED = /WRW\s+Consulting|\bYSF\b/i;
const URL_RE = /https?:\/\/([a-z0-9.-]+)/gi;

export function parse(text) {
  const t = String(text || '').replace(/```[a-z]*[ \t]*\r?\n(?=[ \t]*SITE UPDATE)/g, '').replace(/(END SITE UPDATE)[ \t]*\r?\n[ \t]*```/g, '$1');
  const re = /^[ \t]*SITE UPDATE[ \t]*\r?\n([\s\S]*?)\r?\n[ \t]*END SITE UPDATE[ \t]*$/gm, out = [];
  for (let m; (m = re.exec(t));) {
    const parts = m[1].split(/^[ \t]*--- (find|replace)[ \t]*\r?$/m); // [head, 'find', text, 'replace', text]
    const h = {};
    for (const line of parts[0].split(/\r?\n/)) { const k = /^\s*(file|mode|reason)\s*:\s*(.*)$/i.exec(line); if (k) h[k[1].toLowerCase()] = k[2].trim(); }
    const b = { file: h.file || '', mode: (h.mode || 'edit').toLowerCase(), reason: h.reason || '', find: null, replace: null };
    for (let i = 1; i < parts.length; i += 2) b[parts[i]] = parts[i + 1].replace(/^\r?\n/, '').replace(/\r?\n$/, '');
    out.push(b);
  }
  return out;
}

function siteFiles(root, dir = '', acc = []) {
  for (const e of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    if (e.name.startsWith('.')) continue;
    const rel = dir ? `${dir}/${e.name}` : e.name;
    if (e.isDirectory()) siteFiles(root, rel, acc); else acc.push(rel);
  }
  return acc;
}
// every host the site already links to or loads from: a change may reuse these, never add a new one
function knownHosts(root) {
  const hosts = new Set();
  for (const rel of siteFiles(root)) if (/\.(html|css|js|svg)$/i.test(rel)) for (const m of fs.readFileSync(path.join(root, rel), 'utf8').matchAll(URL_RE)) hosts.add(m[1].toLowerCase());
  return hosts;
}
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// where the find sits in the text: exactly, or else with any run of spaces and line breaks treated alike (copied text loses them)
function locate(text, find) {
  const exact = text.split(find).length - 1;
  if (exact === 1) { const i = text.indexOf(find); return { count: 1, start: i, end: i + find.length }; }
  if (exact > 1) return { count: exact };
  const words = find.trim().split(/\s+/).filter(Boolean); if (!words.length) return { count: 0 };
  const hits = [...text.matchAll(new RegExp(words.map(esc).join('\\s+'), 'g'))];
  return hits.length === 1 ? { count: 1, start: hits[0].index, end: hits[0].index + hits[0][0].length } : { count: hits.length };
}

// whether one change is allowed and possible against the current text of its file (texts: rel -> text, updated as changes are planned). Writes nothing.
function planOne(root, b, texts, hosts) {
  const r = { file: b.file, mode: b.mode, ok: false, problem: '', rel: '' };
  const fail = p => { r.problem = p; return r; };
  if (!['edit', 'create'].includes(b.mode)) return fail('mode must be edit or create');
  const rel = String(b.file || '').trim().replace(/\\/g, '/').replace(/^\.?\/+/, '').replace(/\?src$/, '');
  if (!rel) return fail('no file named');
  if (rel.split('/').some(s => !s || s === '.' || s === '..' || s.startsWith('.') || /[:*?"<>|]/.test(s))) return fail('not a valid path inside the site');
  const abs = path.resolve(root, rel), inside = path.relative(root, abs);
  if (inside.startsWith('..') || path.isAbsolute(inside)) return fail('outside the site folder');
  const lower = rel.toLowerCase(), ext = path.extname(lower);
  if (lower.startsWith('js/vendor/')) return fail('the pinned libraries in js/vendor/ are not changed this way');
  if (lower === 'js/config.js') return fail('js/config.js holds the booking and form settings, which only the owner changes');
  r.rel = rel; r.abs = abs;
  const body = b.replace ?? '';
  if (body.length > MAX_BODY) return fail('too long for one change');
  if (SECRET.some(re => re.test(body))) return fail('looks like it holds a password, key or card number');
  if (BANNED.test(body)) return fail('the site never names WRW Consulting or YSF Advisory');
  const fresh = [...body.matchAll(URL_RE)].map(m => m[1].toLowerCase()).filter(h => !hosts.has(h));
  if (fresh.length) return fail(`adds an outside address the site does not use (${[...new Set(fresh)].join(', ')})`);
  const exists = rel in texts || fs.existsSync(abs);
  if (b.mode === 'create') {
    if (!EXT_CREATE.includes(ext)) return fail('a new file must be .html, .css or .svg');
    if (exists) return fail('that file already exists: change it with an edit');
    if (!body.trim()) return fail('nothing to create');
    texts[rel] = body; r.ok = true; return r;
  }
  if (!EXT_EDIT.includes(ext)) return fail('only .html, .css, .js and .svg files are changed this way');
  if (!exists) return fail('no such file in the site');
  if (b.find == null || !b.find.trim()) return fail('an edit needs a --- find part');
  if (b.replace == null) return fail('an edit needs a --- replace part');
  if (b.find === b.replace) return fail('the find and the replace are the same');
  const text = texts[rel] ?? fs.readFileSync(abs, 'utf8');
  const at = locate(text, b.find);
  if (at.count === 0) return fail('the find text is not in that file (copy it from the ?src view)');
  if (at.count > 1) return fail(`the find text appears ${at.count} times: include more of the surrounding text`);
  texts[rel] = text.slice(0, at.start) + b.replace + text.slice(at.end);
  r.ok = true; return r;
}

// up to MAX_UPDATES changes per task, planned in order so a second change to a file sees the first one
export function planAll(root, blocks) {
  const texts = {}, hosts = fs.existsSync(root) ? knownHosts(root) : new Set();
  const plans = blocks.map((b, i) => i >= MAX_UPDATES ? { file: b.file, mode: b.mode, ok: false, problem: `only ${MAX_UPDATES} changes per task` } : planOne(root, b, texts, hosts));
  return { plans, texts };
}

// applies the allowed changes; each changed file's previous version is copied to backupDir first
export function applyAll(root, blocks, { backupDir } = {}) {
  const { plans, texts } = planAll(root, blocks), stamp = new Date().toISOString().replace(/[:.]/g, '-'), written = new Set();
  return plans.map(p => {
    const out = { file: p.rel || p.file, mode: p.mode, ok: false, message: p.problem };
    if (!p.ok) return out;
    try {
      if (!written.has(p.rel)) {
        if (fs.existsSync(p.abs) && backupDir) { fs.mkdirSync(backupDir, { recursive: true }); fs.copyFileSync(p.abs, path.join(backupDir, `${p.rel.replace(/\//g, '__')}.${stamp}`)); }
        fs.mkdirSync(path.dirname(p.abs), { recursive: true });
        fs.writeFileSync(p.abs, texts[p.rel]);
        written.add(p.rel);
      }
      out.ok = true; out.message = p.mode === 'create' ? 'created' : 'changed';
    } catch (e) { out.message = e.message; }
    return out;
  });
}

// GET /site-preview/?page=index.html&w=375&h=812: the page inside a frame of exactly that size, so a desk whose browser window
// cannot be made narrower still sees the phone layout (the frame's own width drives the media queries). Same origin, so the
// frame can be inspected from the parent page.
const PREVIEW_SIZES = [[375, 812, 'Phone'], [768, 1024, 'Tablet'], [1440, 900, 'Desktop']];
export function preview(root, res, url) {
  const page = url.searchParams.get('page') || 'index.html';
  const num = (k, d, lo, hi) => { const n = parseInt(url.searchParams.get(k) || d, 10); return Math.min(hi, Math.max(lo, Number.isFinite(n) ? n : d)); };
  const w = num('w', 375, 320, 1920), h = num('h', w < 600 ? 812 : w < 1100 ? 1024 : 900, 400, 6000);
  if (!/^[a-z0-9-]+\.html$/.test(page) || !fs.existsSync(path.join(root, page))) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('No such page in the site'); }
  const pages = fs.readdirSync(root).filter(f => /^[a-z0-9-]+\.html$/.test(f)).sort((a, b) => (a === 'index.html' ? -1 : b === 'index.html' ? 1 : a.localeCompare(b)));
  const link = (p, ww, label, on) => `<a href="?page=${p}&w=${ww}"${on ? ' aria-current="true"' : ''}>${label}</a>`;
  const html = `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Preview · ${page} · ${w}×${h}</title>
<style>body{margin:0;background:#201A19;color:#F7F2EA;font:14px/1.4 system-ui,sans-serif}nav{display:flex;flex-wrap:wrap;gap:6px 16px;align-items:center;padding:12px 20px;border-bottom:1px solid #4A4644}
nav b{font-weight:600;margin-right:8px}a{color:#F7F2EA;text-decoration:none;padding:4px 8px;border:1px solid transparent}a[aria-current]{border-color:#FF3131;color:#FF3131}
.stage{padding:24px 20px;overflow:auto}iframe{display:block;width:${w}px;height:${h}px;border:1px solid #4A4644;background:#F7F2EA}p{margin:0 20px 8px;color:#D6D2CF}</style></head><body>
<nav><b>Page</b>${pages.map(p => link(p, w, p.replace('.html', ''), p === page)).join('')}</nav>
<nav><b>Width</b>${PREVIEW_SIZES.map(([ww, , label]) => link(page, ww, `${label} ${ww}`, ww === w)).join('')}<a href="/site/${page}" target="_blank">Open full ↗</a></nav>
<div class="stage"><p>The page below runs in a frame exactly ${w} × ${h} px, so it lays out as it does on that screen. Scroll inside the frame.</p><iframe id="frame" title="${page} at ${w} pixels wide" src="/site/${page}"></iframe></div>
</body></html>`;
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
  return res.end(html);
}

// the site as the office serves it: GET /site/<file>, and /site/<file>?src for the exact source as plain text
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.webm': 'video/webm', '.mp4': 'video/mp4', '.woff2': 'font/woff2', '.json': 'application/json', '.txt': 'text/plain; charset=utf-8' };
export function serve(root, req, res, url, prefix = '/site/') {
  let rel = decodeURIComponent(url.pathname.slice(prefix.length));
  if (!rel || rel.endsWith('/')) rel += 'index.html';
  const file = path.resolve(root, rel);
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('Not found'); }
  const src = url.searchParams.has('src') && /\.(html|css|js|svg)$/i.test(file);
  res.writeHead(200, { 'Content-Type': src ? 'text/plain; charset=utf-8' : (TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream'), 'Cache-Control': 'no-cache' });
  return res.end(fs.readFileSync(file));
}
