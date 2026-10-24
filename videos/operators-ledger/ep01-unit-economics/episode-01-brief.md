# Episode 01 Brief — Unit Economics
**Series:** The Operator's Ledger  ·  **Working title:** "Why site 10 can lose money when site 1 made it"
**Umbrella:** WRW Hospitality  ·  **Tool:** HyperFrames, built and edited through Claude Code
**Revised:** 24 Oct 2026 (the brand kit applied, scene 5 chart corrected, voiceover trimmed to time). Open decisions are marked **[DECISION]**.

---

## How to use this brief

1. The series design system is `../DESIGN.md`. Read it first. Episode 01 does not change it.
2. In Claude Code, from this folder, run:

> Using /hyperframes, build the video described in `episode-01-brief.md`, following `../DESIGN.md`. Plan first. Use Athena's poses from `../characters/athena/` as they are (see its README). Then show me one still frame per scene before you render the full video.

3. Review the stills, give changes in plain English, then ask for the render.

Requirements: Node.js 22+ and FFmpeg. If the skills aren't installed yet, run `npx hyperframes skills update` once.

---

## Script and storyboard

**Length:** 90 s as built (87 s of content, then a 3 s end card; scene 7 tightened to fit its 5 s line). About 190 words of voiceover at about 145 words a minute.
**On-screen label (scenes 3–5, Archivo kicker, bottom left of the safe area, above the captions):** "ILLUSTRATIVE FIGURES, WEEKLY"

| # | Time | Voiceover | On screen | Motion |
|---|---|---|---|---|
| 1 | 0–7 s | "Your first site made money. Your tenth is losing it. Same menu. Same brand. What changed?" | Red background, bone line art. Athena stands between two shopfronts: SITE 1 (smiling) and SITE 10 (flat-mouthed). Newsreader title, flush left: **Unit economics** | The shopfronts slide in from the sides. Athena looks from one to the other, then scratches her head. |
| 2 | 7–18 s | "It's unit economics: what one site earns after paying for itself. Sales, minus food, labour, rent and running costs. What's left is four-wall profit." | Bone background. A single shopfront. Below it, a horizontal "Sales" bar, then four labelled slices peeling off: Food, Labour, Rent, Running costs. An ink remainder labelled **Four-wall profit**. | The bar draws left to right. The slices drop out one by one, in time with each word. The remainder pulses once. |
| 3 | 18–33 s | "Here's site one. Twenty thousand pounds a week. Food takes twenty-eight percent, labour twenty-eight, rent ten, running costs ten. Four-wall profit: four thousand eight hundred pounds a week." | A stacked bar for SITE 1, total £20,000. Segments: Food £5,600 (28%) · Labour £5,600 (28%) · Rent £2,000 (10%) · Running costs £2,000 (10%) · **Profit £4,800 (24%)** | The total counts up to £20,000. The segments fill in step with the voiceover. The profit segment lands last, in ink, with a soft tick. |
| 4 | 33–53 s | "Now site ten. Weaker pitch, higher rent, sales of thirteen thousand. Food creeps to thirty percent with more waste. Here's the trap: labour barely moves. You still need a full team to open the doors. Labour hits forty percent. Site ten loses three hundred pounds a week." | A SITE 10 stacked bar appears beside SITE 1, at the same scale. Total £13,000. Segments: Food £3,900 (30%) · Labour £5,200 (40%) · Rent £2,600 (20%) · Running costs £1,600 (12%) · **Loss −£300** | The bar is visibly shorter. The labour segment is drawn first and stays nearly the same size as SITE 1's. Rent's 20% appears on screen only (it is not spoken). The costs overflow the top of the bar, the overflow turns red, "−£300" lands, and a low thud plays. Athena's expression drops to worried. |
| 5 | 53–69 s | "Rent and labour are mostly fixed. When sales fall, they don't. Site ten needs about thirteen and a half thousand a week just to break even. A weaker site doesn't just earn a little less. It can lose money." | Bone background. Line chart, kicker "SITE 10'S COSTS". X axis: weekly sales, £10,000 to £22,000. Y axis: £ per week. Three lines: **fixed costs**, flat at £7,800 (labour £5,200 + rent £2,600); **total costs**, rising from it (fixed + 42.3% of sales for food and running costs); **sales**, rising more steeply. The two rising lines cross at **Break-even ≈ £13,500**. The gap between sales and total costs is shaded: ink above the crossing (profit), red below it (loss). | A marker slides down the sales axis from £20,000 (profit £3,738) to £13,000 (−£300). The shaded gap shrinks, flips to red as it passes £13,500, and the break-even label lands. |
| 6 | 69–79 s | "Site one's numbers don't predict site ten's. Model every new site on its own sales, with its own fixed costs." | Athena at a counter with her ledger open (`athena-at-counter-writing`). Text: **Model each site on its own numbers.** | Athena crosses out a "copy SITE 1" note and writes a fresh one. The text types on. |
| 7 | 79–87 s | "Your question for Monday: what weekly sales does each of your sites need to break even?" | Red background. Large Newsreader text, flush left: **What does each site need to break even?** | The words build one at a time, then hold for 2 s. |
| 8 | 87–90 s | (music only) | End card per `../DESIGN.md`: THE OPERATOR'S LEDGER · Episode 1: Unit economics · seal · WRW Hospitality · Wesley Williams · Multi-Site Operations Architect. | The mountains draw in, then the seal stamps on. Hold. |

### Numbers check (must reconcile exactly)
- **SITE 1:** 5,600 + 5,600 + 2,000 + 2,000 = £15,200 of costs. 20,000 − 15,200 = **£4,800 profit (24%)**.
- **SITE 10:** 3,900 + 5,200 + 2,600 + 1,600 = £13,300 of costs. 13,000 − 13,300 = **−£300 (loss)**. Running costs are 12.3%, shown as 12%.
- **Scene 5 model (site 10's costs):**
  - Fixed costs: labour + rent = £7,800.
  - Variable costs: food + running costs = 5,500 ÷ 13,000 = 42.3% of sales.
  - Break-even = 7,800 ÷ (1 − 0.423) = **£13,520**, shown as ≈ £13,500.
  - At £13,000 of sales: 13,000 − 7,800 − 5,500 = **−£300**, which matches scene 4.
  - At £20,000 of sales: 20,000 − 7,800 − 8,462 = **£3,738**. This is site 10's cost structure at site 1's sales, not site 1's own profit, so don't label it £4,800.
- Both bars in scene 4 use the same pixel scale, so £1 is the same height on each.

### Voiceover timing check
| Scene | Words | Slot | Pace |
|---|---|---|---|
| 1 | 16 | 7 s | 137 wpm |
| 2 | 24 | 11 s | 131 wpm |
| 3 | 28 | 15 s | 112 wpm (pauses for the counts) |
| 4 | 47 | 20 s | 141 wpm |
| 5 | 39 | 16 s | 146 wpm |
| 6 | 20 | 10 s | 120 wpm |
| 7 | 16 | 8 s | 120 wpm (including a 2.4 s hold) |

---

## LinkedIn package

**Thumbnail:** the scene 4 frame where "−£300" has landed, with both bars visible and the kicker "THE OPERATOR'S LEDGER · EP 1".

**Post copy (draft — [DECISION] approve or edit):**

> Your first site made money. Your tenth is losing it.
>
> Same menu. Same brand. So what changed?
>
> Rent and labour don't fall when sales do. At £13,000 a week, site ten loses £300. Site one, at £20,000, makes £4,800.
>
> Episode 1 of The Operator’s Ledger: unit economics in under two minutes.
>
> Your question for Monday: what weekly sales does each of your sites need to break even?

**30 s cut-down (after the full episode is approved):** scene 1, then scene 3 with the voiceover shortened to the total and the profit, then scene 4 from "Here's the trap", then scene 7, then a 2 s end card.

---

## Acceptance checks before final render

1. Every figure on screen matches the numbers check above, and the voiceover says the same figures.
2. Scene 5 shows site 10 in loss at £13,000 and crossing break-even at about £13,500. It never shows site 10 in profit at £13,000.
3. The "ILLUSTRATIVE FIGURES, WEEKLY" label is visible in scenes 3–5.
4. No real brand names, logos, locations or client details appear anywhere (insight-tier content only).
5. Every caption and number can be read on a phone at actual size (check a still at 50% zoom).
6. Only the `../DESIGN.md` colours are used, text is flush left, and nothing except backgrounds and mountains sits outside the 1080 × 1080 safe area.
7. The voiceover finishes before the end card, and no scene overruns its slot by more than 1 s.
8. British English throughout ("labour", "colour"), with £, comma thousands separators and a true minus sign.
9. Athena matches her approved character sheet in every scene.

---

## Open decisions

- [x] Series name: **The Operator's Ledger**
- [x] The Operator: stays, named **Athena** (she/her)
- [x] Brand hex values and fonts: taken from the brand kit (see `../DESIGN.md`)
- [x] Athena's look: Option A, The Blazer (pose library in `../characters/athena/`)
- [x] Motion: calm and precise
- [x] Voiceover: TTS for the pilot; Wesley records his own voice before publishing
- [x] Palette: brand colours only, with no skin-tone fills
- [x] End-card brand line: WRW Hospitality only
- [ ] Post copy: approve or edit the draft above
