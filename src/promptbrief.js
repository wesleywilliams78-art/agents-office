// The Prompt Engineer's brief in the page (4 Nov 2026): apply Wesley's yes/no answers to the brief, and write it out as the message for
// the Chief of Staff. Pure functions, no model call: a YES puts that proposal's fields into the brief, a NO leaves the brief as it was.
export const FIELDS = [['outcome', 'Outcome'], ['inputs', 'Inputs'], ['deliverable', 'Deliverable'], ['acceptance', 'Acceptance checks'], ['constraints', 'Constraints'], ['authority', 'Authority'], ['deadline', 'Deadline'], ['assumptions', 'Assumptions']];

/** answers: one of true (yes), false (no) or undefined (not answered yet) per proposal. */
export function applyAnswers(result, answers = []) {
  const brief = { ...(result.brief || {}) }; let readback = result.readback || '';
  (result.proposals || []).forEach((p, i) => {
    if (answers[i] !== true) return;
    for (const [k, v] of Object.entries(p.apply || {})) if (FIELDS.some(([f]) => f === k)) brief[k] = v;
    if (p.readback) readback = p.readback;
  });
  return { brief, readback };
}

const asText = v => Array.isArray(v) ? v.filter(Boolean).map(x => `- ${x}`).join('\n') : String(v || '').trim();

/** The message the Chief of Staff gets: the brief as approved, then Wesley's own words for reference. */
export function briefText(request, result, answers) {
  const { brief, readback } = applyAnswers(result, answers);
  const decided = (result.proposals || []).map((p, i) => `- ${answers[i] ? 'YES' : 'NO'}: ${p.fix}`).join('\n');
  const body = FIELDS.map(([k, label]) => { const t = asText(brief[k]); return t && t.toLowerCase() !== 'none' ? `${label}:\n${t}` : ''; }).filter(Boolean).join('\n\n');
  return `BRIEF (approved by Wesley through the prompt engineer${result.department_hint && result.department_hint !== 'unclear' ? `; suggested department: ${result.department_hint}` : ''})\n\n${body}\n\nRead-back: ${readback}${decided ? `\n\nHis decisions:\n${decided}` : ''}\n\nHis own words: ${String(request).trim().slice(0, 2500)}`;
}
