/**
 * Aligera las imágenes de public/ sin cambiar su tamaño en píxeles: vuelve a codificar cada WebP (y la imagen social
 * JPG) con más compresión y solo la reemplaza si queda al menos un 8 % más liviana. Es seguro repetirlo: lo que ya está
 * optimizado no se toca. Las animadas (WebP de varios fotogramas) se saltan.
 *
 *   npm run images                 → optimiza todo public/
 *   npm run images -- --dry        → solo informa cuánto se ahorraría
 *   npm run images -- --q 72       → calidad WebP (por defecto 76)
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, extname } from 'node:path';
import sharp from 'sharp';

const arg = (name, def) => {
  const i = process.argv.indexOf('--' + name);
  return i > 0 ? process.argv[i + 1] : def;
};
const DRY = process.argv.includes('--dry');
const QUALITY = Number(arg('q', 76));
const MIN_GAIN = 0.08;
const ROOT = new URL('../public/', import.meta.url).pathname;

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });

let before = 0;
let after = 0;
let changed = 0;
for (const file of walk(ROOT)) {
  const ext = extname(file).toLowerCase();
  if (!['.webp', '.jpg', '.jpeg'].includes(ext)) continue;
  const input = readFileSync(file);
  const meta = await sharp(input, { animated: true }).metadata();
  if ((meta.pages || 1) > 1) continue; // animada: se deja como está
  const out =
    ext === '.webp'
      ? await sharp(input).webp({ quality: QUALITY, effort: 6, smartSubsample: true }).toBuffer()
      : await sharp(input).jpeg({ quality: 80, mozjpeg: true }).toBuffer();
  before += input.length;
  const gain = 1 - out.length / input.length;
  if (gain >= MIN_GAIN) {
    after += out.length;
    changed++;
    if (!DRY) writeFileSync(file, out);
    console.log(
      `${file.replace(ROOT, 'public/')}: ${Math.round(input.length / 1024)} → ${Math.round(out.length / 1024)} KB`,
    );
  } else after += input.length;
}
console.log(
  `\n${DRY ? '(simulación) ' : ''}${changed} imágenes · ${Math.round(before / 1024)} KB → ${Math.round(after / 1024)} KB (−${Math.round((1 - after / before) * 100)} %)`,
);
