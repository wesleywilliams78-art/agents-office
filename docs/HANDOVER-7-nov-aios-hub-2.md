# Handover, 7 Nov 2026 (evening): AIOS dashboard hub 2 → hub 3

How the hub works is unchanged: see `docs/HANDOVER-7-nov-aios-hub.md` (hub 1) and memory `aios-hub-chat-sessions.md`. Group "AIOS dashboard" = `cg-7acfdc6a-ea97-41d1-9f80-702999a28fd3`. Sessions started from the hub nest under it and land in the group by themselves. Moving other sessions with `move_sessions` was blocked by auto mode; nesting only follows who started a session.

## Sessions from hub 2 (all linked; check with list_sessions {"linked": true})
Turn-end notes from these reach hub 2, not hub 3. Check them yourself when Wesley asks or when one should be done.

| Session | id | State at handover |
|---|---|---|
| MMU-07 logo and colours | `local_5cc50159-0749-44c8-ba54-caf7d437e28e` | Test video done (80.8 s, read-only; Preferences has a Save button). Last asked Wesley about MMU-08 Upload IP. Check whether the real take was delivered. |
| AIOS review pop-up | `local_7d0ef01e-a5b3-424f-961c-e84451680515` | Done. `74a1215` and `1e88204` pushed. REVIEW and READ open the pop-up; no task opens the 3D office (only Social's CALENDAR ↗ link remains). Claude Code prompts arrive once and whole (`handoff.mjs`, cap 20,000). |
| Deep Work playlist 2 | `local_071c9a69-00dd-4ca4-b053-8cbf2f073f82` | Hour 1: 144 takes. Wesley heard a "harmonica"; Earshot confirmed a harmonium/reed organ, so a reed-voice scan and an exclude list were added. Takes 9–16 are generating for 13 empty slots (about 2½ h), then judging, mastering and one Telegram sample for his yes. The ACE-Step server crashed twice, cause unknown. Morning Brief link/date still to ask. Full prompt: notes folder `deep-work-build-prompt.md`. |
| Carousels to Greta | `local_e5c9be2f-32be-4cce-a5b3-e65d796e553c` | Done. `358f430` pushed. Carousels, slides and stills go to Greta (`gfx`); Iggy writes copy only. Every visual gets Greta's design audit (`video_look` + `design-audit`) before the lead. `video-studio` has a `tales` brand. Brain note `40-Marketing/tales-of-nirn-series-look-and-ep01-text.md`. Slide 8 uses the end-card credit, the caption uses "Fan-made…". Unconfirmed: did the Night Falls rerun with series art reach his review queue? |
| AIOS office overview design | `local_64e72609-9dc1-4aa4-885e-e8fb6c347116` | Done. Design `docs/aios-office-overview-design.md`, mockups `output/aios-mockups/`. |
| ↳ AIOS office levels: next steps | `local_7c19a600-f2e3-44f5-9224-e62abd547dc7` | Done. Tab renamed Office, Delivery joined the pilot, live step log (`serve.mjs`), dead CSS removed. Commits `a8a635c`…`0425819` were NOT pushed at last check; Wesley wasn't asked again. |
| ↳↳ Build the full-width AIOS Office | `local_a8f8b062-5955-4287-8fdc-d40c650a7b41` | Working (started by office-next). |
| motion-pages trial | `local_7c72a589-43bc-419c-8c72-09e76b5fb4b2` | Just started. Trialling github.com/jiangyurong609/motion-pages (MIT) on the WRW website hero in `output/motion-pages-trial/`; clone goes to `C:\Users\Wesley\tools\motion-pages`. Ends with a yes/no on lifting 1–2 pieces into `website-build`. |
| Portugal En Route (from hub 1) | `local_a12aaa82-c509-42a7-8bd7-2994b588b1d1` | Idle. Due Tue 10 Nov 18:00; check its output. |

## Done in the hub itself
- The 9 superseded Portugal pill files are in Drive trash (recoverable for 30 days); the Edition 03 folder was kept.
- "What is Motion Sites": MotionSites.ai is a paid prompt library (Viktor Odainyi); motion-pages is the real repo, now on trial.

## Open for Wesley
- Push the unpushed office commits (`git push fork main`)?
- The footage clean-up after the Madeira Reel is live (hub 1 list: `footage/p30100487.mp4`, `p33050416`, `p36765873`, `p40000897`, `frames-madeira/`). Ask first.

## Rules Wesley gave today (check they're in memory or a brief before relying on them)
- Anything visual (video, Instagram, LinkedIn, carousel) is audited by the Graphics Designer before QA or the lead. Greta keeps a strong bar: brand kit, flag colours, series sub-guidelines. Now in briefs and code (`358f430`).
- Nothing in the AIOS should send him to the 3D office; reviews happen in the AIOS pop-up.
- Design jobs should be done by the office's designer, never bounced to Claude Code while a desk can build them.

## Lessons
- `handoff.mjs` used to dedupe on the full text but store a cut copy, so long prompts showed twice and came out cut off. Fixed; old tasks keep their stored copy.
- A team "solo" plan can skip the right desk; read `team.why`/`team.pieces` on the task to see who did what.
- Sessions ask Wesley to switch to Opus for multi-file code; the hub can't switch models.
