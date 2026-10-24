'use client';
import { useState } from 'react';
import { chickenPortrait } from '../game/render';
import { ACCESSORIES, SLOT_NAMES, TEAM_NAMES, MODES, TEAM_MODES, CPU_LEVELS, TURN_TIMES, HP_OPTIONS, CHICKEN_COUNTS, SUDDEN_OPTIONS, QUALITY, ISLANDS, RANDOM_ISLAND, islandName, WEAPON_SETS, TEAM_COLORS } from '../game/constants';

function Seg({ value, options, onChange, disabled }) {
  return (
    <div className="seg">
      {options.map((o) => (
        <button key={String(o.id)} className={value === o.id ? 'on' : ''} disabled={disabled} onClick={() => onChange(o.id)}>{o.name}</button>
      ))}
    </div>
  );
}

// panel de ajustes de la partida (TV y celular de J1)
export function ConfigPanel({ cfg, onCfg, canEdit, humans = 1, compact = false }) {
  const set = (k) => (v) => onCfg({ [k]: v });
  const coop = cfg.mode === 'coop';
  const minCpu = coop || humans < 2 ? 1 : 0;
  const maxCpu = Math.max(minCpu, Math.min(3, 4 - (cfg.teamMode === 'shared' && humans > 1 ? (coop ? 1 : 2) : humans)));
  const cpuOpts = [0, 1, 2, 3].filter((n) => n >= minCpu && n <= maxCpu).map((n) => ({ id: n, name: String(n) }));
  const cpuVal = Math.max(minCpu, Math.min(maxCpu, cfg.cpuTeams));
  return (
    <div>
      <div className="lab">Modo</div>
      <Seg value={cfg.mode} options={MODES} onChange={set('mode')} disabled={!canEdit} />
      <div className="lab">Equipos de jugadores</div>
      <Seg value={cfg.teamMode} options={TEAM_MODES} onChange={set('teamMode')} disabled={!canEdit} />
      <div className="row" style={{ gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div className="lab">Equipos CPU</div>
          <Seg value={cpuVal} options={cpuOpts} onChange={set('cpuTeams')} disabled={!canEdit} />
        </div>
        <div style={{ flex: 1.4 }}>
          <div className="lab">Dificultad CPU</div>
          <Seg value={cfg.cpuLevel} options={CPU_LEVELS} onChange={set('cpuLevel')} disabled={!canEdit} />
        </div>
      </div>
      <div className="lab">Isla: <span className="isl-sel-name">{islandName(cfg.island)}</span></div>
      <div className="isl-grid">
        <button
          type="button"
          className={`isl-btn ${cfg.island === RANDOM_ISLAND ? 'on' : ''}`}
          data-island={RANDOM_ISLAND}
          disabled={!canEdit}
          onClick={() => onCfg({ island: RANDOM_ISLAND })}
        >
          <span className="isl-sw rnd">🎲</span>
          <span className="isl-nm">🎲 Aleatoria</span>
        </button>
        {ISLANDS.map((i) => (
          <button
            key={i.id}
            type="button"
            className={`isl-btn ${cfg.island === i.id ? 'on' : ''}`}
            data-island={i.id}
            disabled={!canEdit}
            onClick={() => onCfg({ island: i.id })}
          >
            <span className="isl-sw">
              {i.colors.map((c, idx) => <i key={idx} style={{ background: c }} />)}
            </span>
            <span className="isl-nm">{i.name}</span>
          </button>
        ))}
      </div>
      <div className="row" style={{ gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div className="lab">Pollitos por equipo</div>
          <Seg value={cfg.chickens} options={CHICKEN_COUNTS.map((n) => ({ id: n, name: String(n) }))} onChange={set('chickens')} disabled={!canEdit} />
        </div>
        <div style={{ flex: 1 }}>
          <div className="lab">Vida</div>
          <Seg value={cfg.hp} options={HP_OPTIONS.map((n) => ({ id: n, name: String(n) }))} onChange={set('hp')} disabled={!canEdit} />
        </div>
      </div>
      <div className="row" style={{ gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div className="lab">Reloj del turno</div>
          <Seg value={cfg.turnTime} options={TURN_TIMES.map((n) => ({ id: n, name: `${n}s` }))} onChange={set('turnTime')} disabled={!canEdit} />
        </div>
        <div style={{ flex: 1 }}>
          <div className="lab">Armas</div>
          <Seg value={cfg.weaponSet} options={WEAPON_SETS} onChange={set('weaponSet')} disabled={!canEdit} />
        </div>
      </div>
      {!compact && (
        <>
          <div className="row" style={{ gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div className="lab">Muerte súbita</div>
              <Seg value={cfg.sudden} options={SUDDEN_OPTIONS.map((n) => ({ id: n, name: `${n} min` }))} onChange={set('sudden')} disabled={!canEdit} />
            </div>
          </div>
          {coop && (
            <>
              <div className="lab">Fuego amigo entre aliados</div>
              <Seg value={cfg.friendly} options={[{ id: false, name: 'No' }, { id: true, name: 'Sí' }]} onChange={set('friendly')} disabled={!canEdit} />
            </>
          )}
          <div className="lab">Calidad gráfica</div>
          <Seg value={cfg.quality} options={QUALITY} onChange={set('quality')} disabled={!canEdit} />
        </>
      )}
    </div>
  );
}

// flecha del viento relativa a la cámara
export function Wind({ wind, camYaw }) {
  if (!wind) return null;
  const s = Math.hypot(wind.x, wind.z);
  const y = camYaw || 0;
  const wf = wind.x * Math.sin(y) + wind.z * Math.cos(y), wr = -wind.x * Math.cos(y) + wind.z * Math.sin(y);
  const deg = (Math.atan2(wr, wf) * 180) / Math.PI;
  const bars = Math.round(s * 5);
  return (
    <div className="card windc">
      <div className="arr" style={{ transform: `rotate(${deg}deg)`, opacity: s < 0.05 ? 0.3 : 1 }}>⬆</div>
      <div>
        <div style={{ fontFamily: 'var(--font)', fontSize: 13 }}>Viento</div>
        <div className="bars">{[0, 1, 2, 3, 4].map((i) => <i key={i} className={i < bars ? 'on' : ''} style={{ height: 8 + i * 4 }} />)}</div>
      </div>
    </div>
  );
}

export function TeamBars({ teams, current, className = 'teamsb' }) {
  if (!teams) return null;
  return (
    <div className={className}>
      {teams.map((t) => (
        <div key={t.idx} className={`card teamb ${t.alive ? '' : 'out'} ${current === t.idx ? 'now' : ''}`} style={{ '--tc': t.color }}>
          <div className="tn2"><span>{t.cpu ? '🤖 ' : ''}{t.name}</span><span>{t.hp}</span></div>
          <div className="hb"><i style={{ width: `${t.max ? Math.min(100, (t.hp / t.max) * 100) : 0}%` }} /></div>
        </div>
      ))}
    </div>
  );
}

export function Results({ r, canAct, onAgain, onLobby, waiting }) {
  if (!r) return null;
  return (
    <div className="modal">
      <div className="card">
        <div className={`res-title ${r.coop && !r.win ? 'lose' : ''}`}>{r.title}</div>
        <div className="res-sub">{r.sub}</div>
        {r.teams.map((t) => (
          <div key={t.idx} className={`res-team ${t.won ? 'won' : ''}`} style={{ '--tc': t.color }}>
            <span className="dot" />
            <span className="nm">{t.won ? '🏆 ' : ''}{t.cpu ? '🤖 ' : ''}{t.name}</span>
            <span className="st">Daño hecho: {t.dmg}<br />Al agua: {t.drown} · Autogol: {t.self}</span>
          </div>
        ))}
        {r.awards.length > 0 && (
          <div className="awards">
            {r.awards.map((a) => <span key={a.label} className="pill" style={{ background: '#fff' }}>⭐ {a.label}: <b style={{ color: a.color }}>{a.name}</b> ({a.n})</span>)}
          </div>
        )}
        {canAct ? (
          <div className="btns">
            <button className="btn green big" onClick={onAgain}>🔁 Revancha</button>
            <button className="btn white" onClick={onLobby}>Volver al lobby</button>
          </div>
        ) : <div className="res-sub">{waiting || 'J1 decide si hay revancha…'}</div>}
      </div>
    </div>
  );
}

export const teamColor = (i) => (TEAM_COLORS[i] || TEAM_COLORS[0]).hex;

// tarjeta para personalizar tu equipo (celular de cada jugador y celular que crea la sala)
export function MyChicken({ me, slot, players, cfg, onPick }) {
  const [editNames, setEditNames] = useState(false);
  const c = TEAM_COLORS[me.color];
  const used = new Set(players.filter((p, i) => p && i !== slot).map((p) => p.color));
  return (
    <div className="card">
      <div className="me" style={{ '--tc': c.hex }}>
        <div className="ava"><img alt="" src={chickenPortrait(c.hex, me.acc)} /></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span className="pill" style={{ background: c.hex, color: '#fff' }}>{SLOT_NAMES[slot]}{slot === 0 ? ' 👑' : ''}</span>
          <div className="row" style={{ marginTop: 6, gap: 6 }}>
            <input className="txt" maxLength={20} value={me.teamName} onChange={(e) => onPick({ teamName: e.target.value })} />
            <button className="btn sm white" onClick={() => onPick({ teamName: TEAM_NAMES[Math.floor(Math.random() * TEAM_NAMES.length)] })}>🎲</button>
          </div>
        </div>
      </div>
      <div className="lab">Color del equipo</div>
      <div className="sw">
        {TEAM_COLORS.map((t, i) => (i === 4 ? null : <button key={i} className={me.color === i ? 'on' : ''} disabled={used.has(i)} style={{ background: t.hex }} onClick={() => onPick({ color: i })} />))}
      </div>
      <div className="lab">Accesorio</div>
      <div className="accs">
        {ACCESSORIES.map((a) => <button key={a.id} title={a.name} className={me.acc === a.id ? 'on' : ''} onClick={() => onPick({ acc: a.id })}><img alt={a.name} src={chickenPortrait(c.hex, a.id, false, 96)} /></button>)}
      </div>
      <button className="btn sm white" style={{ marginTop: 12 }} onClick={() => setEditNames(!editNames)}>✏️ Nombres de tus pollitos</button>
      {editNames && (
        <div className="row" style={{ flexWrap: 'wrap', marginTop: 8 }}>
          {me.names.map((n, i) => (
            <input key={i} className="txt" style={{ flex: '1 1 40%' }} maxLength={12} defaultValue={n} onBlur={(e) => { const names = me.names.slice(); names[i] = e.target.value; onPick({ names }); }} />
          ))}
        </div>
      )}
      {cfg.teamMode === 'shared' && cfg.mode === 'versus' && (
        <>
          <div className="lab">Tu equipo (compartido)</div>
          <div className="seg">
            {[0, 1, 2, 3].map((g) => <button key={g} className={me.team === g ? 'on' : ''} style={{ background: me.team === g ? TEAM_COLORS[g].hex : '#fff', color: me.team === g ? '#fff' : 'var(--ink)' }} onClick={() => onPick({ team: g })}>Equipo {g + 1}</button>)}
          </div>
        </>
      )}
    </div>
  );
}
