# Issue 04 — Kenya

**Friday:** 13 Nov 2026 · **Pages:** 7
**Colour:** Kenya flag green `#006600`, which holds white text at 7.24:1. Cover rules and mountains stay white.
**Status:** to build through the office. Wesley set the slot on 30 Oct 2026. The prompt is in `PROMPT.md`.

## Why Kenya, and why now
- It is the series' first market outside Europe.
- **Contributor:** Zishan, who runs Harley, a service that handles guest complaints and Google reviews for hospitality brands. Harley has just signed Domino's in Kenya. Zishan has agreed to contribute and supports the series. Wesley asked for this on 30 Oct 2026.
- **The order now:** 03 Portugal (6 Nov), 04 Kenya (13 Nov), 05 Denmark (20 Nov), 06 Finland (27 Nov).

## Rules for this issue
- **Zishan's own words only,** approved by him. They go in the JSON `contributor` object: a "With insight from …" credit on the cover footer and a "From the ground" quote card on page 2 (added to the builder on 30 Oct 2026). Wesley supplies the quote. The office never writes it.
- **Disclosure line:** it must say Harley works with QSR brands in Kenya.
- **Neutral on pizza:** no recommendation for or against pizza or Domino's, and nothing about Domino's Kenya beyond public sources. Harley works for them.
- **Depth:** "Not found" is the last resort (`depth.md` in the office skill). Kenya's data is thinner than the Nordics', so every gap needs the search ladder worked and a proxy given.

## Open for Wesley
- **Zishan's role and how he wants to be credited:** for example "Zishan [surname], founder of Harley".
- **His approved quote:** about 40 words, on guest reviews, complaints and reputation in Kenya.
- **"If I had a brand":** his own words. The office drafts a suggestion only.

## Fix pass applied (2 Nov 2026, Claude Code)
The office's 2 Nov review produced a patch it couldn't apply: desks have no file tools, and the build was handed a patch instead of a full ISSUE JSON. Its findings were checked against `issue.json` and the builder, then applied here, and the PDF and HTML were rebuilt.
- **What changed:**
  - Date 20 NOV 2026.
  - "Five cities, about half (49.4%)".
  - Coffee added to the "growing" headline, and bubble tea to the "no current count" list.
  - KFC chart asterisk removed and the base note added.
  - TotalEnergies removed (S35 supports Rubis only).
  - Unsupported claims softened or removed: card terminal, rent, "lost the partner, not the customer", "every entry and exit", "proven way in", "all came in this way", "Labour is a small cost line".
  - Doubled text on page 5 fixed: tile sources, "Total ≈", "≈ … /hr", the ESTIMATE pill, the advice line.
- **Kept:** the **ESTIMATE** tag in the all-in floor note. It isn't doubled there.
- **Checked on the rebuilt PDF:** no doubled strings; pages 1, 3 and 5 checked by eye; 7 pages; all 52 sources kept.
- **The 30 Oct delivered version** is in `revisions/2026-10-30-delivered/`.
- **Still blocking release:**
  - ~~52 sources~~ **done 3 Nov:** 55 sources, live since 3 Nov with Wesley's OK (from `revisions/2026-11-03T12-39-25-edit/`; the version it replaced is in `revisions/2026-11-03T12-40-59-replaced/`). It adds S53 (US State Dept 2026: no limits on transferring investment funds), S54 (Uber Eats: nine boba outlets under six names in Nairobi, Panda Tea four) and S55 (KNBS 2019 census: Muslims 10.9%, 38% in Mombasa), and brings the page 3 headline and intro, the bubble-tea row and gap, the remittance risk and the method note into line;
  - Zishan's surname, role, approved quote and disclosure;
  - ~~the 20 Nov clash with Denmark~~ **done 3 Nov:** Wesley set Fri 13 Nov. The live PDF is re-dated 13 NOV 2026 (the 20 NOV version is in `revisions/2026-11-03T12-45-10-replaced/`);
  - Wesley to confirm coffee in the headline.
