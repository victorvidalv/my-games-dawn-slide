/**
 * Simula partidas para comparar la dificultad de cada camino, los poderes de los héroes, la tienda y el revivir
 * (modelo en src/game/balance.js).   npm run simulate [partidas por celda]
 */
import { balanceReport, averageRuns, SKILLS, PATHS } from '../src/game/balance.js';

const runs = Number(process.argv[2] || 300);
const names = { 1: 'Normal', 50: 'Difícil', 75: 'Experto' };
const f1 = (n) => n.toFixed(1).padStart(5);
const k = (n) => Math.round(n).toLocaleString('es').padStart(8);

console.log(
  `Poderes (una vez por tablero): Lía reserva de turnos · Jean rebobina ~33 % de sus movimientos · Juth traza ~25 % de los pasos que faltan (${runs} partidas por celda)\n`,
);
const rows = balanceReport({ runs });
console.log('camino   hab.  sin poder |  +Lía  +Jean  +Juth   (niveles extra frente a no tener poder)');
for (const r of rows)
  console.log(
    `${names[r.start].padEnd(8)} ${r.skill.toFixed(2)}  ${f1(r.base)}    | ${f1(r.lia)} ${f1(r.jean)} ${f1(r.van)}`,
  );
const mean = (key, set = rows) => set.reduce((a, r) => a + r[key], 0) / set.length;
console.log('\nMedia de niveles extra por camino →');
for (const s of PATHS) {
  const set = rows.filter((r) => r.start === s);
  console.log(
    `  ${names[s].padEnd(8)} Lía ${mean('lia', set).toFixed(1)} · Jean ${mean('jean', set).toFixed(1)} · Juth ${mean('van', set).toFixed(1)}`,
  );
}
console.log(
  `  Total    Lía ${mean('lia').toFixed(1)} · Jean ${mean('jean').toFixed(1)} · Juth ${mean('van').toFixed(1)}`,
);

console.log('\nRevivir (comprar uno al empezar cada ciudad desde la 3ª, máx. 1): efecto en niveles y puntos');
for (const start of PATHS)
  for (const skill of SKILLS) {
    const a = averageRuns({ hero: 'none', start, skill, runs });
    const b = averageRuns({ hero: 'none', start, skill, runs, revive: 'city' });
    console.log(
      `${names[start].padEnd(8)} ${skill.toFixed(2)}  niveles ${f1(a.cleared)} → ${f1(b.cleared)}   puntos ${k(a.score)} → ${k(b.score)}`,
    );
  }
