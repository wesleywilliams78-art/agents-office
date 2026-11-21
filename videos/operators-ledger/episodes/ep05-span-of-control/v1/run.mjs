// Episode 05 (Span of control), v1: render through the Motion Studio engine with Wesley's cloned-voice narration (ep05v1).
//   node run.mjs <stills|draft|final> [seconds...]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url)), MS = path.resolve(HERE, '..', '..', '..', '..', '..', 'connectors', 'motion-studio');
const { writeProject, projectDir, OUT } = await import(pathToFileURL(path.join(MS, 'shared.mjs')).href);
const { render } = await import(pathToFileURL(path.join(MS, 'engine.mjs')).href);
const [mode = 'stills', ...at] = process.argv.slice(2), id = 'ledger05v1' + mode;
writeProject(id, fs.readFileSync(path.join(HERE, 'index.html'), 'utf8'), { narration: 'ep05v1' });
const r = await render({ dir: projectDir(id), out: path.join(OUT, id), mode, at: at.map(Number), series: 'ledger-fresh', narration: 'ep05v1', onStep: s => console.log('·', s) });
console.log(JSON.stringify({ file: r.file, errors: r.errors, warnings: r.warnings, checks: r.checks, dead: r.dead, offBeatCuts: r.offBeatCuts, hardColourCuts: r.hardColourCuts, sheets: r.sheets, stills: r.stills, seconds: r.seconds }, null, 1));
