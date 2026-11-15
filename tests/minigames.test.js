import { describe, it, expect } from 'vitest';
import { BONUS_KINDS, HERO_GAMES, bonusIndex, isBonusLevel, gameFor, createBonusPlan, ensureBonusPlan, memoryTap, memoryDone, memoryPart, sequenceTap, sequencePart, timingPosition, timingPoints, recordTiming, timingPart, maxPrize, bonusPrize, finishBonus, claimBonus } from '../src/game/minigames.js';

describe('tres juegos por héroe, entrada directa y ciclo fijo',()=>{
 it('mantiene las nueve paradas intermedias y el orden 1,2,3,1',()=>{
  const levels=Array.from({length:100},(_,i)=>i+1).filter(isBonusLevel);
  expect(levels).toEqual([15,25,35,45,55,65,75,85,95]);
  expect(levels.map(l=>bonusIndex(l)%3)).toEqual([0,1,2,0,1,2,0,1,2]);
  for(const hero of ['lia','jean','van'])expect(levels.map(l=>gameFor(hero,l).kind)).toEqual([...HERO_GAMES[hero],...HERO_GAMES[hero],...HERO_GAMES[hero]].map(g=>g.kind));
 });
 it('nueve nombres propios, tres mecánicas conocidas y ninguna ruleta o tragaperras',()=>{
  const games=Object.values(HERO_GAMES).flat();expect(new Set(games.map(g=>g.title)).size).toBe(9);
  expect(BONUS_KINDS).toEqual(['memory','sequence','timing']);
  for(const list of Object.values(HERO_GAMES))expect(new Set(list.map(g=>g.kind)).size).toBe(3);
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
