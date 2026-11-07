// At a glance (Wesley, 7 Nov 2026): every result opens with three lines, what the desk reviewed, what it built and what it
// recommends. The office lifts the block out of the result; the review card shows only those lines, the decision switches,
// REJECT and APPROVE, and the full result is one click away ("Show the full result").

export const INSTRUCTIONS = 'AT A GLANCE\n' +
  'Start every result with this block, before anything else. The owner reads only these three lines on the review card and approves or rejects from them; the full result is one click away.\n' +
  'AT A GLANCE\nreviewed: <what you read or checked to do this>\nbuilt: <what you made or changed, and where it is>\nrecommend: <what the owner should do with it, and why>\nEND AT A GLANCE\n' +
  'One line each, plain words, under 160 characters, no markdown. Never say something was sent, posted or done when it was not.';

const BLOCK = /^[ \t]*AT A GLANCE[ \t]*\r?\n([\s\S]*?)\r?\n[ \t]*END AT A GLANCE[ \t]*$/gm;
const FENCE = t => String(t || '').replace(/```[a-z]*[ \t]*\r?\n(?=[ \t]*AT A GLANCE[ \t]*\r?\n)/g, '').replace(/(END AT A GLANCE)[ \t]*\r?\n[ \t]*```/g, '$1');

// { glance: { reviewed, built, recommend } | null, text: the result without the block }
export function take(text) {
  const t = FENCE(text); let glance = null;
  for (const m of t.matchAll(BLOCK)) {
    const g = {};
    for (const line of m[1].split(/\r?\n/)) { const k = /^\s*[-*]?\s*\**(reviewed|built|recommend)\**\s*:\s*(.*)$/i.exec(line); if (k) g[k[1].toLowerCase()] = k[2].trim().slice(0, 300); }
    if (g.reviewed || g.built || g.recommend) { glance = { reviewed: g.reviewed || '', built: g.built || '', recommend: g.recommend || '' }; break; }
  }
  return { glance, text: glance ? t.replace(BLOCK, '').replace(/^\s+/, '').replace(/\n{3,}/g, '\n\n') : String(text || '') };
}
