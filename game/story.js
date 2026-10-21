// game/story.js - Campaign levels, objectives, dialogues and progression

export const STORY_LEVELS = [
  {
    level: 1,
    title: 'Nivel 1: Arenero del Patio',
    islandId: 'arenero',
    objectiveType: 'eliminate',
    targetCount: 2,
    objectiveDesc: 'Tutorial jugado: Elimina a los 2 pollitos de lata para despejar el arenero.',
    dialogueBefore: [
      { speaker: 'Gallina Abuela', text: '¡Pollitos míos! ¡El malvado Zorro Rufo se robó el Huevo Dorado de la granja!' },
      { speaker: 'J1', text: '¡Ese zorro de peluche nos va a oír! ¿Quiénes son esos del frente?' },
      { speaker: 'Gallina Abuela', text: '¡Son sus pollitos de lata! Apunten con cuidado y tírenles un huevo bazuca para sacarlos del arenero.' },
    ],
    dialogueAfter: [
      { speaker: 'J1', text: '¡Pamplinas de lata! Quedaron como chatarra. ¡Vamos por ese zorro!' },
      { speaker: 'Gallina Abuela', text: 'Rápido, Rufo se metió al baño de la casa.' }
    ]
  },
  {
    level: 2,
    title: 'Nivel 2: Bañera Espumosa',
    islandId: 'banera',
    objectiveType: 'eliminate',
    waterRisesPerRound: true,
    waterRiseAmount: 1,
    objectiveDesc: 'Elimina al escuadrón de hojalata antes de que el agua suba y los ahogue a todos.',
    dialogueBefore: [
      { speaker: 'Zorro Rufo', text: '¡Je, je, je! ¿Creen que unos pollitos de goma pueden detenerme? ¡Abran el grifo, hojalatas!' },
      { speaker: 'J1', text: '¡Cuidado con las plumas, el nivel del agua está subiendo cada ronda!' }
    ],
    dialogueAfter: [
      { speaker: 'J1', text: '¡Por poco nos volvemos sopa! Rufo huyó por el desagüe hacia la cocina.' }
    ]
  },
  {
    level: 3,
    title: 'Nivel 3: Cocina Gigante',
    islandId: 'cocina',
    objectiveType: 'collect_eggs',
    targetCount: 3,
    maxRounds: 8,
    objectiveDesc: 'Recoge los 3 Huevitos especiales dispersos en la mesa antes de 8 rondas.',
    dialogueBefore: [
      { speaker: 'Gallina Abuela', text: '¡Veo tres huevitos de juguete que se le cayeron al zorro! ¡Recójanlos antes de que los rompa!' },
      { speaker: 'J1', text: '¡A saltar entre las tazas y ollas!' }
    ],
    dialogueAfter: [
      { speaker: 'J1', text: '¡Recuperamos los huevitos! Ahora al cuarto de juegos, allí montó su base.' }
    ]
  },
  {
    level: 4,
    title: 'Nivel 4: Cuarto de Juguetes',
    islandId: 'cuarto',
    objectiveType: 'protect_vip',
    objectiveDesc: 'Protege a la Gallina Abuela. ¡Si ella cae, se pierde la misión!',
    dialogueBefore: [
      { speaker: 'Gallina Abuela', text: '¡Ay mis patitas reumáticas! No puedo correr rápido, ¡protéjanme, polluelos!' },
      { speaker: 'Zorro Rufo', text: '¡Ataquen a la abuelita emplumada, mis esbirros de cuerda!' }
    ],
    dialogueAfter: [
      { speaker: 'Gallina Abuela', text: '¡Bien hecho, mis valientes! ¡Ese susto me quitó diez años de encima!' }
    ]
  },
  {
    level: 5,
    title: 'Nivel 5: Mesa de Billar',
    islandId: 'billar',
    objectiveType: 'destroy_targets',
    targetCount: 4,
    objectiveDesc: 'Destruye las 4 torres de transmisión de lata con munición calculada.',
    dialogueBefore: [
      { speaker: 'J1', text: 'Miren esas antenas de lata sobre el paño verde. ¡Están bloqueando nuestras señales de radio!' }
    ],
    dialogueAfter: [
      { speaker: 'Zorro Rufo', text: '¡Maldición! ¡Sargento Lata, encárgate de estas aves chillonas!' }
    ]
  },
  {
    level: 6,
    title: 'Nivel 6: El Jardín de Noche',
    islandId: 'arenero',
    objectiveType: 'boss_sargento',
    objectiveDesc: 'Jefe: Sargento Lata. Su blindaje frontal es impenetrable; ¡ataca por la espalda o tómalo con dinamita!',
    dialogueBefore: [
      { speaker: 'Sargento Lata', text: '¡BEEP BOOP! ¡ALTO AHÍ, PLUMÍFEROS! ¡SOY EL SARGENTO LATA Y MI BLINDAJE ES INDESTRUCTIBLE!' },
      { speaker: 'J1', text: '¡Tiene una batería descubierta en la espalda! ¡A rodearlo!' }
    ],
    dialogueAfter: [
      { speaker: 'Sargento Lata', text: '¡CIRCUITO... SOBRECALENTADO... BZZZT...!' },
      { speaker: 'J1', text: '¡Cayó el gigante! Solo queda el castillo del zorro en el ático.' }
    ]
  },
  {
    level: 7,
    title: 'Nivel 7: Ático Polvoriento',
    islandId: 'castillo',
    objectiveType: 'survive_rounds',
    targetCount: 6,
    objectiveDesc: 'Supervivencia: Resiste 6 rondas completas contra el asedio de pollitos de lata.',
    dialogueBefore: [
      { speaker: 'Zorro Rufo', text: '¡Nunca saldrán vivos del ático! ¡Que salgan todas las reservas!' }
    ],
    dialogueAfter: [
      { speaker: 'J1', text: '¡Despejado! Las puertas de la fortaleza están abiertas. ¡Hora de recuperar el Huevo Dorado!' }
    ]
  },
  {
    level: 8,
    title: 'Nivel 8: Castillo del Zorro (Final)',
    islandId: 'castillo',
    objectiveType: 'boss_rufo',
    objectiveDesc: 'Final: Derrota al Zorro Rufo en su Mecha de Juguete y recupera el Huevo Dorado.',
    dialogueBefore: [
      { speaker: 'Zorro Rufo', text: '¡Admiro su terquedad, pollos! ¡Pero mi Mecha de Juguete tiene el poder del Huevo Dorado!' },
      { speaker: 'Gallina Abuela', text: '¡Pollitos, usen todo lo que tengan: granadas, la chancla y el Huevo de Oro!' }
    ],
    dialogueAfter: [
      { speaker: 'Zorro Rufo', text: '¡NOOO! ¡Mi hermoso mecha! ¡Se me cayó el monóculo!' },
      { speaker: 'J1', text: '¡El Huevo Dorado está a salvo! ¡El gallinero está de fiesta!' },
      { speaker: 'Gallina Abuela', text: '¡Son unos héroes de verdad! ¡A celebrar con maíz tostado para todos!' }
    ]
  }
];

export function getStoryLevel(lvlNumber) {
  const num = parseInt(lvlNumber, 10) || 1;
  return STORY_LEVELS.find((l) => l.level === num) || STORY_LEVELS[0];
}
