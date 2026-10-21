# Plan: **Plumazo** — guerra de pollitos por turnos (estilo Worms 4: Mayhem)

> Documento para el agente que va a construir el juego. Léelo completo antes de empezar.
> "Plumazo" es el nombre provisional; se puede cambiar en `game/constants.js`.

---

## 0. Reglas de la entrega (obligatorias)

1. **Framework: Next.js** (App Router, versión 16 o la estable más reciente), React 19, JavaScript (no TypeScript), Node ≥ 20.
2. **Resultado final: un archivo `.zip`** con el proyecto completo listo para subir a GitHub e importar en Vercel **sin configurar nada**.
   - El .zip **no** incluye `node_modules`, `.next` ni archivos temporales.
   - Debe incluir `package.json`, `package-lock.json`, `README.md` (en español), `.gitignore`.
   - `npm install && npm run build` debe terminar sin errores ni advertencias de lint bloqueantes.
3. **Todo el texto del juego en español (Colombia)**, tono divertido y familiar.
4. **Sin imágenes ni audio descargados**: todo el arte (modelos voxel, texturas, íconos) y toda la música y efectos se generan con código, igual que en StarLeague. El juego debe consumir muy pocos datos.
5. **Sin guardado de partidas.** Cada sesión es de una sentada. Solo se guardan en `localStorage` preferencias (configuración del lobby, ajustes del mando) y desbloqueos.
6. Dependencias permitidas: `next`, `react`, `react-dom`, `peerjs`, `qrcode`, `three`. Nada más sin una razón fuerte (nada de motores de física externos: la física es propia y sencilla).

---

## 1. Qué es el juego

Un clon cariñoso de **Worms 4: Mayhem**: equipos de **pollitos de juguete** (pollitos de goma con casco) se enfrentan **por turnos** en **islas 3D destructibles**, con **cámara en tercera persona**. En su turno, el jugador mueve a uno de sus pollitos, elige un arma ridícula, apunta y dispara. El terreno se rompe con las explosiones, el viento desvía los proyectiles y caer al agua es eliminación inmediata. Gana el último equipo con pollitos vivos.

Lo que debe sentirse **igual a Worms 4**:
- Turnos con reloj (45 s) y unos segundos de "retirada" después de disparar.
- Mover, saltar, salto hacia atrás, apuntar en vista sobre el hombro, cargar potencia manteniendo el botón.
- Viento visible que afecta proyectiles.
- Terreno destructible en 3D, daño por explosión con empuje, daño por caída.
- Cajas que caen del cielo (armas, salud, utilidades).
- Muerte súbita: el agua sube.
- Personajes que hablan con frases cortas y chillidos cómicos.
- Un arma tipo "oveja" (aquí la Mamá Gallina) y una tipo "granada sagrada" (aquí el Huevo de Oro con coro celestial).

Lo que cambia: los personajes son **pollitos de juguete**, las islas son **mundos de juguetes gigantes** (bañera, arenero, cocina, juguetería…), y las armas tienen temática de granja y de Colombia.

---

## 2. Mecanismo de conexión (copiado de StarLeague)

Referencia de código: el repositorio público **https://github.com/St4keholders/starleague**. Estudia especialmente `game/engine.js` (anfitrión y red), `game/mirror.js` (copia del juego en el celular), `game/peeropts.js`, `components/HostApp.jsx`, `components/ControllerApp.jsx` y `components/TouchControls.jsx`. Reutiliza la misma arquitectura; adapta lo que haga falta para 3D y turnos.

### 2.1 Roles
- **Anfitrión (pantalla principal):** la página `/` abierta en el PC conectado al TV. Lleva **toda** la partida (simulación autoritativa a 60 Hz), dibuja el juego y la música, y les manda a los celulares lo que necesitan.
- **Mandos:** la página `/mando` en cada celular. Mandan los controles al anfitrión y, si quieren, dibujan su propia copia del juego.
- **Jugar sin TV:** si el anfitrión es un celular (pantalla táctil), aparece **🎮 Jugar en este celular**: ese celular lleva la partida **y además** es el mando de J1, con la vista del juego a pantalla completa y los botones encima. Los demás celulares ven el juego automáticamente; quien no quiera, elige **Solo mando**.

### 2.2 Conexión
- **PeerJS** con el servidor público gratuito, solo para "presentar" a los dispositivos; después los datos van directo (WebRTC).
- El anfitrión crea un peer con id `PEER_PREFIX + código`, donde `PEER_PREFIX = 'plumazo-v1-'` y el código son **5 letras/números** sin caracteres confusos (`ABCDEFGHJKLMNPQRSTUVWXYZ23456789`). El código se guarda en `sessionStorage` para sobrevivir recargas; si el id está ocupado, se genera otro.
- El lobby muestra un **QR** (librería `qrcode`) con el link `/mando?c=CÓDIGO`, el link escrito, el código grande y el botón **📤 Compartir link** (`navigator.share`, o copiar al portapapeles).
- Parámetros opcionales `?peerhost=&peerport=&peerpath=&peersecure=1` para pruebas con un servidor PeerJS local (igual que `peeropts.js`).
- Reconexión: si un celular se cae, al volver a abrir el link recupera **el mismo puesto** (guardar en `localStorage` del celular un id de jugador aleatorio y enviarlo en el saludo). Mientras está desconectado, si es su turno, el turno se pasa automáticamente al terminar el reloj.
- Si el anfitrión cierra la página o cambia de app, el juego se pausa para todos.

### 2.3 Contraseña
La pantalla principal pide contraseña la primera vez (se guarda en `localStorage`). Usar el mismo mecanismo de StarLeague: se compara el **SHA-256** de lo escrito con `PASSWORD_HASH` en `game/constants.js` (implementación propia de SHA-256 como `game/sha256.js`, porque `crypto.subtle` no existe sin HTTPS en algunas redes locales). Usar la misma contraseña de StarLeague. Los celulares **no** la piden.

### 2.4 Mensajes (protocolo)
Mensajes JSON cortos con campo `t`. Lista mínima:

| Dirección | `t` | Contenido |
| --- | --- | --- |
| celular → anfitrión | `hello` | id del jugador, nombre opcional |
| anfitrión → celular | `welcome` / `full` / `kicked` | puesto asignado (J1–J4) |
| anfitrión → todos | `lobby` | jugadores, equipos, configuración, quién es J1 |
| celular → anfitrión | `pick` | color/sombrero del equipo, nombres de los pollitos |
| J1 → anfitrión | `cfg` / `start` | configuración del lobby y empezar |
| celular → anfitrión | `in` | controles (~30 veces por segundo, **solo se aplican si es su turno**) |
| celular → anfitrión | `act` | acciones de un toque: elegir arma, disparar, saltar, detonar, cámara |
| anfitrión → todos | `phase` | lobby / partida / cinemática / resultados / historia |
| anfitrión → celulares con vista | `matchInit` | semilla del mapa, tema, equipos, posiciones iniciales |
| anfitrión → todos | `turn` | de quién es el turno, pollito activo, reloj, viento, inventario del equipo activo |
| anfitrión → celulares con vista | `snap` | estado de entidades (~20–30 Hz) |
| anfitrión → todos con vista | `carve` | explosiones que rompen el terreno (con número de secuencia) |
| anfitrión → todos | `cine` | escena de cinemática (quién habla, texto, cámara) |
| celular → anfitrión | `cnext` / `cskip` | avanzar o saltar cinemática (saltar solo J1) |
| anfitrión → celular | `buzz` | vibración (te dieron, tu turno, explosión cerca) |
| ambos | `pause` / `paused`, `view` | pausa, activar/desactivar vista en el celular |

### 2.5 La copia del juego en el celular (vista)
Igual que `mirror.js`, pero en 3D:
- El terreno **no se envía**: se genera igual en todos a partir de la **semilla** (`matchInit`). Las explosiones llegan como eventos `carve` (posición, radio, numerados) y cada celular aplica exactamente la misma resta al terreno. Si un celular se une tarde o pierde eventos, el anfitrión le reenvía la lista completa de `carve` de la partida.
- Las entidades (pollitos, proyectiles, cajas, minas, barriles, partículas importantes) llegan en `snap` y se **interpolan** con un pequeño retraso (~90 ms), igual que StarLeague.
- La cámara del celular sigue a la acción igual que la del TV; el dueño del turno ve, mientras apunta, la vista sobre el hombro de **su** pollito.
- Gasto esperado: < 2 MB por minuto por celular con vista.

---

## 3. Vista y motor gráfico (3D)

- **Three.js** con `WebGLRenderer`. Estilo **voxel de juguete**: colores planos, sombreado suave, contorno opcional, cielo con degradado, agua animada alrededor de la isla.
- **Terreno destructible por vóxeles:**
  - Mapa aproximado de 160 × 48 × 160 vóxeles (ajustar por rendimiento), dividido en *chunks* de 16³ con mallas generadas por caras visibles (o *greedy meshing*). Una explosión solo regenera los chunks tocados.
  - Generación por **semilla** (ruido propio, sin librería) según el tema de la isla, más piezas decorativas (patitos de goma, bloques de juguete, cucharas gigantes, castillos de arena), también en vóxeles y también destructibles.
  - Bloques con material: normal, **indestructible** (metal de juguete), y en algunos mapas **gelatina** que rebota.
- **Personajes:** pollitos de goma modelados en vóxeles por código (cuerpo, pico, ojos, casco del color del equipo, sombrero/accesorio elegido). Animaciones simples por código: caminar con bamboleo, salto, susto, celebración, quedar tieso de un golpe, explotar en plumas al morir (deja una lápida de huevo con su nombre).
- **Cámaras:**
  - **Libre / seguimiento:** detrás y arriba del pollito activo mientras camina.
  - **Apuntar:** vista sobre el hombro (tercera persona cercana), con mira y trayectoria corta sugerida solo en dificultad fácil.
  - **Seguir proyectil**, y luego volver.
  - **Vista general** del mapa (botón de cámara) para planear.
  - Transiciones suaves entre cámaras.
- **Rendimiento:** objetivo 60 fps en un celular de gama media. Limitar `devicePixelRatio` a 1,5 en celular, sombras simples (blob debajo de cada pollito en vez de mapas de sombra en celular), partículas con `InstancedMesh`. Opción en el lobby: **Calidad gráfica: Alta / Normal / Ahorro**.
- **HUD:** reloj del turno, viento (flecha y barras), nombre y vida sobre cada pollito con el color de su equipo, barra de vida total por equipo, arma actual con munición, mensajes grandes ("¡Turno de Equipo Rojo!", "¡Muerte súbita!").

---

## 4. Reglas de juego

### 4.1 Turnos
- Orden: los equipos se turnan; dentro de cada equipo el pollito activo rota (el siguiente vivo). Opción en el lobby **Elegir pollito** (al inicio del turno, con ◀ ▶) o **Automático**.
- Reloj de turno configurable: **30 / 45 / 60 s** (por defecto 45). Al disparar, quedan **5 s de retirada** para moverse.
- El turno termina al acabar el reloj, al terminar la retirada, o si el pollito activo recibe daño.
- Después de cada turno: pausa corta para ver resultados (pollitos que caen, barriles que explotan), luego se cobran los daños con números flotantes y se pasa al siguiente.
- **Muerte súbita** tras un tiempo total configurable (por defecto 10 minutos): toda la vida baja a 1 y el agua sube un nivel por ronda.

### 4.2 Movimiento
- Caminar (lento, sube pendientes suaves), girar, **saltar hacia adelante**, **salto hacia atrás** (más alto).
- Daño por caída a partir de cierta altura. Caer al agua = eliminado.
- Física propia: el pollito es una cápsula contra la rejilla de vóxeles; proyectiles balísticos con gravedad y viento; rebote con coeficiente por arma; explosiones con daño y empuje según distancia.

### 4.3 Vida y equipos
- Vida inicial configurable: **100 / 150 / 200** (por defecto 100).
- Pollitos por equipo: **2 / 3 / 4** (por defecto 4).
- Máximo **4 equipos**.

### 4.4 Cajas
Caen en paracaídas (con sombrilla) al empezar algunos turnos:
- **Caja de armas:** una munición extra de un arma aleatoria (las fuertes, poco probables).
- **Caja de salud:** +25 de vida al pollito que la toca.
- **Caja de utilidades:** doble daño, turno doble, o "visor" (muestra la trayectoria completa en el siguiente tiro).
- Algunas cajas son trampa y explotan (poco probable).

### 4.5 Objetos del mapa
Barriles de aceite que explotan y dejan fuego, minas que se activan al acercarse (con pitido y 3 s), y en la historia objetos especiales por nivel.

---

## 5. Armas y utilidades

Cada arma tiene munición (∞ o número), daño, radio de explosión y empuje. Valores de partida (balancear en pruebas):

| # | Nombre | Equivale a (Worms) | Comportamiento |
| --- | --- | --- | --- |
| 1 | **Bazuca de Huevo** | Bazuca | Huevo que vuela afectado por el viento y explota al tocar. ∞ |
| 2 | **Huevo Granada** | Granada | Rebota; mecha de 1–5 s elegible. ∞ |
| 3 | **Maíz Pira** | Granada de racimo | Explota y suelta 5 crispetas que también explotan. 3 |
| 4 | **Escopeta de Semillas** | Escopeta | Dos disparos rectos por turno, sin viento. ∞ |
| 5 | **Picotazo de Fuego** | Puño de fuego | Golpe hacia arriba que lanza al rival. ∞ |
| 6 | **La Chancla** | Bate de béisbol | Golpe que manda volando al rival (frase de mamá colombiana). 2 |
| 7 | **Bandada de Palomas** | Ataque aéreo | Se elige un punto en la vista general; pasan palomas soltando "regalitos" explosivos. 1 |
| 8 | **Vela de Cumpleaños** | Dinamita | Se deja en el piso, explota a los 5 s. 2 |
| 9 | **Mina Nido** | Mina | Se coloca; explota cuando alguien se acerca. 2 |
| 10 | **Mamá Gallina** | Oveja | Corre sola hacia adelante, salta obstáculos; se detona con el botón o sola a los 10 s. 1 |
| 11 | **Huevo de Oro** | Granada sagrada | Gran explosión; antes suena un coro celestial "¡Aleluyaaa!" generado por código. 1 |
| 12 | **Guacamaya Teledirigida** | Misil teledirigido | Se marca un objetivo; vuela hacia él esquivando un poco. 1 |

Utilidades (no terminan el turno, salvo que se diga):
- **Cuerda de Lombriz** (cuerda ninja): se engancha al terreno, balanceo, soltar y volver a lanzar.
- **Ventilador a la Espalda** (jetpack): vuelo con combustible limitado.
- **Sombrilla** (paracaídas): caer despacio.
- **Teletransporte** (termina el turno): ir a un punto elegido en la vista general.
- **Viga de Juguete** (construir puente): colocar una pieza de bloques.
- **Saltar turno** y **Rendirse** (rendirse pide confirmación).

En **Historia** algunas armas se desbloquean por nivel. En **Versus** y **Cooperativo**, J1 elige en el lobby el set de armas: **Clásico** (como la tabla) o **Locura** (más munición de las fuertes).

---

## 6. Controles en el celular

El celular se juega **en horizontal** (pedir pantalla completa y bloquear orientación en Android; en iPhone pedir permiso de sensores solo si se usan).

### 6.1 Cuando es tu turno
| Izquierda | Derecha |
| --- | --- |
| **Joystick** virtual: caminar/girar; en modo apuntar, mueve la mira | **DISPARAR** grande: mantener para cargar potencia, soltar para lanzar (armas sin potencia disparan al tocar) |
| | **SALTAR** (toque) / **SALTO ATRÁS** (doble toque o botón aparte) |
| | **ARMAS**: abre la cuadrícula de armas con íconos, munición y nombre |
| | **🎯 APUNTAR**: cambia a la vista sobre el hombro |
| | **👁 CÁMARA**: vista general del mapa |

- Arrastrar el dedo en la mitad derecha (fuera de los botones) también mueve la mira, para apuntar fino.
- Mecha de granadas: botones 1–5 que aparecen al elegir un arma con mecha.
- Armas que piden un punto (palomas, teletransporte, guacamaya): se toca el punto en la vista general.
- Vibración cuando empieza tu turno, cuando te dan y cuando algo explota cerca.

### 6.2 Cuando no es tu turno
- El mando muestra de quién es el turno, el reloj, el viento y la vida de tu equipo.
- Botones de **reacción** (¡Pío!, 😂, 😱, 👏) que aparecen como globitos en la pantalla del juego.
- **Pausa** (II) disponible para todos; **Saltar cinemática** solo para J1.

### 6.3 "Solo mando" vs "Ver el juego aquí"
- **Solo mando** (mirando el TV): interfaz grande con los controles y la información del turno.
- **Ver el juego aquí:** el juego en 3D ocupa la pantalla y los botones van semitransparentes encima (joystick a la izquierda, acciones a la derecha). Se cambia con el botón 🎮 / 📺.
- Sin pantalla principal, la vista está activada por defecto.

### 6.4 Teclado de respaldo en el PC
- **J con WASD** (W para unirse): WASD mover, Espacio saltar, Q salto atrás, E armas, flechas o mouse para apuntar, mantener Enter/clic para disparar, C cámara.
- `M` silencia, `Esc` pausa, `Enter` empieza o avanza cinemáticas.

---

## 7. Lobby

Diseño igual al de StarLeague (adaptado a TV y a celular vertical/horizontal):
- Logo animado, QR, código, link y **Compartir link**.
- Puestos J1–J4 con su color. Cada jugador desde su celular elige **color del equipo**, **accesorio** (casco, sombrero vueltiao, gorra, corona, bandana…), **nombre del equipo** y puede cambiar los nombres de sus pollitos (por defecto nombres graciosos aleatorios: Pío, Huevito, Plumón, Kiki, Tostado…).
- Solo **J1** configura (desde su celular o con el mouse en el PC):
  - **Modo:** Versus por equipos / Cooperativo contra CPU / Historia.
  - **Cómo se arman los equipos** (en Versus y Cooperativo):
    - **Cada jugador un equipo** (por defecto).
    - **Equipos compartidos:** se arrastran o asignan los jugadores a los equipos (ej. 2 contra 2). En un equipo compartido, los turnos del equipo se reparten **por turnos entre sus jugadores** (J1 mueve un pollito, el siguiente turno de ese equipo lo juega J3, etc.).
  - Pollitos por equipo, vida, reloj de turno, set de armas, isla (o aleatoria), muerte súbita, calidad gráfica.
  - En Cooperativo: **número de equipos CPU (1–3)** y **dificultad CPU** (Fácil / Normal / Difícil).
  - En Historia: **empezar en cualquier nivel**.
- Con un solo jugador, Versus se completa con equipos CPU.

---

## 8. Modos

### 8.1 Versus por equipos
Todos contra todos (o equipos compartidos). Gana el último equipo con pollitos vivos. Pantalla de resultados con estadísticas divertidas: más daño hecho, pollito que más se cayó al agua, "autogol" (daño a tu propio equipo). Botones **Revancha** y **Volver al lobby**.

### 8.2 Cooperativo contra CPU
Todos los humanos en el mismo bando (un equipo compartido o varios equipos aliados, según configuración) contra 1–3 equipos manejados por la CPU. Los equipos aliados no se pueden dañar entre sí con **fuego amigo** apagado (opción, por defecto apagado en cooperativo).

**IA de la CPU** (en `game/ai.js`):
1. Elige objetivo (el más débil, el más cercano o el que más daño hace).
2. Prueba combinaciones de arma, ángulo y potencia **simulando** el tiro con la misma física (sin dibujar) y se queda con la mejor que dañe al enemigo sin dañarse a sí misma.
3. Si no encuentra tiro, camina, usa cuerda o teletransporte, o recoge una caja.
4. Dificultad: Fácil agrega error grande al ángulo/potencia y casi no usa armas fuertes; Difícil casi no falla y aprovecha el viento y el agua.
5. Debe "pensar" visiblemente: mover la mira, dudar un poco, y decir frases.

### 8.3 Historia con cinemáticas: **"El Gran Robo de los Huevos"**
Cooperativa, como en StarLeague: **todos los jugadores juntos** contra la CPU, sin guardar, de una sentada (~30–40 min), empezar en cualquier nivel, **reintentar** o **saltar nivel** si fallan.

**Trama:** el **Zorro Rufo**, un zorro de peluche con monóculo, se robó el Huevo Dorado de la Granja de Juguete y armó un ejército de **pollitos de lata** (pollitos robot, versión metálica de los pollitos). Los pollitos de los jugadores cruzan la casa de los niños para recuperarlo.

| Nivel | Isla (tema) | Objetivo |
| --- | --- | --- |
| 1 | **Arenero del Patio** | Tutorial jugado: eliminar 2 pollitos de lata. Aprender a caminar, apuntar y disparar |
| 2 | **Bañera Espumosa** | Eliminar al equipo enemigo; el agua sube cada 3 rondas |
| 3 | **Cocina Gigante** | Recoger 3 Huevitos (cajas especiales) antes de 8 rondas |
| 4 | **Cuarto de Juguetes** | Proteger a la **Gallina Abuela** (aliada sin armas) hasta eliminar a todos |
| 5 | **Mesa de Billar** | Destruir 4 máquinas de lata del zorro con munición limitada |
| 6 | **Jardín de Noche** | Jefe: **Sargento Lata**, pollito robot gigante con mucha vida y escudo que solo se rompe por detrás |
| 7 | **Ático Polvoriento** | Supervivencia: aguantar 6 rondas contra oleadas |
| 8 | **Castillo del Zorro** | Final: **Zorro Rufo** en su mecha de juguete, con fases (cambia de arma y lanza piezas) |

- **Cinemáticas** antes y después de cada nivel, con la cámara 3D del propio motor (encuadres, paneos, zoom), diálogos en cajas de texto con retrato voxel del que habla, y chillidos sintetizados como "voz".
- **En las cinemáticas hablan los pollitos de los equipos que eligieron los jugadores** (igual que en StarLeague con los personajes escogidos), más el Zorro Rufo, la Gallina Abuela y los jefes.
- Avanzan con Enter, clic o **Siguiente** en el celular; **Saltar** solo J1.
- Las cinemáticas se ven con imagen en cada celular que tenga la vista activada.
- **Basta con que el equipo cumpla el objetivo**; si todos los pollitos humanos mueren, se pierde el nivel.
- Al terminar la historia se desbloquea un **accesorio especial** (el monóculo del Zorro) y el **Zorro Rufo como apariencia** de pollito disfrazado. El desbloqueo se guarda en el dispositivo anfitrión.

---

## 9. Islas (mapas)

Seis islas para Versus/Cooperativo (además de las de la historia, que también quedan disponibles en Versus):
Arenero del Patio, Bañera Espumosa, Cocina Gigante, Cuarto de Juguetes, Mesa de Billar, Castillo del Zorro, y **Aleatoria** (generada por semilla).

Cada una con su paleta, cielo, decoración voxel propia, música propia y un detalle de jugabilidad (espuma que frena, imanes de nevera de metal indestructible, bolas de billar que ruedan con las explosiones, etc.).

---

## 10. Sonido y música

- Todo con **Web Audio API**, generado por código (como `game/audio.js` de StarLeague): canciones chiptune en bucle (menú, una por isla, jefe, historia, victoria, derrota), efectos (explosiones, rebotes, salto, agua, caja, mina).
- **Voces de los pollitos:** chillidos sintetizados con tono distinto por equipo, con texto en globito: "¡Pío pío, toma esto!", "¡Me voy de pico!", "¡Ay, mi plumaje!", "¡Esa no la vi venir!", "¡Upa!", "¡Chao, pescao!" (al caer al agua). Al usar La Chancla: "¡Venga para acá, mijo!".
- Coro "¡Aleluyaaa!" del Huevo de Oro sintetizado.
- El sonido puede activarse también en el celular con vista.

---

## 11. Estructura de archivos sugerida

```
app/
  layout.js
  page.js              → pantalla principal (anfitrión)
  mando/page.js        → mando del celular
  globals.css
  icon.svg
components/
  HostApp.jsx          → contraseña, lobby, HUD, cinemáticas, resultados
  ControllerApp.jsx    → mando, lobby del celular, vista en el celular
  TouchControls.jsx    → joystick, botones, cuadrícula de armas
game/
  constants.js         → nombre, PEER_PREFIX, PASSWORD_HASH, colores, accesorios, armas
  sha256.js
  peeropts.js
  net.js               → PeerJS del anfitrión y del mando, protocolo
  host.js              → motor del anfitrión: fases, turnos, lobby, red (equivalente a engine.js)
  rules.js             → turnos, reloj, viento, cajas, muerte súbita, condiciones de victoria
  physics.js           → cápsula vs vóxeles, balística, explosiones, daño
  terrain.js           → rejilla de vóxeles, generación por semilla, carve, chunks
  mesher.js            → mallas de chunks para Three.js
  weapons.js           → definición y comportamiento de cada arma y utilidad
  ai.js                → IA de la CPU
  render.js            → escena Three.js, cámaras, agua, partículas, HUD 3D
  models.js            → pollitos, accesorios, cajas, armas y decoración en vóxeles por código
  mirror.js            → copia en el celular (snapshots + carve + interpolación)
  audio.js             → música y efectos por código
  voices.js            → chillidos y frases
  story.js             → niveles, objetivos y guiones de cinemáticas
  cinema.js            → director de cámara y diálogos
  islands.js           → temas y parámetros de cada isla
README.md
```

---

## 12. Orden de trabajo (hitos)

1. **Base Next.js + red:** páginas `/` y `/mando`, contraseña, PeerJS, QR, código, lobby con 4 puestos, reconexión, compartir link, jugar sin TV. *Prueba:* 3 celulares se unen, eligen color y J1 empieza.
2. **Terreno y render 3D:** isla voxel por semilla, chunks, agua, cielo, cámara libre, explosión que rompe el terreno. *Prueba:* 60 fps en PC, ≥ 30 fps en celular medio.
3. **Pollitos y física:** caminar, saltar, caer, daño por caída, agua.
4. **Turnos y armas básicas:** reloj, retirada, viento, Bazuca, Granada, Escopeta, Picotazo, daño y empuje, victoria.
5. **Mando completo:** controles táctiles, apuntar sobre el hombro, cuadrícula de armas, reacciones, vibración, teclado de respaldo.
6. **Vista en el celular:** `matchInit`, `snap`, `carve`, interpolación, cinemáticas en el celular.
7. **Resto de armas, utilidades, cajas, minas, barriles, muerte súbita.**
8. **Equipos configurables y CPU:** equipos compartidos, IA con 3 dificultades, modo Cooperativo.
9. **Historia:** 8 niveles, objetivos, jefes, cinemáticas, desbloqueos.
10. **Audio y voces**, pulido visual, calidad gráfica, balance.
11. **README y empaquetado .zip.**

---

## 13. Pruebas antes de entregar

- `npm run build` sin errores.
- Partida Versus de 2 humanos + 1 CPU completa, desde el lobby hasta resultados y revancha.
- Equipos compartidos 2 contra 2: los turnos del equipo se reparten bien entre sus jugadores.
- Cooperativo contra 2 CPU en las 3 dificultades: la CPU dispara, camina, usa al menos 4 armas distintas y en Difícil acierta la mayoría de tiros sin viento extremo.
- Historia completa del nivel 1 al 8 (se puede con jugadores automáticos), reintentar, saltar nivel y empezar en cualquier nivel.
- Jugar sin TV: un celular anfitrión como J1 + otro con vista + otro en Solo mando.
- Un celular se desconecta en su turno y vuelve: recupera su puesto.
- El terreno queda igual en el TV y en los celulares después de 30 explosiones (comparar un resumen/hash del terreno).
- Tamaños: TV 1920×1080, celular horizontal y vertical (lobby), sin scroll horizontal ni elementos encimados.
- Sin errores en la consola.

---

## 14. README.md (en español)

Debe explicar, como el de StarLeague:
1. Qué es el juego.
2. **Cómo subirlo a Vercel** paso a paso (repositorio en GitHub → Add New Project → Deploy, sin configurar nada) y cómo probarlo con `npm install` y `npm run dev`.
3. La contraseña y cómo cambiarla.
4. Cómo se juega: con TV y sin TV, unirse con el QR, controles del celular y del teclado.
5. Modos, configuración del lobby y la tabla de niveles de la historia.
6. Tabla de armas.
7. Notas: mismo Wi-Fi recomendado, permisos de iPhone, consumo de datos, qué pasa si alguien se desconecta.

---

## 15. Entrega final

Un único archivo **`plumazo.zip`** con el proyecto Next.js completo (sin `node_modules` ni `.next`), que al descomprimirlo, subirlo a GitHub e importarlo en Vercel funcione a la primera.
