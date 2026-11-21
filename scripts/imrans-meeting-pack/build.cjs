// Builds the Imran's Diner 4-week Monday meeting pack (Wesley + Team versions) as editable Word files.
// Usage: node build.cjs <outDir>
const fs = require('fs');
const path = require('path');
const D = require('docx');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, Header, Footer, PageNumber,
  WidthType, BorderStyle, ShadingType, AlignmentType, PageOrientation, VerticalAlign, TableLayoutType,
  LineRuleType } = D;

const INK = '262626', ORANGE = 'FF9711', DORANGE = 'A85800', GREY = '595959', LINE = 'D0D0D0', BOX = 'EDEDED';
const FONT = 'Calibri', SYM = 'Segoe UI Symbol';
const BODY = 18, TBL = 17; // half-points: 9 pt, 8.5 pt
const APOS = '’';

// ---------- inline markup: **bold**, \n = line break, ☐ = 4 mm tick box ----------
function runs(text, o = {}) {
  const sz = o.sz || TBL, out = [];
  const parts = String(text).split(/(\*\*[^*]+\*\*|☐|\n)/).filter(s => s !== '');
  for (const p of parts) {
    if (p === '\n') out.push(new TextRun({ break: 1, size: sz, font: FONT }));
    else if (p === '☐') out.push(new TextRun({ text: '☐', font: { ascii: SYM, hAnsi: SYM, cs: SYM, eastAsia: SYM }, size: 22, color: INK }));
    else if (p.startsWith('**')) out.push(new TextRun({ text: p.slice(2, -2), bold: true, size: sz, font: FONT, color: o.color || INK }));
    else out.push(new TextRun({ text: p, bold: !!o.bold, italics: !!o.italics, size: sz, font: FONT, color: o.color || INK, smallCaps: !!o.sc, characterSpacing: o.cs }));
  }
  return out;
}
function P(text, o = {}) {
  return new Paragraph({
    children: runs(text, o),
    alignment: o.align,
    keepNext: o.keepNext,
    keepLines: true,
    spacing: { before: o.before ?? 0, after: o.after ?? 0, line: o.line || 240, lineRule: LineRuleType.AUTO },
    border: o.rule ? { bottom: { style: BorderStyle.SINGLE, size: o.rule, color: ORANGE, space: 2 } } : undefined,
    indent: o.indent,
  });
}
const label = (t, o = {}) => P(t, { sz: 16, bold: true, color: DORANGE, cs: 30, sc: false, ...o });
const body = (t, o = {}) => P(t, { sz: BODY, ...o });
const H1 = (t, o = {}) => P(t, { sz: 30, bold: true, rule: 6, after: 80, before: o.before ?? 0, keepNext: true });
const H2 = (t, o = {}) => P(t, { sz: 22, bold: true, rule: 4, after: 50, before: o.before ?? 100, keepNext: true });
const H3 = (t, o = {}) => P(t, { sz: BODY, bold: true, before: o.before ?? 80, after: 40, keepNext: true });

const NONE = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const noB = { top: NONE, bottom: NONE, left: NONE, right: NONE };
const hair = { style: BorderStyle.SINGLE, size: 4, color: LINE };

// ---------- tables ----------
function cell(content, w, o = {}) {
  const kids = (Array.isArray(content) ? content : [content]).map(c =>
    typeof c === 'string' ? P(c, { sz: o.sz || TBL, align: o.align, bold: o.bold, color: o.color, sc: o.sc, cs: o.cs }) : c);
  return new TableCell({
    children: kids, width: { size: w, type: WidthType.DXA }, columnSpan: o.span,
    verticalAlign: o.v || VerticalAlign.CENTER,
    shading: o.fill ? { type: ShadingType.CLEAR, fill: o.fill, color: 'auto' } : undefined,
    margins: { top: o.pt ?? 25, bottom: o.pb ?? 25, left: o.pl ?? 70, right: o.pr ?? 70 },
    borders: o.borders || { top: NONE, left: NONE, right: NONE, bottom: o.bottom || hair },
  });
}
// header row: small caps, orange bottom rule
function tbl(widths, head, rows, o = {}) {
  const sz = o.sz || TBL, total = widths.reduce((a, b) => a + b, 0);
  const trs = [];
  if (head) trs.push(new TableRow({ tableHeader: true, cantSplit: true, children: head.map((h, i) =>
    cell(h, widths[i], { sz, bold: true, sc: true, cs: 10, v: VerticalAlign.BOTTOM, bottom: { style: BorderStyle.SINGLE, size: 12, color: ORANGE } })) }));
  for (const r of rows) {
    const bold = r.bold; const cells = r.cells || r;
    trs.push(new TableRow({ cantSplit: true, height: o.rowH ? { value: o.rowH, rule: D.HeightRule.ATLEAST } : undefined,
      children: cells.map((c, i) => cell(c, widths[i], { sz, bold: bold, v: o.v })) }));
  }
  return new Table({ width: { size: total, type: WidthType.DXA }, columnWidths: widths, layout: TableLayoutType.FIXED, rows: trs,
    borders: { top: NONE, bottom: NONE, left: NONE, right: NONE, insideHorizontal: NONE, insideVertical: NONE } });
}
const gap = (n = 60) => new Paragraph({ children: [], spacing: { before: 0, after: 0, line: n, lineRule: LineRuleType.EXACT } });

// grey WESLEY ONLY box
function wBox(title, items, width, o = {}) {
  const kids = [new Paragraph({ spacing: { after: 40 }, children: [
    new TextRun({ text: title, bold: true, size: 17, font: FONT, color: DORANGE, characterSpacing: 20 })] })];
  for (const it of items) kids.push(new Paragraph({ spacing: { after: 20, line: 240 }, children: runs(it, { sz: BODY }) }));
  const b = { style: BorderStyle.SINGLE, size: 6, color: '9A9A9A' };
  return new Table({ width: { size: width, type: WidthType.DXA }, columnWidths: [width], layout: TableLayoutType.FIXED, rows: [
    new TableRow({ cantSplit: true, children: [new TableCell({ width: { size: width, type: WidthType.DXA }, children: kids,
      shading: { type: ShadingType.CLEAR, fill: BOX, color: 'auto' }, margins: { top: 70, bottom: 60, left: 130, right: 130 },
      borders: { top: b, bottom: b, left: b, right: b } })] })] });
}

// side-by-side layout (each side: array of block children)
function twoCol(left, right, wL, wR, g = 300) {
  const mk = (kids, w) => new TableCell({ children: [...kids, gap(20)], width: { size: w, type: WidthType.DXA },
    verticalAlign: VerticalAlign.TOP, margins: { top: 0, bottom: 0, left: 0, right: 0 }, borders: noB });
  return new Table({ width: { size: wL + g + wR, type: WidthType.DXA }, columnWidths: [wL, g, wR], layout: TableLayoutType.FIXED,
    borders: { top: NONE, bottom: NONE, left: NONE, right: NONE, insideHorizontal: NONE, insideVertical: NONE },
    rows: [new TableRow({ children: [mk(left, wL), mk([gap(20)], g), mk(right, wR)] })] });
}

// ---------- header / footer ----------
function header() {
  return new Header({ children: [new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: ORANGE, space: 3 } }, spacing: { after: 0 },
    children: [
      new TextRun({ text: 'Imran' + APOS + 's', bold: true, italics: true, color: ORANGE, size: 38, font: FONT }),
      new TextRun({ text: '   |   ', color: GREY, size: 16, font: FONT }),
      new TextRun({ text: 'DINER OPERATIONS MANUAL', bold: true, color: GREY, size: 16, font: FONT, characterSpacing: 40 })] })] });
}
function footer(part) {
  const f = { size: 18, color: '424242', font: FONT };
  return new Footer({ children: [new Paragraph({ spacing: { after: 0 }, children: [
    new TextRun({ text: 'Imran' + APOS + 's Diner Monday meeting pack  |  Part ' + part + '  |  Page ', ...f }),
    new TextRun({ children: [PageNumber.CURRENT], ...f })] })] });
}

// ---------- data (from the Google Doc, unchanged) ----------
const blanks = '____';
const WK = [
  ['**Week**', '**Date**', '**Start**', '**Finish**', '**Present**'],
];
const hour1 = [
  ['1', '**Open**', '5', 'Say the aim. Read the rules below. Agree the order.'],
  ['2', '**Top-line numbers**', '15', 'Walk the one-page number sheet (Part C). Fill in "this week" from Presto. Say what to look at.'],
  ['3', '**Floor check**', '25', 'Walk the site together. Check last week' + "'" + 's food safety actions on the floor. Mark each on the action list.'],
  ['4', '**Routines check**', '10', 'Open the 3-shift checklist and the shift manager SOP. Are they in use and signed task by task?'],
  ['5', '**Close the hour**', '5', 'One line each: what is better, what is stuck. Move to the actions.'],
  ['', '**Total**', '**60**', ''],
];
const hours24 = [
  ['A1', '**Review last week' + "'" + 's actions**', '45', 'Go down the list. Mark each Done, Not done or New date. Set the next five food safety actions.'],
  ['A2', '**Shift leaders**', '60', 'Who goes forward, why, and which position in the restaurant.'],
  ['A3', '**Resourcing gaps and adverts**', '45', 'For each gap: the role, the profile or job description needed, the owner and the date the advert goes live. Agree who posts each advert and by when.'],
  ['A4', '**Store manager expectations**', '20', 'Write down what they expect from a store manager.'],
  ['A5', '**Parking lot and next week' + "'" + 's actions**', '10', 'Read the Parked box. Give each topic a week (3 min). Agree next week' + "'" + 's actions, each with an owner and a date (7 min).'],
  ['', '**Total**', '**180**', ''],
];
const rules = [
  '1. One topic at a time, in this order. Each time box is firm.',
  '2. Off the agenda? Say "Parked". Write it in the Parked box with a week. Do not debate it.',
  '3. Every action has one owner and one date.',
  '4. Not done: set a new date. Not done twice: say what is blocking it.',
  '5. The structure stays the same for all four weeks.',
];
const changes = [
  ['1', 'Mon 16 Nov', 'Tracker rows due by 16 Nov, and rows 112 to 120. The five food safety actions.'],
  ['2', 'Mon 23 Nov', 'Week 1 list, plus anything carried over.'],
  ['3', 'Mon 30 Nov', 'Week 2 list, plus anything carried over.'],
  ['4', 'Mon 7 Dec', 'Week 3 list, plus anything carried over. Last action item: agree what continues after the four weeks.'],
];
const facil = [
  '1. Off-agenda line: "That matters. It goes in the Parked box and we give it a week."',
  '2. If a time box ends, stop. Carry the rows you did not reach to next week' + "'" + 's list.',
  '3. Keep to the number sheet. The only new figures are the "this week" boxes, from Presto.',
  '4. Talk about routines and systems, not individuals. Reasons for shift leaders are about what they do on shift.',
  '5. After the meeting: the action list goes into a Gmail draft for you to send. Tracker updates come back to you as proposals. Nothing is written to the tracker without your yes.',
];
const RES = '☐ Done ☐ Not done\nNew date ______';
const r1 = [
  ['112', 'Send the full assessment report and a shift-leader checklist', 'WRW', '9 Nov', 'Complete'],
  ['113', 'Send the food storage SOP for fridge and freezer', 'WRW', '9 Nov', 'Complete'],
  ['114', '**Check the five food safety actions on site** (item 3 above). Assessment, "Start now".', 'WRW', '16 Nov', 'Not started'],
  ['114a', '1. Raw at the bottom', 'Back of house lead', '20 Nov', ''],
  ['114b', '2. Label, date, see inside', 'Back of house lead', '20 Nov', ''],
  ['114c', '3. Soap and paper always full', 'Shift team leader', '20 Nov', ''],
  ['114d', '4. Probe and record', 'Morning kitchen supervisor', '20 Nov', ''],
  ['114e', '5. Keep raw chicken apart', 'Back of house lead', '20 Nov', ''],
  ['115', 'Work out hot-holding and cooking temperatures with the Director of Operations', 'WRW', '16 Nov', 'Not started'],
  ['116', 'Start the Monday visits and the structured meeting (today)', 'WRW', '16 Nov', 'In progress'],
  ['117', 'Start recruiting an external manager alongside the routines', 'WRW', '16 Nov', 'Not started'],
  ['118', 'Menu engineering after the four weeks (parked: record the date only)', 'WRW', 'TBC', 'Not started'],
  ['119', 'Version 2.0 kitchen layout to the owner (parked: record the date only)', 'WRW', 'TBC', 'Not started'],
  ['120', 'Run the first one or two team meetings to give them structure', 'WRW', '16 Nov', 'Not started'],
];
const DOO = 'Director of Operations';
const r2 = [
  ['35', 'Check how trainers train, against "Show Me, Tell Me, Do It"', 'WRW', '5 Nov', 'In progress'],
  ['40', 'Service-speed roadmap (needs the SOP and recipe rewrite)', DOO, '29 Sep', 'Blocked'],
  ['49', 'On-site operational assessment (the visit was 5 and 6 Nov)', 'WRW', '5 Nov', 'In progress'],
  ['51', 'Delivery packaging review', DOO, '5 Nov', 'In progress'],
  ['53', 'Order status screen: what is possible, the cost, the options', DOO, '17 Oct', 'Not started'],
  ['54', 'Team leaders: write down duties, on-shift decisions and cover', DOO, '17 Oct', 'Not started'],
  ['55', 'Timings: one target per order type', DOO, '17 Oct', 'Not started'],
  ['56', 'Wrong or missing items: one-page standard', DOO, '17 Oct', 'Not in use'],
  ['58', 'Busy periods: wedge numbers by time slot', DOO, '17 Oct', 'In progress'],
  ['59', 'Driver hand-over: write out the steps', DOO, '17 Oct', 'Not in use'],
  ['60', 'Allergens: check the draft allergen SOP against practice', 'WRW', '17 Oct', 'Not in use'],
  ['61', 'Pizza consistency pack', 'WRW', '16 Oct', 'Not in use'],
  ['62', 'Team appraisal template', 'WRW', '16 Oct', 'Not in use'],
  ['63', 'Return the client' + "'" + 's own appraisal sheet', DOO, '21 Oct', 'Blocked'],
  ['64', 'Disciplinary process and templates', 'WRW', '20 Oct', 'Not in use'],
  ['65', 'New-starter week-one checklists', 'WRW', '23 Oct', 'In progress'],
  ['66', 'Shift-leader role cards', 'WRW', '23 Oct', 'In progress'],
  ['68', 'Allergens: answer the five outstanding questions', DOO, '16 Oct', 'Not started'],
  ['69', 'Allergens: all staff finish the free FSA allergy course. Return the list', DOO, '28 Oct', 'Not started'],
  ['73', 'Capture the owner' + "'" + 's daily walk-round routine as a checklist', 'WRW and owner', '5 Nov', 'In progress'],
  ['78', '"In use" check on each delivered item: since when, who checks it', 'WRW', '23 Oct', 'Not in use'],
  ['83', 'Last 8 weeks of paper rotas', DOO, '30 Oct', 'Not started'],
  ['88', 'Findings: one-page pain points, scored report, walk-through', 'WRW', '10 Nov', 'In progress'],
  ['100', 'Insurance and electrical certificates into the shared folder', DOO, '16 Nov', 'Not started'],
  ['101', 'Send the interior designer' + "'" + 's design and quote (parked: record the date only)', DOO, '16 Nov', 'Not started'],
  ['102', 'Ask the window cleaner to clean the signboard monthly', DOO, '12 Nov', 'Not started'],
  ['103', 'Book the second EPOS provider demo (parked: record the date only)', DOO, '16 Nov', 'Not started'],
  ['121', 'Send the owner the shift-manager scope of role', 'WRW', '13 Nov', 'Not started'],
  ['124', 'Owner stays off the floor Monday to Thursday so shift managers run service', 'Owner', '16 Nov', 'Not started'],
];
const wNotes = [
  '1. Start time is assumed. The diary has no meeting event. The train gets in at 12:33 and the return leaves at 18:11. Change the clock column if the start moves.',
  '2. Assessment v1 gives the five food safety actions start dates of 16 to 19 Nov and "done by" 20 Nov. The 10 Nov call and row 114 say before today. The run sheet checks them today. Any not done get a new date.',
  '3. Row 121 (shift-manager scope of role) was due 13 Nov and shows Not started. Say so first.',
  '4. Rows 112 and 113 show a target date of "09-Nov-0206" on the tracker. Treat it as 9 Nov 2026.',
  '5. If A1 reaches 45 minutes, stop. Carry the rows you did not reach to week 2.',
  '6. Rows 101, 103, 118 and 119 are parked topics. Record a date and move on.',
  '7. Rows 13, 14 and 33 already hold the store manager role spec, scorecard and pay benchmark. Build on them after the meeting. Quote no pay figure in the room (price to confirm).',
  '8. Writing the shift leader checklist, the job descriptions and the adverts is separate work after the meeting.',
];

// ---------- Part A (portrait) ----------
function partA(wesley) {
  const W = 10206, k = [];
  k.push(P('MONDAY MANAGEMENT MEETING PACK', { sz: 40, bold: true, after: 40, before: 40 }));
  k.push(P('FOUR WEEKS: 16, 23, 30 NOV AND 7 DEC 2026', { sz: 20, bold: true, color: DORANGE, cs: 40, after: 40 }));
  k.push(body('DRAFT v1, 16 Nov 2026. Part A: the fixed weekly structure. Part B: the week 1 run sheet. Part C: one page of numbers for the team. Nothing here has gone to the client.', { after: 90 }));
  if (wesley) {
    k.push(wBox('WESLEY ONLY.', ['**WESLEY ONLY.** Grey boxes marked WESLEY ONLY are facilitation notes. Delete them before this pack goes to anyone else. Part C is safe for the team, but it goes to the Director of Operations only after you approve it. The text is plain so that you can edit it in Word.'].map(s => s.replace('**WESLEY ONLY.** ', '')), W));
  }
  k.push(H1('PART A: THE FIXED WEEKLY STRUCTURE', { before: 100 }));
  k.push(body('**Same headings. Same timings. Every Monday.** Only the actions change.', { after: 30 }));
  k.push(body('**Scope for these four weeks:** food safety and management routines. Menu engineering, branding and the franchise pipeline go to the parking lot.', { after: 80 }));
  k.push(tbl([1500, 2100, 1250, 1250, 4106], ['Week', 'Date', 'Start', 'Finish', 'Present'], [[
    blanks + ' of 4', blanks + ' Nov / Dec 2026', blanks + ' : ' + blanks, blanks + ' : ' + blanks,
    'Wesley (WRW). Director of Operations. Back of house lead. The owner for part of it.']], { rowH: 400 }));
  k.push(H2('Hour 1: management meeting (60 minutes)', { before: 140 }));
  k.push(tbl([600, 2700, 700, 6206], ['#', 'Item', 'Min', 'What happens'], hour1));
  k.push(H2('Hours 2 to 4: actions (180 minutes)', { before: 140 }));
  k.push(tbl([600, 2700, 700, 6206], ['#', 'Item', 'Min', 'What happens'], hours24));
  k.push(H2('Rules of the room', { before: 140 }));
  rules.forEach(r => k.push(body(r, { after: 20 })));
  k.push(H2('What changes each week: only the actions', { before: 140 }));
  k.push(tbl([900, 1700, 7606], ['Week', 'Date', 'Where the actions come from'], changes));
  k.push(body('Each week sets 10 to 15 actions: the next five food safety actions and the next five management routine actions, plus carry-overs (10 Nov call).', { before: 70, after: 90 }));
  if (wesley) k.push(wBox('WESLEY ONLY: facilitation.', facil, W));
  return k;
}

// ---------- Part B (landscape; band on top, then real two-column flow) ----------
const BL = 454, BFW = 16838 - 2 * BL, BG = 300, HW = Math.floor((BFW - BG) / 2);
const PAD = { pt: 10, pb: 10, pl: 50, pr: 30 };
function tp(text, o = {}) {
  return new Paragraph({ children: runs(text, { sz: TBL, bold: o.bold }), keepLines: true, spacing: { before: 0, after: 0, line: o.line || 205, lineRule: LineRuleType.EXACT } });
}
const NB = { top: NONE, bottom: NONE, left: NONE, right: NONE, insideHorizontal: NONE, insideVertical: NONE };
const HB = { style: BorderStyle.SINGLE, size: 12, color: ORANGE };
function resultCell(w) {
  return cell([
    new Paragraph({ children: runs('☐ Done ☐ Not done', { sz: TBL }), spacing: { before: 0, after: 0, line: 240, lineRule: LineRuleType.EXACT } }),
    tp('New date ______')], w, PAD);
}
function a1Table(rows) {
  const w = [500, 0, 1000, 640, 800, 1750]; w[1] = HW - w.reduce((a, b) => a + b, 0);
  const head = new TableRow({ tableHeader: true, cantSplit: true, children: ['Row', 'Action', 'Owner', 'Due', 'Tracker', 'Result'].map((h, i) =>
    cell(new Paragraph({ children: runs(h, { sz: TBL, bold: true, sc: true, cs: 10 }), spacing: { before: 0, after: 0 } }), w[i], { v: VerticalAlign.BOTTOM, ...PAD, bottom: HB })) });
  const trs = rows.map(r => new TableRow({ cantSplit: true, children: [...r.map((c, i) => cell(tp(c), w[i], PAD)), resultCell(w[5])] }));
  return new Table({ width: { size: HW, type: WidthType.DXA }, columnWidths: w, layout: TableLayoutType.FIXED, rows: [head, ...trs], borders: NB });
}
function ctbl(widths, head, rows, rowH) {
  const total = widths.reduce((a, b) => a + b, 0), trs = [];
  trs.push(new TableRow({ tableHeader: true, cantSplit: true, children: head.map((h, i) =>
    cell(new Paragraph({ children: runs(h, { sz: TBL, bold: true, sc: true, cs: 10 }), spacing: { before: 0, after: 0 } }), widths[i], { v: VerticalAlign.BOTTOM, ...PAD, bottom: HB })) }));
  for (const r of rows) trs.push(new TableRow({ cantSplit: true, height: rowH ? { value: rowH, rule: D.HeightRule.ATLEAST } : undefined,
    children: r.map((c, i) => cell(tp(c), widths[i], PAD)) }));
  return new Table({ width: { size: total, type: WidthType.DXA }, columnWidths: widths, layout: TableLayoutType.FIXED, rows: trs, borders: NB });
}
const RH = 300;
function partBBand() {
  const k = [];
  k.push(H1('PART B: WEEK 1 RUN SHEET. MONDAY 16 NOV 2026', { before: 0 }));
  k.push(body('Week 1 of 4. Start 13:30 (assumed). Finish 17:30. Follow the shift manager SOP and the 3-shift checklist (Morning, Middle, Evening) as written. Do not re-read them.', { after: 60 }));
  const cw = [1500, 560, HW - 2060];
  const clock1 = ctbl(cw, ['Clock', 'Min', 'Hour 1: management meeting'], [
    ['13:30 to 13:35', '5', '**1. Open.** Aim, rules, order.'],
    ['13:35 to 13:50', '15', '**2. Top-line numbers.** Part C. Fill in "this week" from Presto.'],
    ['13:50 to 14:15', '25', '**3. Floor check.** Walk the cold room, sinks, probes and fryers. Mark rows 114a to 114e below.'],
    ['14:15 to 14:25', '10', '**4. Routines check.** 3-shift checklist and shift manager SOP: in use? Signed task by task?'],
    ['14:25 to 14:30', '5', '**5. Close the hour.** What is better. What is stuck.'],
    ['', '**60**', '**Total**']]);
  const clock2 = ctbl(cw, ['Clock', 'Min', 'Hours 2 to 4: actions'], [
    ['14:30 to 15:15', '45', '**A1. Review last week' + "'" + 's actions** and set the next five food safety actions'],
    ['15:15 to 16:15', '60', '**A2. Shift leaders**'],
    ['16:15 to 17:00', '45', '**A3. Resourcing gaps and adverts**'],
    ['17:00 to 17:20', '20', '**A4. Store manager expectations**'],
    ['17:20 to 17:30', '10', '**A5. Parking lot and next week' + "'" + 's actions**'],
    ['', '**180**', '**Total**']]);
  k.push(twoCol([clock1], [clock2], HW, HW, BG));
  return k;
}
function partBFlow(wesley) {
  const k = [];
  const nw = [400, 0, 1600, 900]; nw[1] = HW - (400 + 1600 + 900);
  const blank = n => Array.from({ length: n }, (_, i) => [String(i + 1), '', '', '']);
  k.push(H2('A1. Review last week' + "'" + 's actions (45 min)', { before: 60 }));
  k.push(body('Tracker read live on 16 Nov 2026. Every open row due on or before 16 Nov, plus rows 112 to 120. Rows already Complete are left off, except 112 and 113.', { after: 40 }));
  k.push(H3('From the 10 Nov call: rows 112 to 120', { before: 20 }));
  k.push(a1Table(r1));
  k.push(H3('Older open rows due on or before 16 Nov', { before: 80 }));
  k.push(a1Table(r2));
  k.push(H3('Set the next five food safety actions', { before: 80 }));
  k.push(ctbl(nw, ['#', 'Action', 'Owner', 'Date'], blank(5), RH));
  k.push(H2('A2. Shift leaders (60 min)', { before: 100 }));
  k.push(body('Positions follow the 3-shift checklist: Morning, Middle (6pm handover), Evening. Area: front of house, kitchen, or both.', { after: 40 }));
  k.push(ctbl([950, 1500, HW - 950 - 1500 - 2200, 2200], ['Candidate', 'Name', 'Why (what they do on shift)', 'Restaurant position (shift and area)'], blank(4).map(r => r), RH));
  k.push(body('Who covers each shift leader when they are off: ______________________________________', { before: 50, after: 20 }));
  k.push(body('Formal team-leader title (row 130, due 20 Nov): ☐ Decided: ______________ ☐ Not yet. New date ______', { after: 20 }));
  k.push(body('Scope of role (row 121): ☐ Sent ☐ Agreed with the owner ☐ Changes: ______________________', { after: 0 }));
  k.push(H2('A3. Resourcing gaps and adverts (45 min)', { before: 100 }));
  k.push(body('The meeting agrees who posts each advert and by when. Our desks draft the profiles and adverts afterwards.', { after: 40 }));
  k.push(ctbl([1900, HW - 1900 - 1300 - 1150, 1300, 1150], ['Role', 'Profile or job description needed', 'Owner', 'Advert live date'], [
    ['**Store manager** (external)', 'Profile and job description. Built after this meeting from A4.', '', ''],
    ['**Shift leader** (any position with no candidate in A2)', '', '', ''],
    ['', '', '', ''], ['', '', '', ''], ['', '', '', ''], ['', '', '', '']], RH));
  k.push(body('Related rows: 98 job descriptions per station (due 26 Nov), 117 recruiting an external manager (4 to 6 weeks), 129 hiring process and escalation sheet (due 3 Dec).', { before: 50, after: 0 }));
  k.push(H2('A4. Store manager expectations (20 min)', { before: 100 }));
  k.push(body('Write what they say. Do not edit it in the room.', { after: 40 }));
  k.push(ctbl([3000, HW - 3000], ['What do they expect the store manager to…', 'Their answer'], [
    ['Do every day and every week', ''], ['Decide alone, and what goes to the owner', ''],
    ['Have: skills and experience they must have', ''], ['Hours and days on site', ''],
    ['Work with the Director of Operations and the back of house lead', ''], ['Anything else they want covered', '']], RH));
  k.push(H2('A5. Parking lot and next week' + "'" + 's actions (10 min)', { before: 100 }));
  k.push(body('**Parked.** Write the topic. Give it a week.', { after: 40 }));
  k.push(ctbl([HW - 2300 - 1400, 2300, 1400], ['Topic parked', 'Back in week', 'Who writes it up'], [
    ['Menu engineering', 'After week 4 (row 118)', 'WRW'], ['Branding and the 2.0 look', 'After week 4 (assumed)', 'WRW'],
    ['Franchise pipeline', 'After week 4 (assumed)', 'WRW'], ['', '', ''], ['', '', ''], ['', '', '']], RH));
  k.push(H3('Next week' + "'" + 's management routine actions (Mon 23 Nov)', { before: 80 }));
  k.push(ctbl(nw, ['#', 'Action', 'Owner', 'Date'], blank(5), RH));
  k.push(body('Not done today carries to next week with the new date written above.', { before: 40, after: 0 }));
  if (wesley) { k.push(gap(100)); k.push(wBox('WESLEY ONLY: week 1 notes.', wNotes, HW)); }
  return k;
}

// ---------- Part C (portrait, one page) ----------
function partC() {
  const k = [];
  k.push(H1('PART C: FIVE NUMBERS TO LOOK AT EVERY MONDAY', { before: 60 }));
  k.push(P('These come from the Presto sales reports. They show how busy the diner is. The busier it is, the more the food safety checks matter. Look at them at the start of every Monday meeting.', { sz: 21, after: 90, before: 40, line: 264 }));
  k.push(P('Money is in pounds (£). The dates beside each figure are the dates it covers. "This week" is filled in from Presto in the room.', { sz: 21, after: 200, line: 264 }));
  const big = (t) => '**' + t + '**';
  const rows = [
    ['**1. Orders in a month**', '13,639 orders\n1 to 31 Oct 2026\nUp 10.7% on Sep 2026 (1 to 30 Sep, worked out)', '______', 'Is it going up or down? More orders means the checks matter more.'],
    ['**2. Orders in a week**', '3,062 orders\n19 to 25 Oct 2026', '______', 'Compare this week with the baseline. On a busier week, do the checks first.'],
    ['**3. Sales in a month**', '£253,655.77\n1 to 31 Oct 2026', '______', 'Sales follow orders. Watch it. Do not chase it in these four weeks.'],
    ['**4. Average order**', '£18.60\n1 to 31 Oct 2026\n(sales divided by orders)', '______', 'If it moves a lot, ask why. It is the first sign that something changed.'],
    ['**5. Busiest hour**', '6PM on Sat 31 Oct 2026\n77 orders, £1,781.36\nBusiest hour in 26 to 31 Oct 2026', '______', 'Be ready before this hour. Fridges, soap, probes and the checklist are done before the 6pm handover.'],
  ];
  const W = [2000, 3100, 1500, 3606], sz = 22;
  const trs = [new TableRow({ tableHeader: true, cantSplit: true, children: ['Number', 'Baseline', 'This week', 'What to look at'].map((h, i) =>
    cell(h, W[i], { sz: 20, bold: true, sc: true, cs: 10, v: VerticalAlign.BOTTOM, bottom: { style: BorderStyle.SINGLE, size: 12, color: ORANGE } })) })];
  for (const r of rows) trs.push(new TableRow({ cantSplit: true, height: { value: 2300, rule: D.HeightRule.ATLEAST }, children: r.map((c, i) => {
    const kids = i === 1 ? c.split('\n').map((ln, j) => P(ln, { sz: j === 0 ? 26 : 21, bold: j === 0, after: 30, color: j === 0 ? INK : '404040' })) : [P(c, { sz: i === 0 ? 22 : 21, line: 252 })];
    return cell(kids, W[i], { pt: 80, pb: 80, pl: 90, pr: 90 });
  }) }));
  k.push(new Table({ width: { size: 10206, type: WidthType.DXA }, columnWidths: W, layout: TableLayoutType.FIXED, rows: trs,
    borders: { top: NONE, bottom: NONE, left: NONE, right: NONE, insideHorizontal: NONE, insideVertical: NONE } }));
  k.push(P('Source: Presto sales reports for Imran' + "'" + 's Diner, London Road. The baseline runs to 31 Oct 2026. Nothing has been estimated. Any box left blank has no figure yet.', { sz: BODY, before: 160, color: '404040' }));
  return k;
}

// ---------- assemble ----------
function build(wesley) {
  const portrait = { page: { size: { width: 11906, height: 16838 }, margin: { top: 1100, bottom: 900, left: 850, right: 850, header: 400, footer: 400 } } };
  const lm = { top: 1000, bottom: 760, left: BL, right: BL, header: 300, footer: 300 };
  const land = (start) => ({ page: { size: { width: 11906, height: 16838, orientation: PageOrientation.LANDSCAPE }, margin: lm, pageNumbers: start ? { start: 1 } : undefined } });
  return new Document({
    creator: 'WRW Hospitality', title: "Imran's Diner - 4-Week Meeting Pack - " + (wesley ? 'Wesley' : 'Team') + ' - v1',
    styles: { default: { document: { run: { font: FONT, size: BODY, color: INK } } } },
    sections: [
      { properties: { ...portrait, page: { ...portrait.page, pageNumbers: { start: 1 } } }, headers: { default: header() }, footers: { default: footer('A') }, children: partA(wesley) },
      { properties: land(true), headers: { default: header() }, footers: { default: footer('B') }, children: partBBand() },
      { properties: { ...land(false), type: D.SectionType.CONTINUOUS, column: { count: 2, space: BG, equalWidth: true } }, children: partBFlow(wesley) },
      { properties: { ...portrait, page: { ...portrait.page, pageNumbers: { start: 1 } } }, headers: { default: header() }, footers: { default: footer('C') }, children: partC() },
    ] });
}

(async () => {
  const out = process.argv[2];
  fs.mkdirSync(out, { recursive: true });
  for (const [name, w] of [['Imrans Diner - 4-Week Meeting Pack - Wesley - v1.docx', true], ['Imrans Diner - 4-Week Meeting Pack - Team - v1.docx', false]]) {
    fs.writeFileSync(path.join(out, name), await Packer.toBuffer(build(w)));
    console.log('wrote', name);
  }
})();
