// La CPU: prueba tiros simulando la misma física del juego y elige el mejor
import { BOOM } from './match.js';
import { CHICKEN_H, weaponById } from './constants.js';
import { quote } from './voices.js';

const NOISE = [
  { yaw: 0.13, pitch: 0.17, power: 0.16 }, // fácil
  { yaw: 0.04, pitch: 0.06, power: 0.06 }, // normal
  { yaw: 0.012, pitch: 0.015, power: 0.015 }, // difícil
];
const wrap = (a) => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };

export class CpuBrain {
  constructor(match, level) {
    this.m = match;
    this.level = level;
    this.state = 'think';
    this.t = 0;
    this.plan = null;
    this.gen = null;
    this.best = null;
    this.walked = 0;
    this.r = Math.random;
  }

  begin() {
    this.state = 'think';
    this.t = 0;
    this.plan = null;
    this.best = null;
    this.walked = 0;
    this.gen = this.search();
    if (this.r() < 0.35) this.m.emit({ k: 'say', id: this.m.turn.ch, text: quote('cpu') });
  }

  me() { return this.m.activeChicken(); }
  enemies() {
    const me = this.me();
    const al = this.m.alliance(me.team);
    const foes = this.m.chickens.filter((c) => c.alive && this.m.alliance(c.team) !== al && !c.npc);
    if (this.m.story && this.m.story.level.goal === 'machines' && al === 'H') {
      const machs = this.m.objs.filter((o) => o.kind === 'maquinaLata' && !o.dead).map((o) => ({
        id: -o.id, x: o.x, y: o.y, z: o.z, hp: o.hp || 60, alive: true, team: -1,
      }));
      return machs.length ? machs : foes;
    }
    return foes;
  }

  // daño que haría una explosión en (x, y, z)
  scoreAt(x, y, z, b, mult = 1) {
    const me = this.me();
    const al = this.m.alliance(me.team);
    let s = 0;
    const RR = b.r * 1.55;
    for (const c of this.m.chickens) {
      if (!c.alive) continue;
      const d = Math.hypot(c.x - x, c.y + CHICKEN_H * 0.5 - y, c.z - z);
      if (d > RR) continue;
      let dmg = b.d * mult * (0.35 + 0.65 * (1 - d / RR));
      if (c.shield) {
        const dx = x - c.x, dz = z - c.z;
        const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw);
        if (dx * fx + dz * fz > 0.05) dmg = 0;
      }
      // cerca del agua el empujón vale más
      const nearWater = c.y < this.m.water + 1.6 ? 1.4 : 1;
      if (c === me) s -= dmg * 2.2;
      else if (this.m.alliance(c.team) === al) s -= dmg * 1.6;
      else s += Math.min(dmg, c.hp) * nearWater + (dmg >= c.hp ? 40 : 0);
    }
    if (this.m.story && this.m.story.level.goal === 'machines' && al === 'H') {
      for (const o of this.m.objs) {
        if (o.dead || o.kind !== 'maquinaLata') continue;
        const d = Math.hypot(o.x - x, o.y + 0.4 - y, o.z - z);
        if (d > RR) continue;
        const dmg = b.d * mult * (0.45 + 0.55 * (1 - d / RR));
        s += Math.min(dmg, o.hp || 60) * 1.6 + (dmg >= (o.hp || 60) ? 70 : 0);
      }
    }
    return s;
  }

  simShot(kind, yaw, pitch, power, fuse) {
    const me = this.me();
    const cp = Math.cos(pitch);
    const dir = { x: Math.sin(yaw) * cp, y: Math.sin(pitch), z: Math.cos(yaw) * cp };
    const sp = 5 + power * 21;
    const o = { kind, x: me.x + dir.x * 0.6, y: me.y + 0.75 + dir.y * 0.6, z: me.z + dir.z * 0.6, vx: dir.x * sp, vy: dir.y * sp, vz: dir.z * sp, src: me.id, fuse, age: 0, yaw: 0 };
    const dt = 1 / 30;
    for (let i = 0; i < 180; i++) {
      o.age += dt;
      const r = this.m.projStep(o, dt, { chickens: this.m.chickens });
      if (r === 'water') return null;
      if (r === 'hit' || r === 'fuse') return { x: o.x, y: o.y, z: o.z };
    }
    return null;
  }

  // búsqueda repartida en varios cuadros para no trabar el juego
  *search() {
    const m = this.m, me = this.me();
    const team = m.teams[me.team];
    const inv = team.inv;
    const has = (w) => inv[w] !== 0 && inv[w] !== undefined;
    const ens = this.enemies().sort((a, b) => Math.hypot(a.x - me.x, a.z - me.z) - Math.hypot(b.x - me.x, b.z - me.z)).slice(0, 3);
    let best = { score: -1e9 };
    const consider = (p) => { if (p.score > best.score) best = p; };
    const mult = team.dd ? 2 : 1;
    if (!ens.length) { this.best = { kind: 'skip', score: 0 }; return; }

    // cuerpo a cuerpo: la chancla cerca del agua es mortal
    for (const e of ens) {
      const d = Math.hypot(e.x - me.x, e.z - me.z);
      if (d < 1.35 && Math.abs(e.y - me.y) < 1.2) {
        const yaw = Math.atan2(e.x - me.x, e.z - me.z);
        const w = has('chancla') ? 'chancla' : 'picotazo';
        consider({ kind: 'melee', w, yaw, score: 30 * mult + (e.y < m.water + 4 ? 70 : 10) });
      }
    }
    // escopeta: línea directa
    for (const e of ens) {
      const dx = e.x - me.x, dy = e.y + 0.6 - (me.y + 0.75), dz = e.z - me.z;
      const d = Math.hypot(dx, dy, dz);
      if (d > 26) continue;
      const dir = { x: dx / d, y: dy / d, z: dz / d };
      const hit = m.ray(me.x, me.y + 0.75, me.z, dir, d - 0.4);
      if (!hit) consider({ kind: 'direct', w: 'escopeta', yaw: Math.atan2(dx, dz), pitch: Math.asin(dir.y), score: Math.min(50 * mult, e.hp + 30) * 0.9 });
    }
    yield;
    // tiros con parábola
    const weapons = ['bazuca', 'granada'];
    if (has('maiz') && this.level >= 1) weapons.push('maiz');
    if (has('oro') && this.level >= 1) weapons.push('oro');
    let count = 0;
    for (const w of weapons) {
      const b = BOOM[w];
      for (const e of ens) {
        const base = Math.atan2(e.x - me.x, e.z - me.z);
        const dyaws = e.shield ? [0, -0.12, 0.12, -0.25, 0.25, -0.4, 0.4] : [0, -0.07, 0.07, -0.16, 0.16];
        for (const dyaw of dyaws) {
          if (w !== 'bazuca' && Math.abs(dyaw) > 0.2) continue;
          for (let pitch = -0.25; pitch <= 1.35; pitch += 0.1) {
            for (let power = 0.3; power <= 1.001; power += 0.07) {
              const fuse = w === 'oro' ? 3 : 3;
              const hit = this.simShot(w, base + dyaw, pitch, power, fuse);
              if (hit) {
                let s = this.scoreAt(hit.x, hit.y, hit.z, b, mult);
                if (w === 'oro') s -= 25; // guardar el huevo de oro para algo bueno
                if (w === 'maiz') s = s * 1.1 - 10;
                consider({ kind: 'power', w, yaw: base + dyaw, pitch, power, fuse, score: s });
              }
              if (++count % 60 === 0) yield;
            }
          }
        }
      }
    }
    // ataques que eligen un punto
    if (this.level >= 1) {
      for (const e of ens) {
        const tx = e.shield ? e.x - Math.sin(e.yaw) * 1.6 : e.x;
        const tz = e.shield ? e.z - Math.cos(e.yaw) * 1.6 : e.z;
        if (has('palomas')) consider({ kind: 'target', w: 'palomas', x: tx, z: tz, score: this.scoreAt(tx, e.y + 0.5, tz, BOOM.regalo, mult) * 1.8 - 10 });
        if (has('guacamaya')) consider({ kind: 'target', w: 'guacamaya', x: tx, z: tz, score: this.scoreAt(tx, e.y + 0.4, tz, BOOM.guacamaya, mult) * 1.2 - 8 });
      }
    }
    this.best = best;
  }

  // cada cuadro: decide qué botones "aprieta" la CPU
  update(dt) {
    const m = this.m, T = m.turn, me = this.me();
    if (!T || !me || !me.alive) return;
    this.t += dt;
    const inp = { mx: 0, my: 0, fire: false, jumpHeld: false };
    if (m.phase === 'retreat') {
      // alejarse un poco del peligro
      if (this.state !== 'retreat') { this.state = 'retreat'; this.t = 0; this.retreatYaw = me.yaw + Math.PI + (this.r() - 0.5); }
      const d = wrap(this.retreatYaw - me.yaw);
      if (Math.abs(d) > 0.2) inp.mx = d > 0 ? -1 : 1;
      else if (this.t < 2.4 && this.safeAhead(me)) inp.my = 1;
      m.control(inp);
      return;
    }
    if (m.phase !== 'play') return;

    if (this.state === 'think') {
      const me = this.me();
      const al = this.m.alliance(me.team);
      if (this.m.story && this.m.story.level.goal === 'eggs' && al === 'H') {
        const eggs = this.m.objs.filter((o) => o.kind === 'cajaHuevo' && !o.dead);
        if (eggs.length) {
          const nearest = eggs.slice().sort((a, b) => Math.hypot(a.x - me.x, a.z - me.z) - Math.hypot(b.x - me.x, b.z - me.z))[0];
          if (this.walked < 4) {
            this.state = 'walk'; this.t = 0; this.walked++;
            this.walkYaw = Math.atan2(nearest.x - me.x, nearest.z - me.z);
            m.control(inp);
            return;
          }
          this.best = { kind: 'skip', score: 100 };
          this.startPlan(this.best);
          m.control(inp);
          return;
        }
      }
      // mientras piensa, gira hacia el enemigo más cercano
      const e = this.enemies()[0];
      if (e) { const d = wrap(Math.atan2(e.x - me.x, e.z - me.z) - me.yaw); if (Math.abs(d) > 0.3) inp.mx = d > 0 ? -0.6 : 0.6; }
      const step = this.gen && this.gen.next();
      if ((!step || step.done) && this.t > 1.2) {
        const b = this.best || { kind: 'skip', score: 0 };
        if (b.score < 8 && this.walked < 2 && this.enemies().length) {
          this.state = 'walk'; this.t = 0; this.walked++;
          const e2 = this.enemies().sort((a, c) => Math.hypot(a.x - me.x, a.z - me.z) - Math.hypot(c.x - me.x, c.z - me.z))[0];
          const ang = Math.atan2(e2.x - me.x, e2.z - me.z);
          this.walkYaw = e2.shield ? ang + (this.r() < 0.5 ? 1.1 : -1.1) : ang + (this.r() - 0.5) * 0.8;
        } else this.startPlan(b);
      }
      m.control(inp);
      return;
    }
    if (this.state === 'walk') {
      const d = wrap(this.walkYaw - me.yaw);
      if (Math.abs(d) > 0.15) inp.mx = d > 0 ? -1 : 1;
      else {
        inp.my = 1;
        if (me.ground && this.t > 0.3 && (Math.abs(me.vx) < 0.15 && Math.abs(me.vz) < 0.15)) {
          m.act({ t: 'jump' });
        }
      }
      if (this.t > 2.8 || T.clock < 10) { this.state = 'think'; this.t = 0; this.gen = this.search(); }
      m.control(inp);
      return;
    }
    const p = this.plan;
    if (!p) { m.control(inp); return; }
    if (this.state === 'select') {
      if (p.kind === 'skip') { m.act({ t: 'weapon', w: 'saltar' }); this.state = 'fire'; this.t = 0; m.control(inp); return; }
      m.act({ t: 'weapon', w: p.w });
      if (p.fuse) m.act({ t: 'fuse', v: p.fuse });
      if (p.kind === 'power' || p.kind === 'direct') m.act({ t: 'aim' });
      if (p.kind === 'target') T.cursor = { x: p.x, z: p.z };
      this.state = 'aim'; this.t = 0;
      m.control(inp);
      return;
    }
    if (this.state === 'aim') {
      if (p.kind === 'target') { if (this.t > 1.0) { this.state = 'fire'; this.t = 0; } m.control(inp); return; }
      const dy = wrap(p.yaw - me.yaw);
      const dp = (p.pitch || 0) - T.pitch;
      if (Math.abs(dy) > 0.03) inp.mx = Math.max(-1, Math.min(1, -dy * 4));
      else me.yaw = p.yaw;
      if (p.kind !== 'melee') { if (Math.abs(dp) > 0.02) inp.my = Math.max(-1, Math.min(1, dp * 4)); else T.pitch = p.pitch; }
      if ((Math.abs(dy) <= 0.03 && (p.kind === 'melee' || Math.abs(dp) <= 0.02) && this.t > 0.6) || this.t > 4) {
        me.yaw = p.yaw; if (p.pitch !== undefined) T.pitch = p.pitch;
        this.state = 'fire'; this.t = 0;
      }
      if (T.mode !== 'aim' && p.kind !== 'melee') { /* el modo apuntar ya se activó al elegir */ }
      m.control(inp);
      return;
    }
    if (this.state === 'fire') {
      if (p.kind === 'power') {
        inp.fire = T.power < p.power - 0.005 && this.t < 3;
        if (!inp.fire && this.t > 0.05) this.state = 'done';
      } else {
        inp.fire = this.t < 0.1;
        if (p.kind === 'direct' && this.t > 0.8 && T.shots < 2 && m.phase === 'play') { this.t = 0; inp.fire = true; }
        if (this.t > 0.2 && p.kind !== 'direct') this.state = 'done';
      }
      m.control(inp);
      return;
    }
    m.control(inp);
  }

  startPlan(b) {
    const n = NOISE[this.level] || NOISE[1];
    const g = () => (this.r() + this.r() - 1);
    const p = { ...b };
    if (p.yaw !== undefined) p.yaw += g() * n.yaw;
    if (p.pitch !== undefined) p.pitch += g() * n.pitch;
    if (p.power !== undefined) p.power = Math.max(0.2, Math.min(1, p.power + g() * n.power));
    if (p.kind === 'target') { p.x += g() * n.power * 10; p.z += g() * n.power * 10; }
    if (p.kind !== 'skip' && weaponById(p.w).id !== p.w) p.kind = 'skip';
    this.plan = p;
    this.state = 'select';
    this.t = 0;
  }

  safeAhead(me) {
    const x = me.x + Math.sin(me.yaw) * 1.2, z = me.z + Math.cos(me.yaw) * 1.2;
    const y = this.m.terrain.surfaceY(x, z);
    return y > this.m.water + 0.6 && me.y - y < 3;
  }
}
