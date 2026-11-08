// PreToolUse hook for the Claude Code box (claudebox.mjs passes it with --settings; no other Claude session has it). Every tool call
// a box run makes comes here first. claudebox-policy.mjs decides: allow runs it, deny refuses it, ask holds it in the box until
// Wesley says yes or no (10 minutes, then no). Fails closed: anything unexpected is a refusal, never a pass.
import { classify } from '../claudebox-policy.mjs';

const HOLD_MS = 10 * 60 * 1000, POLL_MS = 1500, OFFLINE_MS = 120 * 1000;
const out = (decision, reason) => { process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: decision, permissionDecisionReason: reason } })); process.exit(0); };
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  let raw = ''; for await (const d of process.stdin) raw += d;
  const j = JSON.parse(raw);
  const token = process.env.CLAUDE_BOX_TOKEN, base = process.env.CLAUDE_BOX_URL;
  if (!token || !base) return out('deny', 'This hook only runs inside the office\'s Claude Code box.');
  const ctx = { ...JSON.parse(process.env.CLAUDE_BOX_CTX || '{}'), cwd: j.cwd };
  const r = classify(j.tool_name, j.tool_input || {}, ctx);
  if (r.decision === 'allow') return out('allow', r.reason);
  if (r.decision === 'deny') return out('deny', r.reason);
  const detail = j.tool_input?.command || j.tool_input?.file_path || JSON.stringify(j.tool_input || {}).slice(0, 1500);
  const call = (p, o) => fetch(base + p, { ...o, headers: { 'content-type': 'application/json', 'x-claude-box-token': token }, signal: AbortSignal.timeout(8000) }).then(x => x.json());
  const start = Date.now(); let h = null, lastOk = Date.now();
  while (!h) { // the office may be restarting: keep trying for two minutes
    try { h = (await call('/api/claude-box/hold', { method: 'POST', body: JSON.stringify({ tool: j.tool_name, label: r.label, reason: r.reason, detail }) })).hold; if (!h) return out('deny', 'The office would not hold this for Wesley, so it did not run.'); }
    catch { if (Date.now() - start > OFFLINE_MS) return out('deny', 'The office was not reachable to ask Wesley, so this did not run.'); await sleep(3000); }
  }
  while (Date.now() - start < HOLD_MS + 30000) {
    await sleep(POLL_MS);
    let s; try { s = await call('/api/claude-box/hold?id=' + encodeURIComponent(h.id), { method: 'GET' }); lastOk = Date.now(); } catch { if (Date.now() - lastOk > OFFLINE_MS) return out('deny', 'The office stopped answering while this waited for Wesley, so it did not run.'); continue; }
    if (s.state === 'yes') return out('allow', `Wesley said yes in the box: ${r.label}`);
    if (s.state === 'no') return out('deny', `Wesley said no in the Claude Code box${s.why ? ' (' + s.why + ')' : ''}. Do not try another way to do this; say what you wanted to do and stop.`);
    if (s.state === 'expired') return out('deny', 'No answer from Wesley in 10 minutes, so this did not run. Say what you wanted to do and stop.');
  }
  return out('deny', 'No answer from Wesley in 10 minutes, so this did not run.');
}
main().catch(e => out('deny', 'The box could not check this call (' + String(e.message || e).slice(0, 120) + '), so it did not run.'));
