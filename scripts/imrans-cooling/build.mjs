import { createRequire } from 'module';
const require = createRequire('C:/Users/Wesley/agents-office/package.json');
const D = require('docx');
import fs from 'fs';
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType, TabStopType, VerticalAlign, TableLayoutType, HeightRule } = D;

const OUT = process.argv[2];
const F = 'Calibri', INK = '262626', GRID = '424242', OR = 'FF9711', ORT = 'A85800';
const W = 10204; // content width twips (A4, 1.5 cm sides)
const line = (sz, c = GRID) => ({ style: BorderStyle.SINGLE, size: sz, color: c });
const r = (t, o = {}) => new TextRun({ text: t, font: F, size: o.sz || 19, color: o.color || INK, bold: o.bold, italics: o.italics, characterSpacing: o.sp });
const p = (runs, o = {}) => new Paragraph({ children: Array.isArray(runs) ? runs : [runs], alignment: o.align, spacing: { before: o.before || 0, after: o.after || 0, line: o.line || 240 }, border: o.border, keepNext: o.keepNext, indent: o.indent, tabStops: o.tabs });

function header() {
  return p([r("Imran's", { sz: 38, bold: true, italics: true, color: OR }), r('  |  ', { sz: 22, color: '5A5A5A' }), r('DINER OPERATIONS MANUAL', { sz: 18, bold: true, color: '54595F', sp: 40 })],
    { after: 100, border: { bottom: line(6, OR) } });
}
function titles(l1, l2, sz, sub) {
  return [
    p(r(l1, { sz: sz * 2, bold: true }), { before: 120, line: 250 }),
    p(r(l2, { sz: sz * 2, bold: true }), { line: 250 }),
    p(r(sub, { sz: 20, bold: true, color: ORT, sp: 30 }), { before: 60, after: 120, border: { bottom: line(12, OR) } }),
  ];
}
function callout(runs) {
  return new Table({
    width: { size: W, type: WidthType.DXA }, columnWidths: [W], layout: TableLayoutType.FIXED,
    rows: [new TableRow({ children: [new TableCell({
      width: { size: W, type: WidthType.DXA },
      borders: { top: line(4), bottom: line(4), right: line(4), left: line(24, OR) },
      margins: { top: 70, bottom: 70, left: 140, right: 120 },
      children: [p(runs, { line: 252 })],
    })] })],
  });
}
const gap = (n = 100) => p(r('', { sz: 4 }), { line: n, after: 0 });
const cap = (t) => r(t.toUpperCase(), { sz: 18, bold: true, color: ORT, sp: 20 });
function cell(content, w, o = {}) {
  const kids = Array.isArray(content) ? content : [content];
  return new TableCell({
    width: { size: w, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER,
    borders: { top: o.top || line(4), bottom: o.bottom || line(4), left: line(4), right: line(4) },
    margins: { top: o.mt ?? 50, bottom: o.mb ?? 50, left: 90, right: 90 }, children: kids,
  });
}
function table(widths, head, rows) {
  const hr = new TableRow({ tableHeader: true, children: head.map((h, i) => cell(p(cap(h)), widths[i], { bottom: line(12, OR) })) });
  return new Table({ width: { size: W, type: WidthType.DXA }, columnWidths: widths, layout: TableLayoutType.FIXED, rows: [hr, ...rows] });
}
function stripTable(items) {
  const a = Math.floor(W / 3), w = [a, a, W - 2 * a];
  return new Table({ width: { size: W, type: WidthType.DXA }, columnWidths: w, layout: TableLayoutType.FIXED,
    rows: [new TableRow({ children: items.map((it, i) => cell([p(cap(it[0])), p(r(it[1], { sz: 19 }), { before: 20 })], w[i], { mt: 60, mb: 60 })) })] });
}
const heading = (t) => p(r(t, { sz: 19, bold: true, sp: 20 }), { before: 150, after: 70, keepNext: true, border: { bottom: line(6, OR) } });
function footer(text) {
  return new D.Footer({ children: [p(r(text, { sz: 18, color: '595959' }), { align: AlignmentType.RIGHT })] });
}
function doc(children, foot) {
  return new Document({
    styles: { default: { document: { run: { font: F, size: 19, color: INK } } } },
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 680, bottom: 800, left: 851, right: 851, footer: 400 } } },
      footers: { default: footer(foot) }, children,
    }],
  });
}

function sheet() {
  const widths = [1000, 1800, 1150, 1000, 1000, 1250, 1954, 1050];
  const heads = ['Time started', 'Item', 'Reading at start (°C)', 'Time checked', 'Reading (°C)', 'Limit', 'Corrective action', 'Initials'];
  const rows = [];
  for (let i = 0; i < 14; i++) rows.push(new TableRow({ height: { value: 600, rule: HeightRule.ATLEAST }, cantSplit: true,
    children: widths.map((w, c) => cell(c === 5 ? p(r('8°C or below', { sz: 18, color: '595959' }), { align: AlignmentType.CENTER }) : p(r('')), w)) }));
  const c = [
    header(), ...titles('COOLING', 'TEMPERATURE RECORD', 26, 'RECORD SHEET'),
    p([r('Site  _______________________________________        Date  ______________________')], { after: 120, before: 20 }),
    callout([r('LIMIT: ', { bold: true, color: ORT }), r('chill cooked food down as quickly as possible to 8°C or below, then put it in the fridge. Time allowed: ___ minutes (Site to confirm). Source: SFBB (Food Standards Agency), Chilling down hot food and Hot holding safe methods, read 19 Nov 2026. Keep: high-risk ready-to-eat food 3 days in total (cook day plus 2); cooked rice 1 day (SFBB, Ready-to-eat food).')]),
    gap(120),
    table(widths, heads, rows),
    p(r('Probe check: iced water -1°C to 1°C, boiling water 99°C to 101°C (SFBB, Prove it).'), { before: 120, after: 160 }),
    p([r('Manager sign-off:  ', { bold: true }), r('name ____________________   signature ____________________   date and time ________________')]),
  ];
  return doc(c, 'Cooling record | SOP: Cooling | Page 1 of 1');
}

function sop() {
  const w2 = [1700, W - 1700];
  const std = [['Limit', 'Chill to 8°C or below as quickly as possible, then into the fridge (SFBB).'], ['Time', '___ minutes (Site to confirm).'],
    ['Methods', 'Smaller portions. Cut joints in half. Cover pans and stand them in cold water or ice. Stir. Spread rice on a tray. Blast chiller if there is one.'],
    ['Keep', 'High-risk ready-to-eat food 3 days in total. Cooked rice 1 day.'], ['Label', 'Item, date made, time, use by, initials.']];
  const t1 = table(w2, ['Standard', 'Requirement'], std.map(([a, b]) => new TableRow({ cantSplit: true, children: [cell(p(r(a, { bold: true })), w2[0]), cell(p(r(b)), w2[1])] })));
  const w3 = [4000, 3400, W - 7400];
  const own = [['Chill down and record', 'Team member on the station', 'Shift manager'], ['Act on a failed cool', 'Shift manager', 'Director of Operations'], ['Sign the sheet', 'Shift manager', 'Director of Operations']];
  const t2 = table(w3, ['Activity', 'Owner', 'Escalate to'], own.map(row => new TableRow({ cantSplit: true, children: row.map((t, i) => cell(p(r(t, { bold: i === 0 })), w3[i])) })));
  const steps = [
    ['Cook only what you need.', 'Big batches chill slowly.'],
    ['Start chilling at once.', 'Divide the food and use one or more methods above.'],
    ['Clean the probe.', 'Put the tip in the centre. Write the start time and reading.'],
    ['Check again at regular intervals (every ___ minutes, Site to confirm)', 'with a clean probe each time, until 8°C or below. Write the time and reading.'],
    ['At 8°C or below, put it in the fridge and label it.', 'If it was not chilled safely, re-cook it if suitable, or throw it away. Write the action.'],
    ['The shift manager signs the sheet at the end of the shift.', 'If a method keeps failing, tell the Director of Operations.'],
  ];
  const stepPs = steps.map((s, i) => p([r(`${i + 1}.`, { bold: true, color: ORT }), r('\t'), r(s[0] + ' ', { bold: true }), r(s[1])],
    { after: 50, indent: { left: 340, hanging: 340 }, tabs: [{ type: TabStopType.LEFT, position: 340 }] }));
  const c = [
    header(), ...titles('COOLING', 'TEMPERATURE RECORD', 22, 'STANDARD OPERATING PROCEDURE | ONE-PAGER'),
    heading('PURPOSE'),
    callout([r('Cool cooked food fast and safely, and prove it with probe readings on the Cooling record sheet.')]),
    gap(110),
    stripTable([['OWNER', 'Director of Operations'], ['STATUS', 'Draft — for internal review'], ['APPLIES TO', 'Kitchen team, all shifts']]),
    heading('THE NON-NEGOTIABLES'), t1,
    gap(120),
    callout([r('KEY RULE: ', { bold: true, color: ORT }), r('Never leave hot food to cool slowly. Cook only what you need, chill it fast, then fridge.', { bold: true })]),
    heading('WHO OWNS WHAT'), t2,
    heading('HOW IT WORKS'), ...stepPs,
    heading('HOW WE KNOW IT IS WORKING'),
    stripTable([['BATCHES CHILLED TO 8°C OR BELOW', 'every shift'], ['SHEET SIGNED', 'every shift'], ['PROBE CHECK', 'monthly (Site to confirm)']]),
  ];
  return doc(c, 'Cooling SOP | Record sheet: Cooling | Page 1 of 1');
}

fs.writeFileSync(`${OUT}/Imrans Diner - Temp Sheet - Cooling - A4 - v1.docx`, await Packer.toBuffer(sheet()));
fs.writeFileSync(`${OUT}/Imrans Diner - Temp SOP - Cooling - A4 - v1.docx`, await Packer.toBuffer(sop()));
