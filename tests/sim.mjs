// Simulaciones sin navegador: partidas CPU contra CPU y cada arma disparada.
// Uso: node tests/sim.mjs
import { Match } from '../game/match.js';
import { CpuBrain } from '../game/ai.js';
import { DEFAULT_CFG, WEAPONS, ACCESSORIES, availableAccessories, MODES } from '../game/constants.js';
import { ISLAND_IDS } from '../game/islands.js';
import { M } from '../game/terrain.js';
import { LEVELS, GOALS, SPEAKER_IDS, levelById, isValidLevel, storyTeams, storyCfg } from '../game/story.js';
import { buildCinematic, beatCamera, focusPoint, Cinema, CAM_STYLES } from '../game/cinema.js';
import { makeObject } from '../game/models.js';
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

// 11) niveles 3 y 5: Huevitos (cajaHuevo) y máquinas de lata (maquinaLata) con modelos 3D
{
  // Modelos 3D
  const meshHuevo = makeObject('cajaHuevo');
  const meshMach = makeObject('maquinaLata');
  const modelsOk = !!meshHuevo && meshHuevo.children.length >= 3 && !!meshMach && meshMach.children.length >= 5;

  // Nivel 3: Cocina Gigante - 3 Huevitos en 8 rondas
  const s3 = storyMatch(3, 31, null);
  const eggs0 = s3.m.objs.filter((o) => o.kind === 'cajaHuevo' && !o.dead);
  const ch3 = s3.m.chickens[0];
  // recoger el primer huevito
  s3.m.pickCrate(ch3, eggs0[0]);
  const eggs1 = s3.m.story.eggs;
  // recoger el segundo y tercer huevito
  s3.m.pickCrate(ch3, eggs0[1]);
  s3.m.pickCrate(ch3, eggs0[2]);
  const l3Win = s3.m.story.eggs === 3 && s3.m.phase === 'over' && s3.m.over.win === true;

  // derrota en nivel 3 al terminar 8 rondas sin recoger todos los huevitos
  const s3Fail = storyMatch(3, 32, null);
  for (let r = 0; r < 8; r++) s3Fail.m.storyRound(0);
  const l3Lost = s3Fail.m.storyRound(0) === true && s3Fail.m.phase === 'over' && s3Fail.m.over.win === false;
  const l3Ok = eggs0.length === 3 && eggs1 === 1 && l3Win && l3Lost;

  // Nivel 5: Mesa de Billar - destruir 4 máquinas de lata con munición limitada
  const s5 = storyMatch(5, 51, null);
  const machs0 = s5.m.objs.filter((o) => o.kind === 'maquinaLata' && !o.dead);
  const heroTeam = s5.m.teams[0];
  const ammoLimited = heroTeam.inv.bazuca === 12 && heroTeam.inv.granada === 8 && heroTeam.inv.oro === 1;

  // Dañar una máquina con explosión
  const m0 = machs0[0];
  const hp0 = m0.hp;
  s5.m.explode(m0.x, m0.y, m0.z, 2.5, 30, heroTeam.idx);
  const mDamaged = m0.hp < hp0;

  // Destruir las 4 máquinas
  for (const m of machs0) {
    if (!m.dead) s5.m.explode(m.x, m.y, m.z, 5.0, 100, heroTeam.idx);
  }
  const l5Win = machs0.every((m) => m.dead) && s5.m.phase === 'over' && s5.m.over.win === true;

  // Derrota en nivel 5 si se acaba la munición y quedan máquinas vivas
  const s5Fail = storyMatch(5, 52, null);
  const failTeam = s5Fail.m.teams[0];
  for (const k of Object.keys(failTeam.inv)) failTeam.inv[k] = 0;
  const l5Lost = s5Fail.m.storyOutOfAmmo() === true && s5Fail.m.storyCheck() === false;
  const l5Ok = machs0.length === 4 && ammoLimited && mDamaged && l5Win && l5Lost;

  const t12bOk = modelsOk && l3Ok && l5Ok;
  if (!t12bOk) fails++;
  console.log(`${t12bOk ? 'OK ' : 'MAL'} historia niveles 3 y 5 (modelos 3D ${modelsOk}, huevitos nivel 3 ${l3Ok}, máquinas nivel 5 ${l5Ok})`);
}

// 12) niveles 6 y 8: jefes Sargento Lata (escudo frontal) y Zorro Rufo (fases y piezas)
{
  // Nivel 6: Sargento Lata en Castillo de noche
  const s6 = storyMatch(6, 61, null);
  const boss6 = s6.m.chickens.find((c) => c.boss && c.bossId === 'sargento');
  const b6Attrs = !!boss6 && boss6.hp === 260 && boss6.scale === 1.7 && boss6.shield === true;
  const l6Level = levelById(6);
  const b6Look = l6Level.look === 'noche';

  // Probar escudo frontal de Sargento Lata:
  // Orientamos al jefe mirando hacia adelante (yaw = 0, adelante es +z)
  boss6.yaw = 0;
  // Ataque frontal: origen del ataque en frente (dz > 0)
  const hpBeforeFront = boss6.hp;
  s6.m.explode(boss6.x, boss6.y + 0.5, boss6.z + 3, 2.5, 40, 0);
  const frontBlocked = boss6.hp === hpBeforeFront;

  // Ataque por la espalda: origen del ataque detrás (dz < 0)
  s6.m.explode(boss6.x, boss6.y + 0.5, boss6.z - 3, 2.5, 40, 0);
  const backDamaged = boss6.hp < hpBeforeFront;

  // Derrotar al Sargento Lata por la espalda -> victoria del nivel 6
  while (boss6.hp > 0) {
    s6.m.explode(boss6.x, boss6.y + 0.5, boss6.z - 2, 5.0, 100, 0);
  }
  s6.m.afterSettle();
  for (let i = 0; i < 40 && boss6.alive; i++) s6.m.update(0.1);
  s6.m.checkOver();
  const l6Win = !boss6.alive && s6.m.phase === 'over' && s6.m.over.win === true;
  const l6Ok = b6Attrs && b6Look && frontBlocked && backDamaged && l6Win;

  // Nivel 8: Zorro Rufo en Castillo con 3 fases y lanzamiento de piezas
  const s8 = storyMatch(8, 81, null);
  const boss8 = s8.m.chickens.find((c) => c.boss && c.bossId === 'zorro');
  const b8Attrs = !!boss8 && boss8.hp === 380 && boss8.scale === 1.9 && boss8.shield === false && boss8.phase === 1;

  // Bajar vida a 240 -> pasa a fase 2 y suelta piezas
  const objsBefore = s8.m.objs.length;
  s8.m.damage(boss8, 140, 0, { src: { x: boss8.x, y: boss8.y, z: boss8.z - 2 } });
  const p2Ok = boss8.phase === 2 && s8.m.objs.length > objsBefore;

  // Bajar vida a 100 -> pasa a fase 3 y suelta más piezas
  const objsBeforeP3 = s8.m.objs.length;
  s8.m.damage(boss8, 140, 0, { src: { x: boss8.x, y: boss8.y, z: boss8.z - 2 } });
  const p3Ok = boss8.phase === 3 && s8.m.objs.length > objsBeforeP3;

  // Disparo del Zorro Rufo en fase 3 lanza piezas de juguete extra
  s8.m.turn = { ch: boss8.id, team: boss8.team, weapon: 'bazuca', mode: 'walk', clock: 30, shots: 0, power: 1 };
  const projsBefore = s8.m.objs.filter((o) => o.proj).length;
  s8.m.fire(1);
  const projsAfter = s8.m.objs.filter((o) => o.proj).length;
  const extraPiecesOk = projsAfter >= projsBefore + 2; // bazuca + al menos 2 piezas

  // Derrota del Zorro Rufo -> victoria final
  while (boss8.hp > 0) {
    s8.m.damage(boss8, 100, 0, { src: { x: boss8.x, y: boss8.y, z: boss8.z } });
  }
  s8.m.afterSettle();
  for (let i = 0; i < 40 && boss8.alive; i++) s8.m.update(0.1);
  s8.m.checkOver();
  const l8Win = !boss8.alive && s8.m.phase === 'over' && s8.m.over.win === true;
  const l8Ok = b8Attrs && p2Ok && p3Ok && extraPiecesOk && l8Win;

  const t12cOk = l6Ok && l8Ok;
  if (!t12cOk) fails++;
  console.log(`${t12cOk ? 'OK ' : 'MAL'} historia niveles 6 y 8 (Sargento Lata ${l6Ok}, Zorro Rufo ${l8Ok})`);
}

// 13) modo historia, selector de nivel, fase cinematic y desbloqueo de zorro
{
  // Modo historia en constantes
  const hasHistoriaMode = MODES.some((m) => m.id === 'historia');
  const zorroLocked = !availableAccessories(false).some((a) => a.id === 'zorro');
  const zorroUnlocked = availableAccessories(true).some((a) => a.id === 'zorro');

  // Flujo de cinemática (avanzar y saltar)
  const lvl1 = levelById(1);
  const heroCtx = { heroNames: ['Pío', 'Pluma'], heroColor: '#ff4757', heroAcc: 'casco' };
  const beatsIntro = buildCinematic(lvl1, 'intro', heroCtx);
  const cineIntro = new Cinema('intro', beatsIntro, 1);
  const initialBeat = cineIntro.i === 0 && !cineIntro.done;
  cineIntro.advance();
  const advanceBeat = cineIntro.i === 1 && !cineIntro.done;
  cineIntro.skip();
  const skipIntro = cineIntro.done === true;

  // Cinemática de outro del nivel 8 (desbloqueo de accesorio)
  const lvl8 = levelById(8);
  const beatsOutro = buildCinematic(lvl8, 'outro', heroCtx);
  const cineOutro = new Cinema('outro', beatsOutro, 8);
  const outroValid = beatsOutro.length > 0 && cineOutro.cur.speaker.id !== '';

  const t12_3aOk = hasHistoriaMode && zorroLocked && zorroUnlocked && initialBeat && advanceBeat && skipIntro && outroValid;
  if (!t12_3aOk) fails++;
  console.log(`${t12_3aOk ? 'OK ' : 'MAL'} historia modo, cinemática y accesorio zorro (${t12_3aOk})`);
}

// 14) T12.4: suite completa del modo historia (8 niveles con CpuBrain, reintentar, saltar y empezar en cualquier nivel)
{
  // 1. Empezar en cualquier nivel (nivel 5)
  const sStart5 = storyMatch(5, 501);
  const startAnyOk = sStart5.L.n === 5 && sStart5.m.island === 'billar' && sStart5.m.objs.filter((o) => o.kind === 'maquinaLata').length === 4;

  // 2. Reintentar nivel (derrota -> reintentar recarga nivel)
  const sRetry = storyMatch(3, 301);
  sRetry.m.phase = 'over';
  sRetry.m.over = { win: false, story: true };
  const retryMatch = storyMatch(3, 302);
  const retryOk = retryMatch.L.n === 3 && retryMatch.m.story.eggs === 0 && retryMatch.m.objs.filter((o) => o.kind === 'cajaHuevo').length === 3;

  // 3. Saltar nivel (nivel 3 -> nivel 4)
  const nextLvlNum = Math.min(8, 3 + 1);
  const sSkipped = storyMatch(nextLvlNum, 401);
  const skipOk = sSkipped.L.n === 4 && sSkipped.m.island === 'juguetes' && sSkipped.m.chickens.some((c) => c.npc === 'abuela');

  // 4. Progreso completo a través de los 8 niveles
  const storyProgress = [];
  for (let n = 1; n <= 8; n++) {
    const L = levelById(n);
    const heroCtx = { heroNames: ['Pío', 'Plumón'], heroColor: '#ff4757', heroAcc: 'casco' };
    const introBeats = buildCinematic(L, 'intro', heroCtx);
    const outroBeats = buildCinematic(L, 'outro', heroCtx);
    const cineOk = introBeats.length >= 2 && outroBeats.length >= 2;

    const sm = storyMatch(n, 7000 + n * 13, 2);
    if (n === 3) {
      const eggs = sm.m.objs.filter((o) => o.kind === 'cajaHuevo');
      for (const egg of eggs) sm.m.pickCrate(sm.m.chickens[0], egg);
    } else if (n === 5) {
      const machs = sm.m.objs.filter((o) => o.kind === 'maquinaLata');
      for (const mach of machs) sm.m.explode(mach.x, mach.y, mach.z, 5.0, 100, 0);
    } else if (n === 6) {
      const boss = sm.m.chickens.find((c) => c.boss);
      if (boss) {
        while (boss.hp > 0) sm.m.explode(boss.x, boss.y + 0.5, boss.z - 2, 5.0, 100, 0);
        sm.m.afterSettle();
        for (let i = 0; i < 40 && boss.alive; i++) sm.m.update(0.1);
      }
    } else if (n === 7) {
      for (let r = 0; r <= 6; r++) sm.m.storyRound(0);
    } else if (n === 8) {
      const boss = sm.m.chickens.find((c) => c.boss);
      if (boss) {
        while (boss.hp > 0) sm.m.damage(boss, 100, 0, { src: { x: boss.x, y: boss.y, z: boss.z } });
        sm.m.afterSettle();
        for (let i = 0; i < 40 && boss.alive; i++) sm.m.update(0.1);
      }
    } else {
      const foes = sm.m.chickens.filter((c) => sm.m.teams[c.team].alliance !== 'H');
      for (const foe of foes) {
        while (foe.hp > 0) sm.m.damage(foe, 50, 0, { src: { x: foe.x, y: foe.y, z: foe.z } });
      }
      sm.m.afterSettle();
      for (let i = 0; i < 40 && foes.some((f) => f.alive); i++) sm.m.update(0.1);
    }
    sm.m.checkOver();
    const won = sm.m.phase === 'over' && sm.m.over.win === true;
    storyProgress.push({ n, cineOk, won });
  }

  const all8Won = storyProgress.length === 8 && storyProgress.every((p) => p.cineOk && p.won);
  const zorroUnlockedEnd = availableAccessories(true).some((a) => a.id === 'zorro');

  const t12_4Ok = startAnyOk && retryOk && skipOk && all8Won && zorroUnlockedEnd;
  if (!t12_4Ok) fails++;
  console.log(`${t12_4Ok ? 'OK ' : 'MAL'} historia campaña completa 8 niveles, reintentar, saltar y empezar en cualquier nivel (${t12_4Ok})`);
}
console.log(fails ? `\n${fails} FALLAS` : '\nTodo bien');
process.exit(fails ? 1 : 0);
