# The Operator's Ledger, the fresh take: an explainer Apple could have made

Wesley's brief (25 Oct 2026): start from a clean slate. Do not reuse the existing episode template (no red cold open with the shopfronts, no stacked-bar layout from Episodes 01 to 04, no cartoon staging). Make it completely fresh and modern, as if Apple had designed the explainer. Keep the WRW brand's colours and fonts. Where this brief and `motion.md` disagree, this brief wins.

## The story: a puzzle, solved by the framework, verdict last
Never open by defining the model: viewers scroll away. Open with an operator's dilemma, let the framework be how it gets solved, and reveal the answer last. **About 90 seconds to 2 minutes, never over 2:00** (Wesley liked Episode 01 at 1:58: "don't rush"), about 180 to 230 spoken words, one line per scene (s0 entry, s1 to s9, sq the question into the verdict).
1. **The hook, first 3 seconds, on screen as text as well as spoken** (most watch muted): a business puzzle with a stake the viewer could get wrong in their own business. Frame 0 is already that puzzle, finished and still: it is the thumbnail.
2. **The stakes:** why the call matters, in pounds or sites.
3. **The clues:** the framework walked as clues, one per scene, each shifting the odds. Name the framework once, as the tool that cracks it, never as a lecture.
4. **The verdict, last:** an operator's call, not just the textbook answer. Never bend the framework to fit the twist.
5. **The lesson and the question for Monday.** From Episode 02 the Monday card is the last content card: it holds through the sign-off ("Case closed. This is the Operator's Ledger.") until the end card.
6. **No ledger page (Wesley, 26 Oct 2026):** the case-number ledger card was cut in Episode 02; the extra time goes to the Monday question.
7. **End card:** THE OPERATOR'S LEDGER, the episode title, the WRW logo (`kit/series/ledger-fresh/assets/brand/WRW-logo-white-on-red.svg`, used exactly as supplied), WRW HOSPITALITY, Wesley Williams. No job title; YSF Advisory never appears.
**The season question runs underneath:** "Will Athena take her café from 1 site to 10?" Each episode is one decision on that road and still stands alone.
**Hooks and retainers, in the words:** the hook makes a promise; every scene ends on a retainer, a line that opens a small loop the next scene closes ("But rent isn't the problem." · "So why is site ten losing money?"). Concrete specifics (pounds, sites, minutes); the answer withheld until it has been earned; no payoff the viewer did not see set up. British English, £ with comma thousands, a true minus sign on screen, numbers spelled out in the narration. Every number reconciles; "ILLUSTRATIVE FIGURES, WEEKLY" unless sourced.

**The promise (series device, 25 Oct 2026):** the opening ends on "This is the Operator's Ledger. One puzzle, one framework, and one verdict." — "one puzzle" lifting, "one framework" lifting again, "one verdict" coming down. Record it fresh in the cloned voice and choose the take by measured pitch (several seeds; the small "and" is what gives the natural up, up, down). **Never pitch-shift or reshape the voice**: Wesley heard a Rubber Band-shaped take as butchered (25 Oct 2026).

**The title slot (Wesley, 25 Oct 2026):** the opening card's eyebrow carries the episode's topic every week, `THE OPERATOR'S LEDGER · <TOPIC>` (e.g. UNIT ECONOMICS), never a case number. Use "the verdict" consistently, never "the call".

## The look: Apple's product-film language in WRW's colours (see reference-apple.jpg)
- **A product launch, not a slideshow.** Each idea is a hero object shown beautifully: a café rendered as a clean, simple 3D or isometric block (three.js or flat SVG with depth), a single number as a monument, one elegant chart that the camera moves around. Real depth and parallax, a slow, confident camera.
- **One idea, one hero per frame,** large, with generous air. Never more than the hero, one headline (or a stat pair) and the caption.
- **Headlines that land:** short, declarative, a full stop, Newsreader Light, large (90 to 140 px), two-tone (the statement in ink, the payoff in warm grey #4A4644: "Same coffee. Different fate."). A tiny Archivo caps eyebrow above (deep red on bone): "SITE 10", "THE TRAP", "THE VERDICT".
- **Stats like Apple's:** the figure huge, its descriptor small beneath (£4,800 over FOUR-WALL PROFIT, WEEKLY); stat pairs side by side for comparisons (£20,000 · SITE 1 and £13,000 · SITE 10).
- **Surfaces:** bone #F3F2F2 as the canvas, ink #201E1D for statements and hero moments (a dark section like Apple's black product panels), red #EC3013 sparingly for the one figure that matters (a loss) and the logo tile. Soft panels in light rule grey #D6D2CF are allowed as cards. Profit ink, loss red, never green. No gradients, glows or drop shadows on type; depth comes from scale, overlap, parallax and three.js fog.
- **Type:** Newsreader Light for headlines and numerals, Archivo for labels and captions (tabular figures on counting numbers). Headlines may be centred in a hero moment, Apple-style, or flush left on a strict left edge; choose per scene and keep it consistent within a scene.
- **Precision:** a strict grid, a vertical rhythm in multiples of 8 px, hairlines 2 to 3 px, labels aligned exactly, equal gaps.
- **Format:** 1080 × 1350 (4:5), 30 fps. Text, numbers and captions inside the centred safe square (y 135 to 1215).

## Motion
Calm, expensive, precise: critically damped springs (`snap`, `calm`, `breath`), elements arriving with a short rise and fade, staggered on the word; a slow camera push or orbit on the hero; numbers count up and land with no overshoot. Colour changes are crafted transitions (an ink panel rising as the camera passes into it, a stat card expanding to fill the frame, the café block rotating to reveal its dark side), never a bang. Something is always alive: the camera, a drift, the next element arriving. GSAP (SplitText, DrawSVG, MorphSVG) and three.js are available under the studio's rules.

## Captions (Wesley's choice, 25 Oct 2026)
No box. Word-synced from the narration (`M.caption`, at most six words a chunk), Archivo Medium about 48 px set straight onto the frame, centred, low in the safe area: ink on bone grounds and bone on ink grounds (read the ground beneath them each frame, so they follow the colour transitions). The word being spoken is brand red #EC3013 and lifts into place on a `snap` spring as it is said; words still to come wait at about 26% opacity. No bouncing marker over the words: a square with a trail was tried and removed as too busy (Wesley, 25 Oct 2026). They never sit over other text (the engine checks). The engine writes the `.srt`.

## The sound: light, smooth jazz that moves with the picture
Not ethereal: no pads washing underneath, no drones. A light, smooth jazz trio in the sound kit: `S.keys` (electric piano chords, `S.chord('Dm9')`), `S.walk` (upright walking bass), `S.groove` with ride, chick and brushes on a light swing (0.6), tempo 100 bpm (18 frames a beat). A ii–V–I progression family (Dm9, G13, Cmaj9, A7 and so on), voiced warmly, chords changing on scene changes. **Beat-matched:** scene changes and transitions land on the bar; key reveals get a keys stab or a ride accent on the word they land on; the band drops out to bass and brushes under the verdict and comes back for the lesson, the Monday card and the end card. The narration is mixed and ducked by the engine; keep the band light under the voice.

## Narration
Wesley's cloned voice through `motion_narrate` (source clone), placed with `voice: [{ line, at }]`; pass `narration` and `series: "ledger-fresh"` on every preview and draft. Place lines so scene starts fall on bars where you can.

## Lessons, carried forward episode to episode
Each episode adds what it taught here; the next one starts from it. Keep the look, the voice and the structure the same; make the craft better.

**From Episode 01 (25 Oct 2026, approved after five amend rounds):**
1. **Build the clock from the voice, once.** Voice the script first, then place every line on a bar with the pauses designed in (a breath of at least a bar before each clue, two beats of silence before the question into the verdict) and derive every scene time from those placements. Episode 01 was re-timed after the fact with offsets and holds; that is where most of its bugs came from.
2. **One cast, set up early.** Every site, street or person the verdict uses is introduced in the first 20 seconds and never renamed. Site 11 arriving late confused the story (Wesley: keep to site 1 and site 10, bring eleven in only as the question).
3. **Text lands on the word.** A headline's words rise as they are spoken (`wt` per word from `M.at`), never at the start of the slide.
4. **Key words breathe.** The promise owns "verdict" once; the narration says it once more, at the verdict. Never the same key word twice inside ten seconds. A question gets a pause before the answer.
5. **Reuse the approved stings.** The promise (`data/motion/narration/promise-takes/t3-s11.wav`, as heard in Episode 01) and the sign-off ("Case closed. This is the Operator's Ledger.") are the same takes every week: the series' voice, never re-recorded or reshaped.
6. **Zones before pixels.** Eyebrow and headline in the top band (eyebrow y 136, headline from y 200, figures from y 226; see Episode 02, lesson 7), the hero in the middle (430 to 1000), labels attached to their hero, the caption band (1060 to 1215) left clear. Overlaps were Episode 01's most visible fault.
7. **Sound sparingly.** Coin tallies only where money is counted; a keys stab only on the six to eight reveals that matter (Episode 01 had nineteen); one drop for the loss.
8. **One hero, one metaphor, all the way through.** The café block and what each cost does to it carried Episode 01; the hero should grow with the story rather than be replaced scene by scene.
9. **The ending ties to the next episode.** The end card's "Next case" is the next episode's puzzle, and the next episode opens by paying it off.

**From Episode 02 (26 Oct 2026, approved after three drafts):**
1. **Budget the length before recording.** The first full read ran 2:03 of voice alone. Write to about 1:45 of voice; cut lines that repeat what is already on screen before recording, not after.
2. **Check every line for silence after any audio edit.** In Episode 02 a trimmed line went silent halfway (the fade was timed against the source, not the trimmed clip) and Wesley heard the voice disappear. Trim with input seeking (`-ss` before `-i`) and measure every line for silent stretches before the draft.
3. **Letters are said as letters.** The clone reads a lone "A" as "ah". Write it phonetically for the voice ("Street Ay") and keep "A" in the captions; check the letter lasts about 0.3 s or more.
4. **One read of the series' name.** The opening "This is the Operator's Ledger" uses the sign-off take's clean read (it came out as "Operator's a Ledger" in the promise take), then the approved promise. Joined at the pause, never reshaped.
5. **No text over anything.** Check every quarter second for text over text and text over the drawn picture (`textcheck.mjs` in the Episode 02 scratch pipeline, to fold into the engine). Labels sit beside their object, never on it; drop a label when the headline and the caption already carry it.
6. **A framework with parts is explained one by one, swiftly.** Each part lights up as it is named (the street rearranged into Porter's cross; each force lifted, labelled and its line redrawn on its word).
7. **Titles at the top, figures lower.** Eyebrows at y 136, figures land from y 226: space between the title and the numbers (Wesley).
8. **Crisp modelling.** Thin edges a shade darker than each face, and materials dark enough to read on a phone.
9. **Transitions into ink belong to the series.** The ridge tide rising while the camera dives into the hero, not a flat panel growing.
10. **Clear the outgoing type a beat before each cut**, and switch the eyebrow on the cut with the first word.
11. **Code hygiene:** never end a render-code line with a `//` comment when more calls follow on that line; one swallowed two transitions in draft 7 (the engine caught the hard cuts).
