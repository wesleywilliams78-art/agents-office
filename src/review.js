// V3.9 REVIEW — the owner reads every finished task in a pop-up over the office, not in the side chat.
// A task lands here when the agent is done (state 'waiting' on the server). APPROVE marks it done (or, for a
// task that sends, posts or pays, carries out that step). REJECT opens a second screen, "Reason for rejection";
// the reason goes back to the agent, which reworks the task and learns from it (learn.mjs keeps it as a
// standing rule or a one-off). The same reader opens any delivered file from the chat, read-only.
import { DEPTS } from './data.js';
import { linkify, wireLinks } from './links.js';

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
#rv .rv-foot .rv-hint { font: 11.5px/1.4 var(--ui); color: var(--grey); flex: 1 1 0; min-width: 0; max-width: 300px; margin-right: auto; }
#rv .rv-foot .rv-btns { display: flex; gap: 10px; align-items: center; flex-wrap: nowrap; }
#rv .rv-foot .rv-btn { white-space: nowrap; }
body.dark #rv .rv-foot .rv-hint { color: #A3A29C; }
#rv .rv-foot .rv-wait { font: 600 11.5px/1.4 var(--ui); color: #C8553D; flex: 1 1 0; min-width: 0; max-width: 300px; margin-right: auto; } #rv .rv-wait:not([hidden]) + .rv-hint { display: none; }
#rv .rv-btn { font: 700 11px/1 var(--ui); letter-spacing: .12em; padding: 11px 18px; border-radius: 99px; cursor: pointer; border: 1px solid var(--hairline); background: none; color: inherit; }
#rv .rv-btn:disabled { opacity: .4; cursor: default; }
#rv .rv-copy { padding: 11px 16px; }
#rv .rv-copy.ok { border-color: #1E9070; color: #1E9070; }
body.dark #rv .rv-copy.ok { border-color: #5BC9A6; color: #5BC9A6; }
#rv .rv-box, #rv .rv-box * { -webkit-user-select: text; user-select: text; } /* the answer can always be selected and copied */
#rv .rv-btn, #rv .rv-x, #rv .rv-ex button { -webkit-user-select: none; user-select: none; }
#rv .rv-next { padding: 10px 18px 12px; border-top: 1px solid var(--hairline); font: 12px/1.45 var(--ui); }
#rv .rv-nx-h { font: 700 10px/1 var(--ui); letter-spacing: .14em; color: var(--grey); margin-bottom: 5px; }
#rv .rv-nx-s { margin-bottom: 8px; } #rv .rv-nx-b { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; } #rv .rv-nx-m { margin-top: 6px; color: var(--grey); }
#rv .rv-pick { font: 12px var(--ui); padding: 9px 10px; border-radius: 99px; border: 1px solid var(--hairline); background: none; color: inherit; max-width: 230px; }
#rv .rv-next .rv-btn { padding: 9px 14px; }
#rv .rv-yes { background: #1E9070; border-color: #1E9070; color: #fff; }
#rv .rv-no { border-color: #C8553D; color: #C8553D; }
body.dark #rv .rv-no { border-color: #E27A63; color: #E27A63; }
#rv .rv-send { background: #C8553D; border-color: #C8553D; color: #fff; }
#rv .rv-ans { border-color: #3B7DD8; color: #3B7DD8; }
body.dark #rv .rv-ans { border-color: #7FB0F0; color: #7FB0F0; }
#rv.ans .rv-send { background: #3B7DD8; border-color: #3B7DD8; }
#rv.ans .rv-reason textarea:focus { outline-color: #3B7DD8; }
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
#rv .rv-perm { position: relative; display: flex; align-items: flex-start; gap: 10px; margin: 14px 0 4px; padding: 10px 12px; border: 1px solid var(--hairline); border-radius: 8px; cursor: pointer; -webkit-user-select: none; user-select: none; }
#rv.ans .rv-perm { display: none; }
#rv .rv-perm input { position: absolute; opacity: 0; pointer-events: none; }
#rv .rv-perm-sw { flex: none; width: 30px; height: 17px; margin-top: 1px; border-radius: 99px; background: rgba(127,127,127,.35); position: relative; transition: background .15s; }
#rv .rv-perm-sw::after { content: ''; position: absolute; top: 2px; left: 2px; width: 13px; height: 13px; border-radius: 50%; background: #fff; transition: transform .15s; }
#rv .rv-perm input:checked + .rv-perm-sw { background: #C8553D; }
#rv .rv-perm input:checked + .rv-perm-sw::after { transform: translateX(13px); }
#rv .rv-perm input:focus-visible + .rv-perm-sw { outline: 2px solid #C8553D; outline-offset: 2px; }
#rv .rv-perm-t { display: flex; flex-direction: column; gap: 3px; font: 12.5px/1.45 var(--ui); }
#rv .rv-perm-t span { color: var(--grey); }
body.dark #rv .rv-perm-t span { color: #A3A29C; }
#rv.perm .rv-perm { border-color: #C8553D; }
#rv .rv-dec { max-width: 72ch; margin-top: 1.4em; padding-top: 1em; border-top: 1px solid var(--hairline); }
#rv .rv-dec-h { font: 700 10px/1.4 var(--ui); letter-spacing: .14em; color: var(--grey); margin-bottom: 10px; }
#rv .rv-d { display: flex; align-items: center; gap: 14px; padding: 10px 0; border-bottom: 1px solid var(--hairline); }
#rv .rv-dq { flex: 1 1 auto; min-width: 0; font: 14px/1.45 var(--ui); }
#rv .rv-dm { display: block; margin-top: 2px; font: 11.5px/1.4 var(--ui); color: var(--grey); }
body.dark #rv .rv-dm, body.dark #rv .rv-dec-h { color: #A3A29C; }
body.dark #rv .rv-dec, body.dark #rv .rv-d { border-color: rgba(236,234,227,.12); }
#rv .rv-sw { flex: none; display: flex; border: 1px solid var(--hairline); border-radius: 99px; overflow: hidden; }
#rv .rv-sw button { font: 700 10.5px/1 var(--ui); letter-spacing: .12em; padding: 9px 14px; border: 0; background: none; color: inherit; cursor: pointer; opacity: .55; -webkit-user-select: none; user-select: none; }
#rv .rv-sw button.on { opacity: 1; color: #fff; }
#rv .rv-sw .rv-dy.on { background: #1E9070; } #rv .rv-sw .rv-dn.on { background: #C8553D; }
#rv .rv-d.off .rv-dq { opacity: .55; }
#rv .rv-more { display: block; margin: 10px 0 0; font: 600 12px/1 var(--ui); padding: 8px 12px; border-radius: 99px; border: 1px solid var(--hairline); background: none; color: inherit; cursor: pointer; }
#rv .rv-gl { display: none; max-width: 72ch; }
#rv.folded .rv-gl { display: grid; gap: 14px; }
#rv .rv-gl-r span { display: block; font: 700 10px/1 var(--ui); letter-spacing: .14em; text-transform: uppercase; color: var(--grey); margin-bottom: 5px; }
#rv .rv-gl-r p { margin: 0; font: 15px/1.5 var(--ui); }
#rv.folded .rv-body .doc, #rv.folded .rv-meta, #rv.folded .rv-next, #rv.folded .rv-copy, #rv.folded .rv-later, #rv.folded .rv-ans { display: none; }
@media (max-width: 600px) { #rv { padding: 0; } #rv .rv-box { max-height: 100vh; height: 100%; border-radius: 0; } #rv .rv-title { font-size: 22px; } }
`;

// the agents write plain text with light markdown: headings, bullets, **bold**, rules — enough to read comfortably
function render(text, esc) {
  const inline = s => linkify(esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>'));
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

// head (optional, the AIOS): t => HTML for the header line in place of "NAME · DEPT". glance (optional): t => { reviewed, built, recommend };
// the card then opens short (those three lines, the decisions, REJECT and APPROVE) and "Show the full result" opens the rest.
export function initReview({ esc, agentOf, onApprove, onReject, onAnswer, onHandover, listAgents, head, glance }) {
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  const el = document.createElement('div'); el.id = 'rv';
  el.innerHTML = `<div class="rv-dim"></div><div class="rv-box" role="dialog" aria-modal="true" aria-labelledby="rvTitle">
    <div class="rv-head"><span class="rv-chip"></span><span class="rv-who"></span><span class="rv-kind"></span><span class="rv-q"></span><button class="rv-x" title="Close (Esc) — it stays waiting">×</button></div>
    <div class="rv-title" id="rvTitle"></div><div class="rv-meta"></div>
    <div class="rv-body"><div class="rv-gl"></div><div class="doc"></div><button class="rv-more" hidden>Show the full result</button><div class="rv-dec" hidden></div></div>
    <div class="rv-next" hidden></div>
    <div class="rv-reason"><h3>Reason for rejection</h3>
      <p>Say what is wrong and what you want instead. The agent reworks it with this and it comes back here. It also learns from it: a reason that applies every time becomes one of its standing rules.</p>
      <textarea placeholder="e.g. Too long, and the tone is too formal for this client. Lead with the price, three bullets max."></textarea>
      <div class="rv-ex"><button>Too long</button><button>Wrong tone</button><button>Missing the numbers</button><button>Not what I asked for</button></div>
      <label class="rv-perm"><input type="checkbox"><span class="rv-perm-sw" aria-hidden="true"></span><span class="rv-perm-t"><b>Permanently reject, no further action</b><span>Closes the task for good. The agent does not rework it, it is not counted against the agent, and no lesson is kept. A reason is optional.</span></span></label></div>
    <div class="rv-foot"><span class="rv-wait" hidden></span><span class="rv-hint"></span><button class="rv-btn rv-copy" title="Copy the whole answer as text">COPY</button><span class="rv-btns"></span></div></div>`;
  document.body.appendChild(el);
  wireLinks(el);
  const $ = s => el.querySelector(s);
  const ta = $('.rv-reason textarea');
  const perm = $('.rv-perm input'); // "Permanently reject, no further action"
  const permOn = () => perm.checked && !el.classList.contains('ans');
  const REJ = { h: $('.rv-reason h3').textContent, p: $('.rv-reason p').textContent, ph: ta.placeholder, chips: $('.rv-ex').innerHTML }; // the rejection wording, so ANSWER can swap it and put it back
  const ANS = { h: 'Your answer', p: 'This is not a rejection and it is not marked against the agent. Give it what it was missing: a fact, a decision, who to check with. It reworks the task with your answer and it comes back here for your review.',
    ph: 'e.g. Mary’s address is mary@example.com. Penny said she’d take this one, so cc her and say it is a follow-up.', chips: '<button>Here is the missing detail</button><button>Check with someone first</button><button>Use this instead</button><button>It is already done</button>' };
  const queue = []; // live tasks waiting for review, oldest first
  let cur = null, readOnly = null, busy = false;

  function paint() {
    const t = readOnly || cur; if (!t) return close();
    const a = agentOf(t.agent) || { name: t.agent, dept: t.dept };
    const d = DEPTS[a.dept || t.dept] || {};
    $('.rv-chip').style.background = d.chip || '#999';
    if (head) $('.rv-who').innerHTML = head(t); else $('.rv-who').textContent = `${a.name} · ${d.name || ''}`;
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
    if (glance) {
      const g = !readOnly && glance(t); if (!g) el.classList.remove('folded');
      $('.rv-gl').innerHTML = !g ? '' : [['Reviewed', g.reviewed], ['Built', g.built], ['Recommend', g.recommend]].filter(x => x[1]).map(([k, v]) => `<div class="rv-gl-r"><span>${k}</span><p>${linkify(esc(v))}</p></div>`).join('');
      $('.rv-more').hidden = !el.classList.contains('folded');
    }
    paintDec(t);
    paintNext(t);
    const btns = $('.rv-btns');
    if (readOnly) { $('.rv-hint').textContent = ''; btns.innerHTML = '<button class="rv-btn rv-close">CLOSE</button>'; }
    else if (el.classList.contains('rej')) {
      const ans = el.classList.contains('ans'), w = ans ? ANS : REJ;
      $('.rv-reason h3').textContent = w.h; $('.rv-reason p').textContent = w.p; ta.placeholder = w.ph; $('.rv-ex').innerHTML = w.chips;
      const pm = permOn(); el.classList.toggle('perm', pm);
      $('.rv-hint').textContent = ans ? 'Ctrl+Enter to send your answer.' : pm ? 'Ctrl+Enter to close it. Nothing goes back to the agent.' : 'Ctrl+Enter to send it back.';
      btns.innerHTML = '<button class="rv-btn rv-back">BACK</button> <button class="rv-btn rv-send" disabled>' + (ans ? 'SEND ANSWER TO ' + esc(a.name) : pm ? 'REJECT & CLOSE' : 'SEND BACK TO ' + esc(a.name)) + '</button>';
      syncSend();
    } else {
      const nd = decs(t).length, nx = decs(t).filter(d => [d.brain, d.skill].some(x => Array.isArray(x) && x.length)).length; // a yes that makes its own change (a Brain fix, a skill edit) is not a task
      $('.rv-hint').textContent = nd ? `${nd} decision${nd > 1 ? 's' : ''} at the end, set to the recommendation. Approving ${nx === nd ? 'makes the change for each Yes' : nx ? 'makes the change or starts the task for each Yes' : 'starts a task for each Yes'}; each No is recorded${decs(t).some(d => Array.isArray(d.skill) && d.skill.length) ? ' (a No to a skill edit is never offered again)' : ' and dropped'}.` : email ? 'Approving puts this email in your Gmail drafts, exactly as written. You send it from your inbox; the office never sends email.' : t.needsOk ? 'Approving sends it exactly as written. Reject to say what to change.' : 'Approve to mark it done and save it to your brain. Reject to say what is wrong.';
      btns.innerHTML = `<button class="rv-btn rv-later">LATER</button> <button class="rv-btn rv-ans" title="Not approving or rejecting: give the agent the context it was missing">ANSWER</button> <button class="rv-btn rv-no">REJECT</button> <button class="rv-btn rv-yes">${yesLabel(t, email)}</button>`;
    }
  }
  // Decisions (7 Nov 2026): each one the agent put to the owner is a Yes/No switch, preset to its recommendation. APPROVE sends the switches.
  const picks = {}; // sid → { n: true | false }
  const decs = t => (!readOnly && t && t.sid && Array.isArray(t.decisions)) ? t.decisions.filter(d => d.ok) : [];
  const pickOf = (t, d) => { const p = picks[t.sid] || (picks[t.sid] = {}); if (typeof p[d.n] !== 'boolean') p[d.n] = d.rec === 'yes'; return p[d.n]; };
  const yesLabel = (t, email) => { const base = email ? 'APPROVE & CREATE DRAFT' : t.needsOk ? 'APPROVE & SEND' : 'APPROVE', ds = decs(t); if (!ds.length) return base; const y = ds.filter(d => pickOf(t, d)).length; return `${base} · ${y} YES · ${ds.length - y} NO`; };
  function paintDec(t) {
    const box = $('.rv-dec'), all = (!readOnly && t && Array.isArray(t.decisions)) ? t.decisions : [];
    if (!all.length || el.classList.contains('rej')) { box.hidden = true; box.innerHTML = ''; return; }
    box.hidden = false;
    const direct = d => [d.brain, d.skill].some(x => Array.isArray(x) && x.length), live = all.filter(d => d.ok), nd = live.filter(direct).length; // a yes that files its change itself (Brian's fixes) says so
    const how = !nd ? 'EACH YES BECOMES A TASK' : nd === live.length ? 'EACH YES IS FILED STRAIGHT AWAY' : 'EACH YES IS FILED OR BECOMES A TASK';
    box.innerHTML = `<div class="rv-dec-h">YOUR DECISIONS · ${how} WHEN YOU APPROVE</div>` + all.map(d => d.ok
      ? `<div class="rv-d" data-n="${d.n}"><div class="rv-dq"><b>${d.n}.</b> ${esc(d.ask)}<span class="rv-dm">Recommended: ${d.rec === 'yes' ? 'Yes' : 'No'} · on Yes, ${Array.isArray(d.skill) && d.skill.length ? 'the skill is changed straight away (backed up first): ' + esc(d.skill.map(s => `${s.mode} → ${s.skill}/${s.file}`).join(', ')) : Array.isArray(d.brain) && d.brain.length ? 'filed straight to the Brain: ' + esc(d.brain.map(b => `${b.mode} → ${b.note}`).join(', ')) : `${esc(d.toName)} does "${esc(d.title)}"`}</span></div><div class="rv-sw"><button class="rv-dy${pickOf(t, d) ? ' on' : ''}" data-n="${d.n}">YES</button><button class="rv-dn${pickOf(t, d) ? '' : ' on'}" data-n="${d.n}">NO</button></div></div>`
      : `<div class="rv-d off"><div class="rv-dq"><b>${d.n}.</b> ${esc(d.ask || '?')}<span class="rv-dm">Cannot run: ${esc(d.problem)}. Use ANSWER to tell the agent what you want.</span></div></div>`).join('');
  }
  function setPick(n, v) {
    const t = cur; if (!t || readOnly) return;
    const d = decs(t).find(x => String(x.n) === String(n)); if (!d) return;
    (picks[t.sid] || (picks[t.sid] = {}))[d.n] = v;
    const row = $(`.rv-d[data-n="${d.n}"]`); if (row) { row.querySelector('.rv-dy').classList.toggle('on', v); row.querySelector('.rv-dn').classList.toggle('on', !v); }
    const y = $('.rv-yes'); if (y) y.textContent = yesLabel(t, t.needsOk && t.channel === 'email');
  }
  // hand a finished result to another seat: the suggested one, one picked from the list, or the Executive Assistant to decide. Always the owner's click.
  function paintNext(t) {
    const box = $('.rv-next'); const live = t && t.sid && t.result !== undefined && (readOnly || cur) && !el.classList.contains('rej') && onHandover;
    if (!live) { box.hidden = true; return; }
    const nx = t.nextStep, seats = (listAgents ? listAgents() : []).filter(a => a && a.id !== t.agent && a.id !== t.handoffFrom);
    const sug = nx && nx.to ? seats.find(a => a.id === nx.to) : null;
    box.hidden = false;
    box.innerHTML = `<div class="rv-nx-h">HAND OVER</div>` +
      (nx ? `<div class="rv-nx-s">${sug ? 'The writer suggests <b>' + esc(sug.name) + '</b>' : 'The writer suggests ' + esc(nx.toName)} — ${esc(nx.what)}</div>` : '<div class="rv-nx-s">Nobody was suggested. Pick a seat, or let the Executive Assistant decide.</div>') +
      `<div class="rv-nx-b">${sug ? `<button class="rv-btn rv-hand" data-to="${esc(sug.id)}">HAND TO ${esc(sug.name)}</button>` : ''}<select class="rv-pick"><option value="">Choose another seat…</option>${seats.map(a => `<option value="${esc(a.id)}">${esc(a.name)}</option>`).join('')}</select><button class="rv-btn rv-go" disabled>GO</button><button class="rv-btn rv-ea" title="The Executive Assistant reads this and decides who should do what next">ASK THE EXECUTIVE ASSISTANT</button></div><div class="rv-nx-m"></div>`;
    if (t.handedTo && t.handedTo.length) $('.rv-nx-m').textContent = 'Already handed over ' + t.handedTo.length + ' time' + (t.handedTo.length > 1 ? 's' : '') + '.';
  }
  async function doHand(opts) {
    const t = readOnly || cur; if (!t || busy) return; busy = true; const m = $('.rv-nx-m'); m.textContent = 'Writing the brief…';
    box_disable(true);
    const r = await onHandover(t, opts); busy = false; box_disable(false);
    m.textContent = r && r.ok ? '✓ Handed to ' + r.agentName + ': ' + r.title + '. It starts now and comes back to you for review.' : 'Could not hand it over: ' + ((r && r.error) || 'try again');
    if (r && r.ok) { t.handedTo = [...(t.handedTo || []), r.id]; }
  }
  const box_disable = d => el.querySelectorAll('.rv-next button, .rv-next select').forEach(b => { b.disabled = d; });
  const syncSend = () => { const b = $('.rv-send'); if (b) b.disabled = busy || (!ta.value.trim() && !permOn()); };
  function show() { el.classList.add('on'); el.classList.toggle('folded', !!glance && !readOnly); paint(); }
  function close() { el.classList.remove('on', 'rej', 'ans', 'perm', 'folded'); readOnly = null; ta.value = ''; perm.checked = false; }
  const typing = () => { const a = document.activeElement; return a && (a.tagName === 'TEXTAREA' || a.tagName === 'INPUT') && !el.contains(a); };

  // a task is ready for review: queue it, and pop up unless the owner is mid-sentence or already reading one
  function push(t, { auto = true } = {}) {
    if (queue.some(x => x.sid === t.sid)) { paint(); return; }
    queue.push(t);
    if (!el.classList.contains('on') && auto && !typing()) { cur = t; readOnly = null; el.classList.remove('rej', 'ans'); show(); }
    else if (el.classList.contains('on') && !readOnly) paint();
  }
  function drop(sid) {
    const i = queue.findIndex(x => x.sid === sid); if (i < 0) return;
    queue.splice(i, 1);
    if (cur && cur.sid === sid) { cur = queue[Math.min(i, queue.length - 1)] || null; el.classList.remove('rej', 'ans', 'perm'); ta.value = ''; perm.checked = false; if (!readOnly) cur ? paint() : close(); }
    else if (!readOnly && el.classList.contains('on')) paint();
  }
  function open(pick) { // the top-bar ⚠, an agent's waiting card, the chat's APPROVE / REJECT
    const t = typeof pick === 'function' ? queue.find(pick) : pick ? queue.find(x => x.sid === pick.sid) : queue[0];
    if (!t) return false;
    cur = t; readOnly = null; el.classList.remove('rej', 'ans', 'perm'); perm.checked = false; show(); return true;
  }
  function openReject(pick) { if (!open(pick)) return false; el.classList.add('rej'); paint(); setTimeout(() => ta.focus(), 30); return true; }
  function read(doc) { readOnly = doc; el.classList.remove('rej', 'ans'); show(); } // { agent, title, content, meta, kindLabel }

  async function decide(approved) {
    if (!cur || busy) return;
    const t = cur, reason = ta.value.trim(), ans = el.classList.contains('ans'), closeIt = !approved && permOn();
    if (!approved && !reason && !closeIt) return;
    busy = true; syncSend(); const yes = $('.rv-yes'); if (yes) yes.disabled = true;
    const say = s => { const w = $('.rv-wait'); w.textContent = s || ''; w.hidden = !s; }; // a send that waits for the office, or did not go: the text stays in the box
    const ds = decs(t), chosen = ds.length ? Object.fromEntries(ds.map(d => [d.n, pickOf(t, d)])) : null;
    let res;
    try { res = approved ? await onApprove(t, chosen, say) : ans ? await onAnswer(t, reason, say) : await onReject(t, reason, closeIt, say); }
    finally { busy = false; syncSend(); const y = $('.rv-yes'); if (y) y.disabled = false; }
    if (res === false) return;
    say(''); drop(t.sid);
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

  el.addEventListener('change', e => { if (e.target.classList.contains('rv-pick')) { const g = $('.rv-go'); if (g) g.disabled = !e.target.value; } });
  el.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (b && b.classList.contains('rv-copy')) return copyAnswer(b);
    if (e.target.classList.contains('rv-dim') || (b && (b.classList.contains('rv-x') || b.classList.contains('rv-later') || b.classList.contains('rv-close')))) return close();
    if (!b) return;
    if (b.classList.contains('rv-more')) { el.classList.remove('folded'); b.hidden = true; return; }
    if (b.classList.contains('rv-dy') || b.classList.contains('rv-dn')) return setPick(b.dataset.n, b.classList.contains('rv-dy'));
    if (b.classList.contains('rv-hand')) return doHand({ to: b.dataset.to });
    if (b.classList.contains('rv-go')) { const v = $('.rv-pick').value; return v ? doHand({ to: v }) : undefined; }
    if (b.classList.contains('rv-ea')) return doHand({ ea: true });
    if (b.classList.contains('rv-yes')) return decide(true);
    if (b.classList.contains('rv-no')) { el.classList.add('rej'); el.classList.remove('ans'); paint(); setTimeout(() => ta.focus(), 30); return; }
    if (b.classList.contains('rv-ans')) { el.classList.add('rej', 'ans'); paint(); setTimeout(() => ta.focus(), 30); return; } // ANSWER shares the reason screen, worded for context instead of rejection
    if (b.classList.contains('rv-back')) { el.classList.remove('rej', 'ans'); paint(); return; }
    if (b.classList.contains('rv-send')) return decide(false);
    if (b.closest('.rv-ex')) { ta.value = (ta.value.trim() ? ta.value.trim() + ' ' : '') + b.textContent + '. '; ta.focus(); syncSend(); }
  });
  ta.addEventListener('input', syncSend);
  perm.addEventListener('change', () => { paint(); });
  document.addEventListener('keydown', e => {
    if (!el.classList.contains('on')) return;
    if (e.key === 'Escape') { e.stopPropagation(); if (el.classList.contains('rej') && !readOnly) { el.classList.remove('rej', 'ans'); paint(); } else close(); return; }
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && el.classList.contains('rej')) { e.preventDefault(); decide(false); }
    e.stopPropagation(); // the office's own shortcuts (P, W, …) stay quiet while the reader is up
  }, true);

  return { push, drop, open, openReject, read, close, count: () => queue.length, isOpen: () => el.classList.contains('on'), has: sid => queue.some(x => x.sid === sid) };
}
