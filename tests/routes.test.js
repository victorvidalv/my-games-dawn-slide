import { describe, it, expect } from 'vitest';
import { HEROIC_PATHS, heroicHintsLeft, isHeroic, routeGain, shopDiscount } from '../src/game/routes.js';
import { canHint, spendHint } from '../src/game/heroes.js';
import { SHOP_ITEMS, availability, buy, priceOf, reviveCost } from '../src/game/shop.js';
import { calcGain } from '../src/engine/scoring.js';
const run=(hero,route='brave')=>({hero,route,mode:'c',start:1,level:11,hints:3,score:10000});

describe('camino heroico propio de cada héroe',()=>{
 it('tres símbolos y acompañantes distintos, Jean conserva la elfa',()=>{
  expect(new Set(Object.values(HEROIC_PATHS).map(p=>p.icon)).size).toBe(3);
  expect(new Set(Object.values(HEROIC_PATHS).map(p=>p.guide)).size).toBe(3);
  expect(HEROIC_PATHS.jean.guide).toBe('guia-elfa.webp');
 });
 it('solo Jean gana el diez por ciento adicional',()=>{
  const base=calcGain(30,12,10,2).total;
  for(const hero of ['lia','jean','van']){
   const gain=routeGain(run(hero),30,12,10,2);
   expect(gain.total).toBe(base+(hero==='jean'?Math.round(base*.1):0));
   expect(routeGain(run(hero,'normal'),30,12,10,2).total).toBe(base);
  }
 });
 it('las dos pistas de Lía se consumen antes que la reserva y se renuevan por tablero',()=>{
  const r=run('lia');
  for(let i=0;i<2;i++){expect(spendHint({heroId:'lia',run:r,mode:'c',level:11})).toEqual({ok:true,free:true});expect(r.hints).toBe(3);}
  expect(heroicHintsLeft(r,11)).toBe(0);expect(heroicHintsLeft(r,12)).toBe(2);
  expect(spendHint({heroId:'lia',run:r,mode:'c',level:11})).toEqual({ok:true,free:false});expect(r.hints).toBe(2);
 });
 it('guardar/rehacer/revivir no recarga las pistas gratis y no se acumulan',()=>{
  const r=run('lia');spendHint({heroId:'lia',run:r,mode:'c',level:11});
  const loaded=JSON.parse(JSON.stringify(r));expect(heroicHintsLeft(loaded,11)).toBe(1);expect(heroicHintsLeft(loaded,12)).toBe(2);
  loaded.route='normal';expect(heroicHintsLeft(loaded,11)).toBe(0);
  loaded.hints=0;expect(canHint('lia',loaded,'c',11)).toBe(false);
  loaded.route='brave';expect(canHint('lia',loaded,'c',11)).toBe(true);
 });
 it('ni Jean ni Juth reciben las pistas de Lía',()=>{
  for(const hero of ['jean','van'])expect(heroicHintsLeft(run(hero),11)).toBe(0);
 });
 it('el descuento de Juth es del 33 % en todos los productos y dificultades',()=>{
  for(const start of [1,50,75])for(const item of SHOP_ITEMS){
   const r={...run('van'),start},base=priceOf(item.id,40,start);
   expect(priceOf(item.id,40,start,r)).toBe(Math.round(base*.67));
   for(const hero of ['lia','jean'])expect(priceOf(item.id,40,start,run(hero))).toBe(base);
   expect(priceOf(item.id,40,start,{...r,route:'normal'})).toBe(base);
  }
 });
 it('se cobra lo anunciado incluso cuando solo alcanza con el descuento',()=>{
  const r=run('van'),G={n:11,rate:1,moves:1,limit:10,done:false};r.score=priceOf('hint',1,1,r);
  expect(r.score).toBe(201);expect(availability('hint',{run:r,G})).toMatchObject({ok:true,price:201});
  expect(buy('hint',{run:r,G})).toMatchObject({ok:true,price:201});expect(r.score).toBe(0);expect(r.hints).toBe(4);
 });
 it('el descuento no se aplica al revivir fuera de la tienda',()=>{
  expect(reviveCost(1000)).toBe(330);expect(shopDiscount(run('van'))).toBe(.33);
 });
 it('en práctica o sin elegir camino no hay beneficios heroicos',()=>{
  for(const hero of ['lia','jean','van']){
   const r={...run(hero),mode:'p'};expect(isHeroic(r)).toBe(false);expect(shopDiscount(r)).toBe(0);expect(heroicHintsLeft(r,11)).toBe(0);
  }
 });
});
