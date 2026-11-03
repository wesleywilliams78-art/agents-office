# WRW Hospitality website: local review build, round two (2 Nov 2026)

The site lives in `sites/wrw-hospitality/`. That folder is what gets published; this note stays outside it because it names the on-hold figures. Six static pages. Nothing is published: Wesley reviews it and decides hosting.

Round two brief from Wesley: take the shackles off and get creative; the only fixed rule is the brand colours (bone #F7F2EA, ink #201A19, red #FF3131, deep red #B81F1F). The direction came from the `ui-ux-pro-max` skill's design-system search: scroll-triggered storytelling, bold and asymmetric, complex motion, spacious. Its palette and font suggestions were set aside; the brand colours and fonts stay.

## Run it
```
node sites/serve.mjs
```
Then open http://localhost:4610 (in Claude Code, use the `wrw-site` preview). The server gzips like a real host.

## Round three (2 Nov 2026, evening)
Wesley rejected four things in round two:
- text cut by the red slab
- the "10" sitting on the headline
- clipped glyphs
- the wavy ridges

Round three's rule is that nothing crosses a colour edge or overlaps text, and there are no decorative curves:
- **Hero:** the copy keeps to seven columns, and a solid red panel holds the right with the 01→10 odometer and ten tiles.
- **Offers:** they stack and recede instead of sliding sideways.
- **Close:** ten ink squares replace the mountains.
- **Placeholder figures:** an outline "00" replaces the dash.
- **Inner pages:** the giant outline page numbers are gone.

Checked at 375, 1440 and 1920.

Then the theme became site 1 → site 10 → site 100 (never 1,000):
- **Hero:** counts 1 → 10 → 100.
- **Scale chapter:** a sideways chapter (02) tells it on one dark ground, then the page carries on down.
- **Close:** ends on one, ten and a hundred squares.
- **Brands section (03):** two reels of square logo tiles running opposite ways; they pause under the pointer or on keyboard focus, and stand still with reduced motion. The shopfront photos are gone (Wesley: "no pictures of businesses").
  - **"Learned on these floors."** Heavenly Desserts, McDonald's, Turtle Bay, KFC, Asda, ASK Italian.
  - **"And the partners I bring my clients onto."** KATE One (formerly KATE Media), Dojo, 3S POS, Pro Insight, Sentiment Search, Harlyy, Manual Magic AI, Attensi, then the delivery platforms: Uber Eats, Deliveroo, Just Eat, DoorDash, SkipTheDishes, Wolt, Foodora, Foodpanda. Mystery Visits was removed on 3 Nov 2026.

Logos are one-colour silhouettes in `img/logos/` (WebP, about 200 KB together), tinted ink by CSS and red on hover. Sources:
- **Wikimedia Commons** (public-domain or CC0 logo files): McDonald's, KFC, Asda, ASK Italian, Uber Eats, Deliveroo, DoorDash, SkipTheDishes, Foodora, Foodpanda. Just Eat's orange logo is from English Wikipedia (a logo file used there under fair use).
- **The company's own website header:** Turtle Bay, Heavenly Desserts, 3S POS, Sentiment Search, KATE One, Pro Insight (proinsight.org), Dojo (dojo.tech), Wolt (wolt.com), Attensi (attensi.com).
- **Manual Magic AI:** the lettering only, keyed out of the square logo in the repo (`videos/manual-magic-ai/university/assets/logo.png`).
- **Harlyy:** its logo is the word "harlyy" in Alfa Slab One (an open-licence font), as in harlyy.com's header, redrawn as a silhouette.

Logos are trademarks. Before publishing, Wesley confirms each brand is happy to be listed. Partners such as Uber and Deliveroo have their own brand rules.

## What round two does (as amended above)
- **Hero:** see round three.
- **01 The drift:** the film strip is replaced, because there are no photographs yet. Ten site cards appear one by one, each further off the standard (tilted, faded, ticks missing). Then they snap back into one grid as the second line lands: "I write them down…". It uses CSS sticky, scrubbed by scroll.
- **02 In numbers:** a ledger, with a red rule drawing under each figure.
- **Marquee:** two rows running opposite ways. They speed up and skew with your scroll.
- **03 Offers:**
  - On large screens, three full-screen panels run sideways (deep red, bone, ink). Each has an illustration that draws itself: a P&L chart, a manual, and a site network with a live signal.
  - On smaller screens they stack.
- **04 How it starts:** a red rail fills as you read down the steps.
- **05 Receipts:** case studies as till receipts with torn edges that print out as they arrive. Then the "Want to be the next one?" ask.
- **06 The read:** the Ledger and the two report issues as covers that tilt under the pointer.
- **07 Close:** the one full red ground, with white mountains rising into it as you scroll.
- **Footer:** ink, with a page-wide WRW Hospitality wordmark.
- **Across the site:**
  - split-line headline reveals
  - magnetic Book a call buttons (pointer only)
  - a red scroll-progress hairline and a live chapter name in the nav
  - faint column lines over the page
  - page-to-page wipes (Chrome and Edge)
- **Inner pages:** a giant outline page numeral (01 to 05). Services gets the sideways offers in full, case studies the six receipts, and contact a two-step form with a locked "02" calendar gate.

## Files
- `index.html`, `services.html`, `case-studies.html`, `works.html`, `about.html`, `contact.html`
- `css/site.css`: tokens and every pattern.
- `js/site.js`: all behaviour.
- `js/config.js`: the two settings below.
- `js/vendor/`: GSAP 3.14.2, ScrollTrigger and SplitText (GSAP's free standard licence), and Lenis 1.3.27 (MIT). Pinned and self-hosted.
- `fonts/`: variable Newsreader (optical sizes, plus italic) and Archivo (width axis), Fontsource 5.3.0, SIL OFL.
- `img/`: the WRW mark, favicon, touch icon, 1200×630 share image and ridges.

## Where it differs from the spec
- Plain HTML, not Astro. The `website-build` skill wins over the spec's assumed Astro.
- Folder `sites/wrw-hospitality/`; settings in `js/config.js`.
- The spec's "Brain website note" doesn't exist. The build follows the spec, the teardown and the website skills.
- Round two drops the earlier look rules (square-only, no gradients, mountains only in the footer). Wesley lifted them; the colours are unchanged.

## Placeholders
On the page, unwritten copy shows as `[PLACEHOLDER: …]` and unconfirmed choices as `[ASSUMED: …]`, in a dashed outline.

**Only Wesley can supply:**
- what each offer delivers, and the first step with its length and fee
- six receipts (named or anonymous), quotes with permission, and cleared logos
- the book's status, his reply time and public email
- his Instagram and YouTube addresses (the badges show as pending until then)
- a privacy notice
- Ledger episode links, report PDF links, talks and press
- photographs and his portrait

**Assumed:**
- the three-offer grouping
- "Works" meaning the publications page
- a 30-minute call
- the franchising and timeline options on the form
- two lines of wording

**Cleared 3 Nov 2026** (numbers ledger, `00-Meta/numbers-ledger.md`): in this order: 15+ years, £40M estate, £1.7M–£2.1M additional revenue a year, 10 country strategies developed, the UK included (shown on a grey world map with the ten in red; the map is made from Natural Earth outlines, public domain). No percentages on the site (the 19% stays off), and no company name beside a figure.

## Settings (`js/config.js`)
- `CAL_LINK`: the Cal.com event path. Set the event to "requires confirmation". While it is empty, step 2 shows a placeholder.
- `FORM_ENDPOINT`: where enquiries are posted as JSON. While it is empty, nothing is sent and the form says so.

## Measured (2 Nov 2026, round two)
- **Per page:** about 435 KB, against a budget of 1.5 MB. Fonts are 369 KB of the files on disk; the italic loads only where it is used.
- **Script:** 62 KB gzip.
- **Layout shift:** 0.0002 at most, with no pins that flip to fixed.
- **375 px and 1440 px, every page, motion on and off:**
  - no sideways scroll, one H1, headings in order
  - tap targets at least 44 px (nav links 45.5 px)
  - no console errors
  - every headline readable when motion is reduced
- **Contact flow:** an empty form is blocked; the spam trap is ignored; the calendar opens only after step 1; a failed send keeps it locked. The phone nav is one "Menu" button and Escape closes it. Tab reaches the form.
- **Contrast:**
  - ink on bone 15.4
  - white on deep red 6.5
  - ink on red 4.7
  - red on ink 4.7
  - bone on red 3.3, used only for headline-size type

## Before it goes live (Wesley's call)
1. **Hosting:** a static host on Wesley's login (Netlify or Cloudflare Pages serve the folder as it is).
2. **Domain:** add a canonical link, make the `og:image` URL absolute, and add `sitemap.xml` and `robots.txt`.
3. **Cal.com:** create the event and put its path in `CAL_LINK`.
4. **Forms:** choose the endpoint, put it in `FORM_ENDPOINT`, and publish a privacy notice.
5. Fill the placeholders, then run the `website-qa` checks again.
