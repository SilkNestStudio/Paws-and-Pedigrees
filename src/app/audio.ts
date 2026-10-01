/**
 * Small synthesised sounds so the game needs no audio files: the stop whistle,
 * the "Yes!" marker click, a throw, and a recall call.
 */
let context: AudioContext | null = null;
let muted = false;

function ctx(): AudioContext | null {
  if (muted) return null;
  try {
    context ??= new AudioContext();
    if (context.state === 'suspended') void context.resume();
    return context;
  } catch {
    return null;
  }
}

export function setMuted(value: boolean): void {
  muted = value;
}

function tone(
  freq: number,
  duration: number,
  type: OscillatorType,
  volume: number,
  slide = 0,
  vibrato = 0,
) {
  const ac = ctx();
  if (!ac) return;
  const now = ac.currentTime;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  if (slide) osc.frequency.linearRampToValueAtTime(freq + slide, now + duration);
  if (vibrato) {
    const lfo = ac.createOscillator();
    const depth = ac.createGain();
    lfo.frequency.value = 28;
    depth.gain.value = vibrato;
    lfo.connect(depth).connect(osc.frequency);
    lfo.start(now);
    lfo.stop(now + duration);
  }
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(volume, now + 0.02);
  gain.gain.setValueAtTime(volume, now + duration - 0.05);
  gain.gain.linearRampToValueAtTime(0, now + duration);
  osc.connect(gain).connect(ac.destination);
  osc.start(now);
  osc.stop(now + duration + 0.02);
}

/** One sharp blast on an acme-style whistle. */
export const playWhistle = () => tone(2850, 0.45, 'sine', 0.12, 0, 60);
/** The marker: a crisp click like a clicker. */
export const playMark = () => {
  tone(3400, 0.04, 'square', 0.08);
  setTimeout(() => tone(1700, 0.05, 'triangle', 0.06), 30);
};
export const playThrow = () => tone(320, 0.18, 'triangle', 0.08, -180);
/** "Here!": two short pips on the whistle. */
export const playRecall = () => {
  tone(2600, 0.12, 'sine', 0.1);
  setTimeout(() => tone(2600, 0.12, 'sine', 0.1), 170);
};
export const playCue = () => tone(520, 0.12, 'triangle', 0.06, 80);
