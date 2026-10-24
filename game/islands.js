// Temas de las islas: colores, forma del terreno y decoración de juguete en vóxeles
import { NX, NZ, NY, M } from './constants.js';

const AIR = 0;

// columnas de tierra libres para poner decoración
function spots(t, r, n, minD = 14, edge = 12) {
  const out = [];
  const water = t.theme.waterVox;
  for (let tries = 0; out.length < n && tries < 3000; tries++) {
    const i = edge + Math.floor(r() * (NX - edge * 2)), k = edge + Math.floor(r() * (NZ - edge * 2));
    const j = t.topAt(i, k);
    if (j <= water + 2 || j > NY - 14) continue;
    if (out.some((p) => Math.hypot(p.i - i, p.k - k) < minD)) continue;
    out.push({ i, j, k });
  }
  return out;
}

function tree(t, i, j, k, r, leaf = M.D, trunk = M.C) {
  const h = 5 + Math.floor(r() * 4);
  t.box(i, j, k, 2, h, 2, trunk);
  t.sphere(i + 1, j + h + 1.5, k + 1, 3.2 + r() * 1.2, leaf, 0.85);
}

export const THEMES = {
  arenero: {
    name: 'Arenero del Patio',
    palette: { 1: '#f6d68c', 2: '#e3b768', 3: '#b98b4a', 4: '#8e9aa6', 5: '#ff5a5f', 6: '#3d8bfd', 7: '#ffd23f', 8: '#43c96b', 9: '#fff8e8', 10: '#4a3020', 11: '#ff9f43', 12: '#c97c3c' },
    sky: ['#58b9ff', '#cfeeff'], water: '#2ec4d6', fog: '#bfe6ff',
    waterVox: 7, maxH: 15, hill: 9, curve: 0.7, terraces: 0, blobs: [1, 3], tunnels: 2, song: 1,
    decorate(t, r) {
      for (const s of spots(t, r, 3, 22)) { // balde
        t.cylinder(s.i, s.j, s.k, 4.5, 7, (i, j, k) => ((i - s.i) ** 2 + (k - s.k) ** 2 > 3.2 * 3.2 || j === s.j ? M.A : AIR));
        t.box(s.i - 5, s.j + 7, s.k, 1, 2, 1, M.C); t.box(s.i + 4, s.j + 7, s.k, 1, 2, 1, M.C); t.box(s.i - 5, s.j + 9, s.k, 10, 1, 1, M.C);
      }
      for (const s of spots(t, r, 3, 18)) { // castillo de arena
        t.box(s.i - 4, s.j, s.k - 4, 9, 4, 9, M.SUB);
        for (const [a, b] of [[-4, -4], [3, -4], [-4, 3], [3, 3]]) { t.cylinder(s.i + a + 0.5, s.j, s.k + b + 0.5, 1.8, 8, M.SUB); t.box(s.i + a, s.j + 8, s.k + b, 1, 1, 1, M.A); }
      }
      for (const s of spots(t, r, 2, 18)) { // pala
        t.box(s.i, s.j, s.k, 1, 9, 1, M.B); t.box(s.i - 1, s.j + 9, s.k - 2, 3, 1, 5, M.B);
      }
      for (const s of spots(t, r, 4, 12)) t.cylinder(s.i, s.j - 1, s.k, 3.5, 2, M.E); // montículos de arena blanda (amortiguan caídas)
    },
  },
  banera: {
    name: 'Bañera Espumosa',
    palette: { 1: '#eaf6ff', 2: '#bfdcf3', 3: '#91b5d6', 4: '#a7b3bf', 5: '#ffd400', 6: '#ff8c1a', 7: '#ff9ad5', 8: '#7fd7ff', 9: '#ffffff', 10: '#22313f', 11: '#b6f0c9', 12: '#ffb84d' },
    sky: ['#ff9ec7', '#ffe3f1'], water: '#5fd1ff', fog: '#ffd9ec', seabed: M.SUB,
    waterVox: 8, maxH: 12, hill: 6, curve: 0.6, terraces: 2, blobs: [2, 4], tunnels: 1, song: 2,
    decorate(t, r) {
      for (const s of spots(t, r, 3, 22)) { // patito de goma gigante
        t.sphere(s.i, s.j + 4, s.k, 5, M.A, 0.8);
        t.sphere(s.i + 3, s.j + 9, s.k, 3.2, M.A);
        t.box(s.i + 5, s.j + 8, s.k - 1, 3, 2, 3, M.B);
        t.box(s.i + 4, s.j + 10, s.k - 2, 1, 1, 1, M.DARK); t.box(s.i + 4, s.j + 10, s.k + 2, 1, 1, 1, M.DARK);
      }
      for (const s of spots(t, r, 4, 14)) t.box(s.i - 3, s.j, s.k - 2, 7, 3, 5, M.C); // jabón
      for (const s of spots(t, r, 6, 10)) t.sphere(s.i, s.j + 1, s.k, 2 + r() * 2, M.WHITE); // espuma
      for (const s of spots(t, r, 5, 10)) t.cylinder(s.i, s.j - 1, s.k, 3.5, 2, M.WHITE); // alfombras de espuma que frenan
    },
  },
  cocina: {
    name: 'Cocina Gigante',
    palette: { 1: '#ff8fc7', 2: '#f7d9a0', 3: '#6b3e26', 4: '#c9d1d9', 5: '#e3172b', 6: '#3ccf6e', 7: '#ffd23f', 8: '#8a5a33', 9: '#fff6e6', 10: '#2b1a10', 11: '#5aa9ff', 12: '#d9a066' },
    sky: ['#ffcf7a', '#fff1d6'], water: '#c9905a', fog: '#ffe7c2',
    waterVox: 7, maxH: 14, hill: 7, curve: 0.8, terraces: 3, blobs: [1, 2], tunnels: 3, song: 3,
    decorate(t, r) {
      for (const s of spots(t, r, 4, 14)) { t.sphere(s.i, s.j + 2.5, s.k, 2.6, M.A); t.box(s.i, s.j + 5, s.k, 1, 3, 1, M.B); } // cerezas
      for (const s of spots(t, r, 3, 16)) { // galletas
        t.cylinder(s.i, s.j, s.k, 4, 2, (i, j, k) => ((i * 7 + k * 13) % 9 === 0 ? M.DARK : M.D));
      }
      const sp = spots(t, r, 1, 10, 20)[0]; // cuchara de metal (no se rompe)
      if (sp) { t.box(sp.i - 8, sp.j, sp.k, 12, 1, 1, M.METAL); t.sphere(sp.i + 6, sp.j + 0.5, sp.k + 0.5, 2.5, M.METAL, 0.5); }
      for (const s of spots(t, r, 4, 14)) { // imanes de nevera (metal que no se rompe)
        t.box(s.i - 2, s.j, s.k - 1, 2, 5, 2, M.METAL);
        t.box(s.i + 1, s.j, s.k - 1, 2, 5, 2, M.METAL);
        t.box(s.i - 2, s.j + 4, s.k - 1, 5, 2, 2, M.METAL);
      }
      for (const s of spots(t, r, 2, 18)) { // taza
        t.cylinder(s.i, s.j, s.k, 4, 7, (i, j, k) => ((i - s.i) ** 2 + (k - s.k) ** 2 > 2.8 * 2.8 || j === s.j ? M.E : AIR));
      }
    },
  },
  juguetes: {
    name: 'Cuarto de Juguetes',
    palette: { 1: '#5b7cfa', 2: '#c98b55', 3: '#8a5a33', 4: '#9aa7b4', 5: '#ff4757', 6: '#ffd23f', 7: '#2ecc71', 8: '#1e90ff', 9: '#ffffff', 10: '#2d2d3a', 11: '#ff9f1a', 12: '#e8a33d' },
    sky: ['#7b6cff', '#d6d1ff'], water: '#3ab0ff', fog: '#d3cdff',
    waterVox: 7, maxH: 13, hill: 6, curve: 0.65, terraces: 4, blobs: [2, 3], tunnels: 2, song: 4,
    decorate(t, r) {
      const cols = [M.A, M.B, M.D, M.E];
      for (const s of spots(t, r, 5, 12)) { // bloques apilados
        let j = s.j;
        const n = 1 + Math.floor(r() * 3);
        for (let b = 0; b < n; b++) { const o = Math.floor(r() * 3) - 1; t.box(s.i - 2 + o, j, s.k - 2 + o, 5, 5, 5, cols[Math.floor(r() * cols.length)]); j += 5; }
      }
      for (const s of spots(t, r, 5, 11)) { // bloques de gelatina verde (M.C) que hacen rebotar
        t.box(s.i - 3, s.j - 1, s.k - 3, 6, 3, 6, M.C);
      }
      for (const s of spots(t, r, 2, 18)) t.sphere(s.i, s.j + 4, s.k, 4.5, (i, j) => (j < s.j + 4 ? M.A : M.WHITE)); // pelota
      for (const s of spots(t, r, 3, 14)) { const c = cols[Math.floor(r() * cols.length)]; t.box(s.i, s.j, s.k - 5, 2, 2, 10, c); t.box(s.i, s.j, s.k + 5, 2, 2, 1, M.WHITE); } // crayón
    },
  },
  billar: {
    name: 'Mesa de Billar',
    palette: { 1: '#1fa45a', 2: '#7a4a24', 3: '#4d2e14', 4: '#b8c2cc', 5: '#ffd23f', 6: '#2f6bff', 7: '#e3172b', 8: '#7b2fbe', 9: '#ffffff', 10: '#111111', 11: '#ff8c1a', 12: '#c08040' },
    sky: ['#2d3561', '#7c83c4'], water: '#2a8fbd', fog: '#5d659e',
    waterVox: 7, maxH: 9, hill: 4, curve: 0.5, terraces: 0, blobs: [1, 2], tunnels: 1, song: 5,
    decorate(t, r) {
      const balls = [M.A, M.B, M.C, M.D, M.E, M.DARK, M.WHITE];
      for (const s of spots(t, r, 7, 12)) {
        const c = balls[Math.floor(r() * balls.length)];
        t.sphere(s.i, s.j + 3, s.k, 3.2, (i, j) => (Math.abs(j - (s.j + 3)) < 0.8 && c !== M.WHITE ? M.WHITE : c));
      }
      const sp = spots(t, r, 1, 10, 24)[0]; // taco
      if (sp) for (let d = -14; d < 14; d++) t.box(sp.i + d, sp.j + Math.floor((d + 14) / 9), sp.k, 1, 1, 1, d > 10 ? M.WHITE : M.D);
      for (const s of spots(t, r, 2, 16)) t.box(s.i - 1, s.j, s.k - 1, 3, 3, 3, M.B); // tiza
    },
  },
  castillo: {
    name: 'Castillo del Zorro',
    palette: { 1: '#4caf50', 2: '#9e9e9e', 3: '#6d6d6d', 4: '#7d8a96', 5: '#c0392b', 6: '#ff7a1a', 7: '#8d5a2b', 8: '#2e8b3e', 9: '#f5f5f5', 10: '#2b2b2b', 11: '#ffd23f', 12: '#a0703c' },
    sky: ['#ff8a5c', '#ffd7a8'], water: '#3a7fb8', fog: '#ffc79a',
    waterVox: 7, maxH: 17, hill: 8, curve: 0.75, terraces: 0, blobs: [1, 3], tunnels: 2, song: 6,
    decorate(t, r) {
      for (const s of spots(t, r, 3, 22)) { // torres
        const h = 10 + Math.floor(r() * 6);
        t.cylinder(s.i, s.j, s.k, 3.5, h, M.SUB);
        for (let a = 0; a < 8; a += 2) t.box(Math.round(s.i + Math.cos(a * Math.PI / 4) * 3) - 1, s.j + h, Math.round(s.k + Math.sin(a * Math.PI / 4) * 3) - 1, 2, 2, 2, M.SUB);
        for (let y = 0; y < 5; y++) t.cylinder(s.i, s.j + h + 2 + y, s.k, 3.5 - y * 0.7, 1, M.A);
        t.box(s.i, s.j + h + 7, s.k, 1, 3, 1, M.C); t.box(s.i + 1, s.j + h + 9, s.k, 2, 1, 1, M.B);
      }
      for (const s of spots(t, r, 5, 12)) tree(t, s.i, s.j, s.k, r);
      for (const s of spots(t, r, 3, 14)) t.box(s.i - 2, s.j, s.k - 1, 5, 4, 2, M.METAL); // escudos de hierro
    },
  },
};

export const ISLAND_IDS = Object.keys(THEMES);
export function islandTheme(id) { return THEMES[id] || THEMES.arenero; }
