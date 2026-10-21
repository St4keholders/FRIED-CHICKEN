// game/islands.js - Island themes, voxel palettes, sky and decor props

export const ISLANDS = [
  {
    id: 'arenero',
    name: 'Arenero del Patio',
    desc: 'Un gran cajón de arena con cubetas, palas y castillos playeros.',
    skyTop: '#4ea8de',
    skyBottom: '#90e0ef',
    sunColor: '#fff3b0',
    waterColor: '#0077b6',
    waterOpacity: 0.75,
    waterHeight: 4,
    gravity: 24,
    palette: {
      surface: 0xe9c46a,      // Arena dorada
      subsurface: 0xd4a373,   // Arena compacta
      rock: 0x8d775f,         // Piedra de jardín
      accent: 0xe76f51,       // Borde de madera
      indestructible: 0x4a4e69,// Cubetas de metal
      gelatin: 0xf4a261
    },
    props: ['cubeta', 'pala', 'castillo_arena']
  },
  {
    id: 'banera',
    name: 'Bañera Espumosa',
    desc: 'Azulejos resbalosos, patos de hule gigantes y burbujas de jabón.',
    skyTop: '#00b4d8',
    skyBottom: '#caf0f8',
    sunColor: '#ffffff',
    waterColor: '#48cae4',
    waterOpacity: 0.8,
    waterHeight: 5,
    gravity: 22,
    palette: {
      surface: 0xe0fbfc,      // Azulejo blanco/celeste
      subsurface: 0x98c1d9,   // Baldosa azul
      rock: 0x3d5a80,         // Grifo metálico
      accent: 0xffd166,       // Pato de goma amarillo
      indestructible: 0x293241,// Borde cerámico
      gelatin: 0xee6c4d       // Jabón resbaladizo
    },
    props: ['patito_goma', 'jabon', 'espuma']
  },
  {
    id: 'cocina',
    name: 'Cocina Gigante',
    desc: 'Mesa de madera rústica, cubiertos colosales y cajas de cereal.',
    skyTop: '#f39a59',
    skyBottom: '#faedcd',
    sunColor: '#ffe8d6',
    waterColor: '#b08968',
    waterOpacity: 0.9,
    waterHeight: 4,
    gravity: 24,
    palette: {
      surface: 0xdda15e,      // Madera de mesa clara
      subsurface: 0xbc6c25,   // Madera oscura
      rock: 0x6c584c,         // Piedra mesón
      accent: 0xd62828,       // Mantel cuadros
      indestructible: 0xadb5bd,// Olla/cuchara metálica
      gelatin: 0x588157       // Gelatina verde de postre
    },
    props: ['taza', 'cuchara_gigante', 'salero']
  },
  {
    id: 'cuarto',
    name: 'Cuarto de Juguetes',
    desc: 'Bloques plásticos de construcción, dados gigantes y vías de tren.',
    skyTop: '#6a0dad',
    skyBottom: '#b5e2fa',
    sunColor: '#fff',
    waterColor: '#3a0ca3',
    waterOpacity: 0.7,
    waterHeight: 4,
    gravity: 24,
    palette: {
      surface: 0x4361ee,      // Bloques azules
      subsurface: 0x3f37c9,   // Base bloques
      rock: 0xf72585,         // Bloques fucsia
      accent: 0x4cc9f0,       // Bloques celestes
      indestructible: 0x14213d,// Bloques negros reforzados
      gelatin: 0x7209b7       // Masilla moldeable
    },
    props: ['dado_gigante', 'bloques_lego', 'carrito']
  },
  {
    id: 'billar',
    name: 'Mesa de Billar',
    desc: 'Paño verde clásico, bandas de madera pulida y bolas pesadas.',
    skyTop: '#1b4332',
    skyBottom: '#2d6a4f',
    sunColor: '#d8f3dc',
    waterColor: '#081c15',
    waterOpacity: 0.95,
    waterHeight: 4,
    gravity: 25,
    palette: {
      surface: 0x40916c,      // Paño de fieltro verde
      subsurface: 0x2d6a4f,   // Madera base
      rock: 0x52b788,         // Tiza de billar
      accent: 0x74c69d,       // Bandas elásticas
      indestructible: 0xd8f3dc,// Bolas de marfil
      gelatin: 0x95d5b2
    },
    props: ['bola_billar', 'tiza_cubo', 'triangulo']
  },
  {
    id: 'castillo',
    name: 'Castillo del Zorro',
    desc: 'Fortaleza del Zorro Rufo, torres de bloques oscuros y banderas moradas.',
    skyTop: '#1a1423',
    skyBottom: '#3d314a',
    sunColor: '#e0aaff',
    waterColor: '#240046',
    waterOpacity: 0.85,
    waterHeight: 4,
    gravity: 24,
    palette: {
      surface: 0x370617,      // Roca volcánica púrpura
      subsurface: 0x6a040f,   // Arcilla oscura
      rock: 0x03071e,         // Piedra de torre
      accent: 0x9d0208,       // Banderas rojas del zorro
      indestructible: 0x4a4e69,// Acero robot remachado
      gelatin: 0xd00000       // Lodo viscoso
    },
    props: ['estandarte_zorro', 'engranaje_lata', 'cofre_dorado']
  }
];

export function getIsland(islandId) {
  if (islandId === 'random') {
    const list = ISLANDS;
    return list[Math.floor(Math.random() * list.length)];
  }
  return ISLANDS.find((i) => i.id === islandId) || ISLANDS[0];
}
