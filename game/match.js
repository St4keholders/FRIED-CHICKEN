// Simulación autoritativa de una partida: turnos, física de pollitos, armas, objetos y victoria.
// Corre solo en el anfitrión; los celulares reciben fotos (snapshots) y cambios del terreno.
import { Terrain, rng } from './terrain.js';
import { VOX, NX, NZ, WORLD_X, WORLD_Z, GRAVITY, PROJ_GRAVITY, CHICKEN_R, CHICKEN_H, RETREAT_TIME, WEAPONS, weaponById, startAmmo } from './constants.js';
import { quote } from './voices.js';

const R = CHICKEN_R, H = CHICKEN_H;
const WALK = 2.6, TURN = 2.6, AIM_TURN = 0.65, PITCH_SPEED = 0.5;
const MAX_POWER_TIME = 1.5;

// parámetros de las explosiones de cada arma
const BOOM = {
  bazuca: { r: 2.1, d: 50 }, granada: { r: 2.1, d: 50 }, maiz: { r: 1.6, d: 25 }, pop: { r: 1.3, d: 18 },
  oro: { r: 4.4, d: 100 }, regalo: { r: 1.7, d: 30 }, guacamaya: { r: 2.2, d: 55 }, vela: { r: 2.6, d: 70 },
  mina: { r: 2.0, d: 45 }, gallina: { r: 3.0, d: 75 }, barril: { r: 2.6, d: 45 }, cajaArma: { r: 2.0, d: 30 },
  escopeta: { r: 0.9, d: 25 }, muerte: { r: 1.3, d: 15 },
};
const WIND_K = { bazuca: 7, regalo: 7, pop: 2 };
const BOUNCE = { granada: 0.45, maiz: 0.45, pop: 0.4, oro: 0.25 };

let uid = 1;

export class Match {
  // teams: [{ id, name, color, dark, acc, cpu (null | 0..2), slots: [], alliance, names: [] }]
  constructor({ cfg, teams, seed, island }) {
    this.cfg = cfg;
    this.seed = seed;
    this.island = island;
    this.terrain = new Terrain(seed, island);
    this.theme = this.terrain.theme;
    this.water = this.theme.waterVox * VOX + 0.15;
    this.wind = { x: 0, z: 0 };
    this.time = 0;
    this.sudden = false;
    this.fx = []; // eventos de una vez (explosiones, daño, frases, sonidos)
    this.objs = [];
    this.over = null;
    this.r = rng(seed ^ 0xabcdef);
    this.stats = {};
    this.teams = teams.map((t, i) => ({ ...t, idx: i, next: 0, turns: 0, inv: startAmmo(cfg.weaponSet), dd: false }));
    for (const t of this.teams) this.stats[t.id] = { dmg: 0, self: 0, drown: 0, kills: 0 };
    // aparecer pollitos
    const per = cfg.chickens;
    const sp = this.terrain.spawnPoints(this.teams.length * per + 8, 7);
    this.chickens = [];
    let n = 0;
    // repartir: cada equipo toma puntos alternados para que queden mezclados
    for (let c = 0; c < per; c++) for (const t of this.teams) {
      const p = sp[n++] || { x: WORLD_X / 2 + (this.r() - 0.5) * 10, y: 20, z: WORLD_Z / 2 + (this.r() - 0.5) * 10 };
      this.chickens.push({
        id: this.chickens.length, team: t.idx, name: t.names[c] || `Pollito ${c + 1}`,
        x: p.x, y: p.y, z: p.z, vx: 0, vy: 0, vz: 0, yaw: this.r() * Math.PI * 2,
        hp: cfg.hp, alive: true, ground: false, air: true, knock: false, peakY: p.y, walk: 0,
        dying: 0, rope: null, jet: 0, umbrella: false, hurtT: 0,
      });
    }
    // barriles y minas del mapa
    for (let b = 0; b < 4 && n < sp.length; b++) this.addObj({ kind: 'barril', x: sp[n].x, y: sp[n].y, z: sp[n++].z, hp: 1 });
    for (let b = 0; b < 3 && n < sp.length; b++) this.addObj({ kind: 'mina', x: sp[n].x, y: sp[n].y, z: sp[n++].z, armed: 1, t: 0 });
    this.teamOrder = this.teams.map((t) => t.idx);
    this.turnTeam = -1;
    this.turn = null;
    this.phase = 'between';
    this.phaseT = 2.2; // espera inicial antes del primer turno
    this.lastBoom = null;
    this.camOverride = null;
  }

  // ---------------- utilidades ----------------
  addObj(o) {
    o.id = uid++;
    o.vx = o.vx || 0; o.vy = o.vy || 0; o.vz = o.vz || 0; o.yaw = o.yaw || 0; o.t = o.t || 0; o.age = 0;
    this.objs.push(o);
    return o;
  }
  emit(e) { this.fx.push(e); }
  say(ch, kind, text) { this.emit({ k: 'say', id: ch.id, text: text || quote(kind) }); }

  boxSolid(x0, y0, z0, x1, y1, z1) {
    const t = this.terrain;
    const i0 = Math.floor(x0 / VOX), i1 = Math.floor((x1 - 1e-4) / VOX);
    const j0 = Math.floor(y0 / VOX), j1 = Math.floor((y1 - 1e-4) / VOX);
    const k0 = Math.floor(z0 / VOX), k1 = Math.floor((z1 - 1e-4) / VOX);
    for (let j = j0; j <= j1; j++) for (let k = k0; k <= k1; k++) for (let i = i0; i <= i1; i++) if (t.get(i, j, k)) return true;
    return false;
  }
  chHits(x, y, z, r = R, h = H) { return this.boxSolid(x - r, y, z - r, x + r, y + h, z + r); }
  onGround(e, r = R) { return this.boxSolid(e.x - r * 0.9, e.y - 0.06, e.z - r * 0.9, e.x + r * 0.9, e.y + 0.02, e.z + r * 0.9); }

  // mueve una caja contra el terreno por ejes; devuelve en qué ejes chocó
  moveBox(e, dx, dy, dz, r = R, h = H) {
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz)) / 0.1));
    const sx = dx / steps, sy = dy / steps, sz = dz / steps;
    const hit = { x: false, y: false, z: false };
    for (let s = 0; s < steps; s++) {
      if (!hit.x && sx) { if (this.boxSolid(e.x + sx - r, e.y, e.z - r, e.x + sx + r, e.y + h, e.z + r)) hit.x = true; else e.x += sx; }
      if (!hit.z && sz) { if (this.boxSolid(e.x - r, e.y, e.z + sz - r, e.x + r, e.y + h, e.z + sz + r)) hit.z = true; else e.z += sz; }
      if (!hit.y && sy) { if (this.boxSolid(e.x - r, e.y + sy, e.z - r, e.x + r, e.y + sy + h, e.z + r)) hit.y = true; else e.y += sy; }
    }
    return hit;
  }
  // si quedó enterrado (por una viga, por ejemplo) lo sube
  unstick(e, r = R, h = H) {
    for (let n = 0; n < 40 && this.boxSolid(e.x - r, e.y, e.z - r, e.x + r, e.y + h, e.z + r); n++) e.y += VOX * 0.5;
  }

  alliance(teamIdx) { return this.teams[teamIdx].alliance; }
  aliveTeams() { return this.teams.filter((t) => this.chickens.some((c) => c.alive && c.team === t.idx)); }
  activeChicken() { return this.turn ? this.chickens[this.turn.ch] : null; }

  // ---------------- turnos ----------------
  startTurn() {
    const alive = this.aliveTeams().map((t) => t.idx);
    if (alive.length === 0) return;
    let ti = this.turnTeam;
    for (let n = 0; n < this.teams.length; n++) {
      ti = (ti + 1) % this.teams.length;
      if (alive.includes(ti)) break;
    }
    this.turnTeam = ti;
    const team = this.teams[ti];
    const mine = this.chickens.filter((c) => c.team === ti);
    let ch = null;
    for (let n = 0; n < mine.length; n++) {
      const c = mine[(team.next + n) % mine.length];
      if (c.alive) { ch = c; team.next = (team.next + n + 1) % mine.length; break; }
    }
    const slot = team.slots.length ? team.slots[team.turns % team.slots.length] : null;
    team.turns++;
    // viento nuevo cada turno
    const a = this.r() * Math.PI * 2, s = this.r() < 0.15 ? 0 : this.r();
    this.wind = { x: Math.cos(a) * s, z: Math.sin(a) * s };
    // muerte súbita
    if (!this.sudden && this.time > this.cfg.sudden * 60) {
      this.sudden = true;
      for (const c of this.chickens) if (c.alive) c.hp = 1;
      this.emit({ k: 'banner', text: '¡MUERTE SÚBITA!', sub: 'Toda la vida baja a 1 y el agua sube' });
      this.emit({ k: 'sfx', s: 'sudden' });
    } else if (this.sudden) {
      this.water += 0.4;
      this.emit({ k: 'sfx', s: 'water' });
    }
    this.turn = {
      team: ti, ch: ch.id, slot, cpu: team.cpu !== null && team.cpu !== undefined, clock: this.cfg.turnTime, retreat: 0,
      weapon: team.lastWeapon && team.inv[team.lastWeapon] !== 0 ? team.lastWeapon : 'bazuca', fuse: 3, mode: 'walk', pitch: 0.35, power: 0, charging: false,
      shots: 0, fired: false, over: false, cursor: null, view: false, prevFire: false, inp: { mx: 0, my: 0, fire: false, jumpHeld: false },
      walker: null, track: null, ropeUsed: false,
    };
    ch.rope = null; ch.jet = 0; ch.umbrella = false;
    this.phase = 'play';
    this.phaseT = 0;
    this.emit({ k: 'turn', team: ti, ch: ch.id, slot });
    this.emit({ k: 'sfx', s: 'turn' });
    this.say(ch, 'turn');
    // caja del cielo de vez en cuando
    if (this.r() < 0.35) this.dropCrate();
  }

  dropCrate() {
    const sp = this.terrain.spawnPoints(1, Math.floor(this.r() * 1e9))[0];
    if (!sp) return;
    const roll = this.r();
    const kind = roll < 0.4 ? 'cajaSalud' : roll < 0.8 ? 'cajaArma' : 'cajaUtil';
    this.addObj({ kind, x: sp.x, y: 23, z: sp.z, para: true });
    this.emit({ k: 'sfx', s: 'crate' });
  }

  endTurn(why) {
    if (!this.turn || this.phase === 'settle' || this.phase === 'between' || this.phase === 'over') return;
    const ch = this.activeChicken();
    if (ch) { ch.rope = null; ch.jet = 0; }
    this.turn.charging = false;
    this.turn.mode = 'walk';
    this.phase = 'settle';
    this.phaseT = 0;
    if (why === 'time') this.emit({ k: 'sfx', s: 'timeout' });
  }

  startRetreat() {
    if (this.phase !== 'play') return;
    this.phase = 'retreat';
    this.turn.retreat = RETREAT_TIME;
    this.turn.mode = 'walk';
    this.turn.charging = false;
  }

  // ---------------- entradas del jugador del turno ----------------
  // inp: { mx, my, fire, jumpHeld }  (mantenidos)
  control(inp) { if (this.turn) this.turn.inp = inp; }

  // movimiento acumulado de la mira (dedo arrastrado o mouse) en radianes
  aimDelta(dyaw, dpitch) {
    const T = this.turn;
    if (!T || (this.phase !== 'play' && this.phase !== 'retreat')) return;
    const ch = this.activeChicken();
    if (!ch || !ch.alive) return;
    const dy = Number(dyaw) || 0;
    const dp = Number(dpitch) || 0;
    if (!dy && !dp) return;
    if (T.mode === 'target' && T.cursor) {
      const fx = Math.sin(ch.yaw), fz = Math.cos(ch.yaw);
      const step = 12;
      T.cursor.x = Math.max(1, Math.min(WORLD_X - 1, T.cursor.x + (fx * dp - fz * dy) * step));
      T.cursor.z = Math.max(1, Math.min(WORLD_Z - 1, T.cursor.z + (fz * dp + fx * dy) * step));
      return;
    }
    ch.yaw -= dy;
    T.pitch = Math.max(-1.2, Math.min(1.45, T.pitch + dp));
  }

  act(a) {
    const T = this.turn;
    if (!T || (this.phase !== 'play' && this.phase !== 'retreat')) return;
    const ch = this.activeChicken();
    if (!ch || !ch.alive) return;
    const team = this.teams[T.team];
    switch (a.t) {
      case 'jump': this.jump(ch, false); break;
      case 'back': this.jump(ch, true); break;
      case 'weapon': {
        if (this.phase !== 'play' || T.walker || T.shots > 0) break;
        const w = weaponById(a.w);
        if (team.inv[w.id] === 0) break;
        T.weapon = w.id; team.lastWeapon = w.id;
        T.charging = false; T.power = 0;
        if (w.aim === 'target' || w.aim === 'targetpower') {
          T.mode = 'target';
          T.cursor = { x: ch.x + Math.sin(ch.yaw) * 8, z: ch.z + Math.cos(ch.yaw) * 8 };
        } else if (T.mode === 'target') T.mode = 'walk';
        this.emit({ k: 'sfx', s: 'select' });
        break;
      }
      case 'fuse': T.fuse = Math.max(1, Math.min(5, a.v | 0)); this.emit({ k: 'sfx', s: 'select' }); break;
      case 'aim': if (T.mode !== 'target') T.mode = T.mode === 'aim' ? 'walk' : 'aim'; break;
      case 'view': T.view = !T.view; break;
      case 'surrender':
        for (const c of this.chickens) if (c.team === T.team && c.alive) { c.hp = 0; c.dying = 0.5 + this.r(); }
        this.emit({ k: 'banner', text: `${team.name} se rinde`, sub: '🏳️' });
        this.endTurn();
        break;
      default: break;
    }
  }

  jump(ch, back) {
    if (ch.rope) { ch.rope = null; ch.air = true; ch.knock = false; ch.peakY = ch.y; this.emit({ k: 'sfx', s: 'jump' }); return; }
    if (!ch.ground || ch.air) return;
    const f = back ? -1.4 : 3.6;
    ch.vx = Math.sin(ch.yaw) * f; ch.vz = Math.cos(ch.yaw) * f; ch.vy = back ? 9.5 : 6.8;
    ch.air = true; ch.ground = false; ch.knock = false; ch.peakY = ch.y;
    this.emit({ k: 'sfx', s: back ? 'backflip' : 'jump', id: ch.id });
  }

  aimDir(ch, pitch) {
    const cp = Math.cos(pitch);
    return { x: Math.sin(ch.yaw) * cp, y: Math.sin(pitch), z: Math.cos(ch.yaw) * cp };
  }

  // disparar el arma actual
  fire(power) {
    const T = this.turn, ch = this.activeChicken();
    const team = this.teams[T.team];
    const w = weaponById(T.weapon);
    if (team.inv[w.id] === 0) { this.emit({ k: 'sfx', s: 'empty' }); return; }
    const dir = this.aimDir(ch, T.pitch);
    const ox = ch.x + dir.x * 0.6, oy = ch.y + 0.75 + dir.y * 0.6, oz = ch.z + dir.z * 0.6;
    const use = () => { if (team.inv[w.id] > 0) team.inv[w.id]--; };
    const dd = team.dd ? 2 : 1;
    switch (w.id) {
      case 'bazuca': case 'granada': case 'maiz': case 'oro': {
        const sp = 5 + power * 21;
        const p = this.addObj({ kind: w.id, x: ox, y: oy, z: oz, vx: dir.x * sp, vy: dir.y * sp, vz: dir.z * sp, owner: T.team, src: ch.id, fuse: w.fuse ? T.fuse : 3, dd, proj: true });
        if (w.id === 'oro') { p.fuse = 3; this.emit({ k: 'sfx', s: 'aleluya' }); }
        T.track = p.id;
        use(); team.dd = false;
        this.emit({ k: 'sfx', s: w.id === 'bazuca' ? 'shoot' : 'throw' });
        this.say(ch, 'fire');
        this.startRetreat();
        break;
      }
      case 'escopeta': {
        T.shots++;
        this.hitscan(ch, dir, T.team, dd);
        if (T.shots >= 2) { team.dd = false; this.startRetreat(); }
        break;
      }
      case 'picotazo': case 'chancla': {
        use(); team.dd = false;
        this.melee(ch, w.id, T.team, dd);
        this.startRetreat();
        break;
      }
      case 'vela': case 'mina': {
        use();
        this.addObj({ kind: w.id, x: ch.x + Math.sin(ch.yaw) * 0.5, y: ch.y + 0.3, z: ch.z + Math.cos(ch.yaw) * 0.5, owner: T.team, t: w.id === 'vela' ? 5 : 0, armed: 0, armT: 1.5, dd });
        team.dd = false;
        this.emit({ k: 'sfx', s: 'drop' });
        this.startRetreat();
        break;
      }
      case 'gallina': {
        if (T.walker) {
          const g = this.objs.find((o) => o.id === T.walker);
          if (g) this.explodeObj(g);
          T.walker = null;
          this.startRetreat();
          break;
        }
        use();
        const g = this.addObj({ kind: 'gallina', x: ch.x + Math.sin(ch.yaw) * 0.8, y: ch.y + 0.2, z: ch.z + Math.cos(ch.yaw) * 0.8, yaw: ch.yaw, owner: T.team, t: 12, dd });
        team.dd = false;
        T.walker = g.id;
        this.emit({ k: 'sfx', s: 'gallina' });
        this.say(ch, 'gallina', '¡Ve, mamá gallina!');
        break;
      }
      case 'palomas': {
        if (!T.cursor) break;
        use(); team.dd = false;
        const yaw = ch.yaw, dx = Math.sin(yaw), dz = Math.cos(yaw);
        for (let i = 0; i < 5; i++) {
          const off = (i - 2) * 1.5;
          this.addObj({ kind: 'regalo', x: T.cursor.x + dx * (off - 9), y: 22 + this.r(), z: T.cursor.z + dz * (off - 9), vx: dx * 7, vy: -1, vz: dz * 7, owner: T.team, proj: true, delay: i * 0.12, dd });
          this.addObj({ kind: 'paloma', x: T.cursor.x + dx * (off - 25), y: 23 + i * 0.4, z: T.cursor.z + dz * (off - 25) + (i - 2) * 0.8, vx: dx * 9, vz: dz * 9, yaw, t: 5, visual: true });
        }
        T.track = null;
        this.camOverride = { x: T.cursor.x, y: this.terrain.surfaceY(T.cursor.x, T.cursor.z), z: T.cursor.z, t: 3.5 };
        this.emit({ k: 'sfx', s: 'palomas' });
        this.say(ch, 'fire', '¡Ataque de palomas!');
        T.mode = 'walk';
        this.startRetreat();
        break;
      }
      case 'guacamaya': {
        if (!T.cursor) break;
        use(); team.dd = false;
        const ty = this.terrain.surfaceY(T.cursor.x, T.cursor.z);
        const p = this.addObj({ kind: 'guacamaya', x: ch.x, y: ch.y + 1.2, z: ch.z, vx: 0, vy: 11, vz: 0, owner: T.team, src: ch.id, tx: T.cursor.x, ty, tz: T.cursor.z, proj: true, dd, t: 7 });
        T.track = p.id; T.mode = 'walk';
        this.emit({ k: 'sfx', s: 'guacamaya' });
        this.startRetreat();
        break;
      }
      case 'teleport': {
        if (!T.cursor) break;
        use();
        const x = Math.max(1, Math.min(WORLD_X - 1, T.cursor.x)), z = Math.max(1, Math.min(WORLD_Z - 1, T.cursor.z));
        const y = this.terrain.surfaceY(x, z);
        if (y <= this.water) { this.emit({ k: 'sfx', s: 'empty' }); team.inv.teleport++; break; }
        this.emit({ k: 'poof', x: ch.x, y: ch.y + 0.6, z: ch.z });
        ch.x = x; ch.z = z; ch.y = y + 0.05; ch.vx = ch.vy = ch.vz = 0; ch.air = false;
        this.unstick(ch);
        this.emit({ k: 'poof', x: ch.x, y: ch.y + 0.6, z: ch.z });
        this.emit({ k: 'sfx', s: 'teleport' });
        T.mode = 'walk';
        this.endTurn();
        break;
      }
      case 'viga': {
        use();
        this.terrain.beam(ch.x + Math.sin(ch.yaw) * 0.9, ch.y - 0.25, ch.z + Math.cos(ch.yaw) * 0.9, ch.yaw, 6);
        this.emit({ k: 'edit' });
        this.emit({ k: 'sfx', s: 'build' });
        this.startRetreat();
        break;
      }
      case 'cuerda': {
        const hit = this.ray(ch.x, ch.y + 0.8, ch.z, dir, 16);
        if (!hit) { this.emit({ k: 'sfx', s: 'empty' }); break; }
        if (!T.ropeUsed) { use(); T.ropeUsed = true; }
        ch.rope = { x: hit.x, y: hit.y, z: hit.z, len: Math.max(1.5, Math.hypot(hit.x - ch.x, hit.y - ch.y - 0.8, hit.z - ch.z)) };
        ch.air = true; ch.ground = false; ch.knock = false; ch.jet = 0;
        T.mode = 'walk';
        this.emit({ k: 'sfx', s: 'rope' });
        break;
      }
      case 'ventilador': {
        if (ch.jet > 0) { ch.jet = 0; break; }
        use();
        ch.jet = 4.5; ch.rope = null; ch.air = true; ch.ground = false; ch.knock = false; ch.vy = Math.max(ch.vy, 3);
        this.emit({ k: 'sfx', s: 'jet' });
        break;
      }
      case 'sombrilla': {
        if (!ch.umbrella) use();
        ch.umbrella = !ch.umbrella;
        this.emit({ k: 'sfx', s: 'select' });
        break;
      }
      case 'saltar': this.endTurn(); break;
      case 'rendirse': break; // se confirma en el mando
      default: break;
    }
  }

  ray(x, y, z, d, max) {
    for (let s = 0.4; s < max; s += 0.12) {
      const px = x + d.x * s, py = y + d.y * s, pz = z + d.z * s;
      if (this.terrain.solid(px, py, pz)) return { x: px, y: py, z: pz, s };
    }
    return null;
  }

  hitscan(ch, dir, team, dd) {
    const ox = ch.x, oy = ch.y + 0.75, oz = ch.z;
    let end = null;
    for (let s = 0.5; s < 40; s += 0.1) {
      const px = ox + dir.x * s, py = oy + dir.y * s, pz = oz + dir.z * s;
      const hitCh = this.chickens.find((c) => c.alive && c !== ch && Math.abs(c.x - px) < R + 0.1 && Math.abs(c.z - pz) < R + 0.1 && py > c.y && py < c.y + H);
      if (hitCh || this.terrain.solid(px, py, pz) || py < this.water) { end = { x: px, y: py, z: pz }; break; }
    }
    this.emit({ k: 'tracer', a: [ox, oy, oz], b: end ? [end.x, end.y, end.z] : [ox + dir.x * 40, oy + dir.y * 40, oz + dir.z * 40] });
    this.emit({ k: 'sfx', s: 'shotgun' });
    if (end && end.y > this.water) this.explode(end.x, end.y, end.z, BOOM.escopeta.r, BOOM.escopeta.d * dd, team, { push: dir, kick: 7 });
  }

  melee(ch, kind, team, dd) {
    const fx = Math.sin(ch.yaw), fz = Math.cos(ch.yaw);
    const reach = kind === 'chancla' ? 1.5 : 1.2;
    let any = false;
    for (const c of this.chickens) {
      if (!c.alive || c === ch) continue;
      const dx = c.x - ch.x, dz = c.z - ch.z, dy = c.y - ch.y;
      const along = dx * fx + dz * fz, side = Math.abs(dx * fz - dz * fx);
      if (along < -0.2 || along > reach || side > 0.9 || Math.abs(dy) > 1.4) continue;
      any = true;
      if (kind === 'chancla') this.knock(c, fx * 15, 7, fz * 15);
      else this.knock(c, fx * 2, 13, fz * 2);
      this.damage(c, 30 * dd, team);
    }
    if (kind === 'picotazo') { ch.vy = 9; ch.air = true; ch.ground = false; ch.peakY = ch.y; this.emit({ k: 'sfx', s: 'fire' }); }
    else this.emit({ k: 'sfx', s: any ? 'chancla' : 'whoosh' });
    if (kind === 'chancla') this.say(ch, 'chancla', any ? '¡Venga para acá, mijo!' : '¡Ay, fallé!');
  }

  // ---------------- daño y explosiones ----------------
  knock(c, vx, vy, vz) {
    c.vx += vx; c.vy += vy; c.vz += vz;
    c.air = true; c.ground = false; c.knock = true; c.rope = null; c.jet = 0; c.peakY = c.y;
  }

  damage(c, amount, team) {
    if (!c.alive || amount <= 0) return;
    const victimTeam = c.team;
    if (team !== undefined && team !== null && team !== victimTeam && this.alliance(team) === this.alliance(victimTeam) && !this.cfg.friendly) return;
    amount = Math.round(amount);
    c.hp = Math.max(0, c.hp - amount);
    c.hurtT = 0.6;
    this.emit({ k: 'dmg', id: c.id, n: amount, x: c.x, y: c.y + H + 0.4, z: c.z });
    if (team !== undefined && team !== null && this.stats[this.teams[team].id]) {
      if (team === victimTeam) this.stats[this.teams[team].id].self += amount;
      else this.stats[this.teams[team].id].dmg += amount;
    }
    if (c.hp <= 0) {
      c.killer = team;
      this.say(c, 'dead');
    } else this.say(c, 'hurt');
    // si le pegan al del turno, se acaba el turno
    if (this.turn && c.id === this.turn.ch && (this.phase === 'play' || this.phase === 'retreat')) this.endTurn();
  }

  explode(x, y, z, r, dmg, team, opts = {}) {
    this.terrain.carve(x, y, z, r);
    this.emit({ k: 'boom', x, y, z, r });
    this.emit({ k: 'edit' });
    this.lastBoom = { x, y, z, t: 1.4 };
    const RR = r * 1.55;
    for (const c of this.chickens) {
      if (!c.alive) continue;
      const cx = c.x, cy = c.y + H * 0.5, cz = c.z;
      const dx = cx - x, dy = cy - y, dz = cz - z;
      const d = Math.hypot(dx, dy, dz);
      if (d > RR) continue;
      const f = 1 - d / RR;
      const amount = dmg * (0.35 + 0.65 * f);
      const n = d > 0.01 ? 1 / d : 0;
      const kick = (opts.kick || 5 + dmg * 0.11) * f;
      let kx = dx * n, kz = dz * n;
      if (opts.push) { kx += opts.push.x * 0.8; kz += opts.push.z * 0.8; }
      this.knock(c, kx * kick, (0.55 + Math.max(0, dy * n)) * kick, kz * kick);
      this.damage(c, amount, team);
    }
    for (const o of this.objs) {
      if (o.dead) continue;
      const d = Math.hypot(o.x - x, o.y + 0.3 - y, o.z - z);
      if (d > RR) continue;
      if (o.kind === 'barril' || o.kind === 'cajaArma' || (o.kind === 'mina' && !o.proj)) { if (!o.fuseBoom) o.fuseBoom = 0.12 + this.r() * 0.15; }
      else if (o.kind === 'vela' || o.kind === 'lapida' || o.kind === 'cajaSalud' || o.kind === 'cajaUtil') {
        const f = 1 - d / RR, n = d > 0.01 ? 1 / d : 0;
        o.vx += (o.x - x) * n * 6 * f; o.vy += 5 * f; o.vz += (o.z - z) * n * 6 * f; o.ground = false;
      }
    }
  }

  explodeObj(o) {
    if (o.dead) return;
    o.dead = true;
    const b = BOOM[o.kind] || BOOM.bazuca;
    this.explode(o.x, o.y + 0.3, o.z, b.r, b.d * (o.dd || 1), o.owner);
    if (o.kind === 'maiz') {
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + this.r();
        this.addObj({ kind: 'pop', x: o.x, y: o.y + 0.6, z: o.z, vx: Math.cos(a) * 4.5, vy: 7 + this.r() * 3, vz: Math.sin(a) * 4.5, owner: o.owner, proj: true, fuse: 1.2 + this.r() * 0.6, dd: o.dd });
      }
    }
    if (o.kind === 'oro') this.emit({ k: 'sfx', s: 'oroBoom' });
    if (o.kind === 'gallina') this.emit({ k: 'feathers', x: o.x, y: o.y + 0.8, z: o.z });
    if (this.turn && this.turn.walker === o.id) { this.turn.walker = null; this.startRetreat(); }
  }

  // ---------------- simulación ----------------
  update(dt) {
    this.time += dt;
    const T = this.turn;
    if (this.camOverride) { this.camOverride.t -= dt; if (this.camOverride.t <= 0) this.camOverride = null; }
    if (this.lastBoom) { this.lastBoom.t -= dt; if (this.lastBoom.t <= 0) this.lastBoom = null; }

    if (this.phase === 'between') {
      this.phaseT -= dt;
      this.physics(dt);
      if (this.phaseT <= 0) this.startTurn();
      return;
    }
    if (this.phase === 'over') { this.physics(dt); return; }

    if (this.phase === 'play' || this.phase === 'retreat') {
      if (this.phase === 'play') {
        // el reloj se detiene mientras la gallina corre o hay algo volando del jugador
        if (!T.walker) T.clock -= dt;
        if (T.clock <= 0) { T.clock = 0; this.endTurn('time'); }
      } else {
        T.retreat -= dt;
        if (T.retreat <= 0) this.endTurn();
      }
      if (this.phase === 'play' || this.phase === 'retreat') this.playerStep(dt);
    }
    this.physics(dt);
    if (this.phase === 'settle') {
      this.phaseT += dt;
      const busy = this.objs.some((o) => !o.dead && (o.proj || o.kind === 'gallina' || o.fuseBoom || (o.kind === 'vela') || (o.kind === 'mina' && o.trig)))
        || this.chickens.some((c) => c.alive && (c.air || c.dying > 0 || c.rope));
      if ((!busy && this.phaseT > 1.0) || this.phaseT > 12) this.afterSettle();
    }
  }

  afterSettle() {
    // los que quedaron sin vida explotan (uno por uno)
    const pending = this.chickens.filter((c) => c.alive && c.hp <= 0);
    if (pending.length) {
      pending.forEach((c, i) => { if (!c.dying) c.dying = 0.5 + i * 0.6; });
      this.phaseT = 0.2;
      return;
    }
    this.checkOver();
    if (this.phase === 'over') return;
    this.phase = 'between';
    this.phaseT = 1.3;
    this.turn = null;
  }

  checkOver() {
    const alive = this.aliveTeams();
    const alliances = new Set(alive.map((t) => t.alliance));
    if (alliances.size <= 1) {
      const win = alive.length ? alive[0].alliance : null;
      this.phase = 'over';
      this.over = { alliance: win, teams: alive.map((t) => t.idx) };
      this.emit({ k: 'over', alliance: win });
    }
  }

  playerStep(dt) {
    const T = this.turn, ch = this.activeChicken();
    if (!ch || !ch.alive) { this.endTurn(); return; }
    const inp = T.inp || {};
    const w = weaponById(T.weapon);
    const mx = Math.abs(inp.mx) > 0.15 ? inp.mx : 0, my = Math.abs(inp.my) > 0.15 ? inp.my : 0;
    const canFire = this.phase === 'play' || (T.walker && w.id === 'gallina') || (this.phase === 'retreat' && false);
    const firePress = inp.fire && !T.prevFire, fireRelease = !inp.fire && T.prevFire;
    T.prevFire = !!inp.fire;

    if (T.mode === 'target') {
      // mover la mira sobre el mapa (CPU o teclado con curva suave)
      if (T.cpu) {
        const fx = Math.sin(ch.yaw), fz = Math.cos(ch.yaw);
        T.cursor.x += (fx * my - fz * mx) * 14 * dt;
        T.cursor.z += (fz * my + fx * mx) * 14 * dt;
        T.cursor.x = Math.max(1, Math.min(WORLD_X - 1, T.cursor.x));
        T.cursor.z = Math.max(1, Math.min(WORLD_Z - 1, T.cursor.z));
      }
      if (firePress && canFire) this.fire(1);
      return;
    }
    if (T.mode === 'aim' && T.cpu) {
      ch.yaw -= mx * AIM_TURN * dt;
      T.pitch = Math.max(-1.2, Math.min(1.45, T.pitch + my * PITCH_SPEED * dt));
    }

    if (canFire && !ch.rope || (canFire && w.id === 'cuerda')) {
      if (w.aim === 'power') {
        if (firePress) { T.charging = true; T.power = 0; this.emit({ k: 'sfx', s: 'charge' }); }
        if (T.charging) {
          T.power = Math.min(1, T.power + dt / MAX_POWER_TIME);
          if (fireRelease || T.power >= 1) { T.charging = false; this.fire(T.power); T.power = 0; }
        }
      } else if (firePress && (w.id !== 'escopeta' || T.shots < 2)) {
        this.fire(1);
      }
    } else if (firePress && T.walker) this.fire(1);

    // moverse (no se puede mientras se carga la potencia)
    if (T.charging) return;
    if (ch.rope) { this.ropeStep(ch, mx, my, dt); return; }
    if (ch.jet > 0) {
      ch.jet -= dt;
      const fx = Math.sin(ch.yaw), fz = Math.cos(ch.yaw);
      ch.yaw -= mx * TURN * dt;
      ch.vx += fx * my * 9 * dt; ch.vz += fz * my * 9 * dt;
      ch.vx *= 1 - 1.2 * dt; ch.vz *= 1 - 1.2 * dt;
      if (inp.jumpHeld) ch.vy += 30 * dt;
      ch.vy = Math.min(ch.vy, 6);
      if (ch.jet <= 0) { ch.jet = 0; this.emit({ k: 'sfx', s: 'jetoff' }); }
      return;
    }
    if ((T.mode === 'walk' || (T.mode === 'aim' && !T.cpu)) && ch.ground && !ch.air) {
      ch.yaw -= mx * TURN * dt;
      if (my) {
        const sp = (my > 0 ? WALK : WALK * 0.6) * my;
        this.walkStep(ch, Math.sin(ch.yaw) * sp * dt, Math.cos(ch.yaw) * sp * dt);
        ch.walk += dt; ch.movingT = 0.15;
      }
    }
  }

  walkStep(ch, dx, dz) {
    const hit = this.moveBox(ch, dx, 0, dz);
    if ((hit.x || hit.z)) {
      // subir escalones de hasta un vóxel y un poco
      for (const up of [VOX * 0.5, VOX, VOX * 1.4]) {
        if (!this.chHits(ch.x + (hit.x ? dx : 0), ch.y + up, ch.z + (hit.z ? dz : 0)) && !this.chHits(ch.x, ch.y + up, ch.z)) {
          ch.y += up;
          this.moveBox(ch, hit.x ? dx : 0, 0, hit.z ? dz : 0);
          break;
        }
      }
    }
    // bajar pegado al piso
    if (!this.onGround(ch)) {
      for (let d = 0.1; d <= 0.8; d += 0.1) {
        if (this.onGround({ x: ch.x, y: ch.y - d, z: ch.z })) { if (!this.chHits(ch.x, ch.y - d, ch.z)) ch.y -= d; break; }
      }
    }
  }

  ropeStep(ch, mx, my, dt) {
    const rp = ch.rope;
    rp.len = Math.max(1.2, Math.min(18, rp.len - my * 6 * dt));
    const fx = Math.sin(ch.yaw), fz = Math.cos(ch.yaw);
    // balanceo: izquierda/derecha empuja de lado, y en la dirección donde se mira con fuerza
    ch.vx += (fx * 4 - fz * mx * 8) * dt * (Math.abs(mx) > 0 ? 1 : 0.2);
    ch.vz += (fz * 4 + fx * mx * 8) * dt * (Math.abs(mx) > 0 ? 1 : 0.2);
  }

  physics(dt) {
    // pollitos
    for (const c of this.chickens) {
      if (!c.alive) continue;
      if (c.hurtT > 0) c.hurtT -= dt;
      if (c.movingT > 0) c.movingT -= dt;
      if (c.dying > 0) {
        c.dying -= dt;
        if (c.dying <= 0) this.killChicken(c);
        continue;
      }
      const T = this.turn;
      const active = T && T.ch === c.id && (this.phase === 'play' || this.phase === 'retreat');
      if (c.rope) {
        c.vy -= GRAVITY * dt;
        c.vx *= 1 - 0.25 * dt; c.vz *= 1 - 0.25 * dt;
        const hit = this.moveBox(c, c.vx * dt, c.vy * dt, c.vz * dt);
        if (hit.x) c.vx *= -0.3; if (hit.z) c.vz *= -0.3; if (hit.y) c.vy *= -0.2;
        // restricción de la cuerda
        const rp = c.rope;
        const px = c.x, py = c.y + 0.8, pz = c.z;
        let dx = px - rp.x, dy = py - rp.y, dz = pz - rp.z;
        const d = Math.hypot(dx, dy, dz);
        if (d > rp.len) {
          dx /= d; dy /= d; dz /= d;
          const tx = rp.x + dx * rp.len, ty = rp.y + dy * rp.len - 0.8, tz = rp.z + dz * rp.len;
          this.moveBox(c, tx - c.x, ty - c.y, tz - c.z);
          const vr = c.vx * dx + c.vy * dy + c.vz * dz;
          if (vr > 0) { c.vx -= vr * dx; c.vy -= vr * dy; c.vz -= vr * dz; }
        }
        if (Math.hypot(c.vx, c.vz) > 0.3) c.yaw = Math.atan2(c.vx, c.vz) * 0.1 + c.yaw * 0.9;
        c.peakY = c.y;
        if (!active) c.rope = null;
      } else if (c.air || !this.onGround(c)) {
        if (!c.air) { c.air = true; c.peakY = c.y; c.ground = false; }
        c.vy -= GRAVITY * dt;
        if (c.umbrella && c.vy < -2.2) { c.vy = -2.2; c.vx += this.wind.x * 3 * dt; c.vz += this.wind.z * 3 * dt; }
        if (c.jet > 0) c.peakY = c.y;
        const before = c.vy;
        const hit = this.moveBox(c, c.vx * dt, c.vy * dt, c.vz * dt);
        c.peakY = Math.max(c.peakY, c.y);
        if (hit.x) c.vx *= c.knock ? -0.4 : -0.1;
        if (hit.z) c.vz *= c.knock ? -0.4 : -0.1;
        if (hit.y) {
          if (before < 0) {
            const speed = Math.hypot(c.vx, before, c.vz);
            if (c.knock && speed > 5.5) {
              c.vy = -before * 0.32; c.vx *= 0.55; c.vz *= 0.55;
              this.emit({ k: 'sfx', s: 'bounce' });
            } else {
              const fall = c.peakY - c.y;
              c.vx = 0; c.vy = 0; c.vz = 0;
              c.air = false; c.ground = true; c.knock = false; c.umbrella = false;
              if (fall > 3.6 && c.jet <= 0) {
                this.damage(c, Math.min(45, (fall - 3.6) * 7), null);
                this.emit({ k: 'sfx', s: 'thud' });
              } else this.emit({ k: 'land', id: c.id });
            }
          } else c.vy = 0;
        }
      } else {
        c.ground = true;
        c.vx = c.vz = 0; c.vy = 0;
      }
      // agua
      if (c.y + 0.25 < this.water || c.y < -4) this.drown(c);
    }

    // objetos
    for (const o of this.objs) {
      if (o.dead) continue;
      o.age += dt;
      if (o.fuseBoom) { o.fuseBoom -= dt; if (o.fuseBoom <= 0) { o.fuseBoom = 0; this.explodeObj(o); continue; } }
      if (o.delay > 0) { o.delay -= dt; continue; }
      if (o.visual) {
        o.x += o.vx * dt; o.y += o.vy * dt; o.z += o.vz * dt; o.t -= dt;
        if (o.t <= 0) o.dead = true;
        continue;
      }
      if (o.proj) this.stepProj(o, dt);
      else if (o.kind === 'gallina') this.stepGallina(o, dt);
      else this.stepStatic(o, dt);
    }
    if (this.objs.length > 60 || this.objs.some((o) => o.dead)) this.objs = this.objs.filter((o) => !o.dead);
  }

  drown(c) {
    if (!c.alive) return;
    c.alive = false; c.hp = 0; c.rope = null;
    this.emit({ k: 'splash', x: c.x, y: this.water, z: c.z });
    this.emit({ k: 'sfx', s: 'splash' });
    this.say(c, 'drown');
    const st = this.stats[this.teams[c.team].id];
    if (st) st.drown++;
    if (this.turn && this.turn.ch === c.id && (this.phase === 'play' || this.phase === 'retreat')) this.endTurn();
  }

  killChicken(c) {
    c.alive = false;
    c.dying = 0;
    this.explode(c.x, c.y + 0.4, c.z, BOOM.muerte.r, BOOM.muerte.d, null);
    this.emit({ k: 'feathers', x: c.x, y: c.y + 0.6, z: c.z, color: this.teams[c.team].color });
    this.addObj({ kind: 'lapida', x: c.x, y: c.y, z: c.z, yaw: c.yaw, name: c.name });
    if (c.killer !== undefined && c.killer !== null && c.killer !== c.team) {
      const st = this.stats[this.teams[c.killer].id];
      if (st) st.kills++;
    }
  }

  // un paso de un proyectil; ctx permite simular sin efectos (para la CPU)
  projStep(o, dt, sim) {
    const k = o.kind;
    if (k === 'guacamaya') {
      o.t -= dt;
      if (o.age > 0.55 && o.t > 0) {
        const dx = o.tx - o.x, dy = o.ty + 0.4 - o.y, dz = o.tz - o.z, d = Math.hypot(dx, dy, dz) || 1;
        const sp = 15;
        o.vx += (dx / d * sp - o.vx) * Math.min(1, 3.2 * dt);
        o.vy += (dy / d * sp - o.vy) * Math.min(1, 3.2 * dt);
        o.vz += (dz / d * sp - o.vz) * Math.min(1, 3.2 * dt);
      } else if (o.age > 0.55) o.vy -= PROJ_GRAVITY * dt;
      else o.vy -= 4 * dt;
    } else {
      o.vy -= (k === 'regalo' ? PROJ_GRAVITY * 0.8 : PROJ_GRAVITY) * dt;
      const wk = WIND_K[k] || 0;
      if (wk) { o.vx += this.wind.x * wk * dt; o.vz += this.wind.z * wk * dt; }
    }
    if (o.vx || o.vz) o.yaw = Math.atan2(o.vx, o.vz);
    const bounce = BOUNCE[k];
    const steps = Math.max(1, Math.ceil(Math.hypot(o.vx, o.vy, o.vz) * dt / 0.12));
    for (let s = 0; s < steps; s++) {
      const nx = o.x + o.vx * dt / steps, ny = o.y + o.vy * dt / steps, nz = o.z + o.vz * dt / steps;
      if (ny < this.water - 0.3) return 'water';
      if (nx < -20 || nx > WORLD_X + 20 || nz < -20 || nz > WORLD_Z + 20) return 'water';
      // golpe directo a un pollito (solo los que explotan al contacto)
      if (!bounce && o.age > 0.12) {
        for (const c of (sim ? sim.chickens : this.chickens)) {
          if (!c.alive || (c.id === o.src && o.age < 0.4)) continue;
          if (Math.abs(c.x - nx) < R + 0.15 && Math.abs(c.z - nz) < R + 0.15 && ny > c.y - 0.1 && ny < c.y + H + 0.1) { o.x = nx; o.y = ny; o.z = nz; return 'hit'; }
        }
      }
      if (this.terrain.solid(nx, ny, nz)) {
        if (!bounce) { o.x = nx; o.y = ny; o.z = nz; return 'hit'; }
        // rebote: averiguar qué eje chocó
        if (this.terrain.solid(nx, o.y, o.z)) o.vx = -o.vx * bounce;
        if (this.terrain.solid(o.x, ny, o.z)) o.vy = -o.vy * bounce;
        if (this.terrain.solid(o.x, o.y, nz)) o.vz = -o.vz * bounce;
        if (Math.abs(o.vy) < 1.2 && this.terrain.solid(o.x, o.y - 0.15, o.z)) { o.vy = 0; o.vx *= 0.85; o.vz *= 0.85; }
        if (!sim && Math.hypot(o.vx, o.vy, o.vz) > 2) this.emit({ k: 'sfx', s: 'bounce' });
        break;
      }
      o.x = nx; o.y = ny; o.z = nz;
    }
    if (bounce !== undefined) {
      o.fuse -= dt;
      if (o.fuse <= 0) return 'fuse';
    }
    return null;
  }

  stepProj(o, dt) {
    const r = this.projStep(o, dt, null);
    if (r === 'water') {
      o.dead = true;
      this.emit({ k: 'splash', x: o.x, y: this.water, z: o.z, small: true });
      this.emit({ k: 'sfx', s: 'splashSmall' });
    } else if (r === 'hit' || r === 'fuse') this.explodeObj(o);
  }

  stepStatic(o, dt) {
    // gravedad y piso (cajas con sombrilla caen despacio)
    const r = o.kind === 'mina' ? 0.25 : 0.3;
    if (!o.ground || !this.onGround(o, r)) {
      o.ground = false;
      o.vy -= GRAVITY * dt;
      if (o.para && o.vy < -2.2) o.vy = -2.2;
      const hit = this.moveBox(o, o.vx * dt, o.vy * dt, o.vz * dt, r, 0.5);
      if (hit.x) o.vx = 0; if (hit.z) o.vz = 0;
      if (hit.y && o.vy < 0) { o.vy = 0; o.vx = 0; o.vz = 0; o.ground = true; o.para = false; }
    }
    if (o.y < this.water - 0.2) {
      o.dead = true;
      this.emit({ k: 'splash', x: o.x, y: this.water, z: o.z, small: true });
      return;
    }
    if (o.kind === 'vela') {
      o.t -= dt;
      if (o.t <= 0) this.explodeObj(o);
    } else if (o.kind === 'mina') {
      if (!o.armed) { o.armT -= dt; if (o.armT <= 0) o.armed = 1; }
      else if (!o.trig) {
        if (this.chickens.some((c) => c.alive && Math.hypot(c.x - o.x, c.y + 0.5 - o.y, c.z - o.z) < 1.5)) { o.trig = 1.6; this.emit({ k: 'sfx', s: 'mine' }); }
      } else {
        o.trig -= dt;
        if (o.trig <= 0) this.explodeObj(o);
      }
    } else if (o.kind.startsWith('caja') && o.ground) {
      const ch = this.activeChicken();
      if (ch && ch.alive && Math.hypot(ch.x - o.x, ch.z - o.z) < 1.0 && Math.abs(ch.y - o.y) < 1.3) this.pickCrate(ch, o);
    }
  }

  pickCrate(ch, o) {
    o.dead = true;
    const team = this.teams[ch.team];
    if (o.kind === 'cajaSalud') {
      ch.hp += 25;
      this.emit({ k: 'heal', id: ch.id, n: 25, x: ch.x, y: ch.y + H + 0.4, z: ch.z });
      this.emit({ k: 'sfx', s: 'heal' });
    } else if (o.kind === 'cajaArma') {
      const pool = WEAPONS.filter((w) => w.ammo > 0 && !['rendirse'].includes(w.id));
      const w = pool[Math.floor(this.r() * pool.length)];
      team.inv[w.id] = Math.max(0, team.inv[w.id]) + 1;
      this.emit({ k: 'pickup', id: ch.id, text: `+1 ${w.name}`, icon: w.icon, x: ch.x, y: ch.y + H + 0.4, z: ch.z });
      this.emit({ k: 'sfx', s: 'pickup' });
    } else {
      if (this.r() < 0.5) { team.dd = true; this.emit({ k: 'pickup', id: ch.id, text: '¡Doble daño!', icon: '💪', x: ch.x, y: ch.y + H + 0.4, z: ch.z }); }
      else { if (this.turn) this.turn.clock += 15; this.emit({ k: 'pickup', id: ch.id, text: '+15 segundos', icon: '⏱️', x: ch.x, y: ch.y + H + 0.4, z: ch.z }); }
      this.emit({ k: 'sfx', s: 'pickup' });
    }
  }

  stepGallina(o, dt) {
    o.t -= dt;
    if (o.t <= 0) { this.explodeObj(o); return; }
    const r = 0.45, h = 1.2;
    const fx = Math.sin(o.yaw), fz = Math.cos(o.yaw);
    const ground = this.onGround(o, r);
    if (ground && o.vy <= 0) {
      o.vy = 0;
      const hit = this.moveBox(o, fx * 3.2 * dt, 0, fz * 3.2 * dt, r, h);
      if (hit.x || hit.z) {
        let stepped = false;
        for (const up of [VOX * 0.5, VOX, VOX * 1.5]) {
          if (!this.boxSolid(o.x + fx * 0.1 - r, o.y + up, o.z + fz * 0.1 - r, o.x + fx * 0.1 + r, o.y + up + h, o.z + fz * 0.1 + r)) { o.y += up; stepped = true; break; }
        }
        if (!stepped) { o.vy = 7.5; o.vx = fx * 2.5; o.vz = fz * 2.5; this.emit({ k: 'sfx', s: 'cluck' }); }
      }
      if (this.r() < dt * 0.6) { o.vy = 6; o.vx = fx * 3; o.vz = fz * 3; this.emit({ k: 'sfx', s: 'cluck' }); }
    } else {
      o.vy -= GRAVITY * dt;
      const hit = this.moveBox(o, o.vx * dt, o.vy * dt, o.vz * dt, r, h);
      if (hit.y) { o.vy = 0; o.vx = 0; o.vz = 0; }
      if (hit.x || hit.z) { o.vx = 0; o.vz = 0; }
    }
    if (o.y < this.water - 0.3) { o.dead = true; this.emit({ k: 'splash', x: o.x, y: this.water, z: o.z }); this.emit({ k: 'sfx', s: 'splash' }); if (this.turn && this.turn.walker === o.id) { this.turn.walker = null; this.startRetreat(); } }
  }

  // ---------------- cámara sugerida ----------------
  camera() {
    const c = this.cameraRaw();
    if (c.m !== 'orbit' && c.f) this.lastCamF = c.f;
    else if (c.m === 'orbit' && this.phase !== 'over' && this.lastCamF) return { m: 'look', f: this.lastCamF };
    return c;
  }

  cameraRaw() {
    const T = this.turn;
    const ch = this.activeChicken();
    if (this.phase === 'over') return { m: 'orbit' };
    if (this.camOverride) return { m: 'look', f: [this.camOverride.x, this.camOverride.y, this.camOverride.z] };
    if (T && T.walker) { const g = this.objs.find((o) => o.id === T.walker); if (g) return { m: 'follow', f: [g.x, g.y, g.z], yaw: g.yaw }; }
    if (T && T.track) {
      const p = this.objs.find((o) => o.id === T.track && !o.dead);
      if (p) return { m: 'proj', f: [p.x, p.y, p.z] };
      T.track = null;
    }
    const flying = this.objs.find((o) => o.proj && !o.dead && o.kind !== 'regalo');
    if (flying && this.phase !== 'play') return { m: 'proj', f: [flying.x, flying.y, flying.z] };
    if (this.lastBoom && this.phase === 'settle') return { m: 'look', f: [this.lastBoom.x, this.lastBoom.y, this.lastBoom.z] };
    if (this.phase === 'settle') {
      const air = this.chickens.find((c) => c.alive && (c.air || c.dying > 0));
      if (air) return { m: 'look', f: [air.x, air.y, air.z] };
    }
    if (!ch) return { m: 'orbit' };
    if (T && T.mode === 'target' && T.cursor) return { m: 'target', f: [T.cursor.x, this.terrain.surfaceY(T.cursor.x, T.cursor.z), T.cursor.z], yaw: ch.yaw };
    if (T && T.view) return { m: 'over', f: [ch.x, ch.y, ch.z], yaw: ch.yaw };
    if (T && T.mode === 'aim' && (this.phase === 'play')) return { m: 'aim', f: [ch.x, ch.y, ch.z], yaw: ch.yaw, pitch: T.pitch };
    return { m: 'follow', f: [ch.x, ch.y, ch.z], yaw: ch.yaw };
  }

  // ---------------- foto para los celulares ----------------
  snapshot() {
    const T = this.turn;
    const q = (v) => Math.round(v * 100) / 100;
    return {
      ch: this.chickens.map((c) => [q(c.x), q(c.y), q(c.z), q(c.yaw), c.hp, (c.alive ? 1 : 0) | (c.air ? 2 : 0) | (c.movingT > 0 ? 4 : 0) | (c.rope ? 8 : 0) | (c.jet > 0 ? 16 : 0) | (c.umbrella ? 32 : 0) | (c.dying > 0 ? 64 : 0) | (c.hurtT > 0 ? 128 : 0), c.rope ? [q(c.rope.x), q(c.rope.y), q(c.rope.z)] : 0, q(c.walk % 10)]),
      o: this.objs.filter((o) => !o.dead && !(o.delay > 0)).map((o) => [o.id, o.kind, q(o.x), q(o.y), q(o.z), q(o.yaw), o.para ? 1 : 0, o.trig ? 1 : 0, o.name || 0]),
      cam: this.camera(),
      w: [q(this.wind.x), q(this.wind.z)],
      water: q(this.water),
      ph: this.phase,
      tv: this.tview(),
    };
  }

  tview() {
    const T = this.turn;
    const q = (v) => Math.round(v * 100) / 100;
    return T ? { team: T.team, ch: T.ch, clock: Math.ceil(T.clock), retreat: Math.ceil(T.retreat), weapon: T.weapon, mode: T.mode, pitch: q(T.pitch), power: q(T.power), charging: T.charging ? 1 : 0, cursor: T.cursor ? [q(T.cursor.x), q(T.cursor.z)] : 0, fuse: T.fuse, shots: T.shots, walker: !!T.walker } : null;
  }

  // estado para dibujar directamente en el anfitrión (sin redondear)
  view() {
    return {
      chickens: this.chickens.map((c) => ({ id: c.id, x: c.x, y: c.y, z: c.z, yaw: c.yaw, hp: c.hp, alive: c.alive, air: c.air, walking: c.movingT > 0, rope: c.rope ? [c.rope.x, c.rope.y, c.rope.z] : null, jet: c.jet > 0, umbrella: c.umbrella, dying: c.dying > 0, hurt: c.hurtT > 0 })),
      objs: this.objs.filter((o) => !o.dead && !(o.delay > 0)).map((o) => ({ id: o.id, kind: o.kind, x: o.x, y: o.y, z: o.z, yaw: o.yaw, para: !!o.para, trig: !!o.trig, name: o.name })),
      cam: this.camera(), water: this.water, phase: this.phase, turn: this.tview(),
    };
  }

  // lo que el mando del jugador del turno necesita saber
  turnInfo() {
    const T = this.turn;
    if (!T) return null;
    const team = this.teams[T.team];
    const ch = this.activeChicken();
    return {
      team: T.team, teamName: team.name, color: team.color, ch: ch ? ch.name : '', slot: T.slot, cpu: T.cpu,
      clock: Math.ceil(T.clock), retreat: this.phase === 'retreat' ? Math.ceil(T.retreat) : 0, phase: this.phase,
      weapon: T.weapon, fuse: T.fuse, mode: T.mode, inv: team.inv, walker: !!T.walker, power: T.power, charging: T.charging,
      pitch: Math.round(T.pitch * 1000) / 1000, yaw: ch ? Math.round(ch.yaw * 1000) / 1000 : 0,
      wind: Math.round(Math.hypot(this.wind.x, this.wind.z) * 10), dd: team.dd, jet: ch && ch.jet > 0, rope: ch && !!ch.rope, umbrella: ch && ch.umbrella,
    };
  }

  teamSummary() {
    return this.teams.map((t) => {
      const mine = this.chickens.filter((c) => c.team === t.idx);
      return { idx: t.idx, name: t.name, color: t.color, cpu: t.cpu !== null && t.cpu !== undefined, alliance: t.alliance, hp: mine.reduce((s, c) => s + (c.alive ? c.hp : 0), 0), max: mine.length * this.cfg.hp, alive: mine.filter((c) => c.alive).length };
    });
  }
}

export { BOOM };
