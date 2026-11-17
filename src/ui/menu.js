import { Music, setTensionFx } from '../audio/music.js';
import { soundLabel, toggleSound } from '../audio/sound.js';
import { zoneIdx } from '../data/zones.js';
import { $, cssUrl } from '../dom.js';
import { leaveDaily, recordBest, resumeAdventure, saveRun, startRun } from '../game/session.js';
import { challengeById } from '../game/daily.js';
import { renderAchievements } from './achievements.js';
import { renderDaily } from './daily.js';
import { PATHS, S, heroOf, pathOf, persist, store } from '../state.js';
import { startOptions } from '../game/starts.js';
import { syncRouteStyle } from './board.js';
import { syncHero } from './heroes.js';
import { showMap } from './map.js';
import { heroArt } from './story.js';
/* ---------- Menú: elegir camino ---------- */
const MODE_INFO={
  c:'Sube puntos nivel a nivel. Si agotas los turnos (el doble del mínimo) sin sacar la llave, la partida termina.',
  p:'Sin puntos ni eliminación. Pistas ilimitadas y deshacer gratis. Ideal para aprender y relajarte.'
};
function renderPaths(){
  const mode='c',box=$('paths');box.innerHTML='';

  $('modeInfo').textContent=MODE_INFO[mode];
  PATHS.forEach(p=>{
    const rec=store.paths[mode+p.s],lvl=rec?rec.level:0,prog=lvl?Math.max(4,lvl):0;
    const big=mode==='c'?(rec&&rec.score?rec.score.toLocaleString(numLocale()):'—'):(lvl?lvl:'—');
    const lbl=mode==='c'?'RÉCORD':'NIVEL MÁX.';
    const txt=`${lvl>=100?'👑 ':''}Nivel máx. ${lvl}/100`;
    const opts=startOptions(lvl).slice(1),flags=opts.map(o=>`<i class="pflag ${o.unlocked?'on':'off'}" title="${o.level}"></i>`).join(''),flagsLabel=`Puntos de reinicio: ${opts.filter(o=>o.unlocked).map(o=>o.level).join(', ')||'ninguno'}`;
    const d=document.createElement('div');d.className='path';d.style.setProperty('--pc',p.c);
    d.setAttribute('role','button');d.tabIndex=0;
    d.innerHTML=`<div class="pemo">${p.e}</div>
      <div class="pinfo"><b>${p.n}</b><small>${p.d}</small></div>
      <div class="pscore"><small>${lbl}</small><b>${big}</b></div>
      <div class="pach"><div class="pbar"><i style="width:${prog}%"></i></div><span class="prow"><em>${txt}</em><b class="pflags" role="img" aria-label="${flagsLabel}">${flags}</b></span></div>`;
    d.onkeydown=(e)=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();pickPath(p.s,mode)}};
    d.onclick=()=>pickPath(p.s,mode);
    box.appendChild(d);
  });
}
/* ---------- Ventana de confirmación con diseño propio ---------- */
import { ICON_NAMES, icon } from './icons.js';
import { lang, numLocale, setLang } from '../i18n.js';
import { leaveBossPhase } from './boss-phase.js';
export function ask({ico='❓',title,text,yes='Aceptar',no='Cancelar',danger=false}){
  return new Promise(res=>{
    $('askIco').innerHTML=ICON_NAMES.includes(ico)?icon(ico):ico;$('askTitle').textContent=title;$('askText').innerHTML=text;
    const y=$('askYes'),n=$('askNo');y.textContent=yes;n.textContent=no;y.className=danger?'danger':'primary';
    const done=v=>{$('ask').classList.remove('show');y.onclick=n.onclick=null;res(v)};
    y.onclick=()=>done(true);n.onclick=()=>done(false);
    $('ask').classList.add('show');
  });
}
async function pickPath(s,mode){
  mode='c';
  const active=S.run&&S.G&&!S.G.done,p=pathOf(s);
  if(active||store.run){
    const cur=active?S.run:store.run;
    const ok=await ask({ico:'🗺️',danger:true,yes:'Sí, empezar',no:'Volver',
      title:active?'¿Abandonar esta partida?':'¿Descartar la partida guardada?',
      text:(active?'Dejas la partida en curso.':'Se pierde la partida guardada.')+` Lo conseguido (${cur.mode==='p'?'nivel '+cur.level:cur.score.toLocaleString(numLocale())+' pts, nivel '+cur.level}) cuenta para tu máximo.<br><br>Empezarás <b>${p.n}</b> · Aventura.`});
    if(!ok) return;
  }
  $('menu').classList.remove('show');$('pause').classList.remove('show');Music.muffle(false);
  startRun(s,mode);
}
/* ---------- Opciones (pausa) ---------- */
function openPause(){
 if(!S.run||!S.G||S.G.done)return;
 const daily=S.run.daily;
 $('pauseContext').textContent=daily?`Reto diario · ${challengeById(daily.id).name}`:`${heroOf().name} · Nivel ${S.run.level} de 100`;
 $('pauseHero').hidden=!!daily;$('pProgress').hidden=$('pSave').hidden=!!daily;$('pQuit').firstElementChild.textContent=daily?'Salir del reto':'Terminar';
 $('pauseHero').src=heroArt(heroOf().id,'story');$('pause').style.setProperty('--pause-scene',cssUrl(`backgrounds/zone-${zoneIdx(S.run.level)+1}.webp`));
 soundLabel();$('pause').classList.add('show');Music.muffle(true);$('pResume').focus();
}
function closePause(){$('pause').classList.remove('show');Music.muffle(false)}
$('bMenu').onclick=()=>{ if(S.busy)return; if(S.run&&S.G&&!S.G.done)openPause(); else openMenu(); };
$('pResume').onclick=closePause;
$('pause').addEventListener('keydown',e=>{
 if(e.key==='Escape'){e.preventDefault();closePause();return}
 if(e.key!=='Tab')return;const buttons=[...$('pause').querySelectorAll('button')],first=buttons[0],last=buttons.at(-1);
 if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
});
$('pProgress').onclick=async()=>{
 if(!S.run||!S.G||S.G.done)return;const session=S.run,wasBusy=S.busy;S.busy=true;$('pause').classList.remove('show');
 const zone=zoneIdx(S.run.level);await showMap(zone,zone,{overview:true});S.busy=wasBusy;
 if(S.run===session&&!S.G.done)openPause();
};
$('pSave').onclick=()=>{
 if(!S.run||!S.G||S.G.done)return;
 saveRun();S.G.done=true;S.run=null;S.busy=false;
 $('pause').classList.remove('show');Music.stop(.2);setTensionFx(0,false);openMenu();
};
$('pQuit').onclick=()=>{
 if(!S.run)return;
 if(S.run.daily){leaveDaily();$('pause').classList.remove('show');openMenu('daily');return}recordBest(true);store.run=null;if(S.G)S.G.done=true;S.run=null;S.busy=false;persist();
 $('pause').classList.remove('show');Music.stop(.2);setTensionFx(0,false);openMenu();
};
$('pSound').onclick=toggleSound;
const continueLabel=(sr)=>`▶ Continuar<small>${pathOf(sr.start||1).n} · Nivel ${sr.level}`+(sr.mode==='p'?' · Práctica':` · ${sr.score.toLocaleString(numLocale())} pts`)+'</small>';
/* Pestañas del menú: Aventura · Retos diarios · Logros (los tres comparten la misma placa) */
const TABS=['adv','daily','ach'];
let tabNow='adv';
function showTab(tab){
  tabNow=TABS.includes(tab)?tab:'adv';
  $('menuCard').dataset.tab=tabNow;
  document.querySelectorAll('.menu-tab').forEach(b=>{const on=b.dataset.tab===tabNow;b.setAttribute('aria-selected',String(on));b.tabIndex=on?0:-1});
  $('panelDaily').hidden=tabNow!=='daily';$('panelAch').hidden=tabNow!=='ach';
  if(tabNow==='daily')renderDaily();else if(tabNow==='ach')renderAchievements();
  $('menuCard').scrollTop=0;
}
document.querySelectorAll('.menu-tab').forEach(b=>{b.onclick=()=>showTab(b.dataset.tab)});
$('menuTabs').addEventListener('keydown',e=>{
  if(e.key!=='ArrowRight'&&e.key!=='ArrowLeft')return;e.preventDefault();
  const next=TABS[(TABS.indexOf(tabNow)+(e.key==='ArrowRight'?1:2))%3];showTab(next);document.querySelector(`.menu-tab[data-tab="${next}"]`).focus();
});
export function openMenu(tab=tabNow){
  syncRouteStyle();
  renderPaths();
  renderDaily();                                  // también fuera de su pestaña: marca si el reto de hoy está pendiente
  showTab(tab);
  const active=S.run&&S.G&&!S.G.done, canCont=Number.isFinite(store.run?.level)&&!active;
  if(!active)leaveBossPhase();                    // el menú principal no lleva el ambiente de jefe
  const b=$('bContinue');b.style.display=canCont?'':'none';
  if(canCont)b.innerHTML=continueLabel(store.run);
  $('bResume').style.display=active?'':'none';
  $('menu').classList.add('show');
  if(active)Music.muffle(true);        // hay un nivel en pausa debajo: su música suena apagada
  else Music.scene('menu');            // sin partida: tema del menú principal
}

$('bResume').onclick=()=>{$('menu').classList.remove('show');Music.muffle(false)};
$('bContinue').onclick=()=>{
  $('menu').classList.remove('show');Music.muffle(false);
  if(S.run&&S.G&&!S.G.done) return;
  if(!Number.isFinite(store.run?.level)||!Number.isFinite(store.run?.seed)){store.run=null;persist();openMenu();$('menu').classList.add('show');return}   // sin partida guardada válida no hay nada que continuar
  S.run={start:1,mode:'c',hero:'lia',lifeUsed:false,revive:0,revivesBought:0,undoUsedAt:0,undoUsedLevel:0,undoUsedCount:0,vanAwardedAt:0,recBroken:false,...store.run};syncHero();
  resumeAdventure();
};


/* Selector de idioma (bajo el menú): inglés por defecto; el cambio es instantáneo y la música sigue sonando */
const paintLang=()=>document.querySelectorAll('.lang-btn').forEach((b)=>b.setAttribute('aria-pressed',String(b.dataset.lang===lang)));
document.querySelectorAll('.lang-btn').forEach((b)=>{b.onclick=()=>setLang(b.dataset.lang)});
paintLang();
document.addEventListener('langchange',()=>{
  paintLang();
  renderPaths();                                  // récords y niveles con el formato de números del idioma
  showTab(tabNow);
  const sr=store.run;if($('bContinue').style.display!=='none'&&sr)$('bContinue').innerHTML=continueLabel(sr);
});
