# Diagram studio

Lets the office agents and Claude Code draw workflows, lifecycles, timelines, org charts and other concept diagrams as pictures. Built 7 Nov 2026.

- **Tools** (`mcp.mjs`):
  - `diagram_guide`: the eleven diagram types, or one type's schema and a worked example.
  - `diagram_draw`: checks the spec, lays it out, checks it in a real browser, and returns the PNG (as an image the agent can look at) and an interactive HTML page.
- **Output:** `output/library/diagrams/<date> <title> (<id>)/` holds `diagram.png`, `diagram.html` and `diagram.json`, the spec it was drawn from.
- **Default look:** Archify's `editorial` style in the light theme: bone ground, serif title, rust-red lines. The software-kind legend is hidden unless the spec gives plain-English legend entries.
- **The picture:** the installed Chrome takes it in two passes. The first measures where the drawing ends; the second shoots at that height with the viewer's buttons and the Archify stamp hidden.
- **Bone, not white (7 Nov):** the drawing panel is the same bone (#F3F2F2) as the page, with a thin border. `brand.mjs` holds it; `npm run check` fails if the panel goes white again.
- **Service blueprint (7 Nov, the eleventh type):** `type: "blueprint"`, drawn by `blueprint.mjs`, not by Archify. Stages (3 to 6) across, customer, what they see, behind the scenes and support down, one heavy line of visibility between the customer layers and the hidden work, at most one red focal cell. No arrows. Always the WRW look (style, theme and brand are ignored). A spec is refused with the field to fix if a layer has the wrong number of entries, a row is empty, or two cells are focal. The grammar follows the service blueprint in cathrynlavery/diagram-design (MIT, https://github.com/cathrynlavery/diagram-design); the code is ours and none of that repo is installed.
- **Registered** at user scope with `claude mcp add -s user diagram-studio`. It is wired to every department and its tile is hidden in the bar (`office.config.local.json`).
- **Check:** `npm run check`, step "diagram studio".

## Engine

Archify v3.2.0, installed at `C:\Users\Wesley\tools\archify` (override with `ARCHIFY_HOME`). Its update ping is switched off on every run (`ARCHIFY_UPDATE_CHECK_DISABLED=1`).

To update it, replace that folder with a newer `archify/` folder from the release zip, then run `npm run check`.

Archify, Copyright (c) 2026 tt-a1i (Archify), Copyright (c) 2025 Cocoon AI. Source: https://github.com/tt-a1i/archify. It is licensed under the Apache License, Version 2.0; the full licence and its NOTICE file are in the engine folder (`LICENSE`, `NOTICE`, `LICENSE-MIT` for the historical MIT grant). It is used unmodified: this connector only calls its command line and takes a screenshot of the page it produces.
