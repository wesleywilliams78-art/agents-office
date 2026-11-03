# Tuesday Edition 02: Sweden (recap of Issue 02, Fri 30 Oct 2026)

Built on 28 Oct 2026 from the Edition 01 (Norway) source. The style is Point-and-Click Pill with sectioned floods; the pack is Brain `40-Marketing/motion-library/tuesday-motion-pack.md`. Every figure comes from the published PDF (`Franchise Entry Report - Sweden Issue 02.pdf`, Wesley's copy of 28 Oct). The video does no new research.

## Override: Sweden's colours (Wesley, 28 Oct 2026)
Wesley asked for this edition in Sweden's colours rather than only the WRW Hospitality palette. That overrides pack B1 ("Country colours: None").
- **Sweden blue `#006AA7`** (the report's country colour; contrast with white 5.80) replaces WRW red `#FF3131` on:
  - the two coloured grounds (sections 2 and 5) and their floods;
  - the CTA pill on black;
  - the accent figures on white or bone cards: the 24% stat, the "Yes" answer, the toggle's on track, the over-max stretch, and the Takeaway grill dot.
- **Swedish yellow `#FECC02`** is the accent on dark grounds, where blue would be too dark: the "Sweden?" hook word, the Pizza Hut bar, and the verdict's last line.
- **Logo:** the WRW tile is Sweden blue with white "WRW" (`assets/logo-white-on-blue.svg`). On a blue ground it switches to white with blue "WRW" (`logo-blue-on-white.svg`), as the report series' logo rule says. It's made from the Edition 01 SVGs with only the colour swapped.
- **Unchanged:** bone, ink and white, the Geist type, the ridges and the series track. The "no accent on an accent ground" rule still holds: blue elements on a blue ground sit only inside white cards.

## Content slots (pack Part C)
| # | Slot | Edition 02 (Sweden) | Report |
|---|---|---|---|
| 1 | Country | Sweden | |
| 2 | Issue / date | Issue 02 · 30 Oct 2026 | cover |
| 3–5 | Stat 1 | People in Sweden · **10.62m** · Growth almost stalled at 0.15% | p1–2 |
| 6–8 | Stat 2 | Eat out every week · **24%** · of Swedes / 55% eat out at least monthly | p2 |
| 9 | Source | SCB, Aug 2026 · Infostat for Visita, Jan 2026 | S1, S13 |
| 10–12 | Toggle | Franchise-specific law? · **Yes** · Disclosure before signing / No registration | p5, Lag (2006:484) |
| 13–14 | Slider | Agreement wage floor, per hour · **SEK 153.64** (lowest adult grade, from 1 Apr 2026) | p5 |
| 15 | On-cost chip | + holiday pay, contributions, pension ≈ +54% | p5 (≈ 153.60 per 100) |
| 16 | All-in (ESTIMATE) | **≈ £17.75/hr** (the slider runs to SEK 236) | p5 |
| 17 | Source | Lag (2006:484) · Gröna Riksavtalet collective agreement, from 1 Apr 2026 · Skatteverket · £1 = SEK 13.29 | S46, S63, S62, S4 |
| 18–21 | Chart | MAX (Sweden) +16 (147 → 163 · 2022 to 2025) · Five Guys +3 (0 → 3 · Feb 2025 to Apr 2026) · Espresso House −37 (253 → 216 · 2023 to 2025) · **Pizza Hut −25** (25 → 0 · Nov 2025 to Sep 2026), with the tooltip "Bankrupt on 9 Sep 2026 / 18 restaurants closed" · footnote "Windows differ: compare direction, not size" | p3 |
| 22 | Source | MAX and Espresso House reports · Five Guys, Apr 2026 · Pizza Hut bankruptcy, 9 Sep 2026 | S21, S33, S23–24, S27–28 |
| 23–26 | 2×2 | Gap: **Takeaway grill** (Move now) · chips "↑ Rising · takeaway VAT 6%" / "12% VAT returns 1 Jan 2028" · other dots Chicken, Burger, Bubble tea, Pizza, Coffee, placed as on the report's map | p3–4 |
| 27 | Source | WRW Hospitality analysis of the Issue 02 evidence | p4 |
| 28 | Verdict | Takeaway-led fast food brand? / I'd be in a Swedish / master-franchise conversation / before the VAT window closes. | p4, "If I had a brand" |
| 30 | Source | From Franchise Entry Report: Sweden, Issue 02 | |
| 31 | Pill | Free · Issue 02 · Sweden / A new country every Friday / Follow WRW Hospitality | |

**C1 re-labels used:**
- **Toggle:** Sweden has a franchise disclosure law, so the click switches the toggle on to Yes (Norway's switched off to None).
- **Slider:** Sweden has no statutory minimum wage, so it shows the collective-agreement floor the report used and says so in its source line.

## Build notes for this PC (Windows)
- **Tools:** `win/render.mjs` and `win/stills.mjs` are Node ports of `render.py` and `stills.py`. They use the agents-office Playwright and this PC's Chrome, with the same 4 subframes, tmix blend and crf. `win/run.py` runs `music.py` and `mix.py` with a numpy stand-in for scipy's one-pole filter, so nothing needs installing. `render-sweden.sh` is `render_v2.sh` with the path, page, audio and output names updated.
- **Track:** `music.py` rebuilt `music.npy` (deterministic, the same series track).
- **Audio:** `mix.py` placed all 61 events with 0.000 ms alignment error. The mix is 60.000 s, −13.8 LUFS, peak −1.0 dB.
- **Stills gate:** one still per beat at 9:16 (`source/.../stills/sheet-beats-916.jpg`) and one per second at both 9:16 and 16:9. Three fixes came out of it:
  - "Takeaway grill" now has a white backing, so the axis passes behind it;
  - Burger is lifted clear of the axis;
  - the cursor's approach to the dot is moved off the chips.

## Filed in Drive (28 Oct 2026)
Drive › 009 - WRW Hospitality › Wesley Tuesday Content › Edition 02 - Sweden: the four videos, the four covers and `WRW-Sweden-motion-source.zip`. They were copied through Google Drive for desktop (G:) and checked byte for byte against the originals.
