// components/HostApp.jsx - Host TV Screen: Password auth, QR lobby, 3D WebGL authoritative simulation, HUD, cutscenes, and results
'use client';

import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { HostNet } from '../game/net.js';
import { HostEngine } from '../game/host.js';
import { GameRenderer } from '../game/render.js';
import { sha256 } from '../game/sha256.js';
import { PASSWORD_HASH, BACKUP_PASSWORD_HASH } from '../game/constants.js';
import { getIsland, ISLANDS } from '../game/islands.js';
import { sound } from '../game/audio.js';
import TouchControls from './TouchControls.jsx';

export default function HostApp() {
  // Authentication State
  const [authed, setAuthed] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState(false);

  // Host Network & Room State
  const [roomCode, setRoomCode] = useState('');
  const [hostStatus, setHostStatus] = useState('starting'); // starting, open, error
  const [players, setPlayers] = useState([]);
  const [config, setConfig] = useState({});
  const [phase, setPhase] = useState('LOBBY'); // LOBBY, CINEMATIC, MATCH, RESULTS

  // Match HUD State
  const [turnInfo, setTurnInfo] = useState({
    activeChickenId: null,
    activeTeamId: null,
    activeTeamName: '',
    activeSlot: null,
    clock: 45,
    wind: { x: 0, z: 0, strength: 0 },
    inventory: {},
  });
  const [speechBubble, setSpeechBubble] = useState(null);
  const [cutsceneData, setCutsceneData] = useState(null);
  const [resultsData, setResultsData] = useState(null);
  const [playOnThisPhone, setPlayOnThisPhone] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const qrCanvasRef = useRef(null);
  const gameCanvasRef = useRef(null);
  const hostNetRef = useRef(null);
  const hostEngineRef = useRef(null);
  const rendererRef = useRef(null);
  const loopRef = useRef(null);
  const speechTimerRef = useRef(null);

  // Keyboard input state
  const keysDown = useRef({});

  useEffect(() => {
    // Check saved password
    const saved = localStorage.getItem('plumazo_auth');
    if (saved === PASSWORD_HASH || saved === BACKUP_PASSWORD_HASH) {
      setAuthed(true);
    }
  }, []);

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    const hash = sha256(passwordInput.trim());
    if (
      hash === PASSWORD_HASH ||
      hash === BACKUP_PASSWORD_HASH ||
      passwordInput.trim().toLowerCase() === 'starleague' ||
      passwordInput.trim().toLowerCase() === 'plumazo' ||
      passwordInput.trim().toLowerCase() === 'pollitos'
    ) {
      localStorage.setItem('plumazo_auth', PASSWORD_HASH);
      setAuthed(true);
      setAuthError(false);
    } else {
      setAuthError(true);
    }
  };

  // Initialize Host Engine and Network once authenticated
  useEffect(() => {
    if (!authed) return;

    sound.init();
    sound.startMusic('menu');

    const net = new HostNet({
      onStatusChange: ({ status, code }) => {
        setHostStatus(status);
        if (code) {
          setRoomCode(code);
          generateQR(code);
        }
      },
      onPlayerJoin: (slot, info) => {
        if (hostEngineRef.current) {
          hostEngineRef.current.handlePlayerJoin(slot, info);
        }
      },
      onPlayerLeave: (slot) => {
        if (hostEngineRef.current) {
          hostEngineRef.current.handlePlayerLeave(slot);
        }
      },
      onMessage: (slot, msg) => {
        if (!hostEngineRef.current) return;
        if (msg.t === 'pick') {
          hostEngineRef.current.updatePlayerPick(slot, msg);
        } else if (msg.t === 'cfg' && slot === 1) {
          hostEngineRef.current.updateConfig(msg.config);
        } else if (msg.t === 'start' && slot === 1) {
          startMatchFromLobby();
        } else if (msg.t === 'in') {
          hostEngineRef.current.handleControllerInput(slot, msg);
        } else if (msg.t === 'act') {
          hostEngineRef.current.handleControllerAction(slot, msg);
        } else if (msg.t === 'cnext') {
          hostEngineRef.current.handleControllerAction(slot, { type: 'cnext' });
        } else if (msg.t === 'cskip') {
          hostEngineRef.current.handleControllerAction(slot, { type: 'cskip' });
        }
      },
    });

    net.start();
    hostNetRef.current = net;

    const engine = new HostEngine({
      net,
      onStateChange: (state) => {
        setPhase(state.phase);
        if (state.players) setPlayers([...state.players]);
        if (state.config) setConfig({ ...state.config });
        if (state.cutscene) setCutsceneData(state.cutscene);
        if (state.result) setResultsData(state.result);
      },
      onSay: (name, quote) => {
        setSpeechBubble({ name, text: quote });
        if (speechTimerRef.current) clearTimeout(speechTimerRef.current);
        speechTimerRef.current = setTimeout(() => setSpeechBubble(null), 3500);
      },
      onDamageText: (x, y, z, damage) => {
        if (rendererRef.current) {
          rendererRef.current.spawnDamageNumber(x, y, z, damage);
        }
      },
      onExplosion: (x, y, z, r) => {
        if (rendererRef.current) {
          rendererRef.current.updateTerrainMeshes(hostEngineRef.current?.terrain);
          rendererRef.current.spawnExplosionParticles(x, y, z);
        }
      },
    });

    hostEngineRef.current = engine;
    setPlayers(engine.players);
    setConfig(engine.config);

    // Keyboard event listeners
    const handleKeyDown = (e) => {
      keysDown.current[e.code] = true;
      if (e.code === 'KeyM') {
        const nextMute = !isMuted;
        setIsMuted(nextMute);
        sound.setMuted(nextMute);
      }
      if (e.code === 'KeyE') {
        // Cycle weapon
        if (hostEngineRef.current) {
          hostEngineRef.current.handleControllerAction(1, {
            type: 'weapon',
            weaponId: 'granada',
          });
        }
      }
      if (e.code === 'KeyC') {
        if (hostEngineRef.current) {
          hostEngineRef.current.handleControllerAction(1, { type: 'camera' });
        }
      }
      if (e.code === 'Space') {
        if (hostEngineRef.current) {
          hostEngineRef.current.handleControllerAction(1, { type: 'jump' });
        }
      }
      if (e.code === 'KeyQ') {
        if (hostEngineRef.current) {
          hostEngineRef.current.handleControllerAction(1, { type: 'backflip' });
        }
      }
      if (e.code === 'Enter') {
        if (phase === 'CINEMATIC') {
          hostEngineRef.current?.handleControllerAction(1, { type: 'cnext' });
        } else if (phase === 'MATCH') {
          hostEngineRef.current?.handleControllerAction(1, { type: 'fire', power: 0.8 });
        }
      }
    };

    const handleKeyUp = (e) => {
      keysDown.current[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (hostNetRef.current) hostNetRef.current.destroy();
      if (hostEngineRef.current) hostEngineRef.current.destroy();
      if (rendererRef.current) rendererRef.current.destroy();
      if (loopRef.current) cancelAnimationFrame(loopRef.current);
    };
  }, [authed]);

  const generateQR = async (code) => {
    if (!qrCanvasRef.current) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const mandoUrl = `${origin}/mando?c=${code}`;
    try {
      await QRCode.toCanvas(qrCanvasRef.current, mandoUrl, {
        width: 190,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      });
    } catch (err) {
      console.error('QR code render error:', err);
    }
  };

  const startMatchFromLobby = () => {
    if (!hostEngineRef.current) return;

    hostEngineRef.current.startMatch();
    const island = getIsland(hostEngineRef.current.config.islandId);

    // Initialize 3D renderer for Host screen
    if (gameCanvasRef.current) {
      if (rendererRef.current) rendererRef.current.destroy();
      const ren = new GameRenderer(gameCanvasRef.current, {
        quality: hostEngineRef.current.config.graphicsQuality || 'normal',
        isMobile: false,
      });
      ren.setIslandTheme(island);
      ren.updateTerrainMeshes(hostEngineRef.current.terrain);
      rendererRef.current = ren;
    }

    // Start 60Hz loop
    let lastT = performance.now();
    const tick = () => {
      const now = performance.now();
      const dt = Math.min(0.05, (now - lastT) / 1000);
      lastT = now;

      // Handle keyboard movement for Host J1
      if (hostEngineRef.current?.activeChicken?.teamId === 'rojo') {
        let mx = 0;
        let mz = 0;
        if (keysDown.current['KeyW']) mz += 1;
        if (keysDown.current['KeyS']) mz -= 1;
        if (keysDown.current['KeyA']) mx -= 1;
        if (keysDown.current['KeyD']) mx += 1;
        if (mx !== 0 || mz !== 0) {
          hostEngineRef.current.handleControllerInput(1, { x: mx, z: mz });
        }
      }

      hostEngineRef.current?.update(dt);

      if (rendererRef.current && hostEngineRef.current) {
        rendererRef.current.syncEntities(
          hostEngineRef.current.chickens,
          hostEngineRef.current.crates,
          hostEngineRef.current.barrels,
          hostEngineRef.current.minas
        );
        rendererRef.current.syncProjectiles(hostEngineRef.current.projectiles);

        const active = hostEngineRef.current.activeChicken;
        if (active) {
          rendererRef.current.activeChicken = active;
          rendererRef.current.aimPitch = hostEngineRef.current.aimPitch;
          rendererRef.current.aimYaw = hostEngineRef.current.aimYaw;
          rendererRef.current.setCameraMode(hostEngineRef.current.cameraMode, active);
        }

        rendererRef.current.render(dt);

        // Sync turn info for HUD
        if (hostEngineRef.current.rules) {
          setTurnInfo({
            activeChickenId: active?.id,
            activeTeamId: hostEngineRef.current.activeTeamId,
            activeTeamName:
              hostEngineRef.current.teams.find(
                (t) => t.id === hostEngineRef.current.activeTeamId
              )?.name || '',
            activeSlot:
              hostEngineRef.current.teams.find(
                (t) => t.id === hostEngineRef.current.activeTeamId
              )?.slot || null,
            clock: hostEngineRef.current.rules.clock,
            wind: hostEngineRef.current.rules.wind,
            inventory: hostEngineRef.current.inventory[hostEngineRef.current.activeTeamId] || {},
          });
        }
      }

      loopRef.current = requestAnimationFrame(tick);
    };

    loopRef.current = requestAnimationFrame(tick);
  };

  const handleShareLink = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const mandoUrl = `${origin}/mando?c=${roomCode}`;
    if (navigator.share) {
      navigator.share({
        title: '¡Juega Plumazo!',
        text: `Únete a la guerra de pollitos con el código ${roomCode}`,
        url: mandoUrl,
      });
    } else {
      navigator.clipboard.writeText(mandoUrl);
      alert('¡Link del juego copiado al portapapeles!');
    }
  };

  const mandoUrl = typeof window !== 'undefined' ? `${window.location.origin}/mando?c=${roomCode}` : '';

  // 1. PASSWORD SCREEN
  if (!authed) {
    return (
      <div
        style={{
          width: '100vw',
          height: '100vh',
          background: 'radial-gradient(circle at center, #1d3557, #0d1b2a)',
          color: '#fff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          padding: 24,
        }}
      >
        <div
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '2px solid rgba(255,255,255,0.2)',
            borderRadius: 24,
            padding: 36,
            maxWidth: 420,
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 12px 36px rgba(0,0,0,0.5)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <div style={{ fontSize: 60, marginBottom: 8 }}>🐔</div>
          <h1 style={{ color: '#ffd166', margin: 0, fontSize: 30, letterSpacing: 1 }}>PLUMAZO</h1>
          <p style={{ color: '#a8dadc', fontSize: 14, marginBottom: 24 }}>
            Guerra de pollitos por turnos
          </p>

          <form onSubmit={handlePasswordSubmit}>
            <input
              type="password"
              placeholder="Contraseña del Anfitrión"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '12px 16px',
                borderRadius: 12,
                border: authError ? '2px solid #e63946' : '2px solid #a8dadc',
                background: 'rgba(255,255,255,0.1)',
                color: '#fff',
                fontSize: 16,
                marginBottom: 12,
                textAlign: 'center',
              }}
            />
            {authError && (
              <p style={{ color: '#e63946', fontSize: 13, margin: '0 0 12px' }}>
                Contraseña incorrecta. (Por defecto: <b>starleague</b> o <b>plumazo</b>)
              </p>
            )}
            <button
              type="submit"
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #e63946, #c1121f)',
                border: 'none',
                borderRadius: 16,
                padding: '12px',
                color: '#fff',
                fontWeight: 'bold',
                fontSize: 16,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(230, 57, 70, 0.4)',
              }}
            >
              Entrar al Gallinero
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 2. MAIN APP SCREEN
  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: '#0d1b2a',
        color: '#fff',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* 3D WebGL Canvas for TV Match Simulation */}
      <canvas
        ref={gameCanvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          display: phase !== 'LOBBY' ? 'block' : 'none',
          zIndex: 1,
        }}
      />

      {/* LOBBY INTERFACE */}
      {phase === 'LOBBY' && (
        <div
          style={{
            flex: 1,
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column',
            padding: '24px 40px',
            background: 'radial-gradient(circle at center, #1d3557, #0d1b2a)',
            overflowY: 'auto',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 20,
            }}
          >
            <div>
              <h1 style={{ color: '#ffd166', fontSize: 38, margin: 0, letterSpacing: 2 }}>
                🐔 PLUMAZO
              </h1>
              <p style={{ color: '#a8dadc', margin: 0, fontSize: 15 }}>
                Conecta tus celulares escaneando el código QR
              </p>
            </div>

            {/* Room Code & Share */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                background: 'rgba(255,255,255,0.08)',
                padding: '8px 20px',
                borderRadius: 20,
                border: '1px solid rgba(255,255,255,0.2)',
              }}
            >
              <div>
                <span style={{ fontSize: 11, color: '#a8dadc', display: 'block' }}>CÓDIGO DE SALA</span>
                <span style={{ fontSize: 32, fontWeight: '900', color: '#ffd166', letterSpacing: 4 }}>
                  {roomCode || '.....'}
                </span>
              </div>
              <button
                onClick={handleShareLink}
                style={{
                  background: '#2a9d8f',
                  border: 'none',
                  borderRadius: 14,
                  padding: '8px 14px',
                  color: '#fff',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                📤 Compartir
              </button>
            </div>
          </div>

          {/* Lobby Main Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '260px 1fr 300px',
              gap: 24,
              flex: 1,
            }}
          >
            {/* Left: QR Code & Direct URL */}
            <div
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 20,
                padding: 16,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
              }}
            >
              <h3 style={{ margin: '0 0 12px', color: '#ffd166', fontSize: 16 }}>
                Escanea con tu Celular
              </h3>
              <canvas
                ref={qrCanvasRef}
                style={{
                  borderRadius: 12,
                  boxShadow: '0 6px 16px rgba(0,0,0,0.4)',
                }}
              />
              <p style={{ fontSize: 12, color: '#a8dadc', marginTop: 12, wordBreak: 'break-all' }}>
                {mandoUrl}
              </p>

              {/* Jugar en este dispositivo button */}
              <button
                onClick={() => {
                  setPlayOnThisPhone(true);
                  if (hostNetRef.current) {
                    hostNetRef.current.registerLocalHostSlot('local_host', 'J1 (Este dispositivo)');
                  }
                }}
                style={{
                  marginTop: 'auto',
                  width: '100%',
                  background: playOnThisPhone ? '#2a9d8f' : 'rgba(255,255,255,0.15)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: 14,
                  padding: '10px',
                  color: '#fff',
                  fontWeight: 'bold',
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                🎮 Jugar en esta pantalla (J1)
              </button>
            </div>

            {/* Center: Connected Players & Teams */}
            <div
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 20,
                padding: 20,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <h3 style={{ margin: '0 0 16px', color: '#ffd166', fontSize: 18 }}>
                Puestos de Combate (J1 - J4)
              </h3>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 14,
                  flex: 1,
                }}
              >
                {[1, 2, 3, 4].map((slotNum) => {
                  const p = players.find((pl) => pl.slot === slotNum);
                  const isPresent = !!p;

                  return (
                    <div
                      key={slotNum}
                      style={{
                        background: isPresent ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.02)',
                        border: isPresent
                          ? `2px solid ${p?.colorHex || '#ffd166'}`
                          : '1px dashed rgba(255,255,255,0.2)',
                        borderRadius: 16,
                        padding: 16,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        position: 'relative',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 'bold', fontSize: 16 }}>
                          J{slotNum} {slotNum === 1 ? '👑' : ''}
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            padding: '2px 8px',
                            borderRadius: 10,
                            background: isPresent ? '#2a9d8f' : 'rgba(255,255,255,0.1)',
                          }}
                        >
                          {isPresent ? 'Conectado' : 'Libre'}
                        </span>
                      </div>

                      {isPresent ? (
                        <div style={{ marginTop: 10 }}>
                          <div style={{ fontWeight: '900', color: p.colorHex, fontSize: 18 }}>
                            {p.teamName || p.name}
                          </div>
                          <div style={{ fontSize: 12, color: '#a8dadc', marginTop: 4 }}>
                            Accesorio: {p.accessory || 'Casco'}
                          </div>
                        </div>
                      ) : (
                        <div style={{ color: '#666', fontSize: 13, marginTop: 10 }}>
                          Esperando celular...
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Match Settings Drawer */}
            <div
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 20,
                padding: 20,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                overflowY: 'auto',
              }}
            >
              <h3 style={{ margin: 0, color: '#ffd166', fontSize: 17 }}>Ajustes de Partida</h3>

              <div>
                <label style={{ fontSize: 12, color: '#a8dadc' }}>Modo de Juego:</label>
                <select
                  value={config.mode || 'versus'}
                  onChange={(e) => hostEngineRef.current?.updateConfig({ mode: e.target.value })}
                  style={{
                    width: '100%',
                    padding: 8,
                    borderRadius: 10,
                    background: '#1d3557',
                    color: '#fff',
                    border: '1px solid #457b9d',
                    marginTop: 4,
                  }}
                >
                  <option value="versus">Versus por Equipos</option>
                  <option value="coop">Cooperativo vs CPU</option>
                  <option value="historia">Historia: El Gran Robo</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, color: '#a8dadc' }}>Escenario (Isla):</label>
                <select
                  value={config.islandId || 'arenero'}
                  onChange={(e) => hostEngineRef.current?.updateConfig({ islandId: e.target.value })}
                  style={{
                    width: '100%',
                    padding: 8,
                    borderRadius: 10,
                    background: '#1d3557',
                    color: '#fff',
                    border: '1px solid #457b9d',
                    marginTop: 4,
                  }}
                >
                  {ISLANDS.map((isl) => (
                    <option key={isl.id} value={isl.id}>
                      {isl.name}
                    </option>
                  ))}
                  <option value="random">Aleatoria (Semilla)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, color: '#a8dadc' }}>Reloj de Turno:</label>
                <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                  {[30, 45, 60].map((t) => (
                    <button
                      key={t}
                      onClick={() => hostEngineRef.current?.updateConfig({ turnTime: t })}
                      style={{
                        flex: 1,
                        padding: '6px',
                        borderRadius: 8,
                        background: config.turnTime === t ? '#e63946' : 'rgba(255,255,255,0.1)',
                        border: 'none',
                        color: '#fff',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                      }}
                    >
                      {t}s
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, color: '#a8dadc' }}>Pollitos por Equipo:</label>
                <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                  {[2, 3, 4].map((count) => (
                    <button
                      key={count}
                      onClick={() => hostEngineRef.current?.updateConfig({ chickensPerTeam: count })}
                      style={{
                        flex: 1,
                        padding: '6px',
                        borderRadius: 8,
                        background: config.chickensPerTeam === count ? '#e63946' : 'rgba(255,255,255,0.1)',
                        border: 'none',
                        color: '#fff',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                      }}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>

              {/* Start Match Button */}
              <button
                onClick={startMatchFromLobby}
                style={{
                  marginTop: 'auto',
                  background: 'linear-gradient(135deg, #2a9d8f, #21867a)',
                  border: 'none',
                  borderRadius: 16,
                  padding: '14px',
                  color: '#fff',
                  fontWeight: '900',
                  fontSize: 17,
                  letterSpacing: 1,
                  cursor: 'pointer',
                  boxShadow: '0 6px 16px rgba(42, 157, 143, 0.4)',
                }}
              >
                🚀 INICIAR PARTIDA
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MATCH HUD OVERLAY */}
      {phase === 'MATCH' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: 20,
          }}
        >
          {/* Top Bar: Turn Banner, Wind, Clock */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            {/* Active Team Banner */}
            <div
              style={{
                background: 'rgba(0,0,0,0.7)',
                border: '2px solid #ffd166',
                borderRadius: 20,
                padding: '8px 24px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                backdropFilter: 'blur(6px)',
              }}
            >
              <span style={{ fontSize: 24 }}>🐔</span>
              <div>
                <span style={{ fontSize: 11, color: '#a8dadc', display: 'block' }}>TURNO DE</span>
                <span style={{ fontSize: 20, fontWeight: '900', color: '#ffd166' }}>
                  {turnInfo.activeTeamName || 'Equipo'}
                </span>
              </div>
            </div>

            {/* Turn Timer Clock */}
            <div
              style={{
                background: turnInfo.clock < 10 ? 'rgba(230, 57, 70, 0.85)' : 'rgba(0,0,0,0.7)',
                borderRadius: 30,
                padding: '10px 24px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                border: '2px solid rgba(255,255,255,0.4)',
                backdropFilter: 'blur(6px)',
              }}
            >
              <span style={{ fontSize: 22 }}>⏱️</span>
              <span style={{ fontSize: 28, fontWeight: '900', color: '#fff' }}>
                {Math.ceil(turnInfo.clock)}s
              </span>
            </div>

            {/* Wind Compass */}
            <div
              style={{
                background: 'rgba(0,0,0,0.7)',
                borderRadius: 20,
                padding: '8px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                border: '2px solid rgba(255,255,255,0.2)',
                backdropFilter: 'blur(6px)',
              }}
            >
              <span style={{ fontSize: 20 }}>🌬️</span>
              <div>
                <span style={{ fontSize: 11, color: '#a8dadc', display: 'block' }}>VIENTO</span>
                <span style={{ fontSize: 16, fontWeight: 'bold', color: '#fff' }}>
                  {turnInfo.wind?.strength} m/s
                </span>
              </div>
            </div>
          </div>

          {/* Speech Bubble Quote */}
          {speechBubble && (
            <div
              style={{
                alignSelf: 'center',
                background: 'rgba(255, 255, 255, 0.95)',
                color: '#111',
                padding: '10px 20px',
                borderRadius: 24,
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                fontWeight: 'bold',
                fontSize: 18,
                maxWidth: 450,
                textAlign: 'center',
                border: '3px solid #ffb703',
                animation: 'bounce 0.4s ease-out',
              }}
            >
              <span style={{ color: '#e63946' }}>{speechBubble.name}: </span>
              "{speechBubble.text}"
            </div>
          )}

          {/* Bottom Controls Info / Keyboard Cheatsheet */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
            }}
          >
            <div
              style={{
                background: 'rgba(0,0,0,0.6)',
                borderRadius: 14,
                padding: '8px 16px',
                fontSize: 12,
                color: '#a8dadc',
              }}
            >
              Teclado PC: <b>WASD</b> mover • <b>Espacio</b> saltar • <b>Q</b> salto atrás • <b>Enter</b> disparar • <b>E</b> armas • <b>C</b> cámara • <b>M</b> silenciar
            </div>
          </div>
        </div>
      )}

      {/* TOUCH CONTROLS FOR J1 IF "JUGAR EN ESTA PANTALLA" */}
      {phase === 'MATCH' && playOnThisPhone && (
        <TouchControls
          isMyTurn={turnInfo.activeSlot === 1}
          selectedWeapon="bazuca"
          inventory={turnInfo.inventory || {}}
          onMove={(move) => hostEngineRef.current?.handleControllerInput(1, move)}
          onFire={(wId, power, opts) =>
            hostEngineRef.current?.handleControllerAction(1, {
              type: 'fire',
              weaponId: wId,
              power,
              options: opts,
            })
          }
          onJump={() => hostEngineRef.current?.handleControllerAction(1, { type: 'jump' })}
          onBackflip={() => hostEngineRef.current?.handleControllerAction(1, { type: 'backflip' })}
          onSelectWeapon={(wId) =>
            hostEngineRef.current?.handleControllerAction(1, { type: 'weapon', weaponId: wId })
          }
          onToggleCamera={() => hostEngineRef.current?.handleControllerAction(1, { type: 'camera' })}
          onToggleAim={() => hostEngineRef.current?.handleControllerAction(1, { type: 'aim_mode' })}
        />
      )}

      {/* CINEMATIC CUTSCENE OVERLAY */}
      {phase === 'CINEMATIC' && cutsceneData && (
        <div
          style={{
            position: 'absolute',
            bottom: 30,
            left: 40,
            right: 40,
            background: 'rgba(0,0,0,0.85)',
            border: '3px solid #ffd166',
            borderRadius: 24,
            padding: 24,
            zIndex: 100,
            backdropFilter: 'blur(8px)',
          }}
        >
          <div style={{ color: '#ffd166', fontWeight: '900', fontSize: 20, marginBottom: 8 }}>
            {cutsceneData.speaker}
          </div>
          <div style={{ fontSize: 18, lineHeight: 1.4, color: '#fff' }}>
            {cutsceneData.text}
          </div>
          <div style={{ textAlign: 'right', marginTop: 12 }}>
            <button
              onClick={() => hostEngineRef.current?.handleControllerAction(1, { type: 'cnext' })}
              style={{
                background: '#2a9d8f',
                border: 'none',
                borderRadius: 16,
                padding: '8px 20px',
                color: '#fff',
                fontWeight: 'bold',
                fontSize: 15,
                cursor: 'pointer',
              }}
            >
              Siguiente (Enter) ➔
            </button>
          </div>
        </div>
      )}

      {/* RESULTS OVERLAY */}
      {phase === 'RESULTS' && resultsData && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 100,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            backdropFilter: 'blur(10px)',
          }}
        >
          <div style={{ fontSize: 70 }}>🏆</div>
          <h1 style={{ color: '#ffd166', fontSize: 44, margin: '10px 0' }}>¡Fin de la Batalla!</h1>
          <p style={{ fontSize: 22, color: '#a8dadc', marginBottom: 24 }}>
            {resultsData.reason}
          </p>

          <div style={{ display: 'flex', gap: 16 }}>
            <button
              onClick={() => startMatchFromLobby()}
              style={{
                background: 'linear-gradient(135deg, #e63946, #c1121f)',
                border: 'none',
                borderRadius: 20,
                padding: '14px 32px',
                color: '#fff',
                fontWeight: 'bold',
                fontSize: 18,
                cursor: 'pointer',
              }}
            >
              🔄 Revancha
            </button>
            <button
              onClick={() => {
                setPhase('LOBBY');
                sound.startMusic('menu');
              }}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                borderRadius: 20,
                padding: '14px 28px',
                color: '#fff',
                fontWeight: 'bold',
                fontSize: 18,
                cursor: 'pointer',
              }}
            >
              Volver al Lobby
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
