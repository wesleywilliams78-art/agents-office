---
name: wrw-deck
description: Build a WRW-branded PowerPoint (.pptx) deck from a document, report or brief. Use for any presentation deck, briefing deck or slide pack Wesley asks for, including a client deck in the client's accent colour. Not for LinkedIn carousels, social cards or HTML slides.
---

# WRW deck

Use this when the finished thing is a `.pptx`. It sits on pptxgenjs and gives house layouts defined once (cover, light, dark: footer, WRW chip, slide number, kicker and title placeholders), native charts and tables, and speaker notes. You write only the content. PPT Master was reviewed on 7 Nov 2026 and not adopted; this replaces it.

## Setup (once, already done)
- Engine: `C:\Users\Wesley\tools\pptxgenjs` (MIT). Override with env `PPTXGENJS_DIR`.
- Rendering needs LibreOffice, PyMuPDF and Pillow (all installed).
- Scripts are `.cjs` because the repo is ES-module. Work in a short scratch folder (Windows 260-character limit).

## Steps
1. **Read the source in full.** A PDF: `python -c "import pymupdf"` to extract text and rasterise a page or two to see the look. Note every figure and its label (Estimate, Thin, Not found).
2. **Plan the roster in your head, one line per slide**: cover, verdict first, then one idea per slide, sources, closing. Ten to twelve slides is normal.
3. **Pick the accent.** One accent colour per deck: WRW red `FF3131`, a Franchise Entry Report's country flag colour, or the client's colour. The module checks contrast and falls back to ink backgrounds when the accent is too light for white text.
4. **Copy `example.cjs`** to the scratch folder (keep `wrw-deck.cjs` beside it or `require` it by absolute path) and replace the content. Helpers: `cover`, `dark`, `light`, `statement`, `stats`, `cardGrid`, `band`, `steps`, `barChart`, `table`, `source`, `close`; raw `T`, `card`, `label` for anything else (a chart beside cards, two-column text cards). Read `wrw-deck.cjs` once for their options.
5. **Build, render, look.** `node deck.cjs out.pptx` then `python -I render.py out.pptx outdir`. Open `contact.png`, then any slide that looks tight. Fix overlaps, cut text, and repeat once more at most. Use the `visual-check` skill's habits: look at the picture, fix the weakest points, then show Wesley.
6. **Check the file itself.** System `python` has no python-pptx: count charts, tables, placeholders and notes from the zip (`ppt/charts`, `ppt/slides`, `ppt/notesSlides`), or use the scratch venv with python-pptx (`pip install python-pptx` inside it).
7. **Hand over:** the full `.pptx` path, slide count, what is a native chart or table, and anything you could not verify (you have not opened it in PowerPoint).

## Rules
- Use only figures from the source. Never round, merge or invent one. Keep "Not found", "Estimate" and "Thin" exactly as the source uses them, and give the nearest proxy where the source does.
- Every slide: a kicker, a title that states the point, speaker notes of two to four plain sentences.
- The last slide is `close(...)`: it carries the house © line. Add `extra` for "Not legal, tax or investment advice" when the content needs it.
- Footer on every content slide: who, what, issue. Set it once in `createDeck({ footer })`.
- Type: Georgia headings, Arial body. Nothing below 11 pt except the 10 pt footer and source lines. Body 14 pt where it fits. If text will not fit, cut words or split the slide; do not shrink below 11.
- Charts and tables are native objects, never pictures. One chart per slide is the norm; use two only when the slide has nothing else.
- Fit budgets (13.33 in wide slide, 12.1 in of content): `cardGrid` three across: label under 28 characters, value under 14 at 26 pt (pass `valueSize: 20` for longer), note under 150 characters at `h` 2.0. `table` header cells are 11 pt and wrap in narrow columns: give a column at least 0.1 in per header letter. A title that wraps to two lines pushes content down: start content at y 1.85. `stats` captions under 80 characters.
- No stock images, no AI images, no emoji. Text on the accent or on ink stays white or cream.
- Facts only where the source stays neutral (for example a brand named as evidence): do not turn it into a recommendation.
- Do not send, post or share the deck. Say where it is.

## Known limits
- pptxgenjs writes one slide master with three layouts. Slide numbers show the number only.
- The WRW chip is a text outline, not the red wordmark. For a deck that needs the real logo, add `assets/brand/WRW-logo-red-on-white.svg` converted to PNG on a light slide.
- Fonts: Georgia and Arial exist on every PowerPoint machine; the LibreOffice render is a close proxy, not PowerPoint.
- Colour of the accent shows in the PowerPoint theme colours, so restyling in PowerPoint follows it.
