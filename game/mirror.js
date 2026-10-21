// game/mirror.js - Client-side 3D game mirror replicating host simulation via seeded terrain, carve events, and snapshot interpolation

import { VoxelTerrain } from './terrain.js';
import { getIsland } from './islands.js';
import { GameRenderer } from './render.js';

export class GameMirror {
  constructor(canvasElement, options = {}) {
    this.canvas = canvasElement;
    this.options = options;
    this.terrain = null;
    this.renderer = null;
    this.snapshots = []; // buffer for interpolation
    this.carveSequence = 0;
    this.mySlot = options.slot || null;
    this.activeChicken = null;
    this.currentEntities = { chickens: [], crates: [], barrels: [], minas: [] };
    this.currentProjectiles = [];
    this.running = false;
    this.lastFrameTime = performance.now();
  }

  initMatch(matchInit) {
    const { seed, islandId, carves = [] } = matchInit;
    const island = getIsland(islandId);

    // 1. Generate identical terrain from seed
    this.terrain = new VoxelTerrain(seed, island);

    // 2. Initialize Three.js renderer
    this.renderer = new GameRenderer(this.canvas, {
      quality: this.options.quality || 'normal',
      isMobile: true,
    });
    this.renderer.setIslandTheme(island);

    // 3. Catch up with any historical carve events
    for (const c of carves) {
      this.applyCarve(c, false);
    }
    this.renderer.updateTerrainMeshes(this.terrain);

    this.running = true;
    this.loop();
  }

  applyCarve(carveEvent, spawnParticles = true) {
    if (!this.terrain) return;
    if (carveEvent.seq <= this.carveSequence && this.carveSequence !== 0) return;

    this.carveSequence = carveEvent.seq;
    this.terrain.carve(carveEvent.x, carveEvent.y, carveEvent.z, carveEvent.r);
    if (this.renderer) {
      this.renderer.updateTerrainMeshes(this.terrain);
      if (spawnParticles) {
        this.renderer.spawnExplosionParticles(carveEvent.x, carveEvent.y, carveEvent.z);
      }
    }
  }

  receiveSnapshot(snap) {
    // Add client receipt timestamp
    snap.clientTime = performance.now();
    this.snapshots.push(snap);

    // Keep buffer small (~5 snapshots)
    if (this.snapshots.length > 8) {
      this.snapshots.shift();
    }
  }

  loop() {
    if (!this.running) return;

    const now = performance.now();
    const dt = Math.min(0.05, (now - this.lastFrameTime) / 1000);
    this.lastFrameTime = now;

    this.interpolate(now);

    if (this.renderer) {
      this.renderer.render(dt);
    }

    requestAnimationFrame(() => this.loop());
  }

  // Smooth snapshot interpolation with 90ms target delay
  interpolate(now) {
    if (this.snapshots.length === 0 || !this.renderer) return;

    const targetTime = now - 90;

    // Find two bounding snapshots
    let s0 = this.snapshots[0];
    let s1 = this.snapshots[0];

    for (let i = 0; i < this.snapshots.length - 1; i++) {
      if (this.snapshots[i].clientTime <= targetTime && this.snapshots[i + 1].clientTime >= targetTime) {
        s0 = this.snapshots[i];
        s1 = this.snapshots[i + 1];
        break;
      }
    }

    const span = s1.clientTime - s0.clientTime;
    const alpha = span > 0 ? Math.min(1.0, Math.max(0.0, (targetTime - s0.clientTime) / span)) : 1.0;

    // Interpolate chickens
    const interpolatedChickens = [];
    if (s0.chickens && s1.chickens) {
      for (const c0 of s0.chickens) {
        const c1 = s1.chickens.find((c) => c.id === c0.id) || c0;
        interpolatedChickens.push({
          ...c1,
          x: c0.x + (c1.x - c0.x) * alpha,
          y: c0.y + (c1.y - c0.y) * alpha,
          z: c0.z + (c1.z - c0.z) * alpha,
          rotation: c0.rotation + (c1.rotation - c0.rotation) * alpha,
          isWalking: c1.isWalking,
        });
      }
    }

    this.currentEntities.chickens = interpolatedChickens;
    this.currentProjectiles = s1.projectiles || [];

    // Sync to renderer
    this.renderer.syncEntities(interpolatedChickens, s1.crates, s1.barrels, s1.minas);
    this.renderer.syncProjectiles(this.currentProjectiles);

    // Sync camera mode & aim
    const active = interpolatedChickens.find((c) => c.id === s1.activeChickenId);
    if (active) {
      this.renderer.activeChicken = active;
      this.renderer.aimPitch = s1.aimPitch || 0;
      this.renderer.aimYaw = s1.aimYaw || active.rotation || 0;
      this.renderer.setCameraMode(s1.camMode || 'follow', active);
    }
  }

  resize(w, h) {
    if (this.renderer) {
      this.renderer.resize(w, h);
    }
  }

  destroy() {
    this.running = false;
    if (this.renderer) {
      this.renderer.destroy();
      this.renderer = null;
    }
    this.terrain = null;
    this.snapshots = [];
  }
}
