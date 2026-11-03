// Rebuilds the four WRW document templates (invoice, sales proposal, client onboarding guide, proposal letter) as editable Word
// files in the brand, and writes them into the Drive "Brand Kit/Templates" folder, which is the master copy now that Canva is retired.
//   node scripts/build-templates.mjs [outDir]
// Text in [square brackets] is a field to fill in. No bank details are stored in a template: Wesley fills them in once.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, ImageRun, Header, Footer, AlignmentType, ShadingType, PageNumber, TabStopType, convertMillimetersToTwip as mm } from 'docx';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.argv[2] || 'G:/My Drive/009 - WRW Hospitality/Brand Kit/Templates';
const INK = '201E1D', RED = 'EC3013', DEEP = 'B6240E', GREY = '4A4644', RULE = 'D6D2CF', BONE = 'F3F2F2';
const SERIF = 'Newsreader', SANS = 'Archivo';
const logo = fs.readFileSync(path.join(ROOT, 'connectors', 'video-studio', 'brand', 'logos', 'wrw-logo-red-rounded-original.png'));
const none = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const noBorders = { top: none, bottom: none, left: none, right: none };
const line = (color = RULE, size = 6) => ({ style: BorderStyle.SINGLE, size, color, space: 1 });

const run = (text, o = {}) => new TextRun({ text, font: o.serif ? SERIF : SANS, size: (o.size || 10) * 2, color: o.color || GREY, bold: o.bold, characterSpacing: o.spacing, allCaps: o.caps, italics: false });
const para = (children, o = {}) => new Paragraph({ children: Array.isArray(children) ? children : [children], spacing: { before: (o.before ?? 0) * 20, after: (o.after ?? 6) * 20, line: o.line || 300 }, alignment: o.align, border: o.border, indent: o.indent, bullet: o.bullet, numbering: o.numbering, tabStops: o.tabStops, keepNext: o.keepNext });
const label = (t, o = {}) => para(run(t, { size: 9, color: RED, bold: true, spacing: 40, caps: true }), { before: o.before ?? 14, after: o.after ?? 4, keepNext: true });
const title = (t, size = 34) => para(run(t, { serif: true, size, color: INK }), { before: 6, after: 8, line: 260 });
const body = (t, o = {}) => para(run(t, { size: 10.5, color: o.color || GREY, bold: o.bold }), { after: o.after ?? 6, ...o });
const bullet = t => new Paragraph({ children: [run(t, { size: 10.5 })], bullet: { level: 0 }, spacing: { after: 4 * 20, line: 300 } });
const rule = () => para(run(''), { after: 4, border: { bottom: line() } });
const logoPara = () => new Paragraph({ children: [new ImageRun({ data: logo, type: 'png', transformation: { width: 46, height: 46 } })], spacing: { after: 8 * 20 } });
const footer = text => new Footer({ children: [new Paragraph({ children: [run(text, { size: 8, color: '8A857D' })], tabStops: [{ type: TabStopType.RIGHT, position: mm(170) }], border: { top: line() }, spacing: { before: 120 } }), new Paragraph({ children: [run('© 2026 WRW Hospitality (Wesley Williams)', { size: 7.5, color: '8A857D' })] })] });
const cell = (children, o = {}) => new TableCell({ children: Array.isArray(children) ? children : [children], width: o.w ? { size: o.w, type: WidthType.PERCENTAGE } : undefined, borders: o.borders || { top: none, left: none, right: none, bottom: line() }, shading: o.fill ? { type: ShadingType.CLEAR, fill: o.fill, color: 'auto' } : undefined, margins: { top: 100, bottom: 100, left: 120, right: 120 }, columnSpan: o.span, verticalAlign: o.v });
const doc = (children, foot, extra = {}) => new Document({
  creator: 'Wesley Williams', title: extra.title || 'WRW Hospitality', description: 'WRW Hospitality template', styles: { default: { document: { run: { font: SANS, size: 21, color: GREY } } } },
  sections: [{ properties: { page: { margin: { top: mm(18), bottom: mm(18), left: mm(20), right: mm(20) } } }, footers: { default: footer(foot) }, children }],
});
const save = async (name, d) => { fs.mkdirSync(OUT, { recursive: true }); const f = path.join(OUT, name); fs.writeFileSync(f, await Packer.toBuffer(d)); console.log(name, fs.statSync(f).size); };

// 1. INVOICE
const lineRows = Array.from({ length: 4 }, (_, i) => new TableRow({ children: [cell(body(i === 0 ? '[Description of the work] (Qty [1] × £[0.00])' : '', { after: 0 }), { w: 62 }), cell(body(i === 0 ? '£[0.00]' : '', { after: 0, align: AlignmentType.RIGHT }), { w: 38 })] }));
await save('WRW Template - Invoice.docx', doc([
  logoPara(), title('Invoice', 40),
  body('Invoice No.: [INV000]', { bold: true, after: 2 }), body('Date: [d Month yyyy]', { bold: true, after: 2 }), body('Service period: [d Month – d Month yyyy]', { bold: true, after: 2 }), body('Due: [d Month yyyy]', { bold: true, after: 10 }),
  label('Billed to'), body('[Contact name]', { after: 2 }), body('[Company]', { after: 12 }),
  label('Line items'), new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: lineRows }),
  para(run(''), { after: 4 }),
  new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [
    new TableRow({ children: [cell(body('', { after: 0 }), { w: 50, borders: noBorders }), cell(body('Subtotal', { after: 0 }), { w: 25, borders: noBorders }), cell(body('£[0.00]', { after: 0, align: AlignmentType.RIGHT }), { w: 25, borders: noBorders })] }),
    new TableRow({ children: [cell(body('', { after: 0 }), { w: 50, borders: noBorders }), cell(para(run('TOTAL DUE', { size: 9, color: RED, bold: true, spacing: 40 }), { after: 0, before: 10 }), { w: 25, borders: { top: line(INK, 8), left: none, right: none, bottom: none } }), cell(para(run('£[0.00]', { serif: true, size: 20, color: INK }), { after: 0, align: AlignmentType.RIGHT }), { w: 25, borders: { top: line(INK, 8), left: none, right: none, bottom: none } })] }),
  ] }),
  label('Payment terms', { before: 22 }), body('Payable within 7 days of the invoice date, by bank transfer.'),
  label('Payment details', { before: 16 }), body('Account name: Wesley Williams', { after: 2 }), body('Sort code: [fill in once, then save]', { after: 2 }), body('Account no.: [fill in once, then save]', { after: 12 }),
  body('Amounts are shown in pounds as £#,###.00. Check every figure against the proposal before issue.', { color: '8A857D', size: 9 }),
], 'WRW Hospitality · Wesley Williams · Invoice', { title: 'Invoice' }));

// 2. SALES PROPOSAL
const tier = (name) => cell([para(run(name, { size: 9, bold: true, color: INK, spacing: 40 }), { after: 6 }), para(run('£[Price]', { serif: true, size: 20, color: INK }), { after: 8 }), body('[Included item]', { after: 3 }), body('[Included item]', { after: 3 }), body('[Included item]', { after: 3 })], { w: 33, borders: { top: line(RULE, 8), bottom: line(RULE, 8), left: line(RULE, 8), right: line(RULE, 8) } });
await save('WRW Template - Sales proposal.docx', doc([
  logoPara(), title('Sales Proposal', 40),
  body('Prepared for: [Client name]', { bold: true, after: 2 }), body('From: Wesley Williams, WRW Hospitality', { bold: true, after: 2 }), body('Valid until: [Date]', { bold: true, after: 8 }),
  label('What you told us'), body('[Summarise the client\'s priorities, constraints and desired outcome.]'),
  label('What we will do'), bullet('[Scope item one]'), bullet('[Scope item two]'), bullet('[Scope item three]'), bullet('[Scope item four]'),
  para(run(''), { after: 6 }), new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [new TableRow({ children: [tier('STARTER'), tier('STUDIO'), tier('PARTNER')] })] }),
  label('How it starts', { before: 18 }), body('01   [Step one]', { after: 3 }), body('02   [Step two]', { after: 3 }), body('03   [Step three]', { after: 10 }),
  label('Next step'), body('[Add the immediate next action and timing.]'), body('[CONFIRM A PACKAGE TO BEGIN]', { bold: true, color: INK }),
], 'WRW Hospitality · Sales Proposal', { title: 'Sales Proposal' }));

// 3. CLIENT ONBOARDING GUIDE
const step = (n, h, t) => [para(run(String(n), { serif: true, size: 20, color: RED }), { after: 0, before: 8 }), para(run(h, { size: 11.5, bold: true, color: INK }), { after: 2 }), body(t, { after: 6, border: { bottom: line() } })];
const when = (a, b) => new TableRow({ children: [cell(body(a, { bold: true, color: INK, after: 0 }), { w: 32, borders: { top: none, left: none, right: none, bottom: line() } }), cell(body(b, { after: 0 }), { w: 68, borders: { top: none, left: none, right: none, bottom: line() } })] });
await save('WRW Template - Client onboarding guide.docx', doc([
  logoPara(), label('Client onboarding guide', { before: 0 }), title('How we will work together', 40), body('Prepared for [Client name] / From Wesley, WRW Hospitality', { after: 2 }), body('[Date]'),
  rule(), label('01 Timeline'), title('What happens, and when', 24), body('Every engagement follows the same four steps. Dates are set with you at kick-off.'),
  ...step(1, 'Kick-off', 'Within [5] working days of signing: we agree scope, goals, and who does what.'), ...step(2, 'Discovery', 'Weeks [1 to 2]: we collect your data and walk your sites.'), ...step(3, 'Build', 'Weeks [3 to 6]: we draft the work and share it for review.'), ...step(4, 'Handover', 'Final week: we deliver, train your team, and agree support.'),
  body('Timings are a guide. The signed proposal sets the dates.', { color: '8A857D', size: 9 }),
  label('02 What we need from you', { before: 20 }), title('What we need from you', 24), bullet('One named contact who can make decisions.'), bullet('Access to your POS, accounting and rota systems, read-only where possible.'), bullet('Your latest P&L, menu, supplier list and sales mix.'), bullet('A reply to each request within [3] working days.'), bullet('Feedback on drafts within [5] working days.'),
  label('03 How we communicate', { before: 20 }), title('How we stay in touch', 24), bullet('Email for decisions and documents.'), bullet('A weekly check-in call, [30] minutes.'), bullet('A shared tracker showing status, owner and due date.'), bullet('Messaging apps for quick logistics only, not for decisions.'), bullet('Replies from us within [1] working day.'), bullet('Anything outside agreed scope is quoted before we start.'),
  label('04 What happens when', { before: 20 }), title('If something changes', 24),
  new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [when('You are waiting on us', 'Escalate by email, we reply the same working day.'), when('We are waiting on you', 'We flag it in the weekly call. After [5] working days the timeline moves.'), when('Scope grows', 'We send a written change quote. Nothing starts until you approve it.'), when('A deadline will be missed', 'We tell you as soon as we know, with a new date.'), when('Invoices', 'Invoiced as set out in your proposal. Payment terms are on the invoice.')] }),
  para(run(''), { after: 6 }),
  new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [new TableRow({ children: [cell([para(run('AFTER YOUR FIRST INVOICE', { size: 8.5, color: 'FFFFFF', spacing: 40 }), { after: 6 }), para(run('Your first invoice marks the start of the work. Use this guide as a check: confirm your named contact, your weekly call time, and the access we still need. If anything here no longer fits, tell us and we will update the plan in writing.', { size: 10.5, color: 'FFFFFF' }), { after: 0 })], { fill: INK, borders: noBorders })] })] }),
  para(run(''), { after: 4 }), body('Questions? Reply to the email this guide came with.', { size: 9.5 }),
], 'WRW Hospitality · Client Onboarding Guide', { title: 'Client Onboarding Guide' }));

// 4. PROPOSAL LETTER
const sec = (h, kids) => [rule(), label(h, { before: 8 }), ...kids];
await save('WRW Template - Proposal letter.docx', doc([
  logoPara(), body('From Wesley Williams, WRW Hospitality', { size: 9.5, after: 2 }), body('Prepared for [Name], [Company]', { size: 9.5, after: 2 }), body('[d Month yyyy]', { size: 9.5, after: 10 }),
  title('[Title of the proposal]', 34), para(run('[d Month yyyy] · Wesley', { size: 12, color: INK }), { after: 8 }),
  body('[Opening: what this is and why you are writing, drawing on your last conversation. Say what is not fixed and invite changes.]', { after: 10 }),
  ...sec('What I\'d like to help with', [body('[One-line focus.]'), bullet('[Area one]'), bullet('[Area two]'), bullet('[Area three]')]),
  ...sec('How we could work together', [bullet('[Option one: how it runs, how often]'), bullet('[Option two: a time-boxed pilot, with a start date]'), bullet('[After the pilot: the review date and what we decide]')]),
  ...sec('Working alongside others', [body('[Say how you complement their other advisers, what you will and will not advise on, and who covers what.]')]),
  ...sec('What we\'d agree together', [bullet('[Point to settle]'), bullet('[Point to settle]'), bullet('[Point to settle]'), bullet('[Confidentiality and who owns what is built]')]),
  ...sec('The commercial side', [body('[How the commercial terms will be settled and by when. Keep a simple record of time, so both sides see what the work involves before deciding.]')]),
  rule(),
], 'WRW Hospitality · [Title of the proposal]', { title: 'Proposal letter' }));
