/**
 * Valida las propuestas de un héroe (jean, juth o lia), genera los archivos .mid en output/midi/ y construye
 * output/<héroe>-canciones.html (un solo archivo autónomo para abrir con doble clic).
 * Uso: node scripts/build-song-preview.mjs <jean|juth|lia>
 * Los datos de cada héroe están en tools/song-preview/config.js y sus propuestas en tools/song-preview/themes-<héroe>-preview.js.
 */
import { build } from 'vite';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { CITY_REPERTOIRES, SCALES, parseBar, shiftBar, shiftEntry } from '../src/audio/themes.js';
import { themeToMidiBytes } from '../src/tools/midi-export.js';
import { PREVIEWS } from '../tools/song-preview/config.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const hero = process.argv[2];
const CFG = PREVIEWS[hero];
if (!CFG) {
  console.error(`Uso: node scripts/build-song-preview.mjs <${Object.keys(PREVIEWS).join('|')}>`);
  process.exit(1);
}
const dataFile = resolve(ROOT, `tools/song-preview/themes-${hero}-preview.js`);
const SONGS = await import(pathToFileURL(dataFile).href);
const IMPROVED_DATA = SONGS[`${CFG.prefix}_IMPROVED_DATA`];
const HAPPY_DATA = SONGS[`${CFG.prefix}_HAPPY_DATA`];

function compile(base, song) {
  const raw = { ...base, ...song };
  let d = raw;
  if (raw.B) {
    const n = SCALES[raw.sc].length;
    const { k, end, endProg } = raw.B;
    d = {
      ...raw,
      tuneText: [...raw.tuneText, ...raw.tuneText.slice(0, 6).map((b) => shiftBar(b, k)), ...end],
      prog: [...raw.prog, ...raw.prog.slice(0, 6).map((e) => shiftEntry(e, k, n)), ...endProg],
    };
  }
  return {
    padW: 'sine',
    padV: 0.016,
    bassV: 0.07,
    compV: 0.02,
    arpV: 0.02,
    leadV: CFG.leadV,
    epic: 1,
    groove: CFG.groove,
    echo: true,
    ...d,
    tune: d.tuneText.map((b) => parseBar(b).notes),
  };
}

function validateAndWriteMidi(label, list, dirName) {
  const outDir = resolve(ROOT, 'output/midi', dirName);
  mkdirSync(outDir, { recursive: true });
  const bases = CITY_REPERTOIRES[CFG.repertoire];
  list.forEach((song, idx) => {
    const th = compile(bases[idx], song);
    th.tuneText.forEach((barText, bIdx) => {
      const { length } = parseBar(barText);
      if (length !== 16) {
        throw new Error(`${label} · ${song.name} compás ${bIdx + 1} suma ${length} pasos (esperado 16): "${barText}"`);
      }
    });
    const slug = song.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const file = resolve(outDir, `${String(idx + 1).padStart(2, '0')}-${slug}.mid`);
    writeFileSync(file, themeToMidiBytes(th, { bars: 32 }));
  });
  console.log(`MIDI (${label}): 10 archivos en ${outDir}`);
}

validateAndWriteMidi('Mejorada', IMPROVED_DATA, `${hero}-mejorada`);
validateAndWriteMidi('Más alegre', HAPPY_DATA, `${hero}-alegre`);

const out = await build({
  root: ROOT,
  configFile: false,
  logLevel: 'silent',
  define: { __APP_VERSION__: JSON.stringify(`${hero}-preview`), __PREVIEW__: JSON.stringify(CFG) },
  resolve: { alias: { '@song-data': dataFile } },
  build: {
    write: false,
    minify: true,
    lib: { entry: resolve(ROOT, 'tools/song-preview/viewer.js'), formats: ['iife'], name: CFG.global },
  },
});

const code = (Array.isArray(out) ? out[0] : out).output[0].code.replace(/<\/script/gi, '<\\/script');

const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${CFG.title}</title>
<style>
  :root{color-scheme:dark;--bg:#101c24;--card:#172b38;--ink:#efe4cb;--mut:#9cb0b8;--line:#ffffff1a;--acc:#e0907a;--gold:#ffd98a}
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.45 system-ui,sans-serif;padding:20px 14px 60px}
  main{max-width:1120px;margin:0 auto}
  h1{font:700 28px Georgia,serif;margin:0 0 6px}
  p.lead{color:var(--mut);margin:0 0 18px}
  .bar{position:sticky;top:0;z-index:5;display:flex;gap:10px;align-items:center;padding:10px 0;background:linear-gradient(var(--bg) 82%,#0000)}
  button{font:inherit;font-weight:700;color:var(--ink);background:#283945;border:1px solid var(--line);border-radius:9px;padding:7px 13px;cursor:pointer}
  button:hover{background:#344a59}
  button.on{background:#b66a53;border-color:var(--acc);color:#fff6e8}
  button.tab{font-size:13px;padding:5px 10px}
  button.tab.active{background:#3c5b6e;border-color:#74a8c4;color:#fff}
  button.sec,button.trk{font-size:12px;padding:4px 9px}
  button.trk.muted{opacity:.42;text-decoration:line-through}
  .card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:14px 16px;margin:0 0 16px}
  .head{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
  .head h2{font-size:19px;margin:0}.head small{color:var(--gold)}
  .head .sp{flex:1}
  .tabs{display:flex;gap:6px;flex-wrap:wrap}
  .meta{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}
  .tag{font-size:12px;padding:2px 9px;border-radius:99px;background:#ffffff10;color:var(--mut)}
  .controls{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:8px 0}
  .laywrap{margin-left:auto;color:var(--mut);font-size:13px}
  .laywrap input{vertical-align:middle;width:130px}
  .laywrap .lv{color:var(--gold)}
  .layers{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:6px 0;padding:7px 10px;background:#ffffff08;border-radius:9px;font-size:13px;color:var(--mut)}
  .chords{display:grid;grid-template-columns:repeat(16,1fr);gap:2px;margin:8px 0 4px;font-size:11px;text-align:center}
  .chords span{background:#ffffff0d;border-radius:4px;padding:2px 0;white-space:nowrap;overflow:hidden}
  .chords span.hit{background:#ffd98a33;color:var(--gold)}
  .roll{position:relative}
  svg{width:100%;height:auto;display:block;border-radius:8px;background:#0c1820}
  .cursor{position:absolute;top:0;bottom:0;width:2px;background:var(--gold);box-shadow:0 0 8px var(--gold);pointer-events:none;display:none}
</style>
</head>
<body>
<main>
  <h1>${CFG.h1}</h1>
  <p class="lead">${CFG.lead}</p>
  <div class="bar"><button id="stop">■ Parar todo</button><span id="now" class="tag">Nada sonando</span></div>
  <div id="list"></div>
  <button id="audioRecover" hidden></button>
</main>
<script>${code}</script>
</body>
</html>`;

const target = resolve(ROOT, `output/${hero}-canciones.html`);
writeFileSync(target, html);
console.log(`HTML listo: ${target} (${Math.round(html.length / 1024)} KB)`);
