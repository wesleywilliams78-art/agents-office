// Art of Operations reels, after the studio has built one: the reel goes to Wesley on Telegram when it waits for his review,
// and only when he approves is it filed as "Art of Operations - Reel N.mp4" (his Desktop folder and videos/art-of-operations/delivered).
// An existing file is never overwritten: a revision gets a new version name.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as notify from './notify.mjs';

export const isAooReel = task => /art of operations/i.test(task?.text || '') && /\b(reels?|clips?)\b/i.test(task?.text || '');

/** The newest finished studio MP4 named in the text. */
export function reelFile(root, text) {
  const out = path.join(root, 'output', 'video').toLowerCase();
  const found = [...String(text || '').matchAll(/[A-Za-z]:[\\/][^\s"'`<>|*?]*?\.mp4/gi)].map(m => path.normalize(m[0])).filter(f => f.toLowerCase().startsWith(out) && fs.existsSync(f));
  if (found.length) return found[found.length - 1];
  // a reel built in the background is named by its studio job id ("job xmv..."): its file is on the job once it is done
  for (const m of [...String(text || '').matchAll(/\bjob\s*(?:id)?[:\s`]*(x[a-z0-9]{6,})/gi)].reverse()) {
    try { const j = JSON.parse(fs.readFileSync(path.join(root, 'data', 'video', 'jobs', m[1] + '.json'), 'utf8')); if (j.state === 'done' && j.file && fs.existsSync(j.file)) return j.file; } catch {}
  }
  return null;
}
export const reelNumber = task => { const m = /\breel\s*(?:no\.?\s*)?(\d{1,2})\b/i.exec(`${task?.text || ''} ${task?.title || ''}`); return m ? +m[1] : null; };

/** Wesley reads on his phone: send the video with the line and how to approve. */
export async function sendForApproval(root, task, result) {
  const f = reelFile(root, result); if (!f) return { sent: false, reason: 'no finished reel file in the result' };
  const n = reelNumber(task), r = await notify.telegramVideo(f, `Art of Operations${n ? ' - Reel ' + n : ''}: ${task.title || ''}\nApprove or send changes in the office (it waits on your review). Not filed until you approve.`.slice(0, 900));
  return { sent: r.ok, reason: r.reason, file: f };
}

/** On approval: copy to the delivered folder and the Desktop folder, never over an existing file. */
export function fileApproved(root, task, result, desktop = path.join(os.homedir(), 'Desktop', 'Art of Operations')) {
  const f = reelFile(root, result), n = reelNumber(task);
  if (!f) return { filed: 0, reason: 'no finished reel file found in the result' };
  if (!n) return { filed: 0, reason: 'no reel number in the request, so the file name is unknown' };
  const dirs = [path.join(root, 'videos', 'art-of-operations', 'delivered'), desktop], done = [];
  for (const d of dirs) {
    try {
      fs.mkdirSync(d, { recursive: true });
      let name = `Art of Operations - Reel ${n}.mp4`, v = 2;
      while (fs.existsSync(path.join(d, name))) name = `Art of Operations - Reel ${n} v${v++}.mp4`;
      fs.copyFileSync(f, path.join(d, name)); done.push(path.join(d, name));
    } catch (e) { done.push('not copied to ' + d + ': ' + e.message); }
  }
  return { filed: done.filter(x => !x.startsWith('not copied')).length, files: done };
}
