// The Claude Code box's permission policy (8 Nov 2026). One pure function, classify(), decides for every tool call a box run
// makes: 'allow' (routine: runs at once), 'ask' (held until Wesley answers yes or no in the box) or 'deny' (never runs).
// scripts/claude-box-hook.mjs calls it as a PreToolUse hook that only the box's runs get (claudebox.mjs passes it with --settings,
// --setting-sources user and --permission-mode dontAsk, so anything this file does not allow is refused, not prompted).
// It is a list of known-safe things, not a list of dangers: an unknown program, tool or path asks. Wesley's rules:
//   routine — reading, editing files in the repo or the Brain, npm run check, restarting the office, git commit
//   ask     — delete or move outside the scratch folder · git push, reset, force, branch switches · installs · system, security or
//             office settings · anything that sends, posts or pays · anything outside the repo and Brain folders
//   never   — sending email (the office's rule: Gmail drafts only); the catastrophic cases scripts/guard-hook.mjs denies
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { decide as guard } from './scripts/guard-hook.mjs';

const lower = s => String(s || '').toLowerCase();
const winPath = p => { let s = String(p || '').trim().replace(/^["']|["']$/g, ''); const m = /^\/([a-z])(\/|$)/i.exec(s); if (m) s = m[1] + ':\\' + s.slice(3); return s; }; // Git Bash /c/x → C:\x
const isUnder = (p, root) => { const a = lower(path.resolve(p)), b = lower(path.resolve(root)); return a === b || a.startsWith(b.endsWith(path.sep) ? b : b + path.sep); };

// ctx: { repo, brain, media, scratch, cwd, home }; roots where reading and writing are routine, and where reading only is
export function roots(ctx) {
  const home = ctx.home || os.homedir(), tmp = os.tmpdir();
  const write = [ctx.repo, ctx.brain, ctx.media, ctx.scratch, tmp].filter(Boolean);
  const read = [...write, path.join(home, '.claude', 'plugins'), path.join(home, '.claude', 'skills')]; // plugin and user skills (a long tool result saved to disk: TOOL_RESULT below)
  return { write, read, scratch: [ctx.scratch, tmp].filter(Boolean) };
}
const resolveFrom = (p, ctx) => { const w = winPath(p); if (w === '~' || /^~[\\/]/.test(w)) return path.join(ctx.home || os.homedir(), w.slice(1)); return path.resolve(ctx.cwd || ctx.repo, w); };
const inside = (p, list, ctx) => list.some(r => isUnder(resolveFrom(p, ctx), r));

// files whose change would loosen the box's own rules, or the office's: a change to them asks
const PROTECTED = [/(^|[\\/])claudebox(-policy)?\.mjs$/i, /(^|[\\/])scripts[\\/](claude-box-hook|guard-hook)\.mjs$/i, /(^|[\\/])mcp\.mjs$/i, /(^|[\\/])\.claude[\\/]/i, /(^|[\\/])\.git[\\/]/i, /(^|[\\/])\.env/i];
const SECURITY_KEYS = /"?(claudeBox|allowLogins|allowHosts|brainWrite|siteWrite)"?\s*:/; // office settings that decide who may do what
const protectedFile = f => PROTECTED.some(re => re.test(String(f || '')));

const TOOL_RESULT = /[\\/]\.claude[\\/]projects[\\/][^\\/]+[\\/][0-9a-f-]{36}[\\/]tool-results[\\/][^\\/]+$/i; // Claude Code saves a long tool result here and reads it back; other chats' transcripts stay out
const READ_TOOLS = new Set(['Read', 'Glob', 'Grep', 'LS', 'NotebookRead']);
const EDIT_TOOLS = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit']);
const FREE_TOOLS = new Set(['TodoWrite', 'Task', 'Agent', 'Skill', 'ToolSearch', 'WebSearch', 'WebFetch', 'BashOutput', 'KillBash', 'KillShell', 'TaskOutput', 'TaskStop', 'Monitor', 'ListMcpResourcesTool', 'ReadMcpResourceTool', 'ReadMcpResourceDirTool', 'EnterPlanMode', 'ExitPlanMode', 'TaskCreate', 'TaskUpdate', 'TaskList', 'TaskGet', 'ReadNotifications']);

const allow = reason => ({ decision: 'allow', reason });
const ask = (label, reason) => ({ decision: 'ask', label, reason });
const deny = reason => ({ decision: 'deny', reason });

export function classify(tool, input = {}, ctx = {}) {
  const R = roots(ctx), t = String(tool || '');
  if (FREE_TOOLS.has(t)) return allow('reads, plans or delegates');
  if (READ_TOOLS.has(t)) {
    const p = input.file_path || input.path || input.notebook_path;
    if (!p || inside(p, R.read, ctx) || (t === 'Read' && TOOL_RESULT.test(resolveFrom(p, ctx)))) return allow('reads inside the office');
    return ask(`Read outside the office: ${p}`, 'reads a file outside the repo and the Brain');
  }
  if (EDIT_TOOLS.has(t)) {
    const p = input.file_path || input.notebook_path || '';
    if (!p || !inside(p, R.write, ctx)) return ask(`${t === 'Write' ? 'Write' : 'Edit'} a file outside the office: ${p || '(no path)'}`, 'changes a file outside the repo and the Brain');
    if (protectedFile(p)) return ask(`Change ${path.basename(p)}, which sets what Claude Code may do`, 'changes the box\'s own rules or Claude Code settings');
    const text = [input.content, input.old_string, input.new_string, ...(input.edits || []).flatMap(e => [e.old_string, e.new_string])].filter(Boolean).join('\n');
    if (/office\.config(\.local)?\.json$/i.test(p) && (t === 'Write' || SECURITY_KEYS.test(text))) return ask(`Change the office's security settings in ${path.basename(p)}`, 'changes who may use the office or what the agents may write');
    return allow('edits inside the office');
  }
  if (t === 'Bash' || t === 'PowerShell') return shell(String(input.command || ''), ctx, R);
  if (t.startsWith('mcp__')) return mcpTool(t, ctx);
  return ask(`Use the tool ${t}`, 'a tool the box does not know');
}

// MCP tools: email sending never; reading freely; anything else (create, post, update, pay, send) asks
// a read is a tool whose name has a reading verb and no changing one ("brain_read", "list_events"); "resolve_comment_thread" asks
const MAIL_SEND = /(^|_)(send|reply|forward|reply_all)(_|$)/i;
const READ_VERB = /^(get|list|search|read|fetch|find|describe|query|view|look|lookup|measure|summary|preview|count|inspect|show|browse|audit|guide|schema|status|whoami|doctor|download)$/i;
const CHANGE_VERB = /^(create|update|delete|remove|send|post|reply|forward|resolve|set|add|move|trash|untrash|label|unlabel|mark|unmark|apply|upload|share|publish|schedule|unschedule|submit|edit|write|copy|merge|import|export|duplicate|cancel|respond|request|run|build|render|fix|deliver|launch|exec|save|autofill|generate|separate|comment|append|clear|insert|batch)$/i;
function mcpTool(t, ctx) {
  const m = /^mcp__(.+?)__(.+)$/.exec(t); if (!m) return ask(`Use ${t}`, 'an unknown connector tool');
  const [, server, name] = m, words = name.split(/[_-]+/);
  const mail = /mail|outlook|inbox/i.test(server) || (ctx.mailServers || []).includes(server);
  if (MAIL_SEND.test(name) && mail) return deny('Email is never sent from the office. Make a Gmail draft; Wesley sends it from his inbox.');
  if (/telegram/i.test(server)) return ask(`Send a Telegram message (${name})`, 'sends a message');
  if (words.some(w => READ_VERB.test(w)) && !words.some(w => CHANGE_VERB.test(w))) return allow('reads through a connector');
  return ask(`Use ${name.replace(/_/g, ' ')} on ${server.replace(/^claude_ai_/, '')}`, 'a connector action that creates, changes, sends, posts or pays');
}

/* ---------- the shell ---------- */
// interpreters with inline code: reading code passes; code that writes, deletes, runs programs or reaches the network asks
const DYNAMIC_CODE = /\beval\b|Function\s*\(|\bimport\s*\(|globalThis\s*\[|window\s*\[|global\s*\[|process\s*\[|fromCharCode|\batob\b|base64|\\x[0-9a-f]{2}|\\u00|['"`]\s*\+\s*['"`]|__import__|getattr|\bexec\s*\(|\bcompile\s*\(|homedir|USERPROFILE|APPDATA|\bHOME\b|process\.env|environ|expanduser|getenv|\.\.[\\/]/i; // code that builds names or paths at run time, or reaches outside: cannot be read before it runs
const RISKY_CODE = /child_process|execSync|execFile|spawn|\bexec\s*\(|unlink|rmSync|rmdirSync|\brm\s*\(|rename|writeFile|appendFile|copyFile|cpSync|mkdirSync|createWriteStream|\bfetch\s*\(|https?\.(get|request)|require\(['"]https?['"]\)|from ['"]node:https?['"]|\bnet\.|dgram|process\.kill|os\.system|subprocess|shutil|os\.remove|os\.rename|\.write_text|\.write_bytes|open\([^)]*['"][wa]|urllib|requests\./i;
const READ_CMDS = new Set('ls dir cat type head tail grep egrep fgrep rg find wc sort uniq cut awk sed echo printf pwd cd pushd popd test [ true false which where date sleep diff cmp file stat du df tree jq basename dirname realpath readlink less more column tr nl fold rev comm paste md5sum sha1sum sha256sum cksum xxd od hexdump strings seq yes env printenv whoami hostname uname tput clear exit get-childitem gci get-content gc select-string sls test-path get-item gi get-itemproperty gp measure-object measure select-object select where-object foreach-object % sort-object format-table ft format-list fl out-string out-null convertfrom-json convertto-json write-output write-host echo get-date start-sleep get-process gps ps get-nettcpconnection resolve-path rvpa split-path join-path get-filehash get-command gcm get-location gl set-location sl get-acl get-member gm get-volume get-psdrive group-object compare-object get-unique ffprobe'.split(' '));
const WRITE_CMDS = new Set('mkdir md touch cp copy copy-item cpi tee out-file set-content sc add-content ac new-item ni ffmpeg magick ln mklink'.split(' '));
const MOVE_DEL = new Set('rm del erase rmdir rd remove-item ri unlink rimraf mv move move-item mi ren rename rename-item rni'.split(' '));
const INTERP = new Set(['node', 'python', 'python3', 'py', 'deno', 'bun']);
const WRAPPERS = new Set(['powershell', 'pwsh', 'bash', 'sh', 'cmd', 'zsh']);
const SYSTEM = new Set('reg regedit setx netsh sc.exe schtasks set-executionpolicy bcdedit icacls takeown cacls set-itemproperty new-itemproperty remove-itemproperty new-netfirewallrule set-netfirewallrule set-mppreference add-mppreference dism enable-windowsoptionalfeature disable-windowsoptionalfeature wsl runas sudo shutdown restart-computer stop-computer net net1 sfc diskpart format chkdsk attrib set-service stop-service start-service new-service register-scheduledtask unregister-scheduledtask set-dnsclientserveraddress new-localuser add-localgroupmember'.split(' '));
const INSTALL = new Set('winget choco scoop msiexec pip pip3 pipx uv conda install-module install-package install-script cargo gem apt apt-get brew'.split(' '));
const NET = new Set('curl curl.exe wget invoke-webrequest iwr invoke-restmethod irm start-bitstransfer scp ssh sftp ftp rsync nc ncat telnet'.split(' '));
const KILL = new Set('kill taskkill stop-process spps pkill killall'.split(' '));
const RISKY_SCRIPT = /release|telegram|notify|send|push|publish|deploy|delete|clean|reset|storage|wipe|uninstall|install|shutdown/i;
const GIT_OK = new Set('status diff log show add commit rev-parse ls-files blame grep shortlog describe fetch check-ignore cat-file merge-base for-each-ref show-ref ls-tree count-objects whatchanged reflog version help'.split(' '));

function words(seg) { // a shell-ish split that keeps quoted text together
  const out = []; let cur = '', q = null;
  for (const c of seg) {
    if (q) { if (c === q) q = null; else cur += c; continue; }
    if (c === '"' || c === "'") { q = c; continue; }
    if (/\s/.test(c)) { if (cur) out.push(cur), cur = ''; continue; }
    cur += c;
  }
  if (cur) out.push(cur); return out;
}
const looksPath = w => /^(~|[a-z]:[\\/]|\/[a-z]\/|\/|\.\.?[\\/]|\.\.$)/i.test(w) || (/[\\/]/.test(w) && !/^-|^https?:|=/.test(w) && !/[*?{}$<>|]/.test(w.replace(/\*+$/, '')));
const pathsIn = ws => ws.filter(w => !w.startsWith('-') && looksPath(w)).map(w => w.replace(/^[a-z-]+:(?=[a-z]:)/i, ''));

// split on the separators the shell acts on, outside quotes; command substitutions inside double quotes are returned apart
function split(cmd) {
  const segs = [], subs = []; let cur = '', q = null;
  const cut = () => { if (cur.trim()) segs.push(cur.trim()); cur = ''; };
  for (let i = 0; i < cmd.length; i++) {
    const c = cmd[i], n = cmd[i + 1];
    if (q === "'") { cur += c; if (c === "'") q = null; continue; }
    if (q === '"') {
      if (c === '\\' && n) { cur += c + n; i++; continue; }
      if (c === '$' && n === '(') { let d = 0, j = i + 1; for (; j < cmd.length; j++) { if (cmd[j] === '(') d++; else if (cmd[j] === ')' && --d === 0) break; } subs.push(cmd.slice(i + 2, j)); cur += 'SUB'; i = j; continue; }
      if (c === '`') { const j = cmd.indexOf('`', i + 1); subs.push(cmd.slice(i + 1, j < 0 ? cmd.length : j)); cur += 'SUB'; i = j < 0 ? cmd.length : j; continue; }
      cur += c; if (c === '"') q = null; continue;
    }
    if (c === "'" || c === '"') { q = c; cur += c; continue; }
    if (c === '&' && (cmd[i - 1] === '>' || n === '>')) { cur += c; continue; } // 2>&1, &> file
    if (/[;\n|&(){}`]/.test(c) || (c === '$' && n === '(')) { cut(); if (c === '$') i++; continue; }
    cur += c;
  }
  cut(); return { segs, subs };
}
function heredocs(cmd) { const bodies = []; const text = cmd.replace(/<<-?\s*(['"]?)(\w+)\1([^\n]*)\n([\s\S]*?)\n\s*\2\b/g, (m, q, tag, rest, body) => { bodies.push(body); return `<<HEREDOC${bodies.length - 1}${rest}`; }); return { text, bodies }; }

export function shell(command, ctx = {}, R = roots(ctx)) {
  const g = guard(command); // the repo's guard: catastrophic deletes and disk wipes are refused outright; the rest of its cases are asked again below
  if (g.decision === 'deny' && !/Push only with/.test(g.reason)) return deny(g.reason);
  const { text, bodies } = heredocs(String(command).replace(/(?:^|\s)(?:-m|--message)(?:\s+|=)("(?:[^"\\]|\\.)*"|'[^']*')/g, ' -m MSG'));
  const { segs, subs } = split(text);
  for (const sub of subs) { const r = shell(sub, ctx, R); if (r.decision !== 'allow') return r; } // $( … ) and `…` inside double quotes still run
  let first = null;
  for (const seg of segs) {
    const r = segment(seg, ctx, R, bodies);
    if (r.decision === 'deny') return r;
    if (r.decision === 'ask' && !first) first = r;
  }
  if (!first && g.decision === 'ask') first = ask(g.reason, 'the repo guard asks for this');
  return first || allow('routine shell command');
}

function segment(seg, ctx, R, bodies) {
  let ws = words(seg).filter(w => !/^\d?>&?\d?$/.test(w));
  const cmdText = seg.slice(0, 160);
  // a path from a variable ($HOME, $env:USERPROFILE, %APPDATA%, ${X}) cannot be checked before it runs
  if (/\$\{|\$(env:|home\b|userprofile\b|appdata\b|localappdata\b|programdata\b|temp\b|tmp\b|pwd\b|oldpwd\b|systemroot\b|windir\b)|%[a-z_]+%/i.test(seg)) return ask(`Use a path from a variable: ${cmdText}`, 'a path that cannot be checked before it runs');
  while (ws.length && (/^[A-Za-z_][A-Za-z0-9_]*=/.test(ws[0]) || ws[0] === '&' || ws[0] === 'then' || ws[0] === 'do' || ws[0] === 'else' || ws[0] === 'time')) { // FOO=1 cmd · PowerShell's & · loop bodies
    const a = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(ws[0]);
    if (a && ws.length > 1 && !/^(CI|NO_COLOR|FORCE_COLOR|DEBUG|CHECK_LIVE|LANG|LC_ALL|TZ|PORT)$/.test(a[1])) return ask(`Run with ${a[1]} set: ${cmdText}`, 'an environment variable can change what a program runs (pager, editor, node options)');
    if (a && looksPath(a[2]) && !inside(a[2], R.read, ctx)) return ask(`Use files outside the office: ${a[2]}`, 'touches a path outside the repo and the Brain');
    ws.shift();
  }
  if (!ws.length) return allow('');
  if (/^(if|for|while|fi|done|esac|case|function)$/.test(ws[0])) return allow('');
  const raw = ws[0], prog = lower(path.basename(winPath(raw))).replace(/\.(exe|cmd|bat|ps1)$/, ''), args = ws.slice(1);
  // redirections write: > file, >> file, Out-File handled as a write command
  const redirs = [...seg.matchAll(/(?:^|[^0-9&])>>?\s*("[^"]+"|'[^']+'|[^\s;|&]+)/g)].map(m => m[1].replace(/^["']|["']$/g, '')).filter(f => !/^(\/dev\/null|nul|\$null|&\d)$/i.test(f));
  for (const f of redirs) if (!inside(f, R.write, ctx)) return ask(`Write outside the office: ${f}`, 'writes a file outside the repo and the Brain');
  const ps = pathsIn(args);
  const outside = ps.filter(p => !inside(p, R.read, ctx));
  // the box's own rules, Claude Code settings and the office config: a shell write to them asks (an Edit is checked by classify)
  const writes = WRITE_CMDS.has(prog) || prog === 'sed' && args.some(a => /^-i/.test(a)) || /^(perl|ruby)$/.test(prog);
  const touched = [...redirs, ...(writes ? [...ps, ...args.filter(a => !a.startsWith('-'))] : [])];
  const guarded = touched.find(f => protectedFile(f) || /office\.(config|agents)(\.local)?\.json$/i.test(f));
  if (guarded) return ask(`Change ${path.basename(winPath(guarded))} from the shell`, 'changes the box\'s own rules, Claude Code settings or the office config');
  if (WRAPPERS.has(prog)) { // powershell -Command "…" / bash -c "…": check what it runs
    const i = args.findIndex(a => /^-(c|command|encodedcommand|e|ec|file|f)$/i.test(a));
    if (i < 0) return ask(`Start a shell: ${cmdText}`, 'starts a shell with nothing to check');
    if (/^-(encodedcommand|e|ec)$/i.test(args[i])) return ask(`Run an encoded PowerShell command`, 'cannot be read before it runs');
    if (/^-(file|f)$/i.test(args[i]) && /powershell|pwsh/.test(prog)) return script(args[i + 1], args.slice(i + 2), ctx, R, cmdText);
    return shell(args.slice(i + 1).join(' '), ctx, R);
  }
  if (outside.length && !NET.has(prog)) return ask(`Use files outside the office: ${outside[0]}`, 'touches a path outside the repo and the Brain');
  if (prog === 'git') return git(args, cmdText);
  if (prog === 'npm' || prog === 'npm.cmd') return npm(args, cmdText);
  if (prog === 'npx') return npx(args, ctx, cmdText);
  if (INTERP.has(prog)) return interp(prog, args, seg, ctx, R, bodies, cmdText);
  if (NET.has(prog)) return net(prog, args, seg, cmdText);
  if (INSTALL.has(prog) || (prog === 'cargo' || prog === 'go') && args[0] === 'install') return ask(`Install software: ${cmdText}`, 'installs software');
  if (SYSTEM.has(prog)) return ask(`Change system settings: ${cmdText}`, 'changes system or security settings');
  if (KILL.has(prog)) return ask(`Stop a program: ${cmdText}`, 'stops a running program');
  if (prog === 'start-process' || prog === 'saps' || prog === 'start' || prog === 'invoke-item' || prog === 'ii' || prog === 'explorer') return ask(`Start a program: ${cmdText}`, 'starts a program outside the box');
  if (prog === 'invoke-expression' || prog === 'iex' || prog === 'eval' || prog === 'xargs' || prog === 'source' || prog === '.') return ask(`Run generated commands: ${cmdText}`, 'runs commands that cannot be read first');
  if (MOVE_DEL.has(prog)) {
    const targets = ps.length ? ps : args.filter(a => !a.startsWith('-'));
    if (targets.length && targets.every(p => inside(p, R.scratch, ctx))) return allow('tidies the scratch folder');
    return ask(`${/^(mv|move|move-item|mi|ren|rename|rename-item|rni)$/.test(prog) ? 'Move or rename' : 'Delete'}: ${cmdText}`, 'deletes or moves files outside the scratch folder');
  }
  if (prog === 'sed' && args.some(a => /^-i/.test(a))) return allow('edits a file inside the office');
  if (prog === 'find' && args.some(a => /^-(delete|exec|execdir|ok|fprint)/.test(a))) return ask(`Find and change files: ${cmdText}`, 'find with -delete or -exec');
  if (prog === 'awk' && /system\s*\(|\|\s*"/.test(seg)) return ask(`Run commands from awk: ${cmdText}`, 'awk that runs programs');
  if (prog === 'tailscale') return /^(status|ip|whois|version|netcheck)$/.test(args[0] || '') || (/^(serve|funnel)$/.test(args[0]) && args[1] === 'status') ? allow('reads Tailscale') : ask(`Change Tailscale: ${cmdText}`, 'changes who can reach this PC');
  if (prog === 'gh') return /^(view|list|status|diff|checks)$/.test(args[1] || '') || args[0] === 'status' || args[0] === 'auth' && args[1] === 'status' ? allow('reads GitHub') : ask(`GitHub: ${cmdText}`, 'acts on GitHub');
  if (prog === 'claude') return /^(--version|-v|--help)$/.test(args[0] || '') || (args[0] === 'mcp' && /^(list|get)$/.test(args[1] || '')) ? allow('reads Claude Code') : ask(`Run Claude Code itself: ${cmdText}`, 'changes Claude Code or starts another session');
  if (READ_CMDS.has(prog) || WRITE_CMDS.has(prog)) return allow('routine shell command'); // their paths were checked above
  return ask(`Run ${prog}: ${cmdText}`, 'a program the box does not know');
}

function git(args, cmdText) {
  const a = args.filter((x, i) => !(i === 0 && x === '--no-pager')); let i = 0;
  if (a.some(x => /^(-c|--config-env|--exec-path|--git-dir|--work-tree|--namespace)(=|$)/.test(x))) return ask(`git with settings changed for this command: ${cmdText}`, 'git -c can run any program (core.pager, core.sshCommand)');
  if (a.some(x => /^(--output|--ext-diff|--textconv|--upload-pack|--receive-pack|--exec)(=|$)|^-o$/.test(x))) return ask(`git with an option that writes or runs: ${cmdText}`, 'writes a file or runs a helper program');
  while (a[i] && a[i].startsWith('-')) i += (a[i] === '-C' ? 2 : 1); // git -C dir status
  const sub = a[i] || '', rest = a.slice(i + 1);
  if (sub === 'push') return ask(`Push to GitHub: ${cmdText}`, 'git push');
  if (sub === 'commit') return rest.some(x => /^(--amend|--no-verify|-n)$/.test(x)) ? ask(`Rewrite or skip checks on a commit: ${cmdText}`, 'amend or no-verify') : allow('commits');
  if (sub === 'apply') return rest.some(x => x === '-R' || x === '--reverse') ? ask(`Reverse a patch: ${cmdText}`, 'undoes changes') : allow('applies a patch');
  if (sub === 'branch') return rest.length === 0 || rest.every(x => /^(--show-current|-a|-r|-v|-vv|--list|--merged|--no-merged|--contains)$/.test(x)) ? allow('lists branches') : ask(`Change branches: ${cmdText}`, 'creates, renames or deletes a branch');
  if (sub === 'stash') return /^(list|show)$/.test(rest[0] || '') ? allow('reads the stash') : ask(`Stash: ${cmdText}`, 'other sessions share this folder: a stash takes their work too');
  if (sub === 'remote') return rest.every(x => x === '-v' || x === 'show' || x === 'get-url' || !x.startsWith('-') && rest[0] !== 'add' && rest[0] !== 'remove' && rest[0] !== 'set-url' && rest[0] !== 'rename') ? allow('reads remotes') : ask(`Change git remotes: ${cmdText}`, 'changes where git pushes');
  if (sub === 'config') return rest.some(x => /^(--get|--list|-l|--get-all|--show-origin)$/.test(x)) ? allow('reads git config') : ask(`Change git config: ${cmdText}`, 'changes git settings');
  if (sub === 'tag' && rest.every(x => /^(-l|--list|-n)$/.test(x))) return allow('lists tags');
  if (sub === 'worktree' && rest[0] === 'list') return allow('lists worktrees');
  if (GIT_OK.has(sub)) return allow('reads or commits');
  const what = /^(reset|checkout|switch|restore|clean|rebase|merge|pull|cherry-pick|revert|rm|mv|filter-branch|gc|prune|update-ref)$/.test(sub) ? 'changes the working tree or history' : 'a git command the box does not know';
  return ask(`git ${sub}: ${cmdText}`, what);
}
function npm(args, cmdText) {
  const sub = args[0] || '';
  if ((sub === 'run' || sub === 'run-script') && /^(check|build|graph|media|test|lint)$/.test(args[1] || '')) return allow('runs the office\'s own checks and builds');
  if (sub === 'test' || sub === 't') return allow('runs tests');
  if (/^(ls|list|view|outdated|help|--version|-v|config|root|bin|prefix|explain|why|audit)$/.test(sub) && !(sub === 'config' && /^(set|delete|edit)$/.test(args[1] || '')) && !(sub === 'audit' && args[1] === 'fix')) return allow('reads npm');
  if (/^(i|install|ci|add|uninstall|remove|rm|un|update|up|upgrade|link|exec|x|init|create|dedupe|prune|rebuild)$/.test(sub)) return ask(`Install or change packages: ${cmdText}`, 'installs software');
  if (/^(publish|unpublish|deprecate|dist-tag|owner|access|adduser|login|logout|token)$/.test(sub)) return ask(`Publish to npm: ${cmdText}`, 'publishes');
  return ask(`npm ${sub} ${args[1] || ''}: ${cmdText}`, 'an npm script the box does not know');
}
function npx(args, ctx, cmdText) { // a package already in the repo runs; anything npx would download asks
  const pkg = (args.find(a => !a.startsWith('-')) || '').replace(/@[^/]*$/, '');
  const local = ['hyperframes', 'esbuild', 'playwright', 'playwright-core', 'tsc', 'prettier', 'eslint'];
  if (args.some(a => a === '-y' || a === '--yes' || a === '-p' || a === '--package')) return ask(`Download and run a package: ${cmdText}`, 'installs software');
  if (local.includes(pkg)) return allow('runs a tool the repo already has');
  return ask(`Download and run ${pkg || 'a package'}: ${cmdText}`, 'installs software');
}
function interp(prog, args, seg, ctx, R, bodies, cmdText) {
  const i = args.findIndex(a => /^(-e|--eval|-p|--print|-c|-)$/.test(a));
  const hd = /<<HEREDOC(\d+)/.exec(seg);
  if (args.length === 0 && !hd || /^(--version|-v|-V|--help)$/.test(args[0] || '')) return args.length ? allow('version') : ask(`Start ${prog} with code piped in: ${cmdText}`, 'code that cannot be read first');
  if (i >= 0 || hd) {
    const code = hd ? bodies[+hd[1]] || '' : args.slice(i + 1).join(' ');
    if (RISKY_CODE.test(code)) return ask(`Run ${prog} code that writes, deletes or reaches out: ${cmdText}`, 'inline code that changes files, runs programs or uses the network');
    if (DYNAMIC_CODE.test(code)) return ask(`Run ${prog} code that builds names or paths at run time: ${cmdText}`, 'inline code that cannot be read before it runs, or reaches outside the office');
    const lits = [...code.matchAll(/(['"`])((?:(?!\1)[^\\\n]|\\.)*)\1/g)].map(x => x[2].replace(/\\\\/g, '\\')).filter(x => looksPath(x) || /^[a-z]:[\/]/i.test(x));
    const out = lits.find(x => !inside(x, R.read, ctx)); if (out) return ask(`Run ${prog} code that reads outside the office: ${out}`, 'inline code that touches a path outside the repo and the Brain');
    return allow('inline code that only reads inside the office');
  }
  const file = args.find(a => !a.startsWith('-'));
  if (prog === 'python' || prog === 'python3' || prog === 'py') { if (args[0] === '-m' && /^(pip|venv|ensurepip)$/.test(args[1] || '')) return ask(`Install Python packages: ${cmdText}`, 'installs software'); }
  return script(file, args.slice(args.indexOf(file) + 1), ctx, R, cmdText);
}
function script(file, rest, ctx, R, cmdText) {
  if (!file) return ask(`Run: ${cmdText}`, 'nothing to check');
  const f = winPath(file);
  if (!inside(f, R.write, ctx)) return ask(`Run a script outside the office: ${file}`, 'runs code from outside the repo');
  if (/restart-office\.mjs$/i.test(f)) return allow('restarts the office (checks no task is running first)');
  if (/serve\.mjs$/i.test(f)) return ask(`Start a second office server: ${cmdText}`, 'use scripts/restart-office.mjs to restart the office');
  if (RISKY_SCRIPT.test(path.basename(f)) || rest.some(a => /^--(push|send|post|publish|delete|force)/.test(a))) return ask(`Run ${path.basename(f)}: ${cmdText}`, 'a script that sends, publishes or deletes');
  if (/telegram-tools\.ps1$/i.test(f)) return ask(`Telegram tools: ${cmdText}`, 'sends messages or sleeps or shuts down the PC');
  try { if (ctx.runStart && fs.statSync(resolveFrom(f, ctx)).mtimeMs >= ctx.runStart - 2000) return ask(`Run ${path.basename(f)}, which this run just wrote or changed: ${cmdText}`, 'new code: read it before it runs'); } catch {}
  return allow('runs a script in the repo');
}
function net(prog, args, seg, cmdText) {
  const urls = args.filter(a => /^https?:\/\//i.test(a) || /^(localhost|127\.0\.0\.1)(:\d+)?\//i.test(a));
  const local = urls.length && urls.every(u => /^(https?:\/\/)?(localhost|127\.0\.0\.1|\[::1\])(:\d+)?(\/|$)/i.test(u));
  const sends = /(^|\s)(-X|--request|-d|--data[\w-]*|-F|--form|--json|-T|--upload-file|-Method|-Body|-InFile|-o|--output|-O|-OutFile)(\s|=|$)/i.test(seg);
  if (local && !sends) return allow('reads the office\'s own pages');
  if (local) return ask(`Act on the office through its API: ${cmdText}`, 'posts to the office (approving or changing tasks is Wesley\'s)');
  return ask(`Reach the internet: ${cmdText}`, 'downloads, uploads or sends outside this PC (WebFetch reads pages without asking)');
}
