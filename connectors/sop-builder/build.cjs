// Builds the Word files for one SOP. usage: node build.cjs <job.json>
// job.json: { brand, content, outDir, base, formats: ['full','onepager'], bgFirst, bgInner }
const fs = require('fs');
const path = require('path');
const { Document, Packer } = require('docx');
const { BRANDS } = require('./brands.cjs');
const makeLib = require('./lib.cjs');

const job = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const B = BRANDS[job.brand]; if (!B) throw new Error('unknown brand ' + job.brand);
const L = makeLib(B); const { C, W } = L; const c = job.content, m = c.meta;
const page = { size: { width: 11906, height: 16838 } };

function full() {
  const children = [
    ...L.titleBlock(c),
    L.callout('PURPOSE', c.purpose, C.ACCENT), L.gap(360),
    L.metaTable([['Category', m.category], ['Section', m.section], ['Applies to', m.appliesTo], ['Owner', m.owner], ['Status', m.status], ['Reporting owner', m.reportingOwner]]),
    L.h1('How to use this SOP'), L.para(c.howToUse),
    L.h1('1. Introduction'), ...c.intro.map(t => L.para(t)), L.note(c.introNote),
    L.h1('2. Minimum Operating Standards', true), L.para(c.standards.intro),
    L.dataTable(['Standard', 'Requirement'], [2900, W - 2900], c.standards.rows), L.gap(360),
    L.callout('KEY RULE', c.standards.keyRule, C.CREAM),
    L.h1('3. Roles & Responsibilities'), L.para(c.roles.intro),
    L.dataTable(['Activity', 'Owner', 'Can Reassign', 'Escalation Contact'], [2500, 2700, 2000, 2438], c.roles.rows),
    L.label(c.roles.procedureLabel), ...c.roles.procedure.map(t => L.numbered('n1', t)), L.note(c.roles.procedureNote),
    L.h1('4. Measure, Analyse, Improve', true), L.para(c.metrics.intro),
    L.dataTable(['Metric', 'Type', 'Review Cadence'], [4400, 2400, W - 6800], c.metrics.rows), L.gap(360),
    L.callout('REVIEW OWNER', c.metrics.reviewOwner, C.ACCENT),
    L.h1('5. Tools & Resources'), L.label(c.tools.howLabel), ...c.tools.steps.map(t => L.numbered('n2', t)),
    L.label('Related resources.'), ...c.tools.resources.map(L.bullet),
  ];
  return new Document({ ...L.docBase(c.title.join(' ')),
    sections: [{ properties: { titlePage: true, page: { ...page, margin: { top: 1500, bottom: 1300, left: 1134, right: 1134, header: 600, footer: 560 } } },
      headers: { first: L.mkHeader(job.bgFirst), default: L.mkHeader(job.bgInner) },
      footers: { first: L.mkFooter(c.shortTitle + ' SOP'), default: L.mkFooter(c.shortTitle + ' SOP') }, children }] });
}

function onepager() {
  const op = c.onepager;
  const children = [
    ...L.titleBlock(c, 52, 'STANDARD OPERATING PROCEDURE  |  ONE-PAGER'),
    L.callout('PURPOSE', op.purpose, C.ACCENT, 130), L.gap(180),
    L.strip([['Owner', m.owner], ['Status', m.status], ['Applies to', m.appliesTo]]),
    L.section('The non-negotiables'),
    L.dataTable(['Standard', 'Requirement'], [2900, W - 2900], op.standards, 85), L.gap(200),
    L.callout('KEY RULE', op.keyRule, C.CREAM, 130),
    L.section('Who owns what'),
    L.dataTable(['Activity', 'Owner', 'Escalate to'], [3600, 3000, W - 6600], op.roles, 85),
    L.section('How it works'), ...op.steps.map(t => L.numbered('n1', t, 90)),
    L.section('How we know it is working'),
    L.strip(op.metrics.map(([metric, cadence]) => [cadence, metric])),
  ];
  return new Document({ ...L.docBase(c.title.join(' ')),
    sections: [{ properties: { page: { ...page, margin: { top: 1300, bottom: 1000, left: 1134, right: 1134, header: 600, footer: 500 } } },
      headers: { default: L.mkHeader(job.bgFirst) }, footers: { default: L.mkFooter(c.shortTitle + ' one-pager  |  Full SOP: ' + op.fullSopRef) }, children }] });
}

(async () => {
  const made = [];
  for (const f of job.formats) {
    const doc = f === 'full' ? full() : f === 'onepager' ? onepager() : null; if (!doc) continue;
    const file = path.join(job.outDir, job.base + (f === 'full' ? ' - Full SOP.docx' : ' - One Pager.docx'));
    fs.writeFileSync(file, await Packer.toBuffer(doc)); made.push(file);
  }
  console.log(JSON.stringify(made));
})().catch(e => { console.error(e.stack || e); process.exit(1); });
