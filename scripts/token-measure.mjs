// Read-only. Measures token use from this project's Claude Code session transcripts.
// Usage: node scripts/token-measure.mjs [projectDir]
// Prints, per session: requests, largest context, fresh input, cache write, cache read, output,
// and the first request's preload. Compare with docs/token-baseline.md.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';

const cwd = process.argv[2] || process.cwd();
const dir = path.join(os.homedir(), '.claude', 'projects', path.resolve(cwd).replace(/[^a-zA-Z0-9]/g, '-'));
if (!fs.existsSync(dir)) { console.error('No transcripts at ' + dir); process.exit(1); }

const fmt = n => n.toLocaleString('en-GB');

async function measure(file) {
  const byId = new Map();
  let first = null;
  const rl = readline.createInterface({ input: fs.createReadStream(file), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line.includes('"usage"')) continue;
    let o; try { o = JSON.parse(line); } catch { continue; }
    const m = o.message;
    if (o.type !== 'assistant' || !m || !m.usage) continue;
    const u = m.usage;
    const rec = {
      fresh: u.input_tokens || 0,
      write: u.cache_creation_input_tokens || 0,
      read: u.cache_read_input_tokens || 0,
      out: u.output_tokens || 0,
    };
    if (!first) first = rec;
    byId.set(m.id || String(byId.size), rec);
  }
  let t = { n: 0, ctx: 0, fresh: 0, write: 0, read: 0, out: 0 };
  for (const r of byId.values()) {
    t.n++; t.fresh += r.fresh; t.write += r.write; t.read += r.read; t.out += r.out;
    t.ctx = Math.max(t.ctx, r.fresh + r.write + r.read);
  }
  t.preload = first ? first.fresh + first.write + first.read : 0;
  return t;
}

const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsonl'))
  .map(f => ({ f, mtime: fs.statSync(path.join(dir, f)).mtimeMs }))
  .sort((a, b) => b.mtime - a.mtime);

console.log('| session | requests | preload | largest context | fresh input | cache write | cache read | output |');
console.log('|---|---|---|---|---|---|---|---|');
for (const { f } of files) {
  const t = await measure(path.join(dir, f));
  if (!t.n) continue;
  console.log(`| ${f.slice(0, 8)} | ${fmt(t.n)} | ${fmt(t.preload)} | ${fmt(t.ctx)} | ${fmt(t.fresh)} | ${fmt(t.write)} | ${fmt(t.read)} | ${fmt(t.out)} |`);
}
