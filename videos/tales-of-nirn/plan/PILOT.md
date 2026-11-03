# Pilot: *Night Falls on Sentinel*

**Tales of Nirn**, a fan series separate from WRW Hospitality. Skyrim's books come first, then Morrowind, Oblivion and ESO. One book, one episode, to test the look, the workload and whether people watch to the end.

Source: https://www.imperial-library.info/content/night-falls-sentinel (in-game author Boali, written by Ted Peterson). About 1,000 words, so roughly 6½ minutes read aloud.

## Why this book
- One volume, self-contained, no lore needed to follow it.
- Two characters, three locations, and a twist at the end.
- A built-in visual gag (the pain-centre count, "That's sixty-three").
- The violence happens off screen, in the dark. That's safer on Instagram and cheaper to animate.

## Before anything is built
1. **Series name: Tales of Nirn (decided 1 Nov).** "Skyrim Library" is too close to Bethesda's own print series *The Skyrim Library* (Titan Books). Pick a name of our own and don't use "Skyrim" or "Elder Scrolls" in it. Lore words are fine. Note that **Atmora** is not the whole land. It's the frozen, abandoned continent north of Tamriel that the Nords came from. The world is **Nirn**, the continent is **Tamriel**, and Skyrim is one of its provinces. Shortlist: *The Dusty Shelf*, *Tales by Candlelight*, *The Unread Library*, or a lore name such as *Tales of Nirn* or *Out of Atmora*.
2. **Rules we keep** (Bethesda video policy): book text and our own art only. No game models, textures, music, logos or screenshots. No selling, Patreon gating or sponsors. Every episode carries: *"The Elder Scrolls © ZeniMax Media Inc. Fan adaptation, not affiliated with or endorsed by Bethesda."*
3. **Accounts.** A new Instagram account (decided 1 Nov), plus a YouTube channel for the full episodes if wanted, under the chosen name. Wesley creates them himself.

## The narrator (decided 1 Nov: not Wesley's voice)
A voice designed for this series and kept for every episode: deep and warm, with a slow, soothing bedtime-reading feel.
- **Brief for the voice:** low register, unhurried (about 130 words a minute), close to the mic and soft-edged, a little breath between sentences, never theatrical. Characters get a slight shift in pace and pitch, not accents.
- **How it's made (decided 1 Nov: locally):** VoiceStudio on this PC designs the voice from a description with VoxCPM2. Five auditions are in `voice/auditions/` (see its README). **Chosen 1 Nov: the Night Reader** (deep, hushed contralto), saved in VoiceStudio as *Tales of Nirn Narrator* (profile `cb93021e`, seed 53). Every line runs through `voice/deplosive.py` and then `voice/softp.py`, because Wesley noted the P's hit hard. The reading is 0.8× with pauses and breaths, as in `voice/passage/`.
- **Never** imitate a real person: not the game's voice actors, not a famous narrator.
- **Finish (the butter):** a gentle low-end warmth, light de-essing and soft compression, a quiet library room tone underneath, and the music bed ducked well below the voice.

## The format (decided 2 Nov, replaces the puppet theatre)
Each book is one **living still**: a crisp, Skyrim-style key image of the story's scene and characters, which is also the thumbnail. Exactly three things move, slowly and steadily; everything else is frozen. The narration runs over a synthesised fire-and-tavern bed, with no music. The type is in the style of Skyrim's menus: the book's title, a fading hairline rule, and TALES OF NIRN beneath, held on screen throughout. The pipeline is in `episodes/ep01-night-falls-on-sentinel/` (still/, sound/, titles/, cut.sh) and in the series memory. The puppet look test and the Part 1 puppet drafts are kept in `output/blender/tales-of-nirn/` for reference only.

> Superseded below: the puppet plan, kept for the record.

## The look: a puppet theatre in the library
The figures are carved wooden puppets on small lit sets, and the camera moves like a hand-held lantern. Faces never move, so there's no lip-sync, rigging is minimal, and figures slide, tilt and turn the way puppets do. This keeps every episode affordable, and it becomes the series signature.

- Rendered in Blender with Eevee: warm practical light, deep shadow, dust in the air.
- **Animated at 12 fps, like stop-motion** (decided 1 Nov). It halves render time, and the puppets look moved by hand. Output is still 24 or 30 fps, with each pose held for two frames.
- The flashback is a different world: ink-on-parchment, desaturated, paper-cut layers.
- Our own palette and type for the series, not the WRW bone, ink and red.

## Episode structure (16:9 master, about 6:45)
| # | Time | Scene | Set / treatment |
|---|------|-------|-----------------|
| 0 | 0:00 | Static title card on frame 0 (also the cover) | Book on a lectern, candle lit |
| 1 | 0:02 | Hook: *"Who d'you want dead?"* | Tavern cellar, push in on Jomic |
| 2 | 0:15 | The Nameless Tavern: Haballa arrives, purses of gold | Tavern cellar |
| 3 | 1:30 | Jomic's story: the hidden first prince, Arthago | **Flashback**: ink and parchment, the sack, the ruin |
| 4 | 3:00 | The pain centres and the count ("sixty-three") | Puppet figure as a diagram, points light up as he counts |
| 5 | 4:10 | The partners' deaths | Three quick parchment vignettes |
| 6 | 4:50 | Outside: wind off the Iliac Bay, the cape blows open, the crest | Alley set, leaves, the reveal |
| 7 | 5:40 | *"One. Two. Three…"* whispered from the dark | Black screen, the drunk at the tavern door |
| 8 | 6:15 | End card: title, author, next book, rights line | Lectern, book closes |

## What gets built
- **Sets (3):** tavern cellar, alley by the bay, the ruin (flashback, parchment style).
- **Puppets (5):** Haballa, Jomic, Prince Arthago, two henchmen (silhouettes are enough).
- **Props:** flagons, three gold purses, cudgel, sack, Sentinel crest, lectern and book.
- **Sound:**
  - Narration over the whole episode, one narrator voicing both characters lightly.
  - An ambient bed from local ACE-Step.
  - Synthesised wind, footsteps and candle sounds.
  - Captions burned in for Instagram, plus an `.srt` file for YouTube.

## Cuts for Instagram
Each shot is rendered twice: a 16:9 camera for YouTube and a 9:16 camera for Instagram (Eevee makes the second pass cheap).
- **Instagram:** four Reels of 2 to 3 minutes each (the narration runs 9:48), split at scene ends. The split is in the episode's `SHOTLIST.md`.
- **YouTube:** the full episode.

## Wesley's sign-off gates
1. ~~Series name and narrator~~ (done 1 Nov: Tales of Nirn, the Night Reader).
2. ~~**Look test**~~ (approved 1 Nov: `output/blender/tales-of-nirn/look-test-v18.png`, file `ep01-tavern-look-test.blend`). Carved marionettes with peg joints, chisel marks and visible strings, lit by a single candle.
3. Rough cut with draft narration.
4. Final.

## Order of work
1. Script: split the text into lines with timings and a shot list. The draft narration sets the clock.
2. Look test still (gate 2).
3. The three sets and five puppets.
4. Block the camera and puppet moves, then render the draft.
5. Assemble, score, captions and the three Reel cuts (gates 3 and 4).

## How we judge the pilot (14 days after posting)
- Do people finish? Watch the average watch-through on each Reel and the drop-off between Reel 1 and Reel 3.
- Do people want more? Comments asking for a specific book are the strongest signal.
- What did it cost? Hours spent, so the next episode can be planned honestly.

If it holds up, *Biography of the Wolf Queen* (8 volumes) is the first full series.

## Files
```
videos/tales-of-nirn/
  plan/PILOT.md                 this file
  brand/  puppets/  voice/      shared by every episode
  episodes/ep01-night-falls-on-sentinel/
```
