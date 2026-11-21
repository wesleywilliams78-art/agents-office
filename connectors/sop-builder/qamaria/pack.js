// Settings for the current Qamaria UK SOP pack (gaps list + cover note).
module.exports = {
  setName: 'Qamaria UK SOP set',
  range: 'QUK-SOP-01 TO 05',
  date: '3 November 2026',
  filePrefix: 'QUK-SOP Set',
  fileVersion: 'v1.0',
  // Section B of the gaps list: assumptions to confirm [ref, question, SOPs, notes, answer]
  assumptions: [
    ['A01', 'These SOPs use the role titles “shift lead” and “manager”. What are the role titles in Qamaria UK sites?', 'All', 'Swap the titles in all SOPs once confirmed.', ''],
    ['A02', 'Is the espresso machine a traditional machine with group heads and steam wands (as these SOPs assume), or fully automatic?', '01, 04', 'A fully automatic machine needs SOP 01 rewritten.', ''],
    ['A03', 'Do the proposed working standards suit you? Empty general bins at half full; refill to full; staff toilets on the same checklist; toilet checks at opening and closing; shift lead checks logs each shift or day; weekly machine deep clean with the machine off and cool; rubbish out before cash-up; count cash away from windows; closing team leaves together.', 'All', 'Proposed as good practice, not taken from Qamaria rules.', ''],
    ['A04', 'Will any UK site be in Scotland?', 'All', 'The 8°C chilled limit is law in England, Wales and Northern Ireland, and only recommended in Scotland. Check the Scottish rules if so.', ''],
  ],
  cover: {
    subtitle: 'QAMARIA UK  |  FIVE POINT-OF-WORK SOPs',
    meta: [['For', 'Qamaria UK operations'], ['Prepared by', 'Wesley Williams'], ['Date', '3 November 2026'], ['Status', 'Draft for Qamaria review'], ['Review by', '3 May 2027']],
    exampleGap: 'machineModel',
    packNote: 'Every SOP has the same eight sections in the same order: when, what you need, steps, done properly, if something is wrong, safety and hygiene, sign-off and related SOPs. No section breaks across a page. Each SOP ends with a one-page checklist or log to print and post at the point of work. Word and PDF versions are supplied.',
    sections: [
      ['What was assumed', [
        ['Any site, numbering and dates.', 'The SOPs name no site and work for any Qamaria UK café. SOP numbers QUK-SOP-01 to 05 are proposed and can be renumbered to match the UK Operations Manual chapters later. Version 1.0 (draft), issued 3 November 2026, review by 3 May 2027: six months, because first versions should be checked after real use.'],
        ['Roles.', 'The SOPs use “shift lead” and “manager” until the UK role titles are confirmed (assumption A01).'],
        ['Machine type.', 'SOP 01 assumes a traditional espresso machine with group heads, portafilters and steam wands. The grinder and traditional Yemeni coffee pots are left for their own SOPs (A02).'],
        ['Till and ordering.', 'Square is under review, so no step depends on it. Ordering works with any method: supplier portal, email, phone or stock system.'],
        ['Working standards.', 'Some practical standards are proposed as good practice, not taken from Qamaria rules: for example, empty bins at half full, a weekly machine deep clean, count cash away from windows, the closing team leaves together. The full list is assumption A03.'],
        ['Print version.', 'These use a light, cream-coloured version of the Qamaria template, because they are printed, written on and posted at the point of work.'],
      ]],
      ['Food safety figures used', [
        ['Chilled food:', '8°C or below by law in England, Wales and Northern Ireland; fridges set to 5°C or below (Food Standards Agency).'],
        ['Frozen deliveries:', 'accept at −15°C or colder, with −18°C as the target. This is common industry practice, not law.'],
        ['Fitness to work:', 'no food handling within 48 hours of diarrhoea or vomiting (Food Standards Agency).'],
        ['Opening and closing checks:', 'aligned with the Food Standards Agency’s Safer Food, Better Business opening and closing checks.'],
      ]],
      ['Next steps', [
        'Qamaria answers the gaps and questions list. The SOPs are then updated and reissued as version 1.0 final.',
        'Each SOP is trialled for one week at one site. Anything that does not work on shift is fixed before roll-out.',
        'Suggested next SOPs (marked * in the SOPs): grinder cleaning, allergen control, temperature checks, body fluid spills and cash handling.',
      ]],
    ],
  },
};
