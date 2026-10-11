// WhatsApp analytics for AIOS. Reads the owner's chats from the local OpenWA server (loopback only, read calls only)
// and turns them into counts: who is active, who is waiting on a reply, how fast replies go. Nothing here sends anything.
// Message text stays on this machine unless the owner presses READ INTO MATRIX, which hands the waiting chats to Claude.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const TAGS = ['clients', 'outposts', 'agents', 'ignore'];   // groups are detected, everything else starts "unsorted"
const DAY = 86400, BASE = 'http://127.0.0.1:2785';

export function create({ dataDir, cfg = {} }) {
  const dir = cfg.dir || path.join(os.homedir(), 'openwa');
  const tagFile = path.join(dataDir, 'whatsapp-tags.json');
  let cache = null, building = null, key = '';

  const readKey = () => { // the OpenWA key stays on the server; it is never sent to the page or printed
    if (key) return key;
    try { key = (fs.readFileSync(path.join(dir, '.env'), 'utf8').match(/^API_MASTER_KEY=(.*)$/m) || [])[1]?.trim() || ''; } catch {}
    return key;
  };
  const get = async p => {
    const r = await fetch(BASE + p, { headers: { 'X-API-Key': readKey() }, signal: AbortSignal.timeout(20000) });
    if (!r.ok) throw new Error(`OpenWA answered ${r.status} for ${p.split('?')[0].replace(/[0-9a-f-]{20,}/g, '…')}`);
    const j = await r.json(); return j?.data ?? j;
  };
  const loadTags = () => { try { return JSON.parse(fs.readFileSync(tagFile, 'utf8')); } catch { return {}; } };
  const setTag = (chatId, tag) => {
    if (tag && !TAGS.includes(tag)) throw Object.assign(new Error('tag must be one of ' + TAGS.join(', ')), { code: 400 });
    const t = loadTags(); if (tag) t[chatId] = tag; else delete t[chatId];
    fs.mkdirSync(dataDir, { recursive: true }); fs.writeFileSync(tagFile, JSON.stringify(t, null, 1)); cache = null; return t;
  };
  const byPattern = name => { for (const tag of TAGS) for (const p of cfg.tags?.[tag] || []) if (name && name.toLowerCase().includes(String(p).toLowerCase())) return tag; return ''; };

  async function session() {
    const all = await get('/api/sessions'); const list = Array.isArray(all) ? all : all?.sessions || [];
    return list.find(s => s.status === 'ready') || null;
  }
  const median = a => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

  function summarise(chat, msgs, now, tag) {
    const real = msgs.filter(m => !m.isStatusBroadcast && m.type !== 'notification_template' && m.type !== 'e2e_notification').sort((a, b) => a.timestamp - b.timestamp);
    const w7 = now / 1000 - 7 * DAY, w30 = now / 1000 - 30 * DAY;
    const c = { in7: 0, out7: 0, in30: 0, out30: 0 }, who = {}, lags = [];
    let pendingIn = null;
    for (const m of real) {
      const mine = !!m.fromMe;
      if (m.timestamp >= w30) { c[(mine ? 'out' : 'in') + '30']++; if (m.timestamp >= w7) c[(mine ? 'out' : 'in') + '7']++; }
      if (!mine && chat.isGroup && m.timestamp >= w30) { const n = m.contact?.name || m.contact?.pushName || 'someone'; who[n] = (who[n] || 0) + 1; }
      if (!chat.isGroup) { if (!mine && pendingIn == null) pendingIn = m.timestamp; else if (mine && pendingIn != null) { if (m.timestamp >= w30) lags.push(m.timestamp - pendingIn); pendingIn = null; } }
    }
    const last = real[real.length - 1];
    const person = real.find(m => !m.fromMe && (m.contact?.name || m.contact?.pushName))?.contact;
    const waiting = !chat.isGroup && last && !last.fromMe ? { since: last.timestamp * 1000, hours: Math.round((now / 1000 - pendingIn) / 3600), voice: real.filter(m => !m.fromMe && m.timestamp >= pendingIn && m.type === 'voice').length } : null;
    return {
      id: chat.id, name: chat.name || person?.name || person?.pushName || chat.id.split('@')[0], kind: chat.isGroup ? 'group' : 'person',
      category: tag || (chat.isGroup ? 'groups' : 'unsorted'), tagged: !!tag, ...c,
      lastAt: (last?.timestamp || chat.timestamp || 0) * 1000, lastFromMe: !!last?.fromMe, waiting,
      replyMedianMinutes: median(lags) == null ? null : Math.round(median(lags) / 60),
      topVoices: chat.isGroup ? Object.entries(who).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([n, k]) => ({ name: n, n: k })) : undefined,
      _msgs: real,
    };
  }

  async function build(force) {
    if (!force && cache && Date.now() - cache.at < 5 * 60000) return cache.out;
    if (building) return building;
    return building = (async () => {
      try {
        if (!readKey()) return { ok: false, reason: 'No OpenWA key found in ' + path.join(dir, '.env') };
        const s = await session().catch(e => { throw new Error('OpenWA is not reachable (is Docker running?): ' + e.message); });
        if (!s) return { ok: false, reason: 'OpenWA is running but the WhatsApp session is not ready (re-link it in OpenWA).' };
        const now = Date.now(), tags = loadTags();
        let chats = await get(`/api/sessions/${s.id}/chats?limit=500`); chats = Array.isArray(chats) ? chats : chats?.chats || [];
        const active = chats.filter(c => c.timestamp * 1000 > now - 30 * DAY * 1000).sort((a, b) => b.timestamp - a.timestamp).slice(0, 90);
        const rows = []; let i = 0;
        await Promise.all(Array.from({ length: 5 }, async () => { for (let k = i++; k < active.length; k = i++) {
          const c = active[k];
          try { const h = await get(`/api/sessions/${s.id}/messages/${encodeURIComponent(c.id)}/history?limit=150`); const msgs = Array.isArray(h) ? h : h?.messages || [];
            const row = summarise(c, msgs, now, tags[c.id] || byPattern(c.name)); rows.push(row); } catch {}
        } }));
        const keep = rows.filter(r => r.category !== 'ignore');
        const out = {
          ok: true, at: now, session: s.name || 'the-office', totalChats: chats.length, analysed: rows.length,
          chats: keep.map(({ _msgs, ...r }) => r).sort((a, b) => b.lastAt - a.lastAt),
          totals: { in7: keep.reduce((n, r) => n + r.in7, 0), out7: keep.reduce((n, r) => n + r.out7, 0), waiting: keep.filter(r => r.waiting).length, unsorted: keep.filter(r => r.category === 'unsorted').length },
        };
        cache = { at: now, out, raw: rows };
        return out;
      } finally { building = null; }
    })();
  }

  /** The text of what is waiting on the owner, for the matrix. Only called when he presses the button. */
  async function waitingText(category) {
    await build(false); if (!cache) throw Object.assign(new Error('WhatsApp is not available'), { code: 503 });
    const rows = cache.raw.filter(r => r.waiting && r.category !== 'ignore' && (!category || r.category === category)).sort((a, b) => b.waiting.hours - a.waiting.hours).slice(0, 15);
    if (!rows.length) throw Object.assign(new Error('Nothing is waiting on a reply' + (category ? ' in ' + category : '') + '.'), { code: 400 });
    const text = rows.map(r => {
      const since = r._msgs.filter(m => !m.fromMe && m.timestamp * 1000 >= r.waiting.since - r.waiting.hours * 3600000 - 60000).slice(-4);
      return `## ${r.name} (${r.category}) — waiting ${r.waiting.hours} h\n` + since.map(m => `- ${m.type === 'text' || m.type === 'chat' ? String(m.body || '').slice(0, 400) : `[${m.type}${m.type === 'voice' ? ': not transcribed, ask the owner to listen' : ''}]`}`).join('\n');
    }).join('\n\n');
    return { text, count: rows.length };
  }

  return { build, setTag, waitingText, tags: loadTags };
}
