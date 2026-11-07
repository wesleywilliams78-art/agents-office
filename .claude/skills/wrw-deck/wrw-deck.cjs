// WRW Hospitality deck builder on pptxgenjs. House layouts are defined once (cover, light, dark):
// footer, WRW chip, slide number, kicker and title placeholders. Slides only fill content.
// Usage and rules: SKILL.md beside this file.
const path = require("path");
const PPTX_DIR = process.env.PPTXGENJS_DIR || "C:/Users/Wesley/tools/pptxgenjs/node_modules/pptxgenjs";
const pptxgen = require(PPTX_DIR);
const JSZip = require(require.resolve("jszip", { paths: [PPTX_DIR] }));
const fs = require("fs");

const INK = "2A1C1A", CREAM = "F7F2EB", MUTED = "6B5D55", LINE = "E6DCCB", WHITE = "FFFFFF";
const HEAD = "Georgia", BODY = "Arial";
const COPYRIGHT = "© 2026 WRW Hospitality (Wesley Williams). Free for use in your own business. Not to be resold, rebranded or redistributed.";

const lum = (hex) => {
  const c = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
const mix = (hex, into, t) => [0, 2, 4].map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * t + parseInt(into.slice(i, i + 2), 16) * (1 - t)).toString(16).padStart(2, "0")).join("").toUpperCase();

/**
 * createDeck({ accent, footer, title, tag })
 *  accent: the one accent colour, hex without '#' (WRW red FF3131; a Franchise Entry Report uses the country's flag colour)
 *  footer: text on every content slide
 *  tag:    short text top-right of the cover, e.g. "ISSUE 04  ·  13 NOV 2026"
 */
function createDeck({ accent = "FF3131", footer = "WRW Hospitality · Wesley Williams", title = "WRW Hospitality", tag = "" } = {}) {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_WIDE"; // 13.33 x 7.5 in
  pres.theme = { headFontFace: HEAD, bodyFontFace: BODY };
  pres.title = title; pres.author = "Wesley Williams"; pres.company = "WRW Hospitality";
  const C = pres.SchemeColor;
  const H = "+mj-lt";

  // Dark slides sit on the accent only when white text stays readable on it (4.5:1); otherwise on ink.
  const darkIsAccent = contrast(accent, WHITE) >= 4.5;
  const DARK_BG = darkIsAccent ? accent : INK;
  const TINT = mix(accent, CREAM, 0.14); // light highlight on cream
  // accent1 = readable-on-cream label colour; accent2 = the bright accent (rules, badges, chart, dark backgrounds).
  // On cream the accent is used for small text, so it must pass 4.5:1 there too; if not, small labels use the ink-tinted version.
  const labelHex = contrast(accent, CREAM) >= 4.5 ? accent : mix(accent, INK, 0.62);
  const THEME_COLORS = { dk1: INK, lt1: WHITE, dk2: DARK_BG, lt2: CREAM, accent1: labelHex, accent2: accent, accent3: mix(accent, INK, 0.8), accent4: MUTED, accent5: TINT, accent6: LINE, hlink: accent, folHlink: MUTED };
  const warnings = [];
  if (!darkIsAccent) warnings.push(`accent ${accent} is too light for white text: dark slides use ink, accent used for rules and figures only`);
  if (labelHex !== accent) warnings.push(`accent ${accent} fails 4.5:1 on cream: small labels use ${labelHex}, the bright accent stays for rules, badges and charts`);

  const frame = (dark) => {
    const ink = dark ? C.background1 : C.text1;
    const kick = dark ? C.background2 : C.accent1;
    const foot = dark ? C.background2 : C.accent4;
    return [
      { placeholder: { options: { name: "kicker", type: "body", x: 0.6, y: 0.38, w: 9, h: 0.3, fontSize: 12, bold: true, color: kick, charSpacing: 3, margin: 0, valign: "top" }, text: "" } },
      { placeholder: { options: { name: "title", type: "title", x: 0.6, y: 0.72, w: 12.1, h: 1.0, fontSize: 28, bold: true, color: ink, margin: 0, valign: "top", align: "left" }, text: "" } },
      { rect: { x: 11.9, y: 0.36, w: 0.8, h: 0.34, fill: { type: "none" }, line: { color: dark ? C.background1 : C.accent1, width: 1 } } },
      { text: { text: "WRW", options: { x: 11.9, y: 0.36, w: 0.8, h: 0.34, align: "center", valign: "middle", fontSize: 11, bold: true, color: ink, margin: 0 } } },
      { text: { text: footer, options: { x: 0.6, y: 7.02, w: 9, h: 0.28, fontSize: 10, color: foot, margin: 0, valign: "middle" } } },
    ];
  };
  const num = (dark) => ({ x: 11.7, y: 7.02, w: 1.0, h: 0.28, fontSize: 10, color: dark ? C.background2 : C.accent4, align: "right" });
  pres.defineSlideMaster({ title: "WRW_LIGHT", background: { color: C.background2 }, objects: frame(false), slideNumber: num(false) });
  pres.defineSlideMaster({ title: "WRW_DARK", background: { color: darkIsAccent ? C.accent2 : C.text1 }, objects: frame(true), slideNumber: num(true) });
  pres.defineSlideMaster({
    title: "WRW_COVER", background: { color: darkIsAccent ? C.accent2 : C.text1 },
    objects: [
      { rect: { x: 0.6, y: 0.5, w: 0.95, h: 0.42, fill: { type: "none" }, line: { color: C.background1, width: 1.25 } } },
      { text: { text: "WRW", options: { x: 0.6, y: 0.5, w: 0.95, h: 0.42, align: "center", valign: "middle", fontSize: 14, bold: true, color: C.background1, margin: 0 } } },
      { text: { text: tag, options: { x: 8.7, y: 0.5, w: 4.0, h: 0.42, align: "right", valign: "middle", fontSize: 12, bold: true, charSpacing: 3, color: C.background1, margin: 0 } } },
      { text: { text: footer, options: { x: 0.6, y: 7.02, w: 9, h: 0.28, fontSize: 10, color: C.background2, margin: 0, valign: "middle" } } },
    ],
  });

  // ---------- helpers ----------
  const T = (s, text, o) => s.addText(text, Object.assign({ isTextBox: true, margin: 0, valign: "top", fontFace: BODY }, o));
  const card = (s, x, y, w, h, name, fill) => s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.1, fill: { color: fill || C.background1 }, line: { color: C.accent6, width: 0.75 }, objectName: name });
  const label = (s, text, x, y, w, name, dark) => T(s, text, { x, y, w, h: 0.25, fontSize: 11, bold: true, charSpacing: 2, color: dark ? C.background2 : C.accent1, objectName: name });

  let sectionOpen = null;
  const section = (name) => { if (name && name !== sectionOpen) { pres.addSection({ title: name }); sectionOpen = name; } };
  const content = (master, sec, kicker, heading, notes) => {
    section(sec);
    const s = pres.addSlide({ masterName: master, sectionTitle: sec });
    s.addText(kicker, { placeholder: "kicker" });
    s.addText(heading, { placeholder: "title" });
    if (notes) s.addNotes(notes);
    return s;
  };

  const api = {
    pres, C, H, T, card, label, warnings, colors: { INK, CREAM, MUTED, LINE, TINT, accent, labelHex },
    light: (sec, kicker, heading, notes) => content("WRW_LIGHT", sec, kicker, heading, notes),
    dark: (sec, kicker, heading, notes) => content("WRW_DARK", sec, kicker, heading, notes),

    /** Cover: big title, subtitle, a note line and two decorative wave lines. */
    cover({ kicker, title: t, subtitle, note, notes }) {
      section("Opening");
      const s = pres.addSlide({ masterName: "WRW_COVER", sectionTitle: "Opening" });
      const wave = (y0, amp, name) => s.addShape(pres.shapes.CUSTOM_GEOMETRY, {
        x: 0, y: 5.4, w: 13.33, h: 1.5, objectName: name, line: { color: darkIsAccent ? C.background1 : C.accent2, width: 2 }, fill: { type: "none" },
        points: [
          { x: 0, y: y0, moveTo: true },
          { x: 4.5, y: y0 - amp, curve: { type: "cubic", x1: 1.5, y1: y0 + amp * 0.2, x2: 3, y2: y0 - amp } },
          { x: 8.8, y: y0 + amp * 0.2, curve: { type: "cubic", x1: 6, y1: y0 - amp, x2: 7.2, y2: y0 + amp } },
          { x: 13.33, y: y0 - amp * 0.3, curve: { type: "cubic", x1: 10.5, y1: y0 - amp * 0.4, x2: 12, y2: y0 + amp * 0.3 } },
        ],
      });
      wave(1.1, 0.9, "Wave A"); wave(1.3, 0.55, "Wave B");
      T(s, kicker, { x: 0.6, y: 1.55, w: 9, h: 0.3, fontSize: 12, bold: true, charSpacing: 4, color: C.background1, objectName: "Cover kicker" });
      T(s, t, { x: 0.6, y: 1.9, w: 9, h: 1.7, fontSize: 96, bold: true, fontFace: H, color: C.background1, objectName: "Cover title" });
      T(s, subtitle, { x: 0.6, y: 3.75, w: 7.2, h: 0.9, fontSize: 22, fontFace: H, color: C.background1, objectName: "Cover subtitle" });
      if (note) T(s, note, { x: 0.6, y: 4.75, w: 9, h: 0.6, fontSize: 14, color: C.background2, objectName: "Cover note" });
      if (notes) s.addNotes(notes);
      return s;
    },

    /** The verdict or any one bold statement on a dark slide: 26 pt Georgia, up to four lines. */
    statement(s, text, { y = 1.95, h = 1.9 } = {}) {
      T(s, text, { x: 0.6, y, w: 11.2, h, fontSize: 26, bold: true, fontFace: H, color: C.background1, objectName: "Statement" });
    },

    /** Row of big figures with a rule above each. stats = [[figure, caption], ...] (2 to 3). */
    stats(s, stats, { y = 4.45, dark = true } = {}) {
      const n = stats.length, gap = 0.4, w = (12.1 - gap * (n - 1)) / n;
      stats.forEach(([fig, cap], i) => {
        const x = 0.6 + i * (w + gap);
        s.addShape(pres.shapes.LINE, { x, y, w, h: 0, line: { color: dark && darkIsAccent ? C.background1 : C.accent2, width: 1 }, objectName: "Stat rule " + (i + 1) });
        T(s, fig, { x, y: y + 0.15, w, h: 1.0, fontSize: 54, bold: true, fontFace: H, color: dark ? C.background1 : C.accent2, objectName: "Stat figure " + (i + 1) });
        T(s, cap, { x, y: y + 1.25, w: w - 0.1, h: 0.9, fontSize: 14, color: dark ? C.background2 : C.text1, objectName: "Stat caption " + (i + 1) });
      });
    },

    /** Grid of cards: [label, value, note]. cols default 3. */
    cardGrid(s, cards, { cols = 3, y = 1.85, h = 2.0, gx = 0.2, gy = 0.15, valueSize = 26 } = {}) {
      const w = (12.1 - gx * (cols - 1)) / cols;
      cards.forEach((c, i) => {
        const x = 0.6 + (i % cols) * (w + gx), yy = y + Math.floor(i / cols) * (h + gy);
        card(s, x, yy, w, h, "Card " + (i + 1));
        label(s, c[0], x + 0.2, yy + 0.15, w - 0.4, "Card label " + (i + 1));
        T(s, c[1], { x: x + 0.2, y: yy + 0.42, w: w - 0.4, h: 0.55, fontSize: valueSize, bold: true, fontFace: H, color: C.text1, objectName: "Card value " + (i + 1) });
        T(s, c[2], { x: x + 0.2, y: yy + 1.0, w: w - 0.4, h: h - 1.05, fontSize: 12, color: C.accent4, objectName: "Card note " + (i + 1) });
      });
    },

    /** Accent band with a bold lead-in and a sentence. */
    band(s, lead, text, { y = 6.15, h = 0.72 } = {}) {
      s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.6, y, w: 12.1, h, rectRadius: 0.1, fill: { color: DARK_BG }, line: { color: DARK_BG, width: 0.5 }, objectName: "Band" });
      T(s, [{ text: lead + "  ", options: { bold: true, fontFace: H } }, { text }], { x: 0.85, y, w: 11.6, h, fontSize: 13, color: C.background1, valign: "middle", objectName: "Band text" });
    },

    /** Numbered rows in two columns (5 per column). items = [text, ...]. */
    steps(s, items, { y = 1.85, perCol = 5 } = {}) {
      items.forEach((m, i) => {
        const col = Math.floor(i / perCol), row = i % perCol;
        const x = 0.6 + col * 6.2, yy = y + row * 0.99;
        card(s, x, yy, 5.9, 0.88, "Step card " + (i + 1));
        s.addShape(pres.shapes.OVAL, { x: x + 0.17, y: yy + 0.19, w: 0.5, h: 0.5, fill: { color: C.accent2 }, line: { color: C.accent2, width: 0.5 }, objectName: "Step badge " + (i + 1) });
        T(s, String(i + 1), { x: x + 0.17, y: yy + 0.19, w: 0.5, h: 0.5, fontSize: 15, bold: true, color: C.background1, align: "center", valign: "middle", objectName: "Step number " + (i + 1) });
        T(s, m, { x: x + 0.85, y: yy + 0.05, w: 4.9, h: 0.78, fontSize: 14, color: C.text1, valign: "middle", objectName: "Step text " + (i + 1) });
      });
    },

    /** Native horizontal bar chart inside a card. data = { labels: [], values: [] }. */
    barChart(s, { x, y, w, h, title: ct, name = "Series", labels, values, format = "0.0", max, color = accent }) {
      card(s, x, y, w, h, "Chart card");
      s.addChart(pres.charts.BAR, [{ name, labels, values }], {
        x: x + 0.15, y: y + 0.1, w: w - 0.3, h: h - 0.2, barDir: "bar", catAxisOrientation: "maxMin", valAxisHidden: true, valAxisMinVal: 0,
        valAxisMaxVal: max || Math.ceil(Math.max(...values) * 1.2), chartColors: [color], barGapWidthPct: 45, showLegend: false,
        showTitle: !!ct, title: ct || "", titleFontSize: 13, titleColor: INK, titleFontFace: "+mn-lt",
        showValue: true, dataLabelPosition: "outEnd", dataLabelFormatCode: format, dataLabelFontSize: 12, dataLabelColor: INK, dataLabelFontFace: "+mn-lt",
        catAxisLabelColor: INK, catAxisLabelFontSize: 12, catAxisLabelFontFace: "+mn-lt", valGridLine: { style: "none" }, catGridLine: { style: "none" },
      });
    },

    /** Native table. header = [..]; rows = [[..]]; opts: x,y,w,colW,rowH, highlight(row)->bool, align per column. */
    table(s, { header, rows, x = 0.6, y = 2.05, w = 12.1, colW, rowH = 0.39, headH = 0.4, fontSize = 13, highlight = () => false, align = [], bold0 = true }) {
      const hdr = header.map((t, j) => ({ text: t, options: { bold: true, color: C.background1, fill: { color: darkIsAccent ? C.accent2 : C.text1 }, fontSize: 11, charSpacing: 1, align: align[j] || "left" } }));
      const body = rows.map((r, i) => r.map((t, j) => {
        const hl = highlight(r);
        const o = { fontSize, color: C.text1, fill: { color: hl ? C.accent5 : i % 2 ? C.background2 : C.background1 }, align: align[j] || "left" };
        if (j === 0 && bold0) o.bold = true;
        return { text: t, options: o };
      }));
      s.addTable([hdr, ...body], { x, y, w, colW, rowH: [headH, ...rows.map(() => rowH)], valign: "middle", border: { type: "solid", pt: 0.5, color: LINE }, margin: [0.03, 0.12, 0.03, 0.12], objectName: "Table" });
    },

    /** Small source or footnote line, 10 pt. */
    source(s, text, y = 6.62) { T(s, text, { x: 0.6, y, w: 12.1, h: 0.3, fontSize: 10, color: C.accent4, objectName: "Source line" }); },

    /** Last slide: closing statement on the dark layout, with the house copyright line. */
    close({ kicker = "CLOSING", heading, quote, by, points = [], cta, extra = "", notes }) {
      const s = api.dark("Close", kicker, heading, notes);
      T(s, quote, { x: 0.6, y: 1.95, w: 10.5, h: 1.5, fontSize: 28, bold: true, fontFace: H, color: C.background1, objectName: "Closing quote" });
      if (by) T(s, by, { x: 0.6, y: 3.45, w: 8, h: 0.35, fontSize: 14, color: C.background2, objectName: "Quote attribution" });
      points.forEach(([head, text], i) => {
        const x = 0.6 + i * 4.1;
        s.addShape(pres.shapes.LINE, { x, y: 4.2, w: 3.7, h: 0, line: { color: darkIsAccent ? C.background1 : C.accent2, width: 1 }, objectName: "Closing rule " + (i + 1) });
        T(s, head, { x, y: 4.32, w: 3.7, h: 0.5, fontSize: 24, bold: true, fontFace: H, color: C.background1, objectName: "Closing head " + (i + 1) });
        T(s, text, { x, y: 4.85, w: 3.6, h: 0.7, fontSize: 14, color: C.background2, objectName: "Closing text " + (i + 1) });
      });
      if (cta) T(s, cta, { x: 0.6, y: 5.75, w: 10.5, h: 0.4, fontSize: 14, bold: true, color: C.background1, objectName: "Call to action" });
      T(s, (COPYRIGHT + " " + extra).trim(), { x: 0.6, y: 6.4, w: 12.1, h: 0.45, fontSize: 11, color: C.background2, objectName: "Copyright" });
      return s;
    },

    /** Write the file, then set the .pptx theme colours so PowerPoint's colour picker shows the house palette. */
    async save(file) {
      await pres.writeFile({ fileName: file });
      const zip = await JSZip.loadAsync(fs.readFileSync(file));
      const f = zip.file("ppt/theme/theme1.xml");
      let xml = await f.async("string");
      const scheme = `<a:clrScheme name="WRW">${Object.entries(THEME_COLORS).map(([k, v]) => `<a:${k}><a:srgbClr val="${v}"/></a:${k}>`).join("")}</a:clrScheme>`;
      xml = xml.replace(/<a:clrScheme[\s\S]*?<\/a:clrScheme>/, scheme);
      zip.file("ppt/theme/theme1.xml", xml);
      fs.writeFileSync(file, await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }));
      warnings.forEach((w) => console.warn("wrw-deck:", w));
      return path.resolve(file);
    },
  };
  return api;
}

module.exports = { createDeck, COPYRIGHT, contrast };
