// Render one side reel of a country row with the Motion Studio engine.
// node side-run.mjs <frames folder> <first shot dir> <second shot dir> <name> <stills|draft|final> [extra seconds...]
// The frames folder holds one graded 1080×1920 JPEG sequence per shot (f_0001.jpg …, 30 fps), made with ffmpeg as BRIEF.md says.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url)), MS = path.resolve(HERE, '..', '..');
const { writeProject, projectDir, OUT } = await import(pathToFileURL(path.join(MS, 'shared.mjs')).href);
const { render } = await import(pathToFileURL(path.join(MS, 'engine.mjs')).href);
const [frames, a, b, name = 'country-side', mode = 'stills', ...at] = process.argv.slice(2);
if (!frames || !a || !b) { console.log('usage: node side-run.mjs <frames folder> <first shot dir> <second shot dir> <name> <stills|draft|final>'); process.exit(1); }
const count = d => fs.readdirSync(path.join(frames, d)).filter(f => f.endsWith('.jpg')).length;
const reel = { root: pathToFileURL(path.resolve(frames)).href, a, b, na: count(a), nb: count(b) };
const html = fs.readFileSync(path.join(HERE, 'side-template.html'), 'utf8').replace('__REEL__', JSON.stringify(reel));
const id = (name + mode).replace(/[^a-z0-9]/gi, '').toLowerCase();
writeProject(id, html);
const r = await render({ dir: projectDir(id), out: path.join(OUT, id), mode, at: at.map(Number), series: 'country-row', onStep: s => console.log('·', s) });
console.log(JSON.stringify({ file: r.file, errors: r.errors, warnings: r.warnings, checks: r.checks, dead: r.dead, hardColourCuts: r.hardColourCuts, sheets: r.sheets, seconds: r.seconds }, null, 1));
