/**
 * Aplica las preferencias del calibrador al juego, de principio a fin:
 *   1. optimiza el calendario (sin comprobar viabilidad) y calcula qué combinaciones de piezas hacen falta a qué dificultad;
 *   2. genera los tableros que falten (decorate-levels --plan);
 *   3. vuelve a optimizar comprobando que existan tableros (cambia lo inviable por otra mezcla del mismo tamaño);
 *   4. quita de src/data/special.json las familias que el calendario ya no usa.
 *   npm run calibrate
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const run = (args, env = {}) => {
  const r = spawnSync('node', args, { stdio: 'inherit', env: { ...process.env, ...env } });
  if (r.status) process.exit(r.status);
};
if (!process.env.SKIP_GEN) {
  // SKIP_GEN=1: saltar los pasos 1 y 2 (si los tableros ya están generados)
  console.log('1/4 optimizando el calendario…');
  run(['scripts/optimize-calibration.mjs'], { NO_FEAS: '1' });
  console.log('\n2/4 generando los tableros que faltan…');
  run(['scripts/decorate-levels.mjs', '--plan', 'tools/calibrator/plan.json']);
}
console.log('\n3/4 comprobando viabilidad…');
run(['scripts/optimize-calibration.mjs']);
console.log('\n4/4 limpiando familias sin uso…');
const SPECIAL = new URL('../src/data/special.json', import.meta.url);
const cal = JSON.parse(readFileSync(new URL('../src/data/calibration.json', import.meta.url), 'utf8'));
const keyOf = (l) => ({ w: 'walls', h: 'heavy', g: 'gates', i: 'ice', d: 'doors' })[l] ?? `combo_${l}`;
const keep = new Set([
  'walls',
  'heavy',
  'gates',
  'ice',
  'doors',
  ...cal.levels
    .map((r) => r[0])
    .filter(Boolean)
    .map(keyOf),
]);
const bank = JSON.parse(readFileSync(SPECIAL, 'utf8'));
const dropped = Object.keys(bank).filter((k) => !keep.has(k));
for (const k of dropped) delete bank[k];
writeFileSync(SPECIAL, JSON.stringify(bank) + '\n');
console.log(`Quitadas ${dropped.length} familias sin uso: ${dropped.join(', ') || '—'}`);
