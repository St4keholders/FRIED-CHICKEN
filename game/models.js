// Modelos 3D redondeados hechos con código (estilo caricatura): pollitos, robots, armas y objetos
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { parseLook } from './constants.js';

// ---------------- geometrías y materiales compartidos ----------------
const G = {
  sphere: new THREE.SphereGeometry(1, 28, 18),
  sphereLo: new THREE.SphereGeometry(1, 14, 10),
  half: new THREE.SphereGeometry(1, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2),
  cone: new THREE.ConeGeometry(1, 1, 18),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 24),
  cylOpen: new THREE.CylinderGeometry(1, 1, 1, 24, 1, true),
  cylTaper: new THREE.CylinderGeometry(0.82, 1, 1, 24),
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
  const whites = [], pupils = [];
  for (const s of [-1, 1]) {
    if (robot) {
      whites.push(P(g, 'sphere', '#ff2244', [s * 0.12, y, z + 0.06], [0.07, 0.07, 0.03], null, 'glow'));
      continue;
    }
    whites.push(P(g, 'sphere', WHT, [s * 0.125, y, z], [0.13, 0.16, 0.1]));
    pupils.push(P(g, 'sphere', BLK, [s * 0.11, y - 0.01, z + 0.075], [0.065, 0.08, 0.04]));
    P(g, 'sphere', WHT, [s * 0.09, y + 0.03, z + 0.11], 0.022, null, 'basic');
  }
  return { whites, pupils };
}

const HAIR = '#2b1a10', BROWN = '#5a3a1e';
const tuft = (g) => { for (let i = -1; i <= 1; i++) P(g, 'sphere', YEL, [i * 0.06, 1.34 + (i === 0 ? 0.04 : 0), 0.05], 0.06); };

function headPiece(g, id, team) {
  const dark = shade(team, 0.7);
  switch (id) {
    case 'ninguno': tuft(g); break;
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
      tuft(g);
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
      P(g, 'torus', '#ffd700', [-0.13, 1.05, 0.43], [0.09, 0.09, 0.14], [Math.PI / 2, 0, 0], 'metal');
      P(g, 'cyl', '#ffd700', [-0.04, 1.06, 0.42], [0.015, 0.08, 0.015], [0, 0, Math.PI / 3], 'metal');
      P(g, 'sphere', '#5ff0ff', [-0.13, 1.05, 0.42], [0.07, 0.07, 0.02], null, 'glow');
      tuft(g);
      break;
    case 'vaquero':
      P(g, 'cyl', '#8b5a2b', [0, 1.26, 0.04], [0.62, 0.03, 0.52]);
      P(g, 'torus', '#8b5a2b', [0, 1.28, 0.04], [0.6, 0.5, 0.16], [Math.PI / 2, 0, 0]);
      P(g, 'cylTaper', '#a0693a', [0, 1.41, 0.04], [0.24, 0.27, 0.22]);
      P(g, 'sphere', '#7a4a20', [0, 1.55, 0.04], [0.16, 0.04, 0.13]);
      P(g, 'cyl', '#3b2314', [0, 1.31, 0.04], [0.255, 0.05, 0.235]);
      break;
    case 'pirata':
      P(g, 'half', '#1d1420', [0, 1.18, 0.04], [0.4, 0.24, 0.36]);
      P(g, 'torus', '#1d1420', [0, 1.22, 0.04], [0.46, 0.4, 0.22], [Math.PI / 2, 0, 0]);
      P(g, 'cone', '#1d1420', [0, 1.36, 0.3], [0.14, 0.16, 0.05]);
      P(g, 'sphere', WHT, [0, 1.3, 0.37], 0.055);
      for (const s of [-1, 1]) P(g, 'sphere', BLK, [s * 0.02, 1.31, 0.42], 0.012, null, 'basic');
      P(g, 'cone', '#ff4757', [0.25, 1.45, -0.05], [0.04, 0.3, 0.02], [0.2, 0, -0.5]);
      break;
    case 'mago':
      P(g, 'cyl', '#3b3bb8', [0, 1.26, 0.04], [0.5, 0.03, 0.5]);
      P(g, 'cone', '#4b4bd8', [0, 1.62, 0], [0.28, 0.72, 0.28], [-0.18, 0, 0]);
      for (const [x, y, z] of [[0.15, 1.45, 0.18], [-0.12, 1.6, 0.12], [0.05, 1.78, 0.02], [-0.18, 1.38, -0.1]]) P(g, 'sphere', '#ffd23f', [x, y, z], 0.035, null, 'glow');
      P(g, 'sphere', '#ffd23f', [0, 1.97, -0.12], 0.05, null, 'glow');
      break;
    case 'vikingo':
      P(g, 'half', '#9aa7b4', [0, 1.06, 0.05], [0.39, 0.34, 0.39], null, 'metal');
      P(g, 'torus', '#8a6a3a', [0, 1.07, 0.05], [0.38, 0.38, 0.2], [Math.PI / 2, 0, 0]);
      P(g, 'rbox', '#8a6a3a', [0, 1.25, 0.32], [0.06, 0.24, 0.05]);
      for (const s of [-1, 1]) {
        P(g, 'cone', '#f2ead8', [s * 0.42, 1.24, 0.05], [0.08, 0.3, 0.08], [0, 0, s * -0.95]);
        P(g, 'cone', '#f2ead8', [s * 0.53, 1.42, 0.05], [0.045, 0.2, 0.045], [0, 0, s * -0.25]);
      }
      break;
    case 'fiesta':
      P(g, 'cone', team, [0.04, 1.55, 0.02], [0.17, 0.44, 0.17], [0, 0, -0.15]);
      P(g, 'torus', '#ffd23f', [0.025, 1.47, 0.02], [0.13, 0.13, 0.2], [Math.PI / 2, 0, -0.15]);
      P(g, 'torus', '#ffffff', [0.045, 1.6, 0.02], [0.08, 0.08, 0.25], [Math.PI / 2, 0, -0.15]);
      P(g, 'sphere', '#ffffff', [0.075, 1.79, 0.02], 0.06);
      tuft(g);
      break;
    case 'afro':
      P(g, 'sphereLo', HAIR, [0, 1.24, -0.07], [0.5, 0.38, 0.44]);
      for (let a = 0; a < 9; a++) {
        const ang = (a / 9) * Math.PI * 2;
        P(g, 'sphereLo', HAIR, [Math.cos(ang) * 0.36, 1.28 + Math.sin(a * 2.1) * 0.06, -0.07 + Math.sin(ang) * 0.3], 0.17);
      }
      P(g, 'sphereLo', HAIR, [0, 1.52, -0.07], 0.22);
      break;
    case 'mohicano': {
      const rain = ['#ff4757', '#ff9f1a', '#ffd23f', '#2ecc71', '#2f8cff', '#a55eea', '#ff6fae'];
      rain.forEach((c, i) => P(g, 'cone', c, [0, 1.42 - Math.abs(i - 3) * 0.03, -0.3 + i * 0.09], [0.055, 0.36 - Math.abs(i - 3) * 0.04, 0.055], [-0.45 + i * 0.13, 0, 0]));
      break;
    }
    case 'tupe':
      P(g, 'half', HAIR, [0, 1.1, 0.02], [0.375, 0.26, 0.375]);
      P(g, 'sphere', HAIR, [0, 1.36, 0.18], [0.2, 0.15, 0.32], [-0.35, 0, 0], 'metal');
      for (const s of [-1, 1]) P(g, 'sphere', HAIR, [s * 0.33, 1.0, 0.1], [0.04, 0.12, 0.07]);
      break;
    case 'colita':
      P(g, 'half', '#7a4a20', [0, 1.1, 0.03], [0.375, 0.28, 0.375]);
      P(g, 'sphere', '#7a4a20', [0, 1.3, -0.3], 0.1);
      P(g, 'sphere', '#7a4a20', [0, 1.15, -0.42], [0.1, 0.14, 0.1]);
      P(g, 'sphere', '#7a4a20', [0, 0.96, -0.45], [0.08, 0.1, 0.08]);
      P(g, 'torus', team, [0, 1.25, -0.34], [0.07, 0.07, 0.3], [0.5, 0, 0]);
      break;
    case 'casco':
    default:
      P(g, 'half', team, [0, 1.06, 0.05], [0.39, 0.33, 0.39]);
      P(g, 'torus', dark, [0, 1.065, 0.05], [0.38, 0.38, 0.18], [Math.PI / 2, 0, 0]);
      P(g, 'sphere', WHT, [0, 1.36, 0.05], [0.05, 0.03, 0.2]);
      break;
  }
}

function facePiece(g, id, team) {
  switch (id) {
    case 'gafas':
      for (const s of [-1, 1]) P(g, 'cyl', BLK, [s * 0.13, 1.05, 0.43], [0.11, 0.03, 0.09], [Math.PI / 2, 0, 0], 'metal');
      P(g, 'cyl', BLK, [0, 1.07, 0.43], [0.02, 0.1, 0.02], [0, 0, Math.PI / 2]);
      for (const s of [-1, 1]) P(g, 'cyl', BLK, [s * 0.27, 1.07, 0.27], [0.012, 0.28, 0.012], [Math.PI / 2, 0, s * 0.15]);
      break;
    case 'lentes':
      for (const s of [-1, 1]) P(g, 'torus', BLK, [s * 0.125, 1.05, 0.45], [0.13, 0.13, 0.13], null, 'metal');
      P(g, 'cyl', BLK, [0, 1.07, 0.46], [0.012, 0.06, 0.012], [0, 0, Math.PI / 2]);
      for (const s of [-1, 1]) P(g, 'cyl', BLK, [s * 0.27, 1.07, 0.29], [0.012, 0.28, 0.012], [Math.PI / 2, 0, s * 0.15]);
      break;
    case 'luchador': {
      P(g, 'sphere', team, [0, 1.04, 0.06], [0.372, 0.31, 0.372]);
      for (const s of [-1, 1]) P(g, 'torus', WHT, [s * 0.125, 1.05, 0.42], [0.15, 0.17, 0.2]);
      P(g, 'rbox', WHT, [0, 1.24, 0.3], [0.06, 0.2, 0.08], [-0.6, 0, 0]);
      P(g, 'cone', '#ffd23f', [0, 1.2, 0.36], [0.05, 0.1, 0.02], [0.2, 0, 0], 'glow');
      for (const s of [-1, 1]) P(g, 'cyl', WHT, [s * 0.04, 1.0, -0.34], [0.012, 0.2, 0.012], [0.3, 0, s * 0.4]);
      break;
    }
    case 'antifaz':
      P(g, 'torus', BLK, [0, 1.06, 0.06], [0.375, 0.375, 0.25], [Math.PI / 2, 0, 0]);
      for (const s of [-1, 1]) P(g, 'sphere', BLK, [s * 0.13, 1.06, 0.36], [0.18, 0.12, 0.06]);
      for (const s of [-1, 1]) P(g, 'cone', BLK, [s * 0.07, 1.0, -0.36], [0.03, 0.16, 0.015], [0.3, 0, s * 0.5]);
      break;
    case 'parche':
      P(g, 'cyl', BLK, [0.125, 1.05, 0.45], [0.12, 0.02, 0.12], [Math.PI / 2, 0, 0]);
      P(g, 'torus', BLK, [0, 1.08, 0.06], [0.37, 0.37, 0.07], [Math.PI / 2, 0.45, 0]);
      break;
    case 'payaso':
      P(g, 'sphere', '#ff2b3a', [0, 0.94, 0.58], 0.08, null, 'metal');
      for (const s of [-1, 1]) P(g, 'sphere', '#ff7a9a', [s * 0.24, 0.9, 0.29], [0.08, 0.06, 0.04]);
      break;
    default: break;
  }
}

function beardPiece(g, id) {
  const col = id === 'blanca' ? '#f2f2f2' : BROWN;
  const stache = (thin = false) => { for (const s of [-1, 1]) P(g, 'sphere', col, [s * 0.09, 0.885, 0.46], [0.11, thin ? 0.025 : 0.04, 0.05], [0, -s * 0.2, s * 0.35]); };
  switch (id) {
    case 'bigote': stache(); break;
    case 'frances':
      stache(true);
      for (const s of [-1, 1]) P(g, 'torus', col, [s * 0.2, 0.9, 0.42], [0.035, 0.035, 0.3], [0, s * 0.6, 0]);
      break;
    case 'barba': case 'blanca':
      stache();
      P(g, 'sphere', col, [0, 0.76, 0.27], [0.22, 0.2, 0.14]);
      P(g, 'cone', col, [0, id === 'blanca' ? 0.48 : 0.56, 0.27], [0.15, id === 'blanca' ? 0.36 : 0.24, 0.1], [Math.PI, 0, 0]);
      for (const s of [-1, 1]) P(g, 'sphere', col, [s * 0.27, 0.88, 0.18], [0.07, 0.14, 0.09]);
      break;
    case 'candado':
      stache(true);
      P(g, 'cone', col, [0, 0.76, 0.38], [0.06, 0.15, 0.05], [Math.PI, 0, 0]);
      for (const s of [-1, 1]) P(g, 'sphere', col, [s * 0.1, 0.83, 0.42], [0.025, 0.06, 0.03]);
      break;
    case 'patillas':
      for (const s of [-1, 1]) P(g, 'sphere', col, [s * 0.32, 0.98, 0.12], [0.05, 0.15, 0.09]);
      break;
    default: break;
  }
}

function accessory(g, acc, team) {
  const l = parseLook(acc);
  headPiece(g, l.head, team);
  facePiece(g, l.face, team);
  beardPiece(g, l.beard);
}

function buildChicken(team, acc, robot, opts = {}) {
  const g = new THREE.Group();
  const head = new THREE.Group();
  const wings = [];
  const dark = shade(team, 0.7);
  if (robot) {
    const MET = '#c3ccd6', MET2 = '#8d99a6';
    for (const s of [-1, 1]) P(g, 'sphere', '#5d6873', [s * 0.17, 0.04, 0.08], [0.12, 0.06, 0.16], null, 'metal');
    P(g, 'sphere', MET, [0, 0.47, 0], [0.46, 0.45, 0.46], null, 'metal');
    P(g, 'cyl', MET2, [0, 0.47, 0], [0.47, 0.06, 0.47], null, 'metal');
    P(g, 'sphere', '#ffcc00', [0, 0.45, 0.42], [0.1, 0.1, 0.05], null, 'glow');
    for (const s of [-1, 1]) wings.push(P(g, 'sphere', MET2, [s * 0.46, 0.5, 0], [0.09, 0.22, 0.18], [0, 0, s * 0.25], 'metal'));
    P(head, 'sphere', MET, [0, 0.98, 0.06], 0.35, null, 'metal');
    P(head, 'rbox', '#18222c', [0, 1.03, 0.3], [0.42, 0.16, 0.12]);
    const { whites, pupils } = eyes(head, 1.03, 0.3, true);
    const beakTop = P(head, 'cone', '#ff9a3c', [0, 0.92, 0.44], [0.08, 0.18, 0.08], [Math.PI / 2, 0, 0], 'metal');
    P(head, 'cyl', MET2, [0, 1.42, 0.06], [0.025, 0.2, 0.025], null, 'metal');
    P(head, 'sphere', '#ff2244', [0, 1.55, 0.06], 0.06, null, 'glow');
    for (const s of [-1, 1]) P(head, 'sphere', MET2, [s * 0.33, 1.0, 0.06], [0.04, 0.07, 0.07], null, 'metal');
    g.add(head);
    P(g, 'torus', team, [0, 0.78, 0.02], [0.31, 0.31, 0.3], [Math.PI / 2, 0, 0]);
    P(g, 'sphere', dark, [0, 0.72, 0.31], 0.07);

    if (opts.shield) {
      // Escudo blindado de hierro reforzado con remaches para el Sargento Lata
      const sg = new THREE.Group();
      P(sg, 'rbox', '#718096', [0, 0.5, 0.52], [0.72, 0.68, 0.1], null, 'metal');
      P(sg, 'rbox', '#2d3748', [0, 0.5, 0.55], [0.76, 0.08, 0.12], null, 'metal');
      P(sg, 'rbox', '#2d3748', [0, 0.5, 0.55], [0.08, 0.72, 0.12], null, 'metal');
      for (const [rx, ry] of [[-0.3, 0.26], [0.3, 0.26], [-0.3, 0.74], [0.3, 0.74]]) {
        P(sg, 'sphere', '#ffd23f', [rx, ry, 0.56], 0.04, null, 'metal');
      }
      P(sg, 'cyl', '#9aa7b4', [0, 0.5, 0.57], [0.15, 0.04, 0.15], [Math.PI / 2, 0, 0], 'metal');
      P(sg, 'sphere', '#ff2b3a', [0, 0.5, 0.59], 0.065, null, 'glow');
      g.add(sg);
      g.userData.shieldGroup = sg;
    }

    g.userData = { head, wings, eyes: whites, pupils, beakTop, beakLow: null, robot: true };
    return g;
  }
  for (const s of [-1, 1]) P(g, 'sphere', ORA, [s * 0.17, 0.035, 0.1], [0.12, 0.05, 0.17]);
  P(g, 'sphere', YEL, [0, 0.47, 0], [0.47, 0.44, 0.47]);
  P(g, 'sphere', BELLY, [0, 0.42, 0.28], [0.32, 0.28, 0.2]);
  for (const s of [-1, 1]) wings.push(P(g, 'sphere', YEL2, [s * 0.45, 0.5, -0.02], [0.1, 0.24, 0.2], [0, 0, s * 0.35]));
  P(g, 'cone', YEL2, [0, 0.62, -0.45], [0.09, 0.22, 0.09], [-2.1, 0, 0]);
  P(head, 'sphere', YEL, [0, 0.98, 0.06], 0.36);
  const { whites, pupils } = eyes(head);
  const beakTop = P(head, 'cone', ORA, [0, 0.93, 0.47], [0.1, 0.22, 0.08], [Math.PI / 2, 0, 0]);
  const beakLow = P(head, 'cone', '#e06a10', [0, 0.88, 0.43], [0.07, 0.14, 0.05], [Math.PI / 2 + 0.2, 0, 0]);
  for (const s of [-1, 1]) P(head, 'sphere', PINK, [s * 0.24, 0.9, 0.29], [0.06, 0.04, 0.03]);
  accessory(head, acc, team);
  g.add(head);
  P(g, 'torus', team, [0, 0.77, 0.02], [0.32, 0.32, 0.3], [Math.PI / 2, 0, 0]);
  P(g, 'sphere', dark, [0, 0.71, 0.31], [0.08, 0.07, 0.06]);
  g.userData = { head, wings, eyes: whites, pupils, beakTop, beakLow, robot: false };
  return g;
}

// ---------------- armas gigantes en las manos ----------------
// Cada arma tiene su modelo exagerado. 'muzzle' es la boca (para humo, fuego o balas).
const HELD = {
  bazuca: (g) => {
    P(g, 'cyl', '#5b7a32', [0, 0, 0.1], [0.17, 1.55, 0.17], [Math.PI / 2, 0, 0]);
    for (const z of [-0.45, 0.25, 0.6]) P(g, 'cyl', '#ffd23f', [0, 0, z], [0.18, 0.06, 0.18], [Math.PI / 2, 0, 0]);
    P(g, 'cylTaper', '#3d5420', [0, 0, -0.75], [0.24, 0.22, 0.24], [-Math.PI / 2, 0, 0]);
    P(g, 'cylOpen', '#ff8a1f', [0, 0, 0.88], [0.2, 0.14, 0.2], [Math.PI / 2, 0, 0]);
    P(g, 'sphere', '#fff3dc', [0, 0, 0.9], [0.13, 0.13, 0.17]);
    P(g, 'cyl', '#2b2b2b', [0, 0.22, 0.05], [0.05, 0.32, 0.05], [Math.PI / 2, 0, 0], 'metal');
    P(g, 'sphere', '#5ff0ff', [0, 0.22, 0.22], [0.045, 0.045, 0.02], null, 'glow');
    P(g, 'rbox', '#3b2a1a', [0, -0.2, 0.15], [0.08, 0.25, 0.1]);
    P(g, 'rbox', '#3b2a1a', [0, -0.18, -0.2], [0.08, 0.2, 0.1]);
    g.userData.muzzle = [0, 0, 1.0];
  },
  escopeta: (g) => {
    for (const s of [-1, 1]) P(g, 'cyl', '#5d6873', [s * 0.065, 0.02, 0.35], [0.06, 1.0, 0.06], [Math.PI / 2, 0, 0], 'metal');
    P(g, 'rbox', '#8b5a2b', [0, -0.04, -0.3], [0.2, 0.2, 0.55], [-0.25, 0, 0]);
    P(g, 'rbox', '#8b5a2b', [0, -0.02, 0.1], [0.18, 0.12, 0.3]);
    P(g, 'cyl', '#ffcc00', [0, 0.12, 0.25], [0.13, 0.02, 0.13]);
    P(g, 'sphere', '#6b3e26', [0, 0.14, 0.25], [0.06, 0.03, 0.06]);
    g.userData.muzzle = [0, 0.02, 0.87];
  },
  metralleta: (g) => {
    const spin = new THREE.Group();
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; P(spin, 'cyl', '#8d99a6', [Math.cos(a) * 0.08, Math.sin(a) * 0.08, 0.35], [0.03, 0.9, 0.03], [Math.PI / 2, 0, 0], 'metal'); }
    P(spin, 'cyl', '#ffd23f', [0, 0, 0.75], [0.13, 0.06, 0.13], [Math.PI / 2, 0, 0]);
    g.add(spin);
    P(g, 'sphere', '#ffd23f', [0, 0, -0.18], [0.2, 0.2, 0.32]);
    for (let i = 0; i < 10; i++) P(g, 'sphere', '#ffb800', [Math.cos(i) * 0.18, Math.sin(i) * 0.18, -0.35 + (i % 5) * 0.08], 0.04);
    P(g, 'cone', '#7bc043', [0, 0, -0.5], [0.15, 0.3, 0.15], [-Math.PI / 2, 0, 0]);
    P(g, 'rbox', '#3b2a1a', [0, -0.22, 0.0], [0.07, 0.22, 0.09]);
    g.userData.spin = spin;
    g.userData.muzzle = [0, 0, 0.82];
  },
  aji: (g) => {
    P(g, 'sphere', '#e3172b', [0, 0, 0.15], [0.17, 0.17, 0.55]);
    P(g, 'cone', '#e3172b', [0, 0, 0.72], [0.12, 0.3, 0.12], [Math.PI / 2, 0, 0]);
    P(g, 'cyl', '#3e8e1e', [0, 0.04, -0.42], [0.06, 0.18, 0.06], [Math.PI / 2 - 0.4, 0, 0]);
    P(g, 'sphere', '#5ab030', [0, 0.02, -0.33], [0.13, 0.08, 0.08]);
    P(g, 'sphere', '#ff8a1f', [0, 0, 0.88], 0.05, null, 'glow');
    for (const s of [-1, 1]) P(g, 'cyl', '#c3ccd6', [s * 0.12, -0.05, -0.75], [0.1, 0.4, 0.1], [0.2, 0, 0], 'metal');
    g.userData.muzzle = [0, 0, 0.9];
  },
  chancla: (g) => {
    P(g, 'rbox', '#2f8cff', [0, 0, 0.22], [0.26, 0.05, 0.6]);
    P(g, 'rbox', '#ffffff', [0, 0.03, 0.22], [0.24, 0.02, 0.56]);
    P(g, 'torus', '#ff4757', [0, 0.06, 0.32], [0.11, 0.11, 0.4], [Math.PI / 2, 0, 0]);
    g.userData.muzzle = [0, 0, 0.5];
  },
  control: (g) => {
    P(g, 'rbox', '#2b2b38', [0, 0, 0], [0.24, 0.1, 0.32]);
    P(g, 'sphere', '#ff2b3a', [0.05, 0.06, 0.06], 0.035, null, 'glow');
    P(g, 'sphere', '#3ddc84', [-0.05, 0.06, 0.06], 0.03, null, 'glow');
    P(g, 'cyl', '#c3ccd6', [0.08, 0.2, -0.1], [0.012, 0.36, 0.012], null, 'metal');
    P(g, 'sphere', '#ff2b3a', [0.08, 0.38, -0.1], 0.025, null, 'glow');
    g.userData.muzzle = [0, 0, 0.2];
  },
  cuerda: (g) => {
    for (let i = 0; i < 3; i++) P(g, 'torus', '#ff8fb1', [0, i * 0.05, 0], [0.18, 0.18, 0.35], [Math.PI / 2, 0, 0]);
    P(g, 'cone', '#c3ccd6', [0, 0.05, 0.25], [0.05, 0.12, 0.05], [Math.PI / 2, 0, 0], 'metal');
    g.userData.muzzle = [0, 0, 0.3];
  },
  martillo: (g) => {
    P(g, 'cyl', '#8b5a2b', [0, 0, 0.15], [0.03, 0.5, 0.03], [Math.PI / 2, 0, 0]);
    P(g, 'rbox', '#8d99a6', [0, 0, 0.42], [0.25, 0.12, 0.12], null, 'metal');
    g.userData.muzzle = [0, 0, 0.45];
  },
  ventilador: (g) => {
    P(g, 'rbox', '#3d8bfd', [0, 0, 0], [0.42, 0.42, 0.16]);
    const spin = new THREE.Group();
    for (let i = 0; i < 3; i++) P(spin, 'sphere', '#ffffff', [Math.cos(i * 2.1) * 0.12, Math.sin(i * 2.1) * 0.12, 0], [0.12, 0.05, 0.02], [0, 0, i * 2.1]);
    spin.position.set(0, 0, -0.1);
    g.add(spin);
    g.userData.spin = spin;
    g.userData.muzzle = [0, 0, -0.2];
  },
};
// arma que se ve en las manos para cada arma del juego y dónde se agarra
export const HELD_FOR = {
  bazuca: { m: 'bazuca', at: 'shoulder', aim: true },
  escopeta: { m: 'escopeta', at: 'hip', aim: true },
  metralleta: { m: 'metralleta', at: 'hip', aim: true },
  aji: { m: 'aji', at: 'hip', aim: true },
  chancla: { m: 'chancla', at: 'wing' },
  granada: { m: 'obj:granada', at: 'wing', s: 1.3 }, maiz: { m: 'obj:maiz', at: 'wing', s: 1.2 }, oro: { m: 'obj:oro', at: 'wing', s: 1.4 },
  platano: { m: 'obj:platano', at: 'wing', s: 1.1 },
  vela: { m: 'obj:vela', at: 'front', s: 1.0 }, mina: { m: 'obj:mina', at: 'front', s: 1.0 }, gallina: { m: 'obj:gallina', at: 'front', s: 0.4 },
  supergallina: { m: 'obj:supergallina', at: 'wing', s: 0.65 },
  palomas: { m: 'control', at: 'front' }, guacamaya: { m: 'control', at: 'front' }, vaca: { m: 'control', at: 'front' }, teleport: { m: 'control', at: 'front' },
  cuerda: { m: 'cuerda', at: 'front', aim: true }, viga: { m: 'martillo', at: 'wing' }, ventilador: { m: 'ventilador', at: 'back' },
};
export const HELD_POS = { shoulder: [-0.38, 0.86, -0.02], hip: [-0.36, 0.55, 0.12], wing: [-0.5, 0.95, 0.05], front: [0, 0.55, 0.45], back: [0, 0.6, -0.48] };

export function makeHeld(spec) {
  const g = new THREE.Group();
  if (spec.m.startsWith('obj:')) {
    const o = makeObject(spec.m.slice(4), spec.s || 1);
    g.add(o);
    g.userData.muzzle = [0, 0.2, 0.1];
  } else (HELD[spec.m] || HELD.bazuca)(g);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

// pollito listo para la escena: grupo con el cuerpo (que se anima) y el arma
export function makeChicken(team, acc, robot, opts = {}) {
  const root = new THREE.Group();
  const body = buildChicken(team, acc, robot, opts);
  root.add(body);
  const gun = new THREE.Group();
  P(gun, 'cyl', '#5d6873', [0, 0, 0.22], [0.075, 0.62, 0.075], [Math.PI / 2, 0, 0], 'metal');
  P(gun, 'cyl', '#ff8a1f', [0, 0, 0.55], [0.1, 0.1, 0.1], [Math.PI / 2, 0, 0]);
  P(gun, 'cyl', '#3b2a1a', [0, -0.1, 0.12], [0.035, 0.16, 0.035]);
  gun.position.set(-0.42, 0.6, 0.12);
  gun.visible = false;
  root.add(gun);
  root.userData = { body, gun, ...body.userData };
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
  fuego: (g) => {
    P(g, 'sphere', '#ff5a1f', [0, 0.06, 0], [0.95, 0.08, 0.95], null, 'glow');
    const pts = [[0, 0, 0.34, 0.62], [-0.45, 0.2, 0.24, 0.45], [0.45, -0.15, 0.26, 0.5], [0.1, -0.45, 0.22, 0.42], [-0.25, -0.35, 0.2, 0.38], [0.28, 0.38, 0.22, 0.44]];
    pts.forEach(([x, z, r, h], i) => {
      P(g, 'cone', i % 2 ? '#ff5a1f' : '#ffb020', [x, h * 0.5, z], [r, h, r], null, 'basic');
      P(g, 'cone', '#fff275', [x, h * 0.38, z], [r * 0.55, h * 0.65, r * 0.55], null, 'basic');
    });
  },
  platano: (g) => {
    for (let i = 0; i < 5; i++) {
      const a = -0.9 + i * 0.45;
      P(g, 'sphere', '#ffd93b', [Math.sin(a) * 0.32, 0.22 + Math.cos(a) * 0.32 - 0.3, 0], [0.1, 0.12, 0.1]);
    }
    P(g, 'cone', '#6b4a1e', [Math.sin(-1.1) * 0.32, 0.22 + Math.cos(-1.1) * 0.32 - 0.28, 0], [0.04, 0.1, 0.04], [0, 0, 1.1]);
    P(g, 'sphere', '#3b2314', [Math.sin(1.1) * 0.32, 0.22 + Math.cos(1.1) * 0.32 - 0.31, 0], 0.04);
    P(g, 'sphere', '#ff3355', [0, 0.3, 0.06], [0.05, 0.05, 0.05], null, 'glow');
  },
  platanito: (g) => {
    for (let i = 0; i < 4; i++) {
      const a = -0.7 + i * 0.47;
      P(g, 'sphere', '#ffe14d', [Math.sin(a) * 0.2, 0.14 + Math.cos(a) * 0.2 - 0.18, 0], [0.07, 0.085, 0.07]);
    }
  },
  supergallina: (g) => {
    P(g, 'sphere', '#fbfbf5', [0, 0.3, 0], [0.32, 0.26, 0.42]);
    P(g, 'sphere', '#fbfbf5', [0, 0.45, 0.32], 0.2);
    for (let i = -1; i <= 1; i++) P(g, 'sphere', '#ff2b3a', [0, 0.66 + (i === 0 ? 0.03 : 0), 0.3 + i * 0.07], 0.05);
    P(g, 'cone', ORA, [0, 0.43, 0.54], [0.06, 0.13, 0.05], [Math.PI / 2, 0, 0]);
    P(g, 'torus', '#2f8cff', [0, 0.48, 0.32], [0.2, 0.2, 0.3], [Math.PI / 2, 0, 0]);
    for (const s of [-1, 1]) P(g, 'sphere', BLK, [s * 0.08, 0.5, 0.48], 0.03);
    P(g, 'rbox', '#2f8cff', [0, 0.47, 0.49], [0.26, 0.06, 0.03]);
    const cape = P(g, 'rbox', '#ff2b3a', [0, 0.36, -0.42], [0.46, 0.04, 0.55], [0.25, 0, 0]);
    cape.name = 'cape';
    for (const s of [-1, 1]) P(g, 'sphere', '#ececdf', [s * 0.36, 0.34, 0.25], [0.08, 0.07, 0.24], [0, s * 0.3, 0]);
    P(g, 'sphere', '#ffd23f', [0, 0.3, 0.33], [0.08, 0.08, 0.04], null, 'glow');
  },
  vaca: (g) => {
    const C = '#a7adb3', D = '#5f666d';
    P(g, 'sphere', C, [0, 0.55, 0], [0.5, 0.42, 0.7], null, 'metal');
    for (const [x, y, z, r] of [[0.35, 0.7, 0.1, 0.18], [-0.3, 0.6, -0.3, 0.2], [0.1, 0.85, -0.35, 0.15]]) P(g, 'sphere', D, [x, y, z], [r, r * 0.8, r]);
    P(g, 'sphere', C, [0, 0.82, 0.68], [0.28, 0.26, 0.3], null, 'metal');
    P(g, 'sphere', '#c8a7a7', [0, 0.72, 0.92], [0.2, 0.13, 0.12]);
    for (const s of [-1, 1]) {
      P(g, 'cone', '#e8e2d0', [s * 0.2, 1.1, 0.62], [0.05, 0.18, 0.05], [0, 0, -s * 0.4]);
      P(g, 'sphere', WHT, [s * 0.12, 0.92, 0.9], [0.07, 0.08, 0.04]);
      P(g, 'sphere', BLK, [s * 0.12, 0.92, 0.93], 0.035);
      P(g, 'sphere', C, [s * 0.3, 0.86, 0.6], [0.12, 0.05, 0.08]);
    }
    for (const [x, z] of [[-0.28, 0.4], [0.28, 0.4], [-0.28, -0.4], [0.28, -0.4]]) P(g, 'cyl', D, [x, 0.12, z], [0.1, 0.26, 0.1], null, 'metal');
    P(g, 'sphere', '#e8a3b5', [0, 0.18, -0.15], [0.14, 0.09, 0.12]);
    P(g, 'cyl', D, [0, 0.62, -0.75], [0.03, 0.4, 0.03], [0.7, 0, 0]);
  },
  bolaBillar: (g) => {
    P(g, 'sphere', '#e3172b', [0, 0.38, 0], 0.38, null, 'metal');
    P(g, 'cyl', '#ffffff', [0, 0.38, 0], [0.39, 0.18, 0.39], null, 'metal');
    P(g, 'sphere', '#ffffff', [0, 0.38, 0.36], [0.13, 0.13, 0.04]);
    P(g, 'sphere', '#111111', [0, 0.38, 0.39], [0.05, 0.08, 0.02]);
  },
  cajaHuevo: (g) => {
    // Pedestal de terciopelo con cinta dorada y huevito dorado resplandeciente
    P(g, 'rbox', '#8a1c24', [0, 0.16, 0], [0.62, 0.32, 0.62]);
    P(g, 'rbox', '#ffd23f', [0, 0.16, 0], [0.65, 0.08, 0.65], null, 'metal');
    P(g, 'sphere', '#ffe066', [0, 0.52, 0], [0.24, 0.34, 0.24], null, 'glow');
    for (const [x, z] of [[-0.24, -0.24], [0.24, -0.24], [-0.24, 0.24], [0.24, 0.24]]) {
      P(g, 'sphere', '#ffffff', [x, 0.33, z], 0.04);
    }
  },
  maquinaLata: (g) => {
    // Máquina de hojalata del zorro: chasis metálico, chimenea con humo y compuerta
    P(g, 'rbox', '#4a5568', [0, 0.1, 0], [0.92, 0.2, 0.92], null, 'metal');
    P(g, 'rbox', '#9aa7b4', [0, 0.52, 0], [0.84, 0.82, 0.84], null, 'metal');
    P(g, 'cyl', '#4a5568', [0.24, 1.05, -0.2], [0.11, 0.42, 0.11], null, 'metal');
    P(g, 'sphere', '#ff2b3a', [-0.22, 0.98, 0.2], 0.11, null, 'glow');
    P(g, 'cyl', '#ffd23f', [0, 0.58, 0.43], [0.2, 0.08, 0.2], [Math.PI / 2, 0, 0], 'metal');
    P(g, 'rbox', '#1a202c', [0, 0.26, 0.43], [0.36, 0.2, 0.08]);
    P(g, 'rbox', '#ff9f1a', [0, 0.82, 0.43], [0.5, 0.09, 0.04]);
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
  cajaArma: 'cajaArma', cajaSalud: 'cajaSalud', cajaUtil: 'cajaUtil', cajaHuevo: 'cajaHuevo', maquinaLata: 'maquinaLata',
  lapida: 'lapida', fuego: 'fuego', bolaBillar: 'bolaBillar', platano: 'platano', platanito: 'platanito', supergallina: 'supergallina', vaca: 'vaca',
};
