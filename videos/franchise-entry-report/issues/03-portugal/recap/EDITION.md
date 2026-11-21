# Tuesday Edition 03: Portugal (recap of Issue 03, Fri 6 Nov 2026)

Built on 7 Nov 2026 from the Edition 02 (Sweden) source, for the Wed 11 Nov 2026 08:00 LinkedIn collab post. The style is Point-and-Click Pill with sectioned floods; the pack is Brain `40-Marketing/motion-library/tuesday-motion-pack.md`. Every figure comes from the published PDF (`WRW-Franchise-Entry-Report-03-Portugal.pdf`, checked 7 Nov 2026) and `issue.json`. The video does no new research.

## Colours (Wesley, 7 Nov 2026)
The cover check failed: the cover's field is WRW red `#FF3131` (and `issue.json` lists `#FF3131`), and `#046A38` appears only in the cover's rules and ridge lines. Wesley confirmed green as the lead colour anyway on 7 Nov.
- **Portugal green `#046A38`** sits where Sweden blue sat: the grounds of sections 2 and 5 and their floods, the CTA on black, the accents on white or bone cards (the 72, "None", the toggle's on track, the over-floor stretch, the Chicken dot), and the logo tile (`assets/logo-white-on-green.svg`; on a green ground it switches to `logo-green-on-white.svg`).
- **WRW red `#FF3131`** takes Sweden yellow's role, only on ink or black: the hook word "Portugal?", the KFC bar, and the verdict's last line inside the ink card.
- Never green on green, red on red, or red directly on green. Sweden used no lighter blue tints, so the tints `#2E8B57` and `#9FD3AE` are not used. No flag, armillary sphere or shield.

## Content slots (pack Part C)
| # | Slot | Edition 03 (Portugal) | Report |
|---|---|---|---|
| 1–2 | Country, issue | Portugal · Issue 03 · 6 Nov 2026 | cover |
| — | Hook | Fancy franchising into Portugal? | fixed |
| 3–5 | Stat 1 | People in Portugal · **11.42m** · 14.0% of residents foreign | p2, S1 |
| 6–8 | Stat 2 | Brazilian brands here · **72** · franchise brands / Their No. 1 market abroad | p2, S65 |
| 9 | Source | INE, Jul 2026 · ABF, May 2026 | |
| 10–12 | Toggle | Franchise-specific law? · **None** · No disclosure duty / General contract law applies | p6, S44 |
| 13–14 | Slider | Wage floor (€920/month), per hour · **€5.31**; the stretch runs to €7.73 (€5.31 × 1.4555, p5) | p5 |
| 15 | On-cost chip | Every €100 of pay costs ≈ €146 | p5 |
| 16 | All-in (ESTIMATE) | **≈ £6.47/hr** | p5 |
| 17 | Source | SRS Legal 2019 · APCMC, Dec 2025 · AHRESP pay table 2026 · simula.pt 2026 · £1 = €1.195, ECB 27 Oct 2026 | |
| 18–21 | Chart | Change in sites, selected chains: Burger King +49 (164 → 213 · Sep 2022 to Nov 2025) · **KFC +25** (56 → 81 · end 2022 to May 2026, red, ESTIMATE tag) · Little Caesars −3 (4 → 1 · mid 2024 to Apr 2026) · Telepizza −10 (143 → 133 · Jun 2021 to Sep 2026); tooltip "One operator since 1996 / Popeyes missed two entries"; footnote "Windows differ: compare direction, not size" | p3 |
| 22 | Source | Grande Consumo, Nov 2025 · Lusa, Sep 2022 · ECO, May 2026 · Ibersol reports · Echo Boomer, 2021 to 2026 | |
| 23–26 | 2×2 | Gap **Chicken** (45, 75) · chips "↑ Rising · medium saturation" / "KFC alone at scale: 81 sites" · Burger (88, 35), Pizza (75, 30), Coffee (66, 44), Bakery-café (40, 65), Fast casual (30, 58), placed from `issue.json` (x saturation, y opportunity). Kebab / grill and Bubble tea are on the report's map but left off, as the slot sheet listed five. | p4 |
| 27 | Source | WRW Hospitality analysis of the Issue 03 evidence | |
| 28 | Verdict | IF I HAD A BRAND / I'd build for the Portugal / that's arriving, not the one / in the guidebooks, with an / operator who has room for me. | p4 |
| 29–30 | Signature, source | Wesley Williams · WRW Hospitality · From Franchise Entry Report: Portugal, Issue 03 | |
| — | CTA | Read the full report | |
| 31 | Pill | Free · Issue 03 · Portugal / A new country every Friday / Follow WRW Hospitality | |

**C1 re-labels:** the toggle starts on and the click switches it off to None (as Norway's). The slider's middle and last labels, not in the slot sheet, are "Add holiday and Christmas pay, social security" and "All-in cost of the legal floor" (the PDF's wording).

## Changes from Sweden
- **No timing, trigger, flood, sound event or loop-seam change.** The page exports the same 61 events as Sweden, identical.
- **Chart scale:** 6.2 px per site instead of 7.5, so the +49 bar and its label stay inside the card. The KFC tooltip sits under the KFC bar, in the empty right half of the lower rows.
- **2×2:** dots placed by score; the Bakery-café and Fast casual labels sit left of their dots, clear of the gap chips.
- **Source lines** wrap inside the frame at 9:16, and each source item stays on one line.
- **Chrome colour** now follows the ground actually under the logo (circle floods and the bone ridges). Sweden switched 0.45 s early, which left white header text on bone for a moment as the ridges rose.
- **Underline** under "that's arriving, not the one", measured to that line.
- **Encode:** `yuv420p` limited range (`scale=in_range=pc:out_range=tv`). Sweden's files are `yuvj420p` full range, straight from the MJPEG pipe.

## QA (pack Part E), 7 Nov 2026
| Check | Result |
|---|---|
| Figures | Every figure matches the Issue 03 PDF (pages 2–5, sources p7) and `issue.json` |
| Estimates | The £6.47 all-in and the KFC bar both carry an ESTIMATE tag |
| Source lines | On every data section (1–4) and on the verdict |
| Clipping / overlap | None at 9:16 or 16:9 (one still per second at both, `WRW-Portugal-motion-beat-sheet-9x16.jpg`, `-second-sheet-16x9.jpg`) |
| Colour rules | No red on red, no green on green, no red on green. Green ground reads #046A38 on the page, #036836 in the encode |
| Chrome through floods | Legible through every flood and the bone ridges (checked at 9.15, 9.35, 19.25, 29.25, 39.25, 49.25, 56.5, 56.75, 57.0 s) |
| Read time | Unchanged from Sweden. The shortest line, "14.0% of residents foreign", is on screen 1.0 s, as Sweden's matching line was |
| Loop seam | Mean pixel difference, last frame to first (0–255): 1:1 0.179 · 4:5 0.197 · 9:16 0.153 · 16:9 0.188. A normal frame step here is 0.36–0.49, so the seam is smaller than ordinary motion |
| Video | All four: 60 fps, 3600 frames, 60.000 s, H.264 High, yuv420p, crf 18, +faststart; 4 subframes blended with tmix |
| Audio | 60.000 s, AAC 192 kbps; `mix.py` placed 61 events, max alignment error 0.000 ms; −13.8 LUFS, peak −1.0 dBFS |
| Hook | Keeps its question mark |
| Claims | No client, no present-tense partner, no price |

## Build notes
- `render-portugal.sh` (Git Bash) runs `win/render.mjs` per size (3 workers, about 4 minutes a size), then muxes with `audio-portugal.wav`. The final masters were re-encoded from `out/<size>/video.mp4` with the range conversion above.
- `win/run.py music.py music.npy` rebuilt the series track; `win/run.py mix.py music.npy events-portugal.json audio-portugal.wav` mixed it.
- Covers: page stills at 1.9 s (the full hook), one per size.

## Filed (7 Nov 2026)
- Here: the four MP4s, four covers, both sheets; `source/WRW-Portugal-motion-source.zip`.
- Drive › 009 - WRW Hospitality › Wesley Tuesday Content › Edition 03 - Portugal (https://drive.google.com/drive/folders/1DagA-Fi9QaiwSKmx0xq-pb-yRYqxCQLL): the four videos, four covers and the source zip, copied through G: and checked byte for byte.
- Telegram: the four MP4s and the 9:16 cover. Nothing posted or scheduled; Wesley posts Wed 11 Nov 2026 at 08:00.
