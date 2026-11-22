/**
 * Lo que hay que hacer para desbloquear cada objeto de Personalizar: lista de condiciones [estadística, meta] que deben
 * cumplirse TODAS. GENERADO por scripts/plan-unlocks.mjs a partir del modelo de progresión (scripts/lib/unlock-model.mjs);
 * explicado en docs/desbloqueos.md. Se puede retocar a mano, pero conviene volver a pasar scripts/analyze-unlocks.mjs.
 */
export const PLAN = {
  board: {
    slate: [['boardsSolved', 20]],
    amber: [['dailySolved', 4]],
    jade: [['challengeBoards', 6]],
    moss: [['maxLevel', 7]],
    sand: [['bestStreak', 3]],
    rose: [['perfects', 10]],
    steel: [['dailySolved', 6]],
    marble: [['challengeBest', 5]],
    sapphire: [['completed', 1]],
    ivory: [['dailyGold', 4]],
    copper: [['boardsSolved', 95]],
    reef: [['bestStreak', 6]],
    lavender: [['challengeBoards', 14]],
    forest: [['hardLevel', 8]],
    bronze: [['dailyGold', 9]],
    crimson: [
      ['expertLevel', 4],
      ['dailySolved', 29],
    ],
    obsidian: [
      ['hardLevel', 18],
      ['challengeBest', 6],
    ],
    tide: [
      ['perfects', 80],
      ['bestStreak', 14],
    ],
    sakura: [
      ['expertLevel', 9],
      ['challengeBoards', 35],
    ],
    storm: [
      ['completed', 6],
      ['dailyGold', 16],
    ],
    lava: [
      ['boardsSolved', 450],
      ['challengeBest', 10],
    ],
    glacier: [
      ['perfects', 130],
      ['dailySolved', 55],
    ],
    neon: [
      ['expertLevel', 20],
      ['challengeBoards', 50],
    ],
    toxic: [
      ['completed', 10],
      ['bestStreak', 27],
    ],
    celestial: [
      ['expertDone', 1],
      ['challengeWonCount', 2],
      ['bestStreak', 30],
    ],
    dawnfire: [
      ['fateSeenCount', 28],
      ['challengeWonCount', 3],
      ['dailyGold', 40],
    ],
    nebula: [
      ['completed', 20],
      ['challengeBest', 14],
      ['dailyGold', 60],
    ],
    eclipse: [
      ['perfects', 450],
      ['challengeBest', 12],
      ['masterSolved', 40],
    ],
    prism: [
      ['bestGrade', 5],
      ['challengeWonCount', 3],
      ['bestStreak', 21],
    ],
  },
  pieces: {
    stone: [['bestRunStreak', 7]],
    glass: [['dailySolved', 4]],
    clay: [['challengeBoards', 6]],
    candy: [['perfects', 10]],
    bamboo: [['bestStreak', 3]],
    night: [['iceRock', 10]],
    ceramic: [['dailyGold', 3]],
    brass: [['challengeBest', 5]],
    marble: [['locks', 10]],
    jelly: [['dailySolved', 13]],
    copper: [['heavyBoards', 11]],
    silk: [['dailyGold', 6]],
    pearl: [['challengeBoards', 15]],
    tide: [['cleanCity', 10]],
    volt: [['bestStreak', 10]],
    runic: [
      ['powersUsed', 140],
      ['dailySolved', 29],
    ],
    lacquer: [
      ['iceRock', 45],
      ['challengeBest', 6],
    ],
    oldgold: [
      ['locks', 40],
      ['dailyGold', 13],
    ],
    frostedge: [
      ['heavyBoards', 45],
      ['challengeBoards', 35],
    ],
    neon: [
      ['perfects', 100],
      ['bestStreak', 17],
    ],
    aurora: [
      ['cleanCity', 25],
      ['challengeBest', 10],
    ],
    plasma: [
      ['powersUsed', 280],
      ['dailySolved', 55],
    ],
    holo: [
      ['iceRock', 90],
      ['challengeBoards', 50],
    ],
    lava: [
      ['locks', 85],
      ['dailyGold', 25],
    ],
    ember: [
      ['expertDone', 1],
      ['challengeWonCount', 2],
      ['bestStreak', 30],
    ],
    galaxia: [
      ['fateSeenCount', 28],
      ['challengeWonCount', 3],
      ['dailyGold', 40],
    ],
    solar: [
      ['completed', 20],
      ['challengeBest', 14],
      ['dailyGold', 60],
    ],
    prisma: [
      ['perfects', 450],
      ['challengeBest', 12],
      ['masterSolved', 40],
    ],
    abismo: [
      ['bestGrade', 5],
      ['challengeWonCount', 3],
      ['bestStreak', 21],
    ],
  },
  key: {
    amber: [['boardsSolved', 20]],
    iron: [['dailySolved', 4]],
    rose: [['challengeBoards', 6]],
    jade: [['boardsSolved', 22]],
    copper: [['bestStreak', 3]],
    lilac: [['perfects', 10]],
    bone: [['dailyKinds', 2]],
    emerald: [['challengeBest', 5]],
    sapphire: [['fateCards', 6]],
    crystal: [['dailyGold', 3]],
    moon: [['pacts', 2]],
    ocean: [['dailySolved', 14]],
    topaz: [['challengeBoards', 13]],
    ruby: [['completed', 2]],
    frost: [['masterSolved', 4]],
    forest: [['pacts', 5]],
    obsidian: [
      ['fateCards', 27],
      ['bestStreak', 11],
    ],
    star: [
      ['completed', 4],
      ['challengeBest', 6],
    ],
    phoenix: [
      ['perfects', 85],
      ['dailyGold', 13],
    ],
    storm: [
      ['pacts', 10],
      ['challengeBoards', 35],
    ],
    toxic: [
      ['fateCards', 45],
      ['masterSolved', 15],
    ],
    aurora: [
      ['completed', 8],
      ['challengeBest', 10],
    ],
    magma: [
      ['perfects', 140],
      ['dailySolved', 65],
    ],
    neon: [
      ['boardsSolved', 625],
      ['challengeBoards', 60],
    ],
    gold: [
      ['expertDone', 1],
      ['challengeWonCount', 2],
      ['bestStreak', 30],
    ],
    eclipse: [
      ['fateSeenCount', 28],
      ['challengeWonCount', 3],
      ['dailyGold', 40],
    ],
    galaxy: [
      ['completed', 20],
      ['challengeBest', 14],
      ['dailyGold', 60],
    ],
    dragon: [
      ['perfects', 450],
      ['challengeBest', 12],
      ['masterSolved', 40],
    ],
    chrono: [
      ['bestGrade', 5],
      ['challengeWonCount', 3],
      ['bestStreak', 21],
    ],
  },
  card: {
    pergamino: [['bestRunStreak', 7]],
    pizarra: [['dailySolved', 4]],
    bosque: [['challengeBoards', 6]],
    cuaderno: [['powersUsed', 20]],
    piedra: [['bestStreak', 3]],
    bronce: [['fateCards', 6]],
    cristal: [['dailyGold', 3]],
    zafiro: [['challengeBest', 5]],
    lacre: [['pacts', 3]],
    jade: [['dailySolved', 20]],
    ticket: [['cleanCity', 11]],
    neon: [
      ['fateSeenCount', 14],
      ['dailyGold', 10],
    ],
    forja: [
      ['fateCards', 35],
      ['challengeBoards', 30],
    ],
    hielo: [
      ['pacts', 12],
      ['bestStreak', 20],
    ],
    circuito: [
      ['cleanCity', 35],
      ['challengeBest', 14],
    ],
    aurora: [
      ['expertDone', 1],
      ['challengeWonCount', 2],
      ['bestStreak', 30],
    ],
    galaxia: [
      ['fateSeenCount', 28],
      ['challengeWonCount', 3],
      ['dailyGold', 40],
    ],
    dragon: [
      ['completed', 20],
      ['challengeBest', 14],
      ['dailyGold', 60],
    ],
    eclipse: [
      ['perfects', 450],
      ['challengeBest', 12],
      ['masterSolved', 40],
    ],
  },
  music: {
    z0: [['maxLevel', 6]],
    z1: [['dailySolved', 4]],
    z2: [['challengeBoards', 6]],
    z4: [['boardsSolved', 45]],
    z3: [['bestStreak', 3]],
    heroes: [['fateCards', 6]],
    z5: [['dailyGold', 4]],
    s0: [['challengeBest', 5]],
    l0: [['completed', 1]],
    l2: [['dailySolved', 18]],
    l3: [['hardLevel', 8]],
    v0: [['bestStreak', 10]],
    s1: [
      ['expertLevel', 4],
      ['dailyGold', 10],
    ],
    fate: [
      ['boardsSolved', 400],
      ['challengeBoards', 35],
    ],
    v1: [
      ['fateCards', 70],
      ['dailySolved', 70],
    ],
    z6: [
      ['expertDone', 1],
      ['challengeWonCount', 2],
      ['bestStreak', 30],
    ],
    s2: [
      ['fateSeenCount', 28],
      ['challengeWonCount', 3],
      ['dailyGold', 40],
    ],
    l6: [
      ['completed', 20],
      ['challengeBest', 14],
      ['dailyGold', 60],
    ],
    v6: [
      ['perfects', 450],
      ['challengeBest', 12],
      ['masterSolved', 40],
    ],
  },
  cover: {
    'vapor-dorado': [['boardsSolved', 20]],
    descanso: [['dailySolved', 4]],
    mapa: [['challengeBoards', 6]],
    lia: [['powersUsed', 30]],
    van: [['dailyGold', 3]],
    jean: [['completed', 1]],
    'magia-tiempo': [['bestStreak', 8]],
    'magia-engranajes': [['challengeBest', 5]],
    battle: [
      ['hardLevel', 15],
      ['dailyGold', 10],
    ],
    'neon-cibernetico': [
      ['perfects', 75],
      ['challengeBoards', 27],
    ],
    'magia-digital': [
      ['expertLevel', 8],
      ['dailySolved', 40],
    ],
    'combate-arcano': [
      ['completed', 6],
      ['challengeBest', 8],
    ],
    'combate-vapor': [
      ['powersUsed', 260],
      ['bestStreak', 20],
    ],
    pelea: [
      ['boardsSolved', 550],
      ['challengeBoards', 50],
    ],
    'combate-neon': [
      ['perfects', 160],
      ['dailyGold', 25],
    ],
    victory: [
      ['expertDone', 1],
      ['challengeWonCount', 2],
      ['bestStreak', 30],
    ],
    'noche-carmesi': [
      ['fateSeenCount', 28],
      ['challengeWonCount', 3],
      ['dailyGold', 40],
    ],
    'magia-sangre': [
      ['bestGrade', 5],
      ['challengeBest', 14],
      ['masterSolved', 40],
    ],
    'combate-sombras': [
      ['completed', 20],
      ['challengeBest', 12],
      ['dailyGold', 60],
    ],
    oro: [
      ['perfects', 450],
      ['challengeWonCount', 3],
      ['bestStreak', 21],
    ],
    tormenta: [
      ['paths', 3],
      ['challengeWonCount', 3],
      ['bestStreak', 14],
    ],
  },
  bg: {
    mirador: [['maxLevel', 6]],
    muralla: [['dailySolved', 4]],
    'puente-otono': [['challengeBoards', 6]],
    'ciudad-blanca': [['boardsSolved', 55]],
    'ciudad-linternas': [['dailyGold', 4]],
    'fortaleza-lunar': [['hardLevel', 5]],
    'ciudad-flotante': [['bestStreak', 10]],
    'castillo-rojo': [
      ['perfects', 65],
      ['dailySolved', 29],
    ],
    'calle-cerezos': [
      ['expertLevel', 8],
      ['challengeBest', 7],
    ],
    'torii-gigante': [
      ['completed', 7],
      ['dailyGold', 18],
    ],
    'puente-dragon': [
      ['boardsSolved', 625],
      ['challengeBest', 14],
    ],
    'neon-luna': [
      ['expertDone', 1],
      ['challengeWonCount', 2],
      ['bestStreak', 30],
    ],
    'plaza-neon': [
      ['fateSeenCount', 28],
      ['challengeWonCount', 3],
      ['dailyGold', 40],
    ],
    'coloso-neon': [
      ['completed', 20],
      ['challengeBest', 14],
      ['dailyGold', 60],
    ],
    'santuario-carmesi': [
      ['perfects', 450],
      ['challengeBest', 12],
      ['masterSolved', 40],
    ],
  },
  trail: {
    dust: [['boardsSolved', 20]],
    embers: [['dailySolved', 4]],
    leaves: [['challengeBoards', 6]],
    petals: [['perfects', 12]],
    bubbles: [['dailyGold', 3]],
    ink: [['iceRock', 10]],
    frost: [['bestStreak', 7]],
    sparks: [['challengeBest', 5]],
    lightning: [
      ['powersUsed', 140],
      ['dailySolved', 29],
    ],
    rainbow: [
      ['heavyBoards', 50],
      ['challengeBoards', 35],
    ],
    starlight: [
      ['locks', 85],
      ['dailyGold', 25],
    ],
    comet: [
      ['expertDone', 1],
      ['challengeWonCount', 2],
      ['bestStreak', 30],
    ],
    phoenix: [
      ['completed', 20],
      ['challengeWonCount', 3],
      ['dailyGold', 60],
    ],
    eclipse: [
      ['perfects', 450],
      ['challengeBest', 14],
      ['dailyGold', 40],
    ],
  },
  fx: {
    embers: [['boardsSolved', 20]],
    sparks: [['dailySolved', 4]],
    petals: [['challengeBoards', 6]],
    leaves: [['perfects', 12]],
    ink: [['dailyGold', 3]],
    frost: [['bestRunStreak', 10]],
    stars: [['bestStreak', 6]],
    confetti: [['challengeBest', 5]],
    coins: [['cleanCity', 11]],
    aurora: [
      ['completed', 4],
      ['dailyGold', 10],
    ],
    prism: [
      ['perfects', 100],
      ['challengeBest', 8],
    ],
    lightning: [
      ['boardsSolved', 625],
      ['dailySolved', 70],
    ],
    phoenix: [
      ['expertDone', 1],
      ['challengeWonCount', 2],
      ['bestStreak', 30],
    ],
    fireworks: [
      ['perfects', 450],
      ['challengeWonCount', 3],
      ['dailyGold', 60],
    ],
  },
  aura: {
    fireflies: [['maxLevel', 6]],
    mist: [['dailySolved', 4]],
    sunmotes: [['challengeBoards', 6]],
    drizzle: [['boardsSolved', 55]],
    leaves: [['bestStreak', 6]],
    petals: [['fateCards', 21]],
    snow: [
      ['hardLevel', 15],
      ['dailyGold', 10],
    ],
    ash: [
      ['expertLevel', 11],
      ['challengeBest', 8],
    ],
    meteors: [
      ['completed', 10],
      ['bestStreak', 27],
    ],
    storm: [
      ['expertDone', 1],
      ['challengeWonCount', 2],
      ['bestStreak', 30],
    ],
    aurora: [
      ['perfects', 450],
      ['challengeWonCount', 3],
      ['dailyGold', 60],
    ],
  },
  ui: {
    thyes: [['maxLevel', 6]],
    jade: [['bestStreak', 3]],
    crimson: [['challengeBest', 5]],
    glacier: [['completed', 3]],
    faro: [
      ['powersUsed', 140],
      ['dailySolved', 29],
    ],
    neon: [
      ['fateSeenCount', 24],
      ['challengeBoards', 60],
    ],
    eclipse: [
      ['completed', 20],
      ['challengeWonCount', 3],
      ['dailyGold', 60],
    ],
  },
  outfit: {
    'lia:aviadora': [['heroBoardsLia', 16]],
    'lia:arquera': [['heroBoardsLia', 20]],
    'lia:cartografa': [['heroBoardsLia', 25]],
    'lia:alquimista': [['heroWinLia', 1]],
    'lia:buscatesoros': [['heroBoardsLia', 30]],
    'lia:ingeniera': [['heroBoardsLia', 55]],
    'lia:mecanica': [['heroBoardsLia', 75]],
    'lia:piloto': [
      ['heroBoardsLia', 100],
      ['dailySolved', 29],
    ],
    'lia:neon': [
      ['heroBoardsLia', 160],
      ['challengeBest', 8],
    ],
    'lia:violeta': [
      ['heroBoardsLia', 240],
      ['bestStreak', 27],
    ],
    'lia:brasas': [
      ['heroBoardsLia', 283],
      ['challengeWonCount', 2],
      ['bestStreak', 30],
    ],
    'lia:vampira': [
      ['heroBoardsLia', 425],
      ['challengeWonCount', 3],
      ['dailyGold', 40],
    ],
    'lia:lunar': [
      ['heroBoardsLia', 525],
      ['challengeBest', 14],
      ['dailyGold', 60],
    ],
    'lia:guerrera': [
      ['heroBoardsLia', 600],
      ['challengeBest', 12],
      ['masterSolved', 40],
    ],
    'jean:aviador': [['heroBoardsJean', 16]],
    'jean:nomada': [['heroBoardsJean', 20]],
    'jean:astronomo': [['heroBoardsJean', 25]],
    'jean:relojero': [['heroWinJean', 1]],
    'jean:erudito': [['heroBoardsJean', 30]],
    'jean:arqueologo': [['heroBoardsJean', 55]],
    'jean:principe': [['heroBoardsJean', 75]],
    'jean:centurion': [
      ['heroBoardsJean', 100],
      ['dailySolved', 29],
    ],
    'jean:astrologo': [
      ['heroBoardsJean', 140],
      ['challengeBest', 7],
    ],
    'jean:sakura': [
      ['heroBoardsJean', 180],
      ['bestStreak', 20],
    ],
    'jean:cibernetico': [
      ['heroBoardsJean', 250],
      ['challengeBoards', 60],
    ],
    'jean:oni': [
      ['heroBoardsJean', 295],
      ['challengeWonCount', 2],
      ['bestStreak', 30],
    ],
    'jean:violeta': [
      ['heroBoardsJean', 525],
      ['challengeWonCount', 3],
      ['dailyGold', 60],
    ],
    'jean:shogun': [
      ['heroBoardsJean', 600],
      ['challengeBest', 14],
      ['dailyGold', 40],
    ],
    'van:navegante': [['heroBoardsVan', 16]],
    'van:maga': [['heroBoardsVan', 20]],
    'van:boticaria': [['heroBoardsVan', 25]],
    'van:oraculo': [['heroWinVan', 1]],
    'van:carmesi': [['heroBoardsVan', 30]],
    'van:astral': [['heroBoardsVan', 55]],
    'van:verde': [['heroBoardsVan', 75]],
    'van:cuervo': [
      ['heroBoardsVan', 100],
      ['dailySolved', 29],
    ],
    'van:dama': [
      ['heroBoardsVan', 140],
      ['challengeBest', 7],
    ],
    'van:cuervera': [
      ['heroBoardsVan', 180],
      ['bestStreak', 20],
    ],
    'van:guardiana': [
      ['heroBoardsVan', 250],
      ['challengeBoards', 60],
    ],
    'van:necromante': [
      ['heroBoardsVan', 295],
      ['challengeWonCount', 2],
      ['bestStreak', 30],
    ],
    'van:espinas': [
      ['heroBoardsVan', 525],
      ['challengeWonCount', 3],
      ['dailyGold', 60],
    ],
    'van:cuervos': [
      ['heroBoardsVan', 600],
      ['challengeBest', 14],
      ['dailyGold', 40],
    ],
  },
};
