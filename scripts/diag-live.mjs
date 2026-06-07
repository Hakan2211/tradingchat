// Live-session media diagnostic. Drives two Chromium instances (broadcaster
// with fake mic + auto screen-pick, viewer) and inspects the LiveKit room
// server-side to pinpoint where media stops flowing.
//   node scripts/diag-live.mjs
import { chromium } from 'playwright';
import { RoomServiceClient } from 'livekit-server-sdk';
import 'dotenv/config';

const BASE = 'http://localhost:3000';
const ROOM_ID = 'cmcdecc3q0000ucas05ae3vcx'; // "Main"
const BROADCASTER = { email: 'admin@yourapp.com', password: 'password123' };
const VIEWER = { email: 'viewer@local.test', password: 'password123' };

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

const svc = new RoomServiceClient(
  process.env.LIVEKIT_URL.replace(/^ws/, 'http'),
  process.env.LIVEKIT_API_KEY,
  process.env.LIVEKIT_API_SECRET
);

async function dumpRoomState(label) {
  try {
    const participants = await svc.listParticipants(ROOM_ID);
    log(`--- LiveKit room state: ${label} ---`);
    for (const p of participants) {
      log(
        `  participant ${p.name} (identity=${p.identity.slice(0, 8)}…) state=${p.state}`
      );
      for (const t of p.tracks) {
        log(
          `    track sid=${t.sid} type=${t.type} source=${t.source} muted=${t.muted} width=${t.width} height=${t.height} simulcast=${t.simulcast}`
        );
      }
      if (p.tracks.length === 0) log('    (no published tracks)');
    }
    if (participants.length === 0) log('  (no participants)');
  } catch (e) {
    log(`--- LiveKit room state: ${label} --- ERROR: ${e.message}`);
  }
}

async function login(page, { email, password }) {
  await page.goto(`${BASE}/login`);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.includes('login'), { timeout: 15000 });
}

const browser = await chromium.launch({
  headless: true,
  args: [
    '--use-fake-ui-for-media-stream',
    '--use-fake-device-for-media-stream',
    '--auto-select-desktop-capture-source=Entire screen',
    '--auto-accept-this-tab-capture',
  ],
});

// Pipe browser console errors through
function wirePage(page, name) {
  page.on('console', (msg) => {
    if (['error', 'warning'].includes(msg.type())) {
      const text = msg.text();
      // Skip noisy vite/react warnings
      if (/download the react devtools|vite/i.test(text)) return;
      log(`[${name} console.${msg.type()}]`, text.slice(0, 300));
    }
  });
  page.on('pageerror', (err) => log(`[${name} pageerror]`, String(err).slice(0, 300)));
  page.on('response', async (res) => {
    if (/live-session|live-token/.test(res.url())) {
      let body = '';
      try {
        body = (await res.text()).slice(0, 200);
      } catch {}
      log(`[${name} ${res.request().method()} ${res.url().split('/').pop()}] ${res.status()} ${body}`);
    }
  });
}

async function dumpPage(page, name) {
  const text = await page.evaluate(() => document.body.innerText.slice(0, 600));
  log(`[${name} page text]`, JSON.stringify(text));
}

try {
  // --- Broadcaster ---
  const ctxA = await browser.newContext({ permissions: ['microphone'] });
  const pageA = await ctxA.newPage();
  wirePage(pageA, 'broadcaster');
  await login(pageA, BROADCASTER);
  log('broadcaster logged in');
  // Force-stop any stale session (admin may end sessions they don't own)
  const cleanup = await pageA.request.post(`${BASE}/resources/live-session`, {
    form: { intent: 'stop', roomId: ROOM_ID },
  });
  log('pre-cleanup stop:', cleanup.status());
  await pageA.goto(`${BASE}/chat/${ROOM_ID}`);
  await pageA.getByRole('button', { name: /go live/i }).click();
  await pageA.getByRole('button', { name: /screen \+ mic/i }).click();
  log('clicked Screen + Mic');
  await pageA.waitForTimeout(4000);
  await dumpPage(pageA, 'broadcaster');
  await dumpRoomState('4s after Screen + Mic');

  // Wait for the stage / LiveKit connection, then start screen share
  await pageA.getByRole('button', { name: /share screen/i }).click({ timeout: 20000 });
  log('clicked Share screen');
  await pageA.waitForTimeout(5000);

  await dumpRoomState('after broadcaster goes live');

  // Check the broadcaster's local video
  const localVideo = await pageA.evaluate(() => {
    const v = document.querySelector('video');
    return v
      ? { videoWidth: v.videoWidth, videoHeight: v.videoHeight, paused: v.paused, readyState: v.readyState }
      : null;
  });
  log('broadcaster local <video>:', JSON.stringify(localVideo));

  // --- Viewer ---
  const ctxB = await browser.newContext();
  const pageB = await ctxB.newPage();
  wirePage(pageB, 'viewer');
  await login(pageB, VIEWER);
  log('viewer logged in');
  await pageB.goto(`${BASE}/chat/${ROOM_ID}`);
  await pageB.getByRole('button', { name: /^watch$/i }).click({ timeout: 15000 });
  log('viewer clicked Watch');

  // Give subscription time, then inspect
  for (const wait of [3000, 5000, 8000]) {
    await pageB.waitForTimeout(wait);
    const state = await pageB.evaluate(() => {
      const v = document.querySelector('video');
      const rect = v?.getBoundingClientRect();
      const audios = [...document.querySelectorAll('audio')].map((a) => ({
        paused: a.paused,
        muted: a.muted,
        readyState: a.readyState,
        srcObject: !!a.srcObject,
      }));
      return {
        bodyHasWaiting: document.body.innerText.includes('Waiting for'),
        video: v
          ? {
              videoWidth: v.videoWidth,
              videoHeight: v.videoHeight,
              paused: v.paused,
              readyState: v.readyState,
              srcObject: !!v.srcObject,
              displayed: rect
                ? { w: Math.round(rect.width), h: Math.round(rect.height), top: Math.round(rect.top) }
                : null,
              visible: rect ? rect.width > 50 && rect.height > 50 : false,
            }
          : null,
        audios,
      };
    });
    log('viewer state:', JSON.stringify(state));
    if (state.video?.videoWidth > 0) break;
  }

  await pageB.screenshot({ path: 'scripts/diag-viewer.png' });
  log('viewer screenshot saved to scripts/diag-viewer.png');

  await dumpRoomState('with viewer connected');

  // Check viewer's livekit connection state from the page (via injected probe)
  const rtcStats = await pageB.evaluate(async () => {
    // Find peer connections LiveKit created (exposed via RTCPeerConnection instances is not
    // directly possible; instead check WebRTC internals via getStats on video element track)
    const v = document.querySelector('video');
    if (!v || !v.srcObject) return 'no video srcObject';
    const track = v.srcObject.getVideoTracks()[0];
    return track
      ? { readyState: track.readyState, muted: track.muted, label: track.label }
      : 'no video track in srcObject';
  });
  log('viewer video MediaStreamTrack:', JSON.stringify(rtcStats));

  // --- cleanup: end session ---
  await pageA.getByRole('button', { name: /end session/i }).click().catch(() => {});
  await pageA.waitForTimeout(1500);
  log('session ended');
} finally {
  await browser.close();
}
