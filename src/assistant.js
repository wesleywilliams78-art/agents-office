// The Chief of Staff side panel: one running conversation with the office (shared with Telegram). It sits on the left, opens with A or the
// CHIEF OF STAFF button, and shows what the chief of staff is doing as it works. It is now the one place to give the office work:
//  - talk to it (it picks the desk, and sets team, model and effort only when asked);
//  - attach a file with the paperclip or by dropping it on the panel (it is read into the Brain and named in the task);
//  - or type /task <department> <text> to add a task directly, with no model call (flags: --team --model opus --effort high).
// Every task it adds shows a chip: the desk, model, effort and team, with a way to change them or undo for 20 seconds before it starts.
// Approving and posting stay on the review cards. Self-contained: it adds its own styles and markup.
// The MOTION STUDIO tab is a second conversation in the same panel, with the Motion Director (motion.mjs, /api/motion): it shows the
// contact sheets and drafts as they are made and plays the final video.
import { linkify, wireLinks } from './links.js';
import { applyAnswers, briefText, FIELDS } from './promptbrief.js';
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const CSS = `
#asst { position: fixed; left: 0; top: 56px; bottom: 0; width: min(430px, 94vw); z-index: 60; display: flex; flex-direction: column; background: var(--cream, #FDFFF8); color: var(--ink, #151414); border-right: 1px solid var(--hairline, rgba(21,20,20,.12)); box-shadow: 30px 0 80px rgba(21,20,20,.14); transform: translateX(-105%); transition: transform .28s cubic-bezier(.2,.8,.2,1); font: 13.5px/1.5 var(--ui, Inter, sans-serif); }
#asst.on { transform: none; }
a.fl, #asst .a-b a, #rv .doc a { color: #3B7DD8; text-decoration: underline; text-underline-offset: 2px; word-break: break-all; cursor: pointer; }
body.dark a.fl, body.dark #asst .a-b a, body.dark #rv .doc a { color: #7FB0F0; }
body.dark #asst { background: #171716; color: #ECEAE3; border-color: rgba(236,234,227,.12); box-shadow: 30px 0 80px rgba(0,0,0,.5); }
#asst .a-h { display: flex; align-items: center; gap: 10px; padding: 14px 16px 12px; border-bottom: 1px solid var(--hairline, rgba(21,20,20,.12)); }
body.dark #asst .a-h, body.dark #asst .a-f { border-color: rgba(236,234,227,.12); }
#asst .a-t { font: 22px/1 var(--serif, Georgia, serif); flex: 1; } #asst .a-t small { display: block; font: 10px/1.4 var(--ui, sans-serif); letter-spacing: .14em; text-transform: uppercase; opacity: .55; margin-top: 3px; }
#asst .a-h button { background: none; border: 1px solid var(--hairline, rgba(21,20,20,.2)); color: inherit; border-radius: 99px; font: 600 10px/1 var(--ui, sans-serif); letter-spacing: .1em; padding: 6px 10px; cursor: pointer; }
body.dark #asst .a-h button { border-color: rgba(236,234,227,.25); }
#asst .a-m { flex: 1; overflow-y: auto; padding: 14px 16px; display: flex; flex-direction: column; gap: 10px; }
#asst .a-b { max-width: 92%; padding: 9px 12px; border-radius: 12px; white-space: normal; word-wrap: break-word; }
#asst .a-b.u { align-self: flex-end; background: #201E1D; color: #F3F2F2; border-bottom-right-radius: 3px; }
body.dark #asst .a-b.u { background: #ECEAE3; color: #151414; }
#asst .a-b.a { align-self: flex-start; background: rgba(127,127,127,.12); border-bottom-left-radius: 3px; }
#asst .a-b.e { align-self: flex-start; background: rgba(236,48,19,.12); color: #B6240E; } body.dark #asst .a-b.e { color: #ff8a73; }
#asst .a-b p { margin: 0 0 7px; } #asst .a-b p:last-child { margin-bottom: 0; }
#asst .a-b ul, #asst .a-b ol { margin: 4px 0 7px; padding-left: 20px; } #asst .a-b code { font: 12px/1.4 ui-monospace, Consolas, monospace; background: rgba(127,127,127,.18); padding: 1px 5px; border-radius: 4px; word-break: break-all; }
#asst .a-b a { color: inherit; text-decoration: underline; }
#asst .a-s { align-self: flex-start; font-size: 11.5px; opacity: .6; font-style: italic; padding-left: 4px; } #asst .a-s i { font-style: normal; display: inline-block; animation: aPulse 1.1s infinite; } @keyframes aPulse { 50% { opacity: .25; } }
#asst .a-c { display: flex; flex-wrap: wrap; gap: 6px; padding: 0 16px 8px; } #asst .a-c button { background: none; border: 1px solid var(--hairline, rgba(21,20,20,.2)); color: inherit; border-radius: 99px; padding: 6px 11px; font: 12px/1.2 var(--ui, sans-serif); cursor: pointer; text-align: left; }
body.dark #asst .a-c button { border-color: rgba(236,234,227,.25); } #asst .a-c button:hover { background: rgba(127,127,127,.14); }
#asst .a-at { display: flex; flex-wrap: wrap; gap: 6px; padding: 0 14px 6px; } #asst .a-at:empty { display: none; }
#asst .a-at span { display: inline-flex; align-items: center; gap: 6px; background: rgba(127,127,127,.14); border-radius: 99px; padding: 4px 6px 4px 10px; font-size: 12px; max-width: 100%; } #asst .a-at span b { font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 230px; }
#asst .a-at span button { border: 0; background: rgba(127,127,127,.25); color: inherit; border-radius: 50%; width: 18px; height: 18px; line-height: 1; cursor: pointer; font-size: 11px; padding: 0; } #asst .a-at span.busy { opacity: .6; } #asst .a-at span.bad { background: rgba(236,48,19,.14); }
#asst .a-f { display: flex; gap: 8px; align-items: flex-end; padding: 10px 14px 14px; border-top: 1px solid var(--hairline, rgba(21,20,20,.12)); }
#asst textarea { flex: 1; resize: none; max-height: 140px; min-height: 40px; border: 1px solid var(--hairline, rgba(21,20,20,.25)); border-radius: 12px; padding: 10px 12px; font: 13.5px/1.4 var(--ui, sans-serif); background: transparent; color: inherit; outline: none; }
body.dark #asst textarea { border-color: rgba(236,234,227,.28); } #asst textarea:focus { border-color: #EC3013; }
#asst .a-clip { background: none; border: 1px solid var(--hairline, rgba(21,20,20,.25)); color: inherit; border-radius: 12px; height: 40px; width: 40px; font-size: 16px; cursor: pointer; flex: none; } body.dark #asst .a-clip { border-color: rgba(236,234,227,.28); }
#asst .a-go { background: #EC3013; color: #fff; border: 0; border-radius: 12px; height: 40px; padding: 0 16px; font: 700 11px/1 var(--ui, sans-serif); letter-spacing: .1em; cursor: pointer; } #asst .a-go:disabled { opacity: .45; cursor: default; }
#asst .a-drop { position: absolute; inset: 0; background: rgba(32,30,29,.78); color: #F3F2F2; display: none; align-items: center; justify-content: center; font: 22px/1.3 var(--serif, Georgia, serif); text-align: center; padding: 30px; z-index: 5; } #asst.drag .a-drop { display: flex; }
#asst .a-card { align-self: stretch; border: 1px solid var(--hairline, rgba(21,20,20,.22)); border-radius: 12px; padding: 10px 12px; background: rgba(127,127,127,.07); font-size: 12.5px; }
body.dark #asst .a-card { border-color: rgba(236,234,227,.25); }
#asst .a-card .k { font: 700 9.5px/1 var(--ui, sans-serif); letter-spacing: .14em; opacity: .55; margin-bottom: 5px; } #asst .a-card .tt { font-weight: 600; margin-bottom: 8px; }
#asst .a-card .r { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
#asst .a-card select, #asst .a-card button { background: transparent; color: inherit; border: 1px solid var(--hairline, rgba(21,20,20,.25)); border-radius: 99px; font: 600 11px/1 var(--ui, sans-serif); padding: 6px 9px; cursor: pointer; } body.dark #asst .a-card select, body.dark #asst .a-card button { border-color: rgba(236,234,227,.28); }
#asst .a-card select option { color: #151414; } #asst .a-card button.on { background: #201E1D; color: #F3F2F2; } body.dark #asst .a-card button.on { background: #ECEAE3; color: #151414; }
#asst .a-card .u { margin-left: auto; color: #B6240E; border-color: rgba(236,48,19,.45); } body.dark #asst .a-card .u { color: #ff8a73; }
#asst .a-card .st { font-size: 11px; opacity: .6; width: 100%; margin-top: 2px; } #asst .a-card.off { opacity: .55; } #asst .a-card [disabled] { opacity: .45; cursor: default; }
body.cos #tpanel .tp-cmd, body.cos #tpanel .tp-rep-row, body.cos #tpanel .tp-hint { display: none !important; }
#tpanel .tp-cos { display: none; width: 100%; text-align: left; margin: 0 0 10px; padding: 11px 14px; border: 1px solid var(--hairline, rgba(21,20,20,.2)); border-radius: 12px; background: rgba(127,127,127,.08); color: inherit; font: 600 12px/1.3 var(--ui, sans-serif); cursor: pointer; }
body.cos #tpanel .tp-cos { display: block; } #tpanel .tp-cos small { display: block; font-weight: 400; opacity: .6; margin-top: 3px; font-size: 11px; } #tpanel .tp-cos kbd { float: right; opacity: .55; font: inherit; }
#asst .a-tabs { display: inline-flex; gap: 2px; padding: 3px; border: 1px solid var(--hairline, rgba(21,20,20,.2)); border-radius: 99px; background: rgba(127,127,127,.08); }
#asst .a-tab { cursor: pointer; font: 600 11px/1 var(--ui, sans-serif); letter-spacing: .1em; text-transform: uppercase; padding: 8px 14px; border-radius: 99px; opacity: .6; white-space: nowrap; transition: background .15s, opacity .15s; }
#asst .a-tab:hover { opacity: 1; } #asst .a-tab.on { opacity: 1; background: #C8553D; color: #fff; }
/* the header as two tidy rows (28 Oct): the tabs across the full width, then the caption on the left and NEW · CLOSE on the right.
   One row was wider than the panel, so CLOSE hung over its edge. */
#asst .a-h { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; grid-template-areas: "tabs tabs tabs" "sub new x"; align-items: center; column-gap: 8px; row-gap: 10px; }
#asst .a-t { display: contents; }
#asst .a-tabs { grid-area: tabs; display: grid; grid-template-columns: 1fr 1fr; }
#asst .a-tab { text-align: center; }
#asst .a-t small { grid-area: sub; margin: 0; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
#asst .a-h [data-new] { grid-area: new; } #asst .a-h [data-x] { grid-area: x; }
#asst .a-m[hidden] { display: none; } #asst.mo .a-clip, #asst.mo .a-c, #asst.mo .a-at { display: none; }
#asst .a-n { align-self: flex-start; font-size: 12px; opacity: .7; padding: 2px 4px; border-left: 2px solid #EC3013; padding-left: 8px; max-width: 92%; }
#asst .a-v { align-self: stretch; } #asst .a-v video, #asst .a-v img { display: block; width: 100%; max-height: 62vh; object-fit: contain; background: #111; border-radius: 8px; } #asst .a-v small { display: block; font-size: 10.5px; opacity: .55; margin-top: 3px; word-break: break-all; }
/* the Prompt Engineer card (4 Nov 2026): the problem, the fix, what yes and no do, and one YES / NO per line */
#asst .a-h { grid-template-columns: minmax(0, 1fr) auto auto auto; grid-template-areas: "tabs tabs tabs tabs" "sub pe new x"; }
#asst .a-h [data-pe] { grid-area: pe; } #asst .a-h [data-pe].off { opacity: .5; } #asst.mo .a-h [data-pe] { visibility: hidden; }
#asst .pe .rb { margin: 0 0 8px; line-height: 1.45; }
#asst .pe .p { border-top: 1px solid var(--hairline, rgba(21,20,20,.15)); padding: 9px 0 8px; } body.dark #asst .pe .p { border-color: rgba(236,234,227,.15); }
#asst .pe .pq { font-weight: 600; margin-bottom: 3px; } #asst .pe .pf { margin-bottom: 4px; }
#asst .pe .px { font-size: 11.5px; opacity: .75; margin: 0 0 7px; display: grid; gap: 2px; }
#asst .pe .p button.y.on { background: #2E7D4F; border-color: #2E7D4F; color: #fff; } #asst .pe .p button.n.on { background: #B6240E; border-color: #B6240E; color: #fff; }
#asst .pe details { margin: 4px 0 8px; } #asst .pe summary { cursor: pointer; font-size: 11.5px; opacity: .7; } #asst .pe .bf { white-space: pre-wrap; font-size: 12px; margin-top: 6px; }
#asst .pe button.go { background: #EC3013; border-color: #EC3013; color: #fff; } #asst .pe button.go[disabled] { opacity: .4; }
#asst .a-b.u details summary { cursor: pointer; } #asst .a-b.u details div { white-space: pre-wrap; font-size: 12px; margin-top: 6px; opacity: .85; }
#asstBtn { position: fixed; left: 18px; bottom: 58px; z-index: 55; background: #201E1D; color: #F3F2F2; border: 0; border-radius: 99px; padding: 10px 16px; font: 700 11px/1 var(--ui, sans-serif); letter-spacing: .12em; cursor: pointer; box-shadow: 0 6px 24px rgba(0,0,0,.28); }
body.dark #asstBtn { background: #ECEAE3; color: #151414; } #asstBtn kbd { opacity: .55; font: inherit; margin-left: 6px; }
`;

function md(t) { // a small, safe subset: paragraphs, bold, code, links, lists
  const lines = esc(t).split(/\r?\n/), out = []; let list = null;
  const inline = s => linkify(s.replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>'));
  const close = () => { if (list) { out.push(`</${list}>`); list = null; } };
  for (const l of lines) {
    const ul = /^\s*[-*•]\s+(.*)$/.exec(l), ol = /^\s*\d+[.)]\s+(.*)$/.exec(l);
    if (ul || ol) { const k = ul ? 'ul' : 'ol'; if (list !== k) { close(); out.push(`<${k}>`); list = k; } out.push(`<li>${inline((ul || ol)[1])}</li>`); }
    else if (!l.trim()) close();
    else { close(); out.push(`<p>${inline(l.replace(/^#+\s*/, ''))}</p>`); }
  }
  close(); return out.join('');
}

const DEPT_ALIAS = { marketing: 'marketing', market: 'marketing', emails: 'emails', email: 'emails', sales: 'sales', ops: 'ops', operations: 'ops', fin: 'fin', finance: 'fin', accounting: 'fin', delivery: 'delivery' };
const MODELS = [['', 'Model: auto'], ['sonnet', 'Sonnet'], ['opus', 'Opus'], ['fable', 'Fable']], EFFORTS = [['', 'Effort: auto'], ['low', 'Low'], ['medium', 'Medium'], ['high', 'High'], ['xhigh', 'XHigh'], ['max', 'Max']];
const QUICK_HELP = '**Quick add, no model call:** `/task <department> <what to do>`. Departments: marketing, emails, sales, ops, fin, delivery. Optional flags before the text: `--team`, `--model opus`, `--effort high`. Example: `/task fin --model opus Check this month\'s invoices against billing.md`. Attach a file first and its note is added to the task.';

export function initAssistant({ refresh = () => {} } = {}) {
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  const root = document.createElement('div'); root.id = 'asst';
  root.innerHTML = `<div class="a-h"><div class="a-t"><div class="a-tabs"><span class="a-tab on" data-tab="cos">Chief of Staff</span><span class="a-tab" data-tab="motion">Chief of Content</span></div><small style="margin-top:8px">Same conversation on Telegram</small></div><button data-pe title="The prompt engineer checks each request first and asks you yes or no on anything it would fix. Click to switch it off or on.">ENGINEER ON</button><button data-new title="Start a fresh conversation">NEW</button><button data-x title="Close (Esc)">CLOSE</button></div>
    <div class="a-m" data-m="cos"></div><div class="a-m" data-m="motion" hidden></div><div class="a-c"></div><div class="a-at"></div>
    <div class="a-f"><button class="a-clip" title="Attach a document or image (PDF, Word, PowerPoint, Excel, .zip of any of these, .txt, .md, .csv, .png, .jpg): it is read into the Brain and the desk is told which note to read">📎</button><input type="file" class="a-file" multiple hidden accept=".zip,.pdf,.docx,.doc,.docm,.pptx,.ppt,.xlsx,.xls,.xlsm,.odt,.ods,.odp,.rtf,.epub,.csv,.txt,.md,.png,.jpg,.jpeg,.webp,.gif"><textarea rows="1" placeholder="Tell the office what to do, or ask. /task sales … adds one directly."></textarea><button class="a-go">SEND</button></div>
    <div class="a-drop">Drop a file here<br>and I will read it and pass it to the right desk</div>`;
  document.body.appendChild(root);
  wireLinks(root);
  const btn =document.createElement('button'); btn.id = 'asstBtn'; btn.innerHTML = 'CHIEF OF STAFF<kbd>A</kbd>'; document.body.appendChild(btn);
  const BOX = { cos: root.querySelector('[data-m=cos]'), motion: root.querySelector('[data-m=motion]') };
  let mode = 'cos'; const C = root.querySelector('.a-c'), AT = root.querySelector('.a-at'), T = root.querySelector('textarea'), G = root.querySelector('.a-go'), FILE = root.querySelector('.a-file');
  const CHIPS = ["What's waiting on me?", "What's going out this week?", 'Make me a Reel on pricing', 'How is the office doing?'];
  let loaded = false, busy = false, atts = [], names = null; // atts: { filename, note, state }
  const bubble = (cls, html, box = BOX.cos) => { const d = document.createElement('div'); d.className = (cls === 'n' || cls === 'v' ? 'a-' : 'a-b ') + cls; d.innerHTML = html; box.appendChild(d); box.scrollTop = box.scrollHeight; return d; };
  const chips = () => { C.innerHTML = BOX.cos.querySelector('.a-b') ? '' : CHIPS.map(c => `<button>${esc(c)}</button>`).join(''); };
  C.addEventListener('click', e => { const b = e.target.closest('button'); if (b) send(b.textContent); });
  const agentName = async id => { if (!names) { try { names = Object.fromEntries(((await (await fetch('/api/agents')).json()).agents || []).map(a => [a.id, a.name])); } catch { names = {}; } } return names[id] || String(id).toUpperCase(); };

  /* ---------- attachments: read into the Brain through the existing upload route; the note name travels with the message ---------- */
  const drawAtts = () => { AT.innerHTML = atts.map((a, i) => `<span class="${a.state}"><b title="${esc(a.filename)}">📎 ${esc(a.filename)}${a.state === 'busy' ? ' · reading…' : a.state === 'bad' ? ' · ' + esc(a.err || 'failed') : ''}</b><button data-i="${i}" title="Remove">✕</button></span>`).join(''); };
  AT.addEventListener('click', e => { const b = e.target.closest('button'); if (b) { atts.splice(+b.dataset.i, 1); drawAtts(); } });
  const b64 = f => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1] || ''); r.onerror = () => rej(new Error('could not read the file')); r.readAsDataURL(f); });
  async function attach(files) {
    for (const f of [...files]) {
      const a = { filename: f.name, note: '', state: 'busy' }; atts.push(a); drawAtts();
      try {
        const r = await fetch('/api/upload', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ filename: f.name, dataBase64: await b64(f) }) });
        const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || r.statusText);
        a.note = j.note; a.state = 'ok';
      } catch (e) { a.state = 'bad'; a.err = String(e.message || e).slice(0, 80); }
      drawAtts();
    }
    T.focus();
  }
  root.querySelector('.a-clip').addEventListener('click', () => FILE.click());
  T.addEventListener('paste', e => { const fs = [...(e.clipboardData?.files || [])].filter(f => /^image\//.test(f.type)); if (!fs.length) return; e.preventDefault(); attach(fs.map((f, i) => f.name && f.name !== 'image.png' ? f : new File([f], 'Screenshot ' + new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-') + (fs.length > 1 ? '-' + (i + 1) : '') + '.png', { type: f.type }))); }); // a screenshot pasted from the clipboard (Win+Shift+S, Print Screen)
  FILE.addEventListener('change', () => { if (FILE.files.length) attach(FILE.files); FILE.value = ''; });
  let dragN = 0; // the drop overlay
  root.addEventListener('dragenter', e => { if (e.dataTransfer?.types?.includes('Files')) { e.preventDefault(); dragN++; root.classList.add('drag'); } });
  root.addEventListener('dragover', e => { if (e.dataTransfer?.types?.includes('Files')) e.preventDefault(); });
  root.addEventListener('dragleave', () => { dragN = Math.max(0, dragN - 1); if (!dragN) root.classList.remove('drag'); });
  root.addEventListener('drop', e => { e.preventDefault(); dragN = 0; root.classList.remove('drag'); if (e.dataTransfer.files.length) { open(); attach(e.dataTransfer.files); } });

  /* ---------- the chip for a task that was just added: change the model, effort or team, or undo, until it starts ---------- */
  async function taskCard(t) {
    const card = document.createElement('div'); card.className = 'a-card';
    let cur = { ...t }, left = Math.round((t.startsInMs ?? 20000) / 1000), timer = null, started = false, changing = false; // changing: a swap is in flight, so Undo must wait for it
    card.innerHTML = `<div class="k"></div><div class="tt"></div><div class="r"><select data-m>${MODELS.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select><select data-e>${EFFORTS.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select><button data-t title="The department lead splits it across its desks">TEAM</button><button class="u" data-u>UNDO</button><div class="st"></div></div>`;
    const q = s => card.querySelector(s), selM = q('[data-m]'), selE = q('[data-e]'), btT = q('[data-t]'), btU = q('[data-u]');
    const draw = async () => {
      q('.k').innerHTML = `ADDED TO ${esc(cur.deptName.toUpperCase())} · ${esc(await agentName(cur.agent))}${cur.team ? ' · TEAM' : ''}`; q('.tt').textContent = cur.title;
      selM.value = cur.model || ''; selE.value = cur.effort || ''; btT.classList.toggle('on', !!cur.team);
      const lock = started || changing || card.classList.contains('off'); [selM, selE, btT].forEach(x => { x.disabled = lock; }); btU.disabled = changing;
      q('.st').textContent = card.classList.contains('off') ? 'Undone.' : started ? 'Running. It will wait for your review.' : `Starts in ${left} s. Change the model, effort or team, or undo.`;
      btU.textContent = started ? 'CANCEL' : 'UNDO'; btU.hidden = card.classList.contains('off');
    };
    const tick = () => { if (left > 0) left--; if (left <= 0) { started = true; clearInterval(timer); } draw(); };
    const restart = () => { clearInterval(timer); left = 20; started = false; timer = setInterval(tick, 1000); draw(); };
    async function change(patch) { // take the task back (only possible before it starts), then add it again with the new settings
      const next = { ...cur, ...patch }; changing = true; clearInterval(timer); await draw(); q('.st').textContent = 'Changing it…';
      try {
        const c = await fetch(`/api/tasks/${cur.id}/change`, { method: 'POST' }); const cj = await c.json().catch(() => ({}));
        if (!c.ok) { started = true; changing = false; clearInterval(timer); await draw(); q('.st').textContent = cj.error || 'It has already started.'; return; }
        const r = await fetch('/api/tasks', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ dept: cj.dept, text: cj.text, model: next.model || undefined, effort: next.effort || undefined, team: next.team || undefined, by: 'chief' }) });
        const nj = await r.json(); if (!r.ok) throw new Error(nj.error || r.statusText);
        cur = { id: nj.id, dept: nj.dept, deptName: cur.deptName, agent: nj.agent, title: nj.title, model: next.model || '', effort: next.effort || '', team: !!nj.team }; changing = false; restart(); setTimeout(refresh, 600);
      } catch (e) { changing = false; await draw(); q('.st').textContent = 'Could not change it: ' + String(e.message || e).slice(0, 80); }
    }
    selM.addEventListener('change', () => change({ model: selM.value })); selE.addEventListener('change', () => change({ effort: selE.value })); btT.addEventListener('click', () => change({ team: !cur.team }));
    btU.addEventListener('click', async () => {
      if (started && !confirm('It is already running. Cancel it?')) return;
      try { await fetch(`/api/tasks/${cur.id}`, { method: 'DELETE' }); } catch {}
      clearInterval(timer); card.classList.add('off'); draw(); setTimeout(refresh, 400);
    });
    timer = setInterval(tick, 1000); await draw(); BOX.cos.appendChild(card); BOX.cos.scrollTop = BOX.cos.scrollHeight; return card;
  }

  /* ---------- /task <department> [--team] [--model m] [--effort e] <text>: no model call ---------- */
  async function quickAdd(raw) {
    let rest = raw.replace(/^\/task\b\s*/i, ''), flags = { team: false, model: '', effort: '' };
    const first = (rest.match(/^(\S+)/) || [])[1] || '', dept = DEPT_ALIAS[first.toLowerCase()];
    if (!dept) { bubble('a', md(QUICK_HELP)); return; }
    rest = rest.slice(first.length).trim();
    for (let m; (m = /^--(team|model|effort)\b\s*(\S*)\s*/i.exec(rest));) { if (m[1].toLowerCase() === 'team') flags.team = true; else flags[m[1].toLowerCase()] = m[2].toLowerCase(); rest = rest.slice(m[0].length); }
    const ok = atts.filter(a => a.state === 'ok'); if (ok.length) rest += `\n\nRead the attached note${ok.length > 1 ? 's' : ''}: ${ok.map(a => '`' + a.note + '`').join(', ')}.`;
    if (rest.trim().length < 8) { bubble('a', md('That task is too short to act on. ' + QUICK_HELP)); return; }
    try {
      const r = await fetch('/api/tasks', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ dept, text: rest.trim(), team: flags.team || undefined, model: flags.model || undefined, effort: flags.effort || undefined, by: 'chief' }) });
      const j = await r.json(); if (!r.ok) throw new Error(j.error || r.statusText);
      atts = atts.filter(a => a.state !== 'ok'); drawAtts();
      await taskCard({ id: j.id, dept: j.dept, deptName: { emails: 'Emails', sales: 'Sales', marketing: 'Marketing', ops: 'Operations', fin: 'Accounting', delivery: 'Delivery' }[j.dept] || j.dept, agent: j.agent, title: j.title, model: j.model || '', effort: j.effort || '', team: !!j.team });
      setTimeout(refresh, 600);
    } catch (e) { bubble('e', 'I couldn\'t add that: ' + esc(e.message)); }
  }

  async function load() {
    if (loaded) return; loaded = true;
    try {
      const j = await (await fetch('/api/assistant')).json();
      const showUser = t => { // the note line the office adds for the model shows as just the file name; a prompt-engineer brief folds away behind its read-back
        if (/^BRIEF \(approved by Wesley/.test(String(t))) { const rb = (/\nRead-back: (.*)/.exec(t) || [])[1] || 'brief sent'; return `<details><summary>✍ Brief sent: ${esc(rb)}</summary><div>${esc(t)}</div></details>`; }
        return esc(String(t).replace(/\n*\[Attached by Wesley: "([^"]*)"[^\]]*\]/g, '\n\u{1F4CE} $1')).replace(/\n/g, '<br>');
      };
      for (const m of j.messages || []) bubble(m.who === 'user' ? 'u' : 'a', m.who === 'user' ? showUser(m.text) : md(m.text));
      if (!(j.messages || []).length) bubble('a', md('Hello. Tell me what you want done, or ask me anything about the office: a Reel, the content week, a quick LinkedIn update, a document to digest (use the paperclip). I add it to the right desk and it waits for your review. For a direct add, type `/task sales …`.'));
    } catch { bubble('e', 'The chief of staff needs the office running. Start it with npm start, then open this page from http://localhost:4520.'); }
    chips();
  }
  // an image takes 10 to 60 seconds to read: Send waits for it and then goes, instead of doing nothing
  async function waitAtts(flag) {
    if (!atts.some(a => a.state === 'busy')) return;
    const s = document.createElement('div'); s.className = 'a-s'; s.innerHTML = '<i>●</i> reading your attachment, then sending'; (mode === 'motion' ? BOX.motion : BOX.cos).appendChild(s); G.disabled = true;
    while (atts.some(a => a.state === 'busy')) await new Promise(r => setTimeout(r, 300));
    s.remove();
  }
  async function send(text) {
    text = String(text || T.value).trim();
    if (busy) return;
    busy = true; await waitAtts(); busy = false;
    const ok = atts.filter(a => a.state === 'ok'); if (!text && !ok.length) return;
    busy = true; G.disabled = true; T.value = ''; T.style.height = ''; C.innerHTML = '';
    if (/^\/task\b/i.test(text)) { bubble('u', esc(text).replace(/\n/g, '<br>')); await quickAdd(text); busy = false; G.disabled = false; T.focus(); return; }
    if (!text) text = 'Have a look at the attached file and tell me what you would do with it.';
    bubble('u', esc(text).replace(/\n/g, '<br>') + ok.map(a => `<br>📎 ${esc(a.filename)}`).join(''));
    atts = atts.filter(a => a.state !== 'ok'); drawAtts();
    if (peOn() && !CHIPS.includes(text)) { busy = false; G.disabled = false; return engineerFirst(text, ok); }
    busy = false; return toChief(text, ok);
  }

  /* ---------- the Prompt Engineer (4 Nov 2026): every request is checked first. It comes back with a brief and up to three proposals,
     each one problem, one fix, what yes and no do. Wesley answers YES or NO; the brief with his answers goes to the Chief of Staff. ---------- */
  const PE_KEY = 'cc.promptEngineer';
  const peOn = () => { try { return localStorage.getItem(PE_KEY) !== 'off'; } catch { return true; } };
  const PEB = root.querySelector('[data-pe]');
  const drawPe = () => { PEB.textContent = peOn() ? 'ENGINEER ON' : 'ENGINEER OFF'; PEB.classList.toggle('off', !peOn()); };
  PEB.addEventListener('click', () => { try { localStorage.setItem(PE_KEY, peOn() ? 'off' : 'on'); } catch {} drawPe(); });
  drawPe();
  const DEPT_NAME = { emails: 'Emails', sales: 'Sales', marketing: 'Marketing', ops: 'Operations', fin: 'Accounting', delivery: 'Delivery' };
  async function engineerFirst(text, ok) {
    const s = document.createElement('div'); s.className = 'a-s'; s.innerHTML = '<i>●</i> prompt engineer: checking your request against your notes (up to a minute)'; BOX.cos.appendChild(s); BOX.cos.scrollTop = BOX.cos.scrollHeight;
    let r;
    try {
      const res = await fetch('/api/prompt-engineer', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text, attachments: ok.map(a => ({ note: a.note, filename: a.filename })) }) });
      r = await res.json().catch(() => ({})); if (!res.ok) throw new Error(r.error || res.statusText);
    } catch (e) {
      s.remove();
      const card = document.createElement('div'); card.className = 'a-card pe';
      card.innerHTML = `<div class="k">PROMPT ENGINEER</div><div class="rb">It couldn't check this one (${esc(String(e.message || e).slice(0, 120))}). Send your words to the Chief of Staff as they are?</div><div class="r"><button class="go" data-raw>YES, SEND AS IS</button><button data-drop>NO</button></div>`;
      card.querySelector('[data-raw]').addEventListener('click', () => { card.classList.add('off'); card.querySelectorAll('button').forEach(b => { b.disabled = true; }); toChief(text, ok); });
      card.querySelector('[data-drop]').addEventListener('click', () => { card.classList.add('off'); card.querySelectorAll('button').forEach(b => { b.disabled = true; }); });
      BOX.cos.appendChild(card); BOX.cos.scrollTop = BOX.cos.scrollHeight; return;
    }
    s.remove();
    if (r.status === 'pass' || !r.brief) return toChief(text, ok); // a question or chat: straight to the Chief of Staff
    peCard(text, ok, r);
  }
  function peCard(text, ok, r) {
    const props = Array.isArray(r.proposals) ? r.proposals.slice(0, 3) : [], answers = props.map(() => undefined);
    const card = document.createElement('div'); card.className = 'a-card pe';
    const dept = DEPT_NAME[r.department_hint] ? ' · ' + DEPT_NAME[r.department_hint].toUpperCase() : '';
    card.innerHTML = `<div class="k">PROMPT ENGINEER${dept}</div><div class="rb"></div>
      ${props.map((p, i) => `<div class="p" data-i="${i}"><div class="pq">${esc(p.problem || '')}</div><div class="pf"><b>I'd like to:</b> ${esc(p.fix || '')}</div><div class="px"><span><b>If yes:</b> ${esc(p.if_yes || '')}</span><span><b>If no:</b> ${esc(p.if_no || 'I leave it as it is.')}</span></div><div class="r"><button class="y" data-a="1">YES</button><button class="n" data-a="0">NO</button></div></div>`).join('')}
      <details><summary>The brief the desk will work to</summary><div class="bf"></div></details>
      <div class="r"><button class="go" data-send>SEND TO CHIEF OF STAFF</button><button data-raw title="Skip the brief and send what you typed">SEND MY WORDS AS THEY ARE</button><div class="st"></div></div>`;
    const q = sel => card.querySelector(sel), go = q('[data-send]'), raw = q('[data-raw]');
    const draw = () => {
      const { brief, readback } = applyAnswers(r, answers);
      q('.rb').innerHTML = `<b>Read-back:</b> ${esc(readback)}`;
      q('.bf').textContent = FIELDS.map(([k, label]) => { const v = brief[k]; const t = Array.isArray(v) ? v.map(x => '• ' + x).join('\n') : String(v || ''); return t && t.toLowerCase() !== 'none' ? `${label}\n${t}` : ''; }).filter(Boolean).join('\n\n');
      card.querySelectorAll('.p').forEach(el => { const a = answers[+el.dataset.i]; el.querySelector('.y').classList.toggle('on', a === true); el.querySelector('.n').classList.toggle('on', a === false); });
      const left = answers.filter(a => a === undefined).length;
      if (!card.classList.contains('off')) { go.disabled = left > 0; q('.st').textContent = left ? `Answer yes or no ${left === 1 ? 'to the one above' : `to each (${left} left)`}, then send.` : 'Ready. It goes to the Chief of Staff, who adds it to the right desk.'; }
    };
    card.querySelectorAll('.p').forEach(el => el.addEventListener('click', e => { const b = e.target.closest('button[data-a]'); if (!b || card.classList.contains('off')) return; answers[+el.dataset.i] = b.dataset.a === '1'; draw(); }));
    const finish = msg => { card.classList.add('off'); card.querySelectorAll('button').forEach(b => { b.disabled = true; }); q('.st').textContent = msg; };
    go.addEventListener('click', () => { if (busy) { q('.st').textContent = 'The Chief of Staff is still on your last message. Try again in a moment.'; return; } finish('Sent to the Chief of Staff.'); toChief(briefText(text, r, answers), ok, true); });
    raw.addEventListener('click', () => { if (busy) { q('.st').textContent = 'The Chief of Staff is still on your last message. Try again in a moment.'; return; } finish('Sent as you typed it.'); toChief(text, ok); });
    draw(); BOX.cos.appendChild(card); BOX.cos.scrollTop = BOX.cos.scrollHeight;
  }

  async function toChief(text, ok, engineered = false) {
    if (busy) return; busy = true; G.disabled = true;
    const s = document.createElement('div'); s.className = 'a-s'; s.innerHTML = '<i>●</i> thinking'; BOX.cos.appendChild(s); BOX.cos.scrollTop = BOX.cos.scrollHeight;
    let changed = false;
    try {
      const r = await fetch('/api/assistant', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text, surface: 'panel', stream: true, engineered: engineered || undefined, attachments: ok.map(a => ({ note: a.note, filename: a.filename })) }) });
      if (!r.ok || !r.body) { const j = await r.json().catch(() => ({})); throw new Error(j.error || r.statusText); }
      const rd = r.body.getReader(), dec = new TextDecoder(); let buf = '';
      for (;;) {
        const { value, done } = await rd.read(); if (done) break; buf += dec.decode(value, { stream: true });
        let i; while ((i = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1); if (!line) continue; let ev; try { ev = JSON.parse(line); } catch { continue; }
          if (ev.t === 'tool') { s.innerHTML = `<i>●</i> ${esc(ev.words)}…`; if (/add_task|add_routine|run_routine/.test(ev.name)) changed = true; BOX.cos.scrollTop = BOX.cos.scrollHeight; }
          else if (ev.t === 'task') { s.remove(); await taskCard(ev.task); BOX.cos.appendChild(s); changed = true; }
          else if (ev.t === 'reply') { s.remove(); bubble('a', md(ev.text)); }
          else if (ev.t === 'error') { s.remove(); bubble('e', 'I couldn\'t finish that: ' + esc(ev.error)); }
        }
      }
      if (s.isConnected) s.remove();
    } catch (e) { s.remove(); bubble('e', 'I couldn\'t reach the chief of staff: ' + esc(e.message)); }
    busy = false; if (mode === 'cos') { G.disabled = false; T.focus(); } if (changed) setTimeout(refresh, 800);
  }
  // ---- Motion Studio: the Motion Director's conversation ----
  let mLoaded = false, mBusy = false;
  const mediaHtml = m => /\.mp4$/i.test(m.file) ? `<video controls playsinline preload="metadata" src="${esc(m.url)}"></video><small>${esc(m.file)}</small>` : `<a href="${esc(m.url)}" target="_blank" rel="noopener"><img src="${esc(m.url)}" alt=""></a><small>${esc(m.file)}</small>`;
  async function mLoad() {
    if (mLoaded) return; mLoaded = true;
    try {
      const j = await (await fetch('/api/motion')).json();
      for (const m of j.messages || []) { bubble(m.who === 'user' ? 'u' : 'a', m.who === 'user' ? esc(m.text).replace(/\n/g, '<br>') : md(m.text), BOX.motion); for (const x of m.media || []) bubble('v', mediaHtml(x), BOX.motion); }
      if (!(j.messages || []).length) bubble('a', md('Chief of Content. Tell me what to make: "a 15 second reel for The Art of Operations on why scale is a system", "a LinkedIn title card for Episode 05". I write the code that paints every frame and the score, draft it, fix what the engine flags and render the final. Runs on Opus 5.5 at extra-high effort; a piece takes 10 to 30 minutes.'), BOX.motion);
      if (j.busy) bubble('n', 'Still working on your last message: the reply will show here when you reopen the panel.', BOX.motion);
    } catch { bubble('e', 'The motion studio needs the office running (npm start).', BOX.motion); }
  }
  async function mSend(text) {
    if (mBusy) return; mBusy = true; await waitAtts(); mBusy = false; // an attachment may still be being read
    const ok = atts.filter(a => a.state === 'ok'); // the Chief of Content gets the note names too, as the Chief of Staff does
    if (mBusy || (!text && !ok.length)) return; mBusy = true; G.disabled = true; T.value = ''; T.style.height = '';
    if (ok.length) { text = (text || 'Look at the attachment.') + `\n\nRead the attached note${ok.length > 1 ? 's' : ''}: ${ok.map(a => '`' + a.note + '`').join(', ')}.`; atts = atts.filter(a => a.state !== 'ok'); drawAtts(); }
    const box = BOX.motion; bubble('u', esc(text).replace(/\n/g, '<br>'), box);
    const s = document.createElement('div'); s.className = 'a-s'; s.innerHTML = '<i>●</i> thinking'; box.appendChild(s); box.scrollTop = box.scrollHeight;
    const keep = el => { s.remove(); box.appendChild(el); box.appendChild(s); box.scrollTop = box.scrollHeight; };
    try {
      const r = await fetch('/api/motion', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text }) });
      if (!r.ok || !r.body) { const j = await r.json().catch(() => ({})); throw new Error(j.error || r.statusText); }
      const rd = r.body.getReader(), dec = new TextDecoder(); let buf = '';
      for (;;) {
        const { value, done } = await rd.read(); if (done) break; buf += dec.decode(value, { stream: true });
        let i; while ((i = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1); if (!line) continue; let ev; try { ev = JSON.parse(line); } catch { continue; }
          if (ev.t === 'tool') s.innerHTML = `<i>●</i> ${esc(ev.words)}…`;
          else if (ev.t === 'note') keep(bubble('n', esc(ev.text), box));
          else if (ev.t === 'media') keep(bubble('v', mediaHtml(ev), box));
          else if (ev.t === 'reply') { s.remove(); bubble('a', md(ev.text), box); for (const x of ev.media || []) if (/\.mp4$/i.test(x.file) && !box.querySelector(`video[src="${x.url}"]`)) bubble('v', mediaHtml(x), box); }
          else if (ev.t === 'error') { s.remove(); bubble('e', 'The studio stopped: ' + esc(ev.error), box); }
        }
      }
      if (s.isConnected) s.remove();
    } catch (e) { s.remove(); bubble('e', 'I couldn\'t reach the motion studio: ' + esc(e.message), box); }
    mBusy = false; if (mode === 'motion') { G.disabled = false; T.focus(); }
  }
  function tab(to) {
    mode = to; root.classList.toggle('mo', to === 'motion');
    for (const t of root.querySelectorAll('.a-tab')) t.classList.toggle('on', t.dataset.tab === to);
    BOX.cos.hidden = to !== 'cos'; BOX.motion.hidden = to !== 'motion';
    root.querySelector('.a-t small').textContent = to === 'motion' ? 'Opus 5.5 · extra high · every frame scanned' : 'Same conversation on Telegram';
    T.placeholder = to === 'motion' ? 'Describe the motion piece: format, length, the line to land.' : 'Tell the office what to do, or ask. /task sales … adds one directly.';
    G.disabled = to === 'motion' ? mBusy : busy;
    if (to === 'motion') mLoad(); else load();
  }
  root.querySelectorAll('.a-tab').forEach(t => t.addEventListener('click', () => tab(t.dataset.tab)));
  G.addEventListener('click', () => (mode === 'motion' ? mSend(T.value.trim()) : send()));
  T.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); mode === 'motion' ? mSend(T.value.trim()) : send(); } else if (e.key === 'Escape') close(); });
  T.addEventListener('input', () => { T.style.height = 'auto'; T.style.height = Math.min(140, T.scrollHeight) + 'px'; });
  root.querySelector('[data-x]').addEventListener('click', () => close());
  root.querySelector('[data-new]').addEventListener('click', async () => {
    if (mode === 'motion') { if (mBusy) return; try { await fetch('/api/motion/clear', { method: 'POST' }); } catch {} BOX.motion.innerHTML = ''; mLoaded = false; return mLoad(); }
    if (busy) return; try { await fetch('/api/assistant/clear', { method: 'POST' }); } catch {} BOX.cos.innerHTML = ''; loaded = false; await load(); });
  function open(to) { root.classList.add('on'); if (to && to !== mode) tab(to); else if (mode === 'motion') mLoad(); else load(); setTimeout(() => T.focus(), 250); }
  function close() { root.classList.remove('on'); }
  const isOpen = () => root.classList.contains('on');
  btn.addEventListener('click', () => (isOpen() ? close() : open()));
  const tp = document.getElementById('tpanel'); // the right-hand panel is the task status list now: one strip takes you to the Chief of Staff, where tasks are added
  if (tp && !tp.querySelector('.tp-cos')) { const s = document.createElement('button'); s.className = 'tp-cos'; s.innerHTML = 'Ask the Chief of Staff<kbd>A</kbd><small>Add tasks, attach files, set repeats. Or type /task sales … for a direct add.</small>'; tp.insertBefore(s, tp.querySelector('.tp-cmd') || tp.firstChild); s.addEventListener('click', () => (isOpen() ? close() : open())); }
  return { open, close, toggle: () => (isOpen() ? close() : open()), isOpen, send, motion: () => open('motion') };
}
