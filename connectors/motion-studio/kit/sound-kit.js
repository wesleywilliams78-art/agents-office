// Sound kit: every sound in a composition is synthesised here, on the same beat grid as the picture, so the cuts and the
// hits land together by construction. The engine renders it offline (OfflineAudioContext, 48 kHz stereo) and lays it
// under the video. Load with <script src="kit/sound-kit.js"></script>; write the score in M.scene({ score(S) { … } }).
//
//   S.beat(n) S.bar(n) S.step(n)      time of beat n, bar n, 16th n (seconds)
//   S.drums(fromBar, bars, { kick: 'x---x---x---x---', snare: '----x-------x---', hat: '--x---x---x---x-', clap, ohat })   x = hit, o = soft
//   S.kick(t) S.snare(t) S.clap(t) S.hat(t, { open }) S.tick(t) S.stamp(t) S.impact(t)
//   S.sub(t, 'A1', dur) S.bass(t, 'A1', dur) S.pluck(t, 'E4', dur) S.pad(t, ['A3','C4','E4'], dur) S.arp(fromBeat, beats, notes, { rate })
//   S.riser(t, dur) and S.whoosh(t, dur) END exactly at t: put t on the cut.   Options: { gain, verb } on every voice.
//   Bar (recipe-build): S.felt S.pour(t, dur, { from, to }) S.droplet S.paper S.ice S.swirl(t, dur) S.clink S.page
//   Chinese: S.string S.roll S.bell S.taiko S.drone S.wind S.scale · Jazz: S.chord('Dm9') S.keys S.upright S.walk S.ride S.brush S.groove · Money: S.coin S.tally S.drop
(function () {
  const NOTE = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
  const hz = n => { if (typeof n === 'number') return n; const m = /^([A-G][#b]?)(-?\d)$/.exec(n); if (!m) throw new Error('unknown note ' + n); return 440 * 2 ** ((NOTE[m[1]] + (+m[2] + 1) * 12 - 69) / 12); };
  const Z = 0.0001;

  class SoundKit {
    constructor(ac, bpm) {
      this.ac = ac; this.bpm = bpm || 120;
      for (const k of Object.getOwnPropertyNames(SoundKit.prototype)) if (k !== 'constructor') this[k] = this[k].bind(this); // const b = S.beat; works
      const comp = ac.createDynamicsCompressor(); comp.threshold.value = -12; comp.knee.value = 6; comp.ratio.value = 10; comp.attack.value = .003; comp.release.value = .15;
      const lim = ac.createDynamicsCompressor(); lim.threshold.value = -2; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = .001; lim.release.value = .05;
      this.out = ac.createGain(); this.out.gain.value = .32; this.out.connect(comp); comp.connect(lim); lim.connect(ac.destination);
      // one shared room: a generated impulse, seeded, so the same score always sounds the same
      const len = Math.floor(ac.sampleRate * 2.4), ir = ac.createBuffer(2, len, ac.sampleRate);
      for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
      this.room = ac.createConvolver(); this.room.buffer = ir; this.verbIn = ac.createGain(); this.verbIn.gain.value = .5; this.verbIn.connect(this.room); this.room.connect(this.out);
      const nl = ac.sampleRate * 2; this.noiseBuf = ac.createBuffer(1, nl, ac.sampleRate); const nd = this.noiseBuf.getChannelData(0); for (let i = 0; i < nl; i++) nd[i] = Math.random() * 2 - 1;
    }
    beat(n) { return n * 60 / this.bpm; } bar(n) { return this.beat(n * 4); } step(n) { return this.beat(n / 4); }
    // plumbing
    _gain(t, peak, attack, decay, sustain = 0, hold = 0) { const g = this.ac.createGain(), p = g.gain; p.setValueAtTime(Z, Math.max(0, t)); p.linearRampToValueAtTime(peak, t + attack); if (hold) p.setValueAtTime(sustain || peak, t + attack + hold); p.exponentialRampToValueAtTime(Z, t + attack + hold + decay); return g; }
    _bus(node, o = {}, dry = 1) { const g = this.ac.createGain(); g.gain.value = (o.gain ?? 1) * dry; node.connect(g); g.connect(this.out); if (o.verb) { const s = this.ac.createGain(); s.gain.value = o.verb; node.connect(s); s.connect(this.verbIn); } return g; }
    _noise(t, dur) { const s = this.ac.createBufferSource(); s.buffer = this.noiseBuf; s.start(Math.max(0, t), (t * 7.3) % 1); s.stop(t + dur + .05); return s; }
    _osc(type, f, t, dur, detune = 0) { const o = this.ac.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, Math.max(0, t)); o.detune.value = detune; o.start(Math.max(0, t)); o.stop(t + dur + .1); return o; }
    _filter(type, f, q = 1) { const b = this.ac.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; }

    // drums
    kick(t, o = {}) {
      const s = this._osc('sine', 160, t, .5); s.frequency.exponentialRampToValueAtTime(o.tone || 48, t + .11);
      const g = this._gain(t, 1, .002, .42); s.connect(g); this._bus(g, { gain: .95 * (o.gain ?? 1) });
      const c = this._noise(t, .02), hp = this._filter('highpass', 2500), cg = this._gain(t, .35, .001, .018); c.connect(hp); hp.connect(cg); this._bus(cg, { gain: o.gain ?? 1 });
    }
    snare(t, o = {}) {
      const n = this._noise(t, .25), bp = this._filter('bandpass', 1900, .8), g = this._gain(t, .6, .001, .19); n.connect(bp); bp.connect(g); this._bus(g, { gain: o.gain ?? 1, verb: o.verb ?? .25 });
      const b = this._osc('triangle', 190, t, .15), bg = this._gain(t, .45, .001, .1); b.frequency.exponentialRampToValueAtTime(140, t + .1); b.connect(bg); this._bus(bg, { gain: o.gain ?? 1 });
    }
    clap(t, o = {}) {
      for (let k = 0; k < 3; k++) { const tt = t + k * .011, n = this._noise(tt, .2), bp = this._filter('bandpass', 1250, 1.2), g = this._gain(tt, k === 2 ? .7 : .45, .001, k === 2 ? .2 : .012); n.connect(bp); bp.connect(g); this._bus(g, { gain: o.gain ?? 1, verb: o.verb ?? .35 }); }
    }
    hat(t, o = {}) { const n = this._noise(t, .3), hp = this._filter('highpass', 7500), g = this._gain(t, o.open ? .28 : .22, .001, o.open ? .26 : .045); n.connect(hp); hp.connect(g); this._bus(g, { gain: (o.gain ?? 1) * .8 }); }
    drums(fromBar, bars, pat) {
      for (let b = 0; b < bars; b++) for (const [voice, p] of Object.entries(pat)) for (let i = 0; i < 16; i++) {
        const ch = p[i % p.length]; if (ch !== 'x' && ch !== 'o') continue; const t = this.bar(fromBar + b) + this.step(i), gain = ch === 'o' ? .45 : 1;
        if (voice === 'ohat') this.hat(t, { open: true, gain }); else this[voice](t, { gain });
      }
    }
    // tonal
    sub(t, note, dur, o = {}) { const s = this._osc('sine', hz(note), t, dur), g = this._gain(t, .55, .008, .09, .55, Math.max(0, dur - .1)); s.connect(g); this._bus(g, o); }
    bass(t, note, dur, o = {}) {
      const f = hz(note), a = this._osc('sawtooth', f, t, dur), b = this._osc('square', f / 2, t, dur), lp = this._filter('lowpass', 900, 4);
      lp.frequency.setValueAtTime(1600, t); lp.frequency.exponentialRampToValueAtTime(260, t + Math.min(dur, .35));
      const g = this._gain(t, .32, .005, .08, .3, Math.max(0, dur - .09)); a.connect(lp); b.connect(lp); lp.connect(g); this._bus(g, o);
    }
    pluck(t, note, dur = .45, o = {}) {
      const f = hz(note), lp = this._filter('lowpass', 3200, 2); lp.frequency.setValueAtTime(4200, t); lp.frequency.exponentialRampToValueAtTime(380, t + dur);
      for (const d of [-7, 7]) this._osc('sawtooth', f, t, dur, d).connect(lp);
      const g = this._gain(t, .16, .003, dur); lp.connect(g); this._bus(g, { verb: .3, ...o });
    }
    pad(t, notes, dur, o = {}) {
      const lp = this._filter('lowpass', 1300, .7), g = this._gain(t, .07, Math.min(.5, dur / 3), Math.min(1, dur / 2), .07, Math.max(0, dur - Math.min(.5, dur / 3) - Math.min(1, dur / 2)));
      for (const n of [].concat(notes)) for (const d of [-9, 0, 9]) this._osc('sawtooth', hz(n), t, dur + 1, d).connect(lp);
      lp.connect(g); this._bus(g, { verb: .55, ...o });
    }
    arp(fromBeat, beats, notes, o = {}) { const rate = o.rate || 4, len = this.beat(1 / rate); for (let i = 0; i < beats * rate; i++) this.pluck(this.beat(fromBeat) + i * len, notes[i % notes.length], len * 1.6, o); }
    // effects, all placed on the cut
    riser(t, dur = 2, o = {}) {
      const s = t - dur, n = this._noise(s, dur), bp = this._filter('bandpass', 400, 3); bp.frequency.setValueAtTime(300, Math.max(0, s)); bp.frequency.exponentialRampToValueAtTime(9000, t);
      const g = this.ac.createGain(); g.gain.setValueAtTime(Z, Math.max(0, s)); g.gain.exponentialRampToValueAtTime(.4, t - .01); g.gain.linearRampToValueAtTime(0, t);
      n.connect(bp); bp.connect(g); this._bus(g, { verb: .4, ...o });
      const w = this._osc('sine', 180, s, dur); w.frequency.exponentialRampToValueAtTime(1400, t); const wg = this.ac.createGain(); wg.gain.setValueAtTime(Z, Math.max(0, s)); wg.gain.exponentialRampToValueAtTime(.06, t - .01); wg.gain.linearRampToValueAtTime(0, t); w.connect(wg); this._bus(wg, o);
    }
    whoosh(t, dur = .45, o = {}) {
      const s = t - dur, n = this._noise(s, dur + .2), bp = this._filter('bandpass', 500, 1.4); bp.frequency.setValueAtTime(350, Math.max(0, s)); bp.frequency.exponentialRampToValueAtTime(3800, t); bp.frequency.exponentialRampToValueAtTime(600, t + .2);
      const g = this.ac.createGain(); g.gain.setValueAtTime(Z, Math.max(0, s)); g.gain.exponentialRampToValueAtTime(.5, t); g.gain.exponentialRampToValueAtTime(Z, t + .2);
      n.connect(bp); bp.connect(g); this._bus(g, { verb: .2, ...o });
    }
    impact(t, o = {}) {
      const s = this._osc('sine', 90, t, 1.4); s.frequency.exponentialRampToValueAtTime(32, t + .6); const g = this._gain(t, 1, .002, 1.2); s.connect(g); this._bus(g, { gain: o.gain ?? 1 });
      const n = this._noise(t, .5), lp = this._filter('lowpass', 1800), ng = this._gain(t, .5, .001, .4); n.connect(lp); lp.connect(ng); this._bus(ng, { gain: o.gain ?? 1, verb: o.verb ?? .6 });
    }
    tick(t, o = {}) { const s = this._osc('sine', o.pitch || 2200, t, .03), g = this._gain(t, .22, .0008, .025); s.connect(g); this._bus(g, o); }
    stamp(t, o = {}) {
      const s = this._osc('sine', 120, t, .25); s.frequency.exponentialRampToValueAtTime(55, t + .12); const g = this._gain(t, .9, .001, .2); s.connect(g); this._bus(g, { gain: o.gain ?? 1 });
      const n = this._noise(t, .12), lp = this._filter('lowpass', 900), ng = this._gain(t, .5, .001, .08); n.connect(lp); lp.connect(ng); this._bus(ng, { gain: o.gain ?? 1, verb: o.verb ?? .2 });
    }

    // the bar, for the recipe-build style: every sound placed on the event it belongs to
    /** felt tap as a source settles: a 120 Hz thump, 60 ms */
    felt(t, o = {}) { const s = this._osc('sine', 120, t, .12), g = this._gain(t, .7, .002, .06); s.connect(g); this._bus(g, o); }
    /** a pour lasting dur: band-passed noise whose centre rises from o.from (600 Hz) to o.to (1,400 Hz) as the glass fills */
    pour(t, dur = .7, o = {}) {
      const n = this._noise(t, dur + .1), bp = this._filter('bandpass', o.from || 600, 2.2); bp.frequency.setValueAtTime(o.from || 600, Math.max(0, t)); bp.frequency.exponentialRampToValueAtTime(o.to || 1400, t + dur);
      const g = this.ac.createGain(); g.gain.setValueAtTime(Z, Math.max(0, t)); g.gain.linearRampToValueAtTime(.55, t + .03); g.gain.setValueAtTime(.55, t + Math.max(.04, dur - .08)); g.gain.linearRampToValueAtTime(Z, t + dur);
      n.connect(bp); bp.connect(g); this._bus(g, { verb: .15, ...o });
    }
    /** a single quiet droplet as the level settles: 900 Hz with a fast pitch drop */
    droplet(t, o = {}) { const s = this._osc('sine', 900, t, .12); s.frequency.exponentialRampToValueAtTime(380, t + .06); const g = this._gain(t, .16, .001, .07); s.connect(g); this._bus(g, { verb: .25, ...o }); }
    /** a paper tick as a measure lands: a 20 ms filtered noise burst */
    paper(t, o = {}) { const n = this._noise(t, .03), hp = this._filter('bandpass', 3200, 1.1), g = this._gain(t, .35, .001, .02); n.connect(hp); hp.connect(g); this._bus(g, o); }
    /** ice: three short clicks at 3 kHz, 70 ms apart */
    ice(t, o = {}) { for (let k = 0; k < 3; k++) { const tt = t + k * .07, n = this._noise(tt, .02), bp = this._filter('bandpass', 3000, 4), g = this._gain(tt, .4, .0008, .015); n.connect(bp); bp.connect(g); this._bus(g, { verb: .2, ...o }); } }
    /** the stir: a low swirl, noise through a slowly moving filter, dur seconds */
    swirl(t, dur = 4.8, o = {}) {
      const n = this._noise(t, dur), lp = this._filter('bandpass', 300, 1.6), g = this.ac.createGain();
      for (let k = 0; k <= 8; k++) lp.frequency.setValueAtTime(260 + 220 * (k % 2), t + k * dur / 8);
      g.gain.setValueAtTime(Z, Math.max(0, t)); g.gain.linearRampToValueAtTime(.3, t + .25); g.gain.setValueAtTime(.3, t + dur - .4); g.gain.linearRampToValueAtTime(Z, t + dur);
      n.connect(lp); lp.connect(g); this._bus(g, { verb: .3, ...o });
    }
    /** a glass clink: inharmonic partials 2,400 / 3,900 / 5,600 Hz decaying in 0.5, 0.35 and 0.2 s */
    clink(t, o = {}) { for (const [f, d, a] of [[2400, .5, .22], [3900, .35, .14], [5600, .2, .08]]) { const s = this._osc('sine', f, t, d), g = this._gain(t, a, .001, d); s.connect(g); this._bus(g, { verb: .35, ...o }); } }
    /** a soft page turn as the recipe card forms: a 250 ms noise sweep */
    page(t, o = {}) { const n = this._noise(t, .3), bp = this._filter('bandpass', 1200, .9), g = this._gain(t, .3, .04, .21); bp.frequency.setValueAtTime(800, Math.max(0, t)); bp.frequency.exponentialRampToValueAtTime(4200, t + .25); n.connect(bp); bp.connect(g); this._bus(g, o); }

    // Chinese instruments, for The Art of Operations and anything calm
    /** a plucked lute string (Karplus-Strong): o.dur seconds of ring, o.bright 0..1, o.decay per cycle (0.990 short to 0.998 long) */
    string(t, note, o = {}) {
      const sr = this.ac.sampleRate, f = hz(note), dur = o.dur || 2.6, N = Math.max(2, Math.round(sr / f)), len = Math.floor(sr * dur);
      const buf = this.ac.createBuffer(1, len, sr), d = buf.getChannelData(0), ring = new Float32Array(N), bright = o.bright ?? .55, decay = o.decay ?? .9965;
      let prev = 0; for (let i = 0; i < N; i++) { const n = Math.random() * 2 - 1; prev = prev + bright * (n - prev); ring[i] = prev; } // a softer pick for lower brightness
      for (let i = 0, k = 0; i < len; i++) { const a = ring[k], b = ring[(k + 1) % N]; d[i] = a; ring[k] = decay * .5 * (a + b); k = (k + 1) % N; }
      const s = this.ac.createBufferSource(); s.buffer = buf; s.start(Math.max(0, t));
      const body = this._filter('peaking', 420, 1.2); body.gain.value = 5; const g = this._gain(t, .5, .002, dur);
      s.connect(body); body.connect(g); this._bus(g, { verb: .35, ...o });
    }
    /** a tremolo roll on one note: rapid soft plucks swelling into the next moment */
    roll(t, note, dur = 1, o = {}) { const rate = o.rate || 13, n = Math.floor(dur * rate); for (let i = 0; i < n; i++) this.string(t + i / rate, note, { dur: .5, bright: .4, gain: (o.gain ?? .7) * (.35 + .65 * i / n), verb: o.verb ?? .4 }); }
    /** a temple bell: inharmonic partials, long ring. Strike it on every transition. */
    bell(t, note = 'D5', o = {}) {
      const f = hz(note), parts = [[.5, .5, 7], [1, 1, 5], [1.183, .45, 3.6], [1.506, .35, 2.8], [2, .3, 2.2], [2.514, .18, 1.6], [2.662, .14, 1.3], [3.011, .1, 1]];
      for (const [r, a, dec] of parts) { const s = this._osc('sine', f * r, t, dec), g = this._gain(t, .16 * a, .002, dec); s.connect(g); this._bus(g, { verb: .5, ...o }); }
    }
    /** a taiko drum: weight, sparingly */
    taiko(t, o = {}) {
      const s = this._osc('sine', 85, t, 1.2); s.frequency.exponentialRampToValueAtTime(44, t + .35); const g = this._gain(t, 1, .003, 1); s.connect(g); this._bus(g, { gain: o.gain ?? 1, verb: o.verb ?? .4 });
      const n = this._noise(t, .3), bp = this._filter('bandpass', 180, 1.5), ng = this._gain(t, .6, .002, .22); n.connect(bp); bp.connect(ng); this._bus(ng, { gain: o.gain ?? 1, verb: o.verb ?? .4 });
    }
    /** a low drone under a scene: slow in, slow out */
    drone(t, note, dur, o = {}) {
      const lp = this._filter('lowpass', 520, .6), att = Math.min(2.5, dur / 3), rel = Math.min(2.5, dur / 3), g = this._gain(t, .09, att, rel, .09, Math.max(0, dur - att - rel));
      for (const [type, mul, det] of [['triangle', 1, -6], ['triangle', 1, 6], ['sine', .5, 0], ['sine', 1.5, 3]]) this._osc(type, hz(note) * mul, t, dur + .5, det).connect(lp);
      lp.connect(g); this._bus(g, { verb: .45, ...o });
    }
    /** wind and air: a breathing band of noise */
    wind(t, dur, o = {}) {
      const n = this._noise(t, dur), bp = this._filter('bandpass', 600, .9), g = this.ac.createGain(), p = bp.frequency;
      p.setValueAtTime(500, Math.max(0, t)); for (let k = 1; k <= Math.ceil(dur / 2); k++) p.linearRampToValueAtTime(380 + Math.random() * 700, t + Math.min(dur, k * 2));
      g.gain.setValueAtTime(Z, Math.max(0, t)); g.gain.linearRampToValueAtTime(.09 * (o.gain ?? 1), t + Math.min(2, dur / 3)); g.gain.setValueAtTime(.09 * (o.gain ?? 1), t + Math.max(0, dur - Math.min(2, dur / 3))); g.gain.linearRampToValueAtTime(0, t + dur);
      if (this.noiseBuf.duration < dur) { n.loop = true; }
      n.connect(bp); bp.connect(g); this._bus(g, { verb: .3 });
    }
    // jazz, for light, smooth explainers: electric piano, upright bass, ride, brushes, a swung groove, chord symbols
    /** chord symbol to note names: S.chord('Dm9') · 'G13' · 'Cmaj7' · 'F#m7b5' · 'Bb6' · 'Eb9' · 'Asus' (voiced from `octave`, root dropped an octave if `rootless` is false) */
    chord(sym, octave = 3) {
      const m = /^([A-G][#b]?)(maj13|maj9|maj7|m7b5|m11|m9|m7|m6|dim7|13|11|9|7|6|sus|m)?$/.exec(String(sym).trim()); if (!m) throw new Error('unknown chord ' + sym);
      const Q = { '': [0, 4, 7], m: [0, 3, 7], maj7: [0, 4, 7, 11], maj9: [0, 4, 7, 11, 14], maj13: [0, 4, 11, 14, 21], m7: [0, 3, 7, 10], m9: [0, 3, 10, 14], m11: [0, 3, 10, 14, 17], m6: [0, 3, 7, 9], m7b5: [0, 3, 6, 10], dim7: [0, 3, 6, 9], 7: [0, 4, 7, 10], 9: [0, 4, 10, 14], 11: [0, 7, 10, 14, 17], 13: [0, 4, 10, 14, 21], 6: [0, 4, 7, 9], sus: [0, 5, 7, 10] }[m[2] || ''];
      const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'], r = NOTE[m[1]];
      return Q.map(i => { const n = r + i + octave * 12; return names[n % 12] + Math.floor(n / 12); });
    }
    /** an electric piano (FM tines): a chord or a note. o.gain, o.verb, o.bright (0..1) */
    keys(t, notes, dur = 1, o = {}) {
      const lp = this._filter('lowpass', 3200 + 2500 * (o.bright ?? .5), .5), bus = this.ac.createGain(); bus.gain.value = 1; lp.connect(bus);
      // a gentle tremolo, as a real Rhodes amp would add
      const trem = this.ac.createOscillator(), td = this.ac.createGain(); trem.frequency.value = 5.2; td.gain.value = .12; trem.connect(td); td.connect(bus.gain); trem.start(Math.max(0, t)); trem.stop(t + dur + 2);
      for (const [k, n] of [].concat(notes).entries()) {
        const f = hz(n), tt = t + k * (o.spread ?? .012), car = this._osc('sine', f, tt, dur + 1.6), mod = this._osc('sine', f * (o.ratio || 1), tt, dur + 1.6), mg = this.ac.createGain();
        mg.gain.setValueAtTime(f * 2.4, Math.max(0, tt)); mg.gain.exponentialRampToValueAtTime(f * .25, tt + .45); mod.connect(mg); mg.connect(car.frequency);
        const g = this._gain(tt, .085, .004, Math.min(4, dur + 1.2), .05, Math.max(0, dur - .2)); car.connect(g); g.connect(lp);
      }
      this._bus(bus, { verb: .22, ...o });
    }
    /** an upright bass note: a round thump that blooms and fades */
    upright(t, note, dur = .5, o = {}) {
      const f = hz(note), lp = this._filter('lowpass', 950, .8); lp.frequency.setValueAtTime(1500, Math.max(0, t)); lp.frequency.exponentialRampToValueAtTime(420, t + .25);
      for (const [type, mul, gain] of [['triangle', 1, .55], ['sine', 1, .45], ['sine', 2, .08]]) { const s = this._osc(type, f * mul, t, dur + .3), g = this._gain(t, gain, .008, dur + .2, gain * .5, Math.max(0, dur * .4)); s.connect(g); g.connect(lp); }
      const n = this._noise(t, .04), nl = this._filter('lowpass', 300), ng = this._gain(t, .25, .001, .04); n.connect(nl); nl.connect(ng); ng.connect(lp);
      this._bus(lp, { gain: (o.gain ?? 1) * .9 });
    }
    /** a walking bass: quarter notes through the chords, root on each change and an approach note into the next. chords: [{ beat, sym, beats }] */
    walk(chords, o = {}) {
      for (const [k, c] of chords.entries()) {
        const tones = this.chord(c.sym, o.octave ?? 2).slice(0, 4), next = chords[k + 1] ? this.chord(chords[k + 1].sym, o.octave ?? 2)[0] : tones[0];
        for (let b = 0; b < c.beats; b++) {
          let n = b === 0 ? tones[0] : b === c.beats - 1 ? hz(next) * Math.pow(2, (Math.random() < .5 ? -1 : 1) / 12) : tones[[1, 2, 3, 2][b % 4]] || tones[1];
          this.upright(this.beat(c.beat + b), n, this.beat(1) * .95, o);
        }
      }
    }
    /** a ride cymbal: a bright metallic ping */
    ride(t, o = {}) {
      const hp = this._filter('highpass', 7000), bp = this._filter('bandpass', 9000, 1.1), g = this._gain(t, .04 * (o.gain ?? 1), .003, o.crash ? 1.6 : .45);
      for (const f of [205.3, 304.4, 369.6, 522.7, 540, 800]) this._osc('square', f * 2.4, t, 1.8).connect(hp);
      hp.connect(bp); bp.connect(g); this._bus(g, { verb: .15 });
    }
    /** brushes on a snare: a soft swish (o.sweep for a longer stir) */
    brush(t, o = {}) { const n = this._noise(t, .4), bp = this._filter('bandpass', 2600, 1.2), g = this._gain(t, .07 * (o.gain ?? 1), o.sweep ? .12 : .02, o.sweep ? .3 : .16); n.connect(bp); bp.connect(g); this._bus(g, { verb: .2 }); }
    /** a swung groove: 8 steps a bar (eighth notes), off-beats pushed late by `swing` (0.5 straight, 0.62 a light swing, 0.67 triplet).
     *  S.groove(fromBar, bars, { ride: 'x.xxx.xx', chick: '..x...x.', brush: '..x...x.', kick: 'x.......' }, { swing: .62 }) — x = hit, o = soft */
    groove(fromBar, bars, pat, { swing = .62 } = {}) {
      for (let b = 0; b < bars; b++) for (const [voice, p] of Object.entries(pat)) for (let i = 0; i < 8; i++) {
        const ch = p[i % p.length]; if (ch !== 'x' && ch !== 'o') continue;
        const t = this.bar(fromBar + b) + this.beat(Math.floor(i / 2) + (i % 2 ? swing : 0)), gain = ch === 'o' ? .5 : 1;
        if (voice === 'chick') this.hat(t, { gain: gain * .7 }); else if (voice === 'kick') this.kick(t, { gain: gain * .45, tone: 55 }); else this[voice](t, { gain });
      }
    }
    // money, sparingly: a coin clink, and a tally of clinks that runs with a counting figure
    /** a single coin: bright metallic partials with a quick ring */
    coin(t, o = {}) {
      const f = o.pitch || 3400;
      for (const [r, a, d] of [[1, .5, .2], [1.483, .32, .14], [2.13, .16, .09], [2.98, .08, .06]]) { const s = this._osc('sine', f * r, t, d), g = this._gain(t, .1 * a * (o.gain ?? 1), .0008, d); s.connect(g); this._bus(g, { verb: .14 }); }
    }
    /** coins tallying up over `dur` seconds: n clinks, quick then settling, seeded so it sounds the same every render */
    tally(t, dur = .6, n = 7, o = {}) { for (let i = 0; i < n; i++) { const k = i / Math.max(1, n - 1), tt = t + dur * Math.pow(k, .75) + (Math.random() - .5) * .02; this.coin(tt, { pitch: 2700 + Math.random() * 1500, gain: (o.gain ?? .8) * (.55 + .45 * Math.random()) }); } }
    /** a low drop for a loss landing */
    drop(t, o = {}) { const s = this._osc('sine', 140, t, .5); s.frequency.exponentialRampToValueAtTime(48, t + .32); const g = this._gain(t, .5 * (o.gain ?? 1), .004, .42); s.connect(g); this._bus(g, { verb: .2 }); }
    /** pentatonic notes from a root: S.scale('D', 'minor', 3) → ['D3','F3','G3','A3','C4','D4', …] over two octaves */
    scale(root = 'D', mode = 'minor', octave = 3) {
      const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'], steps = mode === 'major' ? [0, 2, 4, 7, 9] : [0, 3, 5, 7, 10], r = NOTE[root], out = [];
      for (let o = 0; o < 2; o++) for (const s of steps) { const m = r + s + (octave + o) * 12; out.push(names[m % 12] + Math.floor(m / 12)); }
      out.push(names[r % 12] + (octave + 2)); return out;
    }
  }
  SoundKit.hz = hz;
  window.SoundKit = SoundKit;
})();
