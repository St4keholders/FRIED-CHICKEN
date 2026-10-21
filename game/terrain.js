// game/terrain.js - Voxel terrain grid, procedural seed generation, and sphere carving

export const CHUNK_SIZE = 16;
export const MAP_CHUNKS_X = 6; // 96 voxels
export const MAP_CHUNKS_Y = 2; // 32 voxels
export const MAP_CHUNKS_Z = 6; // 96 voxels

export const MAP_X = MAP_CHUNKS_X * CHUNK_SIZE; // 96
export const MAP_Y = MAP_CHUNKS_Y * CHUNK_SIZE; // 32
export const MAP_Z = MAP_CHUNKS_Z * CHUNK_SIZE; // 96

export const BLOCK_AIR = 0;
export const BLOCK_SURFACE = 1;
export const BLOCK_SUBSURFACE = 2;
export const BLOCK_ROCK = 3;
export const BLOCK_INDESTRUCTIBLE = 4;
export const BLOCK_GELATIN = 5;

// Simple seeded PRNG (Mulberry32)
export function createPRNG(seed) {
  let s = (seed ? (typeof seed === 'string' ? hashString(seed) : seed) : 1337) >>> 0;
  return function () {
    let t = (s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
  }
  return hash;
}

// 2D Perlin-like gradient noise
class SimpleNoise2D {
  constructor(seed) {
    const rng = createPRNG(seed);
    this.perm = new Uint8Array(512);
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = p[i];
      p[i] = p[j];
      p[j] = tmp;
    }
    for (let i = 0; i < 512; i++) {
      this.perm[i] = p[i & 255];
    }
  }

  noise(x, y) {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);

    const u = this.fade(xf);
    const v = this.fade(yf);

    const aa = this.perm[this.perm[X] + Y];
    const ab = this.perm[this.perm[X] + Y + 1];
    const ba = this.perm[this.perm[X + 1] + Y];
    const bb = this.perm[this.perm[X + 1] + Y + 1];

    const x1 = this.lerp(this.grad(aa, xf, yf), this.grad(ba, xf - 1, yf), u);
    const x2 = this.lerp(this.grad(ab, xf, yf - 1), this.grad(bb, xf - 1, yf - 1), u);
    return (this.lerp(x1, x2, v) + 1) * 0.5;
  }

  fade(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  lerp(a, b, t) {
    return a + t * (b - a);
  }

  grad(hash, x, y) {
    const h = hash & 7;
    const u = h < 4 ? x : y;
    const v = h < 4 ? y : x;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }
}

export class VoxelTerrain {
  constructor(seed = 12345, islandTheme = null) {
    this.seed = seed;
    this.theme = islandTheme;
    this.chunks = new Map(); // key `${cx},${cy},${cz}` -> Uint8Array(16*16*16)
    this.dirtyChunks = new Set();
    this.carveHistory = []; // list of { seq, x, y, z, r }
    this.carveSequence = 0;
    this.initMap();
  }

  getChunkKey(cx, cy, cz) {
    return `${cx},${cy},${cz}`;
  }

  getChunk(cx, cy, cz, create = false) {
    if (cx < 0 || cx >= MAP_CHUNKS_X || cy < 0 || cy >= MAP_CHUNKS_Y || cz < 0 || cz >= MAP_CHUNKS_Z) {
      return null;
    }
    const key = this.getChunkKey(cx, cy, cz);
    let chunk = this.chunks.get(key);
    if (!chunk && create) {
      chunk = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE * CHUNK_SIZE);
      this.chunks.set(key, chunk);
    }
    return chunk;
  }

  getBlock(x, y, z) {
    if (x < 0 || x >= MAP_X || y < 0 || y >= MAP_Y || z < 0 || z >= MAP_Z) {
      return BLOCK_AIR;
    }
    const cx = (x / CHUNK_SIZE) | 0;
    const cy = (y / CHUNK_SIZE) | 0;
    const cz = (z / CHUNK_SIZE) | 0;
    const chunk = this.getChunk(cx, cy, cz);
    if (!chunk) return BLOCK_AIR;

    const lx = x % CHUNK_SIZE;
    const ly = y % CHUNK_SIZE;
    const lz = z % CHUNK_SIZE;
    return chunk[lx + ly * CHUNK_SIZE + lz * CHUNK_SIZE * CHUNK_SIZE];
  }

  setBlock(x, y, z, type) {
    if (x < 0 || x >= MAP_X || y < 0 || y >= MAP_Y || z < 0 || z >= MAP_Z) {
      return;
    }
    const cx = (x / CHUNK_SIZE) | 0;
    const cy = (y / CHUNK_SIZE) | 0;
    const cz = (z / CHUNK_SIZE) | 0;
    const chunk = this.getChunk(cx, cy, cz, true);

    const lx = x % CHUNK_SIZE;
    const ly = y % CHUNK_SIZE;
    const lz = z % CHUNK_SIZE;
    const idx = lx + ly * CHUNK_SIZE + lz * CHUNK_SIZE * CHUNK_SIZE;

    if (chunk[idx] !== type) {
      chunk[idx] = type;
      this.dirtyChunks.add(this.getChunkKey(cx, cy, cz));

      // If at boundary, mark neighbor chunks dirty as well for meshing
      if (lx === 0 && cx > 0) this.dirtyChunks.add(this.getChunkKey(cx - 1, cy, cz));
      if (lx === CHUNK_SIZE - 1 && cx < MAP_CHUNKS_X - 1) this.dirtyChunks.add(this.getChunkKey(cx + 1, cy, cz));
      if (ly === 0 && cy > 0) this.dirtyChunks.add(this.getChunkKey(cx, cy - 1, cz));
      if (ly === CHUNK_SIZE - 1 && cy < MAP_CHUNKS_Y - 1) this.dirtyChunks.add(this.getChunkKey(cx, cy + 1, cz));
      if (lz === 0 && cz > 0) this.dirtyChunks.add(this.getChunkKey(cx, cy, cz - 1));
      if (lz === CHUNK_SIZE - 1 && cz < MAP_CHUNKS_Z - 1) this.dirtyChunks.add(this.getChunkKey(cx, cy, cz + 1));
    }
  }

  initMap() {
    const noise = new SimpleNoise2D(this.seed);
    const rng = createPRNG(this.seed);
    const centerX = MAP_X / 2;
    const centerZ = MAP_Z / 2;
    const maxRadius = Math.min(MAP_X, MAP_Z) * 0.44;

    for (let x = 0; x < MAP_X; x++) {
      for (let z = 0; z < MAP_Z; z++) {
        const dx = x - centerX;
        const dz = z - centerZ;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const islandFalloff = Math.max(0, 1 - dist / maxRadius);

        if (islandFalloff <= 0) continue;

        // Multi-octave heightmap
        const n1 = noise.noise(x * 0.035, z * 0.035);
        const n2 = noise.noise(x * 0.08, z * 0.08) * 0.4;
        const nCombined = (n1 + n2) / 1.4;

        // Island height profile (water at ~4, max height up to ~22)
        const baseHeight = 5 + nCombined * 18 * Math.pow(islandFalloff, 0.75);
        const height = Math.min(MAP_Y - 2, Math.floor(baseHeight));

        for (let y = 0; y <= height; y++) {
          let blockType = BLOCK_AIR;
          if (y === height) {
            blockType = BLOCK_SURFACE;
          } else if (y >= height - 3) {
            blockType = BLOCK_SUBSURFACE;
          } else {
            blockType = BLOCK_ROCK;
          }

          // Scattered indestructible blocks and gelatin pockets
          const rVal = rng();
          if (rVal < 0.015 && y < height - 1 && y > 3) {
            blockType = BLOCK_INDESTRUCTIBLE;
          } else if (rVal < 0.025 && y === height) {
            blockType = BLOCK_GELATIN;
          }

          this.setBlock(x, y, z, blockType);
        }
      }
    }

    // Add some toy props decor in voxels
    this._addDecorProps(rng);

    // Mark all populated chunks dirty for initial meshing
    for (let cx = 0; cx < MAP_CHUNKS_X; cx++) {
      for (let cy = 0; cy < MAP_CHUNKS_Y; cy++) {
        for (let cz = 0; cz < MAP_CHUNKS_Z; cz++) {
          this.dirtyChunks.add(this.getChunkKey(cx, cy, cz));
        }
      }
    }
  }

  _addDecorProps(rng) {
    const numProps = 4 + Math.floor(rng() * 4);
    for (let i = 0; i < numProps; i++) {
      const px = Math.floor(MAP_X * 0.25 + rng() * MAP_X * 0.5);
      const pz = Math.floor(MAP_Z * 0.25 + rng() * MAP_Z * 0.5);
      const py = this.getHighestSolidY(px, pz);
      if (py > 5 && py < MAP_Y - 8) {
        // Build a toy block tower or arch
        const w = 2 + Math.floor(rng() * 2);
        const h = 3 + Math.floor(rng() * 4);
        for (let bx = 0; bx < w; bx++) {
          for (let bz = 0; bz < w; bz++) {
            for (let by = 0; by < h; by++) {
              if (rng() > 0.1) {
                this.setBlock(px + bx, py + by, pz + bz, BLOCK_SURFACE);
              }
            }
          }
        }
      }
    }
  }

  getHighestSolidY(x, z) {
    for (let y = MAP_Y - 1; y >= 0; y--) {
      if (this.getBlock(x, y, z) !== BLOCK_AIR) {
        return y;
      }
    }
    return 0;
  }

  // Carves a spherical hole in the terrain
  carve(x, y, z, radius) {
    const seq = ++this.carveSequence;
    const r2 = radius * radius;
    const minX = Math.max(0, Math.floor(x - radius));
    const maxX = Math.min(MAP_X - 1, Math.ceil(x + radius));
    const minY = Math.max(0, Math.floor(y - radius));
    const maxY = Math.min(MAP_Y - 1, Math.ceil(y + radius));
    const minZ = Math.max(0, Math.floor(z - radius));
    const maxZ = Math.min(MAP_Z - 1, Math.ceil(z + radius));

    for (let ix = minX; ix <= maxX; ix++) {
      const dx = ix - x;
      for (let iy = minY; iy <= maxY; iy++) {
        const dy = iy - y;
        for (let iz = minZ; iz <= maxZ; iz++) {
          const dz = iz - z;
          if (dx * dx + dy * dy + dz * dz <= r2) {
            const current = this.getBlock(ix, iy, iz);
            if (current !== BLOCK_AIR && current !== BLOCK_INDESTRUCTIBLE) {
              this.setBlock(ix, iy, iz, BLOCK_AIR);
            }
          }
        }
      }
    }

    const event = { seq, x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, z: Math.round(z * 10) / 10, r: radius };
    this.carveHistory.push(event);
    return event;
  }

  // Generates spawn locations safely above ground
  getSpawnPoints(count = 16) {
    const points = [];
    const rng = createPRNG(this.seed + 999);
    let attempts = 0;

    while (points.length < count && attempts < 500) {
      attempts++;
      const x = Math.floor(MAP_X * 0.2 + rng() * MAP_X * 0.6);
      const z = Math.floor(MAP_Z * 0.2 + rng() * MAP_Z * 0.6);
      const y = this.getHighestSolidY(x, z);

      if (y >= 5) {
        // Ensure distance from existing points
        let tooClose = false;
        for (const p of points) {
          const d2 = (p.x - x) * (p.x - x) + (p.z - z) * (p.z - z);
          if (d2 < 64) {
            tooClose = true;
            break;
          }
        }
        if (!tooClose) {
          points.push({ x: x + 0.5, y: y + 1.2, z: z + 0.5 });
        }
      }
    }

    // Fallbacks if not enough
    while (points.length < count) {
      points.push({ x: MAP_X / 2 + (points.length - count / 2) * 3, y: 12, z: MAP_Z / 2 });
    }

    return points;
  }

  // Quick 32-bit hash of solid blocks to verify map consistency
  getTerrainHash() {
    let hash = 0;
    for (let x = 0; x < MAP_X; x += 3) {
      for (let z = 0; z < MAP_Z; z += 3) {
        const y = this.getHighestSolidY(x, z);
        hash = (Math.imul(31, hash) + x + y * 7 + z * 13) | 0;
      }
    }
    return hash;
  }
}
