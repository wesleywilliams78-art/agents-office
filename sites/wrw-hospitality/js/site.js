/* WRW Hospitality site: nav, smooth scroll, split headlines, the hero's site 1 → 10 → 100 count, the sideways scale
   chapter, logo reels, stacked offers, receipts, magnetic buttons, quotes, enquiry gate. */
(() => {
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const cfg = window.WRW_CONFIG || {};
  const navH = () => document.querySelector('.nav')?.offsetHeight || 0;
  let lenis = null;

  const scrollToEl = el => {
    if (lenis) lenis.scrollTo(el, { offset: -navH() - 16 });
    else el.scrollIntoView({ behavior: reduce.matches ? 'auto' : 'smooth', block: 'start' });
  };

  // Nav: one button on phones, no burger
  const nav = document.querySelector('.nav');
  const toggle = nav?.querySelector('.nav__toggle');
  if (toggle) {
    const set = open => {
      nav.toggleAttribute('data-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.textContent = open ? 'Close' : 'Menu';
      if (lenis) open ? lenis.stop() : lenis.start();
    };
    toggle.addEventListener('click', () => set(!nav.hasAttribute('data-open')));
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && nav.hasAttribute('data-open')) { set(false); toggle.focus(); }
    });
    nav.querySelectorAll('.nav__links a').forEach(a => a.addEventListener('click', () => set(false)));
  }

  // Quotes: a slow carousel that stops for good once the reader touches it
  document.querySelectorAll('[data-quotes]').forEach(box => {
    const track = box.querySelector('.quotes__track');
    const count = track.children.length;
    const at = () => Math.round(track.scrollLeft / track.clientWidth);
    const go = i => track.scrollTo({ left: ((i + count) % count) * track.clientWidth, behavior: reduce.matches ? 'auto' : 'smooth' });
    let timer = null, touched = false;
    const stop = () => { clearInterval(timer); timer = null; };
    const hold = () => { touched = true; stop(); };
    box.querySelector('[data-prev]')?.addEventListener('click', () => { hold(); go(at() - 1); });
    box.querySelector('[data-next]')?.addEventListener('click', () => { hold(); go(at() + 1); });
    ['pointerenter', 'focusin', 'touchstart', 'wheel'].forEach(ev => box.addEventListener(ev, hold, { passive: true }));
    if (reduce.matches || count < 2) return;
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !touched && !timer) timer = setInterval(() => go(at() + 1), 8000);
      else if (!e.isIntersecting) stop();
    }).observe(box);
  });

  // Contact: step 1 is the enquiry form; the Cal.com booking opens only after it is sent
  const form = document.querySelector('#enquiry-form');
  const gate = document.querySelector('#booking');
  if (form && gate) {
    const status = form.querySelector('.form__status');
    const send = form.querySelector('[type="submit"]');
    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (form.elements.company_website.value) return; // spam trap
      const data = Object.fromEntries(new FormData(form));
      delete data.company_website;
      send.disabled = true;
      try {
        if (cfg.FORM_ENDPOINT) {
          const res = await fetch(cfg.FORM_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify(data)
          });
          if (!res.ok) throw new Error('HTTP ' + res.status);
          status.textContent = 'Thank you. Your note is on its way. Now pick a time below.';
        } else {
          status.innerHTML = '<span class="ph">[PLACEHOLDER: nothing was sent. FORM_ENDPOINT in js/config.js is empty in this review build.]</span>';
        }
        openGate();
      } catch {
        status.textContent = 'That did not send. Please try again, or reach me on LinkedIn below.';
        send.disabled = false;
      }
    });

    function openGate() {
      const body = gate.querySelector('.gate__body');
      gate.dataset.state = 'open';
      document.querySelectorAll('.steps-bar li').forEach((li, i) => li.toggleAttribute('aria-current', i === 1));
      document.querySelector('.steps-bar li:nth-child(2)')?.setAttribute('aria-current', 'step');
      body.replaceChildren();
      if (cfg.CAL_LINK) {
        const path = cfg.CAL_LINK.replace(/^https?:\/\/cal\.com\//, '').replace(/^\/+/, '');
        const frame = document.createElement('iframe');
        frame.src = 'https://cal.com/' + path + '?embed=true';
        frame.title = 'Book a call with Wesley Williams';
        body.append(frame);
      } else {
        const ph = document.createElement('p');
        ph.className = 'ph-block';
        ph.textContent = '[PLACEHOLDER: the Cal.com booking calendar appears here once CAL_LINK is set in js/config.js. The event is set to “requires confirmation”.]';
        body.append(ph);
      }
      scrollToEl(gate);
      gate.focus({ preventScroll: true });
    }
  }

  const gsap = window.gsap, ST = window.ScrollTrigger, Split = window.SplitText;
  if (!gsap || !ST) { root.classList.remove('motion'); return; }
  gsap.registerPlugin(ST);
  if (Split) gsap.registerPlugin(Split);

  // Smooth scroll, skipped when the reader asks for less motion
  if (!reduce.matches && window.Lenis) {
    lenis = new window.Lenis({ autoRaf: false, anchors: { offset: -navH() - 16 } });
    lenis.on('scroll', ST.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  const ease = 'expo.out'; // = cubic-bezier(.16, 1, .3, 1)
  const mm = gsap.matchMedia();

  mm.add('(prefers-reduced-motion: reduce)', () => {
    root.classList.remove('motion');
    gsap.set('.split', { visibility: 'visible' });
  });

  /* ---------- Everything that moves (motion allowed, every width) ---------- */
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    const cleanups = [];

    // Progress hairline and the live chapter label in the nav
    gsap.to('.nav__progress', { scaleX: 1, ease: 'none', scrollTrigger: { trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: .3 } });
    const chapter = document.querySelector('.nav__chapter span');
    if (chapter) {
      let current = '';
      document.querySelectorAll('[data-chapter]').forEach(sec => ST.create({
        trigger: sec, start: 'top 45%', end: 'bottom 45%',
        onToggle: self => {
          if (!self.isActive || current === sec.dataset.chapter) return;
          current = sec.dataset.chapter;
          gsap.timeline().to(chapter, { yPercent: -110, duration: .25, ease: 'power2.in' })
            .add(() => { chapter.textContent = current; })
            .fromTo(chapter, { yPercent: 110 }, { yPercent: 0, duration: .5, ease });
        }
      }));
    }

    // Split headlines: lines rise out of a mask
    const hero = document.querySelector('.hero');
    document.querySelectorAll('.split').forEach(el => {
      if (!Split) { gsap.set(el, { visibility: 'visible' }); return; }
      const inHero = hero && hero.contains(el);
      Split.create(el, {
        type: 'lines', mask: 'lines', autoSplit: true, linesClass: 'line',
        onSplit: self => {
          gsap.set(el, { visibility: 'visible' });
          return gsap.from(self.lines, {
            yPercent: 112, duration: inHero ? 1.2 : 1, ease, stagger: .09, delay: inHero ? .15 : 0,
            scrollTrigger: inHero ? undefined : { trigger: el, start: 'top 85%', once: true }
          });
        }
      });
    });

    // The hero's own blocks come in on load, after the headline, whether or not they are near the fold
    gsap.fromTo('.hero .reveal, .phero .reveal', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: .9, ease, stagger: .1, delay: .55 });

    // Everything else marked .reveal fades up; siblings stagger
    ST.batch(gsap.utils.toArray('.reveal').filter(el => !el.closest('.hero, .phero')), {
      start: 'top 88%', once: true, batchMax: 4,
      onEnter: els => gsap.fromTo(els, { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: 1, ease, stagger: .1, overwrite: true })
    });
    const onFocus = e => {
      const block = e.target.closest?.('.reveal');
      if (block && +getComputedStyle(block).opacity < 1) gsap.to(block, { opacity: 1, y: 0, duration: .3, ease, overwrite: true });
    };
    document.addEventListener('focusin', onFocus);
    cleanups.push(() => document.removeEventListener('focusin', onFocus));

    // Hero: the panel rises, then counts site 1, site 10, site 100 while the grid fills in the same three beats
    const panel = document.querySelector('.hero__panel');
    if (panel) {
      const stack = panel.querySelector('.odo__stack');
      const tiles = gsap.utils.toArray('.tiles li', panel);
      const steps = gsap.utils.toArray('.hero__steps span', panel);
      gsap.set(stack, { y: 0, yPercent: 0 });
      gsap.set(tiles, { backgroundColor: 'rgba(247,242,234,0)', boxShadow: 'inset 0 0 0 1px rgba(247,242,234,.45)' });
      gsap.set(steps, { opacity: .35 });
      gsap.timeline({ delay: .2 })
        .fromTo(panel, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.1, ease: 'expo.inOut' })
        .fromTo(panel.querySelector('.hero__panel-top'), { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: .6, ease }, '-=.3')
        .to(tiles[0], { backgroundColor: '#F7F2EA', duration: .3 }, '<')
        .to(steps[0], { opacity: 1, duration: .3 }, '<')
        .to(stack, { yPercent: -100 / 3, duration: .7, ease: 'expo.inOut' }, '+=.5')
        .to(tiles.slice(1, 10), { backgroundColor: '#F7F2EA', duration: .2, stagger: .04 }, '<.2')
        .to(steps[1], { opacity: 1, duration: .3 }, '<')
        .to(stack, { yPercent: -200 / 3, duration: .7, ease: 'expo.inOut' }, '+=.45')
        .to(tiles.slice(10), { backgroundColor: '#F7F2EA', duration: .2, stagger: { each: .008, grid: [9, 10], from: 'start' } }, '<.15')
        .to(steps[2], { opacity: 1, duration: .3 }, '<')
        .set(tiles, { boxShadow: 'none' })
        .call(() => { started = true; sync(); });

      // Then the round never stops: a snake walks every one of the hundred sites in turn (rows, a spiral in, columns,
      // a spiral out), each site flashing ink and fading back through deep red, and the label names the site it is on.
      // It runs only while the hero is on screen, and the Pause button stops it.
      const N = 10, at = (r, c) => r * N + c, pad3 = n => String(n).padStart(3, '0');
      const rows = Array.from({ length: N * N }, (_, k) => { const r = Math.floor(k / N), c = k % N; return at(r, r % 2 ? N - 1 - c : c); });
      const cols = Array.from({ length: N * N }, (_, k) => { const c = Math.floor(k / N), r = k % N; return at(c % 2 ? N - 1 - r : r, c); });
      const spiral = [];
      for (let t = 0, b = N - 1, l = 0, r = N - 1; t <= b && l <= r;) {
        for (let c = l; c <= r; c++) spiral.push(at(t, c)); t++;
        for (let q = t; q <= b; q++) spiral.push(at(q, r)); r--;
        if (t <= b) { for (let c = r; c >= l; c--) spiral.push(at(b, c)); b--; }
        if (l <= r) { for (let q = b; q >= t; q--) spiral.push(at(q, l)); l++; }
      }
      const label = panel.querySelector('.hero__panel-top span');
      const STEP = .075;
      const round = gsap.timeline({ paused: true, repeat: -1 });
      [rows, spiral, cols, spiral.slice().reverse()].forEach(path => {
        const start = round.duration();
        path.forEach((i, k) => {
          round.to(tiles[i], { keyframes: [{ backgroundColor: '#201A19', duration: .06 }, { backgroundColor: '#B81F1F', duration: .4 }, { backgroundColor: '#F7F2EA', duration: .9 }] }, start + k * STEP)
            .call(() => { label.textContent = 'Site Nº ' + pad3(i + 1); }, null, start + k * STEP);
        });
        round.to({}, { duration: .8 }); // a breath between laps
      });
      const motionBtn = document.querySelector('.hero__motion');
      let started = false, stopped = false, onScreen = true;
      function sync() { if (started && !stopped && onScreen) round.play(); else round.pause(); }
      const seen = new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; sync(); });
      seen.observe(panel);
      if (motionBtn) {
        motionBtn.hidden = false;
        motionBtn.addEventListener('click', () => {
          stopped = !stopped;
          motionBtn.setAttribute('aria-pressed', String(stopped));
          motionBtn.textContent = stopped ? 'Play' : 'Pause';
          motionBtn.setAttribute('aria-label', stopped ? 'Play the moving grid' : 'Pause the moving grid');
          sync();
        });
      }
      cleanups.push(() => { seen.disconnect(); round.kill(); label.textContent = 'Site Nº'; if (motionBtn) motionBtn.hidden = true; });
    }

    // Logo reels: two rows of square tiles running opposite ways, only while on screen; they ease to a stop under the pointer or on focus
    gsap.utils.toArray('.reel').forEach(reel => {
      const track = reel.querySelector('.reel__track');
      reel.classList.add('is-moving');
      // Same pace however many tiles a reel holds: seconds per tile as first tuned (6 brands in 46 s, 7 partners in 52 s)
      const tiles = track.querySelectorAll('.reel__group:not([aria-hidden]) .logo').length;
      const loop = reel.classList.contains('reel--right')
        ? gsap.fromTo(track, { xPercent: -50 }, { xPercent: 0, duration: tiles * 52 / 7, ease: 'none', repeat: -1 })
        : gsap.to(track, { xPercent: -50, duration: tiles * 46 / 6, ease: 'none', repeat: -1 });
      ST.create({ trigger: reel, start: 'top bottom', end: 'bottom top', onToggle: self => (self.isActive ? loop.play() : loop.pause()) });
      const stop = () => gsap.to(loop, { timeScale: 0, duration: .5, overwrite: true });
      const go = () => gsap.to(loop, { timeScale: 1, duration: .8, overwrite: true });
      ['pointerenter', 'focusin'].forEach(e => reel.addEventListener(e, stop));
      ['pointerleave', 'focusout'].forEach(e => reel.addEventListener(e, go));
      cleanups.push(() => {
        loop.kill(); gsap.set(track, { clearProps: 'transform' }); reel.classList.remove('is-moving');
        ['pointerenter', 'focusin'].forEach(e => reel.removeEventListener(e, stop));
        ['pointerleave', 'focusout'].forEach(e => reel.removeEventListener(e, go));
      });
    });

    // Ledger rows: a red rule draws under each figure
    gsap.utils.toArray('.ledger li').forEach(li => gsap.fromTo(li, { '--drawn': 0 }, { '--drawn': 1, duration: 1.2, ease, scrollTrigger: { trigger: li, start: 'top 88%', once: true } }));

    // The countries map: the strategy countries turn from grey to red, west to east; Qatar's marker follows its turn
    const map = document.querySelector('.ledger__map');
    if (map) {
      const lit = map.querySelectorAll('.map__c, .map__pin');
      const countries = [...map.querySelectorAll('.map__c')];
      const tl = gsap.timeline({ scrollTrigger: { trigger: map, start: 'top 78%', once: true } });
      tl.fromTo(countries, { fill: '#DAD3C9' }, { fill: '#FF3131', duration: .45, ease: 'power2.out', stagger: .13 })
        .fromTo(map.querySelectorAll('.map__pin'), { opacity: 0 }, { opacity: 1, duration: .4 }, .13 * Math.max(0, countries.findIndex(c => c.hasAttribute('data-small'))));
      cleanups.push(() => { tl.kill(); gsap.set(lit, { clearProps: 'fill,opacity' }); });
    }

    // Marquee: two rows, opposite ways; scrolling speeds them up and skews them
    const rows = gsap.utils.toArray('.marquee__row');
    if (rows.length) {
      const loops = rows.map((r, i) => i % 2 ? gsap.fromTo(r, { xPercent: -50 }, { xPercent: 0, duration: 46, ease: 'none', repeat: -1 }) : gsap.to(r, { xPercent: -50, duration: 40, ease: 'none', repeat: -1 }));
      const skew = gsap.quickTo(rows, 'skewX', { duration: .6, ease: 'power3.out' });
      const mqEl = document.querySelector('.marquee');
      mqEl.addEventListener('pointerenter', () => loops.forEach(l => l.pause()));
      mqEl.addEventListener('pointerleave', () => loops.forEach(l => l.play()));
      const settle = gsap.delayedCall(.15, () => skew(0)).pause();
      ST.create({
        trigger: '.marquee', start: 'top bottom', end: 'bottom top',
        onToggle: self => loops.forEach(l => (self.isActive ? l.play() : l.pause())),
        onUpdate: self => {
          const v = self.getVelocity();
          const boost = 1 + Math.min(Math.abs(v) / 350, 5);
          loops.forEach(l => { l.timeScale(boost); gsap.to(l, { timeScale: 1, duration: 1.2, ease: 'power2.out', overwrite: true }); });
          skew(gsap.utils.clamp(-7, 7, v / -260));
          settle.restart(true);
        }
      });
    }

    // How it starts: the rail fills as you read down
    const list = document.querySelector('.how__list');
    if (list) gsap.fromTo(list.querySelector('.how__rail i'), { '--fill': 0 }, { '--fill': 1, ease: 'none', scrollTrigger: { trigger: list, start: 'top 70%', end: 'bottom 60%', scrub: .5 } });

    // Receipts print out of the till, top to bottom
    ST.batch(gsap.utils.toArray('.receipt'), {
      start: 'top 85%', once: true,
      onEnter: els => gsap.fromTo(els, { clipPath: 'inset(0 0 100% 0)', y: -24 }, { clipPath: 'inset(0 0 0% 0)', y: 0, duration: 1.4, ease: 'power3.out', stagger: .18 })
    });

    // Close: site 1, site 10, site 100 set down in turn
    document.querySelectorAll('.close__scale').forEach(row => {
      const t = gsap.timeline({ scrollTrigger: { trigger: row, start: 'top 90%', once: true } });
      row.querySelectorAll('.sq').forEach((sq, k) => t.fromTo(sq.children, { scale: 0 }, { scale: 1, transformOrigin: '50% 100%', duration: .5, ease, stagger: { each: k === 2 ? .006 : .05, grid: k === 2 ? [10, 10] : 'auto', from: 'start' } }, k ? '-=.25' : 0));
    });

    // Footer wordmark slides up into place
    gsap.from('.footer__mark', { yPercent: 40, opacity: 0, duration: 1.4, ease, scrollTrigger: { trigger: '.footer__mark', start: 'top 98%', once: true } });

    // Offer illustrations draw themselves when their panel is in view
    const illos = gsap.utils.toArray('.illo').map(box => {
      const tl = gsap.timeline({ paused: true, defaults: { ease } });
      tl.from(box.closest('.offer').querySelector('.offer__verb'), { opacity: 0, x: -40, duration: 1.2 }, 0);
      tl.fromTo(box.querySelectorAll('[data-draw]'), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.4, stagger: .04 }, 0);
      tl.fromTo(box.querySelectorAll('.bar'), { scaleY: 1 }, { scaleY: i => +box.querySelectorAll('.bar')[i].style.getPropertyValue('--to'), duration: 1.4, stagger: .08, transformOrigin: '50% 100%' }, .2);
      tl.from(box.querySelectorAll('.pop, .ribbon'), { scale: 0, transformOrigin: '50% 50%', duration: .8, stagger: .06, ease: 'back.out(2)' }, .7);
      const signals = box.querySelectorAll('.signal');
      if (signals.length) {
        gsap.set(signals, { strokeDasharray: '.08 .92', strokeDashoffset: 1 });
        tl.to(signals, { strokeDashoffset: 0, duration: 1.6, ease: 'none', stagger: { each: .16, repeat: -1 } }, 1);
        tl.to(box.querySelector('.node--alert'), { fill: '#FF3131', duration: .3, repeat: 5, yoyo: true, ease: 'power1.inOut' }, 1.2);
      }
      return { box, tl };
    });
    cleanups.push(() => illos.forEach(({ tl }) => tl.progress(1).kill()));

    // Magnetic buttons and tilting covers, only where there is a fine pointer
    if (fine.matches) {
      document.querySelectorAll('[data-magnetic]').forEach(el => {
        const xTo = gsap.quickTo(el, 'x', { duration: .6, ease: 'elastic.out(1, .45)' });
        const yTo = gsap.quickTo(el, 'y', { duration: .6, ease: 'elastic.out(1, .45)' });
        const move = e => { const r = el.getBoundingClientRect(); xTo((e.clientX - r.left - r.width / 2) * .3); yTo((e.clientY - r.top - r.height / 2) * .4); };
        const leave = () => { xTo(0); yTo(0); };
        el.addEventListener('pointermove', move); el.addEventListener('pointerleave', leave);
        cleanups.push(() => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', leave); gsap.set(el, { x: 0, y: 0 }); });
      });
      document.querySelectorAll('[data-tilt]').forEach(el => {
        gsap.set(el, { transformPerspective: 900 });
        const rx = gsap.quickTo(el, 'rotationX', { duration: .8, ease: 'power3.out' });
        const ry = gsap.quickTo(el, 'rotationY', { duration: .8, ease: 'power3.out' });
        const move = e => { const r = el.getBoundingClientRect(); ry(((e.clientX - r.left) / r.width - .5) * 10); rx(((e.clientY - r.top) / r.height - .5) * -10); };
        const leave = () => { rx(0); ry(0); };
        el.addEventListener('pointermove', move); el.addEventListener('pointerleave', leave);
        cleanups.push(() => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', leave); gsap.set(el, { rotationX: 0, rotationY: 0 }); });
      });
    }

    window.__wrwIllos = illos;
    return () => cleanups.forEach(fn => fn());
  });

  // Offers: on large screens each panel holds the screen and the next slides up over it while the one beneath
  // recedes; elsewhere they simply stack. The illustration plays when its panel arrives.
  mm.add({ wide: '(prefers-reduced-motion: no-preference) and (min-width: 1024px) and (min-height: 700px)', narrow: '(prefers-reduced-motion: no-preference) and ((max-width: 1023px) or (max-height: 699px))' }, ctx => {
    const offers = document.querySelector('.offers');
    const illos = window.__wrwIllos || [];
    if (!offers) return;
    if (ctx.conditions.wide) {
      offers.classList.add('is-stack');
      const panels = gsap.utils.toArray('.offer', offers);
      panels.forEach((p, i) => {
        const next = panels[i + 1];
        if (next) gsap.to(p.querySelector('.offer__grid'), { scale: .92, opacity: .2, ease: 'none', scrollTrigger: { trigger: next, start: 'top bottom', end: () => 'top ' + navH(), scrub: true, invalidateOnRefresh: true } });
      });
      illos.forEach(({ box, tl }) => ST.create({ trigger: box.closest('.offer'), start: () => 'top ' + (navH() + innerHeight * .35), once: true, onEnter: () => tl.play() }));
      return () => offers.classList.remove('is-stack');
    }
    illos.forEach(({ box, tl }) => ST.create({ trigger: box, start: 'top 80%', once: true, onEnter: () => tl.play() }));
  });

  // The scale: Site 1 → Site 10 → Site 100 runs sideways on wide screens (vertical scroll drives the track);
  // elsewhere the panels stack and each animates as it arrives. Reduced motion shows the final states.
  const cssNum = (el, name, d = 0) => { const v = el.style.getPropertyValue(name); return v ? parseFloat(v) : d; };
  mm.add({ wide: '(prefers-reduced-motion: no-preference) and (min-width: 900px)', narrow: '(prefers-reduced-motion: no-preference) and (max-width: 899px)' }, ctx => {
    const scale = document.querySelector('.scale');
    if (!scale) return;
    const p1 = scale.querySelector('[data-n="1"]'), p10 = scale.querySelector('[data-n="10"]'), p100 = scale.querySelector('[data-n="100"]');
    const drifted = gsap.utils.toArray('.site', p10), dots = gsap.utils.toArray('.dots li', p100);
    const drift = { rotation: i => cssNum(drifted[i], '--rot'), x: i => cssNum(drifted[i], '--x'), y: i => cssNum(drifted[i], '--y'), opacity: i => cssNum(drifted[i], '--o', 1) };
    if (ctx.conditions.wide) {
      const track = scale.querySelector('.scale__track');
      const dist = () => Math.max(0, track.scrollWidth - innerWidth);
      const setDist = () => scale.style.setProperty('--dist', dist() + 'px');
      scale.classList.add('is-h');
      setDist();
      ST.addEventListener('refreshInit', setDist);
      const run = { trigger: scale, start: () => 'top ' + navH(), end: 'bottom bottom', scrub: .6, invalidateOnRefresh: true };
      const slide = gsap.to(track, { x: () => -dist(), ease: 'none', scrollTrigger: run });
      gsap.fromTo(scale.querySelector('.scale__progress i'), { scaleX: 0 }, { scaleX: 1, ease: 'none', scrollTrigger: { ...run } });
      const inPanel = (el, vars, start = 'left 85%', end = 'center 55%') => ({ ...vars, ease: 'none', scrollTrigger: { trigger: el, containerAnimation: slide, start, end, scrub: true } });
      [p1, p10, p100].forEach(p => gsap.fromTo(p.querySelectorAll('.scale__n, .scale__line'), { opacity: 0, x: 80 }, inPanel(p, { opacity: 1, x: 0, stagger: .15 }, 'left 95%', 'left 45%')));
      gsap.fromTo(p1.querySelector('.site'), { scale: .6, opacity: 0 }, inPanel(p1, { scale: 1, opacity: 1 }));
      gsap.fromTo(drifted, { rotation: 0, x: 0, y: 0, opacity: 1 }, inPanel(p10, { ...drift, stagger: .03 }));
      gsap.fromTo(dots, { scale: 0 }, inPanel(p100, { scale: 1, stagger: { each: .01, grid: [10, 10], from: 'start' } }));
      return () => { ST.removeEventListener('refreshInit', setDist); scale.classList.remove('is-h'); scale.style.removeProperty('--dist'); };
    }
    gsap.fromTo(p1.querySelector('.site'), { scale: .6, opacity: 0 }, { scale: 1, opacity: 1, duration: 1, ease, scrollTrigger: { trigger: p1, start: 'top 70%', once: true } });
    gsap.fromTo(drifted, { rotation: 0, x: 0, y: 0, opacity: 1 }, { ...drift, duration: 1.4, ease, stagger: .05, scrollTrigger: { trigger: p10, start: 'top 65%', once: true } });
    gsap.fromTo(dots, { scale: 0 }, { scale: 1, duration: .5, ease, stagger: { each: .008, grid: [10, 10], from: 'start' }, scrollTrigger: { trigger: p100, start: 'top 70%', once: true } });
  });

  document.fonts?.ready.then(() => ST.refresh());
  addEventListener('load', () => ST.refresh(), { once: true });
})();
