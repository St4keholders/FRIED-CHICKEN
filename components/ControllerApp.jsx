'use client';
import { useEffect, useRef, useState } from 'react';
import { PEER_PREFIX, TEAM_COLORS, SLOT_NAMES, islandName, weaponById } from '../game/constants';
import { peerOptionsFromURL } from '../game/peeropts';
import { Audio } from '../game/audio';
import { ConfigPanel, ConfigSummary, TeamBars, Results, MyChicken } from './Shared';
import { TurnPad, SensPanel } from './TouchControls';

function getPid() {
  try {
    let id = localStorage.getItem('fc_pid');
    if (!id) { id = Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem('fc_pid', id); }
    return id;
  } catch (e) { return Math.random().toString(36).slice(2); }
}
function loadPrefs() {
  const def = { view: null, sound: true, sens: 'media', invertY: false };
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

  const connRef = useRef(null);
  const mirrorRef = useRef(null);
  const stageRef = useRef(null);
  const audioRef = useRef(null);
  const inp = useRef({ mx: 0, my: 0, fire: false, jumpHeld: false });
  const lastSent = useRef('');
  const viewOnRef = useRef(false);

  const send = (m) => { const c = connRef.current; if (c && c.open) { try { c.send(m); } catch (e) { /* nada */ } } };

  // código desde el link
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const c = (q.get('c') || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (c.length === 5) setCode(c);
    const upd = () => setPortrait(window.innerHeight > window.innerWidth);
    upd();
    window.addEventListener('resize', upd);
    return () => window.removeEventListener('resize', upd);
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
      case 'lobby': setLobby(m); break;
      case 'phase':
        setPhase(m.phase); setResults(m.results || null);
        if (m.phase !== 'match') setTurn(null);
        break;
      case 'turn': setTurn(m); setPaused(!!m.paused); break;
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

  const noScreen = lobby && lobby.noScreen;
  const viewOn = prefs.view === null ? !!noScreen : prefs.view;
  viewOnRef.current = viewOn;

  // vista del juego en el celular
  useEffect(() => {
    if (phase !== 'match' || !viewOn || !stageRef.current) return undefined;
    let mv = null, raf = 0, alive = true, last = performance.now();
    import('../game/mirror').then(({ MirrorView }) => {
      if (!alive) return;
      mv = new MirrorView(stageRef.current, lobby && lobby.cfg ? lobby.cfg.quality : 'normal');
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
  }, [phase, viewOn, status]); // eslint-disable-line

  // mandar controles mientras es tu turno
  const myTurn = !!(turn && turn.you && phase === 'match');
  useEffect(() => {
    if (!myTurn) return undefined;
    const id = setInterval(() => {
      const s = JSON.stringify(inp.current);
      if (s !== lastSent.current || Math.random() < 0.15) { lastSent.current = s; send({ t: 'in', ...inp.current, jh: inp.current.jumpHeld }); }
    }, 33);
    return () => { clearInterval(id); inp.current = { mx: 0, my: 0, fire: false, jumpHeld: false }; send({ t: 'in', mx: 0, my: 0, fire: false, jh: false }); };
  }, [myTurn]); // eslint-disable-line

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
      <div className="ctrl" onPointerDown={initAudio}>
        <div className="scroll">
          <div className="stack" style={{ maxWidth: 560, margin: '0 auto' }}>
            <MyChicken me={me} slot={slot} players={lobby.players} cfg={lobby.cfg} onPick={pick} />
            <div className="card">
              <div className="lab" style={{ marginTop: 0 }}>Ver el juego en este celular</div>
              <div className="seg">
                <button className={viewOn ? 'on' : ''} onClick={() => setPref({ view: true })}>📺 Sí, verlo aquí</button>
                <button className={!viewOn ? 'on' : ''} onClick={() => setPref({ view: false })}>🎮 Solo mando</button>
              </div>
              <div className="small" style={{ marginTop: 6 }}>{noScreen ? 'No hay pantalla principal: lo normal es verlo aquí.' : 'Con la pantalla principal basta con "Solo mando".'}</div>
              <SensPanel sens={prefs.sens} invertY={prefs.invertY} onChange={setPref} />
            </div>
            {isHost ? (
              <div className="card">
                <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6, flexWrap: 'wrap' }}>
                  <h3 style={{ margin: 0 }}>Ajustes (los manejas tú)</h3>
                  <span className="pill isl-pill">🗺️ {islandName(lobby.cfg.island)}</span>
                </div>
                <ConfigPanel cfg={lobby.cfg} onCfg={(cfg) => send({ t: 'cfg', cfg })} canEdit humans={humans} />
                <button className="btn red big" style={{ width: '100%', marginTop: 14 }} onClick={() => { initAudio(); goFullscreen(); send({ t: 'start' }); }}>¡A PELEAR!</button>
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
  const pauseBtn = <button className="btn sm white" onClick={() => send({ t: 'pause' })}>II</button>;
  return (
    <div className="ctrl" onPointerDown={() => { initAudio(); }}>
      {viewOn && phase !== 'lobby' && <div className="mstage" ref={stageRef} />}
      <div className="top">
        <span className="pill" style={{ background: me ? TEAM_COLORS[me.color].hex : '#999', color: '#fff' }}>{SLOT_NAMES[slot]}</span>
        <span className="sp" />
        {phase === 'match' && pauseBtn}
        <button className="btn sm white" onClick={() => setPref({ view: !viewOn })}>{viewOn ? '🎮 Solo mando' : '📺 Ver juego'}</button>
        {viewOn && <button className="btn sm white" onClick={() => setPref({ sound: !prefs.sound })}>{prefs.sound ? '🔊' : '🔇'}</button>}
      </div>
      {phase === 'match' && info && (viewOn || !myTurn) && (
        <div className="mhud" style={viewOn ? {} : { display: 'none' }}>
          <span className="tb" style={{ '--tc': info.color }}>{info.cpu ? '🤖 ' : ''}{info.teamName}</span>
          <span className={`clock ${info.retreat ? 'ret' : info.clock <= 5 ? 'warn' : ''}`}>{info.retreat || info.clock}</span>
        </div>
      )}
      {phase === 'match' && myTurn && info && (
        <TurnPad
          info={info}
          inv={turn.inv}
          prefs={prefs}
          onInput={(i) => { inp.current = i; }}
          onAct={(a) => send({ t: 'act', a })}
          onAim={({ dyaw, dpitch }) => send({ t: 'aimd', dyaw, dpitch })}
        />
      )}
      {phase === 'match' && myTurn && info && !viewOn && (
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
        <div className="spect" style={viewOn ? { top: 'auto', bottom: 12, transform: 'translateX(-50%)' } : {}}>
          {!viewOn && (
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
      {phase === 'results' && <Results r={results} canAct={isHost} onAgain={() => send({ t: 'next', v: 'again' })} onLobby={() => send({ t: 'next', v: 'lobby' })} />}
      {phase === 'match' && portrait && <div className="rot"><div><div className="ph">📱</div>Gira el celular para jugar</div></div>}
    </div>
  );
}

export { weaponById };
