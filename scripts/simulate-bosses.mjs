/**
 * Segundo simulador: jefes, contrarreloj y piezas especiales (modelo en src/game/boss-balance.js).
 *   npm run simulate:bosses [partidas por celda]
 */
import {
  BOSS_LEVELS,
  BOSS_TARGET,
  FAMILY_HARD,
  HUMAN,
  REP_SKILL,
  bossBoardLength,
  bossReport,
  bossWinRate,
  calibrateBoss,
  secondsPerMove,
} from '../src/game/boss-balance.js';
import { BOSS_RULES, bossTimeFor } from '../src/game/bosses.js';
import { levelPlan } from '../src/game/mechanics.js';
import { PATHS, SKILLS } from '../src/game/balance.js';

const runs = Number(process.argv[2] || 400);
const names = { 1: 'Normal', 50: 'Difícil', 75: 'Experto' };
const pct = (x) => `${Math.round(x * 100)}`.padStart(3);

console.log(
  `Segundo simulador · jefes (${runs} duelos por celda). Se gana llegando a la salida dentro del límite de turnos y, si lo hay, del tiempo.\n`,
);
console.log('Regla de cada jefe →');
for (const l of BOSS_LEVELS) {
  const r = BOSS_RULES[l];
  const d = bossBoardLength(l, 1);
  console.log(
    `  ${String(l).padStart(3)}  ${levelPlan(l).family.padEnd(8)} ${r.kind.padEnd(5)} tope ${r.cap.toFixed(2)}  mínimo≈${d}  ${r.kind === 'turns' ? '' : `tiempo ${bossTimeFor(l, d)} s`}`,
  );
}

console.log('\nJugador típico de cada jefe (el que llega hasta él) y tasa objetivo →');
console.log(
  BOSS_LEVELS.map((l) => {
    const r = bossWinRate({ level: l, start: 1, skill: REP_SKILL[l], runs });
    return `${l}: hab ${REP_SKILL[l]} → ${pct(r.rate)} % (objetivo ${pct(BOSS_TARGET[l])})`;
  }).join('\n'),
);

console.log('\nTasa de victoria (%) al primer intento, por jefe →');
console.log(`camino   hab.  ${BOSS_LEVELS.map((l) => String(l).padStart(4)).join('')}`);
for (const row of bossReport({ runs })) {
  console.log(
    `${names[row.start].padEnd(8)} ${row.skill.toFixed(2)}  ${row.rates.map((r) => `${pct(r.rate)} `).join('')}`,
  );
}

console.log('\nCausa de las derrotas (turnos / tiempo, %) en Normal, habilidad 0,60 →');
console.log(
  BOSS_LEVELS.map((l) => {
    const r = bossWinRate({ level: l, start: 1, skill: 0.6, runs });
    return `${l}: ${Math.round(r.byTurns * 100)}/${Math.round(r.byTime * 100)}`;
  }).join('  '),
);

console.log('\nReloj humano del modelo (segundos por movimiento, en un tablero de 26) →');
for (const s of SKILLS) console.log(`  habilidad ${s.toFixed(2)}: ${secondsPerMove(s, 26).toFixed(2)} s/mov`);
console.log(
  `\nEquilibrio de piezas especiales (multiplica los errores): ${Object.entries(FAMILY_HARD)
    .map(([k, v]) => `${k} ×${v}`)
    .join(' · ')}`,
);
void HUMAN;
void PATHS;

if (process.argv.includes('--calibrar')) {
  console.log('\nCalibración propuesta para BOSS_RULES (camino Normal, jugador típico) →');
  for (const l of BOSS_LEVELS) console.log(`  ${l}: ${JSON.stringify(calibrateBoss(l, { runs }))}`);
}
