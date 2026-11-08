# Handover, 7 Nov 2026: Manual Magic University series (MMU-02 to MMU-07, all delivered)

Skill: `.claude/skills/manual-magic-university/SKILL.md`. Tools and README: `videos/manual-magic-ai/university/`. Memory: `manual-magic-university.md`. Run everything from the `university` folder. VoiceStudio must be running on 127.0.0.1:3900 with the "Wesley" profile.

## Where things stand
Penny approved the pilot MMU-09 (Wesley confirmed 7 Nov), so the batch is open. Delivered to `G:\My Drive\006 - Manual Magic\Manual Magic University\` (each with `MMU-NN script.md` and a folder under `recording-scripts\`), all awaiting Penny's approval:

| Video | Length | Notes |
|---|---|---|
| MMU-02 Find your way around the Dashboard | 120.6 s | read-only; 0.6 s over the 120 s ceiling, trim only if asked |
| MMU-03 Set up the platform so it knows your business | 73.1 s | read-only Settings overview |
| MMU-04 Business Details | 99.0 s | typed the guide's 184-character example into the empty "What does your business do?"; saved to the demo account |
| MMU-05 Target Reader | 96.1 s | read-only: all four answers were already filled |
| MMU-06 Brand Voice | 117.1 s | read-only; opens the Choose style and Upload Example dialogs and closes both with Cancel; real take 7 Nov 16:12 |
| MMU-07 Brand your manual: logo and colours | 80.8 s | read-only: points at the five colours, Save, Reset to Default and Click to upload, presses none; no logo uploaded; page re-read after the real take (7 Nov 17:23), unchanged |

MMU-06 was recorded for real after Wesley approved the test video. Afterwards the Brand Voice page was re-read and matched the pre-take state exactly (English (UK), Primer / Janet-and-John, sliders 4/4/2/4/2, keyword "innovative" 1/3, exclusions Corporate/Edgy/Passive, no statements). Nothing was saved by the take.

## Rules learned (all in memory; the last four are not yet in the skill)
- Settings pages autosave as you type (debounced PUT). A typed answer is a real save. Check which fields are filled first; never overwrite demo content without Wesley's yes.
- `recorder/record.mjs` (edited this session, not committed): in `--rehearse`, `--test` and `--reuse` it answers PUT/PATCH/DELETE to api.manualmagic.ai with a fake 200 (so no error toast) and logs "(blocked a save: ...)" for anything except `/customers/me`, which the platform fires on every page load.
- Real takes must start from an empty field (the MMU-04 script throws if it isn't). Brand Voice: never press Select, Analyze, a checkbox or a slider.
- Wesley reviews a test video before every real take; the real take saves for real. Penny approves each finished video before use.
- The platform says "Analyze"; the guide says "Analyse". Captions use the screen's word.
- Platform bug for Penny: the Target Reader page's breadcrumb reads "Settings / Business Details". Earlier: Add SOP on the Dashboard opens the SOP Board (guide Section 9).
- Narration drives length: aim for 60 to 120 s total. Trim wording rather than speeding up.

## Next
1. 08 Upload IP, 10 to 17, 19. Wait for Penny's answers before 18 Export (the Gamma question) and 20 Team (seat limits).
2. Loose ends: `videos/mmu-02` to `mmu-07` and the `record.mjs` edit are uncommitted; MMU-02 is 0.6 s over 120 s. Nothing was pushed (`git push fork main` only, never a bare push).
4. Not checked on any video: the cursor on every frame and the audio by ear. Wesley watches each test video.

## Start prompt for a new chat
"Read docs/HANDOVER-7-nov-mmu-series.md and the manual-magic-university skill. Then start MMU-07 (logo and colours): ask me yes/no first, and check whether the Preferences page autosaves before writing the script."
