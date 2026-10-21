// components/ControllerApp.jsx - Phone controller app with touch controls, lobby customizer, and 3D mirror view
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ClientNet } from '../game/net.js';
import { GameMirror } from '../game/mirror.js';
import { TEAM_COLORS, ACCESSORIES, DEFAULT_CHICKEN_NAMES } from '../game/constants.js';
import TouchControls from './TouchControls.jsx';

export default function ControllerApp() {
  const [roomCode, setRoomCode] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('idle'); // idle, connecting, connected, error, full
  const [slot, setSlot] = useState(null);
  const [isJ1, setIsJ1] = useState(false);
  const [phase, setPhase] = useState('LOBBY'); // LOBBY, CINEMATIC, MATCH, RESULTS

  // Customization
  const [selectedColor, setSelectedColor] = useState(TEAM_COLORS[0].id);
  const [selectedAccessory, setSelectedAccessory] = useState('casco');
  const [teamName, setTeamName] = useState('');
  const [chickenNames, setChickenNames] = useState(DEFAULT_CHICKEN_NAMES.slice(0, 4));

  // Match State
  const [viewEnabled, setViewEnabled] = useState(false);
  const [activeTurn, setActiveTurn] = useState({
    activeChickenId: null,
    activeTeamId: null,
    activeTeamName: '',
    activeSlot: null,
    clock: 45,
    wind: { x: 0, z: 0, strength: 0 },
    inventory: {},
  });
  const [selectedWeapon, setSelectedWeapon] = useState('bazuca');
  const [cinematicLine, setCinematicLine] = useState(null);
  const [resultsData, setResultsData] = useState(null);
  const [reactionBubble, setReactionBubble] = useState(null);

  const netRef = useRef(null);
  const mirrorRef = useRef(null);
  const canvasRef = useRef(null);
  const inputLoopRef = useRef(null);
  const currentInputRef = useRef({ x: 0, z: 0, aimPitch: 0.2, aimYaw: 0 });

  useEffect(() => {
    // Auto read code from URL query ?c=XXXXX
    const params = new URLSearchParams(window.location.search);
    const code = params.get('c');
    if (code) {
      setRoomCode(code.toUpperCase());
      connectToHost(code.toUpperCase());
    }

    return () => {
      if (netRef.current) netRef.current.destroy();
      if (mirrorRef.current) mirrorRef.current.destroy();
      if (inputLoopRef.current) clearInterval(inputLoopRef.current);
    };
  }, []);

  const connectToHost = (codeToConnect) => {
    if (!codeToConnect) return;
    setConnectionStatus('connecting');

    const client = new ClientNet({
      onOpen: () => {
        setConnectionStatus('connected');
      },
      onWelcome: (msg) => {
        setSlot(msg.slot);
        setIsJ1(msg.isJ1);
        const col = TEAM_COLORS[(msg.slot - 1) % TEAM_COLORS.length];
        setSelectedColor(col.id);
        setTeamName(`Equipo ${col.name}`);
      },
      onMessage: (msg) => {
        handleIncomingMessage(msg);
      },
      onClose: () => {
        setConnectionStatus('disconnected');
      },
      onError: (err) => {
        console.error('Client error:', err);
        setConnectionStatus('error');
      },
    });

    client.connect(codeToConnect);
    netRef.current = client;

    // Start 30Hz input streaming loop
    inputLoopRef.current = setInterval(() => {
      if (netRef.current && netRef.current.connected) {
        netRef.current.send({
          t: 'in',
          ...currentInputRef.current,
        });
      }
    }, 33);
  };

  const handleIncomingMessage = (msg) => {
    if (msg.t === 'full') {
      setConnectionStatus('full');
    } else if (msg.t === 'phase') {
      setPhase(msg.phase);
      if (msg.phase === 'RESULTS') {
        setResultsData(msg);
      }
    } else if (msg.t === 'matchInit') {
      setPhase('MATCH');
      if (viewEnabled && canvasRef.current) {
        if (mirrorRef.current) mirrorRef.current.destroy();
        mirrorRef.current = new GameMirror(canvasRef.current, { slot });
        mirrorRef.current.initMatch(msg);
      }
    } else if (msg.t === 'turn') {
      setActiveTurn(msg);
    } else if (msg.t === 'snap') {
      if (mirrorRef.current) {
        mirrorRef.current.receiveSnapshot(msg);
      }
    } else if (msg.t === 'carve') {
      if (mirrorRef.current) {
        mirrorRef.current.applyCarve(msg);
      }
    } else if (msg.t === 'cine') {
      setPhase('CINEMATIC');
      setCinematicLine(msg.line);
    } else if (msg.t === 'buzz') {
      if (navigator.vibrate) {
        navigator.vibrate([120, 80, 150]);
      }
    }
  };

  // Toggle "Ver el juego aquí"
  const toggleViewMode = () => {
    const nextVal = !viewEnabled;
    setViewEnabled(nextVal);
    if (netRef.current) {
      netRef.current.send({ t: 'view', enabled: nextVal });
    }
  };

  const sendPick = () => {
    if (netRef.current) {
      netRef.current.send({
        t: 'pick',
        teamColorId: selectedColor,
        accessory: selectedAccessory,
        teamName,
        chickenNames,
      });
    }
  };

  const isMyTurn = activeTurn.activeSlot === slot;

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
      {/* 3D MIRROR CANVAS (when viewEnabled is active) */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          display: viewEnabled && phase === 'MATCH' ? 'block' : 'none',
          zIndex: 1,
        }}
      />

      {/* TOP STATUS BAR */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          background: 'rgba(0,0,0,0.65)',
          padding: '8px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backdropFilter: 'blur(6px)',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontWeight: '900', color: '#ffd166', fontSize: 16 }}>
            PLUMAZO
          </span>
          {slot && (
            <span
              style={{
                background: '#e63946',
                borderRadius: 12,
                padding: '2px 8px',
                fontSize: 12,
                fontWeight: 'bold',
              }}
            >
              J{slot} {isJ1 ? '👑' : ''}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {phase === 'MATCH' && (
            <button
              onClick={toggleViewMode}
              style={{
                background: viewEnabled ? '#2a9d8f' : 'rgba(255,255,255,0.2)',
                border: 'none',
                borderRadius: 16,
                padding: '4px 10px',
                color: '#fff',
                fontSize: 12,
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              {viewEnabled ? '📺 Ver el juego' : '🎮 Solo mando'}
            </button>
          )}

          <button
            onClick={() => {
              if (document.documentElement.requestFullscreen) {
                document.documentElement.requestFullscreen().catch(() => {});
              }
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#fff',
              fontSize: 16,
              cursor: 'pointer',
            }}
            title="Pantalla completa"
          >
            ⛶
          </button>
        </div>
      </div>

      {/* CONNECT SCREEN */}
      {connectionStatus !== 'connected' && (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 24,
            gap: 16,
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 60 }}>🐔</div>
          <h1 style={{ margin: 0, fontSize: 26, color: '#ffd166' }}>Unirse a la Partida</h1>
          <p style={{ margin: 0, color: '#a8dadc', fontSize: 14 }}>
            Ingresa el código de 5 letras que aparece en la pantalla del TV
          </p>

          <input
            type="text"
            value={roomCode}
            maxLength={5}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            placeholder="CÓDIGO"
            style={{
              fontSize: 28,
              textAlign: 'center',
              letterSpacing: 4,
              padding: '10px 16px',
              borderRadius: 12,
              border: '2px solid #ffd166',
              background: 'rgba(255,255,255,0.1)',
              color: '#fff',
              fontWeight: '900',
              width: 200,
            }}
          />

          <button
            disabled={roomCode.length !== 5 || connectionStatus === 'connecting'}
            onClick={() => connectToHost(roomCode)}
            style={{
              background: 'linear-gradient(135deg, #e63946, #c1121f)',
              border: 'none',
              borderRadius: 24,
              padding: '12px 32px',
              color: '#fff',
              fontWeight: 'bold',
              fontSize: 16,
              cursor: 'pointer',
              opacity: roomCode.length === 5 ? 1 : 0.5,
            }}
          >
            {connectionStatus === 'connecting' ? 'Conectando...' : 'Entrar al Corral'}
          </button>

          {connectionStatus === 'full' && (
            <p style={{ color: '#e63946' }}>La sala está llena (máx 4 jugadores).</p>
          )}
          {connectionStatus === 'error' && (
            <p style={{ color: '#e63946' }}>No se pudo conectar. Verifica el código.</p>
          )}
        </div>
      )}

      {/* LOBBY SCREEN */}
      {connectionStatus === 'connected' && phase === 'LOBBY' && (
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          <h2 style={{ margin: 0, color: '#ffd166', fontSize: 20 }}>Personaliza tu Equipo</h2>

          {/* Color Selector */}
          <div>
            <label style={{ fontSize: 13, color: '#a8dadc' }}>Color del Equipo:</label>
            <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
              {TEAM_COLORS.map((col) => (
                <button
                  key={col.id}
                  onClick={() => {
                    setSelectedColor(col.id);
                    setTeamName(`Equipo ${col.name}`);
                    sendPick();
                  }}
                  style={{
                    flex: 1,
                    height: 44,
                    borderRadius: 12,
                    background: col.primary,
                    border: selectedColor === col.id ? '3px solid #fff' : 'none',
                    cursor: 'pointer',
                    boxShadow: selectedColor === col.id ? '0 0 12px #fff' : 'none',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Accessory Selector */}
          <div>
            <label style={{ fontSize: 13, color: '#a8dadc' }}>Accesorio para tus pollitos:</label>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 8,
                marginTop: 6,
              }}
            >
              {ACCESSORIES.filter((a) => !a.secret).map((acc) => (
                <button
                  key={acc.id}
                  onClick={() => {
                    setSelectedAccessory(acc.id);
                    sendPick();
                  }}
                  style={{
                    background:
                      selectedAccessory === acc.id
                        ? 'rgba(255, 183, 3, 0.3)'
                        : 'rgba(255,255,255,0.08)',
                    border:
                      selectedAccessory === acc.id
                        ? '2px solid #ffb703'
                        : '1px solid rgba(255,255,255,0.15)',
                    borderRadius: 12,
                    padding: 8,
                    color: '#fff',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4,
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ fontSize: 24 }}>{acc.icon}</span>
                  <span style={{ fontSize: 11, fontWeight: 'bold' }}>{acc.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* J1 Start Game Button */}
          {isJ1 ? (
            <button
              onClick={() => {
                if (netRef.current) {
                  netRef.current.send({ t: 'start' });
                }
              }}
              style={{
                marginTop: 'auto',
                background: 'linear-gradient(135deg, #2a9d8f, #21867a)',
                border: 'none',
                borderRadius: 24,
                padding: '16px',
                color: '#fff',
                fontWeight: '900',
                fontSize: 18,
                letterSpacing: 1,
                cursor: 'pointer',
                boxShadow: '0 6px 16px rgba(42, 157, 143, 0.5)',
              }}
            >
              🚀 EMPEZAR PARTIDA
            </button>
          ) : (
            <div
              style={{
                marginTop: 'auto',
                textAlign: 'center',
                padding: 16,
                background: 'rgba(255,255,255,0.05)',
                borderRadius: 16,
                color: '#ffd166',
                fontSize: 14,
              }}
            >
              Esperando a que J1 inicie la partida...
            </div>
          )}
        </div>
      )}

      {/* MATCH SCREEN: CONTROLS & HUD */}
      {connectionStatus === 'connected' && phase === 'MATCH' && (
        <div style={{ flex: 1, position: 'relative' }}>
          {/* Solo Mando Center Info (when viewEnabled is false) */}
          {!viewEnabled && (
            <div
              style={{
                position: 'absolute',
                top: 20,
                left: 20,
                right: 20,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'rgba(0,0,0,0.5)',
                padding: '8px 16px',
                borderRadius: 20,
                backdropFilter: 'blur(4px)',
                zIndex: 5,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 20 }}>
                  {isMyTurn ? '🔥' : '⏳'}
                </span>
                <span style={{ fontWeight: 'bold', fontSize: 14 }}>
                  {isMyTurn ? '¡ES TU TURNO!' : `Turno: ${activeTurn.activeTeamName}`}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ fontSize: 13, color: '#ffd166' }}>
                  🌬️ {activeTurn.wind?.strength} m/s
                </div>
                <div
                  style={{
                    background: activeTurn.clock < 10 ? '#e63946' : '#2a9d8f',
                    padding: '2px 10px',
                    borderRadius: 12,
                    fontWeight: '900',
                    fontSize: 15,
                  }}
                >
                  {Math.ceil(activeTurn.clock)}s
                </div>
              </div>
            </div>
          )}

          {/* TOUCH CONTROLS OVERLAY */}
          <TouchControls
            isMyTurn={isMyTurn}
            selectedWeapon={selectedWeapon}
            inventory={activeTurn.inventory || {}}
            onMove={(move) => {
              currentInputRef.current.x = move.x;
              currentInputRef.current.z = move.z;
            }}
            onAimDelta={(delta) => {
              currentInputRef.current.aimYaw = (currentInputRef.current.aimYaw || 0) + delta.dYaw;
              currentInputRef.current.aimPitch = Math.max(
                -0.6,
                Math.min(0.8, (currentInputRef.current.aimPitch || 0.2) + delta.dPitch)
              );
            }}
            onFire={(wId, power, opts) => {
              if (netRef.current) {
                netRef.current.send({
                  t: 'act',
                  type: 'fire',
                  weaponId: wId,
                  power,
                  options: opts,
                });
              }
            }}
            onJump={() => {
              if (netRef.current) netRef.current.send({ t: 'act', type: 'jump' });
            }}
            onBackflip={() => {
              if (netRef.current) netRef.current.send({ t: 'act', type: 'backflip' });
            }}
            onSelectWeapon={(wId) => {
              setSelectedWeapon(wId);
              if (netRef.current) netRef.current.send({ t: 'act', type: 'weapon', weaponId: wId });
            }}
            onToggleCamera={() => {
              if (netRef.current) netRef.current.send({ t: 'act', type: 'camera' });
            }}
            onToggleAim={() => {
              if (netRef.current) netRef.current.send({ t: 'act', type: 'aim_mode' });
            }}
            onReact={(emoji) => {
              if (netRef.current) netRef.current.send({ t: 'act', type: 'react', emoji });
            }}
          />
        </div>
      )}

      {/* CINEMATIC SCREEN */}
      {connectionStatus === 'connected' && phase === 'CINEMATIC' && cinematicLine && (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            padding: 24,
            background: 'radial-gradient(circle, rgba(0,0,0,0.7), #000)',
          }}
        >
          <div
            style={{
              background: 'rgba(0,0,0,0.85)',
              border: '2px solid #ffd166',
              borderRadius: 16,
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <h3 style={{ margin: 0, color: '#ffd166', fontSize: 18 }}>
              {cinematicLine.speaker}
            </h3>
            <p style={{ margin: 0, fontSize: 16, lineHeight: 1.4 }}>
              {cinematicLine.text}
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
              {isJ1 && (
                <button
                  onClick={() => netRef.current?.send({ t: 'cskip' })}
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    border: 'none',
                    borderRadius: 16,
                    padding: '8px 16px',
                    color: '#fff',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                  }}
                >
                  Saltar
                </button>
              )}
              <button
                onClick={() => netRef.current?.send({ t: 'cnext' })}
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
                Siguiente ➔
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESULTS SCREEN */}
      {connectionStatus === 'connected' && phase === 'RESULTS' && resultsData && (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 24,
            textAlign: 'center',
            gap: 16,
          }}
        >
          <div style={{ fontSize: 50 }}>🏆</div>
          <h1 style={{ color: '#ffd166', margin: 0 }}>¡Fin de la Partida!</h1>
          <p style={{ fontSize: 18, color: '#a8dadc' }}>{resultsData.reason}</p>

          {isJ1 && (
            <button
              onClick={() => netRef.current?.send({ t: 'start' })}
              style={{
                marginTop: 20,
                background: '#e63946',
                border: 'none',
                borderRadius: 24,
                padding: '12px 32px',
                color: '#fff',
                fontWeight: 'bold',
                fontSize: 16,
                cursor: 'pointer',
              }}
            >
              🔄 Jugar Revancha
            </button>
          )}
        </div>
      )}
    </div>
  );
}
