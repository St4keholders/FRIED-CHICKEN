// game/render.js - Three.js 3D rendering pipeline, cameras, water, particles, and floating damage numbers

import * as THREE from 'three';
import { buildChunkMesh } from './mesher.js';
import { MAP_CHUNKS_X, MAP_CHUNKS_Y, MAP_CHUNKS_Z, MAP_X, MAP_Z } from './terrain.js';
import { createChickenModel, createWeaponModel, createCrateModel, createBarrelModel, createTombstoneModel, createFoxBossModel } from './models.js';

export class GameRenderer {
  constructor(canvasElement, options = {}) {
    this.canvas = canvasElement;
    this.options = {
      quality: options.quality || 'normal', // 'alta', 'normal', 'ahorro'
      isMobile: options.isMobile || false,
      ...options,
    };

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.terrainGroup = null;
    this.chunkMeshes = new Map();
    this.entityMeshes = new Map();
    this.projectileMeshes = new Map();
    this.particleGroup = null;
    this.waterMesh = null;
    this.dirLight = null;

    // Camera modes: 'follow', 'aim', 'projectile', 'overview', 'cinematic'
    this.cameraMode = 'follow';
    this.cameraTarget = new THREE.Vector3(MAP_X / 2, 8, MAP_Z / 2);
    this.cameraPosition = new THREE.Vector3(MAP_X / 2, 24, MAP_Z / 2 + 35);
    this.currentCamPos = new THREE.Vector3();
    this.currentCamLook = new THREE.Vector3();

    this.activeChicken = null;
    this.trackedProjectile = null;
    this.aimPitch = 0;
    this.aimYaw = 0;

    this.particles = [];
    this.damageNumbers = [];
    this.time = 0;
    this.initScene();
  }

  initScene() {
    this.scene = new THREE.Scene();

    // Perspective Camera
    const aspect = this.canvas.clientWidth / (this.canvas.clientHeight || 1);
    this.camera = new THREE.PerspectiveCamera(50, aspect, 0.5, 300);

    // WebGL Renderer
    const dpr = Math.min(this.options.isMobile ? 1.5 : 2.0, window.devicePixelRatio || 1);
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: this.options.quality !== 'ahorro',
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight, false);
    this.renderer.setPixelRatio(dpr);

    if (this.options.quality === 'alta') {
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    // Lights
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.7);
    this.scene.add(hemiLight);

    this.dirLight = new THREE.DirectionalLight(0xfff3b0, 0.9);
    this.dirLight.position.set(40, 60, 30);
    if (this.options.quality === 'alta') {
      this.dirLight.castShadow = true;
      this.dirLight.shadow.mapSize.width = 1024;
      this.dirLight.shadow.mapSize.height = 1024;
      this.dirLight.shadow.camera.near = 10;
      this.dirLight.shadow.camera.far = 150;
      this.dirLight.shadow.camera.left = -45;
      this.dirLight.shadow.camera.right = 45;
      this.dirLight.shadow.camera.top = 45;
      this.dirLight.shadow.camera.bottom = -45;
    }
    this.scene.add(this.dirLight);

    // Groups
    this.terrainGroup = new THREE.Group();
    this.scene.add(this.terrainGroup);

    this.particleGroup = new THREE.Group();
    this.scene.add(this.particleGroup);

    // Animated Water Plane
    const waterGeo = new THREE.PlaneGeometry(350, 350, 16, 16);
    const waterMat = new THREE.MeshLambertMaterial({
      color: 0x0077b6,
      transparent: true,
      opacity: 0.8,
      flatShading: true,
    });
    this.waterMesh = new THREE.Mesh(waterGeo, waterMat);
    this.waterMesh.rotation.x = -Math.PI / 2;
    this.waterMesh.position.set(MAP_X / 2, 4.0, MAP_Z / 2);
    this.scene.add(this.waterMesh);

    this.currentCamPos.copy(this.cameraPosition);
    this.currentCamLook.copy(this.cameraTarget);
  }

  setIslandTheme(island) {
    if (!island) return;
    this.islandTheme = island;

    // Background sky gradient
    this.scene.background = new THREE.Color(island.skyTop || '#4ea8de');
    if (this.waterMesh) {
      this.waterMesh.material.color.set(island.waterColor || '#0077b6');
      this.waterMesh.position.y = island.waterHeight || 4.0;
    }
    if (this.dirLight) {
      this.dirLight.color.set(island.sunColor || '#fff3b0');
    }
  }

  updateTerrainMeshes(terrain) {
    if (!terrain) return;

    for (const key of terrain.dirtyChunks) {
      const [cx, cy, cz] = key.split(',').map(Number);

      // Remove existing chunk mesh if present
      const oldMesh = this.chunkMeshes.get(key);
      if (oldMesh) {
        this.terrainGroup.remove(oldMesh);
        oldMesh.geometry.dispose();
        if (Array.isArray(oldMesh.material)) {
          oldMesh.material.forEach((m) => m.dispose());
        } else {
          oldMesh.material.dispose();
        }
        this.chunkMeshes.delete(key);
      }

      // Generate new chunk mesh
      const newMesh = buildChunkMesh(terrain, cx, cy, cz, this.islandTheme?.palette);
      if (newMesh) {
        this.terrainGroup.add(newMesh);
        this.chunkMeshes.set(key, newMesh);
      }
    }

    terrain.dirtyChunks.clear();
  }

  syncEntities(chickens, crates, barrels, minas) {
    const presentIds = new Set();

    // 1. Sync Chickens
    for (const ch of chickens) {
      presentIds.add(ch.id);
      let mesh = this.entityMeshes.get(ch.id);

      if (!mesh) {
        if (ch.id === 'boss_rufo') {
          mesh = createFoxBossModel();
        } else {
          mesh = createChickenModel(ch.teamColor, ch.accessory, ch.isRobot);
        }
        this.scene.add(mesh);
        this.entityMeshes.set(ch.id, mesh);
      }

      if (ch.alive) {
        mesh.position.set(ch.x, ch.y, ch.z);
        mesh.rotation.y = ch.rotation || 0;
        mesh.visible = true;

        if (mesh.userData && mesh.userData.animate) {
          const pose = ch.hurtTimer > 0 ? 'hurt' : (!ch.onGround ? 'fall' : 'idle');
          mesh.userData.animate(0.016, pose, ch.isWalking);
        }
      } else {
        // Chicken dead: replace with tombstone egg
        if (!mesh.userData.isTombstone) {
          this.scene.remove(mesh);
          mesh = createTombstoneModel(ch.name);
          mesh.position.set(ch.x, Math.max(this.islandTheme?.waterHeight || 4, ch.y), ch.z);
          mesh.userData.isTombstone = true;
          this.scene.add(mesh);
          this.entityMeshes.set(ch.id, mesh);
        }
      }
    }

    // 2. Sync Crates
    if (crates) {
      for (const cr of crates) {
        presentIds.add(cr.id);
        let mesh = this.entityMeshes.get(cr.id);
        if (!mesh) {
          mesh = createCrateModel(cr.type);
          this.scene.add(mesh);
          this.entityMeshes.set(cr.id, mesh);
        }
        mesh.position.set(cr.x, cr.y, cr.z);
        if (mesh.userData.chuteGroup) {
          mesh.userData.chuteGroup.visible = !cr.onGround;
        }
      }
    }

    // 3. Sync Barrels
    if (barrels) {
      for (const b of barrels) {
        presentIds.add(b.id);
        let mesh = this.entityMeshes.get(b.id);
        if (!mesh) {
          mesh = createBarrelModel();
          this.scene.add(mesh);
          this.entityMeshes.set(b.id, mesh);
        }
        mesh.position.set(b.x, b.y, b.z);
      }
    }

    // Clean up entities no longer in match
    for (const [id, mesh] of this.entityMeshes.entries()) {
      if (!presentIds.has(id)) {
        this.scene.remove(mesh);
        this.entityMeshes.delete(id);
      }
    }
  }

  syncProjectiles(projectiles) {
    const presentIds = new Set();

    for (const p of projectiles) {
      presentIds.add(p.id);
      let mesh = this.projectileMeshes.get(p.id);
      if (!mesh) {
        mesh = createWeaponModel(p.type);
        this.scene.add(mesh);
        this.projectileMeshes.set(p.id, mesh);
      }
      mesh.position.set(p.x, p.y, p.z);
      if (p.vx || p.vz) {
        mesh.rotation.y = Math.atan2(p.vx, p.vz);
      }
    }

    for (const [id, mesh] of this.projectileMeshes.entries()) {
      if (!presentIds.has(id)) {
        this.scene.remove(mesh);
        this.projectileMeshes.delete(id);
      }
    }
  }

  // Particle Explosions and Splashes
  spawnExplosionParticles(x, y, z, colorHex = 0xffa500, count = 25) {
    for (let i = 0; i < count; i++) {
      const geo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
      const mat = new THREE.MeshBasicMaterial({ color: colorHex });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, z);

      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 8;
      const vy = 2 + Math.random() * 9;

      this.particleGroup.add(mesh);
      this.particles.push({
        mesh,
        vx: Math.cos(angle) * speed,
        vy,
        vz: Math.sin(angle) * speed,
        life: 0.6 + Math.random() * 0.4,
        maxLife: 1.0,
      });
    }
  }

  spawnDamageNumber(x, y, z, damage) {
    this.damageNumbers.push({
      x,
      y: y + 1.2,
      z,
      text: `-${damage}`,
      life: 1.4,
      vy: 1.8,
    });
  }

  setCameraMode(mode, targetEntity = null) {
    this.cameraMode = mode;
    if (targetEntity) {
      this.activeChicken = targetEntity;
    }
  }

  updateCamera(dt) {
    const target = this.cameraTarget;
    const pos = this.cameraPosition;

    if (this.cameraMode === 'follow' && this.activeChicken) {
      const ch = this.activeChicken;
      const camDist = 12.0;
      const camHeight = 6.5;

      const rot = ch.rotation || 0;
      pos.set(ch.x - Math.sin(rot) * camDist, ch.y + camHeight, ch.z - Math.cos(rot) * camDist);
      target.set(ch.x, ch.y + 1.2, ch.z);
    } else if (this.cameraMode === 'aim' && this.activeChicken) {
      const ch = this.activeChicken;
      const rot = this.aimYaw || ch.rotation || 0;
      const pitch = this.aimPitch || 0.2;

      // Over the shoulder third person close-up
      const shoulderOffset = 0.8;
      const backDist = 3.8;
      const height = 1.4;

      const cosP = Math.cos(pitch);
      const sinP = Math.sin(pitch);

      pos.set(
        ch.x - Math.sin(rot) * backDist * cosP + Math.cos(rot) * shoulderOffset,
        ch.y + height - sinP * backDist,
        ch.z - Math.cos(rot) * backDist * cosP - Math.sin(rot) * shoulderOffset
      );
      target.set(ch.x + Math.sin(rot) * 20 * cosP, ch.y + height + sinP * 20, ch.z + Math.cos(rot) * 20 * cosP);
    } else if (this.cameraMode === 'projectile' && this.trackedProjectile) {
      const p = this.trackedProjectile;
      pos.set(p.x - 4, p.y + 3, p.z - 4);
      target.set(p.x, p.y, p.z);
    } else if (this.cameraMode === 'overview') {
      pos.set(MAP_X / 2, 42, MAP_Z / 2 + 50);
      target.set(MAP_X / 2, 8, MAP_Z / 2);
    }

    // Smooth lerp camera movement
    const lerpSpeed = 5.0 * dt;
    this.currentCamPos.lerp(pos, lerpSpeed);
    this.currentCamLook.lerp(target, lerpSpeed);

    this.camera.position.copy(this.currentCamPos);
    this.camera.lookAt(this.currentCamLook);
  }

  render(dt = 0.016) {
    this.time += dt;

    // Animate water waves
    if (this.waterMesh) {
      this.waterMesh.position.y = (this.islandTheme?.waterHeight || 4.0) + Math.sin(this.time * 2) * 0.08;
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particleGroup.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        this.particles.splice(i, 1);
      } else {
        p.vy -= 18 * dt;
        p.mesh.position.x += p.vx * dt;
        p.mesh.position.y += p.vy * dt;
        p.mesh.position.z += p.vz * dt;
        const scale = p.life / p.maxLife;
        p.mesh.scale.set(scale, scale, scale);
      }
    }

    // Update floating damage numbers
    for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
      const dn = this.damageNumbers[i];
      dn.life -= dt;
      dn.y += dn.vy * dt;
      if (dn.life <= 0) {
        this.damageNumbers.splice(i, 1);
      }
    }

    this.updateCamera(dt);
    this.renderer.render(this.scene, this.camera);
  }

  resize(width, height) {
    if (!this.camera || !this.renderer) return;
    this.camera.aspect = width / (height || 1);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  destroy() {
    if (this.renderer) {
      this.renderer.dispose();
    }
  }
}
