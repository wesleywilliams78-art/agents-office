// Episode 04 v2: Wesley's cloned voice (VoiceStudio, VoxCPM2) through the Motion Studio narrate(), series ledger-fresh.
import { pathToFileURL } from 'node:url'; import path from 'node:path'; import fs from 'node:fs';
// Tighter breath between sentences (0.2 s, series default 0.42) to keep the run time under 90 s: pauses tightened, no words cut.
const rf = fs.readFileSync; fs.readFileSync = (f, ...a) => { const r = rf(f, ...a); return /ledger-fresh[\/]series\.json$/.test(String(f)) ? r.replace('"pause": 0.42', '"pause": 0.2') : r; };
const MS = path.resolve(import.meta.dirname, '..', '..', '..', '..', '..', 'connectors', 'motion-studio');
const { narrate } = await import(pathToFileURL(path.join(MS, 'voice.mjs')).href);
const lines = [
 ['s1', "Same menu. Same brand. One site is packed at seven A M. The other on Saturday. Who is each one for?"],
 ['s2', "Site one is at a station: twenty thousand pounds a week. Site ten, a residential street: thirteen thousand. Both sell to everyone."],
 ['s3', "It's called S, T, P. Segmentation first: split people by who they are and when they come. Wendell Smith set that out in nineteen fifty-six. At the station, seven A M commuters bring eleven thousand pounds. On site ten's street, Saturday brunch brings five thousand seven hundred and twenty."],
 ['s4', "Targeting: pick the segment you serve better than anyone nearby. Commuters are fifty-five percent of site one's week. Brunch is forty-four percent of site ten's. Each is its biggest single group."],
 ['s5', "Positioning: the one promise that group hears. The commuter wants speed: served before the train. The brunch table wants time: nobody hurries you. Same menu, different promise."],
 ['s6', "So here's the call. Site one is for the seven A M commuter. Site ten is for the Saturday brunch table."],
 ['s7', "Every site is for someone. Say who. Your question for Monday: which customers bring each site the most sales?"],
 ['s8', "This is the Operator's Ledger."],
].map(([id, text]) => ({ id, text }));
const r = await narrate({ id: 'ep04v2', lines, source: 'clone', series: 'ledger-fresh', onStep: s => console.log('·', s) });
console.log(JSON.stringify(r, null, 1));
