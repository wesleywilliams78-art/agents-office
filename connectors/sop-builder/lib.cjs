// Shared styling for the dark SOP Word documents, taken from the SOP skills and made brand-aware: makeLib(brand) returns the helpers.
const fs = require('fs');
const {
  Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle, AlignmentType,
  Header, Footer, PageNumber, LevelFormat, HeadingLevel, ImageRun,
  HorizontalPositionRelativeFrom, VerticalPositionRelativeFrom, TextWrappingType
} = require('docx');

module.exports = function makeLib(B) {
  const C = { ...B.c, CREAM: B.c.SECOND, WHITE: 'FFFFFF' };
  const FONT = 'Calibri', W = 9638; // A4, 2cm side margins

  const r = (text, o = {}) => new TextRun({ text, font: FONT, size: 21, color: C.TEXT, ...o });
  const para = (runs, o = {}) => new Paragraph({ spacing: { after: 220, line: 306 }, ...o, children: Array.isArray(runs) ? runs : [r(runs)] });
  const h1 = (text, pageBreak = false) => {
    const i = text.indexOf('. ');
    const numbered = i > 0 && i < 3 && !isNaN(Number(text.slice(0, i)));
    const runs = numbered
      ? [new TextRun({ text: text.slice(0, i) + '  ', font: FONT, size: 28, bold: true, color: C.ACCENT }),
         new TextRun({ text: text.slice(i + 2), font: FONT, size: 34, bold: true, color: C.WHITE })]
      : [new TextRun({ text, font: FONT, size: 34, bold: true, color: C.WHITE })];
    return new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: pageBreak, keepNext: true, spacing: { before: 400, after: 190 }, children: runs });
  };
  const label = t => para([r(t, { bold: true, color: C.ACCENT })], { spacing: { before: 280, after: 150 }, keepNext: true });
  const section = t => para([r(t.toUpperCase(), { bold: true, size: 18, color: C.ACCENT, characterSpacing: 40 })], { spacing: { before: 250, after: 120 }, keepNext: true });
  const note = t => para([r(t, { italics: true, color: C.MUTED, size: 19 })], { spacing: { before: 180, after: 200 } });
  const gap = (n = 160) => new Paragraph({ spacing: { after: 0, before: 0, line: n, lineRule: 'exact' }, children: [] });

  const none = { style: BorderStyle.NONE, size: 0, color: C.GROUND };
  const hair = { style: BorderStyle.SINGLE, size: 4, color: C.HAIR };
  const accentRule = { style: BorderStyle.SINGLE, size: 12, color: C.ACCENT };

  const cell = (text, width, o = {}) => new TableCell({
    width: { size: width, type: WidthType.DXA }, margins: { top: o.pad || 112, bottom: o.pad || 112, left: 140, right: 140 }, verticalAlign: 'center',
    borders: { top: none, left: none, right: none, bottom: o.rule ? accentRule : hair },
    shading: o.fill ? { type: ShadingType.CLEAR, color: 'auto', fill: o.fill } : undefined,
    children: [new Paragraph({ spacing: { after: 0 }, children: [r(text, { size: o.size || 19, color: o.color || C.TEXT, bold: o.bold, characterSpacing: o.spacing || 0 })] })],
  });
  function dataTable(headers, widths, rows, pad = 112) {
    const total = widths.reduce((a, b) => a + b, 0);
    return new Table({ width: { size: total, type: WidthType.DXA }, columnWidths: widths, rows: [
      new TableRow({ tableHeader: true, cantSplit: true, children: headers.map((h, i) => cell(h.toUpperCase(), widths[i], { color: C.ACCENT, bold: true, size: 17, spacing: 24, rule: true, pad })) }),
      ...rows.map((row, ri) => new TableRow({ cantSplit: true, children: row.map((t, i) => cell(t, widths[i], { fill: ri % 2 === 0 ? C.STRIPE : undefined, bold: i === 0, pad })) })),
    ] });
  }
  function metaTable(rows) {
    const widths = [2300, W - 2300];
    return new Table({ width: { size: W, type: WidthType.DXA }, columnWidths: widths, rows: rows.map(([k, v]) => new TableRow({ cantSplit: true,
      children: [cell(k.toUpperCase(), widths[0], { color: C.ACCENT, bold: true, size: 17, spacing: 24 }), cell(v, widths[1], { bold: true, size: 20 })] })) });
  }
  function strip(items) {
    const w = Math.floor(W / items.length);
    const widths = items.map((_, i) => (i === items.length - 1 ? W - w * (items.length - 1) : w));
    return new Table({ width: { size: W, type: WidthType.DXA }, columnWidths: widths, rows: [new TableRow({ cantSplit: true, children: items.map(([k, v], i) =>
      new TableCell({ width: { size: widths[i], type: WidthType.DXA }, margins: { top: 120, bottom: 120, left: 140, right: 140 },
        borders: { top: hair, left: none, right: none, bottom: hair },
        children: [
          new Paragraph({ spacing: { after: 20 }, children: [r(k.toUpperCase(), { bold: true, size: 16, color: C.ACCENT, characterSpacing: 24 })] }),
          new Paragraph({ spacing: { after: 0 }, children: [r(v, { bold: true, size: 19 })] })] })) })] });
  }
  function callout(tag, text, bar, pad = 160) {
    const b = { style: BorderStyle.SINGLE, size: 4, color: C.HAIR };
    return new Table({ width: { size: W, type: WidthType.DXA }, columnWidths: [W], rows: [new TableRow({ cantSplit: true, children: [new TableCell({
      width: { size: W, type: WidthType.DXA }, margins: { top: pad, bottom: pad, left: 200, right: 200 },
      borders: { top: b, bottom: b, left: { style: BorderStyle.SINGLE, size: 36, color: bar }, right: b },
      shading: { type: ShadingType.CLEAR, color: 'auto', fill: C.PANEL },
      children: [new Paragraph({ spacing: { after: 0, line: 304 }, children: [r(tag + '  ', { bold: true, size: 18, color: bar, characterSpacing: 30 }), r(text, { size: 19 })] })],
    })] })] });
  }
  const numbered = (ref, t, after = 160) => new Paragraph({ numbering: { reference: ref, level: 0 }, spacing: { after, line: 308 }, children: [r(t)] });
  const bullet = t => new Paragraph({ numbering: { reference: 'bul', level: 0 }, spacing: { after: 120, line: 308 }, children: [r(t)] });
  const numCfg = ref => ({ reference: ref, levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT,
    style: { run: { font: FONT, size: 21, color: C.ACCENT, bold: true }, paragraph: { indent: { left: 720, hanging: 360 } } } }] });

  const titleBlock = (c, size = 60, subtitle = 'STANDARD OPERATING PROCEDURE') => [
    new Paragraph({ spacing: { before: 300, after: 40 }, children: [new TextRun({ text: c.title[0], font: FONT, size, bold: true, allCaps: true, color: C.WHITE })] }),
    new Paragraph({ spacing: { after: 220 }, children: [new TextRun({ text: c.title[1] || '', font: FONT, size, bold: true, allCaps: true, color: C.WHITE })] }),
    new Paragraph({ spacing: { after: 280 }, border: { bottom: { style: BorderStyle.SINGLE, size: 18, color: C.ACCENT, space: 8 } },
      children: [new TextRun({ text: subtitle, font: FONT, size: 20, color: C.ACCENT, bold: true, characterSpacing: 60 })] }),
  ];

  const bgImage = file => new ImageRun({ type: 'png', data: fs.readFileSync(file), transformation: { width: 794, height: 1123 },
    floating: { horizontalPosition: { relative: HorizontalPositionRelativeFrom.PAGE, offset: 0 }, verticalPosition: { relative: VerticalPositionRelativeFrom.PAGE, offset: 0 },
      behindDocument: true, allowOverlap: true, wrap: { type: TextWrappingType.NONE } } });
  const mkHeader = file => new Header({ children: [new Paragraph({ spacing: { after: 0 }, children: [
    bgImage(file),
    new TextRun({ text: B.wordmark, font: FONT, size: 38, bold: true, italics: true, color: C.ACCENT }),
    new TextRun({ text: '   |   ', font: FONT, size: 16, color: C.HAIR }),
    new TextRun({ text: B.headerRest, font: FONT, size: 16, bold: true, color: C.MUTED, characterSpacing: 40 })] })] });
  const mkFooter = text => new Footer({ children: [new Paragraph({ style: 'FooterText', alignment: AlignmentType.RIGHT, spacing: { after: 0 },
    children: [new TextRun({ text: text + '  |  Page ', font: FONT, size: 16, color: C.MUTED }), new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 16, color: C.MUTED })] })] });

  const docBase = title => ({ creator: B.creator, title: title.split('[').join('').split(']').join(''),
    background: { color: C.GROUND },
    styles: { default: { document: { run: { font: FONT, size: 21, color: C.TEXT } } },
      paragraphStyles: [{ id: 'FooterText', name: 'Footer Text', basedOn: 'Normal', run: { font: FONT, size: 16, color: C.MUTED } },
        { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: FONT, size: 34, bold: true, color: C.WHITE },
          paragraph: { spacing: { before: 400, after: 190 }, outlineLevel: 0 } }] },
    numbering: { config: [numCfg('n1'), numCfg('n2'), { reference: 'bul', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•',
      alignment: AlignmentType.LEFT, style: { run: { color: C.ACCENT, bold: true }, paragraph: { indent: { left: 720, hanging: 360 } } } }] }] } });

  return { C, W, FONT, r, para, h1, label, section, note, gap, dataTable, metaTable, strip, callout, numbered, bullet, titleBlock, mkHeader, mkFooter, docBase };
};
