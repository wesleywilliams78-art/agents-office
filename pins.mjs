// Notes an agent is told to read by name. Agents have no file tools, so a skill that says "read `20-Brand/brands.md`" only works if the
// office puts that note in front of the agent. Given the note names the vault has and some text (the task, the agent's skills), return the
// notes the text names outright, at most 6. Housekeeping names (README, SKILL, CLAUDE…) and uploads are never pinned.
const SKIP = new Set(['claude', 'skill', 'readme', 'index', 'log', 'template', 'reference', 'example']);

export function pinnedNotes(keys, isUpload, ...texts) {
  const lower = new Map([...keys].map(k => [k.toLowerCase(), k])), out = [];
  for (const m of texts.join('\n').matchAll(/(?:[\w.\- ]+\/)*([\w.\-]+)\.md\b/g)) {
    const k = lower.get(m[1].toLowerCase());
    if (k && !out.includes(k) && !SKIP.has(k.toLowerCase()) && !isUpload(k)) out.push(k);
    if (out.length >= 6) break;
  }
  return out;
}

// The notes an agent would read for a task, by name/word overlap, the department MOC always last. An upload ("Upload - …") is a whole
// transcript or report, often hundreds of thousands of characters, and the agent reads it whole (up to UPLOAD_CAP) when it is picked. So an
// upload is scored on its name and first page only, like any note, and needs two distinct words to match: common words deep inside a long
// transcript must not pull it into an unrelated task. A task that names the upload ("Read X.jpeg (just uploaded)") still gets it first.
const MIN_UPLOAD_HITS = 2;
export function pickNotes(index, dept, text, n, isUpload) {
  const words = new Set(String(text).toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 3));
  const mocName = { emails: 'MOC-Emails', sales: 'MOC-Sales', marketing: 'MOC-Marketing', ops: 'MOC-Operations', fin: 'MOC-Finance', delivery: 'MOC-Delivery' }[dept];
  const scored = [];
  for (const [name, txt] of index) {
    if (['CLAUDE', 'index', 'log'].includes(name)) continue;
    const hay = (name + ' ' + txt.slice(0, 1500)).toLowerCase();
    let s = 0, hits = 0; for (const w of words) if (hay.includes(w)) { hits++; s += name.toLowerCase().includes(w) ? 3 : 1; }
    if (isUpload(name) && hits < MIN_UPLOAD_HITS) continue;
    if (name === mocName) s += 2;
    if (s) scored.push([s, name]);
  }
  const lower = String(text).toLowerCase();
  const named = [...index.keys()].filter(isUpload).filter(nm => { const base = nm.slice(9).replace(/ - [a-z0-9]+$/, '').toLowerCase(); return base.length > 4 && lower.includes(base); });
  for (const nm of named) { const e = scored.find(x => x[1] === nm); if (e) e[0] += 1e6; else scored.push([1e6, nm]); }
  scored.sort((a, b) => b[0] - a[0]);
  const picks = scored.slice(0, Math.max(n, named.length)).map(x => x[1]);
  if (mocName && index.has(mocName) && !picks.includes(mocName)) picks.push(mocName);
  return picks;
}
