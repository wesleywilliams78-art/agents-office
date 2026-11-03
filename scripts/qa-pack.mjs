// Builds the Brain note a QA desk reads to fact-check one Franchise Entry Report issue: every claim with its source numbers,
// the numbered source list, and every URL found in the issue's research files. Usage: node scripts/qa-pack.mjs <issue folder> <brain note name>
import fs from 'node:fs';
import path from 'node:path';
import { loadConfig } from '../config.mjs';

const dir = path.resolve(process.argv[2] || ''), name = process.argv[3];
if (!fs.existsSync(path.join(dir, 'issue.json')) || !name) { console.error('usage: node scripts/qa-pack.mjs <issue folder> <note name>'); process.exit(1); }
const j = JSON.parse(fs.readFileSync(path.join(dir, 'issue.json'), 'utf8').replace(/^﻿/, ''));
const SECTIONS = { cover: 'COVER', market: 'PAGE 2 MARKET', rising: 'PAGE 3 WHAT IS RISING AND FALLING', white: 'PAGE 4 WHITE SPACE', regulation: 'PAGE 5 REGULATION AND COST', route: 'PAGE 6 ROUTES AND RISKS', days: 'PAGE 7 NEXT 30 DAYS' };

const lines = [], walk = (v, p, out) => {
  if (typeof v === 'string') { if (v.length > 12 && (/\d/.test(v) || /\bS\d+/.test(v)) && !/^#?[0-9a-f]{6}$/i.test(v)) out.push(`- ${p}: ${v}`); }
  else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${p}[${i}]`, out));
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) { if (k === 'sources') continue; walk(x, p ? `${p}.${k}` : k, out); }
};
const body = [];
for (const [k, title] of Object.entries(SECTIONS)) { const out = []; walk(j[k], k, out); body.push(`## ${title}\n${out.join('\n')}`); }
const sources = (j.days?.sources || []).map((s, i) => `- S${i + 1}: ${s}`).join('\n');

const urls = new Map();
const rd = path.join(dir, 'research');
if (fs.existsSync(rd)) for (const f of fs.readdirSync(rd)) for (const line of fs.readFileSync(path.join(rd, f), 'utf8').split('\n')) for (const m of line.matchAll(/https?:\/\/[^\s)\]>"'|]+/g)) { const u = m[0].replace(/[.,;]+$/, ''); if (!urls.has(u)) urls.set(u, line.replace(/https?:\/\/\S+/g, '').replace(/[|*#]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 110)); }
const known = [...urls].map(([u, c]) => `- ${u}${c ? '  (' + c + ')' : ''}`).join('\n');

const note = `# QA pack: Franchise Entry Report Issue ${j.issue}, ${j.country}\n\nFor the QA desk. Issue date ${j.dateLong}; research accessed ${j.accessed}. Every claim below is from the finished report; the source numbers (S1...) refer to the source list.\n\n# CLAIMS\n\n${body.join('\n\n')}\n\n# SOURCES (as numbered in the report)\n\n${sources}\n\n# KNOWN URLS from the research files\n\nThese are the pages the researchers opened. Use them first; the report's source list names datasets without addresses.\n\n${known}\n`;
const brain = loadConfig().brainPath, out = path.join(brain, '40-Marketing', name + '.md');
fs.writeFileSync(out, note);
console.log(out, note.length, 'chars,', urls.size, 'urls');
