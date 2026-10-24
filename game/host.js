// Motor del anfitrión (pantalla principal o celular de J1): red, lobby, equipos y partida
import {
  PEER_PREFIX, CODE_CHARS, MAX_PLAYERS, TEAM_COLORS, TEAM_NAMES, CPU_TEAM_NAMES, CHICKEN_NAMES, ROBOT_NAMES,
  ACCESSORIES, DEFAULT_CFG, ISLANDS, RANDOM_ISLAND, MODES, TEAM_MODES, CPU_LEVELS, TURN_TIMES, HP_OPTIONS,
  CHICKEN_COUNTS, SUDDEN_OPTIONS, QUALITY, WEAPONS, WEAPON_SETS, sensRad,
} from './constants.js';
import { Match } from './match.js';
import { CpuBrain } from './ai.js';
import { Renderer } from './render.js';
import { Audio, MENU_SONG } from './audio.js';
import { islandTheme } from './islands.js';
import { peerOptionsFromURL } from './peeropts.js';

const STEP = 1 / 60;
const DEFAULT_ACC = ['casco', 'vueltiao', 'gorra', 'corona'];
const SFX_FX = new Set(['boom', 'splash']);

function randCode() {
  let s = '';
  for (let i = 0; i < 5; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return s;
}
function shuffle(a) { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; }
function loadCfg() {
  try { const c = JSON.parse(localStorage.getItem('fc_cfg') || 'null'); if (c && typeof c === 'object') return { ...DEFAULT_CFG, ...c }; } catch (e) { /* nada */ }
  return { ...DEFAULT_CFG };
}

// teclado del PC para un jugador
const KEYS = {
  up: ['KeyW', 'ArrowUp'], down: ['KeyS', 'ArrowDown'], left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'],
  fire: ['Space'], jump: ['KeyJ', 'Enter', 'NumpadEnter'], back: ['KeyK', 'Backspace'], next: ['KeyE', 'Tab'], prev: ['KeyQ'],
  aim: ['KeyR'], view: ['KeyC'],
};

export class GameHost {
  constructor(container, onChange) {
    this.container = container;
    this.onChange = onChange;
    this.cfg = loadCfg();
    this.touch = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    this.renderer = new Renderer(container, { quality: this.cfg.quality, phone: this.touch });
    this.audio = new Audio();
    this.players = [null, null, null, null];
    this.phase = 'lobby';
    this.code = null;
    this.peerStatus = 'connecting';
    this.peerError = '';
    this.conns = new Map();
    this.phoneIn = {};
    this.localSlot = null;
    this.localIn = { mx: 0, my: 0, fire: false, jumpHeld: false };
    this.keys = new Set();
    this.mouseLocked = false;
    this.mouseFire = false;
    this.paused = false;
    this.match = null;
    this.brains = [];
    this.demo = null;
    this.results = null;
    this.banner = null;
    this.sentEdits = 0;
    this.snapT = 0; this.infoT = 0; this.uiT = 0;
    this.lastInfo = {};
    this.pendingFx = [];
    this.running = true;
    this.acc = 0;
    this.last = performance.now();
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onWheel = this.onWheel.bind(this);
    this.onCtx = (e) => { if (this.phase === 'match') e.preventDefault(); };
    this.onPtrLock = () => { if (typeof document !== 'undefined' && document.pointerLockElement !== this.renderer.canvas) this.mouseFire = false; };
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('mousemove', this.onMouseMove);
    this.renderer.canvas.addEventListener('mousedown', this.onMouseDown);
    this.renderer.canvas.addEventListener('wheel', this.onWheel, { passive: false });
    this.renderer.canvas.addEventListener('contextmenu', this.onCtx);
    document.addEventListener('pointerlockchange', this.onPtrLock);
    this.onVis = () => { if (document.hidden && this.phase === 'match' && !this.paused) this.togglePause(); };
    document.addEventListener('visibilitychange', this.onVis);
    if (typeof window !== 'undefined') window.__fcHost = this;
    this.startDemo();
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
    this.initPeer();
  }

  destroy() {
    this.running = false;
    if (typeof window !== 'undefined' && window.__fcHost === this) window.__fcHost = null;
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('mousemove', this.onMouseMove);
    this.renderer.canvas.removeEventListener('mousedown', this.onMouseDown);
    this.renderer.canvas.removeEventListener('wheel', this.onWheel);
    this.renderer.canvas.removeEventListener('contextmenu', this.onCtx);
    document.removeEventListener('pointerlockchange', this.onPtrLock);
    document.removeEventListener('visibilitychange', this.onVis);
    this.audio.stopSong();
    try { this.peer && this.peer.destroy(); } catch (e) { /* nada */ }
    this.renderer.dispose();
  }

  // ---------------- estado para React ----------------
  snapshot() {
    const m = this.match;
    return {
      phase: this.phase, code: this.code, peerStatus: this.peerStatus, peerError: this.peerError,
      players: this.players.map((p) => p && { slot: p.slot, kind: p.kind, color: p.color, acc: p.acc, teamName: p.teamName, names: p.names, team: p.team, connected: p.connected }),
      cfg: { ...this.cfg }, local: this.localSlot, touch: this.touch, hostSlot: this.hostSlot(),
      paused: this.paused, muted: this.audio.muted,
      turn: m ? m.turnInfo() : null, teams: m ? m.teamSummary() : null, matchPhase: m ? m.phase : null,
      wind: m ? m.wind : null, camYaw: this.renderer.camYaw, banner: this.banner, results: this.results,
      island: m ? islandTheme(m.island).name : '', suddenIn: m ? Math.max(0, Math.ceil(m.cfg.sudden * 60 - m.time)) : 0, sudden: m ? m.sudden : false,
      demoIsland: this.demo ? this.demo.island : null,
      localTurn: m && m.turn && this.localSlot !== null && m.turn.slot === this.localSlot && !m.turn.cpu,
      kbTurn: m && m.turn && m.turn.slot !== null && this.players[m.turn.slot] && this.players[m.turn.slot].kind === 'kb',
    };
  }
  changed() { this.onChange && this.onChange(this.snapshot()); }

  // ---------------- red ----------------
  async initPeer() {
    let code = null;
    try { code = sessionStorage.getItem('fc_code'); } catch (e) { /* nada */ }
    if (!code) code = randCode();
    this.code = code;
    try { sessionStorage.setItem('fc_code', code); } catch (e) { /* nada */ }
    this.changed();
    let PeerCls;
    try { PeerCls = (await import('peerjs')).Peer; } catch (e) { this.peerStatus = 'error'; this.peerError = 'No se pudo cargar la conexión'; this.changed(); return; }
    const open = () => {
      const peer = new PeerCls(PEER_PREFIX + this.code, peerOptionsFromURL());
      this.peer = peer;
      peer.on('open', () => { this.peerStatus = 'ready'; this.peerError = ''; this.changed(); });
      peer.on('connection', (conn) => this.handleConn(conn));
      peer.on('disconnected', () => { this.peerStatus = 'connecting'; this.changed(); setTimeout(() => { try { if (!peer.destroyed) peer.reconnect(); } catch (e) { /* nada */ } }, 1500); });
      peer.on('error', (err) => {
        if (err.type === 'unavailable-id') {
          try { peer.destroy(); } catch (e) { /* nada */ }
          this.code = randCode();
          try { sessionStorage.setItem('fc_code', this.code); } catch (e) { /* nada */ }
          this.changed();
          setTimeout(open, 300);
        } else if (['network', 'server-error', 'socket-error', 'socket-closed'].includes(err.type)) {
          this.peerStatus = 'error'; this.peerError = 'Sin conexión con el servidor de mandos. Reintentando...'; this.changed();
          setTimeout(() => { try { if (!peer.destroyed) peer.reconnect(); } catch (e) { /* nada */ } }, 3000);
        } else if (err.type !== 'peer-unavailable') {
          this.peerError = String(err.type || err.message || err); this.changed();
        }
      });
    };
    open();
  }

  handleConn(conn) {
    conn.on('data', (msg) => this.onMsg(conn, msg));
    conn.on('close', () => this.dropConn(conn));
    conn.on('error', () => this.dropConn(conn));
  }

  dropConn(conn) {
    const slot = this.conns.get(conn);
    this.conns.delete(conn);
    if (slot === undefined) return;
    const p = this.players[slot];
    if (p && p.conn === conn) {
      p.connected = false; p.conn = null; p.view = false;
      if (this.phase === 'lobby') this.players[slot] = null;
      this.broadcastLobby(); this.changed();
    }
  }

  send(slot, msg) {
    const p = this.players[slot];
    if (p && p.conn && p.conn.open) { try { p.conn.send(msg); } catch (e) { /* nada */ } }
  }
  broadcast(fn) { this.players.forEach((p, i) => { if (p && p.kind === 'phone') this.send(i, typeof fn === 'function' ? fn(i) : fn); }); }
  viewers() { return this.players.filter((p) => p && p.kind === 'phone' && p.connected && p.view); }

  hostSlot() {
    if (this.localSlot !== null) return this.localSlot;
    return this.players.findIndex((p) => p && (p.kind === 'phone' || p.kind === 'kb') && p.connected);
  }

  // ---------------- jugadores ----------------
  newPlayer(slot, kind, extra = {}) {
    const usedColors = new Set(this.players.filter(Boolean).map((p) => p.color));
    const color = [0, 1, 2, 3, 5, 6].find((c) => !usedColors.has(c)) ?? slot;
    const usedNames = new Set(this.players.filter(Boolean).map((p) => p.teamName));
    const teamName = shuffle(TEAM_NAMES).find((n) => !usedNames.has(n)) || TEAM_NAMES[slot];
    return { slot, kind, connected: true, color, acc: DEFAULT_ACC[slot], teamName, names: shuffle(CHICKEN_NAMES).slice(0, 4), team: slot % 2, view: false, ...extra };
  }

  addLocal() {
    if (this.localSlot !== null || this.phase !== 'lobby') return;
    let slot = this.players[0] ? this.players.findIndex((p) => !p) : 0;
    if (slot < 0) return;
    if (slot === 0 && this.players[0]) return;
    this.players[slot] = this.newPlayer(slot, 'local');
    this.localSlot = slot;
    this.audio.init();
    this.audio.sfx('join');
    this.broadcastLobby(); this.changed();
  }

  removePlayer(slot) {
    if (this.phase !== 'lobby') return;
    const p = this.players[slot];
    if (!p) return;
    if (p.conn) {
      const c = p.conn;
      try { c.send({ t: 'kicked' }); } catch (e) { /* nada */ }
      this.conns.delete(c);
      setTimeout(() => { try { c.close(); } catch (e) { /* nada */ } }, 300);
    }
    this.players[slot] = null;
    if (slot === this.localSlot) this.localSlot = null;
    this.broadcastLobby(); this.changed();
  }

  pick(slot, msg) {
    const p = this.players[slot];
    if (!p || this.phase !== 'lobby') return;
    if (Number.isInteger(msg.color) && TEAM_COLORS[msg.color] && msg.color !== 4 && !this.players.some((o) => o && o !== p && o.color === msg.color)) p.color = msg.color;
    if (msg.acc && ACCESSORIES.some((a) => a.id === msg.acc)) p.acc = msg.acc;
    if (typeof msg.teamName === 'string' && msg.teamName.trim()) p.teamName = msg.teamName.trim().slice(0, 20);
    if (Array.isArray(msg.names)) p.names = p.names.map((n, i) => (typeof msg.names[i] === 'string' && msg.names[i].trim() ? msg.names[i].trim().slice(0, 12) : n));
    if (Number.isInteger(msg.team) && msg.team >= 0 && msg.team < 4) p.team = msg.team;
    this.audio.sfx('select');
    this.broadcastLobby(); this.changed();
  }

  lobbyMsg(slot) {
    return {
      t: 'lobby', you: slot, host: this.hostSlot() === slot, phase: this.phase, noScreen: this.localSlot !== null,
      players: this.players.map((p) => p && { kind: p.kind, color: p.color, acc: p.acc, teamName: p.teamName, names: p.names, team: p.team, connected: p.connected }),
      cfg: this.cfg,
    };
  }
  broadcastLobby() { this.broadcast((i) => this.lobbyMsg(i)); }

  setCfg(c) {
    const cfg = this.cfg;
    if (MODES.some((m) => m.id === c.mode)) cfg.mode = c.mode;
    if (TEAM_MODES.some((m) => m.id === c.teamMode)) cfg.teamMode = c.teamMode;
    if (CHICKEN_COUNTS.includes(c.chickens)) cfg.chickens = c.chickens;
    if (HP_OPTIONS.includes(c.hp)) cfg.hp = c.hp;
    if (TURN_TIMES.includes(c.turnTime)) cfg.turnTime = c.turnTime;
    if (WEAPON_SETS.some((w) => w.id === c.weaponSet)) cfg.weaponSet = c.weaponSet;
    const prevIsland = cfg.island;
    if (c.island === RANDOM_ISLAND || ISLANDS.some((i) => i.id === c.island)) cfg.island = c.island;
    if (this.phase === 'lobby' && c.island && (cfg.island !== prevIsland || (cfg.island !== RANDOM_ISLAND && (!this.demo || this.demo.island !== cfg.island)))) {
      this.startDemo(cfg.island === RANDOM_ISLAND ? null : cfg.island);
    }
    if (SUDDEN_OPTIONS.includes(c.sudden)) cfg.sudden = c.sudden;
    if (Number.isInteger(c.cpuTeams) && c.cpuTeams >= 0 && c.cpuTeams <= 3) cfg.cpuTeams = c.cpuTeams;
    if (CPU_LEVELS.some((l) => l.id === c.cpuLevel)) cfg.cpuLevel = c.cpuLevel;
    if (typeof c.friendly === 'boolean') cfg.friendly = c.friendly;
    if (QUALITY.some((q) => q.id === c.quality) && c.quality !== cfg.quality) { cfg.quality = c.quality; this.renderer.quality = c.quality; this.renderer.resize(); }
    try { localStorage.setItem('fc_cfg', JSON.stringify(cfg)); } catch (e) { /* nada */ }
    this.audio.sfx('select');
    this.broadcastLobby(); this.changed();
  }

  // ---------------- mensajes de los celulares ----------------
  onMsg(conn, msg) {
    if (!msg || typeof msg !== 'object') return;
    if (msg.t === 'hello') {
      let slot = this.players.findIndex((p) => p && p.kind === 'phone' && p.pid === msg.pid);
      if (slot < 0) {
        if (this.phase !== 'lobby') { try { conn.send({ t: 'busy' }); } catch (e) { /* nada */ } return; }
        slot = this.players.findIndex((p) => !p);
        if (slot < 0) { try { conn.send({ t: 'full' }); } catch (e) { /* nada */ } return; }
        this.players[slot] = this.newPlayer(slot, 'phone', { pid: msg.pid, conn });
        this.audio.sfx('join');
      } else {
        const p = this.players[slot];
        if (p.conn && p.conn !== conn) { try { p.conn.close(); } catch (e) { /* nada */ } this.conns.delete(p.conn); }
        p.conn = conn; p.connected = true;
      }
      this.conns.set(conn, slot);
      try { conn.send({ t: 'welcome', slot }); } catch (e) { /* nada */ }
      this.broadcastLobby();
      this.send(slot, this.phaseMsg());
      this.lastInfo[slot] = '';
      this.changed();
      return;
    }
    const slot = this.conns.get(conn);
    if (slot === undefined) return;
    const p = this.players[slot];
    if (!p) return;
    const isHost = this.hostSlot() === slot;
    switch (msg.t) {
      case 'in': this.phoneIn[slot] = { mx: +msg.mx || 0, my: +msg.my || 0, fire: !!msg.fire, jumpHeld: !!msg.jh }; break;
      case 'aimd': this.playerAim(slot, msg.dyaw, msg.dpitch); break;
      case 'act': this.playerAct(slot, msg.a || {}); break;
      case 'pick': this.pick(slot, msg); break;
      case 'cfg': if (isHost && this.phase === 'lobby') this.setCfg(msg.cfg || {}); break;
      case 'start': if (isHost) this.startMatch(); break;
      case 'next': if (isHost) this.next(msg.v); break;
      case 'quit': if (isHost) this.quit(); break;
      case 'pause': if (this.phase === 'match') this.togglePause(); break;
      case 'view':
        p.view = !!msg.on;
        if (p.view && this.match) this.send(slot, this.initMsg());
        break;
      case 'resync': if (this.match) this.send(slot, { t: 'edit', from: 0, list: this.match.terrain.edits, reset: true }); break;
      case 'react': if (this.match && typeof msg.e === 'string') this.react(slot, msg.e.slice(0, 4)); break;
      default: break;
    }
  }

  playerAct(slot, a) {
    const m = this.match;
    if (!m || this.paused || !m.turn || m.turn.cpu || m.turn.slot !== slot) return;
    if (['jump', 'back', 'weapon', 'fuse', 'aim', 'view', 'surrender'].includes(a.t)) m.act(a);
  }

  playerAim(slot, dyaw, dpitch) {
    const m = this.match;
    if (!m || this.paused || !m.turn || m.turn.cpu || m.turn.slot !== slot) return;
    m.aimDelta(dyaw, dpitch);
  }

  react(slot, e) {
    const m = this.match;
    const team = m.teams.find((t) => t.slots.includes(slot));
    if (!team) return;
    const ch = m.chickens.find((c) => c.team === team.idx && c.alive);
    if (!ch) return;
    this.handleFx({ k: 'react', id: ch.id, e });
  }

  // ---------------- teclado ----------------
  onKeyDown(e) {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT')) return;
    const code = e.code;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab', 'Backspace'].includes(code)) e.preventDefault();
    this.audio.init();
    if (this.phase === 'lobby' && this.audio.song === -1) this.audio.playSong(MENU_SONG);
    const first = !this.keys.has(code);
    this.keys.add(code);
    if (!first) return;
    if (code === 'KeyM') { this.toggleMute(); return; }
    const kbSlot = this.players.findIndex((p) => p && p.kind === 'kb');
    if (this.phase === 'lobby') {
      if (code === 'Space' && kbSlot < 0) {
        const free = this.players.findIndex((p) => !p);
        if (free >= 0) { this.players[free] = this.newPlayer(free, 'kb'); this.audio.sfx('join'); this.broadcastLobby(); this.changed(); }
      } else if (code === 'Enter' || code === 'NumpadEnter') {
        const hs = this.hostSlot();
        const hp = hs >= 0 ? this.players[hs] : null;
        if (hp && (hp.kind === 'local' || hp.kind === 'kb')) this.startMatch();
      }
      return;
    }
    if (this.phase === 'results') { if (code === 'Enter' || code === 'NumpadEnter') this.next('again'); if (code === 'Escape') this.next('lobby'); return; }
    if (this.phase !== 'match') return;
    if (code === 'Escape' && (this.mouseLocked || (typeof document !== 'undefined' && document.pointerLockElement === this.renderer.canvas))) {
      this.mouseLocked = false;
      this.mouseFire = false;
      try { if (document.pointerLockElement) document.exitPointerLock(); } catch (err) { /* nada */ }
      return;
    }
    if (code === 'Escape' || code === 'KeyP') { this.togglePause(); return; }
    const m = this.match;
    if (!m || !m.turn || m.turn.cpu || this.paused) return;
    const p = this.players[m.turn.slot];
    if (!p || p.kind !== 'kb') return;
    const has = (k) => KEYS[k].includes(code);
    if (has('jump')) m.act({ t: 'jump' });
    else if (has('back')) m.act({ t: 'back' });
    else if (has('aim')) m.act({ t: 'aim' });
    else if (has('view')) m.act({ t: 'view' });
    else if (has('next') || has('prev')) this.cycleWeapon(has('next') ? 1 : -1);
    else if (/^Digit[1-5]$/.test(code)) m.act({ t: 'fuse', v: +code.slice(5) });
  }
  onKeyUp(e) { this.keys.delete(e.code); }

  cycleWeapon(d) {
    const m = this.match, T = m.turn;
    const inv = m.teams[T.team].inv;
    const list = WEAPONS.filter((w) => inv[w.id] !== 0 && w.id !== 'rendirse');
    let i = list.findIndex((w) => w.id === T.weapon);
    i = (i + d + list.length) % list.length;
    m.act({ t: 'weapon', w: list[i].id });
  }

  kbInput() {
    const k = this.keys, any = (n) => KEYS[n].some((c) => k.has(c));
    return { mx: (any('right') ? 1 : 0) - (any('left') ? 1 : 0), my: (any('up') ? 1 : 0) - (any('down') ? 1 : 0), fire: any('fire') || this.mouseFire, jumpHeld: any('jump') };
  }

  isKbTurn() {
    const m = this.match;
    if (this.phase !== 'match' || this.paused || !m || !m.turn || m.turn.cpu) return false;
    const p = this.players[m.turn.slot];
    return !!(p && p.kind === 'kb');
  }

  mouseSensCfg() {
    try {
      const c = JSON.parse(localStorage.getItem('fc_ctrl') || 'null') || {};
      return { rad: sensRad(c.sens || 'media'), invertY: !!c.invertY };
    } catch (e) { return { rad: 0.004, invertY: false }; }
  }

  onMouseDown(e) {
    if (!this.isKbTurn()) return;
    this.audio.init();
    const hasLock = typeof document !== 'undefined' && document.pointerLockElement === this.renderer.canvas;
    if (e.button === 2) {
      e.preventDefault();
      this.mouseLocked = true;
      this.lastMouse = { x: e.clientX, y: e.clientY };
      try { this.renderer.canvas.requestPointerLock?.(); } catch (err) { /* nada */ }
      this.match.act({ t: 'aim' });
    } else if (e.button === 0) {
      if (!this.mouseLocked && !hasLock) {
        this.mouseLocked = true;
        this.lastMouse = { x: e.clientX, y: e.clientY };
        try { this.renderer.canvas.requestPointerLock?.(); } catch (err) { /* nada */ }
        return;
      }
      this.mouseFire = true;
    }
  }

  onMouseUp(e) {
    if (e.button === 0) this.mouseFire = false;
  }

  onMouseMove(e) {
    if (!this.isKbTurn()) return;
    const hasLock = typeof document !== 'undefined' && document.pointerLockElement === this.renderer.canvas;
    if (!this.mouseLocked && !hasLock) return;
    const dx = hasLock ? (e.movementX || 0) : (this.lastMouse ? e.clientX - this.lastMouse.x : (e.movementX || 0));
    const dy = hasLock ? (e.movementY || 0) : (this.lastMouse ? e.clientY - this.lastMouse.y : (e.movementY || 0));
    this.lastMouse = { x: e.clientX, y: e.clientY };
    if (!dx && !dy) return;
    const { rad, invertY } = this.mouseSensCfg();
    this.match.aimDelta(dx * rad, -dy * rad * (invertY ? -1 : 1));
  }

  onWheel(e) {
    if (!this.isKbTurn()) return;
    if (e.deltaY !== 0) {
      e.preventDefault();
      this.cycleWeapon(e.deltaY > 0 ? 1 : -1);
    }
  }

  // jugador en el mismo dispositivo (celular que crea la sala)
  setLocalIn(inp) { this.localIn = inp; }
  localAct(a) { if (this.localSlot !== null) this.playerAct(this.localSlot, a); }
  localAim(dyaw, dpitch) { if (this.localSlot !== null) this.playerAim(this.localSlot, dyaw, dpitch); }
  kbAct(a) { if (this.isKbTurn()) this.playerAct(this.match.turn.slot, a); }

  toggleMute() { this.audio.setMuted(!this.audio.muted); this.changed(); }

  togglePause() {
    if (this.phase !== 'match') return;
    this.paused = !this.paused;
    this.broadcast({ t: 'paused', v: this.paused });
    this.changed();
  }

  // ---------------- demo de fondo en el lobby ----------------
  startDemo(forceIsland) {
    const ids = ISLANDS.map((i) => i.id);
    const preferred = forceIsland || (this.cfg && this.cfg.island !== RANDOM_ISLAND ? this.cfg.island : null);
    const island = preferred && ids.includes(preferred) ? preferred : ids[Math.floor(Math.random() * ids.length)];
    const teams = [0, 1].map((i) => ({
      id: 'd' + i, name: CPU_TEAM_NAMES[i], color: TEAM_COLORS[i].hex, dark: TEAM_COLORS[i].dark, acc: DEFAULT_ACC[i], robot: i === 1,
      cpu: 1, slots: [], alliance: 'd' + i, names: shuffle(i ? ROBOT_NAMES : CHICKEN_NAMES).slice(0, 3),
    }));
    this.demo = new Match({ cfg: { ...DEFAULT_CFG, chickens: 3, turnTime: 30, sudden: 4 }, teams, seed: Math.floor(Math.random() * 1e9), island });
    this.demoBrains = teams.map(() => new CpuBrain(this.demo, 1));
    this.demoTurn = null;
    this.setWorldFrom(this.demo);
  }

  setWorldFrom(m) {
    this.renderer.setWorld(m.terrain, m.teams.map((t) => ({ color: t.color, dark: t.dark, acc: t.acc, robot: t.robot })), m.chickens.map((c) => ({ id: c.id, team: c.team, name: c.name })));
  }

  // ---------------- partida ----------------
  buildTeams() {
    const cfg = this.cfg;
    const humans = this.players.filter((p) => p && (p.connected || p.kind === 'local' || p.kind === 'kb'));
    const teams = [];
    const coop = cfg.mode === 'coop';
    if (cfg.teamMode === 'shared' && humans.length > 1) {
      const groups = coop ? [humans] : [0, 1, 2, 3].map((g) => humans.filter((p) => p.team === g)).filter((g) => g.length);
      groups.forEach((g, gi) => {
        const colorIdx = coop ? g[0].color : [0, 1, 2, 3][g[0].team];
        const c = TEAM_COLORS[colorIdx];
        const names = [];
        for (let i = 0; i < 4; i++) names.push(g[i % g.length].names[Math.floor(i / g.length)] || CHICKEN_NAMES[i]);
        teams.push({ id: 'h' + gi, name: g.map((p) => p.teamName)[0], color: c.hex, dark: c.dark, acc: g[0].acc, robot: false, cpu: null, slots: g.map((p) => p.slot), alliance: coop ? 'H' : 'h' + gi, names });
      });
    } else {
      humans.forEach((p, i) => {
        const c = TEAM_COLORS[p.color];
        teams.push({ id: 'h' + i, name: p.teamName, color: c.hex, dark: c.dark, acc: p.acc, robot: false, cpu: null, slots: [p.slot], alliance: coop ? 'H' : 'h' + i, names: p.names });
      });
    }
    let cpu = cfg.cpuTeams;
    if (coop || teams.length < 2) cpu = Math.max(1, cpu);
    cpu = Math.min(cpu, 4 - teams.length);
    const cpuColors = [4, 5, 6];
    const robotNames = shuffle(ROBOT_NAMES);
    for (let i = 0; i < cpu; i++) {
      const c = TEAM_COLORS[cpuColors[i]];
      teams.push({ id: 'c' + i, name: CPU_TEAM_NAMES[i], color: c.hex, dark: c.dark, acc: 'casco', robot: true, cpu: cfg.cpuLevel, slots: [], alliance: coop ? 'C' : 'c' + i, names: robotNames.slice(i * 4, i * 4 + 4) });
    }
    return teams.slice(0, 4);
  }

  startMatch() {
    if (this.phase !== 'lobby' && this.phase !== 'results') return;
    const humans = this.players.filter((p) => p && (p.connected || p.kind === 'local' || p.kind === 'kb'));
    if (!humans.length) return;
    this.audio.init();
    const teams = this.buildTeams();
    const island = this.cfg.island === RANDOM_ISLAND ? ISLANDS[Math.floor(Math.random() * ISLANDS.length)].id : this.cfg.island;
    this.match = new Match({ cfg: { ...this.cfg }, teams, seed: Math.floor(Math.random() * 1e9), island });
    this.brains = teams.map((t) => (t.cpu !== null && t.cpu !== undefined ? new CpuBrain(this.match, t.cpu) : null));
    this.curTurn = null;
    this.demo = null;
    this.setWorldFrom(this.match);
    this.sentEdits = 0;
    this.results = null;
    this.banner = { text: '¡A pelear!', sub: islandTheme(island).name, t: 2.6 };
    this.phase = 'match';
    this.paused = false;
    this.lastInfo = {};
    this.audio.playSong(islandTheme(island).song);
    const init = this.initMsg();
    for (const p of this.viewers()) this.send(p.slot, init);
    this.broadcast(() => this.phaseMsg());
    this.broadcastLobby();
    this.changed();
  }

  initMsg() {
    const m = this.match;
    return {
      t: 'minit', seed: m.seed, island: m.island, edits: m.terrain.edits, quality: this.cfg.quality,
      teams: m.teams.map((t) => ({ color: t.color, dark: t.dark, acc: t.acc, robot: t.robot, name: t.name })),
      chickens: m.chickens.map((c) => ({ id: c.id, team: c.team, name: c.name })),
    };
  }

  phaseMsg() {
    return { t: 'phase', phase: this.phase, results: this.results, island: this.match ? islandTheme(this.match.island).name : '', song: this.match ? islandTheme(this.match.island).song : 0 };
  }

  quit() {
    if (this.phase !== 'match') return;
    this.paused = false;
    this.overT = undefined;
    this.phase = 'results';
    this.next('lobby');
  }

  next(v) {
    if (this.phase !== 'results') return;
    if (v === 'again') { this.phase = 'lobby'; this.startMatch(); return; }
    this.phase = 'lobby';
    this.match = null;
    this.results = null;
    this.banner = null;
    this.startDemo();
    this.audio.playSong(MENU_SONG);
    this.broadcast(() => this.phaseMsg());
    this.broadcastLobby();
    this.changed();
  }

  finish() {
    const m = this.match;
    const sum = m.teamSummary();
    const win = m.over ? m.over.alliance : null;
    const winners = sum.filter((t) => t.alliance === win);
    const coop = m.cfg.mode === 'coop';
    let title, sub;
    if (!winners.length) { title = '¡Empate!'; sub = 'No quedó ni una pluma en pie'; }
    else if (coop) { title = win === 'H' ? '¡Victoria!' : '¡Derrota!'; sub = win === 'H' ? 'Los pollitos de lata quedaron hechos chatarra' : 'Los robots se quedaron con la granja'; }
    else { title = `¡Ganó ${winners[0].name}!`; sub = 'Pollo frito para todos los demás'; }
    const st = m.stats;
    const best = (key) => { let b = null; for (const t of m.teams) if (!b || st[t.id][key] > st[b.id][key]) b = t; return b && st[b.id][key] > 0 ? { name: b.name, color: b.color, n: st[b.id][key] } : null; };
    this.results = {
      title, sub, coop, win: win === 'H',
      teams: sum.map((t) => ({ ...t, won: t.alliance === win, ...st[m.teams[t.idx].id] })).sort((a, b) => (b.won ? 1 : 0) - (a.won ? 1 : 0) || b.dmg - a.dmg),
      awards: [
        best('dmg') && { label: 'Más daño', ...best('dmg') },
        best('drown') && { label: 'Más pollitos al agua (propios)', ...best('drown') },
        best('self') && { label: 'Autogol: daño a su propio equipo', ...best('self') },
      ].filter(Boolean),
    };
    this.phase = 'results';
    this.audio.stopSong();
    this.audio.sfx(coop && win !== 'H' ? 'lose' : 'win');
    this.broadcast(() => this.phaseMsg());
    this.changed();
  }

  // ---------------- efectos ----------------
  handleFx(e) {
    const m = this.match;
    switch (e.k) {
      case 'sfx': this.audio.sfx(e.s); break;
      case 'boom': this.audio.sfx('boom', e.r); break;
      case 'say': {
        const ch = m && m.chickens[e.id];
        this.audio.chirp(2 + Math.floor(Math.random() * 3), ch ? 0.85 + ch.team * 0.12 : 1);
        break;
      }
      case 'react': this.audio.sfx('react'); break;
      case 'banner': this.banner = { text: e.text, sub: e.sub, t: 3 }; this.changed(); break;
      case 'turn': {
        const T = m.turn;
        const team = m.teams[e.team];
        this.banner = { text: `Turno de ${team.name}`, sub: m.chickens[e.ch].name, color: team.color, t: 1.8 };
        if (T && !T.cpu && T.slot !== null) this.send(T.slot, { t: 'buzz', ms: [80, 60, 80] });
        if (T && T.cpu && this.brains[e.team]) this.brains[e.team].begin();
        this.changed();
        break;
      }
      case 'dmg': {
        const ch = m && m.chickens[e.id];
        if (ch) { const team = m.teams[ch.team]; for (const s of team.slots) this.send(s, { t: 'buzz', ms: [120] }); }
        break;
      }
      case 'over': this.overT = 2.8; break;
      default: break;
    }
    if (e.k !== 'sfx' && e.k !== 'turn' && e.k !== 'banner' && e.k !== 'over' && e.k !== 'edit') this.renderer.fx(e);
    if (e.k !== 'banner' && e.k !== 'over' && e.k !== 'edit') this.pendingFx.push(e);
  }

  // ---------------- ciclo principal ----------------
  loop(now) {
    if (!this.running) return;
    requestAnimationFrame(this.loop);
    let dt = (now - this.last) / 1000;
    this.last = now;
    if (dt > 0.1) dt = 0.1;
    if (this.phase === 'lobby' && this.demo) this.demoStep(dt);
    else if (this.match) this.matchStep(dt);
    if (this.banner) { this.banner.t -= dt; if (this.banner.t <= 0) { this.banner = null; this.changed(); } }
    const m = this.phase === 'lobby' ? this.demo : this.match;
    if (m) {
      const v = m.view();
      if (this.phase === 'results' || this.phase === 'lobby') v.cam = { m: 'orbit' };
      if (this.phase === 'lobby') v.turn = null;
      this.renderer.draw(v, dt);
    }
  }

  demoStep(dt) {
    const d = this.demo;
    this.acc += dt;
    while (this.acc >= STEP) {
      this.acc -= STEP;
      if (d.turn && d.turn !== this.demoTurn) { this.demoTurn = d.turn; this.demoBrains[d.turn.team].begin(); }
      if (d.turn && (d.phase === 'play' || d.phase === 'retreat')) this.demoBrains[d.turn.team].update(STEP);
      d.update(STEP);
      for (const e of d.fx) if (e.k !== 'sfx' && e.k !== 'turn' && e.k !== 'banner' && e.k !== 'over' && e.k !== 'edit' && e.k !== 'say') this.renderer.fx(e);
      d.fx.length = 0;
    }
    if (d.phase === 'over' || d.time > 300) { this.demoOverT = (this.demoOverT || 0) + dt; if (this.demoOverT > 4) { this.demoOverT = 0; this.startDemo(); } }
  }

  matchStep(dt) {
    const m = this.match;
    if (this.phase === 'match' && !this.paused) {
      this.acc += dt;
      while (this.acc >= STEP) {
        this.acc -= STEP;
        const T = m.turn;
        if (T && (m.phase === 'play' || m.phase === 'retreat')) {
          if (T.cpu) this.brains[T.team] && this.brains[T.team].update(STEP);
          else {
            const p = T.slot !== null ? this.players[T.slot] : null;
            if (!p || (p.kind === 'phone' && !p.connected)) { m.control({ mx: 0, my: 0, fire: false }); T.clock -= STEP * 4; }
            else if (p.kind === 'local') m.control(this.localIn);
            else if (p.kind === 'kb') m.control(this.kbInput());
            else m.control(this.phoneIn[T.slot] || { mx: 0, my: 0, fire: false });
          }
        }
        m.update(STEP);
        for (const e of m.fx) this.handleFx(e);
        m.fx.length = 0;
      }
      if (this.overT !== undefined && this.overT > 0) { this.overT -= dt; if (this.overT <= 0) { this.overT = undefined; this.finish(); } }
    } else if (this.phase === 'results') {
      m.update(dt * 0.5);
      m.fx.length = 0;
    }
    this.netStep(dt);
  }

  netStep(dt) {
    const m = this.match;
    if (!m || this.phase !== 'match') return;
    const viewers = this.viewers();
    // cambios del terreno
    if (m.terrain.edits.length > this.sentEdits) {
      const msg = { t: 'edit', from: this.sentEdits, list: m.terrain.edits.slice(this.sentEdits) };
      for (const p of viewers) this.send(p.slot, msg);
      this.sentEdits = m.terrain.edits.length;
    }
    this.snapT += dt;
    if (this.snapT >= 0.04) {
      this.snapT = 0;
      if (viewers.length) {
        const snap = { t: 'snap', ...m.snapshot(), fx: this.pendingFx.filter((e) => e.k !== 'sfx' || !SFX_FX.has(e.s)) };
        for (const p of viewers) this.send(p.slot, snap);
      }
      // los efectos con sonido también le llegan al jugador del turno sin vista (para la vibración)
      this.pendingFx = [];
    }
    this.infoT += dt;
    if (this.infoT >= 0.1) {
      this.infoT = 0;
      const info = m.turnInfo();
      const teams = m.teamSummary();
      this.players.forEach((p, i) => {
        if (!p || p.kind !== 'phone' || !p.connected) return;
        const myTeam = m.teams.find((t) => t.slots.includes(i));
        const msg = {
          t: 'turn', info, you: !!(info && !info.cpu && info.slot === i), teams,
          myTeam: myTeam ? myTeam.idx : -1, inv: myTeam ? myTeam.inv : null,
          paused: this.paused, sudden: m.sudden,
          suddenIn: Math.max(0, Math.ceil(m.cfg.sudden * 60 - m.time)),
          wind: m.wind,
        };
        const s = JSON.stringify(msg);
        if (s !== this.lastInfo[i]) { this.lastInfo[i] = s; this.send(i, msg); }
      });
    }
    this.uiT += dt;
    if (this.uiT >= 0.1) { this.uiT = 0; this.changed(); }
  }
}
