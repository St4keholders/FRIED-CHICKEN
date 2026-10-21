'use client';
import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { PASSWORD_HASH, TEAM_COLORS, SLOT_NAMES, ACCESSORIES, weaponById } from '../game/constants';
import { sha256 } from '../game/sha256';
import { peerParamsString } from '../game/peeropts';
import { chickenPortrait } from '../game/render';
import { ConfigPanel, Wind, TeamBars, Results, MyChicken } from './Shared';
import { TurnPad } from './TouchControls';

function Gate({ onOk }) {
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const go = async () => {
    const h = await sha256(pw);
    if (h === PASSWORD_HASH) { try { localStorage.setItem('fc_ok', h); } catch (e) { /* nada */ } onOk(); }
    else setErr('Esa no es la contraseña');
  };
  return (
    <div className="gate">
      <div className="card">
        <div className="logo">FRIED<span className="l2">CHICKEN</span></div>
        <p>Guerra de pollitos por turnos</p>
        <input className="txt" type="password" placeholder="Contraseña" value={pw} autoFocus onChange={(e) => { setPw(e.target.value); setErr(''); }} onKeyDown={(e) => e.key === 'Enter' && go()} />
        {err && <div className="err">{err}</div>}
        <button className="btn red big" style={{ marginTop: 16, width: '100%' }} onClick={go}>Entrar al gallinero</button>
      </div>
    </div>
  );
}

function SlotCard({ p, i, onRemove, canRemove, shared }) {
  if (!p) {
    return (
      <div className="card slot empty">
        <div className="ava">🥚</div>
        <div><span className="who" style={{ '--tc': '#b9a77e' }}>{SLOT_NAMES[i]}</span><div className="tn">Libre</div><div className="meta">Escanea el QR para entrar</div></div>
      </div>
    );
  }
  const c = TEAM_COLORS[p.color];
  const acc = ACCESSORIES.find((a) => a.id === p.acc);
  const kind = p.kind === 'local' ? 'Este celular' : p.kind === 'kb' ? 'Teclado' : p.connected ? 'Celular' : 'Desconectado';
  return (
    <div className="card slot" style={{ '--tc': c.hex }}>
      <div className="ava"><img alt="" src={chickenPortrait(c.hex, p.acc)} /></div>
      <div style={{ minWidth: 0 }}>
        <span className="who">{SLOT_NAMES[i]}{i === 0 ? ' 👑' : ''}</span>
        <div className="tn">{p.teamName}</div>
        <div className="meta">{acc ? acc.name : ''} · {kind}{shared ? ` · Equipo ${p.team + 1}` : ''}</div>
      </div>
      {canRemove && <button className="x" title="Sacar" onClick={() => onRemove(i)}>✕</button>}
    </div>
  );
}

export default function HostApp() {
  const [ok, setOk] = useState(() => { try { return localStorage.getItem('fc_ok') === PASSWORD_HASH; } catch (e) { return false; } });
  const stage = useRef(null);
  const host = useRef(null);
  const [st, setSt] = useState(null);
  const [qr, setQr] = useState('');
  const [url, setUrl] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!ok || !stage.current) return undefined;
    let h;
    let alive = true;
    import('../game/host').then(({ GameHost }) => {
      if (!alive) return;
      h = new GameHost(stage.current, (s) => setSt(s));
      host.current = h;
      setSt(h.snapshot());
    });
    return () => { alive = false; if (h) h.destroy(); host.current = null; };
  }, [ok]);

  useEffect(() => {
    if (!st || !st.code) return;
    const u = `${window.location.origin}/mando?c=${st.code}${peerParamsString()}`;
    setUrl(u);
    QRCode.toDataURL(u, { margin: 1, width: 360, errorCorrectionLevel: 'M', color: { dark: '#3b2314', light: '#ffffff' } }).then(setQr).catch(() => setQr(''));
  }, [st && st.code]); // eslint-disable-line

  if (!ok) return <Gate onOk={() => setOk(true)} />;
  const h = host.current;
  const share = async () => {
    const text = `¡Únete a Fried Chicken! Código: ${st.code}`;
    try { if (navigator.share) { await navigator.share({ title: 'Fried Chicken', text, url }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(url); setMsg('¡Link copiado!'); } catch (e) { setMsg(url); }
    setTimeout(() => setMsg(''), 3000);
  };
  const unlockAudio = () => { if (h) { h.audio.init(); if (st && st.phase === 'lobby' && h.audio.song === -1) h.audio.playSong(0); } };

  return (
    <div className="stage" ref={stage} onPointerDown={unlockAudio}>
      {st && st.phase === 'lobby' && <Lobby st={st} h={h} qr={qr} url={url} share={share} msg={msg} />}
      {st && (st.phase === 'match' || st.phase === 'results') && <Hud st={st} h={h} />}
    </div>
  );
}

function Lobby({ st, h, qr, url, share, msg }) {
  const humans = st.players.filter(Boolean).length;
  const shared = st.cfg.teamMode === 'shared';
  return (
    <div className="lobby">
      <div className="logo">FRIED<span className="l2">CHICKEN</span><small>Guerra de pollitos por turnos · conecta tu celular y a pelear</small></div>
      <div className="card join">
        <h3>Únete con tu celular</h3>
        {qr ? <img className="qr" src={qr} alt="QR para unirse" /> : <div className="qr" />}
        <div className="code">{st.code || '·····'}</div>
        <div className="small">{url.split('?')[0].replace(/^https?:\/\//, '')}</div>
        <div className="row" style={{ justifyContent: 'center', marginTop: 10, flexWrap: 'wrap' }}>
          <button className="btn blue sm" onClick={share}>📤 Compartir link</button>
          {st.touch && st.local === null && <button className="btn green sm" onClick={() => h.addLocal()}>🎮 Jugar en este celular</button>}
        </div>
        {msg && <div className="status">{msg}</div>}
        {!st.touch && <div className="small" style={{ marginTop: 10 }}>¿Sin celular? Pulsa <b>Espacio</b> para jugar con el teclado</div>}
        <div className={`status ${st.peerStatus === 'error' ? 'err' : ''}`}>{st.peerStatus === 'ready' ? '🟢 Listo para recibir mandos' : st.peerStatus === 'error' ? st.peerError : '🟡 Conectando…'}</div>
      </div>
      {st.local !== null && st.players[st.local] && (
        <div className="localc"><MyChicken me={st.players[st.local]} slot={st.local} players={st.players} cfg={st.cfg} onPick={(m) => h.pick(st.local, m)} /></div>
      )}
      <div className="card cfgc">
        <h3>Ajustes de la partida</h3>
        <ConfigPanel cfg={st.cfg} onCfg={(c) => h.setCfg(c)} canEdit humans={humans} />
      </div>
      <div className="slots">
        {[0, 1, 2, 3].map((i) => <SlotCard key={i} i={i} p={st.players[i]} shared={shared && st.cfg.mode === 'versus'} canRemove onRemove={(s) => h.removePlayer(s)} />)}
        <button className="btn red big go" disabled={!humans} onClick={() => h.startMatch()}>¡A PELEAR!</button>
      </div>
    </div>
  );
}

function Hud({ st, h }) {
  const t = st.turn;
  const w = t ? weaponById(t.weapon) : null;
  const n = t && t.inv ? t.inv[t.weapon] : -1;
  const clockVal = t ? (t.retreat ? t.retreat : t.clock) : '';
  const showPlay = t && (st.matchPhase === 'play' || st.matchPhase === 'retreat');
  const isHost = true;
  return (
    <div className="hud">
      {showPlay && (
        <div className="turnp">
          <div className="tb" style={{ '--tc': t.color }}>{t.cpu ? '🤖 ' : ''}{t.teamName}<small>{t.ch}{t.dd ? ' · 💪 Doble daño' : ''}</small></div>
          <div className={`clock ${t.retreat ? 'ret' : t.clock <= 5 ? 'warn' : ''}`}>{clockVal}</div>
        </div>
      )}
      <Wind wind={st.wind} camYaw={st.camYaw} />
      {showPlay && w && !st.localTurn && (
        <div className="card wpn">
          <span className="ic">{w.icon}</span>
          <div><div className="nm">{w.name}</div><div className="am">{n < 0 ? 'Munición infinita' : `Quedan ${n}`}{w.fuse ? ` · Mecha ${t.fuse}s` : ''}</div></div>
        </div>
      )}
      {showPlay && t.charging && <div className="powerbar"><i style={{ width: `${Math.round(t.power * 100)}%` }} /></div>}
      {st.phase === 'match' && st.local === null && <div className="pill sudden">{st.sudden ? '💀 Muerte súbita' : `💀 Muerte súbita en ${Math.floor(st.suddenIn / 60)}:${String(st.suddenIn % 60).padStart(2, '0')}`}</div>}
      <TeamBars teams={st.teams} current={t ? t.team : -1} />
      {st.banner && (
        <div className="banner" style={{ '--tc': st.banner.color }}>
          <div className="bt">{st.banner.text}</div>
          {st.banner.sub && <div className="bs">{st.banner.sub}</div>}
        </div>
      )}
      {st.kbTurn && showPlay && (
        <div className="card keys">
          <b>Teclado:</b> W/S caminar · A/D girar · R apuntar · Espacio (mantener) disparar · J saltar · K salto atrás · E/Q cambiar arma · 1-5 mecha · C mapa
        </div>
      )}
      {st.localTurn && showPlay && (
        <TurnPad info={t} inv={t.inv} onInput={(i) => h.setLocalIn(i)} onAct={(a) => h.localAct(a)} />
      )}
      {st.phase === 'match' && <button className="btn sm white" style={st.local !== null ? { position: 'absolute', top: 64, left: 16, pointerEvents: 'auto' } : { position: 'absolute', bottom: 16, right: 16, pointerEvents: 'auto' }} onClick={() => h.togglePause()}>II Pausa</button>}
      {st.paused && st.phase === 'match' && (
        <div className="modal">
          <div className="card">
            <div className="res-title">Pausa</div>
            <div className="btns" style={{ marginTop: 12 }}>
              <button className="btn green big" onClick={() => h.togglePause()}>▶ Seguir</button>
              <button className="btn white" onClick={() => h.quit()}>Salir al lobby</button>
            </div>
            <div className="small" style={{ marginTop: 10 }}>M silencia el sonido</div>
          </div>
        </div>
      )}
      {st.phase === 'results' && <Results r={st.results} canAct={isHost} onAgain={() => h.next('again')} onLobby={() => h.next('lobby')} />}
    </div>
  );
}
