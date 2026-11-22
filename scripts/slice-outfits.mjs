/**
 * Corta las láminas de atuendos (img-originales/atuendos/<héroe>-<n>: 5 conjuntos en columnas × 3 filas) en WebP sueltos:
 *   fila 1 → `adv` (cuerpo entero, aventura) · fila 2 → `sel` (busto, selección) · fila 3 → `act` (pose, selección).
 * Salida: public/heroes/outfits/<héroe>-<conjunto>-<adv|sel|act>.webp
 *
 *   node scripts/slice-outfits.mjs [carpeta-de-salida]
 */
import { mkdirSync } from 'node:fs';
import sharp from 'sharp';
import { OUTFIT_SHEETS } from '../src/game/outfit-sheets.js';

const SRC = new URL('../img-originales/atuendos/', import.meta.url).pathname;
const OUT = process.argv[2] || new URL('../public/heroes/outfits/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
/** Pasa a transparente el blanco liso conectado con el borde (el blanco de dentro del dibujo se respeta). */
async function keyOutWhite(input) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const white = (i) => data[i] > 226 && data[i + 1] > 226 && data[i + 2] > 226;
  const seen = new Uint8Array(w * h);
  const stack = [];
  const push = (x, y) => {
    const k = y * w + x;
    if (x < 0 || y < 0 || x >= w || y >= h || seen[k] || !white(k * 4)) return;
    seen[k] = 1;
    stack.push(k);
  };
  for (let x = 0; x < w; x++) (push(x, 0), push(x, h - 1));
  for (let y = 0; y < h; y++) (push(0, y), push(w - 1, y));
  while (stack.length) {
    const k = stack.pop(),
      x = k % w,
      y = (k - x) / w;
    data[k * 4 + 3] = 0;
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }
  return sharp(data, { raw: info });
}

const POSES = ['adv', 'sel', 'act'];
const INSET = 9; // quita las franjas del conjunto vecino que cruzan la cuadrícula

for (const sheet of OUTFIT_SHEETS) {
  const img = sharp(SRC + sheet.file);
  const { width } = await img.metadata();
  const cw = width / 5;
  for (let c = 0; c < 5; c++)
    for (let r = 0; r < 3; r++) {
      const top = sheet.rows[r],
        bottom = sheet.rows[r + 1];
      const left = Math.round(c * cw) + INSET,
        w = Math.round((c + 1) * cw) - Math.round(c * cw) - 2 * INSET;
      let cell = sharp(SRC + sheet.file).extract({ left, top, width: w, height: bottom - top });
      if (sheet.keyWhite) cell = await keyOutWhite(await cell.png().toBuffer());
      await cell
        .resize({ width: 440, kernel: 'lanczos3' }) // las láminas traen ~225–323 px por celda: se amplía con Lanczos y se afina
        .sharpen({ sigma: 0.8, m1: 0.7, m2: 1.6 })
        .webp({ quality: 72, alphaQuality: 85, effort: 6, smartSubsample: true })
        .toFile(`${OUT}/${sheet.hero}-${sheet.ids[c]}-${POSES[r]}.webp`);
    }
}
console.log('listo →', OUT);
