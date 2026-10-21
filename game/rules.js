// game/rules.js - Match rules, turn rotation, wind, supply crates, sudden death, and victory conditions

export class MatchRules {
  constructor(config = {}) {
    this.config = {
      mode: config.mode || 'versus', // versus, coop, historia
      turnTime: config.turnTime || 45,
      retreatTime: config.retreatTime || 5,
      initialHealth: config.initialHealth || 100,
      chickensPerTeam: config.chickensPerTeam || 4,
      suddenDeathMinutes: config.suddenDeathMinutes || 10,
      friendlyFire: config.friendlyFire || false,
      sharedTeams: config.sharedTeams || false,
      ...config,
    };

    this.roundNumber = 1;
    this.turnIndex = 0; // index in team order
    this.teamOrder = []; // array of teamIds
    this.teamTurnCounters = {}; // teamId -> chicken index
    this.state = 'TURN'; // 'TURN', 'RETREAT', 'INTERMISSION', 'GAMEOVER'
    this.clock = this.config.turnTime;
    this.totalMatchTime = 0;
    this.suddenDeathActive = false;
    this.wind = { x: 0, z: 0, strength: 0 };
    this.generateNewWind();
  }

  generateNewWind() {
    // Wind between -3.5 and +3.5
    const angle = Math.random() * Math.PI * 2;
    const strength = (Math.random() * 3.5);
    this.wind = {
      x: Math.cos(angle) * strength,
      z: Math.sin(angle) * strength,
      strength: Math.round(strength * 10) / 10,
      angle: Math.round(angle * 100) / 100,
    };
  }

  setupTeams(teams) {
    this.teamOrder = teams.map((t) => t.id);
    this.teamTurnCounters = {};
    for (const t of teams) {
      this.teamTurnCounters[t.id] = 0;
    }
  }

  update(dt, matchState) {
    this.totalMatchTime += dt;

    // Check sudden death trigger
    if (!this.suddenDeathActive && this.totalMatchTime >= this.config.suddenDeathMinutes * 60) {
      this.suddenDeathActive = true;
      if (matchState.onSuddenDeath) {
        matchState.onSuddenDeath();
      }
    }

    if (this.state === 'TURN' || this.state === 'RETREAT') {
      this.clock = Math.max(0, this.clock - dt);
      if (this.clock <= 0) {
        return { timeExpired: true, state: this.state };
      }
    }

    return null;
  }

  startRetreat() {
    this.state = 'RETREAT';
    this.clock = this.config.retreatTime;
  }

  getNextActiveChicken(teams, chickens) {
    if (this.teamOrder.length === 0) return null;

    let attempts = 0;
    while (attempts < this.teamOrder.length) {
      const teamId = this.teamOrder[this.turnIndex % this.teamOrder.length];
      const livingChickens = chickens.filter((c) => c.teamId === teamId && c.alive);

      if (livingChickens.length > 0) {
        const chickenIdx = (this.teamTurnCounters[teamId] || 0) % livingChickens.length;
        const selected = livingChickens[chickenIdx];
        this.teamTurnCounters[teamId] = chickenIdx + 1;
        return { teamId, chicken: selected };
      }

      this.turnIndex++;
      attempts++;
    }

    return null;
  }

  advanceTurn() {
    this.turnIndex++;
    this.state = 'TURN';
    this.clock = this.config.turnTime;
    this.generateNewWind();

    if (this.turnIndex % Math.max(1, this.teamOrder.length) === 0) {
      this.roundNumber++;
      return { newRound: true, round: this.roundNumber };
    }
    return { newRound: false, round: this.roundNumber };
  }

  checkVictory(teams, chickens, storyObjective = null) {
    // 1. Story mode victory check
    if (this.config.mode === 'historia' && storyObjective) {
      const livingPlayers = chickens.filter((c) => c.isPlayer && c.alive);
      if (livingPlayers.length === 0) {
        return { gameOver: true, winnerTeamId: null, victory: false, reason: '¡Todos los pollitos cayeron en combate!' };
      }

      if (storyObjective.type === 'eliminate') {
        const enemiesAlive = chickens.filter((c) => !c.isPlayer && c.alive);
        if (enemiesAlive.length === 0) {
          return { gameOver: true, winnerTeamId: 'players', victory: true, reason: '¡Despejado! Has derrotado a los pollitos de lata.' };
        }
      } else if (storyObjective.type === 'boss_rufo') {
        const boss = chickens.find((c) => c.id === 'boss_rufo');
        if (!boss || !boss.alive) {
          return { gameOver: true, winnerTeamId: 'players', victory: true, reason: '¡Derrotaste a Rufo y recuperaste el Huevo Dorado!' };
        }
      }
      return null;
    }

    // 2. Cooperative mode check
    if (this.config.mode === 'coop') {
      const livingHumans = chickens.filter((c) => !c.isCpu && c.alive);
      const livingCpu = chickens.filter((c) => c.isCpu && c.alive);

      if (livingHumans.length === 0) {
        return { gameOver: true, winnerTeamId: 'cpu', victory: false, reason: '¡La CPU ha derrotado al equipo humano!' };
      }
      if (livingCpu.length === 0) {
        return { gameOver: true, winnerTeamId: 'humans', victory: true, reason: '¡Victoria! Los humanos vencieron a las máquinas.' };
      }
      return null;
    }

    // 3. Versus mode check
    const livingTeams = new Set();
    for (const c of chickens) {
      if (c.alive) {
        livingTeams.add(c.teamId);
      }
    }

    if (livingTeams.size === 1) {
      const winnerId = [...livingTeams][0];
      const teamObj = teams.find((t) => t.id === winnerId);
      return {
        gameOver: true,
        winnerTeamId: winnerId,
        teamName: teamObj?.name || winnerId,
        reason: `¡El equipo ${teamObj?.name || winnerId} es el último en pie!`,
      };
    } else if (livingTeams.size === 0) {
      return {
        gameOver: true,
        winnerTeamId: null,
        reason: '¡Empate absoluto! Todos cayeron al sancocho.',
      };
    }

    return null;
  }
}
