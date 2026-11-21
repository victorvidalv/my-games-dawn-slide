/**
 * Análisis de balance del roguelite (héroes, reliquias y cartas del destino) con el modelo de src/game/balance.js.
 *   node scripts/analyze-balance.mjs [partidas por celda]
 */
import { averageRuns, SKILLS, PATHS } from '../src/game/balance.js';
import { FATE_CARDS } from '../src/game/fate.js';
import { RELICS } from '../src/game/relics.js';

const runs = Number(process.argv[2] || 300);
const section = process.argv[3] || 'all';
const names = { 1: 'Normal', 50: 'Difícil', 75: 'Experto' };
const HEROES = ['lia', 'jean', 'van'];
const f1 = (n) => n.toFixed(1).padStart(5);
const k = (n) => Math.round(n).toLocaleString('es').padStart(7);
const SK = [0.6, 0.8, 0.92];

const avg = (opts) => {
  let c = 0,
    s = 0,
    done = 0,
    n = 0;
  for (const start of opts.paths || PATHS)
    for (const skill of opts.skills || SK) {
      const r = averageRuns({ runs, fate: 3, ...opts, start, skill });
      c += r.cleared;
      s += r.score;
      done += r.completion;
      n++;
    }
  return { cleared: c / n, score: s / n, completion: done / n };
};

if (section === 'all' || section === 'heroes') {
  console.log(`\n== Héroes con cartas (elige para sobrevivir) · ${runs} partidas ==`);
  console.log('camino   hab. |  Lía niv / pts    | Jean niv / pts    | Juth niv / pts');
  for (const start of PATHS)
    for (const skill of SKILLS) {
      const cols = HEROES.map((hero) => {
        const r = averageRuns({ hero, start, skill, runs, fate: 3 });
        return `${f1(r.cleared)} ${k(r.score)} ${(r.completion * 100).toFixed(0).padStart(3)}%`;
      });
      console.log(`${names[start].padEnd(8)} ${skill.toFixed(2)} | ${cols.join(' | ')}`);
    }
}

if (section === 'all' || section === 'relics') {
  console.log('\n== Reliquias (media de héroes, hab. 0,6/0,8/0,92, con cartas) ==');
  for (const start of PATHS) {
    const row = [null, ...RELICS.map((r) => r.id)].map((relic) => {
      let c = 0,
        s = 0;
      for (const hero of HEROES) {
        const r = avg({ hero, relic, paths: [start] });
        c += r.cleared / 3;
        s += r.score / 3;
      }
      return `${(relic || 'ninguna').padEnd(8)} ${f1(c)} ${k(s)}`;
    });
    console.log(`${names[start].padEnd(8)} ${row.join(' · ')}`);
  }
}

if (section === 'all' || section === 'cards') {
  console.log(
    '\n== Valor de cada carta (forzada si sale; Δ frente a elegir para sobrevivir; media héroes/caminos, hab. 0,6–0,92) ==',
  );
  const base = {};
  for (const hero of HEROES) base[hero] = avg({ hero });
  const rows = [];
  for (const card of FATE_CARDS) {
    let dc = 0,
      ds = 0;
    const per = {};
    for (const hero of HEROES) {
      const r = avg({ hero, force: [card.id] });
      per[hero] = r.cleared - base[hero].cleared;
      dc += per[hero] / 3;
      ds += (r.score - base[hero].score) / 3;
    }
    rows.push({ id: card.id, kind: card.kind, dc, ds, per });
  }
  rows.sort((a, b) => b.dc - a.dc);
  for (const r of rows)
    console.log(
      `${r.id.padEnd(14)} ${r.kind.padEnd(8)} niv ${r.dc >= 0 ? '+' : ''}${r.dc.toFixed(2).padStart(5)}  pts ${r.ds >= 0 ? '+' : ''}${k(r.ds)}   (L ${r.per.lia.toFixed(2)} J ${r.per.jean.toFixed(2)} T ${r.per.van.toFixed(2)})`,
    );
}

if (section === 'all' || section === 'pick') {
  console.log('\n== Estrategia de elección (media héroes, hab. 0,6–0,92) ==');
  for (const pick of ['survival', 'score', 'random']) {
    for (const start of PATHS) {
      let c = 0,
        s = 0,
        d = 0;
      for (const hero of HEROES) {
        const r = avg({ hero, pick, paths: [start] });
        c += r.cleared / 3;
        s += r.score / 3;
        d += r.completion / 3;
      }
      console.log(
        `${pick.padEnd(9)} ${names[start].padEnd(8)} niv ${f1(c)}  pts ${k(s)}  fin ${(d * 100).toFixed(0)}%`,
      );
    }
  }
}

if (section === 'all' || section === 'raw') {
  const at = Number(process.argv[4] || 7);
  console.log(
    `\n== Poder bruto de cada carta: solo esa carta desde el nivel ${at} (sin más elecciones). Δ frente a ninguna ==`,
  );
  const base = {};
  for (const hero of HEROES) base[hero] = avg({ hero, grant: { at, ids: [] } });
  const rows = [];
  for (const card of FATE_CARDS) {
    let dc = 0,
      ds = 0;
    const per = {};
    const perPath = {};
    for (const hero of HEROES) {
      const r = avg({ hero, grant: { at, ids: [card.id] } });
      per[hero] = r.cleared - base[hero].cleared;
      dc += per[hero] / 3;
      ds += (r.score / base[hero].score - 1) / 3;
    }
    for (const start of PATHS) {
      let c = 0;
      for (const hero of HEROES)
        c +=
          (avg({ hero, paths: [start], grant: { at, ids: [card.id] } }).cleared -
            avg({ hero, paths: [start], grant: { at, ids: [] } }).cleared) /
          3;
      perPath[start] = c;
    }
    rows.push({ id: card.id, kind: card.kind, dc, ds, per, perPath });
  }
  rows.sort((a, b) => b.dc + b.ds * 3 - (a.dc + a.ds * 3));
  console.log('carta          tipo     Δniv   Δpts%  | L/J/T niv          | N/D/E niv');
  for (const r of rows)
    console.log(
      `${r.id.padEnd(14)} ${r.kind.padEnd(8)} ${r.dc >= 0 ? '+' : ''}${r.dc.toFixed(2)} ${(r.ds * 100).toFixed(1).padStart(6)}% | ${['lia', 'jean', 'van'].map((h) => r.per[h].toFixed(2).padStart(5)).join(' ')} | ${PATHS.map((p) => r.perPath[p].toFixed(2).padStart(5)).join(' ')}`,
    );
}
