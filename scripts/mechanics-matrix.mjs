/**
 * Genera docs/matriz-mecanicas.html: matriz nivel × mecánica EDITABLE (un clic cambia la celda: vacío → ✓ presente → ★ tutorial aparte).
 * Parte del calendario actual del juego; al terminar de editarla, «Copiar JSON» y se pega para adaptar el juego.   node scripts/mechanics-matrix.mjs
 */
import { writeFileSync } from 'node:fs';
import { levelPlan, TUTORIALS } from '../src/game/mechanics.js';
import { rotatedLevels } from '../src/game/orientation.js';
import { rateAt, targetFor } from '../src/engine/difficulty.js';
import { bossRating } from '../src/game/bosses.js';
import { SEAL_LEVELS, requestedSealTier } from '../src/game/seals.js';

const COLS = [
  ['wall', 'Roca fija', '🪨'], ['heavy', 'Pesada', '⚖️'], ['gate', 'Candado', '🔒'], ['ice', 'Hielo', '❄️'], ['door', 'Portón', '🚪'], ['curse', 'Maleficio (giro)', '🌀'],
  ['seal1', 'Sello bronce', '🥉'], ['seal2', 'Sello plata', '🥈'], ['seal3', 'Sello oro', '🥇'],
];
const SEAL_FIRST = SEAL_LEVELS[0];
const curse = rotatedLevels(7);
const rows = [];
for (let l = 1; l <= 100; l++) {
  const p = levelPlan(l);
  const r = { level: l, boss: p.boss, min: [1, 50, 75].map((st) => targetFor(bossRating(l, rateAt(st, l)))) };   // mínimo de movimientos objetivo en cada camino
  for (const [id] of COLS) {
    const sealTier = id.startsWith('seal') ? +id.slice(4) : 0;
    const present = sealTier ? SEAL_LEVELS.includes(l) && requestedSealTier(l, 7) === sealTier : id === 'curse' ? curse.has(l) : p.mechanics.includes(id);
    const tutorial = sealTier ? present && l === SEAL_FIRST : TUTORIALS[id]?.level === l;
    r[id] = tutorial ? 2 : present ? 1 : 0;
  }
  rows.push(r);
}
const data = JSON.stringify({ cols: COLS, rows });
const html = `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>DAWNSLIDE · Matriz nivel × mecánica</title>
<style>
:root{--bg:#14101f;--card:#211a33;--line:#3a2f55;--gold:#f0cf86;--ok:#4fd1a1;--tut:#ffb454;--boss:#d95b43}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:#efe6ff;font:14px/1.4 system-ui,sans-serif;padding:14px}
h1{margin:0 0 4px;font-size:22px;color:var(--gold)}p.s{margin:0 0 10px;color:#bfb2dd}
.bar{position:sticky;top:0;z-index:5;background:var(--bg);padding:8px 0;display:flex;flex-wrap:wrap;gap:8px;align-items:center;border-bottom:1px solid var(--line)}
button{background:#3b2b66;color:#fff;border:1px solid #6b52b8;border-radius:8px;padding:7px 12px;font:inherit;cursor:pointer}button:hover{background:#4d3a85}
.legend span{display:inline-flex;align-items:center;gap:5px;margin-right:12px}
table{border-collapse:collapse;margin-top:8px;width:100%;max-width:980px}
th,td{border:1px solid var(--line);padding:0;text-align:center}th{position:sticky;top:46px;background:#2a2040;z-index:4;padding:6px 4px;font-size:12px}
td.lv{width:54px;font-weight:800;background:var(--card)}tr.boss td.lv{background:var(--boss);color:#fff}tr.decade td{border-bottom:3px solid #6b52b8}
td.c{width:70px;height:34px;cursor:pointer;user-select:none;font-size:18px}td.c:hover{outline:2px solid var(--gold);outline-offset:-2px}
td.c.s1{background:#1d4a3c;color:var(--ok)}td.c.s2{background:#5a3a10;color:var(--tut);font-weight:900}
td.mn{width:120px;font-weight:700;color:#ffe08a;font-size:13px}td.fam{width:150px;font-size:12px;color:#cdbff0;text-align:left;padding:0 8px}td.warn{width:210px;font-size:12px;color:#ff9a8a;text-align:left;padding:0 8px}
.cnt td{background:#2a2040;font-weight:700;padding:6px}
textarea{width:100%;max-width:980px;height:120px;background:#0e0a18;color:#cfe;border:1px solid var(--line);border-radius:8px;padding:8px;margin-top:10px;font:12px monospace}
</style>
<h1>Matriz nivel × mecánica</h1>
<p class="s">Haz clic en una celda: <b>vacío</b> → <b style="color:var(--ok)">✓ la mecánica aparece en ese nivel</b> → <b style="color:var(--tut)">★ hay TUTORIAL aparte (nivel extra) y además aparece</b> → vacío. Los jefes (rojo) son los niveles 10, 20…100. Se guarda solo en este navegador.</p>
<div class="bar"><button id="copy">Copiar JSON</button><button id="reset">Volver a la propuesta</button><button id="clear">Vaciar todo</button><span class="legend"><span>✓ aparece</span><span>★ tutorial + aparece</span></span><span id="msg"></span></div>
<table id="t"></table>
<textarea id="out" readonly placeholder="Al pulsar «Copiar JSON» aparece aquí (pégamelo)"></textarea>
<script>
const SRC=${data};const KEY='dawnslide-matrix-v3';
let rows=JSON.parse(localStorage.getItem(KEY)||'null')||JSON.parse(JSON.stringify(SRC.rows));
const cols=SRC.cols;
function famOf(r){const on=cols.filter(([id])=>id!=='curse'&&!id.startsWith('seal')&&r[id]).map(([id,n])=>n);return on.length?on.join(' + '):'normal'}
function warns(i){const r=rows[i],w=[];const news=cols.filter(([id])=>r[id]===2);if(news.length>1)w.push('2 tutoriales a la vez');
  for(const [id,n] of cols){if(r[id]===1){const first=rows.findIndex(x=>x[id]===2);if(first>=0&&first>i)w.push(n+' antes de su tutorial')}}
  if(r.boss&&r.curse)w.push('maleficio en jefe');if(r.boss&&(r.seal1||r.seal2||r.seal3))w.push('sello en jefe');if(cols.filter(([id])=>id.startsWith('seal')&&r[id]).length>1)w.push('2 sellos');return w.join(' · ')}
function draw(){const t=document.getElementById('t');
  t.innerHTML='<tr><th>Nivel</th>'+cols.map(([id,n,e])=>'<th>'+e+'<br>'+n+'</th>').join('')+'<th>Mín. turnos<br><small>Normal · Difícil · Experto</small></th><th>Tipo de tablero</th><th>Avisos</th></tr>'
  +rows.map((r,i)=>'<tr class="'+(r.boss?'boss ':'')+(r.level%10===0?'decade':'')+'"><td class="lv">'+r.level+(r.boss?' ☠':'')+'</td>'
    +cols.map(([id])=>'<td class="c s'+r[id]+'" data-i="'+i+'" data-id="'+id+'">'+(r[id]===2?'★':r[id]===1?'✓':'')+'</td>').join('')
    +'<td class="mn">'+r.min.join(' · ')+'</td><td class="fam">'+famOf(r)+(r.curse?' · girado':'')+(r.seal1?' · sello bronce':r.seal2?' · sello plata':r.seal3?' · sello oro':'')+'</td><td class="warn">'+warns(i)+'</td></tr>').join('')
  +'<tr class="cnt"><td>Total</td>'+cols.map(([id])=>'<td>'+rows.filter(r=>r[id]).length+' ('+rows.filter(r=>r[id]===2).length+'★)</td>').join('')+'<td></td><td></td><td></td></tr>';
  localStorage.setItem(KEY,JSON.stringify(rows))}
document.getElementById('t').addEventListener('click',e=>{const c=e.target.closest('td.c');if(!c)return;const r=rows[+c.dataset.i];r[c.dataset.id]=(r[c.dataset.id]+1)%3;draw()});
document.getElementById('reset').onclick=()=>{rows=JSON.parse(JSON.stringify(SRC.rows));draw()};
document.getElementById('clear').onclick=()=>{rows.forEach(r=>cols.forEach(([id])=>r[id]=0));draw()};
document.getElementById('copy').onclick=async()=>{const out={cols:cols.map(c=>c[0]),levels:Object.fromEntries(rows.map(r=>[r.level,Object.fromEntries(cols.map(([id])=>[id,r[id]]))]))};
  const txt=JSON.stringify(out);document.getElementById('out').value=txt;try{await navigator.clipboard.writeText(txt);document.getElementById('msg').textContent='¡Copiado!'}catch(_){document.getElementById('msg').textContent='Selecciona el texto de abajo y cópialo'}};
draw();
</script></html>`;
writeFileSync(new URL('../docs/matriz-mecanicas.html', import.meta.url), html);
console.log('docs/matriz-mecanicas.html listo');
