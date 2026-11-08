# The Claude Code box

Built 8 Nov 2026. In the office she is **Grace**, after Grace Hopper (portrait `assets/people/grace.png`); the UI says "Grace" where it treats the box as a person and "Claude Code" where it names the tool. The bottom of the For You pull-out (Office tab, red tab on the right edge) is a Claude Code chat. Type a message and the office runs Claude Code (`claude -p`) in this repo. It is the only place in the office where Claude Code gets file and shell tools. The desks still never get them.

## What it does
- **One conversation by default.** Each message resumes the last one (`--resume`). NEW CONVERSATION starts fresh. A message sent while a run is going waits in the queue (the button says QUEUE).
- **Live progress.** The box shows the step running now, then the reply. "N steps" opens the full list; a step that did not run is marked in red with the reason.
- **History survives a reload, a restart and another device.** It lives on the PC in `data/claude-box.json` (last 200 messages). Each run's raw output is in `data/claude-box/run-*.jsonl`.
- **Runs survive an office restart.** Claude is started detached with its output in a log file; the next office picks the log back up (`resumeAfterRestart`). So Claude Code can restart the office itself with `node scripts/restart-office.mjs`.
- **Grace's tab on the You pill** (Office map, bottom centre): while a step is held, her face and a speech bubble above the pill show how many are waiting, the oldest step, which department asked (when a desk did) and when it becomes a no. The tick and cross are the panel's own yes and no (same `/api/claude-box/answer` call and checks); clicking the words opens For You at that step. A department's step also gets a dashed red arrow from its tile into the tab. Nothing held, no tab.
- **STOP** ends the current run (what it already changed stays changed). A run still going after 90 minutes is stopped.

## Permissions
Every tool call goes through `scripts/claude-box-hook.mjs`, a PreToolUse hook that only box runs get (passed with `--settings`). `claudebox-policy.mjs` decides:

| Runs at once | Asks you yes / no in the box first | Never |
|---|---|---|
| Reading and searching in the repo, the Brain, the media drive, its own temp files | Deleting or moving files outside `data/claude-box/scratch` (or the temp folder) | Sending email (Gmail drafts only, the office's rule) |
| Editing and writing files in the repo and the Brain | `git push`, reset, checkout or switch, stash, rebase, amend, branch changes | A recursive delete of a drive, home or Windows folder; disk wipes (the repo guard) |
| `npm run check`, `build`, `test`, `media`; `git status / diff / log / add / commit` | Installing anything (npm install, npx of a package the repo does not have, winget, pip…) | |
| Restarting the office: `node scripts/restart-office.mjs` | System, security or Tailscale settings; changes to the box's own rules, `mcp.mjs`, `.claude/` settings or the `claudeBox` part of the office config | |
| Inline `node -e` / `python -c` code that only reads | Anything that sends, posts or pays: connector actions other than reads, Telegram, GitHub actions, any POST to the office's own API (approving is yours), anything reaching the internet from the shell | |
| Web search and web fetch; connector tools that only read | Anything outside the repo, the Brain and the media drive; any program or tool the box does not know | |

How it holds: the hook asks the office to show the question (`POST /api/claude-box/hold`, with that run's secret token), then waits for your answer. **No answer in 10 minutes is a no.** If the office is down or restarting for more than two minutes while it waits, it is a no. A no tells Claude Code not to try another way and to say what it wanted to do.

Why nothing else can let a call through: the run starts with `--permission-mode dontAsk --permission-prompts none` (anything the hook does not allow is refused, never prompted) and `--setting-sources user` (the repo's `.claude/settings.local.json` allow list does not apply; the user settings have no permission rules). The rules are a list of known-safe things: an unknown program, tool or path asks.

More that asks, from the doubt-driven review (8 Nov 2026): a shell write (`>`, `sed -i`, `Set-Content`…) to the box's rules, `.claude/` or the office config; inline code that reads outside the office, builds names at run time (`'fet'+'ch'`, `eval`, base64) or reads the home folder or environment; a path from a variable (`$HOME`, `$env:USERPROFILE`, `%APPDATA%`); `git -c …` and git options that write or run helpers; a `VAR=… command` prefix (pager, editor, `NODE_OPTIONS`); running a script this run just wrote or changed; a connector tool whose name has a changing verb (create, resolve, export…). Helper subagents go through the same hook (tested live). Email: the box also gets the office's own `--disallowedTools` email block (`mcp.blockedTools()`), so a mail connector under a new id still cannot send.

Accepted, not fixed: the box may edit code in the repo and then run `npm run check` or restart the office, which runs that code. The rules stop direct risky actions; they are not a sandbox against code written to get round them. And a program already running on this PC can call the office as "this PC".

Cases are in `scripts/claude-box.test.mjs` (90). `npm run check` runs them, and runs the hold → no → yes path end to end through the real hook with a stand-in claude (`scripts/claude-box-fake.mjs`).

## Who may use it
`boxWho()` in `serve.mjs`. Every `/api/claude-box` route (read the history, send, answer, stop, new) answers only to:
- **this PC**: a page on `localhost` / `127.0.0.1` (the Origin must be local too, so another website open in the browser cannot post to it);
- **Wesley through Tailscale Serve**: Serve proxies `https://wesgp.taild8765c.ts.net` to the office and adds `Tailscale-User-Login`. Only the logins in `office.config.local.json` → `"claudeBox": { "allowLogins": [...] }` pass, and the Host must be the `.ts.net` name. Another tailnet login, a tagged or shared device (no login header) and a page from elsewhere are refused.

Tailscale Serve is tailnet only (`tailscale funnel status` shows no Funnel). Do not turn Funnel on for this port. The office itself listens on 127.0.0.1 only.

A yes or no to a held step must come from the box on the page (a browser's fetch: `Sec-Fetch-Site: same-origin`), so another Claude session calling the API from this PC cannot answer for Wesley by accident. The same check guards approvals: a task whose card has a "Run with Grace" (`to: claude-code`, or `to: grace`) decision on Yes can only be approved by Wesley (this PC or his login).

## Desks feed it
A desk that needs Claude Code ends its result with a `DECISION` block with `to: claude-code` (skill `claude-code-prompt` in the Brain, bound to every desk; `decisions.mjs` tells every desk). The card shows it as a yes/no like any decision. On APPROVE with it on Yes, `fireDecisions` sends its text into the box; it runs as a fresh conversation, one step at a time, with the same permissions. What it did is added to that task's result ("CLAUDE CODE RAN …"). The old copy-and-paste blocks (`handoff.claudeCode`) still show for results written before 8 Nov.

## Offline
When the PC is off or asleep, or the office is not running, the box says "Office offline" and SEND is greyed. Nothing queues on the phone; type again when the PC is back.

## Settings
`office.config(.local).json` → `"claudeBox": { "allowLogins": [], "model": "", "effort": "" }`. Empty model and effort use Claude Code's own (the user settings). Changing `claudeBox` from inside the box asks first.

## Files
`claudebox.mjs` (runner, history, queue, holds) · `claudebox-policy.mjs` (the rules) · `scripts/claude-box-hook.mjs` (the hook) · `scripts/restart-office.mjs` · `scripts/claude-box.test.mjs` · `scripts/claude-box-fake.mjs` (check only) · the box in `src/aios.html` (search `gcBox`) · routes in `serve.mjs` (search `/api/claude-box`).
