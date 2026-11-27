/**
 * Probabilidad de completar el Desafío diario (13 = plata y racha, 14, 15 = oro) según la habilidad del jugador,
 * con el modelo de errores de src/game/balance.js. De aquí salen las curvas de retos diarios de scripts/lib/unlock-model.mjs.
 *   node scripts/simulate-challenge.mjs [partidas]
 */
import { challengeRates } from '../src/game/balance.js';

const runs = Number(process.argv[2] || 4000);
console.log('habilidad |  ≥13 tableros |   ≥14 |   15 (oro)');
for (const skill of [0.7, 0.8, 0.85, 0.9, 0.95, 0.98]) {
  const r = challengeRates(skill, runs);
  const pct = (x) => `${(x * 100).toFixed(1).padStart(5)} %`;
  console.log(`  ${skill.toFixed(2)}    |  ${pct(r[13])}      | ${pct(r[14])} | ${pct(r[15])}`);
}
