# Handover, 3 Nov 2026: Tokens section, Telegram send path, Imran's visit page

Nothing below is committed. The last commit is f1900ae, which is not pushed. Other sessions have uncommitted edits of their own in `check.mjs`, `serve.mjs` and `social.mjs`. Leave those alone.

## Where things stand

**AIOS Tokens section** (`src/aios.html`, `tokens.mjs`): done.
- The coach card and the chats table are in commit f1900ae.
- New today: the chats table lists only chats used in the last 24 hours, with the biggest 12 first and a SHOW ALL toggle.
- Older chats fold into an "Older than 24 hours" bar, hidden until SHOW. They stay in the totals.
- Wesley's intent: he checks the list once a day and moves any chat that is getting big to a fresh one.
- `tokens.mjs` now always sends every chat from the last 24 hours, even past the top 40. That change loads on the next office restart; the page part is live already.

**Telegram, office side**: done; needs an office restart to be certain.
- The EMAILS lead could not send the Portugal Stories captions. The plugin's reply tool needs a chat ID, and desks are never given one.
- New user-scope MCP server `telegram-send` (`connectors/telegram-send/mcp.mjs`). It has two tools, `telegram_send` and `telegram_send_file`. Both can reach only the allow-listed chat.
- The Telegram plugin is switched off in `~/.claude/settings.json`, so office runs, `claude mcp list` and desktop sessions never start a copy that competes for the bot. The `TELEGRAM_STATE_DIR` trick in `mcp.freshEnv` was removed (see the listener section).
- `office.config.local.json` hides and denies `plugin_telegram_telegram`.
- `npm run check`: 82/82.
- Still to do:
  - Re-run the matrix card "Send Wesley the three Portugal Stories captions on Telegram". That run is the end-to-end test of `telegram_send`.
  - Then mark the "Supply Wesley's Telegram chat ID" card done.

**Telegram listener**: fixed by session `local_c3924384-2a97-4ce5-90da-ef3e2d50543f`. Waiting on Wesley's "status" test.
- Cause: Claude Code's failure cache, `~/.claude/mcp-needs-auth-cache.json`, is shared by every session. Office runs failed the plugin on purpose, which kept the cache entry fresh. Every session, the listener included, then skipped Telegram for 15 minutes, over and over.
- Fix: only the listener turns the plugin on, with `--settings scripts/telegram-listener.settings.json`. `scripts/telegram-channel.ps1` also clears the cached failure before every launch.
- Verified: the listener's own bun process holds `bot.pid`, and the plugin log says "Channel notifications registered".
- Never make the plugin fail on purpose again. Full notes are in memory note `telegram-listener-deaf`.
- Don't run the desktop-bundled `claude.exe` directly: it installed a native CLI (undone).

**Imran's Diner visit page**: done, by session `local_e8724361-5d1b-4c2c-bfeb-67bfb2310baa`.
- Visit page: https://claude.ai/artifact/VkBYkfEUjjeUHpjBkdVyG8, source `sites/imrans-diner-visit/index.html`.
- Thursday is 15 blocks and ends on T13 evening prep, T14 live evening service, T15 close-out. Friday is F1–F11.
- Questions come from Imran's Operations Manual. Pain log is ranked by severity × frequency. Pay-deduction findings are office-review only.
- The v3 Agenda Google Doc (1DX91uLng3t_ET6rEldP7OI54PKpfxvprHk7XM4NaYSs) matches the page word for word.
- Phone camera untested. After the visit (5–6 Nov), read the notes back from the artifact's db, as memory note `imrans-diner-site-visit` describes.

## Next

1. Restart the office (`npm start`). Re-run the Portugal captions card to check that `telegram_send` reaches Wesley.
2. Have Wesley send "status" on Telegram to confirm the listener answers.
3. Commit when Wesley asks:
   - `mcp.mjs`, `notify.mjs`, `connectors/telegram-send/`, `tokens.mjs`, `src/aios.html`
   - `sites/imrans-diner-visit/`
   - this note
