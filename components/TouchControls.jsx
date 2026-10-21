'use client';
import { useEffect, useRef, useState } from 'react';
import { WEAPONS, weaponById } from '../game/constants';

function vib(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* nada */ } }

// Joystick virtual: devuelve mx (derecha +) y my (arriba +) entre -1 y 1
function Joystick({ onMove, top = 'Avanzar', bottom = 'Retroceder' }) {
  const ref = useRef(null);
  const knob = useRef(null);
  const id = useRef(null);
  const set = (x, y) => {
    if (knob.current) knob.current.style.transform = `translate(${x * 42}px, ${-y * 42}px)`;
    onMove(x, y);
  };
  const move = (e) => {
    const r = ref.current.getBoundingClientRect();
    let x = (e.clientX - (r.left + r.width / 2)) / (r.width / 2 - 20);
    let y = -(e.clientY - (r.top + r.height / 2)) / (r.height / 2 - 20);
    const d = Math.hypot(x, y);
    if (d > 1) { x /= d; y /= d; }
    set(x, y);
  };
  return (
    <div
      ref={ref}
      className="joy"
      onPointerDown={(e) => { id.current = e.pointerId; ref.current.setPointerCapture(e.pointerId); move(e); }}
      onPointerMove={(e) => { if (e.pointerId === id.current) move(e); }}
      onPointerUp={(e) => { if (e.pointerId === id.current) { id.current = null; set(0, 0); } }}
      onPointerCancel={() => { id.current = null; set(0, 0); }}
    >
      <b className="t">{top}</b>
      <b className="bt">{bottom}</b>
      <i ref={knob} />
    </div>
  );
}

// Botón que se mantiene apretado
function HoldBtn({ className, onDown, onUp, children }) {
  const [p, setP] = useState(false);
  return (
    <button
      className={`${className} ${p ? 'press' : ''}`}
      onPointerDown={(e) => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); setP(true); onDown && onDown(); }}
      onPointerUp={() => { setP(false); onUp && onUp(); }}
      onPointerCancel={() => { setP(false); onUp && onUp(); }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}
    </button>
  );
}

export function WeaponGrid({ inv, current, onPick, onClose, onSurrender }) {
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="wgrid" onClick={onClose}>
      <div className="card" onClick={(e) => e.stopPropagation()}>
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
          <h3 style={{ margin: 0 }}>Armas</h3>
          <button className="btn sm white" onClick={onClose}>Cerrar ✕</button>
        </div>
        <div className="grid">
          {WEAPONS.map((w) => {
            const n = inv ? inv[w.id] : -1;
            if (w.id === 'rendirse') {
              return (
                <button key={w.id} className="w util" onClick={() => (confirm ? onSurrender() : setConfirm(true))}>
                  <span className="ic">{w.icon}</span><span className="nm">{confirm ? '¿Seguro? Toca otra vez' : w.name}</span>
                </button>
              );
            }
            return (
              <button key={w.id} className={`w ${w.util ? 'util' : ''} ${current === w.id ? 'on' : ''}`} disabled={n === 0} onClick={() => onPick(w.id)}>
                <span className="ct">{n < 0 ? '∞' : `×${n}`}</span>
                <span className="ic">{w.icon}</span><span className="nm">{w.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function hintFor(info) {
  if (!info) return '';
  const w = weaponById(info.weapon);
  if (info.walker) return 'Toca DISPARAR para hacer explotar a Mamá Gallina';
  if (info.retreat) return `¡Escóndete! ${info.retreat} s`;
  if (info.rope) return 'Joystick: balancearte y subir/bajar · SALTAR: soltarte';
  if (info.jet) return 'Mantén SALTAR para subir · joystick para moverte';
  if (info.mode === 'target') return 'Mueve la mira roja con el joystick y toca DISPARAR';
  if (info.charging) return 'Suelta para lanzar';
  if (w.aim === 'power') return info.mode === 'aim' ? 'Joystick: apuntar · Mantén DISPARAR para la fuerza' : 'Toca 🎯 para apuntar · Mantén DISPARAR';
  if (w.aim === 'melee') return 'Acércate al rival y toca DISPARAR';
  if (w.aim === 'drop') return 'Toca DISPARAR para dejarla y ¡corre!';
  if (w.id === 'cuerda') return 'Apunta hacia arriba y toca DISPARAR para engancharte';
  return w.desc;
}

// Controles del jugador del turno
export function TurnPad({ info, inv, onInput, onAct }) {
  const st = useRef({ mx: 0, my: 0, fire: false, jumpHeld: false });
  const [grid, setGrid] = useState(false);
  const send = () => onInput({ ...st.current });
  useEffect(() => () => { st.current = { mx: 0, my: 0, fire: false, jumpHeld: false }; onInput({ ...st.current }); }, []); // eslint-disable-line
  if (!info) return null;
  const w = weaponById(info.weapon);
  const n = inv ? inv[w.id] : -1;
  const aimMode = info.mode === 'aim';
  return (
    <div className="pad">
      <Joystick
        top={info.mode === 'target' ? 'Mover mira' : aimMode ? 'Subir mira' : info.rope ? 'Subir' : 'Avanzar'}
        bottom={info.mode === 'target' ? '' : aimMode ? 'Bajar mira' : info.rope ? 'Bajar' : 'Retroceder'}
        onMove={(x, y) => { st.current.mx = x; st.current.my = y; send(); }}
      />
      {!info.retreat && !info.walker && (
        <button className="wbtn" onClick={() => setGrid(true)}>
          <span className="ic">{w.icon}</span>
          <span>{w.name}</span>
          <span className="ct">{n < 0 ? '∞' : `×${n}`}</span>
        </button>
      )}
      {w.fuse && !info.retreat && (
        <div className="fusebar">
          {[1, 2, 3, 4, 5].map((v) => <button key={v} className={info.fuse === v ? 'on' : ''} onClick={() => onAct({ t: 'fuse', v })}>{v}s</button>)}
        </div>
      )}
      <div className="acts">
        <button className={`rb ${aimMode ? 'on' : ''}`} onClick={() => { vib(15); onAct({ t: 'aim' }); }}><span><span className="e">🎯</span>Apuntar</span></button>
        <HoldBtn className="rb jump" onDown={() => { vib(15); st.current.jumpHeld = true; send(); onAct({ t: 'jump' }); }} onUp={() => { st.current.jumpHeld = false; send(); }}>
          <span><span className="e">⤴</span>Saltar</span>
        </HoldBtn>
        <HoldBtn className={`rb fire ${info.charging ? 'charging' : ''}`} onDown={() => { vib(25); st.current.fire = true; send(); }} onUp={() => { st.current.fire = false; send(); }}>
          <span><span className="e">💥</span>DISPARAR</span>
        </HoldBtn>
        <button className="rb" onClick={() => { vib(15); onAct({ t: 'view' }); }}><span><span className="e">👁</span>Mapa</span></button>
        <button className="rb" onClick={() => { vib(15); onAct({ t: 'back' }); }}><span><span className="e">↩</span>Atrás</span></button>
      </div>
      <div className="hint">{hintFor(info)}</div>
      {grid && (
        <WeaponGrid
          inv={inv} current={info.weapon}
          onClose={() => setGrid(false)}
          onPick={(id) => { onAct({ t: 'weapon', w: id }); setGrid(false); }}
          onSurrender={() => { onAct({ t: 'surrender' }); setGrid(false); }}
        />
      )}
    </div>
  );
}
