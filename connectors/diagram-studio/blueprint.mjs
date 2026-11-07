// Service blueprint, the eleventh diagram type. Archify has no such type, so this one is drawn here, on a fixed grid (no arrows to route):
// stages across, layers down, one heavy line of visibility between what the customer can see and what they cannot.
// The grammar (layer order, the visibility line, "—" for an empty cell, at most one focal cell) follows the service blueprint in
// cathrynlavery/diagram-design (MIT, https://github.com/cathrynlavery/diagram-design); the code and the WRW look are ours.
import { brandFonts } from './brand.mjs';

export const BLUEPRINT_USE = 'what a customer does and sees against the work they never see, stage by stage, with a line between the two (a guest\'s visit, an order, an onboarding, an approval run)';

const LAYERS = ['customer', 'frontstage', 'backstage'];
const T = { bg: '#F3F2F2', ink: '#201E1D', muted: '#4A4644', grey: '#8A8480', line: '#D6D2CF', red: '#EC3013', redTint: 'rgba(236,48,19,.08)', hidden: 'rgba(214,210,207,.35)' };
const FONT = "Archivo,'Segoe UI',Arial,sans-serif";
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const X0 = 96, RIGHT = 1216, W = 1240;

export const blueprintSchema = {
  type: 'object', required: ['stages', 'customer', 'frontstage', 'backstage'],
  description: 'Stages run left to right in the order things happen. Each layer is an array with exactly one entry per stage. An entry is a short string, an object { label, note?, focal? }, or null when nothing happens there at that stage (it is drawn as a dashed "—").',
  properties: {
    meta: { type: 'object', properties: { title: 'string', subtitle: 'string (one line)' } },
    labels: { type: 'object', description: 'Row names, each up to 24 characters. Defaults: Customer, What they see, Behind the scenes, Support. Name the real actor, for example "Wesley" or "The guest".', properties: { customer: 'string', frontstage: 'string', backstage: 'string', support: 'string' } },
    stages: { type: 'array', description: '3 to 6 stage names, each up to 24 characters.', items: 'string' },
    customer: { type: 'array', description: 'What the customer does at each stage. At least one entry.' },
    frontstage: { type: 'array', description: 'What the customer can see of the service at each stage. At least one entry.' },
    backstage: { type: 'array', description: 'Work the customer never sees. Put the owner in the note ("Marketing Lead"). At least one entry.' },
    support: { type: 'array', description: 'Optional. Tools, rules or inputs that the backstage work leans on. Mostly null.' },
  },
  rules: ['label up to 40 characters (wraps to two lines), note up to 34 characters', 'at most one entry in the whole drawing has focal: true: the wait, failure or loop the picture exists to show', 'a line is only drawn if the customer row and the backstage row each have something in them', 'never invent a step: an entry the task did not give you is null'],
};

export const blueprintExample = {
  meta: { title: 'A table booking: what the guest never sees', subtitle: 'Five stages, one wait that matters' },
  labels: { customer: 'The guest', frontstage: 'What they see', backstage: 'Behind the scenes' },
  stages: ['Book', 'Arrive', 'Order', 'Eat', 'Pay'],
  customer: ['Books online', 'Walks in', 'Chooses dishes', 'Eats', 'Asks for the bill'],
  frontstage: ['Confirmation message', 'Host greets them', 'Server takes the order', 'Food arrives', 'Bill presented'],
  backstage: [{ label: 'Table assigned', note: 'Host' }, { label: 'Table cleared and reset', note: 'Floor team' }, { label: 'Ticket reaches the kitchen', note: 'Kitchen', focal: true }, { label: 'Dishes plated and passed', note: 'Kitchen' }, { label: 'Payment taken', note: 'Till' }],
  support: ['Booking system', null, 'Menu and allergen sheet', null, 'Card terminal'],
};

const cellOf = c => c == null ? null : typeof c === 'string' ? { label: c } : (c && typeof c === 'object' ? c : undefined);

/** Problems with a spec, each naming the field and the fix; an empty list means it can be drawn. */
export function checkBlueprint(spec) {
  const p = [];
  const n = Array.isArray(spec.stages) ? spec.stages.length : 0;
  if (n < 3 || n > 6) p.push(`stages: give 3 to 6 stage names (got ${n}); more than six is two diagrams`);
  else spec.stages.forEach((s, i) => { if (typeof s !== 'string' || !s.trim() || s.length > 24) p.push(`stages[${i}]: a name of 1 to 24 characters`); });
  let focal = 0;
  for (const layer of [...LAYERS, 'support']) {
    const arr = spec[layer];
    if (arr === undefined && layer === 'support') continue;
    if (!Array.isArray(arr)) { p.push(`${layer}: must be an array with one entry per stage`); continue; }
    if (n && arr.length !== n) p.push(`${layer}: has ${arr.length} entries but there are ${n} stages; use null for a stage where nothing happens`);
    let filled = 0;
    arr.forEach((raw, i) => {
      const c = cellOf(raw);
      if (c === undefined) return p.push(`${layer}[${i}]: a string, an object { label, note, focal } or null`);
      if (!c) return;
      if (typeof c.label !== 'string' || !c.label.trim()) return p.push(`${layer}[${i}].label: required`);
      filled++;
      if (c.label.length > 40) p.push(`${layer}[${i}].label: ${c.label.length} characters, 40 at most; shorten it`);
      if (c.note != null && (typeof c.note !== 'string' || c.note.length > 34)) p.push(`${layer}[${i}].note: a string of 34 characters at most`);
      if (c.focal) focal++;
    });
    if (layer !== 'support' && !filled) p.push(`${layer}: every entry is empty; a blueprint needs something in this row (if the customer or the backstage truly has nothing, this is not a blueprint: use a workflow)`);
  }
  if (focal > 1) p.push(`focal: ${focal} entries have focal: true; keep one`);
  for (const [k, v] of Object.entries(spec.labels || {})) if (typeof v !== 'string' || v.length > 24) p.push(`labels.${k}: a string of 24 characters at most`);
  return p;
}

const wrap = (s, max) => { const out = []; let cur = ''; for (const w of String(s).split(/\s+/)) { if (cur && (cur + ' ' + w).length > max) { out.push(cur); cur = w; } else cur = cur ? cur + ' ' + w : w; } if (cur) out.push(cur); return out; };
const text = (x, y, s, o = {}) => `<text x="${x}" y="${y}" fill="${o.fill || T.ink}" font-size="${o.size || 12}" font-weight="${o.w || 400}" font-family="${FONT}" text-anchor="${o.a || 'middle'}"${o.ls ? ` letter-spacing="${o.ls}"` : ''}>${esc(s)}</text>`;

/** The finished page: title, then one SVG. Fonts are embedded so the file opens anywhere. */
export function blueprintHtml(spec, name) {
  const n = spec.stages.length, stride = (RIGHT - X0) / n, CW = stride - 14, perLine = Math.max(14, Math.floor(CW / 6.4));
  const lab = { customer: 'Customer', frontstage: 'What they see', backstage: 'Behind the scenes', support: 'Support', ...(spec.labels || {}) };
  const Y = { cust: 96, int: 166, front: 176, vis: 250, back: 260, iint: 334, sup: 344 }, H = 64, HS = 48;
  let s = `<svg viewBox="0 24 ${W} 446" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="bp-t bp-d"><title id="bp-t">${esc(name)}</title><desc id="bp-d">Service blueprint: ${esc(spec.stages.join(', '))}. Above the heavy line is what the ${esc(lab.customer)} does and sees; below it is work they do not see.</desc>`;
  spec.stages.forEach((st, i) => { s += text(X0 + i * stride + CW / 2, 56, `${i + 1} · ${st}`, { w: 600 }); });
  const rowLabel = (y, h, str) => { const ls = wrap(str.toUpperCase(), 12); ls.slice(0, 3).forEach((l, k) => { s += text(88, y + h / 2 + 3 + (k - (ls.length - 1) / 2) * 12, l, { size: 9, fill: T.muted, a: 'end', ls: '.1em' }); }); };
  rowLabel(Y.cust, H, lab.customer); rowLabel(Y.front, H, lab.frontstage); rowLabel(Y.back, H, lab.backstage);
  if (spec.support?.some(Boolean)) rowLabel(Y.sup, HS, lab.support);
  const cell = (i, y, h, raw, o = {}) => {
    const c = cellOf(raw), x = X0 + i * stride, cx = x + CW / 2;
    if (!c) return `<rect x="${x}" y="${y}" width="${CW}" height="${h}" fill="none" stroke="${T.line}" stroke-dasharray="2,3"/>` + text(cx, y + h / 2 + 4, '—', { fill: T.grey });
    const f = !!c.focal, lines = wrap(c.label, perLine).slice(0, 2), note = c.note;
    const total = lines.length * 15 + (note ? 13 : 0), top = y + (h - total) / 2 + 12;
    let r = `<rect x="${x}" y="${y}" width="${CW}" height="${h}" fill="${f ? T.redTint : o.hidden ? T.hidden : '#F3F2F2'}" stroke="${f ? T.red : T.ink}" data-stage="${i + 1}" data-name="${esc(c.label)}"${f ? ' data-focal="true"' : ''}/>`;
    lines.forEach((l, k) => { r += text(cx, top + k * 15, l, { w: f ? 600 : 400, fill: f ? T.red : T.ink }); });
    if (note) r += text(cx, top + lines.length * 15 + 1, note, { size: 9, fill: T.muted });
    return r;
  };
  const line = (y, o) => `<line x1="${X0}" y1="${y}" x2="${RIGHT - 14}" y2="${y}" ${o} />`;
  spec.customer.forEach((c, i) => { s += cell(i, Y.cust, H, c); });
  s += line(Y.int, `stroke="${T.line}" data-role="interaction"`);
  spec.frontstage.forEach((c, i) => { s += cell(i, Y.front, H, c); });
  s += line(Y.vis, `stroke="rgba(32,30,29,.6)" stroke-width="2" data-role="visibility"`);
  spec.backstage.forEach((c, i) => { s += cell(i, Y.back, H, c, { hidden: 1 }); });
  if (spec.support?.some(Boolean)) { s += line(Y.iint, `stroke="${T.line}" data-role="internal-interaction"`); spec.support.forEach((c, i) => { if (cellOf(c)) s += cell(i, Y.sup, HS, c, { hidden: 1 }); }); }
  const ly = 436, who = /^the /i.test(lab.customer) ? 'the ' + lab.customer.slice(4) : lab.customer;
  s += line(ly - 14, `stroke="${T.line}"`);
  s += `<line x1="${X0}" y1="${ly}" x2="${X0 + 28}" y2="${ly}" stroke="rgba(32,30,29,.6)" stroke-width="2"/>` + text(X0 + 36, ly + 4, `Line of visibility: above it ${who} sees it, below it they do not`, { size: 10, fill: T.muted, a: 'start' });
  let lx = X0 + 470;
  s += `<rect x="${lx}" y="${ly - 5}" width="14" height="10" fill="${T.hidden}" stroke="${T.ink}"/>` + text(lx + 20, ly + 4, 'Hidden work', { size: 10, fill: T.muted, a: 'start' }); lx += 110;
  if ([...spec.customer, ...spec.frontstage, ...spec.backstage, ...(spec.support || [])].some(c => cellOf(c)?.focal))
    s += `<rect x="${lx}" y="${ly - 5}" width="14" height="10" fill="${T.redTint}" stroke="${T.red}"/>` + text(lx + 20, ly + 4, 'Where it bites', { size: 10, fill: T.muted, a: 'start' });
  s += '</svg>';
  return `<!doctype html><html lang="en" data-type="service-blueprint"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(name)}</title><style>
${brandFonts()}
*{box-sizing:border-box;margin:0;padding:0}body{background:${T.bg};font-family:${FONT};color:${T.ink};padding:36px 40px 40px}
.wrap{max-width:1440px;margin:0 auto}h1{font-family:Newsreader,Georgia,serif;font-weight:300;font-size:2rem;letter-spacing:-.01em;margin-bottom:6px}
.sub{font-size:14px;color:${T.muted};margin-bottom:20px}.diagram-container{background:${T.bg};border:1px solid ${T.line};padding:8px}svg{display:block;width:100%;height:auto}
</style></head><body><div class="wrap"><h1>${esc(name)}</h1>${spec.meta?.subtitle ? `<p class="sub">${esc(spec.meta.subtitle)}</p>` : ''}<div class="diagram-container">${s}</div></div></body></html>`;
}
