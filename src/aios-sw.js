// The AIOS phone app's service worker (16 Nov 2026). It caches nothing: every page and every /api call goes
// straight to the office, so the phone never shows yesterday's work. Its one job is a plain page when the office
// cannot be reached (PC asleep or off, Tailscale off on the phone), instead of Chrome's error.
const OFFLINE = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Office unreachable</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#F4F3EE;color:#151414;font:16px/1.5 Inter,-apple-system,"Segoe UI",sans-serif}
main{max-width:22rem;padding:24px}h1{font:400 2rem/1.1 "Instrument Serif",Georgia,serif;margin:0 0 12px}li{margin:6px 0}
button{margin-top:16px;padding:12px 22px;border-radius:999px;border:0;background:#151414;color:#fff;font:inherit;letter-spacing:.12em;text-transform:uppercase}</style></head>
<body><main><h1>The office is not answering.</h1><ol><li>Is Tailscale on on this phone?</li><li>Is the PC awake? Telegram cannot wake it after a shutdown.</li><li>Is the office running on the PC (port 4520)?</li></ol>
<button onclick="location.reload()">Try again</button></main></body></html>`;
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  if (e.request.mode !== 'navigate') return; // API calls, streams and files go to the network untouched
  e.respondWith(fetch(e.request).catch(() => new Response(OFFLINE, { status: 503, headers: { 'content-type': 'text/html; charset=utf-8' } })));
});
