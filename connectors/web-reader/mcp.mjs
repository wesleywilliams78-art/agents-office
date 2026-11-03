// The researchers' eyes: open a web page or a PDF and read it as plain text, and list a page's links so a desk can click through.
// Served over MCP (stdio). Read only: it fetches public pages and returns text; it cannot post, log in, download to disk or run anything.
// Why it exists: WebFetch saves a PDF to a folder the desk cannot read, and a desk that guesses a URL gets a 404 and gives up.
import readline from 'node:readline';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const PAGE = 14000, MAX_BYTES = 25 * 1024 * 1024;
const text = o => ({ content: [{ type: 'text', text: typeof o === 'string' ? o : JSON.stringify(o, null, 1) }] });
const fail = m => ({ content: [{ type: 'text', text: m }], isError: true });

const ents = { shy: '', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '-', mdash: '-', hellip: '...', rsquo: "'", lsquo: "'", rdquo: '"', ldquo: '"', euro: 'EUR', pound: 'GBP' };
const unent = s => s.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16))).replace(/&([a-z]+);/gi, (m, n) => ents[n.toLowerCase()] ?? m);

function htmlToText(html) {
  let s = html.replace(/<(script|style|noscript|svg|template|iframe)[\s\S]*?<\/\1>/gi, ' ').replace(/<!--[\s\S]*?-->/g, ' ');
  s = s.replace(/<\/(tr)>/gi, '\n').replace(/<\/(td|th)>/gi, ' | ').replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|h[1-6]|li|ul|ol|table|section|article|header|footer)>/gi, '\n').replace(/<h([1-6])[^>]*>/gi, (_, n) => '\n' + '#'.repeat(+n) + ' ').replace(/<li[^>]*>/gi, '\n- ');
  s = unent(s.replace(/<[^>]+>/g, ' '));
  return s.split('\n').map(l => l.replace(/[ \t]+/g, ' ').trim()).filter((l, i, a) => l || (a[i - 1] && a[i - 1] !== '')).join('\n').trim();
}
const titleOf = html => unent((/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html) || [])[1] || '').replace(/\s+/g, ' ').trim();

async function get(url) {
  let u; try { u = new URL(url); } catch { throw new Error('That is not a web address: ' + url); }
  if (!/^https?:$/.test(u.protocol)) throw new Error('Only http and https addresses can be read.');
  const r = await fetch(u, { redirect: 'follow', headers: { 'user-agent': UA, accept: 'text/html,application/xhtml+xml,application/pdf,*/*;q=0.8', 'accept-language': 'en-GB,en;q=0.9' }, signal: AbortSignal.timeout(40000) });
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length > MAX_BYTES) throw new Error('That file is over 25 MB.');
  return { r, buf, final: r.url || u.href };
}

async function readAny(url) {
  const { r, buf, final } = await get(url);
  if (!r.ok) return { ok: false, status: r.status, final, note: `The page answered ${r.status}. Do not guess another address: search for the page, or use web_links on its parent page to find the real link.` };
  const type = (r.headers.get('content-type') || '').toLowerCase();
  if (/pdf/.test(type) || /\.pdf(\?|#|$)/i.test(final) || buf.slice(0, 5).toString() === '%PDF-') {
    const { PDFParse } = await import('pdf-parse'); const parser = new PDFParse({ data: buf });
    try { const res = await parser.getText(); return { ok: true, kind: 'pdf', final, title: '', pages: res.total || res.pages?.length || undefined, text: String(res.text || '').trim() }; } finally { await parser.destroy().catch(() => {}); }
  }
  if (/html|xml|text\/plain/.test(type) || !type) { const html = buf.toString('utf8'); return { ok: true, kind: 'html', final, title: titleOf(html), html, text: /plain/.test(type) ? html : htmlToText(html) }; }
  return { ok: false, status: r.status, final, note: `A ${type || 'binary'} file, not a page or a PDF, so it cannot be read here.` };
}

const TOOLS = [
  { name: 'web_read', description: 'Open a web page or a PDF and read it as plain text (tables come out as rows with | between cells). Use it to OPEN the primary source for a figure: the statistics office page, the regulator, the company report, a PDF. Long pages come in parts: pass offset (the number from "next_offset") to read on. Always take the address from a search result or from web_links, never guess one.', inputSchema: { type: 'object', required: ['url'], properties: { url: { type: 'string' }, offset: { type: 'number', description: 'Character to start from (default 0).' }, find: { type: 'string', description: 'Optional: return only the passages around this word or phrase (case-insensitive), instead of the page from the top. Good for a long PDF.' } } } },
  { name: 'web_links', description: 'List the links on a page (text and full address), so you can click through to the real page instead of guessing. Optionally keep only links whose text or address contains a word.', inputSchema: { type: 'object', required: ['url'], properties: { url: { type: 'string' }, contains: { type: 'string' } } } },
];

const tools = {
  async web_read(a) {
    const d = await readAny(String(a.url || '')); if (!d.ok) return fail(`${d.final}\n${d.note}`);
    const t = d.text; if (!t) return fail(`${d.final}\nNo text came back (a scanned PDF or a page that builds itself with scripts). Try another source for the same figure.`);
    if (a.find) {
      const q = String(a.find).toLowerCase(), low = t.toLowerCase(), hits = []; let i = 0;
      while ((i = low.indexOf(q, i)) >= 0 && hits.length < 8) { hits.push('…' + t.slice(Math.max(0, i - 500), i + 900).replace(/\n{2,}/g, '\n') + '…'); i += 900; }
      return text({ url: d.final, kind: d.kind, title: d.title, pages: d.pages, chars: t.length, matches: hits.length, passages: hits.length ? hits : 'Not found on this page.' });
    }
    const off = Math.max(0, +a.offset || 0), part = t.slice(off, off + PAGE), end = off + part.length;
    return text({ url: d.final, kind: d.kind, title: d.title, pages: d.pages, chars: t.length, offset: off, next_offset: end < t.length ? end : null, text: part });
  },
  async web_links(a) {
    const d = await readAny(String(a.url || '')); if (!d.ok) return fail(`${d.final}\n${d.note}`);
    if (d.kind !== 'html') return fail('That is a PDF: it has no links to list. Use web_read.');
    const out = [], seen = new Set(), q = String(a.contains || '').toLowerCase();
    for (const m of d.html.matchAll(/<a\b[^>]*?href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
      let href; try { href = new URL(unent(m[1]), d.final).href; } catch { continue; }
      if (!/^https?:/.test(href) || seen.has(href)) continue; seen.add(href);
      const label = unent(m[2].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim().slice(0, 120);
      if (q && !(label + ' ' + href).toLowerCase().includes(q)) continue;
      out.push({ text: label, url: href }); if (out.length >= 120) break;
    }
    return text({ page: d.final, title: d.title, links: out });
  },
};

const send = o => process.stdout.write(JSON.stringify(o) + '\n');
readline.createInterface({ input: process.stdin }).on('line', line => {
  let m; try { m = JSON.parse(line); } catch { return; }
  if (m.id === undefined) return;
  const ok = result => send({ jsonrpc: '2.0', id: m.id, result }), err = (code, message) => send({ jsonrpc: '2.0', id: m.id, error: { code, message } });
  try {
    if (m.method === 'initialize') return ok({ protocolVersion: m.params?.protocolVersion || '2025-03-26', capabilities: { tools: {} }, serverInfo: { name: 'web-reader', version: '1.0.0' } });
    if (m.method === 'ping') return ok({});
    if (m.method === 'tools/list') return ok({ tools: TOOLS });
    if (m.method === 'tools/call') { const t = tools[m.params?.name]; return t ? Promise.resolve(t(m.params.arguments || {})).then(ok, e => ok(fail('Could not read that: ' + (e.message || e)))) : err(-32602, 'Unknown tool'); }
    err(-32601, 'Method not found: ' + m.method);
  } catch (e) { ok(fail('Internal error: ' + (e.message || e))); }
});
