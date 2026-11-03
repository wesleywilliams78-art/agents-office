// The office desks' way to open a Brain note in full. Read only, served over MCP (stdio).
// Why it exists: a desk is handed only the few notes that best match its task, each cut to about 1,800 characters (a pinned note to 9,000), and has no
// file tools. A long note (the content calendar, a build note) arrived cut off, so a desk could say "I could not open it". With these two tools it can
// find any note and read it whole. It can only read Markdown notes inside the Brain; it cannot write, move or delete anything.
//   brain_search  find notes by words in their name or text
//   brain_read    read one note in full, in parts of 30,000 characters (next_offset to read on)
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { loadConfig } from '../../config.mjs';

const BRAIN = (() => { try { return loadConfig().brainPath; } catch { return ''; } })();
const text = o => ({ content: [{ type: 'text', text: typeof o === 'string' ? o : JSON.stringify(o, null, 1) }] });
const fail = m => ({ content: [{ type: 'text', text: m }], isError: true });
const files = () => { const out = []; (function walk(d, depth) { let es; try { es = fs.readdirSync(d, { withFileTypes: true }); } catch { return; } for (const e of es) { if (e.name.startsWith('.') || e.name === 'node_modules') continue; const p = path.join(d, e.name); if (e.isDirectory()) { if (depth < 4) walk(p, depth + 1); } else if (e.name.endsWith('.md')) out.push(p); } })(BRAIN, 0); return out; };
const nameOf = f => path.basename(f, '.md');
const rel = f => path.relative(BRAIN, f).replace(/\\/g, '/').replace(/\.md$/i, '');

const TOOLS = [
  { name: 'brain_search', description: 'Find notes in Wesley\'s Brain by words in their name or text (read only). Returns the best matches with their size. Use it when a note you were told about is not in front of you or was cut off, then open it with brain_read. Uploaded documents are notes named "Upload - something"; the office\'s own task notes are under "Agents Office".', inputSchema: { type: 'object', required: ['query'], properties: { query: { type: 'string' } } } },
  { name: 'brain_read', description: 'Read a Brain note IN FULL (read only). Pass the note name as shown, for example "content-calendar" or "20-Brand/content-calendar". A long note comes in parts: pass offset (the next_offset from the last call) to read on, and keep reading until next_offset is null. Use this whenever a note shows "the note continues … not shown" or you need a later part of it. Never say you could not open a note without trying brain_search and brain_read first.', inputSchema: { type: 'object', required: ['note'], properties: { note: { type: 'string' }, offset: { type: 'integer' } } } },
];

const HANDLERS = {
  brain_search(a) {
    if (!BRAIN) return fail('The Brain folder is not configured.');
    const q = String(a.query || '').toLowerCase().trim(); if (!q) return fail('Say what to look for.');
    const words = q.split(/\s+/).filter(Boolean), hits = [];
    for (const f of files()) {
      let t = ''; try { t = fs.readFileSync(f, 'utf8'); } catch { continue; }
      const n = nameOf(f).toLowerCase(), low = t.toLowerCase(); let s = 0;
      for (const w of words) { if (n.includes(w)) s += 6; s += Math.min(low.split(w).length - 1, 8); }
      if (s) { const i = low.indexOf(words[0]); hits.push({ s, note: rel(f), chars: t.length, snippet: i >= 0 ? t.slice(Math.max(0, i - 60), i + 160).replace(/\s+/g, ' ') : '' }); }
    }
    return text(hits.sort((x, y) => y.s - x.s).slice(0, 12).map(({ s, ...h }) => h));
  },
  brain_read(a) {
    if (!BRAIN) return fail('The Brain folder is not configured.');
    const want = String(a.note || '').replace(/\.md$/i, '').replace(/\\/g, '/').trim().toLowerCase(), all = files();
    const f = all.find(x => nameOf(x).toLowerCase() === want) || all.find(x => rel(x).toLowerCase() === want) || all.find(x => rel(x).toLowerCase().endsWith('/' + want)) || all.find(x => nameOf(x).toLowerCase().includes(want));
    if (!f) return fail('No such note: ' + a.note + '. Try brain_search.');
    const t = fs.readFileSync(f, 'utf8').replace(/^﻿/, ''), off = Math.max(0, a.offset | 0), part = t.slice(off, off + 30000);
    return text({ note: rel(f), chars: t.length, offset: off, next_offset: off + part.length < t.length ? off + part.length : null, text: part });
  },
};

const send = o => process.stdout.write(JSON.stringify(o) + '\n');
readline.createInterface({ input: process.stdin }).on('line', async line => {
  let m; try { m = JSON.parse(line); } catch { return; }
  const { id, method, params } = m;
  try {
    if (method === 'initialize') return send({ jsonrpc: '2.0', id, result: { protocolVersion: params?.protocolVersion || '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'brain-reader', version: '1.0.0' } } });
    if (method === 'tools/list') return send({ jsonrpc: '2.0', id, result: { tools: TOOLS } });
    if (method === 'tools/call') {
      const h = HANDLERS[params?.name]; if (!h) return send({ jsonrpc: '2.0', id, result: fail('Unknown tool ' + params?.name) });
      try { return send({ jsonrpc: '2.0', id, result: await h(params.arguments || {}) }); } catch (e) { return send({ jsonrpc: '2.0', id, result: fail(String(e.message || e)) }); }
    }
    if (id !== undefined) send({ jsonrpc: '2.0', id, result: {} });
  } catch (e) { if (id !== undefined) send({ jsonrpc: '2.0', id, error: { code: -32603, message: String(e.message || e) } }); }
});
