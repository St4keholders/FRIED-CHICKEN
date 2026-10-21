# 🐔 Plumazo — Guerra de Pollitos por Turnos

> **Plumazo** es un juego multijugador en 3D estilo *Worms 4: Mayhem* donde equipos de **pollitos de juguete** (pollitos de goma con casco militar y accesorios) se enfrentan por turnos en islas flotantes destructibles construidas con vóxeles.

---

## 1. ¿Qué es el juego?

En su turno, cada jugador mueve a su pollito por pendientes y bloques de juguete, selecciona un arma disparatada de su arsenal, apunta en vista en tercera persona sobre el hombro, carga potencia y dispara.
- **Terreno 100% destructible:** Las explosiones desintegran el terreno de vóxeles en tiempo real.
- **Viento y balística:** El viento desvía los proyectiles y calcular la parábola es clave para no mandar el tiro al agua.
- **Muerte súbita:** Tras 10 minutos de combate, toda la vida baja a 1 y el agua sube ronda tras ronda.
- **Sin descargas pesadas:** Todo el arte (modelos vóxel, texturas, íconos) y todo el audio (música chiptune y efectos) se sintetizan por código en tiempo real.

---

## 2. Cómo ejecutar y desplegar en Vercel

### En tu computadora local (Desarrollo):
```bash
npm install
npm run dev
```
Abre en tu navegador: [http://localhost:3000](http://localhost:3000)

### Despliegue en Vercel (Paso a paso, sin configurar nada):
1. Sube este repositorio a tu cuenta de **GitHub**.
2. Entra a [Vercel](https://vercel.com) e inicia sesión.
3. Haz clic en **Add New Project** y selecciona tu repositorio `fried-chicken` (o `plumazo`).
4. Vercel detectará automáticamente Next.js. Haz clic en **Deploy**.
5. ¡Listo! Vercel te dará una URL pública HTTPS donde tú y tus amigos pueden jugar inmediatamente.

---

## 3. Contraseña del Anfitrión

Para evitar que curiosos manipulen la pantalla del TV en salas compartidas, la pantalla principal `/` pide una contraseña la primera vez:
- **Contraseña por defecto:** `starleague` (también acepta `plumazo` o `pollitos`).
- **Cómo cambiarla:** En `game/constants.js`, genera el hash SHA-256 de tu nueva clave y reemplázalo en `PASSWORD_HASH`.
- Los celulares que se unen como mandos **no** requieren contraseña.

---

## 4. Cómo se juega

### Modo con TV (Recomendado):
1. Abre la pantalla principal `/` en tu PC o Smart TV conectado al televisor de la sala.
2. Ingresa la contraseña (`starleague`).
3. Aparecerá el lobby con un **Código de 5 letras** y un **Código QR**.
4. Cada jugador escanea el QR con la cámara de su celular (o entra a `/mando?c=CÓDIGO`).
5. Cada jugador personaliza su color, sombrero y nombres de sus pollitos.
6. El Jugador 1 (J1) presiona **INICIAR PARTIDA**.

### Modo sin TV (Jugar en el mismo celular o pantalla táctil):
- Si abres la página principal en una tableta o celular, activa **🎮 Jugar en este dispositivo**. El anfitrión llevará la simulación y funcionará simultáneamente como el mando de J1.
- Los demás jugadores pueden elegir entre **Solo mando** (botones táctiles de alto contraste) o **Ver el juego aquí** (copia 3D completa en el celular sincronizada a 60 fps).

### Controles en el celular (en horizontal):
| Zona Izquierda | Zona Derecha |
| --- | --- |
| **Joystick Virtual:** Caminar, subir cuestas y girar. | **DISPARAR:** Mantén presionado para cargar potencia y suelta para lanzar. |
| | **SALTAR:** Salto hacia adelante. |
| | **ATRÁS:** Salto mortal hacia atrás (más alto). |
| | **ARMAS:** Abre la cuadrícula con todo el arsenal y munición. |
| | **🎯 APUNTAR:** Vista en tercera persona sobre el hombro. |
| | **👁️ CÁMARA:** Vista panorámica general del mapa. |
| | **Arrastrar pantalla derecha:** Puntería fina al apuntar. |

### Controles de teclado en PC (de respaldo):
- **WASD:** Moverse
- **Espacio:** Saltar
- **Q:** Salto hacia atrás
- **Enter o Clic:** Mantener para cargar potencia y disparar
- **E:** Cambiar arma
- **C:** Alternar cámara libre / vista general
- **M:** Silenciar o activar música y sonido
- **Esc:** Pausar partida

---

## 5. Modos de Juego

### 1. Versus por Equipos
Todos contra todos o en equipos compartidos. Gana el último equipo con pollitos vivos en la isla. Incluye podio final con estadísticas cómicas (mayor daño, mayor cantidad de pollitos ahogados, autogoles).

### 2. Cooperativo contra CPU
Los jugadores humanos unen fuerzas contra 1 a 3 escuadrones de robots de lata controlados por la inteligencia artificial (`game/ai.js`) en 3 dificultades: Fácil, Normal y Difícil.

### 3. Modo Historia: *"El Gran Robo de los Huevos"*
Campaña cooperativa de 8 niveles continuos contra el **Zorro Rufo** y su ejército de lata:
1. **Arenero del Patio:** Tutorial jugado contra 2 pollitos de lata.
2. **Bañera Espumosa:** Marea creciente: el agua sube cada ronda.
3. **Cocina Gigante:** Recolecta 3 Huevitos especiales antes de 8 rondas.
4. **Cuarto de Juguetes:** Escolta y protege a la Gallina Abuela.
5. **Mesa de Billar:** Destruye 4 antenas de hojalata con munición limitada.
6. **Jardín de Noche:** Jefe Sargento Lata (blindaje frontal invulnerable).
7. **Ático Polvoriento:** Supervivencia extrema durante 6 oleadas.
8. **Castillo del Zorro (Final):** Batalla contra el Zorro Rufo en su Mecha de Juguete.
*Al completar la historia se desbloquea el Monóculo y el Disfraz de Rufo.*

---

## 6. Arsenal y Utilidades

| Arma | Tipo | Munición | Comportamiento |
| --- | --- | --- | --- |
| **Bazuca de Huevo** | Proyectil | ∞ | Vuela afectado por el viento; explota al contacto. |
| **Huevo Granada** | Proyectil | ∞ | Rebota en el terreno; mecha configurable de 1 a 5 s. |
| **Maíz Pira** | Racimo | 3 | Explota y se divide en 5 crispetas saltarinas explosivas. |
| **Escopeta de Semillas**| Escopeta | ∞ | Dos disparos rectos de alta velocidad por turno sin viento. |
| **Picotazo de Fuego** | Melee | ∞ | Gancho hacia arriba envuelto en llamas; lanza al rival por el aire. |
| **La Chancla** | Bateo | 2 | Golpe definitivo de mamá colombiana; empuje colosal con frase típica. |
| **Bandada de Palomas** | Aéreo | 1 | Bombardeo aéreo de 5 proyectiles sobre las coordenadas marcadas. |
| **Vela de Cumpleaños** | Colocable | 2 | Dinamita festiva colocada a los pies con mecha de 5 s. |
| **Mina Nido** | Proximidad | 2 | Se arma a los 2 s; pita y explota si un pollito se acerca a menos de 3.2 m. |
| **Mamá Gallina** | Caminante | 1 | Gallina teledirigida que corre y salta obstáculos; detónala a voluntad. |
| **Huevo de Oro** | Sagrada | 1 | Gran explosión bíblica con coro celestial sintetizado *"¡Aleluyaaa!"*. |
| **Guacamaya Teledirigida**| Misil | 1 | Cohete con plumas que persigue la posición marcada en el mapa. |
| **Sombrilla** | Utilidad | ∞ | Paracaídas de emergencia para flotar y anular el daño por caída. |
| **Teletransporte** | Utilidad | 2 | Transporta al pollito al punto indicado (termina el turno). |
| **Viga de Juguete** | Construcción| 3 | Coloca una sección de puente de bloques en el aire. |

---

## 7. Notas Técnicas y Reconexión

- **Reconexión transparente:** Si un celular pierde señal, recarga la página o cambia de app, recupera automáticamente su puesto y su equipo mediante el ID persistente en `localStorage`.
- **Cero consumo de datos:** El terreno se genera proceduralmente por semilla y las explosiones se sincronizan con eventos `carve` de pocos bytes (<2 MB por hora).
- **Audio Web API puro:** No requiere archivos `.mp3` ni `.wav` externos, compatible con todos los navegadores modernos.
