// Simulaciones sin navegador: partidas CPU contra CPU y cada arma disparada.
// Uso: node tests/sim.mjs
import { Match } from '../game/match.js';
import { CpuBrain } from '../game/ai.js';
import { DEFAULT_CFG, WEAPONS } from '../game/constants.js';
import { ISLAND_IDS } from '../game/islands.js';
import { M } from '../game/terrain.js';
import { LEVELS, GOALS, SPEAKER_IDS, levelById, isValidLevel, storyTeams, storyCfg } from '../game/story.js';
import { buildCinematic, beatCamera, focusPoint, Cinema, CAM_STYLES } from '../game/cinema.js';
import { ISLANDS } from '../game/constants.js';

const dt = 1 / 60;
const mkTeams = (cpu) => [0, 1].map((i) => ({ id: 't' + i, name: 'T' + i, color: '#f00', dark: '#800', acc: 'casco', cpu, slots: cpu === null ? [i] : [], alliance: 't' + i, names: ['a', 'b', 'c', 'd'] }));
let fails = 0;
// SIM_QUICK=1 salta las partidas CPU contra CPU de las 3 dificultades (para iterar rápido)
const quick = !!process.env.SIM_QUICK;

// 1) CPU contra CPU en cada dificultad e isla
for (const level of [0, 1, 2]) for (const island of ISLAND_IDS) {
  if (quick) continue;
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

// 8) detalles propios de cada isla (espuma en bañera, bolas de billar, imanes de nevera en cocina, gelatina en juguetes)
{
  // Bañera: espuma (M.WHITE) frena al caminar
  const mb = new Match({ cfg: { ...DEFAULT_CFG }, teams: mkTeams(null), seed: 111, island: 'banera' });
  while (mb.phase !== 'play') mb.update(dt);
  const cb = mb.activeChicken();
  cb.yaw = Math.PI / 2;
  const jt = mb.terrain.topAt(54, 60);
  mb.terrain.box(50, jt - 2, 56, 12, 4, 8, M.A);
  cb.x = 27; cb.z = 30; cb.y = mb.terrain.surfaceY(27, 30); cb.vx = cb.vy = cb.vz = 0; cb.air = false; cb.ground = true;
  mb.control({ mx: 0, my: 1, fire: false });
  for (let i = 0; i < 20; i++) mb.playerStep(dt);
  const distNormal = cb.x - 27;

  mb.terrain.box(50, jt - 2, 56, 12, 4, 8, M.WHITE);
  cb.x = 27; cb.z = 30; cb.y = mb.terrain.surfaceY(27, 30); cb.vx = cb.vy = cb.vz = 0; cb.air = false; cb.ground = true;
  for (let i = 0; i < 20; i++) mb.playerStep(dt);
  const distFoam = cb.x - 27;
  const foamSlowOk = distFoam > 0.05 && distFoam < distNormal * 0.65;

  // Billar: bolas de billar ruedan cuando una explosión las empuja
  const mbi = new Match({ cfg: { ...DEFAULT_CFG }, teams: mkTeams(null), seed: 222, island: 'billar' });
  while (mbi.phase !== 'play') mbi.update(dt);
  const ball = mbi.objs.find((o) => o.kind === 'bolaBillar');
  const bx0 = ball ? ball.x : 0;
  if (ball) {
    mbi.explode(ball.x - 2.0, ball.y, ball.z, 3.5, 20, 8, false);
    for (let i = 0; i < 25; i++) mbi.stepStatic(ball, dt);
  }
  const ballRollOk = !!(ball && (ball.x - bx0) > 0.5);

  // Cocina: imanes de nevera (M.METAL) no se rompen con explosiones
  const mc = new Match({ cfg: { ...DEFAULT_CFG }, teams: mkTeams(null), seed: 333, island: 'cocina' });
  let mid = -1, mi = 0, mj0 = 0, mk = 0;
  for (let j = 10; j < 40 && mid < 0; j++)
    for (let k = 10; k < 80 && mid < 0; k++)
      for (let i = 10; i < 80 && mid < 0; i++) {
        const id = mc.terrain.idx(i, j, k);
        if (mc.terrain.v[id] === M.METAL && mc.terrain.d[id] > 140) { mid = id; mi = i; mj0 = j; mk = k; }
      }
  const denBefore = mid >= 0 ? mc.terrain.d[mid] : 0;
  mc.terrain.carve(mi * 0.5, mj0 * 0.5, mk * 0.5, 3.0, false);
  const denAfter = mid >= 0 ? mc.terrain.d[mid] : -1;
  const magnetUnbreakableOk = mid >= 0 && denBefore > 140 && denAfter === denBefore;

  // Juguetes: bloques de gelatina (M.C) hacen rebotar
  const mj = new Match({ cfg: { ...DEFAULT_CFG }, teams: mkTeams(null), seed: 444, island: 'juguetes' });
  while (mj.phase !== 'play') mj.update(dt);
  const cj = mj.activeChicken();
  mj.terrain.box(58, 22, 58, 12, 8, 12, M.C);
  const sy = mj.terrain.surfaceY(32, 32);
  cj.x = 32; cj.z = 32; cj.y = sy + 0.05; cj.vx = 0; cj.vy = -8; cj.vz = 0; cj.air = true; cj.ground = false; cj.peakY = sy + 2;
  mj.physics(dt);
  const jellyBounceOk = cj.vy > 4 && cj.air === true;

  const t11Ok = foamSlowOk && ballRollOk && magnetUnbreakableOk && jellyBounceOk;
  if (!t11Ok) fails++;
  console.log(`${t11Ok ? 'OK ' : 'MAL'} detalles de islas (espuma frena, bolas de billar ruedan, imanes irrompibles, gelatina rebota)`);
}
// 9) modo Historia: datos de los 8 niveles y director de cinemáticas
{
  const ids = new Set(ISLANDS.map((i) => i.id));
  let ok = LEVELS.length === 8 && LEVELS.every((l, i) => l.n === i + 1);
  const why = [];
  for (const l of LEVELS) {
    if (!ids.has(l.island)) { ok = false; why.push(`isla ${l.n}`); }
    if (!GOALS.includes(l.goal)) { ok = false; why.push(`objetivo ${l.n}`); }
    if (!l.goalText || !l.enemy || !(l.enemy.count > 0) || !(l.enemy.hp > 0)) { ok = false; why.push(`datos ${l.n}`); }
    for (const kind of ['intro', 'outro']) {
      if (!l[kind] || !l[kind].length) { ok = false; why.push(`${kind} ${l.n}`); continue; }
      for (const b of l[kind]) {
        const valid = SPEAKER_IDS.includes(b.who) || /^h[0-3]$/.test(b.who);
        if (!valid || !b.text || b.text.length > 140 || !['heroes', 'enemies', 'abuela', 'boss', 'machines', 'island'].includes(b.focus)) { ok = false; why.push(`guion ${l.n} ${kind}`); }
      }
    }
  }
  const need = { 2: 'water', 3: 'eggs', 4: 'protect', 5: 'machines', 6: 'boss', 7: 'survive', 8: 'boss' };
  for (const [n, g] of Object.entries(need)) if (levelById(+n).goal !== g) { ok = false; why.push(`meta ${n}`); }
  if (!isValidLevel(1) || !isValidLevel(8) || isValidLevel(0) || isValidLevel(9) || isValidLevel(2.5)) { ok = false; why.push('niveles válidos'); }
  if (!levelById(6).boss.shield || levelById(8).boss.id !== 'zorro' || !levelById(4).abuela || levelById(3).eggs.total !== 3 || levelById(5).machines.count !== 4 || levelById(7).rounds !== 6) { ok = false; why.push('detalles'); }
  if (!ok) fails++;
  console.log(`${ok ? 'OK ' : 'MAL'} historia: 8 niveles con isla, objetivo y guiones válidos ${why.join(', ')}`);

  const ctx = { heroNames: ['Pío', 'Kiki'], heroColor: '#ff4757', heroAcc: 'casco' };
  const beats = buildCinematic(levelById(1), 'intro', ctx);
  const names = beats.map((b) => b.speaker.name);
  const namesOk = names.includes('Pío') && names.includes('Kiki') && names.includes('Zorro Rufo') && beats.every((b) => b.text && CAM_STYLES.includes(b.style));
  const cin = new Cinema('intro', beats, 1);
  const seen = [];
  while (!cin.done) { seen.push(cin.view().i); cin.update(1); cin.advance(); }
  const flowOk = seen.length === beats.length && cin.done && cin.view().n === beats.length;
  const mt = new Match({ cfg: { ...DEFAULT_CFG }, teams: mkTeams(null), seed: 5, island: 'arenero' });
  let camOk = true;
  for (const style of CAM_STYLES) for (const t of [0, 1, 5, 99]) {
    const c = beatCamera(style, focusPoint('island', mt), t);
    if (c.m !== 'cine' || ![c.yaw, c.dist, c.h, ...c.f].every(Number.isFinite)) camOk = false;
  }
  const fp = focusPoint('heroes', mt);
  const focusOk = Array.isArray(fp) && fp.every(Number.isFinite) && focusPoint('boss', mt).length === 3 && focusPoint('machines', null).length === 3;
  const c2 = new Cinema('outro', buildCinematic(levelById(8), 'outro', ctx), 8);
  c2.skip();
  const skipOk = c2.done;
  const allOk = namesOk && flowOk && camOk && focusOk && skipOk;
  if (!allOk) fails++;
  console.log(`${allOk ? 'OK ' : 'MAL'} cinemáticas: hablan los pollitos de los jugadores, cámara con números válidos, avanzar y saltar`);
}
// ---- modo Historia: ayudantes ----
const HERO = { name: 'Los Crocantes', color: '#ff4757', dark: '#b3202e', acc: 'casco', names: ['Pío', 'Kiki', 'Plumón', 'Tito'], slots: [0], count: 3 };
function storyMatch(n, seed, heroCpu = 2) {
  const L = levelById(n);
  const teams = storyTeams(L, HERO);
  teams[0].cpu = heroCpu; // por defecto los héroes los juega una CPU difícil (solo para las pruebas)
  const m = new Match({ cfg: storyCfg(DEFAULT_CFG, L, 3), teams, seed, island: L.island, story: L });
  const brains = teams.map((t) => (t.npc ? null : new CpuBrain(m, t.cpu)));
  return { m, L, brains };
}
function playStory(n, seed, maxMin = 14) {
  const { m, L, brains } = storyMatch(n, seed);
  let last = null, turns = 0;
  const npcTurns = [];
  for (let f = 0; f < 60 * 60 * maxMin && m.phase !== 'over'; f++) {
    if (m.turn && m.turn !== last) {
      last = m.turn; turns++;
      if (m.chickens[m.turn.ch].npc) npcTurns.push(m.turn.ch);
      brains[m.turn.team].begin();
    }
    if (m.turn && (m.phase === 'play' || m.phase === 'retreat')) brains[m.turn.team].update(dt);
    m.update(dt);
    m.fx.length = 0;
  }
  return { m, L, turns, npcTurns };
}
function winStory(n, tries = 4) {
  let r = null;
  for (let i = 0; i < tries; i++) { r = playStory(n, 4000 + n * 31 + i * 7); if (r.m.over && r.m.over.win) return { ...r, tries: i + 1 }; }
  return { ...r, tries };
}

// 10) niveles 1, 2, 4 y 7: eliminar, agua que sube, proteger a la abuela y supervivencia
{
  // nivel 1: tutorial con pistas paso a paso y 2 pollitos de lata
  const s1 = storyMatch(1, 11, null);
  while (s1.m.phase !== 'play') s1.m.update(dt);
  const T1 = s1.m.turn;
  const h1 = s1.m.storyView().hint;
  T1.moved = true; const h2 = s1.m.storyView().hint;
  T1.aimed = true; const h3 = s1.m.storyView().hint;
  const foes1 = s1.m.chickens.filter((c) => s1.m.teams[c.team].alliance !== 'H' && c.alive).length;
  const l1Ok = h1.includes('Camina') && h2.includes('apuntar') && h3.includes('FUEGO') && foes1 === 2 && s1.m.sudden === false;

  // nivel 2: el agua sube cada 3 rondas
  const s2 = storyMatch(2, 12);
  const w0 = s2.m.water;
  for (let i = 0; i < 3; i++) s2.m.storyRound(0);
  const wAfter3 = s2.m.water;
  s2.m.storyRound(0);
  const l2Ok = wAfter3 === w0 && s2.m.water > w0 && s2.m.story.round === 4;

  // nivel 4: la Gallina Abuela es aliada que no juega turnos
  const s4 = storyMatch(4, 14);
  const ab = s4.m.chickens.find((c) => c.npc === 'abuela');
  const abTeam = s4.m.teams[ab.team];
  const l4a = !!ab && ab.hp === 80 && abTeam.alliance === 'H' && abTeam.npc === 'abuela';
  const r4 = playStory(4, 4004);
  const l4b = r4.npcTurns.length === 0 && r4.m.phase === 'over' && r4.m.over.story === true;
  // si matan a la abuela, se pierde aunque queden héroes
  const s4b = storyMatch(4, 15);
  const ab2 = s4b.m.chickens.find((c) => c.npc === 'abuela');
  ab2.hp = 0; ab2.alive = false;
  const l4c = s4b.m.storyCheck() === false;
  const l4Ok = l4a && l4b && l4c;

  // nivel 7: oleadas de reserva y se gana al terminar las 6 rondas
  const s7 = storyMatch(7, 17);
  const foesAt = () => s7.m.chickens.filter((c) => c.alive && s7.m.teams[c.team].alliance !== 'H').length;
  const f0 = foesAt();
  const reserves = s7.m.chickens.filter((c) => c.reserve).length;
  s7.m.storyRound(0); s7.m.storyRound(0); // ronda 1 y 2: llega la primera oleada
  const f2 = foesAt();
  for (let i = 0; i < 4; i++) s7.m.storyRound(0); // rondas 3 a 6
  const f6 = foesAt();
  const ended = s7.m.storyRound(0); // al empezar la ronda 7 se acaba: ganaron resistiendo
  const l7Ok = f0 === 2 && reserves === 6 && f2 === 4 && f6 === 8 && ended === true && s7.m.phase === 'over' && s7.m.over.win === true && s7.m.over.alliance === 'H';

  // las 4 partidas completas con jugadores automáticos terminan y se ganan
  const wins = [1, 2, 4, 7].map((n) => ({ n, ...winStory(n) }));
  const winOk = wins.every((w) => w.m.phase === 'over' && w.m.over.story && w.m.over.win);
  const allOk = l1Ok && l2Ok && l4Ok && l7Ok && winOk;
  if (!allOk) fails++;
  console.log(`${allOk ? 'OK ' : 'MAL'} historia niveles 1, 2, 4 y 7 (pistas ${l1Ok}, agua ${l2Ok}, abuela ${l4Ok}, oleadas ${l7Ok}, partidas ${wins.map((w) => `N${w.n}:${w.m.over && w.m.over.win ? 'gana' : 'no'}/${w.tries}`).join(' ')})`);
}
console.log(fails ? `\n${fails} FALLAS` : '\nTodo bien');
process.exit(fails ? 1 : 0);
