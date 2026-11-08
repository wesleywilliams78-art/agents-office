// A stand-in for `claude -p` that npm run check gives the Claude Code box (CLAUDE_BOX_FAKE), so the permission path is tested with no
// Claude call: the message "TOOL <Bash command>" becomes one Bash tool call that goes through the real hook (scripts/claude-box-hook.mjs),
// with its hold, the yes or no and the 10-minute rule. Prints the same stream-json lines claude does. Nothing is ever run.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const text = fs.readFileSync(0, 'utf8'); // the box hands the message over on stdin, as claude -p reads it
const say = o => console.log(JSON.stringify(o));
const sid = 'fake-' + process.pid;
say({ type: 'system', subtype: 'init', session_id: sid });
const m = /^TOOL\s+([\s\S]+)$/.exec(text.split('\n\n(Wesley said yes')[0].trim());
if (!m) { say({ type: 'assistant', message: { content: [{ type: 'text', text: 'fake reply: ' + text.slice(0, 80) }] } }); say({ type: 'result', result: 'fake reply', session_id: sid, is_error: false }); process.exit(0); }
const input = { command: m[1].trim(), description: 'check' };
say({ type: 'assistant', message: { content: [{ type: 'tool_use', id: 't1', name: 'Bash', input }] } });
const hook = path.join(path.dirname(fileURLToPath(import.meta.url)), 'claude-box-hook.mjs');
const r = spawnSync(process.execPath, [hook], { input: JSON.stringify({ tool_name: 'Bash', tool_input: input, cwd: process.cwd(), hook_event_name: 'PreToolUse' }), encoding: 'utf8', env: process.env, timeout: 15 * 60 * 1000 });
let d = {}; try { d = JSON.parse(r.stdout).hookSpecificOutput || {}; } catch {}
const allowed = d.permissionDecision === 'allow';
say({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 't1', is_error: !allowed, content: allowed ? 'not run (fake): allowed' : `PreToolUse:Bash hook error: ${d.permissionDecisionReason || 'no decision'}` }] } });
say({ type: 'result', result: allowed ? 'ALLOWED' : 'REFUSED: ' + (d.permissionDecisionReason || ''), session_id: sid, is_error: false });
