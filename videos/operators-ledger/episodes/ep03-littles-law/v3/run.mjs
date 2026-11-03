// Episode 03, v3: render through the Motion Studio engine with Wesley's approved narration (ep03v2).
//   node run.mjs <stills|draft|final> [seconds...]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url)), MS = path.resolve(HERE, '..', '..', '..', '..', '..', 'connectors', 'motion-studio');
const { writeProject, projectDir, OUT } = await import(pathToFileURL(path.join(MS, 'shared.mjs')).href);
const { render } = await import(pathToFileURL(path.join(MS, 'engine.mjs')).href);
const [mode = 'stills', ...at] = process.argv.slice(2), id = 'ledger03v3' + mode;
writeProject(id, fs.readFileSync(path.join(HERE, 'index.html'), 'utf8'), { narration: 'ep03v2' });
const r = await render({ dir: projectDir(id), out: path.join(OUT, id), mode, at: at.map(Number), series: 'ledger-fresh', narration: 'ep03v2', onStep: s => console.log('·', s) });
console.log(JSON.stringify({ file: r.file, errors: r.errors, warnings: r.warnings, checks: r.checks, dead: r.dead, offBeatCuts: r.offBeatCuts, hardColourCuts: r.hardColourCuts, sheets: r.sheets, stills: r.stills, seconds: r.seconds }, null, 1));
