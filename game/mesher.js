// Mallas del terreno por bloques de 16³, con sombreado de esquinas (oclusión ambiental)
import * as THREE from 'three';
import { NX, NY, NZ, VOX, CHUNK } from './constants.js';

// caras: dirección, 4 esquinas y los dos ejes tangentes para la oclusión
const FACES = [
  { n: [1, 0, 0], c: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]], u: [0, 0, 1], v: [0, 1, 0] },
  { n: [-1, 0, 0], c: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]], u: [0, 0, 1], v: [0, 1, 0] },
  { n: [0, 1, 0], c: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], u: [1, 0, 0], v: [0, 0, 1] },
  { n: [0, -1, 0], c: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], u: [1, 0, 0], v: [0, 0, 1] },
  { n: [0, 0, 1], c: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], u: [1, 0, 0], v: [0, 1, 0] },
  { n: [0, 0, -1], c: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]], u: [1, 0, 0], v: [0, 1, 0] },
];
const AO = [0.52, 0.7, 0.86, 1];

function hexRGB(h) {
  const n = parseInt(h.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export class TerrainMesh {
  constructor(terrain, scene) {
    this.t = terrain;
    this.scene = scene;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.mat = new THREE.MeshLambertMaterial({ vertexColors: true });
    this.meshes = new Map();
    const pal = terrain.theme.palette;
    this.cols = [];
    for (let m = 0; m < 16; m++) this.cols[m] = hexRGB(pal[m] || '#ff00ff');
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
    const pos = [], nor = [], col = [], ind = [];
    const i0 = cx * CHUNK, j0 = cy * CHUNK, k0 = cz * CHUNK;
    const solid = (i, j, k) => (t.get(i, j, k) !== 0 ? 1 : 0);
    for (let j = j0; j < j0 + CHUNK; j++) for (let k = k0; k < k0 + CHUNK; k++) for (let i = i0; i < i0 + CHUNK; i++) {
      const m = t.get(i, j, k);
      if (!m) continue;
      const base = this.cols[m];
      // variación suave por vóxel para que se vea de juguete y no plano
      const h = ((i * 73856093) ^ (j * 19349663) ^ (k * 83492791)) >>> 0;
      const jit = 0.93 + ((h % 1000) / 1000) * 0.1;
      const check = ((i >> 1) + (k >> 1) + (j >> 1)) & 1 ? 1 : 0.965;
      for (const f of FACES) {
        const ni = i + f.n[0], nj = j + f.n[1], nk = k + f.n[2];
        if (solid(ni, nj, nk)) continue;
        if (f.n[1] === -1 && j === 0) continue;
        const start = pos.length / 3;
        const ao = [];
        for (const c of f.c) {
          pos.push((i + c[0]) * VOX, (j + c[1]) * VOX, (k + c[2]) * VOX);
          nor.push(f.n[0], f.n[1], f.n[2]);
          // oclusión: mirar los 3 vecinos de la esquina del lado de la cara
          const su = c[0] * f.u[0] + c[1] * f.u[1] + c[2] * f.u[2] ? 1 : -1;
          const sv = c[0] * f.v[0] + c[1] * f.v[1] + c[2] * f.v[2] ? 1 : -1;
          const a = solid(ni + f.u[0] * su, nj + f.u[1] * su, nk + f.u[2] * su);
          const b = solid(ni + f.v[0] * sv, nj + f.v[1] * sv, nk + f.v[2] * sv);
          const cc = solid(ni + f.u[0] * su + f.v[0] * sv, nj + f.u[1] * su + f.v[1] * sv, nk + f.u[2] * su + f.v[2] * sv);
          const lvl = a && b ? 0 : 3 - a - b - cc;
          ao.push(lvl);
          const s = AO[lvl] * jit * check * (f.n[1] === 1 ? 1.06 : 1);
          col.push(base[0] * s, base[1] * s, base[2] * s);
        }
        // girar el cuadro para que la oclusión no se vea torcida
        if (ao[0] + ao[2] < ao[1] + ao[3]) ind.push(start + 1, start + 2, start + 3, start + 1, start + 3, start);
        else ind.push(start, start + 1, start + 2, start, start + 2, start + 3);
      }
    }
    const old = this.meshes.get(key);
    if (old) { this.group.remove(old); old.geometry.dispose(); this.meshes.delete(key); }
    if (!pos.length) return;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(ind);
    g.computeBoundingSphere();
    const mesh = new THREE.Mesh(g, this.mat);
    mesh.matrixAutoUpdate = false;
    this.group.add(mesh);
    this.meshes.set(key, mesh);
  }

  dispose() {
    for (const m of this.meshes.values()) m.geometry.dispose();
    this.scene.remove(this.group);
    this.mat.dispose();
  }
}
