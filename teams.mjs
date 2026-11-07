// Agents Office — Agent Teams (V3.2 (16 Sep), 16 Sep 2026).
//
// A team task is one the department LEAD splits across its own desks: the lead plans the pieces,
// the teammates work them at the same time, each in its own Claude session with its own context,
// tools and skills, they leave notes for each other and for the lead, and the lead writes the
// finished deliverable from the pieces. Same shape as Claude Code's agent teams (lead · teammates
// · shared task list · messages) — built by the office, because Claude Code only spawns its own
// teammates in an interactive terminal, never in the headless `claude -p` runs the office makes
// (code.claude.com/docs/en/agent-teams, "Enable agent teams"). What runs here is real: one Claude
// process per teammate, in parallel, on your login.
//
//   intent(text)                 → the owner asked for a team in the sentence
//   planPrompt(...)              → the lead's planning call (Sonnet, JSON out)
//   parsePlan(text, …)           → the pieces, checked against the department's seats
//   teamSection(...)             → what a teammate is told about the team, its piece, the notes
//   parseMessages(text, ids)     → strip `@id: …` note lines off a piece; they go to the mailbox
//   synthPrompt(...)             → the lead's final call: pieces + notes → one deliverable
//   noteExtra(team, nameOf)      → the pieces and the notes, appended to the note in the brain
export const DEFAULTS = { enabled: true, max: 4 };

export function settings(cfg) {
  const t = { ...DEFAULTS, ...((cfg && cfg.teams) || {}) };
  t.enabled = t.enabled !== false;
  t.max = Math.min(6, Math.max(2, parseInt(t.max, 10) || DEFAULTS.max));
  return t;
}

// "as a team", "team up", "get the team on it", "spawn three teammates", "split it across the desks"
const INTENT = /\b(as a team|team up|team this|get the (whole )?team|the (whole )?team (on|to|should|can)|with the team|(spawn|use|get) (\d+|two|three|four|five|a few|some) teammates?|\d+ teammates|split (it|this|the work) (up|across|between)|teammates|team:|whole department)\b/i;
export const intent = text => INTENT.test(String(text || ''));

const num = { two: 2, three: 3, four: 4, five: 5, six: 6 };
export function askedSize(text) { // "spawn three teammates" → 3, else null
  const m = /\b(?:spawn|use|get|with)\s+(\d+|two|three|four|five|six)\s+teammates?\b/i.exec(String(text || ''));
  if (!m) return null; const n = num[m[1].toLowerCase()] || parseInt(m[1], 10); return Number.isFinite(n) ? n : null;
}

// RECIPES: a few jobs are a chain, not a set of parallel pieces (the video cannot be built before the script exists), so the
// lead plans them differently. A recipe changes how the plan is asked for and what the lead does in the final step.
export const RECIPES = [{
  name: 'content-plan', // Monday: plan the week AFTER this one. Research first, then the Lead writes the calendar.
  test: (dept, text) => dept === 'marketing' && /\[content-plan\]/i.test(text),
  plan: seats => {
    const r = seats.find(s => /research/i.test(s.name || '') || /research/i.test(s.role || ''));
    return `This is the weekly content PLAN, so follow your content-week skill. Plan exactly ONE piece, for ${r ? r.id : 'RESEARCH'}: refresh the idea bank and propose the core idea and the angle for each slot of the target week, from Wesley's own material (Plaud notes, the Google Calendar, the Brain) and what people in multi-site hospitality and franchising are asking this week. Do NOT plan any other piece: you write the calendar yourself in your final step, because the calendar needs the research first.`;
  },
  synth: 'FINAL STEP, follow your content-week skill now: using the research piece above, the content log and the Google Calendar, write the calendar for the target week (the week AFTER the current one, Monday to Sunday) into `20-Brand/content-calendar.md` as a BRAIN UPDATE (mode append, one section "## Week of <date>"). Fill every slot the skill asks for: brand, channel, format, the idea, owner desk, status "planned". List what only Wesley can supply. Do not draft the posts: the build run does that tomorrow. Keep it to one page.',
}, {
  name: 'content-build', // Tuesday: draft and build everything the calendar planned for next week.
  test: (dept, text) => dept === 'marketing' && /\[content-build\]/i.test(text),
  plan: seats => {
    const id = re => seats.find(s => re.test(`${s.name} ${s.role}`))?.id;
    return `This is the weekly content BUILD, so follow your content-week skill. Read the calendar section for the target week in 20-Brand/content-calendar.md. Plan one piece for each of these desks that has slots that week (skip a desk with none): LINKEDIN (${id(/linkedin/i) || 'ada'}) writes every LinkedIn post slot; INSTAGRAM ORGANIC (${id(/instagram/i) || 'iggy'}) writes the script, caption, hashtags and Build spec for every Instagram slot (Reels and carousels), following ig-reel-script; NEWSLETTER (${id(/newsletter/i) || 'newt'}) writes the Scaling Without Borders edition, following scaling-without-borders. Each piece text says exactly which slots (dates) it covers and quotes the calendar lines. Do NOT plan a Video Editor or Graphics Designer piece: you build the video and slides yourself in your final step from the Build specs.`;
  },
  synth: 'FINAL STEP, follow your content-week skill now: build every Reel and carousel the calendar planned for the target week yourself with video_build (the studio), from INSTAGRAM ORGANIC\'s Build specs word for word, in Wesley\'s voice (wesley) with the impact style; wait for each with video_job (wait_seconds 75, repeat); check each job and each draft against its slot. Then write ONE package for the week: for each slot in date order, its brand, channel and day, the finished file path(s) or the ready-to-paste text, caption and hashtags, and what was assumed. Mark every slot built or needs-Wesley in a BRAIN UPDATE that appends a status line per slot to the same week section of 20-Brand/content-calendar.md. Nothing is posted or scheduled by the office; Wesley posts everything himself from the Content Calendar folder. A row the calendar already marks `built` with files is reused, not rebuilt (unless this task says to rebuild it). A row that needs Wesley still gets the fallback built when the calendar names one, marked needs-Wesley. LAST, end your result with ONE machine-readable block that files everything into the Content Calendar folder, exactly in this shape and with nothing after it:\nCONTENT PACKAGE\nweek: <the Monday, YYYY-MM-DD>\n---\n[ {"day":"Mon 2 Nov","time":"07:45","account":"WRW Hospitality page","channel":"LinkedIn","format":"Teach post","text":"the finished post, ready to paste","caption":"","hashtags":"","files":[],"status":"drafted","notes":""}, ...one object for EVERY row of the week\'s calendar section, in date order ]\nEND CONTENT PACKAGE\nFor a Reel or carousel: put its caption and hashtags in caption and hashtags, and the full path of the MP4 or of each slide PNG in files; status built. For stories: text lists the prompts. For a row that needs Wesley: notes says exactly what, status needs-Wesley (and still give the best draft or fallback). Use real double quotes, escape any quote or line break inside a value, and write paths with doubled backslashes.',
}, {
  name: 'franchise-report',
  multi: true, // one researcher, four streams
  long: true,
  test: (dept, text) => dept === 'marketing' && /franchise entry report/i.test(text) && /issue\s*\d+/i.test(text),
  plan: seats => {
    const rs = seats.find(s => /research/i.test(s.name || '') || /research/i.test(s.role || ''));
    return `This is a Franchise Entry Report issue, so follow the franchise-entry-report skill and Wesley's method in 40-Marketing/franchise-entry-report-method.md. Plan exactly FOUR research pieces, all for ${rs ? rs.id : 'RESEARCH'} (the same desk four times is intended: they run at the same time), each a separate stream with web search, each opening the primary source for every figure and ending with a "Not found / gaps" list. Put this line in every piece: "Find pages with web search, then OPEN them with web_read (it reads web pages and PDFs as text; use its find option on a long PDF) and click through with web_links. Never guess a URL: take it from a search result or from web_links. A figure counts as sourced only when you opened the page or PDF that states it." The streams: (1) MARKET SNAPSHOT: population, GDP per head, food-service spend (and takeaway share), franchise count, consumer spending and confidence, currency and policy rate with the next decision date, how the country eats out (frequency, price level against the EU average, regional concentration), sector margins and the VAT position; (2) REGULATION AND COST: franchise law, trade mark fees and timing and whether an EU mark covers the country, food safety registration, alcohol licensing, halal and slaughter and supply rules, tax (VAT rates, corporate tax, royalty withholding and the UK treaty), company set-up, the collective agreement wage floor and holiday pay, employer contributions, pension and insurance, the wage engine for every 100 of pay, other blockers; (3) CATEGORIES PART 1: chicken, burger, pizza, kebab/grill and coffee, with dated unit counts for the main chains (say whether each is a store-locator count you made, a company report, press or a brand claim), an earlier count 2 to 4 years back, entries, exits and bankruptcies in the last 2 years, absent international brands; (4) CATEGORIES PART 2 AND ROUTES: bakery/dessert, bubble tea, fast casual, plant-based and one local category the data supports, how international brands actually entered (master franchise, area developer, direct, company-owned, with dates and failed exits), six sourced risks and the restaurant bankruptcy trend. Do NOT plan the final report as a piece: the lead assembles it from the four streams.`;
  },
  synth: 'FINAL STEP, follow your franchise-entry-report skill now: from the four research streams above, write the finished issue as ONE JSON object in the exact format of schema.md (between ISSUE JSON and END ISSUE JSON), then the caption, the BRAIN UPDATE log entry and what you assumed. Use only facts and source URLs the streams actually contain; never fill a gap with a guess: write Not found. Number the sources S1, S2... in the order first cited and list every cited source in days.sources with its name, title and date. Open the 3 to 5 figures the cover, headlines and position rest on and check them against the stream text. Use the country colour from the series README palette. Aim for about 4,000 words and at least 55 sources: if the streams cannot support that, say exactly what is short at the top of your covering note. The "If I had a brand" box is a DRAFT in Wesley\'s voice for his own rewrite. No emoji, no exclamation marks.',
}, {
  name: 'franchise-report-qa',
  multi: true, // one QA desk, three slices of the report
  long: true,
  test: (dept, text) => dept === 'delivery' && /franchise entry report/i.test(text) && /\b(qa|fact-?check|verif\w+)\b/i.test(text),
  plan: seats => {
    const qa = seats.find(s => /quality assurance|qa checker/i.test((s.name || '') + ' ' + (s.role || '')));
    return `This is a fact-check of a Franchise Entry Report issue, so follow the franchise-report-qa skill. The claims and the source list are in the Brain note named in the request (an "Upload - ... QA pack" note): name it in every piece. Plan exactly THREE pieces, all for ${qa ? qa.id : 'QA'} (the same desk three times is intended: they run at the same time), each checking a different slice of the claims in that note: (1) the COVER, PAGE 2 MARKET and PAGE 3 WHAT IS RISING AND FALLING sections; (2) PAGE 4 WHITE SPACE and PAGE 5 REGULATION AND COST; (3) PAGE 6 ROUTES AND RISKS and PAGE 7 NEXT 30 DAYS, plus recomputing every derived figure and the exchange rate in the whole report. Put this in every piece: "Read the QA pack note whole. Open every cited source with web_read (it reads pages and PDFs; use find on a long document), click through with web_links, and never guess a URL. Give each claim a verdict as the skill says: VERIFIED, NOT FOUND, CONTRADICTED, OVERSTATED or OUT OF DATE, with the page's own figure or a quote under 15 words. Cover and headline figures first. Do not edit or send anything." Do NOT plan the final: the lead compiles the three slices.`;
  },
  synth: 'FINAL STEP, follow your franchise-report-qa skill now: combine the three slices into ONE QA report. Start with the verdict (PASS, FIX THEN SEND or DO NOT SEND) and the counts (verified / not found / contradicted / overstated / out of date). Then "Must fix before publishing" (every contradicted, overstated, out of date, and any not found on a cover or headline figure, each with the correct figure and its source), then "Cannot confirm" (sources not opened and what was tried), then the full claim table. Do not soften a finding or add a verdict a slice did not earn. You report; you do not edit the issue.',
}, {
  name: 'art-of-operations-reel',
  test: (dept, text) => dept === 'marketing' && /art of operations/i.test(text) && /\b(reels?|clips?)\b/i.test(text) && !/\[content-(plan|build)\]/i.test(text),
  plan: seats => {
    const ig = seats.find(s => /instagram/i.test(s.name || '') || /instagram/i.test(s.role || ''));
    return `This is an Art of Operations reel, so follow your art-of-operations-reel skill. Plan exactly ONE piece, for ${ig ? ig.id : 'INSTAGRAM ORGANIC'}: its text is the owner's whole request plus "write the brief exactly as the art-of-operations-reel skill lists it: the reel number and grid row, the English maxim as 2 to 4 lines of at most 26 characters each with ONE key word in *asterisks*, the Chinese as 2 to 4 lines of at most 9 characters each with ONE key word in *asterisks* and a back-translation, the one-scene background prompt for the footage, the caption and the hashtags". Do NOT plan a Video Editor piece: the footage cannot be made before the brief exists. You make the footage and build the reel yourself in your final step.`;
  },
  synth: 'FINAL STEP, follow your art-of-operations-reel skill now: take the brief from the script piece above. First queue the background footage with ltx_submit_video (720p, 15 seconds, the brief\'s one-scene prompt) and note its job id. The footage takes about half an hour, so do NOT wait for it: immediately call aoo_reel_build with background_job set to that LTX job id, the row, the number, the English and Chinese lines word for word and NO music (the studio uses the series score, a Chinese lute with a bell on each transition, so every reel sounds the same). The studio waits for the footage, grades it, builds and renders the reel and sends it to Wesley on Telegram by itself. Then finish: write the post-ready package (the line, the Chinese and its back-translation, which needs a native review, the caption, the hashtags, what you assumed) and state the studio job id on its own line as job <id> and that the reel arrives on Telegram and is filed as Art of Operations - Reel N.mp4 only when Wesley approves it. Do not wait for the render and do not say it is merely queued without the job id.',
}, {
  name: 'reel-from-topic',
  test: (dept, text) => dept === 'marketing' && /\breels?\b/i.test(text) && !/\[content-(plan|build)\]/i.test(text),
  plan: seats => {
    const ig = seats.find(s => /instagram/i.test(s.name || '') || /instagram/i.test(s.role || ''));
    return `This is a topic Reel, so follow your reel-from-topic skill. Plan exactly ONE piece, for ${ig ? ig.id : 'INSTAGRAM ORGANIC'}: its text is the owner's whole request plus "write the script, the Build spec for the video (one line per card with ground, seconds and any spoken line, the style, the music sentence), the caption and the hashtags". Do NOT plan a Video Editor or Graphics Designer piece: pieces run at the same time and the video cannot be built before the script exists. You build the video yourself in your final step.`;
  },
  synth: 'FINAL STEP, follow your reel-from-topic skill now: take the Build spec from the script piece above, build the video yourself with video_build (the studio) using it word for word, wait for it with video_job (wait_seconds 75, repeat until done or failed), check it as the skill says, and write the post-ready package. Do not hand back a plan and do not say it is queued: the finished MP4 path is the deliverable. If the build fails, fix the spec once and retry once.',
}];
export const recipeFor = (dept, text) => RECIPES.find(r => r.test(dept, String(text || ''))) || null;

export function planPrompt({ business, deptName, lead, seats, text, title, max, notes, recipe }) {
  const system = `You are ${lead.name}, the lead of the ${deptName} department of ${business}. You are splitting one request across your team. ` +
    'Return ONLY a JSON object — no prose, no code fences.';
  const user = `Your team (id · name · role · what they do${seats.some(s => s.skills?.length) ? ' · skills' : ''}):\n` +
    seats.map(s => `- ${s.id}${s.lead ? ' (you, the lead)' : ''} · ${s.name} · ${s.role} · ${s.does}${s.skills?.length ? ' · skills: ' + s.skills.join(', ') : ''}`).join('\n') +
    `\n\nThe owner's request: "${text}"${title && title !== text ? `\n(Task title: ${title})` : ''}\n\n` +
    (notes ? `Company notes you may use to split it well:\n${notes}\n\n` : '') +
    (recipe ? recipe.plan(seats) + '\n' : `The owner asked for a TEAM, so split the request into 2 to ${max} INDEPENDENT pieces that can be done at the same time, each owned by a different desk whose job or skills fit it — never one piece. `) +
    (recipe ? '' : 'When the request is one job in parts (three angles, three emails, three sections), give each part to a different desk with the whole brief so the parts stay distinct; when it is one indivisible thing, give the making to one desk and a different lens to another (a check against the brand voice, the customer\'s view, the numbers, the risks). ' +
    'You may take one piece yourself. Do not invent work the owner did not ask for. Each piece\'s text is a complete instruction the teammate can act on alone, with what the owner said that matters to it.\n') +
    'Return: {"pieces":[{"agent":"<id>","title":"<imperative title, max 70 characters>","text":"<the instruction>"}],"why":"<one short sentence on how you split it>"}';
  return { system, user };
}

function parseJSON(text) {
  const s = String(text || '').replace(/```json|```/g, ''); const a = s.indexOf('{'), b = s.lastIndexOf('}');
  if (a < 0 || b < a) throw new Error('no JSON');
  return JSON.parse(s.slice(a, b + 1));
}

/** The lead's JSON → pieces on real seats. Unknown seats are dropped, a seat gets one piece
 *  (first wins), the count is capped at max. One valid piece → that desk does it (solo); none → the lead does it alone. */
export function parsePlan(text, { seats, lead, max = DEFAULTS.max, fallback = {}, multi = false }) {
  let j; try { j = parseJSON(text); } catch { j = {}; }
  const ids = new Set(seats.map(s => s.id));
  const pieces = [], taken = new Set();
  for (const p of Array.isArray(j.pieces) ? j.pieces : []) {
    const agent = String(p?.agent || '').trim(), t = String(p?.text || '').trim();
    if (!ids.has(agent) || (!multi && taken.has(agent)) || !t) continue; // multi: a recipe may give one desk several streams (Franchise Entry Report: four research streams, one researcher)
    taken.add(agent);
    pieces.push({ agent, title: String(p.title || t).trim().slice(0, 90), text: t.slice(0, multi ? 4000 : 2000) });
    if (pieces.length >= max) break;
  }
  if (pieces.length === 1) return { pieces, why: String(j.why || '').slice(0, 200), solo: true }; // the lead named one desk: that desk does it, the lead writes it up
  if (!pieces.length) return { pieces: [{ agent: lead.id, title: String(fallback.title || fallback.text || 'The task').slice(0, 90), text: String(fallback.text || '') }], why: '', solo: true };
  return { pieces, why: String(j.why || '').slice(0, 200), solo: false };
}

/** What a teammate reads about the team. `me` may be the lead taking a piece. */
export function teamSection({ me, lead, pieces, nameOf, piece = null, long = false }) {
  const mine = piece || pieces.find(p => p.agent === me.id);
  const others = pieces.filter(p => p !== mine && p.title !== mine?.title);
  const ids = [...new Set(['lead', ...pieces.map(p => p.agent)])].filter(x => x !== me.id);
  return 'TEAM\n' +
    `You are working as part of a team led by ${nameOf(lead.id)}${me.id === lead.id ? ' (you)' : ''}. Each teammate does one piece at the same time; the lead then writes the finished deliverable from all the pieces.\n` +
    `Your piece: ${mine ? mine.title : '(none)'}\n` +
    (others.length ? 'The other pieces, so you do not repeat them:\n' + others.map(p => `- ${nameOf(p.agent)}: ${p.title}`).join('\n') + '\n' : '') +
    'Do only your piece, completely. Write it as the finished thing, not a plan. ' + (long ? 'This is a research stream: give every figure with its value, date, source name and the URL you opened, and keep going until the stream is complete; length is not capped.\n' : 'At most 220 words unless a skill sets a shape.\n') +
    `To leave a note for a teammate or the lead (a fact they need, a clash, a question), end with one line per note in exactly this form: "@${ids[0] || 'lead'}: the note" — ids: ${ids.join(', ')}. Notes reach the lead before the final is written. No notes if none are needed.`;
}

/** Split `@id: …` lines off the end (or anywhere) of a piece. ids = who can be addressed; "lead" is always allowed. */
export function parseMessages(text, ids = []) {
  const ok = new Set([...ids, 'lead']);
  const messages = [], keep = [];
  for (const line of String(text || '').split('\n')) {
    const m = /^\s*@([A-Za-z0-9_-]+)\s*:\s*(.+?)\s*$/.exec(line);
    if (m && ok.has(m[1])) { messages.push({ to: m[1], text: m[2].slice(0, 400) }); continue; }
    keep.push(line);
  }
  return { body: keep.join('\n').replace(/\n{3,}/g, '\n\n').trim(), messages };
}

export function synthPrompt({ task, pieces, messages, nameOf, feedback, recipe }) {
  const parts = pieces.map(p => `--- ${nameOf(p.agent)} — ${p.title} ---\n${p.error ? '(could not complete: ' + (p.result || 'no result') + ')' : (p.result || '(empty)')}`).join('\n\n');
  const notes = (messages || []).length ? '\n\nNOTES THE TEAM LEFT\n' + messages.map(m => `- ${nameOf(m.from)} → ${m.to === 'lead' ? 'you' : nameOf(m.to)}: ${m.text}`).join('\n') : '';
  return `Task: ${task.title}\nOwner's request: ${task.text}\n\nYour team has done the pieces below. Write the finished deliverable from them: keep the substance, cut repetition, resolve any clash using the notes, and fill only what is plainly missing (mark it (assumed)). ` +
    'Plain text: a short heading, then short sections or bullets. At most 450 words unless a skill or the owner\'s instructions set a different shape — those win. ' +
    'End with one line: "Team: NAME did X · NAME did Y".' +
    (recipe ? `\n\n${recipe.synth}` : '') +
    `\n\nTHE PIECES\n${parts}${notes}` +
    (feedback ? (/^From the design audit, round \d/.test(feedback) // the graphics designer's send-back (designaudit.mjs), not the owner's
      ? `\n\nThe graphics designer audited the visuals in your previous version before the owner sees them and sent them back: "${feedback}"\nFix exactly those points (rebuild with the studio and look again), keep everything that was already right, never change a word or a figure, and do not mention the audit.`
      : `\n\nThe owner reviewed your previous version and asked for changes: "${feedback}"`) + `\nPrevious version:\n${task.result}` : '');
}

export function noteExtra(team, nameOf) {
  if (!team || !team.pieces?.length) return '';
  let s = '\n\n---\n## Team\n' + team.pieces.map(p => `- ${nameOf(p.agent)} (${p.agent}): ${p.title}${p.error ? ' — could not complete' : ''}`).join('\n');
  if (team.messages?.length) s += '\n\n### Notes between teammates\n' + team.messages.map(m => `- ${nameOf(m.from)} → ${m.to === 'lead' ? 'lead' : nameOf(m.to)}: ${m.text}`).join('\n');
  for (const p of team.pieces) s += `\n\n### ${nameOf(p.agent)} — ${p.title}\n${p.result || '(no result)'}`;
  return s;
}

/** Run fn over items with at most n in flight. */
export async function pool(items, n, fn) {
  const out = new Array(items.length); let i = 0;
  const worker = async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); } };
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, worker));
  return out;
}
