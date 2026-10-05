// A task that was running when the office stopped has no process behind it any more, and would sit at "doing" for ever.
// On start-up each one is put right: a task that was still on its first pass only reads and drafts, so it simply starts
// again; one that was already past the owner's OK is put back in front of the owner instead of being repeated,
// because its outbound step (a draft, a post) may or may not have gone through.
export function recover(list) {
  const requeue = [], held = [];
  for (const t of list) {
    if (t.state !== 'doing') continue;
    if (t.draft && t.waitingAt) {
      t.state = 'waiting';
      t.ask = `The office restarted while "${t.title}" was being carried out after your OK. Check whether it went through before you approve it again.`;
      held.push(t.id);
    } else {
      t.state = 'next'; delete t.ask;
      for (const p of t.team?.pieces || []) if (p.state === 'doing') p.state = 'next';
      requeue.push(t.id);
    }
  }
  return { requeue, held };
}
