# Diagram studio

Lets the office agents and Claude Code draw workflows, lifecycles, timelines, org charts and other concept diagrams as pictures. Built 7 Nov 2026.

- **Tools** (`mcp.mjs`):
  - `diagram_guide`: the ten diagram types, or one type's schema and a worked example.
  - `diagram_draw`: checks the spec, lays it out, checks it in a real browser, and returns the PNG (as an image the agent can look at) and an interactive HTML page.
- **Output:** `output/library/diagrams/<date> <title> (<id>)/` holds `diagram.png`, `diagram.html` and `diagram.json`, the spec it was drawn from.
- **Default look:** Archify's `editorial` style in the light theme: bone ground, serif title, rust-red lines. The software-kind legend is hidden unless the spec gives plain-English legend entries.
- **The picture:** the installed Chrome takes it in two passes. The first measures where the drawing ends; the second shoots at that height with the viewer's buttons and the Archify stamp hidden.
- **Registered** at user scope with `claude mcp add -s user diagram-studio`. It is wired to every department and its tile is hidden in the bar (`office.config.local.json`).
- **Check:** `npm run check`, step "diagram studio".

## Engine

Archify v3.2.0, installed at `C:\Users\Wesley\tools\archify` (override with `ARCHIFY_HOME`). Its update ping is switched off on every run (`ARCHIFY_UPDATE_CHECK_DISABLED=1`).

To update it, replace that folder with a newer `archify/` folder from the release zip, then run `npm run check`.

Archify, Copyright (c) 2026 tt-a1i (Archify), Copyright (c) 2025 Cocoon AI. Source: https://github.com/tt-a1i/archify. It is licensed under the Apache License, Version 2.0; the full licence and its NOTICE file are in the engine folder (`LICENSE`, `NOTICE`, `LICENSE-MIT` for the historical MIT grant). It is used unmodified: this connector only calls its command line and takes a screenshot of the page it produces.
