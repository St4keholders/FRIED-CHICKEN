// Temas de las islas: colores, forma del terreno y construcciones que se reconocen
// (castillo con murallas y foso, bañera de verdad, mesa de billar con troneras, etc.).
// Todo está en vóxeles (1 vóxel = 0,5 del mundo) y todo se puede romper salvo el metal.
import { NX, NZ, NY, M } from './constants.js';

const AIR = 0;
const CX = NX / 2, CZ = NZ / 2;

// columnas de tierra libres para poner decoración
function spots(t, r, n, minD = 14, edge = 12, box = null) {
  const out = [];
  const water = t.theme.waterVox;
  for (let tries = 0; out.length < n && tries < 4000; tries++) {
    const i = edge + Math.floor(r() * (NX - edge * 2)), k = edge + Math.floor(r() * (NZ - edge * 2));
    if (box && i > box[0] && i < box[2] && k > box[1] && k < box[3]) continue;
    const j = t.topAt(i, k);
    if (j <= water + 2 || j > NY - 14) continue;
    if (out.some((p) => Math.hypot(p.i - i, p.k - k) < minD)) continue;
    out.push({ i, j, k });
  }
  return out;
}

// ---------------- piezas de construcción ----------------
function tree(t, i, j, k, r, leaf = M.D, trunk = M.C) {
  const h = 6 + Math.floor(r() * 4);
  t.tube([i, j - 1, k], [i, j + h, k], 1.1, trunk);
  t.sphere(i, j + h + 1.5, k, 3.4 + r() * 1.2, leaf, 0.85);
  t.sphere(i + 1.5, j + h - 0.5, k - 1, 2.4, leaf, 0.85);
}
// cono macizo (techos, punta de cohete, sombreros)
function cone(t, ci, j0, ck, rad, hh, m) {
  t.shapeFn(ci - rad - 1, j0 - 1, ck - rad - 1, ci + rad + 1, j0 + hh + 1, ck + rad + 1, (x, y, z) => {
    const f = (y - j0) / hh;
    if (f < 0) return f * 2;
    return Math.min(rad * (1 - f) - Math.hypot(x - ci, z - ck), j0 + hh - y);
  }, m);
}
// almenas a lo largo de una línea recta (cada 3 vóxeles)
function crenels(t, i0, k0, i1, k1, j, th, m) {
  const len = Math.hypot(i1 - i0, k1 - k0), n = Math.floor(len / 3);
  for (let s = 0; s <= n; s++) {
    const f = n ? s / n : 0, i = i0 + (i1 - i0) * f, k = k0 + (k1 - k0) * f;
    t.box(i - th / 2, j, k - th / 2, th, 2.2, th, m);
  }
}
// muralla recta (en x o en z) con almenas y camino arriba
function wall(t, i0, k0, i1, k1, j0, h, th, m, cren = true) {
  if (Math.abs(i1 - i0) < Math.abs(k1 - k0)) t.box(i0 - th / 2, j0, Math.min(k0, k1), th, h, Math.abs(k1 - k0), m);
  else t.box(Math.min(i0, i1), j0, k0 - th / 2, Math.abs(i1 - i0), h, th, m);
  if (cren) crenels(t, i0, k0, i1, k1, j0 + h, 1.6, m);
}
function tower(t, ci, j0, ck, rad, h, m, roof = null) {
  t.cylinder(ci, j0, ck, rad, h, m);
  const n = Math.max(6, Math.round(rad * 2.2));
  for (let a = 0; a < n; a++) {
    const ang = (a / n) * Math.PI * 2;
    t.box(ci + Math.cos(ang) * (rad - 0.9) - 0.8, j0 + h, ck + Math.sin(ang) * (rad - 0.9) - 0.8, 1.6, 2.2, 1.6, m);
  }
  if (roof) cone(t, ci, j0 + h + 0.5, ck, rad + 1.2, rad * 1.6, roof);
}
// escalera: n escalones de 1 vóxel de alto y 2 de largo hacia una dirección
function stairs(t, i, j0, k, dir, n, w, m) {
  for (let s = 0; s < n; s++) {
    const a = s * 2;
    if (dir === 'z+') t.box(i - w / 2, j0 - 2, k + a, w, s + 3, 2, m);
    else if (dir === 'z-') t.box(i - w / 2, j0 - 2, k - a - 2, w, s + 3, 2, m);
    else if (dir === 'x+') t.box(i + a, j0 - 2, k - w / 2, 2, s + 3, w, m);
    else t.box(i - a - 2, j0 - 2, k - w / 2, 2, s + 3, w, m);
  }
}
// puerta en arco (se quita de una pared)
function door(t, ci, j0, ck, w, h, alongX) {
  if (alongX) t.box(ci - w / 2, j0, ck - 4, w, h - w / 2, 8, AIR);
  else t.box(ci - 4, j0, ck - w / 2, 8, h - w / 2, w, AIR);
  t.sphere(ci, j0 + h - w / 2, ck, w / 2, AIR);
}
// casita: paredes huecas, puerta, ventanas y techo de dos aguas
function house(t, ci, j0, ck, w, d, h, wallM, roofM, floors = 1) {
  t.box(ci - w / 2, j0 - 1, ck - d / 2, w, h + 1, d, wallM);
  t.box(ci - w / 2 + 1.5, j0, ck - d / 2 + 1.5, w - 3, h - 1.5, d - 3, AIR);
  door(t, ci, j0, ck + d / 2, 4, 6, true);
  for (const s of [-1, 1]) t.box(ci + s * w / 4 - 1.2, j0 + h * 0.55, ck - d / 2 - 2, 2.4, 2.4, d + 4, AIR);
  if (floors > 1) {
    const fh = Math.floor(h / 2);
    t.box(ci - w / 2 + 1.5, j0 + fh, ck - d / 2 + 1.5, w - 3, 1.2, d - 3, M.BEAM);
    t.box(ci - w / 2 + 2, j0 + fh - 0.5, ck - d / 2 + 2, 4, 2, 5, AIR); // hueco de la escalera
    stairs(t, ci - w / 2 + 4, j0, ck - d / 2 + 7, 'z-', Math.min(fh, 3), 3, M.BEAM);
  }
  const rh = w * 0.45, y0 = j0 + h - 0.5;
  t.shapeFn(ci - w / 2 - 2, y0 - 1, ck - d / 2 - 2, ci + w / 2 + 2, y0 + rh + 1, ck + d / 2 + 2, (x, y, z) => {
    const top = y0 + rh * (1 - Math.abs(x - ci) / (w / 2 + 1.5));
    return Math.min(top - y, y - y0 + 0.5, d / 2 + 1.5 - Math.abs(z - ck));
  }, roofM);
}
// caja redondeada (en planta) para tinas y mesas
function rrect(t, ci, ck, hx, hz, rad, j0, j1, m) {
  t.shapeFn(ci - hx - 2, j0 - 1, ck - hz - 2, ci + hx + 2, j1 + 1, ck + hz + 2, (x, y, z) => {
    const qx = Math.abs(x - ci) - (hx - rad), qz = Math.abs(z - ck) - (hz - rad);
    const d2 = Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0);
    return Math.min(rad - d2, y - j0, j1 - y);
  }, m);
}
const inSquare = (i, k, h) => Math.abs(i - CX) < h && Math.abs(k - CZ) < h;

export const THEMES = {
  // ---------------- ARENERO: marco de madera, dunas, tobogán, balde, castillo de arena ----------------
  arenero: {
    name: 'Arenero del Patio',
    palette: { 1: '#f6d68c', 2: '#e3b768', 3: '#b98b4a', 4: '#8e9aa6', 5: '#ff5a5f', 6: '#3d8bfd', 7: '#ffd23f', 8: '#43c96b', 9: '#fff8e8', 10: '#4a3020', 11: '#ff9f43', 12: '#c97c3c' },
    sky: ['#58b9ff', '#cfeeff'], water: '#2ec4d6', fog: '#bfe6ff',
    waterVox: 7, maxH: 15, hill: 9, curve: 0.7, terraces: 0, blobs: [1, 1], tunnels: 1, song: 1,
    height(i, k, h, noise, water) {
      if (!inSquare(i, k, 56)) return water - 4;
      const dunes = (noise(i * 0.045 + 7, k * 0.045 - 3, 4) + 0.5) * 12;
      const ridge = Math.max(0, 1 - Math.abs(noise(i * 0.02 - 9, k * 0.02 + 4, 2)) * 6) * 5;
      return water + 2 + dunes + ridge;
    },
    decorate(t, r) {
      const w = t.theme.waterVox;
      // marco de tablas alrededor del arenero (se camina por encima)
      const top = w + 13, H = 56;
      for (const [i0, k0, i1, k1] of [[CX - H - 2, CZ - H - 2, CX + H + 2, CZ - H - 2], [CX - H - 2, CZ + H + 2, CX + H + 2, CZ + H + 2], [CX - H - 2, CZ - H - 2, CX - H - 2, CZ + H + 2], [CX + H + 2, CZ - H - 2, CX + H + 2, CZ + H + 2]]) {
        wall(t, i0, k0, i1, k1, w - 4, top - (w - 4), 4.5, M.BEAM, false);
      }
      for (const [si, sk] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) t.box(CX + si * (H + 2) - 5, w - 4, CZ + sk * (H + 2) - 5, 10, top - w + 4, 10, M.BEAM);
      // tobogán: torre con escalera y resbaladero rojo
      const sx = CX + 22, sz = CZ + 14, sj = t.topAt(sx, sz);
      for (const [a, b] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) t.tube([sx + a, sj - 2, sz + b], [sx + a, sj + 14, sz + b], 0.9, M.METAL);
      t.box(sx - 4, sj + 13, sz - 4, 8, 1.5, 8, M.B);
      stairs(t, sx, t.topAt(sx, sz - 30), sz - 30, 'z+', 13, 4, M.B);
      t.ramp(sx, sz + 4, sj + 14, sx, sz + 30, t.topAt(sx, sz + 30) + 0.5, 5, M.A);
      t.tube([sx - 2.6, sj + 15.2, sz + 4], [sx - 2.6, t.topAt(sx, sz + 30) + 1.6, sz + 30], 0.5, M.A);
      t.tube([sx + 2.6, sj + 15.2, sz + 4], [sx + 2.6, t.topAt(sx, sz + 30) + 1.6, sz + 30], 0.5, M.A);
      // balde gigante con manija y montaña de arena para subir
      const bx = CX + 26, bz = CZ - 24, bj = t.topAt(bx, bz);
      t.cylinder(bx, bj - 2, bz, 6.5, 12, M.A);
      t.cylinder(bx, bj, bz, 5, 13, AIR);
      t.tube([bx - 6.5, bj + 10, bz], [bx - 3, bj + 15, bz], 0.6, M.C);
      t.tube([bx - 3, bj + 15, bz], [bx + 3, bj + 15, bz], 0.6, M.C);
      t.tube([bx + 3, bj + 15, bz], [bx + 6.5, bj + 10, bz], 0.6, M.C);
      t.ramp(bx - 22, bz, t.topAt(bx - 22, bz) + 0.5, bx - 7, bz, bj + 10, 6, M.TOP);
      // castillo de arena con torres, muralla y bandera
      const cx = CX - 22, cz = CZ + 20;
      t.plateau(cx, cz, 13, 13, w + 9, 7, M.TOP);
      const cj = w + 9;
      t.box(cx - 8, cj - 1, cz - 8, 16, 6, 16, M.SUB);
      t.box(cx - 6, cj + 2, cz - 6, 12, 5, 12, AIR);
      for (const [a, b] of [[-8, -8], [8, -8], [-8, 8], [8, 8]]) tower(t, cx + a, cj - 1, cz + b, 2.8, 11, M.SUB);
      door(t, cx, cj, cz + 8, 4, 5, true);
      t.box(cx - 4, cj + 5, cz - 4, 8, 6, 8, M.SUB);
      t.tube([cx, cj + 11, cz], [cx, cj + 18, cz], 0.35, M.C);
      t.box(cx, cj + 15.5, cz - 0.3, 4, 2.5, 0.6, M.A);
      // pala azul tirada como puente entre dunas
      const px = CX - 34, pz = CZ - 28;
      t.tube([px, t.topAt(px, pz) + 1, pz], [px + 18, t.topAt(px + 18, pz + 10) + 3, pz + 10], 1.0, M.B);
      t.box(px + 17, t.topAt(px + 18, pz + 10) + 1, pz + 8, 6, 1.2, 6, M.B);
      // volqueta de juguete
      const tx = CX - 4, tz = CZ - 34, tj = t.topAt(tx, tz);
      t.box(tx - 7, tj + 1.5, tz - 3, 14, 3, 6, M.C);
      t.box(tx + 3, tj + 4.5, tz - 3, 4, 4, 6, M.C);
      t.box(tx - 7, tj + 4.5, tz - 3.5, 9, 4, 7, M.A);
      t.box(tx - 6, tj + 5.5, tz - 2.5, 7, 4, 5, AIR);
      for (const [a, b] of [[-5, -3.6], [4, -3.6], [-5, 3.6], [4, 3.6]]) t.tube([tx + a, tj + 1.8, tz + b - 0.8], [tx + a, tj + 1.8, tz + b + 0.8], 1.9, M.DARK);
      // columpio
      const qx = CX + 4, qz = CZ + 36, qj = t.topAt(qx, qz);
      for (const s of [-7, 7]) { t.tube([qx + s - 3, qj - 1, qz], [qx + s, qj + 12, qz], 0.6, M.B); t.tube([qx + s + 3, qj - 1, qz], [qx + s, qj + 12, qz], 0.6, M.B); }
      t.tube([qx - 7, qj + 12, qz], [qx + 7, qj + 12, qz], 0.6, M.B);
      // montículos de arena blanda (amortiguan caídas)
      for (const s of spots(t, r, 4, 12)) t.cylinder(s.i, s.j - 1, s.k, 3.5, 2, M.E);
    },
  },

  // ---------------- BAÑERA: piso de baldosas, tina de verdad con agua, grifo, patos y jabones ----------------
  banera: {
    name: 'Bañera Espumosa',
    palette: { 1: '#eaf6ff', 2: '#bfdcf3', 3: '#91b5d6', 4: '#a7b3bf', 5: '#ffd400', 6: '#ff8c1a', 7: '#ff9ad5', 8: '#fbfdff', 9: '#ffffff', 10: '#22313f', 11: '#9fe6c0', 12: '#ffb84d' },
    sky: ['#ff9ec7', '#ffe3f1'], water: '#5fd1ff', fog: '#ffd9ec', seabed: M.SUB,
    waterVox: 8, maxH: 12, hill: 6, curve: 0.6, terraces: 0, blobs: [1, 1], tunnels: 0, song: 2,
    height(i, k, h, noise, water) { return inSquare(i, k, 62) ? water + 2 : water - 5; },
    mat(i, j, k, depth, m) { return m === M.TOP ? (((i / 6) | 0) + ((k / 6) | 0)) % 2 ? M.TOP : M.E : m; },
    decorate(t, r) {
      const w = t.theme.waterVox;
      const top = w + 14;
      // la tina: porcelana con borde ancho por donde se camina; adentro hay agua
      rrect(t, CX, CZ, 42, 26, 12, w - 4, top, M.D);
      rrect(t, CX, CZ, 36, 20, 9, w - 3, top + 3, AIR);
      // grifo de metal (no se rompe) en un extremo
      const fx = CX + 40;
      t.tube([fx, top, CZ], [fx, top + 9, CZ], 1.3, M.METAL);
      t.tube([fx, top + 9, CZ], [fx - 9, top + 9, CZ], 1.1, M.METAL);
      t.tube([fx - 9, top + 9, CZ], [fx - 9, top + 6, CZ], 1.2, M.METAL);
      for (const s of [-5, 5]) t.sphere(fx, top + 2, CZ + s, 1.8, M.METAL);
      // dentro de la tina: patos, jabones, esponja y espuma para saltar
      for (const [a, b] of [[-22, -8], [12, 10]]) {
        const x = CX + a, z = CZ + b;
        t.sphere(x, w + 1, z, 5.5, M.A, 0.75);
        t.sphere(x + 3.5, w + 6, z, 3.4, M.A);
        t.box(x + 6, w + 5, z - 1.2, 3, 1.8, 2.4, M.B);
        t.sphere(x + 5.5, w + 7, z - 1.6, 0.7, M.DARK); t.sphere(x + 5.5, w + 7, z + 1.6, 0.7, M.DARK);
      }
      for (const [a, b] of [[-6, -12], [-30, 10], [24, -10], [0, 12]]) t.box(CX + a - 4, w - 1, CZ + b - 2.5, 8, 3.5, 5, M.C);
      const sx = CX - 8, sz = CZ + 2;
      t.box(sx - 5, w - 1, sz - 4, 10, 4, 8, M.A);
      for (let n = 0; n < 6; n++) t.sphere(sx - 3 + (n % 3) * 3, w + 1 + (n > 2 ? 1 : 0), sz - 2 + (n % 2) * 4, 0.9, AIR);
      for (const [a, b] of [[30, 6], [-36, -6], [18, -16]]) t.sphere(CX + a, w + 0.5, CZ + b, 3.2, M.WHITE, 0.5);
      // barquito
      t.box(CX + 28, w - 0.5, CZ + 12, 7, 2.5, 3.5, M.B);
      t.tube([CX + 31.5, w + 2, CZ + 13.7], [CX + 31.5, w + 8, CZ + 13.7], 0.3, M.DARK);
      t.box(CX + 31.5, w + 4, CZ + 13.5, 3, 3.5, 0.5, M.WHITE);
      // afuera: frascos de champú, toallas en escalera, vaso con cepillo y tapete
      for (const [a, b, m] of [[-52, -44, M.B], [-44, -50, M.C], [50, 44, M.A]]) {
        const x = CX + a, z = CZ + b;
        t.cylinder(x, w + 1, z, 3.2, 16, m);
        t.cylinder(x, w + 17, z, 1.6, 3, M.DARK);
      }
      let tj = w + 2;
      for (let n = 0; n < 4; n++) { t.box(CX + 30 - n * 2, tj, CZ - 50 + n * 3, 12, 2, 10 - n * 2, [M.A, M.E, M.C, M.B][n]); tj += 2; }
      t.cylinder(CX - 50, w + 1, CZ + 44, 3.4, 9, M.E);
      t.cylinder(CX - 50, w + 3, CZ + 44, 2.2, 9, AIR);
      t.tube([CX - 50, w + 4, CZ + 44], [CX - 48, w + 16, CZ + 45], 0.6, M.B);
      t.box(CX - 10, w + 2, CZ + 36, 20, 0.8, 10, M.WHITE);
      // escalera de baño (banquito) para subir al borde de la tina
      stairs(t, CX - 22, w + 2, CZ + 50, 'z-', 12, 6, M.B);
      // cepillo de dientes gigante como rampa por el otro lado
      t.ramp(CX - 64, CZ - 6, w + 2.5, CX - 41, CZ - 6, top, 3.5, M.B);
      t.tube([CX - 64, w + 3, CZ - 8], [CX - 41, top + 0.5, CZ - 8], 0.6, M.A);
      t.box(CX - 46, top, CZ - 8.5, 5, 2.5, 5, M.WHITE);
      // rollo de papel acostado (se puede atravesar)
      t.tube([CX + 18, w + 6.5, CZ + 46], [CX + 30, w + 6.5, CZ + 46], 5, M.WHITE);
      t.tube([CX + 16, w + 6.5, CZ + 46], [CX + 32, w + 6.5, CZ + 46], 2.6, AIR);
    },
  },

  // ---------------- COCINA: mesón, torta de 3 pisos, tostadora, sartén, taza, panqueques ----------------
  cocina: {
    name: 'Cocina Gigante',
    palette: { 1: '#efe7da', 2: '#d8ccb8', 3: '#a8977c', 4: '#c9d1d9', 5: '#e3172b', 6: '#3ccf6e', 7: '#ff8fc7', 8: '#6b3e26', 9: '#fff6e6', 10: '#2b1a10', 11: '#f7d9a0', 12: '#d9a066' },
    sky: ['#ffcf7a', '#fff1d6'], water: '#c9905a', fog: '#ffe7c2',
    waterVox: 7, maxH: 14, hill: 7, curve: 0.8, terraces: 0, blobs: [1, 1], tunnels: 0, song: 3,
    height(i, k, h, noise, water) {
      if (!inSquare(i, k, 60)) return water - 5;
      return water + 3 + Math.max(0, noise(i * 0.06, k * 0.06, 2)) * 3;
    },
    mat(i, j, k, depth, m) { return m === M.TOP && ((i / 8) | 0) % 2 === 0 && ((k / 8) | 0) % 2 === 0 ? M.WHITE : m; },
    decorate(t, r) {
      const w = t.theme.waterVox, base = w + 3;
      // torta de tres pisos con chocolate, glaseado rosado, cerezas y escaleras de chocolate
      const tiers = [[17, 7], [11.5, 6], [6.5, 5]];
      let j = base - 1;
      tiers.forEach(([rad, h], n) => {
        t.cylinder(CX, j, CZ, rad, h, M.E);
        t.cylinder(CX, j + h / 2 - 0.5, CZ, rad + 0.4, 1.2, M.D);
        t.cylinder(CX, j + h - 0.8, CZ, rad + 0.5, 1.6, M.C);
        for (let a = 0; a < 10; a++) { const ang = (a / 10) * Math.PI * 2; t.sphere(CX + Math.cos(ang) * (rad + 0.3), j + h - 1.4, CZ + Math.sin(ang) * (rad + 0.3), 1.0, M.C); }
        if (n < 2) {
          // rampa de chocolate sobre el anillo del piso, hasta el borde del siguiente
          const rr = (rad + tiers[n + 1][0]) / 2, side = n ? -1 : 1;
          t.ramp(CX + side * rr, CZ + rad * 0.7, j + h, CX + side * rr, CZ - 1, j + h + tiers[n + 1][1], 3, M.D);
        }
        j += h;
      });
      for (let a = 0; a < 5; a++) { const ang = (a / 5) * Math.PI * 2; t.sphere(CX + Math.cos(ang) * 4, j + 1.2, CZ + Math.sin(ang) * 4, 1.6, M.A); }
      for (const [a, b] of [[-1.5, 0], [1.5, 1]]) t.tube([CX + a, j, CZ + b], [CX + a, j + 6, CZ + b], 0.5, M.B);
      t.tube([CX - 22, base + 2, CZ], [CX + 22, base + 2, CZ], 2.4, AIR);
      // tostadora (metal) con tostadas que asoman
      const tx = CX + 36, tz = CZ - 30;
      t.box(tx - 8, base - 1, tz - 5, 16, 12, 10, M.METAL);
      for (const s of [-3, 3]) { t.box(tx + s - 1.5, base + 6, tz - 3.5, 3, 7, 7, AIR); t.box(tx + s - 1.2, base + 7, tz - 3, 2.4, 7, 6, M.E); }
      // taza con manija
      const mx = CX - 36, mz = CZ - 28;
      t.cylinder(mx, base - 1, mz, 6.5, 11, M.A);
      t.cylinder(mx, base + 1, mz, 5, 11, AIR);
      t.tube([mx + 6.5, base + 8, mz], [mx + 10, base + 8, mz], 1.0, M.A);
      t.tube([mx + 10, base + 8, mz], [mx + 10, base + 3, mz], 1.0, M.A);
      t.tube([mx + 10, base + 3, mz], [mx + 6.5, base + 3, mz], 1.0, M.A);
      // sartén de metal con mango que sale como puente
      const fx = CX + 32, fz = CZ + 30;
      t.cylinder(fx, base - 1, fz, 10, 2, M.METAL);
      t.cylinder(fx, base, fz, 10, 3, M.METAL);
      t.cylinder(fx, base + 1, fz, 9, 3, AIR);
      t.tube([fx + 9, base + 2, fz + 4], [fx + 26, base + 5, fz + 14], 1.4, M.DARK);
      // torre de panqueques con miel y mantequilla
      const px = CX - 32, pz = CZ + 30;
      for (let n = 0; n < 6; n++) { t.cylinder(px, base - 1 + n * 1.8, pz, 7.5 - (n % 2) * 0.4, 1.6, M.E); t.cylinder(px, base - 0.2 + n * 1.8, pz, 7.2, 0.5, M.D); }
      t.box(px - 2, base + 10, pz - 2, 4, 2, 4, M.WHITE);
      stairs(t, px + 24, base, pz, 'x-', 9, 4, M.E);
      // rodillo de madera atravesado
      t.tube([CX - 52, base + 2, CZ - 4], [CX - 40, base + 2, CZ + 14], 2.2, M.BEAM);
      // galletas y cerezas sueltas
      for (const s of spots(t, r, 4, 14, 14, [CX - 20, CZ - 20, CX + 20, CZ + 20])) t.cylinder(s.i, s.j - 1, s.k, 4, 2, (i, jj, k) => ((i * 7 + k * 13) % 9 === 0 ? M.DARK : M.E));
      for (const s of spots(t, r, 3, 14, 14, [CX - 20, CZ - 20, CX + 20, CZ + 20])) { t.sphere(s.i, s.j + 2.5, s.k, 2.6, M.A); t.tube([s.i, s.j + 4.5, s.k], [s.i + 1, s.j + 8, s.k], 0.4, M.B); }
      // imanes de nevera (metal que no se rompe)
      for (const s of spots(t, r, 3, 16, 14, [CX - 20, CZ - 20, CX + 20, CZ + 20])) {
        t.box(s.i - 2, s.j, s.k - 1, 2, 5, 2, M.METAL);
        t.box(s.i + 1, s.j, s.k - 1, 2, 5, 2, M.METAL);
        t.box(s.i - 2, s.j + 4, s.k - 1, 5, 2, 2, M.METAL);
      }
    },
  },

  // ---------------- CUARTO DE JUGUETES: casa de muñecas, tren elevado, cohete, libros, bloques ----------------
  juguetes: {
    name: 'Cuarto de Juguetes',
    palette: { 1: '#5b7cfa', 2: '#c98b55', 3: '#8a5a33', 4: '#9aa7b4', 5: '#ff4757', 6: '#ffd23f', 7: '#2ecc71', 8: '#1e90ff', 9: '#ffffff', 10: '#2d2d3a', 11: '#ff9f1a', 12: '#e8a33d' },
    sky: ['#7b6cff', '#d6d1ff'], water: '#3ab0ff', fog: '#d3cdff',
    waterVox: 7, maxH: 13, hill: 6, curve: 0.65, terraces: 0, blobs: [1, 1], tunnels: 0, song: 4,
    height(i, k, h, noise, water) {
      if (!inSquare(i, k, 58)) return water - 5;
      return water + 3 + (noise(i * 0.04 + 3, k * 0.04, 3) + 0.5) * 6;
    },
    decorate(t, r) {
      const w = t.theme.waterVox;
      // casa de muñecas de dos pisos con escalera adentro
      const hx = CX - 10, hz = CZ - 8;
      t.plateau(hx, hz, 13, 11, w + 7, 6, M.TOP);
      house(t, hx, w + 7, hz, 20, 16, 16, M.WHITE, M.A, 2);
      t.box(hx - 10, w + 7, hz + 8, 20, 0.8, 4, M.BEAM);
      // tren de juguete sobre un riel elevado en círculo (se camina por encima)
      const R = 34, tj = w + 15;
      for (let a = 0; a < 360; a += 3) {
        const ang = (a * Math.PI) / 180, x = CX + Math.cos(ang) * R, z = CZ + Math.sin(ang) * R;
        t.box(x - 2.2, tj - 1, z - 2.2, 4.4, 1.6, 4.4, M.DARK);
        if (a % 30 === 0) t.cylinder(x, t.topAt(Math.round(x), Math.round(z)) - 2, z, 1.5, tj - t.topAt(Math.round(x), Math.round(z)) + 1, M.E);
      }
      for (const ang of [1.2, 4.3]) {
        const x = CX + Math.cos(ang) * R, z = CZ + Math.sin(ang) * R;
        const ox = CX + Math.cos(ang) * (R + 20), oz = CZ + Math.sin(ang) * (R + 20);
        t.ramp(ox, oz, t.topAt(Math.round(ox), Math.round(oz)) + 0.5, x, z, tj + 0.6, 4, M.D);
      }
      const la = 1.9, lx = CX + Math.cos(la) * R, lz = CZ + Math.sin(la) * R;
      t.box(lx - 3, tj + 0.6, lz - 2, 6, 3.5, 4, M.A);
      t.box(lx - 3, tj + 4, lz - 2, 2.5, 3, 4, M.A);
      t.cylinder(lx + 1.8, tj + 4, lz, 0.9, 3, M.DARK);
      // cohete
      const rx = CX + 46, rz = CZ + 26, rj = t.topAt(rx, rz);
      t.cylinder(rx, rj - 1, rz, 3.6, 16, M.WHITE);
      t.cylinder(rx, rj + 8, rz, 3.7, 1.2, M.A);
      cone(t, rx, rj + 15, rz, 3.6, 6, M.A);
      for (let a = 0; a < 3; a++) { const ang = (a / 3) * Math.PI * 2; t.box(rx + Math.cos(ang) * 4 - 1, rj - 1, rz + Math.sin(ang) * 4 - 1, 2, 6, 2, M.D); }
      // escalera de libros
      const bj = t.topAt(CX + 6, CZ - 48);
      for (let n = 0; n < 6; n++) { t.box(CX - 4 + n * 2.5, bj - 1 + n * 2, CZ - 52, 12 - n * 1.6, 2, 9, [M.A, M.D, M.B, M.E, M.WHITE, M.A][n]); }
      // torres de bloques con letras
      const cols = [M.A, M.B, M.D, M.E];
      for (const s of spots(t, r, 4, 14, 14, [CX - 14, CZ - 14, CX + 14, CZ + 14])) {
        let j = s.j;
        const n = 2 + Math.floor(r() * 3);
        for (let b = 0; b < n; b++) { const o = Math.floor(r() * 3) - 1; t.box(s.i - 2.5 + o, j - (b ? 0 : 1), s.k - 2.5 + o, 5, 5, 5, cols[Math.floor(r() * cols.length)]); j += 5; }
      }
      // bloques de gelatina verde (M.C) que hacen rebotar
      for (const s of spots(t, r, 4, 12, 14, [CX - 14, CZ - 14, CX + 14, CZ + 14])) t.box(s.i - 3, s.j - 1, s.k - 3, 6, 3, 6, M.C);
      // pirámide de bloques para trepar
      const qx = CX - 40, qz = CZ + 36, qj = t.topAt(qx, qz);
      for (let l = 0; l < 3; l++) for (let a = 0; a < 3 - l; a++) for (let c = 0; c < 3 - l; c++)
        t.box(qx - 7.5 + l * 2.5 + a * 5, qj - 1 + l * 5, qz - 7.5 + l * 2.5 + c * 5, 5, 5, 5, cols[(a + c + l) % cols.length]);
      // pelota
      const bx = CX + 14, bz = CZ + 14;
      t.sphere(bx, t.topAt(bx, bz) + 4, bz, 5, (i, j) => (j < t.topAt(bx, bz) + 4 ? M.A : M.WHITE));
    },
  },

  // ---------------- MESA DE BILLAR: mesa alta con bandas y troneras, patas, tacos como rampas ----------------
  billar: {
    name: 'Mesa de Billar',
    palette: { 1: '#1fa45a', 2: '#7a4a24', 3: '#4d2e14', 4: '#b8c2cc', 5: '#ffd23f', 6: '#2f6bff', 7: '#e3172b', 8: '#7b2fbe', 9: '#ffffff', 10: '#111111', 11: '#ff8c1a', 12: '#c08040' },
    sky: ['#2d3561', '#7c83c4'], water: '#2a8fbd', fog: '#5d659e',
    waterVox: 7, maxH: 9, hill: 4, curve: 0.5, terraces: 0, blobs: [2, 3], tunnels: 0, song: 5,
    height(i, k, h, noise, water) {
      if (Math.abs(i - CX) < 54 && Math.abs(k - CZ) < 32) return water - 5; // debajo de la mesa hay agua
      return Math.min(h, water + 4);
    },
    decorate(t, r) {
      const w = t.theme.waterVox, top = w + 13, hx = 50, hz = 28;
      // patas
      for (const [a, b] of [[-44, -22], [44, -22], [-44, 22], [44, 22], [0, -22], [0, 22]]) t.cylinder(CX + a, 0, CZ + b, 3.2, top - 4, M.DEEP);
      // tablero: madera abajo y paño verde arriba
      t.box(CX - hx, top - 5, CZ - hz, hx * 2, 4, hz * 2, M.SUB);
      t.box(CX - hx, top - 1.5, CZ - hz, hx * 2, 1.5, hz * 2, M.TOP);
      // bandas de madera con marcas blancas
      wall(t, CX - hx - 2, CZ - hz - 2, CX + hx + 2, CZ - hz - 2, top - 5, 7, 4, M.DEEP, false);
      wall(t, CX - hx - 2, CZ + hz + 2, CX + hx + 2, CZ + hz + 2, top - 5, 7, 4, M.DEEP, false);
      wall(t, CX - hx - 2, CZ - hz - 2, CX - hx - 2, CZ + hz + 2, top - 5, 7, 4, M.DEEP, false);
      wall(t, CX + hx + 2, CZ - hz - 2, CX + hx + 2, CZ + hz + 2, top - 5, 7, 4, M.DEEP, false);
      for (let a = -40; a <= 40; a += 13) for (const s of [-1, 1]) t.sphere(CX + a, top + 2, CZ + s * (hz + 2), 0.7, M.WHITE);
      // troneras: huecos que llevan directo al agua
      for (const [a, b] of [[-hx, -hz], [hx, -hz], [-hx, hz], [hx, hz], [0, -hz - 1], [0, hz + 1]]) t.cylinder(CX + a, w - 3, CZ + b, 3.6, top - w + 8, AIR);
      // triángulo y bolas
      const tri = [[CX + 18, CZ], [CX + 30, CZ - 7], [CX + 30, CZ + 7]];
      for (let n = 0; n < 3; n++) t.tube([tri[n][0], top + 0.7, tri[n][1]], [tri[(n + 1) % 3][0], top + 0.7, tri[(n + 1) % 3][1]], 0.7, M.BEAM);
      for (const [a, b, m] of [[-24, -10, M.A], [-12, 12, M.B], [8, -16, M.E]]) t.sphere(CX + a, top + 3, CZ + b, 3.2, (i, j) => (Math.abs(j - (top + 3)) < 0.8 ? M.WHITE : m));
      // tacos que suben del piso a la mesa (sirven de rampa)
      for (const [x0, z0, x1, z1] of [[CX + 66, CZ + 24, CX + 46, CZ + 10], [CX - 66, CZ - 24, CX - 46, CZ - 10]]) {
        t.tube([x0, t.topAt(Math.round(x0), Math.round(z0)) + 1, z0], [x1, top + 3, z1], 1.5, M.BEAM);
        t.sphere(x1, top + 3, z1, 1.4, M.WHITE);
      }
      // tiza y banquitos en el piso de abajo
      for (const [a, b] of [[-hx - 2, -hz - 2], [hx + 2, hz + 2]]) t.box(CX + a - 1.5, top + 2, CZ + b - 1.5, 3, 3, 3, M.B);
      for (const s of spots(t, r, 4, 14, 10, [CX - 56, CZ - 34, CX + 56, CZ + 34])) {
        t.tube([s.i, s.j - 1, s.k], [s.i, s.j + 6, s.k], 0.7, M.METAL);
        t.cylinder(s.i, s.j + 6, s.k, 3, 1.5, M.A);
      }
    },
  },

  // ---------------- CASTILLO DEL ZORRO: colina, foso, murallas con almenas, torres, puente y torre del homenaje ----------------
  castillo: {
    name: 'Castillo del Zorro',
    palette: { 1: '#4caf50', 2: '#a3a3a3', 3: '#6d6d6d', 4: '#7d8a96', 5: '#c0392b', 6: '#ff7a1a', 7: '#8d5a2b', 8: '#2e8b3e', 9: '#f5f5f5', 10: '#2b2b2b', 11: '#ffd23f', 12: '#a0703c' },
    sky: ['#ff8a5c', '#ffd7a8'], water: '#3a7fb8', fog: '#ffc79a',
    waterVox: 7, maxH: 12, hill: 7, curve: 0.75, terraces: 0, blobs: [2, 3], tunnels: 1, song: 6,
    decorate(t, r) {
      const w = t.theme.waterVox, base = w + 10, S = 24, wallH = 11;
      // colina del castillo
      t.plateau(CX, CZ, 40, 40, base, 9, M.TOP);
      // foso con agua alrededor
      t.shapeFn(CX - S - 12, w - 3, CZ - S - 12, CX + S + 12, base + 6, CZ + S + 12, (x, y, z) => {
        const d = Math.max(Math.abs(x - CX), Math.abs(z - CZ));
        return Math.min(d - (S + 4), S + 10 - d, y - (w - 3));
      }, AIR);
      // murallas con camino por arriba
      const lo = base - 1;
      wall(t, CX - S, CZ - S, CX + S, CZ - S, lo, wallH, 3.5, M.SUB);
      wall(t, CX - S, CZ + S, CX + S, CZ + S, lo, wallH, 3.5, M.SUB);
      wall(t, CX - S, CZ - S, CX - S, CZ + S, lo, wallH, 3.5, M.SUB);
      wall(t, CX + S, CZ - S, CX + S, CZ + S, lo, wallH, 3.5, M.SUB);
      // portón en arco y puente levadizo de madera sobre el foso
      door(t, CX, base, CZ + S, 7, 9, true);
      t.box(CX - 4, base - 1.5, CZ + S - 1, 8, 1.5, 15, M.C);
      for (const s of [-4.2, 4.2]) t.tube([CX + s, base + 9, CZ + S + 1], [CX + s, base, CZ + S + 13], 0.25, M.DARK);
      // torres en las esquinas (las de atrás con techo rojo)
      for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) tower(t, CX + a * S, lo, CZ + b * S, 5.5, wallH + 7, M.SUB, b < 0 ? M.A : null);
      // escaleras por dentro para subir a las murallas
      stairs(t, CX - S + 4, base, CZ - 6, 'z+', wallH, 3.5, M.SUB);
      stairs(t, CX + S - 4, base, CZ + 6, 'z-', wallH, 3.5, M.SUB);
      // torre del homenaje con puerta, ventanas, almenas y bandera del zorro
      const kh = 17;
      t.box(CX - 8, lo, CZ - 8, 16, kh, 16, M.SUB);
      t.box(CX - 6, base, CZ - 6, 12, kh - 3, 12, AIR);
      door(t, CX, base, CZ + 8, 5, 7, true);
      for (const [a, b, ax] of [[0, -8, true], [-8, 0, false], [8, 0, false]]) door(t, CX + a, base + 9, CZ + b, 2.4, 4, ax);
      t.box(CX - 8, lo + kh, CZ - 8, 16, 1.5, 16, M.SUB);
      crenels(t, CX - 8, CZ - 8, CX + 8, CZ - 8, lo + kh + 1.5, 1.6, M.SUB);
      crenels(t, CX - 8, CZ + 8, CX + 8, CZ + 8, lo + kh + 1.5, 1.6, M.SUB);
      crenels(t, CX - 8, CZ - 8, CX - 8, CZ + 8, lo + kh + 1.5, 1.6, M.SUB);
      crenels(t, CX + 8, CZ - 8, CX + 8, CZ + 8, lo + kh + 1.5, 1.6, M.SUB);
      t.tube([CX, lo + kh + 1, CZ], [CX, lo + kh + 12, CZ], 0.4, M.DARK);
      t.box(CX, lo + kh + 8, CZ - 0.3, 6, 3.5, 0.6, M.B);
      // escudos de hierro (no se rompen) en el patio
      for (const [a, b] of [[-14, 10], [14, -12]]) t.box(CX + a - 2.5, base - 1, CZ + b - 1, 5, 4, 2, M.METAL);
      // aldea y bosque afuera
      const out = spots(t, r, 14, 11, 10, [CX - S - 14, CZ - S - 14, CX + S + 14, CZ + S + 14]);
      out.slice(0, 2).forEach((s) => house(t, s.i, s.j, s.k, 10, 8, 7, M.C, M.A));
      out.slice(2).forEach((s) => tree(t, s.i, s.j, s.k, r));
    },
  },
};

export const ISLAND_IDS = Object.keys(THEMES);
export function islandTheme(id) { return THEMES[id] || THEMES.arenero; }
