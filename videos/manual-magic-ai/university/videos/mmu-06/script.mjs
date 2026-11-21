// MMU-06 · Brand Voice (guide Section 6). READ-ONLY. This page autosaves, and the demo account already holds a set-up (English (UK), Primer / Janet-and-John,
// five slider positions, the keyword "innovative", exclusions Corporate / Edgy / Passive, no statements). The video opens the two dialogs but never presses
// Select, Analyze or a checkbox, drags no slider and types nothing: both dialogs are closed with Cancel. record.mjs logs any save it blocks.
// The platform spells it "Analyze" and "Cancel"; captions and narration use the screen's words.
import { SITE } from '../../recorder/lib.mjs';

const glide = async (page, ui, loc) => { await loc.evaluate(e => e.scrollIntoView({ behavior: 'smooth', block: 'center' })); await ui.pause(900); await ui.point(loc); };
const SLIDERS = ['Professional to Playful', 'Formal to Casual', 'Authoritative to Approachable', 'Enthusiastic to Calm', 'Friendly to Bold'];

export default {
  file: 'MMU-06 Brand Voice',
  title: 'Brand Voice',
  section: 6,
  next: 'Brand your manual: logo and colours',
  voice: 'Wesley',
  music: { file: 'assets/music/warm-piano-pads-long.wav', gainDb: -24 },
  sting: { file: 'assets/sound/whoosh.wav', peak: 1.9, gainDb: -4 },
  pace: 0.9,
  start: '/',
  async guard(page) {
    if (!/Demo Operations Manual/i.test(await page.locator('body').innerText())) throw new Error('this is not the Demo Operations Manual: stop, never record in a client or live account');
  },
  steps: [
    { screen: 'Dashboard → point at **Configure your brand voice** (top right)', caption: 'Sound like *your business*',
      narration: "Brand Voice makes your manual sound like your business, not like a generic AI. These settings help you find your voice.",
      lead: 2600,
      async act(page, ui) { await ui.point(page.getByRole('link', { name: 'Configure your brand voice' })); } },
    { screen: 'Click **Configure your brand voice** on the Dashboard (or Settings → **Brand Voice**)', caption: 'Open *Brand Voice*',
      narration: "On the Dashboard, click Configure your brand voice. Or, in Settings, click Brand Voice.",
      async act(page, ui) {
        await ui.click(page.getByRole('link', { name: 'Configure your brand voice' }));
        await ui.wait(async () => { await page.waitForURL(/\/settings\/brand-voice/); await page.waitForLoadState('networkidle'); }, 'Brand Voice');
        await page.evaluate(() => window.scrollTo(0, 0));
      } },
    { screen: 'Language → point at the dropdown and **English (UK)** (the list shown inline, nothing changed)', caption: 'Choose your *Language*',
      narration: "Under Language, choose the language and variant your manual should use, for example English UK. It can write in other languages too.",
      async act(page, ui) {
        const sel = page.locator('select').first();
        await ui.point(sel); await ui.pause(900);
        await sel.evaluate(e => { e.size = 8; e.style.height = 'auto'; });   // a native list isn't captured on video: show it inline, change nothing, fold it back
        await ui.pause(900);
        await ui.point(sel.locator('option', { hasText: 'English (UK)' })); await ui.pause(2800);
        await sel.evaluate(e => { e.size = 0; e.style.height = ''; });
      } },
    { screen: 'Learning Communication Style → **Choose style** → **Professional Styles** → **Show details**, point at **Select**, then **Cancel**', caption: 'Choose a *Learning Communication Style*',
      narration: "Under Learning Communication Style, click Choose style. Pick a category: Basic, Professional, or Specialised. Click Show details under any style to read what it is for. Then select the one that fits your reader, and click Select.",
      async act(page, ui) {
        await ui.click(page.getByRole('button', { name: 'Choose style' })); await ui.pause(2800);
        await ui.click(page.getByRole('button', { name: /^Professional Styles/ })); await ui.pause(2200);
        await ui.click(page.getByText('Show details', { exact: true }).first()); await ui.pause(3400);
        await ui.point(page.getByRole('button', { name: 'Select', exact: true })); await ui.pause(2600);
        await ui.click(page.getByRole('button', { name: 'Cancel', exact: true }));   // closes without choosing
        await ui.pause(500);
      } },
    { screen: 'Brand Voice Statements → **Upload Example** → point at the box and **Analyze**, then **Cancel**', caption: 'Upload an *example* of your writing',
      narration: "Under Brand Voice Statements, click Upload Example. Paste a piece of writing that sounds like your brand, such as website copy or a social media post. Then click Analyze, and the platform writes short Brand Voice Statements for you to review.",
      async act(page, ui) {
        await ui.click(page.getByRole('button', { name: 'Upload Example' })); await ui.pause(2600);
        await ui.point(page.locator('textarea[placeholder^="Paste your brand content"]')); await ui.pause(4200);
        await ui.point(page.getByRole('button', { name: 'Analyze', exact: true })); await ui.pause(3600);
        await ui.click(page.getByRole('button', { name: 'Cancel', exact: true }));   // never Analyze: nothing is typed or sent
        await ui.pause(500);
      } },
    { screen: 'Brand personality → point along the five sliders (no slider is moved)', caption: 'Set your *Brand personality*',
      narration: "Under Brand personality, move each slider to where your brand sits: Professional to Playful, Formal to Casual, Authoritative to Approachable, Enthusiastic to Calm, and Friendly to Bold.",
      async act(page, ui) {
        await glide(page, ui, page.getByRole('heading', { name: 'Brand personality' })); await ui.pause(1200);
        for (const i of SLIDERS.keys()) { await ui.point(page.locator('input[type=range]').nth(i)); await ui.pause(i === 4 ? 200 : 1900); } } },
    { screen: 'Point at **Describe your brand in 3 words** (the keyword box and Add), then **Never sound like this** and **Active Exclusions**', caption: 'Three words, and tones to *avoid*',
      narration: "Describe your brand in three words by typing a keyword and clicking Add. Under Never sound like this, tick the tones to avoid. Your choices are listed under Active Exclusions.",
      async act(page, ui) {
        await glide(page, ui, page.getByRole('heading', { name: 'Describe your brand in 3 words' })); await ui.pause(1200);
        await ui.point(page.getByRole('button', { name: 'Add', exact: true }).first()); await ui.pause(2200);
        await ui.point(page.getByRole('heading', { name: 'Never sound like this' })); await ui.pause(2600);
        await glide(page, ui, page.getByText('Active Exclusions', { exact: true })); } },
    { screen: 'Scroll back up and point at **Settings** (top left)', caption: 'Not sounding right? *Revisit Brand Voice*',
      narration: "If your SOPs don't sound right, revisit Brand Voice first. Next, we'll add your logo and colours.",
      tail: 0.6,
      async act(page, ui) {
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' })); await ui.pause(1100);
        await ui.point(page.getByRole('link', { name: 'Settings' }).last()); } },
  ],
};
