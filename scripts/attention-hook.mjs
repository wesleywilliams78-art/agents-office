// Claude Code hook → the office's "Needs you" strip (V3.12, 2 Nov 2026). Installed in the user's ~/.claude/settings.json for Stop,
// Notification, UserPromptSubmit and SessionEnd, so every Claude Code session on this PC says when it is waiting on Wesley.
// It forwards the hook's JSON to the office and always exits 0 at once: a hook must never slow down or block a session.
// The office's own agent runs carry AGENTS_OFFICE_RUN (mcp.freshEnv) and are skipped here; so is anything when the office is off.
import http from 'node:http';

if (process.env.AGENTS_OFFICE_RUN) process.exit(0);
let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', d => { raw += d; if (raw.length > 200000) raw = raw.slice(0, 200000); });
process.stdin.on('end', () => {
  let j; try { j = JSON.parse(raw); } catch { process.exit(0); }
  const body = JSON.stringify({ event: j.hook_event_name, session: j.session_id, transcript: j.transcript_path, cwd: j.cwd, message: j.message || '', entry: process.env.CLAUDE_CODE_ENTRYPOINT || '' });
  const req = http.request({ host: '127.0.0.1', port: Number(process.env.OFFICE_PORT || 4520), path: '/api/attention', method: 'POST', headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) }, timeout: 1500 },
    res => { res.resume(); res.on('end', () => process.exit(0)); });
  req.on('error', () => process.exit(0)); req.on('timeout', () => { req.destroy(); process.exit(0); });
  req.end(body);
});
setTimeout(() => process.exit(0), 2500).unref();
