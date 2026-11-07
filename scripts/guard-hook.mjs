// Claude Code PreToolUse hook for Bash and PowerShell (5 Nov 2026): stops the shell slips that are costly in THIS repo.
// "deny" refuses the command; "ask" makes Claude Code stop and ask Wesley. Anything else passes. Best-effort string matching on
// the command text, not a security boundary. The design (two tiers, fail closed on an unreadable payload) follows gstack's /careful
// (MIT, (c) 2026 Garry Tan); the rules are ours, from CLAUDE.md. The rules are the checks below, in order.
// Wiring (not done by this file): a PreToolUse entry in .claude/settings.local.json, matcher "Bash|PowerShell".
import { fileURLToPath } from 'node:url';

const norm = s => s.toLowerCase().replace(/\\/g, '/').replace(/\s+/g, ' ');
const DELETE = /(?:^|[\s;|&(])(?:rm|del|erase|rmdir|rd|remove-item|ri|unlink|rimraf)(?=\s)/;
const RECURSIVE = /(?:\s-[a-z]*r[a-z]*\b|\s\/s\b|\s-recurse\b|\s--recursive\b)/;

// Paths whose loss is expensive: the heavy-media junctions to D:, the office data, the Brain, the owner's local config.
const PROTECTED = [
  [/agents office media/, 'the heavy-media folder on D: (a recursive delete through a junction removes the real files on D:)'],
  [/(?:^|[\s"'/])output\/(?:motion|library|blender|video|ltx|music|sops|teleprompter)(?=\/?\*?(?:["'\s]|$))/, 'an output/ folder that is a junction to D: (or everything in it)'],
  [/videos\/[^\s"']*\/(?:renders|out[\w.-]*|proxies[\w.-]*|stills|footage|frames|work|music-samples)(?=\/?\*?(?:["'\s]|$))/, 'a videos/ media folder that is a junction to D: (or everything in it)'],
  [/(?:^|[\s"'/])data\/[^\s"']*\.json/, 'a data/*.json state file (tasks, routines, interviews)'],
  [/data\/brain-backups/, 'data/brain-backups (the only undo for a Brain filing)'],
  [/agents office brain/, 'the Brain'],
  [/office\.(?:agents|config)\.local\.json/, "the owner's local office config"],
  [/\.claude\/(?:projects|hooks|settings)/, "Claude Code's own memory, hooks or settings"],
];

function gitPush(seg) {
  const m = seg.match(/(?:^|[\s;|&(])git(?:\s+-[^\s]+(?:\s+[^\s-][^\s]*)?)*\s+push\b(.*)$/);
  if (!m) return null;
  const args = m[1].trim().split(' ').filter(Boolean);
  const plain = args.filter(a => !a.startsWith('-'));
  const remote = plain[0];
  if (remote !== 'fork') return { decision: 'deny', reason: 'Push only with `git push fork main`. A bare push or a push to origin goes to AJ Sahni\'s repo.' };
  if (args.some(a => /^(-f|--force.*|--mirror|--all|--delete|-d)$/.test(a) || a.startsWith('+')) || plain.some(a => a.startsWith('+') || a.startsWith(':')))
    return { decision: 'ask', reason: 'Force, mirror or delete push to the fork rewrites or removes history there.' };
  return null;
}

function checkSegment(seg) {
  if (/scripts\/telegram-tools\.ps1/.test(seg)) return null; // the one command set a Telegram message may run; its shutdown has its own CONFIRM step

  const push = gitPush(seg);
  if (push) return push;

  // Catastrophic: a recursive delete aimed at a root, a drive, the home folder or the Windows folder.
  if (DELETE.test(seg) && RECURSIVE.test(seg) &&
      /(?:^|\s)(?:\/|~|\$home|\$env:userprofile|[a-z]:\/?|[a-z]:\/windows\/?|[a-z]:\/users\/?|[a-z]:\/users\/[^/\s]+\/?|\/c\/users\/[^/\s]+\/?)(?=\s|$|"|')/.test(seg))
    return { decision: 'deny', reason: 'Recursive delete of a root, drive, home or Windows folder.' };
  if (/(?:^|[\s;|&(])(?:format(?:-volume)?|diskpart|clear-disk|mkfs[\w.]*|dd\s+if=.*of=\/dev)(?=\s|$)/.test(seg))
    return { decision: 'deny', reason: 'Disk-wipe command.' };

  if (/git(?:\s+-[^\s]+)*\s+(?:reset\s+--hard|clean\s+-[a-z]*f|restore\s+(?:\.(?=\s|$)|--worktree|-s\b)|checkout\s+(?:--\s|\.(?:\s|$))|branch\s+-d\b|stash\s+(?:drop|clear))/.test(seg))
    return { decision: 'ask', reason: 'This discards uncommitted work or a branch. This repo usually has many uncommitted files.' };

  if (/release\.mjs/.test(seg) && /--push/.test(seg)) return { decision: 'ask', reason: 'Release is owner-only and publishes.' };
  if (/(?:^|[\s;|&(])npm\s+publish\b|gh\s+repo\s+delete\b/.test(seg)) return { decision: 'ask', reason: 'Publishes or deletes outside this machine.' };
  if (/(?:^|[\s;|&(])(?:shutdown|restart-computer|stop-computer)(?=\s|$)/.test(seg)) return { decision: 'ask', reason: 'Turns the PC off. Telegram cannot turn it back on.' };
  if (/(?:taskkill|stop-process|pkill|killall)\b.*\b(?:node|claude)\b/.test(seg)) return { decision: 'ask', reason: 'Would stop the office server or the Telegram listener.' };

  if (DELETE.test(seg)) {
    for (const [re, what] of PROTECTED) if (re.test(seg)) return { decision: 'ask', reason: `Deletes ${what}.` };
    if (RECURSIVE.test(seg) && /(?:^|\s)(?:\.|\*|\.\/\*|\*\.\*)(?=\s|$)/.test(seg)) return { decision: 'ask', reason: 'Recursive delete of the whole current folder.' };
  }
  return null;
}

// Pure function: used by the hook below and by scripts/guard-hook.test.mjs.
export function decide(command) {
  // Words inside a commit message or a heredoc are text, not commands: drop them before matching.
  const text = norm(String(command || '')
    .replace(/<<-?\s*(['"]?)(\w+)\1[\s\S]*?\n\s*\2\b/g, ' ')
    .replace(/(?:^|\s)(?:-m|--message)(?:\s+|=)("[^"]*"|'[^']*')/g, ' -m x'));
  let ask = null;
  for (const seg of text.split(/&&|\|\||;|\n|(?<!\|)\|(?!\|)/)) {
    const r = checkSegment(seg.trim());
    if (!r) continue;
    if (r.decision === 'deny') return r;
    ask = ask || r;
  }
  // The curl | sh rule needs the pipe, so look at the whole line once too.
  if (!ask && /(?:curl|wget|invoke-webrequest|iwr|invoke-restmethod|irm)\b.*\|\s*(?:sh|bash|zsh|iex|invoke-expression|node|python3?)\b/.test(text))
    ask = { decision: 'ask', reason: 'Runs a download straight from the internet.' };
  return ask || { decision: 'allow' };
}

function reply(decision, reason) {
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: decision, permissionDecisionReason: `[guard] ${reason}` } }));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  let raw = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', d => { raw += d; });
  process.stdin.on('end', () => {
    let j;
    try { j = JSON.parse(raw); } catch { reply('ask', 'Could not read the tool payload, so this command was not checked.'); return; }
    const command = j && j.tool_input && j.tool_input.command;
    if (typeof command !== 'string') { process.stdout.write('{}'); return; } // not a shell call
    const r = decide(command);
    if (r.decision === 'allow') process.stdout.write('{}'); else reply(r.decision, r.reason);
  });
}
