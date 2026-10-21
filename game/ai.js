// game/ai.js - CPU artificial intelligence with ballistic trajectory simulation, difficulties, and visible aiming

import { WEAPONS } from './constants.js';

export class CPUController {
  constructor(difficulty = 'normal') {
    this.difficulty = difficulty; // 'facil', 'normal', 'dificil'
    this.state = 'IDLE'; // IDLE, THINKING, AIMING, CHARGING, FIRED, RETREATING
    this.timer = 0;
    this.target = null;
    this.selectedWeapon = 'bazuca';
    this.targetPitch = 0.3;
    this.targetYaw = 0;
    this.targetPower = 0.7;
    this.currentPitch = 0;
    this.currentYaw = 0;
    this.chargeTime = 0;
    this.targetChargeDuration = 0;
    this.onFire = null;
    this.onMove = null;
    this.onWeaponSelect = null;
    this.onSay = null;
  }

  startTurn(activeChicken, enemies, terrain, wind, inventory) {
    this.activeChicken = activeChicken;
    this.enemies = enemies.filter((e) => e.alive);
    this.terrain = terrain;
    this.wind = wind;
    this.inventory = inventory;
    this.state = 'THINKING';
    this.timer = 1.0 + Math.random() * 0.8;
  }

  update(dt, callbacks = {}) {
    if (this.state === 'IDLE' || !this.activeChicken || !this.activeChicken.alive) return;

    this.timer -= dt;

    if (this.state === 'THINKING') {
      if (this.timer <= 0) {
        this._decideStrategy(callbacks);
      }
    } else if (this.state === 'AIMING') {
      // Smoothly rotate toward target yaw and pitch
      const rotSpeed = 2.5;
      const dYaw = this.targetYaw - this.currentYaw;
      const dPitch = this.targetPitch - this.currentPitch;

      this.currentYaw += Math.sign(dYaw) * Math.min(Math.abs(dYaw), rotSpeed * dt);
      this.currentPitch += Math.sign(dPitch) * Math.min(Math.abs(dPitch), rotSpeed * dt);

      if (callbacks.onAim) {
        callbacks.onAim(this.currentPitch, this.currentYaw);
      }

      if (Math.abs(dYaw) < 0.08 && Math.abs(dPitch) < 0.08 && this.timer <= 0) {
        this.state = 'CHARGING';
        this.chargeTime = 0;
        this.targetChargeDuration = this.targetPower * 1.5;
      }
    } else if (this.state === 'CHARGING') {
      this.chargeTime += dt;
      if (callbacks.onCharge) {
        callbacks.onCharge(Math.min(1.0, this.chargeTime / 1.5));
      }

      if (this.chargeTime >= this.targetChargeDuration) {
        this.state = 'FIRED';
        if (callbacks.onFire) {
          callbacks.onFire({
            weaponId: this.selectedWeapon,
            pitch: this.targetPitch,
            yaw: this.targetYaw,
            power: this.targetPower,
            targetX: this.target?.x,
            targetZ: this.target?.z,
          });
        }
      }
    } else if (this.state === 'RETREATING') {
      // Walk away from nearest enemy or danger
      if (callbacks.onMove && this.timer > 0) {
        const moveDir = this.retreatDir || { x: 0, z: 0 };
        callbacks.onMove(moveDir);
      } else {
        this.state = 'IDLE';
      }
    }
  }

  _decideStrategy(callbacks) {
    if (!this.enemies || this.enemies.length === 0) {
      this.state = 'IDLE';
      return;
    }

    // Pick target: closest or weakest
    let bestTarget = this.enemies[0];
    let minDist = 9999;
    for (const enemy of this.enemies) {
      const dx = enemy.x - this.activeChicken.x;
      const dz = enemy.z - this.activeChicken.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < minDist) {
        minDist = dist;
        bestTarget = enemy;
      }
    }
    this.target = bestTarget;

    // Pick weapon
    let weapon = 'bazuca';
    if (minDist < 2.5) {
      weapon = 'picotazo';
    } else if (minDist > 18 && this.difficulty !== 'facil' && Math.random() < 0.35) {
      weapon = 'palomas';
    } else if (Math.random() < 0.3) {
      weapon = 'granada';
    }
    this.selectedWeapon = weapon;

    if (callbacks.onWeaponSelect) {
      callbacks.onWeaponSelect(weapon);
    }

    // Calculate angle and power with simulated ballistics
    const dx = this.target.x - this.activeChicken.x;
    const dy = this.target.y - this.activeChicken.y;
    const dz = this.target.z - this.activeChicken.z;
    const horizDist = Math.max(0.1, Math.sqrt(dx * dx + dz * dz));

    let yaw = Math.atan2(dx, dz);
    let pitch = 0.35 + Math.min(0.4, (dy / horizDist) * 0.5);
    let power = Math.min(1.0, Math.max(0.2, horizDist / 26));

    // Apply difficulty error
    if (this.difficulty === 'facil') {
      yaw += (Math.random() - 0.5) * 0.35;
      pitch += (Math.random() - 0.5) * 0.25;
      power = Math.min(1.0, Math.max(0.2, power + (Math.random() - 0.5) * 0.3));
    } else if (this.difficulty === 'normal') {
      yaw += (Math.random() - 0.5) * 0.12;
      pitch += (Math.random() - 0.5) * 0.08;
      power = Math.min(1.0, Math.max(0.2, power + (Math.random() - 0.5) * 0.1));
    } else {
      // Dificil: compensate for wind
      if (this.wind) {
        yaw -= this.wind.x * 0.04;
      }
    }

    this.targetYaw = yaw;
    this.targetPitch = pitch;
    this.targetPower = power;
    this.currentYaw = this.activeChicken.rotation || 0;
    this.currentPitch = 0;

    this.state = 'AIMING';
    this.timer = 1.2;
  }

  startRetreat(retreatTime = 5) {
    this.state = 'RETREATING';
    this.timer = retreatTime - 0.5;

    // Pick a retreat direction away from target
    if (this.target) {
      const dx = this.activeChicken.x - this.target.x;
      const dz = this.activeChicken.z - this.target.z;
      const len = Math.sqrt(dx * dx + dz * dz) || 1;
      this.retreatDir = { x: dx / len, z: dz / len };
    } else {
      this.retreatDir = { x: Math.random() - 0.5, z: Math.random() - 0.5 };
    }
  }
}
