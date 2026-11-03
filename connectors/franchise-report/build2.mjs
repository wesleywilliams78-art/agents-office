// Franchise Entry Report, the full design: structured issue data (issue.json) -> the seven A4 pages in the Issue 01 (Norway) layout, in the
// issue's country colour -> PDF.   node connectors/franchise-report/build2.mjs <issue.json> <out.pdf>
// Fixed every issue: layout, type (Playfair Display + Inter), bone pages, ink text, footer, the line-art mountains and the WRW logo tile
// (white on red #FF3131). Changes per issue: the country colour (cover field, closing band, "If I had a brand" box, labels, rules, hero numbers).
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const [inFile, outFile] = process.argv.slice(2);
if (!inFile || !outFile) { console.error('usage: node build2.mjs <issue.json> <out.pdf>'); process.exit(2); }
const D = JSON.parse(fs.readFileSync(inFile, 'utf8'));
const C = D.colour || '#FF3131', INK = '#201A19', GREY = '#5B5651', MUTE = '#8E8780', BONE = '#F7F2EA', CARD = '#FDFBF7', LINE = '#E4DCD0', WRWRED = '#FF3131';
const hex = h => { const m = /#?([0-9a-f]{6})/i.exec(h)[1]; return [0, 2, 4].map(i => parseInt(m.slice(i, i + 2), 16)); };
const mix = (h, p, base = [247, 242, 234]) => '#' + hex(h).map((v, i) => Math.round(v * p + base[i] * (1 - p)).toString(16).padStart(2, '0')).join('');
const TINT = mix(C, 0.14), TINT2 = mix(C, 0.32), N = String(D.issue).padStart(2, '0');
// Secondary flag colour (Norway 25 Oct 2026, approved): the cover rules and the mountains on the cover and closing band are drawn in the country's second
// flag colour in three shades (front ridge and rules, bottom wave, back ridge), not white. A country whose second flag colour is white (Denmark, Finland) stays white.
// Override per issue with "accent": { "front": "#hex", "mid": "#hex", "back": "#hex" }.
const ACCENTS = { norway: { front: '#00205B', mid: '#2F6FD0', back: '#9CC7F5' }, sweden: { front: '#FECC02', mid: '#D9A600', back: '#FFE88A' }, portugal: { front: '#046A38', mid: '#2E8B57', back: '#9FD3AE' } };
const ACC = D.accent || ACCENTS[String(D.country || '').toLowerCase()] || null;
const ACC_F = ACC ? ACC.front : '#fff', ACC_M = ACC ? ACC.mid : '#fff', ACC_B = ACC ? ACC.back : '#fff', ACC_OP = ACC ? '1' : '.5', ACC_RULE = ACC ? ACC.front : 'rgba(255,255,255,.55)';
const CLASH = C.toLowerCase() !== WRWRED.toLowerCase(), LOGOBG = CLASH ? C : WRWRED, GREEN = '#1E9E57', DOWN = '#D8362B'; // the logo tile follows the report colour when it would clash with red
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const rich = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
const src = s => s ? `<span class="src">[${esc(s)}]</span>` : '';
const para = (s, cls = '') => `<p class="${cls}">${rich(s)}</p>`;
const logoTile = (w = 22) => `<span class="logo" style="width:${w}px;height:${Math.round(w * 0.7)}px;font-size:${Math.round(w * 0.38)}px">WRW</span>`;
const footer = n => `<div class="foot">${logoTile(24)}<span class="fl">WRW Hospitality · Wesley Williams · Franchise Entry Report · Issue ${N}</span><span class="fr">Page ${n} of 7</span></div>`;
const head = (n, label, h, intro) => `<div class="top"><span class="num">${String(n).padStart(2, '0')}</span><span class="lab">${esc(label)}</span></div><h2>${esc(h)}</h2>${intro ? `<p class="intro">${esc(intro)}</p>` : ''}`;
const pill = (lvl, forceThin) => { const l = String(lvl || '').toLowerCase(); const cls = /^high/.test(l) ? 'p-hi' : /^med/.test(l) ? 'p-me' : /^thin|^low|^not/.test(l) ? 'p-lo' : 'p-lo'; return `<span class="pill ${cls}">${esc(lvl)}</span>`; };
const dir = d => { const s = String(d || ''); const cls = /rising|up/i.test(s) ? 'd-up' : /fall|down/i.test(s) ? 'd-dn' : /flat|mixed|neutral|steady|stable/i.test(s) ? 'd-fl' : 'd-nf'; const ar = cls === 'd-up' ? '↑ ' : cls === 'd-dn' ? '↓ ' : /flat/i.test(s) ? '→ ' : ''; return `<span class="dir ${cls}">${ar}${esc(s.replace(/^(↑|↓|→)\s*/, ''))}</span>`; };
const dots = (n, max = 3) => `<span class="dots">${Array.from({ length: max }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</span>`;
const mount = (cls = '') => `<svg class="mount ${cls}" viewBox="0 0 800 260" preserveAspectRatio="none"><path d="M0 250 C60 232 90 210 140 214 C190 218 215 196 262 176 C300 160 322 128 372 110 C420 92 448 96 486 126 C530 160 560 198 604 210 C660 224 700 190 740 170 C770 156 790 150 800 148" fill="none" stroke="${ACC_F}" stroke-width="3.4"/><path d="M0 214 C70 196 112 160 170 158 C230 156 262 190 318 176 C380 160 398 98 452 80 C500 66 540 96 590 118 C650 144 700 134 800 96" fill="none" stroke="${ACC_B}" stroke-opacity="${ACC ? 1 : .5}" stroke-width="2.2"/><path d="M0 238 C130 226 260 244 400 232 C540 220 660 240 800 228" fill="none" stroke="${ACC_M}" stroke-opacity="${ACC ? 1 : .5}" stroke-width="2"/></svg>`;

/* ---------- page 1 ---------- */
const P1 = D.cover;
const p1 = `<section class="page cover" data-n="1"><div class="ctop"><span class="ctile">WRW</span><span class="cissue">ISSUE ${N}<br>${esc(D.dateLong)}</span></div>
<div class="ckick">FRANCHISE ENTRY REPORT</div><div class="ccountry">${esc(D.country)}</div><div class="csub">${esc(P1.subtitle || 'Where the opportunity is, what blocks it, and what to do in the first 90 days.')}</div>
<div class="crule"></div><div class="cvl">THE VERDICT</div><div class="cverdict">${esc(P1.verdict)}</div>
<div class="cstats">${P1.stats.map(s => `<div class="cs"><div class="csb">${esc(s.big)}</div><div class="csl">${esc(s.label)}</div></div>`).join('')}</div>
${mount('cmount')}<div class="cfoot"><span>WRW Hospitality · Wesley Williams${D.contributor ? ` · With insight from ${esc(D.contributor.name)}, ${esc(D.contributor.org)}` : ''}</span><span>Issue ${N}</span></div></section>`;

/* contributor (optional, from Issue 04 Kenya): a named outside expert's own words, approved by them. { name, role, org, quote, disclosure } */
const contribCard = c => `<div class="contrib"><div class="cbl">FROM THE GROUND</div><p class="cq">“${esc(c.quote)}”</p><div class="cwho"><b>${esc(c.name)}</b>, ${esc(c.role)}, ${esc(c.org)}</div>${c.disclosure ? `<div class="cdis">${esc(c.disclosure)}</div>` : ''}</div>`;
/* ---------- page 2 ---------- */
const P2 = D.market;
const tile = t => `<div class="card tile"><div class="tl"><i></i>${esc(t.label)}</div><div class="tb">${t.pre ? `<small>${esc(t.pre)}</small>` : ''}${esc(t.big)}${t.post ? `<small class="post">${esc(t.post)}</small>` : ''}</div><p>${rich(t.body)}</p><div class="tsrc">${esc(t.src || '')}</div></div>`;
const eatCol = c => `<div class="ec"><div class="el">${esc(c.label)}</div><div class="eb">${c.pre ? `<small>${esc(c.pre)}</small>` : ''}${esc(c.big)}</div><p>${rich(c.body)}</p>${(c.bars || []).map(b => `<div class="bar"><span class="bl">${esc(b.label)}</span><span class="bt"><span class="bf ${b.alt ? 'alt' : ''}" style="width:${Math.round(b.value / Math.max(...c.bars.map(x => x.value)) * 100)}%"></span></span><b>${esc(b.show || b.value)}</b></div>`).join('')}<div class="esrc">${esc(c.src || '')}</div></div>`;
const p2 = `<section class="page" data-n="2">${head(2, 'MARKET SNAPSHOT', P2.headline, P2.intro)}<div class="grid3">${P2.tiles.map(tile).join('')}</div>
<div class="sech"><h3>${esc(P2.eatsTitle)}</h3><span>${esc(P2.eatsNote || 'Three facts that shape every unit P&L')}</span></div><div class="grid3 eats">${P2.eats.map(eatCol).join('')}</div>
${D.contributor ? contribCard(D.contributor) : ''}
<div class="sowhat"><b>So what?</b><p>${rich(P2.sowhat)}</p></div>${footer(2)}</section>`;

/* ---------- page 3 ---------- */
const P3 = D.rising;
const row3 = r => `<tr><td class="c1"><b>${esc(r.cat)}</b>${r.sub ? `<small>${esc(r.sub)}</small>` : ''}</td><td>${dir(r.dir)}</td><td class="ev">${rich(r.evidence)}</td><td class="sw"><span>${esc(r.src || '')}</span><small>${esc(r.window || '')}</small></td><td>${pill(r.conf)}</td><td>${pill(r.sat)}</td><td>${pill(r.entry)}</td></tr>`;
// a change may arrive as a number (+14) or as text ("+20%", "−4"); keep the number for the bars and any % for the label
const num = v => typeof v === 'number' ? v : parseFloat(String(v).replace(/[−–]/g, '-').replace(/[^0-9.+-]/g, '')) || 0;
P3.chart.items.forEach(i => { i.unit = /%/.test(String(i.delta)) ? '%' : ''; i.delta = num(i.delta); });
const ch = P3.chart, cmax = Math.max(...ch.items.map(i => Math.abs(i.delta))), cmin = Math.min(0, ...ch.items.map(i => i.delta)), cpos = Math.max(0, ...ch.items.map(i => i.delta));
const CH_PAD = 11, CH_W = 78; // the bars use 78% of the track, with 11% free on the left for a negative value's label and the rest on the right for a positive one
const zero = cpos + Math.abs(cmin) ? CH_PAD + Math.abs(cmin) / (cpos + Math.abs(cmin)) * CH_W : CH_PAD;
const chartRow = i => { const w = Math.abs(i.delta) / (cpos + Math.abs(cmin)) * CH_W; return `<div class="cr"><div class="cl"><b>${esc(i.label)}</b><small>${esc(i.sub || '')}</small></div><div class="ct"><span class="zero" style="left:${zero}%"></span><span class="cb ${i.delta < 0 ? 'neg' : ''}" style="${i.delta < 0 ? `right:${100 - zero}%` : `left:${zero}%`};width:${w}%"></span><em style="${i.delta < 0 ? `right:${100 - zero + w + 1}%` : `left:${zero + w + 1}%`}">${i.delta > 0 ? '+' : i.delta < 0 ? '−' : ''}${Math.abs(i.delta)}${i.unit}${i.star ? '*' : ''}</em></div></div>`; };
const p3 = `<section class="page" data-n="3">${head(3, 'WHAT’S RISING, WHAT’S FALLING', P3.headline, P3.intro)}
<table class="rt"><thead><tr><th>CATEGORY</th><th>DIRECTION</th><th>EVIDENCE</th><th>SOURCE · WINDOW</th><th>CONFIDENCE</th><th>SATURATION</th><th>ENTRY</th></tr></thead><tbody>${P3.rows.map(row3).join('')}</tbody></table>
<div class="bottom"><div class="card chart"><h4>${esc(ch.title)}</h4><p class="cn">${esc(ch.note)}</p>${ch.items.map(chartRow).join('')}<p class="csrc">${esc(ch.source)}</p></div>
<div class="reading"><div class="rl">READING THE TABLE</div><h4>${esc(P3.reading.title)}</h4><div class="rpts">${P3.reading.paras.map((p, k) => `<div class="rpt"><span class="rn">${k + 1}</span><p>${rich(p).replace(/\s*\[(S[^\]]*)\]/g, ' <span class="rsrc">[$1]</span>')}</p></div>`).join('')}</div></div></div>${footer(3)}</section>`;

/* ---------- page 4 ---------- */
const P4 = D.white;
const gap = (g, i) => `<div class="card gap"><div class="gh"><span class="gn">${i + 1}</span><h4>${esc(g.title)}</h4></div>${[['GAP', g.gap], ['EVIDENCE', g.evidence], ['SUITS', g.suits], ['ROUTE', g.route]].map(([k, v]) => `<div class="gr"><span>${k}</span><div>${rich(v)}</div></div>`).join('')}<div class="gf"><span class="sz ${g.size === 'L' ? 'L' : ''}">${esc(g.size)}</span>${g.window ? `<b>Window: </b>` : ''}${esc(g.sizeText || '')}${g.thin ? '<em class="pill p-lo">Thin evidence</em>' : ''}</div></div>`;
const M = P4.matrix, mx = (x) => 30 + x * 2.4, my = (y) => 218 - y * 1.9;
const matrix = `<svg viewBox="0 0 300 250" class="mx"><rect x="30" y="10" width="120" height="104" rx="8" fill="${TINT}"/><rect x="154" y="10" width="116" height="104" rx="8" fill="#EFE8DC"/><rect x="30" y="118" width="120" height="100" rx="8" fill="#EFE8DC"/><rect x="154" y="118" width="116" height="100" rx="8" fill="#EFE8DC"/>
<text x="38" y="26" class="ql hot">MOVE NOW</text><text x="262" y="26" text-anchor="end" class="ql">OUT-EXECUTE</text><text x="38" y="210" class="ql">TEST SMALL</text><text x="262" y="210" text-anchor="end" class="ql">AVOID</text>
<text x="150" y="240" text-anchor="middle" class="ax">Saturation → higher</text><text x="14" y="120" transform="rotate(-90 14 120)" text-anchor="middle" class="ax">Opportunity → higher</text>
${M.points.map(p => `<circle cx="${mx(p.x)}" cy="${my(p.y)}" r="${p.hot ? 5 : 4.2}" fill="${p.hot ? C : INK}"/><text x="${p.x > 70 ? mx(p.x) - 8 : mx(p.x) + 8}" y="${my(p.y) + 3.5}" text-anchor="${p.x > 70 ? 'end' : 'start'}" class="pt">${esc(p.name)}</text>`).join('')}</svg>`;
const p4 = `<section class="page" data-n="4">${head(4, 'WHITE-SPACE OPPORTUNITIES', P4.headline, P4.intro)}<div class="grid2">${P4.gaps.map(gap).join('')}</div>
<div class="bottom4"><div class="card mxc"><h4>Opportunity vs saturation</h4><p class="cn">${esc(M.intro)}</p>${matrix}<p class="csrc">${esc(M.note)}</p></div>
<div class="position"><div class="pl">IF I HAD A BRAND</div><div class="qm">“</div><div class="pq">${esc(P4.position.quote)}</div>${P4.position.paras.map(p => para(p, 'pp')).join('')}<div class="psig">Wesley Williams, WRW Hospitality</div></div></div>${footer(4)}</section>`;

/* ---------- page 5 ---------- */
const P5 = D.regulation, W = P5.wage, wv = p => num(p.value), wtot = W.parts.reduce((a, p) => a + wv(p), 0); // values may arrive as strings ("100.00"): a string sum drew a broken bar
const wcls = ['w1', 'w2', 'w3', 'w4'];
const p5 = `<section class="page" data-n="5">${head(5, 'REGULATION AND COST TO OPERATE', P5.headline, P5.intro)}
<table class="reg"><thead><tr><th>AREA</th><th>CURRENT POSITION (VERIFIED ${esc(D.verified)})</th><th>SOURCE</th></tr></thead><tbody>${P5.rows.map(r => `<tr><td class="c1"><b>${esc(r.area)}</b></td><td>${rich(r.text)}</td><td class="rs">${esc(r.src)}</td></tr>`).join('')}</tbody></table>
<div class="grid3 t3">${P5.tiles.map((t, i) => `<div class="card tile ${i === 0 ? 'hot' : ''}"><div class="tl">${esc(t.label)}</div><div class="tb">${t.pre ? `<small>${esc(t.pre)}</small>` : ''}${esc(t.big)}</div><p>${rich(t.body)} ${src(t.src)}</p></div>`).join('')}</div>
<div class="card wage"><div class="wl">THE WAGE ENGINE</div><h4>${esc(W.title)}</h4><div class="wcols"><div class="wl1"><p class="cn">${esc(W.sub)}</p>
<div class="wbar">${W.parts.map((p, i) => `<span class="${wcls[i]}" style="width:${wv(p) / wtot * 100}%">${wv(p) >= 10 ? esc(p.short || p.value) : ''}</span>`).join('')}</div>
<div class="wleg">${W.parts.map((p, i) => `<span><i class="${wcls[i]}"></i>${esc(p.label)}</span>`).join('')}<span><b>Total ≈ ${esc(String(W.total).replace(/^\s*(total\s*)?[≈~]?\s*/i, ''))}</b></span></div>
<p class="west"><em class="pill p-lo">ESTIMATE</em> ${rich(W.method)}</p></div>
<div class="wr"><div class="wk"><div class="wkl">LEGAL WAGE FLOOR</div><div class="wkb"><small>${esc(W.floorPre)}${/[A-Za-z]$/.test(String(W.floorPre || '')) ? '&nbsp;' : ''}</small>${esc(W.floor)}</div><p>${rich(W.floorNote)}</p></div><div class="wk"><div class="wkl">ALL-IN FLOOR</div><div class="wkb">≈ ${esc(String(W.allIn).replace(/\s*\/\s*(hr|hour)\b\.?\s*$/i, ''))}<small class="post">/hr</small></div><p>${rich(W.allInNote)}</p></div></div></div></div>
<p class="fine">Not legal or tax advice. ${esc(String(P5.advice || 'Confirm the position with a Swedish adviser before signing.').replace(/^\s*not legal,? or tax,? advice[.:]?\s*/i, ''))}</p>${footer(5)}</section>`;

/* ---------- page 6 ---------- */
const P6 = D.route;
const rrow = r => `<tr><td class="c1"><b>${esc(r.name)}</b></td><td>${dots(r.control)}<span class="dl">${['', 'Low', 'Medium', 'High', 'Full'][r.control] || ''}</span></td><td>${dots(r.capital)}<span class="dl">${['', 'Low', 'Medium', 'High'][r.capital] || ''}</span></td><td>${dots(r.speed)}<span class="dl">${['', 'Slow', 'Medium', 'Fast'][r.speed] || ''}</span></td><td class="ev">${rich(r.seen)}</td></tr>`;
const p6 = `<section class="page" data-n="6">${head(6, 'ENTRY ROUTE AND RISKS', P6.headline, P6.intro)}
<table class="rr"><thead><tr><th>ROUTE</th><th>YOUR CONTROL</th><th>YOUR CAPITAL</th><th>SPEED TO SCALE</th><th>SEEN IN ${esc(D.country.toUpperCase())}</th></tr></thead><tbody>${P6.routes.map(rrow).join('')}</tbody></table>
<div class="grid3 fits">${P6.fits.map(f => `<div class="card fit"><div class="fl2">${esc(f.label)}</div><h4>${esc(f.title)}</h4><p>${rich(f.body)}</p></div>`).join('')}</div>
<div class="sech"><h3>${esc(P6.riskTitle || 'Price the risk before you price the franchise')}</h3><span>Six risks, each sourced</span></div>
<div class="grid3 risks">${P6.risks.map(r => `<div class="card tile"><div class="tl"><i></i>${esc(r.label)}</div><p>${rich(r.body)} ${src(r.src)}</p></div>`).join('')}</div>${footer(6)}</section>`;

/* ---------- page 7 ---------- */
const P7 = D.days, srcs = P7.sources;
const p7 = `<section class="page p7" data-n="7"><div class="top"><span class="num">07</span><span class="lab">YOUR FIRST 90 DAYS</span></div><h2>${esc(P7.headline)}</h2>
<div class="moves">${P7.moves.map((m, i) => `<div class="mv"><span class="mn">${i + 1}</span><p>${rich(m)}</p></div>`).join('')}</div>
<div class="grid2 cm"><div class="card"><div class="cml">WHAT WE’D CHECK NEXT</div><ul>${P7.check.map(c => `<li>${esc(c)}</li>`).join('')}</ul></div><div class="card"><div class="cml">METHOD</div><p>${esc(P7.method)}</p></div></div>
<div class="sech"><h3>Sources</h3><span>${srcs.length} public sources · accessed ${esc(D.accessed)}</span></div>
<div class="srcs">${srcs.map((s, i) => `<div><b>S${i + 1}</b> ${esc(String(s).replace(new RegExp('^S' + (i + 1) + '[\\s.:·-]+'), ''))}</div>`).join('')}</div>
<div class="band"><div class="bh">Which country should we cover next?</div><div class="bs">WRW Hospitality · Wesley Williams</div><div class="bt2">Tell us in the comments. Follow WRW Hospitality for the next Franchise Entry Report, every Friday.</div><div class="bi">Issue ${N} · Page 7 of 7</div>${mount('bm')}</div>
<div class="copy">© 2026 WRW Hospitality (Wesley Williams). Not to be resold, rebranded or redistributed.</div></section>`;

const css = `@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700;800&family=Inter:wght@400;500;600;700&display=swap');
@page{size:A4;margin:0}*{box-sizing:border-box;margin:0;padding:0}body{font-family:Inter,Arial,sans-serif;color:${INK};-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{width:210mm;height:297mm;position:relative;overflow:hidden;page-break-after:always;background:${BONE};padding:11mm 13mm 0 13mm;--s:1;--sp:1;font-size:calc(8.3pt*var(--s));line-height:1.42}.page:last-child{page-break-after:auto}
.top{display:flex;align-items:center;gap:9px}.num{background:${C};color:#fff;font:600 10pt 'Playfair Display',serif;padding:3px 9px;border-radius:14px}.lab{font-size:7pt;letter-spacing:.2em;color:${C};font-weight:700}
h2{font:700 calc(21pt*var(--s))/1.12 'Playfair Display',Georgia,serif;margin:calc(9px*var(--sp)) 0 calc(7px*var(--sp));max-width:172mm;color:${INK}}.intro{font-size:calc(8.8pt*var(--s));color:${GREY};max-width:165mm;margin-bottom:calc(12px*var(--sp))}
p{color:${GREY}}b{color:${INK};font-weight:700}.src,.tsrc,.esrc{color:${MUTE};font-size:.82em}.card{background:${CARD};border:1px solid ${LINE};border-radius:12px;padding:calc(11px*var(--sp)) calc(12px*var(--sp))}
.grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:calc(9px*var(--sp))}.grid2{display:grid;grid-template-columns:repeat(2,1fr);gap:calc(9px*var(--sp))}
.logo{display:inline-flex;align-items:center;justify-content:center;background:${LOGOBG};color:#fff;font:700 6.5px 'Playfair Display',serif;letter-spacing:.2px;border-radius:5px}
.foot{position:absolute;left:13mm;right:13mm;bottom:6mm;display:flex;align-items:center;gap:9px;font-size:6.6pt;color:${MUTE}}.fl{flex:1}
.tile .tl{font-size:6.4pt;letter-spacing:.18em;color:${GREY};font-weight:600;display:flex;align-items:center;gap:6px;margin-bottom:calc(6px*var(--sp))}.tile .tl i{width:14px;height:6px;border-radius:4px;background:${C};display:inline-block}
.tb{font:600 calc(22pt*var(--s))/1.05 'Playfair Display',serif;color:${INK};margin-bottom:calc(6px*var(--sp))}.tb small{font:600 .5em 'Playfair Display',serif;margin-right:3px}.tb small.post{margin:0 0 0 2px}
.tile p{font-size:calc(7.4pt*var(--s));line-height:1.45;margin-bottom:calc(7px*var(--sp))}.tsrc{border-top:1px solid ${LINE};padding-top:calc(6px*var(--sp));font-size:6pt}
.sech{display:flex;justify-content:space-between;align-items:baseline;border-bottom:1.5px solid ${INK};margin:calc(14px*var(--sp)) 0 calc(9px*var(--sp));padding-bottom:calc(5px*var(--sp))}.sech h3{font:700 calc(15pt*var(--s)) 'Playfair Display',serif}.sech span{font-size:6.8pt;color:${MUTE}}
.ec .el{font-size:6.4pt;letter-spacing:.16em;color:${C};font-weight:700;margin-bottom:calc(5px*var(--sp))}.eb{font:600 calc(27pt*var(--s))/1 'Playfair Display',serif;margin-bottom:calc(6px*var(--sp))}.eb small{font-size:.5em;margin-right:3px}.ec p{font-size:7.3pt;margin-bottom:calc(7px*var(--sp))}
.bar{display:flex;align-items:center;gap:6px;font-size:6.6pt;margin:calc(3px*var(--sp)) 0}.bl{width:46px;color:${GREY}}.bt{flex:1;height:8px}.bf{display:block;height:8px;border-radius:5px;background:${C}}.bf.alt{background:${TINT2}}.esrc{font-size:6pt;margin-top:5px}
.contrib{margin-top:calc(12px*var(--sp));border:1px solid ${LINE};border-left:4px solid ${C};border-radius:12px;background:${CARD};padding:calc(11px*var(--sp)) calc(16px*var(--sp))}.cbl{font-size:6pt;letter-spacing:.2em;color:${C};font-weight:700;margin-bottom:5px}.cq{font:500 calc(11pt*var(--s))/1.35 'Playfair Display',serif;color:${INK};margin-bottom:6px}.cwho{font-size:7pt;color:${GREY}}.cwho b{color:${INK}}.cdis{font-size:6pt;color:${MUTE};margin-top:3px}
.sowhat{position:absolute;left:13mm;right:13mm;bottom:16mm;background:${C};border-radius:12px;padding:13px 18px;display:flex;gap:26px;align-items:center;color:#fff}.sowhat b{font:600 15pt 'Playfair Display',serif;color:#fff;white-space:nowrap}.sowhat p{color:#fff;font-size:7.8pt}
table{width:100%;border-collapse:collapse}th{font-size:5.9pt;letter-spacing:.16em;color:${MUTE};font-weight:600;text-align:left;padding:calc(5px*var(--sp)) calc(7px*var(--sp));border-bottom:1.5px solid ${INK}}td{padding:calc(7px*var(--sp)) calc(7px*var(--sp));border-bottom:1px solid ${LINE};vertical-align:top;font-size:calc(7.1pt*var(--s));line-height:1.4;color:${GREY}}
td.c1 b{font:700 calc(9.2pt*var(--s)) 'Playfair Display',serif;display:block}td.c1 small{font-size:6pt;color:${MUTE}}.sw span{display:block;color:${GREY};font-size:6.4pt}.sw small{color:${MUTE};font-size:6pt}
.dir{font-weight:600;font-size:7pt;white-space:nowrap}.d-up{color:${GREEN}}.d-dn{color:${DOWN}}.d-fl{color:#C2500A;font-weight:600}.d-nf{color:${GREY};font-weight:600}
.pill{display:inline-block;font-size:6.2pt;font-weight:600;padding:calc(2px*var(--sp)) 9px;border-radius:10px;white-space:nowrap;margin:calc(1px*var(--sp)) 0}.p-hi{background:${C};color:#fff}.p-me{background:${TINT};color:${C}}.p-lo{border:1px solid ${LINE};color:${GREY};background:transparent}
.bottom{display:grid;grid-template-columns:1.55fr 1fr;gap:calc(9px*var(--sp));margin-top:calc(12px*var(--sp))}.chart h4,.mxc h4{font:600 calc(11pt*var(--s)) 'Playfair Display',serif;margin-bottom:2px}.cn{font-size:6.4pt;color:${MUTE};margin-bottom:6px}.csrc{font-size:5.8pt;color:${MUTE};margin-top:5px}
.cr{display:grid;grid-template-columns:34% 66%;align-items:center;margin:calc(3px*var(--sp)) 0}.cl b{font-size:6.8pt;display:block;line-height:1.1}.cl small{font-size:5.6pt;color:${MUTE}}.ct{position:relative;height:13px}.zero{position:absolute;top:0;bottom:0;width:1px;background:${INK}}.cb{position:absolute;top:2px;height:9px;border-radius:5px;background:${GREEN}}.cb.neg{background:${DOWN}}.ct em{position:absolute;top:1px;font:700 6.4pt Inter,sans-serif;font-style:normal}
.reading{background:${C};border-radius:12px;padding:calc(13px*var(--sp)) calc(14px*var(--sp));color:#fff;display:flex;flex-direction:column}.rpts{flex:1;display:flex;flex-direction:column;justify-content:space-between;gap:calc(8px*var(--sp))}.rpt{display:grid;grid-template-columns:20px 1fr;gap:9px;align-items:start;border-top:1px solid rgba(255,255,255,.4);padding-top:calc(8px*var(--sp))}.rn{width:20px;height:20px;border-radius:50%;background:#fff;color:${C};font:700 8.5pt/20px 'Playfair Display',serif;text-align:center}.reading .rpt p{font-size:calc(8.2pt*var(--s));line-height:1.45;margin:0}.rsrc{font-size:6pt;opacity:.8;white-space:nowrap}.rl{font-size:6pt;letter-spacing:.18em;opacity:.85;margin-bottom:5px}.reading h4{font:700 calc(13pt*var(--s))/1.15 'Playfair Display',serif;margin-bottom:7px;color:#fff}.reading p{color:#fff;font-size:7pt;margin-bottom:calc(7px*var(--sp))}.reading b,.position b,.sowhat b{color:#fff}
.gap .gh{display:flex;align-items:center;gap:8px;margin-bottom:calc(7px*var(--sp))}.gn{width:19px;height:19px;border-radius:50%;background:${C};color:#fff;font:600 8pt 'Playfair Display',serif;display:inline-flex;align-items:center;justify-content:center}.gap h4{font:700 calc(11pt*var(--s)) 'Playfair Display',serif}
.gr{display:grid;grid-template-columns:54px 1fr;gap:5px;margin:calc(4px*var(--sp)) 0;font-size:calc(6.9pt*var(--s));line-height:1.38}.gr span{font-size:5.6pt;letter-spacing:.16em;color:${MUTE};font-weight:600;padding-top:1px}.gr div{color:${GREY}}
.gf{border-top:1px solid ${LINE};margin-top:calc(7px*var(--sp));padding-top:calc(7px*var(--sp));font-size:6.8pt;display:flex;align-items:center;gap:6px;color:${GREY}}.sz{width:17px;height:17px;border-radius:50%;background:${TINT};color:${C};font:700 7.4pt 'Playfair Display',serif;display:inline-flex;align-items:center;justify-content:center}.sz.L{background:${C};color:#fff}
.bottom4{display:grid;grid-template-columns:1fr 1fr;gap:calc(9px*var(--sp));margin-top:calc(10px*var(--sp))}.mx{width:100%;height:auto}.ql{font:700 6pt Inter;letter-spacing:.14em;fill:${MUTE}}.ql.hot{fill:${C}}.ax{font:500 5.6pt Inter;fill:${MUTE}}.pt{font:600 6pt Inter;fill:${INK}}
.position{background:${C};border-radius:12px;padding:calc(13px*var(--sp)) calc(15px*var(--sp));color:#fff;display:flex;flex-direction:column}.pl{font-size:6pt;letter-spacing:.2em;opacity:.9}.qm{font:700 34pt/0.8 'Playfair Display',serif;margin:5px 0 3px}.pq{font:700 calc(13pt*var(--s))/1.22 'Playfair Display',serif;margin-bottom:8px;color:#fff}.pp{color:#fff;font-size:calc(7.1pt*var(--s));margin-bottom:calc(7px*var(--sp))}.psig{margin-top:auto;border-top:1px solid rgba(255,255,255,.4);padding-top:7px;font-weight:700;font-size:7.2pt}
.reg td.rs{white-space:nowrap;font-size:6.2pt;color:${MUTE}}.reg td{font-size:calc(7pt*var(--s))}.t3{margin:calc(12px*var(--sp)) 0 calc(10px*var(--sp))}.tile.hot{background:${C};border-color:${C};color:#fff}.tile.hot .tl,.tile.hot .tb,.tile.hot p,.tile.hot .src{color:#fff}
.wage .wl{font-size:6.2pt;letter-spacing:.18em;color:${C};font-weight:700}.wage h4{font:700 calc(13pt*var(--s)) 'Playfair Display',serif;margin:3px 0 calc(8px*var(--sp))}.wcols{display:grid;grid-template-columns:1.3fr 1fr;gap:calc(16px*var(--sp))}
.wbar{display:flex;height:17px;border-radius:9px;overflow:hidden;margin:calc(4px*var(--sp)) 0 calc(8px*var(--sp))}.wbar span{font-size:6pt;color:#fff;font-weight:700;display:flex;align-items:center;justify-content:center}.w1{background:${C}}.w2{background:${mix(C, .62, [253, 251, 247])}}.w3{background:${mix(C, .3, [253, 251, 247])}}.w4{background:${INK}}
.wleg{display:flex;flex-wrap:wrap;gap:3px 11px;font-size:6.4pt;color:${GREY};margin-bottom:calc(7px*var(--sp))}.wleg i{display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:4px}.west{font-size:6.5pt}
.wr{display:grid;grid-template-columns:1fr 1fr;gap:12px}.wkl{font-size:5.8pt;letter-spacing:.16em;color:${MUTE};font-weight:600;margin-bottom:3px}.wkb{font:600 calc(21pt*var(--s))/1 'Playfair Display',serif}.wkb small{font-size:.5em}.wk p{font-size:6.4pt;margin-top:4px}.fine{font-size:6.4pt;color:${MUTE};margin-top:calc(9px*var(--sp))}
.dots{display:inline-flex;gap:2px;margin-right:5px;vertical-align:middle}.dots i{width:11px;height:5px;border-radius:3px;background:${LINE};display:inline-block}.dots i.on{background:${C}}.dl{font-size:6.4pt;color:${GREY}}
.fit .fl2{font-size:6pt;letter-spacing:.16em;color:${MUTE};margin-bottom:5px}.fit h4{font:700 calc(12pt*var(--s)) 'Playfair Display',serif;color:${C};margin-bottom:5px}.fit p{font-size:7pt}.fits{margin:calc(12px*var(--sp)) 0}.risks .tile p{font-size:6.9pt}
.moves{display:grid;grid-template-columns:1fr 1fr;gap:calc(11px*var(--sp)) 24px;margin:calc(9px*var(--sp)) 0 calc(14px*var(--sp))}.mv{display:flex;gap:10px;align-items:flex-start}.mn{flex:none;width:24px;height:24px;border-radius:50%;background:${C};color:#fff;font:600 10pt 'Playfair Display',serif;display:flex;align-items:center;justify-content:center}.mv p{font-size:7.8pt;color:${INK}}
.cm .card{padding:calc(10px*var(--sp)) calc(12px*var(--sp))}.cml{font-size:6.2pt;letter-spacing:.18em;color:${C};font-weight:700;margin-bottom:5px}.cm ul{list-style:none}.cm li{font-size:7.1pt;color:${GREY};margin:calc(3px*var(--sp)) 0;padding-left:13px;position:relative}.cm li:before{content:'';position:absolute;left:0;top:5px;width:8px;height:4px;border-radius:3px;background:${C}}.cm p{font-size:7.1pt}
.srcs{columns:4;column-gap:9px;font-size:calc(5pt*var(--s));line-height:1.25;color:${GREY}}.srcs div{break-inside:avoid;margin-bottom:2px}.srcs b{color:${C}}
.band{position:absolute;left:0;right:0;bottom:0;height:56mm;background:${C};color:#fff;overflow:hidden;padding:12mm 13mm 0}.bh{font:700 20pt/1.1 'Playfair Display',serif;max-width:78mm;color:#fff}.bs{font:600 7.4pt Inter;margin-top:8px}.bt2{position:absolute;right:13mm;top:12mm;width:68mm;text-align:right;font-size:7.8pt;color:#fff}.bi{position:absolute;right:13mm;top:27mm;font-size:6.6pt;opacity:.85}
.mount{position:absolute;left:0;right:0;bottom:0;width:100%}.bm{height:42mm}.copy{position:absolute;left:13mm;right:13mm;bottom:59mm;font-size:5.8pt;color:${MUTE}}
.cover{background:${C};color:#fff;padding:0}.ctop{display:flex;justify-content:space-between;padding:13mm 13mm 0}.ctile{background:${CLASH ? C : '#fff'};color:${CLASH ? '#fff' : WRWRED};border:${CLASH ? '1.6px solid #fff' : '0'};font:800 15px 'Playfair Display',serif;width:46px;height:34px;border-radius:9px;display:flex;align-items:center;justify-content:center}.cissue{font-size:6.2pt;letter-spacing:.2em;font-weight:700;text-align:right;line-height:1.7}
.ckick{position:absolute;left:13mm;top:61mm;font-size:6.6pt;letter-spacing:.22em;font-weight:700}.ccountry{position:absolute;left:12mm;top:66mm;font:800 72pt/1 'Playfair Display',serif}.csub{position:absolute;left:13mm;top:104mm;width:112mm;font:500 13pt/1.28 'Playfair Display',serif}
.crule{position:absolute;left:13mm;right:13mm;top:127mm;border-top:1px solid ${ACC_RULE}}.cvl{position:absolute;left:13mm;top:134mm;font-size:5.8pt;letter-spacing:.2em}.cverdict{position:absolute;left:13mm;top:141mm;width:170mm;font:700 17pt/1.26 'Playfair Display',serif;color:#fff}
.cstats{position:absolute;left:13mm;right:13mm;top:188mm;display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.cs{border-top:1px solid ${ACC_RULE};padding-top:8px}.csb{font:700 25pt/1 'Playfair Display',serif;margin-bottom:4px}.csl{font-size:6.4pt;line-height:1.4;max-width:46mm}
.cmount{position:absolute;left:0;right:0;bottom:12mm;width:100%;height:70mm}.cfoot{position:absolute;left:13mm;right:13mm;bottom:6mm;display:flex;justify-content:space-between;font-size:6.4pt}`;
const html = `<!doctype html><html><head><meta charset="utf-8"><title>Franchise Entry Report ${N} ${esc(D.country)}</title><style>${css}</style></head><body>${p1}${p2}${p3}${p4}${p5}${p6}${p7}</body></html>`;
fs.writeFileSync(outFile.replace(/\.pdf$/i, '.html'), html);

let browser; try { browser = await chromium.launch({ channel: 'chrome' }); } catch { browser = await chromium.launch(); }
const pg = await browser.newPage({ viewport: { width: 794, height: 1123 } });
await pg.setContent(html, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
await pg.evaluate(() => document.fonts.ready);
// each content page shrinks its own type until it fits; report any that still overflow
const fit = await pg.evaluate(() => [...document.querySelectorAll('.page:not(.cover)')].map(el => {
  let s = 1; const limit = () => { const kids = [...el.children].filter(c => !c.classList.contains('foot') && !c.classList.contains('sowhat') && !c.classList.contains('band') && !c.classList.contains('copy')); const last = kids[kids.length - 1]; const bottom = last ? last.getBoundingClientRect().bottom - el.getBoundingClientRect().top : 0; const stop = el.querySelector('.sowhat') ? el.querySelector('.sowhat').getBoundingClientRect().top - el.getBoundingClientRect().top - 6 : el.querySelector('.band') ? el.querySelector('.band').getBoundingClientRect().top - el.getBoundingClientRect().top - 16 : el.clientHeight - 34; return bottom - stop; };
  let sp = 1; for (let i = 0; i < 7 && limit() > 0; i++) { sp = +(sp - 0.07).toFixed(2); el.style.setProperty('--sp', sp); } // tighten the spacing first, a little
  for (let i = 0; i < 14 && limit() > 0; i++) { s = +(s - 0.03).toFixed(2); el.style.setProperty('--s', s); } // then, only if it still does not fit, the type
  if (s === 1 && sp === 1) for (let i = 0; i < 24; i++) { const n = +(sp + 0.06).toFixed(2); el.style.setProperty('--sp', n); if (limit() > -8) { el.style.setProperty('--sp', sp); break; } sp = n; }
  return { page: el.dataset.n, scale: s, spread: sp, over: Math.round(limit()) };
}));
fs.writeFileSync(outFile.replace(/\.pdf$/i, '.html'), await pg.content()); // the saved page is the fitted one, so previews match the PDF
await pg.pdf({ path: outFile, format: 'A4', printBackground: true, margin: { top: '0', right: '0', bottom: '0', left: '0' }, preferCSSPageSize: true });
await browser.close();
const pages = (fs.readFileSync(outFile, 'latin1').match(/\/Type\s*\/Page(?![a-z])/g) || []).length;
console.log(JSON.stringify({ out: outFile, pages, kb: Math.round(fs.statSync(outFile).size / 1024), fit }));
if (pages !== 7) { console.error(`the PDF has ${pages} pages, not 7`); process.exit(1); }
