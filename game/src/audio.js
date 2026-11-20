// WebAudio-only sound: no audio files. A tiny synth engine builds engine hum,
// sirens, gunshots, pickup blips and a looping synthwave bassline from oscillators.
// Everything is created lazily on the first user gesture, and M toggles mute.
export function createAudio() {
  let ctx = null; let master = null; let muted = false; let unlocked = false;
  let engineOsc = null; let engineGain = null; let sirenOsc = null; let sirenGain = null;
  let musicTimer = 0; let musicStep = 0; let musicOn = false;
  // A minor-key synthwave bassline, one note per eighth at 112 BPM.
  const BASSLINE = [55, 0, 55, 65.41, 55, 0, 49, 58.27, 55, 0, 55, 65.41, 73.42, 0, 65.41, 58.27];

  function ensure() {
    if (!unlocked) return false;
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
      engineOsc = ctx.createOscillator(); engineOsc.type = 'sawtooth'; engineOsc.frequency.value = 50;
      engineGain = ctx.createGain(); engineGain.gain.value = 0; engineOsc.connect(engineGain); engineGain.connect(master); engineOsc.start();
      sirenOsc = ctx.createOscillator(); sirenOsc.type = 'sine'; sirenOsc.frequency.value = 700;
      sirenGain = ctx.createGain(); sirenGain.gain.value = 0; sirenOsc.connect(sirenGain); sirenGain.connect(master); sirenOsc.start();
      return true;
    } catch { return false; }
  }
  function blip(freq, dur, type, vol, slideTo) {
    if (!ensure() || muted) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.type = type || 'square'; osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    gain.gain.setValueAtTime(vol || 0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain); gain.connect(master); osc.start(t); osc.stop(t + dur + 0.02);
  }
  function noiseBurst(dur, vol, lowpass) {
    if (!ensure() || muted) return;
    const t = ctx.currentTime;
    const len = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource(); src.buffer = buffer;
    const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = lowpass || 1200;
    const gain = ctx.createGain(); gain.gain.value = vol || 0.25;
    src.connect(filter); filter.connect(gain); gain.connect(master); src.start(t);
  }

  return {
    unlock() { unlocked = true; ensure(); if (ctx && ctx.state === 'suspended') ctx.resume(); },
    toggleMute() { muted = !muted; if (master) master.gain.value = muted ? 0 : 0.5; return muted; },
    isMuted() { return muted; },
    shoot() { noiseBurst(0.12, 0.3, 3000); blip(220, 0.08, 'square', 0.12, 60); },
    punch() { noiseBurst(0.08, 0.2, 800); },
    crash() { noiseBurst(0.25, 0.35, 500); },
    pickup() { blip(660, 0.1, 'sine', 0.18); blip(990, 0.14, 'sine', 0.18); },
    cash() { blip(880, 0.08, 'sine', 0.16); blip(1174, 0.08, 'sine', 0.16); blip(1568, 0.16, 'sine', 0.16); },
    mission() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => blip(f, 0.16, 'triangle', 0.18), i * 90)); },
    busted() { [392, 311, 233].forEach((f, i) => setTimeout(() => blip(f, 0.3, 'sawtooth', 0.15), i * 160)); },
    setEngine(speed01, driving) {
      if (!ensure() || muted) { if (engineGain) engineGain.gain.value = 0; return; }
      engineOsc.frequency.value = 45 + speed01 * 140;
      engineGain.gain.setTargetAtTime(driving ? 0.05 + speed01 * 0.05 : 0.02, ctx.currentTime, 0.1);
    },
    setSiren(on, time) {
      if (!ensure()) return;
      if (!on || muted) { sirenGain.gain.value = 0; return; }
      sirenOsc.frequency.value = 650 + 250 * Math.sin(time * 5);
      sirenGain.gain.value = 0.045;
    },
    /** Advance the bassline; call once per frame with dt. */
    updateMusic(dt, playing) {
      if (!playing) { musicOn = false; return; }
      if (!ensure() || muted) return;
      musicTimer -= dt;
      if (musicTimer > 0) return;
      musicTimer += 60 / 112 / 2;
      const freq = BASSLINE[musicStep % BASSLINE.length];
      musicStep += 1; musicOn = true;
      if (freq > 0) {
        const t = ctx.currentTime;
        const osc = ctx.createOscillator(); const gain = ctx.createGain();
        osc.type = 'triangle'; osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.12, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
        osc.connect(gain); gain.connect(master); osc.start(t); osc.stop(t + 0.26);
      }
      if (musicStep % 16 === 8) blip(440, 0.2, 'sine', 0.05);
    },
  };
}
