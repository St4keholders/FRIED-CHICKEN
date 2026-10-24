// Fried Chicken: constantes del juego

export const GAME_NAME = 'Fried Chicken';
// SHA-256 de la contraseña de la pantalla principal (la misma de Star League)
export const PASSWORD_HASH = 'b84278f09dc30d6b6710c7628dbe93a440013d3dd152c147c19fe00ba4fecf4f';
export const PEER_PREFIX = 'friedchicken-v1-';
export const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

// ---- mundo ----
export const VOX = 0.5; // tamaño de un vóxel en unidades del mundo
export const NX = 144;
export const NY = 48;
export const NZ = 144;
export const CHUNK = 16;
export const WORLD_X = NX * VOX; // 72
export const WORLD_Y = NY * VOX; // 24
export const WORLD_Z = NZ * VOX; // 72

// materiales de los vóxeles (el color depende de la isla)
export const M = { TOP: 1, SUB: 2, DEEP: 3, METAL: 4, A: 5, B: 6, C: 7, D: 8, WHITE: 9, DARK: 10, E: 11, BEAM: 12 };

export const MAX_PLAYERS = 4;
export const MAX_TEAMS = 4;

// colores de equipo (los 4 primeros son de los jugadores J1–J4)
export const TEAM_COLORS = [
  { id: 0, name: 'Rojo', hex: '#ff4757', dark: '#b3202e' },
  { id: 1, name: 'Azul', hex: '#2f8cff', dark: '#1458b8' },
  { id: 2, name: 'Verde', hex: '#2ecc71', dark: '#16884a' },
  { id: 3, name: 'Morado', hex: '#a55eea', dark: '#6a2fb0' },
  { id: 4, name: 'Lata', hex: '#9aa7b4', dark: '#5d6873' },
  { id: 5, name: 'Naranja', hex: '#ff9f1a', dark: '#c46a00' },
  { id: 6, name: 'Rosado', hex: '#ff6fae', dark: '#c4357a' },
];
export const SLOT_NAMES = ['J1', 'J2', 'J3', 'J4'];

export const TEAM_NAMES = [
  'Los Crocantes', 'Alitas Bravas', 'Pechugas de Acero', 'Los Nuggets', 'Muslos de Hierro', 'Pío Pío Squad',
  'Los Emplumados', 'Cresta Brava', 'Huevos Revueltos', 'Los Desplumados', 'La Banda del Maíz', 'Picos de Oro',
];
export const CPU_TEAM_NAMES = ['Pollitos de Lata', 'Robo-Pollos', 'Latas Locas'];

export const CHICKEN_NAMES = [
  'Pío', 'Huevito', 'Plumón', 'Kiki', 'Tostado', 'Nugget', 'Crispy', 'Pechuga', 'Chispita', 'Maicito',
  'Copete', 'Alita', 'Tito', 'Pepa', 'Canelo', 'Yema', 'Pollín', 'Migaja', 'Rulo', 'Coco',
];
export const ROBOT_NAMES = ['Tuerca', 'Tornillo', 'Latón', 'Chatarra', 'Bujía', 'Resorte', 'Clavo', 'Pistón', 'Voltio', 'Remache', 'Engranaje', 'Chip'];

export const ACCESSORIES = [
  { id: 'casco', name: 'Casco' },
  { id: 'vueltiao', name: 'Sombrero vueltiao' },
  { id: 'gorra', name: 'Gorra' },
  { id: 'corona', name: 'Corona' },
  { id: 'bandana', name: 'Bandana' },
  { id: 'gafas', name: 'Gafas de sol' },
  { id: 'copete', name: 'Copete punk' },
  { id: 'chef', name: 'Gorro de chef' },
];

// ---- armas ----
// aim: power (cargar y lanzar), direct (sin potencia), melee (golpe), drop (se deja en el piso),
//      target (se elige un punto en el mapa), targetpower (punto + lanzar), none (se activa)
export const WEAPONS = [
  { id: 'bazuca', name: 'Bazuca de Huevo', icon: '🥚', ammo: -1, aim: 'power', desc: 'Huevo explosivo que se lleva el viento' },
  { id: 'granada', name: 'Huevo Granada', icon: '💣', ammo: -1, aim: 'power', fuse: true, desc: 'Rebota y explota con la mecha' },
  { id: 'maiz', name: 'Maíz Pira', icon: '🌽', ammo: 3, aim: 'power', fuse: true, desc: 'Revienta en 5 crispetas explosivas' },
  { id: 'escopeta', name: 'Escopeta de Semillas', icon: '🌻', ammo: -1, aim: 'direct', desc: 'Dos tiros rectos por turno' },
  { id: 'picotazo', name: 'Picotazo de Fuego', icon: '🔥', ammo: -1, aim: 'melee', desc: 'Salta y manda a volar hacia arriba' },
  { id: 'chancla', name: 'La Chancla', icon: '👡', ammo: 2, aim: 'melee', desc: '¡Venga para acá, mijo!' },
  { id: 'palomas', name: 'Bandada de Palomas', icon: '🕊️', ammo: 1, aim: 'target', desc: 'Regalitos explosivos desde el cielo' },
  { id: 'vela', name: 'Vela de Cumpleaños', icon: '🕯️', ammo: 2, aim: 'drop', desc: 'Explota a los 5 segundos: ¡corre!' },
  { id: 'mina', name: 'Mina Nido', icon: '🐣', ammo: 2, aim: 'drop', desc: 'Explota cuando alguien se acerca' },
  { id: 'gallina', name: 'Mamá Gallina', icon: '🐔', ammo: 1, aim: 'drop', desc: 'Corre sola; dispara otra vez para detonarla' },
  { id: 'oro', name: 'Huevo de Oro', icon: '🌟', ammo: 1, aim: 'power', desc: '¡Aleluyaaa! Explosión enorme' },
  { id: 'guacamaya', name: 'Guacamaya Teledirigida', icon: '🦜', ammo: 1, aim: 'targetpower', desc: 'Marca el objetivo y lánzala' },
  { id: 'cuerda', name: 'Cuerda de Lombriz', icon: '➰', ammo: 3, aim: 'direct', util: true, desc: 'Engánchate y balancéate' },
  { id: 'ventilador', name: 'Ventilador a la Espalda', icon: '🌀', ammo: 2, aim: 'none', util: true, desc: 'Vuela con combustible limitado' },
  { id: 'sombrilla', name: 'Sombrilla', icon: '☂️', ammo: 3, aim: 'none', util: true, desc: 'Cae despacio' },
  { id: 'teleport', name: 'Teletransporte', icon: '✨', ammo: 2, aim: 'target', util: true, desc: 'Aparece donde marques' },
  { id: 'viga', name: 'Viga de Juguete', icon: '🧱', ammo: 3, aim: 'place', util: true, desc: 'Pon un puente adelante' },
  { id: 'saltar', name: 'Saltar turno', icon: '⏭️', ammo: -1, aim: 'none', util: true, desc: 'Pasa el turno' },
  { id: 'rendirse', name: 'Rendirse', icon: '🏳️', ammo: -1, aim: 'none', util: true, desc: 'Tu equipo se rinde' },
];
export const WEAPON_BY_ID = Object.fromEntries(WEAPONS.map((w) => [w.id, w]));
export function weaponById(id) { return WEAPON_BY_ID[id] || WEAPONS[0]; }

export const WEAPON_SETS = [
  { id: 'clasico', name: 'Clásico' },
  { id: 'locura', name: 'Locura' },
];

export function startAmmo(set) {
  const inv = {};
  for (const w of WEAPONS) {
    if (w.ammo < 0) inv[w.id] = -1;
    else inv[w.id] = set === 'locura' ? Math.max(4, w.ammo * 3) : w.ammo;
  }
  return inv;
}

// ---- islas ----
export const ISLANDS = [
  { id: 'arenero', name: 'Arenero del Patio', colors: ['#f6d68c', '#ff5a5f', '#2ec4d6'] },
  { id: 'banera', name: 'Bañera Espumosa', colors: ['#eaf6ff', '#ffd400', '#ff9ec7'] },
  { id: 'cocina', name: 'Cocina Gigante', colors: ['#ff8fc7', '#f7d9a0', '#e3172b'] },
  { id: 'juguetes', name: 'Cuarto de Juguetes', colors: ['#5b7cfa', '#ffd23f', '#ff4757'] },
  { id: 'billar', name: 'Mesa de Billar', colors: ['#1fa45a', '#7a4a24', '#ffd23f'] },
  { id: 'castillo', name: 'Castillo del Zorro', colors: ['#4caf50', '#9e9e9e', '#c0392b'] },
];
export const RANDOM_ISLAND = 'aleatoria';
export function islandName(id) {
  if (!id || id === RANDOM_ISLAND) return '🎲 Aleatoria';
  const f = ISLANDS.find((i) => i.id === id);
  return f ? f.name : '🎲 Aleatoria';
}

// ---- configuración del lobby ----
export const MODES = [
  { id: 'versus', name: 'Versus', desc: 'Todos contra todos por turnos' },
  { id: 'coop', name: 'Cooperativo', desc: 'Juntos contra la CPU' },
];
export const TEAM_MODES = [
  { id: 'solo', name: 'Cada uno su equipo' },
  { id: 'shared', name: 'Equipos compartidos' },
];
export const CPU_LEVELS = [
  { id: 0, name: 'Fácil' },
  { id: 1, name: 'Normal' },
  { id: 2, name: 'Difícil' },
];
export const TURN_TIMES = [30, 45, 60];
export const HP_OPTIONS = [100, 150, 200];
export const CHICKEN_COUNTS = [2, 3, 4];
export const SUDDEN_OPTIONS = [5, 10, 15];
export const QUALITY = [
  { id: 'alta', name: 'Alta' },
  { id: 'normal', name: 'Normal' },
  { id: 'ahorro', name: 'Ahorro' },
];
export const SENS_OPTIONS = [
  { id: 'baja', name: 'Baja', rad: 0.0025 },
  { id: 'media', name: 'Media', rad: 0.004 },
  { id: 'alta', name: 'Alta', rad: 0.007 },
];
export function sensRad(id) {
  const f = SENS_OPTIONS.find((s) => s.id === id);
  return f ? f.rad : 0.004;
}

export const DEFAULT_CFG = {
  mode: 'versus',
  teamMode: 'solo',
  chickens: 4,
  hp: 100,
  turnTime: 45,
  weaponSet: 'clasico',
  island: RANDOM_ISLAND,
  sudden: 10,
  cpuTeams: 1,
  cpuLevel: 1,
  friendly: false,
  quality: 'normal',
};

// ---- tiempos y física ----
export const RETREAT_TIME = 5;
export const GRAVITY = 20;
export const PROJ_GRAVITY = 18;
export const CHICKEN_R = 0.38;
export const CHICKEN_H = 1.25;
