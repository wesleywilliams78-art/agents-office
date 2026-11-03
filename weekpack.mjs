// "Content Calendar": the folder Wesley posts from. One folder per week, a SCHEDULE.md that says what goes out when and where, and each
// item filed under its day, ready to paste or post: LinkedIn text as a note, a Reel or carousel as a folder with the video or slides and a
// caption. The office never posts: Wesley opens the folder at the right time and does it himself.
//   sync(root, brain)           folders and a SCHEDULE for every week in 20-Brand/content-calendar.md (a stub where nothing is drafted yet)
//   fromResult(root, brain, t)  the Lead's finished package (a CONTENT PACKAGE block) filed into the week folder
//   strip(text)                 the result without the machine-readable block, for the review card
import fs from 'node:fs';
import path from 'node:path';

export const FOLDER = 'Content Calendar';
const MON = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
const DOW = { mon: 0, tue: 1, wed: 2, thu: 3, fri: 4, sat: 5, sun: 6 };
const DOWN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], MONN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = n => String(n).padStart(2, '0');
const iso = d => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const addDays = (d, n) => new Date(d.getTime() + n * 86400000);
const safe = s => String(s).replace(/[<>:"/\\|?*\x00-\x1f]/g, '').replace(/\s+/g, ' ').trim().slice(0, 70);
const exists = p => { try { return !!p && fs.existsSync(p); } catch { return false; } };
const clean = t => String(t).replace(/^﻿/, '');

export const weekName = monday => `${iso(monday)} Week of ${monday.getUTCDate()} ${MONN[monday.getUTCMonth()]}`;
const dayName = d => `${DOWN[(d.getUTCDay() + 6) % 7]} ${pad(d.getUTCDate())} ${MONN[d.getUTCMonth()]}`;

/** A calendar row's day text ("Tue 3 Nov") in a given week → the date, or null. */
function dateOf(monday, dayText) { const m = /^(mon|tue|wed|thu|fri|sat|sun)/i.exec(String(dayText || '').trim()); return m ? addDays(monday, DOW[m[1].toLowerCase()]) : null; }
const hhmm = t => { const m = /(\d{1,2}):(\d{2})/.exec(String(t || '')); return m ? pad(+m[1]) + pad(+m[2]) : ''; };
const where = (account, channel) => { const s = `${account} ${channel}`.toLowerCase(); return /tales of nirn/.test(s) ? 'Tales of Nirn' : /art of operations/.test(s) && /instagram/.test(s) ? 'Art of Operations' : /newsletter|scaling/.test(s) ? 'Newsletter' : /collab/.test(s) && /linkedin/.test(s) ? 'Collab LinkedIn' : /personal|wesley/.test(s) && /linkedin/.test(s) ? 'Wesley LinkedIn' : /linkedin/.test(s) ? 'WRW page LinkedIn' : /instagram/.test(s) ? 'Instagram' : safe(channel || account || 'Post'); };
const labelOf = it => safe(`${hhmm(it.time) ? hhmm(it.time) + ' ' : ''}${where(it.account, it.channel)} ${it.format || ''}`);

/** The weeks in the calendar note: [{ monday, core, rows: [{ day, time, account, channel, format, idea, owner, status, files }] }]. */
export function parseWeeks(md) {
  const out = []; let cur = null;
  for (const l of String(md).split(/\r?\n/)) {
    const h = /^##\s+Week of\s+(?:\w{3}\s+)?(\d{1,2})\s+([A-Za-z]{3})[a-z]*\s+(\d{4})/.exec(l);
    if (h) { cur = { monday: new Date(Date.UTC(+h[3], MON[h[2].toLowerCase()], +h[1])), core: '', rows: [], heads: null }; out.push(cur); continue; }
    if (/^##\s/.test(l)) { cur = null; continue; }
    if (!cur) continue;
    const c = /^Core idea[^:]*:\s*(.+)$/i.exec(l); if (c) { cur.core = c[1].trim(); continue; }
    if (!l.startsWith('|')) continue;
    const cells = l.split('|').slice(1, -1).map(s => s.trim()); if (!cells.length || /^[-: ]+$/.test(cells.join(''))) continue;
    if (/^day$/i.test(cells[0])) { cur.heads = cells.map(x => x.toLowerCase()); continue; }
    if (!cur.heads) continue;
    const o = {}; cur.heads.forEach((k, i) => { o[k] = cells[i] || ''; });
    if (!dateOf(cur.monday, o.day)) continue;
    cur.rows.push({ day: o.day, time: o.time, account: o.account || o.brand || '', channel: o.channel || '', format: o.format || '', idea: o['idea / angle'] || o.idea || '', owner: o.owner || '', status: (o.status || '').toLowerCase(), files: o.files || '' });
  }
  return out.filter(w => w.rows.length);
}

const link = (src, dst) => { try { fs.mkdirSync(path.dirname(dst), { recursive: true }); if (exists(dst)) fs.rmSync(dst, { force: true }); fs.linkSync(src, dst); return true; } catch { try { fs.copyFileSync(src, dst); return true; } catch { return false; } } };
const write = (p, t) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, t, 'utf8'); };

function status(it) { return /needs/.test(it.status) ? 'needs you' : /built|drafted/.test(it.status) ? it.status : /planned/.test(it.status) ? 'planned, not drafted yet' : it.status || 'planned'; }

/** Write one item (from the Lead's package) into its day folder. Returns the path relative to the week folder. */
function writeItem(weekDir, monday, it) {
  const d = dateOf(monday, it.day); if (!d) return null;
  const dayDir = path.join(weekDir, dayName(d)), label = labelOf(it), files = (it.files || []).filter(exists), body = (it.text || '').trim(), cap = [(it.caption || '').trim(), (it.hashtags || '').trim()].filter(Boolean).join('\n\n');
  const head = `# ${where(it.account, it.channel)}: ${it.format || ''}\n${dayName(d)}${it.time ? ', ' + it.time : ''}${/assumed/i.test(it.time || '') ? ' (time assumed)' : ''}\nAccount: ${it.account || ''}   Status: ${status(it)}\n\n`;
  const stub = path.join(dayDir, label + '.md');
  if (files.length) {
    const dir = path.join(dayDir, label); fs.rmSync(stub, { force: true });
    let n = 0; for (const f of files) { const ext = path.extname(f).toLowerCase(); n += /\.(png|jpe?g)$/.test(ext) ? 1 : 0; link(f, path.join(dir, /\.(mp4|mov|webm)$/.test(ext) ? 'video' + ext : /\.(png|jpe?g)$/.test(ext) ? `slide-${pad(n)}${ext}` : path.basename(f))); }
    write(path.join(dir, 'POST THIS.md'), head + (cap ? `## Caption and hashtags (paste as is)\n\n${cap}\n\n` : '') + (body ? `## Text\n\n${body}\n\n` : '') + (it.notes ? `## Notes\n\n${it.notes}\n` : ''));
    if (cap) write(path.join(dir, 'caption.txt'), cap + '\n');
    return path.relative(weekDir, dir);
  }
  write(stub, head + (/needs/.test(it.status) ? `**NEEDS YOU:** ${it.notes || it.idea || 'see the schedule'}\n\n` : '') + (body ? `## Post (paste as is)\n\n${body}\n\n` : '') + (cap && !body ? `## Caption\n\n${cap}\n\n` : '') + (it.notes && !/needs/.test(it.status) ? `## Notes\n\n${it.notes}\n` : ''));
  return path.relative(weekDir, stub);
}

/** SCHEDULE.md for a week: the one page to post from. `items` are calendar rows or package items; `rels` maps an item to its file. */
function writeSchedule(weekDir, week, items, rels, drafted) {
  const sorted = items.map((it, i) => ({ it, i, d: dateOf(week.monday, it.day) })).filter(x => x.d).sort((a, b) => a.d - b.d || hhmm(a.it.time).localeCompare(hhmm(b.it.time)) || a.i - b.i);
  const rows = sorted.map(({ it, i, d }) => { const rel = rels.get(i); return `| ☐ | ${dayName(d)} | ${(it.time || 'any').replace(/\s*\(assumed\)/, '*')} | ${where(it.account, it.channel)} | ${(it.format || '').replace(/\|/g, '/')} | ${String(it.idea || it.text || '').replace(/\s+/g, ' ').slice(0, 90).replace(/\|/g, '/')} | ${status(it)} | ${rel ? `[open](${encodeURI(rel.replace(/\\/g, '/'))})` : ''} |`; });
  write(path.join(weekDir, 'SCHEDULE.md'), `# Week of ${week.monday.getUTCDate()} ${MONN[week.monday.getUTCMonth()]} ${week.monday.getUTCFullYear()}\n\n${week.core ? `**Core idea (WRW Hospitality):** ${week.core}\n\n` : ''}Work from this page: open the item, copy or upload it, post it yourself, then tick the box. The office never posts. A * after a time means the time was assumed.${drafted ? '' : '\n\n**Nothing is drafted yet:** the build runs on Tuesday and fills these in.'}\n\n| Done | Day | Time | Where | Format | What | Status | Open |\n|---|---|---|---|---|---|---|---|\n${rows.join('\n')}\n`);
}

/** Folders and a SCHEDULE for every week in the calendar note. A stub where nothing is drafted; real content already filed is kept. */
export function sync(root, brain) {
  let md; try { md = clean(fs.readFileSync(path.join(brain, '20-Brand', 'content-calendar.md'), 'utf8')); } catch { return { weeks: 0 }; }
  const base = path.join(root, FOLDER), weeks = parseWeeks(md); fs.mkdirSync(base, { recursive: true });
  if (!exists(path.join(base, 'README.md'))) write(path.join(base, 'README.md'), `# Content Calendar\n\nOne folder per week. Open the week, read SCHEDULE.md, and post from the day folders: the office never posts for you.\n\n- \`SCHEDULE.md\`: what goes out when and where, with a tick box for each.\n- A day folder per day. A LinkedIn post is a note you paste from. A Reel or carousel is a folder with the video or slides, a caption.txt and POST THIS.md.\n- The plan comes from \`20-Brand/content-calendar.md\` in the Brain (Monday); the drafts and files arrive on Tuesday.\n`);
  for (const w of weeks) {
    const weekDir = path.join(base, weekName(w.monday)), rels = new Map(); let drafted = 0;
    w.rows.forEach((it, i) => {
      const d = dateOf(w.monday, it.day), dayDir = path.join(weekDir, dayName(d)), label = labelOf(it), folder = path.join(dayDir, label), stub = path.join(dayDir, label + '.md');
      if (exists(folder)) { rels.set(i, path.relative(weekDir, folder)); drafted++; return; }
      if (!exists(stub)) write(stub, `# ${where(it.account, it.channel)}: ${it.format}\n${dayName(d)}${it.time ? ', ' + it.time : ''}\nAccount: ${it.account}   Status: ${status(it)}\n\n**Planned idea:** ${it.idea}\n\n${/needs/.test(it.status) ? '**NEEDS YOU:** see the schedule.\n\n' : ''}Not drafted yet. The Tuesday build writes it here.\n`);
      else if (!/Not drafted yet/.test(fs.readFileSync(stub, 'utf8'))) drafted++;
      rels.set(i, path.relative(weekDir, stub));
    });
    writeSchedule(weekDir, w, w.rows, rels, drafted > 0);
  }
  return { weeks: weeks.length };
}

const BLOCK = /CONTENT PACKAGE[ \t]*\r?\n[ \t]*week:\s*(\d{4}-\d{2}-\d{2})[ \t]*\r?\n---[ \t]*\r?\n([\s\S]*?)\r?\n[ \t]*END CONTENT PACKAGE/;
export const strip = text => String(text || '').replace(new RegExp(BLOCK.source, 'g'), '').replace(/\n{3,}/g, '\n\n').trim();

/** File the Lead's finished package into the week folder. */
export function fromResult(root, brain, text) {
  const m = BLOCK.exec(String(text || '')); if (!m) return { filed: 0, reason: 'no package block' };
  let items; try { items = JSON.parse(m[2]); } catch (e) { return { filed: 0, reason: 'the package block was not valid JSON: ' + e.message }; }
  if (!Array.isArray(items) || !items.length) return { filed: 0, reason: 'the package block was empty' };
  const [y, mo, d] = m[1].split('-').map(Number), monday = new Date(Date.UTC(y, mo - 1, d)), weekDir = path.join(root, FOLDER, weekName(monday)), rels = new Map(); let filed = 0;
  let core = ''; try { const w = parseWeeks(clean(fs.readFileSync(path.join(brain, '20-Brand', 'content-calendar.md'), 'utf8'))).find(x => iso(x.monday) === m[1]); core = w?.core || ''; } catch {}
  items.forEach((it, i) => { const rel = writeItem(weekDir, monday, it); if (rel) { rels.set(i, rel); filed++; } });
  writeSchedule(weekDir, { monday, core }, items, rels, true);
  return { filed, dir: weekDir };
}
export const dayDirName = dayName; // for the calendar page: the folder a day's posts are filed in
/** Every planned or built post in the calendar note, flat, for the calendar's SOCIAL view: [{ date: 'YYYY-MM-DD', time: 'HH:MM'|'', timeAssumed, where, account, channel, format, idea, owner, status, core, folder }]. */
export function posts(root, brain) {
  let md; try { md = clean(fs.readFileSync(path.join(brain, '20-Brand', 'content-calendar.md'), 'utf8')); } catch { return []; }
  const out = [];
  for (const w of parseWeeks(md)) {
    const weekDir = path.join(root, FOLDER, weekName(w.monday));
    for (const it of w.rows) {
      const d = dateOf(w.monday, it.day); if (!d) continue;
      const tm = /(\d{1,2}):(\d{2})/.exec(it.time || ''), dayDir = path.join(weekDir, dayName(d)), label = labelOf(it);
      const folder = [path.join(dayDir, label), path.join(dayDir, label + '.md'), dayDir].find(exists) || '';
      out.push({ date: iso(d), time: tm ? `${pad(+tm[1])}:${tm[2]}` : '', timeAssumed: /assumed/i.test(it.time || ''), where: where(it.account, it.channel), account: it.account, channel: it.channel, format: it.format, idea: it.idea, owner: it.owner, status: status(it), files: it.files, core: w.core, folder });
    }
  }
  return out.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
}
