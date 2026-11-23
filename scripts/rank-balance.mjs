/**
 * Calibra los tramos del rango con partidas simuladas de una población mixta de jugadores (habilidad, héroe, reliquia y
 * estilo de elegir cartas), por dificultad. Imprime la distribución de porcentajes y qué tramos darían las
 * frecuencias objetivo.   node scripts/rank-balance.mjs [partidas por camino]
 */
import { simulateRun } from '../src/game/balance.js';
import { hash32, mulberry32 } from '../src/engine/rng.js';
import { maxScoreFor } from '../src/game/rank.js';

const N = Number(process.argv[2] || 3000);
const names = { 1: 'Normal', 50: 'Difícil', 75: 'Experto' };
/** Población: [habilidad, peso]. Casuales abundan; los expertos son pocos. */
const SKILLS = [
  [0.6, 0.25],
  [0.8, 0.35],
  [0.92, 0.28],
  [1, 0.12],
];
const HEROES = ['lia', 'jean', 'van'];
const RELICS = ['sun', 'purse', 'lantern'];
const TARGET = { B: 0.4, A: 0.08, S: 0.005 }; // fracción de partidas que deben alcanzar cada letra o mejor

const pickSkill = (u) => {
  let acc = 0;
  for (const [s, w] of SKILLS) if (u < (acc += w)) return s;
  return SKILLS[SKILLS.length - 1][0];
};
const quantile = (sorted, q) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];

for (const start of [1, 50, 75]) {
  const rng = mulberry32(start * 7919);
  const all = [];
  const bySkill = new Map();
  for (let i = 0; i < N; i++) {
    const skill = pickSkill(rng());
    const r = simulateRun({
      hero: HEROES[Math.floor(rng() * 3)],
      start,
      skill,
      fate: 3,
      pick: rng() < 0.6 ? 'survival' : 'score',
      relic: RELICS[Math.floor(rng() * 3)],
      seed: hash32(i, start, 4242),
    });
    const pct = Math.min(100, (100 * r.score) / maxScoreFor(start));
    all.push(pct);
    (bySkill.get(skill) || bySkill.set(skill, []).get(skill)).push(pct);
  }
  all.sort((a, b) => a - b);
  const th = Object.fromEntries(Object.entries(TARGET).map(([g, f]) => [g, quantile(all, 1 - f)]));
  console.log(`\n${names[start]}  (máx. ${maxScoreFor(start)})  ${N} partidas`);
  console.log(
    `  percentiles  p25 ${quantile(all, 0.25).toFixed(1)} · p50 ${quantile(all, 0.5).toFixed(1)} · p75 ${quantile(all, 0.75).toFixed(1)} · p90 ${quantile(all, 0.9).toFixed(1)} · p99 ${quantile(all, 0.99).toFixed(1)} · máx ${all.at(-1).toFixed(1)}`,
  );
  console.log(
    `  tramos que dan los objetivos (B ${TARGET.B * 100}% · A ${TARGET.A * 100}% · S ${TARGET.S * 100}%) → B ${th.B.toFixed(1)} · A ${th.A.toFixed(1)} · S ${th.S.toFixed(1)}`,
  );
  for (const [skill] of SKILLS) {
    const p = bySkill.get(skill).sort((a, b) => a - b);
    console.log(
      `  habilidad ${skill}: mediana ${quantile(p, 0.5).toFixed(1)} · p90 ${quantile(p, 0.9).toFixed(1)} · p99 ${quantile(p, 0.99).toFixed(1)}`,
    );
  }
}
