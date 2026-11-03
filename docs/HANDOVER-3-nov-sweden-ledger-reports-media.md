# Handover: Sweden recap and row, Ledger Ep 03 v3, reports, Drive, media on D: (3 Nov 2026)

Start a new chat with: "Read `docs/HANDOVER-3-nov-sweden-ledger-reports-media.md` and carry on."

## Done and locked

**Sweden recap (Wed, En Route style)**
- The recap is in `videos/franchise-entry-report/issues/02-sweden/en-route/`.
  - The composition is `en-route.html`.
  - Renders come from `render-1440.sh` and go to `out1440/`, in four sizes: 2560×1440, 1440×2560, 1440×1800 and 1440×1440.
- It was re-rendered at 1440p because Wesley said the opening was blurry.
  - The fix: 4K/1440 proxies (`proxies-1440.sh`) with a denoise and sharpen pass, and grain cut from 0.10 to 0.07.
  - The result is three to four times sharper.
- The music is take 13, `music-samples/13-slap-house-b.wav`. It was made with local ACE-Step and finished with `master.py` (scoring, then mastering to −14 LUFS).
- It's filed to Drive under Franchise Entry Report. The README in that folder covers the music, the Drive filing and the 1440p re-render.
- **Checked (3 Nov, next chat):** all four 1440p finals and four covers in Drive › En Route (Wednesday) match `out1440/` byte for byte. Three effects-only cuts (1x1, 4x5, 9x16, about 0.85 GB) finished uploading into the binned `Instagram (effects only)` folder and still count against the quota until Wesley empties the Drive bin.

**Sweden Instagram row**
- The two side reels are `Stockholm or Visby.mp4` and `Gothenburg or Malmo.mp4`, in `output/library/video/sweden-city-compare/`.
  - They use the dark hyper-real grade, version B (`MOODY` in `looks.sh`).
- They're filed to Drive › Franchise Entry Report › `Sweden Issue 02 - Instagram row`, and the cloud copies were checked.
- Licences are in `output/library/video/sweden-en-route/LICENCE.md`.
  - Efrem Efre's "Gothenburg" and "Stockholm" aerials are actually Jönköping. Never use them.

**Operators Ledger Ep 03 v3 (Little's Law), Mon 9 Nov**
- Locked. The source is in `videos/operators-ledger/episodes/ep03-littles-law/v3/`; build with `node run.mjs <stills|draft|final>`.
- It's filed in Drive › Operators Ledger Episodes, and the modern Ep 01 and 02 were swapped in there too.
- The caption is a pain-point hook. The lessons are in `connectors/motion-studio/series/ledger-fresh/BRIEF.md`.

**Franchise reports**
- **Portugal (Issue 03, Fri 6 Nov):** finished. The advice line and wage title were fixed, the PDF was rebuilt and Drive updated. Wesley set up the LinkedIn posts.
- **Kenya (Issue 04):** patch applied (17 fields) and the cover verdict tightened. Wesley called it "locked in". See the open items below.
- **New rule for every build:** "Not found" is grey and Mixed stays orange (`build2.mjs`, `dir()`). All the issues were rebuilt with it.
- **New office tool:** `franchise_report_edit` (`connectors/franchise-report/mcp.mjs`).
  - Desks make field edits, and it builds `revisions/<time>-edit/` and ends with a `REVISION READY:` line.
  - When Wesley approves, `serve.mjs` promotes the revision to live (via `ferfile.promote`) and keeps a `-replaced` backup.
  - The QA skill and `fixing-a-delivered-issue.md` now point to it.
  - **The office needs a restart (`npm start`) before desks get it.**

**Motion library**
- Styles 03–12 and the dark hyper-real look are in the Brain note `40-Marketing/motion-library/styles-03-12-location-and-evidence.md`, which ends with the "which style for which content" table.
- The Motion Director reads it (`motion.mjs`, step 0b).

**Google Drive**
- Drive was full (QUOTA_EXCEEDED). The superseded copies were binned, and Wesley freed space as well.
- Policy: Drive is a posting shelf only. Wesley clears it after posting and won't pay for more storage; the PC is the master store.
- The Harvey Pod files belong to harvey@thefranchiseshow.org. Leave them alone.

**Media on D: (today)**
- 26 folders (31.8 GB) moved to `D:\Agents Office Media`, with junctions left at the old paths. That makes 27 junctions, counting the earlier Consultants' Corner one.
- C: free went from 94 GB to about 124 GB.
- Git is untouched and `npm run check` passes 79/79.
- After any build that makes a new heavy folder under `videos/`, run `npm run media` (`-- --dry` to preview).
- The rule is written in Brain `00-Meta/media-storage.md` (plus pointers in four skills and notes), CLAUDE.md, `videos/README.md` and memory `media-on-d-drive`.

## Open

1. **Kenya, before it goes out:**
   - Zishan's surname, role, approved quote and disclosure. Use only his approved words.
   - Sources: done. 55 sources, live since 3 Nov with Wesley's OK. The old version is in `revisions/2026-11-03T12-40-59-replaced/`, and the details are in the issue's `ISSUE.md`.
   - Date: done. Wesley set Fri 13 Nov (3 Nov), and the live PDF is re-dated 13 NOV. The draft note to Zishan (Brain `40-Marketing/franchise-entry-report-04-zishan-note.md`) now says 13 Nov and asks for a reply by Mon 9 Nov (assumed). It is not sent: Wesley sends it.
   - Wesley to confirm coffee in the headline.
   - Keep pizza and Domino's neutral.
2. **Library hard links (closed 3 Nov):** the move to D: turned 61 auto-built library files into separate copies, about 0.22 GB on D:. The hand-filed folders (`sweden-*`, `norway-*` and so on) hold the only copies of those masters, so link count 1 is right for them. Nothing to do.
3. **Stuck jobs (closed 3 Nov):** `xmvzr1i9g9hn` (AoO Reel 14) and `vmvzqqav2jfv` (LTX, Reel 15) both show `cancelled` since 10:29. No video, LTX or music job is running.
4. **AoO Reels 14 and 15 v2:** still waiting on Wesley's approval. They have their own handover: `docs/HANDOVER-aoo-reels-14-15-v2.md`.
5. **Sweden footage clean-up:** once the posts are live, ask Wesley, then delete the downloaded footage and frames. Keep the finished reels and `LICENCE.md`.
6. **C: space:** suggested moving Steam games to D: through Steam (Properties › Installed Files › Move install folder). That's about 613 GB in total; Starfield and Crimson Desert alone are about 290 GB. It's Wesley's to do.
7. **Uncommitted work:** the website files, `src/braingraph.js`, `dist/command-centre-v2.html`, `sites/imrans-diner-visit/`, the logos and today's changes are all uncommitted. Commit only when asked, and never push.

## Standing rules to keep

- Wesley approves every footage download.
- The office never posts, sends or schedules. Email goes to Gmail drafts only.
- Never write YSF Advisory or "WRW Consulting".
- Never name the Portugal requester.
- No bare "Not found" in reports. Every document carries the WRW branding and the © line.
- Never pitch-shift the cloned voice. No "Case closed" in the Ledger.
- Deleting means binning, and only with Wesley's yes.
- Heavy media stays on D:. If D: is missing, stop and tell Wesley.
