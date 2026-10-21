// game/mesher.js - Generates visible voxel face meshes for Three.js chunks

import * as THREE from 'three';
import { CHUNK_SIZE, BLOCK_AIR, BLOCK_SURFACE, BLOCK_SUBSURFACE, BLOCK_ROCK, BLOCK_INDESTRUCTIBLE, BLOCK_GELATIN } from './terrain.js';

// Precomputed face directions and vertex offsets
const FACES = [
  // +X
  {
    dir: [1, 0, 0],
    normal: [1, 0, 0],
    corners: [
      [1, 0, 0],
      [1, 1, 0],
      [1, 1, 1],
      [1, 0, 1],
    ],
  },
  // -X
  {
    dir: [-1, 0, 0],
    normal: [-1, 0, 0],
    corners: [
      [0, 0, 1],
      [0, 1, 1],
      [0, 1, 0],
      [0, 0, 0],
    ],
  },
  // +Y
  {
    dir: [0, 1, 0],
    normal: [0, 1, 0],
    corners: [
      [0, 1, 1],
      [1, 1, 1],
      [1, 1, 0],
      [0, 1, 0],
    ],
  },
  // -Y
  {
    dir: [0, -1, 0],
    normal: [0, -1, 0],
    corners: [
      [0, 0, 0],
      [1, 0, 0],
      [1, 0, 1],
      [0, 0, 1],
    ],
  },
  // +Z
  {
    dir: [0, 0, 1],
    normal: [0, 0, 1],
    corners: [
      [1, 0, 1],
      [1, 1, 1],
      [0, 1, 1],
      [0, 0, 1],
    ],
  },
  // -Z
  {
    dir: [0, 0, -1],
    normal: [0, 0, -1],
    corners: [
      [0, 0, 0],
      [0, 1, 0],
      [1, 1, 0],
      [1, 0, 0],
    ],
  },
];

function getVoxelColor(blockType, palette) {
  let hex = palette?.surface || 0xe9c46a;
  if (blockType === BLOCK_SUBSURFACE) hex = palette?.subsurface || 0xd4a373;
  else if (blockType === BLOCK_ROCK) hex = palette?.rock || 0x8d775f;
  else if (blockType === BLOCK_INDESTRUCTIBLE) hex = palette?.indestructible || 0x4a4e69;
  else if (blockType === BLOCK_GELATIN) hex = palette?.gelatin || 0xf4a261;

  const r = ((hex >> 16) & 255) / 255;
  const g = ((hex >> 8) & 255) / 255;
  const b = (hex & 255) / 255;
  return [r, g, b];
}

export function buildChunkMesh(terrain, cx, cy, cz, palette) {
  const positions = [];
  const normals = [];
  const colors = [];

  const startX = cx * CHUNK_SIZE;
  const startY = cy * CHUNK_SIZE;
  const startZ = cz * CHUNK_SIZE;

  for (let lx = 0; lx < CHUNK_SIZE; lx++) {
    const gx = startX + lx;
    for (let ly = 0; ly < CHUNK_SIZE; ly++) {
      const gy = startY + ly;
      for (let lz = 0; lz < CHUNK_SIZE; lz++) {
        const gz = startZ + lz;
        const block = terrain.getBlock(gx, gy, gz);
        if (block === BLOCK_AIR) continue;

        const [cr, cg, cb] = getVoxelColor(block, palette);

        for (const face of FACES) {
          const nx = gx + face.dir[0];
          const ny = gy + face.dir[1];
          const nz = gz + face.dir[2];
          const neighbor = terrain.getBlock(nx, ny, nz);

          // Render face if adjacent block is air
          if (neighbor === BLOCK_AIR) {
            const [c0, c1, c2, c3] = face.corners;

            // Two triangles per quad (0, 1, 2) and (0, 2, 3)
            const quadVerts = [
              [gx + c0[0], gy + c0[1], gz + c0[2]],
              [gx + c1[0], gy + c1[1], gz + c1[2]],
              [gx + c2[0], gy + c2[1], gz + c2[2]],
              [gx + c0[0], gy + c0[1], gz + c0[2]],
              [gx + c2[0], gy + c2[1], gz + c2[2]],
              [gx + c3[0], gy + c3[1], gz + c3[2]],
            ];

            // Subtle directional ambient shading based on face normal
            let shade = 1.0;
            if (face.normal[1] > 0) shade = 1.1; // top face brighter
            else if (face.normal[1] < 0) shade = 0.7; // bottom face darker
            else if (face.normal[0] !== 0) shade = 0.88;
            else if (face.normal[2] !== 0) shade = 0.95;

            const vr = Math.min(1, cr * shade);
            const vg = Math.min(1, cg * shade);
            const vb = Math.min(1, cb * shade);

            for (const v of quadVerts) {
              positions.push(v[0], v[1], v[2]);
              normals.push(face.normal[0], face.normal[1], face.normal[2]);
              colors.push(vr, vg, vb);
            }
          }
        }
      }
    }
  }

  if (positions.length === 0) return null;

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

  const material = new THREE.MeshLambertMaterial({
    vertexColors: true,
    flatShading: true,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}
