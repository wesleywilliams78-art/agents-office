// The office desks' way to open a Brain note in full. Read only, served over MCP (stdio).
// Why it exists: a desk is handed only the few notes that best match its task, each cut to about 1,800 characters (a pinned note to 9,000), and has no
// file tools. A long note (the content calendar, a build note) arrived cut off, so a desk could say "I could not open it". With these two tools it can
// find any note and read it whole. It can only read Markdown notes inside the Brain; it cannot write, move or delete anything.
//   brain_search  find notes by words in their name or text
//   brain_read    read one note in full, in parts of 30,000 characters (next_offset to read on)
//   brain_audit   the whole Brain scanned for broken links, orphans, oversize, stubs and duplicates (for Brian, the IP Librarian)
//   skill_audit   the office's skill audit, read from the running office (for Brian's Friday skills review, 8 Nov 2026)
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { loadConfig } from '../../config.mjs';

const BRAIN = (() => { try { return loadConfig().brainPath; } catch { return ''; } })();
const PORT = (() => { try { return loadConfig().port; } catch { return 4520; } })();
const text = o => ({ content: [{ type: 'text', text: typeof o === 'string' ? o : JSON.stringify(o, null, 1) }] });
const fail = m => ({ content: [{ type: 'text', text: m }], isError: true });
const files = () => { const out = []; (function walk(d, depth) { let es; try { es = fs.readdirSync(d, { withFileTypes: true }); } catch { return; } for (const e of es) { if (e.name.startsWith('.') || e.name === 'node_modules') continue; const p = path.join(d, e.name); if (e.isDirectory()) { if (depth < 4) walk(p, depth + 1); } else if (e.name.endsWith('.md')) out.push(p); } })(BRAIN, 0); return out; };
const nameOf = f => path.basename(f, '.md');
const rel = f => path.relative(BRAIN, f).replace(/\\/g, '/').replace(/\.md$/i, '');

const TOOLS = [
  { name: 'brain_search', description: 'Find notes in Wesley\'s Brain by words in their name or text (read only). Returns the best matches with their size. Use it when a note you were told about is not in front of you or was cut off, then open it with brain_read. Uploaded documents are notes named "Upload - something"; the office\'s own task notes are under "Agents Office".', inputSchema: { type: 'object', required: ['query'], properties: { query: { type: 'string' } } } },
  { name: 'brain_audit', description: 'Scan the whole Brain for housekeeping problems (read only; the office\'s own "Agents Office" folder is left out). Returns: broken [[links]] (note, link, line), orphans (no links in or out), notes over the size cap, empty or stub notes, notes with the same or nearly the same name, and pairs of notes whose text largely overlaps. It cannot judge stale or contradictory facts or misfiled notes: read the notes for those.', inputSchema: { type: 'object', properties: { cap: { type: 'integer', description: 'size cap in characters, default 20000 (the most one Brain update can rewrite)' }, stub: { type: 'integer', description: 'a note with less text than this is a stub, default 200' } } } },
  { name: 'skill_audit', description: "The office's skill audit (read only): every skill with how often it was used, how often its work was sent back, the corrections its desks were given, connectors it names that are not wired or never used, the audit's own notes, whether it lives in the Brain (only those can be changed), any suggestion already waiting, and the suggestions Wesley said no to (never suggest those again). Read a skill's files with brain_read (\"Agents Office/skills/<name>/SKILL\") and a desk's corrections with brain_read (\"Agents Office/feedback/<desk id>\").", inputSchema: { type: 'object', properties: { skill: { type: 'string', description: 'one skill name; leave out for all' } } } },
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
  async skill_audit(a) {
    let r; try { r = await fetch(`http://localhost:${PORT}/api/skill-audit`, { signal: AbortSignal.timeout(20000) }); } catch (e) { return fail('The office is not answering on port ' + PORT + ': ' + e.message); }
    if (!r.ok) return fail('The office answered ' + r.status);
    const d = await r.json(), want = String(a.skill || '').trim().toLowerCase();
    const list = d.skills.filter(x => !want || x.name === want).map(x => ({ name: x.name, where: x.source === 'brain' ? 'Brain (Agents Office/skills/' + x.name + ')' : 'shipped, cannot be changed this way', desks: x.house ? 'every desk' : x.seats.map(s => s.id), state: x.state, uses: x.uses, reworked: x.reworked, chars: x.chars, corrections: x.lessonCount, notes: x.recs.filter(r => r.level !== 'ok').map(r => r.text), links: x.links.filter(l => !l.proven).map(l => l.name + ': ' + (l.notes.join('; ') || 'wired, never used')), waiting: (x.proposal?.pending || []).map(p => p.ask), saidNo: (x.declined || []).map(n => n.ask) }));
    if (want && !list.length) return fail('No skill called ' + a.skill);
    return text({ summary: d.summary, skills: list });
  },
  brain_audit(a) { // the mechanical half of Brian's weekly audit (brain-audit skill, 8 Nov 2026); judging facts and filing stays with the desk
    if (!BRAIN) return fail('The Brain folder is not configured.');
    const cap = a.cap > 0 ? a.cap : 20000, stubMin = a.stub > 0 ? a.stub : 200;
    const notes = files().filter(f => !/^agents office\//i.test(rel(f))).map(f => { let t = ''; try { t = fs.readFileSync(f, 'utf8').replace(/^﻿/, ''); } catch {} return { f, rel: rel(f), name: nameOf(f), t }; });
    const all = [], byName = new Map(), byRel = new Map(); // every file in the Brain, so ![[image.png]] and links into Agents Office resolve too
    (function walk(d) { let es; try { es = fs.readdirSync(d, { withFileTypes: true }); } catch { return; } for (const e of es) { if (e.name.startsWith('.') || e.name === 'node_modules') continue; const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else all.push(path.relative(BRAIN, p).replace(/\\/g, '/')); } })(BRAIN);
    for (const r of all) { const low = r.toLowerCase(), base = low.split('/').pop(); for (const k of [base, base.replace(/\.md$/, '')]) byName.set(k, r); byRel.set(low, r); byRel.set(low.replace(/\.md$/, ''), r); }
    const resolve = l => { const k = l.toLowerCase().replace(/\\/g, '/').replace(/^\.?\//, ''); return byRel.get(k) || byName.get(k) || byName.get(k.split('/').pop()) || null; };
    const body = t => t.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');
    const inbound = new Map(), outbound = new Map(), broken = [];
    for (const n of notes) {
      let fence = false; const lines = n.t.split(/\r?\n/);
      lines.forEach((line, i) => {
        if (/^\s*```/.test(line)) { fence = !fence; return; } if (fence) return;
        for (const m of line.matchAll(/!?\[\[([^\]|#^]*)(?:[#^][^\]|]*)?(?:\|[^\]]*)?\]\]/g)) {
          const target = m[1].trim(); if (!target) continue; // [[#heading]] is a link inside the same note
          const hit = resolve(target);
          if (!hit) { broken.push({ note: n.rel, link: m[0], line: i + 1 }); continue; }
          if (hit.replace(/\.md$/i, '') !== n.rel) { (outbound.get(n.rel) || outbound.set(n.rel, new Set()).get(n.rel)).add(hit); (inbound.get(hit.replace(/\.md$/i, '')) || inbound.set(hit.replace(/\.md$/i, ''), new Set()).get(hit.replace(/\.md$/i, ''))).add(n.rel); }
        }
      });
    }
    const words = t => body(t).toLowerCase().replace(/[^a-z0-9\s]+/g, ' ').split(/\s+/).filter(Boolean);
    const shingles = t => { const w = words(t), s = new Set(); for (let i = 0; i + 4 < w.length; i++) s.add(w.slice(i, i + 5).join(' ')); return s; };
    const key = s => s.toLowerCase().replace(/^upload - /, '').replace(/ - [a-z0-9]{8}$/, '').replace(/\(\d+\)|\bv\d+\b|\bcopy\b/g, '').replace(/[^a-z0-9]+/g, '');
    const sameName = [], groups = new Map();
    for (const n of notes) { const k = key(n.name); if (k) (groups.get(k) || groups.set(k, []).get(k)).push(n.rel); }
    for (const g of groups.values()) if (g.length > 1) sameName.push(g);
    const sh = notes.map(n => ({ rel: n.rel, s: n.t.length > 300 ? shingles(n.t) : new Set() })), overlap = [];
    for (let i = 0; i < sh.length; i++) for (let j = i + 1; j < sh.length; j++) {
      const A = sh[i].s, B = sh[j].s; if (!A.size || !B.size) continue;
      let c = 0; for (const x of (A.size < B.size ? A : B)) if ((A.size < B.size ? B : A).has(x)) c++;
      const share = c / Math.min(A.size, B.size); if (share >= 0.5) overlap.push({ a: sh[i].rel, b: sh[j].rel, shared: Math.round(share * 100) + '% of the smaller note' });
    }
    return text({
      scanned: notes.length, cap, stub_under: stubMin,
      broken_links: broken,
      orphans: notes.filter(n => !inbound.has(n.rel) && !outbound.has(n.rel)).map(n => n.rel),
      over_cap: notes.filter(n => n.t.length > cap).map(n => ({ note: n.rel, chars: n.t.length })),
      stubs: notes.filter(n => body(n.t).replace(/^#.*$/gm, '').replace(/\s+/g, ' ').trim().length < stubMin).map(n => ({ note: n.rel, chars: body(n.t).trim().length })),
      same_name: sameName,
      overlapping_text: overlap.sort((x, y) => parseInt(y.shared) - parseInt(x.shared)).slice(0, 30),
    });
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
