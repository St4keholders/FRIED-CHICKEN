// Terreno de vóxeles: generación por semilla, consultas y cambios (explosiones y vigas).
// No depende de Three.js: lo usan el anfitrión (física) y los celulares (copia del juego).
import { NX, NY, NZ, VOX, CHUNK, M } from './constants.js';
import { islandTheme } from './islands.js';

export const AIR = 0;
export { M };

export function rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeNoise(seed) {
  const r = rng(seed);
  const perm = new Uint8Array(512);
  const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  const grad = (h, x, y) => { const u = h & 1 ? -x : x; const v = h & 2 ? -y : y; return (h & 4 ? u * 0.5 : u) + (h & 4 ? v : v * 0.5); };
  const n2 = (x, y) => {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
    const xf = x - Math.floor(x), yf = y - Math.floor(y);
    const u = fade(xf), v = fade(yf);
    const a = perm[X] + Y, b = perm[X + 1] + Y;
    const l1 = grad(perm[a], xf, yf) + u * (grad(perm[b], xf - 1, yf) - grad(perm[a], xf, yf));
    const l2 = grad(perm[a + 1], xf, yf - 1) + u * (grad(perm[b + 1], xf - 1, yf - 1) - grad(perm[a + 1], xf, yf - 1));
    return l1 + v * (l2 - l1);
  };
  return (x, y, oct = 3) => {
    let s = 0, a = 1, f = 1, n = 0;
    for (let o = 0; o < oct; o++) { s += n2(x * f, y * f) * a; n += a; a *= 0.5; f *= 2; }
    return s / n;
  };
}

// Densidad: cada punto guarda qué tan "lleno" está (0 aire, 255 macizo). La superficie lisa
// pasa por 128; la física considera macizo todo lo que está en 128 o más.
const ISO = 128;
const K = 105; // cuánto cambia la densidad por cada vóxel de distancia
const clamp8 = (v) => (v < 0 ? 0 : v > 255 ? 255 : v | 0);

export class Terrain {
  constructor(seed, islandId) {
    this.seed = seed >>> 0;
    this.islandId = islandId;
    this.theme = islandTheme(islandId);
    this.v = new Uint8Array(NX * NY * NZ); // material
    this.d = new Uint8Array(NX * NY * NZ); // densidad
    this.edits = []; // historial de cambios para sincronizar celulares
    this.dirty = new Set();
    this.generate();
  }

  idx(i, j, k) { return (j * NZ + k) * NX + i; }
  get(i, j, k) {
    if (i < 0 || j < 0 || k < 0 || i >= NX || j >= NY || k >= NZ) return AIR;
    const id = (j * NZ + k) * NX + i;
    return this.d[id] >= ISO ? (this.v[id] || M.SUB) : AIR;
  }
  dens(i, j, k) {
    if (j < 0) return 255;
    if (i < 0 || k < 0 || i >= NX || j >= NY || k >= NZ) return 0;
    return this.d[(j * NZ + k) * NX + i];
  }
  // consulta en coordenadas del mundo
  solid(x, y, z) {
    const i = Math.floor(x / VOX), j = Math.floor(y / VOX), k = Math.floor(z / VOX);
    if (i < 0 || j < 0 || k < 0 || i >= NX || j >= NY || k >= NZ) return false;
    return this.d[(j * NZ + k) * NX + i] >= ISO;
  }
  // material del suelo debajo de (x, y, z)
  matUnder(x, y, z) {
    const i = Math.floor(x / VOX), k = Math.floor(z / VOX);
    if (i < 0 || k < 0 || i >= NX || k >= NZ) return AIR;
    const jTop = Math.min(NY - 1, Math.floor((y + 0.35) / VOX));
    const jBot = Math.max(0, Math.floor((y - 0.9) / VOX));
    for (let j = jTop; j >= jBot; j--) {
      const m = this.get(i, j, k);
      if (m) return m;
    }
    return AIR;
  }
  // altura lisa del suelo más alto en (x, z) en unidades del mundo (0 si no hay)
  surfaceY(x, z, fromY) {
    const i = Math.floor(x / VOX), k = Math.floor(z / VOX);
    if (i < 0 || k < 0 || i >= NX || k >= NZ) return 0;
    const top = fromY === undefined ? NY - 1 : Math.min(NY - 1, Math.floor(fromY / VOX));
    for (let j = top; j >= 0; j--) {
      const a = this.d[(j * NZ + k) * NX + i];
      if (a >= ISO) {
        const b = j + 1 < NY ? this.d[((j + 1) * NZ + k) * NX + i] : 0;
        const t = a > b ? Math.min(1, (a - ISO) / (a - b)) : 0.5;
        return (j + 0.5 + t) * VOX;
      }
    }
    return 0;
  }

  markDirtyBox(i0, j0, k0, i1, j1, k1) {
    const c0 = [Math.floor((i0 - 2) / CHUNK), Math.floor((j0 - 2) / CHUNK), Math.floor((k0 - 2) / CHUNK)];
    const c1 = [Math.floor((i1 + 2) / CHUNK), Math.floor((j1 + 2) / CHUNK), Math.floor((k1 + 2) / CHUNK)];
    for (let cx = Math.max(0, c0[0]); cx <= Math.min(NX / CHUNK - 1, c1[0]); cx++)
      for (let cy = Math.max(0, c0[1]); cy <= Math.min(NY / CHUNK - 1, c1[1]); cy++)
        for (let cz = Math.max(0, c0[2]); cz <= Math.min(NZ / CHUNK - 1, c1[2]); cz++) this.dirty.add(`${cx},${cy},${cz}`);
  }

  // suma una forma (sdf > 0 adentro, en vóxeles); si m es AIR la resta
  shape(i, j, k, sdf, m) {
    if (i < 0 || j < 0 || k < 0 || i >= NX || j >= NY || k >= NZ) return;
    const id = (j * NZ + k) * NX + i;
    if (m === AIR) {
      if (this.v[id] === M.METAL) return;
      const nd = clamp8(ISO - sdf * K);
      if (nd < this.d[id]) this.d[id] = nd;
      return;
    }
    const nd = clamp8(ISO + sdf * K);
    if (nd > this.d[id]) { this.d[id] = nd; if (nd > 70) this.v[id] = m; }
    else if (sdf > 0 && this.d[id] > 70) this.v[id] = m;
  }

  // explosión: quita una esfera lisa (el metal no se rompe)
  carve(x, y, z, r, record = true) {
    const ci = x / VOX, cj = y / VOX, ck = z / VOX, rv = r / VOX;
    const ext = rv + 2;
    const i0 = Math.floor(ci - ext), i1 = Math.ceil(ci + ext);
    const j0 = Math.floor(cj - ext), j1 = Math.ceil(cj + ext);
    const k0 = Math.floor(ck - ext), k1 = Math.ceil(ck + ext);
    let n = 0;
    for (let j = Math.max(0, j0); j <= Math.min(NY - 1, j1); j++)
      for (let k = Math.max(0, k0); k <= Math.min(NZ - 1, k1); k++)
        for (let i = Math.max(0, i0); i <= Math.min(NX - 1, i1); i++) {
          const dx = i + 0.5 - ci, dy = j + 0.5 - cj, dz = k + 0.5 - ck;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          const id = (j * NZ + k) * NX + i;
          if (this.v[id] === M.METAL) continue;
          const nd = clamp8(ISO - (rv - dist) * K);
          if (nd < this.d[id]) { if (this.d[id] >= ISO && nd < ISO) n++; this.d[id] = nd; }
          if (dist <= rv + 1.6 && this.v[id] === M.TOP) this.v[id] = M.SUB; // borde quemado
        }
    this.markDirtyBox(i0, j0, k0, i1, j1, k1);
    if (record) this.edits.push({ k: 'c', x: +x.toFixed(2), y: +y.toFixed(2), z: +z.toFixed(2), r: +r.toFixed(2) });
    return n;
  }

  // viga de juguete: una tabla lisa
  beam(x, y, z, yaw, len = 6, record = true) {
    const dx = Math.sin(yaw), dz = Math.cos(yaw);
    const hl = len / 2 / VOX, hw = 0.55 / VOX, hh = 0.22 / VOX;
    const cx = (x + dx * len / 2) / VOX, cy = y / VOX, cz = (z + dz * len / 2) / VOX;
    const ext = hl + 2;
    const i0 = Math.floor(cx - ext), i1 = Math.ceil(cx + ext), k0 = Math.floor(cz - ext), k1 = Math.ceil(cz + ext);
    const j0 = Math.floor(cy - hh - 2), j1 = Math.ceil(cy + hh + 2);
    for (let j = j0; j <= j1; j++) for (let k = k0; k <= k1; k++) for (let i = i0; i <= i1; i++) {
      const px = i + 0.5 - cx, py = j + 0.5 - cy, pz = k + 0.5 - cz;
      const a = Math.abs(px * dx + pz * dz), b = Math.abs(px * dz - pz * dx), c = Math.abs(py);
      const sdf = Math.min(hl - a, hw - b, hh - c);
      if (sdf > -2) this.shape(i, j, k, sdf, M.BEAM);
    }
    this.markDirtyBox(i0, j0, k0, i1, j1, k1);
    if (record) this.edits.push({ k: 'b', x: +x.toFixed(2), y: +y.toFixed(2), z: +z.toFixed(2), yaw: +yaw.toFixed(3), len });
    return 1;
  }

  applyEdit(e) {
    if (e.k === 'c') this.carve(e.x, e.y, e.z, e.r, false);
    else if (e.k === 'b') this.beam(e.x, e.y, e.z, e.yaw, e.len, false);
    this.edits.push(e);
  }

  // resumen del terreno para comprobar que todos tienen el mismo
  hash() {
    let h = 2166136261;
    for (let i = 0; i < this.d.length; i += 7) { h ^= this.d[i]; h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  // ---------------- generación ----------------
  generate() {
    const r = rng(this.seed);
    const noise = makeNoise(this.seed ^ 0x9e3779b9);
    const th = this.theme;
    const cx = NX / 2, cz = NZ / 2;
    // varias "manchas" forman la isla (a veces un archipiélago)
    const blobs = [];
    const nb = th.blobs[0] + Math.floor(r() * (th.blobs[1] - th.blobs[0] + 1));
    for (let b = 0; b < nb; b++) {
      const a = r() * Math.PI * 2, d = b === 0 ? r() * 8 : 18 + r() * 26;
      blobs.push({ x: cx + Math.cos(a) * d, z: cz + Math.sin(a) * d, rad: (b === 0 ? 34 : 18) + r() * 14, h: 0.65 + r() * 0.5 });
    }
    const maxH = th.maxH;
    const water = th.waterVox;
    const heights = new Float32Array(NX * NZ);
    for (let k = 0; k < NZ; k++) for (let i = 0; i < NX; i++) {
      let m = 0;
      for (const b of blobs) {
        const d = Math.hypot(i - b.x, k - b.z) / b.rad;
        m = Math.max(m, (1 - d) * b.h);
      }
      const warp = noise(i * 0.03, k * 0.03, 3) * 0.55;
      m += warp;
      // bordes del mapa siempre agua
      const edge = Math.min(i, k, NX - 1 - i, NZ - 1 - k);
      if (edge < 10) m -= (10 - edge) * 0.08;
      let h;
      if (m <= 0) h = water - 4 + m * 6;
      else {
        const hills = (noise(i * 0.06 + 31, k * 0.06 - 17, 4) + 0.5) * th.hill;
        h = water + 2 + Math.pow(Math.min(1, m), th.curve) * maxH + hills * Math.min(1, m * 3);
        if (th.terraces) { const tq = Math.round(h / th.terraces) * th.terraces; h += (tq - h) * 0.3; }
      }
      heights[k * NX + i] = Math.max(1, Math.min(NY - 6, h));
    }
    const H = (i, k) => heights[Math.max(0, Math.min(NZ - 1, k)) * NX + Math.max(0, Math.min(NX - 1, i))];
    for (let k = 0; k < NZ; k++) for (let i = 0; i < NX; i++) {
      const h = heights[k * NX + i];
      const under = h <= water;
      // distancia real a la superficie (corrige por la pendiente para que no salgan escalones)
      const gx = (H(i + 1, k) - H(i - 1, k)) / 2, gz = (H(i, k + 1) - H(i, k - 1)) / 2;
      const slope = Math.sqrt(1 + gx * gx + gz * gz);
      for (let j = 0; j < NY; j++) {
        const depth = (h - (j + 0.5)) / slope;
        if (depth < -3) break;
        const id = (j * NZ + k) * NX + i;
        this.d[id] = clamp8(ISO + depth * K);
        let m = M.DEEP;
        if (depth < 1.3) m = M.TOP;
        else if (depth < 4.5) m = M.SUB;
        if (under) m = depth < 2.5 ? th.seabed || M.SUB : M.DEEP;
        this.v[id] = m;
      }
    }
    // túneles y cuevas
    const tunnels = th.tunnels;
    for (let t = 0; t < tunnels; t++) {
      let x = 20 + r() * (NX - 40), z = 20 + r() * (NZ - 40), y = water + 3 + r() * 6;
      let a = r() * Math.PI * 2;
      const len = 30 + r() * 40;
      for (let s = 0; s < len; s += 1.5) {
        a += (r() - 0.5) * 0.5;
        x += Math.cos(a) * 1.5; z += Math.sin(a) * 1.5; y += (r() - 0.5) * 0.8;
        y = Math.max(water + 2, Math.min(water + 12, y));
        this.carve(x * VOX, y * VOX, z * VOX, (2.4 + r() * 1.2) * VOX, false);
      }
    }
    // decoración del tema (también se puede romper)
    th.decorate(this, r, noise);
    this.dirty.clear();
  }

  // utilidades para decorar (coordenadas en vóxeles; formas lisas)
  box(i0, j0, k0, w, h, d, m) {
    const cx = i0 + w / 2, cy = j0 + h / 2, cz = k0 + d / 2;
    const rr = Math.min(0.9, w / 2, h / 2, d / 2);
    const hx = w / 2 - rr, hy = h / 2 - rr, hz = d / 2 - rr;
    for (let j = Math.floor(j0 - 2); j <= j0 + h + 2; j++) for (let k = Math.floor(k0 - 2); k <= k0 + d + 2; k++) for (let i = Math.floor(i0 - 2); i <= i0 + w + 2; i++) {
      const qx = Math.abs(i + 0.5 - cx) - hx, qy = Math.abs(j + 0.5 - cy) - hy, qz = Math.abs(k + 0.5 - cz) - hz;
      const out = Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0);
      this.shape(i, j, k, rr - out, typeof m === 'function' ? m(i, j, k) : m);
    }
  }
  sphere(ci, cj, ck, rad, m, sq = 1) {
    const ry = rad * sq;
    for (let j = Math.floor(cj - ry - 2); j <= cj + ry + 2; j++)
      for (let k = Math.floor(ck - rad - 2); k <= ck + rad + 2; k++)
        for (let i = Math.floor(ci - rad - 2); i <= ci + rad + 2; i++) {
          const dy = (j + 0.5 - cj) / sq;
          const dist = Math.sqrt((i + 0.5 - ci) ** 2 + dy * dy + (k + 0.5 - ck) ** 2);
          this.shape(i, j, k, rad - dist, typeof m === 'function' ? m(i, j, k) : m);
        }
  }
  cylinder(ci, j0, ck, rad, h, m) {
    for (let j = Math.floor(j0 - 2); j <= j0 + h + 2; j++) for (let k = Math.floor(ck - rad - 2); k <= ck + rad + 2; k++) for (let i = Math.floor(ci - rad - 2); i <= ci + rad + 2; i++) {
      const radial = rad - Math.hypot(i + 0.5 - ci, k + 0.5 - ck);
      const vert = Math.min(j + 0.5 - j0, j0 + h - (j + 0.5));
      this.shape(i, j, k, Math.min(radial, vert), typeof m === 'function' ? m(i, j, k) : m);
    }
  }
  topAt(i, k) {
    if (i < 0 || k < 0 || i >= NX || k >= NZ) return 0;
    for (let j = NY - 1; j >= 0; j--) if (this.d[(j * NZ + k) * NX + i] >= ISO) return j + 1;
    return 0;
  }

  // puntos de aparición sobre tierra firme, separados entre sí
  spawnPoints(n, seed = 1) {
    const r = rng(this.seed ^ seed);
    const out = [];
    const water = this.theme.waterVox;
    let minD = 9;
    for (let tries = 0; out.length < n && tries < 6000; tries++) {
      if (tries > 0 && tries % 1500 === 0) minD *= 0.75;
      const i = 8 + Math.floor(r() * (NX - 16)), k = 8 + Math.floor(r() * (NZ - 16));
      const j = this.topAt(i, k);
      if (j <= water + 1 || j >= NY - 5) continue;
      // suelo plano y espacio libre arriba
      let ok = true;
      for (const [di, dk] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (Math.abs(this.topAt(i + di, k + dk) - j) > 1) ok = false;
      for (let h = 0; h < 4 && ok; h++) if (this.get(i, j + h, k) !== AIR) ok = false;
      if (!ok) continue;
      const x = (i + 0.5) * VOX, z = (k + 0.5) * VOX;
      if (out.some((p) => Math.hypot(p.x - x, p.z - z) < minD)) continue;
      out.push({ x, y: j * VOX, z });
    }
    return out;
  }
}
