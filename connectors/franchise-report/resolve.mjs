// Turns an issue file written with named source tokens ({{key}}) into the final issue.json: sources are numbered S1, S2, ... in the order
// they are first cited, every token must have a definition, and a defined source that is never cited is reported (and left out).
//   node connectors/franchise-report/resolve.mjs <issue.src.json> <issue.json>
import fs from 'node:fs';
const [inFile, outFile] = process.argv.slice(2);
const raw = fs.readFileSync(inFile, 'utf8').replace(/^﻿/, '');
const defs = JSON.parse(raw).sourceDefs, cut = raw.indexOf('"sourceDefs"');
const body = raw.slice(0, cut), order = [], idx = {};
for (const m of body.matchAll(/\{\{([A-Za-z0-9_]+)\}\}/g)) { const k = m[1]; if (!(k in defs)) { console.error('undefined source key:', k); process.exit(1); } if (!(k in idx)) { order.push(k); idx[k] = order.length; } }
const lowerDefs = Object.fromEntries(Object.keys(defs).map(k => [k.toLowerCase(), k]));
let resolved = raw.replace(/(S?)\{\{([A-Za-z0-9_]+)\}\}/g, (all, s, k) => (s ? s : 'S') + (idx[k] ?? '?'));
resolved = resolved.slice(0, resolved.indexOf('"sourceDefs"')).replace(/,\s*$/, '') + '\n}';
const out = JSON.parse(resolved);
out.days.sources = order.map(k => defs[k]);
const unused = Object.keys(defs).filter(k => !(k in idx));
fs.writeFileSync(outFile, JSON.stringify(out, null, 2));
console.log(JSON.stringify({ sources: order.length, unusedDefinitions: unused, wrote: outFile }));
