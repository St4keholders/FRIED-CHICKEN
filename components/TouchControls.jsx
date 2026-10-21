// components/TouchControls.jsx - Virtual joystick, aim gestures, fire charge button, weapon grid, and reactions
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { WEAPONS, UTILITIES } from '../game/constants.js';

export default function TouchControls({
  isMyTurn = false,
  selectedWeapon = 'bazuca',
  inventory = {},
  onMove = () => {},
  onAimDelta = () => {},
  onFire = () => {},
  onJump = () => {},
  onBackflip = () => {},
  onSelectWeapon = () => {},
  onToggleCamera = () => {},
  onToggleAim = () => {},
  onReact = () => {},
  onFuseChange = () => {},
}) {
  const [showWeaponsGrid, setShowWeaponsGrid] = useState(false);
  const [charging, setCharging] = useState(false);
  const [chargeProgress, setChargeProgress] = useState(0);
  const [fuseSeconds, setFuseSeconds] = useState(3);

  const chargeTimerRef = useRef(null);
  const chargeStartRef = useRef(0);
  const joystickRef = useRef(null);
  const touchAimRef = useRef(null);

  // Virtual Joystick state
  const [stickPos, setStickPos] = useState({ x: 0, y: 0 });
  const [stickActive, setStickActive] = useState(false);
  const stickTouchId = useRef(null);
  const stickOrigin = useRef({ x: 0, y: 0 });

  // Right touch aim drag state
  const aimTouchId = useRef(null);
  const lastAimPos = useRef({ x: 0, y: 0 });

  // Handle Joystick Touch Events
  const handleJoyStart = (e) => {
    e.preventDefault();
    const touch = e.changedTouches[0];
    stickTouchId.current = touch.identifier;
    const rect = joystickRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    stickOrigin.current = { x: centerX, y: centerY };
    setStickActive(true);
  };

  const handleJoyMove = (e) => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === stickTouchId.current) {
        const dx = touch.clientX - stickOrigin.current.x;
        const dy = touch.clientY - stickOrigin.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxRadius = 45;

        const clampedDist = Math.min(dist, maxRadius);
        const angle = Math.atan2(dy, dx);
        const posX = Math.cos(angle) * clampedDist;
        const posY = Math.sin(angle) * clampedDist;

        setStickPos({ x: posX, y: posY });

        // Normalized input (-1 to 1)
        const normX = posX / maxRadius;
        const normZ = posY / maxRadius;
        onMove({ x: normX, z: -normZ }); // Z forward
      }
    }
  };

  const handleJoyEnd = (e) => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === stickTouchId.current) {
        stickTouchId.current = null;
        setStickActive(false);
        setStickPos({ x: 0, y: 0 });
        onMove({ x: 0, z: 0 });
      }
    }
  };

  // Handle Swipe/Drag to Aim on right screen zone
  const handleAimStart = (e) => {
    // Avoid capturing button touches
    if (e.target.closest('button')) return;
    const touch = e.changedTouches[0];
    aimTouchId.current = touch.identifier;
    lastAimPos.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleAimMove = (e) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === aimTouchId.current) {
        const dx = touch.clientX - lastAimPos.current.x;
        const dy = touch.clientY - lastAimPos.current.y;
        lastAimPos.current = { x: touch.clientX, y: touch.clientY };
        onAimDelta({ dYaw: dx * 0.008, dPitch: -dy * 0.008 });
      }
    }
  };

  const handleAimEnd = (e) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === aimTouchId.current) {
        aimTouchId.current = null;
      }
    }
  };

  // Fire Button Charge Hold Logic
  const startCharging = (e) => {
    e.preventDefault();
    if (!isMyTurn) return;

    setCharging(true);
    setChargeProgress(0);
    chargeStartRef.current = performance.now();

    chargeTimerRef.current = setInterval(() => {
      const elapsed = (performance.now() - chargeStartRef.current) / 1000;
      const progress = Math.min(1.0, elapsed / 1.5);
      setChargeProgress(progress);
      if (progress >= 1.0) {
        // Auto fire at max charge
        stopCharging();
      }
    }, 30);
  };

  const stopCharging = () => {
    if (!charging) return;
    clearInterval(chargeTimerRef.current);
    const elapsed = (performance.now() - chargeStartRef.current) / 1000;
    const finalPower = Math.min(1.0, Math.max(0.15, elapsed / 1.5));

    setCharging(false);
    setChargeProgress(0);
    onFire(selectedWeapon, finalPower, { timer: fuseSeconds });
  };

  const weaponDef = WEAPONS.find((w) => w.id === selectedWeapon) || WEAPONS[0];

  return (
    <div
      ref={touchAimRef}
      onTouchStart={handleAimStart}
      onTouchMove={handleAimMove}
      onTouchEnd={handleAimEnd}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'auto',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        overflow: 'hidden',
      }}
    >
      {/* LEFT ZONE: Virtual Joystick */}
      <div
        ref={joystickRef}
        onTouchStart={handleJoyStart}
        onTouchMove={handleJoyMove}
        onTouchEnd={handleJoyEnd}
        onTouchCancel={handleJoyEnd}
        style={{
          position: 'absolute',
          bottom: 24,
          left: 24,
          width: 120,
          height: 120,
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.15)',
          border: '2px solid rgba(255, 255, 255, 0.35)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          touchAction: 'none',
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: '50%',
            background: stickActive ? '#ffb703' : 'rgba(255, 255, 255, 0.8)',
            transform: `translate(${stickPos.x}px, ${stickPos.y}px)`,
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
            transition: stickActive ? 'none' : 'transform 0.15s ease-out',
          }}
        />
      </div>

      {/* RIGHT ZONE: Action Buttons */}
      {isMyTurn ? (
        <div
          style={{
            position: 'absolute',
            bottom: 20,
            right: 20,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: 12,
            pointerEvents: 'auto',
          }}
        >
          {/* Fuse selector if weapon supports timer */}
          {weaponDef?.timer && (
            <div
              style={{
                display: 'flex',
                gap: 6,
                background: 'rgba(0,0,0,0.6)',
                padding: '4px 8px',
                borderRadius: 20,
              }}
            >
              {[1, 2, 3, 4, 5].map((sec) => (
                <button
                  key={sec}
                  onClick={() => {
                    setFuseSeconds(sec);
                    onFuseChange(sec);
                  }}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: fuseSeconds === sec ? '#e63946' : 'rgba(255,255,255,0.2)',
                    color: '#fff',
                    fontWeight: 'bold',
                    border: 'none',
                    fontSize: 14,
                    cursor: 'pointer',
                  }}
                >
                  {sec}s
                </button>
              ))}
            </div>
          )}

          {/* Action Row */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              onClick={onToggleCamera}
              style={{
                width: 50,
                height: 50,
                borderRadius: '50%',
                background: 'rgba(0,0,0,0.65)',
                border: '2px solid rgba(255,255,255,0.3)',
                color: '#fff',
                fontSize: 22,
                cursor: 'pointer',
              }}
              title="Vista General"
            >
              👁️
            </button>

            <button
              onClick={onToggleAim}
              style={{
                width: 50,
                height: 50,
                borderRadius: '50%',
                background: 'rgba(0,0,0,0.65)',
                border: '2px solid rgba(255,255,255,0.3)',
                color: '#fff',
                fontSize: 22,
                cursor: 'pointer',
              }}
              title="Apuntar"
            >
              🎯
            </button>

            <button
              onClick={() => setShowWeaponsGrid(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: 24,
                background: 'rgba(0,0,0,0.7)',
                border: '2px solid #ffd166',
                color: '#fff',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: 24 }}>{weaponDef?.icon || '🥚'}</span>
              <span>{weaponDef?.name || 'Armas'}</span>
              <span
                style={{
                  background: '#e63946',
                  borderRadius: 12,
                  padding: '2px 6px',
                  fontSize: 12,
                }}
              >
                {inventory[selectedWeapon] === Infinity ? '∞' : inventory[selectedWeapon] ?? 1}
              </span>
            </button>
          </div>

          {/* Main Jump and Fire Row */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                onClick={onJump}
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  background: '#2a9d8f',
                  border: '2px solid rgba(255,255,255,0.4)',
                  color: '#fff',
                  fontWeight: 'bold',
                  fontSize: 13,
                  boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                  cursor: 'pointer',
                }}
              >
                SALTAR
              </button>
              <button
                onClick={onBackflip}
                style={{
                  width: 56,
                  height: 40,
                  borderRadius: 20,
                  background: '#264653',
                  border: '1px solid rgba(255,255,255,0.3)',
                  color: '#fff',
                  fontWeight: 'bold',
                  fontSize: 10,
                  cursor: 'pointer',
                }}
              >
                ATRÁS ⤴
              </button>
            </div>

            {/* BIG FIRE BUTTON */}
            <div style={{ position: 'relative' }}>
              {/* Circular power charge progress ring */}
              {charging && (
                <div
                  style={{
                    position: 'absolute',
                    inset: -6,
                    borderRadius: '50%',
                    border: '5px solid #ffb703',
                    transform: `scale(${1 + chargeProgress * 0.15})`,
                    boxShadow: '0 0 15px #ffb703',
                    pointerEvents: 'none',
                  }}
                />
              )}
              <button
                onTouchStart={startCharging}
                onTouchEnd={stopCharging}
                onMouseDown={startCharging}
                onMouseUp={stopCharging}
                style={{
                  width: 86,
                  height: 86,
                  borderRadius: '50%',
                  background: charging
                    ? 'radial-gradient(circle, #ffb703, #e63946)'
                    : 'linear-gradient(135deg, #e63946, #c1121f)',
                  border: '3px solid rgba(255,255,255,0.8)',
                  color: '#fff',
                  fontWeight: '900',
                  fontSize: 16,
                  letterSpacing: 1,
                  boxShadow: '0 6px 18px rgba(230, 57, 70, 0.6)',
                  cursor: 'pointer',
                  touchAction: 'none',
                }}
              >
                {charging ? `${Math.round(chargeProgress * 100)}%` : 'DISPARAR'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* WHEN NOT MY TURN: Quick Reactions */
        <div
          style={{
            position: 'absolute',
            bottom: 20,
            right: 20,
            display: 'flex',
            gap: 10,
            background: 'rgba(0,0,0,0.5)',
            padding: '6px 12px',
            borderRadius: 30,
            backdropFilter: 'blur(4px)',
          }}
        >
          {['¡Pío!', '😂', '😱', '👏'].map((emoji) => (
            <button
              key={emoji}
              onClick={() => onReact(emoji)}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                borderRadius: '50%',
                width: 44,
                height: 44,
                fontSize: 20,
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* WEAPONS MODAL GRID */}
      {showWeaponsGrid && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(8px)',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            padding: 20,
            overflowY: 'auto',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
            }}
          >
            <h2 style={{ color: '#ffd166', margin: 0, fontSize: 20 }}>Arsenal del Gallinero</h2>
            <button
              onClick={() => setShowWeaponsGrid(false)}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                color: '#fff',
                borderRadius: '50%',
                width: 36,
                height: 36,
                fontSize: 18,
                cursor: 'pointer',
              }}
            >
              ✕
            </button>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
              gap: 10,
            }}
          >
            {[...WEAPONS, ...UTILITIES].map((w) => {
              const ammo = inventory[w.id] === Infinity ? '∞' : inventory[w.id] ?? 0;
              const hasAmmo = ammo === '∞' || ammo > 0;
              const isSelected = selectedWeapon === w.id;

              return (
                <button
                  key={w.id}
                  disabled={!hasAmmo}
                  onClick={() => {
                    onSelectWeapon(w.id);
                    setShowWeaponsGrid(false);
                  }}
                  style={{
                    background: isSelected
                      ? 'linear-gradient(135deg, #e63946, #c1121f)'
                      : hasAmmo
                      ? 'rgba(255,255,255,0.1)'
                      : 'rgba(255,255,255,0.03)',
                    border: isSelected ? '2px solid #ffd166' : '1px solid rgba(255,255,255,0.15)',
                    borderRadius: 12,
                    padding: 10,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 6,
                    color: hasAmmo ? '#fff' : '#666',
                    cursor: hasAmmo ? 'pointer' : 'not-allowed',
                    textAlign: 'center',
                  }}
                >
                  <span style={{ fontSize: 28 }}>{w.icon}</span>
                  <span style={{ fontWeight: 'bold', fontSize: 13 }}>{w.name}</span>
                  <span
                    style={{
                      background: hasAmmo ? 'rgba(0,0,0,0.5)' : '#444',
                      borderRadius: 10,
                      padding: '2px 8px',
                      fontSize: 12,
                    }}
                  >
                    {ammo}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
