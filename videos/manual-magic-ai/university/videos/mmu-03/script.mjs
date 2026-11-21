// MMU-03 · Set up the platform so it knows your business (guide Section 3). Read-only: it opens Settings and points at the panels, no panel is opened or changed.
// Settings (discover, 7 Nov 2026) shows five panels: Brand Voice, Business Details, Target Reader, Preferences, Workspace.
// The left-hand icons are unlabelled SVGs; the Settings cog is the last one (svg.expand-btn.mb-8).
// Sections 4 to 7 (MMU-04 to 07) open each panel, so this video only names them and gives the order.
import { SITE } from '../../recorder/lib.mjs';

export default {
  file: 'MMU-03 Set up the platform so it knows your business',
  title: 'Set up the platform so it knows your business',
  section: 3,
  next: 'Business Details',
  voice: 'Wesley',
  music: { file: 'assets/music/warm-piano-pads-long.wav', gainDb: -24 },
  sting: { file: 'assets/sound/whoosh.wav', peak: 1.9, gainDb: -4 },
  pace: 0.9,
  start: '/',
  async guard(page) {
    if (!/Demo Operations Manual/i.test(await page.locator('body').innerText())) throw new Error('this is not the Demo Operations Manual: stop, never record in a client or live account');
  },
  steps: [
    { screen: 'Dashboard → point at the **Improve SOP generation** panel (top right)', caption: 'Tell the platform about *your business*',
      narration: "Before the platform writes anything, it needs to know four things: what your business does, who will read the manual, how your brand sounds, and how your manual should look.",
      lead: 2600,
      async act(page, ui) { await ui.point(page.getByRole('heading', { name: 'Improve SOP generation' })); } },
    { screen: 'Click the **Settings** icon (the cog) in the left-hand menu', caption: 'Click the *Settings* icon',
      narration: "You set all four in Settings. Click the Settings icon, the cog, in the left-hand menu.",
      async act(page, ui) {
        await ui.click(page.locator('svg.expand-btn.mb-8').last());
        await ui.wait(async () => { await page.waitForURL(/\/settings$/); await page.waitForLoadState('networkidle'); }, 'Settings');
      } },
    { screen: 'Point along the panels: **Brand Voice**, **Business Details**, **Target Reader**, **Preferences**, **Workspace**', caption: 'Five *panels*',
      narration: "You'll see five panels: Brand Voice, Business Details, Target Reader, Preferences, and Workspace.",
      async act(page, ui) {
        for (const name of ['Brand Voice', 'Business Details', 'Target Reader', 'Preferences', 'Workspace']) {
          await ui.point(page.getByRole('heading', { name, exact: true })); await ui.pause(name === 'Workspace' ? 200 : 1100);
        } } },
    { screen: 'Point in order: **Business Details**, **Target Reader**, **Brand Voice**, **Preferences**, then **Workspace**', caption: 'Work through them *in this order*',
      narration: "Work through the first four in this order: Business Details, Target Reader, Brand Voice, then Preferences. You only need Workspace to transfer ownership of the workspace to someone else.",
      async act(page, ui) {
        for (const name of ['Business Details', 'Target Reader', 'Brand Voice', 'Preferences']) {
          await ui.point(page.getByRole('heading', { name, exact: true })); await ui.pause(1700);
        }
        await ui.pause(2200);
        await ui.point(page.getByRole('heading', { name: 'Workspace', exact: true })); } },
    { screen: 'Rest the cursor on the panels', caption: 'Complete every field',
      narration: "These settings are blank to begin with. Every field you complete improves every SOP the platform writes for you, and you can come back and change them at any time. Next, we'll start with Business Details.",
      tail: 0.6,
      async act(page, ui) { await ui.moveTo(1100, 330); } },
  ],
};
