# Handover · Imran's Diner Kitchen map (6 Nov 2026)

## Where things stand

The AIOS has a **Kitchen** page for Imran's Diner (Clients → Imran's Diner → Kitchen, beside Delivery and Reviews). It is live in the running office (restarted 6 Nov, port 4520). Nothing is committed.

What the page does:
- A map of the kitchen, laid out from Wesley's hand sketch of the back of house. The sketch is drawn the way it reads, with the tills on the left. Station positions are draggable (**Move stations**), and each move saves to the data file.
- **Feed a dish in**: pick a dish and press Play. The dish goes from the till station to station. Each step's person walks there if it is not their own station, going round the walls on the sketch. The step list shows every walk in metres.
- Per dish: stations touched, hand-offs, walks, time per plate. A dish linked to the till also gets a weekly count, then walks and staff hours a week.
- A table of all dishes with an **Improve** tick and a note for each, sortable; the worst value in each column is red. Bars show who walks the most and the busiest stations; **Busiest stations** shades the map.
- **Full screen ⤢** (Esc or the button to exit; on a phone it fills the window instead).
- A "To confirm on site" list drawn from `gaps` in the data file.

## Files

| What | Where |
|---|---|
| Page code: CSS, `kitPath` (grid route round walls), `kitPlan`, `kitchenPanel`, `kitDraw`, handlers, `kitFullSet` | `src/aios.html`, search `Kitchen (6 Nov)` |
| Loads the file (`withKitchen` in `dashboardsData`); `POST /api/dashboards/:id/kitchen` saves positions and marks, nothing else | `serve.mjs` |
| Points the dashboard at the file: `"kitchen": "kitchen-imrans.json"` | `office.config.local.json`, `aios.dashboards` |
| **The model** (private, git-ignored) | `data/kitchen-imrans.json` |
| First draft before the sketch | `data/kitchen-imrans.before-sketch.json` (delete once not needed) |
| Day-one transcript | Brain `Agents Office/Upload - 11-05 Day 1_ Imran’s Diner … - mw4xoy1r.md` |
| Visit notes and station photos (T14 captions) | capture page artifact `VkBYkfEUjjeUHpjBkdVyG8`, db `visit/nov26/areas` |
| Full till item report | Brain `Agents Office/Upload - Item_Sales_By_Category_Report_Sep_29th_26_423823 - mvc8holm.md` (`pos.mjs` `parseItems`) |

**Model shape.** `w`, `h` (map units; `metresPerUnit` 0.1, assumed), `zones`, `walls`, `stations` {id, name, kind, x, y, w, h, does, src}, `staff` {id, role, short, home}, `dishes` {id, name, short, group, till: {item | category}, idea, improve, note, steps: [{at, who, do, sec, wait, move, src}]}, `gaps`.
- `move` is optional: `screen` (the order travels on the screen), `pass` (slid across), `fetch` (this person walks to get it), `carry` (the last holder walks it over).
- `wait` is cooking time. The replay shortens it to 40 s or less; the figures keep the real time.

## Decided

- The client's model lives in `data/`, not the repo, like the Creamy product mix (`stardog`).
- The layout follows Wesley's sketch as drawn. Stations not on the sketch (kiosk, ice cream, hand-wash sink, a separate collection point) were dropped, and orders end back at Till 1 & 2.
- The rice warmer is assumed to be at the grill; the pizza toppings are made at Pizza roll.
- In the table, red marks only the worst value in each column (most dishes tie, so a cut-off turned everything red).

## Done 7 Nov (nothing committed)

- **Product list loaded.** `pos.mjs` sends `items.all` (every till name once, qty, sales, categories). A dish takes `till: { items: [...] }`; `kitVol` sums them. The 326 till names sit on 17 routes (19 dishes with the two batch prep routes); `notProducts` holds `Misc (price lines)`. Drinks, dips, sauces, dessert and salad are one `extras` route counted at packaging. The page shows "Every product, by route" under the dish table, with an "Unmapped items" list that is empty now. New till names show there until placed.
- **Wesley's yes on four calls:** cheese, kids cheese and veggie burgers are on the griddle; Mexicano is a fried fillet; peri strips, peri nuggets, peri wraps, the chicken thigh burger and all BBQ and Sticky BBQ items are on the peri grill; naan and garlic bread are warmed in the pizza oven.
- **Still assumed:** a "10 inch" / "12 inch Pizza Deal" counts as one plate on the deals route; flaming grill, pizza deal, sides, naan, rice and extras route times are copied from the nearest route.
- **Day two (6 Nov evening, capture page F1–F10).** Ten orders timed order-in to hand-over, stored as `timed` on each route and shown in the table and the side panel. Station-by-station times were not taken, so step seconds are unchanged. The fillet burger is breaded fresh and not hot-held, so its route changed. Gaps rewritten; staffing at 16:30, 18:00 and peak was not captured.
- Backups in `data/`: `kitchen-imrans.before-sketch.json`, `.before-routes.json`, `.before-day2.json` (delete when not needed).

## Next

### 1. After tonight's visit (done 7 Nov for what the capture page held; see above) (day two, from 4 pm)

Fill in from Wesley's notes; read the capture page's db first rather than asking him.
- **Timed orders**, one each: burger meal, fried chicken, Imran special, pizza, parmesan, peri rice box, wings. Replace the assumed `sec` and `wait` on each step, and set `src` to "timed 6 Nov".
- **Staffing**: who stands where at 16:30, 18:00 and at peak. Correct `staff` and their `home` stations.
- **Who runs the kebab grill and griddle.** Today the grill chef walks there from the top of the kitchen for every doner, which drives most of the long walks.
- The rest of `gaps`: who brings fried food to assembly; whether pizza goes through packaging; the 20-step fryer station (361:50); where screens and tickets are; one measured length for scale. Remove each gap once it is answered.

### 2. Load the whole product list (Wesley, 6 Nov)

Wesley wants every product Imran's Diner sells on the map, fully rationalised. Example: they have about eight pizzas and the map shows two.

The till report has **326 item names in 38 categories** for 1 Oct 2025 to 29 Sep 2026. Some categories are duplicates spelled differently:
- `PIZZA & PIZZA DEALS` and `PIZZAS & PIZZA DEALS`
- `IMRANS SPECIAL` and `IMRAN SPECIAL`
- `KIDS MENU`, `KIDS MEALS` and `KIDS MEAL`
- the `D …` and `DE …` sauce variants

There are also non-dishes: `DRINKS`, `DIPS`, `SAUCES`, `ADD PRICE` and `DELISTED`. The pizza categories alone hold 40 names, including deals (for example "Any Two 12inch Pizzas") and the same item spelled two ways.

The approach:
- **Group items by route, not one map dish per item.** Items cooked the same way share a dish route. For example: one route for all single pizzas, one for pizza deals (two pizzas, same route), one for parmesans, one for wings and tenders. Each item keeps its own name and volume under the route.
- **Code change needed.** A dish takes `till: { items: [...] }` (a list of till names), and `kitVol` sums them. `pos.mjs:138` sends only the top 8 items to the page. Send the full list, or a kitchen-only list, so every item can be counted. Grep every user of `data.items` before changing it.
- **Show the whole product list on the page**, grouped by route. Show any till item that belongs to no route in an "Unmapped items" list, so nothing is silently left out. Keep drinks, dips and sauces out of the cooking routes but count them at packaging.
- **Ask Wesley before deciding** where an item's route is unclear. Use one yes/no per question, with a recommendation.

### 3. Housekeeping

- Commit when Wesley asks. Commit only the kitchen changes: the working tree already held other uncommitted work at the start of this chat. Push with `git push fork main` only.
- Run `npm run check` after any change; it passed 89/89 on 6 Nov.

## Start line for a new chat

> Read docs/HANDOVER-6-nov-kitchen-map.md and carry on with the Imran's Diner Kitchen map: first tonight's day-two findings, then load the whole product list grouped by route.
