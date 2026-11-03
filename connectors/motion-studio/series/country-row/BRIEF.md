# The Instagram country row (WRW Hospitality)

Wesley's rule (27 Oct 2026): **every week, WRW Hospitality's Instagram Reels are one row of three for that week's Franchise Entry Report country.** The middle Reel is the templated country motion reel. On either side is a Reel of real, free footage from that country: sweeping vistas, a city view, whatever good free footage exists. The worked example is Norway: `output/library/video/norway-grid-row/` and `output/library/video/norway-motion-reel/`. `reference-norway-row.jpg` shows the three covers as the grid shows them.

The office plans it, scripts it and shortlists the footage (skill `instagram-country-row`). Claude Code builds it here: the side reels need downloads and ffmpeg, which the office's agents don't have.

## The row
| Left | Middle | Right |
|---|---|---|
| Footage Reel, 15–20 s | Country motion reel, 20 s | Footage Reel, 15–20 s |

Post in this order, back to back, nothing in between: right, then middle, then left (Instagram shows the newest post top-left). Default slot: the Tuesday after the issue's Friday release, 11:00. The calendar may move it.

## The middle reel (`middle-template.html`, Norway)
20 s, 1080×1920, 60 fps, 3 subframes, 120 BPM, Archivo only, music-led, no voice. Built in the Motion Studio engine (springs, beat grid, frame 0 held, no hard colour cuts).
1. **0–2.5 s: the hook question on the country's flag**, built from shapes in the flag's own colours, and frame 0 is the thumbnail: "WANT TO GROW YOUR BRAND IN <COUNTRY>?" with the country word in the flag's second colour. Kicker under the WRW logo: "FRANCHISING IN <COUNTRY>".
2. **2.75–4.5 s: the verdict** from the issue, rolled letter by letter, on the same flag. The flag moves with the words (Norway: the cross widens on OPEN and closes in on NOT EASY).
3. **4.5–15.5 s: three data scenes**, each made out of the previous shapes, built from the issue's headline numbers and white spaces. Norway used 85 → 100 sites, the £21/hr tower in 3D, and the narrowing chicken window. Every figure comes word for word from the issue PDF, with "(estimate)" where the report says so.
4. **15.5–16 s: the strongest moment:** everything folds back into the flag.
5. **16–20 s: the WRW Hospitality call to action:** WRW HOSPITALITY under the logo, "LET'S TAKE YOUR BRAND TO <COUNTRY>.", then "Entry plans, unit economics and franchise-ready operations.", then a bone button DM US "<COUNTRY>". The last frame mirrors frame 0, so it loops.

Colours: **anything tied to the country uses the flag's exact colours**: the flag, the country's name, its underlines (Norway blue `#00205B`). The WRW palette carries the rest; a red flag field stays WRW red `#EC3013`. No mountains on the opening and closing cards (Wesley found them cluttered). Never draw the flag's emblem or coat of arms: colours and geometry only. Nordic crosses (Sweden, Denmark, Finland, Iceland) reuse the Norway geometry with their own colours. Bands and tricolours are built from three bars that become the first data shape.

## The side reels: city compare (`city-template.html` + `city-run.mjs`)
**Wesley's rule (28 Oct 2026, after the Norway row went live):** the side reels compare two places in the country, in the style of the @_lost.in.edinburgh "edinburgh or london?" reel. Worked example: `output/library/video/norway-city-compare/` (Oslo or Reine? | report | Tromsø or Bergen?).
- **Choose the four places by volume of real footage, not by preference.** Scan Pexels (search pages carry each clip's title, description, size and creator) and Pixabay. Count the clips whose creator's title or description names each city or town. Take the places with the most usable 4K, then pair them: left "A or B?", right "C or D?".
- **Each reel is 17 s, 1080×1920, 30 fps, 120 BPM:**
  - two shots of the first place;
  - a cut on the beat at 8.5 s to two shots of the second place;
  - each shot is 4 s;
  - frame 0 is held for half a second, because it's the cover.
- **Every new shot opens out of a band at the caption's height (y 960).**
- **Caption across the middle:** "A or B?" in fountain-pen script (Pristina, from this PC's fonts), white ink with a soft ink shadow. It sits on a soft ink band so it reads on mist and sky. Both reels in a row share one size.
- **Underline:** a nib-stroke underline sits under the place on screen and sweeps across to the other place on the city cut.
- **Logo:** the white WRW Hospitality lockup sits at the foot over a soft ink floor.
- **No close card.**
- **Footage:**
  - Real only, never AI-generated; Pixabay labels many as AI, so skip them all.
  - The creator's own title or description must name the place; site tags are unreliable.
  - Pexels first, Pixabay second.
  - Use 4K vertical, or 4K landscape cropped to 1215×2160 (or tighter, so the landmark sits below the caption).
  - Four shots per reel (two per place) plus one spare per place.
  - Write the shortlist with links, creators, sizes, lengths and licences. **Wesley approves every download.**
  - Keep the licence record beside the reels.
- **Frames:**
  - One graded 1080×1920 JPEG sequence per shot, 5 s at 30 fps (`f_%04d.jpg`). Light grade: `eq=saturation=0.92:contrast=1.04`.
  - HDR clips (HLG, `arib-std-b67`) need tone-mapping first: `zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,tonemap=tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv,format=yuv420p`.
  - Check stills before the final: nothing recognisable should sit behind the caption, and the lockup should be readable.
- **Render:** `PAIR="A or B?|C or D?" node connectors/motion-studio/series/country-row/city-run.mjs <frames> "A" "B" <a1> <a2> <b1> <b2> <country>-left final`, then the same for the right.
- The first build (27 Oct, fjord vistas closing into a contact panel) is kept as `side-template.html` + `side-run.mjs` and is no longer the default.

## Footage clean-up (Wesley's rule, 28 Oct 2026)
- **When:** once Wesley confirms the row is live, ask him to confirm the clean-up. Ask every time and never delete without his yes.
- **Delete:**
  - the downloaded footage (`footage/`);
  - the graded frame sequences;
  - the engine's draft, still and final folders in `output/motion/`.
- **Keep:**
  - the finished reels and their no-audio copies;
  - the source (template, run file, README);
  - the licence record, whose links let a shot be downloaded again.

  Raw footage must never build up on this PC.

## Delivery
- Into `output/library/video/<country>-city-compare/` (side reels, `footage/` until the clean-up, licence record, README with the posting order and captions) and `output/library/video/<country>-motion-reel/` (the middle).
- Every Reel with the synthesised guide beat and a `(no audio)` copy: Wesley adds a track in Instagram, around 120 BPM, started on a downbeat. A commercial track can't be built into the file.
- Captions: plain WRW voice, WRW Hospitality named, DM us "<COUNTRY>", thank the footage creators. Never name a place the creator didn't.
- Send to Wesley on Telegram in posting order, each Reel followed by its caption as its own message so he can copy it; anything over 45 MB gets a CRF 20 copy. Nothing is posted by the office.
- Mark the row `built` in `20-Brand/content-calendar.md` and note the files on the issue's `ISSUE.md`.
