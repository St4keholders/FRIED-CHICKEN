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

export class Terrain {
  constructor(seed, islandId) {
    this.seed = seed >>> 0;
    this.islandId = islandId;
    this.theme = islandTheme(islandId);
    this.v = new Uint8Array(NX * NY * NZ);
    this.edits = []; // historial de cambios para sincronizar celulares
    this.dirty = new Set();
    this.generate();
  }

  idx(i, j, k) { return (j * NZ + k) * NX + i; }
  get(i, j, k) {
    if (i < 0 || j < 0 || k < 0 || i >= NX || j >= NY || k >= NZ) return AIR;
    return this.v[(j * NZ + k) * NX + i];
  }
  set(i, j, k, m) {
    if (i < 0 || j < 0 || k < 0 || i >= NX || j >= NY || k >= NZ) return;
    this.v[(j * NZ + k) * NX + i] = m;
  }
  // consulta en coordenadas del mundo
  solid(x, y, z) {
    const i = Math.floor(x / VOX), j = Math.floor(y / VOX), k = Math.floor(z / VOX);
    if (i < 0 || j < 0 || k < 0 || i >= NX || j >= NY || k >= NZ) return false;
    return this.v[(j * NZ + k) * NX + i] !== AIR;
  }
  // altura del suelo más alto en (x, z) en unidades del mundo (0 si no hay)
  surfaceY(x, z) {
    const i = Math.floor(x / VOX), k = Math.floor(z / VOX);
    if (i < 0 || k < 0 || i >= NX || k >= NZ) return 0;
    for (let j = NY - 1; j >= 0; j--) if (this.v[(j * NZ + k) * NX + i] !== AIR) return (j + 1) * VOX;
    return 0;
  }

  markDirtyBox(i0, j0, k0, i1, j1, k1) {
    const c0 = [Math.floor((i0 - 1) / CHUNK), Math.floor((j0 - 1) / CHUNK), Math.floor((k0 - 1) / CHUNK)];
    const c1 = [Math.floor((i1 + 1) / CHUNK), Math.floor((j1 + 1) / CHUNK), Math.floor((k1 + 1) / CHUNK)];
    for (let cx = Math.max(0, c0[0]); cx <= Math.min(NX / CHUNK - 1, c1[0]); cx++)
      for (let cy = Math.max(0, c0[1]); cy <= Math.min(NY / CHUNK - 1, c1[1]); cy++)
        for (let cz = Math.max(0, c0[2]); cz <= Math.min(NZ / CHUNK - 1, c1[2]); cz++) this.dirty.add(`${cx},${cy},${cz}`);
  }

  // explosión: quita una esfera de vóxeles (el metal no se rompe)
  carve(x, y, z, r, record = true) {
    const ci = x / VOX, cj = y / VOX, ck = z / VOX, rv = r / VOX;
    const i0 = Math.floor(ci - rv), i1 = Math.ceil(ci + rv);
    const j0 = Math.floor(cj - rv), j1 = Math.ceil(cj + rv);
    const k0 = Math.floor(ck - rv), k1 = Math.ceil(ck + rv);
    const r2 = rv * rv;
    let n = 0;
    for (let j = Math.max(0, j0); j <= Math.min(NY - 1, j1); j++)
      for (let k = Math.max(0, k0); k <= Math.min(NZ - 1, k1); k++)
        for (let i = Math.max(0, i0); i <= Math.min(NX - 1, i1); i++) {
          const dx = i + 0.5 - ci, dy = j + 0.5 - cj, dz = k + 0.5 - ck;
          const d2 = dx * dx + dy * dy + dz * dz;
          const id = (j * NZ + k) * NX + i;
          const m = this.v[id];
          if (m === AIR || m === M.METAL) continue;
          if (d2 <= r2) { this.v[id] = AIR; n++; }
          else if (d2 <= (rv + 1.2) * (rv + 1.2) && m === M.TOP) this.v[id] = M.SUB; // borde quemado
        }
    this.markDirtyBox(i0, j0, k0, i1, j1, k1);
    if (record) this.edits.push({ k: 'c', x: +x.toFixed(2), y: +y.toFixed(2), z: +z.toFixed(2), r: +r.toFixed(2) });
    return n;
  }

  // viga de juguete: una fila de bloques
  beam(x, y, z, yaw, len = 6, record = true) {
    const dx = Math.sin(yaw), dz = Math.cos(yaw);
    const cells = [];
    for (let s = 0; s <= len; s += VOX * 0.5) {
      for (const w of [-0.5, 0, 0.5]) {
        const px = x + dx * s + dz * w * VOX * 2, pz = z + dz * s - dx * w * VOX * 2;
        const i = Math.floor(px / VOX), j = Math.floor(y / VOX), k = Math.floor(pz / VOX);
        if (this.get(i, j, k) === AIR) { this.set(i, j, k, M.BEAM); cells.push([i, j, k]); }
      }
    }
    for (const [i, j, k] of cells) this.markDirtyBox(i, j, k, i, j, k);
    if (record) this.edits.push({ k: 'b', x: +x.toFixed(2), y: +y.toFixed(2), z: +z.toFixed(2), yaw: +yaw.toFixed(3), len });
    return cells.length;
  }

  applyEdit(e) {
    if (e.k === 'c') this.carve(e.x, e.y, e.z, e.r, false);
    else if (e.k === 'b') this.beam(e.x, e.y, e.z, e.yaw, e.len, false);
    this.edits.push(e);
  }

  // resumen del terreno para comprobar que todos tienen el mismo
  hash() {
    let h = 2166136261;
    for (let i = 0; i < this.v.length; i += 7) { h ^= this.v[i]; h = Math.imul(h, 16777619); }
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
        if (th.terraces) h = Math.round(h / th.terraces) * th.terraces;
      }
      heights[k * NX + i] = Math.max(1, Math.min(NY - 6, h));
    }
    for (let k = 0; k < NZ; k++) for (let i = 0; i < NX; i++) {
      const h = Math.floor(heights[k * NX + i]);
      for (let j = 0; j < h; j++) {
        let m = M.DEEP;
        if (j >= h - 1) m = M.TOP;
        else if (j >= h - 4) m = M.SUB;
        if (h <= water) m = j >= h - 2 ? th.seabed || M.SUB : M.DEEP;
        this.v[(j * NZ + k) * NX + i] = m;
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
        this.carve(x * VOX, y * VOX, z * VOX, (2.2 + r() * 1.2) * VOX, false);
      }
    }
    // decoración del tema (también se puede romper)
    th.decorate(this, r, noise);
    this.dirty.clear();
  }

  // utilidades para decorar
  box(i0, j0, k0, w, h, d, m) {
    for (let j = j0; j < j0 + h; j++) for (let k = k0; k < k0 + d; k++) for (let i = i0; i < i0 + w; i++) this.set(i, j, k, m);
  }
  sphere(ci, cj, ck, rad, m, sq = 1) {
    for (let j = Math.floor(cj - rad); j <= cj + rad; j++)
      for (let k = Math.floor(ck - rad); k <= ck + rad; k++)
        for (let i = Math.floor(ci - rad); i <= ci + rad; i++) {
          const dy = (j + 0.5 - cj) / sq;
          if ((i + 0.5 - ci) ** 2 + dy * dy + (k + 0.5 - ck) ** 2 <= rad * rad) this.set(i, j, k, typeof m === 'function' ? m(i, j, k) : m);
        }
  }
  cylinder(ci, j0, ck, rad, h, m) {
    for (let j = j0; j < j0 + h; j++) for (let k = Math.floor(ck - rad); k <= ck + rad; k++) for (let i = Math.floor(ci - rad); i <= ci + rad; i++)
      if ((i + 0.5 - ci) ** 2 + (k + 0.5 - ck) ** 2 <= rad * rad) this.set(i, j, k, typeof m === 'function' ? m(i, j, k) : m);
  }
  topAt(i, k) { for (let j = NY - 1; j >= 0; j--) if (this.get(i, j, k) !== AIR) return j + 1; return 0; }

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
