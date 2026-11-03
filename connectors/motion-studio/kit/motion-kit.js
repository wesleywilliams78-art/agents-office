// Motion kit: helpers for compositions that paint every frame from the time alone. Load with <script src="kit/motion-kit.js"></script>.
// Every helper is a pure function of t, so the engine can paint frame 812 before frame 3 and get the same picture.
(function () {
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, p) => a + (b - a) * p;

  // easing for wipes, colour and drifts only, named the GSAP way: power4.out, power4.inOut, expo.out, sine.inOut.
  // Anything that pops, lands, drops or stamps moves on a real spring (M.spring below); fake bounce curves are refused by the engine.
  const pow = n => ({ in: p => p ** n, out: p => 1 - (1 - p) ** n, inOut: p => p < .5 ? (2 * p) ** n / 2 : 1 - (2 - 2 * p) ** n / 2 });
  const ease = {
    linear: p => p, none: p => p,
    power1: pow(2), power2: pow(3), power3: pow(4), power4: pow(5),
    sine: { in: p => 1 - Math.cos(p * Math.PI / 2), out: p => Math.sin(p * Math.PI / 2), inOut: p => -(Math.cos(Math.PI * p) - 1) / 2 },
    expo: { in: p => p === 0 ? 0 : 2 ** (10 * p - 10), out: p => p === 1 ? 1 : 1 - 2 ** (-10 * p), inOut: p => p === 0 || p === 1 ? p : p < .5 ? 2 ** (20 * p - 10) / 2 : (2 - 2 ** (-20 * p + 10)) / 2 },
  };
  /** 'power4.out' · 'power4.inOut' · a function → an easing function */
  function getEase(e) {
    if (typeof e === 'function') return e; if (!e) return ease.power2.out;
    const m = /^(\w+)(?:\.(\w+))?(?:\(([^)]*)\))?$/.exec(String(e).trim()); if (!m) return ease.power2.out;
    let f = ease[m[1]]; if (!f) return ease.power2.out; if (typeof f === 'function') return f;
    f = f[m[2] || 'out']; if (!f) return ease.power2.out;
    return f;
  }

  /** progress of a move that starts at `start` and lasts `dur` seconds, eased, 0 before and 1 after */
  const p = (t, start, dur, e) => getEase(e)(clamp((t - start) / dur));
  /** a value moving from a to b over [start, start+dur] */
  const tween = (t, start, dur, a, b, e) => { const k = p(t, start, dur, e); return Array.isArray(a) ? a.map((v, i) => lerp(v, b[i], k)) : lerp(a, b, k); };
  /** keyframes: [[time, value, ease-into-this-key], ...] → the value at t */
  function keys(t, ks) {
    if (t <= ks[0][0]) return ks[0][1];
    for (let i = 1; i < ks.length; i++) if (t <= ks[i][0]) { const [t0, v0] = ks[i - 1], [t1, v1, e] = ks[i]; return tween(t, t0, t1 - t0, v0, v1, e); }
    return ks[ks.length - 1][1];
  }
  const stagger = (i, each = .1, from = 0) => from + i * each;

  /** Real spring physics: the closed-form solution of a damped mass on a spring, so any frame is computed from t alone.
   *  M.spring(t, start, from, to, 'pop' | { stiffness, damping, mass, velocity }) → the value at t (numbers or arrays). */
  const SPRINGS = {
    pop: { stiffness: 380, damping: 17 },     // titles, cards, squares landing: one clear overshoot
    snap: { stiffness: 520, damping: 40 },    // UI-quick, almost no overshoot
    drop: { stiffness: 260, damping: 11 },    // numerals and blocks dropped in: two or three bounces
    stamp: { stiffness: 700, damping: 24 },   // a logo or square landing: hard hit, quick wobble
    gentle: { stiffness: 120, damping: 19 },  // ridges rising, slow settles
    wobble: { stiffness: 180, damping: 9 },   // playful, many oscillations
    calm: { stiffness: 42, damping: 13 },     // critically damped, slow: arrives without a trace of bounce
    breath: { stiffness: 18, damping: 8.5 },  // very slow drift into place, for mist, camera and landscape
    weight: { stiffness: 70, damping: 15 },   // authoritative: one small settle, then still (type, the logo)
  };
  function solve(x0, v0, k, c, m, t) { // displacement from rest after t seconds
    const w0 = Math.sqrt(k / m), z = c / (2 * Math.sqrt(k * m));
    if (z < 1) { const wd = w0 * Math.sqrt(1 - z * z); return Math.exp(-z * w0 * t) * (x0 * Math.cos(wd * t) + (v0 + z * w0 * x0) / wd * Math.sin(wd * t)); }
    if (z === 1) return Math.exp(-w0 * t) * (x0 + (v0 + w0 * x0) * t);
    const s = Math.sqrt(z * z - 1), r1 = -w0 * (z - s), r2 = -w0 * (z + s), c1 = (v0 - r2 * x0) / (r1 - r2); return c1 * Math.exp(r1 * t) + (x0 - c1) * Math.exp(r2 * t);
  }
  function spring(t, start, from, to, cfg = 'pop') {
    const c = typeof cfg === 'string' ? SPRINGS[cfg] || SPRINGS.pop : { ...SPRINGS.pop, ...cfg }, m = c.mass || 1, el = t - start;
    const one = (a, b, v) => el <= 0 ? a : b + solve(a - b, -(v || 0), c.stiffness, c.damping, m, el);
    return Array.isArray(from) ? from.map((a, i) => one(a, to[i], Array.isArray(c.velocity) ? c.velocity[i] : c.velocity)) : one(from, to, c.velocity);
  }
  /** seconds until a spring is within 0.1% of rest (to plan the next beat) */
  function settle(cfg = 'pop') { for (let t = 0; t < 10; t += 1 / 120) { let ok = true; for (let u = t; u < t + .3; u += 1 / 120) if (Math.abs(spring(u, 0, 1, 0, cfg)) > .001) { ok = false; break; } if (ok) return t; } return 10; }

  // the beat grid: everything that cuts, lands or pulses is placed on it, and the score is written on the same grid
  const bpm = () => (window.motion && window.motion.bpm) || 120;
  const beat = n => n * 60 / bpm();
  const bar = n => beat(n * 4);
  /** an envelope that hits 1 on every beat (or every `every` beats) and decays: for things that pump with the kick */
  const pulse = (t, { every = 1, decay = 9, from = 0 } = {}) => { const b = (t - beat(from)) / beat(every); if (b < 0) return 0; return Math.exp(-decay * (b - Math.floor(b)) * beat(every)); };

  // narration (narrated series only): <script src="narration/words.js"></script> before this file's use; M.scene({ voice: [{ line: 's1', at: 0.3 }] })
  const N = () => window.NARRATION || {};
  const lineAt = line => { const v = ((window.motion && window.motion.voice) || []).find(x => x.line === line); return v ? v.at : 0; };
  /** the words of a narration line, with times from the line's start */
  const words = line => (N()[line] || { words: [] }).words;
  /** when the n-th word starting with `word` is spoken, seconds from the line's start */
  function cue(line, word, n = 1) { let c = 0; const k = String(word).toLowerCase(); for (const w of words(line)) if (w.text.toLowerCase().replace(/[^a-z0-9£'−-]/g, '').startsWith(k) && ++c === n) return w.start; throw new Error(`no word "${word}" (${n}) in narration line ${line}`); }
  /** the same, as a time in the video (the line's placement added) */
  const at = (line, word, n = 1) => lineAt(line) + (word == null ? 0 : cue(line, word, n));
  const sentences = ws => { const out = []; let cur = []; ws.forEach((w, i) => { cur.push(w); const nx = ws[i + 1]; if (/[.?!]["”’]?$/.test(w.text) || (nx && nx.start - w.end > .6)) { out.push(cur); cur = []; } }); if (cur.length) out.push(cur); return out; };
  const chunksOf = (ws, max) => sentences(ws).flatMap(s => { const k = Math.ceil(s.length / max), size = Math.ceil(s.length / k), r = []; for (let i = 0; i < s.length; i += size) r.push(s.slice(i, i + size)); return r; }); // break at sentence ends first, then split long sentences evenly
  /** the caption chunk on screen at time t: { text, words: [{ text, spoken, at, end }] } or null (at/end in video time, for word-by-word animation). Chunks of up to `max` words, broken at sentence ends and pauses. */
  function caption(t, max = 7) {
    for (const v of (window.motion && window.motion.voice) || []) {
      const L = N()[v.line]; if (!L) continue; const rel = t - v.at; if (rel < -0.05 || rel > L.duration + 0.4) continue;
      const chunks = chunksOf(L.words, max);
      const ch = chunks.find((c, i) => rel < (chunks[i + 1] ? chunks[i + 1][0].start : L.duration + 0.4)); if (!ch) continue;
      return { text: ch.map(w => w.text).join(' '), words: ch.map(w => ({ text: w.text, spoken: rel >= w.start, at: v.at + w.start, end: v.at + w.end })) };
    }
    return null;
  }

  /** a seeded random stream: rand(7)() is the same sequence every frame */
  function rand(seed = 1) { let s = seed >>> 0 || 1; return () => { s = s + 0x6D2B79F5 | 0; let x = Math.imul(s ^ s >>> 15, 1 | s); x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x; return ((x ^ x >>> 14) >>> 0) / 4294967296; }; }

  const hex = h => { h = h.replace('#', ''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); };
  const mix = (a, b, k) => { const A = hex(a), B = hex(b); return '#' + A.map((v, i) => Math.round(lerp(v, B[i], clamp(k))).toString(16).padStart(2, '0')).join(''); };

  /** place an element: M.set(el, { x, y, scale, sx, sy, rotate, opacity, clip: [top, right, bottom, left] in % }) */
  function set(el, o) {
    if (!el) return; const s = el.style;
    if ('x' in o || 'y' in o || 'scale' in o || 'sx' in o || 'sy' in o || 'rotate' in o) s.transform = `translate(${o.x || 0}px, ${o.y || 0}px) rotate(${o.rotate || 0}deg) scale(${o.sx ?? o.scale ?? 1}, ${o.sy ?? o.scale ?? 1})`;
    if ('opacity' in o) s.opacity = o.opacity;
    if ('clip' in o) s.clipPath = `inset(${o.clip.map(v => v + '%').join(' ')})`;
    if ('visible' in o) s.visibility = o.visible ? 'visible' : 'hidden';
  }

  /** split an element's text into masked words (or chars) for line-by-line reveals; returns the inner spans to move */
  function split(el, by = 'words') {
    const text = el.textContent; el.textContent = '';
    const parts = by === 'chars' ? [...text] : text.split(/(\s+)/);
    const inner = [];
    for (const part of parts) {
      if (/^\s+$/.test(part)) { el.appendChild(document.createTextNode(part)); continue; }
      if (!part) continue;
      const m = document.createElement('span'); m.className = 'mask'; const i = document.createElement('span'); i.textContent = part; m.appendChild(i); el.appendChild(m); inner.push(i);
    }
    return inner;
  }

  /** a smooth mountain ridge as an SVG path, rising from the bottom edge: w×h box, base = baseline height (0..1 of h), amp = peak height, seed varies the shape, drift slides it sideways */
  function ridgePath(w, h, { base = .25, amp = .18, peaks = 3, seed = 1, drift = 0 } = {}) {
    // ink-landscape ridges, not waves: uneven spacing, one dominant peak, the rest lower, a shoulder on each lee side,
    // joined by a Catmull-Rom curve so every slope is smooth. Drawn 1.6× wide so drift can slide it.
    const r = rand(seed), span = w * 1.6, n = peaks * 2 + 3, step = span / n, top = Math.floor(r() * peaks), pts = [];
    let x = -w * .3 + drift;
    for (let i = 0; i <= n; i++) {
      const peak = i % 2 === 1, k = (i - 1) / 2, hgt = peak ? amp * (k === top ? 1 : .42 + r() * .38) : amp * r() * .16;
      pts.push([x, h - (base + hgt) * h]);
      if (peak) pts.push([x + step * (.35 + r() * .25), h - (base + hgt * (.55 + r() * .2)) * h]);
      x += step * (.7 + r() * .6);
    }
    let d = `M ${pts[0][0]} ${h} L ${pts[0][0]} ${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      d += ` C ${p1[0] + (p2[0] - p0[0]) / 6} ${p1[1] + (p2[1] - p0[1]) / 6}, ${p2[0] - (p3[0] - p1[0]) / 6} ${p2[1] - (p3[1] - p1[1]) / 6}, ${p2[0]} ${p2[1]}`;
    }
    const end = Math.max(pts[pts.length - 1][0], w * 1.3 + drift);
    return d + ` L ${end} ${pts[pts.length - 1][1]} L ${end} ${h} Z`;
  }

  /** define the composition: M.scene({ width, height, fps, duration, bpm, cuts: [beat, ...], subframes, setup(), render(t), score(S) }).
   *  subframes (optional, 2–4): motion blur, each frame painted that many times across its shutter and the samples averaged.
   *  holds (optional): [[from, to], …] in seconds, intended reading holds (≤ 8 s each) where stillness is allowed by the dead-frame scan.
   *  setup runs once after fonts load; score(S) writes the music and sound effects with the sound kit (kit/sound-kit.js). */
  function scene(def) {
    const m = { width: def.width || 1080, height: def.height || 1920, fps: def.fps || 30, duration: def.duration, bpm: def.bpm, cuts: def.cuts || [], voice: def.voice || [], subframes: def.subframes || 1, holds: def.holds || [], render: def.render, score: def.score };
    m.ready = (async () => { if (document.fonts) await document.fonts.ready; if (def.setup) await def.setup(); m.render(0); })();
    const st = document.getElementById('stage'); if (st) { st.style.width = m.width + 'px'; st.style.height = m.height + 'px'; }
    window.motion = m; return m;
  }

  const brand = { bone: '#F3F2F2', ink: '#201E1D', red: '#EC3013', deepRed: '#B6240E', warmGrey: '#4A4644', rule: '#D6D2CF', serif: "'Newsreader', Georgia, serif", sans: "'Archivo', Arial, sans-serif" };
  window.M = { clamp, lerp, ease, getEase, p, tween, keys, stagger, spring, settle, SPRINGS, beat, bar, pulse, words, cue, at, caption, rand, mix, set, split, ridgePath, scene, brand, $: s => document.querySelector(s), $$: s => [...document.querySelectorAll(s)] };
})();
