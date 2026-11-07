# Plan: let the GRAPHICS DESIGNER look at its own slides

Planned 7 Nov 2026. Not built. Build on Opus 5.5 · high (several files in `connectors/` and `check.mjs`).

## Why
The designer (`gfx`) is told "You cannot see images", and the studio only checks mechanically (overflow, contrast). So the first person to look at a slide is Wesley, who is not a designer and ends up art-directing in several prompts.

Evidence, 6-7 Nov 2026, blind picks by Wesley, same words in both versions:
- Edition 35 header: the checked version lost (I stripped a look he liked). Lesson: fix faults and raise impact, never strip a look he likes.
- Edition 33 carousel (made by the blind desk): the checked version won (orphaned "33" fixed, underlines no longer cut descenders, dead space used, big site number as focal point).
- Spike, 7 Nov: a throwaway MCP tool returning `{type:"image"}` was called by `claude -p` 2.1.319 with `Read` denied and `--strict-mcp-config`; the agent described the slide correctly (big red "10", underlined words, subline). So agents can see an image that comes back from an MCP tool. No change to `serve.mjs` or the denied-tools list is needed.

## What gets built
1. **`connectors/video-studio/look.mjs` (new).** Builds a contact sheet of a finished job's slides: an HTML grid (3 columns, each slide at most 520 px wide, 20 px grey gutters) screenshotted with the installed Chrome headless (`--headless=new --screenshot`, as proven on 7 Nov). Writes `output/video/<job>-look/sheet.png`. No new dependency. One slide asked for by number is returned alone at most 1080 px wide.
2. **`video_look` tool in `connectors/video-studio/mcp.mjs`.** Input `job_id`, optional `slide`. Reads `job.slides` (falls back to `job.stills`, so video jobs work too). Returns a text block (job id, slide count, the checks the studio already ran, "Looked at: nothing yet") plus one image block (base64 PNG). Refuses any job that is not `done`. Takes no file paths, so it cannot read anything outside `output/video`.
3. **`next` hint in `video_build`.** One sentence: when the job is done, call `video_look` and check the slides before returning them.
4. **`design-craft` skill (Brain).** The file is already at the 6,000-character body limit, so add `look.md` beside it (under 4,000 characters) and a two-line pointer in `SKILL.md`. `look.md` holds the procedure from the global `visual-check` skill: look, score the seven checks, fix the weakest one to three, rebuild, look again, at most two rebuilds. Rules in it: keep the look a piece already has; fix visible faults and raise impact; never change a word or figure; branded rules still apply to branded pieces; hand back `Checked / Changed / Still weak`.
5. **`gfx` brief (`office.agents.local.json`).** Replace "You cannot see images: name the two things the Lead should look at first" with "You can look at your slides with `video_look`: do it before you return them."
6. **`npm run check` additions** (names the proof):
   - `video_look` is in `tools/list`.
   - Calling it on a fixture job returns one valid PNG image block plus text; on a missing or unfinished job it returns an error; with a bad `slide` it returns an error.
   - The `gfx` brief no longer contains "cannot see images".
   - `design-craft` body is within 6,000 characters and `look.md` within 4,000 (the loader's own limits).

Not touched: `serve.mjs`, the denied-tools list, the lead review loop, motion studio, the VIDEO EDITOR. Reel stills are possible with the same tool (stills fallback) but no desk is pointed at it; that is a later yes/no.

## Order of work
1. `look.mjs`, then its sheet on the Edition 33 job (a real fixture), opened and checked by eye.
2. `video_look` in `mcp.mjs`, run over stdin the way the spike did.
3. `check.mjs` cases; `npm run check` green.
4. `look.md`, `SKILL.md` pointer, `gfx` brief.
5. Acceptance test (below).

## Acceptance test
Give the `gfx` desk a fresh carousel task twice: once with the old brief and skill (restore from git and the Brain backup), once with the new. Wesley picks blind between the two sheets. Passing means he picks the one that looked at its own slides, and the desk used at most two rebuilds. If he picks the old one or has no preference, switch the brief back, keep the tool, and say so.

## Costs and risks
- A contact sheet is one image per look (estimated 1-2k tokens, to be measured in the acceptance test); two rebuilds means at most three looks per task. Studio builds are local and free.
- The desk judges its own work, the same builder-and-judge weakness as my two tests. The lead review loop (marketing) is the second pair of eyes; do not turn it on for this plan, mention it to Wesley if the desk's own taste proves weak.
- Needs a Claude Code that passes MCP image results through; proven on 2.1.319 on this PC. `npm run check` should catch it if a later version stops.
- Chrome is found by its standard Windows path; if absent `video_look` returns a plain error and the desk carries on as it does today.
- The brand rules in the skill can still pull the desk toward the strict-brand loss from 6 Nov. `look.md` must carry the "keep the look" rule in its first lines.

## Not in scope
Giving other desks sight, a taste score, automatic rebuilds without the desk deciding, changing how Wesley approves.
