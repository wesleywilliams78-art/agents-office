// Original Nuttah (Wesley, 7 Nov 2026): every 20th finished task plays UK Apache with Shy FX, "Original Nuttah", from 0:34 ("Bad boys in a London")
// on this PC's speakers, to the end of the track. The file is Wesley's own copy (output/music, which lives on D:); no file, no sound.
// Finished means done and not failed or rejected; each task counts once (an approved email is done twice: on the tick and after its send run).
// The count lives in data/nuttah.json; the first call starts it from the tasks already finished, so it plays on the office's 20th, 40th, 60th…
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

export const EVERY = 20, FROM_SECONDS = 34;

export function finished(dataDir, rootDir, task, allTasks = []) {
  if (!task || !task.id || task.state !== 'done' || task.error || task.closed) return null;
  const file = path.join(dataDir, 'nuttah.json');
  let st = null; try { st = JSON.parse(fs.readFileSync(file, 'utf8')); } catch {}
  if (!st) { const done = allTasks.filter(t => t.state === 'done' && !t.error && !t.closed && t.id !== task.id); st = { count: done.length, seen: done.map(t => t.id) }; }
  if (st.seen.includes(task.id)) return null;
  st.count++; st.seen = [...st.seen, task.id].slice(-500);
  const hit = st.count % EVERY === 0;
  if (hit) st.lastPlayedAt = Date.now();
  fs.writeFileSync(file, JSON.stringify(st, null, 1));
  if (hit) console.log(`🔊 task ${st.count} finished: Original Nuttah from 0:${FROM_SECONDS} (${play(rootDir) ? 'playing' : 'no track at output/music/original-nuttah.mp3'})`);
  return { count: st.count, played: hit };
}

export function play(rootDir) {
  const track = path.join(rootDir, 'output', 'music', 'original-nuttah.mp3');
  if (!fs.existsSync(track)) return false;
  const ps = `Add-Type -AssemblyName PresentationCore
$p = New-Object System.Windows.Media.MediaPlayer
$p.Open([Uri]'${track.replace(/'/g, "''")}')
$p.Volume = 1
$p.Play()
Start-Sleep -Milliseconds 400
$p.Position = [TimeSpan]::FromSeconds(${FROM_SECONDS})
$end = (Get-Date).AddMinutes(5)
while ((Get-Date) -lt $end -and (-not $p.NaturalDuration.HasTimeSpan -or $p.Position -lt $p.NaturalDuration.TimeSpan)) { Start-Sleep -Milliseconds 500 }
$p.Close()`;
  const enc = Buffer.from(ps, 'utf16le').toString('base64');
  spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-EncodedCommand', enc], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
  return true;
}
