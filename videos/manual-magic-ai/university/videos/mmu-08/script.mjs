// MMU-08 · Upload your IP (guide Section 8). READ-ONLY, Wesley's yes 8 Nov 2026. Read-only, so the first take is the finished video (Wesley, 8 Nov 2026).
// Nothing is uploaded, chosen, typed, dragged or saved. The video never clicks "Browse files", the drop zone or the hidden file input:
// it only moves the cursor over them. The only clicks are the Upload IP link (navigation) and the first left-hand icon (back to the Dashboard).
// ANALYSING and READY are narrated only; they are never on screen. There is no commit step.
// Checks of 8 Nov (work/discover/MMU-08-checks.md): no "Upload your IP" tile exists; the cloud icon also goes to /upload;
// the breadcrumb is not a link, so the way back to the Dashboard is the first icon in the left-hand menu.
import { SITE } from '../../recorder/lib.mjs';

// aim at a phrase inside a text element (mouse move only), so a wide box is pointed at where the words are
const aimAt = async (ui, page, phrase) => {
  const at = await page.evaluate(p => {
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n;
    while (n = w.nextNode()) { const i = n.textContent.indexOf(p); if (i < 0) continue; const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + p.length); const b = r.getBoundingClientRect(); if (b.width) return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; }
    return null;
  }, phrase);
  if (!at) throw new Error('text not on screen: ' + phrase);
  await ui.moveTo(Math.round(at.x), Math.round(at.y));
};

export default {
  file: 'MMU-08 Upload your IP',
  title: 'Upload your IP',
  section: 8,
  next: 'Create an SOP from scratch',
  voice: 'Wesley',
  music: { file: 'assets/music/warm-piano-pads-long.wav', gainDb: -24 },
  sting: { file: 'assets/sound/whoosh.wav', peak: 1.9, gainDb: -4 },
  pace: 0.9,
  start: '/',
  async guard(page) {
    if (!/Demo Operations Manual/i.test(await page.locator('body').innerText())) throw new Error('this is not the Demo Operations Manual: stop, never record in a client or live account');
  },
  steps: [
    { screen: 'Dashboard → point at the **Upload IP** link, top right (not clicked)', caption: 'Your IP is the *first step*',
      narration: "Uploading your IP is the most important step. The platform reads your documents and turns them into draft SOPs.",
      lead: 1200, tail: -0.8,
      // the Dashboard is held while the narration plays: the cursor rests on the Upload IP link, then glides to the cloud icon in the left menu. Neither is clicked here.
      async act(page, ui) {
        await ui.point(page.getByRole('link', { name: 'Upload IP', exact: true })); await ui.pause(2600);
        await ui.point(page.locator('svg.expand-btn').nth(1)); } },
    { screen: 'Click **Upload IP**; breadcrumb Demo Operations Manual > Upload IP', caption: 'Open *Upload IP*',
      narration: "On the Dashboard, click Upload IP, at the top right.",
      lead: 150,
      async act(page, ui) {
        await ui.click(page.getByRole('link', { name: 'Upload IP', exact: true }));
        await ui.wait(async () => { await page.waitForURL(/\/upload$/); await page.waitForLoadState('networkidle'); }, 'Upload IP', 0.2);
        await ui.pause(500);
      } },
    { screen: 'Point at the drop zone: **Drag & drop files here** and **Browse files** (nothing clicked)', caption: '*Drag & drop* files here',
      narration: "Drag your files into the box, or click Browse files and choose them from your computer.",
      async act(page, ui) {
        await aimAt(ui, page, 'Drag & drop files here'); await ui.pause(2200);
        await aimAt(ui, page, 'Browse files');
      } },
    { screen: 'Point at the small print **PDF, DOCX, TXT, MD · up to 100MB each**', caption: '*PDF, DOCX, TXT, MD*',
      narration: "You can upload PDF, DOCX, TXT or MD files, up to one hundred megabytes each.",
      async act(page, ui) { await aimAt(ui, page, 'PDF, DOCX, TXT, MD · up to 100MB each'); } },
    { screen: 'Help box → point at **Max 200 files per batch**', caption: 'Up to *200 files* at once',
      narration: "Select many at once, up to two hundred files in a batch.",
      async act(page, ui) { await aimAt(ui, page, 'Max 200 files per batch'); } },
    { screen: 'Point at **Browse files** in the drop zone (not clicked)', caption: '*Browse files*',
      narration: "A restaurant might start with its Opening and Closing Checks document.",
      async act(page, ui) { await aimAt(ui, page, 'Browse files'); } },
    { screen: 'Help box → point at **Upload your files and they will start processing automatically**', caption: '*Processing* starts automatically',
      narration: "There is no Upload button. Your files start processing as soon as you choose them. Each file shows ANALYSING while the platform reads it, then READY when it is done.",
      async act(page, ui) { await aimAt(ui, page, 'Upload your files and they will start processing automatically'); } },
    { screen: 'Click the **first icon** in the left-hand menu (back to the Dashboard); point at **Progress**, **Manual Health** and **Coverage**', caption: 'Back to the *Dashboard*',
      narration: "Then return to the Dashboard. Here you can see Progress, Manual Health and Coverage. After each upload, check Coverage. If it does not move, the document may repeat content you already have. Next, we'll create an SOP from scratch.",
      tail: 0.6,
      async act(page, ui) {
        await ui.click(page.locator('svg.expand-btn').first());
        await ui.wait(async () => { await page.waitForURL(u => new URL(u).pathname === '/'); await page.waitForLoadState('networkidle'); }, 'Dashboard', 0.2);
        await ui.pause(600);
        await ui.point(page.getByRole('heading', { name: 'Progress' })); await ui.pause(2600);
        await ui.point(page.getByRole('heading', { name: 'Manual Health' })); await ui.pause(2400);
        await ui.point(page.getByText(/^Coverage:/)); } },
  ],
};
