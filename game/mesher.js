// Malla lisa del terreno ("Surface Nets") por bloques de 16³, con normales suaves y colores
// que cambian con la pendiente: pasto arriba y tierra o roca en los barrancos.
import * as THREE from 'three';
import { NX, NY, NZ, VOX, CHUNK, M } from './constants.js';

const ISO = 128;
const R = CHUNK + 1;
const AO_DIRS = [[0, 0, 0], [1.2, 0.6, 0], [-1.2, 0.6, 0], [0, 0.6, 1.2], [0, 0.6, -1.2], [0, 1.6, 0]];
// las 12 aristas de un cubo (índices de esquina 0..7; bit0 = x, bit1 = y, bit2 = z)
const EDGES = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];

function hexRGB(h) {
  const n = parseInt(h.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export class TerrainMesh {
  constructor(terrain, scene, opts = {}) {
    this.t = terrain;
    this.scene = scene;
    this.shadows = !!opts.shadows;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.mat = new THREE.MeshLambertMaterial({ vertexColors: true });
    this.meshes = new Map();
    const pal = terrain.theme.palette;
    this.cols = [];
    for (let m = 0; m < 16; m++) this.cols[m] = hexRGB(pal[m] || '#ff00ff');
    this.verts = new Int32Array(R * R * R);
    for (let cx = 0; cx < NX / CHUNK; cx++) for (let cy = 0; cy < NY / CHUNK; cy++) for (let cz = 0; cz < NZ / CHUNK; cz++) this.build(cx, cy, cz);
    terrain.dirty.clear();
  }

  update(maxPerFrame = 12) {
    let n = 0;
    for (const key of this.t.dirty) {
      const [cx, cy, cz] = key.split(',').map(Number);
      this.build(cx, cy, cz);
      this.t.dirty.delete(key);
      if (++n >= maxPerFrame) break;
    }
  }

  build(cx, cy, cz) {
    const key = `${cx},${cy},${cz}`;
    const t = this.t;
    const i0 = cx * CHUNK, j0 = cy * CHUNK, k0 = cz * CHUNK;
    const pos = [], nor = [], col = [], ind = [];
    const verts = this.verts;
    verts.fill(-1);
    const d = new Float32Array(8);
    const cols = this.cols;
    const top = cols[M.TOP], sub = cols[M.SUB], deep = cols[M.DEEP];
    // vértices: una por celda que cruza la superficie (celdas de -1 a CHUNK-1)
    for (let cj = -1; cj < CHUNK; cj++) for (let ck = -1; ck < CHUNK; ck++) for (let ci = -1; ci < CHUNK; ci++) {
      const i = i0 + ci, j = j0 + cj, k = k0 + ck;
      let mask = 0, minD = 999, maxC = 0;
      for (let c = 0; c < 8; c++) {
        const v = t.dens(i + (c & 1), j + ((c >> 1) & 1), k + ((c >> 2) & 1));
        d[c] = v;
        // el material lo pone la esquina maciza más cercana a la superficie
        if (v >= ISO) { mask |= 1 << c; if (v < minD) { minD = v; maxC = c; } }
      }
      if (mask === 0 || mask === 255) continue;
      let sx = 0, sy = 0, sz = 0, n = 0;
      for (const [a, b] of EDGES) {
        const ia = (mask >> a) & 1, ib = (mask >> b) & 1;
        if (ia === ib) continue;
        const tt = (ISO - d[a]) / (d[b] - d[a]);
        sx += (a & 1) + (((b & 1) - (a & 1)) * tt);
        sy += ((a >> 1) & 1) + ((((b >> 1) & 1) - ((a >> 1) & 1)) * tt);
        sz += ((a >> 2) & 1) + ((((b >> 2) & 1) - ((a >> 2) & 1)) * tt);
        n++;
      }
      sx /= n; sy /= n; sz /= n;
      const x = (i + 0.5 + sx) * VOX, y = (j + 0.5 + sy) * VOX, z = (k + 0.5 + sz) * VOX;
      // normal = hacia donde baja la densidad
      let gx = (d[1] + d[3] + d[5] + d[7]) - (d[0] + d[2] + d[4] + d[6]);
      let gy = (d[2] + d[3] + d[6] + d[7]) - (d[0] + d[1] + d[4] + d[5]);
      let gz = (d[4] + d[5] + d[6] + d[7]) - (d[0] + d[1] + d[2] + d[3]);
      const gl = Math.hypot(gx, gy, gz) || 1;
      gx = -gx / gl; gy = -gy / gl; gz = -gz / gl;
      // color: material de la esquina más maciza, y la pendiente cambia pasto por tierra
      const m = t.v[((j + ((maxC >> 1) & 1)) * NZ + (k + ((maxC >> 2) & 1))) * NX + (i + (maxC & 1))] || M.SUB;
      let r, g, b;
      if (m === M.TOP || m === M.SUB || m === M.DEEP) {
        const base = m === M.DEEP ? deep : sub;
        const w = m === M.TOP ? Math.max(0, Math.min(1, (gy - 0.45) / 0.3)) : 0;
        r = base[0] + (top[0] - base[0]) * w; g = base[1] + (top[1] - base[1]) * w; b = base[2] + (top[2] - base[2]) * w;
      } else { const c = cols[m]; r = c[0]; g = c[1]; b = c[2]; }
      // manchitas suaves para que no se vea plano
      const nz = Math.sin(x * 0.9 + z * 0.35) * Math.cos(z * 0.8 - x * 0.2) * 0.03 + Math.sin(x * 2.7 + y * 1.3 + z * 2.1) * 0.012;
      // sombreado en rincones: qué tan lleno está alrededor, hacia afuera de la superficie
      const fi = i + 0.5 + sx, fj = j + 0.5 + sy, fk = k + 0.5 + sz;
      let occ = 0;
      for (const [ox, oy, oz] of AO_DIRS) {
        const px = fi + (gx * 1.6 + ox) - 0.5, py = fj + (gy * 1.6 + oy) - 0.5, pz = fk + (gz * 1.6 + oz) - 0.5;
        occ += t.dens(Math.round(px), Math.round(py), Math.round(pz));
      }
      occ = occ / (AO_DIRS.length * 255);
      const sh = (0.99 + nz) * (1 - Math.min(0.6, occ * 1.15));
      verts[((cj + 1) * R + (ck + 1)) * R + (ci + 1)] = pos.length / 3;
      pos.push(x, y, z);
      nor.push(gx, gy, gz);
      col.push(r * sh, g * sh, b * sh);
    }
    const V = (ci, cj, ck) => (ci < -1 || cj < -1 || ck < -1 ? -1 : verts[((cj + 1) * R + (ck + 1)) * R + (ci + 1)]);
    const quad = (a, b, c, e, flip) => {
      if (a < 0 || b < 0 || c < 0 || e < 0) return;
      if (flip) ind.push(a, e, c, a, c, b);
      else ind.push(a, b, c, a, c, e);
    };
    // caras: una por cada arista entre muestras que cruza la superficie
    for (let cj = 0; cj < CHUNK; cj++) for (let ck = 0; ck < CHUNK; ck++) for (let ci = 0; ci < CHUNK; ci++) {
      const i = i0 + ci, j = j0 + cj, k = k0 + ck;
      const s0 = t.dens(i, j, k) >= ISO;
      if (s0 !== (t.dens(i + 1, j, k) >= ISO)) quad(V(ci, cj - 1, ck - 1), V(ci, cj, ck - 1), V(ci, cj, ck), V(ci, cj - 1, ck), !s0);
      if (s0 !== (t.dens(i, j + 1, k) >= ISO)) quad(V(ci - 1, cj, ck - 1), V(ci - 1, cj, ck), V(ci, cj, ck), V(ci, cj, ck - 1), !s0);
      if (s0 !== (t.dens(i, j, k + 1) >= ISO)) quad(V(ci - 1, cj - 1, ck), V(ci, cj - 1, ck), V(ci, cj, ck), V(ci - 1, cj, ck), !s0);
    }
    const old = this.meshes.get(key);
    if (old) { this.group.remove(old); old.geometry.dispose(); this.meshes.delete(key); }
    if (!ind.length) return;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(ind);
    g.computeBoundingSphere();
    const mesh = new THREE.Mesh(g, this.mat);
    mesh.matrixAutoUpdate = false;
    mesh.castShadow = this.shadows;
    mesh.receiveShadow = this.shadows;
    this.group.add(mesh);
    this.meshes.set(key, mesh);
  }

  dispose() {
    for (const m of this.meshes.values()) m.geometry.dispose();
    this.scene.remove(this.group);
    this.mat.dispose();
  }
}
