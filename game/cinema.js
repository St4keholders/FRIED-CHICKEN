// Director de cinemáticas del modo Historia: quién habla, con qué retrato y hacia dónde mira la
// cámara. Solo cálculos (sin Three.js ni DOM): el render usa el modo de cámara 'cine'.
import { WORLD_X, WORLD_Z } from './constants.js';

export const SPEAKERS = {
  zorro: { id: 'zorro', name: 'Zorro Rufo', color: '#ff9f1a', acc: 'zorro', robot: false },
  abuela: { id: 'abuela', name: 'Gallina Abuela', color: '#f0dcc0', acc: 'chef', robot: false },
  lata: { id: 'lata', name: 'Pollito de Lata', color: '#9aa7b4', acc: 'casco', robot: true },
  sargento: { id: 'sargento', name: 'Sargento Lata', color: '#6d7a88', acc: 'casco', robot: true },
  narradora: { id: 'narradora', name: 'Narradora', color: '#ffd23f', acc: 'gorra', robot: false, narrator: true },
};

export const CAM_STYLES = ['zoom', 'pan', 'orbit'];

// ctx: { heroNames: [..], heroColor, heroAcc }
export function speakerFor(who, ctx = {}) {
  if (SPEAKERS[who]) return SPEAKERS[who];
  const m = /^h(\d)$/.exec(who || '');
  if (m) {
    const names = ctx.heroNames && ctx.heroNames.length ? ctx.heroNames : ['Pío'];
    const k = +m[1];
    return { id: who, name: names[k % names.length], color: ctx.heroColor || '#ff4757', acc: ctx.heroAcc || 'casco', robot: false, hero: true };
  }
  return SPEAKERS.narradora;
}

// convierte el guion de un nivel ('intro' | 'outro') en pasos listos para mostrar
export function buildCinematic(level, kind, ctx = {}) {
  const script = (level && level[kind]) || [];
  return script.map((b, i) => ({
    speaker: speakerFor(b.who, ctx),
    text: b.text,
    focus: b.focus || 'island',
    style: b.style || CAM_STYLES[i % CAM_STYLES.length],
  }));
}

function avg(list) {
  if (!list.length) return null;
  let x = 0, y = 0, z = 0;
  for (const p of list) { x += p.x; y += p.y; z += p.z; }
  return [x / list.length, y / list.length + 1, z / list.length];
}

// punto del mundo al que mira la cámara en un paso; 'm' es la partida (Match) o algo parecido
export function focusPoint(focus, m) {
  const island = [WORLD_X / 2, 5, WORLD_Z / 2];
  if (!m || !m.chickens) return island;
  const alive = m.chickens.filter((c) => c.alive);
  let p = null;
  if (focus === 'heroes') p = avg(alive.filter((c) => !c.npc && !c.boss && m.teams[c.team].alliance === 'H'));
  else if (focus === 'enemies') p = avg(alive.filter((c) => !c.npc && !c.boss && m.teams[c.team].alliance !== 'H'));
  else if (focus === 'abuela') p = avg(alive.filter((c) => c.npc === 'abuela'));
  else if (focus === 'boss') p = avg(alive.filter((c) => c.boss));
  else if (focus === 'machines') p = avg((m.objs || []).filter((o) => o.kind === 'maquinaLata' && !o.dead));
  return p || island;
}

// cámara del paso: 't' son los segundos desde que apareció. Siempre devuelve números finitos.
export function beatCamera(style, f, t) {
  const T = Math.max(0, t || 0);
  const k = Math.min(1, T / 5);
  let yaw, dist, h;
  switch (style) {
    case 'zoom': yaw = 0.6; dist = 24 - k * 14; h = 8 - k * 4; break;
    case 'pan': yaw = 0.2 + T * 0.16; dist = 13; h = 4.5; break;
    case 'orbit': default: yaw = 2.2 - T * 0.12; dist = 17 - k * 2; h = 6; break;
  }
  return { m: 'cine', f, yaw, dist, h };
}

// estado de una cinemática en curso
export class Cinema {
  constructor(kind, beats, level) {
    this.kind = kind; // 'intro' | 'outro'
    this.level = level;
    this.beats = beats;
    this.i = 0;
    this.t = 0;
  }
  get done() { return this.i >= this.beats.length; }
  get cur() { return this.beats[Math.min(this.i, this.beats.length - 1)] || null; }
  update(dt) { this.t += dt; }
  advance() { if (this.done) return; this.i++; this.t = 0; }
  skip() { this.i = this.beats.length; }
  camera(m) {
    const b = this.cur;
    if (!b) return { m: 'orbit' };
    return beatCamera(b.style, focusPoint(b.focus, m), this.t);
  }
  // lo que necesitan la interfaz del TV y los celulares
  view() {
    const b = this.cur;
    return {
      kind: this.kind, level: this.level, i: Math.min(this.i, this.beats.length - 1), n: this.beats.length,
      speaker: b ? b.speaker : null, text: b ? b.text : '',
    };
  }
}
