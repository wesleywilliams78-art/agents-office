// Builds Qamaria point-of-work SOPs from sops/sopNN.js. usage: node build_sop.js [NN|all] [outdir]
const fs = require('fs');
const path = require('path');
const { Document, Packer } = require('docx');
const L = require('./qlib.js');
const { number } = require('./numbering.js');
const { C, W } = L;
const DEF = { version: '1.0 (draft)', status: 'Draft: awaiting Qamaria inputs' };

function build(c) {
  const version = c.version || DEF.version;
  let n = 0;
  const steps = c.steps.map(s => (s.phase ? s : [String(++n), s[0], s[1] || '']));
  const ck = c.checklist;

  const sopPages = [
    // PAGE 1: identity, purpose and scope, when, what you need
    ...L.titleBlock(c.title, `STANDARD OPERATING PROCEDURE  |  ${c.no}`),
    L.grid([['SOP number', c.no], ['Version', version], ['Status', c.status || DEF.status],
      ['Owner', c.owner || '{{owner}}'], ['Issued', c.issued], ['Review by', c.review]], 3),
    L.gap(320),
    L.callout([['Purpose', c.purpose], ['Scope', c.scope]]),
    L.gap(360),
    ...L.section('1', 'When and how often', [L.grid(c.when, c.when.length > 4 ? 3 : 2)]),
    ...L.section('2', 'What you need', [L.table(['Equipment', 'Products and chemicals', 'PPE'], [3700, 3500, W - 7200], [[c.need.equipment, c.need.products, c.need.ppe]], { boldFirst: false })]),
    // PAGE 2: steps always start a new page; they may run on, but only break between phases (A, B, C...)
    L.head('3', 'Steps: in the order you do them', true),
    L.table(['#', 'Do this', 'Key point'], [520, 5200, W - 5720], steps, { numFirst: true, pad: c.stepPad || 60, keepBlocks: true }),
    L.gap(360),
    // Then each section as an unbreakable block (moves whole to the next page if it does not fit)
    ...L.section('4', 'Done properly means', c.standard.map(L.bullet)),
    ...L.section('5', 'If something is wrong', [L.table(['Problem', 'What to do', 'Tell'], [2350, 5150, W - 7500], c.problems),
      L.P('Phone numbers: {{contacts}}.', { before: 120, after: 0 })]),
    ...L.section('6', 'Safety and hygiene', c.safety.map(L.bullet)),
    ...L.section('7', 'Sign-off', [L.P(c.signoff, { after: 0 })]),
    ...L.section('8', 'Related SOPs', [L.P(c.related.join('   ·   ') + (c.related.some(r => r.endsWith('*')) ? '      * To be written.' : ''), { after: 0 })], { after: 0 }),
  ];

  // LAST PAGE: checklist or log to print and post
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  let ckBody;
  if (ck.type === 'grid') {
    const rows = ck.rows.map(r => (r.phase ? r : [r, '', '', '', '', '', '', '']));
    rows.push({ phase: 'Sign-off' });
    (ck.signRows || ['Done by (initials)', 'Time finished', 'Checked by (initials)']).forEach(t => rows.push([t, '', '', '', '', '', '', '']));
    ckBody = [L.table(['Check', ...days], [W - 7 * 700, ...days.map(() => 700)], rows, { rowHeight: ck.rowHeight || 440, center: [1, 2, 3, 4, 5, 6, 7], size: 18, pad: 40 })];
  } else {
    const blank = Array.from({ length: ck.blankRows }, () => ck.columns.map(() => ''));
    ckBody = [L.table(ck.columns, ck.widths, blank, { rowHeight: ck.rowHeight || 440, size: 17, boldFirst: false, pad: 40 })];
  }
  const ckPage = [
    ...L.titleBlock(ck.title, `${c.no}  |  ${c.shortTitle.toUpperCase()}`, 36, true),
    L.grid(ck.headerFields || [['Site', ''], [ck.type === 'grid' ? 'Week starting' : 'Date', ''], ['Shift lead', '']], 3),
    L.gap(240),
    ...(ck.reminder ? [L.callout([[ck.reminderTag || 'Each time', ck.reminder]], C.CAMEL, { size: 19 }), L.gap(240)] : []),
    ...ckBody,
    ...(ck.after || []).flatMap(a => [L.gap(360), L.table(a.columns, a.widths, a.rows || Array.from({ length: a.blankRows }, () => a.columns.map(() => '')), { rowHeight: a.rowHeight || 400, size: 17, boldFirst: !!a.rows, pad: 40 })]),
    L.P(ck.footnote || 'Keep completed sheets as a food safety and due-diligence record.', { before: 240, size: 17, color: C.MUTED, italics: true }),
  ];

  const foot = `${c.no} ${c.shortTitle}  |  v${version}`;
  return new Document({ ...L.docBase(`${c.no} ${c.shortTitle}`),
    sections: [{ properties: { titlePage: true, page: L.PAGE },
      headers: { first: L.mkHeader('bg_first.png'), default: L.mkHeader('bg_inner.png') },
      footers: { first: L.mkFooter(foot), default: L.mkFooter(foot) },
      children: [...sopPages, ...ckPage] }] });
}

if (require.main === module) {
  const { map, sops, fresh } = number();
  if (fresh.length) console.log('NEW GAPS (write ids into gaps.js):', fresh.map(k => `${k} = ${map[k]}`).join(', '));
  L.setGapNumbers(map);
  const only = process.argv[2] || 'all', out = process.argv[3] || 'out';
  fs.mkdirSync(out, { recursive: true });
  for (const { n, c } of sops) {
    if (only !== 'all' && only !== n) continue;
    const v = (c.version || DEF.version).split(' ')[0];
    const file = path.join(out, `${c.no} ${c.fileTitle} v${v}.docx`);
    Packer.toBuffer(build(c)).then(b => { fs.writeFileSync(file, b); console.log('written', file); });
  }
}
module.exports = { build };
