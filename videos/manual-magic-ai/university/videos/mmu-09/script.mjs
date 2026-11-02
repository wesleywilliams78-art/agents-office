// MMU-09 · Create an SOP from scratch (guide Section 9). The pilot. Hospitality example, so the same SOP serves Ravi's demo on Wed 4 Nov.
// Selectors come from discover.mjs on the real screen; labels in captions must match the screen exactly.
// Found on 2 Nov 2026: Add SOP on the Dashboard opens the SOP Board (/board); the Create SOP form (/board/create) opens from the + at its top right.
// The Steps and Tags boxes add a new box when the last one is typed in; Enter puts a line break in a tag, so never press it.
// After Create the platform opens the new SOP's page, which shows the account holder's name: go straight to the board instead.
import { SITE } from '../../recorder/lib.mjs';
const OBJECTIVE = 'To open the store safely and on time';

export default {
  file: 'MMU-09 Create an SOP from scratch',
  title: 'Create an SOP from scratch',
  section: 9,
  next: 'Open an SOP: the Overview tab',
  voice: 'Wesley',
  music: { file: 'assets/music/warm-piano-pads-long.wav', gainDb: -24 },   // output/library/music 2026-10-24 (mmvm9knzyra4), three plays crossfaded
  sting: { file: 'assets/sound/whoosh.wav', peak: 1.9, gainDb: -4 },   // assets/sound/whoosh.py; its peak lands on the cut into the platform
  pace: 0.9,          // voice speed, and the cursor, typing and holds slow to match (for viewers whose first language isn't English)
  start: '/',
  async guard(page) {
    if (!/Demo Operations Manual/i.test(await page.locator('body').innerText())) throw new Error('this is not the Demo Operations Manual: stop, never record in a client or live account');
  },
  steps: [
    { screen: 'Dashboard → click **Add SOP** (top right), then **+** (top right of the SOP Board)', caption: 'Click *Add SOP*, then *+*',
      narration: "When a procedure isn't in your uploaded documents, you can create it from scratch. From the Dashboard, click Add SOP, then the plus button at the top right of the SOP Board.",
      lead: 2600,
      async act(page, ui) {
        await ui.click(page.getByRole('link', { name: 'Add SOP', exact: true }));
        await ui.wait(async () => { await page.waitForURL(/\/board$/); await page.waitForLoadState('networkidle'); }, 'SOP Board');
        await ui.pause(700);
        await ui.click(page.locator('div.btn-primary:has(svg.lucide-plus)').first());   // the + is a div, not a button
        await ui.wait(async () => { await page.waitForURL(/\/board\/create/); await page.waitForLoadState('networkidle'); }, 'Create SOP page');
      } },
    { screen: `Type Objective: *${OBJECTIVE}*`, caption: 'Write a short *Objective*',
      narration: "Start with the Objective. It becomes the SOP's title everywhere, so keep it short and say what the SOP achieves.",
      async act(page, ui) { await ui.type(page.locator('input[name="objective"]'), OBJECTIVE); } },
    { screen: 'Type Description (two sentences on the opening routine)', caption: 'Add a short *Description*',
      narration: 'Add a short description of the process.',
      async act(page, ui) { await ui.type(page.locator('textarea#description'), 'How the opening team gets the store ready before the doors open. It covers security, equipment and the opening checklist.', 18); } },
    { screen: 'Category → **Day-to-Day Operating Requirements**', caption: 'Pick one of six *categories*',
      narration: 'Choose which of the six categories it belongs to.',
      async act(page, ui) {
        // a native dropdown's list is not captured on video, so show the real list inline (size=6), pick, and fold it back
        const sel = page.locator('select').first(), label = 'Day-to-Day Operating Requirements';
        await ui.point(sel); await ui.pause(300);
        await sel.evaluate(e => { e.size = e.options.length; e.style.height = 'auto'; });
        await ui.pause(900);
        await ui.click(sel.locator('option', { hasText: label }));
        await sel.selectOption({ label });
        await ui.pause(500);
        await sel.evaluate(e => { e.size = 0; e.style.height = ''; });
      } },
    { screen: 'Steps: *Unlock and disarm the alarm* · *Switch on equipment* · *Run the opening checklist* · *Open the doors*', caption: 'List the main *Steps*',
      narration: 'Type the main steps in order, one per box. Keep them brief. You can build each one out later in the Editor.',
      async act(page, ui) {
        const boxes = page.locator('textarea#steps');
        for (const [k, s] of ['Unlock and disarm the alarm', 'Switch on equipment', 'Run the opening checklist', 'Open the doors'].entries()) await ui.type(boxes.nth(k), s, 34);
      } },
    { screen: 'Tags: *Opening*, *Store team*', caption: 'Add *Tags*',
      narration: 'Add tags, for example by role or routine. They show on the board and in the manual.',
      async act(page, ui) { const boxes = page.locator('textarea#tags'); for (const [k, tag] of ['Opening', 'Store team'].entries()) await ui.type(boxes.nth(k), tag); } },
    { screen: 'Click **Create**, then show the new card in **Draft** on the SOP Board', caption: 'It starts as a *Draft*',
      narration: "Click Create. Your new SOP appears on the SOP Board as a Draft, ready to build out. Next, we'll open it.",
      tail: 0.6,
      async act(page, ui) {
        const create = page.getByRole('button', { name: 'Create', exact: true });
        if (ui.rehearse && !ui.reuse) { await ui.commit(create); return; }
        // --reuse: the SOP was made by an earlier take, so show the click without making a second copy
        if (ui.reuse) await ui.mimic(create); else { await ui.click(create); }
        await ui.wait(async () => { if (!ui.reuse) await page.waitForURL(/\/sop\//, { timeout: 20000 }); await page.goto(SITE + '/board', { waitUntil: 'networkidle' }); await ui.reapply(); }, 'to the SOP Board', 0.2);
        await ui.pause(600);
        await ui.point(page.getByText(OBJECTIVE).locator('visible=true').last());
      } },
  ],
};
