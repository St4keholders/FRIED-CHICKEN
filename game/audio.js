// Sonido 100% sintetizado: efectos, chillidos de pollito, coro del Huevo de Oro y música chiptune

const SONGS = [
  { // 0 · menú
    bpm: 128, key: 60, roots: [0, 5, 7, 5], q: ['M', 'M', 'M', 'M'],
    mel: '0 4 7 4 9 7 4 . | 5 9 12 9 7 . 5 . | 7 11 14 11 12 . 7 . | 9 7 5 4 2 . . .',
  },
  { // 1 · arenero
    bpm: 140, key: 62, roots: [0, 5, 0, 7], q: ['M', 'M', 'M', 'M'],
    mel: '7 . 7 9 7 4 . 2 | 5 . 5 7 5 2 . 0 | 4 7 9 12 11 9 7 4 | 2 4 2 . 7 . . .',
  },
  { // 2 · bañera
    bpm: 112, key: 65, roots: [0, 9, 5, 7], q: ['M', 'm', 'M', 'M'],
    mel: '12 . 11 . 9 . 7 . | 9 . 7 . 4 . 2 . | 5 7 9 . 12 . 9 . | 7 . . 4 2 . 0 .',
  },
  { // 3 · cocina
    bpm: 150, key: 60, roots: [0, 0, 5, 7], q: ['M', 'M', 'M', 'M'],
    mel: '0 0 7 0 9 0 7 . | 5 5 9 5 7 . 4 . | 0 4 7 12 11 7 9 . | 7 5 4 2 0 . . .',
  },
  { // 4 · juguetes
    bpm: 132, key: 64, roots: [0, 5, 3, 7], q: ['M', 'M', 'M', 'M'],
    mel: '4 7 12 7 4 7 11 . | 5 9 12 9 5 9 14 . | 3 7 10 7 12 10 7 . | 7 11 14 11 12 . . .',
  },
  { // 5 · billar
    bpm: 104, key: 57, roots: [0, -2, -4, -5], q: ['m', 'M', 'M', 'M'],
    mel: '0 . 3 5 7 . 10 . | 9 . 7 5 3 . 2 . | 0 3 7 . 8 7 5 . | 7 . 11 . 12 . . .',
  },
  { // 6 · castillo
    bpm: 120, key: 57, roots: [0, -4, -2, -5], q: ['m', 'M', 'M', 'M'],
    mel: '0 . 7 . 5 3 2 . | 3 . 8 . 7 5 3 . | 5 7 8 10 12 10 8 7 | 7 . 11 . 7 . . .',
  },
];
export const MENU_SONG = 0;

function parseMel(s) { return s.replace(/\|/g, ' ').split(/\s+/).filter(Boolean).map((t) => (t === '.' ? null : Number(t))); }
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

export class Audio {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.music = true;
    this.song = -1;
    this.timer = null;
  }

  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {}); return; }
    const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
    if (!AC) return;
    try {
      this.ctx = new AC();
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.5;
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.22;
      this.musicGain.connect(this.master);
      const len = this.ctx.sampleRate;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      // desbloqueo instantáneo en iOS: reproducir un buffer silencioso en el primer toque
      const osc = this.ctx.createBufferSource();
      osc.buffer = this.ctx.createBuffer(1, 1, 22050);
      osc.connect(this.ctx.destination);
      osc.start(0);
    } catch (e) { /* nada */ }
  }

  setMuted(m) { this.muted = m; if (this.master) this.master.gain.value = m ? 0 : 0.5; }

  tone(f, dur, type = 'square', vol = 0.2, slide = null, at = 0, dest = null) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + at;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(dest || this.master);
    o.start(t); o.stop(t + dur + 0.03);
  }

  noise(dur, vol = 0.2, freq = 3000, slide = null, at = 0, type = 'bandpass') {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + at;
    const s = this.ctx.createBufferSource(); s.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t);
    if (slide) f.frequency.exponentialRampToValueAtTime(slide, t + dur);
    const g = this.ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    s.connect(f); f.connect(g); g.connect(this.master);
    s.start(t); s.stop(t + dur + 0.03);
  }

  // chillido de pollito: unas sílabas agudas (pitch distinto por equipo)
  chirp(syll = 3, pitch = 1) {
    if (!this.ctx || this.muted) return;
    for (let i = 0; i < syll; i++) {
      const f = (900 + Math.random() * 500) * pitch;
      this.tone(f, 0.07, 'square', 0.06, f * (Math.random() < 0.5 ? 1.5 : 0.7), i * 0.085);
      this.tone(f * 2, 0.05, 'sine', 0.03, null, i * 0.085);
    }
  }

  boom(size = 2) {
    if (!this.ctx || this.muted) return;
    const k = Math.min(1.6, size / 2);
    this.noise(0.5 + k * 0.5, 0.5 * k, 900, 60, 0, 'lowpass');
    this.tone(110, 0.4 + k * 0.3, 'sine', 0.45 * k, 30);
    this.noise(0.12, 0.25, 3000, 800);
  }

  // coro "¡A-le-lu-yaaa!" con voces apiladas y vibrato
  aleluya() {
    if (!this.ctx || this.muted) return;
    const notes = [[67, 0.3], [72, 0.3], [76, 0.3], [79, 1.2]];
    let at = 0;
    for (const [n, d] of notes) {
      for (const off of [0, 4, 7, -12]) {
        const t = this.ctx.currentTime + at;
        const o = this.ctx.createOscillator(), g = this.ctx.createGain(), f = this.ctx.createBiquadFilter();
        const lfo = this.ctx.createOscillator(), lg = this.ctx.createGain();
        o.type = 'sawtooth'; o.frequency.value = mtof(n + off);
        lfo.frequency.value = 5.5; lg.gain.value = mtof(n + off) * 0.012;
        lfo.connect(lg); lg.connect(o.frequency);
        f.type = 'bandpass'; f.frequency.value = 900 + off * 30; f.Q.value = 2.5;
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05, t + 0.06); g.gain.setValueAtTime(0.05, t + d * 0.8); g.gain.exponentialRampToValueAtTime(0.0008, t + d + 0.1);
        o.connect(f); f.connect(g); g.connect(this.master);
        o.start(t); lfo.start(t); o.stop(t + d + 0.15); lfo.stop(t + d + 0.15);
      }
      at += d;
    }
  }

  sfx(name, arg) {
    if (!this.ctx || this.muted) return;
    switch (name) {
      case 'shoot': this.noise(0.25, 0.3, 1200, 300); this.tone(220, 0.2, 'square', 0.12, 90); break;
      case 'throw': this.noise(0.15, 0.18, 2500, 900); break;
      case 'shotgun': this.noise(0.3, 0.45, 2000, 200); this.tone(150, 0.15, 'square', 0.2, 60); break;
      case 'bounce': this.tone(320, 0.08, 'triangle', 0.15, 220); break;
      case 'boom': this.boom(arg); break;
      case 'splash': this.noise(0.8, 0.35, 2200, 300); this.tone(600, 0.25, 'sine', 0.1, 200, 0.05); break;
      case 'splashSmall': this.noise(0.35, 0.2, 2600, 500); break;
      case 'jump': this.tone(380, 0.14, 'square', 0.1, 760); break;
      case 'backflip': this.tone(300, 0.25, 'square', 0.1, 1100); break;
      case 'land': this.tone(160, 0.06, 'triangle', 0.08, 90); break;
      case 'thud': this.tone(120, 0.2, 'square', 0.2, 50); this.noise(0.15, 0.2, 600); break;
      case 'select': this.tone(880, 0.05, 'square', 0.08); break;
      case 'empty': this.tone(200, 0.12, 'square', 0.12, 150); break;
      case 'charge': this.tone(300, 1.4, 'triangle', 0.06, 900); break;
      case 'turn': [659, 784, 1046].forEach((f, i) => this.tone(f, 0.12, 'square', 0.1, null, i * 0.08)); break;
      case 'timeout': [440, 330, 220].forEach((f, i) => this.tone(f, 0.15, 'square', 0.12, null, i * 0.12)); break;
      case 'crate': this.tone(700, 0.4, 'sine', 0.08, 300); break;
      case 'pickup': [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, 0.08, 'square', 0.1, null, i * 0.05)); break;
      case 'heal': [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.14, null, i * 0.07)); break;
      case 'mine': [0, 0.25, 0.5, 0.75, 1.0, 1.15, 1.3, 1.45].forEach((at) => this.tone(1500, 0.06, 'square', 0.1, null, at)); break;
      case 'aleluya': this.aleluya(); break;
      case 'oroBoom': this.boom(4); this.tone(1046, 1.2, 'sine', 0.12, null, 0.05); break;
      case 'gallina': case 'cluck': for (let i = 0; i < (name === 'gallina' ? 4 : 2); i++) this.tone(500 + Math.random() * 200, 0.08, 'square', 0.1, 300, i * 0.1); break;
      case 'palomas': for (let i = 0; i < 6; i++) { this.noise(0.08, 0.15, 1500, null, i * 0.12); this.tone(420, 0.2, 'sine', 0.06, 380, i * 0.2); } break;
      case 'guacamaya': this.tone(1200, 0.25, 'sawtooth', 0.12, 700); this.tone(1400, 0.2, 'sawtooth', 0.1, 800, 0.25); break;
      case 'teleport': this.tone(400, 0.4, 'sine', 0.15, 2400); this.tone(2400, 0.4, 'sine', 0.1, 400, 0.15); break;
      case 'build': this.tone(200, 0.08, 'square', 0.15); this.tone(260, 0.08, 'square', 0.15, null, 0.1); this.tone(320, 0.1, 'square', 0.15, null, 0.2); break;
      case 'rope': this.tone(900, 0.2, 'triangle', 0.12, 300); break;
      case 'jet': this.noise(0.6, 0.2, 500, 1500); break;
      case 'jetoff': this.noise(0.3, 0.15, 900, 200); break;
      case 'fire': this.noise(0.4, 0.3, 700, 2500); this.tone(500, 0.2, 'sawtooth', 0.1, 1200); break;
      case 'chancla': this.noise(0.08, 0.6, 1800); this.tone(180, 0.1, 'square', 0.25, 90); break;
      case 'whoosh': this.noise(0.25, 0.15, 900, 2400); break;
      case 'drop': this.tone(260, 0.1, 'triangle', 0.15, 180); break;
      case 'sudden': [880, 660, 880, 660, 880, 660].forEach((f, i) => this.tone(f, 0.18, 'square', 0.12, null, i * 0.2)); break;
      case 'water': this.noise(1.2, 0.15, 400, 200, 0, 'lowpass'); break;
      case 'join': this.tone(660, 0.08, 'square', 0.12); this.tone(990, 0.12, 'square', 0.12, null, 0.08); break;
      case 'win': [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => this.tone(f, 0.18, 'square', 0.14, null, i * 0.12)); break;
      case 'lose': [392, 370, 349, 330].forEach((f, i) => this.tone(f, 0.35, 'square', 0.12, null, i * 0.3)); break;
      case 'react': this.tone(1200, 0.06, 'sine', 0.08, 1600); break;
      default: break;
    }
  }

  playSong(i) {
    if (!this.ctx || this.song === i) return;
    this.stopSong();
    this.song = i;
    const s = SONGS[i] || SONGS[0];
    const mel = parseMel(s.mel);
    const stepDur = 60 / s.bpm / 2;
    let step = 0;
    let next = this.ctx.currentTime + 0.1;
    const dest = this.musicGain;
    const tick = () => {
      if (!this.ctx) return;
      while (next < this.ctx.currentTime + 0.15) {
        const at = next - this.ctx.currentTime;
        const bar = Math.floor(step / 8) % 4;
        const root = s.key + s.roots[bar];
        const third = s.q[bar] === 'm' ? 3 : 4;
        const st = step % 8;
        const m = mel[step % mel.length];
        if (m !== null && m !== undefined) this.tone(mtof(s.key + 12 + m), stepDur * 1.5, 'square', 0.07, null, at, dest);
        this.tone(mtof(root + [0, third, 7, 12][st % 4]), stepDur * 0.8, 'triangle', 0.06, null, at, dest);
        if (st % 2 === 0) this.tone(mtof(root - 24 + (st === 4 ? 7 : 0)), stepDur * 1.7, 'triangle', 0.15, null, at, dest);
        if (st % 4 === 0) this.tone(150, 0.12, 'sine', 0.25, 45, at, dest);
        step++;
        next += stepDur;
      }
    };
    tick();
    this.timer = setInterval(tick, 40);
  }

  stopSong() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.song = -1;
  }
}
