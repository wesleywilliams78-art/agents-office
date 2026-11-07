// Diagram studio: turns a diagram spec into a checked interactive HTML page and a PNG, with the Archify engine
// (tt-a1i/archify, Apache-2.0, installed in C:\Users\Wesley\tools\archify; notice in README.md beside this file).
// Archify validates the spec, lays it out and checks it in a real browser; the installed Chrome then takes the picture.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chrome, pngSize } from '../video-studio/look.mjs';
import { brandStyle } from './brand.mjs';
import { BLUEPRINT_USE, blueprintSchema, blueprintExample, checkBlueprint, blueprintHtml } from './blueprint.mjs';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const ENGINE = process.env.ARCHIFY_HOME || path.join(os.homedir(), 'tools', 'archify');
export const OUT = path.join(ROOT, 'output', 'library', 'diagrams');
export const TYPES = {
  workflow: 'a process with steps, people or teams in lanes, approvals, branches and loops (an SOP, a weekly run, an onboarding)',
  lifecycle: 'the states something passes through and what moves it on (an order, a lead, an application, a site opening)',
  timeline: 'dated events on one clock, a lane per source (a launch plan, an incident, a rollout)',
  tree: 'a one-parent breakdown (an org chart, a service menu, a capability map)',
  sequence: 'back-and-forth between people or systems over time (a booking, a delivery order, a handover)',
  dataflow: 'where money, documents or data go and who receives them (a P&L feed, a report pipeline)',
  architecture: 'what a system or business is made of and how the parts connect (a tech stack, a franchise network)',
  erd: 'database tables, columns and keys', class: 'software types and how they relate', waterfall: 'where the time went in one run, as nested spans',
  blueprint: BLUEPRINT_USE,
};
export const STYLES = ['editorial', 'classic', 'blueprint', 'signal-flow'];
const LEGEND = new Set(['architecture', 'class', 'dataflow', 'erd', 'lifecycle', 'sequence', 'workflow']);
const EXAMPLE = { architecture: 'web-app.architecture.json', workflow: 'agent-tool-call.workflow.json', sequence: 'cache-miss-request.sequence.json', dataflow: 'product-analytics.dataflow.json', lifecycle: 'deployment-release.lifecycle.json', erd: 'orders.erd.json', tree: 'payment-platform.tree.json', class: 'payments.class.json', timeline: 'payment-incident.timeline.json', waterfall: 'checkout-request.waterfall.json' };

export const ready = () => fs.existsSync(path.join(ENGINE, 'bin', 'archify.mjs'));

/** The schema and a worked example for one type, so a desk can write a spec that passes first time. */
export function guide(type) {
  if (type === 'blueprint') return { type, useFor: TYPES.blueprint, schema: blueprintSchema, example: blueprintExample, note: 'Drawn by the studio itself in the WRW look only: style, theme and brand are ignored. The example is a table booking: copy its shape, never its facts.' };
  const read = f => JSON.parse(fs.readFileSync(path.join(ENGINE, f), 'utf8'));
  return { type, useFor: TYPES[type], schema: read(path.join('schemas', type + '.schema.json')), example: read(path.join('examples', EXAMPLE[type])) };
}

const slug = s => String(s || 'diagram').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'diagram';
const day = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

/** Draw one diagram. Returns { ok:true, dir, html, png, width, height } or { ok:false, problems:[...] }. */
export function draw({ type, diagram, title, style = 'editorial', theme = 'light', brand = 'wrw' }) {
  if (!TYPES[type]) return { ok: false, problems: [`type must be one of: ${Object.keys(TYPES).join(', ')}`] };
  if (!diagram || typeof diagram !== 'object' || Array.isArray(diagram)) return { ok: false, problems: ['diagram must be the spec object (see diagram_guide for the schema and an example)'] };
  if (!STYLES.includes(style)) return { ok: false, problems: [`style must be one of: ${STYLES.join(', ')}`] };
  if (type === 'blueprint') return drawBlueprint(diagram, title);
  if (!ready()) return { ok: false, problems: [`the Archify engine is not installed at ${ENGINE}`] };
  const spec = structuredClone(diagram);
  spec.schema_version ??= 2; spec.diagram_type = type;
  const name = title || spec.meta?.title || type;
  spec.meta = { ...(spec.meta || {}), title: name, visual_preset: style, quality_profile: spec.meta?.quality_profile || 'showcase', output: 'diagram.html' };
  if (spec.meta.animation !== undefined && spec.meta.animation !== 'trace') spec.meta.animation = 'none';
  if (!spec.meta.legend && LEGEND.has(type)) spec.meta.legend = { mode: 'hidden' }; // the default legend names software kinds ("Agent logic"), which mean nothing to a client
  const id = Date.now().toString(36);
  const dir = path.join(OUT, `${day()} ${slug(name)} (${id})`); fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'diagram.json'), JSON.stringify(spec, null, 2));
  const r = spawnSync(process.execPath, [path.join(ENGINE, 'bin', 'archify.mjs'), 'finalize', type, 'diagram.json', 'diagram.html', '--quality', spec.meta.quality_profile, '--json'],
    { cwd: dir, encoding: 'utf8', timeout: 180000, windowsHide: true, env: { ...process.env, ARCHIFY_UPDATE_CHECK_DISABLED: '1' } });
  let receipt; try { receipt = JSON.parse(r.stdout); } catch { receipt = null; }
  if (!receipt?.ok) {
    fs.rmSync(dir, { recursive: true, force: true });
    const d = receipt?.diagnostics || [];
    return { ok: false, problems: d.length ? d.slice(0, 12).map(x => [x.message, x.subject?.path && `at ${x.subject.path}`, x.evidence?.allowedValues && `allowed: ${x.evidence.allowedValues.join(', ')}`, x.supportedFixes?.length && `fix: ${x.supportedFixes.join('; ')}`].filter(Boolean).join(' · ')) : [`Archify stopped at ${receipt?.failedStage || 'start'}: ${(r.stderr || r.stdout || r.error?.message || '').trim().slice(0, 400)}`] };
  }
  const html = path.join(dir, 'diagram.html');
  if (brand === 'wrw' && style === 'editorial' && theme === 'light') fs.writeFileSync(html, fs.readFileSync(html, 'utf8').replace('</head>', brandStyle() + '</head>'));
  const pic = picture(html, path.join(dir, 'diagram.png'), theme);
  for (const f of fs.readdirSync(dir)) if (/\.(finalize|delivery|browser-check|finalize-summary)\.json$/.test(f)) fs.rmSync(path.join(dir, f), { force: true });
  return { ok: true, dir, html, png: pic.file, width: pic.w, height: pic.h };
}

/** The service blueprint: checked here (it is not an Archify type), written as one HTML page, photographed like the others. */
function drawBlueprint(diagram, title) {
  const problems = checkBlueprint(diagram);
  if (problems.length) return { ok: false, problems };
  const spec = structuredClone(diagram), name = title || spec.meta?.title || 'Service blueprint';
  spec.meta = { ...(spec.meta || {}), title: name };
  const dir = path.join(OUT, `${day()} ${slug(name)} (${Date.now().toString(36)})`); fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'diagram.json'), JSON.stringify({ diagram_type: 'blueprint', ...spec }, null, 2));
  const html = path.join(dir, 'diagram.html'); fs.writeFileSync(html, blueprintHtml(spec, name));
  const pic = picture(html, path.join(dir, 'diagram.png'), 'light');
  return { ok: true, dir, html, png: pic.file, width: pic.w, height: pic.h };
}

// The viewer's buttons, rails and the Archify stamp are hidden; the light theme is the viewer's own theme button, pressed once.
const CLEAN = `<style>.toolbar,.no-print,.rail-controls,.route-journey-controls{display:none!important}.diagram-container::after,.header::after,.header-row::after{content:none!important;display:none!important}</style>`;
const LIGHT = `<script>addEventListener('load',()=>setTimeout(()=>{const b=document.getElementById('btn-theme');if(b&&document.documentElement.dataset.theme!=='light')b.click()},300))</script>`;

// Where the drawing really ends: the SVG keeps room for a legend even when it is hidden, so the lowest drawn element is measured
// (full-size backgrounds skipped) and written on <body> for the first Chrome pass to report.
const MEASURE = `<script>addEventListener('load',()=>setTimeout(()=>{const s=document.querySelector('.diagram-container svg');if(!s)return;const r=s.getBoundingClientRect();let b=0;for(const e of s.querySelectorAll('rect,path,text,circle,polygon,line')){const q=e.getBoundingClientRect();if(!q.height||q.width>r.width*.97&&q.height>r.height*.8)continue;b=Math.max(b,q.bottom)}document.body.setAttribute('data-shot-h',Math.ceil(b+scrollY))},800))</script>`;

/** A PNG of the finished page, cut just below the drawing so there is no empty band. */
export function picture(html, file, theme = 'light') {
  const exe = chrome(); if (!exe) throw new Error('Chrome is not installed on this computer, so the studio cannot take the picture');
  const src = fs.readFileSync(html, 'utf8'), W = 1600;
  const shot = html.replace(/\.html$/, '.shot.html'), url = 'file:///' + shot.replace(/\\/g, '/').replace(/ /g, '%20');
  fs.writeFileSync(shot, src.replace('</body>', CLEAN + (theme === 'light' ? LIGHT : '') + MEASURE + '</body>'));
  fs.rmSync(file, { force: true });
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'ds-shot-'));
  const base = ['--headless=new', '--hide-scrollbars', '--disable-gpu', '--no-first-run', `--user-data-dir=${profile}`, '--virtual-time-budget=5000'];
  try {
    const dom = execFileSync(exe, [...base, `--window-size=${W},4000`, '--dump-dom', url], { timeout: 90000, encoding: 'utf8', maxBuffer: 64 << 20, stdio: ['ignore', 'pipe', 'ignore'], windowsHide: true });
    const H = Math.min(4000, Math.max(500, (+(dom.match(/data-shot-h="(\d+)"/) || [])[1] || 1100) + 48));
    execFileSync(exe, [...base, `--screenshot=${file}`, `--window-size=${W},${H}`, url], { timeout: 90000, stdio: 'ignore', windowsHide: true });
  } finally { fs.rmSync(profile, { recursive: true, force: true }); fs.rmSync(shot, { force: true }); }
  const got = pngSize(file); if (got.w !== W) throw new Error('Chrome did not draw the picture');
  return { file, w: got.w, h: got.h };
}
