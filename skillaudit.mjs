// Skill audit (AIOS): which skills the office uses, which it does not, which are being refined, and whether the
// connectors a skill relies on are really wired to the seats that follow it. Pure functions over what the office
// already records (the task log, the lessons, the roster, the connector list) so it is cheap and testable.
import fs from 'node:fs';
import path from 'node:path';
import * as learn from './learn.mjs';

const DAY = 86400000;
const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const LIMIT = 6000;

// words a skill uses for a connector, and how to find that connector in /api/mcp
const WORDS = [
  ['ltx-local', /ltx[-_ ]local|ltx_submit_video|ltx_job|ltx_status|local video/i, s => s.id === 'ltx-local'],
  ['Canva', /\bcanva\b/i, s => s.key === 'canva'],
  ['Gmail', /\bgmail\b/i, s => s.key === 'gmail'],
  ['Google Drive', /google drive|drive tool/i, s => s.key === 'googledrive'],
  ['Google Calendar', /google calendar|calendar tool/i, s => s.key === 'googlecalendar'],
  ['Notion', /\bnotion\b/i, s => s.key === 'notion'],
  ['Plaud', /plaud/i, s => /plaud/i.test(s.name)],
  ['Higgsfield', /higgsfield/i, s => s.key === 'higgsfield'],
  ['OpusClip', /opusclip/i, s => /opusclip/i.test(s.name)],
  ['Chrome', /\bchrome\b/i, s => s.key === 'chrome'],
  ['WhatsApp', /whatsapp|openwa/i, s => s.key === 'whatsapp' || s.id === 'openwa'],
];

const hasTool = (agent, server) => (agent.tools || []).some(t => [server.key, server.name, server.id].some(x => x && norm(x) === norm(t)));

export function audit({ skills, agents, tasks, servers, brainPath, now = Date.now(), proposals = {} }) {
  const byId = new Map(agents.map(a => [a.id, a]));
  const seatsOf = s => agents.filter(a => s.everyone || s.agents.includes(a.id) || s.departments.includes(a.department));
  const out = [];
  for (const s of skills) {
    const seats = seatsOf(s), seatIds = new Set(seats.map(a => a.id));
    const house = !!s.everyone;
    const used = tasks.filter(t => (t.skills || []).includes(s.name));
    const uses = used.length, reworked = used.filter(t => t.revisions).length;
    const lastUsed = used.reduce((m, t) => Math.max(m, t.doneAt || t.addedAt || 0), 0);
    let mtime = 0; try { mtime = fs.statSync(s.path).mtimeMs; } catch {}
    const ageDays = mtime ? Math.floor((now - mtime) / DAY) : null;
    const chars = (s.text || '').length;

    // lessons the seats that follow this skill have been given: a sign the skill is not yet saying it all
    const lessons = [];
    if (!house) for (const a of seats) { const l = learn.read(brainPath, a.id); for (const r of [...l.rules, ...l.oneOffs]) lessons.push(`${a.name}: ${r.replace(/\s*←.*$/, '').slice(0, 150)}`); }

    // connectors the skill names: connected? wired to the seats that follow it? on their tool lists? ever used by them?
    const links = [];
    if (!house) for (const [label, re, pred] of WORDS) {
      if (!re.test(s.text || '') && !(s.files || []).some(f => re.test(f.text || ''))) continue;
      const srv = servers.find(pred);
      const link = { name: label, connected: false, wired: true, onSeats: true, usedByAgents: 0, lastUsedByAgents: 0, notes: [] };
      if (!srv) { link.notes.push('not connected on this machine'); links.push(link); continue; }
      link.connected = srv.status === 'connected' && srv.allowed !== false;
      if (srv.status !== 'connected') link.notes.push(`connector is ${srv.status}`);
      else if (srv.allowed === false) link.notes.push('blocked for agents in office.config.json');
      const miss = seats.filter(a => !(srv.depts || []).includes(a.department));
      if (miss.length) { link.wired = false; link.notes.push(`not wired to ${[...new Set(miss.map(a => a.department))].join(', ')}`); }
      const noTool = seats.filter(a => !hasTool(a, srv));
      if (seats.length && noTool.length === seats.length) { link.onSeats = false; link.notes.push(`${seats.map(a => a.name).join(', ')} ${seats.length > 1 ? 'do' : 'does'} not list it in tools`); }
      const keys = new Set([srv.key, srv.id].filter(Boolean));
      const hits = tasks.filter(t => seatIds.has(t.agent) && (t.used || []).some(u => keys.has(u)));
      link.usedByAgents = hits.length; link.lastUsedByAgents = hits.reduce((m, t) => Math.max(m, t.doneAt || t.addedAt || 0), 0);
      links.push(link);
    }

    // recommendations: what to do next to make this skill pull its weight
    const recs = [];
    const first = seats[0];
    const state = house ? 'house' : uses === 0 ? (ageDays !== null && ageDays < 7 ? 'new' : 'unused') : uses === 1 ? 'quiet' : uses < 5 ? 'active' : 'busy';
    if (!house) {
      if (state === 'unused') recs.push({ level: 'warn', text: `Never used since it was built${ageDays !== null ? ` ${ageDays} days ago` : ''}. Give ${first ? first.name : 'a seat'} a real task that fits "${(s.description || s.name).slice(0, 80)}", or merge it into a related skill, or retire it.` });
      if (state === 'new') recs.push({ level: 'idea', text: `Built ${ageDays === 0 ? 'today' : ageDays + ' day' + (ageDays === 1 ? '' : 's') + ' ago'} and not used yet. Give ${first ? first.name : 'a seat'} a first task so it has a track record.` });
      if (state === 'quiet') recs.push({ level: 'idea', text: `Used once. Check it matches how you actually ask for this work; if it never grows, fold it into a related skill.` });
      if (uses >= 4 && reworked / uses >= 0.25) recs.push({ level: 'warn', text: `Reworked on ${reworked} of ${uses} tasks (${Math.round(100 * reworked / uses)}%). Read the corrections and tighten the steps or the examples.` });
      if (lessons.length >= 2) recs.push({ level: 'warn', text: `${lessons.length} corrections recorded for the seats that follow it. Fold the lasting ones into the skill (say "fold the lessons into ${s.name}").` });
      else if (lessons.length === 1) recs.push({ level: 'idea', text: `1 correction recorded for these seats. If it will apply every time, make it a rule in the skill.` });
      for (const l of links) {
        if (l.usedByAgents > 0 && l.connected) { l.proven = true; continue; } // it has worked in real tasks: the wiring labels do not matter
        if (!l.connected) recs.push({ level: 'warn', text: `Relies on ${l.name} but it is not usable: ${l.notes.join('; ')}.` });
        else if (!l.wired) recs.push({ level: 'warn', text: `Relies on ${l.name}, which is ${l.notes.filter(n => /wired/.test(n)).join('; ')}, and no task has used it yet. Wire it in office.config.local.json.` });
        else if (!l.onSeats) recs.push({ level: 'idea', text: `${l.name} is connected and wired, but ${l.notes.find(n => /tools/.test(n))}. Add it to the seat's tools so the agent reaches for it.` });
        else recs.push({ level: 'idea', text: `${l.name} is connected, wired to these seats and on their tool list, but no agent task has used it yet. The link is set up; prove it with a test task.` });
      }
      if (chars > LIMIT * 0.87) recs.push({ level: 'idea', text: `${chars} of ${LIMIT} characters: near the limit. Move detail into a file beside the skill.` });
      if (!recs.length && uses >= 2) recs.push({ level: 'ok', text: 'Used, not being corrected, and its links work. Leave it.' });
    } else recs.push({ level: 'ok', text: `A house style: every seat follows it (${uses} task${uses === 1 ? '' : 's'}). Keep it short.` });

    out.push({
      name: s.name, description: s.description || '', source: s.source, house,
      seats: seats.map(a => ({ id: a.id, name: a.name })).slice(0, 12), seatCount: seats.length,
      uses, lastUsed, reworked, reworkRate: uses ? Math.round(100 * reworked / uses) : 0, ageDays, chars, state,
      lessonCount: lessons.length, lessons: lessons.slice(0, 4),
      links, recs, attention: recs.filter(r => r.level === 'warn').length, refining: !house && uses > 0 && (lessons.length > 0 || reworked > 0),
      proposal: proposals[s.name]?.text ? proposals[s.name] : null, // an actioned suggestion keeps only its history, so nothing is pending
      actioned: (proposals[s.name]?.history || []).length, lastActioned: (proposals[s.name]?.history || []).slice(-1)[0]?.doneAt || 0,
    });
  }
  const order = { warn: 0, idea: 1, ok: 2 };
  out.sort((a, b) => (b.attention - a.attention) || ((order[a.recs[0]?.level] ?? 3) - (order[b.recs[0]?.level] ?? 3)) || (b.uses - a.uses));
  const real = out.filter(x => !x.house);
  return { at: now, skills: out, summary: { total: out.length, unused: real.filter(x => x.state === 'unused').length, quiet: real.filter(x => x.state === 'quiet').length, newSkills: real.filter(x => x.state === 'new').length, attention: real.filter(x => x.attention).length, refining: real.filter(x => x.refining).length, linksNeverUsed: real.reduce((n, x) => n + x.links.filter(l => l.connected && l.wired && l.usedByAgents === 0).length, 0) } };
}

/** The prompt that asks Claude for a concrete revision of one skill, from the evidence the audit holds. Read-only: it proposes, the owner decides. */
export function proposalPrompt(item, skillText, reworkedTitles = []) {
  const system = 'You improve the written instructions ("skills") that AI agents follow in a small business office. You propose edits; you never apply them. Be concrete and short. Never invent facts about the business.';
  const user = `SKILL: ${item.name}\nWhat it is for: ${item.description}\nFollowed by: ${item.seats.map(s => s.name).join(', ') || 'no one'}\nUsed on ${item.uses} tasks; reworked on ${item.reworked}; last used ${item.lastUsed ? new Date(item.lastUsed).toISOString().slice(0, 10) : 'never'}.\n` +
    (item.lessons.length ? `\nCORRECTIONS THE OWNER HAS GIVEN THESE SEATS:\n${item.lessons.map(l => '- ' + l).join('\n')}\n` : '') +
    (reworkedTitles.length ? `\nTASKS THAT WERE SENT BACK:\n${reworkedTitles.slice(0, 6).map(l => '- ' + l).join('\n')}\n` : '') +
    (item.links.length ? `\nCONNECTORS IT NAMES: ${item.links.map(l => `${l.name} (${l.connected ? 'connected' : 'not connected'}, used by agents ${l.usedByAgents} times)`).join('; ')}\n` : '') +
    `\nAUDIT NOTES:\n${item.recs.map(r => '- ' + r.text).join('\n')}\n\nTHE SKILL AS WRITTEN NOW:\n"""\n${String(skillText).slice(0, 5500)}\n"""\n\n` +
    'Reply in this shape, plain text, under 250 words:\n1. The three changes that would help most, each as: the problem, then the exact replacement or added line to put in the skill.\n2. One thing to remove or shorten if there is any.\n3. One sentence on whether to keep, merge or retire the skill, and why.\nIf there is not enough evidence to improve it, say so and say what evidence to wait for.';
  return { system, user };
}

export const proposalsFile = dataDir => path.join(dataDir, 'skill-proposals.json');
export function loadProposals(dataDir) { try { return JSON.parse(fs.readFileSync(proposalsFile(dataDir), 'utf8').replace(/^﻿/, '')); } catch { return {}; } }
export function saveProposal(dataDir, name, text) { const p = loadProposals(dataDir); p[name] = { ...(p[name] || {}), text, at: Date.now() }; fs.mkdirSync(dataDir, { recursive: true }); fs.writeFileSync(proposalsFile(dataDir), JSON.stringify(p, null, 2)); return p[name]; }
/** The owner has done what the suggestion asked: it leaves the card, a line of history stays, and the skill can be audited and suggested for again as before. */
export function markProposalDone(dataDir, name) {
  const p = loadProposals(dataDir), cur = p[name];
  if (!cur?.text) return null;
  p[name] = { history: [...(cur.history || []), { text: cur.text, at: cur.at, doneAt: Date.now() }].slice(-20) };
  fs.mkdirSync(dataDir, { recursive: true }); fs.writeFileSync(proposalsFile(dataDir), JSON.stringify(p, null, 2)); return p[name];
}
