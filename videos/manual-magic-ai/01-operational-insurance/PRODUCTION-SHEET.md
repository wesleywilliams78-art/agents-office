# Operational Insurance™ explainer: production sheet (draft 6, 28 Oct 2026)

**Draft 6** applies Penny's last amend (28 Oct 2026). The testimonial credit now reads "Pip Wilkins QFP, CEO, the British Franchise Association". QFP is the BFA's Qualified Franchise Professional post-nominal, so it follows the name with no comma. The longer line still sits inside the quote card's margins in both formats. On bar 20 b4 the cursor now moves to the empty space right of the quote, so it no longer rests on the credit. Nothing else changed: same timing, same audio.

**Draft 5** replaces the "manualmagic.ai" text label on the opening with the logo itself (Wesley, 27 Oct 2026). It is one logo all the way round the loop:
- It scales in for the CTA on bar 28.
- On bar 30 b3, as the CTA button folds into the hook card, it glides up and settles above the card. It shares the camera's spring, so its screen size only shrinks: 547 px down to 435 px.
- It stays through the question and leaves on bar 3 b1.

That covers the brief's "opening reveal and closing CTA only" for the logo. It never exceeds the 549 px source, rotates 6° in all over its 10 s on screen, and keeps more than 20% clear space above the card. The web address now appears only in the CTA button, written as on the site, "manualmagic.ai", with no mark: ® belongs on the brand name, not the address.

**Draft 4** applies Penny's feedback (27 Oct 2026): "Manual Magic AI®" every time the name appears on screen. The only place it appears as text is the Pip Wilkins quote (0:38–0:42), which now reads "Manual Magic AI® is a real innovation for franchising". The ® is a superscript at half the cap height, top-aligned to the cap line. The logo artwork, the URL manualmagic.ai and the book title *Manual Magic* are unchanged. **Before publishing:** in the UK, marking an unregistered trade mark as registered is an offence (Trade Marks Act 1994, s.95). Confirm the UK registration number for Manual Magic AI. If it is not registered, or only applied for, change `BRAND_MARK` in `src/timeline.js` to ™ and re-render.

**Approved by Wesley on 27 Oct 2026.** Draft 6 replaced draft 5 in Google Drive `006 - Manual Magic/General Content/` on 28 Oct 2026 (both cuts and both posters, plain names) and went to his Telegram the same day, for him to send on to Penny. Penny still has to reconfirm the data lines at 0:30–0:34 before it is published.

**Draft 3** (Wesley's notes, 27 Oct 2026):
- **New opening hook** on the pain of scaling: "Ten teams. Ten ways of doing the same job." It is frame 0, so it is also the poster. Under it, ten marks fall out of step on bar 1 b2–b4. The question "What happens when your best manager leaves?" follows on bar 2.
- **"manualmagic.ai" label** above the hook and the question for the first 4 s. At the end it appears again in the CTA button. (Draft 5 replaces this label with the logo.)
- **"Ask your manager" removed.** The CTA ("Get Started · manualmagic.ai" with the logo) now holds from 0:55 to 0:59, then folds into the hook so the loop closes.
- **Bridge transitions:** at most slide changes, the shape collapses on the beat into an element of the old slide, then opens an eighth note later as the next slide:
  - hook → question, and question → search, through a small pill
  - board → ⌘K through the "Published" button
  - ⌘K result → checklist through the highlighted row
  - checklist → toggles through the box just ticked
  - toggles → slider through the UK toggle
  - slider → quote through the handle
  - Operational Insurance™ → author chip through a pill
  - CTA → hook through the button
  The other changes already flow from one element into the next (button → upload card, card → loader circle, circle → island, chip → orange card).

**Draft 2 added a background dot field** at Wesley's request: a grid of small white dots on the navy canvas that breathes slowly and ripples out from the shape on the beat. Bars 1–5, which have no kick, get a soft wave on each downbeat only. From bar 6, where the groove enters, every beat sends a wave and every downbeat a stronger one. A downbeat wave turns orange only in states with no other orange and no sky: bars 6, 9, 10, 14, 20, 21, 22, 26 and 27. Everywhere else it stays white, so the one-orange-per-state and no-orange-with-sky rules still hold. The field moves on a slower camera than the UI, so it reads as a layer behind. The dots are flat, with no glow and no particles. Draft 2 files carry `-draft5` in their names.

Manual Magic AI · 60.0 s seamless loop · 120 BPM, 30 bars · UI motion, one shape, no cuts · Night canvas.
For Manual Magic AI's own channels (LinkedIn, Instagram, website). No partner or third-party attribution on screen apart from the cleared BFA claim and testimonial.

## Files

| Item | File |
|---|---|
| Master 1440 × 1440, 60 fps | `renders/manual-magic-ai-operational-insurance-1440-draft6.mp4` |
| Vertical 1080 × 1920, 60 fps | `renders/manual-magic-ai-operational-insurance-1080x1920-draft6.mp4` |
| Poster (frame 0) | `renders/poster-frame0-1440-draft6.png`, `renders/poster-frame0-1080x1920-draft6.png` |
| Beat-grid sheet, one still per beat | `renders/beat-grid-sheet-1440-draft6.pdf` (120 stills in `out/square/stills/`) |
| Earlier drafts | Kept beside them with `-draft1` (no dot field) and `-draft2` (old opening) in the name |
| Source | `square.html`, `vertical.html`, `src/timeline.js`, `src/style.css`, `assets/` |
| Audio | `audio/mix.wav` (final mix), `audio/track-60s.wav`, `audio/sounds.json` (every UI sound and its time) |

## Claims on screen (cleared list only)

| Time | On screen | Cleared claim | Source / note |
|---|---|---|---|
| 0:12 | PDF · DOCX · TXT · MD, "Your IP, uploaded" | Upload IP: PDF, DOCX, TXT, MD | Brief §5 |
| 0:18 | "Auto-sorted" | Cleared by Wesley, 26 Oct 2026 | manualmagic.ai section "Auto-Sort Into Categories" |
| 0:19–0:24 | Draft → Review → Approved → Published, a person moves the card through each stage | SOP Board stages | Brief §5 |
| 0:20 | A card drafts itself (a closing checklist) | Generate SOP drafts, checklists and FAQs | Brief §5 |
| 0:24 | "AI accelerates the draft; your experts and ours make sure it's right." | Quoted as cleared | Brief §5 |
| 0:30 | "Your data trains AI?" → **No** | Zero client data used to train any AI model | **Penny to reconfirm before the final render** |
| 0:32 | "Hosted in" → **UK** | UK-hosted | **Penny to reconfirm before the final render** |
| 0:33.5 | "Ring-fenced per client account" | Ring-fenced per client account | **Penny to reconfirm before the final render** |
| 0:35–0:38 | Slider dragged from "Months" to "Weeks, not months" | Weeks, not months (positioning line, no number) | Brief §5 |
| 0:42 | "Methodology endorsed by the British Franchise Association", source line "BFA" | Methodology endorsed by the BFA | Source line: BFA |
| 0:44–0:50 | "Operational Insurance™", three rows, then the approved definition | Approved definition, word for word | Bar 25 holds on the definition (no extra line from Penny) |
| 0:50 | "Built on Penny Hopkinson's three-step methodology" | As cleared | |
| 0:52 | "Over 40 years of franchising and operational expertise" | As cleared, refers to Penny | Follows her name on the previous chip |
| 0:53 | "*Manual Magic* · Amazon international bestseller" | As cleared | |
| 0:56 | "Get Started · manualmagic.ai" | Site CTA wording | manualmagic.ai buttons read "Get Started" |

Not used: £1,000 per outlet; "extends training by almost half"; any number of categories; any price.

## Testimonial

"Manual Magic AI is a real innovation for franchising" (0:38–0:42). Credit: Pip Wilkins QFP, CEO, the British Franchise Association (QFP added at Penny's request, draft 6). **No photo:** video consent was not given, so the card carries a typographic quote mark instead. No other testimonial appears.

## Other copy (not claims)

manualmagic.ai · Ten teams. Ten ways of doing the same job. · What happens when your best manager leaves? · steamer wand · 0 results · The answer left with them. · Buried in a bloated drive · On a fading Post-it · In a manager's head · Scattered. · Get your team on the same page · Closing checklist · Purge the steamer wand · Cash up the till · Lock the back door · Send for review · Approve · Publish · Published · closing checklist · ⌘K. Largest block: 12 words (the bar 13 caption). No exclamation marks, no emoji, no prices.

## Licences and sources

- **Music:** original instrumental generated on this PC with ACE-Step 1.5 (MIT licence; model `acestep-v15-turbo`), job `mmvpu9bjlv2x`, 26 Oct 2026. No third-party samples or library music. Kept by Wesley's decision, 26 Oct 2026. ACE-Step's own guidance encourages disclosing AI involvement in the music.
- **Fonts:** Jost (SIL Open Font Licence, used in place of Futura PT, decided 26 Oct 2026) and Geist (SIL Open Font Licence). Licence files in `assets/fonts/`.
- **Logo:** a 1:1 screenshot of the site's own `manualmagic.ai/graphics/logo.png` (549 × 549 px), taken with Wesley's permission because no master file was supplied. Shown at 547 px at most, never above the source size. Only the plain navy margin of the square file is feathered so its edge never shows. The artwork is not redrawn or recoloured. It rotates 6° in all, and appears only on the closing CTA.
- **Sounds:** every UI sound is synthesised (clicks, keystrokes, a short rising tone on checks, soft whooshes on morphs), with no magic-wand or sparkle sounds. Each sound is placed so that its measured peak lands on its event.

## Pre-publish checklist (draft 1)

| Check | Result |
|---|---|
| One shape, no cuts; last frame equals the first | Pass. One element morphs through every state. The timeline is periodic, so t = 60 renders pixel-identical to frame 0, cursor position and speed included. The cursor is off-frame at frame 0 and enters on bar 1 b1. |
| Palette from section 3 only; one orange element per state; no orange and sky in the same state | Pass. All 120 beat stills were scanned; no beat shows orange and sky together. Exception: the logo artwork (blue ring, orange script) sits beside the orange CTA, as supplied artwork. Derived tints: navy at 60% for secondary text, and an 18% navy outline on the toggle tracks so a Mist track reads on white. |
| No white text on orange or sky | Pass. Navy text on the orange card, the CTA, the sky chip and the checks. |
| Logo on the opening reveal and CTA only, never upscaled past the source | Pass. CTA only (the grid has no opening reveal). At most 547 px on screen from the 549 px source, clamped in code during the camera move. |
| Operational Insurance™ spelled exactly, ™ legible, no insurance-product words | Pass. The ™ is 52% of cap height, top-aligned to the cap line. No policy, cover, premium, claim or underwritten. |
| Only cleared claims, plus the BFA source line | Pass, with the three data lines flagged for Penny (above). |
| Only the Pip Wilkins testimonial, word for word | Pass. No photo (no consent). |
| "Manual Magic AI" with a capital I in every frame | Pass, written "Manual Magic AI®" at Penny's request (see the trade-mark note above). |
| No prices, no exclamation marks, no emoji, no block over 12 words | Pass. Largest block: 12 words. |
| Vertical cut inside the safe zone | Pass. All text and the logo sit between 14% from the top and 20% from the bottom. |
| Works muted | Pass. Every message is on screen; nothing depends on sound. |
| Track licence filed | Generated locally (ACE-Step 1.5, MIT). Record above; no third-party licence exists to file. |
| Files under 50 MB | Pass. Draft 3: square master 24.3 MB, vertical cut 24.2 MB (draft 2: 23.2 MB and 23.5 MB (draft 1: 12.4 MB and 9.2 MB; the dot field adds detail). Both 60.0 s, 3,600 frames, −13.9 LUFS, true peak −1.7 dBTP. In the encoded files the last frame differs from frame 0 at only 0.02% (square) and 0.01% (vertical) of pixels, at shape and text edges. That is H.264 keyframe noise: the source frames are identical. |

Measured: 120 BPM grid from the track (119.99 BPM, beat jitter 6.5 ms RMS). Audio −14 LUFS integrated, true peak below −1.5 dBTP. The last bar of the track crossfades into its own pre-roll, so the audio loops without a jump. 60 fps, 4 subframes per frame over a 180° shutter, blended with ffmpeg tmix. H.264 High, yuv420p, BT.709, +faststart, AAC 192 kbps.
