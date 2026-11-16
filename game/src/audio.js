// SPDX-License-Identifier: MIT
// LUMEN BLOOM — synthesised sound. No audio files are shipped; every sound
// is built with the Web Audio API at run time. The context is created
// lazily on first use, so browsers that block autoplay never error.

export function createAudio() {
  let ctx = null;
  let master = null;
  let muted = false;
  let padStarted = false;

  function ensureCtx() {
    if (ctx) return ctx;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    } catch (e) {
      ctx = null;
    }
    return ctx;
  }

  function startPad() {
    if (padStarted || !ctx || !master) return;
    padStarted = true;
    const padGain = ctx.createGain();
    padGain.gain.value = 0.045;
    padGain.connect(master);
    const voices = [
      { freq: 110, type: 'triangle', detune: -4 },
      { freq: 164.81, type: 'triangle', detune: 0 },
      { freq: 220, type: 'sine', detune: 4 },
    ];
    for (const v of voices) {
      const osc = ctx.createOscillator();
      osc.type = v.type;
      osc.frequency.value = v.freq;
      osc.detune.value = v.detune;
      osc.connect(padGain);
      osc.start();
    }
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.02;
    lfo.connect(lfoGain);
    lfoGain.connect(padGain.gain);
    lfo.start();
  }

  function tone(freq, end, dur = 0.12, type = 'sine', vol = 0.2, slide = 0) {
    if (muted) return;
    const c = ensureCtx();
    if (!c || !master) return;
    const t = c.currentTime;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide !== 0) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
    } else if (end) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, end), t + dur);
    }
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(master);
    osc.start(t);
    osc.stop(t + dur);
  }

  function noise(dur = 0.2, vol = 0.25, cutoff = 400) {
    if (muted) return;
    const c = ensureCtx();
    if (!c || !master) return;
    const t = c.currentTime;
    const len = Math.max(1, Math.floor(c.sampleRate * dur));
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    }
    const src = c.createBufferSource();
    src.buffer = buf;
    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(master);
    src.start(t);
    src.stop(t + dur);
  }

  function unlock() {
    const c = ensureCtx();
    if (!c) return;
    if (c.state === 'suspended') c.resume();
    startPad();
  }

  function toggleMute() {
    muted = !muted;
    if (master) master.gain.value = muted ? 0 : 0.5;
    return muted;
  }

  function shoot() {
    tone(720, 0, 0.09, 'square', 0.08, -380);
  }

  function hit() {
    noise(0.14, 0.2, 1400);
    tone(220, 0, 0.14, 'sawtooth', 0.12, -160);
  }

  function pickup(combo) {
    const base = 520 + Math.min(combo, 8) * 60;
    tone(base, 0, 0.1, 'sine', 0.14);
    tone(base * 1.5, 0, 0.14, 'sine', 0.1);
  }

  function hurt() {
    noise(0.3, 0.3, 900);
    tone(160, 0, 0.35, 'sawtooth', 0.2, -120);
  }

  function wave() {
    tone(392, 0, 0.16, 'sine', 0.14);
    tone(523.25, 0, 0.2, 'sine', 0.14);
    tone(659.25, 0, 0.26, 'sine', 0.12);
  }

  function boss() {
    tone(98, 0, 0.6, 'sawtooth', 0.2, -49);
    noise(0.5, 0.18, 500);
  }

  function over() {
    const notes = [392, 311, 233, 175];
    notes.forEach((f, i) => {
      setTimeout(() => tone(f, 0, 0.4, 'sine', 0.14), i * 170);
    });
  }

  return {
    unlock,
    toggleMute,
    shoot,
    hit,
    pickup,
    hurt,
    wave,
    boss,
    over,
    get muted() {
      return muted;
    },
  };
}
