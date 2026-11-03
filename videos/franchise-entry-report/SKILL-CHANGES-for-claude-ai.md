# Changes to the franchise-entry-report skill on claude.ai

**Applied 24 Oct 2026** (by Claude, through Chrome): the live skill was replaced with `skill/franchise-entry-report/SKILL.md` (claude.ai v3). This file is kept as the record of what changed.

The `franchise-entry-report` skill lives in your claude.ai account, so it can't be edited from here. These changes bring it in line with four decisions you made on 24 Oct 2026:
1. The report is WRW Hospitality's alone, with no Scaling Without Borders label.
2. Each issue takes a country colour from the flag.
3. Every document carries the © line.
4. The report runs to seven pages, as Norway did. The skill still says six.

**How to apply:** for each numbered change, find the text under **Find** in the skill and replace it with the text under **Replace with**. Every change was checked against the skill as it stands today.

---

## 1. The description (front matter)

**Find**
```
a sourced 6-page country PDF
```
**Replace with**
```
a sourced 7-page country PDF
```

## 2. The opening paragraph

**Find**
```
It is a free 6-page A4 PDF for brands deciding whether to enter a market.
```
**Replace with**
```
It is a free 7-page A4 PDF for brands deciding whether to enter a market. It belongs to WRW Hospitality alone: never label it Scaling Without Borders, which is Wesley's personal newsletter.
```

## 3. Non-negotiable 6: the CTA page

**Find**
```
Page 6 carries one CTA line only.
```
**Replace with**
```
Page 7 carries one CTA line only.
```

## 4. Step 1: the one new colour allowed

**Find**
```
Do not add new colours, fonts or decorative devices without flagging them.
```
**Replace with**
```
Do not add new colours, fonts or decorative devices without flagging them. The one sanctioned exception is the issue's country colour (see Palette).
```

## 5. The page table (step 5): seven pages, in the Norway order

**Find** the whole table that starts with `| Page | Content |` and ends with the `| 6. Risks and checklist |` row.

**Replace with**
```
| Page | Content |
|---|---|
| 1. Cover | Country-colour field, the WRW logo tile, issue number and date. "Franchise Entry Report" with the country name in display serif. A one-line verdict. Three headline stats. Mountain line along the bottom. |
| 2. Market snapshot | Six stat tiles: population, GDP per head, food-service spend, franchise count, spending trend, currency. "How [country] eats out" with 3 bullets. A "So what" box in ink. Two simple bar charts. |
| 3. Rise and fall | Category table. Diverging bar chart of unit-count change, noting that windows differ so readers compare direction, not size. A "Reading the table" box. |
| 4. White space | 3–5 gap cards. The 2x2. The "If I had a brand" box in the country colour, signed by Wesley Williams, WRW Hospitality. |
| 5. Regulation and cost to operate | Regulation table (area, current position "verified [month year]", source). Three key tiles. Wage-engine chart and two wage tiles. Not-advice line. |
| 6. Entry route and risks | Entry-route comparison table. Three best-fit cards. Six risk tiles: costs and demand, labour, supply chain, seasonality, regulatory, currency and rates. |
| 7. First 90 days and sources | "Your first 90 days" 10-point checklist. "What we'd check next" box (the open gaps). Method note. Full source list. Closing band in the country colour with the mountain line and CTA: "Which country should we cover next?" The © line. |
```

## 6. The palette (step 6)

**Find**
```
**Palette.** Bone, red and black is the WRW report palette. It deliberately extends the LinkedIn system's no-black rule.
- red `#FF3131`, the only accent;
```
**Replace with**
```
**Palette.** Bone, one country colour and black is the WRW report palette. It deliberately extends the LinkedIn system's no-black rule.
- **the country colour, the only accent.** Take one colour from the country's flag. It replaces WRW red on the cover field, the closing band, the "If I had a brand" box, section labels, rules, hero numerals and the one highlight in each chart. A second flag colour may be used for thin rules only.
  - If the flag's main colour is red, use WRW red `#FF3131`.
  - The cover field must hold white text at a contrast of 3.6:1 or better (WRW red is 3.66). If it can't, use the flag's darker colour or set the cover text in ink.
  - Colours only: never the flag graphic, emblem, coat of arms or text from a flag.
  - Check the colour against the country's official flag specification. Record it and its contrast in the issue log.
  - Reference colours: Norway and Denmark `#FF3131`, Sweden `#006AA7`, Finland `#002F6C`. The palette table is in the repo at `videos/franchise-entry-report/README.md`.
- WRW red `#FF3131`, in the WRW logo tile only (and as the country colour for red flags);
```

## 7. The mark

**Find**
```
**Mark.** The WRW seal: a red rounded square with white serif "WRW", or white with red text on red fields.
```
**Replace with**
```
**Mark.** The WRW seal: a red rounded square with white serif "WRW". It stays white on red on every cover, whatever the country colour; on a red field, use white with red text.
```

## 8. The footer

**Find**
```
**Footer on every page:** "Scaling Without Borders · Franchise Entry Report · Issue NN" and "Page X of 6".
```
**Replace with**
```
**Footer on every page:** "WRW Hospitality · Franchise Entry Report · Issue NN" and "Page X of 7". Never "Scaling Without Borders".

**Copyright:** "© 2026 WRW Hospitality (Wesley Williams). Not to be resold, rebranded or redistributed." on the last page, and the same line in the PDF's file properties.
```

## 9. Charts

**Find**
```
- Flat; one red highlight per chart; everything else ink.
```
**Replace with**
```
- Flat; one highlight per chart in the country colour; everything else ink. Colour never carries meaning: rise and fall keep their arrows and words.
```

## 9b. The 2x2

**Find**
```
- one red highlight;
```
**Replace with**
```
- one highlight in the country colour;
```

## 10. The source list

**Find**
```
render them into the page-6 list
```
**Replace with**
```
render them into the page-7 list
```

## 11. Confidence: Thin

**Find**
```
Thin is shown in red text.
```
**Replace with**
```
Thin is shown in bold in the country colour, always with the word.
```

## 12. The checks (step 7)

**Find**
```
- [ ] Nothing clipped, overlapping or orphaned; tiles aligned; footer on all 6 pages.
```
**Replace with**
```
- [ ] Nothing clipped, overlapping or orphaned; tiles aligned; footer on all 7 pages.
```

**Find**
```
- [ ] The red value is exactly `#FF3131`. Grep the HTML/CSS for any other hex values.
```
**Replace with**
```
- [ ] The accent is exactly this issue's country colour, and `#FF3131` appears only in the logo tile (unless the flag is red). Grep the HTML/CSS for any other hex values.
- [ ] The cover's white text has a contrast of 3.6:1 or better against the country colour.
- [ ] No flag graphic or emblem anywhere. No "Scaling Without Borders" anywhere. The © line is on the last page.
```

**Find**
```
- [ ] PDF under 5 MB (Issue 01 was 0.26 MB) and exactly 6 pages.
```
**Replace with**
```
- [ ] PDF under 5 MB (Issue 01 was 0.31 MB) and exactly 7 pages.
```

## 13. The explainer video

**Find**
```
Use quick cuts rather than long crossfades between red and bone fields, which turn pink.
```
**Replace with**
```
Use the issue's country colour for the fields. Use quick cuts rather than long crossfades between the colour and bone fields, which muddy.
```

## 14. The repeat checklist

**Find**
```
- [ ] Spell-check and check the red value.
```
**Replace with**
```
- [ ] Set the country colour, check its contrast, and log it.
- [ ] Spell-check, and check that no Scaling Without Borders label remains.
```
