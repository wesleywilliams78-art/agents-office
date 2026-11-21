// Client onboarding (13 Nov 2026): every workstream's answers kept in one Brain note, 30-Customers/<id>-onboarding.md.
// The note is the only store: the Workstreams tab reads it back by the <!-- q:key --> marker after each question.
// Core sections every client gets; optional ones are switched on per client (front matter `sections:`).
// The questions are the set below; <brain>/Agents Office/onboarding-questions.json (same shape) replaces them.
//
// Question types, and how each answer is written in the note (plain text, so an agent reads it as it is):
//   text   free text (the default)
//   choice one of `options`, or a value of Wesley's own
//   picks  any of `options` plus his own, written "A, B, C"
//   date   YYYY-MM-DD
//   links  one line per platform: "- Uber Eats: <link or handle> — access: Requested" (`options` is the platform list)
import fs from 'node:fs';
import path from 'node:path';
import { SECRET } from './brainnotes.mjs';

export const ACCESS = ['We have it', 'Requested', 'Not needed']; // the access status beside a link
export const QUESTIONS = [
  { id: 'basics', title: 'The basics', qs: [
    { key: 'legal', q: 'Legal name of the business' },
    { key: 'trading', q: 'Trading name(s) and brands' },
    { key: 'what', q: 'What they do, in one line' },
    { key: 'shape', q: 'What kind of business', type: 'choice', options: ['Independent', 'Multi-site group', 'Franchisee', 'Franchisor', 'Hotel or venue', 'Supplier or platform'] },
    { key: 'sites', q: 'How many sites, and where' },
    { key: 'company', q: 'Company number and registered address' },
  ] },
  { id: 'people', title: 'People', qs: [
    { key: 'contact', q: 'Main contact: name, role, email, phone' },
    { key: 'decider', q: 'Who signs things off' },
    { key: 'others', q: 'Other people we will deal with' },
    { key: 'channel', q: 'How they like to talk', type: 'picks', options: ['WhatsApp', 'Email', 'Phone', 'Teams', 'Zoom', 'Google Meet', 'In person'] },
    { key: 'rhythm', q: 'Meeting rhythm', type: 'choice', options: ['Weekly call', 'Fortnightly call', 'Monthly review', 'As needed'] },
  ] },
  { id: 'work', title: 'The work', qs: [
    { key: 'why', q: 'Why they came to us: the problem in their words' },
    { key: 'success', q: 'What success looks like in 90 days' },
    { key: 'scope', q: 'What is in scope, and what is not' },
    { key: 'start', q: 'Start date', type: 'date' },
    { key: 'deadlines', q: 'Fixed deadlines (openings, launches, renewals)' },
    { key: 'terms', q: 'Fee or pay, and how it is billed or paid' },
    { key: 'invoice', q: 'Who invoices go to' },
  ] },
  { id: 'systems', title: 'Systems and access', qs: [
    { key: 'till', q: 'Till', type: 'picks', options: ['Presto', 'Square', 'Lightspeed', 'Toast', 'Zonal', 'Epos Now', 'Tevalis'] },
    { key: 'ordering', q: 'Delivery and online ordering hub', type: 'picks', options: ['Deliverect', 'Otter', 'Flipdish', 'Slerp', 'Own app'] },
    { key: 'accounts', q: 'Accounts', type: 'picks', options: ['Xero', 'QuickBooks', 'Sage', 'FreeAgent'] },
    { key: 'rota', q: 'Rota and HR', type: 'picks', options: ['Deputy', 'Planday', 'RotaCloud', 'Bizimply', 'Harri', 'Fourth'] },
    { key: 'bookings', q: 'Bookings', type: 'picks', options: ['OpenTable', 'ResDiary', 'SevenRooms', 'Collins', 'DesignMyNight'] },
    { key: 'stock', q: 'Stock and suppliers', type: 'picks', options: ['Nory', 'Kitchen CUT', 'Procure Wizard', 'MarketMan', 'Apicbase'] },
    { key: 'access', q: 'Other access we need, by system name only (never a password here)' },
    { key: 'drive', q: 'Shared folder or Drive link' },
    { key: 'tracker', q: 'Project tracker sheet' },
  ] },
  { id: 'online', title: 'Online presence', optional: true, on: true, qs: [
    { key: 'presence', q: 'Website, profiles and guest pages', type: 'links', options: ['Website', 'Google Business Profile', 'Instagram', 'Facebook', 'TikTok', 'LinkedIn', 'X', 'YouTube', 'Tripadvisor', 'Booking page', 'Online ordering page', 'Gift cards'] },
  ] },
  { id: 'delivery', title: 'Delivery platforms', optional: true, qs: [
    { key: 'platforms', q: 'Platforms and partner portals', type: 'links', options: ['Uber Eats', 'Deliveroo', 'Just Eat', 'Own delivery', 'Click and collect'] },
    { key: 'dshare', q: 'Share of sales from delivery' },
    { key: 'dmenu', q: 'Delivery menu: same as in-house, or its own' , type: 'choice', options: ['Same as in-house', 'Its own menu', 'Virtual brands as well'] },
    { key: 'dpain', q: 'Delivery problems right now (ratings, errors, downtime)' },
  ] },
  { id: 'multisite', title: 'Multi-site and franchise', optional: true, qs: [
    { key: 'model', q: 'How the sites are run', type: 'choice', options: ['All owned', 'All franchised', 'Mixed'] },
    { key: 'territories', q: 'Territories and countries, now and planned' },
    { key: 'agreement', q: 'Franchise agreement and fee structure: where it is' },
    { key: 'opsmanual', q: 'Operations manual', type: 'choice', options: ['None', 'Out of date', 'Current'] },
    { key: 'fieldteam', q: 'Area or field managers' },
    { key: 'pipeline', q: 'Sites in the pipeline' },
  ] },
  { id: 'safety', title: 'Food safety and compliance', optional: true, qs: [
    { key: 'fhrs', q: 'Hygiene ratings by site' },
    { key: 'eho', q: 'Last EHO visit and what came of it' },
    { key: 'haccp', q: 'Food safety system', type: 'picks', options: ['SFBB', 'HACCP plan', 'Digital checklists', 'Paper logs'] },
    { key: 'allergens', q: 'How allergens are managed' },
    { key: 'licences', q: 'Licences (premises, alcohol, late night)' },
  ] },
  { id: 'hr', title: 'People and HR', optional: true, qs: [
    { key: 'headcount', q: 'Headcount, by site if it differs' },
    { key: 'managers', q: 'Key managers and who runs each site' },
    { key: 'training', q: 'Training in place today' },
    { key: 'hrpain', q: 'People problems right now (turnover, gaps, skills)' },
  ] },
  { id: 'finance', title: 'Finance and reporting', optional: true, qs: [
    { key: 'reports', q: 'Reports they can send', type: 'picks', options: ['P&L', 'Sales by day', 'Sales by hour', 'Product mix', 'Labour %', 'Food cost %', 'Stock counts', 'Delivery statements'] },
    { key: 'cadence', q: 'How often', type: 'choice', options: ['Weekly', 'Monthly', 'Quarterly', 'When asked'] },
    { key: 'kpis', q: 'The numbers they watch most' },
    { key: 'yearend', q: 'Financial year end and accountant' },
  ] },
  { id: 'brand', title: 'Marketing and brand', optional: true, qs: [
    { key: 'brand', q: 'Where the logo and brand files are' },
    { key: 'tone', q: 'Tone, and anything we must never say or do' },
    { key: 'agency', q: 'Marketing agency or freelancer, if any' },
    { key: 'campaigns', q: 'Campaigns running or planned' },
  ] },
];
export const KINDS = { client: 'Client', employment: 'Employment' }; // employment duties are run like a client

const DIR = '30-Customers';
export const slug = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48);
const fileOf = (brain, id) => path.join(brain, DIR, id + '-onboarding.md');
const oneLine = s => String(s ?? '').replace(/\r/g, '').trim();
const TYPES = new Set(['text', 'choice', 'picks', 'date', 'links']);

export function questions(brain) {
  try {
    const j = JSON.parse(fs.readFileSync(path.join(brain, 'Agents Office', 'onboarding-questions.json'), 'utf8'));
    const secs = (Array.isArray(j) ? j : j.sections || []).filter(s => s && /^[a-z0-9-]+$/.test(s.id) && s.title && Array.isArray(s.qs) && s.qs.every(q => q && /^[a-z0-9-]+$/.test(q.key) && q.q && (!q.type || TYPES.has(q.type))));
    if (secs.length) return secs;
  } catch {}
  return QUESTIONS;
}
const defaultOn = qs => qs.filter(s => s.optional && s.on).map(s => s.id);
const activeSecs = (qs, on) => qs.filter(s => !s.optional || on.includes(s.id));
const counts = (qs, c) => { const act = activeSecs(qs, c.sections); return { answered: act.reduce((n, s) => n + s.qs.filter(q => c.answers[q.key]).length, 0), total: act.reduce((n, s) => n + s.qs.length, 0) }; };

export function read(brain, id) {
  if (!/^[a-z0-9-]+$/.test(String(id))) return null;
  let text; try { text = fs.readFileSync(fileOf(brain, id), 'utf8').replace(/\r/g, ''); } catch { return null; }
  const fm = /^---\n([\s\S]*?)\n---\n/.exec(text)?.[1] || '';
  const meta = Object.fromEntries(fm.split('\n').map(l => /^(\w+):\s*(.*)$/.exec(l)).filter(Boolean).map(m => [m[1], m[2].trim()]));
  const answers = {};
  for (const part of text.split(/^### /m).slice(1)) {
    const m = /<!-- q:([a-z0-9-]+) -->\n([\s\S]*)$/.exec(part); if (!m) continue;
    const a = m[2].replace(/\n## [\s\S]*$/, '').trim(); if (a && a !== '_Not yet answered._') answers[m[1]] = a;
  }
  const sections = 'sections' in meta ? meta.sections.split(',').map(s => s.trim()).filter(Boolean) : defaultOn(questions(brain));
  return { id, name: meta.client || id, kind: KINDS[meta.kind] ? meta.kind : 'client', started: meta.started || '', updated: meta.updated || '', sections, answers };
}

function write(brain, c, qs) {
  const today = new Date().toISOString().slice(0, 10), { answered, total } = counts(qs, c);
  const on = qs.filter(s => s.optional && c.sections.includes(s.id)).map(s => s.title);
  let md = `---\nclient: ${c.name}\nid: ${c.id}\nkind: ${c.kind}\nsections: ${c.sections.join(', ')}\nstarted: ${c.started || today}\nupdated: ${today}\n---\n# ${c.name}: onboarding\n\n` +
    `${KINDS[c.kind]} workstream. ${answered} of ${total} answered. Extra sections: ${on.join(', ') || 'none'}. Kept by the Workstreams tab in the AIOS; edit the answers there or here under each question.\n`;
  const sec = (title, list) => { md += `\n## ${title}\n`; for (const q of list) md += `\n### ${q.q} <!-- q:${q.key} -->\n${c.answers[q.key] || '_Not yet answered._'}\n`; };
  for (const s of qs) {
    if (!s.optional || c.sections.includes(s.id)) sec(s.title, s.qs);
    else if (s.qs.some(q => c.answers[q.key])) sec(s.title + ' (switched off)', s.qs.filter(q => c.answers[q.key])); // switching a section off never loses what was answered
  }
  const extra = Object.keys(c.answers).filter(k => !qs.some(s => s.qs.some(q => q.key === k))); // answers to questions since removed are kept, not lost
  if (extra.length) sec('Earlier questions', extra.map(k => ({ key: k, q: k })));
  fs.mkdirSync(path.join(brain, DIR), { recursive: true });
  fs.writeFileSync(fileOf(brain, c.id), md);
  return { ...c, started: c.started || today, updated: today };
}

export function list(brain) {
  let names = []; try { names = fs.readdirSync(path.join(brain, DIR)).filter(n => n.endsWith('-onboarding.md')); } catch {}
  const qs = questions(brain);
  return names.map(n => read(brain, n.slice(0, -'-onboarding.md'.length))).filter(Boolean)
    .map(c => ({ id: c.id, name: c.name, kind: c.kind, started: c.started, updated: c.updated, ...counts(qs, c) }))
    .sort((a, b) => (a.started || '').localeCompare(b.started || '') || a.name.localeCompare(b.name));
}

const pickSections = (qs, ids) => qs.filter(s => s.optional && ids.includes(s.id)).map(s => s.id);
export function create(brain, { name, kind, sections }) {
  name = oneLine(name).replace(/\n/g, ' ').slice(0, 80); const id = slug(name), qs = questions(brain);
  if (!id) return { error: 'Give the client a name.' };
  if (fs.existsSync(fileOf(brain, id))) return { error: `${name} already has an onboarding note.`, id };
  return { client: write(brain, { id, name, kind: KINDS[kind] ? kind : 'client', started: '', sections: Array.isArray(sections) ? pickSections(qs, sections) : defaultOn(qs), answers: {} }, qs) };
}

export function save(brain, id, { answers, sections } = {}) {
  const c = read(brain, id); if (!c) return { error: 'No onboarding note for this client.' };
  const qs = questions(brain), all = qs.flatMap(s => s.qs);
  if (Array.isArray(sections)) c.sections = pickSections(qs, sections);
  for (const [k, v] of Object.entries(answers || {})) {
    const q = all.find(x => x.key === k); if (!q) continue;
    const a = oneLine(v).replace(/^#+ /gm, '').slice(0, 4000); // no headings inside an answer, or the note would not read back
    if (SECRET.some(re => re.test(a))) return { error: `"${q.q}" looks like it holds a password, key, card number or bank detail. Those never go in the Brain: name the system only.` };
    if (a) c.answers[k] = a; else delete c.answers[k];
  }
  return { client: write(brain, c, qs) };
}
