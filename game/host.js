// game/host.js - Authoritative Host Game Engine: 60Hz simulation, turn state machine, network sync, physics and match lifecycle

import { VoxelTerrain } from './terrain.js';
import { getIsland } from './islands.js';
import { PhysicsEngine } from './physics.js';
import { WeaponManager } from './weapons.js';
import { MatchRules } from './rules.js';
import { CPUController } from './ai.js';
import { CinemaDirector } from './cinema.js';
import { getStoryLevel } from './story.js';
import { sound } from './audio.js';
import { getRandomQuote, playSynthesizedChirp } from './voices.js';
import { DEFAULT_CONFIG, TEAM_COLORS, DEFAULT_CHICKEN_NAMES, WEAPONS } from './constants.js';

export class HostEngine {
  constructor({ net, onStateChange, onSay, onDamageText, onExplosion }) {
    this.net = net;
    this.onStateChange = onStateChange || (() => {});
    this.onSay = onSay || (() => {});
    this.onDamageText = onDamageText || (() => {});
    this.onExplosion = onExplosion || (() => {});

    this.phase = 'LOBBY'; // LOBBY, CINEMATIC, MATCH, RESULTS
    this.config = { ...DEFAULT_CONFIG };
    this.players = []; // { slot: 1..4, name, teamId, colorHex, accessory, isJ1 }
    this.teams = [];
    this.chickens = [];
    this.projectiles = [];
    this.crates = [];
    this.barrels = [];
    this.minas = [];
    this.inventory = {}; // teamId -> { weaponId: ammo }

    this.terrain = null;
    this.physics = null;
    this.weaponManager = null;
    this.rules = null;
    this.cpuController = new CPUController();
    this.cinema = null;

    this.activeChicken = null;
    this.aimPitch = 0.2;
    this.aimYaw = 0;
    this.chargingPower = 0;
    this.isCharging = false;
    this.cameraMode = 'follow';

    this.stats = {
      damageDealt: {}, // playerId/teamId -> number
      drowns: {},
      selfDamage: {},
    };

    this.running = false;
    this.lastTime = performance.now();
    this.snapTimer = 0;
    this.initLobbyDefaults();
  }

  initLobbyDefaults() {
    this.players = [
      {
        slot: 1,
        name: 'Jugador 1',
        teamId: 'rojo',
        teamName: 'Rojo Picante',
        colorHex: TEAM_COLORS[0].primary,
        accessory: 'casco',
        isJ1: true,
        connected: false,
      },
    ];
  }

  // Lobby Configuration Updates
  updateConfig(newCfg) {
    this.config = { ...this.config, ...newCfg };
    this.broadcastLobbyState();
  }

  updatePlayerPick(slot, { teamColorId, accessory, teamName, chickenNames }) {
    const player = this.players.find((p) => p.slot === slot);
    if (!player) return;

    if (teamColorId) {
      const colorObj = TEAM_COLORS.find((c) => c.id === teamColorId) || TEAM_COLORS[0];
      player.teamId = colorObj.id;
      player.teamName = teamName || colorObj.name;
      player.colorHex = colorObj.primary;
    }
    if (accessory) player.accessory = accessory;
    if (chickenNames) player.chickenNames = chickenNames;

    this.broadcastLobbyState();
  }

  handlePlayerJoin(slot, slotInfo) {
    let p = this.players.find((pl) => pl.slot === slot);
    if (!p) {
      const colorObj = TEAM_COLORS[(slot - 1) % TEAM_COLORS.length];
      p = {
        slot,
        name: slotInfo.name || `Jugador ${slot}`,
        teamId: colorObj.id,
        teamName: colorObj.name,
        colorHex: colorObj.primary,
        accessory: 'casco',
        isJ1: slot === 1,
        connected: true,
      };
      this.players.push(p);
    } else {
      p.connected = true;
      p.name = slotInfo.name || p.name;
    }

    this.broadcastLobbyState();
  }

  handlePlayerLeave(slot) {
    const p = this.players.find((pl) => pl.slot === slot);
    if (p) {
      p.connected = false;
      this.broadcastLobbyState();
    }
  }

  broadcastLobbyState() {
    this.net.broadcast({
      t: 'lobby',
      config: this.config,
      players: this.players,
      isJ1Slot: 1,
    });
    this.onStateChange({ phase: this.phase, players: this.players, config: this.config });
  }

  // Start Match
  startMatch() {
    const island = getIsland(this.config.islandId);
    const seed = Math.floor(Math.random() * 999999);

    this.terrain = new VoxelTerrain(seed, island);
    this.physics = new PhysicsEngine(this.terrain, island.waterHeight || 4.0);
    this.rules = new MatchRules(this.config);

    this.weaponManager = new WeaponManager(
      this.physics,
      (proj) => this.spawnProjectile(proj),
      (ent) => this.spawnEntity(ent),
      (audioName) => sound.playTrigger(audioName)
    );

    // Setup teams & spawn chickens
    this.setupMatchEntities();

    // Reset stats
    this.stats = { damageDealt: {}, drowns: {}, selfDamage: {} };

    // Broadcast match initialization to view clients
    this.net.broadcastView({
      t: 'matchInit',
      seed,
      islandId: island.id,
      waterHeight: island.waterHeight || 4.0,
      teams: this.teams,
      carves: [],
    });

    if (this.config.mode === 'historia') {
      this.startStoryLevel(this.config.startLevel || 1);
    } else {
      this.phase = 'MATCH';
      this.net.broadcast({ t: 'phase', phase: 'MATCH' });
      sound.startMusic('battle');
      this.advanceTurn();
    }

    this.running = true;
  }

  setupMatchEntities() {
    this.teams = [];
    this.chickens = [];
    this.projectiles = [];
    this.crates = [];
    this.barrels = [];
    this.inventory = {};

    const spawnPoints = this.terrain.getSpawnPoints(24);
    let spawnIdx = 0;

    // 1. Setup Human Teams
    for (const p of this.players.filter((pl) => pl.connected || pl.slot === 1)) {
      const team = {
        id: p.teamId,
        name: p.teamName,
        colorHex: p.colorHex,
        slot: p.slot,
        isCpu: false,
      };
      this.teams.push(team);

      // Inventory setup
      this.inventory[team.id] = this.createDefaultInventory(this.config.weaponSet);

      // Chickens for this team
      const count = this.config.chickensPerTeam || 4;
      for (let i = 0; i < count; i++) {
        const sp = spawnPoints[spawnIdx++] || { x: 48, y: 12, z: 48 };
        const name = (p.chickenNames && p.chickenNames[i]) || DEFAULT_CHICKEN_NAMES[(i + p.slot * 3) % DEFAULT_CHICKEN_NAMES.length];
        this.chickens.push({
          id: `c_${p.teamId}_${i}`,
          name,
          teamId: p.teamId,
          teamColor: p.colorHex,
          accessory: p.accessory || 'casco',
          x: sp.x,
          y: sp.y,
          z: sp.z,
          vx: 0,
          vy: 0,
          vz: 0,
          rotation: 0,
          health: this.config.initialHealth || 100,
          maxHealth: this.config.initialHealth || 100,
          alive: true,
          onGround: false,
          isPlayer: true,
          isCpu: false,
          peakY: sp.y,
          hurtTimer: 0,
        });
      }
    }

    // 2. Setup CPU Teams (in Cooperativo or single-player Versus)
    if (this.config.mode === 'coop' || this.teams.length < 2) {
      const cpuCount = this.config.mode === 'coop' ? (this.config.cpuCount || 1) : 1;
      for (let c = 0; c < cpuCount; c++) {
        const cpuTeamId = `cpu_${c + 1}`;
        const cpuTeam = {
          id: cpuTeamId,
          name: `Robots de Lata ${c + 1}`,
          colorHex: '#adb5bd',
          isCpu: true,
        };
        this.teams.push(cpuTeam);
        this.inventory[cpuTeamId] = this.createDefaultInventory(this.config.weaponSet);

        for (let i = 0; i < (this.config.chickensPerTeam || 4); i++) {
          const sp = spawnPoints[spawnIdx++] || { x: 48, y: 12, z: 48 };
          this.chickens.push({
            id: `c_${cpuTeamId}_${i}`,
            name: `Robot #${i + 1}`,
            teamId: cpuTeamId,
            teamColor: 0xadb5bd,
            accessory: 'casco',
            x: sp.x,
            y: sp.y,
            z: sp.z,
            vx: 0,
            vy: 0,
            vz: 0,
            rotation: 0,
            health: this.config.initialHealth || 100,
            maxHealth: this.config.initialHealth || 100,
            alive: true,
            onGround: false,
            isRobot: true,
            isPlayer: false,
            isCpu: true,
            peakY: sp.y,
            hurtTimer: 0,
          });
        }
      }
    }

    // 3. Spawn initial map barrels
    for (let b = 0; b < 4; b++) {
      const sp = spawnPoints[spawnIdx++];
      if (sp) {
        this.barrels.push({
          id: `barrel_${b}`,
          x: sp.x,
          y: sp.y,
          z: sp.z,
          health: 20,
          alive: true,
        });
      }
    }

    this.rules.setupTeams(this.teams);
  }

  createDefaultInventory(set = 'clasico') {
    const inv = {};
    for (const w of WEAPONS) {
      inv[w.id] = set === 'locura' ? 99 : w.ammo;
    }
    return inv;
  }

  startStoryLevel(levelNum) {
    this.phase = 'CINEMATIC';
    this.currentLevelData = getStoryLevel(levelNum);
    this.net.broadcast({ t: 'phase', phase: 'CINEMATIC' });

    this.cinema = new CinemaDirector(
      (line) => {
        this.net.broadcast({ t: 'cine', line });
        this.onStateChange({ phase: 'CINEMATIC', cutscene: line });
        sound.playTrigger('click');
      },
      () => {
        // Cutscene finished, start level gameplay
        this.phase = 'MATCH';
        this.net.broadcast({ t: 'phase', phase: 'MATCH' });
        sound.startMusic(this.currentLevelData.objectiveType.startsWith('boss') ? 'boss' : 'battle');
        this.advanceTurn();
      }
    );

    this.cinema.start(this.currentLevelData.dialogueBefore);
  }

  // Turn management
  advanceTurn() {
    const next = this.rules.getNextActiveChicken(this.teams, this.chickens);
    if (!next) {
      this.evaluateVictory();
      return;
    }

    this.activeChicken = next.chicken;
    this.activeTeamId = next.teamId;
    this.rules.advanceTurn();
    this.cameraMode = 'follow';
    this.chargingPower = 0;
    this.isCharging = false;
    this.selectedWeapon = 'bazuca';

    // Broadcast turn info to all
    const activeTeamObj = this.teams.find((t) => t.id === this.activeTeamId);
    this.net.broadcast({
      t: 'turn',
      activeChickenId: this.activeChicken.id,
      activeTeamId: this.activeTeamId,
      activeTeamName: activeTeamObj?.name,
      activeSlot: activeTeamObj?.slot || null,
      clock: this.rules.clock,
      wind: this.rules.wind,
      inventory: this.inventory[this.activeTeamId],
    });

    // Say turn quote
    const quote = getRandomQuote('turnStart');
    this.onSay(this.activeChicken.name, quote);

    // Haptic buzz on the active player controller
    if (activeTeamObj?.slot) {
      this.net.send(activeTeamObj.slot, { t: 'buzz', type: 'turn_start' });
    }

    // Trigger CPU if active chicken is computer controlled
    if (this.activeChicken.isCpu) {
      const enemies = this.chickens.filter((c) => c.teamId !== this.activeTeamId);
      this.cpuController.startTurn(
        this.activeChicken,
        enemies,
        this.terrain,
        this.rules.wind,
        this.inventory[this.activeTeamId]
      );
    }

    // Occasional supply crate drop (35% chance)
    if (Math.random() < 0.35) {
      this.spawnSupplyCrate();
    }
  }

  spawnSupplyCrate() {
    const types = ['weapons', 'health', 'utility'];
    const type = types[Math.floor(Math.random() * types.length)];
    const x = 15 + Math.random() * 65;
    const z = 15 + Math.random() * 65;

    this.crates.push({
      id: `crate_${Date.now()}`,
      type,
      x,
      y: 26,
      z,
      vy: -1.8,
      onGround: false,
    });
  }

  spawnProjectile(p) {
    p.id = `proj_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    p.active = true;
    this.projectiles.push(p);

    // Track projectile with camera
    this.cameraMode = 'projectile';
    this.trackedProjectile = p;
  }

  spawnEntity(e) {
    e.id = `ent_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    if (e.type === 'mina') {
      this.minas.push(e);
    }
  }

  // Main 60Hz Authoritative Loop
  update(dt) {
    if (!this.running || this.phase !== 'MATCH') return;

    // 1. Update Match Clock & Sudden Death
    const clockResult = this.rules.update(dt, {
      onSuddenDeath: () => {
        sound.playTrigger('shoot_shotgun');
        for (const c of this.chickens) {
          c.health = 1;
        }
      },
    });

    if (clockResult?.timeExpired) {
      if (clockResult.state === 'TURN') {
        this.rules.startRetreat();
      } else {
        this.advanceTurn();
      }
    }

    // 2. Update Active Chicken Movement (if player controlled, inputs already applied)
    if (this.activeChicken && this.activeChicken.alive) {
      if (this.activeChicken.isCpu) {
        this.cpuController.update(dt, {
          onAim: (pitch, yaw) => {
            this.aimPitch = pitch;
            this.aimYaw = yaw;
          },
          onCharge: (power) => {
            this.chargingPower = power;
          },
          onFire: (params) => {
            this.handleFire(params.weaponId, params.power, {
              targetX: params.targetX,
              targetZ: params.targetZ,
            });
          },
          onMove: (dir) => {
            this.physics.updateChicken(this.activeChicken, dt, dir, false, false);
          },
        });
      } else {
        // Human input physics
        const moveIn = this.currentMoveInput || { x: 0, z: 0 };
        const jump = this.currentJumpInput || false;
        const backflip = this.currentBackflipInput || false;
        this.currentJumpInput = false;
        this.currentBackflipInput = false;

        this.physics.updateChicken(this.activeChicken, dt, moveIn, jump, backflip);
      }
    }

    // 3. Update Inactive Chickens (falling, gravity, water)
    for (const c of this.chickens) {
      if (c !== this.activeChicken && c.alive) {
        this.physics.updateChicken(c, dt, { x: 0, z: 0 }, false, false);
      }
    }

    // 4. Update Supply Crates
    for (let i = this.crates.length - 1; i >= 0; i--) {
      const cr = this.crates[i];
      if (!cr.onGround) {
        cr.y += cr.vy * dt;
        if (this.physics.isSolid(cr.x, cr.y, cr.z)) {
          cr.y = Math.ceil(cr.y);
          cr.onGround = true;
          sound.playBounce();
        }
      }

      // Check chicken pickup
      for (const ch of this.chickens) {
        if (!ch.alive) continue;
        const d = Math.hypot(ch.x - cr.x, ch.y - cr.y, ch.z - cr.z);
        if (d < 1.4) {
          // Pickup crate
          if (cr.type === 'health') {
            ch.health = Math.min(ch.maxHealth, ch.health + 25);
            this.onDamageText(ch.x, ch.y, ch.z, '+25 HP');
          } else {
            // Weapon / utility ammo
            const inv = this.inventory[ch.teamId];
            if (inv) inv['huevo_oro'] = (inv['huevo_oro'] || 0) + 1;
            this.onDamageText(ch.x, ch.y, ch.z, '+1 Arma');
          }
          sound.playBounce();
          this.crates.splice(i, 1);
          break;
        }
      }
    }

    // 5. Update Projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      const result = this.physics.updateProjectile(p, dt, this.rules.wind);

      if (result?.explode) {
        this.triggerExplosion(result.x, result.y, result.z, p.radius, p.damage, p.impulse);

        // If cluster bomb (Maíz Pira), spawn popcorn cluster projectiles
        if (p.isCluster) {
          for (let c = 0; c < 5; c++) {
            const angle = (c / 5) * Math.PI * 2;
            this.spawnProjectile({
              type: 'maiz_pira_pop',
              x: result.x,
              y: result.y + 0.5,
              z: result.z,
              vx: Math.cos(angle) * 7,
              vy: 10 + Math.random() * 4,
              vz: Math.sin(angle) * 7,
              bounce: true,
              damage: 25,
              radius: 2.2,
              impulse: 12,
              timer: 1.2,
            });
          }
        }

        this.projectiles.splice(i, 1);
        this.trackedProjectile = null;
        this.cameraMode = 'follow';
      } else if (result?.waterSplash) {
        sound.playSplash();
        this.projectiles.splice(i, 1);
        this.trackedProjectile = null;
        this.cameraMode = 'follow';
      } else if (result?.bounce) {
        sound.playBounce();
      }
    }

    // 6. Broadcast Snapshot (~25Hz) to players with view
    this.snapTimer += dt;
    if (this.snapTimer >= 0.04) {
      this.snapTimer = 0;
      this.broadcastSnapshot();
    }

    // 7. Check for match victory / defeat
    this.evaluateVictory();
  }

  triggerExplosion(x, y, z, radius, maxDamage, maxImpulse) {
    sound.playExplosion();
    const { carveEvent, affected } = this.physics.explode(x, y, z, radius, maxDamage, maxImpulse, this.chickens);

    // Broadcast carve event to view clients
    this.net.broadcastView({ t: 'carve', ...carveEvent });
    this.onExplosion(x, y, z, radius);

    // Show floating damage numbers & play hurt chirps
    for (const aff of affected) {
      this.onDamageText(aff.x, aff.y, aff.z, aff.damage);
      playSynthesizedChirp(sound.ctx, 1.0, 'hurt');

      const ch = this.chickens.find((c) => c.id === aff.id);
      if (ch && !ch.alive) {
        const quote = getRandomQuote('hurt');
        this.onSay(ch.name, quote);
      }
    }
  }

  handleFire(weaponId, power = 1.0, options = {}) {
    if (!this.activeChicken || !this.activeChicken.alive) return;

    // Deduct ammo from inventory
    const inv = this.inventory[this.activeTeamId];
    if (inv && inv[weaponId] !== undefined) {
      if (inv[weaponId] !== Infinity) {
        if (inv[weaponId] <= 0) return; // No ammo
        inv[weaponId]--;
      }
    }

    const res = this.weaponManager.fire(
      this.activeChicken,
      weaponId,
      this.aimPitch,
      this.aimYaw,
      power,
      {
        ...options,
        entities: this.chickens,
      }
    );

    if (res.endsTurn) {
      this.rules.startRetreat();
    }
  }

  handleControllerAction(slot, action) {
    const player = this.players.find((p) => p.slot === slot);
    if (!player) return;

    // Cutscene controls
    if (this.phase === 'CINEMATIC') {
      if (action.type === 'cnext') this.cinema?.next();
      else if (action.type === 'cskip' && player.isJ1) this.cinema?.skip();
      return;
    }

    // Only apply if it is this player's active turn
    if (player.teamId !== this.activeTeamId) return;

    if (action.type === 'fire') {
      this.handleFire(action.weaponId || this.selectedWeapon, action.power || 1.0, action.options);
    } else if (action.type === 'jump') {
      this.currentJumpInput = true;
    } else if (action.type === 'backflip') {
      this.currentBackflipInput = true;
    } else if (action.type === 'weapon') {
      this.selectedWeapon = action.weaponId;
    } else if (action.type === 'camera') {
      this.cameraMode = this.cameraMode === 'overview' ? 'follow' : 'overview';
    } else if (action.type === 'aim_mode') {
      this.cameraMode = this.cameraMode === 'aim' ? 'follow' : 'aim';
    }
  }

  handleControllerInput(slot, input) {
    const player = this.players.find((p) => p.slot === slot);
    if (!player || player.teamId !== this.activeTeamId) return;

    this.currentMoveInput = { x: input.x || 0, z: input.z || 0 };
    if (input.aimPitch !== undefined) this.aimPitch = input.aimPitch;
    if (input.aimYaw !== undefined) this.aimYaw = input.aimYaw;
  }

  broadcastSnapshot() {
    this.net.broadcastView({
      t: 'snap',
      seq: Date.now(),
      chickens: this.chickens.map((c) => ({
        id: c.id,
        name: c.name,
        teamId: c.teamId,
        teamColor: c.teamColor,
        accessory: c.accessory,
        x: Math.round(c.x * 100) / 100,
        y: Math.round(c.y * 100) / 100,
        z: Math.round(c.z * 100) / 100,
        rotation: Math.round((c.rotation || 0) * 100) / 100,
        health: c.health,
        alive: c.alive,
        isWalking: Math.abs(c.vx) > 0.1 || Math.abs(c.vz) > 0.1,
      })),
      projectiles: this.projectiles.map((p) => ({
        id: p.id,
        type: p.type,
        x: p.x,
        y: p.y,
        z: p.z,
        vx: p.vx,
        vz: p.vz,
      })),
      crates: this.crates,
      activeChickenId: this.activeChicken?.id,
      camMode: this.cameraMode,
      aimPitch: this.aimPitch,
      aimYaw: this.aimYaw,
      wind: this.rules?.wind,
    });
  }

  evaluateVictory() {
    if (!this.rules) return;
    const result = this.rules.checkVictory(this.teams, this.chickens, this.currentLevelData);

    if (result?.gameOver) {
      this.phase = 'RESULTS';
      this.net.broadcast({
        t: 'phase',
        phase: 'RESULTS',
        winnerTeamId: result.winnerTeamId,
        teamName: result.teamName,
        reason: result.reason,
      });
      sound.startMusic(result.victory ? 'victory' : 'defeat');
      this.onStateChange({ phase: 'RESULTS', result });
    }
  }

  destroy() {
    this.running = false;
    sound.stopMusic();
  }
}
