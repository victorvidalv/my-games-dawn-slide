/**
 * Convierte las PREFERENCIAS del calibrador (tools/calibrator/calibration.json: una guía, no una ley) en el calendario real del juego
 * (src/data/calibration.json). Estudia el patrón de las preferencias —dónde llega cada mecánica nueva (★), cuántos niveles especiales hay,
 * su tamaño (1, 2, 3… mecánicas), dónde caen el maleficio y los sellos— y OPTIMIZA el reparto:
 *   · cada mecánica se explica con su tutorial en el nivel marcado y no se usa antes de él;
 *   · las mecánicas no se repiten seguidas: cada nivel especial elige las que hace más que no salen (y la recién llegada vuelve enseguida);
 *   · el tamaño de las mezclas sube con el nivel y, pasado el 80, se usan todas juntas (los cierres de ciudad cargan la mezcla máxima de su momento);
 *   · maleficio y sellos nunca coinciden con cierres de ciudad ni con tutoriales, ni se pegan entre sí;
 *   · se comprueba que existan tableros de cada combinación a la dificultad pedida (si no, se cambia por otra combinación del mismo tamaño);
 *   · turnos mínimos: Normal parte de 3 y sube 1 cada 3 niveles (jefes +2); Difícil y Experto siguen las preferencias, siempre ascendentes.
 *   node scripts/optimize-calibration.mjs
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const PREF = JSON.parse(readFileSync(new URL('../tools/calibrator/calibration.json', import.meta.url), 'utf8')).levels;
const OUT = new URL('../src/data/calibration.json', import.meta.url);
const SPECIAL = new URL('../src/data/special.json', import.meta.url);
const { targetFor } = await import('../src/engine/targets.js');

const ORDER = ['wall', 'heavy', 'gate', 'ice'];
const LETTER = { wall: 'w', heavy: 'h', gate: 'g', ice: 'i' };
/** Cierre de ciudad (10, 20 … 100): el tablero que precede a la elección de cartas del destino. */
const isBoss = (l) => l % 10 === 0;
const get = (l) => PREF[l];

/* ---------- 1. Introducciones (★) ---------- */
const intro = {};
for (const m of ORDER) {
  const star = Object.keys(PREF)
    .map(Number)
    .find((l) => get(l).mechanics[m] === 2);
  intro[m] = star ?? { wall: 12, heavy: 22, gate: 32, ice: 41 }[m];
}
const rawCurse = Object.keys(PREF)
  .map(Number)
  .filter((l) => get(l).curse)
  .sort((a, b) => a - b);
const curseTutorial = rawCurse[0] ?? 17;
const tutLevels = new Set([...Object.values(intro), curseTutorial]);
const sealTutorial =
  Object.keys(PREF)
    .map(Number)
    .find((l) => get(l).seal?.tutorial) ?? 6;

/* ---------- 2. Niveles especiales y su tamaño (patrón de las preferencias) ---------- */
const sizeOfPref = (l) => ORDER.filter((m) => get(l).mechanics[m]).length;
const unlocked = (l) => ORDER.filter((m) => intro[m] <= l);
const level = {};
const last = Object.fromEntries(ORDER.map((m) => [m, 0]));
const recent = [];
const usedSince = Object.fromEntries(ORDER.map((m) => [m, false]));
const wantedSize = (l) => {
  const u = unlocked(l).length;
  if (!u) return 0;
  const boss = isBoss(l);
  let s;
  if (boss) s = Math.min(u, 1 + Math.floor(l / 30) + (l >= 80 ? 1 : 0) + (l >= 100 ? 1 : 0));
  else s = sizeOfPref(l) || 0;
  if (!boss && s) {
    // la mezcla crece con el nivel: pasado el 80 casi todo son varias a la vez
    if (l >= 97) s = Math.max(s, 4);
    else if (l >= 90) s = Math.max(s, 3 + (l % 2));
    else if (l >= 80) s = Math.max(s, 3);
    else if (l >= 64) s = Math.max(s, 2);
  }
  return Math.min(u, s);
};
// niveles especiales: los de las preferencias (sin los de tutorial de otra mecánica) + jefes; sin tres seguidos
const special = new Set();
for (let l = 1; l <= 100; l++)
  if (isBoss(l) ? wantedSize(l) > 0 : sizeOfPref(l) > 0 || Object.values(intro).includes(l)) special.add(l);
for (let l = 3; l <= 100; l++)
  if (
    special.has(l) &&
    special.has(l - 1) &&
    special.has(l - 2) &&
    !isBoss(l) &&
    !isBoss(l - 1) &&
    !isBoss(l - 2) &&
    !Object.values(intro).includes(l)
  )
    special.delete(l);

// práctica en solitario: tras el tutorial de cada pieza, los dos primeros niveles especiales (o los que se creen) son solo de esa pieza
const forced = {};
const introLevels = new Set(Object.values(intro));
for (const m of ORDER) {
  const picks = [];
  for (let l = intro[m] + 1; l <= intro[m] + 8 && picks.length < 2; l++)
    if (special.has(l) && !isBoss(l) && !introLevels.has(l)) picks.push(l);
  for (let l = intro[m] + 2; l <= intro[m] + 8 && picks.length < 2; l += 2)
    if (!isBoss(l) && !introLevels.has(l) && !picks.includes(l) && !forced[l]) {
      special.add(l);
      picks.push(l);
    }
  for (const l of picks) forced[l] = m;
}
const soloCount = Object.fromEntries(ORDER.map((m) => [m, 0]));

for (let l = 1; l <= 100; l++) {
  const u = unlocked(l);
  const introHere = ORDER.find((m) => intro[m] === l);
  let set = [];
  if (introHere)
    set = [introHere]; // el nivel del tutorial: solo la pieza nueva
  else if (forced[l] && !isBoss(l))
    set = [forced[l]]; // práctica en solitario de la pieza recién llegada
  else if (special.has(l) && u.length) {
    // las mezclas solo con piezas ya practicadas en solitario (2 niveles); si no hay dos así, el nivel es de una sola pieza
    const ready = u.filter((m) => soloCount[m] >= 2);
    let k = Math.max(1, wantedSize(l) || 1);
    const poolAll = ready.length >= 2 ? ready : u;
    if (ready.length < 2) k = 1;
    k = Math.min(k, poolAll.length);
    // la recién llegada vuelve pronto; después, las que hace más que no salen; sin repetir la combinación anterior
    const score = (m) =>
      l - last[m] + (!usedSince[m] && l - intro[m] <= 8 ? 6 : 0) + (isBoss(l) && m === 'wall' && l >= 100 ? 99 : 0);
    // se prueban todas las combinaciones de ese tamaño: gana la que suma más «hace que no sale» y no repite una de las últimas cuatro
    const subsets = (arr, n) =>
      n === 0 ? [[]] : arr.flatMap((x, i) => subsets(arr.slice(i + 1), n - 1).map((r) => [x, ...r]));
    const keyOfSet = (arr) => ORDER.filter((m) => arr.includes(m)).join('');
    const pick = (n) =>
      subsets(poolAll, n)
        .map((c) => ({
          c,
          v:
            c.reduce((a, m) => a + score(m), 0) -
            (recent.includes(keyOfSet(c)) ? 60 : 0) -
            (recent.at(-1) && keyOfSet(c) === recent.at(-1) ? 200 : 0),
        }))
        .sort((a, b) => b.v - a.v || keyOfSet(a.c).localeCompare(keyOfSet(b.c)))[0];
    let best = pick(k);
    while (k > 1 && recent.includes(keyOfSet(best.c)) && l !== 100) {
      k--;
      best = pick(k);
    } // si solo queda una mezcla ya vista, mejor menos piezas que repetirla
    set = best.c;
    if (l === 100) set = [...ORDER]; // el jefe final: todas juntas
  }
  const letters = ORDER.filter((m) => set.includes(m))
    .map((m) => LETTER[m])
    .join('');
  for (const m of set) {
    last[m] = l;
    usedSince[m] = true;
  }
  if (set.length === 1 && !introHere) soloCount[set[0]]++;
  if (letters) {
    recent.push(ORDER.filter((m) => set.includes(m)).join(''));
    if (recent.length > 4) recent.shift();
  }
  level[l] = { m: letters };
}

/* ---------- 3. Maleficio (giro): irregular, sin jefes ni tutoriales, sin pegarse ---------- */
const curse = [];
// el giro no compite con el aprendizaje: nada en los 4 niveles tras el tutorial de una pieza, y en la recta final solo en niveles de una o dos piezas
const learning = (l) => Object.values(intro).some((t) => l > t && l <= t + 4);
const free = (l) =>
  l >= curseTutorial &&
  l <= 100 &&
  !isBoss(l) &&
  (l === curseTutorial || (!tutLevels.has(l) && !learning(l) && (l < 64 || (level[l].m?.length ?? 0) <= 2)));
for (const c of rawCurse) {
  let l = c;
  const gap = c < 60 ? 3 : 2; // al final pueden venir más seguidos
  while (l <= 100 && (!free(l) || (curse.length && l - curse.at(-1) < gap))) l++;
  if (l <= 100) curse.push(l);
}
for (const l of curse) level[l].curse = 1;

/* ---------- 4. Sellos: sus tipos y huecos, sin jefes ni tutoriales de pieza ---------- */
const sealLevels = Object.keys(PREF)
  .map(Number)
  .filter((l) => get(l).seal)
  .sort((a, b) => a - b);
const taken = new Set();
for (const s of sealLevels) {
  let l = s;
  while (
    l <= 100 &&
    (isBoss(l) ||
      (tutLevels.has(l) && l !== curseTutorial) ||
      (level[l].curse === 1 && l === curseTutorial) ||
      taken.has(l))
  )
    l++;
  if (l > 100) continue;
  taken.add(l);
  level[l].seal = [get(s).seal.tier, l === sealTutorial || s === sealTutorial ? 1 : 0];
}

/* ---------- 5. Turnos mínimos ---------- */
let prevH = 0;
let prevE = 0;
for (let l = 1; l <= 100; l++) {
  const normal = Math.min(37, 3 + Math.floor((l - 1) / 3) + (isBoss(l) && l >= 20 ? 2 : 0));
  prevH = Math.max(prevH, get(l).min.hard, normal + 6);
  prevE = Math.max(prevE, get(l).min.expert, prevH);
  level[l].min = [normal, Math.min(37, prevH), Math.min(37, prevE)];
}

/* ---------- 6. Viabilidad: ¿hay tableros de cada combinación a esa dificultad? ---------- */
const ratingFor = (m) => {
  let best = 1;
  let d = 1e9;
  for (let r = 1; r <= 100; r++) {
    const x = Math.abs(targetFor(r) - m);
    if (x < d) {
      d = x;
      best = r;
    }
  }
  return best;
};
const keyOf = (letters) => ({ w: 'walls', h: 'heavy', g: 'gates', i: 'ice' })[letters] ?? `combo_${letters}`;
const problems = [];
if (existsSync(SPECIAL) && !process.env.NO_FEAS) {
  const bank = JSON.parse(readFileSync(SPECIAL, 'utf8'));
  const has = (letters, rating) => !letters || (bank[keyOf(letters)]?.[rating - 1]?.length ?? 0) >= 1;
  for (let l = 1; l <= 100; l++) {
    const letters = level[l].m;
    // se exige que haya tableros exactos en Normal; en Difícil y Experto (dificultades muy altas) vale la combinación más parecida; el nivel del tutorial no se toca
    const ratings = [ratingFor(level[l].min[0])];
    if (ratings.every((r) => has(letters, r)) || ORDER.some((m) => intro[m] === l)) continue;
    // otra combinación del mismo tamaño (de lo ya desbloqueado) que sí exista en los tres caminos
    const u = unlocked(l).map((m) => LETTER[m]);
    const subsets = (arr, k) =>
      k === 0 ? [[]] : arr.flatMap((x, i) => subsets(arr.slice(i + 1), k - 1).map((r) => [x, ...r]));
    const alt = subsets(u, letters.length)
      .map((s) =>
        ORDER.map((m) => LETTER[m])
          .filter((c) => s.includes(c))
          .join(''),
      )
      .find((s) => ratings.every((r) => has(s, r)));
    if (alt) {
      problems.push(`nivel ${l}: ${letters} → ${alt} (sin tableros a esa dificultad)`);
      level[l].m = alt;
    } else problems.push(`nivel ${l}: ${letters} sin alternativa (se usará la combinación más parecida)`);
  }
}

/* ---------- plan de generación: qué combinaciones a qué dificultades hacen falta (± 1) ---------- */
const plan = {};
for (let l = 1; l <= 100; l++) {
  const letters = level[l].m;
  if (!letters || letters === 'w') continue;
  const fam = keyOf(letters);
  plan[fam] ||= new Set();
  for (const m of level[l].min) {
    const r = ratingFor(m);
    for (const d of [-1, 0, 1]) if (r + d >= 1 && r + d <= 100) plan[fam].add(r + d);
  }
}
writeFileSync(
  new URL('../tools/calibrator/plan.json', import.meta.url),
  JSON.stringify(Object.fromEntries(Object.entries(plan).map(([k, v]) => [k, [...v].sort((a, b) => a - b)]))),
);

/* ---------- salida ---------- */
const levels = [];
for (let l = 1; l <= 100; l++) {
  const x = level[l];
  levels.push([x.m ?? '', x.curse ?? 0, x.seal?.[0] ?? 0, x.seal?.[1] ?? 0, ...x.min]);
}
const tutorials = { ...Object.fromEntries(ORDER.map((m) => [m, intro[m]])), curse: curseTutorial };
const calJson = JSON.stringify({ tutorials, levels });
writeFileSync(OUT, calJson + '\n');
writeFileSync(
  new URL('../src/data/calibration.js', import.meta.url),
  `// Generado por scripts/optimize-calibration.mjs (copia de calibration.json como módulo, para que lo importen el navegador y Node por igual).\nexport default ${calJson};\n`,
);

const names = { w: 'W', h: 'H', g: 'G', i: 'I' };
for (let b = 0; b < 100; b += 10) {
  console.log(
    Array.from({ length: 10 }, (_, k) => {
      const l = b + k + 1;
      const x = level[l];
      return `${String(l).padStart(3)} ${(x.m ? [...x.m].map((c) => names[c]).join('') : '·').padEnd(5)}${x.curse ? '🌀' : '  '}${x.seal ? 'S' + x.seal[0] : '  '}`;
    }).join('  '),
  );
}
console.log(`\nIntroducciones: ${ORDER.map((m) => `${m} ${intro[m]}`).join(' · ')} · maleficio ${curseTutorial}`);
console.log(`Maleficio: ${curse.join(', ')}`);
console.log(`Mínimos Normal: ${[1, 10, 20, 50, 100].map((l) => `${l}→${level[l].min[0]}`).join(' ')}`);
if (problems.length) console.log('\nAjustes por viabilidad:\n  ' + problems.join('\n  '));
