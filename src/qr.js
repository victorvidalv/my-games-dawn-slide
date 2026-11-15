/**
 * Generador de códigos QR (sin dependencias): modo byte, corrección de errores M, versiones 1-10 (hasta 213 bytes).
 * `qrMatrix(texto)` devuelve una matriz de booleanos (true = módulo oscuro); `qrSvg(texto)` la dibuja como SVG.
 */

/* Tablas del estándar para el nivel M: [palabras de datos por bloque del grupo 1, bloques g1, palabras del g2, bloques g2, palabras de corrección por bloque] */
const BLOCKS = [
  null,
  [16, 1, 0, 0, 10], [28, 1, 0, 0, 16], [44, 1, 0, 0, 26], [32, 2, 0, 0, 18], [43, 2, 0, 0, 24],
  [27, 4, 0, 0, 16], [31, 4, 0, 0, 18], [38, 2, 39, 2, 22], [36, 3, 37, 2, 22], [43, 4, 44, 1, 26],
];
const ALIGN = [null, [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]];
const dataWords = (v) => { const [a, na, b, nb] = BLOCKS[v]; return a * na + b * nb; };
export const QR_MAX_BYTES = dataWords(10) - 2;

/* Cuerpo de Galois GF(256) con el polinomio 0x11D */
const EXP = new Array(512);
const LOG = new Array(256);
for (let i = 0, x = 1; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 0x100) x ^= 0x11d; }
for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
const mul = (a, b) => (a && b ? EXP[LOG[a] + LOG[b]] : 0);

function reedSolomon(data, ec) {
  let gen = [1];
  for (let i = 0; i < ec; i++) {
    const next = new Array(gen.length + 1).fill(0);
    gen.forEach((c, j) => { next[j] ^= c; next[j + 1] ^= mul(c, EXP[i]); });
    gen = next;
  }
  const rem = new Array(ec).fill(0);
  for (const d of data) {
    const f = d ^ rem.shift();
    rem.push(0);
    if (f) gen.slice(1).forEach((g, i) => { rem[i] ^= mul(g, f); });
  }
  return rem;
}

const bch = (value, poly, bits) => {
  let v = value << bits;
  const top = (n) => 31 - Math.clz32(n);
  while (top(v) >= top(poly)) v ^= poly << (top(v) - top(poly));
  return (value << bits) | v;
};

function encodeData(bytes, v) {
  const bits = [];
  const put = (value, len) => { for (let i = len - 1; i >= 0; i--) bits.push((value >> i) & 1); };
  put(0b0100, 4);
  put(bytes.length, 8);
  bytes.forEach((b) => put(b, 8));
  const cap = dataWords(v) * 8;
  put(0, Math.min(4, cap - bits.length));
  while (bits.length % 8) bits.push(0);
  for (let pad = 0xec; bits.length < cap; pad ^= 0xec ^ 0x11) put(pad, 8);
  const words = [];
  for (let i = 0; i < bits.length; i += 8) words.push(parseInt(bits.slice(i, i + 8).join(''), 2));
  return words;
}

function interleave(words, v) {
  const [a, na, b, nb, ec] = BLOCKS[v];
  const blocks = [];
  let at = 0;
  for (let i = 0; i < na + nb; i++) {
    const len = i < na ? a : b;
    const data = words.slice(at, at + len);
    at += len;
    blocks.push({ data, ec: reedSolomon(data, ec) });
  }
  const out = [];
  for (let i = 0; i < Math.max(a, b); i++) blocks.forEach((bl) => { if (i < bl.data.length) out.push(bl.data[i]); });
  for (let i = 0; i < ec; i++) blocks.forEach((bl) => out.push(bl.ec[i]));
  return out;
}

const MASKS = [
  (r, c) => (r + c) % 2 === 0, (r) => r % 2 === 0, (r, c) => c % 3 === 0, (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0, (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0, (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
];

function penalty(m) {
  const n = m.length;
  let p = 0;
  const lines = [];
  for (let i = 0; i < n; i++) { lines.push(m[i]); lines.push(m.map((row) => row[i])); }
  for (const line of lines) {
    let run = 1;
    for (let i = 1; i <= n; i++) {
      if (i < n && line[i] === line[i - 1]) run++;
      else { if (run >= 5) p += run - 2; run = 1; }
    }
    const s = line.map((x) => (x ? 1 : 0)).join('');
    for (let i = 0; i + 11 <= n; i++) { const w = s.slice(i, i + 11); if (w === '10111010000' || w === '00001011101') p += 40; }
  }
  for (let r = 0; r < n - 1; r++) for (let c = 0; c < n - 1; c++) if (m[r][c] === m[r][c + 1] && m[r][c] === m[r + 1][c] && m[r][c] === m[r + 1][c + 1]) p += 3;
  const dark = m.flat().filter(Boolean).length;
  p += Math.floor(Math.abs((dark * 100) / (n * n) - 50) / 5) * 10;
  return p;
}

export function qrMatrix(text) {
  const bytes = [...new TextEncoder().encode(text)];
  let v = 1;
  while (v <= 10 && bytes.length > dataWords(v) - 2) v++;
  if (v > 10) throw new Error('Texto demasiado largo para el QR');
  const n = 17 + 4 * v;
  const mod = Array.from({ length: n }, () => new Array(n).fill(false));
  const fn = Array.from({ length: n }, () => new Array(n).fill(false));   // módulos de función (no se enmascaran)
  const set = (r, c, dark) => { if (r >= 0 && r < n && c >= 0 && c < n) { mod[r][c] = dark; fn[r][c] = true; } };

  const finder = (r0, c0) => {
    for (let dr = -1; dr <= 7; dr++) for (let dc = -1; dc <= 7; dc++) {
      const edge = dr === 0 || dr === 6 || dc === 0 || dc === 6;
      const core = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
      set(r0 + dr, c0 + dc, dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6 && (edge || core));
    }
  };
  finder(0, 0); finder(0, n - 7); finder(n - 7, 0);
  for (let i = 8; i < n - 8; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
  const al = ALIGN[v];
  for (const r of al) for (const c of al) {
    if ((r === 6 && c === 6) || (r === 6 && c === al[al.length - 1]) || (r === al[al.length - 1] && c === 6)) continue;
    for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) set(r + dr, c + dc, Math.max(Math.abs(dr), Math.abs(dc)) !== 1);
  }
  set(n - 8, 8, true);   // módulo oscuro fijo
  for (let i = 0; i < 9; i++) { set(8, i, false); set(i, 8, false); }   // reserva del formato
  for (let i = 0; i < 8; i++) { set(8, n - 1 - i, false); set(n - 1 - i, 8, false); }
  set(n - 8, 8, true);
  if (v >= 7) for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) { set(i, n - 11 + j, false); set(n - 11 + j, i, false); }

  const codewords = interleave(encodeData(bytes, v), v);
  const bits = [];
  codewords.forEach((w) => { for (let i = 7; i >= 0; i--) bits.push((w >> i) & 1); });
  if (v >= 2 && v <= 6) for (let i = 0; i < 7; i++) bits.push(0);
  let k = 0;
  for (let right = n - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < 2; j++) {
        const c = right - j;
        const r = ((right + 1) & 2) === 0 ? n - 1 - i : i;   // sentido alterno de las columnas
        if (fn[r][c]) continue;
        mod[r][c] = k < bits.length ? bits[k] === 1 : false;
        k++;
      }
    }
  }

  const draw = (mask) => {
    const m = mod.map((row) => row.slice());
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (!fn[r][c] && MASKS[mask](r, c)) m[r][c] = !m[r][c];
    const fmt = bch((0b00 << 3) | mask, 0b10100110111, 10) ^ 0b101010000010010;   // nivel M = 00
    const bit = (i) => ((fmt >> i) & 1) === 1;
    for (let i = 0; i <= 5; i++) m[i][8] = bit(i);
    m[7][8] = bit(6); m[8][8] = bit(7); m[8][7] = bit(8);
    for (let i = 9; i < 15; i++) m[8][14 - i] = bit(i);
    for (let i = 0; i < 8; i++) m[8][n - 1 - i] = bit(i);
    for (let i = 8; i < 15; i++) m[n - 15 + i][8] = bit(i);
    m[n - 8][8] = true;
    if (v >= 7) {
      const info = bch(v, 0b1111100100101, 12);
      for (let i = 0; i < 18; i++) { const b = ((info >> i) & 1) === 1; m[Math.floor(i / 3)][n - 11 + (i % 3)] = b; m[n - 11 + (i % 3)][Math.floor(i / 3)] = b; }
    }
    return m;
  };
  let best = null;
  let bestScore = Infinity;
  for (let mask = 0; mask < 8; mask++) {
    const m = draw(mask);
    const score = penalty(m);
    if (score < bestScore) { bestScore = score; best = m; }
  }
  return best;
}

/** El QR como SVG (con margen blanco de 4 módulos, que los lectores necesitan). */
export function qrSvg(text, { dark = '#150e0c', light = '#ffffff' } = {}) {
  const m = qrMatrix(text);
  const n = m.length;
  const size = n + 8;
  let d = '';
  m.forEach((row, r) => row.forEach((on, c) => { if (on) d += `M${c + 4} ${r + 4}h1v1h-1z`; }));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges" role="img" aria-label="QR"><rect width="${size}" height="${size}" fill="${light}"/><path d="${d}" fill="${dark}"/></svg>`;
}
