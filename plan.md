# Plan de mejoras de Fried Chicken (para un agente en modo loop)

> Este documento es para el agente que va a trabajar en el proyecto **en el computador del dueño**, en ciclos (modo loop).
> Léelo completo antes de empezar. En cada vuelta del loop vuelve a abrirlo, toma la siguiente tarea sin marcar y sigue las reglas de la sección 1.
> Repositorio: **https://github.com/St4keholders/FRIED-CHICKEN**

---

## 0. Preparación (solo la primera vuelta)

En el computador local solo existe la rama `main` vieja. Todo el trabajo nuevo está en GitHub (el PR #1 ya se unió a `main`, y este plan llega con el PR `plan-loop`). Primero hay que traerlo:

```bash
cd <carpeta del proyecto>
git remote -v                      # debe apuntar a https://github.com/St4keholders/FRIED-CHICKEN
git status                         # si hay cambios locales sin guardar: git stash (no borres nada sin avisar)
git fetch origin
git checkout main
git pull origin main               # trae la versión nueva (debe existir game/match.js)
git merge origin/plan-loop         # solo si plan.md o la carpeta tests/ todavía no están en main
git checkout -b loop-mejoras       # todo el trabajo del loop va en esta rama
npm install
npm i --no-save playwright peer    # solo para las pruebas; no los agregues a package.json
npx playwright install chromium
```

Comprueba que quedó bien:
- Existen `game/match.js`, `game/terrain.js`, `game/mesher.js`, `tests/sim.mjs`, `tests/e2e.mjs`.
- `npm run build` termina sin errores.
- `node tests/sim.mjs` termina con **Todo bien**.
- Con `npm start` en una terminal y `node tests/peer-server.mjs` en otra, `node tests/e2e.mjs` termina con **Todo bien** (las capturas quedan en `tests/out/`).

Si algo de esto falla antes de tocar código, anótalo en la Bitácora (sección 6) y arréglalo como primera tarea.

---

## 1. Reglas del loop (cada vuelta)

1. Abre este archivo y toma la **primera tarea sin marcar** `- [ ]` de la sección 4, en orden.
2. Si la tarea es grande, divídela en subtareas `- [ ]` debajo de ella, en este mismo archivo, y haz una por vuelta.
3. Implementa. Respeta las reglas del proyecto (sección 3).
4. Prueba **siempre**, en este orden:
   - `npm run build` sin errores ni advertencias nuevas.
   - `node tests/sim.mjs` → **Todo bien**.
   - `node tests/e2e.mjs` (con `npm start` y `node tests/peer-server.mjs` corriendo) → **Todo bien**.
   - Agrega a `tests/e2e.mjs` (o a `tests/sim.mjs`) al menos una comprobación nueva de lo que hiciste.
   - Mira las capturas de `tests/out/` y confirma que nada se ve roto o encimado, en TV (1600×900) y en celular (412×860 vertical y 860×400 horizontal).
5. Si todo pasa: marca la tarea `- [x]`, escribe una línea en la Bitácora (fecha, tarea, qué cambió, cómo se probó) y haz un commit en español: `T3: apuntar arrastrando el dedo o el mouse`.
6. Si algo no se puede terminar: no la marques. Escribe en la Bitácora qué falta y por qué, y sigue con la siguiente.
7. Cuando no queden tareas: actualiza el `README.md`, corre todas las pruebas una última vez, sube la rama (`git push -u origin loop-mejoras`) y abre un pull request hacia `main` con un resumen en español. Si no tienes permiso para subir, deja todo en commits locales y explícalo en la Bitácora.

**Nunca** subas directo a `main`. **Nunca** borres trabajo sin dejarlo anotado.

---

## 2. Revisión de lo que ya está hecho (primera tarea del loop)

Antes de agregar cosas, revisa el código actual y entiende cómo funciona.

### Cómo está armado
- **Next.js 16 (App Router) + React 19 + Three.js**, todo en JavaScript. Entrega en Vercel sin configurar nada.
- `/` = pantalla principal (anfitrión). `/mando` = celular de cada jugador.
- **El anfitrión manda**: `game/host.js` (clase `GameHost`) lleva la partida a 60 Hz con `game/match.js`, dibuja con `game/render.js` y habla con los celulares por **PeerJS** (servidor público solo para presentarlos; luego van directo).
- **La isla** (`game/terrain.js`) es un campo de densidad (0–255, superficie en 128) generado por **semilla**. `game/mesher.js` la convierte en una malla lisa (Surface Nets). Las explosiones (`carve`) y las vigas (`beam`) quedan en `terrain.edits`.
- **Copia en el celular** (`game/mirror.js`): genera la misma isla con la semilla, aplica `edits` y dibuja las fotos (`snap`, unas 25 por segundo) interpolando.
- **CPU** (`game/ai.js`): prueba cientos de tiros con la misma física (`match.projStep`) repartidos en varios cuadros, con 3 dificultades.
- **Interfaz**: `components/HostApp.jsx` (contraseña, lobby, HUD y resultados del TV), `components/ControllerApp.jsx` (mando), `components/TouchControls.jsx` (joystick, botones y cuadrícula de armas), `components/Shared.jsx` (ajustes, viento, barras, resultados y la tarjeta de tu pollito).
- **Modelos** (`game/models.js`): pollitos de caricatura, robots y objetos hechos con esferas, conos y cilindros. **Sonido** (`game/audio.js`): todo sintetizado.
- **Mensajes**: celular → anfitrión: `hello`, `pick`, `cfg`, `start`, `in` (joystick y botones mantenidos, unas 30 veces por segundo), `act` (saltar, arma, mecha, apuntar, mapa, rendirse), `view`, `react`, `pause`, `next`, `quit`, `resync`. Anfitrión → celular: `welcome`, `lobby`, `phase`, `turn`, `minit`, `snap`, `edit`, `buzz`, `paused`.

### Puntos débiles conocidos (revísalos y anota lo que encuentres)
- La física usa los vóxeles enteros y el dibujo usa la superficie lisa: los pollitos pueden quedar hasta 0,25 por encima del suelo; `render.js` los "pega" visualmente al suelo. Revisa que no se note al caminar en pendientes.
- La partida de muestra del lobby (CPU contra CPU) corre también cuando el anfitrión es un celular: gasta batería.
- Las etiquetas, números de daño y globos de diálogo son elementos HTML que se mueven en cada cuadro.
- iPhone no permite pantalla completa ni bloquear la orientación desde la web.
- `window.__fcMirror` existe a propósito: lo usan las pruebas.
- Las fuentes (Lilita One y Nunito) vienen de Google Fonts; sin internet se usa una fuente parecida.

Marca la revisión como hecha cuando hayas leído todos los archivos de `game/` y `components/`, hayas corrido las pruebas y hayas anotado en la Bitácora cualquier error que encuentres (si es un error real, agrégalo como tarea nueva al inicio de la sección 4).

---

## 3. Reglas del proyecto

- Todo el texto del juego en **español de Colombia**, con tono divertido.
- **Nada de imágenes ni audio descargados**: modelos, texturas, música y sonidos se generan con código.
- **Sin dependencias nuevas** en `package.json` (las de prueba se instalan con `--no-save`).
- Estilo visual: **3D liso tipo caricatura, como Worms 4**. Nada de cubos ni pixel art.
- Estilo de los paneles: **caricatura de juguete** (tarjetas crema con borde café grueso, botones gorditos, fuente Lilita One). Usa las clases que ya existen en `app/globals.css`.
- No se guardan partidas. Solo se guardan en `localStorage` preferencias y desbloqueos.
- Con televisor, todo debe seguir funcionando igual que ahora.
- La contraseña de la pantalla principal es la de Star League (hash en `game/constants.js`). No la cambies.

---

## 4. Tareas (en orden)

- [x] **T0. Revisión completa** (sección 2).

- [x] **T1. Error: "elijo el mapa y no cambia".**
  Ya se comprobó en el navegador que la isla elegida sí llega a la configuración y que la partida arranca en esa isla. Lo que confunde es que **el fondo del lobby sigue mostrando una isla al azar** y que no hay una vista previa clara. También puede fallar el `<select>` nativo en algunos celulares.
  - Cambia el `<select>` de isla (`components/Shared.jsx`, `ConfigPanel`) por una **cuadrícula de botones** con el nombre y los colores de cada isla, más "🎲 Aleatoria".
  - Al elegir isla en el lobby, la partida de muestra del fondo se regenera en **esa isla** (`GameHost.setCfg` → `startDemo(isla)`). Con "Aleatoria" se puede seguir rotando.
  - Muestra el nombre de la isla elegida bien visible en el lobby del TV y en el celular.
  - Prueba: en `tests/e2e.mjs`, elegir isla desde el celular de J1 → el TV la marca, el fondo cambia a esa isla (`host.demo.island`) y la partida empieza ahí.

- [x] **T2. Solo J1 elige el mapa y los demás ajustes.**
  - El servidor ya rechaza los ajustes que no vienen de J1 (`hostSlot`). Falta la interfaz:
  - En el **TV**, los ajustes y el botón "¡A PELEAR!" solo se pueden tocar si J1 está en ese mismo dispositivo (jugador local o de teclado). Si J1 está en un celular, el TV muestra los ajustes **de solo lectura** con el aviso "Los ajustes los elige J1 desde su celular". Si todavía no hay nadie, también son de solo lectura.
  - En los celulares que no son J1, muestra un **resumen de solo lectura** (modo, isla, equipos, CPU, vida, reloj) para que sepan qué se va a jugar.
  - Prueba: J2 no puede cambiar nada y el TV no deja editar si J1 está en un celular.

- [x] **T3. Apuntar arrastrando el dedo (o con el mouse), con menos sensibilidad.**
  Hoy se apunta con el joystick y es demasiado sensible.
  - **Celular**: el **joystick solo camina y gira**. Para apuntar, el jugador **arrastra el dedo sobre la pantalla** (cualquier zona que no sea un botón, como un touchpad): horizontal gira la mira, vertical la sube o baja. Funciona en modo 🎯 y también en modo caminar (para girar fino). En el modo de mira del mapa (palomas, guacamaya, teletransporte), arrastrar mueve la mira roja.
  - Mensaje nuevo `aimd` con el movimiento acumulado (`{ t: 'aimd', dyaw, dpitch }`, unas 30 veces por segundo). En `match.js`, un método `aimDelta(dyaw, dpitch)` que solo aplica en el turno del jugador y respeta los límites de inclinación.
  - **Ajuste de sensibilidad** en el mando (Baja / Media / Alta, más "Invertir vertical"), guardado en `localStorage`. Valores de partida: 0,0025 / 0,004 / 0,007 radianes por píxel.
  - **Mouse** (jugador de teclado en el TV y jugadores desde PC, ver T4): clic en el juego para capturar el mouse (*pointer lock*); mover el mouse apunta, **clic izquierdo mantenido** dispara con fuerza, **clic derecho** activa 🎯 y la **rueda** cambia de arma. `Esc` suelta el mouse.
  - Si se deja el joystick como respaldo para apuntar, usa una curva suave (valor al cubo) y la mitad de la velocidad actual (`AIM_TURN` y `PITCH_SPEED` en `match.js`).
  - Prueba: arrastrar en el celular cambia la mira poco a poco (comprobar `turn.pitch` y el giro del pollito) y el joystick ya no mueve la mira.

- [x] **T4. Jugar desde otro PC (no solo celulares).**
  Hoy, en un PC, solo el anfitrión ve el juego. Cualquier jugador debe poder entrar desde **otro computador**.
  - `/mando` abierto en un PC (detectar `pointer: fine`) entra en **modo PC**: el juego se ve a pantalla completa por defecto (como "Ver el juego aquí"), sin los botones táctiles. Se puede cambiar a modo celular si hace falta.
  - Controles del modo PC: los mismos del teclado del TV (W/S caminar, A/D girar, J saltar, K salto atrás, E/Q o rueda para armas, 1–5 mecha, C mapa, Esc pausa) más el **mouse para apuntar** de T3. Botón para abrir la cuadrícula de armas con el mouse.
  - HUD en el modo PC igual al del TV: turno, reloj, viento, arma, barra de fuerza y equipos (saca el HUD de `HostApp.jsx` a un componente compartido).
  - En el lobby del PC se personaliza igual que en el celular (`MyChicken`).
  - En el lobby del TV agrega el texto "o abre el link en otro PC".
  - Prueba: una página de escritorio en `/mando` se une, ve la partida y juega su turno con teclado y mouse.

- [x] **T5. Elegir con qué pollito jugar.**
  Ajuste nuevo en el lobby: "Pollito del turno: **Automático** / **Elegir**". Con "Elegir", al empezar el turno el jugador cambia de pollito con ◀ ▶ (o Tab en PC) durante los primeros segundos o hasta que se mueva o dispare. La CPU sigue en automático.

- [x] **T6. Radar o brújula en pantalla** (como Worms 4): círculo en una esquina con la posición de todos los pollitos (color de su equipo), orientado según la cámara, con el pollito del turno resaltado. En el TV, en el modo PC y en el celular con vista. En celular debe ser pequeño y no tapar botones.

- [x] **T7. Que la cámara no quede tapada.** Si una decoración o una montaña queda entre la cámara y el pollito del turno (rayo de la cámara al pollito contra el terreno), acerca la cámara o súbela hasta verlo. La transición debe ser suave, sin saltos.

- [x] **T8. Más animaciones y caras.** Voltereta en el salto atrás; aleteo al caer; cara de susto (ojos grandes, boca abierta) al recibir daño o estar cerca de una mina; festejo (saltitos y alas arriba) del equipo ganador; los pollitos quietos miran al del turno. Todo con transformaciones de las piezas que ya tiene el modelo en `models.js`.

- [x] **T9. Vista en primera persona para apuntar** la bazuca, la granada y el maíz pira (opcional, botón 👁‍🗨 o tecla V): cámara en la cabeza del pollito con la mira en el centro de la pantalla.

- [x] **T10. Cajas y barriles.** Cajas trampa (10 %, explotan al tocarlas, con un pequeño aviso visual); utilidad **"Visor"** que muestra la trayectoria completa del siguiente tiro; los barriles al explotar dejan **fuego** unos segundos que hace 5 de daño por segundo a quien lo toque.

- [x] **T11. Detalles de cada isla.** Espuma en la Bañera que frena al caminar; bolas de billar que ruedan cuando una explosión las empuja; imanes de nevera (metal que no se rompe) en la Cocina; bloques de gelatina que hacen rebotar en el Cuarto de Juguetes. Cada isla con al menos un detalle propio, sin romper la sincronización con los celulares (todo lo que cambie el terreno va por `edits`; lo que se mueve va en `snap`).

- [ ] **T12. Modo Historia: "El Gran Robo de los Huevos".** Es la tarea más grande; divídela en subtareas.
  - Cooperativo: todos los jugadores juntos contra la CPU, de una sentada (30–40 min), **sin guardar**, con opción de empezar en cualquier nivel, **reintentar** o **saltar nivel** si pierden.
  - **Trama**: el **Zorro Rufo**, un zorro de peluche con monóculo, se robó el Huevo Dorado de la Granja de Juguete y armó un ejército de **pollitos de lata**. Los pollitos de los jugadores cruzan la casa de los niños para recuperarlo.

    | Nivel | Isla | Objetivo |
    | --- | --- | --- |
    | 1 | Arenero del Patio | Tutorial jugado: eliminar 2 pollitos de lata (aprender a caminar, apuntar y disparar) |
    | 2 | Bañera Espumosa | Eliminar al equipo enemigo; el agua sube cada 3 rondas |
    | 3 | Cocina Gigante | Recoger 3 Huevitos (cajas especiales) antes de 8 rondas |
    | 4 | Cuarto de Juguetes | Proteger a la **Gallina Abuela** (aliada sin armas) hasta eliminar a todos |
    | 5 | Mesa de Billar | Destruir 4 máquinas de lata del zorro con munición limitada |
    | 6 | Castillo del Zorro (noche) | Jefe: **Sargento Lata**, robot gigante con mucha vida y escudo que solo se rompe por detrás |
    | 7 | Arenero (atardecer) | Supervivencia: aguantar 6 rondas contra oleadas |
    | 8 | Castillo del Zorro | Final: **Zorro Rufo** en su robot de juguete, con fases (cambia de arma y lanza piezas) |

  - **Cinemáticas** antes y después de cada nivel, con la cámara del propio motor (encuadres, paneos, zoom) y cajas de diálogo con retrato. **Hablan los pollitos que eligieron los jugadores**, más el Zorro Rufo, la Gallina Abuela y los jefes. Avanzan con Enter, clic o "Siguiente" en el celular; "Saltar" solo J1. Se ven también en cada celular y PC con vista.
  - Sugerencia técnica: `game/story.js` (niveles, objetivos, guiones), `game/cinema.js` (director de cámara y diálogos), fase nueva `cinematic` en `host.js` y en el mando, objetivos especiales en `match.js` (condiciones de victoria y derrota por nivel, unidades especiales, oleadas). El accesorio `zorro` ya existe en `models.js`: al terminar la historia se **desbloquea** (guardado en el `localStorage` del anfitrión).
  - Prueba: completar los 8 niveles con jugadores automáticos (puedes reutilizar `CpuBrain` para los humanos en `tests/sim.mjs`), reintentar, saltar nivel y empezar en cualquier nivel.
  - Subtareas (una por vuelta):
    - [x] **T12.1** Datos: `game/story.js` (8 niveles: isla, objetivo, enemigos, cielo, pistas, guiones de intro y final) y `game/cinema.js` (resuelve quién habla, retrato y encuadre/paneo/zoom de cámara). Modo de cámara `cine` en `render.js`.
    - [x] **T12.2a** `match.js`: base de historia (`story` en `Match`, `checkOver` por nivel, reservas de enemigos, rondas) + niveles 1, 2, 4 y 7 (eliminar, agua que sube, proteger a la Gallina Abuela, supervivencia por oleadas).
    - [ ] **T12.2b** Niveles 3 y 5: Huevitos (`cajaHuevo`, 3 en 8 rondas) y máquinas de lata (`maquinaLata`, 4, munición limitada), con modelos nuevos.
    - [ ] **T12.2c** Niveles 6 y 8: jefes (Sargento Lata con escudo frontal; Zorro Rufo con fases, cambia de arma y lanza piezas), tamaño grande y cielo de noche/atardecer.
    - [ ] **T12.3a** `host.js`: modo `historia`, selector de nivel, fase `cinematic` (Enter/clic/Siguiente, Saltar solo J1), siguiente nivel, reintentar/saltar nivel, desbloqueo del accesorio `zorro`.
    - [ ] **T12.3b** Interfaz: lobby (modo Historia + nivel), cinemática en TV, celulares y PC, objetivo en el HUD, resultados con Reintentar/Saltar, accesorio `zorro` en el selector.
    - [ ] **T12.4** Pruebas: `tests/sim.mjs` completa los 8 niveles con `CpuBrain` (también reintentar, saltar y empezar en cualquier nivel) y `tests/e2e.mjs` recorre una cinemática y un nivel.

- [ ] **T13. Rendimiento en celular.**
  - Medidor de cuadros por segundo con `?fps=1` en la URL.
  - Si el juego va a menos de 30 cuadros por segundo durante 5 segundos, bajar la calidad sola (menos resolución, menos partículas, sin olas) y avisarlo con un mensaje pequeño.
  - Pausar la partida de muestra del lobby cuando el anfitrión es un celular.
  - En iPhone: que el sonido arranque con el primer toque, y que el mensaje "Gira el celular" funcione aunque no se pueda bloquear la orientación.
  - Prueba con la emulación de dispositivos de Chromium y CPU lenta (`page.emulateCPUThrottling` o CDP `Emulation.setCPUThrottlingRate` en 4×). Anota los resultados en la Bitácora. **Deja en la Bitácora una lista corta de cosas que el dueño debe probar en celulares de verdad** (Android de gama media e iPhone).

- [ ] **T14. Cierre.** Actualiza el `README.md` (controles nuevos, modo PC, Historia, ajustes), corre todas las pruebas, revisa todas las capturas, sube la rama y abre el pull request (regla 7).

---

## 5. Cómo probar a mano

```bash
npm run build && npm start          # juego en http://localhost:3000
node tests/peer-server.mjs          # servidor de conexión local (otra terminal)
```
- Pantalla principal: `http://localhost:3000/?peerhost=127.0.0.1&peerport=9000&peerpath=/` (contraseña de Star League).
- Mando: `http://localhost:3000/mando?c=CODIGO&peerhost=127.0.0.1&peerport=9000&peerpath=/`
- Sin los parámetros `peer…` se usa el servidor público de PeerJS (necesita internet).
- Un celular no puede abrir `localhost`: para probar con celulares de verdad usa la IP del computador en la misma red (por ejemplo `http://192.168.1.20:3000`) o el link de Vercel.

---

## 6. Bitácora

| Fecha | Tarea | Qué se hizo | Cómo se probó |
| --- | --- | --- | --- |
| 2026-10-23 | — | Plan creado. Comprobado que la selección de isla sí llega a la configuración y a la partida; el problema visible es el fondo del lobby (ver T1). `tests/sim.mjs` y `tests/e2e.mjs` pasan completos. | Navegador automático (TV + celulares, sin TV, cooperativo, teclado). |
| 2026-10-23 | T0 | Revisión completa de `game/` y `components/`. Arreglado `tests/e2e.mjs` en Windows (`fileURLToPath` para rutas y `--use-angle=d3d11` para usar GPU en vez de SwiftShader por CPU que colgaba el PC). Detectados detalles menores de UI (`Norma` truncado en dificultad CPU en TV, interpolación de altura en pendientes) para pulir. | `npm run build`, `node tests/sim.mjs` (Todo bien) y `node tests/e2e.mjs` (Todo bien, capturas revisadas en `tests/out/`). |
| 2026-10-23 | T1 | Cambiado `<select>` de isla por cuadrícula de botones con colores de cada isla y "🎲 Aleatoria". Al elegir isla en el lobby se regenera la partida de muestra del fondo en esa isla (`startDemo(isla)`), y se muestra la isla elegida en etiqueta visible en TV y celular. | `npm run build`, `node tests/sim.mjs` y `node tests/e2e.mjs` (comprobado `host.demo.island === 'billar'`, botón activo en TV y nombre visible). |
| 2026-10-23 | T2 | En el TV los ajustes y el botón "¡A PELEAR!" quedan de solo lectura salvo que J1 esté en ese dispositivo (teclado o celular anfitrión), mostrando aviso "Los ajustes los elige J1 desde su celular". En celulares que no son J1 se muestra resumen de solo lectura (`ConfigSummary`). | `npm run build`, `node tests/sim.mjs` y `node tests/e2e.mjs` (comprobado que el TV bloquea edición cuando J1 es celular y J2 ve las 6 tarjetas de resumen). |
| 2026-10-23 | T3 | Apuntar arrastrando en la pantalla del celular (`aimpad` → mensaje `aimd` a 30 Hz → `match.aimDelta`) mientras el joystick solo camina y gira; ajuste de sensibilidad (Baja/Media/Alta + Invertir vertical) en `localStorage`; soporte de mouse con pointer lock, clic izq., clic der. y rueda. | `npm run build`, `node tests/sim.mjs` (`aimDelta` y límites) y `node tests/e2e.mjs` (joystick no mueve pitch, arrastrar cambia pitch y yaw, sensibilidad en `localStorage`). |
| 2026-10-23 | T4 | Modo PC en `/mando` (`pointer: fine`): vista completa por defecto sin botones táctiles, opción de cambiar a modo celular, componente compartido `MatchHud`, controles de teclado y mouse, botón `🎒 Armas` para abrir la cuadrícula y texto "o abre el link en otro PC" en el lobby del TV. | `npm run build`, `node tests/sim.mjs` y `node tests/e2e.mjs` (página de escritorio en `/mando` se une en modo PC, abre cuadrícula de armas, apunta con mouse y dispara; captura `4_pc_mando.png`). |
| 2026-10-23 | T5 | Ajuste `pickChicken` ("Automático" / "Elegir") en el lobby. Con "Elegir", al empezar el turno los jugadores humanos pueden cambiar de pollito con `◀ ▶` o `Tab` durante los primeros segundos o hasta moverse, saltar o disparar; la CPU sigue en automático. | `npm run build`, `node tests/sim.mjs` (`pickChicken=choose` y bloqueo tras acción) y `node tests/e2e.mjs` (cambiar pollito con `▶` y `◀` desde el mando). |
| 2026-10-23 | T6 | Radar circular (`Radar` en `components/Shared.jsx`, datos `radarInfo()` en `game/match.js`) orientado según `camYaw`, con puntos por color de equipo y el pollito del turno resaltado; visible en TV, modo PC y celular con vista (versión compacta `.radar.sm` sin tapar botones). | `npm run build`, `node tests/sim.mjs` y `node tests/e2e.mjs` (radar y `.rdot.act` verificados en TV, celular y PC; capturas en `tests/out/`). |
| 2026-10-23 | T7 | Evitar oclusión de cámara en `game/render.js` (`rayBlocked` entre el pollito y la cámara; si el terreno tapa la línea de visión en modos `follow`/`aim`/`look`, acerca y/o eleva la cámara con transición suave `lerp`). | `npm run build`, `node tests/sim.mjs` y `node tests/e2e.mjs` (comprobado `blockedNormal === true` y `blockedAdjusted === false` al interponer terreno entre pollito y cámara). |
| 2026-10-23 | T8 | Piezas articuladas (`head`, `wings`, `eyes`, `pupils`, `beakTop`, `beakLow`) en `game/models.js` y animaciones en `game/render.js`, `game/match.js` y `game/mirror.js`: voltereta 360° en salto atrás (`backflip`), aleteo rápido en el aire, cara de susto (ojos grandes y pico abierto) al recibir daño o cerca de una mina, festejo (saltitos y alas arriba) al ganar y giro de cabeza de pollitos quietos hacia el pollito del turno. | `npm run build`, `node tests/sim.mjs` (`backflip`) y `node tests/e2e.mjs` (verificadas las 5 animaciones/caras en el motor 3D y capturas en `tests/out/`). |
| 2026-10-23 | T9 | Vista opcional en primera persona (`fp`) para `bazuca`, `granada` y `maiz` con botón `👁‍🗨` en `TurnPad` y `MatchHud` y tecla `V`: cámara en la cabeza del pollito con la mira proyectada en el centro de la pantalla y cuerpo oculto para no tapar la visión. | `npm run build`, `node tests/sim.mjs` y `node tests/e2e.mjs` (comprobado `mode === 'fp'`, mira centrada en pantalla y `bodyHidden === true`). |
| 2026-10-23 | T10 | Cajas trampa (10 % de probabilidad, explotan al tocarlas, con luz roja parpadeante y temblor como aviso visual); utilidad "Visor" (`🔭`) en cajas de utilidad que dibuja la trayectoria completa del siguiente tiro (`visorDots`); barriles al explotar dejan `fuego` durante 5 s que hace 5 de daño por segundo al contacto. | `npm run build`, `node tests/sim.mjs` (caja trampa, Visor y 5 daño/s de fuego) y `node tests/e2e.mjs` (verificado `trapVis`, `visorCount > 5` y `fireVis`). |
| 2026-10-24 | T11 | Detalles propios de cada isla: espuma (`M.WHITE`) en la Bañera que frena al caminar (0,42x); bolas de billar (`bolaBillar`) en la Mesa de Billar que ruedan al ser empujadas por explosiones y golpean pollitos; imanes de nevera de metal irrompible en la Cocina; bloques de gelatina (`M.C`) que hacen rebotar en el Cuarto de Juguetes; arena blanda que amortigua caídas en el Arenero; escudos de hierro irrompibles en el Castillo. `Terrain.shape` ahora asigna el material también sobre vóxeles ya llenos (la espuma y la gelatina se pintan sobre el terreno). Lo que se mueve va en `snap`; el terreno, por `edits`. | `npm run build`, `node tests/sim.mjs` (espuma frena, bolas ruedan, imanes irrompibles, gelatina rebota) y `node tests/e2e.mjs` (5 bolas en el anfitrión, ruedan por explosión y llegan al celular). |
