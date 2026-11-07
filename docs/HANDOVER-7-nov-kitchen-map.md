# Handover · Imran's Diner Kitchen map (7 Nov 2026)

Continues `docs/HANDOVER-6-nov-kitchen-map.md` (read its "Files" and "Model shape" sections; they still hold). Committed as `7daf19a`, not pushed (`git push fork main` only).

## Where things stand

- **Whole product list is on the map.** 326 till names sit on 17 cooking routes (19 dishes with the two batch prep routes). `pos.mjs` sends `items.all`; a dish takes `till: { items: [...] }`; `kitVol` sums them. The page has "Every product, by route" under the dish table, an "Unmapped items" list (empty now) and `notProducts` for `Misc (price lines)`. Drinks, dips, sauces, dessert and salad are one `extras` route counted at packaging. A new till name shows as unmapped until it is placed in `data/kitchen-imrans.json`.
- **Day two read from the capture page** (artifact `VkBYkfEUjjeUHpjBkdVyG8`, db `visit/nov26/areas`, docs F1 to F10). Ten orders timed order-in to hand-over, stored as `timed` on each route and shown in the table and side panel. The fillet burger is breaded fresh and not hot-held, so that route changed. Gaps rewritten.
- Wesley said yes to four route calls: cheese, kids cheese and veggie burgers on the griddle; Mexicano a fried fillet; peri strips, peri nuggets, peri wraps, chicken thigh burger and all BBQ and Sticky BBQ items on the peri grill; naan and garlic bread in the pizza oven.
- `npm run check` 89/89. Page checked at 1905×920, no console errors.

## Still assumed or missing

- No station-by-station times, so every step's seconds are assumed. Untimed routes: peri rice box, wings alone, Imran special alone, doner, sides, naan.
- Times and stations for flaming grill, pizza deals, chips and wedges, naan, rice and drinks and dips are copied from the nearest route.
- A "10 inch" / "12 inch Pizza Deal" counts as one plate; confirm what it contains.
- Staffing at 16:30, 18:00 and peak was not captured. Known: the back-of-house shift leader is on in the evening only and floats (seen batching wedges and on the doner grill); the front-of-house lead is rarely on in the evening. Names in the notes are spelled several ways (Subhan, Suban; Tahid, Tauheed), so do not put names in the model.
- Who runs the kebab grill and griddle, who carries fried food to assembly, whether pizza and parmesan pass packaging, where tickets print, the 20-step fryer station, one measured length for scale.

## Next

1. Ask Wesley for what the capture page did not hold (staffing, one measured length, a station-by-station timing of one dish) and fill the gaps; remove each gap once answered.
2. Tick **Improve** with Wesley on the routes that matter. The fillet burger, parmesan, masala fish and pizza routes timed slowest (11 to 16 minutes against a 2 to 4 minute model).
3. Delete the `data/kitchen-imrans.before-*.json` backups when not needed.
4. Not mine, left alone in the tree: `docs/plan-agent-visibility.md`, `output/`, `videos/`.

## Start line for a new chat

> Read docs/HANDOVER-7-nov-kitchen-map.md and carry on with the Imran's Diner Kitchen map: fill the remaining gaps with Wesley, then go through the routes marked to improve.

## Update, later on 7 Nov

- **Answered by Wesley and removed from `gaps`:** pizza deals vary (some two pizzas, some one with sides; still modelled as two); pizza skips packing (parmesan still goes through it); the fryer passes fried food to assembly (`move: carry` on the assembly step of fillet burger, munch box, fish, wings, chips); the pizza chef fetches doner meat (new route `doner-pizza`, Kebab Della and Donner pizza moved out of `special-pizza`); rice warmer and toppings fridge stay where assumed; tickets show on screens at each station.
- **Marked Improve, with a note each:** fillet burgers, parmesans, fish, single pizzas, pizza deals. Walking is 13 to 45 s on these against 10 to 16 minutes timed, so the lost time is queueing at one fryer or the one pizza chef and oven, not distance.
- **Still open (7 gaps):** step seconds, staffing at 16:30/18:00/peak, who runs kebab grill and griddle, the 20-step fryer station, one measured length, times for the flaming grill/naan/rice/sides/drinks routes, where tickets sit on the map. Wesley gave no answer on staffing or a measured length.
- `npm run check` 88/90: the two failures are Chrome drawing (video studio look, TEAM smoke), not the kitchen. `check.mjs` and `connectors/video-studio/mcp.mjs` were changed by something other than this work. The backups `data/kitchen-imrans.before-*.json` are still there.
- Wesley sent "internal ssd" with no context; nothing was done with it.

## Update, wedges and hot hold (7 Nov)

- Wesley: wedges are peeled in the potato peeler and ridge-cut by hand at Prep (morning preparation person, then whoever is free), deep-fried, then hot-held. **Hot hold keeps only fried chicken pieces and wedges.**
- New routes: `wedges` (Wedges, Fries & Wedges; from hot hold, no frying at order time; took the 6 Nov timed wedge order) and `batch-wedges` (peel, cut, fry, hold; seconds assumed, model uses Protein prep for the morning prep person). Hot-hold step removed from chips, fish, wings and munch boxes; Imran special still takes chicken piece and wedges from hot hold. Prep and Hot hold station notes updated. 22 routes, nothing unmapped.
- The three `before-*` backups were deleted.
