// Google reviews → a client's Reviews page on the AIOS (V3.13, 3 Nov 2026). No model is involved.
// The source is a Google Takeout of the Business Profile (takeout.google.com → Google Business Profile): one folder per location,
// its listing name in additionalData.json and its reviews in reviews*.json. Only locations whose listing name matches a dashboard's
// `match` are filed, as data/reviews/<slug>.json, and no reviewer names are kept. A later Takeout merges by review id, so the history
// never shrinks. Takeout zips in this PC's Downloads are picked up on their own, once each; `node reviews.mjs <zip or folder>` files one by hand.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import JSZip from 'jszip';

export const dir = dataDir => path.join(dataDir, 'reviews');
const STARS = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };
const slug = s => String(s).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const listingName = j => { for (const a of (j && j.attributes) || []) if (a.id && a.id.attributeType === 'LISTING_NAME') return a.values?.[0]?.datum?.listingName?.text || null; return null; };
// Google puts its translation first and the original after "(Original)": keep the English
const english = s => { s = String(s || ''); return /\(Translated by Google\)/.test(s) ? s.split(/\(Original\)/)[0].replace(/\(Translated by Google\)/, '').trim() : s.trim(); };
const tidy = r => ({ id: String(r.name || '').split('/').pop(), at: r.createTime, stars: STARS[r.starRating] || 0, text: r.comment ? english(r.comment) : '',
  reply: r.reviewReply ? { text: english(r.reviewReply.comment), at: r.reviewReply.updateTime } : null });

// files: [{ path, text }] from one Takeout, any order. Returns what was filed per location.
export function fileTakeout(dataDir, files, matches) {
  const locs = new Map();
  for (const f of files) {
    const m = /location-(\d+)\/([^/]+)$/.exec(f.path.replace(/\\/g, '/')); if (!m) continue;
    const L = locs.get(m[1]) || { name: null, reviews: [] }; locs.set(m[1], L);
    let j; try { j = JSON.parse(f.text); } catch { continue; }
    if (m[2] === 'additionalData.json') L.name = listingName(j);
    else if (/^reviews.*\.json$/.test(m[2]) && Array.isArray(j.reviews)) L.reviews.push(...j.reviews);
  }
  const out = [];
  for (const [locId, L] of locs) {
    if (!L.name || !L.reviews.length || !matches.some(x => L.name.toLowerCase().includes(String(x).toLowerCase()))) continue;
    fs.mkdirSync(dir(dataDir), { recursive: true });
    const file = path.join(dir(dataDir), slug(L.name) + '.json');
    let prev = null; try { prev = JSON.parse(fs.readFileSync(file, 'utf8')); } catch {}
    const byId = new Map((prev ? prev.reviews : []).map(r => [r.id, r])), before = byId.size;
    for (const r of L.reviews) { const t = tidy(r); if (t.id && t.at && t.stars) byId.set(t.id, t); }
    const reviews = [...byId.values()].sort((a, b) => a.at.localeCompare(b.at));
    fs.writeFileSync(file, JSON.stringify({ location: L.name, locationId: locId, source: 'Google Business Profile, Takeout export', filedAt: new Date().toISOString(), reviews }, null, 1));
    out.push({ location: L.name, file: path.basename(file), total: reviews.length, added: reviews.length - before });
  }
  return out;
}
// a Takeout zip or an unpacked Takeout folder. Only the Business Profile's JSON is read; the photos and videos are skipped.
export async function importTakeout(dataDir, src, matches) {
  const files = [], want = p => /Google Business Profile\/.*location-\d+\/(additionalData|reviews[^/]*)\.json$/.test(p.replace(/\\/g, '/'));
  if (fs.statSync(src).isDirectory()) {
    const walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (want(p)) files.push({ path: p, text: fs.readFileSync(p, 'utf8') }); } };
    walk(src);
  } else {
    const zip = await JSZip.loadAsync(fs.readFileSync(src));
    for (const e of Object.values(zip.files)) if (!e.dir && want(e.name)) files.push({ path: e.name, text: await e.async('string') });
  }
  return fileTakeout(dataDir, files, matches);
}
// Takeout zips in Downloads, each read once (a newer copy of the same name is read again)
export async function importDownloads(dataDir, matches, from = path.join(os.homedir(), 'Downloads')) {
  let names = []; try { names = fs.readdirSync(from).filter(f => /^takeout-.*\.zip$/i.test(f)); } catch { return []; }
  const seenFile = path.join(dir(dataDir), 'seen.json'); let seen = {}; try { seen = JSON.parse(fs.readFileSync(seenFile, 'utf8')); } catch {}
  const out = [];
  for (const f of names) {
    const p = path.join(from, f), st = fs.statSync(p), mt = st.mtimeMs; if (seen[f] === mt) continue;
    if (st.size > 1.5 * 1024 ** 3) console.warn(`reviews: ${f} is over 1.5 GB, so it is not read; export the Business Profile on its own, or run node reviews.mjs on the unpacked folder`);
    else try { out.push(...await importTakeout(dataDir, p, matches)); } catch (e) { console.warn(`reviews: ${f}: ${e.message}`); }
    seen[f] = mt; fs.mkdirSync(dir(dataDir), { recursive: true }); fs.writeFileSync(seenFile, JSON.stringify(seen, null, 1));
  }
  return out;
}

// what the reviews talk about. A review counts once per theme however many words match.
export const THEMES = [
  ['taste', 'Taste and quality', /\btast|delicious|flavou?r|quality|bland|horrible|disgusting|awful|yummy|lovely food|beautiful food/i],
  ['fresh', 'Freshness and food safety', /\bfresh|stale|\bcold\b|undercook|\braw\b|smel|\boff\b|\bsick|vomit|\bill\b|food poison|\bhair\b|burnt|\bdry\b|\bold\b|greasy|oily/i],
  ['service', 'Staff and service', /staff|service|friendly|\brude|polite|helpful|welcom|attitude|manager|served|hospitality/i],
  ['wait', 'Waiting time', /\bwait|minutes|\bmins?\b|\bslow|\bquick|\bfast\b|took ages|\bhour\b|\blate\b/i],
  ['accuracy', 'Order accuracy', /missing|\bwrong|forg[eo]t|didn.?t get|\bno (sauce|salad|fork|drink|chips|dip)|incorrect|mix(ed)? ?up|left out/i],
  ['value', 'Portions and price', /portion|\bprice|expensive|\bvalue|money|generous|\bcheap|overpriced|£\s?\d|\bsmall\b/i],
  ['delivery', 'Delivery apps', /\buber|deliveroo|just ?eat|deliver|driver/i],
  ['place', 'Place and cleanliness', /clean|dirty|\bseat|atmosphere|toilet|\btable|decor|ambien|music|vibe|parking/i]
];
export const DISHES = [
  ['Peri peri chicken', /peri[\s-]?peri|\bpiri\b|\bperi\b/i], ['Burgers', /burger|zinger/i], ['Pizza', /pizza/i], ['Chips, fries and wedges', /\bchips|fries|wedges/i],
  ['Fried chicken and wings', /fried chicken|\bwings|chicken strips|popcorn chicken|\bfillet/i], ['Grilled chicken', /grill/i], ['Rice', /\brice\b/i], ['Fish', /\bfish\b/i],
  ['Doner and kebab', /doner|kebab/i], ['Wraps', /\bwraps?\b/i], ['Steak and lamb', /steak|lamb|chops/i], ['Shakes and desserts', /shake|dessert|\bcake|waffle|ice cream/i],
  ['The Imran special', /special box|imran'?s? sp[ea]cial|imran sp[ea]cial/i]
];
// capitalised words customers use that are not staff names
const NOT_NAMES = new Set('I Imran Imrans Imran’s Sheffield London Road Wicker Uber Eats Deliveroo Just Eat Google Halal Peri Piri Zinger The A We My It This They He She You Very Great Good Nice Food Staff Service Excellent Amazing Lovely Best Highly Definitely Thank Thanks Thankyou Please Will Would Absolutely Really Brilliant Delicious Tasty Perfect Friendly Fantastic Awesome Beautiful Super Top Also Had Has Was Is Not No Yes OK Ok Just So And But Or If Then When What Where Why How Overall Visited Went Came Ordered Order Today Yesterday Monday Tuesday Wednesday Thursday Friday Saturday Sunday January February March April May June July August September October November December Mr Mrs Ms Sir Bro Brother Chicken Burger Burgers Pizza Chips Fries Wedges Rice Fish Wings Doner Kebab Wrap Steak Lamb Shake Shakes Dessert Desserts Special Box Masala Tikka Biryani Naan Mango Lassi Pakistani Indian Asian English British Turkish Lebanese Arabic Mexican Italian America American UK England Yorkshire Leeds Manchester Rotherham Barnsley Doncaster Birmingham Leicester London Covid Christmas Ramadan Eid Instagram TikTok Facebook Coke Pepsi Fanta Oreo Nutella Biscoff Lotus Kinder KFC McDonalds Nandos Nando’s Five Star Stars Hi Hello Wow Omg OMG Lol Ps PS Diner Diners Parmesan One Two Three Four Avoid Never Worst Terrible Awful Disgusting'.split(' ').map(w => w.toLowerCase()));

const day = iso => iso.slice(0, 10), mon = iso => iso.slice(0, 7);
const mean = a => a.length ? a.reduce((n, r) => n + r.stars, 0) / a.length : null;
const r2 = v => v == null ? null : Math.round(v * 100) / 100;
const dist = a => [1, 2, 3, 4, 5].map(s => a.filter(r => r.stars === s).length);
const snip = (s, n = 240) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n).replace(/\s+\S*$/, '') + '…' : s; };
const addDays = (iso, d) => new Date(Date.parse(iso) + d * 864e5).toISOString();

// a burst: days far above the shop's usual pace, a gap of two quiet days at most, that together hold at least 30 reviews and three months' worth
function bursts(R) {
  const byDay = new Map(); R.forEach(r => byDay.set(day(r.at), (byDay.get(day(r.at)) || 0) + 1));
  const months = new Map(); R.forEach(r => months.set(mon(r.at), (months.get(mon(r.at)) || 0) + 1));
  const mc = [...months.values()].sort((a, b) => a - b), usual = mc[mc.length >> 1] || 1; // the median month
  const hot = [...byDay].filter(([, n]) => n >= Math.max(4, usual / 30 * 10)).map(([d]) => d).sort(), out = [];
  for (const d of hot) { const b = out[out.length - 1]; if (b && Date.parse(d) - Date.parse(b.to) <= 3 * 864e5) b.to = d; else out.push({ from: d, to: d }); }
  return { usual, list: out.map(b => { const inB = R.filter(r => day(r.at) >= b.from && day(r.at) <= b.to); return { ...b, n: inB.length, avg: r2(mean(inB)), months: Math.round(inB.length / usual * 10) / 10, text: inB.filter(r => r.text).length }; }).filter(b => b.n >= 30 && b.n >= usual * 3) };
}
// staff shout-outs: a word in at least four reviews that, in the middle of a sentence, is written with a capital at least 30% of the time
// (customers often type names in lower case, so "never lower case" misses most of them; ordinary words are capitalised far less)
function names(R) {
  const all = new Map(), cap = new Map(), rv = new Map(), stars = new Map();
  for (const r of R) {
    if (!r.text) continue; const seen = new Set();
    for (const m of r.text.matchAll(/(^|[.!?]\s+|\s)([A-Za-z][a-z]{2,})(?=[\s,.!?)]|$)/g)) {
      const w = m[2], k = w.toLowerCase(); if (!m[1] || /[.!?]/.test(m[1]) || NOT_NAMES.has(k)) continue;
      all.set(k, (all.get(k) || 0) + 1); if (/^[A-Z]/.test(w)) cap.set(k, (cap.get(k) || 0) + 1);
      if (!seen.has(k)) { seen.add(k); rv.set(k, (rv.get(k) || 0) + 1); stars.set(k, (stars.get(k) || 0) + r.stars); }
    }
  }
  return [...rv].filter(([k, n]) => n >= 4 && (cap.get(k) || 0) / all.get(k) >= 0.3).map(([k, n]) => ({ name: k[0].toUpperCase() + k.slice(1), n, avg: r2(stars.get(k) / n) })).sort((a, b) => b.n - a.n).slice(0, 10);
}

export function build(dataDir, { match } = {}) {
  let file = null;
  try { file = fs.readdirSync(dir(dataDir)).filter(f => f.endsWith('.json') && f !== 'seen.json').map(f => JSON.parse(fs.readFileSync(path.join(dir(dataDir), f), 'utf8'))).find(j => !match || j.location.toLowerCase().includes(String(match).toLowerCase())); } catch {}
  if (!file || !file.reviews.length) return { available: false };
  const R = file.reviews, last = R[R.length - 1].at, B = bursts(R), inBurst = r => B.list.some(b => day(r.at) >= b.from && day(r.at) <= b.to), C = R.filter(r => !inBurst(r));
  const since = (a, d) => a.filter(r => r.at > addDays(last, -d)), between = (a, d1, d2) => a.filter(r => r.at > addDays(last, -d2) && r.at <= addDays(last, -d1));
  // the years, and the last 24 months
  const years = [...new Set(R.map(r => r.at.slice(0, 4)))].map(y => { const a = R.filter(r => r.at.startsWith(y)), c = a.filter(r => !inBurst(r)), rep = a.filter(r => r.reply);
    const lag = rep.map(r => (Date.parse(r.reply.at) - Date.parse(r.at)) / 864e5).sort((p, q) => p - q);
    return { y, n: a.length, avg: r2(mean(a)), avgClean: c.length !== a.length ? r2(mean(c)) : null, dist: dist(a), replied: rep.length, replyDays: lag.length ? Math.round(lag[lag.length >> 1] * 10) / 10 : null }; });
  const lm = new Date(Date.parse(last)), months = [];
  for (let i = 23; i >= 0; i--) { const k = new Date(Date.UTC(lm.getUTCFullYear(), lm.getUTCMonth() - i, 1)).toISOString().slice(0, 7), a = R.filter(r => mon(r.at) === k);
    months.push({ m: k, n: a.length, avg: r2(mean(a)), dist: dist(a), burst: a.filter(inBurst).length }); }
  // windows, burst left out so one push does not hide the trend
  const w = { d90: since(C, 90), p90: between(C, 90, 180), m12: since(C, 365), p12: between(C, 365, 730) };
  // replies
  const recentLow = since(R, 183).filter(r => r.stars <= 2), unanswered = recentLow.filter(r => !r.reply);
  const rep12 = since(R, 365).filter(r => r.reply), short = rep12.filter(r => r.reply.text.length < 40).length;
  // themes and dishes: the last 12 months (burst left out) beside everything before
  const T = a => a.filter(r => r.text), cut = addDays(last, -365);
  const lens = (list, a12, aOld) => list.map(([key, label, re]) => {
    const hit = a => T(a).filter(r => re.test(r.text)), h = hit(a12), o = hit(aOld), neg = h.filter(r => r.stars <= 2), lowAll = T(a12).filter(r => r.stars <= 2);
    const qs = (a, f) => a.filter(f).sort((p, q) => q.at.localeCompare(p.at)).slice(0, 6).map(x => ({ at: x.at, stars: x.stars, text: snip(x.text, 200) })), q = (a, f) => qs(a, f)[0] || null;
    return { key, label, n: h.length, share: T(a12).length ? Math.round(h.length / T(a12).length * 100) : 0, avg: r2(mean(h)), neg: neg.length, ofLow: lowAll.length ? Math.round(neg.length / lowAll.length * 100) : 0,
      before: { n: o.length, share: T(aOld).length ? Math.round(o.length / T(aOld).length * 100) : 0, avg: r2(mean(o)), ofLow: T(aOld).filter(r => r.stars <= 2).length ? Math.round(o.filter(r => r.stars <= 2).length / T(aOld).filter(r => r.stars <= 2).length * 100) : 0 },
      bad: q(h, r => r.stars <= 2), bads: qs(h, r => r.stars <= 2), good: q(h, r => r.stars >= 4) };
  });
  const a12 = C.filter(r => r.at > cut), aOld = C.filter(r => r.at <= cut);
  const themes = lens(THEMES, a12, aOld), dishes = lens(DISHES.map(([l, re]) => [slug(l), l, re]), C, []).filter(d => d.n >= 3).sort((a, b) => b.n - a.n);
  const out = { available: true, location: file.location, source: file.source, filedAt: file.filedAt, from: R[0].at, to: last,
    n: R.length, text: T(R).length, avg: r2(mean(R)), dist: dist(R), usualMonth: B.usual, bursts: B.list, clean: { n: C.length, avg: r2(mean(C)) },
    years, months, windows: Object.fromEntries(Object.entries(w).map(([k, a]) => [k, { n: a.length, avg: r2(mean(a)), low: a.filter(r => r.stars <= 2).length }])),
    replies: { recentLow: recentLow.length, unanswered: unanswered.length, last12: rep12.length, of12: since(R, 365).length, short },
    unanswered: unanswered.slice().reverse().slice(0, 10).map(r => ({ at: r.at, stars: r.stars, text: snip(r.text) || '(stars only, no text)' })),
    themes, dishes, names: names(R),
    praise: since(T(C), 365).filter(r => r.stars === 5 && r.text.length > 80).slice(-3).reverse().map(r => ({ at: r.at, text: snip(r.text, 220) })) };
  out.insights = insights(out);
  return out;
}

// the page's opening lines, worked out from the numbers above
const fmtD = iso => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const st = v => v == null ? '—' : v.toFixed(1) + '★';
function insights(o) {
  const L = [], W = o.windows, y = o.years, cy = y[y.length - 1], py = y[y.length - 2];
  const big = o.bursts.slice().sort((a, b) => b.n - a.n)[0];
  if (big) { const by = y.find(x => x.y === big.from.slice(0, 4)), days = Math.round((Date.parse(big.to) - Date.parse(big.from)) / 864e5) + 1;
    L.push({ k: 'burst', t: `${big.n} reviews arrived in ${days} days (${fmtD(big.from)} to ${fmtD(big.to)}), about ${Math.round(big.months)} months' worth at the usual pace, at ${st(big.avg)}.${by && by.avgClean != null ? ` Those days lift ${by.y} from ${st(by.avgClean)} to ${st(by.avg)}.` : ''}${o.bursts.length > 1 ? ` There ${o.bursts.length === 2 ? 'was one more push' : `were ${o.bursts.length - 1} more pushes`}, ${o.bursts.filter(b => b !== big).map(b => `${b.n} in ${fmtD(b.from).replace(/^\d+ /, '')}`).join(', ')}.` : ''} Without them the shop averages ${st(o.clean.avg)}, against ${st(o.avg)} with them. Google can filter reviews that arrive in a rush, and asking for reviews in return for anything breaks its rules.` }); }
  if (W.d90.n && W.p90.n) { const d = W.d90.avg - W.p90.avg; L.push({ k: d < -0.2 ? 'down' : d > 0.2 ? 'up' : 'flat', t: `The last 90 days: ${W.d90.n} reviews at ${st(W.d90.avg)}, ${d < -0.2 ? 'down from' : d > 0.2 ? 'up from' : 'level with'} ${st(W.p90.avg)} in the 90 days before${W.d90.low ? `; ${W.d90.low} of the ${W.d90.n} are one or two stars` : ''}.` }); }
  const neg = o.themes.filter(t => t.neg >= 2).sort((a, b) => b.ofLow - a.ofLow).slice(0, 2);
  if (neg.length) L.push({ k: 'down', t: `What the low ratings are about, last 12 months: ${neg.map(t => `${t.label.toLowerCase()} (in ${t.ofLow}% of the one- and two-star reviews${t.before.ofLow ? `, ${t.before.ofLow}% before` : ''})`).join(' and ')}.` });
  if (cy && py && py.n) { const a = Math.round(cy.replied / cy.n * 100), b = Math.round(py.replied / py.n * 100); if (Math.abs(a - b) >= 15) L.push({ k: a < b ? 'down' : 'up', t: `Replies ${a < b ? 'fell' : 'rose'} from ${b}% of reviews in ${py.y} to ${a}% in ${cy.y}.${o.replies.unanswered ? ` ${o.replies.unanswered} of the ${o.replies.recentLow} one- and two-star reviews in the last six months have no reply.` : ''}${o.replies.short ? ` ${o.replies.short} of the ${o.replies.last12} replies in the last year are one-liners under 40 characters.` : ''}` }); }
  else if (o.replies.unanswered) L.push({ k: 'down', t: `${o.replies.unanswered} of the ${o.replies.recentLow} one- and two-star reviews in the last six months have no reply.` });
  const good = o.themes.filter(t => t.share >= 15).sort((a, b) => b.avg - a.avg)[0]; if (good) L.push({ k: 'up', t: `What customers praise most: ${good.label.toLowerCase()}, in ${good.share}% of the reviews with text, averaging ${st(good.avg)}.` });
  if (o.names.length) L.push({ k: 'up', t: `Staff named by customers: ${o.names.slice(0, 4).map(n => `${n.name} (${n.n})`).join(', ')}. Worth telling them.` });
  return L;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1'))) {
  const src = process.argv[2], m = process.argv.slice(3);
  if (!src) { console.log('usage: node reviews.mjs <takeout zip or folder> [listing-name match…]   (defaults to the dashboards in office.config)'); process.exit(1); }
  const { loadConfig, ROOT } = await import('./config.mjs'), cfg = loadConfig(), DATA = path.join(ROOT, 'data');
  const matches = m.length ? m : (cfg.aios?.dashboards || []).map(d => d.match).filter(Boolean);
  const done = await importTakeout(DATA, src, matches);
  console.log(done.length ? done.map(d => `filed ${d.location}: ${d.total} reviews (${d.added} new) → data/reviews/${d.file}`).join('\n') : `nothing filed: no location in that Takeout matches ${matches.join(', ')}`);
}
