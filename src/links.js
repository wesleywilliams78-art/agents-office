// Output links: any URL or file path in text the office shows (review cards, the Chief of Staff) becomes a link.
// Works on HTML that is already escaped. Files open on this computer through POST /api/open (the server checks the path).
const EXT = 'mp4|mov|m4a|mp3|wav|pdf|docx?|xlsx?|pptx?|csv|png|jpe?g|gif|webp|svg|md|txt|html?|json|zip';
const WIN = new RegExp(String.raw`\b[A-Za-z]:\\(?:[^\\/:*?"<>|\r\n\`]+\\)*[^\\/:*?"<>|\r\n\`]*?\.(?:${EXT})\b`, 'gi');
const WIN_DIR = /\b[A-Za-z]:\\[^\s<>"'`|*?]+/g; // a folder, or a path with no spaces
const REL = new RegExp(String.raw`(?<![\w/\\.:-])(?:output|videos|data|scripts|docs|connectors)/[^\s<>"'\`|*?]+`, 'g');
const URL_RE = /\bhttps?:\/\/[^\s<>"'`]+/g;
const TRAIL = /[.,;:!?)\]]+$/;

const unesc = s => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const attr = s => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

function fileLink(shown) {
  const m = TRAIL.exec(shown), tail = m ? m[0] : '', body = m ? shown.slice(0, -tail.length) : shown;
  return `<a class="fl" href="#" data-open="${attr(unesc(body))}" title="Open on this computer">${body}</a>${tail}`;
}
function urlLink(shown) {
  const m = TRAIL.exec(shown), tail = m ? m[0] : '', body = m ? shown.slice(0, -tail.length) : shown;
  return `<a href="${attr(unesc(body))}" target="_blank" rel="noopener">${body}</a>${tail}`;
}

/** Turn paths and URLs in escaped HTML into links; leaves existing <a> alone. */
export function linkify(html) {
  const whole = /^(?:[A-Za-z]:\\|(?:output|videos|data|scripts|docs|connectors)\/)/;
  const src = String(html).replace(/<code>([^<]*)<\/code>/g, (m, c) => whole.test(c.trim()) ? `<code>${fileLink(c.trim())}</code>` : m); // a path in backticks is linked whole, spaces and all
  return src.split(/(<a\b[^>]*>.*?<\/a>)/gs).map((part, i) => {
    if (i % 2) return part;
    return part.split(/(<[^>]+>)/).map(seg => {
      if (seg.startsWith('<')) return seg;
      const hold = [];
      const keep = h => { hold.push(h); return `\u0000${hold.length - 1}\u0000`; };
      let s = seg.replace(URL_RE, m => keep(urlLink(m)));
      s = s.replace(WIN, m => keep(fileLink(m))).replace(WIN_DIR, m => keep(fileLink(m))).replace(REL, m => keep(fileLink(m)));
      return s.replace(/\u0000(\d+)\u0000/g, (_, n) => hold[+n]);
    }).join('');
  }).join('');
}

/** One click handler for every panel: file links ask the server to open the file on this computer. */
export function wireLinks(root, onMsg) {
  root.addEventListener('click', async e => {
    const a = e.target.closest && e.target.closest('a.fl'); if (!a) return;
    e.preventDefault(); e.stopPropagation();
    const p = a.dataset.open; const was = a.title;
    try {
      const r = await fetch('/api/open', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: p }) });
      const j = await r.json().catch(() => ({}));
      a.title = r.ok ? 'Opened' : (j.error || 'Could not open'); if (!r.ok && onMsg) onMsg(j.error || 'Could not open that file'); if (r.ok) setTimeout(() => { a.title = was; }, 2500);
    } catch { a.title = 'Could not reach the office'; }
  }, true);
}
