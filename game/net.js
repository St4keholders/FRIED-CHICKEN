// game/net.js - PeerJS Network layer for Host and Controller

import { PEER_PREFIX, CODE_ALPHABET, CODE_LENGTH } from './constants.js';
import { getPeerOptions } from './peeropts.js';

export function generateRoomCode() {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    const idx = Math.floor(Math.random() * CODE_ALPHABET.length);
    code += CODE_ALPHABET[idx];
  }
  return code;
}

export class HostNet {
  constructor({ onMessage, onPlayerJoin, onPlayerLeave, onStatusChange }) {
    this.peer = null;
    this.code = null;
    this.peerId = null;
    this.connections = new Map(); // slot (1..4) -> DataConnection
    this.playerMap = new Map(); // playerId (UUID) -> slot (1..4)
    this.slots = [null, null, null, null]; // slot index 0..3 corresponds to J1..J4
    this.hasView = new Set(); // slots with active game view
    this.onMessage = onMessage || (() => {});
    this.onPlayerJoin = onPlayerJoin || (() => {});
    this.onPlayerLeave = onPlayerLeave || (() => {});
    this.onStatusChange = onStatusChange || (() => {});
    this.destroyed = false;
  }

  async start(existingCode = null) {
    if (typeof window === 'undefined') return;

    // Dynamically import PeerJS on client
    const { Peer } = await import('peerjs');

    this.code = existingCode || sessionStorage.getItem('plumazo_host_code') || generateRoomCode();
    this.peerId = PEER_PREFIX + this.code;

    const opts = getPeerOptions();
    this.peer = new Peer(this.peerId, opts);

    this.peer.on('open', (id) => {
      this.peerId = id;
      sessionStorage.setItem('plumazo_host_code', this.code);
      this.onStatusChange({ status: 'open', code: this.code, peerId: id });
    });

    this.peer.on('connection', (conn) => {
      this._handleIncomingConnection(conn);
    });

    this.peer.on('error', (err) => {
      if (err.type === 'unavailable-id') {
        // ID taken, generate new code and retry
        console.warn('Peer ID occupied, trying fresh code...');
        this.code = generateRoomCode();
        sessionStorage.setItem('plumazo_host_code', this.code);
        this.peer.destroy();
        this.start(this.code);
      } else {
        console.error('Host peer error:', err);
        this.onStatusChange({ status: 'error', error: err.message });
      }
    });

    this.peer.on('disconnected', () => {
      if (!this.destroyed && this.peer && !this.peer.destroyed) {
        this.peer.reconnect();
      }
    });
  }

  _handleIncomingConnection(conn) {
    conn.on('open', () => {
      // Wait for hello message
    });

    conn.on('data', (raw) => {
      try {
        const msg = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (!msg || !msg.t) return;

        if (msg.t === 'hello') {
          this._handleHello(conn, msg);
        } else {
          // Identify slot
          let slot = null;
          for (let s = 1; s <= 4; s++) {
            if (this.connections.get(s) === conn) {
              slot = s;
              break;
            }
          }
          if (slot !== null) {
            if (msg.t === 'view') {
              if (msg.enabled) this.hasView.add(slot);
              else this.hasView.delete(slot);
            }
            this.onMessage(slot, msg);
          }
        }
      } catch (e) {
        console.error('Host message parse error:', e);
      }
    });

    conn.on('close', () => {
      let slot = null;
      for (let s = 1; s <= 4; s++) {
        if (this.connections.get(s) === conn) {
          slot = s;
          break;
        }
      }
      if (slot !== null) {
        this.connections.delete(slot);
        this.hasView.delete(slot);
        this.onPlayerLeave(slot);
      }
    });
  }

  _handleHello(conn, msg) {
    const { playerId, name } = msg;
    let slot = null;

    // Check if player had a previous slot (reconnection)
    if (playerId && this.playerMap.has(playerId)) {
      slot = this.playerMap.get(playerId);
      // Replace connection
      const oldConn = this.connections.get(slot);
      if (oldConn && oldConn !== conn) {
        try { oldConn.close(); } catch (_) {}
      }
    } else {
      // Find first empty slot 1..4
      for (let i = 0; i < 4; i++) {
        if (!this.slots[i]) {
          slot = i + 1;
          break;
        }
      }
    }

    if (slot === null) {
      conn.send({ t: 'full' });
      setTimeout(() => conn.close(), 500);
      return;
    }

    // Register slot
    this.slots[slot - 1] = { slot, playerId, name: name || `Jugador ${slot}` };
    this.connections.set(slot, conn);
    if (playerId) this.playerMap.set(playerId, slot);

    conn.send({
      t: 'welcome',
      slot,
      isJ1: slot === 1,
      code: this.code
    });

    this.onPlayerJoin(slot, this.slots[slot - 1]);
  }

  // Register Host local player as J1 (for playing directly on the phone or single PC with keyboard)
  registerLocalHostSlot(playerId, name = 'J1 (Anfitrión)') {
    const slot = 1;
    this.slots[0] = { slot, playerId, name, isLocal: true };
    this.playerMap.set(playerId, slot);
    this.hasView.add(slot);
    this.onPlayerJoin(slot, this.slots[0]);
    return slot;
  }

  broadcast(msg) {
    const payload = typeof msg === 'string' ? msg : JSON.stringify(msg);
    for (let slot = 1; slot <= 4; slot++) {
      const conn = this.connections.get(slot);
      if (conn && conn.open) {
        try {
          conn.send(payload);
        } catch (e) {
          console.warn(`Error broadcasting to J${slot}:`, e);
        }
      }
    }
  }

  broadcastView(msg) {
    const payload = typeof msg === 'string' ? msg : JSON.stringify(msg);
    for (const slot of this.hasView) {
      const conn = this.connections.get(slot);
      if (conn && conn.open) {
        try {
          conn.send(payload);
        } catch (_) {}
      }
    }
  }

  send(slot, msg) {
    const conn = this.connections.get(slot);
    if (conn && conn.open) {
      try {
        conn.send(typeof msg === 'string' ? msg : JSON.stringify(msg));
      } catch (e) {
        console.warn(`Error sending to J${slot}:`, e);
      }
    }
  }

  destroy() {
    this.destroyed = true;
    for (const conn of this.connections.values()) {
      try { conn.close(); } catch (_) {}
    }
    this.connections.clear();
    if (this.peer) {
      try { this.peer.destroy(); } catch (_) {}
      this.peer = null;
    }
  }
}

export class ClientNet {
  constructor({ onMessage, onOpen, onClose, onError, onWelcome }) {
    this.peer = null;
    this.conn = null;
    this.slot = null;
    this.isJ1 = false;
    this.roomCode = null;
    this.playerId = null;
    this.onMessage = onMessage || (() => {});
    this.onOpen = onOpen || (() => {});
    this.onClose = onClose || (() => {});
    this.onError = onError || (() => {});
    this.onWelcome = onWelcome || (() => {});
    this.connected = false;
    this.destroyed = false;
  }

  async connect(roomCode) {
    if (typeof window === 'undefined') return;
    this.roomCode = roomCode.toUpperCase().trim();

    // Player ID persistence for seamless reconnect
    let pid = localStorage.getItem('plumazo_player_id');
    if (!pid) {
      pid = 'p_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
      localStorage.setItem('plumazo_player_id', pid);
    }
    this.playerId = pid;

    const { Peer } = await import('peerjs');
    const opts = getPeerOptions();
    this.peer = new Peer(null, opts);

    this.peer.on('open', () => {
      const targetHostPeerId = PEER_PREFIX + this.roomCode;
      this.conn = this.peer.connect(targetHostPeerId, { reliable: true });

      this.conn.on('open', () => {
        this.connected = true;
        this.onOpen();
        // Send hello with playerId
        this.send({
          t: 'hello',
          playerId: this.playerId,
          name: localStorage.getItem('plumazo_player_name') || ''
        });
      });

      this.conn.on('data', (raw) => {
        try {
          const msg = typeof raw === 'string' ? JSON.parse(raw) : raw;
          if (!msg || !msg.t) return;

          if (msg.t === 'welcome') {
            this.slot = msg.slot;
            this.isJ1 = msg.isJ1;
            this.onWelcome(msg);
          }
          this.onMessage(msg);
        } catch (e) {
          console.error('Client parse error:', e);
        }
      });

      this.conn.on('close', () => {
        this.connected = false;
        this.onClose();
      });

      this.conn.on('error', (err) => {
        this.onError(err);
      });
    });

    this.peer.on('error', (err) => {
      this.onError(err);
    });
  }

  send(msg) {
    if (this.conn && this.conn.open) {
      try {
        this.conn.send(typeof msg === 'string' ? msg : JSON.stringify(msg));
      } catch (e) {
        console.warn('Client send error:', e);
      }
    }
  }

  destroy() {
    this.destroyed = true;
    if (this.conn) {
      try { this.conn.close(); } catch (_) {}
      this.conn = null;
    }
    if (this.peer) {
      try { this.peer.destroy(); } catch (_) {}
      this.peer = null;
    }
  }
}
