// game/voices.js - Colombian Spanish chicken quotes and voice synthesizers

export const CHICKEN_QUOTES = {
  turnStart: [
    '¡Pío pío, a la carga!',
    '¡Dejen ver qué saco de la cajita!',
    '¡Pilas que voy con toda!',
    '¡A darle a esos desplumados!',
    '¡Qué elegancia de tiro voy a meter!',
    '¡Aquí llegó su gallo fino!'
  ],
  hurt: [
    '¡Ay, mi plumaje!',
    '¡Esa no la vi venir!',
    '¡Casi me sacan el relleno!',
    '¡Ojo con la puntería, parce!',
    '¡Uy, qué totazo!'
  ],
  drown: [
    '¡Chao, pescao!',
    '¡Glu glu glu!',
    '¡Me fui de pico al agua!',
    '¡Hasta la vista, corral!'
  ],
  fall: [
    '¡Upa!',
    '¡Aterrizaje de barriga!',
    '¡Se me descalabraron las patitas!'
  ],
  chancla: [
    '¡Venga para acá, mijo!',
    '¡Por desobediente!',
    '¡La bendición y para afuera!'
  ],
  huevoOro: [
    '¡Gloria en las alturas del gallinero!',
    '¡Que caiga el poder sagrado!'
  ],
  victory: [
    '¡Somos los reyes del corral!',
    '¡A comer maíz pira con gaseosa!',
    '¡Cacareo de victoria supremo!'
  ],
  defeat: [
    '¡Quedamos para sancocho!',
    '¡Nos desplumaron completitos!'
  ]
};

export function getRandomQuote(category) {
  const list = CHICKEN_QUOTES[category] || CHICKEN_QUOTES.turnStart;
  return list[Math.floor(Math.random() * list.length)];
}

// Synthesizes expressive procedural chirps/clucks using Web Audio API
export function playSynthesizedChirp(audioCtx, pitchFactor = 1.0, type = 'cluck') {
  if (!audioCtx) return;

  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  if (type === 'cluck') {
    // Sharp squeaky cluck
    const baseFreq = 480 * pitchFactor;
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.8, now + 0.06);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.9, now + 0.15);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc.start(now);
    osc.stop(now + 0.16);
  } else if (type === 'hurt') {
    // High-pitched distress squeak
    const baseFreq = 700 * pitchFactor;
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 2.2, now + 0.05);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.5, now + 0.25);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);

    osc.start(now);
    osc.stop(now + 0.26);
  } else if (type === 'drown') {
    // Descending bubble wobble
    const baseFreq = 380 * pitchFactor;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.4);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.start(now);
    osc.stop(now + 0.4);
  }
}
