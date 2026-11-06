/** New-order alert sound, made with the Web Audio API (no audio file).
 * Browsers only allow sound after a click, so the page has an "Activar
 * sonido" switch; the choice is remembered on this device. */

const KEY = "oms.orders.sound";

export function readSoundPreference(): boolean {
  try {
    return window.localStorage.getItem(KEY) === "on";
  } catch {
    return false;
  }
}

export function saveSoundPreference(on: boolean): void {
  try {
    window.localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    // Private mode or blocked storage: the switch just won't be remembered.
  }
}

let context: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) return null;
  context ??= new Ctor();
  return context;
}

/** Call from a click so the browser allows later sounds. */
export async function unlockSound(): Promise<boolean> {
  const ctx = audio();
  if (!ctx) return false;
  try {
    if (ctx.state === "suspended") await ctx.resume();
    return ctx.state === "running";
  } catch {
    return false;
  }
}

/** Two short rising tones. Returns false when the browser blocked it. */
export function playAlert(): boolean {
  const ctx = audio();
  if (!ctx || ctx.state !== "running") return false;
  const start = ctx.currentTime;
  [660, 880].forEach((frequency, index) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const at = start + index * 0.22;
    osc.type = "sine";
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.3, at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.2);
    osc.connect(gain).connect(ctx.destination);
    osc.start(at);
    osc.stop(at + 0.22);
  });
  return true;
}
