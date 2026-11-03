---
name: website-build
description: Build the WRW Hospitality website in Claude Code from the approved strategy brief, copy, design spec and assets. Use when Wesley asks to build, change or rebuild the website or a landing page.
---
# Building the WRW Hospitality website

Office agents write the brief, copy, design spec and shot list; they cannot write files. This skill is how Claude Code turns those into the site. The reference teardown is `40-Marketing/website-teardown-digby-fox.md` in the Brain: structure and craft only, never its wording, photos or palette.

**Round two (2 Nov 2026) is the current site.** Wesley lifted every look rule except the brand colours (bone #F7F2EA, ink #201A19, red #FF3131, deep red #B81F1F), so the square-only, no-gradient and pinned-film-strip lines below are history: the live patterns are in the Brain skill `website-design-system` and in `sites/README.md`. Run `ui-ux-pro-max` (in `.claude/skills`) for design decisions. Since round two the office tinkers with the site itself: the office serves it at http://localhost:4520/site/, desks holding `website-design-system`, `website-ux-review` or `website-copy` propose exact edits as `SITE UPDATE` blocks (`siteupdates.mjs`), and the office applies them only when Wesley approves, with a backup in `data/site-backups/`. Claude Code takes the bigger rebuilds; small fixes go through the desks. Scroll stories use CSS sticky, never a ScrollTrigger pin (pins caused layout shift of 0.7).

## Before you build
1. Read the approved inputs in the Brain: the strategy brief, the copy note, the design-system spec, the asset list. If one is missing, say which and stop; do not invent copy, results or logos.
2. Read `brand-visual-system` and `reference.md` (the brand), and `motion.md` before writing any animation.
3. Agree the hosting with Wesley before anything is published. The build produces files; Wesley publishes them.

## The stack (keep it small)
- Plain HTML and CSS in `sites/wrw-hospitality/` in this repo (index.html, css/, js/, assets/). One page first; extra pages only when asked.
- GSAP and ScrollTrigger for reveals and the pinned film strip, and Lenis for smooth scrolling. Pin exact versions, load them from files in the project (not a CDN) so the site works offline and loads fast. No framework, no build step unless a real need appears.
- Self-host Newsreader and Archivo (WOFF2, only the weights used, `font-display: swap`, preload the headline face).
- Images as WebP, loops as WebM with a poster image and an MP4 fallback; below-the-fold media loads lazily; explicit width and height on every image.

## Section patterns to build
Hero · pinned film strip (full-bleed photographs scrubbed by scroll, one line over it) · numbers with count-up · offer panels (three full-screen, alternate bone and red) · receipts grid · quotes carousel · press list · about · brands wall · FAQ in native `<details>` · closing band · footer with the © line. Numbered eyebrow labels on every section. Spec in `website-design-system`.

## Motion rules
- Easing `cubic-bezier(.16, 1, .3, 1)`, 0.6 to 1.0 s, reveals at about 85% of the viewport; one thing moves at a time.
- A `prefers-reduced-motion: reduce` branch shows everything with no movement; hover effects live under `(hover: hover) and (pointer: fine)`.
- Create ScrollTriggers once, refresh after fonts and images load, kill them on resize rebuilds.

## Mobile first
Design the 375px layout first. One nav button, no burger. Headline floor 48 to 56px. Tap targets 44px or more. No horizontal scroll (test it). The film strip and pinned panels fall back to stacked blocks on phones if they feel heavy.

## Budgets
First load 1.5 MB or less, script under 100 KB, largest image under 250 KB, no layout shift. Report the real numbers after each build.

## Done means
Run the checks in `website-qa` yourself on a local preview (`preview_start` or a static server), look at the page at 375px and 1440px, and fix what fails before showing Wesley. Never publish, deploy or point a domain without his explicit go-ahead. The booking and email actions are the ones Wesley approved, nothing else.
