// A message to Wesley on Telegram, from the office itself (no Claude session needed). It uses the bot the Telegram plugin already
// has (its token in the plugin's own .env) and sends ONLY to the allow-listed chat, never anywhere else. The token is read when
// needed and never logged or returned.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const DIR = process.env.TELEGRAM_STATE_DIR || path.join(os.homedir(), '.claude', 'channels', 'telegram');
const clean = t => String(t).replace(/^﻿/, '');

function creds() {
  let token = '', chat = '';
  try { const m = /^\s*TELEGRAM_BOT_TOKEN\s*=\s*(\S+)\s*$/m.exec(clean(fs.readFileSync(path.join(DIR, '.env'), 'utf8'))); token = m ? m[1].replace(/^["']|["']$/g, '') : ''; } catch {}
  try { const a = JSON.parse(clean(fs.readFileSync(path.join(DIR, 'access.json'), 'utf8'))); chat = String((a.allowFrom || [])[0] || ''); } catch {}
  return { token, chat };
}

/** Is Telegram set up for this office (a bot and one allow-listed chat)? */
export const configured = () => { const c = creds(); return !!(c.token && c.chat); };

/** Send a finished video to Wesley's own Telegram chat with a short caption (under 50 MB). Returns { ok, reason }. */
export async function telegramVideo(file, caption = '') {
  const { token, chat } = creds();
  if (!token || !chat) return { ok: false, reason: 'Telegram is not set up (no bot token or allow-listed chat)' };
  try {
    if (fs.statSync(file).size > 49 * 1024 * 1024) return { ok: false, reason: 'the video is over Telegram\'s 50 MB limit' };
    const fd = new FormData(); fd.append('chat_id', chat); fd.append('caption', String(caption).slice(0, 1000)); fd.append('supports_streaming', 'true');
    fd.append('video', new Blob([fs.readFileSync(file)], { type: 'video/mp4' }), path.basename(file));
    const r = await fetch(`https://api.telegram.org/bot${token}/sendVideo`, { method: 'POST', body: fd, signal: AbortSignal.timeout(120000) });
    const j = await r.json().catch(() => ({}));
    return j.ok ? { ok: true } : { ok: false, reason: `Telegram refused it (${r.status}${j.description ? ': ' + j.description : ''})` };
  } catch (e) { return { ok: false, reason: 'could not send the video: ' + e.message }; }
}

// how each kind of file goes: a video plays inline, audio gets a player, a picture shows, anything else arrives as a document
const KINDS = [
  [/\.(mp4|mov|m4v)$/i, 'sendVideo', 'video', 49], [/\.(mp3|m4a|wav|ogg|flac)$/i, 'sendAudio', 'audio', 49],
  [/\.(jpe?g|png|webp)$/i, 'sendPhoto', 'photo', 9], [/./, 'sendDocument', 'document', 49],
];
/** Send any file (a reel, an audio draft, a picture, a PDF) to Wesley's own Telegram chat with a short caption. Returns { ok, reason }. */
export async function telegramFile(file, caption = '') {
  const { token, chat } = creds();
  if (!token || !chat) return { ok: false, reason: 'Telegram is not set up (no bot token or allow-listed chat)' };
  const [, method, field, mb] = KINDS.find(([re]) => re.test(file));
  try {
    if (fs.statSync(file).size > mb * 1024 * 1024) return { ok: false, reason: `the file is over Telegram's ${mb + 1} MB limit for this kind of file` };
    const fd = new FormData(); fd.append('chat_id', chat); fd.append('caption', String(caption).slice(0, 1000));
    if (field === 'video') fd.append('supports_streaming', 'true');
    fd.append(field, new Blob([fs.readFileSync(file)]), path.basename(file));
    const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, { method: 'POST', body: fd, signal: AbortSignal.timeout(180000) });
    const j = await r.json().catch(() => ({}));
    return j.ok ? { ok: true } : { ok: false, reason: `Telegram refused it (${r.status}${j.description ? ': ' + j.description : ''})` };
  } catch (e) { return { ok: false, reason: 'could not send the file: ' + e.message }; }
}

/** Send `text` to Wesley's own Telegram chat. Returns { ok, reason }. */
export async function telegram(text) {
  const { token, chat } = creds();
  if (!token || !chat) return { ok: false, reason: 'Telegram is not set up (no bot token or allow-listed chat)' };
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ chat_id: chat, text: String(text).slice(0, 3500), disable_web_page_preview: true }), signal: AbortSignal.timeout(15000) });
    const j = await r.json().catch(() => ({}));
    return j.ok ? { ok: true } : { ok: false, reason: `Telegram refused it (${r.status}${j.description ? ': ' + j.description : ''})` };
  } catch (e) { return { ok: false, reason: 'could not reach Telegram: ' + e.message }; }
}
