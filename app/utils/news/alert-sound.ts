/**
 * The alert ping.
 *
 * Synthesised with WebAudio rather than shipped as an mp3 — the app has no
 * audio assets and no pipeline for them, and a two-tone blip is a dozen lines
 * here versus a binary in `public/` that has to be sourced, licensed and
 * cache-busted.
 *
 * Browsers refuse to start an AudioContext outside a user gesture, so the
 * preference is a one-time explicit opt-in (roadmap §6): the click that turns
 * sound on is also the gesture that unlocks the context. The choice is
 * remembered in localStorage, but the UNLOCK is not persistable — after a
 * reload the context starts `suspended` again, so `ensureUnlocked` re-resumes
 * it on the next interaction with the page.
 */

const STORAGE_KEY = 'news.alertSound';

let audioContext: AudioContext | null = null;
let lastPingAt = 0;

/** Consecutive pings closer than this share one; a wire burst is not a siren. */
const MIN_PING_GAP_MS = 1500;

type WindowWithWebkit = Window & { webkitAudioContext?: typeof AudioContext };

function createContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor =
    window.AudioContext ?? (window as WindowWithWebkit).webkitAudioContext;
  if (!Ctor) return null;
  try {
    return new Ctor();
  } catch {
    return null;
  }
}

export function soundEnabled(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'on';
  } catch {
    // Private mode / storage disabled. Treat as off rather than crashing.
    return false;
  }
}

export function setSoundEnabled(on: boolean) {
  try {
    window.localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off');
  } catch {
    /* preference simply will not persist */
  }
}

/**
 * Turns sound on and unlocks audio. MUST be called synchronously from a click
 * handler — that is the whole point of it being a separate function.
 *
 * Returns false when the browser has no WebAudio at all, so the caller can say
 * so instead of leaving a switch that silently does nothing.
 */
export async function enableAlertSound(): Promise<boolean> {
  audioContext ??= createContext();
  if (!audioContext) return false;

  if (audioContext.state === 'suspended') {
    try {
      await audioContext.resume();
    } catch {
      return false;
    }
  }

  setSoundEnabled(true);
  // Confirm audibly. Also proves the unlock worked, which a silent toggle
  // cannot do — the user finds out at 09:31 otherwise.
  playAlertPing();
  return true;
}

export function disableAlertSound() {
  setSoundEnabled(false);
}

/**
 * Resume a context that a page reload left suspended. Cheap to call often;
 * bails immediately unless there is something to do.
 */
function ensureUnlocked() {
  audioContext ??= createContext();
  if (audioContext?.state === 'suspended') void audioContext.resume();
}

/**
 * Two short descending tones. Deliberately not a long chime: this fires during
 * the open, possibly several times a minute.
 */
export function playAlertPing() {
  if (!soundEnabled()) return;

  const now = Date.now();
  if (now - lastPingAt < MIN_PING_GAP_MS) return;

  ensureUnlocked();
  const ctx = audioContext;
  if (!ctx || ctx.state !== 'running') return;
  lastPingAt = now;

  const start = ctx.currentTime;
  for (const [index, frequency] of [880, 660].entries()) {
    const at = start + index * 0.12;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, at);
    // Ramped, not switched: an abrupt gain change clicks.
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.18, at + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.11);
    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start(at);
    oscillator.stop(at + 0.12);
  }
}
