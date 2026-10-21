# 🐔 Fried Chicken

Guerra de **pollitos de juguete por turnos** en 3D, al estilo *Worms 4: Mayhem*. Se juega en el televisor (o sin televisor, solo con celulares) y **cada celular es un mando**.

- Islas de vóxeles **destructibles** con cámara en tercera persona.
- Hasta **4 jugadores** con su celular, más equipos manejados por la CPU.
- **Modos:** Versus (todos contra todos) y Cooperativo (juntos contra la CPU).
- **Equipos:** cada jugador su equipo, o equipos compartidos (por ejemplo 2 contra 2, turnándose).
- **19 armas y utilidades**, viento, cajas que caen del cielo, minas, barriles y muerte súbita.
- Todo el arte, la música y los sonidos se generan con código: no descarga imágenes ni audio.

## Subirlo a Vercel

1. Sube el contenido de esta carpeta a un repositorio de GitHub (sin `node_modules` ni `.next`).
2. En [vercel.com](https://vercel.com) → **Add New… → Project** → importa el repositorio.
3. Vercel detecta Next.js solo. Dale **Deploy**, no hay que configurar nada.
4. Abre el link en el PC conectado al televisor.

Para probarlo en tu computador:

```bash
npm install
npm run dev
```

y abre `http://localhost:3000`. (El celular no puede entrar a `localhost`; para el celular usa el link de Vercel.)

## Contraseña

La pantalla principal pide la misma contraseña de Star League: **`juan2026*`**. El navegador la recuerda.
Los celulares no la piden.

Para cambiarla, calcula el SHA-256 de la nueva (`echo -n 'nueva' | shasum -a 256`) y reemplaza `PASSWORD_HASH` en `game/constants.js`.

## Cómo se juega

1. Abre el link en el PC/TV y pon la contraseña. Detrás del lobby se ve una partida de muestra entre robots.
2. Cada jugador escanea el **QR** (o abre `tu-link.vercel.app/mando` y escribe el código de 5 letras).
3. En el celular cada uno elige **nombre del equipo, color, accesorio** (casco, sombrero vueltiao, gorra, corona…) y, si quiere, el nombre de sus pollitos.
4. **J1** maneja los ajustes (desde su celular o con el mouse en el PC) y toca **¡A PELEAR!**

### Sin televisor (solo celulares)

1. Uno abre el link en su celular, pone la contraseña y toca **🎮 Jugar en este celular**: ese celular lleva la partida y es J1.
2. Los demás se unen con el QR o con **📤 Compartir link**.
3. Cada celular muestra el juego automáticamente. Quien no quiera verlo elige **Solo mando**.

El celular que crea la sala lleva la partida: si cierra la página o cambia de app, el juego se pausa.

### Tu turno en el celular

| Control | Qué hace |
| --- | --- |
| **Joystick** | Caminar (arriba/abajo) y girar (izquierda/derecha). En modo apuntar: mover la mira |
| **🎯 Apuntar** | Cámara sobre el hombro para apuntar fino |
| **💥 DISPARAR** | Mantener para cargar la fuerza y soltar para lanzar (las armas sin fuerza disparan al tocar) |
| **⤴ Saltar** / **↩ Atrás** | Salto hacia adelante / salto hacia atrás (más alto) |
| **👁 Mapa** | Vista general de la isla |
| **Botón del arma** | Abre la cuadrícula de armas con la munición |

- Las armas con **mecha** muestran botones de 1 a 5 segundos.
- Las armas que piden un **punto** (palomas, guacamaya, teletransporte) muestran una mira roja que se mueve con el joystick.
- Después de disparar quedan **5 segundos para esconderse**.
- Cuando no es tu turno puedes mandar **reacciones** (🐔 😂 😱 👏) que salen en la pantalla.

### Teclado (PC)

En el lobby pulsa **Espacio** para unirte con el teclado. En tu turno: **W/S** caminar, **A/D** girar, **R** apuntar, **Espacio** (mantener) disparar, **J** saltar, **K** salto atrás, **E/Q** cambiar arma, **1-5** mecha, **C** mapa, **Esc** pausa, **M** silencio.

## Ajustes del lobby

Modo · equipos de jugadores (cada uno su equipo / compartidos) · equipos CPU (0 a 3) y su dificultad (Fácil, Normal, Difícil) · isla (o aleatoria) · pollitos por equipo (2, 3, 4) · vida (100, 150, 200) · reloj del turno (30, 45, 60 s) · armas (Clásico o Locura) · muerte súbita (5, 10, 15 min) · fuego amigo en cooperativo · calidad gráfica.

## Armas

| Arma | Qué hace |
| --- | --- |
| 🥚 Bazuca de Huevo | Huevo explosivo que se lleva el viento |
| 💣 Huevo Granada | Rebota y explota con la mecha |
| 🌽 Maíz Pira | Revienta en 5 crispetas explosivas |
| 🌻 Escopeta de Semillas | Dos tiros rectos por turno |
| 🔥 Picotazo de Fuego | Salta y manda a volar hacia arriba |
| 👡 La Chancla | “¡Venga para acá, mijo!”: manda a volar al rival |
| 🕊️ Bandada de Palomas | Regalitos explosivos desde el cielo sobre el punto marcado |
| 🕯️ Vela de Cumpleaños | Explota a los 5 segundos |
| 🐣 Mina Nido | Explota cuando alguien se acerca |
| 🐔 Mamá Gallina | Corre sola; toca DISPARAR otra vez para detonarla |
| 🌟 Huevo de Oro | “¡Aleluyaaa!”: explosión enorme |
| 🦜 Guacamaya Teledirigida | Vuela hasta el punto marcado |
| ➰ Cuerda de Lombriz | Engánchate y balancéate |
| 🌀 Ventilador a la Espalda | Vuela un rato (mantén Saltar) |
| ☂️ Sombrilla | Cae despacio |
| ✨ Teletransporte | Aparece donde marques |
| 🧱 Viga de Juguete | Pon un puente adelante |
| ⏭️ Saltar turno · 🏳️ Rendirse | |

## Islas

Arenero del Patio, Bañera Espumosa, Cocina Gigante, Cuarto de Juguetes, Mesa de Billar y Castillo del Zorro. Cada partida genera una isla distinta con su decoración de juguete (baldes, patitos de goma, cerezas, bloques, bolas de billar, torres…), que también se puede romper. La cuchara de la cocina es de metal y no se rompe.

## Notas

- La conexión celular ↔ pantalla usa el servidor gratuito de PeerJS solo para presentarlos; después los datos van directo. Funciona mejor en el **mismo Wi-Fi**.
- Ver el juego en el celular gasta más batería y unos 1,5 MB por minuto. "Solo mando" casi no gasta.
- Si un celular se desconecta en su turno, el turno se acaba solo; al volver a abrir el link recupera su puesto.
- El juego no guarda partidas.

## Estructura

```
app/                 páginas de Next.js (/ = pantalla principal, /mando = celular)
components/          HostApp (lobby, HUD, resultados), ControllerApp (mando), TouchControls, Shared
game/constants.js    armas, colores, ajustes y contraseña
game/terrain.js      isla de vóxeles: generación por semilla, explosiones y vigas
game/islands.js      temas y decoración de cada isla
game/match.js        la partida: turnos, física, armas, objetos y victoria
game/ai.js           la CPU (simula los tiros con la misma física)
game/host.js         anfitrión: red, lobby, equipos y ciclo del juego
game/render.js       gráficos 3D (Three.js), cámaras, partículas y etiquetas
game/mirror.js       copia del juego en el celular
game/audio.js        música y efectos sintetizados
```
