// Motion studio: the recorded sound library (Wesley, 4 Nov 2026). The sound kit synthesises the music and the beat-locked
// hits; real-world textures the synth cannot fake (glass, pours, paper, doors, crowds, kitchens, weather) come from Openverse
// (api.openverse.org: Freesound and Wikimedia Commons audio under Creative Commons). A fetched sound is converted to 48 kHz
// stereo WAV, trailing silence trimmed, peak-normalised to -3 dBFS, measured (onset, peak, noise floor, clipping) and drawn
// as a waveform. It lives in output/sfx/ (on the D: media drive behind a junction) as <id>.wav + <id>.json + <id>.png.
//
// Licences: only CC0, Public Domain Mark and CC BY are fetched. Share-alike would bind the whole video to its licence,
// NonCommercial rules out client and brand work, NoDerivatives rules out trimming and mixing: all three are refused.
// Every CC BY sound used in a render is credited in credits.txt beside the video, and the line travels with the final.
//
// Anonymous Openverse access allows 20 results a page, 240 deep. With credentials (openverse.clientId / clientSecret in
// office.config(.local).json, or OPENVERSE_CLIENT_ID / OPENVERSE_CLIENT_SECRET) the limits rise; nothing else changes.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { FFMPEG, ROOT } from './shared.mjs';

export const SFX = path.join(ROOT, 'output', 'sfx');
const API = 'https://api.openverse.org/v1';
const UA = 'AgentsOffice-MotionStudio/1.0';
export const LICENCES = ['cc0', 'pdm', 'by'];
const REFUSED = { 'by-sa': 'share-alike binds the whole video to its licence', 'by-nc': 'non-commercial', 'by-nc-sa': 'non-commercial', 'by-nd': 'no derivatives (it may not be trimmed or mixed)', 'by-nc-nd': 'non-commercial, no derivatives', 'sampling+': 'sampling licence, not CC' };
const HOSTS = /(^|\.)(freesound\.org|wikimedia\.org)$/i;
const MAX_BYTES = 25 * 1024 * 1024;
export const ID = /^ov-[0-9a-f]{8}$/;
export const idFor = uuid => 'ov-' + String(uuid).toLowerCase().replace(/[^0-9a-f]/g, '').slice(0, 8);

/** The library folder. It sits on the media drive behind a junction; if the drive is missing, say so and never make it on C:. */
export function libraryDir({ create = false } = {}) {
  let st = null; try { st = fs.lstatSync(SFX); } catch {}
  if (st?.isSymbolicLink() && !fs.existsSync(SFX)) throw new Error('the sound library is on the media drive (D:), which is not connected. Plug it in and try again.');
  if (!st && create) fs.mkdirSync(SFX, { recursive: true });
  return SFX;
}
export function readSound(id) { if (!ID.test(id)) return null; try { return JSON.parse(fs.readFileSync(path.join(SFX, id + '.json'), 'utf8')); } catch { return null; } }
export const soundFile = id => path.join(SFX, id + '.wav');
export function listSounds() {
  let names = []; try { libraryDir(); names = fs.readdirSync(SFX); } catch { return []; }
  return names.filter(f => /^ov-[0-9a-f]{8}\.json$/.test(f)).map(f => readSound(f.slice(0, -5))).filter(s => s && fs.existsSync(soundFile(s.id)));
}
/** every library id named in a composition (as a string literal, the way S.sample takes it) */
export const idsIn = html => [...new Set([...String(html).matchAll(/['"`](ov-[0-9a-f]{8})['"`]/g)].map(m => m[1]))];

/* ---------- Openverse ---------- */
let token = null;
function credentials() {
  const cfg = f => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8')).openverse || {}; } catch { return {}; } };
  const c = { ...cfg('office.config.json'), ...cfg('office.config.local.json') };
  const id = process.env.OPENVERSE_CLIENT_ID || c.clientId, secret = process.env.OPENVERSE_CLIENT_SECRET || c.clientSecret;
  return id && secret ? { id, secret } : null;
}
async function auth() {
  const c = credentials(); if (!c) return null;
  if (token && token.until > Date.now() + 60000) return token.value;
  const r = await fetch(API + '/auth_tokens/token/', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', 'user-agent': UA }, body: new URLSearchParams({ grant_type: 'client_credentials', client_id: c.id, client_secret: c.secret }) });
  if (!r.ok) return null; // fall back to anonymous access
  const j = await r.json(); token = { value: j.access_token, until: Date.now() + (j.expires_in || 3600) * 1000 }; return token.value;
}
async function api(pathname, params = {}) {
  const u = new URL(API + pathname); for (const [k, v] of Object.entries(params)) if (v != null && v !== '') u.searchParams.set(k, String(v));
  const t = await auth(); let r, body;
  for (let i = 0; i < 3; i++) { // Openverse throws the odd 5xx: try again, briefly
    r = await fetch(u, { headers: { 'user-agent': UA, accept: 'application/json', ...(t ? { authorization: 'Bearer ' + t } : {}) }, signal: AbortSignal.timeout(25000) });
    body = await r.text(); if (r.status < 500) break; await new Promise(res => setTimeout(res, 1500 * (i + 1)));
  }
  let j; try { j = JSON.parse(body); } catch { j = null; }
  if (r.status >= 500) throw new Error(`Openverse is having trouble (${r.status}) after three tries. Try again shortly, or use what is in the library (sfx_library).`);
  if (r.status === 429) throw new Error('Openverse says too many requests for now (rate limit). Wait a minute, or use what is already in the library (sfx_library).');
  if (!r.ok) throw new Error(`Openverse answered ${r.status}: ${(j?.detail || body).toString().slice(0, 200)}`);
  return { data: j, authed: !!t };
}
const credit = r => `"${r.title || 'Untitled'}" by ${r.creator || 'unknown'}${r.license === 'cc0' ? ' (CC0)' : r.license === 'pdm' ? ' (Public Domain)' : ` (CC BY ${r.license_version || '4.0'})`}, ${r.foreign_landing_url || ''}`.trim();

/** Search Openverse for recorded sounds. Licences are limited to CC0, PDM and CC BY; sounds are short (under 30 s) unless asked. */
export async function search({ query, source = 'freesound', maxSeconds = 30, licences = LICENCES, page = 1 } = {}) {
  const q = String(query || '').trim(); if (!q) throw new Error('Say what sound to look for, in plain words (e.g. "glass clink close", "paper page turn").');
  const lic = (licences || LICENCES).map(String).filter(l => LICENCES.includes(l)); if (!lic.length) throw new Error('Only CC0, PDM and CC BY sounds may be used: ' + Object.entries(REFUSED).map(([k, v]) => `${k} is refused (${v})`).join('; '));
  const authed = !!(await auth());
  const { data } = await api('/audio/', { q, license: lic.join(','), source: source === 'any' ? '' : source, length: +maxSeconds <= 30 ? 'shortest' : '', page_size: authed ? 40 : 20, page: Math.max(1, Math.min(authed ? 50 : 12, page | 0 || 1)) });
  const have = new Set(listSounds().map(s => s.id));
  const results = (data.results || []).filter(r => !maxSeconds || !r.duration || r.duration / 1000 <= +maxSeconds).map(r => ({
    fetch: r.id, id: idFor(r.id), inLibrary: have.has(idFor(r.id)) || undefined, title: r.title, seconds: r.duration ? +(r.duration / 1000).toFixed(2) : null,
    licence: r.license, creator: r.creator, source: r.source, pack: r.audio_set?.title || undefined, tags: (r.tags || []).map(t => t.name).slice(0, 10),
  }));
  return { query: q, total: data.result_count, page: data.page ?? page, pages: data.page_count, results };
}

/* ---------- fetching, converting, measuring ---------- */
const ff = args => new Promise(res => { const p = spawn(FFMPEG, args, { windowsHide: true }); let o = ''; p.stderr.on('data', d => o += d); p.on('error', e => res({ code: -1, out: String(e.message) })); p.on('close', code => res({ code, out: o })); });

/** 16-bit PCM WAV → interleaved floats */
function readWav(f) {
  const b = fs.readFileSync(f); let o = 12, fmt = null, data = null;
  while (o + 8 <= b.length) { const id = b.toString('ascii', o, o + 4), n = b.readUInt32LE(o + 4); if (id === 'fmt ') fmt = { ch: b.readUInt16LE(o + 10), rate: b.readUInt32LE(o + 12), bits: b.readUInt16LE(o + 22) }; if (id === 'data') { data = b.subarray(o + 8, o + 8 + n); break; } o += 8 + n + (n & 1); }
  if (!fmt || !data || fmt.bits !== 16) throw new Error('the converted file is not 16-bit PCM');
  const x = new Float32Array(data.length >> 1); for (let i = 0; i < x.length; i++) x[i] = data.readInt16LE(i * 2) / 32768;
  return { ...fmt, x, seconds: x.length / fmt.ch / fmt.rate };
}
/** Where the sound starts (first reaching -30 dB below its peak), where it peaks, how noisy its quietest stretches are, whether it clipped. */
export function measure(f) {
  const { ch, rate, x, seconds } = readWav(f), frames = x.length / ch;
  let peak = 0, peakAt = 0; for (let i = 0; i < frames; i++) { let a = 0; for (let c = 0; c < ch; c++) a = Math.max(a, Math.abs(x[i * ch + c])); if (a > peak) { peak = a; peakAt = i; } }
  const th = peak * 0.0316; let onset = 0; for (let i = 0; i < frames; i++) { let a = 0; for (let c = 0; c < ch; c++) a = Math.max(a, Math.abs(x[i * ch + c])); if (a >= th) { onset = i; break; } }
  const win = Math.round(rate * .02), rms = [];
  for (let s = 0; s + win <= frames; s += win) { let e = 0; for (let i = s; i < s + win; i++) for (let c = 0; c < ch; c++) e += x[i * ch + c] ** 2; rms.push(Math.sqrt(e / (win * ch))); }
  // the noise floor is heard where the sound is not: the lead-in before the onset and the last 150 ms (a swell has no quiet middle, so the middle is no guide)
  const db = v => v > 0 ? +(20 * Math.log10(v)).toFixed(1) : -120, med = a => { const s = [...a].sort((p, q) => p - q); return s.length ? s[s.length >> 1] : null; };
  const nLead = Math.floor(onset / win) - 1, lead = nLead >= 3 ? med(rms.slice(0, nLead)) : null, tail = med(rms.slice(-Math.max(1, Math.round(.15 / .02))));
  const floor = Math.min(...[lead, tail].filter(v => v != null), 1);
  let clipped = 0; for (let i = 0; i < x.length; i++) if (Math.abs(x[i]) >= .999) clipped++;
  const loud = rms.filter(v => v > peak * .25).length * .02; // seconds spent within 12 dB of the peak
  return { seconds: +seconds.toFixed(3), onset: +(onset / rate).toFixed(4), peakAt: +(peakAt / rate).toFixed(4), peakDb: db(peak), floorDb: db(floor), leadDb: lead == null ? null : db(lead), tailDb: db(tail ?? 0), clippedSamples: clipped, loudSeconds: +loud.toFixed(2) };
}
function flags(m, raw) {
  const out = [];
  if (raw.clippedSamples > 8) out.push(`clipped in the original (${raw.clippedSamples} samples at full scale): it may crackle`);
  if (m.leadDb != null && m.leadDb > -45) out.push(`noisy: hiss or room tone at ${m.leadDb} dBFS before the sound starts`);
  if (m.tailDb > -40 && m.seconds > .3) out.push(`ends abruptly: still at ${m.tailDb} dBFS when the file stops (cut off, or noise under it); end it earlier with dur and a fadeOut`);
  if (m.onset > .25 && m.peakAt - m.onset < .08) out.push(`starts late: the sound begins ${m.onset} s in (align 'onset' handles it)`);
  if (m.loudSeconds > 2.5 && m.seconds > 4) out.push('busy: loud for several seconds, likely more than one event; trim with from/to or pick a single take');
  return out;
}

/** Fetch one Openverse sound into the library (or return it if it is there already). */
export async function fetchSound(uuid) {
  const u = String(uuid || '').trim(); if (!/^[0-9a-f-]{36}$/i.test(u)) throw new Error('Give the full Openverse id from sfx_search (the "fetch" field, 36 characters).');
  const id = idFor(u), have = readSound(id); if (have && fs.existsSync(soundFile(id))) return { ...have, already: true };
  const { data: r } = await api(`/audio/${u}/`);
  if (!LICENCES.includes(r.license)) throw new Error(`Refused: "${r.title}" is ${r.license.toUpperCase()}${REFUSED[r.license] ? ' (' + REFUSED[r.license] + ')' : ''}. Only CC0, PDM and CC BY sounds may be used.`);
  let src; try { src = new URL(r.url); } catch { throw new Error('Openverse gave no file address for this sound.'); }
  if (src.protocol !== 'https:' || !HOSTS.test(src.hostname)) throw new Error(`Refused: the file is served from ${src.hostname}, not Freesound or Wikimedia.`);
  const dir = libraryDir({ create: true }), raw = fs.mkdtempSync(path.join(dir, '_raw-')); // a fresh, empty folder for the untrusted download
  try {
    const res = await fetch(src, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(60000) });
    if (!res.ok) throw new Error(`the file could not be downloaded (${res.status})`);
    const len = +res.headers.get('content-length') || 0; if (len > MAX_BYTES) throw new Error(`the file is too big (${(len / 1048576).toFixed(1)} MB)`);
    const bytes = Buffer.from(await res.arrayBuffer()); if (bytes.length > MAX_BYTES) throw new Error('the file is too big');
    const ext = (/\.(mp3|ogg|oga|wav|flac|m4a|opus)$/i.exec(src.pathname)?.[1] || 'bin').toLowerCase(), inFile = path.join(raw, 'source.' + ext);
    fs.writeFileSync(inFile, bytes);
    const step1 = path.join(raw, 'decoded.wav');
    let p = await ff(['-y', '-loglevel', 'error', '-i', inFile, '-vn', '-ac', '2', '-ar', '48000', '-c:a', 'pcm_s16le', step1]);
    if (p.code !== 0) throw new Error('ffmpeg could not read the file: ' + p.out.trim().slice(-200));
    const rawM = measure(step1); if (rawM.peakDb < -60) throw new Error('the file is silent');
    if (rawM.seconds > 90) throw new Error(`the sound is ${Math.round(rawM.seconds)} s long; the library takes sounds up to 90 s`);
    // trailing silence off, then the peak set to -3 dBFS so a gain of 1 means the same loudness for every sound
    const gain = (-3 - rawM.peakDb).toFixed(2);
    p = await ff(['-y', '-loglevel', 'error', '-i', step1, '-af', `areverse,silenceremove=start_periods=1:start_threshold=-60dB,areverse,volume=${gain}dB`, '-ar', '48000', '-c:a', 'pcm_s16le', soundFile(id) + '.tmp.wav']);
    if (p.code !== 0) throw new Error('ffmpeg could not finish the sound: ' + p.out.trim().slice(-200));
    fs.renameSync(soundFile(id) + '.tmp.wav', soundFile(id));
    const m = measure(soundFile(id)), png = path.join(dir, id + '.png');
    // the waveform (square-root scale, so tails and noise show), with the onset in red and the peak in grey: what align 'onset' and 'peak' land on t
    const x = s => Math.max(0, Math.min(898, Math.round(s / m.seconds * 900)));
    await ff(['-y', '-loglevel', 'error', '-i', soundFile(id), '-filter_complex', `aformat=channel_layouts=mono,showwavespic=s=900x180:colors=0x201E1D:scale=sqrt[w];color=c=0xF3F2F2:s=900x180,format=rgba[bg];[bg][w]overlay=format=auto:shortest=1,drawbox=x=${x(m.peakAt)}:y=0:w=2:h=180:color=0x8A8582@0.9:t=fill,drawbox=x=${x(m.onset)}:y=0:w=2:h=180:color=0xEC3013@0.95:t=fill`, '-frames:v', '1', png]);
    const rec = {
      id, openverse: r.id, title: r.title, creator: r.creator, creatorUrl: r.creator_url, source: r.source, landing: r.foreign_landing_url,
      licence: r.license, licenceVersion: r.license_version, licenceUrl: r.license_url, needsCredit: r.license === 'by', credit: credit(r), attribution: r.attribution,
      tags: (r.tags || []).map(t => t.name).slice(0, 20), pack: r.audio_set?.title || null, file: r.url, fetchedAt: new Date().toISOString(),
      ...m, flags: flags(m, rawM), waveform: fs.existsSync(png) ? png : null,
    };
    fs.writeFileSync(path.join(dir, id + '.json'), JSON.stringify(rec, null, 2));
    return rec;
  } finally { fs.rmSync(raw, { recursive: true, force: true }); }
}

/** The local library, optionally filtered by words in title, tags or pack. */
export function library(query = '') {
  const words = String(query).toLowerCase().split(/\s+/).filter(Boolean), all = listSounds();
  const hit = s => { const hay = [s.title, s.pack, ...(s.tags || [])].join(' ').toLowerCase(); return words.every(w => hay.includes(w)); };
  return (words.length ? all.filter(hit) : all).sort((a, b) => (b.fetchedAt || '').localeCompare(a.fetchedAt || ''))
    .map(s => ({ id: s.id, title: s.title, seconds: s.seconds, onset: s.onset, peakAt: s.peakAt, licence: s.licence, needsCredit: s.needsCredit, tags: (s.tags || []).slice(0, 8), flags: s.flags?.length ? s.flags : undefined }));
}

/** The sounds a composition uses, for the engine: decoded on the page from these bytes, with where each one starts and peaks. */
export function soundsFor(html) {
  const ids = idsIn(html), missing = [], sounds = {};
  for (const id of ids) { const s = readSound(id); if (!s || !fs.existsSync(soundFile(id))) { missing.push(id); continue; } sounds[id] = { b64: fs.readFileSync(soundFile(id)).toString('base64'), onset: s.onset, peakAt: s.peakAt, seconds: s.seconds }; }
  return { ids, missing, sounds, records: ids.map(readSound).filter(Boolean) };
}
/** credits.txt: every library sound in the piece; CC BY ones first, since those must be credited where the video is posted. */
export function creditsText(records) {
  if (!records.length) return '';
  const by = records.filter(r => r.needsCredit), free = records.filter(r => !r.needsCredit);
  return [by.length ? 'Sounds that must be credited where this video is posted (CC BY):\n' + by.map(r => '- ' + r.credit).join('\n') : 'No sound in this piece needs a credit (all CC0 or public domain).',
    free.length ? '\nAlso used, no credit required (CC0 / public domain):\n' + free.map(r => '- ' + r.credit).join('\n') : ''].join('\n').trim() + '\n';
}
