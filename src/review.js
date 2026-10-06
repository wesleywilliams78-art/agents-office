// V3.9 REVIEW — the owner reads every finished task in a pop-up over the office, not in the side chat.
// A task lands here when the agent is done (state 'waiting' on the server). APPROVE marks it done (or, for a
// task that sends, posts or pays, carries out that step). REJECT opens a second screen, "Reason for rejection";
// the reason goes back to the agent, which reworks the task and learns from it (learn.mjs keeps it as a
// standing rule or a one-off). The same reader opens any delivered file from the chat, read-only.
import { DEPTS } from './data.js';

const CSS = `
#rv { position: fixed; inset: 0; z-index: 60; display: none; align-items: center; justify-content: center; padding: 24px 16px; }
#rv.on { display: flex; }
#rv .rv-dim { position: absolute; inset: 0; background: rgba(12,12,14,.55); backdrop-filter: blur(3px); }
#rv .rv-box { position: relative; width: min(860px, 100%); max-height: min(88vh, 1000px); display: flex; flex-direction: column;
  background: var(--cream); color: var(--ink); border: 1px solid var(--hairline); border-radius: 16px; box-shadow: 0 24px 80px rgba(0,0,0,.35); overflow: hidden; }
body.dark #rv .rv-box { background: #1B1C21; color: #ECEAE3; border-color: rgba(236,234,227,.14); }
#rv .rv-head { display: flex; align-items: center; gap: 10px; padding: 14px 18px 0; font: 700 10px/1 var(--ui); letter-spacing: .14em; }
#rv .rv-chip { width: 9px; height: 9px; border-radius: 3px; flex: none; }
#rv .rv-kind { padding: 4px 8px; border-radius: 99px; background: #F2B84B; color: #151414; }
#rv .rv-kind.read { background: rgba(127,127,127,.18); color: inherit; }
#rv .rv-q { margin-left: auto; color: var(--grey); font-weight: 600; }
#rv .rv-x { border: 0; background: none; color: inherit; font-size: 20px; line-height: 1; cursor: pointer; padding: 2px 4px; opacity: .6; }
#rv .rv-x:hover { opacity: 1; }
#rv .rv-title { font: 400 27px/1.15 var(--serif); padding: 10px 18px 4px; }
#rv .rv-meta { padding: 0 18px 12px; font: 12px/1.45 var(--ui); color: var(--grey); border-bottom: 1px solid var(--hairline); }
body.dark #rv .rv-meta, body.dark #rv .rv-q { color: #A3A29C; }
body.dark #rv .rv-meta, body.dark #rv .rv-foot { border-color: rgba(236,234,227,.12); }
#rv .rv-body { overflow: auto; padding: 18px 22px 22px; font: 14.5px/1.62 var(--ui); }
#rv .rv-body .doc { max-width: 72ch; }
#rv .rv-body h1, #rv .rv-body h2, #rv .rv-body h3 { font-family: var(--serif); font-weight: 400; margin: 1.1em 0 .35em; line-height: 1.2; }
#rv .rv-body h1 { font-size: 24px; } #rv .rv-body h2 { font-size: 20px; } #rv .rv-body h3 { font-size: 17px; }
#rv .rv-body p { margin: 0 0 .7em; }
#rv .rv-body ul, #rv .rv-body ol { margin: 0 0 .8em; padding-left: 1.3em; }
#rv .rv-body li { margin: .15em 0; }
#rv .rv-body hr { border: 0; border-top: 1px solid var(--hairline); margin: 1.2em 0; }
#rv .rv-body code { font: 12.5px/1.4 Menlo, Consolas, monospace; background: rgba(127,127,127,.14); padding: 1px 4px; border-radius: 4px; }
#rv .rv-foot { display: flex; align-items: center; gap: 10px; padding: 12px 18px; border-top: 1px solid var(--hairline); flex-wrap: wrap; }
#rv .rv-foot .rv-hint { font: 11.5px/1.4 var(--ui); color: var(--grey); flex: 1 1 220px; }
body.dark #rv .rv-foot .rv-hint { color: #A3A29C; }
#rv .rv-btn { font: 700 11px/1 var(--ui); letter-spacing: .12em; padding: 11px 18px; border-radius: 99px; cursor: pointer; border: 1px solid var(--hairline); background: none; color: inherit; }
#rv .rv-btn:disabled { opacity: .4; cursor: default; }
#rv .rv-copy { padding: 11px 16px; }
#rv .rv-copy.ok { border-color: #1E9070; color: #1E9070; }
body.dark #rv .rv-copy.ok { border-color: #5BC9A6; color: #5BC9A6; }
#rv .rv-box, #rv .rv-box * { -webkit-user-select: text; user-select: text; } /* the answer can always be selected and copied */
#rv .rv-btn, #rv .rv-x, #rv .rv-ex button { -webkit-user-select: none; user-select: none; }
#rv .rv-yes { background: #1E9070; border-color: #1E9070; color: #fff; }
#rv .rv-no { border-color: #C8553D; color: #C8553D; }
body.dark #rv .rv-no { border-color: #E27A63; color: #E27A63; }
#rv .rv-send { background: #C8553D; border-color: #C8553D; color: #fff; }
#rv .rv-reason { padding: 18px 22px 8px; display: none; }
#rv.rej .rv-reason { display: block; }
#rv.rej .rv-body { display: none; }
#rv .rv-reason h3 { font: 400 24px/1.2 var(--serif); margin: 0 0 4px; }
#rv .rv-reason p { font: 12.5px/1.5 var(--ui); color: var(--grey); margin: 0 0 12px; }
body.dark #rv .rv-reason p { color: #A3A29C; }
#rv .rv-reason textarea { width: 100%; min-height: 140px; resize: vertical; font: 14px/1.5 var(--ui); color: inherit; background: rgba(127,127,127,.08);
  border: 1px solid var(--hairline); border-radius: 10px; padding: 12px 14px; }
#rv .rv-reason textarea:focus { outline: 2px solid #C8553D; outline-offset: 1px; }
#rv .rv-ex { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
#rv .rv-ex button { font: 11.5px/1 var(--ui); padding: 7px 10px; border-radius: 99px; border: 1px solid var(--hairline); background: none; color: inherit; cursor: pointer; }
#rv .rv-ex button:hover { border-color: currentColor; }
@media (max-width: 600px) { #rv { padding: 0; } #rv .rv-box { max-height: 100vh; height: 100%; border-radius: 0; } #rv .rv-title { font-size: 22px; } }
`;

// the agents write plain text with light markdown: headings, bullets, **bold**, rules — enough to read comfortably
function render(text, esc) {
  const inline = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`([^`]+)`/g, '<code>$1</code>');
  const out = []; let list = null;
  const close = () => { if (list) { out.push(`</${list}>`); list = null; } };
  for (const raw of String(text || '').split(/\r?\n/)) {
    const line = raw.trimEnd();
    let m;
    if (!line.trim()) { close(); continue; }
    if ((m = /^(#{1,3})\s+(.*)$/.exec(line))) { close(); out.push(`<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`); continue; }
    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) { close(); out.push('<hr>'); continue; }
    if ((m = /^\s*[-*•]\s+(.*)$/.exec(line))) { if (list !== 'ul') { close(); out.push('<ul>'); list = 'ul'; } out.push(`<li>${inline(m[1])}</li>`); continue; }
    if ((m = /^\s*\d+[.)]\s+(.*)$/.exec(line))) { if (list !== 'ol') { close(); out.push('<ol>'); list = 'ol'; } out.push(`<li>${inline(m[1])}</li>`); continue; }
    close(); out.push(`<p>${inline(line)}</p>`);
  }
  close();
  return out.join('');
}

export function initReview({ esc, agentOf, onApprove, onReject }) {
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  const el = document.createElement('div'); el.id = 'rv';
  el.innerHTML = `<div class="rv-dim"></div><div class="rv-box" role="dialog" aria-modal="true" aria-labelledby="rvTitle">
    <div class="rv-head"><span class="rv-chip"></span><span class="rv-who"></span><span class="rv-kind"></span><span class="rv-q"></span><button class="rv-x" title="Close (Esc) — it stays waiting">×</button></div>
    <div class="rv-title" id="rvTitle"></div><div class="rv-meta"></div>
    <div class="rv-body"><div class="doc"></div></div>
    <div class="rv-reason"><h3>Reason for rejection</h3>
      <p>Say what is wrong and what you want instead. The agent reworks it with this and it comes back here. It also learns from it: a reason that applies every time becomes one of its standing rules.</p>
      <textarea placeholder="e.g. Too long, and the tone is too formal for this client. Lead with the price, three bullets max."></textarea>
      <div class="rv-ex"><button>Too long</button><button>Wrong tone</button><button>Missing the numbers</button><button>Not what I asked for</button></div></div>
    <div class="rv-foot"><span class="rv-hint"></span><button class="rv-btn rv-copy" title="Copy the whole answer as text">COPY</button><span class="rv-btns"></span></div></div>`;
  document.body.appendChild(el);
  const $ = s => el.querySelector(s);
  const ta = $('.rv-reason textarea');
  const queue = []; // live tasks waiting for review, oldest first
  let cur = null, readOnly = null, busy = false;

  function paint() {
    const t = readOnly || cur; if (!t) return close();
    const a = agentOf(t.agent) || { name: t.agent, dept: t.dept };
    const d = DEPTS[a.dept || t.dept] || {};
    $('.rv-chip').style.background = d.chip || '#999';
    $('.rv-who').textContent = `${a.name} · ${d.name || ''}`;
    const k = $('.rv-kind'); k.className = 'rv-kind' + (readOnly ? ' read' : '');
    const email = t.needsOk && t.channel === 'email';
    k.textContent = readOnly ? (t.kindLabel || 'DELIVERED') : email ? 'EMAIL · YOUR OK TO DRAFT' : t.needsOk ? 'READY TO SEND · YOUR OK' : 'FOR YOUR REVIEW';
    $('.rv-q').textContent = !readOnly && queue.length > 1 ? `${queue.indexOf(cur) + 1} OF ${queue.length}` : '';
    $('#rvTitle').textContent = t.title;
    const bits = [];
    if (t.routine) bits.push(`routine · ${t.when}`);
    if (t.revisions) bits.push(`revision ${t.revisions + 1}`);
    if (t.team?.members?.length) bits.push('team task');
    if (t.used?.length) bits.push('used ' + t.used.join(', '));
    if (t.read?.length) bits.push('read ' + t.read.slice(0, 4).join(', '));
    if (t.meta) bits.push(t.meta);
    $('.rv-meta').textContent = bits.join(' · ') || ' ';
    $('.rv-body .doc').innerHTML = render(t.content ?? t.draft ?? t.result, esc);
    $('.rv-body').scrollTop = 0;
    const btns = $('.rv-btns');
    if (readOnly) { $('.rv-hint').textContent = ''; btns.innerHTML = '<button class="rv-btn rv-close">CLOSE</button>'; }
    else if (el.classList.contains('rej')) {
      $('.rv-hint').textContent = 'Ctrl+Enter to send it back.';
      btns.innerHTML = '<button class="rv-btn rv-back">BACK</button> <button class="rv-btn rv-send" disabled>SEND BACK TO ' + esc(a.name) + '</button>';
      syncSend();
    } else {
      $('.rv-hint').textContent = email ? 'Approving puts this email in your Gmail drafts, exactly as written. You send it from your inbox; the office never sends email.' : t.needsOk ? 'Approving sends it exactly as written. Reject to say what to change.' : 'Approve to mark it done and save it to your brain. Reject to say what is wrong.';
      btns.innerHTML = `<button class="rv-btn rv-later">LATER</button> <button class="rv-btn rv-no">REJECT</button> <button class="rv-btn rv-yes">${email ? 'APPROVE & CREATE DRAFT' : t.needsOk ? 'APPROVE & SEND' : 'APPROVE'}</button>`;
    }
  }
  const syncSend = () => { const b = $('.rv-send'); if (b) b.disabled = busy || !ta.value.trim(); };
  function show() { el.classList.add('on'); paint(); }
  function close() { el.classList.remove('on', 'rej'); readOnly = null; ta.value = ''; }
  const typing = () => { const a = document.activeElement; return a && (a.tagName === 'TEXTAREA' || a.tagName === 'INPUT') && !el.contains(a); };

  // a task is ready for review: queue it, and pop up unless the owner is mid-sentence or already reading one
  function push(t, { auto = true } = {}) {
    if (queue.some(x => x.sid === t.sid)) { paint(); return; }
    queue.push(t);
    if (!el.classList.contains('on') && auto && !typing()) { cur = t; readOnly = null; el.classList.remove('rej'); show(); }
    else if (el.classList.contains('on') && !readOnly) paint();
  }
  function drop(sid) {
    const i = queue.findIndex(x => x.sid === sid); if (i < 0) return;
    queue.splice(i, 1);
    if (cur && cur.sid === sid) { cur = queue[Math.min(i, queue.length - 1)] || null; el.classList.remove('rej'); ta.value = ''; if (!readOnly) cur ? paint() : close(); }
    else if (!readOnly && el.classList.contains('on')) paint();
  }
  function open(pick) { // the top-bar ⚠, an agent's waiting card, the chat's APPROVE / REJECT
    const t = typeof pick === 'function' ? queue.find(pick) : pick ? queue.find(x => x.sid === pick.sid) : queue[0];
    if (!t) return false;
    cur = t; readOnly = null; el.classList.remove('rej'); show(); return true;
  }
  function openReject(pick) { if (!open(pick)) return false; el.classList.add('rej'); paint(); setTimeout(() => ta.focus(), 30); return true; }
  function read(doc) { readOnly = doc; el.classList.remove('rej'); show(); } // { agent, title, content, meta, kindLabel }

  async function decide(approved) {
    if (!cur || busy) return;
    const t = cur, reason = ta.value.trim();
    if (!approved && !reason) return;
    busy = true; syncSend();
    try { approved ? await onApprove(t) : await onReject(t, reason); }
    finally { busy = false; }
    drop(t.sid);
  }

  // COPY: the whole answer as the agent wrote it (plain text with light markdown), onto the clipboard
  let copyTimer = 0;
  async function copyAnswer(btn) {
    const t = readOnly || cur; if (!t) return;
    const text = String(t.content ?? t.draft ?? t.result ?? '');
    let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; }
    catch {
      const x = document.createElement('textarea'); x.value = text; x.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
      document.body.appendChild(x); x.select();
      try { ok = document.execCommand('copy'); } catch { ok = false; }
      x.remove();
    }
    btn.textContent = ok ? 'COPIED ✓' : 'COPY FAILED'; btn.classList.toggle('ok', ok);
    clearTimeout(copyTimer); copyTimer = setTimeout(() => { btn.textContent = 'COPY'; btn.classList.remove('ok'); }, 1600);
  }

  el.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (b && b.classList.contains('rv-copy')) return copyAnswer(b);
    if (e.target.classList.contains('rv-dim') || (b && (b.classList.contains('rv-x') || b.classList.contains('rv-later') || b.classList.contains('rv-close')))) return close();
    if (!b) return;
    if (b.classList.contains('rv-yes')) return decide(true);
    if (b.classList.contains('rv-no')) { el.classList.add('rej'); paint(); setTimeout(() => ta.focus(), 30); return; }
    if (b.classList.contains('rv-back')) { el.classList.remove('rej'); paint(); return; }
    if (b.classList.contains('rv-send')) return decide(false);
    if (b.closest('.rv-ex')) { ta.value = (ta.value.trim() ? ta.value.trim() + ' ' : '') + b.textContent + '. '; ta.focus(); syncSend(); }
  });
  ta.addEventListener('input', syncSend);
  document.addEventListener('keydown', e => {
    if (!el.classList.contains('on')) return;
    if (e.key === 'Escape') { e.stopPropagation(); if (el.classList.contains('rej') && !readOnly) { el.classList.remove('rej'); paint(); } else close(); return; }
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && el.classList.contains('rej')) { e.preventDefault(); decide(false); }
    e.stopPropagation(); // the office's own shortcuts (P, W, …) stay quiet while the reader is up
  }, true);

  return { push, drop, open, openReject, read, close, count: () => queue.length, isOpen: () => el.classList.contains('on'), has: sid => queue.some(x => x.sid === sid) };
}
