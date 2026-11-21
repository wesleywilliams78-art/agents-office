import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire('C:/Users/Wesley/agents-office/');
const D = require('docx');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, Footer, AlignmentType, HeightRule, VerticalAlign, TableLayoutType } = D;

const OUT = process.argv[2];
const FONT = 'Calibri', INK = '262626', GRID = '424242', OR = 'FF9711', ORT = 'A85800', GREY = '5A5A5A', SUB = '54595F';
const cm = (x) => Math.round(x * 567);
const W = 18; // cm usable
const run = (t, o = {}) => new TextRun({ text: t, font: FONT, size: Math.round((o.size || 9.5) * 2), color: o.color || INK, bold: o.bold, italics: o.italics, characterSpacing: o.sp, allCaps: o.caps });
const none = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const line = (sz = 4, c = GRID) => ({ style: BorderStyle.SINGLE, size: sz, color: c, space: 0 });
const P = (children, o = {}) => new Paragraph({ children, spacing: { before: o.before || 0, after: o.after || 0, line: o.line || 240 }, alignment: o.align, indent: o.indent, border: o.border, keepNext: o.keepNext, tabStops: o.tabStops });

function header() {
  return P([run("Imran's", { size: 19, bold: true, italics: true, color: OR }), run('  |  ', { size: 12, color: GREY }), run('DINER OPERATIONS MANUAL', { size: 9, bold: true, color: SUB, sp: 40 })],
    { after: 120, border: { bottom: line(6, OR) } });
}
function title(l1, l2, sz, subtitle) {
  const ln = sz > 24 ? 270 : 260;
  return [
    P([run(l1, { size: sz, bold: true })], { before: 140, line: ln }),
    P([run(l2, { size: sz, bold: true })], { line: ln }),
    P([run(subtitle, { size: 10, bold: true, color: ORT, sp: 30 })], { before: 60, after: 110, border: { bottom: line(12, OR) } }),
  ];
}
function callout(runs, o = {}) {
  return new Paragraph({ children: runs, spacing: { before: o.before ?? 80, after: o.after ?? 80, line: 250 },
    indent: { left: 140, right: 100 },
    border: { top: line(4), bottom: line(4), right: line(4), left: { style: BorderStyle.SINGLE, size: 24, color: OR, space: 6 } } });
}
function heading(t, before = 140) {
  return P([run(t, { size: 9.5, bold: true, color: ORT, sp: 30 })], { before, after: 50, keepNext: true });
}
const cellB = (o) => ({ top: o.top || none, bottom: o.bottom || none, left: o.left || none, right: o.right || none });
function cell(children, w, o = {}) {
  return new TableCell({ children: Array.isArray(children) ? children : [children], width: { size: cm(w), type: WidthType.DXA },
    verticalAlign: o.v || VerticalAlign.CENTER, borders: cellB(o), margins: { top: o.mt ?? 30, bottom: o.mb ?? 30, left: 80, right: 80 }, columnSpan: o.span });
}
function table(widths, rows) {
  return new Table({ rows, width: { size: cm(widths.reduce((a, b) => a + b, 0)), type: WidthType.DXA }, columnWidths: widths.map(cm), layout: TableLayoutType.FIXED,
    borders: { top: none, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none } });
}
const hdrTxt = (t) => P([run(t, { size: 9, bold: true, color: ORT, caps: true, sp: 10 })]);
function footerFor(t) {
  return new Footer({ children: [P([run(t, { size: 9, color: GREY })], { align: AlignmentType.RIGHT })] });
}
function doc(children, footerText) {
  return new Document({
    creator: "Imran's Diner", title: 'Hot Holding',
    styles: { default: { document: { run: { font: FONT, size: 19, color: INK } } } },
    sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: cm(1.3), bottom: cm(1.3), left: cm(1.5), right: cm(1.5), footer: cm(0.7) } } },
      footers: { default: footerFor(footerText) }, children }],
  });
}

// ---------- SHEET ----------
function sheet() {
  const widths = [1.5, 4.0, 2.6, 2.6, 5.3, 2.0];
  const heads = ['Time', 'Item', 'Probe reading (°C)', 'Limit', 'Corrective action (if below limit)', 'Initials'];
  const HL = line(4), HO = line(12, OR);
  const gridAll = { top: HL, bottom: HL, left: HL, right: HL };
  const headRow = new TableRow({ tableHeader: true, height: { value: cm(1.0), rule: HeightRule.ATLEAST },
    children: heads.map((h, i) => cell(hdrTxt(h), widths[i], { top: HL, left: HL, right: HL, bottom: HO })) });
  const rows = [headRow];
  for (let r = 0; r < 16; r++) {
    rows.push(new TableRow({ height: { value: cm(0.98), rule: HeightRule.EXACT }, cantSplit: true,
      children: widths.map((w, i) => cell(i === 3 ? P([run('63°C or above', { size: 9, color: GREY })]) : P([run('')]), w, gridAll)) }));
  }
  return doc([
    header(),
    ...title('HOT HOLDING', 'TEMPERATURE RECORD', 26, 'RECORD SHEET'),
    P([run('Site '), run('_'.repeat(38)), run('        Date '), run('_'.repeat(26))], { before: 60, after: 90 }),
    callout([run('LIMIT: ', { bold: true }), run('hot food must be kept at '), run('63°C or above', { bold: true }), run('. Source: SFBB (Food Standards Agency), Hot holding safe method, read 19 Nov 2026.')], { before: 40, after: 60 }),
    P([run('Check every ___ hours. Site to confirm.')], { before: 60, after: 90 }),
    table(widths, rows),
    P([run('Probe check: ', { bold: true }), run('iced water -1°C to 1°C, boiling water 99°C to 101°C (SFBB, Prove it). Outside this, replace or calibrate the probe.')], { before: 110, after: 150 }),
    P([run('Manager sign-off: ', { bold: true }), run('name ' + '_'.repeat(17) + '   signature ' + '_'.repeat(17) + '   date and time ' + '_'.repeat(14))], { before: 40 }),
  ], 'Hot holding record | SOP: Hot holding | Page 1 of 1');
}

// ---------- SOP ----------
function sop() {
  const L = line(4);
  const strip = (items) => {
    const w = W / items.length;
    return table(items.map(() => w), [new TableRow({ children: items.map(([lab, val, bold]) =>
      cell([P([run(lab, { size: 9, bold: true, color: ORT, caps: true, sp: 10 })]), P(bold ? [run(val[0], { bold: true }), run(val[1] || '')] : [run(val)])], w, { top: line(12, OR), bottom: L, mt: 80, mb: 80, v: VerticalAlign.TOP })) })]);
  };
  const twoCol = (ws, head, rows) => table(ws, [
    new TableRow({ tableHeader: true, children: head.map((h, i) => cell(hdrTxt(h), ws[i], { bottom: line(12, OR) })) }),
    ...rows.map((r) => new TableRow({ cantSplit: true, children: r.map((t, i) => cell(P([run(t, { bold: i === 0 })]), ws[i], { bottom: L, mt: 85, mb: 85 })) })),
  ]);
  const step = (n, t) => P([run(n + '.', { bold: true, color: ORT }), run('\t' + t)], { after: 100, indent: { left: cm(0.7), hanging: cm(0.7) }, tabStops: [{ type: 'left', position: cm(0.7) }] });
  return doc([
    header(),
    ...title('HOT HOLDING', 'TEMPERATURE RECORD', 22, 'STANDARD OPERATING PROCEDURE  |  ONE-PAGER'),
    callout([run('PURPOSE: ', { bold: true, color: ORT }), run('Keep cooked food hot until it is served, and prove it with a probe reading on the Hot Holding record sheet.')], { before: 60, after: 100 }),
    strip([['Owner', 'Director of Operations'], ['Status', 'Draft — for internal review'], ['Applies to', 'Kitchen team, all shifts']]),
    heading('THE NON-NEGOTIABLES', 260),
    twoCol([3.2, 14.8], ['Standard', 'Requirement'], [
      ['Limit', 'Hot food is kept at 63°C or above (SFBB).'],
      ['Equipment', 'Preheat before food goes in. Hold food only. Never cook or reheat in it.'],
      ['Food in', 'Cooked thoroughly and steaming hot before it goes in.'],
      ['Probe', 'Clean and disinfect before and after use. Tip in the centre of the food.'],
      ['Record', 'Every reading goes on the sheet at the time.'],
    ]),
    callout([run('KEY RULE: ', { bold: true, color: ORT }), run('Below 63°C the food is not safely held. Reheat it once until steaming hot, chill it down, or throw it away.', { bold: true })], { before: 240, after: 60 }),
    heading('WHO OWNS WHAT', 260),
    twoCol([7.0, 5.5, 5.5], ['Activity', 'Owner', 'Escalate to'], [
      ['Take and record the reading', 'Team member on the station', 'Shift manager'],
      ['Act on a low reading', 'Shift manager', 'Director of Operations'],
      ['Sign the sheet', 'Shift manager', 'Director of Operations'],
    ]),
    heading('HOW IT WORKS', 260),
    step(1, 'Preheat the unit. Put in only food that is cooked and steaming hot.'),
    step(2, 'Check at the times on the sheet (every ___ hours, Site to confirm).'),
    step(3, 'Clean the probe. Put the tip in the centre of the food. Wait for the reading to settle.'),
    step(4, 'Write the time, item and reading. Add your initials.'),
    step(5, 'At 63°C or above, carry on. Below 63°C, reheat until steaming hot and put it back (once only), or chill it down, or throw it away. Write the action on the sheet.'),
    step(6, 'The shift manager checks and signs the sheet at the end of the shift. Repeat low readings: check the equipment and tell the Director of Operations.'),
    heading('HOW WE KNOW IT IS WORKING', 260),
    strip([['Readings at 63°C or above', ['Every shift'], true], ['Sheet signed', ['Every shift'], true], ['Probe check', ['Monthly', ' (Site to confirm)'], true]]),
  ], 'Hot holding SOP | Record sheet: Hot holding | Page 1 of 1');
}

fs.mkdirSync(OUT, { recursive: true });
for (const [name, d] of [['Imrans Diner - Temp Sheet - Hot Holding - A4 - v1', sheet()], ['Imrans Diner - Temp SOP - Hot Holding - A4 - v1', sop()]]) {
  fs.writeFileSync(path.join(OUT, name + '.docx'), await Packer.toBuffer(d));
}
