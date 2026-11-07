// Smallest complete deck: every helper once. Run from a short scratch folder:
//   node example.cjs out.pptx [accentHex]
// Copy this file, replace the content, keep the helpers. Every figure below is a placeholder.
const { createDeck } = require("./wrw-deck.cjs");
const out = process.argv[2] || "example.pptx";
const accent = process.argv[3] || "FF3131";

const d = createDeck({ accent, footer: "WRW Hospitality · Wesley Williams · Example deck", title: "Example deck", tag: "EXAMPLE  ·  NOV 2026" });
const { T, card, C } = d;

d.cover({ kicker: "EXAMPLE DECK  ·  BRIEFING", title: "Title", subtitle: "One sentence on what this deck is for.", note: "Who it is for and what it draws on.", notes: "Speaker note: say what the deck is for." });

const v = d.dark("Opening", "THE VERDICT", "The answer first", "Speaker note: the verdict in one breath.");
T(v, "One bold statement that carries the answer, in two or three lines.", { x: 0.6, y: 1.95, w: 11.2, h: 1.9, fontSize: 26, bold: true, fontFace: d.H, color: C.background1, objectName: "Verdict statement" });
d.stats(v, [["257", "what the first figure counts"], ["14.4%", "what the second figure measures"], ["£0.58", "what the third figure costs"]]);

const g = d.light("Body", "01 · CARDS AND CHART", "A card grid and a native chart", "Speaker note: read the cards left to right.");
d.cardGrid(g, [["LABEL ONE", "Value", "A short note, two lines at most."], ["LABEL TWO", "Not found", "Say where you looked and the nearest proxy."], ["LABEL THREE", "£1 = KES 173", "Date and source in the note."]], { h: 1.7 });
d.barChart(g, { x: 0.6, y: 3.75, w: 6.0, h: 2.3, title: "A native chart", labels: ["Alpha", "Beta", "Gamma"], values: [30.5, 11.1, 3.1], format: '0.0"%"' });
d.band(g, "So what?", "The one sentence the reader should leave with.");

const t = d.light("Body", "02 · TABLE AND STEPS", "A native table and numbered steps", "Speaker note: the table first, then the steps.");
d.table(t, { header: ["NAME", "DIRECTION", "CONFIDENCE"], rows: [["Chicken", "↑ Rising", "Medium"], ["Burger", "Not found", "Thin"]], colW: [5, 4, 3.1], highlight: (r) => r[1].includes("Rising"), y: 1.9 });
d.steps(t, ["First move, one line.", "Second move, one line.", "Third move, one line."], { y: 3.45 });
d.source(t, "Sources: name, date [S1]; name, date [S2].");

d.close({ heading: "The close", quote: "“One line the reader can repeat.”", by: "Wesley Williams, WRW Hospitality", points: [["One", "First point."], ["Two", "Second point."], ["Three", "Third point."]], cta: "What to do next.", notes: "Speaker note: close on the quote." });

d.save(out).then((p) => console.log("written", p));
