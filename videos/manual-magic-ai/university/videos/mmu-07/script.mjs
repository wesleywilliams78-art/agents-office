// MMU-07 · Brand your manual: logo and colours (guide Section 7). READ-ONLY, Wesley's yes 7 Nov 2026.
// The Preferences page has a Save button (colour changes only save when it is pressed), a Reset to Default button (opens a confirm), and a
// hidden file input behind "Click to upload" (a picked file uploads at once). The video points at all of them and presses none:
// it never types in a hex box, never clicks a colour square (native picker), never clicks Save, Reset to Default or Click to upload.
// Demo account on 7 Nov 2026: Primary #f5842c, Secondary #042549, Tertiary #6bc7ed, Background #ffffff, Body Text #6bc7ed; no organisation logo uploaded.
// The "#042549" example in the narration is the guide's own, and it is the Secondary colour on screen.
import { SITE } from '../../recorder/lib.mjs';

const glide = async (page, ui, loc) => { await loc.evaluate(e => e.scrollIntoView({ behavior: 'smooth', block: 'center' })); await ui.pause(900); await ui.point(loc); };
const COLOURS = ['Primary', 'Secondary', 'Tertiary', 'Background', 'Body Text'];
const label = (page, name) => page.locator('label').filter({ hasText: new RegExp('^' + name + '$') });

export default {
  file: 'MMU-07 Brand your manual - logo and colours',
  title: 'Brand your manual: logo and colours',
  section: 7,
  next: 'Upload your IP',
  voice: 'Wesley',
  music: { file: 'assets/music/warm-piano-pads-long.wav', gainDb: -24 },
  sting: { file: 'assets/sound/whoosh.wav', peak: 1.9, gainDb: -4 },
  pace: 0.9,
  start: '/',
  async guard(page) {
    if (!/Demo Operations Manual/i.test(await page.locator('body').innerText())) throw new Error('this is not the Demo Operations Manual: stop, never record in a client or live account');
  },
  steps: [
    { screen: 'Dashboard → point at the **Settings** icon (the cog) in the left-hand menu', caption: 'Your manual, *your brand*',
      narration: "Your manual is your own label, not ours. Add your logo and colours so your Team Members see your brand every time they open it.",
      lead: 2600,
      async act(page, ui) { await ui.point(page.locator('svg.expand-btn.mb-8').last()); } },
    { screen: 'Click the **Settings** icon, then click **Preferences**', caption: 'Open *Preferences*',
      narration: "In Settings, click Preferences.",
      async act(page, ui) {
        await ui.click(page.locator('svg.expand-btn.mb-8').last());
        await ui.wait(async () => { await page.waitForURL(/\/settings$/); await page.waitForLoadState('networkidle'); }, 'Settings');
        await ui.pause(500);
        await ui.click(page.getByRole('link', { name: /Preferences/ }).first());
        await ui.wait(async () => { await page.waitForURL(/\/settings\/preferences/); await page.waitForLoadState('networkidle'); }, 'Preferences');
        await page.evaluate(() => window.scrollTo(0, 0));
      } },
    { screen: 'Theme Colors → point down the five labels: **Primary**, **Secondary**, **Tertiary**, **Background**, **Body Text**', caption: 'Five *Theme Colors*',
      narration: "Under Theme Colors, you'll see five colours: Primary, Secondary, Tertiary, Background, and Body Text.",
      async act(page, ui) {
        await ui.point(page.getByRole('heading', { name: 'Theme Colors' })); await ui.pause(900);
        for (const [i, name] of COLOURS.entries()) { await ui.point(label(page, name)); await ui.pause(i === 4 ? 200 : 1000); } } },
    { screen: 'Point at the **hex code** box beside Secondary (nothing typed)', caption: 'Enter a *hex code*',
      narration: "Enter the hex code for each colour. A hex code is six characters after a hash sign, for example, hash zero four two five four nine.",
      async act(page, ui) {
        await ui.point(page.locator('input[type=text][placeholder="#042549"]')); await ui.pause(1500);
        await ui.point(page.locator('input[type=text][placeholder="#f5842c"]')); } },
    { screen: 'Point at a **colour square** (not clicked)', caption: 'Or click a *colour square*',
      narration: "Don't know your hex code? Click a colour square to pick a colour instead.",
      async act(page, ui) { await ui.point(page.locator('input[type=color]').nth(2)); } },
    { screen: 'Point at **Save**, then **Reset to Default** (neither pressed)', caption: '*Save*, or *Reset to Default*',
      narration: "When you're happy with your colours, click Save. To go back to the original colours, click Reset to Default.",
      async act(page, ui) {
        await ui.point(page.getByRole('button', { name: 'Save', exact: true })); await ui.pause(2800);
        await ui.point(page.getByRole('button', { name: 'Reset to Default', exact: true })); } },
    { screen: 'Upload Logo → point at **Click to upload** and the file types line (nothing uploaded)', caption: 'Under Upload Logo, *Click to upload*',
      narration: "Under Upload Logo, click Click to upload and choose your logo file. A PNG with a transparent background works best. You can upload a PNG, JPG, or GIF, up to ten megabytes.",
      async act(page, ui) {
        await glide(page, ui, page.getByRole('heading', { name: 'Upload Logo' })); await ui.pause(900);
        await ui.point(page.locator('span.cursor-pointer', { hasText: 'Click to upload' })); await ui.pause(4200);
        // the line's box is the full width of the drop zone, so aim at the text itself (ui.point stops 120 px from a wide box's left edge)
        const at = await page.evaluate(() => {
          const el = [...document.querySelectorAll('*')].find(e => !e.children.length && e.textContent.trim() === 'PNG, JPG, GIF up to 10MB');
          const r = document.createRange(); r.selectNodeContents(el); const b = r.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
        });
        await ui.moveTo(Math.round(at.x), Math.round(at.y)); } },
    { screen: 'Scroll back up and point at **MANUAL** in the dark bar', caption: 'Open your *manual* to check it',
      narration: "Then open your Operations Manual to check how it looks. Next, we'll upload your IP.",
      tail: 0.6,
      async act(page, ui) {
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' })); await ui.pause(1100);
        await ui.point(page.getByText('MANUAL', { exact: true }).first()); } },
  ],
};
