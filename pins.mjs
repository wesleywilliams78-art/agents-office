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
