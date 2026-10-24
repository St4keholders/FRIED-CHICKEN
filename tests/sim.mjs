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
console.log(fails ? `\n${fails} FALLAS` : '\nTodo bien');
process.exit(fails ? 1 : 0);
