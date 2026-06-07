// Temporary E2E smoke test for the live-session feature. Run with:
//   node scripts/smoke-live.mjs
// Logs in as the seeded admin, loads the chat room, and exercises the
// live-session resource routes.

const BASE = 'http://localhost:3000';
const ROOM_ID = 'cmcdecc3q0000ucas05ae3vcx'; // "Main"
const EMAIL = 'admin@yourapp.com';
const PASSWORD = 'password123';

const jar = new Map();
function storeCookies(res) {
  const cookies = res.headers.getSetCookie?.() ?? [];
  for (const c of cookies) {
    const [pair] = c.split(';');
    const eq = pair.indexOf('=');
    jar.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
  }
}
function cookieHeader() {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
}
async function get(path, redirect = 'manual') {
  const res = await fetch(BASE + path, {
    redirect,
    headers: { cookie: cookieHeader() },
  });
  storeCookies(res);
  return res;
}

let failures = 0;
function check(label, ok, extra = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${extra ? ` — ${extra}` : ''}`);
  if (!ok) failures++;
}

// 1. Login page loads and gives us the CSRF token + honeypot fields
const loginPage = await get('/login', 'follow');
check('GET /login', loginPage.status === 200, `status ${loginPage.status}`);
const html = await loginPage.text();

// Collect every named input on the page (csrf, redirectTo, honeypot fields —
// honeypot inputs are visually hidden but not type="hidden").
const decode = (s) =>
  s
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#x27;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>');
const hidden = {};
for (const m of html.matchAll(/<input\b[^>]*>/g)) {
  const tag = m[0];
  const name = tag.match(/\bname="([^"]*)"/)?.[1];
  if (!name) continue;
  const type = tag.match(/\btype="([^"]*)"/)?.[1] ?? 'text';
  if (['email', 'password'].includes(name)) continue;
  if (['submit', 'checkbox'].includes(type)) continue;
  hidden[name] = decode(tag.match(/\bvalue="([^"]*)"/)?.[1] ?? '');
}
check('found csrf input', 'csrf' in hidden, Object.keys(hidden).join(','));

// 2. Log in as the seeded admin
const form = new URLSearchParams({ ...hidden, email: EMAIL, password: PASSWORD });
const loginRes = await fetch(BASE + '/login', {
  method: 'POST',
  redirect: 'manual',
  headers: {
    cookie: cookieHeader(),
    'content-type': 'application/x-www-form-urlencoded',
  },
  body: form.toString(),
});
storeCookies(loginRes);
check(
  'POST /login (admin)',
  loginRes.status === 302 && jar.has('__session-id'),
  `status ${loginRes.status}, cookies: ${[...jar.keys()].join(',')}`
);

// 3. Chat room SSR renders for the admin, including the Go Live button
const chat = await get(`/chat/${ROOM_ID}`, 'follow');
const chatHtml = await chat.text();
check('GET /chat/:roomId', chat.status === 200, `status ${chat.status}`);
check('SSR contains Go Live button', /Go Live/i.test(chatHtml));

// 4. live-token with no active session → 404
const tok404 = await get(`/resources/live-token?roomId=${ROOM_ID}`);
check('live-token w/o session → 404', tok404.status === 404, `status ${tok404.status}`);

// 5. Start a session. Without LiveKit env vars this must fail gracefully (503);
//    with env vars it should return ok.
async function postLiveSession(fields) {
  const res = await fetch(BASE + '/resources/live-session', {
    method: 'POST',
    headers: {
      cookie: cookieHeader(),
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(fields).toString(),
  });
  let body = null;
  try {
    body = await res.json();
  } catch {}
  return { status: res.status, body };
}

const start = await postLiveSession({ intent: 'start', roomId: ROOM_ID, mode: 'screen' });
const configured = start.status === 200 && start.body?.ok;
if (configured) {
  check('start live session', true);

  // Token now mints, admin can publish
  const tokRes = await get(`/resources/live-token?roomId=${ROOM_ID}`);
  const tok = await tokRes.json();
  check('live-token mints for broadcaster', tokRes.status === 200 && !!tok.token && tok.isBroadcaster === true);
  const payload = JSON.parse(Buffer.from(tok.token.split('.')[1], 'base64url').toString());
  check('broadcaster JWT canPublish', payload.video?.canPublish === true, JSON.stringify(payload.video));

  // Double-start conflicts
  const dupe = await postLiveSession({ intent: 'start', roomId: ROOM_ID, mode: 'screen' });
  check('second start → 409', dupe.status === 409, `status ${dupe.status}`);

  // App-layout loader exposes the live session (LIVE badge data)
  const home = await get('/home', 'follow');
  const homeHtml = await home.text();
  check('layout snapshot contains live session', homeHtml.includes(ROOM_ID) && homeHtml.includes('broadcasterId'));

  // Stop (idempotent)
  const stop = await postLiveSession({ intent: 'stop', roomId: ROOM_ID });
  check('stop live session', stop.status === 200 && stop.body?.ok, `status ${stop.status}`);
  const stop2 = await postLiveSession({ intent: 'stop', roomId: ROOM_ID });
  check('stop again (idempotent)', stop2.status === 200 && stop2.body?.ok);
} else {
  check(
    'start w/o LiveKit env → 503 + friendly error',
    start.status === 503 && /not configured/i.test(start.body?.error ?? ''),
    `status ${start.status}, body ${JSON.stringify(start.body)}`
  );
}

// 6. DM rooms are rejected (use a bogus id → "Invalid room" 400)
const bad = await postLiveSession({ intent: 'start', roomId: 'nonexistent-room', mode: 'screen' });
check(
  'invalid room rejected',
  bad.status === 400 || bad.status === 503,
  `status ${bad.status}, body ${JSON.stringify(bad.body)}`
);

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
