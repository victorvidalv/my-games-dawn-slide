/**
 * Modelo de progresión de los desbloqueos de Personalizar. Un jugador «regular» (15-20 minutos al día, casi todos los días)
 * avanza así en cada acción del juego; los otros dos perfiles son versiones más lentas y más rápidas del mismo.
 * Sirve para dos cosas: repartir metas escalonadas (scripts/plan-unlocks.mjs) y comprobar cuándo llega cada objeto
 * (scripts/analyze-unlocks.mjs). Cámbialo aquí si el ritmo real de los jugadores resulta distinto.
 */

/** Valor acumulado de cada acción al cabo de `d` días para el jugador regular. */
export const REGULAR = {
  // Se acumulan con el uso (≈ ritmo por día)
  boardsSolved: (d) => 9 * d, // ~40 tableros por hora de juego
  perfects: (d) => 2.3 * d, // ~1 de cada 4 en el mínimo de movimientos
  iceRock: (d) => 1.5 * Math.max(0, d - 3), // rocas y hielo aparecen tras los primeros niveles
  locks: (d) => 1.3 * Math.max(0, d - 4),
  heavyBoards: (d) => 1.3 * Math.max(0, d - 4),
  powersUsed: (d) => 5 * d,
  fateCards: (d) => 1.0 * Math.max(0, d - 1), // 6 cartas por aventura
  pacts: (d) => 0.25 * Math.max(0, d - 2),
  cleanCity: (d) => 0.5 * d,
  dailySolved: (d) => 1.2 * d,
  dailyGold: (d) => 0.42 * d,
  challengeBoards: (d) => 1.0 * Math.max(0, d - 1), // el Desafío está abierto desde el principio
  completed: (d) => 0.16 * Math.max(0, d - 5), // una aventura entera dura ~40 min
  heroBoardsLia: (d) => 4 * d, // reparte su juego entre los tres héroes
  heroBoardsJean: (d) => 4 * d,
  heroBoardsVan: (d) => 4 * d,
  // Niveles (se alcanzan y se estancan)
  maxLevel: (d) => Math.min(21, 2 + 1.9 * d),
  hardLevel: (d) => Math.min(21, Math.max(0, 0.75 * (d - 8))),
  expertLevel: (d) => Math.min(21, Math.max(0, 0.5 * (d - 22))),
  challengeBest: (d) => Math.min(14, Math.max(0, 0.25 * (d - 4))),
  bestRunStreak: (d) => Math.min(21, 3 + 0.9 * d),
  bestStreak: (d) => Math.floor(1 + 0.45 * d), // días seguidos: casi siempre vuelve cada día
  dailyKinds: (d) => (d < 4.2 ? 1 : d < 5.8 ? 2 : d < 8.4 ? 3 : d < 10 ? 4 : 5), // cada reto se abre al llegar a un nivel
  masterSolved: (d) => 0.5 * Math.max(0, d - 10),
  fateSeenCount: (d) => 31 * (1 - Math.exp(-d / 45)), // cartas distintas vistas (31 en total)
  // Hitos (0/1 o escalones): el día en que llegan
  bestGrade: (d) => (d < 8 ? 2 : d < 30 ? 3 : d < 110 ? 4 : 5), // rango: 3 = A, 4 = S, 5 = S+
  heroes: (d) => (d < 2 ? 1 : d < 6 ? 2 : 3),
  heroWinLia: (d) => (d >= 6 ? 1 : 0),
  heroWinJean: (d) => (d >= 14 ? 1 : 0),
  heroWinVan: (d) => (d >= 22 ? 1 : 0),
  heroWinsCount: (d) => (d >= 22 ? 3 : d >= 14 ? 2 : d >= 6 ? 1 : 0),
  hardDone: (d) => (d >= 36 ? 1 : 0),
  expertDone: (d) => (d >= 64 ? 1 : 0),
  paths: (d) => (d >= 64 ? 3 : d >= 36 ? 2 : d >= 10 ? 1 : 0),
  challengeWonCount: (d) => (d >= 120 ? 3 : d >= 70 ? 2 : d >= 35 ? 1 : 0),
  maxPactsWin: (d) => (d >= 60 ? 3 : d >= 30 ? 2 : d >= 12 ? 1 : 0),
  cleanRun: (d) => (d >= 45 ? 1 : 0),
  oathWin: (d) => (d >= 80 ? 1 : 0),
};

/** Perfiles: ritmo relativo y escala del tiempo (un jugador 2× más intenso tarda ≈ 1/1,9 en llegar a lo mismo). */
export const PERSONAS = {
  casual: { label: 'Casual (≈ 8 min/día)', k: 0.45 },
  regular: { label: 'Regular (≈ 17 min/día)', k: 1 },
  dedicado: { label: 'Dedicado (≈ 40 min/día)', k: 2.3 },
};
const SKEW = 0.85;
export const scaleDays = (regularDay, k) => regularDay / k ** SKEW;

/** Primer día (jugador regular) en que `stat` llega a `goal`; Infinity si nunca (p. ej. por encima del tope). */
export function dayToReach(stat, goal) {
  const f = REGULAR[stat];
  if (!f) throw new Error(`estadística sin curva: ${stat}`);
  if (f(0) >= goal) return 0;
  if (f(1200) < goal) return Infinity;
  let lo = 0,
    hi = 1200;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (f(mid) >= goal) hi = mid;
    else lo = mid;
  }
  return hi;
}

/** Meta «bonita» (números redondos) para un valor aproximado. */
export function nice(n) {
  if (n < 12) return Math.max(1, Math.round(n));
  if (n < 30) return Math.round(n);
  if (n < 100) return Math.round(n / 5) * 5;
  if (n < 300) return Math.round(n / 10) * 10;
  if (n < 1000) return Math.round(n / 25) * 25;
  return Math.round(n / 100) * 100;
}

/** A qué modo del juego pertenece cada acción: Aventura, Desafío o Retos diarios (rachas incluidas). */
export const MODE = {
  challengeBoards: 'desafio',
  challengeBest: 'desafio',
  challengeWonCount: 'desafio',
  dailySolved: 'diario',
  dailyGold: 'diario',
  bestStreak: 'diario',
  dailyKinds: 'diario',
  masterSolved: 'diario',
};
export const modeOf = (stat) => MODE[stat] || 'aventura';
