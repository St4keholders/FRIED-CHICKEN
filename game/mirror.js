// Copia del juego en el celular: genera la misma isla con la semilla, aplica los cambios del
// terreno y dibuja las fotos (snapshots) que manda el anfitrión, interpolando entre ellas.
import { Terrain } from './terrain.js';
import { Renderer } from './render.js';

const DELAY = 0.1;

function lerp(a, b, t) { return a + (b - a) * t; }
function lerpAng(a, b, t) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

export class MirrorView {
  constructor(container, quality, phone = true) {
    this.renderer = new Renderer(container, { quality: quality || 'normal', phone });
    this.snaps = [];
    this.terrain = null;
    this.clock = 0;
    this.init = null;
    this.fps = 60;
    this.fpsFrames = 0;
    this.fpsTimer = 0;
    this.lowFpsTime = 0;
    this.onFps = null;
    this.onLowFps = null;
  }

  // { seed, island, teams, chickens, edits }
  setInit(m) {
    this.init = m;
    this.terrain = new Terrain(m.seed, m.island);
    for (const e of m.edits || []) this.terrain.applyEdit(e);
    this.terrain.dirty.clear();
    this.renderer.setWorld(this.terrain, m.teams, m.chickens, { look: m.look });
    this.snaps = [];
  }

  edits(from, list) {
    if (!this.terrain) return true;
    if (from !== this.terrain.edits.length) return from > this.terrain.edits.length; // true = pedir todo de nuevo
    for (const e of list) this.terrain.applyEdit(e);
    return false;
  }

  snap(s) {
    s._t = this.clock;
    this.snaps.push(s);
    if (this.snaps.length > 6) this.snaps.shift();
  }

  fx(e) { this.renderer.fx(e); }

  view() {
    const n = this.snaps.length;
    if (!n) return null;
    const rt = this.clock - DELAY;
    let a = this.snaps[0], b = this.snaps[n - 1];
    for (let i = 0; i < n - 1; i++) if (this.snaps[i]._t <= rt && this.snaps[i + 1]._t >= rt) { a = this.snaps[i]; b = this.snaps[i + 1]; break; }
    const span = b._t - a._t;
    const t = span > 0 ? Math.max(0, Math.min(1, (rt - a._t) / span)) : 1;
    const chickens = b.ch.map((c, i) => {
      const p = a.ch[i] || c;
      const f = c[5];
      const meta = (this.init && this.init.chickens && this.init.chickens[i]) || {};
      return {
        id: i, x: lerp(p[0], c[0], t), y: lerp(p[1], c[1], t), z: lerp(p[2], c[2], t), yaw: lerpAng(p[3], c[3], t), hp: c[4],
        scale: meta.scale || 1, shield: meta.shield || false, boss: meta.boss || false,
        alive: !!(f & 1), air: !!(f & 2), walking: !!(f & 4), rope: f & 8 ? c[6] : null, jet: !!(f & 16), umbrella: !!(f & 32), dying: !!(f & 64), hurt: !!(f & 128), backflip: !!(f & 256),
      };
    });
    const prev = new Map(a.o.map((o) => [o[0], o]));
    const objs = b.o.map((o) => {
      const p = prev.get(o[0]) || o;
      return { id: o[0], kind: o[1], x: lerp(p[2], o[2], t), y: lerp(p[3], o[3], t), z: lerp(p[4], o[4], t), yaw: lerpAng(p[5], o[5], t), para: !!o[6], trig: !!o[7], trap: !!(o[7] && String(o[1]).startsWith('caja')), name: o[8] || '' };
    });
    return { chickens, objs, cam: b.cam, water: lerp(a.water, b.water, t), wind: b.w || [0, 0], phase: b.ph, turn: b.tv };
  }

  frame(dt) {
    this.clock += dt;
    this.fpsFrames++;
    this.fpsTimer += dt;
    if (this.fpsTimer >= 0.5) {
      this.fps = Math.round(this.fpsFrames / this.fpsTimer);
      this.fpsFrames = 0;
      this.fpsTimer = 0;
      if (this.onFps) this.onFps(this.fps);
    }
    if (this.renderer.quality !== 'ahorro' && this.fps > 0 && this.fps < 30) {
      this.lowFpsTime += dt;
      if (this.lowFpsTime >= 5.0) {
        this.lowFpsTime = 0;
        this.renderer.quality = 'ahorro';
        this.renderer.resize();
        if (this.onLowFps) this.onLowFps();
      }
    } else {
      this.lowFpsTime = 0;
    }
    const v = this.view();
    if (v && this.terrain) this.renderer.draw(v, dt);
    else this.renderer.draw({ chickens: [], objs: [], cam: { m: 'orbit' } }, dt);
  }

  dispose() { this.renderer.dispose(); }
}
