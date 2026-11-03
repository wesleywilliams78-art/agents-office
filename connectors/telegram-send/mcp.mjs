// How the office desks and Claude sessions message Wesley on Telegram. Send only, served over MCP (stdio).
// Why it exists (3 Nov 2026): the Telegram plugin's reply tool needs a chat ID a desk is never given, and every session that loads the plugin starts
// reading the bot too, which knocks the listener window off it (a bot can be read by one connector at a time). The plugin is now on only for the
// listener (scripts/telegram-listener.settings.json); everything else uses this, which sends through the bot's web API to the one allow-listed
// chat (notify.mjs) and never reads the bot.
//   telegram_send       one message to Wesley's own chat; there is no chat ID to pass and no other chat it can reach
//   telegram_send_file  one file (a reel, an audio draft, a picture, a PDF) to the same chat, with a caption
import fs from 'node:fs';
import readline from 'node:readline';
import { telegram, telegramFile, configured } from '../../notify.mjs';

const text = o => ({ content: [{ type: 'text', text: typeof o === 'string' ? o : JSON.stringify(o, null, 1) }] });
const fail = m => ({ content: [{ type: 'text', text: m }], isError: true });

const TOOLS = [
  { name: 'telegram_send', description: 'Send one message to Wesley on Telegram: his own allow-listed chat, the only chat this can reach, so there is no chat ID to pass. Use it only when the task explicitly asks you to message or send something to Wesley on Telegram. Plain text, up to 3,500 characters; call it once per message, in the order they should arrive.',
    inputSchema: { type: 'object', properties: { text: { type: 'string', description: 'The message, exactly as Wesley should read it' } }, required: ['text'] } },
  { name: 'telegram_send_file', description: 'Send one file from this computer to Wesley on Telegram (his own allow-listed chat, no chat ID to pass), with a short caption: a video plays inline, audio gets a player, a picture shows, anything else arrives as a document. Up to 50 MB (pictures 10 MB). Use it only when the task asks you to send Wesley the file on Telegram.',
    inputSchema: { type: 'object', properties: { path: { type: 'string', description: 'Absolute path of the file' }, caption: { type: 'string', description: 'Short caption, up to 1,000 characters' } }, required: ['path'] } },
];

const HANDLERS = {
  async telegram_send(a) {
    const t = String(a.text || '').trim(); if (!t) return fail('Say what to send.');
    if (t.length > 3500) return fail(`The message is ${t.length} characters; Telegram takes 3,500 here. Split it into more than one message.`);
    if (!configured()) return fail('Telegram is not set up on this computer (no bot token or allow-listed chat).');
    const r = await telegram(t);
    return r.ok ? text('Sent to Wesley on Telegram.') : fail('Not sent: ' + r.reason);
  },
  async telegram_send_file(a) {
    const f = String(a.path || '').trim(); if (!f) return fail('Say which file to send.');
    if (!fs.existsSync(f) || !fs.statSync(f).isFile()) return fail('No such file: ' + f);
    if (!configured()) return fail('Telegram is not set up on this computer (no bot token or allow-listed chat).');
    const r = await telegramFile(f, a.caption || '');
    return r.ok ? text('Sent the file to Wesley on Telegram.') : fail('Not sent: ' + r.reason);
  },
};

const send = o => process.stdout.write(JSON.stringify(o) + '\n');
readline.createInterface({ input: process.stdin }).on('line', async line => {
  let m; try { m = JSON.parse(line); } catch { return; }
  const { id, method, params } = m;
  try {
    if (method === 'initialize') return send({ jsonrpc: '2.0', id, result: { protocolVersion: params?.protocolVersion || '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'telegram-send', version: '1.0.0' } } });
    if (method === 'tools/list') return send({ jsonrpc: '2.0', id, result: { tools: TOOLS } });
    if (method === 'tools/call') {
      const h = HANDLERS[params?.name]; if (!h) return send({ jsonrpc: '2.0', id, result: fail('Unknown tool ' + params?.name) });
      try { return send({ jsonrpc: '2.0', id, result: await h(params.arguments || {}) }); } catch (e) { return send({ jsonrpc: '2.0', id, result: fail(String(e.message || e)) }); }
    }
    if (id !== undefined) send({ jsonrpc: '2.0', id, result: {} });
  } catch (e) { if (id !== undefined) send({ jsonrpc: '2.0', id, error: { code: -32603, message: String(e.message || e) } }); }
});
