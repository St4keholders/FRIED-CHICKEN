// Modelos 3D redondeados hechos con código (estilo caricatura): pollitos, robots, armas y objetos
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// ---------------- geometrías y materiales compartidos ----------------
const G = {
  sphere: new THREE.SphereGeometry(1, 28, 18),
  sphereLo: new THREE.SphereGeometry(1, 14, 10),
  half: new THREE.SphereGeometry(1, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2),
  cone: new THREE.ConeGeometry(1, 1, 18),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 24),
  cylOpen: new THREE.CylinderGeometry(1, 1, 1, 24, 1, true),
  torus: new THREE.TorusGeometry(1, 0.22, 12, 32),
  ico: new THREE.IcosahedronGeometry(1, 1),
  rbox: new RoundedBoxGeometry(1, 1, 1, 3, 0.12),
};
const mats = new Map();
export function mat(color, kind = 'phong') {
  const key = `${kind}|${color}`;
  if (!mats.has(key)) {
    let m;
    if (kind === 'basic') m = new THREE.MeshBasicMaterial({ color, toneMapped: false });
    else if (kind === 'metal') m = new THREE.MeshPhongMaterial({ color, shininess: 90, specular: 0x888888 });
    else if (kind === 'glow') m = new THREE.MeshPhongMaterial({ color, emissive: color, emissiveIntensity: 0.6, shininess: 60 });
    else m = new THREE.MeshPhongMaterial({ color, shininess: 38, specular: 0x2a2a2a });
    mats.set(key, m);
  }
  return mats.get(key);
}
export const toonMat = mat('#ffffff');

function shade(hex, f) {
  const c = new THREE.Color(hex);
  c.r = Math.min(1, c.r * f); c.g = Math.min(1, c.g * f); c.b = Math.min(1, c.b * f);
  return '#' + c.getHexString();
}

// una pieza: geometría + color + posición + escala (+ rotación)
function P(parent, geo, color, pos, scale, rot, kind) {
  const m = new THREE.Mesh(G[geo], mat(color, kind));
  m.position.set(pos[0], pos[1], pos[2]);
  if (typeof scale === 'number') m.scale.setScalar(scale); else m.scale.set(scale[0], scale[1], scale[2]);
  if (rot) m.rotation.set(rot[0], rot[1], rot[2]);
  parent.add(m);
  return m;
}

// ---------------- pollito de goma ----------------
const YEL = '#ffd23a', YEL2 = '#f6b820', BELLY = '#fff0a6', ORA = '#ff8a1f', BLK = '#1d1420', WHT = '#ffffff', PINK = '#ff9db5';

function eyes(g, y = 1.05, z = 0.34, robot = false) {
  for (const s of [-1, 1]) {
    if (robot) { P(g, 'sphere', '#ff2244', [s * 0.12, y, z + 0.06], [0.07, 0.07, 0.03], null, 'glow'); continue; }
    P(g, 'sphere', WHT, [s * 0.125, y, z], [0.13, 0.16, 0.1]);
    P(g, 'sphere', BLK, [s * 0.11, y - 0.01, z + 0.075], [0.065, 0.08, 0.04]);
    P(g, 'sphere', WHT, [s * 0.09, y + 0.03, z + 0.11], 0.022, null, 'basic');
  }
}

function accessory(g, acc, team) {
  const dark = shade(team, 0.7);
  switch (acc) {
    case 'vueltiao':
      P(g, 'cyl', '#f4ead2', [0, 1.27, 0.03], [0.56, 0.035, 0.56]);
      P(g, 'cyl', '#f4ead2', [0, 1.38, 0.03], [0.24, 0.2, 0.24]);
      P(g, 'cyl', BLK, [0, 1.33, 0.03], [0.245, 0.03, 0.245]);
      P(g, 'cyl', BLK, [0, 1.42, 0.03], [0.245, 0.03, 0.245]);
      P(g, 'torus', BLK, [0, 1.275, 0.03], [0.5, 0.5, 0.12], [Math.PI / 2, 0, 0]);
      break;
    case 'gorra':
      P(g, 'half', team, [0, 1.08, 0.04], [0.37, 0.3, 0.37]);
      P(g, 'cyl', dark, [0, 1.11, 0.33], [0.22, 0.03, 0.28]);
      P(g, 'sphere', WHT, [0, 1.38, 0.04], 0.05);
      break;
    case 'corona':
      P(g, 'cylOpen', '#ffcc00', [0, 1.36, 0.04], [0.21, 0.13, 0.21], null, 'metal');
      for (let a = 0; a < 6; a++) P(g, 'cone', '#ffcc00', [Math.cos(a * Math.PI / 3) * 0.2, 1.48, 0.04 + Math.sin(a * Math.PI / 3) * 0.2], [0.05, 0.12, 0.05], null, 'metal');
      P(g, 'sphere', '#ff3355', [0, 1.36, 0.26], 0.04, null, 'glow');
      break;
    case 'bandana':
      P(g, 'torus', team, [0, 1.12, 0.05], [0.34, 0.34, 0.3], [Math.PI / 2 - 0.15, 0, 0]);
      P(g, 'sphere', dark, [0, 1.1, -0.3], [0.07, 0.07, 0.07]);
      P(g, 'cone', team, [0.05, 1.0, -0.36], [0.06, 0.18, 0.03], [0.4, 0, 0.3]);
      break;
    case 'gafas':
      for (const s of [-1, 1]) P(g, 'cyl', BLK, [s * 0.13, 1.05, 0.43], [0.11, 0.03, 0.09], [Math.PI / 2, 0, 0], 'metal');
      P(g, 'cyl', BLK, [0, 1.07, 0.43], [0.02, 0.1, 0.02], [0, 0, Math.PI / 2]);
      P(g, 'half', team, [0, 1.12, 0.04], [0.33, 0.18, 0.33]);
      break;
    case 'copete':
      for (let i = 0; i < 5; i++) P(g, 'cone', team, [0, 1.36 - Math.abs(i - 2) * 0.03, -0.18 + i * 0.09], [0.06, 0.26 - Math.abs(i - 2) * 0.04, 0.06], [-0.3 + i * 0.12, 0, 0]);
      break;
    case 'chef':
      P(g, 'cyl', WHT, [0, 1.36, 0.04], [0.22, 0.24, 0.22]);
      P(g, 'sphere', WHT, [0, 1.55, 0.04], [0.29, 0.19, 0.29]);
      P(g, 'cyl', team, [0, 1.27, 0.04], [0.225, 0.04, 0.225]);
      break;
    case 'zorro':
      for (const s of [-1, 1]) P(g, 'cone', '#ff7a1a', [s * 0.17, 1.33, 0], [0.09, 0.2, 0.06], [0, 0, -s * 0.25]);
      P(g, 'torus', '#ff7a1a', [0, 1.16, 0.05], [0.33, 0.33, 0.2], [Math.PI / 2, 0, 0]);
      break;
    case 'casco':
    default:
      P(g, 'half', team, [0, 1.06, 0.05], [0.39, 0.33, 0.39]);
      P(g, 'torus', dark, [0, 1.065, 0.05], [0.38, 0.38, 0.18], [Math.PI / 2, 0, 0]);
      P(g, 'sphere', WHT, [0, 1.36, 0.05], [0.05, 0.03, 0.2]);
      break;
  }
  if (acc === 'gafas' || acc === 'bandana' || acc === 'copete' || acc === 'zorro') {
    for (let i = -1; i <= 1; i++) P(g, 'sphere', YEL, [i * 0.06, 1.34 + (i === 0 ? 0.04 : 0), 0.05], 0.06);
  }
}

function buildChicken(team, acc, robot) {
  const g = new THREE.Group();
  const dark = shade(team, 0.7);
  if (robot) {
    const MET = '#c3ccd6', MET2 = '#8d99a6';
    for (const s of [-1, 1]) P(g, 'sphere', '#5d6873', [s * 0.17, 0.04, 0.08], [0.12, 0.06, 0.16], null, 'metal');
    P(g, 'sphere', MET, [0, 0.47, 0], [0.46, 0.45, 0.46], null, 'metal');
    P(g, 'cyl', MET2, [0, 0.47, 0], [0.47, 0.06, 0.47], null, 'metal');
    P(g, 'sphere', '#ffcc00', [0, 0.45, 0.42], [0.1, 0.1, 0.05], null, 'glow');
    for (const s of [-1, 1]) P(g, 'sphere', MET2, [s * 0.46, 0.5, 0], [0.09, 0.22, 0.18], [0, 0, s * 0.25], 'metal');
    P(g, 'sphere', MET, [0, 0.98, 0.06], 0.35, null, 'metal');
    P(g, 'rbox', '#18222c', [0, 1.03, 0.3], [0.42, 0.16, 0.12]);
    eyes(g, 1.03, 0.3, true);
    P(g, 'cone', '#ff9a3c', [0, 0.92, 0.44], [0.08, 0.18, 0.08], [Math.PI / 2, 0, 0], 'metal');
    P(g, 'cyl', MET2, [0, 1.42, 0.06], [0.025, 0.2, 0.025], null, 'metal');
    P(g, 'sphere', '#ff2244', [0, 1.55, 0.06], 0.06, null, 'glow');
    for (const s of [-1, 1]) P(g, 'sphere', MET2, [s * 0.33, 1.0, 0.06], [0.04, 0.07, 0.07], null, 'metal');
    P(g, 'torus', team, [0, 0.78, 0.02], [0.31, 0.31, 0.3], [Math.PI / 2, 0, 0]);
    P(g, 'sphere', dark, [0, 0.72, 0.31], 0.07);
    return g;
  }
  for (const s of [-1, 1]) P(g, 'sphere', ORA, [s * 0.17, 0.035, 0.1], [0.12, 0.05, 0.17]);
  P(g, 'sphere', YEL, [0, 0.47, 0], [0.47, 0.44, 0.47]);
  P(g, 'sphere', BELLY, [0, 0.42, 0.28], [0.32, 0.28, 0.2]);
  for (const s of [-1, 1]) P(g, 'sphere', YEL2, [s * 0.45, 0.5, -0.02], [0.1, 0.24, 0.2], [0, 0, s * 0.35]);
  P(g, 'cone', YEL2, [0, 0.62, -0.45], [0.09, 0.22, 0.09], [-2.1, 0, 0]);
  P(g, 'sphere', YEL, [0, 0.98, 0.06], 0.36);
  eyes(g);
  P(g, 'cone', ORA, [0, 0.93, 0.47], [0.1, 0.22, 0.08], [Math.PI / 2, 0, 0]);
  P(g, 'cone', '#e06a10', [0, 0.88, 0.43], [0.07, 0.14, 0.05], [Math.PI / 2 + 0.2, 0, 0]);
  for (const s of [-1, 1]) P(g, 'sphere', PINK, [s * 0.24, 0.9, 0.29], [0.06, 0.04, 0.03]);
  P(g, 'torus', team, [0, 0.77, 0.02], [0.32, 0.32, 0.3], [Math.PI / 2, 0, 0]);
  P(g, 'sphere', dark, [0, 0.71, 0.31], [0.08, 0.07, 0.06]);
  accessory(g, acc, team);
  return g;
}

// pollito listo para la escena: grupo con el cuerpo (que se anima) y el arma
export function makeChicken(team, acc, robot) {
  const root = new THREE.Group();
  const body = buildChicken(team, acc, robot);
  root.add(body);
  const gun = new THREE.Group();
  P(gun, 'cyl', '#5d6873', [0, 0, 0.22], [0.075, 0.62, 0.075], [Math.PI / 2, 0, 0], 'metal');
  P(gun, 'cyl', '#ff8a1f', [0, 0, 0.55], [0.1, 0.1, 0.1], [Math.PI / 2, 0, 0]);
  P(gun, 'cyl', '#3b2a1a', [0, -0.1, 0.12], [0.035, 0.16, 0.035]);
  gun.position.set(-0.42, 0.6, 0.12);
  gun.visible = false;
  root.add(gun);
  root.userData = { body, gun };
  root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return root;
}

// ---------------- objetos ----------------
const BUILDERS = {
  egg: (g) => P(g, 'sphere', '#fff3dc', [0, 0.2, 0], [0.15, 0.2, 0.15]),
  granada: (g) => {
    P(g, 'sphere', '#6cc04a', [0, 0.17, 0], 0.17);
    P(g, 'cyl', '#3e8e1e', [0, 0.17, 0], [0.175, 0.04, 0.175]);
    P(g, 'cyl', '#8d99a6', [0, 0.36, 0], [0.04, 0.06, 0.04], null, 'metal');
    P(g, 'torus', '#c3ccd6', [0.06, 0.4, 0], [0.05, 0.05, 0.05], null, 'metal');
  },
  oro: (g) => {
    P(g, 'sphere', '#ffd700', [0, 0.24, 0], [0.18, 0.24, 0.18], null, 'glow');
    P(g, 'cone', '#fff2a8', [0, 0.52, 0], [0.04, 0.1, 0.04], null, 'glow');
  },
  maiz: (g) => {
    P(g, 'sphere', '#ffd23f', [0, 0.25, 0], [0.11, 0.25, 0.11]);
    for (const s of [-1, 1]) P(g, 'cone', '#7bc043', [s * 0.06, 0.15, 0], [0.07, 0.32, 0.04], [0, 0, s * 0.4]);
  },
  pop: (g) => P(g, 'ico', '#fffbe8', [0, 0.08, 0], 0.09),
  paloma: (g) => {
    P(g, 'sphere', '#9aa3ad', [0, 0.16, 0], [0.18, 0.16, 0.3]);
    P(g, 'sphere', '#b4bcc5', [0, 0.3, 0.26], 0.11);
    P(g, 'cone', '#ff9a3c', [0, 0.29, 0.4], [0.03, 0.08, 0.03], [Math.PI / 2, 0, 0]);
    for (const s of [-1, 1]) {
      P(g, 'sphere', '#7d8792', [s * 0.3, 0.2, 0], [0.3, 0.03, 0.15]);
      P(g, 'sphere', BLK, [s * 0.05, 0.33, 0.34], 0.02);
    }
  },
  bomba: (g) => { P(g, 'sphere', '#3a3a3a', [0, 0.1, 0], 0.1); P(g, 'cyl', '#ff7a00', [0, 0.22, 0], [0.015, 0.06, 0.015]); },
  vela: (g) => {
    P(g, 'cyl', '#ff6fae', [0, 0.3, 0], [0.09, 0.6, 0.09]);
    for (const y of [0.15, 0.4]) P(g, 'cyl', WHT, [0, y, 0], [0.095, 0.06, 0.095]);
    P(g, 'cyl', '#333', [0, 0.64, 0], [0.01, 0.08, 0.01]);
    P(g, 'cone', '#ffb000', [0, 0.75, 0], [0.05, 0.14, 0.05], null, 'basic');
  },
  mina: (g) => {
    P(g, 'torus', '#9b6b3a', [0, 0.07, 0], [0.24, 0.24, 0.5], [Math.PI / 2, 0, 0]);
    P(g, 'sphere', '#b07a44', [0, 0.04, 0], [0.22, 0.05, 0.22]);
    P(g, 'sphere', '#fff3dc', [0, 0.17, 0], [0.12, 0.15, 0.12]);
    P(g, 'sphere', '#ff2222', [0, 0.33, 0], 0.035, null, 'glow');
  },
  gallina: (g) => {
    for (const s of [-1, 1]) P(g, 'cyl', ORA, [s * 0.18, 0.1, 0.05], [0.03, 0.2, 0.03]);
    P(g, 'sphere', '#fbfbf5', [0, 0.55, -0.05], [0.48, 0.42, 0.58]);
    for (const s of [-1, 1]) P(g, 'sphere', '#ececdf', [s * 0.46, 0.58, -0.05], [0.1, 0.25, 0.35]);
    P(g, 'cone', '#fbfbf5', [0, 0.8, -0.58], [0.16, 0.35, 0.08], [-0.6, 0, 0]);
    P(g, 'sphere', '#fbfbf5', [0, 1.02, 0.38], 0.27);
    for (let i = -1; i <= 1; i++) P(g, 'sphere', '#ff2b3a', [0, 1.31 + (i === 0 ? 0.04 : 0), 0.38 + i * 0.09], 0.07);
    P(g, 'cone', ORA, [0, 1.0, 0.68], [0.08, 0.16, 0.07], [Math.PI / 2, 0, 0]);
    P(g, 'sphere', '#ff2b3a', [0, 0.87, 0.6], [0.05, 0.08, 0.04]);
    eyes(g, 1.08, 0.58);
    P(g, 'torus', '#ff6fae', [0, 0.84, 0.36], [0.22, 0.22, 0.3], [Math.PI / 2, 0, 0]);
  },
  guacamaya: (g) => {
    P(g, 'sphere', '#e3172b', [0, 0.15, 0], [0.15, 0.15, 0.3]);
    P(g, 'sphere', '#e3172b', [0, 0.25, 0.26], 0.12);
    P(g, 'cone', '#f5f0e0', [0, 0.22, 0.4], [0.05, 0.12, 0.05], [Math.PI / 2 + 0.4, 0, 0]);
    for (const s of [-1, 1]) {
      P(g, 'sphere', '#1e74ff', [s * 0.3, 0.17, -0.02], [0.3, 0.03, 0.15]);
      P(g, 'sphere', '#ffd23f', [s * 0.2, 0.18, 0.0], [0.15, 0.035, 0.1]);
      P(g, 'sphere', BLK, [s * 0.06, 0.29, 0.34], 0.02);
    }
    P(g, 'cone', '#1e74ff', [0, 0.12, -0.45], [0.06, 0.38, 0.03], [-Math.PI / 2, 0, 0]);
  },
  barril: (g) => {
    P(g, 'cyl', '#e5383b', [0, 0.36, 0], [0.3, 0.72, 0.3]);
    for (const y of [0.12, 0.6]) P(g, 'torus', '#7a1a1c', [0, y, 0], [0.3, 0.3, 0.3], [Math.PI / 2, 0, 0]);
    P(g, 'cyl', '#ffd23f', [0, 0.36, 0.29], [0.11, 0.02, 0.11], [Math.PI / 2, 0, 0]);
    P(g, 'cone', '#111', [0, 0.37, 0.305], [0.05, 0.08, 0.01], [Math.PI / 2, 0, 0]);
  },
  cajaArma: (g) => {
    P(g, 'rbox', '#c47a3a', [0, 0.3, 0], 0.6);
    P(g, 'rbox', '#8a4f1f', [0, 0.3, 0], [0.62, 0.12, 0.62]);
    P(g, 'sphere', '#ffd23f', [0, 0.42, 0.31], [0.08, 0.08, 0.02]);
    P(g, 'sphere', '#ffd23f', [0, 0.22, 0.31], [0.04, 0.04, 0.02]);
  },
  cajaSalud: (g) => {
    P(g, 'rbox', '#ffffff', [0, 0.3, 0], 0.6);
    for (const [r, p] of [[[0, 0, 0], [0, 0.3, 0.305]], [[0, Math.PI / 2, 0], [0.305, 0.3, 0]], [[0, Math.PI / 2, 0], [-0.305, 0.3, 0]], [[0, 0, 0], [0, 0.3, -0.305]], [[Math.PI / 2, 0, 0], [0, 0.605, 0]]]) {
      P(g, 'rbox', '#ff2b3a', p, [0.12, 0.38, 0.02], r);
      P(g, 'rbox', '#ff2b3a', p, [0.38, 0.12, 0.02], r);
    }
  },
  cajaUtil: (g) => {
    P(g, 'rbox', '#3d8bfd', [0, 0.3, 0], 0.6);
    P(g, 'rbox', '#1c5fc7', [0, 0.3, 0], [0.62, 0.12, 0.62]);
    P(g, 'sphere', '#ffffff', [0, 0.3, 0.31], [0.1, 0.1, 0.02]);
  },
  sombrilla: (g) => {
    for (let i = 0; i < 8; i++) {
      const geo = new THREE.SphereGeometry(0.75, 6, 6, (i / 8) * Math.PI * 2, Math.PI / 4, 0, Math.PI / 2.4);
      const m = new THREE.Mesh(geo, mat(i % 2 ? '#ffffff' : '#ff4757'));
      g.add(m);
    }
    P(g, 'cyl', '#444', [0, -0.45, 0], [0.02, 0.9, 0.02]);
  },
  lapida: (g) => {
    P(g, 'rbox', '#cfd6dd', [0, 0.28, 0], [0.42, 0.56, 0.16]);
    P(g, 'sphere', '#cfd6dd', [0, 0.56, 0], [0.21, 0.12, 0.08]);
    P(g, 'rbox', '#8d99a6', [0, 0.36, 0.085], [0.05, 0.24, 0.02]);
    P(g, 'rbox', '#8d99a6', [0, 0.4, 0.085], [0.16, 0.05, 0.02]);
  },
};

export function makeObject(kind, scale = 1) {
  const g = new THREE.Group();
  (BUILDERS[kind] || BUILDERS.egg)(g);
  g.scale.setScalar(scale);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

// qué modelo usa cada tipo de proyectil u objeto
export const PROJ_MODEL = {
  bazuca: 'egg', granada: 'granada', maiz: 'maiz', pop: 'pop', oro: 'oro', bomba: 'paloma', regalo: 'bomba',
  guacamaya: 'guacamaya', vela: 'vela', mina: 'mina', gallina: 'gallina', barril: 'barril',
  cajaArma: 'cajaArma', cajaSalud: 'cajaSalud', cajaUtil: 'cajaUtil', lapida: 'lapida',
};
