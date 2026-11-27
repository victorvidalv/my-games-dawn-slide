/**
 * Compara el barajado puro (Fisher-Yates, como antes) con el barajado justo de las cartas del destino:
 * tríos malos, momento de las cartas de cierre, frecuencia de cada carta y variedad (entropía) de los mazos.
 *   node scripts/analyze-fate-deck.mjs [semillas]
 */
import { mulberry32, hash32 } from '../src/engine/rng.js';
import {
  BASE_UNTIL,
  FATE_CARDS,
  FATE_OFFER,
  FATE_PICKS,
  LATE_FROM,
  fairOffer,
  fateDeck,
  fateOffer,
} from '../src/game/fate.js';

const N = Number(process.argv[2] || 20000);
const ALL = FATE_CARDS.map((c) => c.id);
const kind = new Map(FATE_CARDS.map((c) => [c.id, c.kind]));

function pure(seed, ids = ALL) {
  const rng = mulberry32(hash32(seed | 0, 0x4fa7e));
  const a = [...ids];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const trios = (deck) => Array.from({ length: FATE_PICKS }, (_, c) => deck.slice(c * FATE_OFFER, (c + 1) * FATE_OFFER));
const nPact = (t) => t.filter((id) => kind.get(id) === 'pact').length;
const pct = (x, n) => `${((100 * x) / n).toFixed(2)} %`;

function measure(name, make) {
  const m = {
    trios: 0,
    pact3: 0,
    pact2: 0,
    noBless: 0,
    invalid: 0,
    early12NoBase: 0,
    lateEarly: 0,
    abismoEarly: 0,
    runsBad: 0,
  };
  const freq = Object.fromEntries(ALL.map((id) => [id, 0]));
  const seenAt = Object.fromEntries(ALL.map((id) => [id, Array(FATE_PICKS).fill(0)]));
  const firstTrio = new Map();
  for (let s = 1; s <= N; s++) {
    const deck = make(s);
    let bad = false;
    trios(deck).forEach((t, i) => {
      const city = i + 1;
      m.trios++;
      const p = nPact(t);
      if (p === 3) m.pact3++;
      if (p >= 2) m.pact2++;
      if (p === 3) m.noBless++;
      if (!fairOffer(t, city)) (m.invalid++, (bad = true));
      if (t.some((id) => (LATE_FROM[id] || 0) > city)) (m.lateEarly++, (bad = true));
      for (const id of t) (freq[id]++, seenAt[id][i]++);
    });
    if (bad) m.runsBad++;
    for (const [i, t] of trios(deck).entries()) {
      const k = `${i}:${[...t].sort().join('+')}`;
      firstTrio.set(k, (firstTrio.get(k) || 0) + 1);
    }
  }
  let H = 0; // entropía media de un trío ofrecido (bits), sobre tríos sin orden en su tramo
  for (const c of firstTrio.values()) H -= ((c / N) * Math.log2(c / N)) / FATE_PICKS;
  const exp = (N * FATE_PICKS * FATE_OFFER) / ALL.length;
  return { name, m, freq, seenAt, H, distinct: firstTrio.size, exp };
}

const old31 = ALL.slice(0, 31);
const rows = [measure('puro (35 cartas)', (s) => pure(s)), measure('justo (35 cartas)', (s) => fateDeck(s))];
const oldP = { trios: 0, pact3: 0 };
for (let s = 1; s <= N; s++) for (const t of trios(pure(s, old31))) (oldP.trios++, nPact(t) === 3 && oldP.pact3++);

console.log(`Semillas: ${N}. Tríos analizados por modo: ${N * FATE_PICKS}.\n`);
console.log('Mazo antes (31 cartas, barajado puro): tríos de 3 Pactos', pct(oldP.pact3, oldP.trios));
for (const r of rows) {
  const { m } = r;
  console.log(`\n== ${r.name} ==`);
  console.log(`tríos de 3 Pactos:           ${pct(m.pact3, m.trios)}`);
  console.log(`tríos con 2+ Pactos:         ${pct(m.pact2, m.trios)}`);
  console.log(
    `tríos que rompen las reglas: ${pct(m.invalid, m.trios)}  (sin bendición / sin margen / solo margen / sin carta base en 1–2)`,
  );
  console.log(`cartas de cierre antes de su tramo: ${pct(m.lateEarly, m.trios)}`);
  console.log(`partidas con algún trío malo: ${pct(m.runsBad, N)}`);
  console.log(
    `variedad: ${r.distinct} tríos distintos (tramo+cartas), entropía por oferta ${r.H.toFixed(2)} bits (máx teórico ${Math.log2((35 * 34 * 33) / 6).toFixed(2)})`,
  );
  const f = Object.values(r.freq).map((x) => x / (N * FATE_PICKS * FATE_OFFER));
  console.log(
    `apariciones por carta: min ${(Math.min(...f) * 100).toFixed(2)} %, máx ${(Math.max(...f) * 100).toFixed(2)} % (uniforme: ${(100 / ALL.length).toFixed(2)} %)`,
  );
}
const fair = rows[1];
console.log('\nApariciones de cada carta en el mazo justo (% de partidas en que sale en alguno de los 6 tramos):');
for (const id of ALL)
  console.log(
    `${id.padEnd(14)} ${kind.get(id).padEnd(8)} ${((100 * fair.freq[id]) / N).toFixed(1).padStart(5)} %  por tramo: ${fair.seenAt[id].map((x) => ((100 * x) / N).toFixed(0).padStart(3)).join(' ')}`,
  );

// reroll: la reserva también respeta las reglas
let badRe = 0,
  tot = 0;
for (let s = 1; s <= Math.min(N, 5000); s++)
  for (let city = 1; city <= FATE_PICKS; city++) {
    const run = { seed: s, hero: 'lia', fateDeck: fateDeck(s), fateRerollCity: city };
    tot++;
    if (
      !fairOffer(
        fateOffer(run, city).map((c) => c.id),
        city,
      )
    )
      badRe++;
  }
console.log(`\nCambio de cartas que rompe reglas: ${pct(badRe, tot)} de ${tot}`);
void BASE_UNTIL;
