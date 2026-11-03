// The Brain, as a living map (25 Oct 2026). Five strands of Wesley's work sit at the top (Manual Magic AI, YSF Advisory, WRW Hospitality, Employment, Personal);
// the desks that serve them hang underneath and bridge to every strand they have worked for; every note hangs under its strands, task notes faded.
// It behaves like Obsidian: a live force simulation, so the map keeps settling and moves when you drag a note or when links change. The data is built
// on the server from what each note names (brainmap.mjs, /api/brainmap); no note is rewritten.
const STRAND_POS = [[-1, -0.55], [1, -0.55], [0, 1.1], [-1.2, 0.8], [1.2, 0.8]]; // pentagon-ish anchors, in units of R
const KIND_R = { strand: 24, agent: 8, note: 4.4, task: 2.2, upload: 2.6 };
const CHARGE = { strand: 36, agent: 9, note: 3.2, task: 1.7, upload: 1.9 };
const REST = { serves: 170, task: 130, belongs: 105, wiki: 80 };
const STRENGTH = { serves: 0.05, task: 0.012, belongs: 0.07, wiki: 0.02 };

export function initBrainMap({ ov, canvas, search, chipsEl, pane, meta, esc }) {
  let data = null, nodes = [], links = [], adj = [], byId = new Map(), strandCol = {};
  let openNow = false, running = false, alpha = 1, k = 0.8, tx = 0, ty = 0, hover = null, sel = null, drag = null, pan = null, match = null;
  const show = { agent: true, note: true, task: true, upload: false, fresh: false }; let focusStrand = null;
  const ctx = canvas.getContext('2d');
  const today = new Date().toISOString().slice(0, 10);

  function build(d, keep) {
    data = d; strandCol = Object.fromEntries(d.strands.map(s => [s.id, s.colour]));
    const prev = keep ? new Map(nodes.map(n => [n.id, n])) : new Map();
    nodes = d.nodes.map((n, i) => { const o = prev.get(n.id); return { ...n, i, x: o ? o.x : 0, y: o ? o.y : 0, vx: 0, vy: 0, placed: !!o, fresh: n.date === today }; });
    links = d.links.map(([a, b, kind, w]) => ({ a, b, kind, w }));
    adj = nodes.map(() => new Set()); for (const l of links) { adj[l.a].add(l.b); adj[l.b].add(l.a); }
    byId = new Map(nodes.map(n => [n.id, n.i]));
    const R = 400, anchors = {}; d.strands.forEach((s, i) => { anchors[s.id] = { x: STRAND_POS[i % 5][0] * R, y: STRAND_POS[i % 5][1] * R }; });
    for (const n of nodes) { // start where they belong: strands on their anchors, everything else near the middle of what it belongs to
      n.charge = CHARGE[n.kind]; n.r = KIND_R[n.kind];
      if (n.kind === 'agent') n.r = 6 + Math.min(7, Math.sqrt(n.tasks || 0) * 1.4); else if (n.kind === 'note') n.r = 3.6 + Math.min(5, Math.sqrt(n.size) * 0.5);
      if (n.kind === 'strand') { const a = anchors[n.strands[0]]; n.ax = a.x; n.ay = a.y; if (!n.placed) { n.x = a.x; n.y = a.y; } n.mass = 8 + n.size * 0.05; continue; }
      n.mass = n.kind === 'agent' ? 1.5 + n.size * 0.3 : n.kind === 'note' ? 1 + n.size * 0.08 : 1; // a node with many springs is heavy, or it would be thrown about by them
      if (!n.placed) { const ss = (n.strands.length ? n.strands : ['wrw']).map(s => anchors[s]); const cx = ss.reduce((s, p) => s + p.x, 0) / ss.length, cy = ss.reduce((s, p) => s + p.y, 0) / ss.length, a = Math.random() * 6.28, rr = 40 + Math.random() * 140; n.x = cx * 0.7 + Math.cos(a) * rr; n.y = cy * 0.7 + Math.sin(a) * rr; }
    }
    alpha = keep ? 0.25 : 1; chips();
    meta.textContent = `${esc(d.strands.length)} STRANDS · ${d.stats.agents} DESKS · ${d.stats.notes} NOTES · ${d.stats.tasks + d.stats.uploads} TASK NOTES · ${d.stats.links} LINKS`;
    if (!running && openNow) loop();
  }
  const vis = n => { if (n.kind === 'strand') return true; if (!show[n.kind === 'agent' ? 'agent' : n.kind]) return false; if (show.fresh && !n.fresh) return false; return !focusStrand || n.strands.includes(focusStrand); };

  /* ---------- physics: repulsion, springs, a gentle pull to the centre, strands held near their corners ---------- */
  function step() {
    const N = nodes.length;
    for (let i = 0; i < N; i++) {
      const a = nodes[i]; if (!vis(a)) continue;
      for (let j = i + 1; j < N; j++) {
        const b = nodes[j]; if (!vis(b)) continue;
        let dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy; if (d2 > 90000) continue; if (d2 < 1) { dx = Math.random() - .5; dy = Math.random() - .5; d2 = 1; }
        const d = Math.sqrt(d2), f = (a.charge * b.charge * 18) / (d2 + 60) * alpha, fx = dx / d * f, fy = dy / d * f;
        if (!a.pin) { a.vx -= fx / a.mass; a.vy -= fy / a.mass; } if (!b.pin) { b.vx += fx / b.mass; b.vy += fy / b.mass; }
      }
    }
    for (const l of links) {
      const a = nodes[l.a], b = nodes[l.b]; if (!vis(a) || !vis(b)) continue;
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, rest = REST[l.kind] * (l.kind === 'serves' ? 1 : 1), f = (d - rest) * STRENGTH[l.kind] * l.w * alpha;
      const fx = dx / d * f, fy = dy / d * f; if (!a.pin) { a.vx += fx / a.mass; a.vy += fy / a.mass; } if (!b.pin) { b.vx -= fx / b.mass; b.vy -= fy / b.mass; }
    }
    for (const n of nodes) {
      if (n.pin || !vis(n)) continue;
      if (n.kind === 'strand') { n.vx += (n.ax - n.x) * 0.012 * alpha; n.vy += (n.ay - n.y) * 0.012 * alpha; }
      n.vx -= n.x * 0.0016 * alpha; n.vy -= n.y * 0.0016 * alpha;
      n.vx *= 0.8; n.vy *= 0.8; const sp = Math.hypot(n.vx, n.vy); if (sp > 24) { n.vx *= 24 / sp; n.vy *= 24 / sp; } if (!(n.vx === n.vx && n.vy === n.vy && n.x === n.x && n.y === n.y)) { n.vx = n.vy = 0; n.x = n.ax || 0; n.y = n.ay || 0; } n.x += n.vx; n.y += n.vy;
    }
    alpha = Math.max(0.045, alpha * 0.992); // it never quite stops: a faint drift keeps it alive, like Obsidian
  }

  /* ---------- drawing ---------- */
  const W = () => canvas.clientWidth, H = () => canvas.clientHeight;
  const sx = n => W() * 0.42 + tx + n.x * k, sy = n => H() * 0.5 + ty + n.y * k;
  const wx = px => (px - W() * 0.42 - tx) / k, wy = py => (py - H() * 0.5 - ty) / k;
  const fade = n => n.kind === 'task' ? 0.3 : n.kind === 'upload' ? 0.34 : 1;
  function draw() {
    const dpr = devicePixelRatio || 1, Wd = W(), Hd = H();
    if (canvas.width !== Math.round(Wd * dpr)) { canvas.width = Math.round(Wd * dpr); canvas.height = Math.round(Hd * dpr); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, Wd, Hd);
    const focus = hover || sel, hi = focus ? new Set([focus.i, ...adj[focus.i]]) : null, sk = Math.sqrt(k);
    for (const l of links) {
      const a = nodes[l.a], b = nodes[l.b]; if (!vis(a) || !vis(b)) continue;
      const lit = hi && hi.has(l.a) && hi.has(l.b) && (focus.i === l.a || focus.i === l.b);
      let col, al, w = 0.7;
      if (l.kind === 'serves') { col = strandCol[(a.kind === 'strand' ? a : b).strands[0]]; al = 0.55; w = 1.4; }
      else if (l.kind === 'belongs') { col = strandCol[(a.kind === 'strand' ? a : b).strands[0]]; al = (a.kind === 'task' || b.kind === 'task' || a.kind === 'upload' || b.kind === 'upload') ? 0.035 : 0.14; }
      else if (l.kind === 'wiki') { col = '#E8E6DF'; al = 0.22; }
      else { col = '#E8E6DF'; al = 0.1; }
      if (hi) al = lit ? 0.9 : al * 0.25; if (match) al *= 0.35;
      ctx.globalAlpha = al; ctx.strokeStyle = col || '#E8E6DF'; ctx.lineWidth = (lit ? w + 0.8 : w) * sk * 0.9;
      ctx.beginPath(); ctx.moveTo(sx(a), sy(a)); ctx.lineTo(sx(b), sy(b)); ctx.stroke();
    }
    ctx.globalAlpha = 1; ctx.textBaseline = 'middle';
    const order = [...nodes].filter(vis).sort((a, b) => ({ upload: 0, task: 0, note: 1, agent: 2, strand: 3 })[a.kind] - ({ upload: 0, task: 0, note: 1, agent: 2, strand: 3 })[b.kind]);
    for (const n of order) {
      const x = sx(n), y = sy(n); if (x < -40 || y < -40 || x > Wd + 40 || y > Hd + 40) continue;
      const dim = (hi && !hi.has(n.i)) || (match && !match.has(n.i)), r = n.r * sk, a0 = dim ? 0.12 : fade(n);
      ctx.globalAlpha = a0;
      if (n.kind === 'strand') {
        const c = strandCol[n.strands[0]]; ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
        ctx.globalAlpha = a0 * 0.18; ctx.beginPath(); ctx.arc(x, y, r * 2.1, 0, 7); ctx.fill(); ctx.globalAlpha = a0;
      } else if (n.kind === 'agent') { // a pie of the strands it serves
        const ss = n.strands.length ? n.strands : [null], seg = 6.2832 / ss.length;
        ss.forEach((s, i) => { ctx.fillStyle = s ? strandCol[s] : '#B0ADA3'; ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, r, -1.5708 + i * seg, -1.5708 + (i + 1) * seg); ctx.closePath(); ctx.fill(); });
        ctx.strokeStyle = 'rgba(21,20,20,.7)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.stroke();
      } else { ctx.fillStyle = n.kind === 'note' ? '#CFCBC0' : '#8E8A82'; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
      if (n.fresh && n.kind !== 'strand') { ctx.strokeStyle = '#1E9070'; ctx.lineWidth = 1.5; ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(x, y, r + 3, 0, 7); ctx.stroke(); }
      if (sel === n) { ctx.strokeStyle = '#E8E6DF'; ctx.lineWidth = 1.6; ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(x, y, r + 5, 0, 7); ctx.stroke(); }
      const lab = n.kind === 'strand' || (hi && hi.has(n.i) && n.kind !== 'task') || (match && match.has(n.i)) || focus === n || (n.kind === 'agent' && (k > 0.9 && (n.tasks >= 3 || k > 1.5))) || (n.kind === 'note' && k > 1.7 && !dim);
      if (lab) {
        ctx.globalAlpha = dim ? 0.3 : 1; const big = n.kind === 'strand';
        ctx.font = `${big ? 600 : 500} ${big ? Math.max(12, 15 * sk) : Math.max(9.5, 10.5 * sk)}px Inter, -apple-system, sans-serif`;
        const txt = n.label.length > 34 ? n.label.slice(0, 33) + '…' : n.label;
        if (big) { ctx.fillStyle = '#151414'; ctx.textAlign = 'center'; ctx.fillText(txt, x, y + r + 16); ctx.fillStyle = '#E8E6DF'; ctx.fillText(txt, x, y + r + 15); ctx.textAlign = 'left'; }
        else { ctx.fillStyle = 'rgba(21,20,20,.85)'; ctx.fillText(txt, x + r + 5, y + 1); ctx.fillStyle = '#E8E6DF'; ctx.fillText(txt, x + r + 4, y); }
      }
      ctx.globalAlpha = 1;
    }
  }
  function loop() { if (running || !openNow) return; running = true; const f = () => { if (!openNow) { running = false; return; } step(); draw(); requestAnimationFrame(f); }; requestAnimationFrame(f); }

  /* ---------- interaction: drag a note and the map moves; drag empty space to pan; scroll to zoom ---------- */
  function pick(e) { const r = canvas.getBoundingClientRect(), px = wx(e.clientX - r.left), py = wy(e.clientY - r.top); let best = null, bd = 1e9; for (const n of nodes) { if (!vis(n)) continue; const d = Math.hypot(n.x - px, n.y - py), hit = Math.max(n.r + 4, 7 / Math.sqrt(k)); if (d < hit && d < bd) { bd = d; best = n; } } return best; }
  canvas.addEventListener('mousemove', e => {
    if (drag) { const r = canvas.getBoundingClientRect(); drag.n.x = wx(e.clientX - r.left); drag.n.y = wy(e.clientY - r.top); drag.n.vx = drag.n.vy = 0; drag.moved = true; alpha = Math.max(alpha, 0.4); return; }
    if (pan) { tx += e.clientX - pan.x; ty += e.clientY - pan.y; pan = { x: e.clientX, y: e.clientY, moved: true }; return; }
    hover = pick(e); canvas.style.cursor = hover ? 'pointer' : 'grab';
  });
  canvas.addEventListener('mousedown', e => { const n = pick(e); if (n) { drag = { n, moved: false }; n.pin = true; } else pan = { x: e.clientX, y: e.clientY, moved: false }; });
  addEventListener('mouseup', () => { if (drag) { drag.n.pin = false; if (!drag.moved) select(drag.n); alpha = Math.max(alpha, 0.3); drag = null; } if (pan) { if (!pan.moved) { sel = null; showHelp(); } pan = null; } });
  canvas.addEventListener('wheel', e => {
    e.preventDefault(); e.stopPropagation();
    const r = canvas.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top, f = Math.exp(-e.deltaY * 0.0022), nk = Math.max(0.25, Math.min(6, k * f));
    const wxp = wx(mx), wyp = wy(my); k = nk; tx = mx - W() * 0.42 - wxp * k; ty = my - H() * 0.5 - wyp * k;
  }, { passive: false });

  function showHelp() { pane.innerHTML = '<div class="bv-empty">Click a note to read it. Drag a note and the map moves with it. Hover to see its neighbours.</div>'; }
  function select(n) {
    sel = n; const nb = [...adj[n.i]].map(i => nodes[i]).sort((a, b) => ({ strand: 0, agent: 1, note: 2, task: 3, upload: 4 })[a.kind] - ({ strand: 0, agent: 1, note: 2, task: 3, upload: 4 })[b.kind] || b.size - a.size);
    const pills = n.strands.map(s => `<span class="bm-pill" style="--c:${strandCol[s]}">${esc(data.strands.find(x => x.id === s).label)}</span>`).join('');
    const kindName = { strand: 'Strand', agent: 'Desk', note: 'Note', task: 'Task note', upload: 'Upload' }[n.kind];
    let extra = '';
    if (n.kind === 'agent') extra = `<div class="bv-lab">What it has worked on</div><p>${n.tasks} task${n.tasks === 1 ? '' : 's'}${n.served === 'work' ? ': ' + data.strands.filter(s => n.counts[s.id]).map(s => `${esc(s.label)} ${n.counts[s.id]}`).join(' · ') : n.served === 'team' ? ' · none yet, so it sits with its team lead' : ' · none yet, placed by its job description'}</p>`;
    pane.innerHTML = `<h3>${esc(n.label)}</h3><div class="bv-path">${kindName}${n.group && n.kind !== 'strand' && n.kind !== 'agent' ? ' · ' + esc(String(n.group).replace(/^\d\d-/, '')) : ''}${n.date ? ' · ' + esc(n.date) : ''}${n.fresh ? ' · <span class="bv-g">new today</span>' : ''}</div>` +
      (pills ? `<div class="bm-pills">${pills}</div>` : '') + extra + (n.excerpt ? `<p class="bm-ex">${esc(n.excerpt)}${n.excerpt.length >= 420 ? '…' : ''}</p>` : '') +
      `<div class="bv-lab">Connected to · ${nb.length}</div>` + nb.slice(0, 24).map(o => `<div class="bv-lk" data-i="${o.i}">${esc(o.label.length > 60 ? o.label.slice(0, 59) + '…' : o.label)}<small>${({ strand: 'strand', agent: 'desk', note: 'note', task: 'task', upload: 'upload' })[o.kind]}</small></div>`).join('') + (nb.length > 24 ? `<div class="bv-more">+${nb.length - 24} more</div>` : '');
    pane.querySelectorAll('.bv-lk').forEach(el => el.addEventListener('click', () => { const t = nodes[+el.dataset.i]; select(t); tx = -t.x * k + W() * 0; ty = -t.y * k; }));
  }

  /* ---------- chips and search ---------- */
  function chips() {
    const s = data.strands.map(s => `<button class="bv-chip${focusStrand === s.id ? ' on' : ''}" data-f="${s.id}"><i style="background:${s.colour}"></i>${esc(s.label.toUpperCase())}</button>`).join('');
    const t = (key, label, n) => `<button class="bv-chip${show[key] ? ' on' : ''}" data-t="${key}">${label}${n != null ? ' · ' + n : ''}</button>`;
    chipsEl.innerHTML = s + '<span class="bm-sep"></span>' + t('agent', 'DESKS', data.stats.agents) + t('note', 'NOTES', data.stats.notes) + t('task', 'TASK NOTES', data.stats.tasks) + t('upload', 'UPLOADS', data.stats.uploads) + t('fresh', 'NEW TODAY', nodes.filter(n => n.fresh).length);
  }
  chipsEl.addEventListener('click', e => { const b = e.target.closest('.bv-chip'); if (!b || !data) return; if (b.dataset.f) focusStrand = focusStrand === b.dataset.f ? null : b.dataset.f; else if (b.dataset.t) show[b.dataset.t] = !show[b.dataset.t]; alpha = Math.max(alpha, 0.5); chips(); });
  search.addEventListener('input', () => { const q = search.value.trim().toLowerCase(); match = q && data ? new Set(nodes.filter(n => n.label.toLowerCase().includes(q) || (n.excerpt || '').toLowerCase().includes(q)).map(n => n.i)) : null; });

  async function load(keep) { try { const r = await fetch('/api/brainmap'); if (!r.ok) throw 0; build(await r.json(), keep); return true; } catch { return false; } }
  let timer = null;
  async function open() {
    if (openNow) return true;
    if (!data && !(await load(false))) return false;
    openNow = true; k = Math.min(W() / 1150, H() / 900, 1) || 0.8; tx = 0; ty = 0; showHelp(); chips(); loop();
    timer = setInterval(() => load(true), 60000); return true;
  }
  function close() { openNow = false; clearInterval(timer); timer = null; }
  return { open, close, isOpen: () => openNow, get ready() { return !!data; }, load };
}
