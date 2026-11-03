// Agents Office — connectors (Beta). The office shows the MCP servers YOUR Claude Code is
// actually connected to, and hands those same servers to the agents as tools.
//
//   discover()          → `claude mcp list`, parsed: every server, its status, the tool id
//   fromInit(servers)   → refresh statuses from a run's `system init` event (free, every task)
//   allowedTools()      → the --allowedTools list an agent gets (connected · allow/deny · web · browser)
//   cliArgs()           → --chrome / --no-chrome for every `claude -p` the office starts (V3.2 (16 Sep))
//   summary()           → what /api/mcp returns and what the top bar draws
//
// V3.2 (16 Sep 2026): CLAUDE IN CHROME. `tools.browser` (default true) puts the owner's own Chrome
// in the agents' hands through Claude Code's Chrome integration (`claude --chrome`): the run gets
// the `claude-in-chrome` MCP server — open tabs, read pages, fill forms on any site the owner is
// signed in to. It is not in `claude mcp list`, so the office adds it to the bar itself, status
// from ~/.claude.json (extension paired?) and then from each run's init event. Needs the Claude
// Code login (not an API key) and the Claude in Chrome extension; code.claude.com/docs/en/chrome.
//
// office.config.json →  "mcp": { "allow": [], "deny": [], "departments": { "<server>": ["sales"] } }
//   allow  — empty = every connected server; otherwise only these (name, id or key)
//   deny   — servers the agents may see in the bar but never call
//   departments — which pods a server is wired to (default: a built-in map, else every pod)
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Windows: `claude` on PATH is a .cmd shim, and Node's spawn() can't exec .cmd/.bat files
// directly (ENOENT) or safely via shell:true (unescaped arg concatenation — Node warns
// DEP0190). The shim just calls a real claude.exe next to it, so resolve and spawn that
// .exe directly instead: no shell involved, args passed as a real argv array.
let _bin = null;
export function resolveBin() {
  if (_bin) return _bin;
  if (process.platform !== 'win32') return (_bin = 'claude');
  try {
    const where = execFileSync('where', ['claude.cmd'], { encoding: 'utf8' }).trim().split(/\r?\n/)[0];
    const exe = where.replace(/claude\.cmd$/i, 'node_modules\\@anthropic-ai\\claude-code\\bin\\claude.exe');
    if (exe && fs.existsSync(exe)) return (_bin = exe);
  } catch {}
  return (_bin = 'claude'); // fallback: will fail with ENOENT until resolved; surfaces the same error as before
}

export const DEPT_KEYS = ['emails', 'sales', 'marketing', 'ops', 'fin', 'delivery'];

// Windows: this office process's own PATH is fixed at the moment its terminal launched it — a
// tool installed afterwards (e.g. `winget install` while the office was already running) is
// invisible to every `claude` this process spawns until the office itself is restarted from a
// truly fresh shell. Re-reading PATH from the registry on every env build removes that trap:
// the office always sees what's actually installed, no matter how stale its own launch was.
function freshPath() {
  if (process.platform !== 'win32') return process.env.PATH || '';
  const read = (hive, key) => { try { return execFileSync('reg', ['query', hive, '/v', 'Path'], { encoding: 'utf8' }).split('\n').find(l => /\bPath\b/.test(l))?.split(/REG_(?:EXPAND_)?SZ/)[1]?.trim() || ''; } catch { return ''; } };
  const m = read('HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Environment', 'Path');
  const u = read('HKCU\\Environment', 'Path');
  return [m, u].filter(Boolean).join(';') || process.env.PATH || '';
}
// MAX_MCP_OUTPUT_TOKENS: Claude Code cuts any tool result (a Plaud transcript, a long Doc) at 25,000 tokens by default, so an agent saw only the first part of a long
// transcript and reviewed it as if it were all. The office lifts the cut-off so a whole transcript arrives (a hard ceiling, not a target).
// AGENTS_OFFICE_RUN marks a Claude run the office started, so the "Needs you" hook (scripts/attention-hook.mjs) leaves it out
// The Telegram plugin is switched off in Wesley's user settings and on only for the listener window (scripts/telegram-listener.settings.json),
// so office runs never start it. Do not make it fail here instead (3 Nov 2026): Claude Code caches a plugin server's failure for 15 minutes for
// every session, and runs that failed it on purpose kept the listener from ever connecting.
export function freshEnv(base = process.env) { return { ...base, PATH: freshPath(), MAX_MCP_OUTPUT_TOKENS: base.MAX_MCP_OUTPUT_TOKENS || '200000', AGENTS_OFFICE_RUN: '1' }; }

// known brands → logo key in src/mcplogos.js. Anything else gets a generated tile.
const ALIASES = {
  gmail: ['gmail', 'googlegmail'], notion: ['notion'], canva: ['canva'], meta: ['metaads', 'meta', 'facebookads', 'facebook'],
  slack: ['slack'], fullenrich: ['fullenrich'], apollo: ['apollo', 'apolloio'], xero: ['xero'], stripe: ['stripe'],
  pandadoc: ['pandadoc'], clarity: ['clarity', 'microsoftclarity'], beehiiv: ['beehiiv'], loops: ['loops'],
  hyperframes: ['hyperframes'], imessage: ['imessage', 'messages'], claude: ['claude'], chatgpt: ['chatgpt', 'openai'],
  googlecalendar: ['googlecalendar', 'gcal', 'calendar'], googledrive: ['googledrive', 'gdrive', 'drive'], webflow: ['webflow'], playwright: ['playwright'],
  microsoft365: ['microsoft365', 'm365', 'office365'],
  googledocs: ['googledocs'], googlesheets: ['googlesheets'],
  ltx: ['ltxlocal', 'ltx'], // the local video generator (connectors/ltx-local)
  higgsfield: ['higgsfield', 'higgfield'], territool: ['territool'],
  chrome: ['claudeinchrome', 'chrome', 'claudechrome', 'browser'],
  telegram: ['telegram', 'plugintelegramtelegram', 'telegramsend'], // telegramsend: the desks' send-only connector (connectors/telegram-send)
  whatsapp: ['whatsapp', 'openwa'], // OpenWA, the self-hosted WhatsApp gateway (read-only MCP)
};
// which pods a known brand feeds (mirrors the demo's MCP_BY_DEPT)
const DEPTS_BY_KEY = {
  meta: ['marketing'], canva: ['marketing', 'delivery'], loops: ['marketing'], beehiiv: ['marketing'], hyperframes: ['marketing'],
  clarity: ['marketing'], notion: DEPT_KEYS, gmail: ['emails', 'sales', 'ops', 'fin', 'delivery'],
  fullenrich: ['sales'], imessage: ['sales'], apollo: ['sales'], pandadoc: ['ops', 'delivery'], xero: ['fin'], stripe: ['fin'],
  slack: ['emails', 'ops', 'delivery'], googledrive: ['ops', 'delivery', 'fin'], googlecalendar: ['emails', 'sales', 'delivery'],
  playwright: ['marketing', 'ops'], github: ['ops', 'delivery'], linear: ['ops', 'delivery'], jira: ['ops', 'delivery'],
  hubspot: ['sales', 'marketing'], salesforce: ['sales'], zapier: DEPT_KEYS, figma: ['marketing', 'delivery'],
  webflow: ['marketing', 'delivery'], higgsfield: ['marketing'], ltx: ['marketing'],
  googledocs: DEPT_KEYS, googlesheets: DEPT_KEYS, territool: ['sales'],
  chrome: DEPT_KEYS, // the owner's browser: every desk may need a web app
  telegram: ['emails'], // the Executive Assistant's channel — wired to the emails pod it leads
  whatsapp: ['emails'], // read-only; the Emails desks review unread chats and draft replies
};

export const norm = s => String(s).toLowerCase().replace(/^claude\.ai\s+/, '').replace(/\s+mcp$/, '').replace(/[^a-z0-9]/g, '');
export const toolId = name => String(name).replace(/[^A-Za-z0-9_-]+/g, '_'); // "claude.ai Gmail" → mcp__claude_ai_Gmail__* · "claude-in-chrome" keeps its hyphens
const display = name => { // "plugin:telegram:telegram" or "plugin:whatsapp-channel:whatsapp" (a locally-added plugin server) → "Telegram" / "Whatsapp"
  const m = /^plugin:[^:]+:([a-z0-9]+)$/i.exec(name);
  if (m) return m[1][0].toUpperCase() + m[1].slice(1);
  return String(name).replace(/^claude\.ai\s+/, '').replace(/\s+MCP$/, '');
};
function logoKey(name) {
  const n = norm(name);
  for (const [key, list] of Object.entries(ALIASES)) if (list.includes(n)) return key;
  return null;
}
const STATUS = { '✔': 'connected', '✓': 'connected', '!': 'needs-auth', '✗': 'failed', '✘': 'failed', '⏸': 'pending' };

let servers = [];        // the last discovery, enriched by fromInit()
let discoveredAt = 0;
let cfgMcp = { allow: [], deny: [], departments: {} };
let cfgWeb = true;
let cfgBrowser = true; // V3.2 (16 Sep): Claude in Chrome for the agents

export function configure(cfg) {
  cfgMcp = { allow: [], deny: [], departments: {}, ...(cfg.mcp || {}) };
  cfgWeb = cfg.tools?.web !== false;
  cfgBrowser = cfg.tools?.browser !== false;
}
const matches = (s, x) => { const n = norm(x); return n && (norm(s.name) === n || s.id === x || s.key === n || toolId(x) === s.id); };
const denied = s => cfgMcp.deny.some(x => matches(s, x));
const allowed = s => !denied(s) && (!cfgMcp.allow.length || cfgMcp.allow.some(x => matches(s, x)));

function deptsFor(name, key) {
  for (const [k, v] of Object.entries(cfgMcp.departments || {})) if (norm(k) === norm(name) || (key && norm(k) === key)) return v.filter(d => DEPT_KEYS.includes(d));
  return DEPTS_BY_KEY[key || norm(name)] || DEPT_KEYS; // unknown → every pod (drawn as a shared connector)
}
function make(name, target, status) {
  const key = logoKey(name);
  return { id: toolId(name), name: display(name), key, status, target: target || '', source: /^claude\.ai\s/i.test(name) ? 'claude.ai' : 'local',
    depts: deptsFor(name, key), tools: [] };
}
export function parseList(text) {
  const out = [];
  for (const raw of String(text).split('\n')) {
    const line = raw.replace(/\x1b\[[0-9;]*m/g, '').trim();
    const m = line.match(/^(.+?):\s+(.+?)\s+-\s+(\S)\s*(.*)$/); // "name: target - ✔ Connected"
    if (!m) continue;
    out.push(make(m[1], m[2], STATUS[m[3]] || (/connected/i.test(m[4]) ? 'connected' : /auth/i.test(m[4]) ? 'needs-auth' : 'failed')));
  }
  return out;
}
/* ---------- V3.2 (16 Sep): the browser ---------- */
export const BROWSER = 'claude-in-chrome'; // the MCP server Claude Code adds to a --chrome run; tools are mcp__claude-in-chrome__*
// the native messaging host `claude --chrome` registers — the surest sign the extension can reach this machine
const NATIVE_HOST = 'com.anthropic.claude_code_browser_extension.json';
function nativeHost() {
  const h = os.homedir();
  const spots = process.platform === 'win32' ? [path.join(process.env.APPDATA || path.join(h, 'AppData', 'Roaming'), 'Claude Code', 'ChromeNativeHost', NATIVE_HOST)]
    : process.platform === 'darwin' ? [path.join(h, 'Library', 'Application Support', 'Google', 'Chrome', 'NativeMessagingHosts', NATIVE_HOST)]
    : [path.join(h, '.config', 'google-chrome', 'NativeMessagingHosts', NATIVE_HOST), path.join(h, '.config', 'chromium', 'NativeMessagingHosts', NATIVE_HOST)];
  return spots.some(p => fs.existsSync(p));
}
// what Claude Code remembers about the extension on this machine (paired device, onboarding done, native host registered)
export function browserState() {
  let j = {};
  try { j = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.claude.json'), 'utf8')); } catch {}
  const onboarded = !!j.hasCompletedClaudeInChromeOnboarding;
  return { installed: !!j.cachedChromeExtensionInstalled || onboarded || nativeHost(), device: j.chromeExtension?.pairedDeviceName || '', onboarded };
}
function browserServer(prev) {
  const b = browserState();
  const s = make(BROWSER, b.device ? `Claude in Chrome · ${b.device}` : 'Claude in Chrome extension', prev?.status === 'connected' || prev?.status === 'failed' ? prev.status : b.installed ? 'connected' : 'pending');
  s.name = 'Chrome'; s.key = 'chrome'; s.source = 'chrome'; s.browser = true; s.tools = prev?.tools || [];
  return s;
}
const withBrowser = list => { const rest = list.filter(s => s.id !== BROWSER); return cfgBrowser ? [...rest, browserServer(list.find(s => s.id === BROWSER))] : rest; };
export const browserOn = () => cfgBrowser;
export function cliArgs() { return cfgBrowser ? ['--chrome'] : ['--no-chrome']; } // explicit both ways: the login's "enabled by default" must not decide for the office

export function discover({ timeout = 45000 } = {}) {
  return new Promise(resolve => {
    const env = freshEnv(); delete env.CLAUDECODE;
    let out = '', done = false;
    const finish = list => { if (done) return; done = true; if (list) { servers = withBrowser(list); discoveredAt = Date.now(); } resolve(servers); };
    let p;
    try { p = spawn(resolveBin(), ['mcp', 'list'], { env, stdio: ['ignore', 'pipe', 'pipe'] }); } catch { return finish([]); }
    const timer = setTimeout(() => { try { p.kill('SIGKILL'); } catch {} finish(parseList(out)); }, timeout);
    p.stdout.on('data', d => { out += d; }); p.stderr.on('data', d => { out += d; });
    p.on('error', () => { clearTimeout(timer); finish([]); });
    p.on('close', () => { clearTimeout(timer); finish(parseList(out)); });
  });
}
// a run's `system init` event lists the servers the agent actually got, with live status + tool names
export function fromInit(init) {
  if (!init || !Array.isArray(init.mcp_servers)) return;
  const tools = Array.isArray(init.tools) ? init.tools : [];
  for (const m of init.mcp_servers) {
    let s = servers.find(x => x.id === toolId(m.name));
    if (!s) { if (m.name === BROWSER) { if (!cfgBrowser) continue; s = browserServer(null); } else s = make(m.name, '', 'connected'); servers.push(s); }
    if (m.status === 'connected' || m.status === 'needs-auth' || m.status === 'failed') s.status = m.status;
    else if (m.status === 'pending' && s.status !== 'connected') s.status = 'pending';
    const mine = tools.filter(t => t.startsWith(`mcp__${s.id}__`)).map(t => t.slice(s.id.length + 7));
    if (mine.length) { s.tools = mine; s.status = 'connected'; }
  }
  discoveredAt = discoveredAt || Date.now();
}
export function list() { return servers; }
export function usable() { return servers.filter(s => s.status === 'connected' && allowed(s)); }
// V3.9 EMAIL: agents never send email. The most they do is put a draft in the owner's inbox (after the owner's
// APPROVE); the owner sends it from Gmail. The send tools of every mail connector are refused at the CLI
// (--disallowedTools beats --allowedTools), whatever the prompt says — the known Gmail names are listed even
// before a run has reported the server's tools.
const isMail = s => /mail|outlook|inbox/i.test(`${s.key || ''} ${s.name || ''} ${s.id || ''}`);
const SENDS = /^(send|reply|forward)(_|$)|(^|_)send(_|$)/i;
export function blockedTools() {
  const out = [];
  for (const s of usable().filter(isMail)) {
    for (const t of new Set([...(s.tools || []), 'send_message', 'reply', 'forward', 'send_draft'])) if (SENDS.test(t)) out.push(`mcp__${s.id}__${t}`);
  }
  return out;
}
export const mailConnected = () => usable().some(isMail);
export function allowedTools() {
  const t = usable().map(s => `mcp__${s.id}`);
  if (cfgWeb) t.push('WebSearch', 'WebFetch');
  return t;
}
export const keyOf = toolName => { const m = /^mcp__(.+?)__/.exec(toolName); if (!m) return null; const s = servers.find(x => x.id === m[1]); return s ? (s.key || s.id) : m[1]; };
export const namesOf = toolNames => [...new Set(toolNames.map(n => { const m = /^mcp__(.+?)__/.exec(n); if (m) { const s = servers.find(x => x.id === m[1]); return s ? s.name : m[1]; } return n === 'WebSearch' ? 'web search' : n === 'WebFetch' ? 'web fetch' : null; }).filter(Boolean))];
export function summary() {
  return { discoveredAt, web: cfgWeb, browser: { on: cfgBrowser, ...browserState() }, servers: servers.map(s => ({ ...s, allowed: allowed(s), denied: denied(s), hidden: (cfgMcp.hidden || []).some(x => matches(s, x)) })) }; // hidden: no tile in the top bar, still connected and usable
}
const browserUsable = () => usable().some(s => s.id === BROWSER);
// the line an agent reads about its tools
export function promptText(agentTools = []) {
  const u = usable().filter(s => s.id !== BROWSER), browser = browserUsable();
  if (!u.length && !browser) return cfgWeb ? 'TOOLS\nYou have web search and web fetch. No business connectors are connected yet.' : 'TOOLS\nNone. Work from the notes.';
  const lines = u.map(s => `- ${s.name} (mcp__${s.id}__*)${s.tools.length ? ': ' + s.tools.slice(0, 12).join(', ') + (s.tools.length > 12 ? '…' : '') : ''}`);
  if (browser) lines.push(`- The owner's Chrome browser (mcp__${BROWSER}__*): open tabs, read pages, search, fill forms — on any site the owner is signed in to (their web apps, portals, dashboards)`);
  const mine = u.filter(s => agentTools.some(k => k === s.key || norm(k) === norm(s.name)));
  return 'TOOLS\nYou can call these connectors:\n' + lines.join('\n') + (cfgWeb ? '\n- Web search and web fetch' : '') +
    (mine.length ? `\nYour usual tools: ${mine.map(s => s.name).join(', ')}.` : '') +
    '\nRules: read freely (search, list, fetch) when it makes the work better. Anything that sends, posts, pays, deletes or changes data outside this machine — do it ONLY when the owner\'s request explicitly asks for that exact action; otherwise prepare it and say what you would send. Never ask the owner a question mid-task; make a reasonable assumption and mark it (assumed).' +
    (mailConnected() ? '\nEMAIL: you never send email — not with a tool, not in the browser. Sending, replying and forwarding are switched off for you. The furthest you go is a draft in the owner\'s own inbox, and only once the owner has approved the wording; the owner sends it from their inbox.' : '') +
    (browser ? '\nThe browser is the owner\'s own: use it when a connector cannot do the job or the owner names a website. Look and read freely; type into a form, submit, post, send, buy or change anything on a site ONLY when the task explicitly asks for that exact action. If a page wants a login, a code or a CAPTCHA, stop there and say so. Prefer a connector when one covers the same app. Close the tabs you opened.' : '');
}
