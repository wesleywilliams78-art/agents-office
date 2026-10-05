# Token baseline (measured 5 Oct 2026)

Measured from Claude Code session transcripts in `C:\Users\Wesley\.claude\projects\C--Users-Wesley-agents-office\`. Re-run the same measurement after the trim and compare.

## Preload: what a new session costs before the first word
First request of the current session: **76,907 input tokens** (2 fresh + 31,661 cache creation + 45,244 cache read), on Sonnet.
Other recent sessions in this project started at 40,177 to 74,487 tokens.

## What is loaded at start, measured from disk
| item | size |
|---|---|
| Repo `CLAUDE.md` | 149 lines, 17,552 characters, about 4,400 tokens |
| User-level `CLAUDE.md` | none |
| Auto-memory `MEMORY.md` | none |
| Skill descriptions on disk (plugins and synced skills) | 46 skills, 27,778 characters, about 6,900 tokens |
| Replica pack (replica-skill plugin) | 11 skills, about 1,350 tokens |
| Hooks | none |
| Permission allow rules | 1 |
| Enabled plugins | telegram, replica-skill, buildpartner |

The rest of the preload (system prompt, built-in tool definitions, MCP server instructions and tool names) cannot be measured from disk. `/context` shows it.

## Per-session spend (assistant requests, de-duplicated by message id)
| session | requests | largest context | fresh input | cache write | cache read | output |
|---|---|---|---|---|---|---|
| baaff2d6 (the long working session, 70 MB) | 1,651 | 966,890 | 3,314 | 10,364,183 | 823,884,359 | 1,131,526 |
| 873d1cf4 | 194 | 405,075 | 388 | 665,429 | 48,423,013 | 142,005 |
| six short sessions | 3 to 13 each | 62,000 to 71,000 | under 40 each | 31,000 to 98,000 | 143,000 to 626,000 | 555 to 2,318 |

## Panel readings (/context and /usage, 5 Oct 2026, 17:30)
Context window 964.4k of 1M (96%) in the long session.
| category | tokens | share |
|---|---|---|
| Messages | 894.1k | 89.4% |
| MCP tools (loaded) | 23.5k | 2.3% |
| System tools | 20.7k | 2.1% |
| System prompt | 10.4k | 1.0% |
| Skills | 10k | 1.0% |
| Memory files | 5.6k | 0.6% |
| MCP server instructions | 638 | 0.1% |
| Autocompact buffer | 33k | 3.3% |
Deferred, not in the window until used: MCP tools 226.5k, system tools 24k.
Plan limits (Max 5x): session limit 57% used, resets in 20 min; weekly all models 16%; weekly Fable 0%.

## Reading it
- Biggest consumer by the panel: Messages, 89.4% of the window. Everything else together is about 7%.
- The preload is modest next to what one long session costs. In the long session every request re-read a context that grew to nearly a million tokens, which is where almost all of the 824 million cache-read tokens came from.
- Big single tool results fed that growth: whole-file reads of `data/tasks.json` (over 100,000 tokens in one call), full PDF reads and large JSON dumps.
