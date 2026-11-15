import { tone, vib } from '../audio/sound.js';
import { $ } from '../dom.js';
import { occupancy } from '../engine/board.js';
import { collectSeal, sealReward } from '../game/seals.js';
import { recordBest } from '../game/session.js';
import { S } from '../state.js';
import { icon } from './icons.js';
import { burst } from './fx.js';

export function renderSeal() {
  const G=S.G, status=$('sealStatus');if(!G||!S.run){status.hidden=true;return;}
  const seal=G.seal;status.hidden=!seal;
  if(!seal)return;
  const board=$('board'),size=board.clientWidth/6;
  if(!G.sealArt?.floor.isConnected){
    const floor=document.createElement('div');floor.className='seal-floor';floor.setAttribute('aria-hidden','true');
    floor.innerHTML=`<span class="seal-ring"></span><span class="seal-glyph">${icon('seal')}</span>`;
    board.appendChild(floor);
    const marker=document.createElement('span');marker.className='seal-piece-mark';marker.setAttribute('aria-hidden','true');marker.innerHTML=icon('seal');
    G.els[seal.piece]?.appendChild(marker);G.sealArt={floor,marker};
  }
  const {floor,marker}=G.sealArt;
  floor.style.left=seal.cell[1]*size+'px';floor.style.top=seal.cell[0]*size+'px';floor.style.width=floor.style.height=size+'px';
  const covered=occupancy(G.pieces,G.pos,G.walls)[seal.cell[0]*6+seal.cell[1]]>=0;
  floor.classList.toggle('covered',covered);floor.classList.toggle('collected',seal.collected);
  marker.hidden=seal.collected;G.els[seal.piece]?.classList.toggle('seal-carrier',!seal.collected);
  const value=sealReward(S.run,seal).toLocaleString('de-DE');
  const labelKey=`${G.n}:${value}:${seal.collected}`;
  if(status.dataset.sealKey!==labelKey){status.innerHTML=`${icon('seal')}<span>${seal.collected?'Sello obtenido':'Sello opcional'} <b>+${value}</b>${seal.collected?'':'<small>Lleva la pieza de borde discontinuo al sello</small>'}</span>`;status.dataset.sealKey=labelKey;}
  status.classList.toggle('claimed',seal.collected);
  status.setAttribute('aria-label',seal.collected?`Sello obtenido, ${value} puntos.`:`Sello opcional: lleva la pieza de borde discontinuo sobre el sello con el mismo borde para ganar ${value} puntos. Puedes salir sin recogerlo.`);
}

export function processSealMove(before=S.G?.hist.at(-1)) {
  if(!S.G||!S.run)return 0;
  const value=collectSeal(S.run,S.G,before);if(!value)return 0;
  const G=S.G,board=$('board'),rect=board.getBoundingClientRect(),size=board.clientWidth/6;
  const x=rect.left+(G.seal.cell[1]+.5)*size,y=rect.top+(G.seal.cell[0]+.5)*size;
  $('score').textContent=S.run.score.toLocaleString('de-DE');recordBest();
  $('msg').textContent=`Sello obtenido: +${value.toLocaleString('de-DE')} puntos.`;
  const pop=document.createElement('div');pop.className='seal-points-pop';pop.setAttribute('aria-hidden','true');
  pop.innerHTML=`${icon('seal')}<b>+${value.toLocaleString('de-DE')}</b>`;pop.style.left=Math.max(72,Math.min(innerWidth-72,x))+'px';pop.style.top=y+'px';document.body.appendChild(pop);
  board.classList.add('seal-reward');setTimeout(()=>{pop.remove();board.classList.remove('seal-reward')},1100);
  if(!matchMedia('(prefers-reduced-motion: reduce)').matches)burst(x,y,18,['#e9cc82','#f7e8bd','#d68159'],4);
  tone(523,.16,'triangle',.05);tone(784,.20,'sine',.045,.07);tone(1047,.30,'sine',.04,.14);vib([12,22,12]);
  renderSeal();return value;
}
