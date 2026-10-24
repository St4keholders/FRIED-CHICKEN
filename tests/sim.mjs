// Simulaciones sin navegador: partidas CPU contra CPU y cada arma disparada.
// Uso: node tests/sim.mjs
import { Match } from '../game/match.js';
import { CpuBrain } from '../game/ai.js';
import { DEFAULT_CFG, WEAPONS } from '../game/constants.js';
import { ISLAND_IDS } from '../game/islands.js';

const dt = 1 / 60;
const mkTeams = (cpu) => [0, 1].map((i) => ({ id: 't' + i, name: 'T' + i, color: '#f00', dark: '#800', acc: 'casco', cpu, slots: cpu === null ? [i] : [], alliance: 't' + i, names: ['a', 'b', 'c', 'd'] }));
let fails = 0;

// 1) CPU contra CPU en cada dificultad e isla
for (const level of [0, 1, 2]) for (const island of ISLAND_IDS) {
  const m = new Match({ cfg: { ...DEFAULT_CFG, chickens: 3 }, teams: mkTeams(level), seed: 1000 + level * 7 + island.length, island });
  const brains = m.teams.map(() => new CpuBrain(m, level));
  let last = null, turns = 0, maxMs = 0;
  for (let f = 0; f < 60 * 60 * 14 && m.phase !== 'over'; f++) {
    if (m.turn && m.turn !== last) { last = m.turn; turns++; brains[m.turn.team].begin(); }
    const t0 = performance.now();
    if (m.turn && (m.phase === 'play' || m.phase === 'retreat')) brains[m.turn.team].update(dt);
    m.update(dt);
    maxMs = Math.max(maxMs, performance.now() - t0);
    m.fx.length = 0;
  }
  const ok = m.phase === 'over' || m.sudden;
  if (!ok) fails++;
  console.log(`${ok ? 'OK ' : 'MAL'} cpu=${level} ${island.padEnd(9)} turnos=${turns} min=${(m.time / 60).toFixed(1)} fase=${m.phase} cuadroMax=${maxMs.toFixed(1)}ms`);
}

// 2) cada arma, sin errores
for (const w of WEAPONS) {
  const m = new Match({ cfg: { ...DEFAULT_CFG }, teams: mkTeams(null), seed: 777, island: 'castillo' });
  try {
    while (m.phase !== 'play') m.update(dt);
    const ch = m.activeChicken();
    const en = m.chickens.filter((c) => c.alive && c.team !== ch.team).sort((a, b) => Math.hypot(a.x - ch.x, a.z - ch.z) - Math.hypot(b.x - ch.x, b.z - ch.z))[0];
    ch.yaw = Math.atan2(en.x - ch.x, en.z - ch.z);
    m.act({ t: 'weapon', w: w.id });
    m.turn.pitch = w.id === 'cuerda' ? 1.2 : 0.4;
    if (m.turn.mode === 'target') m.turn.cursor = { x: en.x, z: en.z };
    const press = (n) => { m.control({ mx: 0, my: 0, fire: true }); for (let i = 0; i < n; i++) m.update(dt); m.control({ mx: 0, my: 0, fire: false }); };
    press(w.aim === 'power' ? 50 : 2);
    if (w.id === 'gallina') { for (let i = 0; i < 120; i++) m.update(dt); press(2); }
    if (w.id === 'escopeta') press(2);
    for (let i = 0; i < 60 * 30; i++) m.update(dt);
    console.log(`OK  arma ${w.id}`);
  } catch (e) { fails++; console.log(`MAL arma ${w.id}: ${e.message}`); }
}

// 3) aimDelta gira el pollito y respeta límites de inclinación
{
  const m = new Match({ cfg: { ...DEFAULT_CFG }, teams: mkTeams(null), seed: 123, island: 'arenero' });
  while (m.phase !== 'play') m.update(dt);
  const ch = m.activeChicken();
  const y0 = ch.yaw, p0 = m.turn.pitch;
  m.aimDelta(0.2, 0.3);
  const ok1 = Math.abs(ch.yaw - (y0 - 0.2)) < 1e-6 && Math.abs(m.turn.pitch - (p0 + 0.3)) < 1e-6;
  m.aimDelta(0, 10);
  const ok2 = m.turn.pitch === 1.45;
  m.aimDelta(0, -10);
  const ok3 = m.turn.pitch === -1.2;
  if (!ok1 || !ok2 || !ok3) fails++;
  console.log(`${ok1 && ok2 && ok3 ? 'OK ' : 'MAL'} aimDelta y límites de inclinación`);
}

// 4) elegir con qué pollito jugar al inicio del turno
{
  const m = new Match({ cfg: { ...DEFAULT_CFG, pickChicken: 'choose' }, teams: mkTeams(null), seed: 456, island: 'arenero' });
  while (m.phase !== 'play') m.update(dt);
  const c0 = m.turn.ch;
  const okStart = m.turn.canPick === true;
  m.act({ t: 'pickch', d: 1 });
  const c1 = m.turn.ch;
  const okSwitch = c1 !== c0;
  m.act({ t: 'pickch', d: -1 });
  const okBack = m.turn.ch === c0;
  m.jump(m.activeChicken(), false);
  const okLocked = m.turn.canPick === false;
  m.act({ t: 'pickch', d: 1 });
  const okNoSwitchAfter = m.turn.ch === c0;
  const allOk = okStart && okSwitch && okBack && okLocked && okNoSwitchAfter;
  if (!allOk) fails++;
  console.log(`${allOk ? 'OK ' : 'MAL'} elegir pollito del turno (pickChicken=choose)`);
}

// 5) salto atrás activa backflip y lo limpia al aterrizar
{
  const m = new Match({ cfg: { ...DEFAULT_CFG }, teams: mkTeams(null), seed: 789, island: 'arenero' });
  while (m.phase !== 'play') m.update(dt);
  const ch = m.activeChicken();
  m.act({ t: 'back' });
  const okStart = ch.backflip > 0.5 && (m.snapshot().ch[ch.id][5] & 256) === 256;
  for (let i = 0; i < 120 && ch.air; i++) m.update(dt);
  const okLand = ch.backflip === 0 && !ch.air;
  if (!okStart || !okLand) fails++;
  console.log(`${okStart && okLand ? 'OK ' : 'MAL'} voltereta en salto atrás (backflip)`);
}

// 6) vista en primera persona (fp) para bazuca, granada y maíz pira
{
  const m = new Match({ cfg: { ...DEFAULT_CFG }, teams: mkTeams(null), seed: 321, island: 'arenero' });
  while (m.phase !== 'play') m.update(dt);
  let ok = true;
  for (const w of ['bazuca', 'granada', 'maiz']) {
    m.act({ t: 'weapon', w });
    m.act({ t: 'fp' });
    if (!m.turn.fp || m.camera().m !== 'fp') ok = false;
    m.act({ t: 'fp' });
    if (m.turn.fp || m.camera().m === 'fp') ok = false;
  }
  m.act({ t: 'weapon', w: 'bazuca' });
  m.act({ t: 'fp' });
  m.act({ t: 'weapon', w: 'escopeta' });
  if (m.turn.fp || m.camera().m === 'fp') ok = false;
  if (!ok) fails++;
  console.log(`${ok ? 'OK ' : 'MAL'} vista en primera persona para bazuca, granada y maíz`);
}

// 7) cajas trampa, utilidad Visor y fuego de barriles (5 daño/s)
{
  const m = new Match({ cfg: { ...DEFAULT_CFG }, teams: mkTeams(null), seed: 654, island: 'arenero' });
  while (m.phase !== 'play') m.update(dt);
  const ch = m.activeChicken();
  const team = m.teams[ch.team];

  // utilidad Visor
  const cu = m.addObj({ kind: 'cajaUtil', x: ch.x, y: ch.y, z: ch.z, ground: true, util: 'visor' });
  m.pickCrate(ch, cu);
  const visorOn = team.visor === true && m.tview().visor === true;
  m.fire(0.5);
  const visorConsumed = team.visor === false;

  // caja trampa
  const hp0 = ch.hp;
  const ct = m.addObj({ kind: 'cajaSalud', x: ch.x, y: ch.y, z: ch.z, ground: true, trap: true });
  m.pickCrate(ch, ct);
  const trapBoom = ch.hp < hp0 && ct.dead;

  // barril deja fuego que hace 5 de daño por segundo
  const target = m.chickens.find((c) => c.alive && c.id !== ch.id);
  target.x = 32; target.z = 32; target.y = m.terrain.surfaceY(32, 32); target.vx = target.vy = target.vz = 0; target.air = false; target.ground = true;
  const bar = m.addObj({ kind: 'barril', x: 32, y: target.y, z: 32, hp: 1 });
  m.explodeObj(bar);
  const fireObj = m.objs.find((o) => o.kind === 'fuego' && !o.dead);
  target.x = fireObj.x; target.y = fireObj.y; target.z = fireObj.z; target.vx = target.vy = target.vz = 0; target.air = false; target.ground = true;
  const hpBeforeFire = target.hp;
  for (let i = 0; i < 60; i++) {
    target.x = fireObj.x; target.y = fireObj.y; target.z = fireObj.z;
    m.stepStatic(fireObj, dt);
  }
  const fireDmgOk = fireObj && (hpBeforeFire - target.hp) === 5;
  const allOk = visorOn && visorConsumed && trapBoom && fireDmgOk;
  if (!allOk) fails++;
  console.log(`${allOk ? 'OK ' : 'MAL'} cajas trampa, utilidad Visor y fuego de barril (5 daño/s)`);
}
console.log(fails ? `\n${fails} FALLAS` : '\nTodo bien');
process.exit(fails ? 1 : 0);
