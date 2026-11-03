---
name: site-visualisation
description: Lay out and render a hospitality site (kitchen, front of house, bar, counter) in Wesley's open Blender through the blender-studio tools. Use when Wesley asks to model, lay out, block out, visualise or render a kitchen, restaurant, café, bar, franchise unit or fit-out, or to change one already in Blender.
---
# Site visualisation in Blender

Use this when Wesley describes a site and wants it built, changed, checked or rendered in Blender. He gives the instructions here; you build it in his open Blender session; he works in the same session by hand. Blender Studio is separate from the Motion Studio: renders can go to the Motion Studio as footage, but nothing here writes motion.

## The tools (MCP server `blender-studio`)
- `blender_status` first, every time. Not open → `blender_launch`.
- `blender_exec` runs Python in his session as one undo step. The kit (`connectors/blender-studio/sitekit.py`) is already loaded. Read it once before your first build.
- `blender_view` shows you his viewport. Leave `view` out unless he asks to see a particular angle, because setting it moves his view.
- `blender_scene` lists what is built and the kitchen pinch points. `blender_render` makes the images. `blender_save` saves the file.

## Before you build
1. Get the site from Wesley: the internal width and depth, the ceiling height, where the street front, doors, windows, columns and services (gas, drainage, extraction route) are. A survey or plan beats a description: read it in full.
2. Get the concept: the covers, the service style (QSR, counter, casual, full service, bar) and the menu, because the menu decides the cook line.
3. Never invent a dimension. If he says "about", or something is missing and he says to carry on, build it and put a label `ASSUMED: <what>` on the plan.
4. Check `unsavedChanges`. If a different site is open with unsaved work, save it first (`blender_save`) or ask. Never close or discard his work.

## How to build
- One project folder: `output/blender/<project>/` (lower-case-with-dashes, e.g. `imrans-diner-kitchen`).
- Write the layout as a script, `output/blender/<project>/layout.py`, and run it with `blender_exec`: `exec(open(r"<path>").read())`. Numbers live in one place and a change is a re-run. Order: `setup()` → `room()`, `door()`, `window()` → `zone()` → kitchen `item()` / `run()` → FOH `table()` / `banquette()` / counters → `flow()` → `label()` → cameras.
- Coordinates in metres: the street front runs along X at y = 0, Y goes back into the building, and items are placed by their back-left corner. Tables are placed by their centre.
- If he has moved things by hand, run `blender_scene` before a re-run. Fold his moves into `layout.py` first; a re-run puts kit objects back where the script says.
- Small asks ("move the fryer 300 to the left") are one `blender_exec` on that object, then update `layout.py` to match.
- Something not in `CATALOGUE` → `box()` with real dimensions and a clear name. Ask for the spec sheet if the size matters.
- After each build: `blender_scene` for pinch points, then `blender_view` to look at it. Fix what is wrong before showing him.

## Rules of thumb to check against (flag a breach, don't silently fix his decision)
- Kitchen aisles: 0.9–1.0 m for one person, 1.2 m for two working back to back, 1.5 m for a main route with trolleys. Leave the door swing plus 1.0 m in front of ovens, combis and dishwashers.
- Flow is one way: goods in → storage (dry, chilled, frozen) → prep (raw apart from ready-to-eat) → cook → pass → service. Dirty plates come back to wash without crossing the clean food route. Waste goes out without passing through prep. Draw each route with `flow()`.
- Put a hand basin at each kitchen entry and in reach of prep.
- Front of house: 1.2 m clear for the main circulation route, 1.5 m turning space on the accessible route, 0.45–0.6 m between pulled-out chairs, and 0.9–1.2 m for service aisles.
- Area per cover: about 1.0–1.2 m² for QSR, 1.4–1.7 m² for casual and 1.8–2.0 m² for fine dining. A full-service kitchen takes 30–40% of the total area.
- Heights: work tops 0.9 m, bars 1.05–1.1 m, tables 0.75 m.
- These are planning numbers. Local building regulations, the EHO, the fire officer and the equipment spec sheets decide. Say so on anything that goes to a client.

## Deliverables
- **Plan:** `cam_plan()`, then `blender_render` with engine `workbench`, 1920×1080 (or 3508×2480 for an A3 sheet). Zones, flows and labels are visible.
- **Overview:** `cutaway(1.2)` (walls down to 1.2 m, like an architect's model), `cam_iso()`, then engine `eevee`. `cutaway(None)` restores the walls for eye-level views.
- Plans leave overhead items (canopies) off and lift the labels above the equipment on their own. Pinch points come back as `aisles` (facing gaps under 1.0 m) and `slots` (gaps under 0.3 m between neighbouring units, which are cleaning traps).
- The test build is in `output/blender/test-site/`: `layout.py` shows every builder in use.
- **Walkthrough stills:** `cam_eye(x, y, look_x, look_y)` at 1.6 m, engine `eevee` for drafts and `cycles` for the final.
- **Realistic walkthrough:** when he asks for realism, a walkthrough or a video, load `connectors/blender-studio/detailkit.py` from `layout.py` (`exec(open(...).read())`). It provides:
  - `library()` for real finishes (oak, plaster, steel, glass, brick, paving, foliage)
  - `glazing()`, `fchair()`, `ftable()`, `fbanquette()`, `slats()`, `pendant()`, `panel_light()`, `espresso()`, `pos()`, `plant()`
  - `dress_kitchen()` for equipment fronts
  - `block()`, `tree()` and `sky()` for the surroundings (put them in the `Context` collection)
  - `gi_volume()` and `bake_gi()` for indoor light
  - `presentation(True/False)` to switch between the walkthrough look and the planning view
  - `eye()` for stills and `walk(path)` for the animated camera
  
  The worked example is `output/blender/oslo-radhusplassen/`: `layout.py`, `cameras.py` and `render_walk.py`.
- Always give an interior a `gi_volume()` and bake it. Without one, EEVEE lets the sky light leak through the walls and the room renders cold and washed out.
- Render the animation in a **background** Blender (`blender.exe -b site-v1.blend --python render_walk.py`, run in the background), never through `blender_render`, so Wesley's window stays free. EEVEE takes about 2 s per 1080p frame on this PC (RTX 5080). Stitch the frames with ffmpeg at 25 fps.
- A walkthrough ends where the view really is. From deep in a room, a glazing head only shows the bottom of a tall building across a square, so walk back to the glass before looking up.
- Name versions `plan-v1`, `iso-v1`, `eye-pass-v1`. Save the file as `blender_save(project, "site-v1")` with the same version.
- Anything for a client goes out WRW-branded with the © disclaimer, and states "Indicative layout, not for construction".

## Rules
- The kit only replaces or deletes its own objects. For Wesley's own objects, change only what he names.
- One `blender_exec` per meaningful step, with a clear `label`, so his Ctrl+Z stays useful.
- Don't run a Cycles render unasked. It locks his Blender for minutes.
- Show him an image (`blender_view` or a render) after every change he can't see himself.
