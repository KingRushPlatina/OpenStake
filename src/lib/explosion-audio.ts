let audioContext: AudioContext | null = null;

function getAudioContext() {
  if (typeof window === "undefined") return null;
  if (!audioContext) {
    const Ctor =
      window.AudioContext ??
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    audioContext = new Ctor();
  }
  return audioContext;
}

/** Call from a real click so the browser lets the explosion audio play later. */
export function primeExplosionAudio() {
  const context = getAudioContext();
  if (context?.state === "suspended") void context.resume().catch(() => undefined);
}

function noiseBuffer(context: AudioContext, seconds: number) {
  const frames = Math.max(1, Math.floor(context.sampleRate * seconds));
  const buffer = context.createBuffer(1, frames, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < frames; index += 1) data[index] = Math.random() * 2 - 1;
  return buffer;
}

/** A layered blast: sharp crack, low body and a long rumble tail. */
export function playExplosionSound() {
  const context = getAudioContext();
  if (!context) return;
  if (context.state === "suspended") void context.resume().catch(() => undefined);

  const now = context.currentTime + 0.005;
  const master = context.createGain();
  master.gain.value = 0.58;
  const compressor = context.createDynamicsCompressor();
  compressor.threshold.value = -20;
  compressor.knee.value = 16;
  compressor.ratio.value = 10;
  compressor.attack.value = 0.002;
  compressor.release.value = 0.25;
  master.connect(compressor);
  compressor.connect(context.destination);

  const crackNoise = context.createBufferSource();
  crackNoise.buffer = noiseBuffer(context, 0.2);
  const crackFilter = context.createBiquadFilter();
  crackFilter.type = "highpass";
  crackFilter.frequency.setValueAtTime(900, now);
  const crackGain = context.createGain();
  crackGain.gain.setValueAtTime(0.0001, now);
  crackGain.gain.exponentialRampToValueAtTime(0.7, now + 0.008);
  crackGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
  crackNoise.connect(crackFilter);
  crackFilter.connect(crackGain);
  crackGain.connect(master);
  crackNoise.start(now);
  crackNoise.stop(now + 0.2);

  const bodyNoise = context.createBufferSource();
  bodyNoise.buffer = noiseBuffer(context, 1.15);
  const bodyFilter = context.createBiquadFilter();
  bodyFilter.type = "lowpass";
  bodyFilter.frequency.setValueAtTime(2400, now);
  bodyFilter.frequency.exponentialRampToValueAtTime(140, now + 0.8);
  bodyFilter.Q.value = 0.7;
  const bodyGain = context.createGain();
  bodyGain.gain.setValueAtTime(0.0001, now);
  bodyGain.gain.exponentialRampToValueAtTime(0.9, now + 0.02);
  bodyGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.05);
  bodyNoise.connect(bodyFilter);
  bodyFilter.connect(bodyGain);
  bodyGain.connect(master);
  bodyNoise.start(now);
  bodyNoise.stop(now + 1.15);

  const thump = context.createOscillator();
  thump.type = "sine";
  thump.frequency.setValueAtTime(115, now);
  thump.frequency.exponentialRampToValueAtTime(32, now + 0.55);
  const thumpGain = context.createGain();
  thumpGain.gain.setValueAtTime(0.0001, now);
  thumpGain.gain.exponentialRampToValueAtTime(0.9, now + 0.018);
  thumpGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);
  thump.connect(thumpGain);
  thumpGain.connect(master);
  thump.start(now);
  thump.stop(now + 0.95);

  const rumble = context.createBufferSource();
  rumble.buffer = noiseBuffer(context, 1.5);
  const rumbleFilter = context.createBiquadFilter();
  rumbleFilter.type = "lowpass";
  rumbleFilter.frequency.setValueAtTime(260, now);
  rumbleFilter.frequency.exponentialRampToValueAtTime(90, now + 1.4);
  const rumbleGain = context.createGain();
  rumbleGain.gain.setValueAtTime(0.0001, now);
  rumbleGain.gain.linearRampToValueAtTime(0.26, now + 0.18);
  rumbleGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.45);
  rumble.connect(rumbleFilter);
  rumbleFilter.connect(rumbleGain);
  rumbleGain.connect(master);
  rumble.start(now);
  rumble.stop(now + 1.5);
}
