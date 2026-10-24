'use client';
import { useEffect, useRef, useState } from 'react';
import { PEER_PREFIX, TEAM_COLORS, SLOT_NAMES, WEAPONS, sensRad, islandName, weaponById } from '../game/constants';
import { peerOptionsFromURL } from '../game/peeropts';
import { Audio } from '../game/audio';
import { ConfigPanel, ConfigSummary, TeamBars, MatchHud, Radar, Results, MyChicken, CinematicOverlay } from './Shared';
import { TurnPad, WeaponGrid, SensPanel } from './TouchControls';

function getPid() {
  try {
    let id = localStorage.getItem('fc_pid');
    if (!id) { id = Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem('fc_pid', id); }
    return id;
  } catch (e) { return Math.random().toString(36).slice(2); }
}
function loadPrefs() {
  const def = { view: null, sound: true, sens: 'media', invertY: false, pcMode: null };
  try { return { ...def, ...(JSON.parse(localStorage.getItem('fc_ctrl') || 'null') || {}) }; } catch (e) { return def; }
}
function savePrefs(p) { try { localStorage.setItem('fc_ctrl', JSON.stringify(p)); } catch (e) { /* nada */ } }
async function goFullscreen() {
  try {
    const el = document.documentElement;
    if (!document.fullscreenElement && el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
    if (screen.orientation && screen.orientation.lock) await screen.orientation.lock('landscape').catch(() => {});
  } catch (e) { /* nada */ }
}
function vib(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* nada */ } }

export default function ControllerApp() {
  const [code, setCode] = useState(null);
  const [typed, setTyped] = useState('');
  const [status, setStatus] = useState('idle');
  const [slot, setSlot] = useState(null);
  const [lobby, setLobby] = useState(null);
  const [phase, setPhase] = useState('lobby');
  const [results, setResults] = useState(null);
  const [turn, setTurn] = useState(null);
  const [paused, setPaused] = useState(false);
  const [prefs, setPrefs] = useState(loadPrefs);
  const [portrait, setPortrait] = useState(false);
  const [finePtr, setFinePtr] = useState(() => (typeof window !== 'undefined' && window.matchMedia ? (window.matchMedia('(pointer: fine)').matches && !window.matchMedia('(pointer: coarse)').matches) : false));
  const [pcGrid, setPcGrid] = useState(false);
  const [cinema, setCinema] = useState(null);
  const [story, setStory] = useState(null);
  const [unlockedZorro, setUnlockedZorro] = useState(false);
  const [fps, setFps] = useState(60);
  const [fpsToast, setFpsToast] = useState('');
  const [dismissRot, setDismissRot] = useState(false);
  const showFps = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('fps') === '1';

  const connRef = useRef(null);
  const mirrorRef = useRef(null);
  const stageRef = useRef(null);
  const audioRef = useRef(null);
  const inp = useRef({ mx: 0, my: 0, fire: false, jumpHeld: false });
  const lastSent = useRef('');
  const viewOnRef = useRef(false);
  const keysRef = useRef(new Set());
  const mouseFireRef = useRef(false);
  const pcLockedRef = useRef(false);
  const lastMouseRef = useRef(null);
  const aimAccRef = useRef({ dyaw: 0, dpitch: 0 });
  const turnRef = useRef(null);
  const pausedRef = useRef(false);
  const myTurnRef = useRef(false);
  const pcGridRef = useRef(false);
  turnRef.current = turn;
  pausedRef.current = paused;
  pcGridRef.current = pcGrid;

  const send = (m) => { const c = connRef.current; if (c && c.open) { try { c.send(m); } catch (e) { /* nada */ } } };

  // código desde el link
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const c = (q.get('c') || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (c.length === 5) setCode(c);
    if (window.matchMedia) {
      setFinePtr(window.matchMedia('(pointer: fine)').matches && !window.matchMedia('(pointer: coarse)').matches);
    }
    const upd = () => setPortrait(window.innerHeight > window.innerWidth);
    upd();
    window.addEventListener('resize', upd);
    window.addEventListener('orientationchange', upd);
    return () => {
      window.removeEventListener('resize', upd);
      window.removeEventListener('orientationchange', upd);
    };
  }, []);

  // conexión con el anfitrión
  useEffect(() => {
    if (!code) return undefined;
    let peer = null, alive = true, retry = null;
    setStatus('connecting');
    const connect = async () => {
      const { Peer } = await import('peerjs');
      if (!alive) return;
      peer = new Peer(undefined, peerOptionsFromURL());
      peer.on('open', () => {
        const conn = peer.connect(PEER_PREFIX + code, { reliable: true, serialization: 'json' });
        connRef.current = conn;
        conn.on('open', () => { setStatus('ok'); conn.send({ t: 'hello', pid: getPid() }); });
        conn.on('data', onData);
        conn.on('close', () => { if (!alive) return; setStatus('lost'); retry = setTimeout(reconnect, 2000); });
        conn.on('error', () => {});
      });
      peer.on('error', (e) => {
        if (!alive) return;
        if (e.type === 'peer-unavailable') setStatus('nohost');
        else setStatus('lost');
        retry = setTimeout(reconnect, 2500);
      });
    };
    const reconnect = () => { try { peer && peer.destroy(); } catch (e) { /* nada */ } if (alive) connect(); };
    connect();
    return () => { alive = false; clearTimeout(retry); try { peer && peer.destroy(); } catch (e) { /* nada */ } };
  }, [code]); // eslint-disable-line

  const onData = (m) => {
    if (!m || typeof m !== 'object') return;
    switch (m.t) {
      case 'welcome': setSlot(m.slot); break;
      case 'full': setStatus('full'); break;
      case 'busy': setStatus('busy'); break;
      case 'kicked': setStatus('kicked'); break;
      case 'lobby':
        setLobby(m);
        if (m.unlockedZorro !== undefined) setUnlockedZorro(!!m.unlockedZorro);
        break;
      case 'phase':
        setPhase(m.phase);
        setResults(m.results || null);
        setCinema(m.cinema || null);
        setStory(m.story || null);
        if (m.unlockedZorro !== undefined) setUnlockedZorro(!!m.unlockedZorro);
        if (m.phase !== 'match') { setTurn(null); setPcGrid(false); }
        break;
      case 'turn':
        setTurn(m);
        setPaused(!!m.paused);
        if (m.story) setStory(m.story);
        break;
      case 'paused': setPaused(!!m.v); break;
      case 'buzz': vib(m.ms || 60); break;
      case 'minit': if (mirrorRef.current) mirrorRef.current.setInit(m); else pendingInit.current = m; break;
      case 'edit':
        if (mirrorRef.current) {
          if (m.reset && mirrorRef.current.init) { mirrorRef.current.setInit({ ...mirrorRef.current.init, edits: m.list }); break; }
          if (mirrorRef.current.edits(m.from, m.list)) send({ t: 'resync' });
        }
        break;
      case 'snap':
        if (m.cine) setCinema(m.cine);
        if (mirrorRef.current) {
          mirrorRef.current.snap(m);
          for (const e of m.fx || []) { mirrorRef.current.fx(e); playFx(e); }
        }
        break;
      default: break;
    }
  };
  const pendingInit = useRef(null);
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;
  const playFx = (e) => {
    const a = audioRef.current;
    if (!a || !prefsRef.current.sound) return;
    if (e.k === 'sfx') a.sfx(e.s);
    else if (e.k === 'boom') a.sfx('boom', e.r);
    else if (e.k === 'say') a.chirp(3, 1);
  };

  const pcMode = prefs.pcMode === null || prefs.pcMode === undefined ? finePtr : !!prefs.pcMode;
  const noScreen = lobby && lobby.noScreen;
  const viewOn = pcMode ? true : (prefs.view === null ? !!noScreen : prefs.view);
  viewOnRef.current = viewOn;

  // vista del juego en el celular o en modo PC
  useEffect(() => {
    if ((phase !== 'match' && phase !== 'cinematic') || !viewOn || !stageRef.current) return undefined;
    let mv = null, raf = 0, alive = true, last = performance.now();
    import('../game/mirror').then(({ MirrorView }) => {
      if (!alive) return;
      mv = new MirrorView(stageRef.current, lobby && lobby.cfg ? lobby.cfg.quality : 'normal', !pcMode);
      mv.onFps = (f) => setFps(f);
      mv.onLowFps = () => {
        setFpsToast('⚡ Modo ahorro activado para mayor fluidez');
        setTimeout(() => setFpsToast(''), 4000);
      };
      mirrorRef.current = mv;
      window.__fcMirror = mv;
      if (pendingInit.current) { mv.setInit(pendingInit.current); pendingInit.current = null; }
      send({ t: 'view', on: true });
      const loop = (now) => {
        if (!alive) return;
        raf = requestAnimationFrame(loop);
        const dt = Math.min(0.1, (now - last) / 1000); last = now;
        mv.frame(dt);
      };
      raf = requestAnimationFrame(loop);
    });
    return () => { alive = false; cancelAnimationFrame(raf); if (mv) mv.dispose(); mirrorRef.current = null; send({ t: 'view', on: false }); };
  }, [phase, viewOn, status, pcMode]); // eslint-disable-line

  // mandar controles mientras es tu turno
  const myTurn = !!(turn && turn.you && phase === 'match');
  myTurnRef.current = myTurn;
  useEffect(() => {
    if (!myTurn) { setPcGrid(false); return undefined; }
    const id = setInterval(() => {
      const s = JSON.stringify(inp.current);
      if (s !== lastSent.current || Math.random() < 0.15) { lastSent.current = s; send({ t: 'in', ...inp.current, jh: inp.current.jumpHeld }); }
    }, 33);
    return () => {
      clearInterval(id);
      keysRef.current.clear();
      mouseFireRef.current = false;
      inp.current = { mx: 0, my: 0, fire: false, jumpHeld: false };
      send({ t: 'in', mx: 0, my: 0, fire: false, jh: false });
    };
  }, [myTurn]); // eslint-disable-line

  // controles de teclado y mouse en modo PC
  useEffect(() => {
    if (!pcMode || phase !== 'match') return undefined;
    const syncKbIn = () => {
      const k = keysRef.current;
      const mx = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
      const my = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
      const fire = k.has('Space') || mouseFireRef.current;
      const jumpHeld = k.has('KeyJ') || k.has('Enter');
      inp.current = { mx, my, fire, jumpHeld };
      if (myTurnRef.current && !pausedRef.current) {
        const s = JSON.stringify(inp.current);
        if (s !== lastSent.current) { lastSent.current = s; send({ t: 'in', ...inp.current, jh: inp.current.jumpHeld }); }
      }
    };
    const cyclePcWeapon = (dir) => {
      const t = turnRef.current;
      if (!t || !t.info) return;
      const list = WEAPONS.filter((w) => w.id !== 'rendirse' && ((t.inv ? t.inv[w.id] : -1) !== 0));
      const i = list.findIndex((w) => w.id === t.info.weapon);
      const next = list[(i + dir + list.length) % list.length];
      if (next) send({ t: 'act', a: { t: 'weapon', w: next.id } });
    };
    const onKeyDown = (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT')) return;
      const c = e.code;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab', 'Backspace'].includes(c)) e.preventDefault();
      initAudio();
      const first = !keysRef.current.has(c);
      keysRef.current.add(c);
      syncKbIn();
      if (!first) return;
      if (c === 'KeyM') { const p = prefsRef.current; const n = { ...p, sound: !p.sound }; setPrefs(n); savePrefs(n); return; }
      if (c === 'KeyP') { send({ t: 'pause' }); return; }
      if (c === 'Escape') {
        if (pcGridRef.current) { setPcGrid(false); return; }
        if (document.pointerLockElement && document.exitPointerLock) { try { document.exitPointerLock(); } catch (err) { /* nada */ } pcLockedRef.current = false; return; }
        if (pcLockedRef.current) { pcLockedRef.current = false; return; }
        send({ t: 'pause' });
        return;
      }
      if (!myTurnRef.current || pausedRef.current) return;
      if (c === 'KeyJ' || c === 'Enter') send({ t: 'act', a: { t: 'jump' } });
      else if (c === 'KeyK' || c === 'Backspace') send({ t: 'act', a: { t: 'back' } });
      else if (c === 'KeyR') send({ t: 'act', a: { t: 'aim' } });
      else if (c === 'KeyC') send({ t: 'act', a: { t: 'view' } });
      else if (c === 'KeyV') send({ t: 'act', a: { t: 'fp' } });
      else if (c === 'Tab' && turnRef.current && turnRef.current.info && turnRef.current.info.canPick) send({ t: 'act', a: { t: 'pickch', d: e.shiftKey ? -1 : 1 } });
      else if (c === 'KeyE' || c === 'Tab') cyclePcWeapon(1);
      else if (c === 'KeyQ') cyclePcWeapon(-1);
      else if (/^Digit[1-5]$/.test(c)) send({ t: 'act', a: { t: 'fuse', v: Number(c.slice(-1)) } });
    };
    const onKeyUp = (e) => {
      keysRef.current.delete(e.code);
      syncKbIn();
    };
    const onMouseDown = (e) => {
      if (!myTurnRef.current || pausedRef.current || pcGridRef.current) return;
      if (e.target && e.target.closest && e.target.closest('button, .card, .top, .modal, .wgrid')) return;
      initAudio();
      if (e.button === 2) {
        e.preventDefault();
        pcLockedRef.current = true;
        lastMouseRef.current = { x: e.clientX, y: e.clientY };
        send({ t: 'act', a: { t: 'aim' } });
        return;
      }
      if (e.button === 0) {
        const el = stageRef.current;
        const hasLock = !!(el && document.pointerLockElement === el);
        if (!pcLockedRef.current && !hasLock) {
          if (el && el.requestPointerLock) {
            try { el.requestPointerLock(); } catch (err) { /* nada */ }
          }
          pcLockedRef.current = true;
          lastMouseRef.current = { x: e.clientX, y: e.clientY };
          return;
        }
        mouseFireRef.current = true;
        syncKbIn();
      }
    };
    const onMouseUp = (e) => {
      if (e.button === 0 && mouseFireRef.current) {
        mouseFireRef.current = false;
        syncKbIn();
      }
    };
    const onMouseMove = (e) => {
      if (!myTurnRef.current || pausedRef.current || pcGridRef.current) return;
      const hasLock = !!(stageRef.current && document.pointerLockElement === stageRef.current);
      if (!pcLockedRef.current && !hasLock) return;
      const dx = hasLock ? (e.movementX || 0) : (lastMouseRef.current ? e.clientX - lastMouseRef.current.x : (e.movementX || 0));
      const dy = hasLock ? (e.movementY || 0) : (lastMouseRef.current ? e.clientY - lastMouseRef.current.y : (e.movementY || 0));
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
      if (!dx && !dy) return;
      const p = prefsRef.current || {};
      const rad = sensRad(p.sens || 'media');
      const inv = p.invertY ? -1 : 1;
      aimAccRef.current.dyaw += dx * rad;
      aimAccRef.current.dpitch += -dy * rad * inv;
    };
    const onWheel = (e) => {
      if (!myTurnRef.current || pausedRef.current || pcGridRef.current) return;
      if (e.deltaY !== 0) { e.preventDefault(); cyclePcWeapon(e.deltaY > 0 ? 1 : -1); }
    };
    const onContext = (e) => {
      if (myTurnRef.current && !pausedRef.current) e.preventDefault();
    };
    const flushAim = () => {
      const a = aimAccRef.current;
      if ((Math.abs(a.dyaw) > 1e-6 || Math.abs(a.dpitch) > 1e-6) && myTurnRef.current && !pausedRef.current) {
        send({ t: 'aimd', dyaw: +a.dyaw.toFixed(5), dpitch: +a.dpitch.toFixed(5) });
        aimAccRef.current = { dyaw: 0, dpitch: 0 };
      }
    };
    const aimTimer = setInterval(flushAim, 33);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('contextmenu', onContext);
    return () => {
      clearInterval(aimTimer);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('contextmenu', onContext);
    };
  }, [pcMode, phase]); // eslint-disable-line

  const initAudio = () => {
    if (!audioRef.current) audioRef.current = new Audio();
    audioRef.current.init();
  };
  const setPref = (p) => { const n = { ...prefs, ...p }; setPrefs(n); savePrefs(n); };

  // ---------------- pantallas ----------------
  if (!code) {
    return (
      <div className="ctrl"><div className="scroll" style={{ display: 'grid', placeItems: 'center' }}>
        <div className="card" style={{ width: 'min(380px, 100%)', textAlign: 'center' }}>
          <div className="logo" style={{ fontSize: 44 }}>FRIED<span className="l2">CHICKEN</span></div>
          <p style={{ fontWeight: 800 }}>Escribe el código que sale en la pantalla</p>
          <input className="txt" style={{ textAlign: 'center', fontSize: 30, letterSpacing: 6, fontFamily: 'var(--font)' }} maxLength={5} value={typed} onChange={(e) => setTyped(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} />
          <button className="btn red big" style={{ marginTop: 14, width: '100%' }} disabled={typed.length !== 5} onClick={() => setCode(typed)}>Entrar</button>
        </div>
      </div></div>
    );
  }
  if (status !== 'ok' || slot === null || !lobby) {
    const txt = {
      idle: 'Conectando…', connecting: 'Conectando con la pantalla…', lost: 'Se perdió la conexión. Reintentando…', nohost: 'No encuentro esa sala. ¿Está abierta la pantalla? Reintentando…',
      full: 'La sala está llena (máximo 4 jugadores).', busy: 'La partida ya empezó. Espera a que vuelvan al lobby.', kicked: 'Te sacaron de la sala.', ok: 'Entrando…',
    }[status] || 'Conectando…';
    return (
      <div className="ctrl"><div className="scroll" style={{ display: 'grid', placeItems: 'center' }}>
        <div className="card" style={{ width: 'min(380px, 100%)', textAlign: 'center' }}>
          <div style={{ fontSize: 54 }}>🐣</div>
          <h3>{txt}</h3>
          <div className="small">Sala {code}</div>
          {['full', 'kicked', 'busy'].includes(status) && <button className="btn white" style={{ marginTop: 10 }} onClick={() => window.location.reload()}>Reintentar</button>}
        </div>
      </div></div>
    );
  }

  const me = lobby.players[slot];
  const isHost = lobby.host;
  const humans = lobby.players.filter(Boolean).length;

  if (phase === 'lobby' && me) {
    const pick = (m) => { initAudio(); send({ t: 'pick', ...m }); };
    return (
      <div className={`ctrl ${pcMode ? 'pcmode' : ''}`} onPointerDown={initAudio} onTouchStart={initAudio}>
        {showFps && <div className="fps-badge">⚡ {fps || 60} FPS</div>}
        {fpsToast && <div className="fps-toast">{fpsToast}</div>}
        <div className="scroll">
          <div className="stack" style={{ maxWidth: 560, margin: '0 auto' }}>
            <MyChicken me={me} slot={slot} players={lobby.players} cfg={lobby.cfg} onPick={pick} unlockedZorro={unlockedZorro} />
            <div className="card">
              <div className="lab" style={{ marginTop: 0 }}>Dispositivo y controles</div>
              <div className="seg">
                <button type="button" data-mode="pc" className={pcMode ? 'on' : ''} onClick={() => setPref({ pcMode: true })}>🖥️ Modo PC (teclado y mouse)</button>
                <button type="button" data-mode="phone" className={!pcMode ? 'on' : ''} onClick={() => setPref({ pcMode: false })}>📱 Modo celular (táctil)</button>
              </div>
              {!pcMode ? (
                <>
                  <div className="lab">Ver el juego en este celular</div>
                  <div className="seg">
                    <button className={viewOn ? 'on' : ''} onClick={() => setPref({ view: true })}>📺 Sí, verlo aquí</button>
                    <button className={!viewOn ? 'on' : ''} onClick={() => setPref({ view: false })}>🎮 Solo mando</button>
                  </div>
                  <div className="small" style={{ marginTop: 6 }}>{noScreen ? 'No hay pantalla principal: lo normal es verlo aquí.' : 'Con la pantalla principal basta con "Solo mando".'}</div>
                </>
              ) : (
                <div className="small" style={{ marginTop: 6 }}>Modo PC activo: verás el juego a pantalla completa y jugarás con teclado y mouse.</div>
              )}
              <SensPanel sens={prefs.sens} invertY={prefs.invertY} onChange={setPref} />
            </div>
            {isHost ? (
              <div className="card">
                <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6, flexWrap: 'wrap' }}>
                  <h3 style={{ margin: 0 }}>Ajustes (los manejas tú)</h3>
                  <span className="pill isl-pill">{lobby.cfg.mode === 'historia' ? `📖 Nivel ${lobby.cfg.storyLevel || 1}` : `🗺️ ${islandName(lobby.cfg.island)}`}</span>
                </div>
                <ConfigPanel cfg={lobby.cfg} onCfg={(cfg) => send({ t: 'cfg', cfg })} canEdit humans={humans} />
                <button className="btn red big" style={{ width: '100%', marginTop: 14 }} onClick={() => { initAudio(); if (!pcMode) goFullscreen(); send({ t: 'start' }); }}>¡A PELEAR!</button>
              </div>
            ) : (
              <div className="card" style={{ textAlign: 'center' }}>
                <h3 style={{ margin: 0 }}>Esperando a que J1 empiece…</h3>
                <div className="small" style={{ marginTop: 4 }}>{lobby.players.filter(Boolean).length} jugador(es) en la sala · Solo J1 cambia los ajustes</div>
                <ConfigSummary cfg={lobby.cfg} />
                <button className="btn white sm" style={{ marginTop: 10 }} onClick={() => { initAudio(); goFullscreen(); }}>Pantalla completa</button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ---------------- partida ----------------
  const info = turn && turn.info;
  const teams = turn && turn.teams;
  const myTeam = turn ? turn.myTeam : -1;
  const pauseBtn = <button className="btn sm white" onClick={() => send({ t: 'pause' })}>II Pausa</button>;
  const hudTurn = info ? { ...info, inv: turn.inv } : null;
  const camYaw = mirrorRef.current && mirrorRef.current.renderer ? mirrorRef.current.renderer.camYaw : 0;

  return (
    <div className={`ctrl ${pcMode ? 'pcmode' : ''}`} onPointerDown={() => { initAudio(); }} onTouchStart={() => { initAudio(); }}>
      {showFps && <div className="fps-badge">⚡ {fps || 60} FPS</div>}
      {fpsToast && <div className="fps-toast">{fpsToast}</div>}
      {viewOn && phase !== 'lobby' && <div className="mstage" ref={stageRef} />}
      {phase === 'cinematic' && cinema && (
        <CinematicOverlay
          cinema={cinema}
          isHost={isHost}
          onNext={() => send({ t: 'cine', act: 'next' })}
          onSkip={() => send({ t: 'cine', act: 'skip' })}
        />
      )}
      {pcMode && phase === 'match' && (
        <MatchHud
          turn={hudTurn}
          matchPhase={info ? (info.retreat ? 'retreat' : 'play') : 'wait'}
          wind={turn ? turn.wind : null}
          camYaw={camYaw}
          teams={teams}
          radar={turn ? turn.radar : null}
          sudden={turn ? turn.sudden : false}
          suddenIn={turn ? turn.suddenIn : 0}
          showSudden={phase === 'match' && (!lobby || !lobby.cfg || lobby.cfg.mode !== 'historia')}
          story={story}
          kbTurn={myTurn}
          onOpenWeapons={myTurn && info ? () => setPcGrid(true) : null}
          onPickChicken={myTurn && info && info.canPick ? (d) => send({ t: 'act', a: { t: 'pickch', d } }) : null}
          onToggleFp={myTurn && info ? () => send({ t: 'act', a: { t: 'fp' } }) : null}
        >
          {pcGrid && myTurn && info && (
            <WeaponGrid
              inv={turn.inv}
              current={info.weapon}
              onClose={() => setPcGrid(false)}
              onPick={(id) => { send({ t: 'act', a: { t: 'weapon', w: id } }); setPcGrid(false); }}
              onSurrender={() => { send({ t: 'act', a: { t: 'surrender' } }); setPcGrid(false); }}
            />
          )}
        </MatchHud>
      )}
      <div className="top">
        <span className="pill" style={{ background: me ? TEAM_COLORS[me.color].hex : '#999', color: '#fff' }}>{SLOT_NAMES[slot]}</span>
        {!pcMode && <span className="sp" />}
        {phase === 'match' && pauseBtn}
        {pcMode ? (
          <button className="btn sm white" onClick={() => setPref({ pcMode: false })}>📱 Modo celular</button>
        ) : (
          <>
            <button className="btn sm white" onClick={() => setPref({ view: !viewOn })}>{viewOn ? '🎮 Solo mando' : '📺 Ver juego'}</button>
            {finePtr && <button className="btn sm white" onClick={() => setPref({ pcMode: true })}>🖥️ Modo PC</button>}
          </>
        )}
        {viewOn && <button className="btn sm white" onClick={() => setPref({ sound: !prefs.sound })}>{prefs.sound ? '🔊' : '🔇'}</button>}
      </div>
      {!pcMode && viewOn && phase === 'match' && turn && turn.radar && (
        <Radar items={turn.radar} camYaw={camYaw} small />
      )}
      {!pcMode && phase === 'match' && story && (
        <div className="story-goal-card" style={{ top: 52 }}>
          <div className="story-goal-title">🎯 Nivel {story.n ?? story.level}: {story.name ?? story.levelName}</div>
          <div className="story-goal-sub">{story.goalText}</div>
        </div>
      )}
      {!pcMode && phase === 'match' && info && (viewOn || !myTurn) && (
        <div className="mhud" style={viewOn ? {} : { display: 'none' }}>
          <span className="tb" style={{ '--tc': info.color }}>{info.cpu ? '🤖 ' : ''}{info.teamName}</span>
          <span className={`clock ${info.retreat ? 'ret' : info.clock <= 5 ? 'warn' : ''}`}>{info.retreat || info.clock}</span>
        </div>
      )}
      {!pcMode && phase === 'match' && myTurn && info && (
        <TurnPad
          info={info}
          inv={turn.inv}
          prefs={prefs}
          onInput={(i) => { inp.current = i; }}
          onAct={(a) => send({ t: 'act', a })}
          onAim={({ dyaw, dpitch }) => send({ t: 'aimd', dyaw, dpitch })}
        />
      )}
      {!pcMode && phase === 'match' && myTurn && info && !viewOn && (
        <div className="spect" style={{ top: 30, transform: 'translateX(-50%)', pointerEvents: 'none' }}>
          <div className="card" style={{ padding: '8px 12px', display: 'inline-flex', gap: 10, alignItems: 'center' }}>
            <b style={{ fontFamily: 'var(--font)', fontSize: 18 }}>¡Tu turno!</b>
            <span>{info.ch}</span>
            <span className={`clock ${info.retreat ? 'ret' : info.clock <= 5 ? 'warn' : ''}`} style={{ width: 44, height: 44, fontSize: 18 }}>{info.retreat || info.clock}</span>
            <span className="small">💨 {info.wind}</span>
          </div>
        </div>
      )}
      {phase === 'match' && !myTurn && (
        <div className="spect" style={pcMode ? { top: 'auto', bottom: 56, right: 16, left: 'auto', transform: 'none', width: 'auto' } : (viewOn ? { top: 'auto', bottom: 12, transform: 'translateX(-50%)' } : {})}>
          {!viewOn && !pcMode && (
            <div className="card">
              {info ? (
                <>
                  <div className="small">Ahora juega</div>
                  <div style={{ fontFamily: 'var(--font)', fontSize: 26, color: info.color, WebkitTextStroke: '1px var(--ink)' }}>{info.cpu ? '🤖 ' : ''}{info.teamName}</div>
                  <div style={{ fontWeight: 800 }}>{info.ch} · {info.retreat ? `escondiéndose ${info.retreat}s` : `${info.clock}s`} · 💨 {info.wind}</div>
                </>
              ) : <h3 style={{ margin: 0 }}>Preparando el siguiente turno…</h3>}
              <TeamBars teams={teams} current={info ? info.team : -1} className="minibar" />
            </div>
          )}
          <div className="react">
            {['🐔', '😂', '😱', '👏'].map((e) => <button key={e} onClick={() => { vib(10); send({ t: 'react', e }); }}>{e}</button>)}
          </div>
          {myTeam < 0 && <div className="small">Estás mirando</div>}
        </div>
      )}
      {paused && phase === 'match' && (
        <div className="modal">
          <div className="card">
            <div className="res-title">Pausa</div>
            <div style={{ margin: '10px 0 14px', textAlign: 'left' }}>
              <SensPanel sens={prefs.sens} invertY={prefs.invertY} onChange={setPref} />
            </div>
            <div className="btns" style={{ marginTop: 10 }}>
              <button className="btn green big" onClick={() => send({ t: 'pause' })}>▶ Seguir</button>
              {isHost && <button className="btn white" onClick={() => send({ t: 'quit' })}>Salir al lobby</button>}
            </div>
          </div>
        </div>
      )}
      {phase === 'results' && (
        <Results
          r={results}
          canAct={isHost}
          onAgain={() => send({ t: 'next', v: 'again' })}
          onLobby={() => send({ t: 'next', v: 'lobby' })}
          onNextStory={() => send({ t: 'story_next' })}
          onRetryStory={() => send({ t: 'story_retry' })}
          onSkipStory={() => send({ t: 'story_skip' })}
        />
      )}
      {!pcMode && phase === 'match' && portrait && !dismissRot && (
        <div className="rot">
          <div>
            <div className="ph">📱</div>
            Gira el celular para jugar
            <div style={{ marginTop: 14 }}>
              <button type="button" className="btn sm white" onClick={() => setDismissRot(true)}>Seguir vertical</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export { weaponById };
