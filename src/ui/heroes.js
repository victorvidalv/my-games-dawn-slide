import { Music, setTensionFx } from '../audio/music.js';
import { $, cssUrl } from '../dom.js';
import { saveRun } from '../game/session.js';
import { HEROES, canHint, bonusTurns } from '../game/heroes.js';
import { reviveCost } from '../game/shop.js';
import { S, heroOf, pathOf, persist, store } from '../state.js';
import { boardEl, layout, updateHud } from './board.js';
import { heroArt } from './story.js';
import { icon } from './icons.js';
import { playReviveEffect } from './turns.js';
import { powerState } from '../game/powers.js';
import { startOptions } from '../game/starts.js';
import { heroicPath, heroicHintsLeft, powerFactor } from '../game/routes.js';
import { bossCapFor } from '../game/bosses.js';
import { preloadAwakening } from './power-art.js';
import { numLocale } from '../i18n.js';
function heroMarkup(h,pose='start'){return `<svg xmlns="http://www.w3.org/2000/svg" class="hero-art" viewBox="0 0 100 145" role="img" aria-label="${h.name}, ${h.role}"><defs><clipPath id="portrait-${h.id}-${pose}"><rect width="100" height="145" rx="16"/></clipPath></defs><image href="${heroArt(h.id,pose)}" width="100" height="145" preserveAspectRatio="xMidYMin slice" clip-path="url(#portrait-${h.id}-${pose})"/><rect x="1" y="1" width="98" height="143" rx="16" fill="none" stroke="${h.color}" stroke-opacity=".65" stroke-width="2"/></svg>`}
export function syncHero(id=S.run?.hero){const h=heroOf(id);const art=document.querySelector('#travel .traveler>.hero-art');if(art)art.outerHTML=heroMarkup(h,'map');document.documentElement.style.setProperty('--hero-color',h.color);if(h.id!=='lia'&&!matchMedia('(prefers-reduced-motion: reduce)').matches)preloadAwakening(h.id).catch(()=>{})}
export function chooseHero(start,mode){
 return new Promise(resolve=>{
  const modal=$('heroSelect'),cards=$('heroCards');let selected=heroOf(store.heroChoice||S.run?.hero).id;
  const reached=store.paths['c'+start]?.level||0,options=startOptions(reached);let from=1;
  const renderStarts=()=>{
   const box=$('heroStarts');
   box.innerHTML=options.map(o=>`<button type="button" class="start-chip${o.level===from?' selected':''}${o.unlocked?'':' locked'}" role="radio" aria-checked="${o.level===from}" data-level="${o.level}" ${o.unlocked?'':'aria-disabled="true"'} aria-label="${o.level===1?'Desde el principio':o.unlocked?'Empezar desde el nivel '+o.level:'Nivel '+o.level+' bloqueado: llega a él en este camino para desbloquearlo'}">${o.unlocked?'':icon('lock')}<b>${o.level===1?'Inicio':'Nivel '+o.level}</b><small>${o.level===1?'Nivel 1':o.unlocked?'Desbloqueado':'Alcanza el '+o.level}</small></button>`).join('');
   const next=options.find(o=>!o.unlocked);
   $('heroStartNote').textContent=next?`Llega al nivel ${next.level} en este camino para poder empezar desde ahí.`:'Elige desde dónde quieres empezar.';
   box.querySelectorAll('button').forEach(b=>b.onclick=()=>{const o=options.find(x=>x.level===+b.dataset.level);if(!o.unlocked){b.classList.remove('shake');void b.offsetWidth;b.classList.add('shake');$('heroStartNote').textContent=`Alcanza el nivel ${o.level} en este camino para desbloquearlo.`;return}from=o.level;renderStarts();$('heroStarts').querySelector(`[data-level="${from}"]`).focus();$('heroConfirm').textContent=from===1?'Comenzar aventura ➜':`Comenzar desde el nivel ${from} ➜`});
  };
  $('heroPath').textContent=`${pathOf(start).n.toUpperCase()} · AVENTURA`;
  const render=()=>{const h=heroOf(selected);modal.style.setProperty('--chosen',h.color);modal.style.setProperty('--hero-scene',cssUrl(`heroes/${h.id}.webp`));
   cards.innerHTML=HEROES.map(v=>`<button class="hero-choice ${v.id===selected?'selected':''}" role="radio" aria-checked="${v.id===selected}" tabindex="${v.id===selected?0:-1}" data-hero="${v.id}" style="--accent:${v.color}" aria-label="${v.name}: ${v.short}"><img src="${heroArt(v.id,v.id===selected?'ready':'start')}" alt="${v.name}, ${v.role}" width="360" height="720"><span class="hero-choice-name">${v.name}</span><span class="hero-check" aria-hidden="true">✓</span></button>`).join('');
   $('heroPowerIcon').innerHTML=icon(h.icon);$('heroPowerTitle').textContent=h.power;$('heroPowerShort').textContent=h.short;$('heroPowerDetail').textContent=h.detail;$('heroQuote').textContent=h.quote;const path=heroicPath(h.id);$('heroRouteIcon').innerHTML=icon(path.icon);$('heroRouteBenefit').textContent=path.benefit;$('heroRouteInfo').setAttribute('aria-label',`${path.name}: ${path.benefit}. Más difícil, desde el nivel 11.`);
   $('heroConfirm').textContent=from===1?'Comenzar aventura ➜':`Comenzar desde el nivel ${from} ➜`;renderStarts();
   cards.querySelectorAll('button').forEach(b=>b.onclick=()=>{selected=b.dataset.hero;render();cards.querySelector(`[data-hero="${selected}"]`).focus()});
  };
  const close=value=>{modal.classList.remove('show');modal.removeEventListener('keydown',keyboard);resolve(value)};
  const keyboard=e=>{if(['ArrowRight','ArrowLeft','ArrowUp','ArrowDown'].includes(e.key)&&cards.contains(document.activeElement)){e.preventDefault();const delta=e.key==='ArrowRight'||e.key==='ArrowDown'?1:-1;selected=HEROES[(HEROES.findIndex(h=>h.id===selected)+delta+3)%3].id;render();cards.querySelector(`[data-hero="${selected}"]`).focus()}else if(e.key==='Escape')close(null);else if(e.key==='Tab'){const bs=[...modal.querySelectorAll('button')].filter(b=>b.tabIndex>=0);if(e.shiftKey&&document.activeElement===bs[0]){e.preventDefault();bs.at(-1).focus()}else if(!e.shiftKey&&document.activeElement===bs.at(-1)){e.preventDefault();bs[0].focus()}}};
  $('heroCancel').onclick=()=>close(null);$('heroConfirm').onclick=()=>{store.heroChoice=selected;persist();close({hero:selected,from})};render();modal.classList.add('show');Music.scene('heroes');modal.addEventListener('keydown',keyboard);cards.querySelector('[aria-checked=true]').focus();
 });
}
export function updateHeroHud(){
 if(!S.run||!S.G)return;const h=heroOf(),prac=S.run.mode==='p';
 $('heroHudImg').src=`heroes/${h.id}.webp`;$('heroHudImg').alt=h.name;$('heroHudName').textContent=h.name;
 const status=powerState(S.run,S.G);
 $('heroHudPower').textContent=h.id==='lia'?`+${bonusTurns('lia',S.G.opt,bossCapFor(S.G.n),powerFactor(S.run))} turnos de reserva`:status.reason;
 const free=heroicHintsLeft(S.run,S.G.n);
 $('hintN').textContent=prac?'∞':free?`${free} gratis`:S.run.hints;
 $('bHint').setAttribute('aria-label',`Pista. ${free} gratis en este tablero y ${S.run.hints} en reserva.`);$('bHint').disabled=S.busy||!canHint(S.run,S.run.mode,S.G.n);
 $('bUndo').hidden=true;
 const button=$('bPower');button.hidden=h.id==='lia';button.disabled=S.busy||!status.ok;
 button.dataset.hero=h.id;$('powerIcon').innerHTML=icon(h.id==='jean'?'clock':'stars');
 $('powerName').textContent=h.power;$('powerNote').textContent=status.reason;
 button.setAttribute('aria-label',`${h.power}. ${status.reason}`);

}
/** Pantalla de «otra oportunidad»: la vida gratis de Lía o un revivir comprado (se repite el tablero con 0 movimientos). */
export function showRescue(kind=S.run?.rescue?.kind||'lia'){
 const revive=kind==='revive',learn=kind==='learn',h=heroOf();
 S.G.done=true;S.busy=true;boardEl.classList.add('board-lock');setTensionFx(0,false);Music.duck(.3);
 $('rescueHero').src=heroArt(revive||learn?h.id:'lia',learn?'story':'defeat');$('rescueHero').alt=learn?h.name:revive?`${h.name} te da otra oportunidad`:'Lía protege la aventura';
 $('rescueIcon').innerHTML=icon(learn?'undo':revive?'flame':'heart');
 $('rescueTag').textContent=learn?'PRIMEROS PASOS · SIN PENALIZACIÓN':revive?'REVIVIR · COMPRADO CON TUS PUNTOS':'PODER DE LÍA · UNA VEZ POR PARTIDA';
 $('rescueTitle').textContent=learn?'Te quedaste sin movimientos':revive?'¡Otra oportunidad!':'La aventura sigue';
 $('rescueText').textContent=learn?'En tu primera ciudad puedes repetir el tablero sin perder nada. Fíjate en el Límite: a partir del nivel 10, quedarte sin movimientos termina la partida.':revive?`Pagaste por revivir. Repites este mismo tablero desde cero y conservas tus puntos y tus pistas.${S.run.revive>0?` Te queda ${S.run.revive} revivir guardado.`:''}`:'Lía te da una segunda oportunidad. Repites este mismo tablero desde cero y conservas tus puntos y tus pistas.';
 $('rescueContinue').textContent=learn?'Repetir tablero':revive?'Revivir':'Activar poder';
 $('rescue').classList.add('show');$('rescueContinue').focus();
 $('rescueContinue').onclick=()=>{
  if(!S.run?.rescue)return;S.G.pos=S.G.start.slice();S.G.moves=0;S.G.hist=[];S.G.done=false;S.G.limit-=(S.G.bought||0);S.G.bought=0;delete S.run.rescue;saveRun();
  $('rescue').classList.remove('show');boardEl.classList.remove('board-lock');S.busy=false;$('bUndo').disabled=true;layout();updateHud();Music.duck(1);
  playReviveEffect(learn?'¡OTRA VEZ!':revive?'¡RENACER!':'¡PODER DE LÍA!',!revive);
  $('msg').textContent=learn?'El tablero empieza de nuevo. Piensa cada movimiento.':revive?'Revivir usado. ¡Este tablero empieza de nuevo!':'Poder de Lía activado. ¡Este tablero empieza de nuevo!';
 };
}

/** Pantalla completa del dios nórdico tras perder: elegir Revivir (−33 % pts, solo 1 vez) o Finalizar. */
export function showReviveOffer(){
 const modal=$('reviveOffer'),now=S.run?.score||0,cost=reviveCost(now),after=Math.max(0,now-cost),fmt=n=>n.toLocaleString(numLocale());
 S.G.done=true;S.busy=true;boardEl.classList.add('board-lock');setTensionFx(0,false);Music.duck(.3);
 $('reviveNow').textContent=fmt(now);
 $('reviveCost').textContent=`−${fmt(cost)}`;
 $('reviveAfter').textContent=fmt(after);
 $('reviveBtnNote').textContent=`Pierdes ${fmt(cost)} pts · Reinicia el tablero (solo 1 vez)`;
 return new Promise(resolve=>{
  let picked=false;
  const pick=yes=>{if(picked)return;picked=true;modal.classList.remove('show');modal.removeEventListener('keydown',onKey);resolve(yes)};
  const onKey=e=>{if(e.key==='Escape')pick(false)};
  $('reviveAccept').onclick=()=>pick(true);
  $('reviveEnd').onclick=()=>pick(false);
  modal.addEventListener('keydown',onKey);
  modal.classList.add('show');
  $('reviveAccept').focus();
 });
}
