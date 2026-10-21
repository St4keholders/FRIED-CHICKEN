// Modelos en vóxeles hechos con código: pollitos, robots, armas, cajas y objetos
import * as THREE from 'three';

const PX = 0.1; // un "píxel" del modelo en unidades del mundo

function rgb(h) {
  const n = parseInt(h.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
function shade(h, f) {
  const c = rgb(h).map((v) => Math.max(0, Math.min(1, v * f)));
  return '#' + c.map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('');
}

// une muchas cajas en una sola geometría con colores por vértice
export function boxesGeometry(boxes, unit = PX) {
  const pos = [], nor = [], col = [], ind = [];
  const faces = [
    [[1, 0, 0], [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]], 0.8],
    [[-1, 0, 0], [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]], 0.8],
    [[0, 1, 0], [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], 1.0],
    [[0, -1, 0], [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], 0.55],
    [[0, 0, 1], [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], 0.9],
    [[0, 0, -1], [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]], 0.7],
  ];
  for (const b of boxes) {
    const [x, y, z, w, h, d, c] = b;
    const cc = rgb(c);
    for (const [n, corners] of faces) {
      const s = pos.length / 3;
      for (const k of corners) {
        pos.push((x + k[0] * w) * unit, (y + k[1] * h) * unit, (z + k[2] * d) * unit);
        nor.push(n[0], n[1], n[2]);
        col.push(cc[0], cc[1], cc[2]);
      }
      ind.push(s, s + 1, s + 2, s, s + 2, s + 3);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(ind);
  g.computeBoundingSphere();
  return g;
}

export const toonMat = new THREE.MeshLambertMaterial({ vertexColors: true });

// ---------------- pollito de goma ----------------
const YEL = '#ffd23a', YEL2 = '#f2b51f', ORA = '#ff8a1f', BLK = '#1d1420', WHT = '#ffffff', PINK = '#ff9db5';

function accessoryBoxes(acc, team, dark) {
  const b = [];
  switch (acc) {
    case 'vueltiao':
      b.push([-5, 12, -4, 10, 1, 9, '#f4ead2'], [-3, 13, -2, 6, 2, 5, '#f4ead2'], [-3, 13, -2.1, 6, 0.6, 5.2, BLK], [-5.1, 12, -4.1, 10.2, 0.4, 9.2, BLK]);
      break;
    case 'gorra':
      b.push([-3.2, 12, -2.2, 6.4, 1.6, 6.4, team], [-2.6, 11.6, 4, 5.2, 0.6, 3, dark]);
      break;
    case 'corona':
      b.push([-2.6, 12, -1.6, 5.2, 1.2, 5.2, '#ffcc00']);
      for (const [x, z] of [[-2.6, -1.6], [1.6, -1.6], [-2.6, 2.6], [1.6, 2.6], [-0.5, -1.6], [-0.5, 2.6]]) b.push([x, 13.2, z, 1, 1.2, 1, '#ffcc00']);
      b.push([-0.5, 12.3, 3.5, 1, 0.8, 0.3, '#ff3355']);
      break;
    case 'bandana':
      b.push([-3.2, 10.4, -2.2, 6.4, 1.4, 6.4, team], [-1, 9.8, -3.6, 2, 1.6, 1.4, dark]);
      break;
    case 'gafas':
      b.push([-3.1, 10, 3.9, 6.2, 0.5, 0.4, BLK], [-2.8, 9.2, 4, 2.4, 1.4, 0.4, BLK], [0.4, 9.2, 4, 2.4, 1.4, 0.4, BLK], [-3.2, 12, -2.2, 6.4, 0.8, 6.4, team]);
      break;
    case 'copete':
      for (let i = 0; i < 5; i++) b.push([-0.6, 12 + (i % 2) * 0.4, -2 + i * 1.2, 1.2, 2.6 - Math.abs(i - 2) * 0.4, 1.2, team]);
      break;
    case 'chef':
      b.push([-3, 12, -2, 6, 1, 6, WHT], [-3.6, 13, -2.6, 7.2, 3, 7.2, WHT], [-3.2, 12, -2.2, 6.4, 0.5, 6.4, team]);
      break;
    case 'zorro':
      b.push([-3.2, 12, -2.2, 6.4, 1, 6.4, '#ff7a1a'], [-3, 13, -1.5, 1.6, 2, 1.6, '#ff7a1a'], [1.4, 13, -1.5, 1.6, 2, 1.6, '#ff7a1a'], [1.6, 10, 4.1, 1.4, 1.4, 0.3, '#ffd23f']);
      break;
    case 'casco':
    default:
      b.push([-3.4, 11.6, -2.4, 6.8, 2, 6.8, team], [-3.6, 11.4, 3.4, 7.2, 0.6, 1.4, dark], [-0.5, 13.6, -2, 1, 0.6, 6, WHT]);
      break;
  }
  return b;
}

function chickenBoxes(team, acc) {
  const dark = shade(team, 0.7);
  const b = [
    // patas
    [-2.6, 0, -0.5, 1.4, 1, 2.6, ORA], [1.2, 0, -0.5, 1.4, 1, 2.6, ORA],
    // cuerpo redondeado
    [-4, 1, -4, 8, 5, 8, YEL], [-3, 0.6, -3, 6, 0.5, 6, YEL2], [-3, 6, -3, 6, 1, 6, YEL],
    [-4.4, 2, -3, 0.5, 3, 6, YEL], [3.9, 2, -3, 0.5, 3, 6, YEL],
    // alas
    [-5, 2.5, -2.5, 1, 3, 4.5, YEL2], [4, 2.5, -2.5, 1, 3, 4.5, YEL2],
    // colita
    [-1, 4, -5, 2, 2, 1.2, YEL2],
    // cabeza
    [-3, 7, -2, 6, 5, 6, YEL], [-2.5, 11.6, -1.5, 5, 0.6, 5, YEL],
    // pico
    [-1.4, 8.4, 4, 2.8, 1.2, 1.8, ORA], [-1, 7.9, 4, 2, 0.6, 1.4, '#e06a10'],
    // ojos
    [-2.4, 9.7, 3.9, 1.2, 1.4, 0.3, BLK], [1.2, 9.7, 3.9, 1.2, 1.4, 0.3, BLK],
    [-2.1, 10.5, 3.95, 0.5, 0.5, 0.3, WHT], [1.5, 10.5, 3.95, 0.5, 0.5, 0.3, WHT],
    // cachetes
    [-3.1, 8.6, 3.2, 1, 0.8, 0.9, PINK], [2.1, 8.6, 3.2, 1, 0.8, 0.9, PINK],
    // pañoleta del equipo
    [-3.6, 6.2, -3.6, 7.2, 1, 7.2, team], [-1, 4.8, 3.4, 2, 1.6, 0.6, dark],
  ];
  return b.concat(accessoryBoxes(acc, team, dark));
}

function robotBoxes(team) {
  const MET = '#b8c4cf', MET2 = '#8693a0', dark = shade(team, 0.7);
  return [
    [-2.6, 0, -0.5, 1.4, 1.2, 2.6, '#5d6873'], [1.2, 0, -0.5, 1.4, 1.2, 2.6, '#5d6873'],
    [-4, 1, -4, 8, 6, 8, MET], [-4.3, 2.5, -3, 0.4, 3, 6, MET2], [3.9, 2.5, -3, 0.4, 3, 6, MET2],
    [-5, 2.5, -2, 1, 3, 4, MET2], [4, 2.5, -2, 1, 3, 4, MET2],
    [-1.2, 3, 3.9, 2.4, 2.4, 0.4, '#ffcc00'], [-0.6, 3.6, 4.1, 1.2, 1.2, 0.3, '#ff5500'],
    [-3, 7, -2, 6, 5, 6, MET], [-2.6, 9.2, 3.9, 5.2, 1.6, 0.4, '#18222c'], [-2, 9.6, 4.1, 1.4, 0.8, 0.3, '#ff2244'], [0.6, 9.6, 4.1, 1.4, 0.8, 0.3, '#ff2244'],
    [-1.4, 7.8, 4, 2.8, 1, 1.4, '#ff9a3c'],
    [-0.3, 12, -0.3, 0.6, 2.4, 0.6, MET2], [-0.7, 14.2, -0.7, 1.4, 1.4, 1.4, '#ff2244'],
    [-3.2, 6.6, -3.2, 0.8, 0.8, 0.8, MET2], [2.4, 6.6, -3.2, 0.8, 0.8, 0.8, MET2],
    [-3.6, 6.2, -3.6, 7.2, 1, 7.2, team], [-1, 4.8, 3.4, 2, 1.6, 0.6, dark],
  ];
}

const geoCache = new Map();
export function chickenGeometry(team, acc, robot) {
  const key = `${team}|${acc}|${robot ? 1 : 0}`;
  if (!geoCache.has(key)) geoCache.set(key, boxesGeometry(robot ? robotBoxes(team) : chickenBoxes(team, acc)));
  return geoCache.get(key);
}

// pollito listo para la escena: un grupo con el cuerpo (que se anima) y un arma en la mano
export function makeChicken(team, acc, robot) {
  const root = new THREE.Group();
  const body = new THREE.Mesh(chickenGeometry(team, acc, robot), toonMat);
  root.add(body);
  const gun = new THREE.Mesh(boxesGeometry([[-0.9, -0.9, 0, 1.8, 1.8, 7, '#5d6873'], [-1.2, -1.2, 5.5, 2.4, 2.4, 1.5, '#ff8a1f'], [-0.4, -2.6, 1.5, 0.8, 1.8, 1, '#3b2a1a']]), toonMat);
  gun.position.set(-0.45, 0.45, 0.15);
  gun.visible = false;
  root.add(gun);
  root.userData = { body, gun };
  return root;
}

// ---------------- objetos ----------------
function egg(c1, c2) {
  return [[-1.5, 0, -1.5, 3, 4, 3, c1], [-2, 1, -1, 4, 2, 2, c1], [-1, 1, -2, 2, 2, 4, c1], [-1, 4, -1, 2, 0.6, 2, c2]];
}

const MODEL_BOXES = {
  egg: () => egg('#fff3dc', '#ffe1a8'),
  granada: () => egg('#7fd14b', '#3e8e1e').concat([[-0.3, 4.4, -0.3, 0.6, 1.4, 0.6, '#5a3a1a']]),
  oro: () => egg('#ffd700', '#fff2a8').concat([[-2.2, 1.6, -0.2, 4.4, 0.4, 0.4, '#fff8d0']]),
  maiz: () => [[-1.2, 0, -1.2, 2.4, 6, 2.4, '#ffd23f'], [-1.6, -0.5, -1.6, 3.2, 1.4, 3.2, '#7bc043'], [-0.6, 6, -0.6, 1.2, 1, 1.2, '#7bc043']],
  pop: () => [[-0.8, 0, -0.8, 1.6, 1.6, 1.6, '#fffbe8'], [-0.5, 0.8, -1.1, 1, 1, 0.6, '#fff1b8']],
  paloma: () => [[-1.5, 0, -2.5, 3, 2.4, 5, '#9aa3ad'], [-1.2, 1.6, 2, 2.4, 2, 2, '#b4bcc5'], [-0.4, 2, 4, 0.8, 0.6, 1, '#ff9a3c'], [-5, 1.4, -1, 3.6, 0.5, 2.6, '#7d8792'], [1.4, 1.4, -1, 3.6, 0.5, 2.6, '#7d8792'], [-0.8, 2.3, 3.7, 0.4, 0.4, 0.2, '#111'], [0.4, 2.3, 3.7, 0.4, 0.4, 0.2, '#111']],
  bomba: () => [[-0.8, 0, -0.8, 1.6, 1.6, 1.6, '#4a4a4a'], [-0.2, 1.6, -0.2, 0.4, 0.6, 0.4, '#ff7a00']],
  vela: () => [[-1, 0, -1, 2, 7, 2, '#ff6fae'], [-1.05, 1, -1.05, 2.1, 0.8, 2.1, '#ffffff'], [-1.05, 3.5, -1.05, 2.1, 0.8, 2.1, '#ffffff'], [-0.15, 7, -0.15, 0.3, 1, 0.3, '#333'], [-0.5, 8, -0.5, 1, 1.4, 1, '#ffb000']],
  mina: () => [[-2.5, 0, -2.5, 5, 1.2, 5, '#9b6b3a'], [-3, 0.8, -1.5, 6, 1, 3, '#b07a44'], [-1.5, 0.8, -3, 3, 1, 6, '#b07a44'], [-1.2, 1, -1.2, 2.4, 2.6, 2.4, '#fff3dc'], [-0.4, 3.6, -0.4, 0.8, 0.6, 0.8, '#ff2222']],
  gallina: () => [
    [-2.4, 0, -0.5, 1.2, 1.4, 2.4, ORA], [1.2, 0, -0.5, 1.2, 1.4, 2.4, ORA],
    [-5, 1.4, -6, 10, 8, 11, '#fbfbf5'], [-6, 3, -4, 1.2, 4, 7, '#ececdf'], [4.8, 3, -4, 1.2, 4, 7, '#ececdf'], [-2, 6, -8, 4, 6, 2.5, '#fbfbf5'],
    [-3.2, 8, 3, 6.4, 6, 5, '#fbfbf5'], [-1, 14, 4, 2, 2.4, 3, '#ff2b3a'], [-1.2, 10, 8, 2.4, 1.4, 2.4, ORA], [-0.6, 8.4, 7.6, 1.2, 1.6, 1, '#ff2b3a'],
    [-2.6, 11.4, 7.9, 1.2, 1.2, 0.3, BLK], [1.4, 11.4, 7.9, 1.2, 1.2, 0.3, BLK], [-3.4, 12.6, 3.4, 6.8, 0.8, 4.4, '#ff6fae'],
  ],
  guacamaya: () => [[-1.4, 0, -3, 2.8, 2.6, 6, '#e3172b'], [-1.2, 1.2, 2.6, 2.4, 2.4, 2.4, '#e3172b'], [-0.5, 1.2, 4.8, 1, 1.4, 1.2, '#f5f0e0'], [-5, 1.2, -1.5, 3.8, 0.5, 3.4, '#1e74ff'], [1.2, 1.2, -1.5, 3.8, 0.5, 3.4, '#1e74ff'], [-4.2, 1.25, -1.2, 2, 0.5, 2.4, '#ffd23f'], [1.6, 1.25, -1.2, 2, 0.5, 2.4, '#ffd23f'], [-0.6, 0.6, -6, 1.2, 0.6, 3.2, '#1e74ff'], [-0.9, 2.6, 3.8, 0.4, 0.4, 0.2, '#111'], [0.5, 2.6, 3.8, 0.4, 0.4, 0.2, '#111']],
  barril: () => [[-2.6, 0, -2.6, 5.2, 7, 5.2, '#e5383b'], [-2.8, 1, -2.8, 5.6, 0.8, 5.6, '#7a1a1c'], [-2.8, 5.2, -2.8, 5.6, 0.8, 5.6, '#7a1a1c'], [-1, 2.4, 2.65, 2, 2, 0.3, '#ffd23f'], [-0.4, 2.8, 2.7, 0.8, 1.2, 0.3, '#111']],
  cajaArma: () => [[-3, 0, -3, 6, 6, 6, '#c47a3a'], [-3.1, 2.5, -3.1, 6.2, 1, 6.2, '#8a4f1f'], [-0.5, 0, -3.1, 1, 6, 6.2, '#8a4f1f'], [-1.2, 3.6, 3.05, 2.4, 1.6, 0.3, '#ffd23f'], [-0.5, 1.4, 3.05, 1, 1, 0.3, '#ffd23f']],
  cajaSalud: () => [[-3, 0, -3, 6, 6, 6, '#ffffff'], [-0.8, 0.8, 3.02, 1.6, 4.4, 0.3, '#ff2b3a'], [-2.2, 2.2, 3.02, 4.4, 1.6, 0.3, '#ff2b3a'], [-0.8, 6, -0.8, 1.6, 0.3, 1.6, '#ff2b3a'], [3.02, 2.2, -0.8, 0.3, 1.6, 1.6, '#ff2b3a'], [-3.32, 2.2, -0.8, 0.3, 1.6, 1.6, '#ff2b3a']],
  cajaUtil: () => [[-3, 0, -3, 6, 6, 6, '#3d8bfd'], [-3.1, 2.5, -3.1, 6.2, 1, 6.2, '#1c5fc7'], [-1, 2, 3.05, 2, 2, 0.3, '#ffffff']],
  sombrilla: () => {
    const b = [];
    const cols = ['#ff4757', '#ffffff'];
    for (let r = 0; r < 4; r++) for (let a = 0; a < 8; a++) {
      const ang = (a / 8) * Math.PI * 2, rad = 7 - r * 1.8;
      b.push([Math.cos(ang) * rad - 1.4, r * 1.2, Math.sin(ang) * rad - 1.4, 2.8, 1.2, 2.8, cols[(a + r) % 2]]);
    }
    b.push([-0.2, -9, -0.2, 0.4, 9, 0.4, '#444']);
    return b;
  },
  lapida: () => [[-2, 0, -1, 4, 5, 2, '#cfd6dd'], [-1.5, 5, -1, 3, 1, 2, '#cfd6dd'], [-0.8, 6, -1, 1.6, 0.6, 2, '#cfd6dd'], [-0.3, 2, 1.02, 0.6, 2.4, 0.2, '#7d8792'], [-1, 3.4, 1.02, 2, 0.6, 0.2, '#7d8792']],
};

const objCache = new Map();
export function objectGeometry(kind) {
  if (!objCache.has(kind)) objCache.set(kind, boxesGeometry((MODEL_BOXES[kind] || MODEL_BOXES.egg)()));
  return objCache.get(kind);
}
export function makeObject(kind, scale = 1) {
  const m = new THREE.Mesh(objectGeometry(kind), toonMat);
  m.scale.setScalar(scale);
  return m;
}

// qué modelo usa cada tipo de proyectil u objeto
export const PROJ_MODEL = {
  bazuca: 'egg', granada: 'granada', maiz: 'maiz', pop: 'pop', oro: 'oro', bomba: 'paloma', regalo: 'bomba',
  guacamaya: 'guacamaya', vela: 'vela', mina: 'mina', gallina: 'gallina', barril: 'barril',
  cajaArma: 'cajaArma', cajaSalud: 'cajaSalud', cajaUtil: 'cajaUtil', lapida: 'lapida',
};
