// Builds the gaps and questions list (always) and the cover note (when pack.js has a cover). usage: node build_pack.js [outdir]
const fs = require('fs');
const path = require('path');
const { Document, Packer } = require('docx');
const L = require('./qlib.js');
const GAPS = require('./gaps.js');
const PACK = require('./pack.js');
const { number } = require('./numbering.js');
const { W } = L;

const { map, uses, open, sops } = number();
L.setGapNumbers(map);
const out = process.argv[2] || 'out';
fs.mkdirSync(out, { recursive: true });
const shortNo = (no) => no.replace(/^.*-/, '');
const keys = open.sort((a, b) => map[a].localeCompare(map[b]));

// ---------- gaps and questions: only OPEN gaps, grouped by topic in register order ----------
const COLS = ['Ref', 'Question for Qamaria', 'SOPs', 'Notes', 'Qamaria answer'], WID = [640, 3450, 760, 2700, W - 7550];
const topics = [...new Set(Object.values(GAPS).map(g => g.topic))];
const groupBlocks = [];
for (const t of topics) {
  const ks = keys.filter(k => GAPS[k].topic === t);
  if (!ks.length) continue;
  const rows = ks.map(k => [map[k], GAPS[k].q, [...uses[k]].map(shortNo).join(', '), GAPS[k].note || '', '']);
  groupBlocks.push(L.head('', `${t}  (${ks.length})`), L.table(COLS, WID, rows, { size: 17 }), L.gap(200));
}
const docs = [];
const gapsDoc = new Document({ ...L.docBase(`${PACK.setName}: gaps and questions`),
  sections: [{ properties: { titlePage: true, page: L.PAGE },
    headers: { first: L.mkHeader('bg_first.png'), default: L.mkHeader('bg_inner.png') },
    footers: { first: L.mkFooter(`${PACK.setName}  |  Gaps and questions`), default: L.mkFooter(`${PACK.setName}  |  Gaps and questions`) },
    children: [
      ...L.titleBlock(['SOP set: gaps', 'and questions'], `${PACK.range}  |  ${keys.length} OPEN GAPS  |  ${PACK.date.toUpperCase()}`),
      L.callout([['How to use', 'Every blank in the SOPs reads [NEEDS QAMARIA Gnn: …]. Answer each question in the last column. One answer fills every SOP that uses that number. Search a SOP for “NEEDS QAMARIA” to find its blanks.'],
        ['Notes column', 'Explains why the answer matters, or gives a common default for you to confirm or change. Nothing in it has been put into the SOPs.']]),
      L.head('', `Section A: blanks in the SOPs (${keys.length}), by topic`),
      ...groupBlocks,
      ...(PACK.assumptions && PACK.assumptions.length ? L.section('', 'Section B: assumptions to confirm', [L.table(COLS, WID, PACK.assumptions, { size: 17 })], { after: 0 }) : []),
    ] }] });
docs.push([gapsDoc, `${PACK.filePrefix} Gaps and Questions ${PACK.fileVersion}.docx`]);

// ---------- cover note ----------
if (PACK.cover) {
  const cv = PACK.cover;
  const coverDoc = new Document({ ...L.docBase(`${PACK.setName}: cover note`),
    sections: [{ properties: { titlePage: true, page: L.PAGE },
      headers: { first: L.mkHeader('bg_first.png'), default: L.mkHeader('bg_inner.png') },
      footers: { first: L.mkFooter(`${PACK.setName}  |  Cover note`), default: L.mkFooter(`${PACK.setName}  |  Cover note`) },
      children: [
        ...L.titleBlock(['SOP set:', 'cover note'], cv.subtitle),
        L.grid([...cv.meta, ['Gaps to fill', `${keys.length} blanks, ${(PACK.assumptions || []).length} assumptions`]], 3),
        L.gap(360),
        ...L.section('1', 'What is in the pack', [
          L.table(['SOP', 'Title', 'Checklist page'], [1700, 4200, W - 5900], sops.map(({ c }) => [c.no, c.shortTitle, c.checklist.title.join(' ')]), {}),
          L.P(cv.packNote, { before: 160, after: 0 })]),
        ...L.section('2', 'How the blanks work', [L.P(`Nothing has been made up. Where a fact was not supplied, the SOP shows a highlighted blank such as ${L.gapText(cv.exampleGap)}. There are ${keys.length} open blanks. The gaps and questions list asks one question per number. Once it is answered, the SOPs can be finalised in one pass.`, { after: 0 })]),
        ...cv.sections.map(([title, bullets], i) => L.section(String(i + 3), title, bullets.map(L.bullet), { after: i === cv.sections.length - 1 ? 0 : 380 })).flat(),
      ] }] });
  docs.push([coverDoc, `${PACK.filePrefix} Cover Note ${PACK.fileVersion}.docx`]);
}
Promise.all(docs.map(([d, f]) => Packer.toBuffer(d).then(b => { fs.writeFileSync(path.join(out, f), b); console.log('written', path.join(out, f)); })));
