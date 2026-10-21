// Frases cortas de los pollitos (se muestran en globito y suenan como chillido)

const QUOTES = {
  turn: ['¡Mi turno, pío!', '¡A desplumar!', '¡Ya verán!', '¿Quién quiere huevo?', '¡Agárrense las plumas!', '¡Vamos, gallada!', '¡Pío pío, toma esto!', '¡Esto se va a poner crocante!'],
  fire: ['¡Toma esto!', '¡Ahí te va!', '¡Fuego!', '¡Pa\' que aprenda!', '¡Huevazo!', '¡Plumazo va!'],
  hurt: ['¡Ay, mi plumaje!', '¡Upa!', '¡Esa no la vi venir!', '¡Auch, pío!', '¡Me dolió!', '¡Ay, juepucha!', '¡Mis plumitas!'],
  dead: ['¡Me voy de pico!', '¡Adiós, mundo cruel!', '¡Me frieron!', '¡Quedé como nugget!'],
  drown: ['¡Chao, pescao!', '¡No sé nadar!', '¡Glu glu glu!', '¡Me mojé las plumas!'],
  gallina: ['¡Ve, mamá gallina!'],
  chancla: ['¡Venga para acá, mijo!'],
  win: ['¡Somos los más crocantes!', '¡Ganamos, pío!', '¡Pollo frito para todos!'],
  cpu: ['Calculando trayectoria...', 'Bip bup. Objetivo fijado.', 'Error 404: piedad no encontrada.', 'Recargando tuercas.'],
};

export function quote(kind) {
  const list = QUOTES[kind] || QUOTES.turn;
  return list[Math.floor(Math.random() * list.length)];
}
