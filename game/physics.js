// game/physics.js - Custom collision, ballistics, wind and explosion impulse physics

import { BLOCK_AIR, BLOCK_GELATIN, MAP_X, MAP_Y, MAP_Z } from './terrain.js';

export const GRAVITY = 22;
export const CHICKEN_RADIUS = 0.38;
export const CHICKEN_HEIGHT = 0.85;

export class PhysicsEngine {
  constructor(terrain, waterHeight = 4) {
    this.terrain = terrain;
    this.waterHeight = waterHeight;
  }

  // Check if a point is inside solid voxel terrain
  isSolid(x, y, z) {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const iz = Math.floor(z);
    const block = this.terrain.getBlock(ix, iy, iz);
    return block !== BLOCK_AIR;
  }

  isGelatin(x, y, z) {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const iz = Math.floor(z);
    return this.terrain.getBlock(ix, iy, iz) === BLOCK_GELATIN;
  }

  // Update chicken movement, collisions and step climbing
  updateChicken(chicken, dt, moveInput = { x: 0, z: 0 }, jump = false, backflip = false) {
    if (!chicken.alive) return;

    // Water drowning check
    if (chicken.y <= this.waterHeight + 0.1) {
      chicken.alive = false;
      chicken.drowned = true;
      chicken.health = 0;
      return;
    }

    // Ground check: check voxels directly under feet
    const feetY = chicken.y;
    const isGrounded = this.checkFeetGrounded(chicken.x, feetY, chicken.z);
    chicken.onGround = isGrounded;

    if (isGrounded) {
      if (chicken.isFalling) {
        // Evaluate fall damage
        const fallDist = chicken.peakY - chicken.y;
        if (fallDist > 4.5 && !chicken.parachuteActive) {
          const fallDamage = Math.min(100, Math.floor((fallDist - 4.5) * 11));
          chicken.health = Math.max(0, chicken.health - fallDamage);
          chicken.lastDamage = fallDamage;
          chicken.hurtTimer = 0.6;
          if (chicken.health <= 0) chicken.alive = false;
        }
        chicken.isFalling = false;
      }
      chicken.peakY = chicken.y;

      // Handle Jumps
      if (jump) {
        chicken.vy = 8.5;
        const speed = 4.0;
        chicken.vx = Math.sin(chicken.rotation) * speed;
        chicken.vz = Math.cos(chicken.rotation) * speed;
        chicken.onGround = false;
        chicken.isFalling = true;
      } else if (backflip) {
        chicken.vy = 11.2;
        const speed = -3.2; // backward jump
        chicken.vx = Math.sin(chicken.rotation) * speed;
        chicken.vz = Math.cos(chicken.rotation) * speed;
        chicken.onGround = false;
        chicken.isFalling = true;
      } else {
        // Friction on ground
        chicken.vx *= 0.65;
        chicken.vz *= 0.65;
        if (Math.abs(chicken.vx) < 0.05) chicken.vx = 0;
        if (Math.abs(chicken.vz) < 0.05) chicken.vz = 0;
        chicken.vy = 0;
      }

      // Ground Walking
      if ((moveInput.x !== 0 || moveInput.z !== 0) && chicken.hurtTimer <= 0) {
        const walkSpeed = 3.6;
        const targetRot = Math.atan2(moveInput.x, moveInput.z);
        chicken.rotation = targetRot;

        const moveDx = moveInput.x * walkSpeed * dt;
        const moveDz = moveInput.z * walkSpeed * dt;

        this.moveWithSlopes(chicken, moveDx, moveDz);
      }
    } else {
      // In air
      if (chicken.y > chicken.peakY) {
        chicken.peakY = chicken.y;
      }
      chicken.isFalling = true;

      // Gravity & Parachute
      const g = chicken.parachuteActive ? 4.0 : GRAVITY;
      chicken.vy -= g * dt;
      if (chicken.parachuteActive && chicken.vy < -2.5) {
        chicken.vy = -2.5;
      }

      // Apply air velocity
      chicken.x += chicken.vx * dt;
      chicken.y += chicken.vy * dt;
      chicken.z += chicken.vz * dt;

      // Air resistance
      chicken.vx *= 0.98;
      chicken.vz *= 0.98;

      // Resolve head/ceiling and wall collisions
      this.resolveAirCollisions(chicken);
    }

    // Keep within world boundary bounds
    chicken.x = Math.max(1, Math.min(MAP_X - 1, chicken.x));
    chicken.z = Math.max(1, Math.min(MAP_Z - 1, chicken.z));

    if (chicken.hurtTimer > 0) {
      chicken.hurtTimer -= dt;
    }
  }

  checkFeetGrounded(x, y, z) {
    const testPoints = [
      [x, z],
      [x + CHICKEN_RADIUS * 0.7, z],
      [x - CHICKEN_RADIUS * 0.7, z],
      [x, z + CHICKEN_RADIUS * 0.7],
      [x, z - CHICKEN_RADIUS * 0.7],
    ];

    const checkY = y - 0.06;
    for (const [px, pz] of testPoints) {
      if (this.isSolid(px, checkY, pz)) {
        return true;
      }
    }
    return false;
  }

  // Smooth slope climbing and obstacle navigation
  moveWithSlopes(chicken, dx, dz) {
    const nextX = chicken.x + dx;
    const nextZ = chicken.z + dz;

    // Check if flat move is clear
    if (!this.checkChickenCollision(nextX, chicken.y, nextZ)) {
      chicken.x = nextX;
      chicken.z = nextZ;

      // Slight snapping down if walking down a gentle slope
      if (!this.checkFeetGrounded(chicken.x, chicken.y, chicken.z)) {
        for (let drop = 0.1; drop <= 0.6; drop += 0.1) {
          if (this.checkFeetGrounded(chicken.x, chicken.y - drop, chicken.z)) {
            chicken.y -= drop;
            break;
          }
        }
      }
      return;
    }

    // Try climbing 1 voxel step up
    for (let step = 0.2; step <= 1.05; step += 0.2) {
      if (!this.checkChickenCollision(nextX, chicken.y + step, nextZ)) {
        chicken.x = nextX;
        chicken.y += step;
        chicken.z = nextZ;
        return;
      }
    }

    // Slide along X or Z if diagonal blocked
    if (!this.checkChickenCollision(nextX, chicken.y, chicken.z)) {
      chicken.x = nextX;
    } else if (!this.checkChickenCollision(chicken.x, chicken.y, nextZ)) {
      chicken.z = nextZ;
    }
  }

  checkChickenCollision(x, y, z) {
    const r = CHICKEN_RADIUS;
    const h = CHICKEN_HEIGHT;
    const testHeights = [0.1, 0.45, h];

    for (const th of testHeights) {
      const cy = y + th;
      if (
        this.isSolid(x - r, cy, z) ||
        this.isSolid(x + r, cy, z) ||
        this.isSolid(x, cy, z - r) ||
        this.isSolid(x, cy, z + r)
      ) {
        return true;
      }
    }
    return false;
  }

  resolveAirCollisions(chicken) {
    // If inside solid ground, push upwards
    const checkY = chicken.y;
    if (this.isSolid(chicken.x, checkY, chicken.z)) {
      chicken.y = Math.ceil(chicken.y) + 0.05;
      chicken.vy = 0;
      chicken.onGround = true;
    }

    // Bouncy gelatin check
    if (this.isGelatin(chicken.x, chicken.y - 0.2, chicken.z)) {
      chicken.vy = Math.abs(chicken.vy) * 0.85 + 4;
      chicken.onGround = false;
    }
  }

  // Update projectile ballistics
  updateProjectile(proj, dt, wind = { x: 0, z: 0 }) {
    if (!proj.active) return null;

    // Apply wind if weapon supports it
    if (proj.affectedByWind) {
      proj.vx += wind.x * 2.8 * dt;
      proj.vz += wind.z * 2.8 * dt;
    }

    // Gravity
    proj.vy -= GRAVITY * dt;

    // Advance position
    const nextX = proj.x + proj.vx * dt;
    const nextY = proj.y + proj.vy * dt;
    const nextZ = proj.z + proj.vz * dt;

    // Timer countdown
    if (proj.timer > 0) {
      proj.timer -= dt;
      if (proj.timer <= 0) {
        proj.active = false;
        return { explode: true, x: proj.x, y: proj.y, z: proj.z };
      }
    }

    // Water collision
    if (nextY <= this.waterHeight) {
      proj.active = false;
      return { waterSplash: true, x: nextX, y: this.waterHeight, z: nextZ };
    }

    // Terrain collision ray
    if (this.isSolid(nextX, nextY, nextZ)) {
      if (proj.bounce) {
        // Bounce physics with restitution
        proj.vy = -proj.vy * 0.55;
        proj.vx *= 0.65;
        proj.vz *= 0.65;
        proj.bounces = (proj.bounces || 0) + 1;
        if (Math.abs(proj.vy) < 1.0 && Math.abs(proj.vx) < 1.0 && Math.abs(proj.vz) < 1.0) {
          proj.vx = 0;
          proj.vy = 0;
          proj.vz = 0;
        }
        return { bounce: true, x: proj.x, y: proj.y, z: proj.z };
      } else {
        // Direct impact detonation
        proj.active = false;
        return { explode: true, x: nextX, y: nextY, z: nextZ };
      }
    }

    proj.x = nextX;
    proj.y = nextY;
    proj.z = nextZ;
    return null;
  }

  // Explosion area effect: Carves terrain and applies damage + impulse
  explode(x, y, z, radius, maxDamage, maxImpulse, entities = []) {
    // 1. Carve terrain
    const carveEvent = this.terrain.carve(x, y, z, radius);

    // 2. Blast damage and knockback on entities
    const blastRadius = radius * 1.85;
    const affected = [];

    for (const ent of entities) {
      if (!ent.alive) continue;

      const dx = ent.x - x;
      const dy = ent.y + 0.4 - y;
      const dz = ent.z - z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist < blastRadius) {
        const falloff = Math.max(0.1, 1 - dist / blastRadius);
        const damage = Math.round(maxDamage * falloff);
        const impulseMag = maxImpulse * falloff;

        // Direction vector with upward boost
        const normDist = dist > 0.001 ? dist : 1;
        const dirX = dx / normDist;
        const dirY = Math.max(0.45, dy / normDist + 0.5);
        const dirZ = dz / normDist;

        ent.health = Math.max(0, ent.health - damage);
        ent.vx += dirX * impulseMag;
        ent.vy += dirY * impulseMag * 0.85;
        ent.vz += dirZ * impulseMag;
        ent.hurtTimer = 0.8;
        ent.onGround = false;
        ent.isFalling = true;
        if (ent.health <= 0) ent.alive = false;

        affected.push({
          id: ent.id,
          teamId: ent.teamId,
          damage,
          x: ent.x,
          y: ent.y,
          z: ent.z,
        });
      }
    }

    return { carveEvent, affected };
  }
}
