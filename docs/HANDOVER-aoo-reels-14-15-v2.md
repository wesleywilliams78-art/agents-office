# Handover: Art of Operations Reels 14 and 15, v2 (3 Nov 2026)

**Goal.** Rebuild the backgrounds of Reels 14 and 15 (black row) to Reel 13's crane standard: a symbol, light subject on black, big at grid size, one exact #EC3013 element echoing the red key word, side light, reflection, locked camera. Lines, Chinese and captions stay as approved.

**Done.**
- Reels 13–15 approved and filed (Desktop `Art of Operations\` and `videos/art-of-operations/delivered/`).
- R14 v2 (ink): `output/video/xmw0mr9vbzxd.mp4`. LTX `vmw0m0ghbe7t`, lowered 230 px, red set to brand (`output/ltx/vmw0m0ghbe7t-ink.mp4`). Default grade.
- R15 v2 (dice): `output/video/xmw0nfg2ncyl.mp4`. Blender clip `output/blender/aoo-reel-15/dice-15s.mp4`, grade black 14 white 175.
- Both sent to Telegram as v2. **Not filed.** Grid check: `output/video/reels-13-15-v2-grid.png`.

**Decisions and why.**
- Dice in Blender: LTX drew scrawled pips and one die.
- Faces numbered after the physics so the red one faces the camera at rest.
- Slow motion 0.014, throw scaled to match: dice move until about 11 s.
- Rim light on the dice only (it left a hot spot on the lacquer); lights about 1 W (stronger flattened the bone white).
- Pips recoloured by hue, shade floor 0.75, or the grade turns shadowed pips grey.
- White 175: the default left the bone mid-grey.
- v2 files never overwrite the originals.

**Files.** All in `output/blender/aoo-reel-15/`:
- `dice.py`: modes `sim | preview | final`; env vars `DICE_TIME, DICE_DIST, DICE_SHIFT, DICE_LIGHTS, DICE_XA/ZA/ZB, DICE_SPIN`.
- `encode.py`: frames → mp4, pip red.
- `frames/`.
- `helpers/`: `ink_frame.py`, `sheet_dark.py`, `grid_row.py`, `gradetest.mjs`, `crown.py`.

The visual rules are item 5 of the Brain skill `art-of-operations-reel`; the memory note is `aoo-symbol-footage-v2`.

**Rebuild lines.**
- R14: en `["Spread budget everywhere","at once, and you end up","strong *nowhere*."]`, zh `["预算同时撒向各处","结果*哪里都不强*"]`.
- R15: en `["The market loser commits","to the battle *first*","and hopes for","a victory later."]`, zh `["市场输家*先*投入战斗","再指望胜利"]`.

**Left.**
1. Wesley's changes.
2. On approval, copy to Desktop as `Art of Operations - Reel 14 v2.mp4` / `Reel 15 v2.mp4` and to `delivered/`, then update memory.
3. Nit: the studio's red saturation pushes the pips slightly orange, as it did the crane's crown.

**Very next step.** Apply Wesley's changes. For the dice:
1. Edit the `dice.py` defaults.
2. `blender.exe -b --factory-startup --python dice.py -- <folder> preview` (CPU, about 1 min).
3. `final` (GPU, about 9 min; stop `ltx2_server.py` first).
4. `python -I encode.py frames dice-15s.mp4`.
5. `aoo_reel_build` (black, 15, grade 14/175, `notify: false`), check the stills, send to Telegram via `notify.mjs`.
