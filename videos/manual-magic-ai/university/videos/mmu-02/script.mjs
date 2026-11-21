// MMU-02 · Find your way around the Dashboard (guide Section 2). Read-only: nothing is clicked or saved, so there is no ui.commit.
// Selectors come from discover.mjs on the real Dashboard (7 Nov 2026); captions use the screen's own labels.
// Nothing here shows the account holder's name or email. The login step is described, never filmed.
// The six left-hand icons have no labels or hrefs in discover, so they are pointed at by position (1920×988 frame, x = 35).
import { SITE } from '../../recorder/lib.mjs';

const ICONS = [110, 182, 252, 327, 405, 487];   // y of the Dashboard, Upload IP, SOP Board, Ask Your Wizard, team and Settings icons

export default {
  file: 'MMU-02 Find your way around the Dashboard',
  title: 'Find your way around the Dashboard',
  section: 2,
  next: 'Set up the platform so it knows your business',
  voice: 'Wesley',
  music: { file: 'assets/music/warm-piano-pads-long.wav', gainDb: -24 },
  sting: { file: 'assets/sound/whoosh.wav', peak: 1.9, gainDb: -4 },
  pace: 0.9,
  start: '/',
  async guard(page) {
    if (!/Demo Operations Manual/i.test(await page.locator('body').innerText())) throw new Error('this is not the Demo Operations Manual: stop, never record in a client or live account');
  },
  steps: [
    { screen: 'Dashboard → point at the manual name, top left (*Demo Operations Manual*)', caption: 'Your *Dashboard*',
      narration: "Once you've logged in, you arrive on the Dashboard. It's your home page, and it shows how far you've come and what to do next. At the top left is the name of your manual.",
      lead: 2600,
      async act(page, ui) { await ui.point(page.locator('#manual-select')); } },
    { screen: 'Point at **Manual Health**, then **Coverage**', caption: '*Manual Health* and *Coverage*',
      narration: "Manual Health is a score for your manual. Coverage shows how much of the manual's structure has content. Both appear once you've uploaded your IP.",
      async act(page, ui) {
        await ui.point(page.getByRole('heading', { name: 'Manual Health' })); await ui.pause(2600);
        await ui.point(page.getByText(/^Coverage:/)); } },
    { screen: 'Point at the three links under **Improve SOP generation**', caption: '*Improve SOP generation*',
      narration: "Improve SOP generation has three quick links: Provide details about your business, Define your target reader, and Configure your brand voice. We'll look at each of these later in the series.",
      async act(page, ui) {
        await ui.point(page.getByRole('heading', { name: 'Improve SOP generation' })); await ui.pause(2200);
        await ui.point(page.getByRole('link', { name: 'Provide details about your business' })); await ui.pause(2600);
        await ui.point(page.getByRole('link', { name: 'Define your target reader' })); await ui.pause(1800);
        await ui.point(page.getByRole('link', { name: 'Configure your brand voice' })); } },
    { screen: 'Point at the **Progress** panels (one per category), then the Draft / Review / Approved line', caption: '*Progress*, one panel per category',
      narration: "Progress has one panel for each category. Each shows a percentage complete, and how many SOPs are at Draft, Review and Approved.",
      async act(page, ui) {
        await ui.point(page.getByRole('heading', { name: 'Progress' })); await ui.pause(2400);
        await ui.point(page.getByRole('link', { name: /^Day-to-Day Operating Requirements/ })); await ui.pause(2600);
        await ui.point(page.getByText(/^Draft 6 • Review 0 • Approved 2 \/ 14/)); } },
    { screen: 'Point at **Team**, then **Manage team**', caption: '*Team* and *Manage team*',
      narration: "Team shows how many Admin and Reader seats you've used. Click Manage team to add people.",
      async act(page, ui) {
        await ui.point(page.getByRole('heading', { name: 'Team', exact: true })); await ui.pause(2600);
        await ui.point(page.getByRole('link', { name: 'Manage team' })); } },
    { screen: 'Point at **Consultancy Services**, then **Learning Resources**', caption: '*Consultancy Services* and *Learning Resources*',
      narration: "Consultancy Services offers hands-on help from Manual Writers International. Learning Resources has the Frequently Asked Questions and blog articles.",
      async act(page, ui) {
        await ui.point(page.getByRole('heading', { name: 'Consultancy Services' })); await ui.pause(3200);
        await ui.point(page.getByRole('heading', { name: 'Learning Resources' })); await ui.pause(1500);
        await ui.point(page.getByRole('link', { name: 'Frequently Asked Questions' })); } },
    { screen: 'Point along the top right: **Upload IP**, **Add SOP**, **Ask Wizard**, **BOARD**', caption: 'Your shortcuts, *top right*',
      narration: "At the top right are your shortcuts: Upload IP, Add SOP, Ask Wizard, and BOARD, which opens the SOP Board.",
      async act(page, ui) {
        await ui.point(page.getByRole('link', { name: 'Upload IP' })); await ui.pause(1500);
        await ui.point(page.getByRole('link', { name: 'Add SOP' })); await ui.pause(1100);
        await ui.point(page.getByRole('link', { name: 'Ask Wizard' })); await ui.pause(1100);
        await ui.point(page.getByRole('link', { name: 'BOARD' })); } },
    { screen: 'Point down the six icons in the left-hand menu: Dashboard, Upload IP (cloud), SOP Board, Ask Your Wizard (hat), team (people), Settings (cog)', caption: 'Six *icons* down the left',
      narration: "The icons down the left have no labels. From the top: the Dashboard, Upload IP, the SOP Board, Ask Your Wizard, your team, and Settings.",
      async act(page, ui) { for (const y of ICONS) { await ui.moveTo(35, y); await ui.pause(1300); } } },
    { screen: 'Point at **MANUAL** in the dark bar, then the top icon', caption: 'Click *MANUAL* to open your manual',
      narration: "To open your Operations Manual, click MANUAL in the dark bar at the top. And if you ever get lost, click the top icon on the left to come back here. Next, we'll set up the platform so it knows your business.",
      tail: 0.6,
      async act(page, ui) {
        await ui.point(page.getByText('MANUAL', { exact: true }).first()); await ui.pause(3800);
        await ui.moveTo(35, ICONS[0]); } },
  ],
};
