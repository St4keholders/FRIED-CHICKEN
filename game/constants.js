// game/constants.js - Game configurations, weapons, items, colors and defaults

export const GAME_NAME = 'Plumazo';
export const PEER_PREFIX = 'plumazo-v1-';
export const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 5;

// Default password hash: "starleague" or "plumazo"
// SHA-256 for "starleague" = 7dd8969f923d21386d1b06ab873e8184fafc6666ef86d6bf5d33690986ffca37
export const PASSWORD_HASH = '7dd8969f923d21386d1b06ab873e8184fafc6666ef86d6bf5d33690986ffca37';
export const BACKUP_PASSWORD_HASH = 'a2ef897058cad778ecc7b0379e62870a20ad731d851c139e6406d250b5e2ff00'; // "plumazo"

export const TEAM_COLORS = [
  { id: 'rojo', name: 'Rojo Picante', primary: '#e63946', secondary: '#f1faee', accent: '#ff758f' },
  { id: 'azul', name: 'Azul Cielo', primary: '#1d3557', secondary: '#a8dadc', accent: '#457b9d' },
  { id: 'verde', name: 'Verde Campo', primary: '#2a9d8f', secondary: '#e76f51', accent: '#52b788' },
  { id: 'amarillo', name: 'Amarillo Maíz', primary: '#f4a261', secondary: '#e9c46a', accent: '#e76f51' },
];

export const ACCESSORIES = [
  { id: 'casco', name: 'Casco Militar', desc: 'Casco de juguete resistente', icon: '🪖' },
  { id: 'sombrero_vueltiao', name: 'Sombrero Vueltiao', desc: 'Sabor colombiano garantizado', icon: '🤠' },
  { id: 'gorra', name: 'Gorra Deportiva', desc: 'Estilo urbano de patio', icon: '🧢' },
  { id: 'corona', name: 'Corona Dorada', desc: 'Rey del gallinero', icon: '👑' },
  { id: 'bandana', name: 'Bandana Ninja', desc: 'Sigiloso y mortal', icon: '🥷' },
  { id: 'monoculo', name: 'Monóculo del Zorro', desc: 'Desbloqueado tras vencer a Rufo', icon: '🧐', secret: true },
  { id: 'disfraz_zorro', name: 'Disfraz de Rufo', desc: 'Piel de zorro de peluche', icon: '🦊', secret: true },
];

export const DEFAULT_CHICKEN_NAMES = [
  'Pío', 'Huevito', 'Plumón', 'Kiki', 'Tostado', 'Crestas',
  'Pechuga', 'Ala Brava', 'Nugget', 'Piquito', 'Coronel', 'Polvorón',
  'Chicharrón', 'Maicito', 'Plumita', 'Batidor', 'Pío Loco', 'Pancita'
];

export const WEAPONS = [
  {
    id: 'bazuca',
    name: 'Bazuca de Huevo',
    icon: '🥚',
    type: 'projectile',
    ammo: Infinity,
    damage: 48,
    radius: 3.4,
    impulse: 14,
    powerCharge: true,
    affectedByWind: true,
    bounce: false,
    timer: false,
    desc: 'Huevo que vuela con el viento y explota al contacto.'
  },
  {
    id: 'granada',
    name: 'Huevo Granada',
    icon: '💣',
    type: 'projectile',
    ammo: Infinity,
    damage: 54,
    radius: 3.8,
    impulse: 15,
    powerCharge: true,
    affectedByWind: false,
    bounce: true,
    timer: true,
    minTimer: 1,
    maxTimer: 5,
    defaultTimer: 3,
    desc: 'Rebota en el terreno. Mecha configurable de 1 a 5 s.'
  },
  {
    id: 'maiz_pira',
    name: 'Maíz Pira',
    icon: '🍿',
    type: 'cluster',
    ammo: 3,
    damage: 30,
    radius: 3.0,
    clusterCount: 5,
    clusterDamage: 25,
    clusterRadius: 2.5,
    powerCharge: true,
    affectedByWind: false,
    bounce: true,
    timer: true,
    defaultTimer: 3,
    desc: 'Granada de racimo. Se abre en 5 crispetas explosivas.'
  },
  {
    id: 'escopeta',
    name: 'Escopeta de Semillas',
    icon: '🌽',
    type: 'shotgun',
    ammo: Infinity,
    shotsPerTurn: 2,
    damage: 26,
    radius: 1.8,
    impulse: 11,
    powerCharge: false,
    affectedByWind: false,
    desc: 'Dos tiros rectos por turno. Sin viento, alta precisión.'
  },
  {
    id: 'picotazo',
    name: 'Picotazo de Fuego',
    icon: '🔥',
    type: 'melee',
    ammo: Infinity,
    damage: 40,
    impulse: 22,
    powerCharge: false,
    desc: 'Gancho hacia arriba con fuego. Lanza al rival por los aires.'
  },
  {
    id: 'chancla',
    name: 'La Chancla',
    icon: '🩴',
    type: 'melee_bat',
    ammo: 2,
    damage: 38,
    impulse: 28,
    powerCharge: true,
    desc: 'El arma definitiva de mamá colombiana. Manda volando al rival.'
  },
  {
    id: 'palomas',
    name: 'Bandada de Palomas',
    icon: '🕊️',
    type: 'airstrike',
    ammo: 1,
    damage: 32,
    radius: 2.8,
    count: 5,
    powerCharge: false,
    needsTarget: true,
    desc: 'Marca un punto en el mapa. Pasan palomas soltando regalitos.'
  },
  {
    id: 'vela',
    name: 'Vela de Cumpleaños',
    icon: '🕯️',
    type: 'planted',
    ammo: 2,
    damage: 75,
    radius: 5.0,
    impulse: 20,
    timer: 5,
    powerCharge: false,
    desc: 'Dinamita festiva. Se deja a los pies y explota en 5 s.'
  },
  {
    id: 'mina',
    name: 'Mina Nido',
    icon: '🪺',
    type: 'mine',
    ammo: 2,
    damage: 60,
    radius: 4.2,
    impulse: 18,
    proximityDistance: 3.2,
    fuseTime: 3,
    powerCharge: false,
    desc: 'Mina de proximidad. Se activa si alguien se acerca.'
  },
  {
    id: 'mama_gallina',
    name: 'Mamá Gallina',
    icon: '🐔',
    type: 'walking_bomb',
    ammo: 1,
    damage: 70,
    radius: 4.6,
    impulse: 20,
    fuseTime: 10,
    powerCharge: false,
    desc: 'Corre hacia adelante saltando obstáculos. Detónala o espera 10 s.'
  },
  {
    id: 'huevo_oro',
    name: 'Huevo de Oro',
    icon: '✨',
    type: 'holy_grenade',
    ammo: 1,
    damage: 90,
    radius: 6.2,
    impulse: 25,
    fuseTime: 4,
    powerCharge: true,
    bounce: true,
    desc: 'Granada sagrada ancestral. Coro celestial antes de la devastación.'
  },
  {
    id: 'guacamaya',
    name: 'Guacamaya Teledirigida',
    icon: '🦜',
    type: 'homing',
    ammo: 1,
    damage: 55,
    radius: 4.0,
    impulse: 18,
    needsTarget: true,
    desc: 'Misil alado que persigue el punto objetivo.'
  },
];

export const UTILITIES = [
  {
    id: 'cuerda',
    name: 'Cuerda de Lombriz',
    icon: '🪱',
    type: 'utility_rope',
    endsTurn: false,
    desc: 'Se engancha al terreno superior para balancearse.'
  },
  {
    id: 'jetpack',
    name: 'Ventilador de Espalda',
    icon: '🪭',
    type: 'utility_jetpack',
    endsTurn: false,
    fuel: 100,
    desc: 'Vuela con combustible limitado durante el turno.'
  },
  {
    id: 'sombrilla',
    name: 'Sombrilla',
    icon: '☂️',
    type: 'utility_parachute',
    endsTurn: false,
    desc: 'Paracaídas para no sufrir daño por caída.'
  },
  {
    id: 'teleport',
    name: 'Teletransporte',
    icon: '🌀',
    type: 'utility_teleport',
    needsTarget: true,
    endsTurn: true,
    desc: 'Transpórtate a cualquier punto visible del mapa.'
  },
  {
    id: 'viga',
    name: 'Viga de Juguete',
    icon: '🧱',
    type: 'utility_girder',
    needsTarget: true,
    endsTurn: false,
    desc: 'Coloca un bloque o puente de juguete en el mapa.'
  },
  {
    id: 'skip',
    name: 'Saltar Turno',
    icon: '⏭️',
    type: 'skip_turn',
    endsTurn: true,
    desc: 'Pasa tu turno al siguiente jugador.'
  },
  {
    id: 'surrender',
    name: 'Rendirse',
    icon: '🏳️',
    type: 'surrender',
    needsConfirm: true,
    endsTurn: true,
    desc: 'Rinde a todo tu equipo (pide confirmación).'
  }
];

export const DEFAULT_CONFIG = {
  mode: 'versus', // versus, coop, historia
  turnTime: 45, // 30, 45, 60
  retreatTime: 5,
  chickensPerTeam: 4, // 2, 3, 4
  initialHealth: 100, // 100, 150, 200
  weaponSet: 'clasico', // clasico, locura
  islandId: 'arenero', // arenero, banera, cocina, cuarto, billar, castillo, random
  suddenDeathMinutes: 10,
  graphicsQuality: 'normal', // alta, normal, ahorro
  cpuCount: 1, // 1, 2, 3 in coop/versus
  cpuDifficulty: 'normal', // facil, normal, dificil
  friendlyFire: false, // In coop
  sharedTeams: false,
  startLevel: 1, // story start level (1-8)
};
