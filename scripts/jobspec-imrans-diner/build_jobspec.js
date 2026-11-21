// Store manager job specification. usage: node build_jobspec.js out.docx bg_first.png bg_inner.png
const fs = require('fs');
const { Document, Packer, Table, TableRow, WidthType } = require('docx');
const L = require('./sop_lib.js');
const { C, W } = L;

const kv = (rows) => {
  const widths = [2300, W - 2300];
  return new Table({ width: { size: W, type: WidthType.DXA }, columnWidths: widths, rows: rows.map(([k, v], i) => new TableRow({ cantSplit: true,
    children: [
      L.cell(k.toUpperCase(), widths[0], { color: C.ACCENT, bold: true, size: 17, spacing: 24, fill: i % 2 === 0 ? C.STRIPE : undefined, pad: 90 }),
      L.cell(v, widths[1], { size: 19, fill: i % 2 === 0 ? C.STRIPE : undefined, pad: 90 })] })) });
};
// numbered responsibility: first sentence bold, rest normal
const resp = (t) => {
  const i = t.indexOf('. ');
  return new (require('docx').Paragraph)({ numbering: { reference: 'n1', level: 0 }, spacing: { after: 110, line: 300 },
    children: [L.r(t.slice(0, i + 1) + ' ', { bold: true, color: C.WHITE, size: 20 }), L.r(t.slice(i + 2), { size: 20 })] });
};
const b = (t) => new (require('docx').Paragraph)({ numbering: { reference: 'bul', level: 0 }, spacing: { after: 90, line: 300 }, children: [L.r(t, { size: 20 })] });

const content = [
  ...L.titleBlock({ title: ['Job specification', 'Store manager'] }, 60, "IMRAN'S DINER | LONDON ROAD"),
  L.callout('PURPOSE', 'Run the London Road site day to day, so the owners can step off the floor.', C.ACCENT, 140),
  L.para([L.r('Draft - for internal review.', { italics: true, color: C.MUTED, size: 19 })], { spacing: { before: 100, after: 0 } }),

  L.h1('1. Role summary'),
  kv([['Role', 'Store manager. One site: London Road.'],
      ['Level', 'Store or general manager quality, from a high-volume quick-service business. Not assistant-manager level.'],
      ['Priority', 'Operations first. Marketing second.']]),

  L.h1('2. Where the role sits'),
  kv([['Reports to', 'To be confirmed. A Monday review with an owner.'],
      ['Brings together', 'The work now shared between the owner who leads front of house and the back of house lead, as one manager.'],
      ['Works with', 'Shift team leaders and kitchen supervisors, filled from inside the team. Titles and pay for those roles: to be confirmed.'],
      ['Scope', 'London Road only.'],
      ['To be confirmed', 'Nightly cash-up. Stock counts and ordering. Who prints the weekly checklists.']]),

  L.h1('3. Key responsibilities'),
  ...[
    'Run the shift. Run the opening, handover and close-down checklists. Check the thing itself, not just the tick.',
    'Cover every station. Float between stations and step in when one backs up. At handover, agree who covers assembly, fryers and front.',
    'Keep food safe. Store raw food below cooked food and sauces. Keep raw chicken away from cooked food and the fryers. Put use-by labels on everything. Log probe temperatures. Keep soap and blue roll stocked at every hand-wash sink. Keep the allergen chart dated and run the test order.',
    'Hold quality. Check food and portions before it leaves the kitchen.',
    'Keep service moving. Read the kitchen screen, clear finished orders, and log each complaint with its cause.',
    'Lead the team. Hold the team to the standards they sign off. Hold short, honest one-to-ones and record them.',
    "Train and coach. Train the team the Imran's way and build shift leaders who can run a shift.",
    'Work to the SOPs. Follow the manual and flag any step that does not work.',
    'Run the Monday routine. Bring the weekly numbers, sales and review score, and explain what drove them.',
  ].map(resp),

  L.h1('4. Essential requirements'),
  ...[
    'Has run a busy, high-volume quick-service site day to day.',
    'Can explain how they managed food safety before, and what HACCP means.',
    'Has managed a team to a standard and recorded one-to-ones.',
    'Has trained or coached team members, including shift leaders.',
    'Works to written SOPs and checklists.',
    'Can read weekly sales and review-score numbers and explain what drove them.',
  ].map(b),

  L.h1('5. Desirable requirements'),
  ...[
    'Marketing experience from earlier roles. A bonus, not a requirement.',
    'Local store marketing, and help to build a loyalty and customer database.',
    'Brand and packaging know-how, to help brief suppliers on quality.',
    'Experience of more than one site or brand, with efficiency ideas to share.',
  ].map(b),
  L.note('The owners and advisers cover marketing and branding over the next four months. Candidates are assessed on job-related criteria only.'),

  L.h1('6. Pay, hours and benefits'),
  kv([['Salary', '£35,000 to £40,000 a year. To be confirmed.'],
      ['Hours', 'To be confirmed.'],
      ['Shift pattern', 'To be confirmed.'],
      ['Start date', 'To be confirmed. Target: in post and in training by about 28 Dec 2026.'],
      ['Benefits', 'To be confirmed.']]),
];

const doc = new Document({ ...L.docBase('Store manager job specification'),
  sections: [{ properties: { titlePage: true, page: { size: { width: 11906, height: 16838 }, margin: { top: 1500, bottom: 1300, left: 1134, right: 1134, header: 600, footer: 560 } } },
    headers: { first: L.mkHeader(process.argv[3]), default: L.mkHeader(process.argv[4]) },
    footers: { first: L.mkFooter('Store manager job specification  |  Draft'), default: L.mkFooter('Store manager job specification  |  Draft') },
    children: content }] });
Packer.toBuffer(doc).then(buf => { fs.writeFileSync(process.argv[2], buf); console.log('written', process.argv[2]); });

