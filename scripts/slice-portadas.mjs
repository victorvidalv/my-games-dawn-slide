/**
 * Corta las láminas de img-originales/portada en las imágenes de Personalizar → Portada:
 *   · Héroes  → láminas con los héroes recortados (fondo transparente): public/portada/heroes/<id>.webp
 *               Cada escena se recorta, se limpia el halo semitransparente de color y se ajusta a su silueta.
 *   · Fondo   → láminas de paisajes (4 escenas cada una): public/portada/fondos/<id>.webp
 * Todas se pueden reemplazar a mano: basta con sustituir el archivo (mismo nombre, WebP).
 *
 *   node scripts/slice-portadas.mjs
 */
import { mkdirSync } from 'node:fs';
import sharp from 'sharp';

const SRC_HEROES = new URL('../img-originales/portada/heroes/', import.meta.url).pathname;
const SRC_FONDOS = new URL('../img-originales/portada/fondos/', import.meta.url).pathname;
const OUT = new URL('../public/portada/', import.meta.url).pathname;
mkdirSync(OUT + 'heroes', { recursive: true });
mkdirSync(OUT + 'fondos', { recursive: true });
mkdirSync(OUT + 'thumbs', { recursive: true });
/** Miniatura para las cuadrículas de Personalizar (pesa ~5-12 KB): la imagen completa solo se baja al probarla o equiparla. */
const thumb = (img, id, width) =>
  img
    .resize({ width, withoutEnlargement: true })
    .webp({ quality: 50, alphaQuality: 60, effort: 6 })
    .toFile(`${OUT}thumbs/${id}.webp`);

/* ---------- héroes recortados (2×2 escenas por lámina, orden de lectura) ---------- */
const HEROES = [
  {
    file: 'Four Worlds, One Adventuring Trio.png',
    grid: [2, 2],
    ids: ['alba-arcana', 'vapor-dorado', 'noche-carmesi', 'neon-cibernetico'],
  },
  {
    file: 'Four Magical Trio Adventures.png',
    grid: [2, 2],
    ids: ['magia-tiempo', 'magia-engranajes', 'magia-sangre', 'magia-digital'],
  },
  {
    file: 'Four-Themed Anime Trio Sticker Sheet.png',
    grid: [2, 2],
    ids: ['combate-arcano', 'combate-vapor', 'combate-sombras', 'combate-neon'],
  },
  { file: 'ChatGPT Image Nov 21, 2026 at 11_12_27 PM.png', grid: [2, 2], ids: ['descanso', 'mapa', 'pelea', 'oro'] },
  { file: 'Arcane Trio_ Gears, Magic, and Storms.png', grid: [1, 1], ids: ['tormenta'] },
];

/* ---------- fondos (paisajes, 2×2 escenas por lámina con una línea negra de separación) ---------- */
const FONDOS = [
  { file: 'Fantasy Landscape Adventure Collage.png', ids: ['bosque-cascada', 'mirador', 'muralla', 'puente-otono'] },
  {
    file: 'Four Mythical Cities Across the Skies.png',
    ids: ['ciudad-blanca', 'ciudad-linternas', 'fortaleza-lunar', 'ciudad-flotante'],
  },
  {
    file: 'Moonlit Samurai Realms_ Four-Panel Chronicle.png',
    ids: ['castillo-rojo', 'calle-cerezos', 'torii-gigante', 'puente-dragon'],
  },
  {
    file: 'Neon Cyber-Samurai Moonlit Realms.png',
    ids: ['neon-luna', 'plaza-neon', 'coloso-neon', 'santuario-carmesi'],
  },
];

/** Alfa limpio: lo que es casi transparente (halos de color) desaparece y el resto se endurece un poco. */
const LOW = 120,
  HIGH = 215;
async function cutout(input) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  for (let i = 3; i < data.length; i += 4) {
    const a = data[i];
    data[i] = a <= LOW ? 0 : a >= HIGH ? 255 : Math.round(((a - LOW) / (HIGH - LOW)) * 255);
  }
  // Quita los fragmentos sueltos (restos de la escena vecina): conserva solo las piezas grandes
  const label = new Int32Array(w * h),
    sizes = [0];
  for (let start = 0; start < w * h; start++) {
    if (label[start] || data[start * 4 + 3] === 0) continue;
    const id = sizes.length;
    let count = 0;
    const stack = [start];
    label[start] = id;
    while (stack.length) {
      const k = stack.pop();
      count++;
      const x = k % w,
        y = (k - x) / w;
      for (const [nx, ny] of [
        [x + 1, y],
        [x - 1, y],
        [x, y + 1],
        [x, y - 1],
      ]) {
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const n = ny * w + nx;
        if (!label[n] && data[n * 4 + 3] !== 0) {
          label[n] = id;
          stack.push(n);
        }
      }
    }
    sizes.push(count);
  }
  const biggest = Math.max(...sizes);
  // Las piezas que tocan el borde de la escena y son pequeñas son restos de la escena vecina
  const onEdge = new Set();
  for (let x = 0; x < w; x++) for (const y of [0, h - 1]) if (label[y * w + x]) onEdge.add(label[y * w + x]);
  for (let y = 0; y < h; y++) for (const x of [0, w - 1]) if (label[y * w + x]) onEdge.add(label[y * w + x]);
  for (let k = 0; k < w * h; k++) {
    const id = label[k];
    if (id && (sizes[id] < biggest * 0.015 || (onEdge.has(id) && sizes[id] < biggest * 0.08))) data[k * 4 + 3] = 0;
  }
  return sharp(data, { raw: info })
    .trim({ threshold: 1 })
    .extend({ top: 8, bottom: 8, left: 8, right: 8, background: { r: 0, g: 0, b: 0, alpha: 0 } });
}

for (const sheet of HEROES) {
  const { width, height } = await sharp(SRC_HEROES + sheet.file).metadata();
  const [cols, rows] = sheet.grid;
  const cw = Math.floor(width / cols),
    ch = Math.floor(height / rows);
  for (let i = 0; i < sheet.ids.length; i++) {
    const cell = await sharp(SRC_HEROES + sheet.file)
      .extract({ left: (i % cols) * cw, top: Math.floor(i / cols) * ch, width: cw, height: ch })
      .png()
      .toBuffer();
    const img = await cutout(cell);
    const out = await img
      .resize({ width: 1000, height: 1400, fit: 'inside', kernel: 'lanczos3' })
      .sharpen({ sigma: 0.8, m1: 0.7, m2: 1.6 })
      .webp({ quality: 80, alphaQuality: 90, effort: 6, smartSubsample: true })
      .toBuffer();
    await sharp(out).toFile(`${OUT}heroes/${sheet.ids[i]}.webp`);
    await thumb(sharp(out), sheet.ids[i], 240);
    console.log('héroes ·', sheet.ids[i]);
  }
}

const INSET = 7; // quita la línea negra que separa las escenas
for (const sheet of FONDOS) {
  const { width, height } = await sharp(SRC_FONDOS + sheet.file).metadata();
  const cw = Math.floor(width / 2),
    ch = Math.floor(height / 2);
  for (let i = 0; i < 4; i++) {
    const out = await sharp(SRC_FONDOS + sheet.file)
      .extract({
        left: (i % 2) * cw + INSET,
        top: Math.floor(i / 2) * ch + INSET,
        width: cw - 2 * INSET,
        height: ch - 2 * INSET,
      })
      .resize({ width: 1440, kernel: 'lanczos3' })
      .sharpen({ sigma: 0.8, m1: 0.7, m2: 1.6 })
      .webp({ quality: 74, effort: 6, smartSubsample: true })
      .toBuffer();
    await sharp(out).toFile(`${OUT}fondos/${sheet.ids[i]}.webp`);
    await thumb(sharp(out), sheet.ids[i], 260);
    console.log('fondo ·', sheet.ids[i]);
  }
}
