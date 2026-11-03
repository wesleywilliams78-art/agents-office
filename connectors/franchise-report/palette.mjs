// The Franchise Entry Report's colours, in one place. build2.mjs (the A4 PDF) and the video studio (the carousel, the recap cards) both read
// them from here, so a country's slides are the report's own colours and never a hex someone typed from memory.
//   colour   the issue's country colour (issue.json "colour"): the cover field, closing band, figures
//   accent   the country's SECOND flag colour in three shades { front, mid, back }: the cover rules and mountains. Null where that colour
//            is white (Denmark, Finland, Kenya) and the report draws them white.
// A country's accent is set per issue with "accent" in issue.json, otherwise from this table.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const ISSUES = path.join(ROOT, 'videos', 'franchise-entry-report', 'issues');
export const ACCENTS = {
  norway: { front: '#00205B', mid: '#2F6FD0', back: '#9CC7F5' },
  sweden: { front: '#FECC02', mid: '#D9A600', back: '#FFE88A' },
  portugal: { front: '#046A38', mid: '#2E8B57', back: '#9FD3AE' },
};
export const accentFor = d => d?.accent || ACCENTS[String(d?.country || '').toLowerCase()] || null;

/** Find an issue's issue.json from "2", "02", "02-sweden" or "sweden". Returns { ref, colour, accent, country, issue } or { error }. */
export function reportPalette(ref) {
  const key = String(ref ?? '').trim().toLowerCase(); if (!key) return { error: 'report: give the issue, for example "02-sweden"' };
  let dirs = []; try { dirs = fs.readdirSync(ISSUES).filter(f => fs.existsSync(path.join(ISSUES, f, 'issue.json'))); } catch {}
  const num = /^\d+$/.test(key) ? key.padStart(2, '0') : null;
  const hit = dirs.find(f => f.toLowerCase() === key) || (num && dirs.find(f => f.startsWith(num + '-'))) || dirs.find(f => f.toLowerCase().endsWith('-' + key));
  if (!hit) return { error: `report: no issue "${ref}" with an issue.json (have: ${dirs.join(', ') || 'none'})` };
  let d; try { d = JSON.parse(fs.readFileSync(path.join(ISSUES, hit, 'issue.json'), 'utf8')); } catch (e) { return { error: `report: ${hit}/issue.json does not parse (${e.message})` }; }
  if (!/^#[0-9a-f]{6}$/i.test(d.colour || '')) return { error: `report: ${hit}/issue.json has no valid "colour"` };
  return { ref: hit, colour: d.colour, accent: accentFor(d), country: d.country, issue: d.issue };
}
