/**
 * Probabilidad de completar el Desafío diario (13 = racha, 14 = plata, 15 = oro), comparando las reglas anteriores y las actuales según la habilidad del jugador,
 * con el modelo de errores de src/game/balance.js. De aquí salen las curvas de retos diarios de scripts/lib/unlock-model.mjs.
 *   node scripts/simulate-challenge.mjs [partidas]
 */
import { challengeRates } from '../src/game/balance.js';

const runs = Number(process.argv[2] || 4000);
const pct = (x) => `${(x * 100).toFixed(1).padStart(5)} %`;
const RULES = [
  ['reglas anteriores (150 turnos, sin Rehacer)', { budget: 150, redo: false }],
  ['reglas actuales (152 turnos + Rehacer con tope)', {}],
];
for (const [name, rules] of RULES) {
  console.log(`\n${name}`);
  console.log('habilidad |  ≥13 tableros |   ≥14 |   15 (oro)');
  for (const skill of [0.7, 0.8, 0.85, 0.9, 0.95, 0.98]) {
    const r = challengeRates(skill, runs, rules);
    console.log(`  ${skill.toFixed(2)}    |  ${pct(r[13])}      | ${pct(r[14])} | ${pct(r[15])}`);
  }
}
