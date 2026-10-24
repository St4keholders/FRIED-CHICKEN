'use client';
import { useState } from 'react';
import { chickenPortrait } from '../game/render';
import { ACCESSORIES, availableAccessories, FACES, BEARDS, parseLook, composeLook, randomLook, lookName, SLOT_NAMES, TEAM_NAMES, MODES, TEAM_MODES, CPU_LEVELS, TURN_TIMES, HP_OPTIONS, CHICKEN_COUNTS, SUDDEN_OPTIONS, PICK_CHICKEN_OPTIONS, QUALITY, ISLANDS, RANDOM_ISLAND, islandName, WEAPON_SETS, TEAM_COLORS, WORLD_X, WORLD_Z, weaponById, canFpWeapon } from '../game/constants';
import { LEVELS } from '../game/story';

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
  const isStory = cfg.mode === 'historia';
  const coop = cfg.mode === 'coop';
  const minCpu = coop || humans < 2 ? 1 : 0;
  const maxCpu = Math.max(minCpu, Math.min(3, 4 - (cfg.teamMode === 'shared' && humans > 1 ? (coop ? 1 : 2) : humans)));
  const cpuOpts = [0, 1, 2, 3].filter((n) => n >= minCpu && n <= maxCpu).map((n) => ({ id: n, name: String(n) }));
  const cpuVal = Math.max(minCpu, Math.min(maxCpu, cfg.cpuTeams));

  return (
    <div>
      <div className="lab">Modo</div>
      <Seg value={cfg.mode} options={MODES} onChange={set('mode')} disabled={!canEdit} />

      {isStory ? (
        <>
          <div className="lab">Nivel de la historia: <span className="isl-sel-name">{LEVELS.find((l) => l.n === (cfg.storyLevel || 1))?.name || 'Nivel 1'}</span></div>
          <div className="story-lvl-grid">
            {LEVELS.map((lvl) => (
              <button
                key={lvl.n}
                type="button"
                className={`story-lvl-btn ${cfg.storyLevel === lvl.n ? 'on' : ''}`}
                data-level={lvl.n}
                disabled={!canEdit}
                onClick={() => onCfg({ storyLevel: lvl.n })}
              >
                <span className="story-lvl-num">Nivel {lvl.n}</span>
                <span className="story-lvl-name">{lvl.name}</span>
                <span className="story-lvl-isl">🗺️ {islandName(lvl.island)}</span>
              </button>
            ))}
          </div>
          <div className="ro-note" style={{ marginTop: 8 }}>
            📖 En Modo Historia los equipos, vidas y objetivos se adaptan a cada nivel.
          </div>
          <div className="row" style={{ gap: 12, marginTop: 4 }}>
            <div style={{ flex: 1 }}>
              <div className="lab">Reloj del turno</div>
              <Seg value={cfg.turnTime} options={TURN_TIMES.map((n) => ({ id: n, name: `${n}s` }))} onChange={set('turnTime')} disabled={!canEdit} />
            </div>
            <div style={{ flex: 1 }}>
              <div className="lab">Pollito del turno</div>
              <Seg value={cfg.pickChicken || 'auto'} options={PICK_CHICKEN_OPTIONS} onChange={set('pickChicken')} disabled={!canEdit} />
            </div>
          </div>
          {!compact && (
            <>
              <div className="lab">Calidad gráfica</div>
              <Seg value={cfg.quality} options={QUALITY} onChange={set('quality')} disabled={!canEdit} />
            </>
          )}
        </>
      ) : (
        <>
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
          <div className="row" style={{ gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div className="lab">Pollito del turno</div>
              <Seg value={cfg.pickChicken || 'auto'} options={PICK_CHICKEN_OPTIONS} onChange={set('pickChicken')} disabled={!canEdit} />
            </div>
            {!compact && (
              <div style={{ flex: 1 }}>
                <div className="lab">Muerte súbita</div>
                <Seg value={cfg.sudden} options={SUDDEN_OPTIONS.map((n) => ({ id: n, name: `${n} min` }))} onChange={set('sudden')} disabled={!canEdit} />
              </div>
            )}
          </div>
          {!compact && (
            <>
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
        </>
      )}
    </div>
  );
}

// resumen de solo lectura de los ajustes (para celulares que no son J1)
export function ConfigSummary({ cfg }) {
  if (!cfg) return null;
  const isStory = cfg.mode === 'historia';
  if (isStory) {
    const lvl = LEVELS.find((l) => l.n === (cfg.storyLevel || 1)) || LEVELS[0];
    return (
      <div className="cfg-summary">
        <div className="cs-item"><span>Modo</span><b>📖 Modo Historia</b></div>
        <div className="cs-item"><span>Nivel</span><b>{lvl.n}. {lvl.name}</b></div>
        <div className="cs-item"><span>Isla</span><b>{islandName(lvl.island)}</b></div>
        <div className="cs-item"><span>Misión</span><b style={{ fontSize: 12 }}>{lvl.goalText}</b></div>
      </div>
    );
  }
  const mode = MODES.find((m) => m.id === cfg.mode)?.name || cfg.mode;
  const teamMode = TEAM_MODES.find((t) => t.id === cfg.teamMode)?.name || cfg.teamMode;
  const cpuLvl = CPU_LEVELS.find((l) => l.id === cfg.cpuLevel)?.name || 'Normal';
  const wpnSet = WEAPON_SETS.find((w) => w.id === cfg.weaponSet)?.name || cfg.weaponSet;
  return (
    <div className="cfg-summary">
      <div className="cs-item"><span>Modo</span><b>{mode}</b></div>
      <div className="cs-item"><span>Isla</span><b>{islandName(cfg.island)}</b></div>
      <div className="cs-item"><span>Equipos</span><b>{teamMode} ({cfg.chickens} 🐔)</b></div>
      <div className="cs-item"><span>CPU</span><b>{cfg.cpuTeams} · {cpuLvl}</b></div>
      <div className="cs-item"><span>Vida</span><b>{cfg.hp} HP</b></div>
      <div className="cs-item"><span>Reloj</span><b>{cfg.turnTime}s · {wpnSet}</b></div>
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

// Radar circular (tipo Worms 4) orientado según la cámara
export function Radar({ items, camYaw = 0, small = false }) {
  if (!items || !items.length) return null;
  const y = camYaw || 0;
  const sin = Math.sin(y), cos = Math.cos(y);
  const cx = WORLD_X / 2, cz = WORLD_Z / 2;
  const maxR = WORLD_X * 0.46;
  return (
    <div className={`radar ${small ? 'sm' : ''}`} aria-label="Radar de pollitos">
      <div className="radar-fov" />
      <div className="radar-cross h" />
      <div className="radar-cross v" />
      {items.map((c) => {
        const dx = c.x - cx, dz = c.z - cz;
        const fwd = dx * sin + dz * cos;
        const rgt = -dx * cos + dz * sin;
        let nx = rgt / maxR;
        let ny = -fwd / maxR;
        const d = Math.hypot(nx, ny);
        if (d > 0.85) { nx = (nx / d) * 0.85; ny = (ny / d) * 0.85; }
        const left = 50 + nx * 50;
        const top = 50 + ny * 50;
        return (
          <i
            key={c.id}
            className={`rdot ${c.active ? 'act' : ''}`}
            style={{ left: `${left.toFixed(1)}%`, top: `${top.toFixed(1)}%`, '--tc': c.color }}
          />
        );
      })}
    </div>
  );
}

// HUD compartido entre el TV y el modo PC de /mando
export function MatchHud({ turn, matchPhase, wind, camYaw, teams, radar, smallRadar = false, sudden, suddenIn = 0, showSudden = true, banner, kbTurn, hideWeapon = false, story = null, onOpenWeapons, onPickChicken, onToggleFp, children }) {
  const t = turn;
  const w = t ? weaponById(t.weapon) : null;
  const n = t && t.inv ? t.inv[t.weapon] : -1;
  const clockVal = t ? (t.retreat ? t.retreat : t.clock) : '';
  const showPlay = t && (matchPhase === 'play' || matchPhase === 'retreat');
  return (
    <div className="hud">
      {showPlay && (
        <div className="turnp">
          <div className="tb" style={{ '--tc': t.color }}>{t.cpu ? '🤖 ' : ''}{t.teamName}<small>{t.ch}{t.dd ? ' · 💪 Doble daño' : ''}{t.visor ? ' · 🔭 Visor' : ''}</small></div>
          <div className={`clock ${t.retreat ? 'ret' : t.clock <= 5 ? 'warn' : ''}`}>{clockVal}</div>
        </div>
      )}
      {story && (
        <div className="story-goal-card">
          <div className="story-goal-title">🎯 Nivel {story.n ?? story.level}: {story.name ?? story.levelName}</div>
          <div className="story-goal-sub">{story.goalText}</div>
          {story.goal === 'eggs' && (
            <div className="story-goal-extra">🥚 Huevitos: {story.eggsCollected || 0} / {story.eggsTotal || 3} · Ronda {story.round || 1}/{story.roundsMax || 8}</div>
          )}
          {story.goal === 'machines' && (
            <div className="story-goal-extra">⚙️ Máquinas restantes: {story.machinesLeft !== undefined ? story.machinesLeft : 4}</div>
          )}
          {story.goal === 'abuela' && (
            <div className="story-goal-extra">👵 Gallina Abuela: {story.abuelaHp !== undefined ? story.abuelaHp : 100} HP</div>
          )}
          {story.goal === 'survive' && (
            <div className="story-goal-extra">⏳ Supervivencia: Ronda {story.round || 1} / {story.roundsMax || 6}</div>
          )}
          {story.goal === 'boss' && (
            <div className="story-goal-extra">👑 Jefe: {story.bossName || 'Jefe'} ({story.bossHp !== undefined ? story.bossHp : '?'} HP)</div>
          )}
        </div>
      )}
      {story && story.hint && (
        <div className="story-hint-card">💡 {story.hint}</div>
      )}
      {showPlay && t.canPick && onPickChicken && (
        <div className="pickbar">
          <button type="button" className="pick-prev" onClick={() => onPickChicken(-1)}>◀</button>
          <span>🐔 Elegir: <b>{t.ch}</b> (Tab)</span>
          <button type="button" className="pick-next" onClick={() => onPickChicken(1)}>▶</button>
        </div>
      )}
      <Wind wind={wind} camYaw={camYaw} />
      <Radar items={radar} camYaw={camYaw} small={smallRadar} />
      {showPlay && w && !hideWeapon && (
        <div className="card wpn" style={onOpenWeapons ? { pointerEvents: 'auto', cursor: 'pointer' } : undefined} onClick={onOpenWeapons}>
          <span className="ic">{w.icon}</span>
          <div>
            <div className="nm">{w.name}</div>
            <div className="am">{n < 0 ? 'Munición infinita' : `Quedan ${n}`}{w.fuse ? ` · Mecha ${t.fuse}s` : ''}</div>
          </div>
          {onToggleFp && !t.retreat && !t.walker && canFpWeapon(w.id) && (
            <button type="button" className={`btn sm ${t.fp ? 'yellow' : 'white'} fp-btn`} title="Vista en primera persona (V)" onClick={(e) => { e.stopPropagation(); onToggleFp(); }}>👁‍🗨</button>
          )}
          {onOpenWeapons && !t.retreat && !t.walker && (
            <button type="button" className="btn sm yellow wopen-btn" onClick={(e) => { e.stopPropagation(); onOpenWeapons(); }}>🎒 Armas</button>
          )}
        </div>
      )}
      {showPlay && t.charging && <div className="powerbar"><i style={{ width: `${Math.round(t.power * 100)}%` }} /></div>}
      {showSudden && !story && <div className="pill sudden">{sudden ? '💀 Muerte súbita' : `💀 Muerte súbita en ${Math.floor(suddenIn / 60)}:${String(suddenIn % 60).padStart(2, '0')}`}</div>}
      <TeamBars teams={teams} current={t ? t.team : -1} />
      {banner && (
        <div className="banner" style={{ '--tc': banner.color }}>
          <div className="bt">{banner.text}</div>
          {banner.sub && <div className="bs">{banner.sub}</div>}
        </div>
      )}
      {kbTurn && showPlay && (
        <div className="card keys">
          <b>Teclado y mouse:</b> W/S caminar · A/D girar · Clic en el juego: apuntar con mouse y disparar (clic izq.) · Clic der./R: 🎯 apuntar · V: 👁‍🗨 1.ª persona · Rueda/E/Q: arma · Espacio: disparar · J/K: saltar · 1-5: mecha · C: mapa · Esc: soltar mouse
        </div>
      )}
      {children}
    </div>
  );
}

export function Results({ r, canAct, onAgain, onLobby, onNextStory, onRetryStory, onSkipStory, waiting }) {
  if (!r) return null;
  const isStory = !!r.story;
  return (
    <div className="modal">
      <div className="card" style={{ maxWidth: 520 }}>
        {isStory && (
          <div className="res-story-badge">
            📖 Modo Historia · Nivel {r.level}
          </div>
        )}
        <div className={`res-title ${r.win === false ? 'lose' : ''}`}>{r.title}</div>
        <div className="res-sub">{r.sub}</div>
        {r.unlockedZorro && (
          <div className="res-unlocked">
            🦊 <b>¡Nuevo accesorio desbloqueado!</b><br />
            Ya puedes usar el <b>Zorro Rufo (monóculo)</b> en el lobby.
          </div>
        )}
        {r.teams && r.teams.map((t) => (
          <div key={t.idx ?? t.name} className={`res-team ${t.won ? 'won' : ''}`} style={{ '--tc': t.color }}>
            <span className="dot" />
            <span className="nm">{t.won ? '🏆 ' : ''}{t.cpu ? '🤖 ' : ''}{t.name}</span>
            <span className="st">Daño hecho: {t.dmg || 0}<br />Al agua: {t.drown || 0} · Autogol: {t.self || 0}</span>
          </div>
        ))}
        {r.awards && r.awards.length > 0 && (
          <div className="awards">
            {r.awards.map((a) => <span key={a.label} className="pill" style={{ background: '#fff' }}>⭐ {a.label}: <b style={{ color: a.color }}>{a.name}</b> ({a.n})</span>)}
          </div>
        )}
        {canAct ? (
          <div className="btns" style={{ flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
            {isStory ? (
              r.win ? (
                r.level < 8 ? (
                  <>
                    <button className="btn green big" onClick={onNextStory || onAgain}>Siguiente nivel ▶</button>
                    <button className="btn white" onClick={onLobby}>Volver al lobby</button>
                  </>
                ) : (
                  <button className="btn green big" onClick={onLobby}>¡Fin de la historia! 🏠 Volver al lobby</button>
                )
              ) : (
                <>
                  <button className="btn green big" onClick={onRetryStory || onAgain}>🔄 Reintentar nivel</button>
                  <button className="btn yellow" onClick={onSkipStory}>⏭️ Saltar nivel</button>
                  <button className="btn white" onClick={onLobby}>Volver al lobby</button>
                </>
              )
            ) : (
              <>
                <button className="btn green big" onClick={onAgain}>🔁 Revancha</button>
                <button className="btn white" onClick={onLobby}>Volver al lobby</button>
              </>
            )}
          </div>
        ) : <div className="res-sub">{waiting || 'J1 decide el siguiente paso…'}</div>}
      </div>
    </div>
  );
}

export const teamColor = (i) => (TEAM_COLORS[i] || TEAM_COLORS[0]).hex;

// tarjeta para personalizar tu equipo (celular de cada jugador y celular que crea la sala)
export function MyChicken({ me, slot, players, cfg, onPick, unlockedZorro = false }) {
  const [editNames, setEditNames] = useState(false);
  const c = TEAM_COLORS[me.color];
  const used = new Set(players.filter((p, i) => p && i !== slot).map((p) => p.color));
  const accList = availableAccessories(unlockedZorro);
  const look = parseLook(me.acc);
  const [tab, setTab] = useState('head');
  const parts = { head: accList, face: FACES, beard: BEARDS };
  const setPart = (k, id) => onPick({ acc: composeLook({ ...look, [k]: id }) });
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
      <div className="row" style={{ justifyContent: 'space-between', marginTop: 10 }}>
        <div className="lab" style={{ margin: 0 }}>Apariencia: <b>{lookName(me.acc)}</b></div>
        <button className="btn sm white" onClick={() => onPick({ acc: randomLook() })}>🎲 Al azar</button>
      </div>
      <div className="seg" style={{ marginTop: 6 }}>
        {[['head', '🎩 Cabeza'], ['face', '🥸 Cara'], ['beard', '🧔 Barba']].map(([k, n]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{n}</button>)}
      </div>
      <div className="accs" style={{ marginTop: 8 }}>
        {parts[tab].map((a) => {
          const preview = composeLook({ ...look, [tab]: a.id });
          return <button key={a.id} title={a.name} className={look[tab] === a.id ? 'on' : ''} onClick={() => setPart(tab, a.id)}><img alt={a.name} src={chickenPortrait(c.hex, preview, false, 96, tab === 'head' ? 'body' : 'head')} /><span className="accn">{a.name}</span></button>;
        })}
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

// pantalla superpuesta de cinemáticas (TV, celular y PC)
export function CinematicOverlay({ cinema, isHost = false, onNext, onSkip }) {
  if (!cinema) return null;
  const { i = 0, n = 1, speaker, text } = cinema;
  const spColor = speaker ? speaker.color : '#ffd23f';
  const spName = speaker ? speaker.name : 'Narradora';
  const spAcc = speaker ? speaker.acc : 'gorra';
  const isRobot = speaker ? !!speaker.robot : false;
  const portraitSrc = chickenPortrait(spColor, spAcc, isRobot, 140);

  return (
    <div className="cine-overlay" onClick={() => onNext && onNext()}>
      <div className="cine-letterbox top" />
      <div className="cine-wrap">
        <div className="cine-card" onClick={(e) => e.stopPropagation()}>
          <div className="cine-ava" style={{ '--sc': spColor }}>
            <img src={portraitSrc} alt={spName} />
          </div>
          <div className="cine-content">
            <div className="cine-header">
              <span className="cine-speaker" style={{ '--sc': spColor }}>
                {spName}
              </span>
              <span className="cine-step">Paso {i + 1} de {n}</span>
            </div>
            <div className="cine-text">{text}</div>
            <div className="cine-actions">
              {isHost && (
                <button
                  type="button"
                  className="btn sm white cine-skip-btn"
                  onClick={(e) => { e.stopPropagation(); onSkip && onSkip(); }}
                >
                  Saltar ⏭️
                </button>
              )}
              <button
                type="button"
                className="btn sm green cine-next-btn"
                onClick={(e) => { e.stopPropagation(); onNext && onNext(); }}
              >
                Siguiente ▶
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="cine-letterbox bottom" />
    </div>
  );
}
