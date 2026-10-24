// Modo Historia: "El Gran Robo de los Huevos". Solo datos (sin Three.js ni DOM):
// los usan el motor de la partida (match.js), el anfitrión (host.js) y la interfaz.
//
// Cada nivel:
//   n, name, island, look ('dia' | 'noche' | 'atardecer'), goal, goalText (texto corto del HUD)
//   enemy: { count, hp, cpu }     pollitos de lata normales (cpu = dificultad 0..2)
//   heroHp                        vida de cada pollito de los jugadores
//   Según el objetivo: waterEvery, eggs, abuela, machines, boss, waves, rounds
//   hints                         pistas del tutorial (nivel 1)
//   intro / outro                 guion: [{ who, text, focus }]
//     who: 'h0'..'h3' (pollitos de los jugadores, con los nombres que eligieron), 'zorro', 'abuela',
//          'lata', 'sargento' o 'narradora'
//     focus: a dónde mira la cámara ('heroes' | 'enemies' | 'abuela' | 'boss' | 'machines' | 'island')

export const STORY_TITLE = 'El Gran Robo de los Huevos';
export const STORY_SYNOPSIS = 'El Zorro Rufo se robó el Huevo Dorado de la Granja de Juguete y armó un ejército de pollitos de lata. ¡Cruza la casa de los niños para recuperarlo!';

export const GOALS = ['eliminate', 'water', 'eggs', 'protect', 'machines', 'boss', 'survive'];
export const SPEAKER_IDS = ['zorro', 'abuela', 'lata', 'sargento', 'narradora'];

export const LEVELS = [
  {
    n: 1, name: 'Aprender a pelear', island: 'arenero', look: 'dia', goal: 'eliminate',
    goalText: 'Elimina a los 2 pollitos de lata',
    enemy: { count: 2, hp: 40, cpu: 0 }, heroHp: 100,
    hints: [
      { id: 'walk', text: 'Camina con el joystick (en PC: W y S para caminar, A y D para girar)' },
      { id: 'aim', text: 'Arrastra el dedo (o el mouse) para apuntar al pollito de lata' },
      { id: 'fire', text: 'Mantén ¡FUEGO! para cargar la fuerza y suelta para disparar' },
    ],
    intro: [
      { who: 'narradora', text: 'Una noche en la Granja de Juguete, ¡alguien se llevó el Huevo Dorado!', focus: 'island' },
      { who: 'zorro', text: 'Jua, jua, jua... Soy el Zorro Rufo, y ese huevo ahora es MÍO. ¡Pollitos de lata, a trabajar!', focus: 'enemies' },
      { who: 'h0', text: '¡Eso no se queda así! Vamos por nuestro huevo.', focus: 'heroes' },
      { who: 'h1', text: 'Primero lo primero: a caminar, apuntar y disparar.', focus: 'heroes' },
    ],
    outro: [
      { who: 'h0', text: '¡Dos pollitos de lata hechos chatarra!', focus: 'heroes' },
      { who: 'lata', text: 'Bzzz... el jefe se va a poner furioso... bzzz.', focus: 'enemies' },
      { who: 'narradora', text: 'Pero el huevo sigue lejos. Siguiente parada: la bañera.', focus: 'island' },
    ],
  },
  {
    n: 2, name: 'Bajo la espuma', island: 'banera', look: 'dia', goal: 'water', waterEvery: 3,
    goalText: 'Elimina al equipo enemigo antes de que suba el agua',
    enemy: { count: 3, hp: 60, cpu: 1 }, heroHp: 100,
    intro: [
      { who: 'narradora', text: 'La Bañera Espumosa: resbalosa, burbujeante y llena de patitos de goma.', focus: 'island' },
      { who: 'lata', text: 'Alerta, alerta: pollitos de carne y hueso en la bañera. ¡Abran el desagüe al revés!', focus: 'enemies' },
      { who: 'h1', text: '¿El agua está subiendo? ¡Esto no es un spa!', focus: 'heroes' },
    ],
    outro: [
      { who: 'h0', text: '¡Ganamos! Y con las plumas medio mojadas.', focus: 'heroes' },
      { who: 'zorro', text: 'Bah, solo eran latas viejas. ¡Rumbo a la cocina, que ahí sí los espero con un banquete!', focus: 'enemies' },
    ],
  },
  {
    n: 3, name: 'La cacería de los huevitos', island: 'cocina', look: 'dia', goal: 'eggs', eggs: { total: 3, rounds: 8 },
    goalText: 'Recoge 3 Huevitos antes de que se acaben las 8 rondas',
    enemy: { count: 3, hp: 50, cpu: 1 }, heroHp: 100,
    intro: [
      { who: 'narradora', text: 'En la Cocina Gigante se esconden los huevitos del Zorro: ¡hay que recogerlos antes de que se cocinen!', focus: 'island' },
      { who: 'zorro', text: 'Mis huevitos valen oro. Si no los recogen en 8 rondas, ¡serán tortilla!', focus: 'enemies' },
      { who: 'h2', text: '¡Nadie hace tortilla con mi familia! A buscarlos.', focus: 'heroes' },
    ],
    outro: [
      { who: 'h0', text: '¡Los tres huevitos están a salvo!', focus: 'heroes' },
      { who: 'h1', text: 'Mira, ¡tienen un mapa dibujado! Nos lleva al Cuarto de Juguetes.', focus: 'heroes' },
    ],
  },
  {
    n: 4, name: 'Cuidar a la Abuela', island: 'juguetes', look: 'dia', goal: 'protect', abuela: { hp: 80 },
    goalText: 'Elimina a todos los enemigos y no dejes que le pase nada a la Gallina Abuela',
    enemy: { count: 4, hp: 50, cpu: 1 }, heroHp: 100,
    intro: [
      { who: 'abuela', text: 'Ay, mis niños, ¡me cogió la noche en medio de los juguetes! Cuídenme, que ya no estoy para correr.', focus: 'abuela' },
      { who: 'lata', text: '¡Objetivo: la gallina vieja! Atrápenla y llévensela al jefe.', focus: 'enemies' },
      { who: 'h0', text: '¡A la abuela no la toca nadie! ¡Rodéenla!', focus: 'heroes' },
    ],
    outro: [
      { who: 'abuela', text: 'Gracias, mijitos. Les voy a hacer un caldo de agradecimiento... ¡con zanahoria!', focus: 'abuela' },
      { who: 'abuela', text: 'Ah, y les cuento: el Zorro tiene máquinas de lata en la Mesa de Billar. Ahí fabrica su ejército.', focus: 'abuela' },
    ],
  },
  {
    n: 5, name: 'La fábrica de latas', island: 'billar', look: 'dia', goal: 'machines', machines: { count: 4, hp: 60 },
    ammo: { bazuca: 12, granada: 8, maiz: 2, oro: 1, palomas: 1 },
    goalText: 'Destruye las 4 máquinas de lata con la munición que tienes',
    enemy: { count: 2, hp: 50, cpu: 0 }, heroHp: 100,
    intro: [
      { who: 'narradora', text: 'Sobre la Mesa de Billar, cuatro máquinas sueltan pollitos de lata sin parar.', focus: 'machines' },
      { who: 'h1', text: 'Si las destruimos, se acaba el ejército. Pero ojo: ¡pocas municiones!', focus: 'heroes' },
      { who: 'zorro', text: 'Mis máquinas son indestructibles... bueno, casi. ¡Pollitos, protéjanlas!', focus: 'enemies' },
    ],
    outro: [
      { who: 'h0', text: '¡Las cuatro máquinas son chatarra! Se acabó la fábrica.', focus: 'heroes' },
      { who: 'zorro', text: '¡Mis máquinas! Está bien, está bien... mandaré al Sargento Lata. Nos vemos en mi castillo.', focus: 'enemies' },
    ],
  },
  {
    n: 6, name: 'El Sargento Lata', island: 'castillo', look: 'noche', goal: 'boss',
    boss: { id: 'sargento', name: 'Sargento Lata', hp: 260, shield: true, scale: 1.7 },
    goalText: 'Derrota al Sargento Lata: su escudo solo se rompe por detrás',
    enemy: { count: 2, hp: 50, cpu: 1 }, heroHp: 100,
    intro: [
      { who: 'narradora', text: 'Noche cerrada en el Castillo del Zorro. Un robot enorme custodia la puerta.', focus: 'boss' },
      { who: 'sargento', text: '¡ATENCIÓN, PLUMÍFEROS! Soy el Sargento Lata. Mi escudo de acero es impenetrable. ¡Rindan armas!', focus: 'boss' },
      { who: 'h2', text: 'Un momento... si el escudo está adelante, ¿qué hay por detrás?', focus: 'heroes' },
    ],
    outro: [
      { who: 'sargento', text: 'Bzzz... mi escudo... mi orgullo... bzzzt.', focus: 'boss' },
      { who: 'h0', text: '¡Por detrás! Siempre por detrás. Ahora sí, a la torre del Zorro.', focus: 'heroes' },
    ],
  },
  {
    n: 7, name: 'Resistir el atardecer', island: 'arenero', look: 'atardecer', goal: 'survive', rounds: 6,
    waves: { every: 2, per: 2, total: 6 },
    goalText: 'Aguanta 6 rondas contra las oleadas de latas',
    enemy: { count: 2, hp: 50, cpu: 1 }, heroHp: 100,
    intro: [
      { who: 'narradora', text: 'El sol se esconde en el patio. El Zorro manda a todo su ejército de una sola vez.', focus: 'enemies' },
      { who: 'zorro', text: '¡Oleada tras oleada! ¿Cuánto aguantan, gallinitas? Jua, jua, jua.', focus: 'enemies' },
      { who: 'h1', text: 'Solo hay que resistir hasta que se les acabe la cuerda. ¡Aguanten!', focus: 'heroes' },
    ],
    outro: [
      { who: 'h0', text: '¡Seis rondas y seguimos de pie!', focus: 'heroes' },
      { who: 'lata', text: 'Bzzz... batería baja... bzzz...', focus: 'enemies' },
      { who: 'narradora', text: 'El camino al castillo está libre. Es hora del Zorro Rufo.', focus: 'island' },
    ],
  },
  {
    n: 8, name: 'El Zorro Rufo', island: 'castillo', look: 'dia', goal: 'boss',
    boss: { id: 'zorro', name: 'Zorro Rufo', hp: 380, shield: false, scale: 1.9, phases: 3 },
    goalText: 'Derrota al Zorro Rufo en su robot de juguete',
    enemy: { count: 2, hp: 50, cpu: 1 }, heroHp: 100,
    intro: [
      { who: 'narradora', text: 'En lo alto del Castillo, el Zorro Rufo los espera dentro de su robot de juguete gigante.', focus: 'boss' },
      { who: 'zorro', text: 'Llegaron hasta aquí... Qué conmovedor. Con este monóculo veo todos sus puntos débiles. ¡Ninguno!', focus: 'boss' },
      { who: 'h0', text: 'Devuélvenos el Huevo Dorado, Rufo.', focus: 'heroes' },
      { who: 'zorro', text: '¡Ven por él, si puedes! ¡Piezas de juguete, ataquen!', focus: 'boss' },
    ],
    outro: [
      { who: 'zorro', text: 'Imposible... ¡me ganaron unos pollitos! Tomen su huevo y... ay, mi monóculo.', focus: 'boss' },
      { who: 'h0', text: '¡El Huevo Dorado vuelve a casa!', focus: 'heroes' },
      { who: 'abuela', text: 'Eso, mijitos. Y ahora, todos a la mesa, ¡que hay caldo para la victoria!', focus: 'heroes' },
      { who: 'narradora', text: 'FIN. El Zorro Rufo les regala su monóculo: ¡nuevo accesorio desbloqueado!', focus: 'island' },
    ],
  },
];

export const LEVEL_COUNT = LEVELS.length;
export function levelById(n) { return LEVELS[Math.max(0, Math.min(LEVELS.length - 1, (n | 0) - 1))]; }
export function isValidLevel(n) { return Number.isInteger(n) && n >= 1 && n <= LEVELS.length; }

const ENEMY_NAMES = ['Tuerca', 'Tornillo', 'Latón', 'Chatarra', 'Bujía', 'Resorte', 'Clavo', 'Pistón'];

// Equipos de un nivel. hero: { name, color, dark, acc, names, slots, count } (todos los jugadores juntos).
// El enemigo siempre es CPU; la Gallina Abuela y los jefes son equipos aparte.
export function storyTeams(level, hero) {
  const teams = [{
    id: 'h0', name: hero.name, color: hero.color, dark: hero.dark, acc: hero.acc, robot: false, cpu: null,
    slots: hero.slots || [], alliance: 'H', names: hero.names, count: hero.count || 3, hp: level.heroHp,
  }];
  teams.push({
    id: 'c0', name: 'Pollitos de Lata', color: '#9aa7b4', dark: '#5d6873', acc: 'casco', robot: true, cpu: level.enemy.cpu,
    slots: [], alliance: 'C', names: ENEMY_NAMES.slice(0, 4), count: level.enemy.count, hp: level.enemy.hp,
    reserve: level.waves ? level.waves.total : 0,
  });
  if (level.abuela) {
    teams.push({
      id: 'a0', name: 'Gallina Abuela', color: '#f0dcc0', dark: '#b89c78', acc: 'chef', robot: false, cpu: null,
      slots: [], alliance: 'H', names: ['Abuela'], count: 1, hp: level.abuela.hp, npc: 'abuela',
    });
  }
  if (level.boss) {
    const zorro = level.boss.id === 'zorro';
    teams.push({
      id: 'b0', name: level.boss.name, color: zorro ? '#ff9f1a' : '#6d7a88', dark: zorro ? '#c46a00' : '#444e58', acc: zorro ? 'zorro' : 'casco',
      robot: !zorro, cpu: 2, slots: [], alliance: 'C', names: [level.boss.name], count: 1, hp: level.boss.hp, boss: level.boss,
    });
  }
  return teams;
}

// Configuración de la partida de un nivel (la Historia no usa muerte súbita).
export function storyCfg(base, level, heroCount) {
  return { ...base, mode: 'historia', teamMode: 'shared', chickens: heroCount || 3, hp: level.heroHp, turnTime: 45, weaponSet: 'clasico', sudden: 999, cpuTeams: 1, island: level.island };
}
