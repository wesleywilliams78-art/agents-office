# The Operator's Ledger, the fresh take: an explainer Apple could have made

Wesley's brief (25 Oct 2026): start from a clean slate. Do not reuse the existing episode template (no red cold open with the shopfronts, no stacked-bar layout from Episodes 01 to 04, no cartoon staging). Make it completely fresh and modern, as if Apple had designed the explainer. Keep the WRW brand's colours and fonts. Where this brief and `motion.md` disagree, this brief wins.

## The story: a puzzle, solved by the framework, verdict last
Never open by defining the model: viewers scroll away. Open with an operator's dilemma, let the framework be how it gets solved, and reveal the answer last. **60 to 90 seconds**, about 140 to 200 spoken words, one line per scene (s1 to s9).
1. **The hook, first 3 seconds, on screen as text as well as spoken** (most watch muted): a business puzzle with a stake the viewer could get wrong in their own business. Frame 0 is already that puzzle, finished and still: it is the thumbnail.
2. **The stakes:** why the call matters, in pounds or sites.
3. **The clues:** the framework walked as clues, one per scene, each shifting the odds. Name the framework once, as the tool that cracks it, never as a lecture.
4. **The verdict, last:** an operator's call, not just the textbook answer. Never bend the framework to fit the twist.
5. **The lesson and the question for Monday.**
6. **The ledger page:** a clean ledger line writing itself in, e.g. `Case 01 · Framework: Unit economics · Verdict: … · Lesson: …`.
7. **End card:** THE OPERATOR'S LEDGER, the episode title, the WRW logo (`kit/series/ledger-fresh/assets/brand/WRW-logo-white-on-red.svg`, used exactly as supplied), WRW HOSPITALITY, Wesley Williams. No job title; YSF Advisory never appears.
**The season question runs underneath:** "Will Athena take her café from 1 site to 10?" Each episode is one decision on that road and still stands alone.
**Hooks and retainers, in the words:** the hook makes a promise; every scene ends on a retainer, a line that opens a small loop the next scene closes ("But rent isn't the problem." · "So why is site ten losing money?"). Concrete specifics (pounds, sites, minutes); the answer withheld until it has been earned; no payoff the viewer did not see set up. British English, £ with comma thousands, a true minus sign on screen, numbers spelled out in the narration. Every number reconciles; "ILLUSTRATIVE FIGURES, WEEKLY" unless sourced.

**The promise (series device, 25 Oct 2026):** the opening ends on "This is the Operator's Ledger. One puzzle, one framework, and one verdict." — "one puzzle" lifting, "one framework" lifting again, "one verdict" coming down. Record it fresh in the cloned voice and choose the take by measured pitch (several seeds; the small "and" is what gives the natural up, up, down). **Never pitch-shift or reshape the voice**: Wesley heard a Rubber Band-shaped take as butchered (25 Oct 2026).

**The title slot (Wesley, 25 Oct 2026):** the opening card's eyebrow carries the episode's topic every week, `THE OPERATOR'S LEDGER · <TOPIC>` (e.g. UNIT ECONOMICS), never a case number; the ledger page at the end keeps the case number. Use "the verdict" consistently, never "the call".

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
Not ethereal: no pads washing underneath, no drones. A light, smooth jazz trio in the sound kit: `S.keys` (electric piano chords, `S.chord('Dm9')`), `S.walk` (upright walking bass), `S.groove` with ride, chick and brushes on a light swing (0.6), tempo 100 bpm (18 frames a beat). A ii–V–I progression family (Dm9, G13, Cmaj9, A7 and so on), voiced warmly, chords changing on scene changes. **Beat-matched:** scene changes and transitions land on the bar; key reveals get a keys stab or a ride accent on the word they land on; the band drops out to bass and brushes under the verdict and comes back for the ledger page and end card. The narration is mixed and ducked by the engine; keep the band light under the voice.

## Narration
Wesley's cloned voice through `motion_narrate` (source clone), placed with `voice: [{ line, at }]`; pass `narration` and `series: "ledger-fresh"` on every preview and draft. Place lines so scene starts fall on bars where you can.
