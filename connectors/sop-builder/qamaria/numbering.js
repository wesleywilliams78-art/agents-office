// Gap numbers are FIXED in gaps.js (id). This file checks every {{key}} used in the SOPs exists in the register,
// gives any new key without an id the next free number (and tells you to write it into gaps.js), and reports usage.
const fs = require('fs');
const GAPS = require('./gaps.js');
function load() {
  return fs.readdirSync(__dirname + '/sops').filter(f => /^sop\d+\.js$/.test(f)).sort()
    .map(f => ({ n: f.match(/\d+/)[0], c: require('./sops/' + f) }));
}
function number() {
  const sops = load(), map = {}, uses = {};
  let max = 0;
  for (const [k, g] of Object.entries(GAPS)) if (g.id) { map[k] = g.id; max = Math.max(max, +g.id.slice(1)); }
  const fresh = [];
  const use = (k, no) => {
    if (!GAPS[k]) throw new Error(`SOP ${no}: unknown gap key {{${k}}}. Add it to gaps.js first.`);
    if (!map[k]) { map[k] = 'G' + String(++max).padStart(2, '0'); fresh.push(k); }
    (uses[k] = uses[k] || new Set()).add(no);
  };
  for (const { c } of sops) {
    use('owner', c.no); use('contacts', c.no); // build_sop.js puts these two in every SOP
    for (const m of JSON.stringify(c).matchAll(/\{\{(\w+)\}\}/g)) use(m[1], c.no);
  }
  const open = Object.keys(uses).filter(k => !(GAPS[k].answer != null && GAPS[k].answer !== ''));
  return { map, uses, open, fresh, sops };
}
module.exports = { number, load };
if (require.main === module) {
  const { map, uses, open, fresh } = number();
  console.log(`${Object.keys(uses).length} gap keys used, ${open.length} still open (unanswered).`);
  if (fresh.length) console.log('NEW GAPS: write these ids into gaps.js so they never change:', fresh.map(k => `${k} = ${map[k]}`).join(', '));
}
