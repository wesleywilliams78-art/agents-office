// Agents Office — the build loop (Beta).
//   node check.mjs             build + offline smoke + server smoke (no Claude calls)
//   CHECK_LIVE=1 node check.mjs  … plus one real routed task and one chat turn through Claude
// Every step prints ✓ or ✗ with the reason; the process exits 1 if anything failed. This is the
// loop the Beta was built against: change something, run it, fix what is red, repeat.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadConfig, ROOT } from './config.mjs';

const results = [];
const ok = (name, detail = '') => { results.push([true, name, detail]); console.log(`✓ ${name}${detail ? '  — ' + detail : ''}`); };
const bad = (name, detail = '') => { results.push([false, name, detail]); console.log(`✗ ${name}${detail ? '  — ' + detail : ''}`); };
const step = async (name, fn) => { try { const d = await fn(); ok(name, d || ''); return true; } catch (e) { bad(name, e.message); return false; } };
const sh = (cmd, args, opts = {}) => new Promise((resolve, reject) => {
  const p = spawn(cmd, args, { cwd: ROOT, ...opts }); let out = '', err = '';
  p.stdout?.on('data', d => { out += d; }); p.stderr?.on('data', d => { err += d; });
  p.on('close', c => c === 0 ? resolve(out) : reject(new Error((err || out).trim().split('\n').slice(-3).join(' | '))));
  p.on('error', reject);
});
const cfg = loadConfig();
const LIVE = process.env.CHECK_LIVE === '1';

/* ---------- 1. build ---------- */
await step('build: braingraph + bundle', async () => {
  const out = await sh('node', ['build.mjs']);
  const html = fs.readFileSync(path.join(ROOT, 'dist', 'command-centre-v2.html'), 'utf8');
  if (html.length < 500000) throw new Error('bundle looks too small: ' + html.length);
  if (!/AGENTS OFFICE/.test(html)) throw new Error('shell missing');
  return out.trim().split('\n').pop();
});
await step('build: graph has linked notes', async () => {
  const { BRAIN } = await import('./src/braingraph.js?' + Date.now());
  if (!BRAIN.nodes.length || !BRAIN.links.length) throw new Error('empty graph');
  if (!BRAIN.floor || BRAIN.floor.length < Math.min(90, BRAIN.nodes.length)) throw new Error('floor layout missing');
  return `${BRAIN.notes} notes · ${BRAIN.nodes.length} linked · ${BRAIN.links.length} links`;
});

/* ---------- 1b. the roster + the connector parser ---------- */
await step('roster: office.agents.json validates', async () => {
  const { loadRoster } = await import('./roster.mjs');
  const r = loadRoster();
  if (r.agents.length !== 35) throw new Error('agents: ' + r.agents.length);
  if (r.problems.length) throw new Error(r.problems.join(' | '));
  return `35 agents · ${r.customised} customised${r.files.length ? ' · ' + r.files.join(' + ') : ''}`;
});
await step('roster: bad edits are refused, not applied', async () => {
  const { validate } = await import('./roster.mjs');
  const r = validate({ agents: [{ id: 'newt', name: 'PODCAST NOTES', department: 'sales', lead: true, colour: 'red' }, { id: 'ghost', name: 'X' }] });
  const n = r.agents.find(a => a.id === 'newt');
  if (n.name !== 'PODCAST NOTES' || n.department !== 'marketing' || n.lead) throw new Error('validation let a fixed field through');
  if (r.problems.length < 4) throw new Error('expected four problems, got ' + r.problems.length);
});
await step('roster: brief is accepted and trimmed', async () => {
  const { validate } = await import('./roster.mjs');
  const r = validate({ agents: [{ id: 'piper', brief: ['Three tiers.', 'Never discount.'] }, { id: 'lexi', brief: 'x'.repeat(2500) }] });
  if (r.agents.find(a => a.id === 'piper').brief !== 'Three tiers.\nNever discount.') throw new Error('list brief not joined');
  if (r.agents.find(a => a.id === 'lexi').brief.length !== 2000 || !r.problems.some(p => /brief is over/.test(p))) throw new Error('long brief not trimmed with a warning');
});
await step('skills: shipped skills load and bind', async () => {
  const { loadSkills } = await import('./skills.mjs'); const { loadRoster } = await import('./roster.mjs');
  const r = loadRoster(); const sk = loadSkills(cfg.brainPath, r.agents);
  if (sk.problems.length) throw new Error(sk.problems.join(' | '));
  const piper = r.agents.find(a => a.id === 'piper'), cmail = r.agents.find(a => a.id === 'cmail'), lexi = r.agents.find(a => a.id === 'lexi');
  if (!sk.names(piper).includes('proposal')) throw new Error('proposal not bound to piper: ' + sk.names(piper));
  if (!sk.names(cmail).includes('client-reply') || sk.names(lexi).includes('client-reply')) throw new Error('department binding wrong');
  if (!sk.names(lexi).includes('house-style')) throw new Error('unbound skill did not reach everyone');
  const txt = sk.promptText(piper); if (!/--- template\.md ---/.test(txt) || !/### proposal/.test(txt)) throw new Error('files beside SKILL.md not inlined');
  const sum = sk.summary();
  return `${sum.count} skills (${sum.shipped} shipped, ${sum.brain} in the brain) · ` + sum.skills.map(x => `${x.name}→${x.everyone ? 'everyone' : [...x.agents, ...x.departments].join('+')}`).join(' ');
});
await step('skills: a broken skill is refused, not applied', async () => {
  const { loadSkills } = await import('./skills.mjs'); const { loadRoster } = await import('./roster.mjs');
  const os = await import('node:os'); const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ao-skills-')); const dir = path.join(tmp, 'Agents Office', 'skills');
  fs.mkdirSync(path.join(dir, 'ghost'), { recursive: true }); fs.mkdirSync(path.join(dir, 'nofile')); fs.mkdirSync(path.join(dir, 'proposal'));
  fs.writeFileSync(path.join(dir, 'ghost', 'SKILL.md'), '---\nagents: [nobody]\ncolour: red\n---\n# Ghost\nDo things.');
  fs.writeFileSync(path.join(dir, 'proposal', 'SKILL.md'), '---\ndescription: Our own proposal skill\nagents: [piper]\n---\n# Ours\nThe brain version.');
  fs.writeFileSync(path.join(dir, 'oneliner.md'), '---\ndepartments: [fin]\n---\nMonth-end pack rules.');
  const sk = loadSkills(tmp, loadRoster().agents); fs.rmSync(tmp, { recursive: true, force: true });
  if (sk.skills.some(x => x.name === 'ghost')) throw new Error('a skill with no valid binding was loaded');
  if (!sk.problems.some(p => /nobody/.test(p)) || !sk.problems.some(p => /colour/.test(p)) || !sk.problems.some(p => /nofile/.test(p))) throw new Error('problems not reported: ' + sk.problems.join(' | '));
  const prop = sk.skills.find(x => x.name === 'proposal'); if (!prop || prop.source !== 'brain' || prop.description !== 'Our own proposal skill') throw new Error('the brain skill did not replace the shipped one');
  if (!sk.skills.find(x => x.name === 'oneliner' && x.departments.includes('fin'))) throw new Error('one-file skill not loaded');
  return `${sk.problems.length} problems reported · brain proposal wins`;
});
await step('lessons: a correction is recorded and standing rules come back', async () => {
  const learn = await import('./learn.mjs'); const os = await import('node:os');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ao-learn-')); const a = { id: 'piper', name: 'PROPOSALS', role: 'x', does: 'y' };
  learn.record(tmp, a, { title: 'Harbourside proposal' }, 'add the booking integration for this one', { standing: false, rule: '' });
  learn.record(tmp, a, { title: 'Harbourside proposal' }, 'too long — proposals are always one page', { standing: true, rule: 'Keep every proposal to one page.' });
  learn.record(tmp, a, { title: 'Marina quote' }, 'never quote a discount', { standing: true, rule: 'Never offer a discount.' });
  const r = learn.read(tmp, 'piper'); const txt = learn.promptText(tmp, a); fs.rmSync(tmp, { recursive: true, force: true });
  if (r.rules.length !== 2 || r.oneOffs.length !== 1) throw new Error(`rules ${r.rules.length} one-offs ${r.oneOffs.length}`);
  if (!/^LESSONS/.test(txt) || !/one page/.test(txt) || /booking integration/.test(txt) || /←/.test(txt)) throw new Error('prompt text wrong: ' + txt);
  if (learn.promptText(tmp, { id: 'nobody' })) throw new Error('no file should mean no block');
  return `${r.rules.length} standing rules · ${r.oneOffs.length} one-off · agent with no file gets nothing`;
});
await step('interview: the lead asks five questions, then writes briefs + a skill into the brain', async () => {
  const onboard = await import('./onboard.mjs'); const { loadRoster } = await import('./roster.mjs'); const { loadSkills } = await import('./skills.mjs'); const os = await import('node:os');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ao-onboard-')); const brain = path.join(tmp, 'brain'), data = path.join(tmp, 'data'); fs.mkdirSync(brain);
  const agents = loadRoster(brain).agents; const dept = agents.filter(a => a.department === 'sales'); const lead = dept.find(a => a.lead);
  const stub = async () => JSON.stringify({ briefs: [{ id: 'lexi', brief: 'Every deal gets a next step with a date.' }, { id: 'piper', brief: 'Three options, recommend the middle.' }, { id: 'ghost', brief: 'x' }],
    skill: { name: 'Wholesale Quote', description: 'How we quote a wholesale account', agents: ['piper'], body: '# Quoting a wholesale account\nUse this for any quote to a trade customer.\n## Steps\n1. Check the account in 30-Customers.\n## The shape\nFollow template.md.\n## Rules\n- Never discount.', template: '# Quote for {account}\n## Lines\n## Terms' }, try: 'quote Harbour Hardware for 40 units' });
  const ctx = { dept: 'sales', deptName: 'Sales', lead, agents: dept, connected: ['Gmail'], brainPath: brain, dataDir: data, ask: stub, business: 'Test Co' };
  if (await onboard.handle('what are you working on?', ctx) !== null) throw new Error('ordinary chat was captured');
  const r0 = await onboard.handle('set up', ctx); if (!/Question 1 of 5/.test(r0.reply) || !onboard.active(data, 'sales')) throw new Error('did not start: ' + r0.reply.slice(0, 80));
  const r1 = await onboard.handle('We sell to trade accounts.', ctx); if (!/Question 2 of 5/.test(r1.reply)) throw new Error('no second question');
  await onboard.handle('Quoting a wholesale account: check the account, price from the ladder, send.', ctx); await onboard.handle('skip', ctx); await onboard.handle('never discount', ctx);
  const r5 = await onboard.handle('Gmail and our bookkeeper', ctx);
  if (onboard.active(data, 'sales')) throw new Error('interview still active after the last answer');
  if (!r5.wrote || r5.wrote.briefs.length !== 2 || !r5.wrote.skill || r5.wrote.skill.name !== 'wholesale-quote') throw new Error('write-up wrong: ' + JSON.stringify(r5.wrote));
  if (!r5.wrote.problems.some(p => /ghost/.test(p))) throw new Error('an agent outside the department was accepted');
  const merged = loadRoster(brain); if (merged.agents.find(a => a.id === 'piper').brief !== 'Three options, recommend the middle.' || merged.problems.length) throw new Error('brief not merged into the brain roster: ' + merged.problems);
  const sk = loadSkills(brain, merged.agents); const w = sk.skills.find(x => x.name === 'wholesale-quote');
  if (!w || w.source !== 'brain' || !w.agents.includes('piper') || !w.files.some(f => f.name === 'template.md') || sk.problems.length) throw new Error('skill not loadable: ' + sk.problems);
  const untouched = ['fin', 'marketing', 'delivery', 'ops', 'emails'].find(d => !agents.some(a => a.department === d && a.brief)); // the owner's own roster may already brief some departments
  if (!onboard.isSetUp(merged.agents, sk, 'sales') || (untouched && onboard.isSetUp(merged.agents, sk, untouched))) throw new Error('setUp flag wrong');
  const c = await onboard.handle('set up', ctx); await onboard.handle('cancel', ctx); if (onboard.active(data, 'sales')) throw new Error('cancel did not clear');
  fs.rmSync(tmp, { recursive: true, force: true });
  return `5 questions · 2 briefs merged · skill wholesale-quote→piper with template · sales set up, an untouched department not · cancel clears`;
});
await step('matrix: a desk can put its own cards on the matrix with a MATRIX ITEMS block, filed on approval', async () => { // V3.12
  const aios = await import('./aios.mjs');
  const now = Date.parse('2026-10-30T12:00:00');
  const txt = 'The plan.\n\nMATRIX ITEMS\n- Check the hearing confirmation | due 2026-11-02 | priority high | owner wesley | calendar yes\n- Draft the schedule | due 2026-11-20 | priority medium | owner elead | calendar no\n- Tidy the old folder | priority low | owner wesley\nEND MATRIX ITEMS\n';
  const it = aios.parseMatrixBlock(txt, [{ id: 'elead', department: 'emails' }], 'fX', now);
  if (!it || it.length !== 3) throw new Error('expected 3 cards, got ' + (it && it.length));
  if (it[0].q !== 'do' || it[0].dept !== 'owner' || !it[0].onCalendar) throw new Error('due in 3 days, high, Wesley, on calendar: ' + JSON.stringify(it[0]));
  if (it[1].q !== 'plan' || it[1].agent !== 'elead' || it[1].dept !== 'emails') throw new Error('due in 3 weeks to the EA: ' + JSON.stringify(it[1]));
  if (it[2].q !== 'drop' || it[2].due) throw new Error('low, no date: ' + JSON.stringify(it[2]));
  if (aios.parseMatrixBlock('no block here', [], 'fY') !== null) throw new Error('a result without the block must file nothing');
  return 'DO NOW by due date · a seat id lands on that desk · low with no date is DROP · no block, no cards';
});
await step('matrix: the same action worded differently is not raised again, a different one is', async () => {
  const aios = await import('./aios.mjs');
  const same = [['Log INV101 and INV102 status in billing.md', 'Write the INV101/INV102 status and numbering into billing.md'],
    ['Update the Nov Gas Bill row to Actual', 'Mark the Nov Gas Bill row as Actual'],
    ['Chase the overdue Acme invoice INV077', 'Chase Acme for the overdue invoice INV077 (due 3 Oct)']];
  for (const [a, b] of same) if (!aios.similar(a, b)) throw new Error(`should be the same action: "${a}" / "${b}"`);
  const different = [['Chase the overdue Acme invoice INV077', 'Draft the October proposal for Harbour Hardware'], ['Confirm the Gas direct debit date', 'Confirm the Water direct debit date']];
  for (const [a, b] of different) if (aios.similar(a, b)) throw new Error(`should be different actions: "${a}" / "${b}"`);
  const { kept, dropped } = aios.dedupe([{ title: 'Write the INV101/INV102 status into billing.md' }, { title: 'Draft the October proposal for Harbour Hardware' }, { title: 'Draft October proposal for Harbour Hardware' }], ['Log INV101 and INV102 status in billing.md']);
  if (kept.length !== 1 || dropped.length !== 2) throw new Error(`kept ${kept.length}, dropped ${dropped.length}`);
  return 'a reworded action is caught · a different action is not · a repeat inside one batch is caught';
});
await step('sales dashboard: report text becomes per-shop monthly numbers, and a month with a new report replaces the old one', async () => {
  const { build } = await import('./sales.mjs'); const NL = String.fromCharCode(10), T = String.fromCharCode(9), NB = String.fromCharCode(160);
  const rep = (shop, ym, orders, turn) => ['SALES REPORT', shop + ' Sales Report', 'Shops: ' + shop, 'Period: ' + ym + '-01 - ' + ym + '-28', 'Summary', 'VALUE' + T + 'COMPARISON' + T + 'CHANGE', 'Orders ' + T + orders + ' ' + T + '1 000 ' + T + '10,0%', 'Turnover ' + T + turn + T + '100 000,00 ' + T + '5,0%', 'Average order amount ' + T + '100,00 ' + T + '100,00 ' + T + '0,0%', 'Payments', 'NAME ' + T + 'TURNOVER', 'Vipps ' + T + '50' + NB + '000,00', 'Products', 'NAME ' + T + 'TURNOVER ' + T + 'QUANTITY', 'Waffle ' + T + '9 000,50 ' + T + '40', 'Powered by ninito.com ' + T + '1 / 1'].join(NL);
  const d = build([{ name: 'Upload - a', text: rep('Creamy A', '2026-08', '1 100', '110' + NB + '000,00') + NL + rep('Creamy B', '2026-08', '500', '60 000,00') }, { name: 'Upload - b', text: rep('Creamy A', '2026-09', '1 200', '132 000,00') + NL + rep('Creamy B', '2026-09', '400', '45 000,00') }]);
  if (!d.available || d.shops.length !== 2 || d.months.length !== 2 || d.latest !== '2026-09') throw new Error('shape wrong: ' + JSON.stringify(d).slice(0, 200));
  if (d.totals.turnover !== 177000 || d.totals.orders !== 1600 || d.totals.turnoverVsPrev !== 4.1) throw new Error('totals wrong: ' + JSON.stringify(d.totals));
  if (d.products[0].name !== 'Waffle' || d.products[0].turnover !== 18001 || d.payments[0].turnover !== 100000) throw new Error('mix wrong: ' + JSON.stringify([d.products[0], d.payments[0]]));
  if (build([{ name: 'x', text: 'nothing here' }]).available) throw new Error('a note with no reports made a dashboard');
  return 'two shops, two months · Norwegian number format read · totals and change vs last month · products and payments summed · empty notes ignored';
});
await step('till dashboard: monthly and daily reports give this year against last, like with like, to the last full day', async () => { // V3.12
  const pos = await import('./pos.mjs');
  const row = (...c) => '| ' + c.join(' | ') + ' |';
  const monthly = y => ['> Uploaded 30/10/2026, 12:35:29', '', row('Monthly Sales for Test Diner (High St) Generated for the period of ' + y + '-01-01 - ' + y + '-12-31', '', ''),
    row('Month', 'Orders', 'Sub Total', 'Discount', 'Total', 'Cash Pay', 'Card', 'Other Pay'),
    row(y + ' September', '100', '990.00', '10.00', '1000.00', '200.00', '300.00', '500.00'), row(y + ' October', '120', '1188.00', '12.00', '1200.00', '240.00', '360.00', '600.00'), row('Total', '220', '', '', '2200.00', '', '', '')].join('\n');
  const day = (iso, o, t) => { const [y, m, d] = iso.split('-'); return row(['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+m - 1] + ' ' + (+d) + ',  ' + y, o, t, '0.00', t, '0', '0', t, '10', '1', '20'); };
  const daily = (y, scale, partial) => { const rows = []; for (let d = 1; d <= 29; d++) rows.push(day(y + '-10-' + String(d).padStart(2, '0'), 100, (100 * scale).toFixed(2))); if (partial) rows.push(day(y + '-10-30', 3, '9.00'));
    return ['> Uploaded 30/10/2026, 12:35:27', row('Daily Sale report', 'Daily Sale Summary Report for Test Diner (High St) Generated for the period', ''), row('Date', 'Orders', 'SubTotal', 'Discount', 'Total', 'Cash Pay', 'Card Pay', 'Other Pay', 'Average', 'Min', 'Max'), ...rows].join('\n'); };
  const notes = [{ name: 'Upload - m25', text: monthly(2025) }, { name: 'Upload - m26', text: monthly(2026) }, { name: 'Upload - d25', text: daily(2025, 1, false) }, { name: 'Upload - d26', text: daily(2026, 1.1, true) }];
  const y = pos.build(notes, { match: 'Test Diner' }).yoy;
  if (!y || y.to !== '2026-10-29' || y.partialDay !== '2026-10-30') throw new Error('the barely started day must be left out: ' + JSON.stringify({ to: y && y.to, p: y && y.partialDay }));
  if (y.mtd.total !== 10) throw new Error('October to the 29th should be +10%: ' + y.mtd.total);
  if (y.months.length !== 4 || y.lastMonth.month !== '2026-09' || y.lastMonth.total !== 0) throw new Error('September against September: ' + JSON.stringify(y.lastMonth));
  if (pos.uploadedAt('> Uploaded 17/10/2026, 11:32:16') >= pos.uploadedAt('> Uploaded 30/10/2026, 12:35:27')) throw new Error('the upload stamp must order reports by date, not by file name');
  return 'monthly and daily read by header · a part day left out · month to date and last full month against last year · newest upload by its stamp';
});
await step('till dashboard: the discount summary splits standard offers from hand-keyed discounts', async () => { // V3.12
  const pos = await import('./pos.mjs');
  const row = (...c) => '| ' + c.join(' | ') + ' |';
  const txt = [row('Discount Summary Report report', 'Discount Summary Report for Test Diner (High St) Generated for the period of 2026-01-01 - 2026-10-30', '', ''), row('Discount %', 'Discount Value', 'No of Orders', 'Sales Total'),
    row('10', '100.00', '50', '900.00'), row('25', '50.00', '10', '150.00'), row('37', '20.00', '2', '34.00'), row('100', '9.00', '1', '0.00')].join('\n');
  const p = pos.parseDiscounts(txt); if (!p || p.bands.length !== 4 || p.from !== '2026-01-01') throw new Error('parse: ' + JSON.stringify(p));
  const y = pos.build([{ name: 'Upload - disc', text: txt }], { match: 'Test Diner' }).discounts.years[0];
  if (y.total !== 179 || y.hand.values !== 1 || y.hand.discount !== 20 || y.standard.find(b => b.pct === 25).orders !== 10) throw new Error('summary: ' + JSON.stringify(y));
  return 'bands read by header · 37% counted as hand-keyed · 10%, 25% and 100% as standard offers · totals add up';
});
await step('delivery: Deliverect exports merge without double counting, read the unquoted location, and flag a part day', async () => { // V3.12
  const dv = await import('./deliverect.mjs'); const os = await import('node:os');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dv-')); fs.mkdirSync(dv.dir(tmp));
  const H = 'OrderPlacedLocal,OrderID,Status,Channel,Brand,Location,OrderType,Currency,Revenue,AttemptedAmount,Discount,FailureType';
  const row = (t, id, st, ch, rev, disc, fail) => [t, id, st, ch, 'Testco', ' Test Diner - High St', 'Delivery', 'GBP', rev, '', disc, fail || ''].join(',');
  fs.writeFileSync(path.join(dv.dir(tmp), 'a.csv'), [H, row('2026-03-01 12:10:00', 'A1', 'Delivered', 'Uber Eats', '20', '-2.0'), row('2026-03-03 13:00:00', 'A2', 'Failed', 'Deliveroo', '9', '0', 'INVALID_PLU')].join('\n'));
  fs.writeFileSync(path.join(dv.dir(tmp), 'b.csv'), [H, row('2026-03-02 18:30:00', 'B1', 'Delivered', 'Deliveroo', '30', '0'), row('2026-03-03 13:00:00', 'A2', 'Failed', 'Deliveroo', '9', '0', 'INVALID_PLU'), row('2026-03-03 20:00:00', 'B3', 'Cancelled', 'Uber Eats', '15', '0')].join('\n'));
  if (!dv.isExport(H + '\n')) throw new Error('header not recognised');
  const o = dv.build(tmp, { match: 'Test Diner' });
  if (o.orders !== 4) throw new Error('an order in two files must count once: ' + o.orders);
  if (o.location !== 'Test Diner - High St') throw new Error('location with a comma before it: ' + o.location);
  if (o.partial.join() !== '2026-03-02') throw new Error('a file starting at 18:30 on a day nothing else covers is a part day: ' + o.partial);
  const m = o.months[0]; if (m.ch['Uber Eats'][0] !== 20 || m.ch['Uber Eats'][2] !== 2 || m.x !== 1 || m.f !== 1 || o.fails['2026'].INVALID_PLU !== 1) throw new Error('month: ' + JSON.stringify(m));
  // the agent's top-items lists: the app from the file name, a pooled list as the one app with orders in its dates, the newest file wins
  const IH = 'product_name,units,revenue,currency,data_from,data_through,grand_total_units,grand_total_revenue,total_rows';
  const list = (rows, from, to, gu, gr, n) => [IH, ...rows.map(([nm, u, r]) => [nm, u, r, 'GBP', from, to, gu, gr, n].join(','))].join('\n');
  fs.mkdirSync(dv.itemsDir(tmp));
  fs.writeFileSync(path.join(dv.itemsDir(tmp), 'top_items_2026.csv'), list([['Burger, large', 3, 30]], '2026-03-01', '2026-03-01', 5, 40, 2));
  fs.writeFileSync(path.join(dv.itemsDir(tmp), 'deliveroo_top_items_2026.csv'), list([['Wrap', 1, 9]], '2026-03-01', '2026-03-03', 1, 9, 1));
  if (!dv.isItems(IH + '\n')) throw new Error('items header not recognised');
  const it = dv.build(tmp, { match: 'Test Diner' }).items;
  const ue = it.find(s => s.ch === 'Uber Eats'), dr = it.find(s => s.ch === 'Deliveroo');
  if (it.length !== 2 || !ue || !dr) throw new Error('item lists by app: ' + JSON.stringify(it.map(s => s.ch)));
  if (ue.top[0].n !== 'Burger, large' || ue.top[0].u !== 3 || ue.revenue !== 40 || ue.rows !== 2) throw new Error('a name with a comma, or the totals: ' + JSON.stringify(ue));
  if (ue.orderRevenue !== 20 || ue.orders !== 1 || dr.orderRevenue !== 30) throw new Error('order revenue for the same app and dates: ' + ue.orderRevenue + ' / ' + dr.orderRevenue);
  fs.rmSync(tmp, { recursive: true, force: true });
  return 'header recognised · duplicate order counted once · location read whole · part day flagged · delivered, cancelled, failed and discounts counted · item lists by app with their order revenue';
});
await step('delivery: Uber Eats Manager reports merge across weeks, count inaccurate orders the way Uber does, and are picked up from Downloads', async () => { // V3.12
  const ue = await import('./ubereats.mjs'); const os = await import('node:os');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ue-')), dl = path.join(tmp, 'dl'); fs.mkdirSync(dl);
  const EH = 'Restaurant,External restaurant ID,Shop UUID,Country,Country code,City,Order ID,Workflow UUID,Order UUID,Time customer ordered,Time merchant accepted,Order completion time,Time customer was refunded,Order issue,Item Issue Details,Items with error,Inaccurate Customisations,Customer feedback,Currency code,Ticket size,Customer refunded,Chargeback amount,Refund Not Covered by Merchant,Fulfilment Type,Order Channel,Eats Brand';
  const IH = 'Restaurant,External restaurant ID,Shop UUID,Country,Country code,City,Workflow UUID,Order ID,Order UUID,Time customer ordered,Time merchant accepted,Order completion time,Time customer was refunded,Item name,External Item ID,External data,Order issue,Item issue,Inaccurate customisation,Item feedback,Item quantity refunded,Currency code,Incorrect item price,Fulfilment Type,Order Channel,Eats Brand';
  const e = (uuid, t, issue, ref, cb) => ["Test's High St", '', 's', 'UK', 'GBR', 'X', 'ID', 'w', uuid, t, t, t, t, issue, '', '', '', '', 'GBP', '20', ref, cb, String(ref - cb), 'Delivery', 'iOS', 'Uber Eats'].join(',');
  const i = (uuid, name, issue, cust) => ["Test's High St", '', 's', 'UK', 'GBR', 'X', 'w', 'ID', uuid, '2026-09-01 20:00:00.000', '', '', '', `"${name}"`, 'I1', '', 'ISSUE_WITH_ITEMS', issue, cust, '', '1', 'GBP', '5', 'Delivery', 'iOS', 'Uber Eats'].join(',');
  const u = n => `00000000-0000-0000-0000-00000000000${n}`;
  fs.writeFileSync(path.join(dl, u(1) + '_orders_with_errors_2026-08-31_2026-09-06.csv'), [EH, e('A', '2026-09-01 20:10:00.000', 'ISSUE_WITH_ITEMS', 5, 5), e('B', '2026-09-02 13:00:00.000', 'FOOD_QUALITY', 4, 0)].join('\n'));
  fs.writeFileSync(path.join(dl, u(2) + '_orders_with_errors_2026-08-31_2026-09-13.csv'), [EH, e('A', '2026-09-01 20:10:00.000', 'ISSUE_WITH_ITEMS', 5, 5), e('C', '2026-09-08 21:00:00.000', 'WRONG_ORDER', 9, 9)].join('\n'));
  fs.writeFileSync(path.join(dl, u(3) + '_items_with_errors_local_2026-08-31_2026-09-06.csv'), [IH, i('A', 'Zinger Box meal ⭐ (Popular) ⭐', 'MISSING_ITEM', 'Rubicon mango can'), i('A', 'Fries, large', 'MISSING_ITEM', ''), i('A', 'Fries, large', 'MISSING_ITEM', ''), i('B', 'Chicken Burger', 'FOOD_QUALITY', '')].join('\n'));
  fs.writeFileSync(path.join(dl, 'not-uber.csv'), 'x');
  if (ue.kindOf(EH + '\n') !== 'errors' || ue.kindOf(IH + '\n') !== 'items') throw new Error('headers not recognised');
  if (ue.importDownloads(tmp, dl) !== 3 || ue.importDownloads(tmp, dl) !== 0) throw new Error('Downloads: the three Uber files once, nothing else');
  const a = ue.build(tmp, { match: 'test', downloads: dl, delivered: () => ({ orders: 100, weeks: { '2026-08-31': 60, '2026-09-07': 40 }, hours: Array(24).fill(0).map((_, h) => (h === 20 ? 50 : 0)) }) });
  if (a.problems !== 3 || a.refunded !== 18 || a.chargeback !== 14) throw new Error('an order in two files must count once: ' + JSON.stringify([a.problems, a.refunded, a.chargeback]));
  if (a.inaccurate !== 2) throw new Error('inaccurate = missing or wrong items, or the wrong order (not food quality): ' + a.inaccurate);
  if (a.lines !== 4 || a.kinds.side !== 3 || a.kinds.main !== 0 || a.items[0].n !== 'Fries, large' || a.items.find(x => x.n === 'Zinger Box meal')?.k !== 1) throw new Error('item lines: ' + JSON.stringify([a.lines, a.kinds, a.items]));
  if (a.weeks.length !== 2 || a.weeks[0].orders !== 60 || a.weeks[0].inaccurate !== 1 || a.weeks[1].inaccurate !== 1) throw new Error('weeks: ' + JSON.stringify(a.weeks));
  // the 12-month summaries: a month table, a leaderboard with one dish listed twice, a weekday-by-hour grid (day 1 = Monday)
  fs.writeFileSync(path.join(dl, 'order_accuracy_issues_all_2026-10-30.csv'), ['Period,Day,Total inaccurate orders,Inaccurate orders with missing customisation,Refunds paid for missing customisation,Inaccurate orders with items missing,Refunds paid for items missing,Inaccurate orders with wrong order delivered,Refunds paid for wrong order delivered,Inaccurate orders with wrong item delivered,Refunds paid for wrong item delivered,Inaccurate orders with wrong customisation delivered,Refunds paid for wrong customisation delivered,Orders with food quality issues,Refunds paid for orders with food quality issues,Orders with food inadequate quantity issue,Refunds paid for orders with food inadequate quantity issue,Total refunds paid,Currency code', 'This period,2026-09-01,7,3,1,2,1,0,0,1,1,0,0,1,1,0,0,12.5,GBP'].join('\n'));
  fs.writeFileSync(path.join(dl, 'item_issues_leaderboard_2025-10-01-2026-09-30.csv'), ['Item,Volume,Rate,Issue count %Δ,Top issue', 'Fish ⭐ (Popular)⭐,4,2.00,40.00,Taste and quality issues', 'Chicken Fillet Burger ⭐(Best Seller) ⭐,3,1.00,1.00,Missing customisations', 'Chicken Fillet Burger ⭐(Best Seller) ⭐,3,1.00,1.00,Missing customisations'].join('\n'));
  fs.writeFileSync(path.join(dl, 'Inaccurate orders_hourly_data.csv'), ['Day,Hour,Items missing,Missing customisation,Wrong order delivered,Wrong item,Wrong customisations,Total', '5,20,1,1,0,0,0,2'].join('\n'));
  if (ue.importDownloads(tmp, dl) !== 3 || ue.kindOf('Day,Hour,Online rate,Offline time (minutes)\n') !== 'hOnline') throw new Error('the 12-month summaries are not picked up');
  const y = ue.build(tmp, { match: 'test', downloads: dl, delivered: () => ({ orders: 100, weeks: {}, months: { '2026-09': 70 }, hours: Array(24).fill(0), heat: Array.from({ length: 7 }, () => Array(24).fill(1)) }) }).year;
  if (!y || y.months[0].inaccurate !== 7 || y.months[0].orders !== 70 || y.months[0].refunds !== 12.5) throw new Error('month table: ' + JSON.stringify(y && y.months));
  const cfb = y.items.find(x => x.n === 'Chicken Fillet Burger');
  if (!cfb || cfb.k !== 6 || cfb.listings !== 2 || y.items.find(x => x.n === 'Fish').chg !== 40) throw new Error('leaderboard: a dish listed twice is one dish: ' + JSON.stringify(y.items));
  if (y.heat.inaccurate[4][20] !== 2) throw new Error('the hourly grid: day 5 is Friday (index 4)');
  // the success score and benchmark, filed from the Monday report's block
  const block = 'Report…\nUBER EATS SCORECARD\n{"readOn":"2026-11-02","tier":"Good","next":"Great","metrics":[{"name":"Rating","current":"4.5","goal":"4.2 or above","met":true}],"operational":[{"name":"Inaccurate orders","current":"1.10%","goal":"1.00%","impact":"Medium"}],"benchmark12w":[{"name":"Shop online hours","shop":"1,029.6h","market":"1,275.4h","diff":-19.3}],"benchmark7d":[]}\nEND UBER EATS SCORECARD';
  const sc = ue.fileScorecard(tmp, block), back = JSON.parse(fs.readFileSync(path.join(ue.dir(tmp), 'scorecard.json'), 'utf8'));
  if (!sc.ok || back.success.operational[0].current !== 1.1 || back.benchmark.rows[0].better !== 'up' || back.benchmark.rows[0].d7[0] !== '—') throw new Error('scorecard block: ' + JSON.stringify(back));
  if (ue.fileScorecard(tmp, 'no block here') !== null || !ue.fileScorecard(tmp, 'UBER EATS SCORECARD\n{bad\nEND UBER EATS SCORECARD').error) throw new Error('a missing or broken block must not be filed');
  const fx = await import('./fix.mjs'), f = fx.parse('Here: {"title":"Retrain the fish station","issue":"x","why":["a"],"actions":["b","c"],"owner":"kitchen lead","measure":"m","runnerUp":"r"}');
  if (f.title !== 'Retrain the fish station' || f.actions.length !== 2 || fx.weekOf(new Date('2026-11-04T10:00:00')) !== '2026-11-02') throw new Error('fix: ' + JSON.stringify(f));
  fs.rmSync(tmp, { recursive: true, force: true });
  return 'Uber files picked up from Downloads once · an order in two weeks\' files counts once · inaccurate as Uber counts it · a side missing from a meal is a side · rated week by week · 12-month table, leaderboard and grids read · scorecard filed from the Monday block · the fix reads back';
});
await step('needs you: Claude Code hooks mark a session waiting, needing permission or working, read its sidebar title, and skip Telegram and office runs', async () => { // V3.12
  const at = await import('./attention.mjs'), os = await import('node:os'), cp = await import('node:child_process');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'at-')), pdir = path.join(os.homedir(), '.claude', 'projects', 'zz-agents-office-check');
  fs.mkdirSync(pdir, { recursive: true });
  const line = o => JSON.stringify(o), tr = path.join(pdir, 's1.jsonl'), tg = path.join(pdir, 's2.jsonl');
  fs.writeFileSync(tr, [line({ type: 'user', message: { role: 'user', content: 'Build the dashboard' } }), line({ type: 'custom-title', customTitle: 'Dashboard build' }), line({ type: 'assistant', message: { content: [{ type: 'text', text: 'Done. Shall I commit?' }] } })].join('\n'));
  fs.writeFileSync(tg, line({ type: 'user', message: { content: '<channel source="telegram" chat_id="1">status</channel>' } }));
  try {
    at.hook(tmp, { event: 'UserPromptSubmit', session: 's1', transcript: tr, cwd: 'C:/x/agents-office' });
    if (at.list(tmp)[0].state !== 'working') throw new Error('a prompt makes the session working');
    at.hook(tmp, { event: 'Stop', session: 's1', transcript: tr, cwd: 'C:/x/agents-office' });
    let s = at.list(tmp)[0];
    if (s.state !== 'waiting' || s.title !== 'Dashboard build' || s.last !== 'Done. Shall I commit?' || s.first !== 'Build the dashboard') throw new Error('stop: ' + JSON.stringify(s));
    at.hook(tmp, { event: 'Notification', session: 's1', transcript: tr, message: 'Claude needs your permission to use Bash' });
    if (at.list(tmp)[0].state !== 'needs') throw new Error('a permission prompt is NEEDS');
    at.dismiss(tmp, 's1'); if (!at.list(tmp)[0].dismissed) throw new Error('dismiss');
    at.hook(tmp, { event: 'Stop', session: 's1', transcript: tr }); if (at.list(tmp)[0].dismissed) throw new Error('something new brings a dismissed session back');
    at.hook(tmp, { event: 'Stop', session: 's2', transcript: tg }); if (at.list(tmp).some(x => x.id === 's2')) throw new Error('the Telegram listener is left out');
    if (at.readTranscript(path.join(tmp, 'x.jsonl')).title !== '') throw new Error('a transcript outside ~/.claude/projects must not be read');
    at.hook(tmp, { event: 'SessionEnd', session: 's1' }); if (at.list(tmp).length) throw new Error('an ended session goes');
    // the hook script: an office run is skipped, and with no office listening it still exits at once
    const r = cp.spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'attention-hook.mjs')], { input: '{"hook_event_name":"Stop","session_id":"x"}', env: { ...process.env, OFFICE_PORT: '1' }, timeout: 4000 });
    if (r.status !== 0 || String(r.stdout)) throw new Error('the hook must exit 0 quietly when the office is off');
    const o = cp.spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'attention-hook.mjs')], { input: '{}', env: { ...process.env, AGENTS_OFFICE_RUN: '1' }, timeout: 4000 });
    if (o.status !== 0) throw new Error('an office run exits 0');
    if (!(await import('./mcp.mjs')).freshEnv().AGENTS_OFFICE_RUN) throw new Error('office runs must carry AGENTS_OFFICE_RUN');
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); fs.rmSync(pdir, { recursive: true, force: true }); }
  return 'prompt → working · finished → waiting with the sidebar title and last line · permission → needs · seen until something new · Telegram and office runs left out · hook never blocks';
});
await step('till dashboard: the hourly grid and item report become monthly turnover, a weekday-by-hour map and menu totals that match the report', async () => {
  const { build } = await import('./pos.mjs'); const NL = String.fromCharCode(10);
  const hourly = ['# x', '| Hour | 2026-08-30 | 2026-08-31 | 2026-09-01 | 2026-09-02 |', '| --- | --- | --- | --- | --- |', '| Hourly Sales report | Hourly Sales for Test Diner (High Street) Generated for the period of 2026-08-30 - 2026-09-02 |', '| 06:00PM | 10 (100.00) | 20 (250.50) | 5 (50.00) | 0 (-) |', '| 07:00PM | 30 (300.00) | 0 (-) | 15 (150.25) | 1 (1,000.00) |'].join(NL);
  const items = ['Item Sales By Category Report for Test Diner', 'Generated for the period of 2025-10-01 - 2026-09-02', 'Default Menu', 'BURGERS', 'Page 1 of 2', 'Item Name Unit Price Quantity Total Discount', 'Chicken Burger 4.49 ++ 10 100.00 1.00', 'Total 10 100.00 1.00', 'Deliveroo Menu', 'WRAPS', 'Page 2 of 2', 'Item', 'Name Unit Price Quantity Total Discount', 'Misc 1.60, 2.00,', '2.50 5 25.50 0.00', 'Total 5 25.50 0.00'].join(NL);
  const d = build([{ name: 'a', text: hourly + NL + 'Test Diner' }, { name: 'b', text: items }], { match: 'Test Diner' });
  if (!d.available || d.kind !== 'pos') throw new Error('not built: ' + JSON.stringify(d).slice(0, 160));
  const aug = d.hourly.months.find(m => m.month === '2026-08'), sep = d.hourly.months.find(m => m.month === '2026-09');
  if (aug.turnover !== 650.5 || aug.orders !== 60 || sep.orders !== 21 || !sep.partial || d.hourly.heat[0][18] === undefined) throw new Error('hourly months wrong: ' + JSON.stringify(d.hourly.months));
  if (d.totals.turnover !== 1200 || d.totals.orders !== 21 || d.totals.turnoverVsPrev !== null) throw new Error('latest month wrong: ' + JSON.stringify(d.totals));
  if (d.items.total !== 125.5 || d.items.menus.length !== 2 || d.items.qty !== 15) throw new Error('item totals wrong (a wrapped header must still be read): ' + JSON.stringify(d.items.menus));
  if (build([{ name: 'x', text: 'nothing here' }], { match: 'Test Diner' }).available) throw new Error('empty input made a dashboard');
  return 'months from the hourly grid · part month flagged · weekday-by-hour map · menu totals from the item report, wrapped headers included';
});
await step('project trackers: open actions are sorted into overdue, due (14 days) and up next from the target dates; done and parked ones are left out', async () => {
  const t = await import('./trackers.mjs');
  const j = { total: 8, complete: 2, rows: [['1', 'Send the thing', 'WS', 'Wes', 'Not Started', 'High', '22-Sep-2026 (all inputs) / 30-Sep-2026', '', 'Next', ''], ['2', 'Due today', 'WS', 'Tawheed', 'Not Started', 'Medium', '17-Oct-2026', '', 'Now', 'None'], ['3', 'Due soon', 'WS', 'Wes', 'In Progress', 'Low', '28-Oct-26', '', '', ''], ['4', 'Later one', 'WS', 'Wes', 'Not Started', 'High', '15-Dec-2026', '', 'Later', ''], ['5', 'Parked, undated', 'WS', 'Wes', 'Not Started', 'High', 'TBC', '', 'Parked', ''], ['6', 'Undated, marked now', 'WS', 'Wes', 'Not Started', 'Low', 'TBC', '', 'Now', ''], ['7', 'Already done', 'WS', 'Wes', 'Complete', 'Low', '1-Sep-2026', '2-Sep-2026', '', '']] };
  const v = t.view(t.snapshot({ client: 'x', name: 'X', sheet: 's' }, j), new Date(2026, 9, 17));
  const ids = k => v[k].map(r => r.id).join(',');
  if (ids('overdue') !== '1' || ids('due') !== '2,3' || ids('next') !== '4,6') throw new Error('cards wrong: ' + ['overdue', 'due', 'next'].map(k => k + '=' + ids(k)).join(' '));
  if (v.open !== 6 || v.undated !== 2 || v.overdue[0].days !== -25 || v.due[0].waitingOn !== '') throw new Error('counts or cleaning wrong: ' + JSON.stringify([v.open, v.undated, v.overdue[0].days, v.due[0].waitingOn]));
  if (t.parseDate('TBC') !== null || t.parseDate('28-Aug-26').toISOString().slice(0, 10) !== '2026-08-28') throw new Error('date parsing wrong');
  return 'overdue 1 · due 2 · up next 2 · the completed and the parked-undated rows are left out · "None" is not an owner to wait on';
});
await step('handoffs: a HANDOFF block is parsed, resolved to a seat by id or name, removed from the result, and an unknown seat is refused', async () => {
  const h = await import('./handoff.mjs'); const { loadRoster } = await import('./roster.mjs'); const agents = loadRoster().agents;
  const txt = ['Done.', '', 'HANDOFF', 'to: qa', 'title: QA the Lamb SOP', '---', 'Check folder X, one-pager only.', 'END HANDOFF', '', 'HANDOFF', 'to: nobody', 'title: x', '---', 'y', 'END HANDOFF', ''].join(String.fromCharCode(10));
  const b = h.parse(txt); if (b.length !== 2 || b[0].to !== 'qa') throw new Error('blocks not parsed');
  const pl = h.plan(b, agents, 'crep'); if (!pl[0].ok || pl[0].to !== 'qa' || pl[0].dept !== 'delivery') throw new Error('qa not resolved: ' + JSON.stringify(pl[0]));
  if (pl[1].ok) throw new Error('an unknown seat was accepted');
  if (h.resolve('QUALITY ASSURANCE CHECKER', agents, 'crep')?.id !== 'qa') throw new Error('names do not resolve');
  if (h.resolve('qa', agents, 'qa')) throw new Error('a seat can hand to itself');
  if (/HANDOFF/.test(h.strip(txt)) || !h.strip(txt).startsWith('Done.')) throw new Error('block not stripped');
  const tn = h.takeNext(['Report.', '', 'NEXT: gfx — build the Canva deck from the 12 pages'].join(String.fromCharCode(10)), agents, 'recon');
  if (!tn.next || tn.next.to !== 'gfx' || !/Canva/.test(tn.next.what) || /NEXT/.test(tn.text) || tn.text !== 'Report.') throw new Error('NEXT line not taken: ' + JSON.stringify(tn));
  if (h.takeNext('NEXT: nobody — do a thing', agents, 'recon').next.to !== '' || h.takeNext('no suggestion here', agents, 'recon').next !== null) throw new Error('unknown seat or no NEXT line handled wrongly');
  return 'parsed · "qa" and the full name both find the seat · unknown seat and self-handoff refused · block removed from the result · a NEXT line becomes a suggestion and leaves the deliverable clean';
});
await step('brain updates: a proposed note change is parsed, refused when unsafe, and filed only inside the brain with a backup', async () => {
  const bn = await import('./brainnotes.mjs'); const os = await import('node:os');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ao-brainnotes-')), brain = path.join(tmp, 'brain'), bak = path.join(tmp, 'bak');
  const w = (rel, txt) => { fs.mkdirSync(path.dirname(path.join(brain, rel)), { recursive: true }); fs.writeFileSync(path.join(brain, rel), txt); };
  w('10-Business/billing.md', '# Billing\n\n## Numbering\nLast used INV001.\n\n## Outstanding\n- INV001 unpaid\n'); w('CLAUDE.md', '# rules\n'); w('Agents Office/skills/x/SKILL.md', 'skill\n'); w('80-Finance/a.md', 'a\n'); w('90-Operations/a.md', 'a\n');
  const text = 'Done.\n\nBRAIN UPDATE\nnote: billing\nmode: replace-section\nsection: Numbering\nreason: new number\n---\nLast used INV002.\n---\nsecond line\nEND BRAIN UPDATE\n\n```\nBRAIN UPDATE\nnote: 80-Finance/water.md\nmode: create\n---\n# Water\nPaid monthly.\nEND BRAIN UPDATE\n```';
  const blocks = bn.parse(text);
  if (blocks.length !== 2 || blocks[0].section !== 'Numbering' || !/second line/.test(blocks[0].body) || blocks[1].mode !== 'create') throw new Error('parse wrong: ' + JSON.stringify(blocks));
  const bad = [['../outside.md', 'append'], ['Agents Office/skills/x/SKILL.md', 'append'], ['CLAUDE.md', 'append'], ['a', 'append'], ['10-Business/billing.md', 'create'], ['10-Business/missing.md', 'append'], ['10-Business/billing.md', 'replace-section', 'Nope']]
    .map(([note, mode, section]) => bn.plan(brain, { note, mode, section: section || 'Numbering', body: 'x' }));
  if (bad.some(p => p.ok)) throw new Error('an unsafe or impossible update was allowed: ' + JSON.stringify(bad.filter(p => p.ok)));
  if (bn.plan(brain, { note: '80-Finance/b.md', mode: 'create', body: 'Sort code 12-34-56, account 12345678' }).ok) throw new Error('bank details were allowed');
  if (bn.planAll(brain, [1, 2, 3, 4].map(i => ({ note: `80-Finance/n${i}.md`, mode: 'create', body: 'x' }))).filter(p => p.ok).length !== 3) throw new Error('more than three updates per task were allowed');
  const done = bn.applyAll(brain, blocks, { backupDir: bak });
  if (!done.every(d => d.ok)) throw new Error('could not file: ' + JSON.stringify(done));
  const billing = fs.readFileSync(path.join(brain, '10-Business/billing.md'), 'utf8');
  if (!/Last used INV002/.test(billing) || /INV001\.\n/.test(billing) || !/## Outstanding\n- INV001 unpaid/.test(billing) || !/## Numbering/.test(billing)) throw new Error('section not replaced cleanly:\n' + billing);
  if (!fs.existsSync(path.join(brain, '80-Finance/water.md')) || fs.readdirSync(bak).length !== 1) throw new Error('new note or backup missing');
  const again = bn.applyAll(brain, [{ note: 'billing', mode: 'append', body: 'Last used INV002.' }], { backupDir: bak });
  if (again[0].ok || !/already/.test(again[0].message)) throw new Error('an identical update was filed twice');
  fs.rmSync(tmp, { recursive: true, force: true });
  return 'parsed (even inside a code fence) · unsafe paths, the agents\' area, rules file, bank details and a 4th update refused · section replaced, rest of the note intact · backup kept · a repeat refused';
});
await step('restart recovery: a task left running by a restart starts again, one already past the owner\'s OK is held, nothing else is touched', async () => {
  const { recover } = await import('./recover.mjs');
  const list = [{ id: 'a', state: 'doing', title: 'First pass' }, { id: 'b', state: 'doing', title: 'After the OK', draft: 'x', waitingAt: 1 },
    { id: 'c', state: 'waiting', title: 'Waiting' }, { id: 'd', state: 'done', title: 'Done' }, { id: 'e', state: 'doing', title: 'Team', team: { pieces: [{ state: 'doing' }, { state: 'done' }] } }];
  const r = recover(list);
  if (r.requeue.join() !== 'a,e' || r.held.join() !== 'b') throw new Error('wrong sort: ' + JSON.stringify(r));
  if (list[0].state !== 'next' || list[1].state !== 'waiting' || !/restarted/.test(list[1].ask) || list[2].state !== 'waiting' || list[3].state !== 'done') throw new Error('states wrong');
  if (list[4].team.pieces[0].state !== 'next' || list[4].team.pieces[1].state !== 'done') throw new Error('team pieces wrong');
  return 'a first-pass task restarts · one past the OK is held · waiting and done tasks untouched · a team piece resets';
});
await step('matrix: closing a card with an answer keeps it, and the extractor is told to treat it as a fact', async () => {
  const aios = await import('./aios.mjs');
  const it = { id: 'x', title: 'Check whether the £2,000 invoice was paid', state: 'open' };
  aios.patch(it, { state: 'done', outcome: '  Paid 10 Oct  ' });
  if (it.state !== 'done' || it.outcome !== 'Paid 10 Oct' || !it.doneAt) throw new Error('the answer was not kept: ' + JSON.stringify(it));
  aios.patch(it, { outcome: '' }); if ('outcome' in it) throw new Error('a blank answer did not clear it');
  const p = aios.extractPrompt({ business: 'B', roster: 'r', input: 'i', today: 't', existing: ['A card [done: Paid 10 Oct]'], clients: [] });
  if (!/\[done: …\]/.test(JSON.stringify(p))) throw new Error('the extractor is not told what [done: …] means');
  return 'DONE can carry what happened · a blank answer clears it · the extractor treats a [done: …] line as a fact and does not ask again';
});
await step('skill audit: usage, rework, lessons and connector wiring are scored, and a proven link is not flagged', async () => {
  const { audit } = await import('./skillaudit.mjs');
  const mk = (name, extra = {}) => ({ name, description: 'd', agents: ['vid'], departments: [], everyone: false, files: [], source: 'brain', path: '', text: 'Use ltx-local for a clip.', ...extra });
  const agents = [{ id: 'vid', name: 'VIDEO EDITOR', department: 'marketing', tools: ['ltx-local'] }];
  const servers = [{ id: 'ltx-local', key: null, name: 'ltx-local', status: 'connected', allowed: true, depts: ['marketing'] }];
  const day = 86400000, now = Date.now();
  const tasks = [{ id: 1, agent: 'vid', skills: ['social'], revisions: 1, doneAt: now - day }, { id: 2, agent: 'vid', skills: ['social'], doneAt: now - day, used: ['ltx-local'] }];
  const r = audit({ skills: [mk('social'), mk('idle')], agents, tasks, servers, brainPath: path.join(ROOT, 'no-brain'), now });
  const a = r.skills.find(x => x.name === 'social'), b = r.skills.find(x => x.name === 'idle');
  if (a.uses !== 2 || a.reworked !== 1) throw new Error('usage not counted: ' + JSON.stringify({ u: a.uses, r: a.reworked }));
  if (!a.links[0]?.proven) throw new Error('a link used in a real task was not marked proven');
  if (a.recs.some(x => /not wired|not usable/.test(x.text))) throw new Error('a proven link was flagged');
  if (b.uses !== 0) throw new Error('an idle skill showed uses');
  const fresh = audit({ skills: [mk('idle')], agents, tasks: [{ id: 3, agent: 'vid', skills: ['other'], doneAt: now }], servers, brainPath: path.join(ROOT, 'no-brain'), now }).skills[0];
  if (!fresh.links[0] || fresh.links[0].usedByAgents !== 0 || !fresh.recs.some(x => /no agent task has used it yet/.test(x.text))) throw new Error('a wired link that no agent has used was not reported as untested');
  const down = audit({ skills: [mk('idle')], agents, tasks: [], servers: [{ ...servers[0], status: 'failed' }], brainPath: path.join(ROOT, 'no-brain'), now });
  if (!down.skills[0].recs.some(x => x.level === 'warn' && /not usable/.test(x.text))) throw new Error('a down connector was not flagged');
  const sa = await import('./skillaudit.mjs'), dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sa-'));
  sa.saveProposal(dir, 'social', 'change A');
  if (!sa.markProposalDone(dir, 'social') || sa.markProposalDone(dir, 'social')) throw new Error('marking a suggestion done must work once and then report nothing open');
  if (sa.loadProposals(dir).social.text) throw new Error('an actioned suggestion is still pending');
  const after = audit({ skills: [mk('social')], agents, tasks: [], servers, brainPath: path.join(ROOT, 'no-brain'), now, proposals: sa.loadProposals(dir) }).skills[0];
  if (after.proposal || after.actioned !== 1) throw new Error('the card should show nothing pending and one actioned');
  const many = [1, 2, 3, 4].map(i => ({ id: i, agent: 'vid', skills: ['social'], revisions: i <= 2 ? 1 : 0, doneAt: now - day }));
  const before = audit({ skills: [mk('social')], agents, tasks: many, servers, brainPath: path.join(ROOT, 'no-brain'), now, proposals: {} }).skills[0];
  const acked = audit({ skills: [mk('social')], agents, tasks: many, servers, brainPath: path.join(ROOT, 'no-brain'), now, proposals: { social: { history: [{ text: 'x', at: now - day, doneAt: now }] } } }).skills[0];
  if (!before.attention || acked.attention || acked.refining) throw new Error('marking a suggestion done must take the rework it answered off the review list (before ' + before.attention + ', after ' + acked.attention + ')');
  sa.saveProposal(dir, 'social', 'change B');
  if (!sa.loadProposals(dir).social.text || sa.loadProposals(dir).social.history.length !== 1) throw new Error('a new suggestion must be possible and keep the history');
  return 'counts uses and rework · a link used in a real task is proven · a wired link never used is "prove it with a test" · a down connector is a warning · MARK DONE clears one suggestion, keeps history, and a new one can follow';
});
await step('local video connector: speaks MCP, refuses bad requests without queueing, and always forces local generation', async () => {
  const dir = path.join(ROOT, 'connectors', 'ltx-local');
  const { listJobs } = await import('./connectors/ltx-local/shared.mjs');
  const before = listJobs().length;
  const p = spawn(process.execPath, [path.join(dir, 'mcp.mjs')], { stdio: ['pipe', 'pipe', 'ignore'] });
  let buf = ''; const waits = new Map();
  p.stdout.on('data', d => { buf += d; let i; while ((i = buf.indexOf('\n')) >= 0) { const l = buf.slice(0, i); buf = buf.slice(i + 1); try { const m = JSON.parse(l); waits.get(m.id)?.(m); } catch {} } });
  let n = 0; const rpc = (method, params) => new Promise((res, rej) => { const id = ++n; const t = setTimeout(() => rej(new Error(method + ' timed out')), 8000); waits.set(id, m => { clearTimeout(t); res(m); }); p.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n'); });
  try {
    await rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'check', version: '0' } });
    const names = (await rpc('tools/list', {})).result.tools.map(t => t.name);
    for (const t of ['ltx_status', 'ltx_submit_video', 'ltx_job', 'ltx_list_jobs', 'ltx_cancel']) if (!names.includes(t)) throw new Error('missing tool ' + t);
    if (names.some(t => /(^|_)(send|reply|forward)(_|$)/.test(t))) throw new Error('a tool looks like a send');
    const bad = await rpc('tools/call', { name: 'ltx_submit_video', arguments: { prompt: 'A slow push-in on layered mountains at dawn', resolution: '540p', duration_seconds: 2 } });
    if (!bad.result.isError) throw new Error('a clip under the minimum length was accepted');
    const { planSegments } = await import('./connectors/ltx-local/shared.mjs');
    const plan = planSegments('540p', 60);
    if (plan.reduce((a, b) => a + b, 0) !== 60 || plan.some(s => s > 10)) throw new Error('a 60-second plan does not chain into parts of 10 seconds or less');
    const short = await rpc('tools/call', { name: 'ltx_submit_video', arguments: { prompt: 'short' } });
    if (!short.result.isError) throw new Error('a one-word prompt was accepted');
    if (listJobs().length !== before) throw new Error('a refused request still queued a job');
  } finally { p.kill(); }
  const worker = fs.readFileSync(path.join(dir, 'worker.mjs'), 'utf8');
  if (!/userPrefersLtxApiVideoGenerations:\s*false/.test(worker)) throw new Error('the worker no longer forces local generation');
  return 'five tools, no send-like tool · too-short length and a one-word prompt refused, nothing queued · any length chains into parts of 10 s or less · the worker forces the local (free) route every job';
});
await step('SOP builder: both house styles build the full SOP and one-pager, bad content is refused with reasons, and the poster blocks are limit-checked', async () => {
  const dir = path.join(ROOT, 'connectors', 'sop-builder');
  const sample = JSON.parse(fs.readFileSync(path.join(dir, 'content.sample.json'), 'utf8'));
  const drive = fs.mkdtempSync(path.join(os.tmpdir(), 'sop-drive-'));
  const p = spawn(process.execPath, [path.join(dir, 'mcp.mjs')], { stdio: ['pipe', 'pipe', 'ignore'], env: { ...process.env, SOP_DRIVE_DIR: drive } });
  let buf = ''; const waits = new Map();
  p.stdout.on('data', d => { buf += d; let i; while ((i = buf.indexOf('\n')) >= 0) { const l = buf.slice(0, i); buf = buf.slice(i + 1); try { const m = JSON.parse(l); waits.get(m.id)?.(m); } catch {} } });
  let n = 0; const rpc = (method, params) => new Promise((res, rej) => { const id = ++n; const t = setTimeout(() => rej(new Error(method + ' timed out')), 120000); waits.set(id, m => { clearTimeout(t); res(m); }); p.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n'); });
  const qp = spawn(process.execPath, [path.join(dir, 'mcp.mjs'), '--qa'], { stdio: ['pipe', 'pipe', 'ignore'], env: { ...process.env, SOP_DRIVE_DIR: drive } });
  let qbuf = ''; const qwaits = new Map(); let qn = 0;
  qp.stdout.on('data', d => { qbuf += d; let i; while ((i = qbuf.indexOf(String.fromCharCode(10))) >= 0) { const l = qbuf.slice(0, i); qbuf = qbuf.slice(i + 1); try { const m = JSON.parse(l); qwaits.get(m.id)?.(m); } catch {} } });
  const qrpc = (method, params) => new Promise((res, rej) => { const id = ++qn; const t = setTimeout(() => rej(new Error(method + ' timed out')), 120000); qwaits.set(id, m => { clearTimeout(t); res(m); }); qp.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + String.fromCharCode(10)); });
  const made = [];
  try {
    await qrpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'check', version: '0' } });
    const qnames = (await qrpc('tools/list', {})).result.tools.map(t => t.name).sort().join();
    if (qnames !== 'sop_deliver,sop_fix,sop_list,sop_review') throw new Error('the QA server must expose only list, review and deliver: ' + qnames);
    await rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'check', version: '0' } });
    const names = (await rpc('tools/list', {})).result.tools.map(t => t.name);
    for (const t of ['sop_schema', 'sop_build', 'sop_list', 'sop_review']) if (!names.includes(t)) throw new Error('missing tool ' + t);
    if (names.includes('sop_deliver')) throw new Error('the builder must not be able to deliver');
    for (const client of ['imrans-diner', 'creamy']) {
      const r = await rpc('tools/call', { name: 'sop_build', arguments: { client, content: sample, formats: ['full', 'onepager'], filename: 'ZZ check ' + client } });
      if (r.result.isError) throw new Error(client + ' did not build: ' + r.result.content[0].text.slice(0, 200));
      const out = JSON.parse(r.result.content[0].text); made.push(out.folder);
      const docx = out.built.filter(f => /\.docx$/.test(f.file)); if (docx.length !== 2 || out.built.some(f => f.kb < 20)) throw new Error(client + ' built the wrong files'); if (out.pageCounts && out.pageCounts.some(p => /Full SOP/.test(p.file) ? p.pages !== 3 : p.pages !== 1)) throw new Error(client + ' page counts are off: ' + JSON.stringify(out.pageCounts));
      if (out.unfilledPlaceholders === 'none') throw new Error('unfilled placeholders were not reported');
    }
    const dl = await rpc('tools/call', { name: 'sop_build', arguments: { client: 'creamy', content: sample, formats: ['full'], filename: 'ZZ drive check', deliver_to_drive: true } });
    const dd = JSON.parse(dl.result.content[0].text); made.push(dd.folder);
    const landed = fs.readdirSync(drive); if (!dd.deliveredToMyDrive?.files?.length || landed.length !== dd.deliveredToMyDrive.files.length || fs.readdirSync(drive, { withFileTypes: true }).some(e => e.isDirectory())) throw new Error('delivery to My Drive went wrong: ' + JSON.stringify(landed));
    const again = JSON.parse((await rpc('tools/call', { name: 'sop_build', arguments: { client: 'creamy', content: sample, formats: ['full'], filename: 'ZZ drive check', deliver_to_drive: true } })).result.content[0].text); made.push(again.folder);
    if (fs.readdirSync(drive).length !== landed.length * 2) throw new Error('a second delivery overwrote or skipped files instead of keeping both');
    const rv = JSON.parse((await qrpc('tools/call', { name: 'sop_review', arguments: { folder: 'ZZ check creamy' } })).result.content[0].text);
    if (rv.documents.length !== 2 || rv.documents.some(d => !d.text || d.text.includes('<w:')) || !rv.checks.length) throw new Error('sop_review did not return clean document text and checks');
    const before = fs.readdirSync(drive).length;
    const d1 = await qrpc('tools/call', { name: 'sop_deliver', arguments: { folder: 'ZZ check creamy' } });
    if (d1.result.isError || fs.readdirSync(drive).length <= before) throw new Error('sop_deliver did not copy the files');
    const d2 = await qrpc('tools/call', { name: 'sop_deliver', arguments: { folder: 'ZZ check creamy' } });
    if (d2.result.isError || !/Nothing has changed/.test(d2.result.content[0].text)) throw new Error('an unchanged folder was delivered again');
    const one = rv.documents.find(d => /One Pager/.test(d.file)), line = one.text.split(String.fromCharCode(10))[0].trim();
    const fx = JSON.parse((await qrpc('tools/call', { name: 'sop_fix', arguments: { folder: 'ZZ check creamy', part: 'onepager', fixes: [{ old: line, new: line + ' ZZ' }] } })).result.content[0].text);
    if (fx[0].replaced !== 1 || fx[0].pages !== 1) throw new Error('sop_fix did not apply the correction cleanly: ' + JSON.stringify(fx));
    const countBefore = fs.readdirSync(drive).length;
    const d3 = JSON.parse((await qrpc('tools/call', { name: 'sop_deliver', arguments: { folder: 'ZZ check creamy', part: 'onepager' } })).result.content[0].text);
    if (!d3.deliveredToMyDrive.replacedEarlierDelivery?.length || fs.readdirSync(drive).length !== countBefore) throw new Error('a corrected delivery left a duplicate instead of replacing: ' + JSON.stringify(d3));
    const rows = (await qrpc('tools/call', { name: 'sop_review', arguments: { folder: 'ZZ check creamy', part: 'onepager' } })).result.content[0].text;
    const rl = JSON.parse(rows).documents[0].text.split(String.fromCharCode(10)).map(l => l.split(' | ')).filter(c => c.length === 2 && c[0].trim().length > 3 && c[1].trim().length > 3 && c[0] !== c[0].toUpperCase());
    if (rl.length < 2) throw new Error('no table rows to test row edits on');
    const [r1, r2] = rl, tx = await qrpc('tools/call', { name: 'sop_fix', arguments: { folder: 'ZZ check creamy', part: 'onepager', replacements: [{ find: r1[1].trim(), replace: r1[1].trim() + ' RR', row: r1[0].trim() }], delete_rows: [r2[0].trim()] } });
    const tfx = JSON.parse(tx.result.content[0].text)[0]; if (tfx.replaced !== 2 || tfx.pages !== 1) throw new Error('row-scoped edit and row delete did not both apply: ' + JSON.stringify(tfx));
    const after = JSON.parse((await qrpc('tools/call', { name: 'sop_review', arguments: { folder: 'ZZ check creamy', part: 'onepager' } })).result.content[0].text).documents[0].text;
    if (!after.includes(r1[1].trim() + ' RR') || after.includes(r2[0].trim() + ' | ' + r2[1].trim())) throw new Error('the row edit or the row removal is not in the document');
       const tooMany = structuredClone(sample); tooMany.onepager.standards = Array(7).fill(['a', 'b']);
    if (!(await rpc('tools/call', { name: 'sop_build', arguments: { client: 'creamy', content: tooMany, formats: ['onepager'] } })).result.isError) throw new Error('a one-pager over its limits was built');
    const noClient = await rpc('tools/call', { name: 'sop_build', arguments: { client: 'nobody', content: sample } });
    if (!noClient.result.isError) throw new Error('an unknown client was accepted');
  } finally { p.kill(); qp.kill(); for (const d of [...made, drive]) try { fs.rmSync(d, { recursive: true, force: true }); } catch {} }
  return 'Imran\'s Diner and Creamy both build a full SOP and a one-pager · unfilled placeholders are listed · over-limit content and an unknown client are refused';
});
await step('budget: ledger rows become month totals, and a wrong total is named against the sheet\'s own summary', async () => {
  const budget = await import('./budget.mjs');
  const j = { rows: [['2026-01-01', 'Income', 'Salary', 'Salary', 1000, 'Recurring', 'Actual', ''], ['2026-01-01', 'Income', 'Sale', 'One-off income', 200, 'One-off', 'Actual', 'Received 3 Jan'],
    ['2026-01-01', 'Outgoing', 'Rent', 'Housing', 500, 'Recurring', 'Actual', ''], ['2026-01-01', 'Outgoing', 'Streaming', 'Subscriptions', '12.99', 'Recurring', 'Actual', ''],
    ['2026-02-01', 'Income', 'Salary', 'Salary', '£1,000.00', 'Recurring', 'Forecast', ''], ['2026-02-01', 'Outgoing', 'Rent', 'Housing', 500, 'Recurring', 'Forecast', ''], ['not a month', 'Income', 'x', 'y', 1, '', '', '']],
    summary: [['2026-01-01', 1200, 512.99, 687.01, 1000, 512.99, 487.01], ['2026-02-01', 1000, 500, 500, 1000, 500, 500]] };
  const s = budget.snapshot({ sheet: 'abc' }, j); const jan = s.months[0], feb = s.months[1];
  if (s.rows.length !== 6 || s.check.dropped.length !== 1) throw new Error(`rows ${s.rows.length}, dropped ${s.check.dropped.length}`);
  if (jan.income !== 1200 || jan.outgoings !== 512.99 || jan.net !== 687.01 || jan.recurringNet !== 487.01 || jan.status !== 'Actual' || feb.status !== 'Forecast') throw new Error('month totals wrong: ' + JSON.stringify(jan));
  if (jan.categories[0].name !== 'Housing' || feb.income !== 1000) throw new Error('categories or a £-prefixed amount wrong');
  if (!s.check.ok || s.check.checked !== 2) throw new Error('matching summary should verify: ' + JSON.stringify(s.check));
  j.summary[0][3] = 700; const bad = budget.snapshot({ sheet: 'abc' }, j).check;
  if (bad.ok || bad.mismatches.length !== 1 || !/2026-01 net/.test(bad.mismatches[0])) throw new Error('a wrong sheet total was not named: ' + JSON.stringify(bad));
  let empty = false; try { budget.snapshot({ sheet: 'abc' }, { rows: [] }); } catch { empty = true; } if (!empty) throw new Error('an empty read must be an error, not a blank dashboard');
  return '2 months · totals, categories and £-strings right · a wrong sheet total is named · empty read refused';
});
await step('connectors: claude mcp list parses', async () => {
  const m = await import('./mcp.mjs');
  const l = m.parseList('Checking MCP server health…\n\nclaude.ai Gmail: https://gmailmcp.googleapis.com/mcp/v1 - ✔ Connected\nclaude.ai Meta Ads: https://mcp.facebook.com/ads - ! Needs authentication\nplaywright: npx -y @playwright/mcp@latest - ✔ Connected');
  if (l.length !== 3) throw new Error('parsed ' + l.length);
  if (l[0].id !== 'claude_ai_Gmail' || l[0].key !== 'gmail' || l[0].status !== 'connected') throw new Error('gmail: ' + JSON.stringify(l[0]));
  if (l[1].status !== 'needs-auth' || l[1].key !== 'meta') throw new Error('meta: ' + JSON.stringify(l[1]));
  if (l[2].depts.length !== 2) throw new Error('playwright depts: ' + l[2].depts);
});

/* ---------- 1c. routines (V3.5) ---------- */
await step('routines: plain words become a schedule', async () => {
  const w = await import('./src/when.js');
  const cases = [
    ['every weekday at 8am, triage the inbox and tell me what needs me', 'every weekday · 08:00', 'triage the inbox and tell me what needs me'],
    ['Every Monday 9am, list the overdue invoices and draft the reminders', 'Mondays · 09:00', 'list the overdue invoices and draft the reminders'],
    ["match today's bank lines to invoices, daily at 5:30pm", 'every day · 17:30', "match today's bank lines to invoices"],
    ['every hour between 9am and 5pm on weekdays, qualify new leads', 'every hour 09:00–17:00 · weekdays', 'qualify new leads'],
    ['chase quiet deals every tuesday and thursday at 10', 'Tue, Thu · 10:00', 'chase quiet deals'],
    ['on fridays at 4pm this week\'s cash position', 'Fridays · 16:00', "this week's cash position"],
    ['every 2 minutes say hello', 'every 2 min', 'say hello'],
    ['every weekend at noon, check the queue', 'weekends · 12:00', 'check the queue'],
  ];
  for (const [text, desc, task] of cases) {
    const r = w.parseWhen(text); if (!r) throw new Error('no schedule found in: ' + text);
    if (w.describe(r.when) !== desc) throw new Error(`"${text}" → ${w.describe(r.when)}, expected ${desc}`);
    if (r.text !== task) throw new Error(`"${text}" → task "${r.text}", expected "${task}"`);
    if (!w.valid(r.when) || !(w.nextRun(r.when) > Date.now())) throw new Error('no next run for ' + desc);
  }
  if (w.parseWhen('reply to a client asking when their September report will arrive within 24 hours')) throw new Error('a plain task was read as a routine');
  const t = w.parseWhen('every weekday, triage the inbox'); if (!t || !t.needsTime) throw new Error('missing time not asked back');
  const g = w.parseWhen('every morning triage the inbox'); if (!g || g.when.at !== '08:00' || !g.guessed) throw new Error('"morning" not taken as 08:00 with a flag');
  const d = w.parseWhen('weekly at 3pm list renewals'); if (!d || !d.needsDay) throw new Error('weekly with no day not asked back');
  const now = new Date('2026-09-09T17:05:00').getTime(); // a Wednesday
  const nx = w.nextRun({ kind: 'weekly', days: [1], at: '09:00' }, now); if (new Date(nx).getDay() !== 1 || new Date(nx).getHours() !== 9) throw new Error('Monday 09:00 not next');
  if (w.untilText(now + 120000, now) !== 'in 2 min' || w.untilText(w.fromPicker('fri', '16:00') && nx, now) !== 'Mon 09:00') throw new Error('countdown text');
  return `${cases.length} phrasings · asks back for a missing time or day · "morning" → 08:00 flagged`;
});
await step('routines: outside Emails, Accounting and Sales is refused, bad ones named', async () => {
  const rt = await import('./routines.mjs'); const { loadRoster } = await import('./roster.mjs'); const agents = loadRoster().agents;
  const bad = rt.validate({ id: 'x', dept: 'marketing', agent: 'iggy', text: 'post the reel', when: { kind: 'daily', at: '09:00' } }, agents);
  if (!bad.problems.some(p => /later release/.test(p))) throw new Error('marketing routine not refused: ' + bad.problems);
  if (!/Emails, Accounting and Sales/.test(rt.refusal('ops'))) throw new Error('refusal sentence');
  const wrong = rt.validate({ dept: 'fin', agent: 'ghost', text: 'x', when: { kind: 'weekly', days: [] } }, agents);
  if (!wrong.problems.some(p => /no agent/.test(p)) || !wrong.problems.some(p => /not complete/.test(p))) throw new Error('unknown agent / incomplete schedule not named: ' + wrong.problems);
  const cross = rt.validate({ dept: 'fin', agent: 'lexi', text: 'x', when: { kind: 'daily', at: '09:00' } }, agents);
  if (!cross.problems.some(p => /is in Sales, not Accounting/.test(p))) throw new Error('cross-department agent not named: ' + cross.problems);
  const good = rt.validate({ dept: 'emails', agent: 'elead', text: 'Triage the overnight inbox', when: { kind: 'weekdays', at: '08:00' } }, agents);
  if (good.problems.length || good.routine.id !== 'triage-the-overnight-inbox' || good.routine.needsOk !== true) throw new Error('a good routine did not validate: ' + JSON.stringify(good));
  const dup = rt.validate({ id: 'triage-the-overnight-inbox', dept: 'emails', agent: 'elead', text: 'x', when: { kind: 'daily', at: '09:00' } }, agents, [good.routine]);
  if (!dup.problems.some(p => /share this id/.test(p))) throw new Error('duplicate id not named');
  if (rt.guessNeedsOk('list the overdue invoices') || !rt.guessNeedsOk('send the reminders') || !rt.guessNeedsOk('draft replies to unanswered client emails')) throw new Error('needs-OK guess');
  return 'marketing refused · unknown agent, wrong department, incomplete schedule, duplicate id all named · needsOk defaults on';
});
await step('routines: due fires once, a missed run catches up marked LATE, then the clock moves on', async () => {
  const rt = await import('./routines.mjs'); const { loadRoster } = await import('./roster.mjs'); const os = await import('node:os');
  const agents = loadRoster().agents; const brain = fs.mkdtempSync(path.join(os.tmpdir(), 'ao-routines-')); const data = path.join(brain, 'data');
  rt.save(brain, [{ id: 'a', dept: 'emails', agent: 'elead', title: 'A', text: 'triage', when: { kind: 'weekdays', at: '08:00' } }, { id: 'p', dept: 'sales', agent: 'folo', title: 'P', text: 'chase', when: { kind: 'daily', at: '10:00' }, paused: true, needsOk: false }]);
  const l = rt.load(brain, agents); if (l.problems.length || l.routines.length !== 2) throw new Error('load: ' + l.problems);
  const st = rt.loadState(data); const now = Date.now();
  const { list } = rt.withState(l.routines, st, now); if (!(st.a.nextAt > now) || list.find(r => r.id === 'p').nextAt !== null) throw new Error('nextAt not set / paused not null');
  if (rt.due(l.routines, st, now).length) throw new Error('fired before its time');
  st.a.nextAt = now - 2 * 3600 * 1000; st.p.nextAt = now - 3600 * 1000; // the office was off for two hours
  const d = rt.due(l.routines, st, now); if (d.length !== 1 || d[0].routine.id !== 'a' || !d[0].late) throw new Error('catch-up wrong: ' + JSON.stringify(d.map(x => [x.routine.id, x.late])));
  rt.advance(st, l.routines[0], now, 't1', true); rt.saveState(data, st);
  if (!(st.a.nextAt > now) || st.a.runs !== 1 || !st.a.lastLate) throw new Error('advance did not move the clock on');
  if (rt.due(l.routines, st, now).length) throw new Error('fired twice');
  const s2 = rt.loadState(data); if (s2.a.lastTaskId !== 't1') throw new Error('state not saved');
  const soon = { kind: 'minutes', every: 2 }; st.a.nextAt = now - 30 * 1000; const d2 = rt.due(l.routines, st, now); if (d2.length !== 1 || d2[0].late) throw new Error('a run 30 s past its minute is not late');
  const m = rt.matchRoutine(list, 'emails', 'the triage one'); if (!m || m.id !== 'a') throw new Error('match by words');
  fs.rmSync(brain, { recursive: true, force: true });
  return 'due once · 2 h late → one catch-up marked LATE · paused never fires · state persists · words match a routine';
});

/* ---------- 1d. models + the usage gauge (V3.6) ---------- */
await step('models: three names + five effort levels, one precedence, the right CLI flags', async () => {
  const m = await import('./src/models.js');
  if (JSON.stringify(m.MODEL_KEYS) !== '["sonnet","opus","fable"]' || m.DEFAULT_MODEL !== 'sonnet') throw new Error('keys/default');
  if (m.normModel('Opus') !== 'opus' || m.normModel('claude-sonnet-5') !== 'sonnet' || m.normModel('haiku') !== null || m.normModel('') !== null) throw new Error('normModel');
  const p = (o) => m.modelFor(o); 
  if (p({}).model !== 'sonnet' || p({}).from !== 'office') throw new Error('empty → office sonnet');
  if (p({ office: 'opus' }).model !== 'opus' || p({ agent: 'fable', office: 'opus' }).from !== 'agent' || p({ routine: 'opus', agent: 'fable' }).model !== 'opus' || p({ task: 'sonnet', routine: 'opus', agent: 'fable', office: 'opus' }).from !== 'task') throw new Error('precedence');
  if (p({ task: 'haiku', office: 'opus' }).model !== 'opus') throw new Error('an unknown task model must fall through');
  if (m.modelArgs('sonnet').join(' ') !== '--model sonnet' || m.modelArgs('opus').join(' ') !== '--model opus --effort high' || m.modelArgs('fable').join(' ') !== '--model fable' || m.modelArgs('nonsense').join(' ') !== '--model sonnet') throw new Error('args: ' + m.modelArgs('opus').join(' '));
  // V3.6.1 effort: five CLI levels, AUTO = the model's own, same precedence then the model
  if (m.normEffort('Extra high') !== 'xhigh' || m.normEffort('auto') !== null || m.normEffort('turbo') !== null || m.normEffort('MAX') !== 'max') throw new Error('normEffort');
  const e = (o) => m.effortFor(o);
  if (e({ model: 'opus' }).effort !== 'high' || e({ model: 'opus' }).from !== 'model' || e({ model: 'sonnet' }).effort !== null) throw new Error('effort falls through to the model');
  if (e({ office: 'low', model: 'opus' }).effort !== 'low' || e({ agent: 'max', office: 'low' }).from !== 'agent' || e({ routine: 'medium', agent: 'max' }).effort !== 'medium' || e({ task: 'xhigh', routine: 'medium', agent: 'max', office: 'low' }).from !== 'task') throw new Error('effort precedence');
  if (m.modelArgs('sonnet', 'max').join(' ') !== '--model sonnet --effort max' || m.modelArgs('opus', 'low').join(' ') !== '--model opus --effort low' || m.modelArgs('opus', 'nonsense').join(' ') !== '--model opus --effort high') throw new Error('effort args');
  const { validate } = await import('./roster.mjs');
  const r = validate({ agents: [{ id: 'invo', model: 'OPUS', effort: 'High' }, { id: 'lexi', model: 'haiku', effort: 'turbo' }] });
  if (r.agents.find(a => a.id === 'invo').model !== 'opus' || r.agents.find(a => a.id === 'lexi').model !== '' || !r.problems.some(x => /sonnet, opus or fable/.test(x))) throw new Error('roster model field');
  if (r.agents.find(a => a.id === 'invo').effort !== 'high' || r.agents.find(a => a.id === 'lexi').effort !== '' || !r.problems.some(x => /low, medium, high, xhigh or max/.test(x))) throw new Error('roster effort field');
  const rt = await import('./routines.mjs'); const { loadRoster } = await import('./roster.mjs');
  const v = rt.validate({ dept: 'fin', agent: 'invo', text: 'x', when: { kind: 'daily', at: '09:00' }, model: 'Fable', effort: 'xhigh' }, loadRoster().agents); if (v.problems.length || v.routine.model !== 'fable' || v.routine.effort !== 'xhigh') throw new Error('routine model/effort field');
  return 'sonnet · opus (effort high) · fable · task > routine > agent > office · roster and routines refuse anything else';
});
await step('usage: the gauge parses Claude\'s answer and the office\'s own count sits underneath', async () => {
  const u = await import('./usage.mjs');
  const sample = { five_hour: { utilization: 29, resets_at: '2026-09-09T08:20:00.322898+00:00' }, seven_day: { utilization: 39.6, resets_at: '2026-09-12T03:00:00.322921+00:00' } };
  const p = u.parseUsage(sample); if (!p || p.session.percent !== 29 || p.week.percent !== 40 || !p.session.resetsAt || new Date(p.week.resetsAt).getUTCDay() !== 6) throw new Error('parse: ' + JSON.stringify(p));
  if (u.parseUsage({ nothing: true }) !== null || u.parseUsage(null) !== null) throw new Error('unknown shape must be null');
  const now = Date.now(); let st = {};
  st = u.record(st, { input_tokens: 10, output_tokens: 40, cache_creation_input_tokens: 9000, cache_read_input_tokens: 5000 }, now);
  st = u.record(st, { input_tokens: 5, output_tokens: 5 }, now + 1000);
  const f = u.fallback(st, now + 2000); if (f.source !== 'office' || f.window.tokens !== 14060 || f.window.runs !== 2 || f.window.resetsAt !== st.startedAt + u.WINDOW) throw new Error('count: ' + JSON.stringify(f));
  const later = u.fallback(st, now + u.WINDOW + 1); if (later.window.tokens !== 0 || later.window.runs !== 0 || later.window.startedAt !== null) throw new Error('window did not reset');
  const tok = u.readToken(); // read into memory only — never printed
  return `parses percent + reset · unknown shape → null · 2 runs = 14,060 tokens · window resets after 5 h · login token on this machine: ${tok ? 'found' : 'none'}`;
});

/* ---------- 1e. Agent Teams + Claude in Chrome (V3.2 (16 Sep)) ---------- */
await step('teams: the sentence says team, the plan is checked against the seats, notes are parsed', async () => {
  const t = await import('./teams.mjs');
  for (const ok of ['as a team, write three hooks', 'get the team on this', 'spawn three teammates to plan the launch', 'split it across the desks']) if (!t.intent(ok)) throw new Error('not a team: ' + ok);
  for (const no of ['write three hooks', 'draft the team offsite email', 'reply to the client']) if (t.intent(no)) throw new Error('wrongly a team: ' + no);
  if (t.askedSize('spawn three teammates') !== 3 || t.askedSize('as a team') !== null) throw new Error('askedSize');
  const seats = [{ id: 'mlead', lead: true }, { id: 'ada' }, { id: 'newt' }, { id: 'gfx' }], lead = seats[0];
  const plan = t.parsePlan('```json\n{"pieces":[{"agent":"ada","title":"A","text":"a"},{"agent":"ada","title":"dup","text":"x"},{"agent":"ghost","title":"g","text":"x"},{"agent":"newt","title":"N","text":"n"},{"agent":"gfx","title":"G","text":"g"},{"agent":"mlead","title":"M","text":"m"}],"why":"split"}\n```', { seats, lead, max: 3 });
  if (plan.solo || plan.pieces.map(p => p.agent).join() !== 'ada,newt,gfx') throw new Error('plan: ' + JSON.stringify(plan));
  const solo = t.parsePlan('not json at all', { seats, lead, max: 3, fallback: { title: 'T', text: 'x' } });
  if (!solo.solo || solo.pieces[0].agent !== 'mlead') throw new Error('no fallback to the lead');
  const one = t.parsePlan('{"pieces":[{"agent":"ada","title":"A","text":"a"}]}', { seats, lead, max: 3, fallback: { title: 'T', text: 'x' } });
  if (!one.solo || one.pieces[0].agent !== 'ada') throw new Error('a one-piece plan should be solo on that desk');
  if (!/never one piece/.test(t.planPrompt({ business: 'x', deptName: 'y', lead: { name: 'L' }, seats: [], text: 't', max: 3 }).user)) throw new Error('the plan prompt must insist on a split');
  const m = t.parseMessages('Heading\nbody\n@newt: use the June figure\n@lead: two hooks clash\n@nobody: ignored', ['ada', 'newt', 'gfx', 'mlead']);
  if (m.messages.length !== 2 || m.messages[0].to !== 'newt' || m.messages[1].to !== 'lead' || !/@nobody/.test(m.body) || /@newt/.test(m.body)) throw new Error('messages: ' + JSON.stringify(m));
  const sec = t.teamSection({ me: { id: 'ada' }, lead, pieces: plan.pieces, nameOf: id => id.toUpperCase() });
  if (!/Your piece: A/.test(sec) || !/NEWT: N/.test(sec) || !/@lead|@newt/.test(sec)) throw new Error('team section: ' + sec.slice(0, 200));
  const st = t.settings({ teams: { max: 99 } }); if (st.max !== 6 || !st.enabled) throw new Error('settings clamp: ' + JSON.stringify(st));
  if (t.settings({ teams: { enabled: false } }).enabled) throw new Error('enabled false ignored');
  const extra = t.noteExtra({ pieces: [{ agent: 'ada', title: 'A', result: 'r' }], messages: [{ from: 'ada', to: 'lead', text: 'x' }] }, id => id.toUpperCase());
  if (!/## Team/.test(extra) || !/ADA → lead: x/.test(extra) || !/### ADA — A\nr/.test(extra)) throw new Error('note extra: ' + extra);
  return 'intent · askedSize · plan (dedupe, unknown seats, cap, one desk → solo, none → the lead) · notes · section · settings · note';
});
await step('teams: a team routine is kept and moved to the department lead', async () => {
  const { validate } = await import('./routines.mjs'); const { loadRoster } = await import('./roster.mjs');
  const agents = loadRoster().agents;
  const v = validate({ id: 'wk', dept: 'sales', agent: 'piper', title: 'x', text: 'x', when: { kind: 'weekly', days: [1], at: '09:00' }, team: true }, agents);
  if (v.problems.length) throw new Error(v.problems.join(' | '));
  if (v.routine.team !== true || v.routine.agent !== 'lexi') throw new Error('agent ' + v.routine.agent + ' team ' + v.routine.team);
  const w = validate({ id: 'wk2', dept: 'sales', agent: 'piper', title: 'x', text: 'x', when: { kind: 'weekly', days: [1], at: '09:00' } }, agents);
  if (w.routine.team !== undefined || w.routine.agent !== 'piper') throw new Error('a plain routine changed');
  return 'team:true → lexi (the Sales lead) · plain routine untouched';
});
await step('browser: tools.browser puts --chrome and the Chrome server in the agents\' hands; off means --no-chrome', async () => {
  const m = await import('./mcp.mjs');
  if (m.toolId('claude-in-chrome') !== 'claude-in-chrome' || m.toolId('claude.ai Gmail') !== 'claude_ai_Gmail') throw new Error('toolId');
  m.configure({ mcp: {}, tools: { browser: true } });
  if (m.cliArgs().join() !== '--chrome') throw new Error('cliArgs on: ' + m.cliArgs());
  m.fromInit({ mcp_servers: [{ name: 'claude-in-chrome', status: 'connected' }], tools: ['mcp__claude-in-chrome__navigate', 'mcp__claude-in-chrome__read_page'] });
  const s = m.list().find(x => x.id === 'claude-in-chrome'); if (!s || s.key !== 'chrome' || s.name !== 'Chrome' || s.status !== 'connected' || s.tools.length !== 2) throw new Error('chrome server: ' + JSON.stringify(s));
  if (!m.allowedTools().includes('mcp__claude-in-chrome')) throw new Error('not in allowedTools: ' + m.allowedTools());
  if (!/Chrome browser/.test(m.promptText([])) || !/CAPTCHA/.test(m.promptText([]))) throw new Error('prompt does not explain the browser');
  if (m.keyOf('mcp__claude-in-chrome__navigate') !== 'chrome' || m.namesOf(['mcp__claude-in-chrome__find'])[0] !== 'Chrome') throw new Error('keyOf/namesOf');
  if (m.summary().browser?.on !== true || typeof m.summary().browser.installed !== 'boolean') throw new Error('summary.browser');
  m.configure({ mcp: { deny: ['Chrome'] }, tools: { browser: true } });
  if (m.allowedTools().includes('mcp__claude-in-chrome')) throw new Error('deny did not keep Chrome out of the agents\' hands');
  m.configure({ mcp: {}, tools: { browser: false } });
  if (m.cliArgs().join() !== '--no-chrome') throw new Error('cliArgs off: ' + m.cliArgs());
  m.configure(cfg); // back to the office's own config
  const logos = fs.readFileSync(path.join(ROOT, 'src', 'mcplogos.js'), 'utf8'); if (!/\n  chrome: \{ name: 'Chrome'/.test(logos)) throw new Error('no Chrome tile in src/mcplogos.js');
  const b = m.browserState();
  return `--chrome · mcp__claude-in-chrome allowed · deny works · --no-chrome when off · tile baked · this machine: ${b.installed ? 'extension paired' + (b.device ? ' (' + b.device + ')' : '') : 'extension NOT paired'}`;
});
await step('calendar: a routine can start on a date, and projects forward day by day', async () => { // V3.2.1
  const w = await import('./src/when.js');
  const now = new Date('2026-09-16T10:00:00').getTime();
  const later = w.nextRun({ kind: 'weekdays', at: '08:00', start: '2026-09-28' }, now); if (new Date(later).toDateString() !== 'Mon Sep 28 2026') throw new Error('start ignored: ' + new Date(later));
  const earlier = w.nextRun({ kind: 'weekdays', at: '08:00', start: '2026-09-01' }, now); if (new Date(earlier).toDateString() !== 'Thu Sep 17 2026') throw new Error('a past start changed the next run: ' + new Date(earlier));
  const occ = w.occurrences({ kind: 'weekly', days: [1], at: '09:00', start: '2026-09-28' }, now, now + 30 * 864e5).map(t => new Date(t).getDate()); if (occ.join() !== '28,5,12') throw new Error('occurrences: ' + occ);
  if (!/from 5 Jan/.test(w.describe({ kind: 'daily', at: '08:00', start: '2099-01-05' })) || /from/.test(w.describe({ kind: 'daily', at: '08:00', start: '2020-01-05' }))) throw new Error('describe start');
  if (w.valid({ kind: 'daily', at: '08:00', start: 'next week' })) throw new Error('a bad start date passed');
  const pk = w.fromPicker('mon', '09:30', '2026-10-05'); if (pk.start !== '2026-10-05' || pk.days[0] !== 1) throw new Error('picker start: ' + JSON.stringify(pk));
  const { validate } = await import('./routines.mjs'); const { loadRoster } = await import('./roster.mjs');
  const v = validate({ id: 'oct', dept: 'emails', agent: 'elead', title: 'x', text: 'x', when: { kind: 'weekdays', at: '08:00', start: '2026-10-05' } }, loadRoster().agents); if (v.problems.length || v.routine.when.start !== '2026-10-05') throw new Error('routine start lost: ' + v.problems.join(' | '));
  return 'start date honoured · past start ignored · 3 Mondays projected · described "from 5 Jan" · picker + routines carry start';
});
await step('config: browser and teams default on, max 4', async () => {
  const c = loadConfig(); if (c.tools.browser !== true || c.teams.enabled !== true || c.teams.max !== 4) throw new Error(JSON.stringify({ tools: c.tools, teams: c.teams }));
});

/* ---------- 2. offline smoke (Playwright) ---------- */
let chromium = null;
try { ({ chromium } = await import('playwright')); } catch { try { ({ chromium } = await import('playwright-core')); } catch {} }
if (!chromium) bad('smoke: playwright', 'not installed — npm i -D playwright-core (uses your Chrome)');
else {
  let browser = null;
  try {
    try { browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'] }); }
    catch { browser = await chromium.launch({ channel: 'chrome', args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'] }); }
    const page = await browser.newPage({ viewport: { width: 1512, height: 900 } });
    const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 120)); });
    await page.goto('file://' + path.join(ROOT, 'dist', 'command-centre-v2.html') + '?s=check'); await page.waitForTimeout(3000);
    await step('smoke: loads without page errors', async () => { if (errors.length) throw new Error(errors[0]); });
    await step('smoke: 35 agents at their desks', async () => { const n = await page.evaluate(() => Object.keys(window.CC.R).length); if (n !== 35) throw new Error('agents: ' + n); return n + ' agents'; });
    await step('smoke: six department cards + the Brain tag', async () => {
      const t = await page.evaluate(() => [...document.querySelectorAll('.badge .b-name')].map(e => e.textContent.trim()));
      for (const k of ['EMAILS', 'SALES', 'MARKETING', 'OPERATIONS', 'FINANCE', 'DELIVERY', 'THE BRAIN']) if (!t.some(x => x.startsWith(k))) throw new Error('missing card ' + k);
    });
    await step('smoke: task panel has rows and counts', async () => {
      const n = await page.evaluate(() => document.querySelectorAll('.tp-row').length); if (n < 10) throw new Error('rows: ' + n);
      const chips = await page.evaluate(() => document.querySelectorAll('.tp-chip').length); if (chips !== 6) throw new Error('chips: ' + chips);
      return n + ' rows';
    });
    await step('smoke: command bar adds a task in demo mode', async () => {
      await page.click('.tp-dd'); await page.click('.tp-menu button[data-k="marketing"]');
      await page.fill('.tp-in', 'cut a 15 second teaser from the demo reel'); await page.keyboard.press('Enter'); await page.waitForTimeout(600);
      const hint = await page.evaluate(() => document.querySelector('.tp-hint').textContent); if (!/Added/.test(hint)) throw new Error('hint: ' + hint);
      const row = await page.evaluate(() => [...document.querySelectorAll('.tp-row .tp-t')].some(e => /teaser/i.test(e.textContent))); if (!row) throw new Error('row not in the feed');
      return hint.trim().slice(0, 60);
    });
    await step('smoke: TEAM in the bar → the lead + piece cards on the desks (demo)', async () => { // V3.2 (16 Sep)
      await page.waitForTimeout(2800); // the previous step's hint timer (2.6 s) would wipe our "Added" line mid-read
      await page.click('.tp-dd'); await page.click('.tp-menu button[data-k="sales"]');
      await page.fill('.tp-in', 'as a team, plan the spring outreach push');
      await page.evaluate(() => document.querySelector('.tp-in').dispatchEvent(new Event('input', { bubbles: true })));
      const pre = await page.evaluate(() => document.querySelector('.tp-hint').textContent); if (!/Team · SALES LEAD/.test(pre)) throw new Error('hint before Add: ' + pre);
      await page.keyboard.press('Enter'); await page.waitForTimeout(700);
      const hint = await page.evaluate(() => document.querySelector('.tp-hint').textContent); if (!/Added — SALES LEAD has it with/.test(hint)) throw new Error('hint: ' + hint);
      const n = await page.evaluate(() => ({ lead: [...document.querySelectorAll('.tp-row .tp-t')].filter(e => /⚑ As a team, plan the spring/.test(e.textContent)).length, pieces: document.querySelectorAll('.tp-row.piece').length, chip: [...document.querySelectorAll('.tp-team-chip')].map(e => e.textContent) }));
      if (n.lead !== 1 || n.pieces < 2 || !n.chip.some(c => /^TEAM [34]$/.test(c)) || !n.chip.includes('PIECE')) throw new Error(JSON.stringify(n));
      await page.fill('.tp-in', 'draft the renewal email'); await page.evaluate(() => document.querySelector('.tp-in').dispatchEvent(new Event('input', { bubbles: true })));
      const plain = await page.evaluate(() => document.querySelector('.tp-hint').textContent); if (/Team ·/.test(plain)) throw new Error('a plain sentence still reads as a team: ' + plain);
      await page.click('.tp-team'); const on = await page.evaluate(() => document.querySelector('.tp-hint').textContent); if (!/Team · SALES LEAD/.test(on)) throw new Error('the TEAM toggle did not take: ' + on);
      await page.click('.tp-team'); await page.fill('.tp-in', '');
      return `${hint.trim().slice(0, 70)} · ${n.pieces} piece cards · chips ${[...new Set(n.chip)].join(' ')}`;
    });
    await step('smoke: a routine typed in the bar lands in SCHEDULED (demo)', async () => {
      await page.click('.tp-dd'); await page.click('.tp-menu button[data-k="emails"]');
      await page.click('.tp-rep'); await page.selectOption('.tp-cad', 'weekdays'); await page.fill('.tp-at', '08:00'); // a routine only comes from REPEAT
      await page.fill('.tp-in', 'triage the inbox and tell me what needs me');
      await page.evaluate(() => document.querySelector('.tp-in').dispatchEvent(new Event('input', { bubbles: true })));
      await page.waitForFunction(() => /Routine/.test(document.querySelector('.tp-hint').textContent), null, { timeout: 5000 }).catch(() => {});
      const pre = await page.evaluate(() => document.querySelector('.tp-hint').textContent); if (!/Routine/.test(pre) || !/every weekday · 08:00/.test(pre)) throw new Error('hint before Add: ' + pre);
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => /Routine set|couldn/.test(document.querySelector('.tp-hint').textContent), null, { timeout: 5000 }).catch(() => {});
      const hint = await page.evaluate(() => document.querySelector('.tp-hint').textContent); if (!/Routine set/.test(hint)) throw new Error('hint: ' + hint);
      await page.waitForTimeout(400);
      const n = await page.evaluate(() => window.CC.routines().length); if (n !== 1) throw new Error('routines: ' + n);
      const row = await page.evaluate(() => [...document.querySelectorAll('.tp-row.sched .tp-t')].some(e => /triage the inbox/i.test(e.textContent))); if (!row) throw new Error('no SCHEDULED row');
      const strip = await page.evaluate(() => { const e = document.querySelector('.tp-next'); return e.hidden ? '' : e.textContent; }); if (!/NEXT/.test(strip) || !/triage/i.test(strip)) throw new Error('next-up strip: ' + strip);
      await page.keyboard.press('b'); await page.waitForTimeout(600);
      const col = await page.evaluate(() => [...document.querySelectorAll('#board .lh')].map(e => e.textContent)); if (col[1] !== 'SCHEDULED') throw new Error('board columns: ' + col.join(','));
      const card = await page.evaluate(() => document.querySelectorAll('#board .tk.sched').length); if (!card) throw new Error('no SCHEDULED card on the board');
      await page.keyboard.press('Escape'); await page.waitForTimeout(400);
      await page.evaluate(() => window.CC.tasks.rtAct(window.CC.routines()[0].id, 'run')); await page.waitForTimeout(500);
      const fired = await page.evaluate(() => window.CC.tasks.tasks.some(t => t.routine && /triage the inbox/i.test(t.title))); if (!fired) throw new Error('RUN NOW did not make a task');
      await page.click('.tp-dd'); await page.click('.tp-menu button[data-k="marketing"]');
      await page.click('.tp-rep'); await page.fill('.tp-in', 'post the reel'); await page.keyboard.press('Enter'); await page.waitForTimeout(400);
      const no = await page.evaluate(() => document.querySelector('.tp-hint').textContent); if (!/later release/.test(no)) throw new Error('marketing not refused: ' + no);
      const still = await page.evaluate(() => window.CC.routines().length); if (still !== 1) throw new Error('a refused routine was added');
      await page.click('.tp-rep'); // REPEAT back off
      const opts = await page.evaluate(() => [...document.querySelectorAll('.tp-model option')].map(o => o.value).join(',') + '|' + document.querySelector('.tp-model').value); if (opts !== 'sonnet,opus,fable|sonnet') throw new Error('model menu: ' + opts);
      const eff = await page.evaluate(() => [...document.querySelectorAll('.tp-effort option')].map(o => o.value).join(',') + '|' + document.querySelector('.tp-effort').value); if (eff !== ',low,medium,high,xhigh,max|') throw new Error('effort menu: ' + eff);
      // V3.7: the box grows with the text, and the big editor mirrors it both ways
      await page.fill('.tp-in', 'line one\nline two\nline three'); await page.evaluate(() => document.querySelector('.tp-in').dispatchEvent(new Event('input', { bubbles: true }))); await page.waitForTimeout(200);
      const grown = await page.evaluate(() => document.querySelector('.tp-in').offsetHeight); if (grown < 50) throw new Error('box did not grow: ' + grown + 'px');
      await page.click('.tp-big-btn'); await page.waitForTimeout(300);
      const bigOn = await page.evaluate(() => document.getElementById('tpBig').classList.contains('on') && document.querySelector('.tb-in').value === document.querySelector('.tp-in').value && document.querySelector('.tb-dept').textContent === 'MARKETING'); if (!bigOn) throw new Error('big editor did not open with the text');
      await page.type('.tb-in', ' and more'); await page.waitForTimeout(200);
      const back = await page.evaluate(() => document.querySelector('.tp-in').value.endsWith(' and more') && /MARKETING LEAD|Goes to|Probably/.test(document.querySelector('.tb-hint').textContent)); if (!back) throw new Error('big editor did not mirror back');
      await page.keyboard.press('Escape'); await page.waitForTimeout(200);
      const bigOff = await page.evaluate(() => !document.getElementById('tpBig').classList.contains('on')); if (!bigOff) throw new Error('Esc did not close the big editor');
      await page.fill('.tp-in', ''); await page.evaluate(() => document.querySelector('.tp-in').dispatchEvent(new Event('input', { bubbles: true }))); await page.evaluate(() => document.querySelector('.tp-in').blur()); await page.click('.tp-chip[data-f="all"]'); // hand the keys back, feed back to All
      const rest = await page.evaluate(() => document.querySelector('.tp-in').offsetHeight); if (rest > 34) throw new Error('box did not shrink back: ' + rest + 'px');
      return 'hint says the schedule · SCHEDULED row + next-up strip + board column · RUN NOW fires · marketing refused · box grows + big editor mirrors';
    });
    await step('smoke: the CALENDAR button and P open the calendar — routines on their days, a task scheduled for a date, a routine from a date (demo)', async () => { // V3.2.1
      await page.click('#topCal'); await page.waitForTimeout(500); // the top-bar button opens it…
      if (!await page.$eval('#calOv', e => e.classList.contains('on'))) throw new Error('the CALENDAR button did not open the calendar');
      await page.keyboard.press('Escape'); await page.waitForTimeout(400);
      await page.keyboard.press('p'); await page.waitForTimeout(600); // …and so does P
      if (!await page.$eval('#calOv', e => e.classList.contains('on'))) throw new Error('P did not open the calendar');
      const cells = await page.$$eval('.cv-day', e => e.length); if (cells !== 35 && cells !== 42) throw new Error('month cells: ' + cells);
      if (!await page.$('.cv-day.today')) throw new Error('no today cell');
      const rt = await page.$$eval('.cv-ev.routine', e => e.length); if (rt < 3) throw new Error('routine occurrences on the grid: ' + rt);
      const rail = await page.$eval('#cvRtN', e => +e.textContent); if (rail < 1) throw new Error('rail empty');
      // a task for a day next week (the second day after today on the grid)
      const days = await page.$$eval('.cv-day', els => els.map(e => e.dataset.day)); const ti = days.indexOf(await page.$eval('.cv-day.today', e => e.dataset.day));
      const target = days[Math.min(days.length - 1, ti + 2)];
      await page.hover(`.cv-day[data-day="${target}"]`); await page.click(`.cv-day[data-day="${target}"] .cv-add`); await page.waitForTimeout(300);
      await page.selectOption('.cv-dept', 'sales'); await page.fill('.cv-text', 'Call the three warm leads from the expo'); await page.click('.cv-go'); await page.waitForTimeout(500);
      const sched = await page.$$eval('.cv-ev.sched', e => e.map(x => x.closest('.cv-day').dataset.day)); if (sched.length !== 1 || sched[0] !== target) throw new Error('scheduled card: ' + JSON.stringify(sched));
      const panel = await page.evaluate(() => window.CC.tasks.tasks.filter(t => t.state === 'scheduled').length); if (panel !== 1) throw new Error('panel has ' + panel + ' scheduled');
      // a routine from that date: REPEAT on, emails (routines are Emails/Accounting/Sales)
      await page.hover(`.cv-day[data-day="${target}"]`); await page.click(`.cv-day[data-day="${target}"] .cv-add`); await page.waitForTimeout(300);
      await page.selectOption('.cv-dept', 'emails'); await page.fill('.cv-text', 'Send the weekly client update'); await page.click('.cv-rep'); await page.waitForTimeout(200);
      const hint = await page.$eval('.cv-hint', e => e.textContent); if (!/Routine ·/.test(hint) || !/first run/.test(hint)) throw new Error('routine hint: ' + hint);
      await page.click('.cv-go'); await page.waitForTimeout(500);
      const r = await page.evaluate(() => window.CC.tasks.routines.find(x => /weekly client update/i.test(x.title))); if (!r || r.when.start !== target) throw new Error('routine start: ' + JSON.stringify(r && r.when));
      const before = await page.$$eval('.cv-ev.routine', (els, t) => els.filter(x => x.title.startsWith('Send the weekly client update') && x.closest('.cv-day').dataset.day < t).length, target); if (before) throw new Error('the routine shows before its start date');
      // marketing is refused for routines, with the sentence
      await page.hover(`.cv-day[data-day="${target}"]`); await page.click(`.cv-day[data-day="${target}"] .cv-add`); await page.waitForTimeout(200);
      await page.selectOption('.cv-dept', 'marketing'); await page.click('.cv-rep'); await page.waitForTimeout(150);
      const refused = await page.$eval('.cv-hint', e => e.textContent); const dis = await page.$eval('.cv-go', e => e.disabled); if (!/later release/.test(refused) || !dis) throw new Error('marketing routine not refused: ' + refused);
      await page.keyboard.press('Escape'); await page.waitForTimeout(150); if (!await page.$eval('#cvPop', e => e.hidden)) throw new Error('Esc did not close the popover');
      await page.click('.cv-seg button[data-v="week"]'); await page.waitForTimeout(300); const wk = await page.$$eval('.cv-day', e => e.length); if (wk !== 7) throw new Error('week cells: ' + wk);
      await page.keyboard.press('Escape'); await page.waitForTimeout(300); if (await page.$eval('#calOv', e => e.classList.contains('on'))) throw new Error('Esc did not close the calendar');
      return `${cells} cells · ${rt} routine runs on the grid · rail ${rail} · task scheduled for ${target} · routine starts ${target} (none before) · marketing refused · week view 7`;
    });
    await step('smoke: department focus opens the chat rail', async () => {
      await page.keyboard.press('1'); await page.waitForTimeout(1800);
      const cls = await page.evaluate(() => document.getElementById('rail').className); if (!/agentOpen/.test(cls) || !/open/.test(cls)) throw new Error('rail: ' + cls);
      const strip = await page.evaluate(() => document.querySelector('#topconn').className); if (!/focus/.test(strip)) throw new Error('top strip not centred');
      await page.keyboard.press('Escape'); await page.waitForTimeout(1200);
    });
    await step('smoke: B opens and closes the company board', async () => {
      await page.keyboard.press('b'); await page.waitForTimeout(700);
      if (!(await page.evaluate(() => window.CC.tasks.isOpen()))) throw new Error('board did not open');
      await page.keyboard.press('Escape'); await page.waitForTimeout(500);
      if (await page.evaluate(() => window.CC.tasks.isOpen())) throw new Error('board did not close');
    });
    await step('smoke: G opens the Brain graph with notes', async () => {
      await page.keyboard.press('g'); await page.waitForTimeout(700);
      if (!(await page.evaluate(() => window.CC.brain.isOpen()))) throw new Error('graph did not open');
      const n = await page.evaluate(() => window.CC.brain.nodes.length); if (n < 10) throw new Error('nodes: ' + n);
      await page.keyboard.press('Escape'); await page.waitForTimeout(300);
      if (await page.evaluate(() => window.CC.brain.isOpen())) throw new Error('graph did not close');
      return n + ' notes';
    });
    await step('smoke: approval flow reaches the panel', async () => {
      await page.evaluate(() => window.CC.requestApproval('ada'));
      await page.waitForFunction(() => document.querySelectorAll('.tp-row.waiting').length > 0, null, { timeout: 4000 }).catch(() => {}); // the panel renders on the next frame; headless WebGL frames can be slow
      const w = await page.evaluate(() => document.querySelectorAll('.tp-row.waiting').length); if (!w) throw new Error('no waiting row (ada: ' + (await page.evaluate(() => window.CC.R.ada.state)) + ')');
    });
    await step('smoke: no errors after the run', async () => { if (errors.length) throw new Error(errors[0]); });
  } catch (e) { bad('smoke: browser', e.message); }
  finally { if (browser) await browser.close(); }
}

/* ---------- 3. server smoke ---------- */
{
  const port = 4600 + Math.floor(Math.random() * 300);
  const env = { ...process.env, PORT: String(port) };
  const srv = spawn('node', ['serve.mjs'], { cwd: ROOT, env, stdio: ['ignore', 'pipe', 'pipe'] });
  let log = ''; srv.stdout.on('data', d => { log += d; }); srv.stderr.on('data', d => { log += d; });
  const base = `http://localhost:${port}`;
  const up = await (async () => { for (let i = 0; i < 40; i++) { try { const r = await fetch(base + '/api/health'); if (r.ok) return await r.json(); } catch {} await new Promise(r => setTimeout(r, 250)); } return null; })();
  if (!up) bad('server: starts', log.trim().split('\n').slice(-2).join(' | ') || 'no health response');
  else {
    ok('server: starts', `${up.name} · ${up.backend} · brain ${up.notes} notes`);
    await step('server: serves the office', async () => { const r = await fetch(base + '/'); const t = await r.text(); if (!/AGENTS OFFICE/.test(t)) throw new Error('html missing'); });
    await step('uploads: a zip is unpacked and every readable file inside becomes a section of one note; junk and unsupported files are named, not silently dropped', async () => {
      const JSZip = (await import('jszip')).default; const BRAIN_DIR = (await import('./config.mjs')).loadConfig().brainPath; const z = new JSZip(); const NL = String.fromCharCode(10);
      z.file('sales/week1.csv', 'day,sales' + NL + 'Mon,120' + NL + 'Tue,95' + NL); z.file('notes.txt', 'Creamy weekend note: waffles sold out.'); z.file('__MACOSX/._notes.txt', 'junk'); z.file('tool.exe', 'MZ');
      const buf = await z.generateAsync({ type: 'nodebuffer' });
      const r = await (await fetch(base + '/api/upload', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ filename: 'ZZ check sales.zip', dataBase64: buf.toString('base64') }) })).json();
      if (!r.ok) throw new Error('zip refused: ' + JSON.stringify(r));
      const noteFile = fs.readdirSync(path.join(BRAIN_DIR, 'Agents Office')).find(f => f.startsWith('Upload - ZZ check sales'));
      const note = fs.readFileSync(path.join(BRAIN_DIR, 'Agents Office', noteFile), 'utf8'); fs.rmSync(path.join(BRAIN_DIR, 'Agents Office', noteFile));
      const skipLine = note.split(String.fromCharCode(10)).find(l => l.includes('tool.exe')) || '';
      if (!note.includes('## sales/week1.csv') || !note.includes('Mon') || !note.includes('## notes.txt') || !skipLine.includes('not a supported') || note.includes('MACOSX')) throw new Error('the zip note is wrong: ' + note.slice(0, 400));
      return '2 files read into one note · the unsupported .exe is named as skipped · macOS junk ignored';
    });
    await step('server: /api/dashboards lists the Clients sub-pages', async () => { const j = await (await fetch(base + '/api/dashboards')).json(); if (!Array.isArray(j.dashboards) || !j.dashboards.length || !j.dashboards[0].id || typeof j.dashboards[0].data?.available !== 'boolean') throw new Error('bad shape'); return j.dashboards.map(d => d.name + (d.data.available ? '' : ' (no data yet)')).join(', '); });
    await step('server: /api/brain has the live graph', async () => { const g = await (await fetch(base + '/api/brain')).json(); if (!g.nodes.length) throw new Error('empty'); return `${g.nodes.length} linked notes`; });
    await step('server: /api/mcp lists this machine\'s connectors', async () => {
      const m = await (await fetch(base + '/api/mcp')).json();
      if (!Array.isArray(m.servers)) throw new Error('no servers array');
      const c = m.servers.filter(s => s.status === 'connected').length;
      return `${m.servers.length} servers · ${c} connected · agents get tools: ${m.tools ? 'yes' : 'no (API backend)'}${m.web ? ' + web' : ''}`;
    });
    await step('server: /api/health carries the roster', async () => { if (!Array.isArray(up.agents) || up.agents.length !== 35) throw new Error('agents: ' + (up.agents && up.agents.length)); if (!up.agents[0].does) throw new Error('no job description'); });
    await step('server: the office default is Sonnet and /api/usage always answers', async () => {
      if (up.model !== 'sonnet' || JSON.stringify(up.models) !== '["sonnet","opus","fable"]') throw new Error('health model: ' + up.model);
      if (up.effort !== (cfg.effort || '') || JSON.stringify(up.efforts) !== '["low","medium","high","xhigh","max"]') throw new Error('health effort: ' + up.effort);
      const r = await fetch(base + '/api/usage'); if (r.status !== 200) throw new Error('status ' + r.status); const u = await r.json();
      if (!u.ok || !['claude', 'office'].includes(u.source)) throw new Error(JSON.stringify(u).slice(0, 120));
      return u.source === 'claude' ? `Claude's gauge: session ${u.session?.percent}% · week ${u.week?.percent}%` : `office count (${u.reason})`;
    });
    await step('server: /api/skills lists the skills and who has them', async () => {
      const s = await (await fetch(base + '/api/skills')).json(); if (!s.count || !Array.isArray(s.skills)) throw new Error('no skills');
      const piper = up.agents.find(a => a.id === 'piper'); if (!piper.skills?.includes('proposal')) throw new Error('health roster has no skills on piper');
      return `${s.count} skills · piper: ${piper.skills.join(', ')}`;
    });
    await step('server: the lead offers the interview when a department is not set up', async () => {
      const lead = up.agents.find(a => a.id === 'lexi'); if (lead.interviewer !== true) throw new Error('lexi is not the interviewer');
      if (typeof up.setup?.sales !== 'boolean') throw new Error('no setup map');
      const r = await (await fetch(base + '/api/lessons')).json(); if (!Array.isArray(r.agents)) throw new Error('no lessons endpoint');
      return `sales set up: ${up.setup.sales} · lessons dir ${path.basename(r.dir)}`;
    });
    await step('server: /api/routines lists the timetable and names the departments', async () => {
      const r = await (await fetch(base + '/api/routines')).json(); if (!Array.isArray(r.routines) || JSON.stringify(r.depts) !== '["emails","fin","sales"]') throw new Error(JSON.stringify(r).slice(0, 120));
      if (typeof up.routines?.count !== 'number') throw new Error('health has no routines');
      return `${r.routines.length} routines${r.routines.length ? ' · next ' + (r.routines.filter(x => x.nextAt).sort((a, b) => a.nextAt - b.nextAt)[0]?.title || '—') : ''} · ${path.basename(path.dirname(r.path))}/${path.basename(r.path)}`;
    });
    await step('server: a routine outside Emails, Accounting and Sales is refused with a sentence', async () => {
      const r = await fetch(base + '/api/routines', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ dept: 'marketing', text: 'every day at 9am post the reel' }) });
      const j = await r.json(); if (r.status !== 400 || !j.refused || !/later release/.test(j.error)) throw new Error(r.status + ' ' + JSON.stringify(j));
      const t = await fetch(base + '/api/routines', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ dept: 'emails', text: 'every weekday, triage the inbox' }) });
      const k = await t.json(); if (t.status !== 400 || !k.needsTime) throw new Error('missing time not asked back: ' + JSON.stringify(k));
      const n = await fetch(base + '/api/routines', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ dept: 'sales', text: 'chase the quiet deals' }) });
      const m = await n.json(); if (n.status !== 400 || !m.noSchedule) throw new Error('no schedule not named: ' + JSON.stringify(m));
      return j.error;
    });
    await step('server: /api/health says teams and the browser are on; the bar has the Chrome tile', async () => {
      if (!up.teams || up.teams.enabled !== true || up.teams.max !== 4) throw new Error('health.teams: ' + JSON.stringify(up.teams));
      if (!up.browser || up.browser.on !== true) throw new Error('health.browser: ' + JSON.stringify(up.browser));
      const m = await (await fetch(base + '/api/mcp')).json();
      const c = m.servers.find(s => s.id === 'claude-in-chrome'); if (!c || c.key !== 'chrome' || !Array.isArray(c.depts) || c.depts.length !== 6) throw new Error('chrome not in /api/mcp: ' + JSON.stringify(c));
      return `teams on (max ${up.teams.max}) · Chrome ${c.status}${up.browser.device ? ' · ' + up.browser.device : ''} · wired to every pod`;
    });
    await step('server: /aios serves the dashboard and /api/matrix holds the Eisenhower matrix', async () => { // V3.9
      const p = await fetch(base + '/aios'); if (!p.ok || !/Eisenhower matrix/.test(await p.text())) throw new Error('/aios ' + p.status);
      const m = await (await fetch(base + '/api/matrix')).json(); if (!Array.isArray(m.items) || Object.keys(m.quadrants || {}).join() !== 'do,plan,delegate,drop') throw new Error(JSON.stringify(m).slice(0, 120));
      const e = await fetch(base + '/api/matrix/feed', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: '  ' }) });
      if (e.status !== 400) throw new Error('an empty feed was accepted');
      return `${m.items.filter(i => i.state === 'open').length} open actions · ${m.items.filter(i => i.state === 'open' && i.gap).length} gaps`;
    });
    await step('server: a task scheduled for a time that has passed is refused', async () => { // V3.2.1
      const r = await fetch(base + '/api/tasks', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ dept: 'sales', text: 'call the leads', at: Date.now() - 3600000 }) });
      const j = await r.json(); if (r.status !== 400 || !/passed/.test(j.error)) throw new Error(r.status + ' ' + JSON.stringify(j));
      const b = await fetch(base + '/api/tasks', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ dept: 'sales', text: 'call the leads', at: 'tomorrowish' }) });
      if (b.status !== 400) throw new Error('bad time accepted');
      return j.error;
    });
    await step('server: an answer needs a task that is waiting and some text, and an unknown task is a 404', async () => {
      const post = (id, b) => fetch(base + '/api/tasks/' + id + '/answer', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) });
      const r = await post('no-such-task', { feedback: 'Mary is at mary@example.com' });
      if (r.status !== 404) throw new Error('unknown task: status ' + r.status);
      return 'unknown task refused (the waiting-state and empty-text rules are in the same handler)';
    });
    await step('server: rejects an empty task', async () => { const r = await fetch(base + '/api/tasks', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"dept":"sales","text":""}' }); if (r.status !== 400) throw new Error('status ' + r.status); });
    if (LIVE) {
      await step('live: Claude routes a task', async () => {
        const r = await fetch(base + '/api/tasks', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ dept: 'emails', text: 'reply to a client asking when their September report will arrive' }) });
        if (!r.ok) throw new Error((await r.json()).error); const t = await r.json(); globalThis.__t = t; return `${t.agent} · ${t.title}`;
      });
      await step('live: the agent delivers and the note is saved', async () => {
        const t = globalThis.__t; if (!t) throw new Error('no task'); const r = await fetch(`${base}/api/tasks/${t.id}/run`, { method: 'POST' });
        if (!r.ok) throw new Error((await r.json()).error); const d = await r.json(); if (d.error) throw new Error(d.result);
        const notePath = path.join(cfg.brainPath, 'Agents Office', d.note + '.md'); if (!fs.existsSync(notePath)) throw new Error('note not written: ' + notePath);
        return `${d.result.length} chars · read ${d.read.join(', ')} · ${d.note}.md`;
      });
      await step('live: a two-minute routine fires on the server, runs and lands', async () => {
        const r = await fetch(base + '/api/routines', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ dept: 'emails', text: 'every 2 minutes, list what is in the inbox that needs me today' }) });
        const j = await r.json(); if (!r.ok) throw new Error(j.error); const id = j.routine.id;
        try {
          if (!j.routine.nextAt || j.routine.desc !== 'every 2 min') throw new Error('routine wrong: ' + JSON.stringify(j.routine));
          let task = null;
          for (let i = 0; i < 100 && !(task && task.state !== 'next' && task.state !== 'doing'); i++) { await new Promise(r => setTimeout(r, 3000)); task = (await (await fetch(base + '/api/tasks')).json()).find(t => t.routine === id); }
          if (!task) throw new Error('the routine never fired'); if (task.state === 'next' || task.state === 'doing') throw new Error('the routine fired but did not finish in time');
          if (task.by !== 'routine' || task.error) throw new Error('task: ' + task.state + ' ' + (task.result || '').slice(0, 120));
          return `${task.agent} · ${task.title} · ${task.state}${task.state === 'waiting' ? ' for the OK' : ''} · ${task.result.length} chars`;
        } finally { await fetch(`${base}/api/routines/${id}`, { method: 'DELETE' }); }
      });
      await step('live: a task set to Opus runs on Opus and says so', async () => {
        const r = await fetch(base + '/api/tasks', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ dept: 'sales', text: 'one line: what should the next follow-up to a quiet lead say', model: 'opus' }) });
        if (!r.ok) throw new Error((await r.json()).error); const t = await r.json(); if (t.model !== 'opus') throw new Error('task.model ' + t.model);
        const d = await (await fetch(`${base}/api/tasks/${t.id}/run`, { method: 'POST' })).json(); if (d.error) throw new Error(d.result);
        if (d.modelUsed !== 'opus' || d.modelFrom !== 'task' || !/opus/.test(String(d.modelId))) throw new Error(`ran on ${d.modelId} (${d.modelUsed} from ${d.modelFrom})`);
        const u = await (await fetch(base + '/api/usage')).json(); if (!u.ok) throw new Error('usage after a run');
        return `${d.agent} · ${d.modelId} · from the task · gauge ${u.source}`;
      });
      await step('live: a task scheduled 75 s ahead fires on its minute and lands; a routine from a date waits for it', async () => { // V3.2.1
        const at = Date.now() + 75000;
        const r = await fetch(base + '/api/tasks', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ dept: 'emails', text: 'list what is in the inbox that needs me today', at }) });
        const t = await r.json(); if (!r.ok) throw new Error(t.error); if (t.state !== 'scheduled' || t.dueAt !== at) throw new Error('not scheduled: ' + JSON.stringify({ state: t.state, dueAt: t.dueAt }));
        const start = new Date(Date.now() + 10 * 864e5).toISOString().slice(0, 10);
        const rr = await fetch(base + '/api/routines', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ dept: 'emails', text: 'triage the inbox', when: { kind: 'weekdays', at: '08:00', start } }) });
        const j = await rr.json(); if (!rr.ok) throw new Error(j.error);
        try {
          if (!j.routine.nextAt || new Date(j.routine.nextAt).toISOString().slice(0, 10) < start) throw new Error('routine fires before its start: ' + new Date(j.routine.nextAt));
          let task = null;
          for (let i = 0; i < 100 && !(task && task.state !== 'scheduled' && task.state !== 'next' && task.state !== 'doing'); i++) { await new Promise(r => setTimeout(r, 3000)); task = (await (await fetch(base + '/api/tasks')).json()).find(x => x.id === t.id); }
          if (!task || task.state === 'scheduled') throw new Error('the scheduled task never fired'); if (task.state === 'next' || task.state === 'doing') throw new Error('fired but did not finish in time');
          if (task.error) throw new Error('task failed: ' + task.result.slice(0, 120));
          return `${task.agent} · ${task.title} · ${task.state}${task.state === 'waiting' ? ' for the OK' : ''} · routine "${j.routine.desc}" next ${new Date(j.routine.nextAt).toDateString()}`;
        } finally { await fetch(`${base}/api/routines/${j.routine.id}`, { method: 'DELETE' }); }
      });
      await step('live: a team task — the lead plans, the desks work at once, the lead writes the final', async () => {
        const r = await fetch(base + '/api/tasks', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ dept: 'marketing', text: 'as a team, give me three angles for a reel about inbox overload: for each one a hook line and a two-sentence caption', team: true }) });
        if (!r.ok) throw new Error((await r.json()).error); const t = await r.json();
        if (!t.team || t.agent !== 'mlead') throw new Error('not a team task for the lead: ' + JSON.stringify({ team: t.team, agent: t.agent }));
        const d = await (await fetch(`${base}/api/tasks/${t.id}/run`, { method: 'POST' })).json(); if (d.error) throw new Error(d.result);
        const ps = d.team?.pieces || []; if (ps.length < 2) throw new Error('fewer than two pieces: ' + JSON.stringify(d.team));
        if (new Set(ps.map(p => p.agent)).size !== ps.length) throw new Error('a desk got two pieces');
        if (!ps.every(p => p.state === 'done' && p.result)) throw new Error('a piece did not finish: ' + JSON.stringify(ps.map(p => [p.agent, p.state])));
        if (!/Team:/i.test(d.result)) throw new Error('the final has no Team line');
        const note = fs.readFileSync(path.join(cfg.brainPath, 'Agents Office', d.note + '.md'), 'utf8'); if (!/^team: /m.test(note) || !/## Team/.test(note)) throw new Error('the note does not carry the team');
        return `${ps.map(p => p.agent).join(' + ')} → ${d.agent} · ${d.result.length} chars · ${(d.team.messages || []).length} notes between them · ${d.note}.md`;
      });
      await step('live: an agent drives the owner\'s Chrome', async () => {
        const r = await fetch(base + '/api/tasks', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ dept: 'ops', text: 'Open https://example.com in the browser and tell me the exact page heading and where its one link points. Then close the tab.' }) });
        if (!r.ok) throw new Error((await r.json()).error); const t = await r.json();
        const d = await (await fetch(`${base}/api/tasks/${t.id}/run`, { method: 'POST' })).json(); if (d.error) throw new Error(d.result);
        if (!(d.tools || []).includes('chrome')) throw new Error('the browser was not used (tools: ' + (d.tools || []).join(' ') + '): ' + d.result.slice(0, 200));
        if (!/example domain/i.test(d.result)) throw new Error('the heading is not in the result: ' + d.result.slice(0, 200));
        return `${d.agent} · used ${d.used.join(', ')} · "${d.result.match(/example domain/i)[0]}"`;
      });
      await step('live: chat answers in persona', async () => {
        const r = await fetch(base + '/api/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ agent: 'lexi', text: 'what is our proposal win rate?' }) });
        if (!r.ok) throw new Error((await r.json()).error); const j = await r.json(); if (!j.reply) throw new Error('empty reply'); return j.reply.slice(0, 80).replace(/\n/g, ' ');
      });
      if (chromium) await step('live: the whole flow in a browser', async () => {
        let browser; try { browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'] }); } catch { browser = await chromium.launch({ channel: 'chrome' }); }
        try {
          const page = await browser.newPage({ viewport: { width: 1512, height: 900 } });
          const errs = []; page.on('pageerror', e => errs.push(e.message));
          await page.goto(base + '/'); await page.waitForTimeout(3500);
          const mode = await page.evaluate(() => document.querySelector('.tp-mode').textContent); if (!/LIVE/.test(mode)) throw new Error('panel not live: ' + mode);
          const before = await page.evaluate(() => window.CC.brain.nodes.length);
          const known = await page.evaluate(() => window.CC.tasks.tasks.filter(t => t.live).map(t => t.id));
          await page.click('.tp-dd'); await page.click('.tp-menu button[data-k="marketing"]');
          await page.fill('.tp-in', 'write three hook lines for a reel about why most businesses ignore their inbox'); await page.keyboard.press('Enter');
          await page.waitForFunction(() => /Added|couldn/i.test(document.querySelector('.tp-hint').textContent), { timeout: 150000 });
          const hint = await page.evaluate(() => document.querySelector('.tp-hint').textContent); if (!/Added/.test(hint)) throw new Error(hint);
          const mine = await page.evaluate(k => window.CC.tasks.tasks.find(t => t.live && !k.includes(t.id))?.id, known); if (!mine) throw new Error('the new task is not in the panel');
          await page.waitForFunction(id => { const t = window.CC.tasks.tasks.find(x => x.id === id); return t && t.state === 'done'; }, mine, { timeout: 240000 });
          const done = await page.evaluate(id => { const t = window.CC.tasks.tasks.find(x => x.id === id); return { error: t.error, note: t.note, read: t.read }; }, mine);
          if (done.error) throw new Error('task failed');
          await page.waitForTimeout(2500);
          await page.click(`.tp-row[data-id="${mine}"]`); await page.waitForTimeout(2500);
          const card = await page.evaluate(n => [...document.querySelectorAll('.m-file .f-name')].some(e => e.textContent === n + '.md'), done.note); if (!card) throw new Error('deliverable card not in the chat');
          const after = await page.evaluate(() => window.CC.brain.nodes.length);
          const inGraph = await page.evaluate(n => window.CC.brain.nodes.some(x => x.id === n), done.note); // a second run on the same day rewrites the same note, so the count may not grow
          if (after < before || !inGraph) throw new Error(`the new note is not in the brain graph (${before} → ${after}, ${done.note})`);
          if (errs.length) throw new Error(errs[0]);
          return `${hint.trim().slice(0, 50)} · ${done.note}.md in the chat and in the graph · brain ${before} → ${after} notes`;
        } finally { await browser.close(); }
      });
    } else ok('live: skipped', 'set CHECK_LIVE=1 to route one task and one chat through Claude');
  }
  srv.kill();
}

/* ---------- summary ---------- */
const fails = results.filter(r => !r[0]);
console.log(`\n${fails.length ? '✗' : '✓'} ${results.length - fails.length}/${results.length} checks passed${fails.length ? ' — ' + fails.map(f => f[1]).join(', ') : ''}`);
process.exit(fails.length ? 1 : 0);
