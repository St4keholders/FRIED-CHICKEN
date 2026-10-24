# 🐔 Fried Chicken

Guerra de **pollitos de juguete por turnos** en 3D, al estilo *Worms 4: Mayhem*. Se juega en el televisor (o sin televisor, solo con celulares) y **cada celular o computador es un mando**.

- Islas de vóxeles **100% destructibles** con cámara en tercera persona y primera persona.
- Hasta **4 jugadores** en simultáneo (con celulares o PCs), más equipos manejados por la CPU.
- **Modos:** 
  - **Modo Historia ("El Gran Robo de los Huevos"):** Campaña de 8 niveles con cinemáticas cinemáticas procedurales, diálogos con retrato, objetivos especiales y jefes finales (Sargento Lata y Zorro Rufo).
  - **Versus:** Todos contra todos o por equipos.
  - **Cooperativo:** Juntos contra oleadas o equipos de la CPU.
- **Equipos:** Cada jugador su propio equipo, o equipos compartidos (por ejemplo 2 contra 2 por turnos).
- **19 armas y utilidades**, viento dinámico, cajas trampa, visor de trayectoria, fuego de barriles, cajas de regalo, minas y muerte súbita.
- **Detalles interactivos por isla:** Espuma que frena en la bañera, bolas de billar que ruedan al explotar, gelatina que rebota, imanes irrompibles en la cocina y arena amortiguadora.
- **Modo PC completo:** Juega en `/mando` desde otro computador con teclado, mouse libre (pointer lock), pantalla completa y HUD de TV.
- **Animaciones y expresiones:** Volteretas hacia atrás (*backflip*), aleteo en el aire, caras de susto, saltos de festejo y pollitos que siguen la acción con la mirada.
- **Arte y audio 100% procedural:** Todo el arte 3D, efectos sonoros, voces de pollito y música se generan por código en tiempo real (cero descargas de imágenes o archivos pesados).

---

## Subirlo a Vercel

1. Sube el contenido del repositorio a GitHub.
2. En [vercel.com](https://vercel.com) → **Add New… → Project** → importa el repositorio.
3. Vercel detecta Next.js automáticamente. Haz clic en **Deploy** (no requiere variables de entorno obligatorias).
4. Abre el enlace en el navegador del PC conectado al TV o proyector.

Para probarlo localmente:

```bash
npm install
npm run build && npm start
```

Abre `http://localhost:3000` en tu navegador. (Los celulares en la misma red local pueden ingresar usando la IP local de tu PC, ej. `http://192.168.1.15:3000`, o a través del enlace desplegado en Vercel).

---

## Contraseña

La pantalla principal pide la contraseña de acceso: **`juan2026*`**. El navegador la guarda automáticamente en `localStorage`.
Los celulares y mandos que se unen por QR o código no la necesitan.

Para cambiar la contraseña:
Calcula el hash SHA-256 de la nueva contraseña (`echo -n 'nueva' | shasum -a 256`) y actualiza `PASSWORD_HASH` en [`game/constants.js`](file:///game/constants.js).

---

## Cómo se juega

1. Abre el enlace en el PC/TV e ingresa la contraseña. Detrás del lobby verás una partida de demostración entre pollitos robot.
2. Cada jugador escanea el **código QR** en pantalla (o ingresa a `/mando` y digita el código de 5 letras).
3. En el celular o PC mando, cada jugador personaliza su **nombre de equipo, color, accesorio** (casco vikingo, sombrero vueltiao, gorra, corona, afro, o el accesorio desbloqueable del Zorro Rufo) y nombres de sus pollitos.
4. **J1 (anfitrión)** configura los ajustes del juego y pulsa **¡A PELEAR!** (o inicia el Modo Historia).

### Jugar desde otro computador (Modo PC)

Al abrir `/mando` en un PC o laptop con mouse y teclado:
- El juego detecta automáticamente el mouse y activa el **Modo PC** a pantalla completa con el HUD del TV y radar táctico.
- **WASD** para moverte y girar.
- **Mouse libre (Pointer Lock):** Haz clic en la pantalla para capturar el puntero y mover la cámara suavemente.
- **Clic izquierdo (mantener):** Cargar la barra de potencia y soltar para disparar.
- **Clic derecho:** Apuntar sobre el hombro.
- **Rueda del mouse:** Cambiar de arma rápidamente.
- **B** o botón **🎒 Armas:** Abrir la cuadrícula de armas para elegir con un clic.
- **J / K:** Salto hacia adelante / Salto hacia atrás con voltereta (*backflip*).
- **V:** Alternar vista en primera persona (en Bazuca, Granada y Maíz).
- **Tab / ◀ ▶:** Elegir con qué pollito jugar al inicio del turno (si está habilitado en ajustes).

### Jugar desde el celular

| Control | Acción |
| --- | --- |
| **Joystick virtual** | Caminar y girar al pollito. |
| **Arrastrar en pantalla (`aimpad`)** | Mover la mira independientemente del joystick para apuntar con precisión milimétrica. |
| **🎯 Apuntar** | Vista sobre el hombro. |
| **👁‍🗨 Primera persona** | Mira en la cabeza del pollito con punto de mira central (en armas de tiro directo). |
| **💥 DISPARAR** | Mantener presionado para cargar potencia y soltar para lanzar. |
| **⤴ Saltar / ↩ Atrás** | Salto frontal / Salto hacia atrás más alto con voltereta. |
| **◀ ▶** | Cambiar el pollito activo al iniciar el turno (si `pickChicken` está en "Elegir"). |
| **🎒 Botón de arma** | Desplegar el inventario de armas y utilidades. |
| **Ajustes táctiles** | Sensibilidad personalizable (Baja, Media, Alta) e inversión de eje vertical en el engranaje de pausa. |
| **Reacciones** | Botones de emojis (🐔 😂 😱 👏) para mandar reacciones animadas en pantalla mientras juegas o miras. |

---

## 📖 Modo Historia: "El Gran Robo de los Huevos"

Una campaña completa para jugar en solitario o en cooperativo:
1. **Nivel 1 — Patio de Recreo (Arenero):** Entrenamiento básico. Elimina a las 2 latas enemigas con pistas tutoriales.
2. **Nivel 2 — ¡Que Sube el Agua! (Bañera):** El nivel del mar sube al final de cada turno. ¡Gana la altura o terminarás como sopa!
3. **Nivel 3 — Rescate de Huevitos (Cocina):** Encuentra y recoge 3 cajas con huevitos de oro antes de que se agoten las 8 rondas.
4. **Nivel 4 — Proteger a la Abuela (Juguetes):** Defiende a la Gallina Abuela de los ataques enemigos. Si ella cae, pierdes la misión.
5. **Nivel 5 — La Fábrica de Latas (Billar):** Destruye las 4 máquinas de ensamblaje con munición contada.
6. **Nivel 6 — El Sargento Lata (Castillo de Noche):** Jefe fuertemente blindado por el frente. Golpéalo por la espalda para dañarlo.
7. **Nivel 7 — Emboscada en el Patio (Arenero al Atardecer):** Resiste 3 oleadas sucesivas de refuerzos enemigos.
8. **Nivel 8 — La Guarida del Zorro Rufo (Castillo):** Enfrentamiento definitivo contra el Zorro Rufo en 3 fases intensas con lluvia de chatarra y minas.

- **Cinemáticas:** Diálogos completos antes y después de cada nivel con encuadres de cámara dinámicos y retratos animados. Los diálogos los protagonizan los pollitos elegidos por los jugadores.
- **Reintentar y Saltar:** Si una misión se complica, puedes reintentarla inmediatamente o saltarla para seguir con la aventura.
- **Recompensa:** Al derrotar al Zorro Rufo, se desbloquea el **accesorio del Zorro Rufo** (sombrero elegante, monóculo y corbatín) en el selector de personajes.

---

## Ajustes del Lobby

- **Modo de juego:** Versus, Cooperativo o Modo Historia (con selector de niveles 1 a 8).
- **Selección de Isla:** Arenero del Patio, Bañera Espumosa, Cocina Gigante, Cuarto de Juguetes, Mesa de Billar, Castillo del Zorro o 🎲 Aleatoria (con previsualización 3D en vivo en el lobby).
- **Selección de pollito:** Automático o **Elegir** (permite cambiar con quién juegas tu turno antes de actuar).
- **Equipos:** Cada jugador su equipo o equipos compartidos.
- **Equipos CPU y dificultad:** De 0 a 3 equipos manejados por IA (Fácil, Normal, Difícil).
- **Reglas:** Pollitos por equipo (2 a 4), Puntos de vida (100, 150, 200), Tiempo de turno (30s, 45s, 60s), Armas (Clásico o Locura), Muerte súbita por agua (5, 10, 15 min), Fuego amigo.
- **Rendimiento:** Calidad gráfica Alta, Normal o Ahorro de energía.

---

## Arsenal de Armas y Utilidades

| Arma | Tipo | Funcionamiento |
| --- | --- | --- |
| 🥚 **Bazuca de Huevo** | Explosiva | Tiro parabólico directo afectado por el viento. Soporta vista en primera persona. |
| 💣 **Huevo Granada** | Mecha | Rebota y detona tras el temporizador elegido (1 a 5 segundos). |
| 🌽 **Maíz Pira** | Racimo | Explota soltando 5 crispetas que estallan en cadena. |
| 🌻 **Escopeta de Semillas** | Directa | Dos disparos de proyectil recto por turno. |
| 🔥 **Picotazo de Fuego** | Melé | Salto propulsado que manda a volar al enemigo por los aires. |
| 👡 **La Chancla** | Melé | *"¡Venga para acá, mijo!"*: Golpe contundente que empuja rivales al agua o fuera del mapa. |
| 🕊️ **Bandada de Palomas** | Aérea | Marca una coordenada en la isla para un bombardeo aéreo de regalitos explosivos. |
| 🕯️ **Vela de Cumpleaños** | Mecha fija | Dinamita con mecha de 5 segundos de gran potencia destructiva. |
| 🐣 **Mina Nido** | Trampa | Se posa en el suelo y detona por proximidad con sonido de advertencia. |
| 🐔 **Mamá Gallina** | Guiada | Corre sola esquivando baches; vuelve a pulsar Disparar para inmolarla. |
| 🌟 **Huevo de Oro** | Santa | *"¡Aleluyaaa!"*: Explosión celestial colosal que devasta el terreno. |
| 🦜 **Guacamaya Teledirigida**| Aérea | Vuela con precisión teledirigida hasta el punto seleccionado. |
| ➰ **Cuerda de Lombriz** | Movilidad | Se ancla al terreno o techos para balancearse con inercia física. |
| 🌀 **Ventilador a la Espalda**| Movilidad | Propulsor de vuelo temporal (mantén presionado Saltar). |
| ☂️ **Sombrilla** | Movilidad | Descenso suave que elimina por completo el daño por caída. |
| ✨ **Teletransporte** | Movilidad | Aparece instantáneamente en la posición elegida de la isla. |
| 🧱 **Viga de Juguete** | Construcción | Coloca puentes o barricadas metálicas resistentes en el terreno. |
| 🔭 **Visor** *(Cajas utilitarias)* | Soporte | Traza la parábola y trayectoria exacta anticipada del próximo disparo. |
| 📦 **Cajas Trampa** *(Peligro)* | Trampa | 10% de las cajas son trampas explosivas que vibran con luz roja antes de estallar. |
| 🔥 **Fuego de Barriles** | Área | Los barriles destruidos dejan charcos de fuego que queman 5 HP/s. |

---

## Rendimiento y Dispositivos Móviles

- **Medidor de FPS:** Agrega `?fps=1` a la URL (ej. `http://localhost:3000/?fps=1` o en `/mando`) para ver en tiempo real la tasa de cuadros por segundo.
- **Auto-Ahorro Dinámico:** Si un celular de gama baja o media baja de 30 FPS durante 5 segundos continuos, el motor reduce automáticamente la calidad (resolución 0.5x, 30 partículas máximas y desactiva olas) para mantener fluidez absoluta.
- **Pausa de Demo en Anfitrión Móvil:** Cuando una partida es creada desde un teléfono móvil, la física del fondo del lobby se suspende para no drenar la batería del dispositivo.
- **Compatibilidad con iOS Safari:** Audio desbloqueado al primer toque en pantalla (`touchstart`), y botón *"Seguir vertical"* en caso de tener activo el candado de orientación del sistema.
- **Radar Táctico Circular:** Muestra en pantalla la ubicación de todos los pollitos, su color de equipo y resalta con pulso al combatiente que tiene el turno.

---

## Arquitectura del Proyecto

```
app/                 Rutas y páginas de Next.js (/ = pantalla principal/TV, /mando = control remoto)
components/          Componentes React (HostApp, ControllerApp, MatchHud, CinematicOverlay, Shared)
game/constants.js    Constantes globales, armas, colores, configuración y contraseña
game/terrain.js      Generador procedural de vóxeles, terreno destructible, vigas y materiales
game/islands.js      Biomas, decoración y temáticas de cada isla
game/match.js        Bucle de partida: turnos, física, proyectiles, cajas, fuego y victoria
game/story.js        Misiones de campaña: objetivos, oleadas, jefes y guiones de diálogos
game/cinema.js       Director de cinemáticas procedurales: encuadres de cámara, zooms y retratos
game/ai.js           Inteligencia Artificial de los pollitos CPU (simulación balística por física)
game/host.js         Lógica del anfitrión: red PeerJS, salas, estados de sincronización y cinemáticas
game/render.js       Motor gráfico 3D Three.js: sombras, agua procedural, cielo, partículas y cámaras anti-oclusión
game/mirror.js       Motor réplica optimizado para renderizado local en celulares y mandos de PC
game/audio.js        Sintetizador Web Audio: música polifónica y efectos de sonido en tiempo real
game/models.js       Geometrías 3D de pollitos articulados, accesorios, jefes y maquinaria
tests/sim.mjs        Suite de simulación sin navegador (física, armas, islas, IA y campaña historia)
tests/e2e.mjs        Pruebas de punta a punta con Playwright (TV, celulares, modo PC y cinemáticas)
```
