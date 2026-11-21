// MMU-04 · Business Details (guide Section 4). The page SAVES AS YOU TYPE (a debounced PUT to /v1/business-details, found 7 Nov 2026).
// So the one answer typed here is a save: rehearsals, --test and --reuse block every PUT/PATCH/DELETE (record.mjs), and the real take
// refuses to start unless "What does your business do?" is empty. The other questions already hold the Patisserie Penelope answers
// (the guide's fictional franchise), which the video only scrolls past; nothing in them is typed or changed.
// The typed answer is the guide's own worked example (Section 4), 184 characters.
import { SITE } from '../../recorder/lib.mjs';

const ANSWER = 'We operate a multi-location patisserie. Our bakery creates several product lines, from cakes to bread, which customers can buy or eat in, served with a range of hot and cold beverages.';
const glide = async (page, ui, loc) => { await loc.evaluate(e => e.scrollIntoView({ behavior: 'smooth', block: 'center' })); await ui.pause(900); await ui.point(loc); };

export default {
  file: 'MMU-04 Business Details',
  title: 'Business Details',
  section: 4,
  next: 'Target Reader',
  voice: 'Wesley',
  music: { file: 'assets/music/warm-piano-pads-long.wav', gainDb: -24 },
  sting: { file: 'assets/sound/whoosh.wav', peak: 1.9, gainDb: -4 },
  pace: 0.9,
  start: '/',
  async guard(page) {
    if (!/Demo Operations Manual/i.test(await page.locator('body').innerText())) throw new Error('this is not the Demo Operations Manual: stop, never record in a client or live account');
  },
  steps: [
    { screen: 'Dashboard → point at **Provide details about your business** (top right)', caption: 'Give the platform *context*',
      narration: "Business Details give the platform the context of your business. Think of it as the induction pack you would give a talented new member of your team.",
      lead: 2600,
      async act(page, ui) { await ui.point(page.getByRole('link', { name: 'Provide details about your business' })); } },
    { screen: 'Click **Provide details about your business** on the Dashboard (or Settings → **Business Details**)', caption: 'Open *Business Details*',
      narration: "On the Dashboard, click Provide details about your business. Or, in Settings, click Business Details.",
      async act(page, ui) {
        await ui.click(page.getByRole('link', { name: 'Provide details about your business' }));
        await ui.wait(async () => { await page.waitForURL(/\/settings\/business-details/); await page.waitForLoadState('networkidle'); }, 'Business Details');
        await page.evaluate(() => window.scrollTo(0, 0));
      } },
    { screen: `Type the first answer (*${ANSWER.slice(0, 40)}…*)`, caption: 'Answer *What does your business do?*',
      narration: "Start with, What does your business do? Describe your products, services and how you deliver them.",
      async act(page, ui) {
        const box = page.locator('textarea#businessDescription');
        if (!ui.rehearse && !ui.reuse && (await box.inputValue()).length) throw new Error('"What does your business do?" is not empty: the real take would add to a saved answer. Clear it first, or use --reuse.');
        if (await box.inputValue()) await box.fill('');   // a blocked take that was typed over before: start from empty
        await ui.type(box, ANSWER, 22);
      } },
    { screen: 'Point at **What best describes your business model?** and **What best describes your business sector?**', caption: '*Business model* and *business sector*',
      narration: "Next, What best describes your business model? For example, franchising, licensing, multi-site, direct sales, or bricks-and-mortar. Then, What best describes your business sector? For example, food and beverage, hospitality, retail, or personal services.",
      async act(page, ui) {
        await glide(page, ui, page.getByText('What best describes your business model?', { exact: true })); await ui.pause(5200);
        await glide(page, ui, page.getByText('What best describes your business sector?', { exact: true })); } },
    { screen: 'Scroll past the remaining questions: how customers engage, standard roles, regulated standards, equipment', caption: 'Work through the *remaining questions*',
      narration: "Work through the remaining questions: how customers engage with you, the standard roles in your business, how you are regulated, and the equipment you use.",
      async act(page, ui) {
        for (const label of ['How do customers primarily engage with you?', 'Which standard roles exist at a typical unit?', 'Which regulated/brand standards apply to your business?', 'What equipment/systems are critical to a shift?']) {
          await glide(page, ui, page.getByText(label, { exact: true })); await ui.pause(1500);
        } } },
    { screen: 'Point at a **characters** counter, then **Settings** (top left)', caption: 'Up to *2,000 characters* each',
      narration: "Your answers save as you go, and each one allows up to 2,000 characters. Use them. A two-line answer gives you generic SOPs, but a full answer gives you SOPs that sound like your business. When you've finished, return to Settings. Next, we'll set your Target Reader.",
      tail: 0.6,
      async act(page, ui) {
        await glide(page, ui, page.locator('textarea#businessDescription'));
        await ui.point(page.getByText(/\d+\/2000/).first()); await ui.pause(6500);
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' })); await ui.pause(900);
        await ui.point(page.getByRole('link', { name: 'Settings' }).last()); } },
  ],
};
