// Qamaria point-of-work SOP library: light (cream) print variant of the Qamaria template.
const fs = require('fs');
const path = require('path');
const {
  Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle, AlignmentType,
  Header, Footer, PageNumber, LevelFormat, ImageRun, HeightRule, VerticalAlign,
  HorizontalPositionRelativeFrom, VerticalPositionRelativeFrom, TextWrappingType
} = require('docx');

// Qamaria Brand Guidelines (17 Nov 2026), via the qamaria-brand skill. Never the old forest/bone/sage/mint palette.
const C = { GROUND: 'F7EDE3', PANEL: 'EFDFCF', STRIPE: 'FBF6F0', HAIR: 'D9CBBB', TEXT: '1D2B23', MUTED: '5B6B61',
  ACCENT: '055C33', FOREST: '055C33', CAMEL: 'C29161', MINT: 'E6EFDC', WHITE: 'FFFFFF' };
const FONT = 'Open Sans', W = 9638; // A4, 2cm side margins. Avenir for headings once Qamaria supply the files.
const BODY = 19; // 9.5pt: Open Sans sets wider than Calibri

// ---------- gap numbering ----------
const GAPS = require('./gaps.js');
let GAPNUM = {};
function setGapNumbers(map) { GAPNUM = map; }
const answered = (key) => GAPS[key] && GAPS[key].answer != null && GAPS[key].answer !== '';
function gapText(key) {
  if (!GAPS[key]) throw new Error('Unknown gap key: ' + key);
  if (answered(key)) return String(GAPS[key].answer);
  if (!GAPNUM[key]) throw new Error('Gap not numbered: ' + key);
  return `[NEEDS QAMARIA ${GAPNUM[key]}: ${GAPS[key].label}]`;
}

// ---------- rich text: {{gap}} and **bold** ----------
function runs(text, o = {}) {
  const parts = String(text).split(/(\{\{\w+\}\}|\*\*[^*]+\*\*)/).filter(Boolean);
  return parts.map(p => {
    const g = p.match(/^\{\{(\w+)\}\}$/);
    if (g && answered(g[1])) return new TextRun({ text: gapText(g[1]), font: FONT, size: o.size || BODY, color: o.color || C.TEXT, bold: o.bold });
    if (g) return new TextRun({ text: gapText(g[1]), font: FONT, size: o.size || BODY, bold: true, color: C.FOREST,
      shading: { type: ShadingType.CLEAR, color: 'auto', fill: C.MINT } });
    const b = p.match(/^\*\*(.+)\*\*$/);
    if (b) return new TextRun({ text: b[1], font: FONT, size: o.size || BODY, bold: true, color: o.color || C.TEXT });
    return new TextRun({ text: p, font: FONT, size: o.size || BODY, color: o.color || C.TEXT, bold: o.bold, italics: o.italics,
      characterSpacing: o.spacing || 0 });
  });
}
const P = (text, o = {}) => new Paragraph({ spacing: { after: o.after ?? 140, before: o.before ?? 0, line: o.line || 288 },
  keepNext: o.keepNext, keepLines: true, alignment: o.align, children: runs(text, o) });
const gap = (n = 120) => new Paragraph({ spacing: { after: 0, before: 0, line: n, lineRule: 'exact' }, children: [] });

// ---------- borders ----------
const none = { style: BorderStyle.NONE, size: 0, color: C.GROUND };
const hair = { style: BorderStyle.SINGLE, size: 4, color: C.HAIR };
const rule = { style: BorderStyle.SINGLE, size: 12, color: C.ACCENT };

// section heading: small numbered caps label with a rule
function head(num, text, pageBreak = false, inBox = false) {
  return new Paragraph({ keepNext: true, keepLines: true, pageBreakBefore: pageBreak, spacing: { before: pageBreak || inBox ? 0 : 380, after: 160 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: C.HAIR, space: 3 } },
    children: [
      ...(num ? [new TextRun({ text: num + '   ', font: FONT, size: 22, bold: true, color: C.ACCENT })] : []),
      new TextRun({ text: text.toUpperCase(), font: FONT, size: 22, bold: true, color: C.FOREST, characterSpacing: 30 })] });
}

function cellParas(content, o) {
  const lines = Array.isArray(content) ? content : [content];
  return lines.map((t, i) => new Paragraph({ spacing: { after: i === lines.length - 1 ? 0 : 50, line: 264 },
    keepLines: true, keepNext: o.keepNext || i < lines.length - 1, alignment: o.align, children: runs(t, o) }));
}
function cell(content, width, o = {}) {
  return new TableCell({ width: { size: width, type: WidthType.DXA }, verticalAlign: o.valign || VerticalAlign.CENTER,
    margins: { top: o.pad ?? 80, bottom: o.pad ?? 80, left: 120, right: 120 },
    columnSpan: o.span,
    borders: { top: o.top || none, left: o.left || none, right: o.right || none, bottom: o.bottom || hair },
    shading: o.fill ? { type: ShadingType.CLEAR, color: 'auto', fill: o.fill } : undefined,
    children: cellParas(content, o) });
}
const hcell = (t, w, o = {}) => cell(t.toUpperCase(), w, { size: 15, bold: true, color: C.ACCENT, spacing: 8, bottom: rule, pad: 60, keepNext: true, ...o });

// generic data table. rows: arrays, or {phase:'text'} for a full-width band
function table(headers, widths, rows, o = {}) {
  const total = widths.reduce((a, b) => a + b, 0);
  let stripe = 0;
  const keep = o.keepTogether !== false; // keep the whole table on one page, with its heading
  const body = rows.map((row, ri) => {
    const next = rows[ri + 1];
    // keepTogether: whole table on one page. keepBlocks: only break before a phase band.
    const kn = o.keepBlocks ? !!(next && !next.phase) || !!(row && row.phase) : keep ? ri < rows.length - 1 : !!(row && row.phase);
    if (row && row.phase) {
      stripe = 0;
      return new TableRow({ cantSplit: true, children: [cell(row.phase, total, { span: widths.length, bold: true, color: C.WHITE, fill: C.ACCENT, size: 16, spacing: 20, pad: 60, bottom: none, keepNext: true })] });
    }
    const fill = stripe++ % 2 === 0 ? C.STRIPE : undefined;
    return new TableRow({ cantSplit: true, height: o.rowHeight ? { value: o.rowHeight, rule: HeightRule.ATLEAST } : undefined,
      children: row.map((t, i) => cell(t, widths[i], { fill, bold: o.boldFirst !== false && i === 0 && !o.numFirst ? true : undefined,
        color: o.numFirst && i === 0 ? C.ACCENT : undefined, align: o.center && o.center.includes(i) ? AlignmentType.CENTER : undefined,
        size: o.size, pad: o.pad, keepNext: kn, ...(o.numFirst && i === 0 ? { bold: true, align: AlignmentType.CENTER } : {}) })) });
  });
  return new Table({ width: { size: total, type: WidthType.DXA }, columnWidths: widths,
    rows: [new TableRow({ tableHeader: true, cantSplit: true, children: headers.map((h, i) => hcell(h, widths[i], { align: o.center && o.center.includes(i) ? AlignmentType.CENTER : undefined })) }), ...body] });
}

// A section that can never break across pages: heading + its content inside one unsplittable table row.
// If it does not fit in the space left, the whole block moves to the next page.
function section(num, title, children, o = {}) {
  return [new Table({ width: { size: W, type: WidthType.DXA }, columnWidths: [W],
    borders: { top: none, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none },
    rows: [new TableRow({ cantSplit: true, children: [new TableCell({ width: { size: W, type: WidthType.DXA },
      margins: { top: 0, bottom: 0, left: 0, right: 0 }, borders: { top: none, bottom: none, left: none, right: none },
      children: [head(num, title, false, true), ...children] })] })] }),
    // a real paragraph between blocks stops Word/LibreOffice merging neighbouring tables into one
    gap(o.after ?? 380)];
}

// label/value grid (doc control, when). items: [[label, value]], cols per row
function grid(items, cols = 3) {
  const w = Math.floor(W / cols), widths = Array.from({ length: cols }, (_, i) => i === cols - 1 ? W - w * (cols - 1) : w);
  const rows = [];
  for (let i = 0; i < items.length; i += cols) {
    const slice = items.slice(i, i + cols);
    while (slice.length < cols) slice.push(['', '']);
    rows.push(new TableRow({ cantSplit: true, children: slice.map(([k, v], j) => new TableCell({ width: { size: widths[j], type: WidthType.DXA },
      margins: { top: 90, bottom: 90, left: 120, right: 120 }, borders: { top: hair, bottom: hair, left: none, right: none },
      children: [new Paragraph({ keepNext: true, spacing: { after: 40 }, children: runs(k.toUpperCase(), { size: 14, bold: true, color: C.ACCENT, spacing: 20 }) }),
        new Paragraph({ keepNext: i + cols < items.length, keepLines: true, spacing: { after: 0, line: 264 }, children: runs(v, { bold: true, size: 19 }) })] })) }));
  }
  return new Table({ width: { size: W, type: WidthType.DXA }, columnWidths: widths, rows });
}

// callout box with a coloured left bar; items: [[TAG, text], ...] each its own paragraph
function callout(items, bar = C.ACCENT, o = {}) {
  const b = { style: BorderStyle.SINGLE, size: 4, color: C.HAIR };
  return new Table({ width: { size: W, type: WidthType.DXA }, columnWidths: [W], rows: [new TableRow({ cantSplit: true, children: [new TableCell({
    width: { size: W, type: WidthType.DXA }, margins: { top: 150, bottom: 150, left: 220, right: 220 },
    borders: { top: b, bottom: b, right: b, left: { style: BorderStyle.SINGLE, size: 30, color: bar } },
    shading: { type: ShadingType.CLEAR, color: 'auto', fill: C.PANEL },
    children: items.map(([tag, text], i) => new Paragraph({ keepLines: true, keepNext: i < items.length - 1, spacing: { after: i === items.length - 1 ? 0 : 120, line: 288 }, children: [
      new TextRun({ text: tag.toUpperCase() + '   ', font: FONT, size: 16, bold: true, color: C.ACCENT, characterSpacing: 30 }), ...runs(text, o)] })) })] })] });
}

// bullets with optional bold lead: [lead, text] or text
const bullet = (item, i, arr) => {
  const [lead, text] = Array.isArray(item) ? item : [null, item];
  return new Paragraph({ numbering: { reference: 'bul', level: 0 }, keepLines: true, keepNext: !!arr && i < arr.length - 1, spacing: { after: 110, line: 284 },
    children: [...(lead ? [new TextRun({ text: lead + '  ', font: FONT, size: BODY, bold: true, color: C.FOREST })] : []), ...runs(text)] });
};

const titleBlock = (title, sub, size = 40, pageBreak = false) => [
  new Paragraph({ pageBreakBefore: pageBreak, keepNext: true, spacing: { before: 160, after: 0 }, children: [new TextRun({ text: title[0], font: FONT, size, bold: true, allCaps: true, color: C.FOREST })] }),
  ...(title[1] ? [new Paragraph({ keepNext: true, spacing: { after: 0 }, children: [new TextRun({ text: title[1], font: FONT, size, bold: true, allCaps: true, color: C.FOREST })] })] : []),
  new Paragraph({ spacing: { before: 140, after: 300 }, border: { bottom: { style: BorderStyle.SINGLE, size: 14, color: C.ACCENT, space: 8 } },
    children: [new TextRun({ text: sub, font: FONT, size: 17, bold: true, color: C.ACCENT, characterSpacing: 50 })] }),
];

const bgImage = (file) => new ImageRun({ type: 'png', data: fs.readFileSync(file), transformation: { width: 794, height: 1123 },
  floating: { horizontalPosition: { relative: HorizontalPositionRelativeFrom.PAGE, offset: 0 },
    verticalPosition: { relative: VerticalPositionRelativeFrom.PAGE, offset: 0 }, behindDocument: true, allowOverlap: true,
    wrap: { type: TextWrappingType.NONE } } });
const BG = path.join(__dirname);
const LOGO = path.join(BG, 'qamaria-logo-dark-green.png'); // original logo from the brand guide; 360 x 292 px, aspect locked
const logoRun = () => {
  if (!fs.existsSync(LOGO)) throw new Error('Qamaria logo file missing: ' + LOGO + '. Never draw or type a logo; get "Qamaria logo dark green.png" from the Drive folder "Qamaria Brand Assets".');
  return new ImageRun({ type: 'png', data: fs.readFileSync(LOGO), transformation: { width: 52, height: 42 } }); // 13.7 x 11.1 mm
};
const mkHeader = (file, right = 'OPERATIONS MANUAL') => new Header({ children: [new Paragraph({ spacing: { after: 0 }, children: [
  bgImage(path.join(BG, file)),
  logoRun(),
  new TextRun({ text: '      ' + right, font: FONT, size: 15, bold: true, color: C.MUTED, characterSpacing: 40 })] })] });
const mkFooter = (text) => new Footer({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { after: 0 }, children: [
  new TextRun({ text: text + '  |  Page ', font: FONT, size: 15, color: C.MUTED }),
  new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 15, color: C.MUTED }),
  new TextRun({ text: ' of ', font: FONT, size: 15, color: C.MUTED }),
  new TextRun({ children: [PageNumber.TOTAL_PAGES], font: FONT, size: 15, color: C.MUTED })] })] });

const docBase = (title) => ({ creator: 'Qamaria UK Operations', title, background: { color: C.GROUND },
  styles: { default: { document: { run: { font: FONT, size: BODY, color: C.TEXT } } } },
  numbering: { config: [{ reference: 'bul', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
    style: { run: { color: C.ACCENT, bold: true }, paragraph: { indent: { left: 360, hanging: 240 } } } }] }] } });
const PAGE = { size: { width: 11906, height: 16838 }, margin: { top: 1120, bottom: 1000, left: 1134, right: 1134, header: 520, footer: 440 } };

module.exports = { C, W, FONT, BODY, runs, P, gap, head, section, table, grid, callout, bullet, titleBlock, mkHeader, mkFooter, docBase, PAGE,
  setGapNumbers, gapText, answered, hair, none, rule, cell, hcell };
