// Agents Office V3.2.1 (16 Sep 2026) — the CALENDAR (P). One quiet screen with everything the office
// has done, is doing, and will do on the day it belongs to: finished tasks on the day they finished,
// today's work on today, tasks scheduled for a date, and every routine projected forward on the days
// it will fire. Click a day to schedule a task for it, or to start a routine from that date. A rail on
// the left lists the routines themselves — cadence, next run, paused — so the timetable is never a
// guess. Month and week. Reads the office's own task and routine arrays (tasks.js owns them); live or
// demo makes no difference here.
//
//   initCalendar(ctx) → { open, close, toggle, isOpen, refresh }
//   ctx: tasks, routines (the live arrays) · agentOf · DEPTS · DEPT_KEYS · RT_DEPTS · rtRefuse
//        create({ dept, text, at, model }) → Promise<{ ok, task, error }>   (a task for a date)
//        createRoutine({ dept, text, when, needsOk, model }) → Promise<{ ok, routine, error }>
//        cancelTask(t) · rtAct(id, act) · openAgent(id, tab) · esc · isLive() · officeModel() · MODEL_KEYS · modelName · business()
import { occurrences, describe, untilText, fromPicker, shortDate } from './when.js';

const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']; // the week starts on Monday (AU/NZ/UK)
const DOW_LONG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAY = 864e5;
const addDays = (ts, n) => { const d = new Date(ts); d.setDate(d.getDate() + n); return d.getTime(); }; // calendar days, not 24 h: the clocks change on a 23 or 25 hour day
const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const hm = ts => { const d = new Date(ts); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const startOfDay = ts => { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); };
const mondayOf = ts => { const d = new Date(startOfDay(ts)); const k = (d.getDay() + 6) % 7; d.setDate(d.getDate() - k); return d.getTime(); };
const CADENCES = [['daily', 'Every day'], ['weekdays', 'Every weekday'], ['mon', 'Mondays'], ['tue', 'Tuesdays'], ['wed', 'Wednesdays'], ['thu', 'Thursdays'], ['fri', 'Fridays'], ['sat', 'Saturdays'], ['sun', 'Sundays'], ['hourly', 'Every hour, 9–5, weekdays']];

// the content calendar's posts, one colour per place they go (the WRW page and Wesley's own LinkedIn are different accounts)
const PLAT = { 'WRW page LinkedIn': ['WRW LinkedIn', '#0A66C2'], 'Collab LinkedIn': ['Collab LinkedIn', '#7A5CC8'], 'Wesley LinkedIn': ['Wesley LinkedIn', '#16908F'], Instagram: ['Instagram', '#C13584'], 'Art of Operations': ['Art of Operations', '#EC3013'], 'Tales of Nirn': ['Tales of Nirn', '#B07A2A'], Newsletter: ['Newsletter', '#B4830B'] };
const platOf = p => PLAT[p.where] ? p.where : 'Other';
const platColour = p => (PLAT[platOf(p)] || ['', '#6B6A66'])[1];

export function initCalendar(ctx) {
  const { tasks, routines, agentOf, DEPTS, DEPT_KEYS, RT_DEPTS, rtRefuse, create, createRoutine, cancelTask, rtAct, openAgent, esc, isLive, officeModel, MODEL_KEYS, modelName, business, currentDept } = ctx;
  const ov = document.getElementById('calOv'); if (!ov) return null;
  const $ = s => ov.querySelector(s);
  const E = { title: $('#cvTitle'), grid: $('#cvGrid'), dow: $('#cvDow'), rail: $('#cvRail'), railN: $('#cvRtN'), chips: $('#cvChips'), search: $('#cvSearch'), stats: $('#cvStats'), pop: $('#cvPop'), co: $('#cvCo'), seg: $('.cv-seg') };
  let openNow = false, view = 'month', anchor = startOfDay(Date.now()), q = '', deptOn = new Set(DEPT_KEYS), showRoutines = true, showDone = true, onlyRoutine = null, popKind = null, lastDept = 'marketing';
  let doneKeys = {}, socialOnly = false, focus = [], focusOn = true, posts = [], platOn = new Set([...Object.keys(PLAT), 'Other']); // SOCIAL view: only the content calendar's posts, by place
  const MAX = { month: 3, week: 8, day: 80 }; // DAY (Wesley, 3 Nov): one day in full, everything on it in time order
  let gcalEv = [], gcalOn = true; // GOOGLE: Wesley's own Google Calendar, read-only, from the office's copy of its private feeds (/api/gcal)

  /* ---------- what is on each day ---------- */
  function range() { // [from, to) of the days on screen
    if (view === 'day') { const a = startOfDay(anchor); return { from: a, to: addDays(a, 1), days: 1 }; }
    if (view === 'week') { const a = mondayOf(anchor); return { from: a, to: addDays(a, 7), days: 7 }; }
    const d = new Date(anchor); d.setDate(1); const first = mondayOf(d.getTime()); const rows = Math.ceil((new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate() + ((d.getDay() + 6) % 7)) / 7);
    return { from: first, to: addDays(first, rows * 7), days: rows * 7 };
  }
  const matches = s => !q || String(s || '').toLowerCase().includes(q);
  async function loadPosts(jump) { // jump: switching SOCIAL on lands on the week of the next post to go out
    if (location.protocol === 'file:') return; // the demo page has no office behind it (not isLive(): that waits for the connector list, which can take a minute)
    try { const r = await fetch('/api/content'); const j = await r.json(); posts = Array.isArray(j.posts) ? j.posts : []; } catch { /* the calendar still works without them */ }
    if (jump && posts.length) { const t = ymd(new Date()), n = posts.find(p => p.date >= t) || posts[posts.length - 1]; anchor = startOfDay(new Date(n.date + 'T00:00:00').getTime()); }
    if (openNow && (socialOnly || view !== 'month') && E.pop.hidden) render(); // DAY and WEEK carry the posts too
  }
  const postKey = p => 'p|' + p.date + '|' + (p.time || '') + '|' + p.where + '|' + p.format, focusKey = f => 'f|' + f.id;
  async function loadDone() { if (!isLive()) return; try { const j = await (await fetch('/api/calendar-done')).json(); doneKeys = j.done || {}; } catch { /* ticks are a convenience */ } if (openNow && E.pop.hidden) render(); }
  async function tick(id) { // the ✓ on a card: id is "p:<index>" or "f:<index>"
    const [k, i] = id.split(':'), it = k === 'p' ? posts[+i] : focus[+i]; if (!it) return;
    const key = k === 'p' ? postKey(it) : focusKey(it), on = !doneKeys[key]; if (on) doneKeys[key] = Date.now(); else delete doneKeys[key]; render();
    if (isLive()) try { await fetch('/api/calendar-done', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, done: on }) }); } catch { /* the tick stays on screen; it is saved on the next click */ }
  }
  const ckHTML = (id, on) => `<button class="cv-ck${on ? ' on' : ''}" data-ck="${id}" title="${on ? 'Done: click to undo' : 'Mark done'}" aria-label="${on ? 'Done, click to undo' : 'Mark done'}">✓</button>`;
  async function loadFocus() { // the FOCUS layer: Pomodoro sessions and blocks from the office's own timebox file
    if (!isLive()) return;
    try { const r = await fetch('/api/timeboxes'); const j = await r.json(); focus = Array.isArray(j.items) ? j.items : []; } catch { /* the calendar still works without them */ }
    if (openNow && E.pop.hidden) render();
  }
  async function loadGcal() {
    if (!isLive()) return;
    try { const j = await (await fetch('/api/gcal?from=' + (Date.now() - 42 * DAY) + '&to=' + (Date.now() + 42 * DAY))).json(); gcalEv = Array.isArray(j.events) ? j.events : []; } catch { /* the calendar still works without it */ }
    if (openNow && E.pop.hidden) render();
  }
  function postEvents(from, to) { // day key → the content calendar's posts on screen, in time order
    const by = {};
    for (const p of posts) { const at = new Date(p.date + 'T' + (p.time || '00:00') + ':00').getTime(); if (at < from || at >= to) continue; if (!platOn.has(platOf(p))) continue; if (!matches(p.where + ' ' + p.format + ' ' + p.idea + ' ' + p.status)) continue; (by[p.date] ||= []).push({ kind: 'post', at, p }); }
    const personal = e => platOf(e.p) === 'Tales of Nirn' ? 1 : 0; // Wesley, 3 Nov: the fan series is personal, so its card sits at the bottom of each day
    for (const k in by) by[k].sort((a, b) => personal(a) - personal(b) || a.at - b.at);
    return by;
  }
  function events(from, to) { // day key → [{ kind, at, title, dept, agent, t?, r? }]
    if (socialOnly) return postEvents(from, to);
    const by = {}; const push = ev => { if (!deptOn.has(ev.dept)) return; if (!matches(ev.title + ' ' + (agentOf(ev.agent)?.name || ''))) return; (by[ymd(new Date(ev.at))] ||= []).push(ev); };
    const today = startOfDay(Date.now());
    for (const t of tasks) {
      if (t.piece) continue; // a team's pieces sit under the lead's card
      if (onlyRoutine && t.routine !== onlyRoutine) continue;
      if (t.state === 'done') { if (showDone && t.doneAt >= from && t.doneAt < to) push({ kind: 'done', at: t.doneAt, title: t.title, dept: t.dept, agent: t.agent, t }); }
      else if (t.state === 'scheduled') { if (t.dueAt >= from && t.dueAt < to) push({ kind: 'sched', at: t.dueAt, title: t.title, dept: t.dept, agent: t.agent, t }); }
      else if (t.state === 'waiting' || t.state === 'doing' || t.state === 'next') { if (today >= from && today < to) push({ kind: t.state, at: Math.max(today + 1, Math.min(today + DAY - 1, t.changedAt || Date.now())), title: t.title, dept: t.dept, agent: t.agent, t }); }
    }
    if (showRoutines) for (const r of routines) {
      if (r.paused || (onlyRoutine && r.id !== onlyRoutine)) continue;
      if (!r.when || r.when.kind === 'minutes') continue; // a filming cadence is not a calendar
      const startAt = Math.max(from - 1, Date.now() - 1); // routines are only projected forward: what has run is a done task already
      const occ = occurrences(r.when, startAt, to - 1, 800);
      if (r.when.kind === 'hourly') { const seen = new Set(); for (const at of occ) { const k = ymd(new Date(at)); if (seen.has(k)) continue; seen.add(k); push({ kind: 'routine', at, title: r.title, dept: r.dept, agent: r.agent, r, hourly: true }); } }
      else for (const at of occ) push({ kind: 'routine', at, title: r.title, dept: r.dept, agent: r.agent, r });
    }
    if (focusOn) for (const f of focus) { const at = new Date(f.date + 'T' + f.start + ':00').getTime(); if (at < from || at >= to || !matches(f.title + ' ' + (f.desc || ''))) continue; (by[f.date] ||= []).push({ kind: 'focus', at, title: f.title, dept: 'focus', f }); }
    if (gcalOn) for (const g of gcalEv) { // an all-day event sits on every day it covers; a timed one on the day it starts
      if (g.start >= to || g.end <= from || !matches(g.title + ' ' + (g.location || ''))) continue;
      if (g.allDay) for (let d = startOfDay(Math.max(g.start, from)); d < Math.min(g.end, to); d = addDays(d, 1)) (by[ymd(new Date(d))] ||= []).push({ kind: 'gcal', at: d - 1, title: g.title, g });
      else (by[ymd(new Date(g.start))] ||= []).push({ kind: 'gcal', at: g.start, title: g.title, g });
    }
    for (const k in by) by[k].sort((a, b) => a.at - b.at);
    return by;
  }

  /* ---------- drawing ---------- */
  const av = (id) => { const a = agentOf(id); const c = a ? DEPTS[a.dept].chip : '#ccc'; return `<i class="cv-av" style="border-color:${c};background:${c}55" title="${esc(a ? a.name : id)}">${esc(a ? a.name[0] : '?')}</i>`; };
  const statusTag = s => /needs/.test(s) ? '<b class="pst need">NEEDS YOU</b>' : /not drafted/.test(s) ? '<b class="pst">PLANNED</b>' : /built|drafted/.test(s) ? '<b class="pst ok">READY</b>' : /scheduled|posted/.test(s) ? '<b class="pst ok">SCHEDULED</b>' : '<b class="pst">PLANNED</b>';
  function postHTML(ev) { // a post: when, where, what, and whether it is ready
    const p = ev.p;
    const dn = !!doneKeys[postKey(p)];
    return `<div class="cv-ev post${dn ? ' done' : ''}" data-ev="p:${posts.indexOf(p)}" style="--chip:${platColour(p)}" title="${esc(p.where + ' · ' + p.format + ' · ' + p.idea)}">
      <div class="cv-ev-t">${p.time ? `<span class="cv-pt">${esc(p.time)}${p.timeAssumed ? '*' : ''}</span> ` : ''}${esc(p.where)}</div>
      <div class="cv-ev-i">${esc(p.format)}${p.idea ? ' · ' + esc(p.idea) : ''}</div>
      <div class="cv-ev-m">${statusTag(p.status)}${ckHTML('p:' + posts.indexOf(p), dn)}</div></div>`;
  }
  function focusHTML(ev) {
    const f = ev.f, i = focus.indexOf(f), dn = !!doneKeys[focusKey(f)];
    return `<div class="cv-ev focus${f.kind === 'block' ? ' block' : ''}${dn ? ' done' : ''}" data-ev="f:${i}" title="${esc(f.title)}"><div class="cv-ev-t"><span class="cv-rt">${f.kind === 'block' ? '▣' : '◔'}</span>${esc(f.title)}</div><div class="cv-ev-m"><span>${esc(f.start)}–${esc(f.end)}</span>${f.kind === 'block' ? '' : ckHTML('f:' + i, dn)}</div></div>`;
  }
  function gcalHTML(ev) { // read-only: the event lives in Google Calendar, so it has no ticks or buttons here
    const g = ev.g, tm = t => hm(t);
    return `<div class="cv-ev gcal${g.allDay ? ' all' : ''}${g.free ? ' free' : ''}" data-ev="g:" style="--chip:${esc(g.colour || '#4285F4')}" title="${esc(g.title)} · ${esc(g.cal)}${g.allDay ? ' · all day' : ' · ' + tm(g.start) + '–' + tm(g.end)}${g.location ? ' · ' + esc(g.location) : ''}"><div class="cv-ev-t">${esc(g.title)}</div><div class="cv-ev-m"><span>${g.allDay ? 'all day' : tm(g.start) + '–' + tm(g.end)}</span><span class="cv-gc">${esc(g.cal)}</span></div></div>`;
  }
  function cardHTML(ev) {
    if (ev.kind === 'gcal') return gcalHTML(ev);
    if (ev.kind === 'focus') return focusHTML(ev);
    if (ev.kind === 'post') return postHTML(ev);
    const chip = DEPTS[ev.dept].chip, a = agentOf(ev.agent);
    const time = ev.kind === 'routine' ? (ev.hourly ? describe(ev.r.when).replace(/ · from .*$/, '') : hm(ev.at)) : ev.kind === 'done' ? `done ${hm(ev.at)}` : ev.kind === 'sched' ? `${hm(ev.at)} · scheduled` : ev.kind === 'doing' ? 'in progress' : ev.kind === 'waiting' ? 'waiting for your OK' : 'in the backlog';
    const id = ev.t ? `t:${ev.t.id}` : `r:${ev.r.id}:${ev.at}`;
    return `<div class="cv-ev ${ev.kind}${ev.t?.team?.members?.length ? ' team' : ''}" data-ev="${id}" style="--chip:${chip}" title="${esc(ev.title)} · ${esc(a ? a.name : '')}">
      <div class="cv-ev-t">${ev.kind === 'routine' ? '<span class="cv-rt">⏱</span>' : ev.kind === 'done' ? '<span class="cv-tick">✓</span>' : ev.kind === 'sched' ? '<span class="cv-rt">◷</span>' : ev.t?.team?.members?.length ? '<span class="cv-rt">⚑</span>' : ''}${esc(ev.title)}</div>
      <div class="cv-ev-m"><span>${esc(time)}</span>${av(ev.agent)}</div></div>`;
  }
  function render() {
    const { from, to, days } = range();
    const by = events(from, to), today = ymd(new Date()), social = view !== 'month' && !socialOnly ? postEvents(from, to) : {};
    const a = new Date(anchor);
    E.title.innerHTML = view === 'day' ? `${DOW_LONG[(a.getDay() + 6) % 7]} ${a.getDate()} ${MONTHS[a.getMonth()]} <small>${a.getFullYear()}</small>` : view === 'month' ? `${MONTHS[a.getMonth()]} <small>${a.getFullYear()}</small>` : (() => { const s = new Date(from), e = new Date(addDays(to, -1)); return `${s.getDate()}–${e.getDate()} ${s.getMonth() === e.getMonth() ? MONTHS[e.getMonth()] : MONTHS[s.getMonth()].slice(0, 3) + ' – ' + e.getDate() + ' ' + MONTHS[e.getMonth()]} <small>${e.getFullYear()}</small>`; })();
    E.seg.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === view));
    E.dow.innerHTML = view === 'day' ? `<div>${DOW[(a.getDay() + 6) % 7]}</div>` : DOW.map(d => `<div>${d}</div>`).join(''); E.dow.classList.toggle('day', view === 'day');
    E.grid.className = 'cv-grid ' + view; E.grid.style.setProperty('--rows', days / 7);
    let html = '', nDone = 0, nSched = 0, nRt = 0, nPost = 0, nNeed = 0, nPlan = 0;
    ov.classList.toggle('social', socialOnly);
    for (let i = 0; i < days; i++) {
      const ts = addDays(from, i), d = new Date(ts), k = ymd(d), list = by[k] || [], dow = (d.getDay() + 6) % 7;
      const dayPosts = view !== 'month' && !socialOnly ? (social[k] || []) : []; // Wesley, 3 Nov: DAY and WEEK show the day's social posts under a line
      const out = view === 'month' && d.getMonth() !== a.getMonth(), past = ts < startOfDay(Date.now()), max = view === 'month' && days > 35 ? 2 : MAX[view];
      for (const ev of list) { if (ev.kind === 'done') nDone++; else if (ev.kind === 'sched') nSched++; else if (ev.kind === 'routine') nRt++; else if (ev.kind === 'post') { nPost++; if (/needs/.test(ev.p.status)) nNeed++; else if (/not drafted/.test(ev.p.status)) nPlan++; } }
      html += `<div class="cv-day${k === today ? ' today' : ''}${out ? ' out' : ''}${past ? ' past' : ''}${dow >= 5 ? ' wknd' : ''}" data-day="${k}">
        <button class="cv-add" title="schedule something on ${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}">+</button>
        <div class="cv-evs">${list.slice(0, max).map(cardHTML).join('')}${list.length > max ? `<button class="cv-more" data-day="${k}">${list.length - max} more</button>` : ''}${dayPosts.length ? `<div class="cv-split"><span>SOCIAL</span></div>${dayPosts.map(postHTML).join('')}` : ''}</div>
        <div class="cv-num"${view === 'day' ? '' : ` data-dayview="${k}" title="Open ${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)} as a day"`}>${view !== 'month' ? `<span>${DOW[dow]}</span>` : ''}${d.getDate() === 1 && view === 'month' ? `<span>${MONTHS[d.getMonth()].slice(0, 3)}</span>` : ''}<b>${pad(d.getDate())}</b></div></div>`;
    }
    E.grid.innerHTML = html;
    E.stats.innerHTML = socialOnly ? `<span><b>${nPost}</b> ${nPost === 1 ? 'post' : 'posts'}</span><span><b>${nNeed}</b> need you</span><span><b>${nPlan}</b> not drafted</span>`
      : `<span><b>${nRt}</b> routine ${nRt === 1 ? 'run' : 'runs'}</span><span><b>${nSched}</b> scheduled</span><span><b>${nDone}</b> done</span>`;
    renderRail(); renderChips();
  }
  /* ---------- the left rail: today's to-dos (routines live on the grid itself) ---------- */
  let aiosItems = [];
  async function loadToday() { if (!isLive()) return; try { const r = await fetch('/api/matrix'); const j = await r.json(); aiosItems = (j.items || []).filter(i => i.state === 'open'); } catch { /* the rail still shows posts and approvals */ } if (openNow) renderRail(); }
  function renderRail() {
    const todayK = ymd(new Date()), t0 = startOfDay(Date.now());
    const d = new Date(), sec = [];
    const postsToday = posts.filter(p => p.date === todayK && !/posted/.test(p.status) && !doneKeys[postKey(p)]);
    if (postsToday.length) sec.push(['POSTS TO GO OUT', postsToday.map(p => `<div class="cv-td" data-post="${posts.indexOf(p)}" style="--chip:${platColour(p)}"><b>${p.time ? esc(p.time) + (p.timeAssumed ? '*' : '') : 'any time'}</b> ${esc(p.where)} · ${esc(p.format)} ${statusTag(p.status)}</div>`)]);
    const waiting = tasks.filter(t => !t.piece && t.state === 'waiting');
    if (waiting.length) sec.push(['WAITING FOR YOUR OK', waiting.slice(0, 8).map(t => `<div class="cv-td" data-task="${esc(t.id)}" style="--chip:${DEPTS[t.dept]?.chip || '#999'}">${esc(t.title)}</div>`).concat(waiting.length > 8 ? [`<div class="cv-td-more">+${waiting.length - 8} more in the task panel</div>`] : [])]);
    const sched = tasks.filter(t => !t.piece && t.state === 'scheduled' && t.dueAt >= t0 && t.dueAt < t0 + DAY);
    if (sched.length) sec.push(['SCHEDULED TODAY', sched.map(t => `<div class="cv-td" data-task="${esc(t.id)}" style="--chip:${DEPTS[t.dept]?.chip || '#999'}"><b>${hm(t.dueAt)}</b> ${esc(t.title)}</div>`)]);
    const due = aiosItems.filter(i => i.due && i.due <= todayK).sort((a, b) => (b.due === todayK) - (a.due === todayK) || (a.q === 'do' ? 0 : 1) - (b.q === 'do' ? 0 : 1) || b.due.localeCompare(a.due)); // due today first, then the most recently overdue
    if (due.length) sec.push(['DUE OR OVERDUE (AIOS)', due.slice(0, 8).map(i => `<div class="cv-td aios" data-aios="1" style="--chip:${i.due < todayK ? '#C8553D' : '#B4830B'}">${esc(i.title)}<small>${i.due < todayK ? 'overdue since ' : 'due '}${esc(i.due.slice(5).replace('-', '/'))}</small></div>`).concat(due.length > 8 ? [`<div class="cv-td-more">+${due.length - 8} more in AIOS</div>`] : [])]);
    const n = postsToday.length + waiting.length + sched.length + due.length;
    E.railN.textContent = n;
    E.rail.innerHTML = `<div class="cv-today-d">${DOW[(d.getDay() + 6) % 7]} ${d.getDate()} ${MONTHS[d.getMonth()]}</div>` + (sec.length ? sec.map(([h, rows]) => `<div class="cv-td-h">${h}</div>${rows.join('')}`).join('') : `<div class="cv-empty">Nothing needs you today.</div>`);
  }
  function renderChips() {
    const soc = `<button class="cv-chip soc${socialOnly ? ' on' : ''}" data-tog="social" title="Show only the social media posts from the content calendar">SOCIAL ONLY</button><span class="cv-sep"></span>`;
    if (socialOnly) { E.chips.innerHTML = soc + [...Object.entries(PLAT)].map(([k, [label, c]]) => `<button class="cv-chip${platOn.has(k) ? ' on' : ''}" data-plat="${esc(k)}"><i style="background:${c}"></i>${esc(label.toUpperCase())}</button>`).join(''); return; }
    E.chips.innerHTML = soc + DEPT_KEYS.map(k => `<button class="cv-chip${deptOn.has(k) ? ' on' : ''}" data-dept="${k}"><i style="background:${DEPTS[k].chip}"></i>${DEPTS[k].short}</button>`).join('') +
      `<span class="cv-sep"></span><button class="cv-chip${gcalOn ? ' on' : ''}" data-tog="gcal" title="Your Google Calendar (read-only)"><i style="background:#4285F4"></i>GOOGLE</button><button class="cv-chip${focusOn ? ' on' : ''}" data-tog="focus"><i style="background:#E4572E"></i>FOCUS</button><button class="cv-chip${showRoutines ? ' on' : ''}" data-tog="routines"><i class="rt">⏱</i>ROUTINES</button><button class="cv-chip${showDone ? ' on' : ''}" data-tog="done"><i class="tick">✓</i>DONE</button>` +
      (onlyRoutine ? `<button class="cv-chip only on" data-tog="only">ONLY THIS ROUTINE ✕</button>` : '');
  }

  /* ---------- the popovers: a day (create), an event (details), "n more" (the whole day) ---------- */
  function place(el, anchorEl) { // beside the cell, kept on screen
    const r = anchorEl.getBoundingClientRect(), W = el.offsetWidth || 360, H = el.offsetHeight || 300;
    let x = r.right + 10, y = r.top; if (x + W > innerWidth - 12) x = r.left - W - 10; if (x < 12) x = Math.max(12, Math.min(innerWidth - W - 12, r.left));
    if (y + H > innerHeight - 12) y = Math.max(12, innerHeight - H - 12);
    el.style.left = x + 'px'; el.style.top = y + 'px';
  }
  function closePop() { E.pop.hidden = true; E.pop.innerHTML = ''; popKind = null; ov.querySelectorAll('.cv-day.sel').forEach(n => n.classList.remove('sel')); }
  function openCreate(dayKey, cell) {
    closePop(); popKind = 'create'; cell.classList.add('sel');
    if (currentDept && DEPT_KEYS.includes(currentDept())) lastDept = currentDept(); // the popover opens on the bar's department
    const d = new Date(dayKey + 'T00:00:00'), past = d.getTime() < startOfDay(Date.now());
    E.pop.innerHTML = `<div class="cv-pop-h"><span class="lab">SCHEDULE FOR</span><b>${DOW[(d.getDay() + 6) % 7]} ${d.getDate()} ${MONTHS[d.getMonth()]}</b><span class="sp"></span><button class="cv-x" data-act="close">✕</button></div>
      ${past ? '<div class="cv-note">That day has passed — pick today or a day after it.</div>' : ''}
      <div class="cv-row"><select class="cv-dept">${DEPT_KEYS.map(k => `<option value="${k}"${k === lastDept ? ' selected' : ''}>${DEPTS[k].name}</option>`).join('')}</select><input type="time" class="cv-time" value="09:00"><select class="cv-model" title="which model runs it"><option value="">${esc(modelName(officeModel()).toUpperCase())}</option>${MODEL_KEYS.filter(k => k !== officeModel()).map(k => `<option value="${k}">${esc(modelName(k).toUpperCase())}</option>`).join('')}</select></div>
      <textarea class="cv-text" rows="3" placeholder="What should happen that day?"></textarea>
      <div class="cv-row"><button class="cv-rep" data-act="rep">REPEAT</button><select class="cv-cad" hidden>${CADENCES.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select><label class="cv-ok" hidden><input type="checkbox" class="cv-okc" checked> needs my OK</label><span class="sp"></span><button class="cv-go" data-act="go"${past ? ' disabled' : ''}>ADD</button></div>
      <div class="cv-hint">${past ? '' : 'A task for this day — it runs at that time and lands in the panel. REPEAT makes it a routine from this date.'}</div>`;
    E.pop.hidden = false; place(E.pop, cell);
    const P = { dept: E.pop.querySelector('.cv-dept'), time: E.pop.querySelector('.cv-time'), model: E.pop.querySelector('.cv-model'), text: E.pop.querySelector('.cv-text'), rep: E.pop.querySelector('.cv-rep'), cad: E.pop.querySelector('.cv-cad'), ok: E.pop.querySelector('.cv-ok'), okc: E.pop.querySelector('.cv-okc'), go: E.pop.querySelector('.cv-go'), hint: E.pop.querySelector('.cv-hint') };
    let repeat = false;
    const hint = () => {
      if (past) return;
      const k = P.dept.value; lastDept = k;
      if (repeat) { const w = fromPicker(P.cad.value, P.time.value, dayKey); const first = occurrences(w, Date.now(), Date.now() + 400 * DAY, 1)[0]; P.hint.innerHTML = RT_DEPTS.includes(k) ? `Routine · <b>${esc(describe(w))}</b> · first run ${esc(first ? new Date(first).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' }) + ' ' + hm(first) : '—')}${isLive() ? ' · Claude names the agent' : ''}` : `<span class="amber">${esc(rtRefuse(k))}</span>`; P.go.disabled = !RT_DEPTS.includes(k); }
      else { P.hint.innerHTML = `Task for <b>${DOW[(d.getDay() + 6) % 7]} ${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)} · ${esc(P.time.value)}</b>${isLive() ? ' · Claude names the agent now, runs it then' : ''}`; P.go.disabled = false; }
    };
    P.rep.addEventListener('click', () => { repeat = !repeat; P.rep.classList.toggle('on', repeat); P.cad.hidden = !repeat; P.ok.hidden = !repeat; if (repeat) { const dow = (d.getDay() + 6) % 7; P.cad.value = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'][dow]; } hint(); });
    [P.dept, P.time, P.cad, P.model].forEach(el => { el.addEventListener('change', hint); el.addEventListener('keydown', e => e.stopPropagation()); });
    P.text.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); go(); } else if (e.key === 'Escape') closePop(); });
    P.go.addEventListener('click', go);
    hint(); P.text.focus();
    async function go() {
      const text = P.text.value.trim().replace(/[.!]+$/, ''); if (!text) { P.text.focus(); return; }
      const k = P.dept.value, model = P.model.value || undefined;
      P.go.disabled = true; P.hint.innerHTML = isLive() ? 'Claude is naming the agent…' : 'Adding…';
      let r;
      if (repeat) r = await createRoutine({ dept: k, text, when: fromPicker(P.cad.value, P.time.value, dayKey), needsOk: P.okc.checked, model });
      else r = await create({ dept: k, text, at: new Date(`${dayKey}T${P.time.value || '09:00'}:00`).getTime(), model });
      if (!r || !r.ok) { P.hint.innerHTML = `<span class="amber">${esc((r && r.error) || 'Could not add it.')}</span>`; P.go.disabled = false; return; }
      closePop(); render();
      const el = E.grid.querySelector(`.cv-ev[data-ev="${repeat ? 'r:' + r.routine.id + ':' : 't:' + r.task.id}"], .cv-ev[data-ev^="${repeat ? 'r:' + r.routine.id + ':' : 't:' + r.task.id}"]`);
      if (el) { el.classList.add('new'); el.scrollIntoView({ block: 'nearest' }); }
    }
  }
  function openPost(i, el) {
    const p = posts[i]; if (!p) return; closePop(); popKind = 'event';
    const d = new Date(p.date + 'T00:00:00');
    E.pop.innerHTML = `<div class="cv-pop-h"><span class="lab" style="color:${platColour(p)}">${esc(p.where.toUpperCase())}</span><span class="sp"></span><button class="cv-x" data-act="close">✕</button></div>
      <div class="cv-pop-t">${esc(p.format)}</div>
      <div class="cv-pop-m">${DOW[(d.getDay() + 6) % 7]} ${d.getDate()} ${MONTHS[d.getMonth()]}${p.time ? ' · ' + esc(p.time) + (p.timeAssumed ? ' (time assumed)' : '') : ' · any time'} · ${statusTag(p.status)}${p.owner ? ' · ' + esc(p.owner) : ''}</div>
      ${p.idea ? `<div class="cv-pop-p">${esc(p.idea)}</div>` : ''}
      ${p.core ? `<div class="cv-pop-p" style="opacity:.7">Core idea of the week: ${esc(p.core)}</div>` : ''}
      <div class="cv-row">${p.folder ? '<button class="cv-btn" data-act="folder">OPEN THE POST FOLDER</button>' : '<span class="cv-hint">No folder yet: the Tuesday build files it.</span>'}</div>`;
    E.pop.hidden = false; place(E.pop, el);
    E.pop.querySelector('[data-act="folder"]')?.addEventListener('click', async e => { const b = e.currentTarget; try { const r = await fetch('/api/open', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: p.folder }) }); b.textContent = r.ok ? 'OPENED' : 'COULD NOT OPEN'; } catch { b.textContent = 'COULD NOT OPEN'; } });
  }
  function openFocus(i, el) {
    const f = focus[i]; if (!f) return; closePop(); popKind = 'event';
    const d = new Date(f.date + 'T00:00:00');
    E.pop.innerHTML = `<div class="cv-pop-h"><span class="lab" style="color:#E4572E">${f.kind === 'block' ? 'BLOCKED' : 'FOCUS'}</span><span class="sp"></span><button class="cv-x" data-act="close">✕</button></div>
      <div class="cv-pop-t">${esc(f.title)}</div>
      <div class="cv-pop-m">${DOW[(d.getDay() + 6) % 7]} ${d.getDate()} ${MONTHS[d.getMonth()]} · ${esc(f.start)}–${esc(f.end)}</div>
      <div class="cv-pop-p">${esc(f.desc || '').replace(/\n/g, '<br>')}</div>`;
    E.pop.hidden = false; place(E.pop, el);
  }
  function openEvent(id, el) {
    if (id.startsWith('g:')) return; // a Google event: its details are in the card's tooltip, and it is changed in Google Calendar
    if (id.startsWith('f:')) return openFocus(+id.slice(2), el);
    if (id.startsWith('p:')) return openPost(+id.slice(2), el);
    closePop();
    const [kind, ...rest] = id.split(':');
    if (kind === 't') {
      const t = tasks.find(x => String(x.id) === rest[0]); if (!t) return;
      if (t.state === 'done') { close(); openAgent(t.agent, 'chat'); return; } // the deliverable lives in the agent's chat
      const a = agentOf(t.agent);
      popKind = 'event';
      E.pop.innerHTML = `<div class="cv-pop-h"><span class="lab">${t.state === 'scheduled' ? 'SCHEDULED TASK' : t.state.toUpperCase()}</span><span class="sp"></span><button class="cv-x" data-act="close">✕</button></div>
        <div class="cv-pop-t">${esc(t.title)}</div>
        <div class="cv-pop-m">${av(t.agent)} ${esc(a ? a.name : '')} · ${esc(DEPTS[t.dept].name)}${t.state === 'scheduled' ? ` · runs ${esc(untilText(t.dueAt))} (${hm(t.dueAt)})` : ''}${t.modelUsed ? ' · ' + esc(modelName(t.modelUsed)) : ''}</div>
        ${t.text && t.text !== t.title ? `<div class="cv-pop-p">${esc(t.text)}</div>` : ''}
        <div class="cv-row"><button class="cv-btn" data-act="open">OPEN THE AGENT</button>${t.state === 'scheduled' ? '<button class="cv-btn warn" data-act="cancel">CANCEL IT</button>' : ''}</div>`;
      E.pop.hidden = false; place(E.pop, el);
      E.pop.querySelector('[data-act="open"]').addEventListener('click', () => { close(); openAgent(t.agent, 'chat'); });
      E.pop.querySelector('[data-act="cancel"]')?.addEventListener('click', async () => { await cancelTask(t); closePop(); render(); });
      return;
    }
    const r = routines.find(x => x.id === rest[0]); if (!r) return;
    const a = agentOf(r.agent), at = +rest[1];
    popKind = 'event';
    E.pop.innerHTML = `<div class="cv-pop-h"><span class="lab">ROUTINE</span><span class="sp"></span><button class="cv-x" data-act="close">✕</button></div>
      <div class="cv-pop-t">${esc(r.title)}</div>
      <div class="cv-pop-m">${av(r.agent)} ${esc(a ? a.name : r.agent)} · ${esc(r.desc || describe(r.when))}${r.needsOk ? ' · waits for your OK' : ' · read-only'}${r.paused ? ' · <span class="cv-paused">PAUSED</span>' : ''}</div>
      <div class="cv-pop-p">This run: ${esc(new Date(at).toLocaleString([], { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }))}${r.nextAt ? ` · next ${esc(untilText(r.nextAt))}` : ''}${r.lastAt ? ` · last ran ${esc(new Date(r.lastAt).toLocaleDateString([], { day: 'numeric', month: 'short' }))}` : ''}</div>
      <div class="cv-row"><button class="cv-btn" data-act="run">RUN NOW</button><button class="cv-btn" data-act="${r.paused ? 'resume' : 'pause'}">${r.paused ? 'RESUME' : 'PAUSE'}</button><button class="cv-btn" data-act="only">ONLY THIS</button><span class="sp"></span><button class="cv-btn warn" data-act="delete">DELETE</button></div>`;
    E.pop.hidden = false; place(E.pop, el);
    E.pop.querySelectorAll('.cv-btn').forEach(b => b.addEventListener('click', async () => {
      const act = b.dataset.act;
      if (act === 'only') { onlyRoutine = r.id; closePop(); render(); return; }
      await rtAct(r.id, act); closePop(); render();
    }));
  }
  function openMore(dayKey, cell) {
    closePop(); popKind = 'more';
    const { from, to } = range(); const list = events(from, to)[dayKey] || []; const d = new Date(dayKey + 'T00:00:00');
    E.pop.innerHTML = `<div class="cv-pop-h"><span class="lab">${DOW[(d.getDay() + 6) % 7].toUpperCase()} ${d.getDate()} ${MONTHS[d.getMonth()].toUpperCase()}</span><b>${list.length}</b><span class="sp"></span><button class="cv-x" data-act="close">✕</button></div><div class="cv-pop-list">${list.map(cardHTML).join('')}</div>`;
    E.pop.hidden = false; place(E.pop, cell);
  }

  /* ---------- wiring ---------- */
  ov.addEventListener('click', e => {
    const x = e.target.closest('[data-act="close"], .cv-x'); if (x) { closePop(); return; }
    const ck = e.target.closest('.cv-ck'); if (ck) { e.stopPropagation(); tick(ck.dataset.ck); return; }
    const dv = e.target.closest('[data-dayview]'); if (dv) { anchor = startOfDay(new Date(dv.dataset.dayview + 'T12:00:00').getTime()); view = 'day'; closePop(); render(); return; } // a day's date opens it as a day
    const ev = e.target.closest('.cv-ev'); if (ev) { openEvent(ev.dataset.ev, ev); return; }
    const more = e.target.closest('.cv-more'); if (more) { openMore(more.dataset.day, more.closest('.cv-day')); return; }
    const add = e.target.closest('.cv-add'); if (add && !socialOnly) { const cell = add.closest('.cv-day'); openCreate(cell.dataset.day, cell); return; }
    const tdp = e.target.closest('.cv-td[data-post]'); if (tdp) { openPost(+tdp.dataset.post, tdp); return; }
    const tdt = e.target.closest('.cv-td[data-task]'); if (tdt) { const t = tasks.find(x => String(x.id) === tdt.dataset.task); if (t) { close(); openAgent(t.agent, 'chat'); } return; }
    if (e.target.closest('.cv-td[data-aios]')) { window.open('/aios', '_blank', 'noopener'); return; }
    const chip = e.target.closest('.cv-chip'); if (chip) {
      if (chip.dataset.tog === 'social') { socialOnly = !socialOnly; closePop(); if (socialOnly) { view = 'week'; loadPosts(true); } render(); return; }
      if (chip.dataset.plat) { const k = chip.dataset.plat, all = Object.keys(PLAT).concat('Other'); if (platOn.size === all.length) platOn = new Set([k]); else if (platOn.has(k)) { platOn.delete(k); if (!platOn.size) platOn = new Set(all); } else platOn.add(k); render(); return; }
      if (chip.dataset.dept) { const k = chip.dataset.dept; if (deptOn.size === DEPT_KEYS.length) { deptOn = new Set([k]); } else if (deptOn.has(k)) { deptOn.delete(k); if (!deptOn.size) deptOn = new Set(DEPT_KEYS); } else deptOn.add(k); }
      else if (chip.dataset.tog === 'focus') focusOn = !focusOn; else if (chip.dataset.tog === 'gcal') gcalOn = !gcalOn; else if (chip.dataset.tog === 'routines') showRoutines = !showRoutines; else if (chip.dataset.tog === 'done') showDone = !showDone; else if (chip.dataset.tog === 'only') onlyRoutine = null;
      render(); return;
    }
    const day = e.target.closest('.cv-day'); if (day && !socialOnly && !E.pop.contains(e.target)) { if (e.target === day || e.target.classList.contains('cv-evs') || e.target.closest('.cv-num')) { openCreate(day.dataset.day, day); return; } }
    if (!E.pop.contains(e.target) && !E.pop.hidden) closePop();
  });
  E.seg.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; view = b.dataset.v; closePop(); render(); });
  $('#cvPrev').addEventListener('click', () => { step(-1); }); $('#cvNext').addEventListener('click', () => { step(1); });
  $('#cvToday').addEventListener('click', () => { anchor = startOfDay(Date.now()); closePop(); render(); });
  $('#cvClose').addEventListener('click', () => close());
  E.search.addEventListener('input', () => { q = E.search.value.trim().toLowerCase(); render(); });
  E.search.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Escape') { E.search.value = ''; q = ''; E.search.blur(); render(); } });
  function step(n) { const d = new Date(anchor); if (view === 'day') d.setDate(d.getDate() + n); else if (view === 'week') d.setDate(d.getDate() + 7 * n); else { d.setDate(1); d.setMonth(d.getMonth() + n); } anchor = d.getTime(); closePop(); render(); }
  ov.addEventListener('keydown', e => { if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return; if (e.key === 'ArrowLeft') step(-1); else if (e.key === 'ArrowRight') step(1); else if (e.key === 't' || e.key === 'T') { anchor = startOfDay(Date.now()); render(); } else if (e.key === 'w' || e.key === 'W') { view = 'week'; render(); } else if (e.key === 'm' || e.key === 'M') { view = 'month'; render(); } });

  let timer = null;
  function open() { if (openNow) return; openNow = true; E.co.textContent = business ? business() : ''; ov.classList.add('on'); document.body.classList.add('calOpen'); render(); loadPosts(); loadFocus(); loadGcal(); loadDone(); loadToday(); ov.tabIndex = -1; ov.focus(); timer = setInterval(() => { loadToday(); loadPosts(); if (!socialOnly && view === 'month' && E.pop.hidden) render(); }, 30000); }
  function close() { if (!openNow) return; openNow = false; closePop(); ov.classList.remove('on'); document.body.classList.remove('calOpen'); clearInterval(timer); timer = null; }
  function toggle() { openNow ? close() : open(); }
  return { open, close, toggle, isOpen: () => openNow, refresh: () => { if (openNow && E.pop.hidden) render(); }, popOpen: () => !E.pop.hidden, closePop, get view() { return view; }, set view(v) { view = v; render(); } };
}
