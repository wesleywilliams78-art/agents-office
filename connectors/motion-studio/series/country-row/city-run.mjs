// Render one city-compare side reel of a country row with the Motion Studio engine.
// PAIR="A or B?|C or D?" node city-run.mjs <frames folder> "<Place A>" "<Place B>" <A1> <A2> <B1> <B2> <name> <stills|draft|final> [extra seconds...]
// The frames folder holds one graded 1080×1920 JPEG sequence per shot (f_0001.jpg …, 30 fps, 5 s each), made with ffmpeg as BRIEF.md says.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url)), MS = path.resolve(HERE, '..', '..');
const { writeProject, projectDir, OUT } = await import(pathToFileURL(path.join(MS, 'shared.mjs')).href);
const { render } = await import(pathToFileURL(path.join(MS, 'engine.mjs')).href);
const [frames, a, b, s1, s2, s3, s4, name = 'country-city', mode = 'stills', ...at] = process.argv.slice(2);
if (!frames || !a || !b || !s4) { console.log('usage: node city-run.mjs <frames folder> "<Place A>" "<Place B>" <A1> <A2> <B1> <B2> <name> <stills|draft|final>'); process.exit(1); }
const count = d => fs.readdirSync(path.join(frames, d)).filter(f => f.endsWith('.jpg')).length;
const pair = process.env.PAIR ? process.env.PAIR.split('|') : undefined;   // both captions of the row, so the two reels share one size
const reel = { root: pathToFileURL(path.resolve(frames)).href, a, b, pair, shots: [s1, s2, s3, s4].map(dir => ({ dir, n: count(dir) })) };
const html = fs.readFileSync(path.join(HERE, 'city-template.html'), 'utf8').replace('__REEL__', JSON.stringify(reel));
const id = (name + mode).replace(/[^a-z0-9]/gi, '').toLowerCase();
writeProject(id, html);
const r = await render({ dir: projectDir(id), out: path.join(OUT, id), mode, at: at.map(Number), series: 'country-row', onStep: s => console.log('·', s) });
console.log(JSON.stringify({ file: r.file, errors: r.errors, warnings: r.warnings, checks: r.checks, dead: r.dead, offBeatCuts: r.offBeatCuts, hardColourCuts: r.hardColourCuts, sheets: r.sheets, seconds: r.seconds }, null, 1));
