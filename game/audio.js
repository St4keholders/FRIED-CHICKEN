// game/audio.js - Complete procedural sound effects and chiptune music synthesized with Web Audio API

class SoundSystem {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.musicPlaying = null;
    this.musicTimer = null;
    this.masterGain = null;
  }

  init() {
    if (this.ctx || typeof window === 'undefined') return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.5, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);
  }

  ensureContext() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : 0.5, this.ctx.currentTime);
    }
  }

  playExplosion(volume = 1.0) {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.5;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, t);
    filter.frequency.exponentialRampToValueAtTime(40, t + 0.45);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume * 0.8, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(t);
    noise.stop(t + 0.5);
  }

  playBounce() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(540, t + 0.12);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  playJump() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(240, t);
    osc.frequency.exponentialRampToValueAtTime(480, t + 0.15);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.16);
  }

  playShoot() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(350, t);
    osc.frequency.exponentialRampToValueAtTime(90, t + 0.12);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.14);
  }

  playSplash() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.4;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, t);
    filter.frequency.exponentialRampToValueAtTime(400, t + 0.35);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start(t);
    noise.stop(t + 0.4);
  }

  playHolyChoir() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    // Synthesize "A-le-lu-yaaa!" 3-note harmonic choir
    const notes = [
      { f: 440, t0: 0, dur: 0.35 },    // A4 (A-)
      { f: 554.37, t0: 0.35, dur: 0.35 }, // C#5 (-le-)
      { f: 659.25, t0: 0.7, dur: 0.35 },  // E5 (-lu-)
      { f: 880, t0: 1.05, dur: 1.2 },    // A5 (-yaaa!)
    ];

    const baseTime = this.ctx.currentTime;
    for (const note of notes) {
      const osc = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(note.f, baseTime + note.t0);
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(note.f * 1.005, baseTime + note.t0); // slight detune

      const start = baseTime + note.t0;
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.25, start + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, start + note.dur);

      osc.connect(gain);
      osc2.connect(gain);
      gain.connect(this.masterGain);

      osc.start(start);
      osc2.start(start);
      osc.stop(start + note.dur + 0.05);
      osc2.stop(start + note.dur + 0.05);
    }
  }

  playTrigger(name) {
    if (name === 'shoot_bazuca' || name === 'shoot_shotgun') this.playShoot();
    else if (name === 'throw_grenade') this.playBounce();
    else if (name === 'punch_fire' || name === 'slap_chancla') this.playShoot();
    else if (name === 'hallelujah_choir') this.playHolyChoir();
    else if (name === 'water_splash') this.playSplash();
    else if (name === 'jump') this.playJump();
    else if (name === 'click') this.playBounce();
  }

  // Chiptune Music Sequencer
  startMusic(track = 'menu') {
    if (this.musicPlaying === track) return;
    this.stopMusic();
    this.ensureContext();
    if (!this.ctx) return;

    this.musicPlaying = track;

    // Melody sequences [frequency, durationInBeats]
    const tracks = {
      menu: [
        [523.25, 1], [659.25, 1], [783.99, 1], [659.25, 1],
        [880.00, 2], [783.99, 2],
        [698.46, 1], [659.25, 1], [587.33, 1], [523.25, 1],
        [587.33, 2], [783.99, 2],
      ],
      battle: [
        [440.00, 0.5], [440.00, 0.5], [523.25, 1],
        [587.33, 1], [659.25, 1],
        [783.99, 0.5], [659.25, 0.5], [587.33, 1],
        [523.25, 1], [440.00, 1],
      ],
      boss: [
        [220.00, 0.5], [220.00, 0.5], [246.94, 0.5], [261.63, 0.5],
        [220.00, 1], [196.00, 1],
        [220.00, 0.5], [329.63, 1], [293.66, 0.5],
        [261.63, 1], [246.94, 1],
      ],
    };

    const notes = tracks[track] || tracks.menu;
    const bpm = track === 'boss' ? 140 : 124;
    const beatSec = 60 / bpm;

    let step = 0;
    const playNext = () => {
      if (this.musicPlaying !== track || !this.ctx || this.muted) {
        if (this.musicPlaying === track) {
          this.musicTimer = setTimeout(playNext, 500);
        }
        return;
      }

      const [freq, beats] = notes[step % notes.length];
      const dur = beats * beatSec;
      const t = this.ctx.currentTime;

      // Lead voice
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'pulse' in osc ? 'pulse' : 'square';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur * 0.9);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + dur);

      // Bass voice (1 octave lower)
      const bass = this.ctx.createOscillator();
      const bassGain = this.ctx.createGain();
      bass.type = 'triangle';
      bass.frequency.setValueAtTime(freq * 0.5, t);
      bassGain.gain.setValueAtTime(0.1, t);
      bassGain.gain.exponentialRampToValueAtTime(0.001, t + dur * 0.85);

      bass.connect(bassGain);
      bassGain.connect(this.masterGain);
      bass.start(t);
      bass.stop(t + dur);

      step++;
      this.musicTimer = setTimeout(playNext, dur * 1000);
    };

    playNext();
  }

  stopMusic() {
    this.musicPlaying = null;
    if (this.musicTimer) {
      clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
  }
}

export const sound = new SoundSystem();
