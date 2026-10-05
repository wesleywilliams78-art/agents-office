# Token habits (pin this)

Measured 5 Oct 2026: one session grew to 967k tokens over 1,651 requests; Messages was 89.4% of the window. These habits target that.

1. **/clear when you switch tasks.** Invoicing, budget, skills and recovery work should not share one window.
2. **/compact at about 60% context**, not 96%. Do not wait for the autocompact buffer.
3. **Work in focused blocks.** Requests inside the cache window are read at the cache discount; long gaps pay full price again.
4. **Dial effort to the task.** Low or Medium for edits and lookups; High or more only for hard reasoning.
5. **Never read big files whole.** `data/tasks.json` cost over 100,000 tokens in one call. Ask for a slice: a task id, a date range, the last 20 entries.
6. **Prefer short sessions.** Start a new one per job; the repo files carry the memory, not the chat.
7. **Check `/context` now and then.** If Messages is over about 60%, compact or clear.
