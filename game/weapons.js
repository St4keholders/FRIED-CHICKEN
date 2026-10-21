// game/weapons.js - Weapons implementation, shooting logic, projectile spawners and special triggers

import { WEAPONS, UTILITIES } from './constants.js';

export function getWeaponDef(weaponId) {
  return WEAPONS.find((w) => w.id === weaponId) || UTILITIES.find((u) => u.id === weaponId) || WEAPONS[0];
}

export class WeaponManager {
  constructor(physics, spawnProjectileCallback, spawnEntityCallback, audioTriggerCallback) {
    this.physics = physics;
    this.spawnProjectile = spawnProjectileCallback || (() => {});
    this.spawnEntity = spawnEntityCallback || (() => {});
    this.audioTrigger = audioTriggerCallback || (() => {});
  }

  fire(activeChicken, weaponId, aimPitch, aimYaw, power = 1.0, options = {}) {
    const def = getWeaponDef(weaponId);
    if (!def) return { endedTurn: false };

    // Calculate forward launch vector from pitch and yaw
    // pitch: vertical angle (-Math.PI/3 up to Math.PI/3), yaw: horizontal angle
    const cosP = Math.cos(aimPitch);
    const sinP = Math.sin(aimPitch);
    const dirX = Math.sin(aimYaw) * cosP;
    const dirY = sinP;
    const dirZ = Math.cos(aimYaw) * cosP;

    // Launch spawn position (slightly in front of chicken)
    const spawnX = activeChicken.x + dirX * 0.9;
    const spawnY = activeChicken.y + 0.5 + dirY * 0.9;
    const spawnZ = activeChicken.z + dirZ * 0.9;

    let endsTurn = true;
    const chargeSpeed = 8 + power * 28; // Speed scaled by power charge

    switch (weaponId) {
      case 'bazuca': {
        this.spawnProjectile({
          type: 'bazuca',
          x: spawnX,
          y: spawnY,
          z: spawnZ,
          vx: dirX * chargeSpeed,
          vy: dirY * chargeSpeed,
          vz: dirZ * chargeSpeed,
          affectedByWind: true,
          bounce: false,
          damage: def.damage,
          radius: def.radius,
          impulse: def.impulse,
          timer: -1,
        });
        this.audioTrigger('shoot_bazuca');
        break;
      }

      case 'granada': {
        const timerSec = options.timer || def.defaultTimer || 3;
        this.spawnProjectile({
          type: 'granada',
          x: spawnX,
          y: spawnY,
          z: spawnZ,
          vx: dirX * chargeSpeed * 0.85,
          vy: dirY * chargeSpeed * 0.85,
          vz: dirZ * chargeSpeed * 0.85,
          affectedByWind: false,
          bounce: true,
          damage: def.damage,
          radius: def.radius,
          impulse: def.impulse,
          timer: timerSec,
        });
        this.audioTrigger('throw_grenade');
        break;
      }

      case 'maiz_pira': {
        const timerSec = options.timer || 3;
        this.spawnProjectile({
          type: 'maiz_pira',
          x: spawnX,
          y: spawnY,
          z: spawnZ,
          vx: dirX * chargeSpeed * 0.8,
          vy: dirY * chargeSpeed * 0.8,
          vz: dirZ * chargeSpeed * 0.8,
          bounce: true,
          damage: def.damage,
          radius: def.radius,
          impulse: def.impulse,
          timer: timerSec,
          isCluster: true,
          clusterCount: 5,
        });
        this.audioTrigger('throw_grenade');
        break;
      }

      case 'escopeta': {
        // High speed straight line shot
        this.spawnProjectile({
          type: 'escopeta',
          x: spawnX,
          y: spawnY,
          z: spawnZ,
          vx: dirX * 55,
          vy: dirY * 55,
          vz: dirZ * 55,
          affectedByWind: false,
          bounce: false,
          damage: def.damage,
          radius: def.radius,
          impulse: def.impulse,
          timer: 1.5,
        });
        this.audioTrigger('shoot_shotgun');

        // Escopeta allows 2 shots per turn
        activeChicken.shotgunShots = (activeChicken.shotgunShots || 0) + 1;
        if (activeChicken.shotgunShots < 2) {
          endsTurn = false;
        } else {
          activeChicken.shotgunShots = 0;
          endsTurn = true;
        }
        break;
      }

      case 'picotazo': {
        // Close range melee upward
        this.audioTrigger('punch_fire');
        const strikeRange = 2.0;
        this.physics.explode(
          activeChicken.x + dirX * 1.0,
          activeChicken.y + 0.5,
          activeChicken.z + dirZ * 1.0,
          1.8,
          def.damage,
          def.impulse,
          options.entities || []
        );
        break;
      }

      case 'chancla': {
        // Slap with high horizontal knockback
        this.audioTrigger('slap_chancla');
        this.physics.explode(
          activeChicken.x + dirX * 1.2,
          activeChicken.y + 0.4,
          activeChicken.z + dirZ * 1.2,
          2.0,
          def.damage,
          def.impulse,
          options.entities || []
        );
        break;
      }

      case 'palomas': {
        // Air strike at targeted location (options.targetX, options.targetZ)
        const tx = options.targetX || activeChicken.x + dirX * 10;
        const tz = options.targetZ || activeChicken.z + dirZ * 10;
        this.audioTrigger('airstrike_pigeons');

        for (let i = 0; i < 5; i++) {
          setTimeout(() => {
            const spreadX = (Math.random() - 0.5) * 4;
            const spreadZ = (Math.random() - 0.5) * 4;
            this.spawnProjectile({
              type: 'paloma_egg',
              x: tx + spreadX,
              y: 28 + i * 2,
              z: tz + spreadZ,
              vx: 0,
              vy: -18,
              vz: 0,
              affectedByWind: true,
              bounce: false,
              damage: def.damage,
              radius: def.radius,
              impulse: 14,
            });
          }, i * 280);
        }
        break;
      }

      case 'vela': {
        // Dynamite dropped at feet
        this.spawnProjectile({
          type: 'vela',
          x: activeChicken.x,
          y: activeChicken.y + 0.2,
          z: activeChicken.z,
          vx: 0,
          vy: 0,
          vz: 0,
          bounce: false,
          damage: def.damage,
          radius: def.radius,
          impulse: def.impulse,
          timer: 5,
        });
        this.audioTrigger('fuse_burn');
        break;
      }

      case 'mina': {
        // Proximity mine placed
        this.spawnEntity({
          type: 'mina',
          x: activeChicken.x,
          y: activeChicken.y + 0.2,
          z: activeChicken.z,
          damage: def.damage,
          radius: def.radius,
          impulse: def.impulse,
          active: true,
          armed: false,
          armTimer: 2.0,
          fuseTime: def.fuseTime,
          proximityDist: def.proximityDistance,
        });
        this.audioTrigger('click');
        break;
      }

      case 'mama_gallina': {
        // Walking hen
        this.spawnEntity({
          type: 'mama_gallina',
          x: activeChicken.x + dirX * 1.0,
          y: activeChicken.y + 0.5,
          z: activeChicken.z + dirZ * 1.0,
          vx: dirX * 4.5,
          vz: dirZ * 4.5,
          vy: 2.0,
          rotation: aimYaw,
          timer: 10,
          damage: def.damage,
          radius: def.radius,
          impulse: def.impulse,
          active: true,
        });
        this.audioTrigger('cluck_hen');
        break;
      }

      case 'huevo_oro': {
        // Holy hand grenade
        this.spawnProjectile({
          type: 'huevo_oro',
          x: spawnX,
          y: spawnY,
          z: spawnZ,
          vx: dirX * chargeSpeed * 0.9,
          vy: dirY * chargeSpeed * 0.9,
          vz: dirZ * chargeSpeed * 0.9,
          bounce: true,
          damage: def.damage,
          radius: def.radius,
          impulse: def.impulse,
          timer: 4.0,
          isHoly: true,
        });
        this.audioTrigger('hallelujah_choir');
        break;
      }

      case 'guacamaya': {
        // Homing missile
        const tx = options.targetX || activeChicken.x + dirX * 15;
        const tz = options.targetZ || activeChicken.z + dirZ * 15;
        this.spawnProjectile({
          type: 'guacamaya',
          x: spawnX,
          y: spawnY,
          z: spawnZ,
          vx: dirX * 14,
          vy: dirY * 14,
          vz: dirZ * 14,
          targetX: tx,
          targetY: 10,
          targetZ: tz,
          isHoming: true,
          damage: def.damage,
          radius: def.radius,
          impulse: def.impulse,
          timer: 6.0,
        });
        this.audioTrigger('bird_cry');
        break;
      }

      // Utilities
      case 'sombrilla': {
        activeChicken.parachuteActive = true;
        endsTurn = false;
        this.audioTrigger('parachute_open');
        break;
      }

      case 'teleport': {
        if (options.targetX !== undefined && options.targetZ !== undefined) {
          activeChicken.x = options.targetX;
          activeChicken.z = options.targetZ;
          activeChicken.y = this.physics.terrain.getHighestSolidY(options.targetX, options.targetZ) + 1.2;
          this.audioTrigger('teleport');
          endsTurn = true;
        } else {
          endsTurn = false;
        }
        break;
      }

      case 'viga': {
        // Place toy block girder
        if (options.targetX !== undefined && options.targetZ !== undefined) {
          const gx = Math.floor(options.targetX);
          const gz = Math.floor(options.targetZ);
          const gy = Math.floor(options.targetY || activeChicken.y);
          for (let bx = -1; bx <= 1; bx++) {
            for (let bz = -1; bz <= 1; bz++) {
              this.physics.terrain.setBlock(gx + bx, gy, gz + bz, 1);
            }
          }
          this.audioTrigger('place_block');
        }
        endsTurn = false;
        break;
      }

      case 'jetpack': {
        activeChicken.jetpackFuel = (activeChicken.jetpackFuel || 100) - 15;
        activeChicken.vy = 8.0;
        endsTurn = false;
        this.audioTrigger('jetpack');
        break;
      }

      case 'skip': {
        endsTurn = true;
        break;
      }

      case 'surrender': {
        activeChicken.health = 0;
        activeChicken.alive = false;
        endsTurn = true;
        break;
      }

      default:
        endsTurn = true;
    }

    return { endsTurn, weaponId };
  }
}
