import { describe, it, expect } from 'vitest';
import {
  BONUS_KINDS, HERO_GAMES, bonusIndex, isBonusLevel, gameFor, createBonusPlan, ensureBonusPlan,
  memoryTap, memoryDone, memoryPart, sequenceTap, sequencePart, timingPosition, timingPoints, recordTiming, timingPart,
  sprintStart, sprintMove, sprintTimeout, sprintPart,
  bestMoveCurrent, bestMovePick, bestMovePart,
  maxPrize, bonusPrize, finishBonus, claimBonus,
} from '../src/game/minigames.js';
import { isValidState, minMoves, slideRange } from '../src/engine/index.js';

describe('cinco juegos por héroe, entrada directa y ciclo fijo',()=>{
 it('mantiene las nueve paradas intermedias y el ciclo de 5 mecánicas por héroe',()=>{
  const levels=Array.from({length:100},(_,i)=>i+1).filter(isBonusLevel);
  expect(levels).toEqual([15,25,35,45,55,65,75,85,95]);
  expect(levels.map(l=>bonusIndex(l)%5)).toEqual([0,1,2,3,4,0,1,2,3]);
  for(const hero of ['lia','jean','van'])expect(levels.map(l=>gameFor(hero,l).kind)).toEqual(levels.map((_,i)=>HERO_GAMES[hero][i%5].kind));
 });
 it('quince nombres propios, cinco mecánicas reales y ninguna ruleta o tragaperras',()=>{
  const games=Object.values(HERO_GAMES).flat();expect(new Set(games.map(g=>g.title)).size).toBe(15);
  expect(BONUS_KINDS).toEqual(['memory','sequence','timing','sprint','bestmove']);
  for(const list of Object.values(HERO_GAMES))expect(new Set(list.map(g=>g.kind)).size).toBe(5);
 });
 it('la semilla cambia cartas y secuencias, nunca el orden del juego',()=>{
  const a=createBonusPlan('lia',15,42),b=createBonusPlan('lia',15,43);
  expect(createBonusPlan('lia',15,42)).toEqual(a);expect(a.kind).toBe(b.kind);expect(a.deck).not.toEqual(b.deck);
  expect(a.deck.slice().sort()).toEqual([0,0,1,1,2,2,3,3]);
 });
});

describe('parejas: decisión del jugador, sin premios escondidos al azar',()=>{
 it('no permite elegir la misma carta dos veces, ni abrir una tercera antes de cerrar el fallo',()=>{
  const p=createBonusPlan('lia',15,1);memoryTap(p,0);expect(memoryTap(p,0)).toBeNull();
  const bad=p.deck.findIndex(v=>v!==p.deck[0]);expect(memoryTap(p,bad).type).toBe('miss');expect(p.mistakes).toBe(1);
  expect(memoryTap(p,7)).toBeNull();expect(p.flipped).toHaveLength(2);
 });
 it('cuatro parejas perfectas dan el premio máximo y las parejas encontradas no se repiten',()=>{
  const p=createBonusPlan('lia',15,1);
  for(let sym=0;sym<4;sym++){const pair=p.deck.map((v,i)=>v===sym?i:-1).filter(i=>i>=0);expect(memoryTap(p,pair[0]).type).toBe('open');expect(memoryTap(p,pair[1]).type).toBe('match');expect(memoryTap(p,pair[0])).toBeNull();}
  expect(memoryDone(p)).toBe(true);expect(memoryPart(p)).toBe(3);expect(finishBonus(p)).toBe(3);
 });
 it('seis fallos terminan el juego y guardan la puntuación parcial',()=>{
  const p=createBonusPlan('lia',15,1);p.mistakes=6;p.matched=[0,1,2,3];expect(memoryDone(p)).toBe(true);expect(memoryPart(p)).toBe(1);
 });
});

describe('secuencias cortas y legibles',()=>{
 it('solo admite entradas durante tu turno y gana tras secuencias de dos, tres y cuatro pasos',()=>{
  const p=createBonusPlan('van',15,2);expect(sequenceTap(p,0)).toBeNull();
  for(let round=0;round<3;round++){p.phase='input';for(let i=0;i<round+2;i++)sequenceTap(p,p.sequence[i]);}
  expect(p.round).toBe(3);expect(p.phase).toBe('done');expect(sequencePart(p)).toBe(3);
 });
 it('conserva la misma secuencia al fallar y ofrece un segundo intento',()=>{
  const p=createBonusPlan('van',15,2),seq=p.sequence.slice();p.phase='input';expect(sequenceTap(p,(seq[0]+1)%4)).toBe('miss');
  expect(p.phase).toBe('ready');expect(p.sequence).toEqual(seq);p.phase='input';sequenceTap(p,(seq[0]+1)%4);expect(p.phase).toBe('done');expect(p.mistakes).toBe(2);
 });
});

describe('precisión: tres sellos y cálculo en el instante real del toque',()=>{
 it('el recorrido es predecible y vuelve, con una zona amplia y un centro doble',()=>{
  expect([0,600,1200,1800,2400].map(timingPosition)).toEqual([0,.5,1,.5,0]);
  expect([.1,.25,.5,.75,.9].map(timingPoints)).toEqual([0,1,2,1,0]);
 });
 it('cada toque válido solo registra un intento y tres centros dan el máximo',()=>{
  const p=createBonusPlan('jean',15,1);expect(recordTiming(p,600)).toBeNull();
  for(let i=0;i<3;i++){p.phase='running';expect(recordTiming(p,600)).toBe(2);expect(recordTiming(p,600)).toBeNull();}
  expect(p.hits).toEqual([2,2,2]);expect(timingPart(p)).toBe(3);expect(p.phase).toBe('done');
 });
});

describe('tablero relámpago (sprint) y ojo maestro (bestmove) ligados al puzle',()=>{
 it('sprint: resuelve 3 minitableros válidos en exactamente 3 movimientos óptimos cada uno',()=>{
  const p=createBonusPlan('lia',45,9);
  expect(p.kind).toBe('sprint');
  for(let round=0;round<3;round++){
   const st=sprintStart(p);
   expect(isValidState(st.pieces,st.pos)).toBe(true);
   expect(minMoves(st.pieces,st.pos)).toBe(3);
   // Resuelve moviendo paso a paso como en la interfaz
   const pos=st.pos.slice();
   for(let s=0;s<3;s++){
    const d=minMoves(st.pieces,pos);
    let moved=null;
    for(let i=0;i<st.pieces.length&&!moved;i++){
     const [lo,hi]=slideRange(st.pieces,pos,i);
     for(const cand of [lo,hi]){
      const nxt=pos.slice();nxt[i]=cand;
      if(minMoves(st.pieces,nxt)===d-1){moved={i,to:cand};break;}
     }
    }
    expect(moved).not.toBeNull();
    pos[moved.i]=moved.to;
    const res=sprintMove(p,moved.i,moved.to);
    expect(res.won).toBe(s===2);
   }
  }
  expect(p.phase).toBe('done');
  expect(sprintPart(p)).toBe(3);
 });
 it('sprintTimeout registra fallo del tablero y avanza hasta cerrar',()=>{
  const p=createBonusPlan('jean',45,3);
  sprintStart(p);expect(sprintTimeout(p).done).toBe(false);
  sprintStart(p);sprintTimeout(p);sprintStart(p);
  expect(sprintTimeout(p).done).toBe(true);
  expect(sprintPart(p)).toBe(0);
 });
 it('bestmove: presenta 3 jugadas únicas (1 óptima + 2 señuelos) y puntúa los aciertos',()=>{
  const p=createBonusPlan('van',55,11);
  expect(p.kind).toBe('bestmove');
  for(let r=0;r<3;r++){
   const cur=bestMoveCurrent(p);
   expect(isValidState(cur.pieces,cur.pos)).toBe(true);
   expect(cur.options).toHaveLength(3);
   const opt=minMoves(cur.pieces,cur.pos);
   const goodIdx=cur.options.findIndex((o)=>o.best);
   expect(goodIdx).toBeGreaterThanOrEqual(0);
   cur.options.forEach((o,idx)=>{
    const nxt=cur.pos.slice();nxt[o.i]=o.to;
    if(idx===goodIdx)expect(minMoves(cur.pieces,nxt)).toBe(opt-1);
    else expect(minMoves(cur.pieces,nxt)).toBeGreaterThanOrEqual(opt);
   });
   const pick=bestMovePick(p,goodIdx);
   expect(pick.hit).toBe(true);
   expect(pick.done).toBe(r===2);
  }
  expect(bestMovePart(p)).toBe(3);
 });
});

describe('premios útiles, persistentes y cobrados una sola vez',()=>{
 it('participar conserva al menos una pista y el máximo escala de tres a diez',()=>{
  expect(maxPrize(15)).toBe(3);expect(maxPrize(95)).toBe(10);
  for(const l of [15,25,35,45,55,65,75,85,95]){expect(bonusPrize(0,l)).toBe(1);expect(bonusPrize(3,l)).toBe(maxPrize(l));}
 });
 it('guardar y cargar conserva cartas, errores y el premio ya decidido',()=>{
  const run={hero:'lia',level:16,seed:7,bonus:1,hints:3};const p=ensureBonusPlan(run);memoryTap(p,0);p.mistakes=2;
  const loaded=JSON.parse(JSON.stringify(run));expect(ensureBonusPlan(loaded)).toEqual(p);
  const prize=finishBonus(p);p.matched=[0,1,2,3,4,5,6,7];expect(finishBonus(p)).toBe(prize);
 });
 it('cobra de forma atómica y ni doble toque ni un plan viejo duplican las pistas',()=>{
  const run={hero:'lia',level:16,seed:7,bonus:1,hints:3};const p=ensureBonusPlan(run);p.matched=[0,1,2,3,4,5,6,7];finishBonus(p);
  const stale=JSON.parse(JSON.stringify(p));expect(claimBonus(run)).toBe(3);expect(run.hints).toBe(6);expect(run.bonus).toBe(0);expect(run.bonusPlan).toBeUndefined();expect(claimBonus(run)).toBe(0);
  run.bonusPlan=stale;expect(claimBonus(run)).toBe(0);expect(run.hints).toBe(6);
 });
 it('migra una antigua ruleta pendiente sin volver a sortear un premio ya ganado',()=>{
  const run={hero:'jean',level:26,seed:5,bonusPlan:{kind:'wheel',level:25,prize:4}};
  const p=ensureBonusPlan(run);expect(p.version).toBe(2);expect(p.kind).toBe('memory');expect(p.prize).toBe(4);expect(p.phase).toBe('done');
 });
});
