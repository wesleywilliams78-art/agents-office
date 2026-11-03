# Tales of Nirn: handover (2 Nov 2026)

For the Claude Code chat that builds the series. Read this first, then `plan/PILOT.md`. Everything is in this repo folder (`videos/tales-of-nirn/`). The Brain notes are in `C:\Users\Wesley\Agents Office Brain\40-Marketing\tales-of-nirn.md` (queue and order) and the social calendar `20-Brand\content-calendar.md`.

## What it is
Wesley's fan Instagram series: Elder Scrolls in-game books read aloud as narrated "living stills". It is a **separate brand from WRW Hospitality: never mix them**. Own Instagram account, own YouTube. Wesley posts from his phone, from Drive.

## The rhythm (set 2 Nov 2026)
**One Reel every day, seven days a week.** An episode is three to five Reels (each under 3 minutes). About 900 words is three Reels; the 1,400-word pilot was five. Stay at least one whole episode ahead of the calendar.

## The order of books
**Skyrim first, then Oblivion, then Morrowind.** Books not in those games (Daggerfall-only, ESO-only) wait until after, or until the Hammerfell/Sentinel game gives new books to lean on. Night Falls on Sentinel is in all three, which is why the pilot opens the series.

## Confirmed by Wesley on 2 Nov 2026

| Ep | Book | Games | Length | Reels | Goes out |
|---|---|---|---|---|---|
| 01 | Night Falls on Sentinel (Boali) | Morrowind, Oblivion, Skyrim | ~1,400 words | 5, **built**, in Drive | Tue 3 to Sat 7 Nov |
| 02 | **The Alik'r** (Enric Milres) | Skyrim (Creation Club), Daggerfall, ESO | ~900 words | 3 | Sun 8 to Tue 10 Nov |
| 03 | **Immortal Blood** (anonymous) | Oblivion, Skyrim, ESO | ~1,700 words | 3 | Wed 11 to Fri 13 Nov |
| 04 | **A Game at Dinner** (an anonymous spy) | Morrowind, Oblivion, Skyrim | ~2,500 words | 3 or 4 | Sat 14 Nov on |

Word counts are estimates: count the real text before scripting.

**The deadline that matters: Episode 02 must be built and approved by Sat 7 Nov**, when Episode 01's last Reel goes out. Episode 01 Part 5's end card already needs to name *The Alik'r* as the next book. Episode 03 needs to be ready by Tue 10 Nov, Episode 04 by Fri 13 Nov.

### The books
- **The Alik'r:** a first-person essay. The narrator meets the Redguard poet Weltan in a little tavern in Sentinel, spends two years in the Alik'r Desert and returns to Sentinel. Opens "I might never have gone to the Alik'r Desert had I not met Weltan in a little tavern in Sentinel." It is an essay, not a story, and it ties to the pilot (Sentinel). Text: https://en.uesp.net/wiki/Lore:The_Alik%27r
- **Immortal Blood:** a chapel priest hosts a vampire-hunting ex-Fighters Guild trainer; the priest is the vampire (twist in the last line). Opens "The moons and stars were hidden from sight, making that particular quiet night especially dark." Split: arrival, the lessons, the reveal. Non-graphic. Text: https://www.imperial-library.info/content/immortal-blood
- **A Game at Dinner:** a spy's letter about a dinner where Prince Helseth poisons the cups and cutlery and says only the antidote in the tureen will save them. Includes a foreword. A painful poisoning death, not gratuitous. Text: https://en.uesp.net/wiki/Lore:A_Game_at_Dinner (the letter's first line was not confirmed).
- Reserves if any fails: Vernaccus and Bourlor, Fall of the Snow Prince, Chance's Folly, Ice and Chitin. Full shortlist and the dropped books are in the Brain note.

## The format (decided 2 Nov, replaces the rejected puppet animation)
- **One crisp key image per story**, which is also the thumbnail, Skyrim/Nordic look, showing the story's characters. **Exactly three things move, slowly and steadily**; everything else is frozen. (Ep01: hearth fire and candles, hearth smoke, clouds past a window.) For each new episode, choose the three moving things with Wesley.
- **Image:** local Z-Image-Turbo in the LTX Desktop backend (1920x1088, 8 steps, cloud generation forced off). Make four candidates, send the best to Wesley for approval.
- **Motion:** LTX image-to-video with `imagePath = lastImagePath = the key still` (so it loops), slowed 3x with minterpolate, masked back onto the still with `mask.py`. Clouds come from `livingstill.py`. The master loop is about 60 s.
- **Sound:** narration over **fire crackle only** (`sound/ambience.py --crackle-only`, mixed at volume 0.8, about 22 dB under the voice). **No music.** Mix to -16 LUFS. (Wesley found the roar and hiss layers read as wind and the tavern sounds too much.)
- **Type:** Skyrim-menu style in Tw Cen MT Condensed: BOOK TITLE in tracked capitals, a hairline rule fading at its ends, TALES OF NIRN smaller beneath. The banner stays on screen the whole clip, the title card is on frame 0, and the rights line goes on the last part. Drawn by `titles.py`, cut by the episode's `cut.sh` (supports `vertical`).
- **Reels:** a **tall 9:16 version of the same scene** (`still/tall/tall2.py`): the scene trimmed at the sides, set low and large, **only the ceiling painted above** (Z-Image img2img, strength 0.72), the table's near edge falling into shadow below. The moving loop is laid in the same place. Never a blurred wash, never painted extensions below the scene.
- **Delivery per episode:** the full episode plus three to five Reels, 16:9 parts and a thumbnail.

## The narrator (a hard rule)
**Only the curated female voice reads, on every Reel and every cut. No male or other voice, ever.** It is take A: the Night Reader reference (`voice/passage/ref/night-reader.wav`, seed 53) in VoxCPM2 via VoiceStudio at max quality, `effect_preset=raw`, `denoise=false`, with the instruct asking for a woman's warm low contralto, speaking slowly. Never ask for a "very low pitch" without saying woman: it tipped 16 lines into a male voice.
Every line must pass `voice/gate.py` (pitch register) and the Whisper word check before assembly. Then `voice/declick.py` and `deplosive.py`, then assemble with `voice/build-clean.sh` (no per-line time-stretch, no gain dips, 20 ms in / 80 ms out fades). Pace: the whole read slowed with **atempo 0.8** (Wesley's choice), which is why 900 words runs about nine minutes. Respell names for the model (the pilot used "Joe-mick", "Ha-bah-la"). For this run, check with Wesley how to say: Alik'r, Weltan, Enric Milres, Helseth, Fighters Guild names, and the vampire tribes in Immortal Blood.

## What Wesley approves
1. The key image for each episode (pick of four).
2. The narrator's pronunciations.
Everything else follows the pipeline. He reviews the Drive delivery and posts.

## Delivery (not Telegram)
Copy to `G:\My Drive\010 - Tales of Nirn\Episode NN - <Title>\` with `Instagram Reels\` (`<Title> - Part N of M.mp4` plus `Captions - <Title>.txt`) and `YouTube\` (full episode and thumbnail). Brand files: `G:\My Drive\010 - Tales of Nirn\Brand\`. Episode 01 is already there: copy its layout.

## The calendar
The social calendar has one Tales of Nirn row a day (amber). Episode 01 Parts 1 to 5 on Tue 3 to Sat 7 Nov; Ep02 Sun 8 to Tue 10; Ep03 Wed 11 to Fri 13; Ep04 from Sat 14. The Monday plan adds each next week's rows from the queue; if you change an episode's number of Reels, tell Wesley so the rows are updated.

## Rights
Book text and our own art only. A ZeniMax credit on the last part of every episode. No selling, no sponsorship. Never call it "Skyrim Library" (too close to Bethesda's own print series; the name is Tales of Nirn). It is Bethesda/ZeniMax material read as fan content, not a licence: check ZeniMax's fan-content terms before anything is monetised.

## Open points to settle
- Count the real words of each text before scripting; confirm how many Reels each makes.
- *The Alik'r* is Creation Club content in Skyrim: say so in the description if it matters to viewers; the text itself is also in Daggerfall and ESO.
- The Skyrim book list the researcher read was partial: a better Skyrim story, or a Hammerfell one, could exist.
- The calendar rows for Ep02 and Ep03 say "3 Reels": adjust if the cut gives a different number.

## Where things are
- Plan and the pilot: `plan/PILOT.md`; the pilot episode: `episodes/ep01-night-falls-on-sentinel/` (`SHOTLIST.md`, `cut.sh`, `assemble.sh`, `still/`, `sound/`, `titles/`, `captions/`, `renders/`). Older puppet-animation files in `narration*/` and `blender/` are history.
- Voice tools: `voice/` (`gate.py`, `declick.py`, `deplosive.py`, `build-clean.sh`, `redo-gated.sh`, `passage/`).
- Titles and captions: `titles.py`, `captions.py`.
