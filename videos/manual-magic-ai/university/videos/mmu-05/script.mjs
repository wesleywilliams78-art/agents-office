// MMU-05 · Target Reader (guide Section 5). READ-ONLY: this page autosaves as you type (like Business Details), and all four answers
// already hold Patisserie Penelope content, so the video points at them and types nothing. The demo account is never changed.
// Narration may describe what the filled answers show (checked against the account on 7 Nov 2026); it quotes the guide for the rest.
import { SITE } from '../../recorder/lib.mjs';

const glide = async (page, ui, loc) => { await loc.evaluate(e => e.scrollIntoView({ behavior: 'smooth', block: 'center' })); await ui.pause(900); await ui.point(loc); };
const ask = (page, ui, label, field, hold) => async () => {
  await glide(page, ui, page.locator('label[for="' + field + '"]')); await ui.pause(hold);   // the label, not the <em> hint that repeats it
  await ui.point(page.locator('textarea#' + field));
};

export default {
  file: 'MMU-05 Target Reader',
  title: 'Target Reader',
  section: 5,
  next: 'Brand Voice',
  voice: 'Wesley',
  music: { file: 'assets/music/warm-piano-pads-long.wav', gainDb: -24 },
  sting: { file: 'assets/sound/whoosh.wav', peak: 1.9, gainDb: -4 },
  pace: 0.9,
  start: '/',
  async guard(page) {
    if (!/Demo Operations Manual/i.test(await page.locator('body').innerText())) throw new Error('this is not the Demo Operations Manual: stop, never record in a client or live account');
  },
  steps: [
    { screen: 'Dashboard → point at **Define your target reader** (top right)', caption: 'Who will *read* your SOPs?',
      narration: "Your Target Reader settings tell the platform who will read and follow your SOPs. This shapes the language, the level of detail and the format.",
      lead: 2600,
      async act(page, ui) { await ui.point(page.getByRole('link', { name: 'Define your target reader' })); } },
    { screen: 'Click **Define your target reader** on the Dashboard (or Settings → **Target Reader**)', caption: 'Open *Target Reader*',
      narration: "On the Dashboard, click Define your target reader. Or, in Settings, click Target Reader.",
      async act(page, ui) {
        await ui.click(page.getByRole('link', { name: 'Define your target reader' }));
        await ui.wait(async () => { await page.waitForURL(/\/settings\/target-reader/); await page.waitForLoadState('networkidle'); }, 'Target Reader');
        await page.evaluate(() => window.scrollTo(0, 0));
      } },
    { screen: 'Point at **Who is your target reader?** and its answer', caption: '*Who is your target reader?*',
      narration: "First, Who is your target reader? Name your primary reader and any secondary readers, with rough percentages. Here, the primary reader is a Store Manager at fifty percent.",
      async act(page, ui) { await ask(page, ui, 'Who is your target reader?', 'targetReaders', 4000)(); } },
    { screen: 'Point at **What jobs/outcomes must this reader achieve?** and its answer', caption: '*What jobs/outcomes* must they achieve?',
      narration: "Next, What jobs and outcomes must this reader achieve? List the key KPIs, compliance requirements and success metrics, both internal and external.",
      async act(page, ui) { await ask(page, ui, 'What jobs/outcomes must this reader achieve?', 'idealOutcomes', 5000)(); } },
    { screen: 'Point at **When/where will readers use this manual?** and its answer', caption: '*When/where* will readers use it?',
      narration: "Then, When and where will readers use this manual? For example, pre-shift briefings on a tablet, during service on a mobile phone, or emergency procedures on a printed backup.",
      async act(page, ui) { await ask(page, ui, 'When/where will readers use this manual?', 'accessPatterns', 5500)(); } },
    { screen: "Point at **What is the reader's baseline capability?** and its answer", caption: "The reader's *baseline capability*",
      narration: "Finally, describe the baseline capability of your reader: how experienced they are, and how confident they are with technology.",
      async act(page, ui) { await ask(page, ui, "What is the reader's baseline capability?", 'readerBackground', 4000)(); } },
    { screen: 'Scroll back up and point at **Settings** (top left)', caption: 'Your answers *save as you go*',
      narration: "Your answers save as you go. If your reader needs instant help at the point of work, say so here, then use QR codes to take them straight to the right SOP. Next, we'll set your Brand Voice.",
      tail: 0.6,
      async act(page, ui) {
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' })); await ui.pause(1100);
        await ui.point(page.getByRole('link', { name: 'Settings' }).last()); } },
  ],
};
