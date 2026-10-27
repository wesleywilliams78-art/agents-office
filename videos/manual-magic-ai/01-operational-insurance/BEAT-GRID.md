# Operational Insurance™ explainer: beat grid (draft for sign-off, 26 Oct 2026)

Status: **signed off by Wesley on 26 Oct 2026, with the changes below.** Answers the same day: Jost; logo from a screenshot of manualmagic.ai; no consent for Pip Wilkins' photo (quote runs without it); hold on the definition; keep the generated track; "Auto-sorted" cleared; frame-0 pill "Ask your manager"; bar 25's spare bar given to the quote. As built in draft 1, bars 20–25 run: quote bars 20–21, BFA chip bar 22, Operational Insurance™ bars 23–25 (title, rows, then the definition held on bar 25). The table below is the signed-off grid before those answers.

## Track (measured with numpy, `../tools/beatgrid.py`)

- `audio/track-ace-step-mmvpu9bjlv2x.mp3`: original 70 s instrumental made on this PC with ACE-Step 1.5 (MIT licence, no third-party music). A second 120 s take (`output/music/mmvpubil5oir.mp3`) was rejected: tempo drifts to 120.2 BPM and its downbeat is ambiguous.
- Tempo **119.990 BPM** over the groove (97 beats fitted). Beat jitter 6.5 ms RMS, 24 ms max: that is the track's feel, not drift.
- Bar 1 b1 = **6.8014 s** into the file. 30 bars on the measured grid = 60.0048 s, so the drift against the 60.000 s video is 4.8 ms (under a third of a frame). No time-stretch needed.
- `audio/track-60s.wav` is the 60.000 s trim (48 kHz stereo). Re-measured: bar 1 b1 at 0 s, 119.999 BPM, downbeat phase confirmed.
- Shape: bars 1–5 are sparse (pads and plucks, no kick; bass creeps in over bars 3–5). **The groove enters on bar 6 b1 (9.998 s)**, the exact beat the copy turns from the problem to the platform. Bar 30 is the track's decaying tail, which lands within 1.8 dB of bar 1, so the audio loop seam is level-matched.
- `audio/beatgrid.json`: every bar and beat in video time and track time.

Every bar n b1 sits at 2(n−1) s. The times in the brief stand; the changes below are content and alignment.

## Grid

| Bars | Time | Music | State | On the beats |
|---|---|---|---|---|
| 1–2 | 0:00–0:04 | Sparse | Button: the hook (white pill) | Bar 1: b1 cursor enters · b2 hover · b3 press · b4 release. Bar 2: "What happens / when your / best manager / leaves?" one group per beat |
| 3–4 | 0:04–0:08 | Sparse, bass creeps in | Search field | Bar 3: b1 pill stretches into a search bar · b2–b4 types "steamer wand" *(changed)*. Bar 4: b1 "0 results" · b2–b4 "The answer left with them." |
| 5 | 0:08–0:10 | Last sparse bar | Toast | b1 "Buried in a bloated drive" · b2 "On a fading Post-it" · b3 "In a manager's head" · b4 collapses to "Scattered." |
| 6 | 0:10–0:12 | **Groove enters b1** | Toast → button | b1 toast becomes "Get your team on the same page" with the first kick · b2–b3 cursor travels · b4 press |
| 7–8 | 0:12–0:16 | Groove | Loader → check (sky ring) | Bar 7: PDF · DOCX · TXT · MD drop in, one per beat. Bar 8: ring fills b1–b3 · b4 check "Your IP, uploaded" |
| 9–10 | 0:16–0:20 | Groove | Dynamic island | Bar 9: expands, chips sort into unlabelled groups, one per beat. Bar 10: b1 groups lock with a tick (label "Auto-sorted" only if cleared) · b2–b4 widens into a board |
| 11–13 | 0:20–0:26 | Groove | Tabs, orange liquid indicator | *(changed order)* Bar 11: a card drafts itself under Draft, one line per beat. Bar 12: the cursor moves it on: b1 Review · b2 Approved · b3 Published · b4 the card settles with a check, indicator following each click. Bar 13: "AI accelerates the draft; your experts and ours make sure it's right." |
| 14–15 | 0:26–0:30 | Groove | ⌘K search | Bar 14: collapses to ⌘K; types "closing checklist". Bar 15: b1 "Closing checklist · Published" · b2 enter · b3 ticks "Purge the steamer wand" · b4 ticks "Cash up the till" *(changed: callback to bar 3)* |
| 16–17 | 0:30–0:34 | Groove | Toggle (sky track) | Bar 16: b1 "Your data trains AI?" flips to **No** · b2 label settles · b3 "Hosted in" row slides in · b4 cursor reaches it. Bar 17: b1 flips to **UK** · b2–b3 labels settle · b4 chip "Ring-fenced per client account" *(cleared wording)* |
| 18–19 | 0:34–0:38 | Groove | Progress bar → slider | Bar 18: b1 progress bar · b2 fills · b3 handle appears at "Months" · b4 cursor grabs. Bar 19: b1 dragged across the barline, label springs to **Weeks** · b2 release, handle settles · b3–b4 "Weeks, not months" |
| 20–21 | 0:38–0:42 | Groove | Quote card | Bar 20: b1 circle photo springs in · b2–b4 "Manual Magic AI / is a real innovation / for franchising". Credit: Pip Wilkins, CEO, the British Franchise Association. Bar 21: card shrinks to chip "Methodology endorsed by the British Franchise Association", source "BFA" |
| 22–25 | 0:42–0:50 | Groove | Operational Insurance™ card (orange, navy text) | Bar 22: b1 card expands · b2–b4 "Operational Insurance™". Bar 23: b1–b3 rows tick "Key-person dependency" · "Brand dilution" · "Knowledge loss" · b4 hold. Bar 24: the definition line. Bar 25: Penny's approved line, or hold on the definition |
| 26–27 | 0:50–0:54 | Groove | Author chip | Bar 26: "Built on Penny Hopkinson's three-step methodology". Bar 27: b1 "Over 40 years of franchising and operational expertise" · b3 "*Manual Magic* · Amazon international bestseller" *(cleared wording)* |
| 28–29 | 0:54–0:58 | Groove | CTA with logo | Bar 28: b1 logo scales in on a spring · b2 lands, slow turn begins (≤15° in all) *(changed: no "ring brightens")* · b3 the shape slides in under it · b4 turns orange. Bar 29: b1 "Get Started" · b2 "manualmagic.ai" · b3 cursor hovers · b4 press |
| 30 | 0:58–1:00 | Track's tail decays to the bar-1 level | Back to the hook | b1–b3 morph home · b4 = frame 0, cursor position and speed matched |

## Open before the build

1. Futura PT licence for video, or Jost.
2. Logo: vector or 2048 px master (nothing on this PC). Say if the artwork contains sky blue: it shares bar 28–29 with the orange button.
3. Pip Wilkins: circle-crop photo and video consent.
4. Bar 25: Penny's line, or hold on the definition.
5. Track: keep this generated one, or send a licensed library track to re-measure.
6. "Auto-sorted" (bar 10) is not on the cleared list.
7. Frame 0 pill label (it is the poster): default "Ask your manager".
8. Data, hosting and ring-fence claims (bars 16–17): Penny reconfirms before the final render.
