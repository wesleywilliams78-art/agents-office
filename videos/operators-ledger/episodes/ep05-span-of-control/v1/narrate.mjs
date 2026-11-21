// Episode 05 v1: Wesley's cloned voice (VoiceStudio) through the Motion Studio narrate(), series ledger-fresh. Same route as Ep 04 (ep04v2).
import { pathToFileURL } from 'node:url'; import path from 'node:path'; import fs from 'node:fs';
// Same tighter breath as Ep 04 (0.2 s, series default 0.42): applied to this run only, in memory; series.json is not edited.
const rf = fs.readFileSync; fs.readFileSync = (f, ...a) => { const r = rf(f, ...a); return /ledger-fresh[\/]series\.json$/.test(String(f)) ? r.replace('"pause": 0.42', '"pause": 0.2') : r; };
const MS = path.resolve(import.meta.dirname, '..', '..', '..', '..', '..', 'connectors', 'motion-studio');
const { narrate } = await import(pathToFileURL(path.join(MS, 'voice.mjs')).href);
const lines = [
 ['s1', "One operations manager. Six sites, and the week holds. Eleven sites, and it doesn't. Where is the line?"],
 ['s2', "Cross it, and the site nobody visits slips first. You find out from the P and L."],
 ['s3', "It's called span of control: how many sites one manager can really run. There is no magic number. There is a week."],
 ['s4', "Start with the hours. Forty-five in a week. Twelve go on reports and meetings. That leaves thirty-three."],
 ['s5', "Each site costs about four hours: three on site, one on the road. Six sites is twenty-four hours. Nine spare. Eleven sites is forty-four. Eleven short."],
 ['s6', "Now one site goes wrong. It eats eight hours. Six sites absorb that, with one to spare. Eleven can't: five sites go unvisited that week."],
 ['s7', "So the limit isn't a number of sites. It's the hours left after the trouble. One site in trouble: six is the limit. Two: four. Cut each visit to three hours, and eight."],
 ['s8', "Hire the second area manager at site seven. Your question for Monday: how many hours a week does each site really cost your ops manager?"],
 ['s9', "This is the Operator's Ledger."],
].map(([id, text]) => ({ id, text }));
const r = await narrate({ id: 'ep05v1', lines, source: 'clone', series: 'ledger-fresh', onStep: s => console.log('·', s) });
console.log(JSON.stringify(r, null, 1));
