import { describe, it, expect } from 'vitest';
import { decodeBoard, encode, isValidState, N } from '../src/engine/board.js';
import { analyze, expand } from '../src/engine/solver.js';
import { beginPower, destinyPlan, powerState, reserveState } from '../src/game/powers.js';
import bank from '../src/data/levels.json';
import special from '../src/data/special.json';

const rewindBoard = n => ({ n: 7, moves: n, limit: 30, pos: [n], hist: Array.from({length:n},(_,i)=>[i]) });
const run = hero => ({ hero, hints: 4, score: 1234 });

describe('Jean: una carga para hasta tres movimientos en Normal (más en Difícil y Experto)', () => {
 for(const count of [0,1,4,5,8]) it(`rebobina el historial real de ${count} movimientos`,()=>{
  const r=run('jean'),G=rewindBoard(count),action=beginPower(r,G);
  if(!count){expect(action).toBeNull();expect(r.powerUsedLevel).toBeUndefined();return;}
  expect(action.steps).toHaveLength(Math.min(3,count));expect(action.steps.at(-1)).toEqual([Math.max(0,count-3)]);
  expect(beginPower(r,G)).toBeNull();expect(r.hints).toBe(4);expect(r.score).toBe(1234);
 });
 it('guardar y cargar, rehacer y revivir no recargan el poder del mismo nivel',()=>{
  const r=run('jean'),G=rewindBoard(3);beginPower(r,G);
  const loaded=JSON.parse(JSON.stringify(r));expect(powerState(loaded,G).ok).toBe(false);
  expect(powerState(loaded,{...G,moves:0,hist:[]}).ok).toBe(false);
  expect(powerState(loaded,{...G,n:8}).ok).toBe(true);
 });
 it('un uso antiguo de Jean cuenta como poder gastado en ese tablero',()=>{
  expect(powerState({...run('jean'),undoUsedLevel:7,undoUsedCount:1},rewindBoard(4)).ok).toBe(false);
 });
});

describe('Juth: tres movimientos óptimos legales',()=>{
 for(const family of ['plain','walls','gates','heavy','ice','duo','mixed']) it(`respeta ${family} y reduce la distancia exacta en tres`,()=>{
  const raw=family==='plain'?bank.ratings[29][0]:special[family][29][0];
  const G={...decodeBoard(raw),n:45,moves:0,limit:100,hist:[]};
  const an=analyze(G.pieces,G.pos,600000,G.walls),before=an.dist.get(encode(G.pos));
  expect(before).toBeGreaterThan(3);
  const action=beginPower(run('van'),G);expect(action.steps).toHaveLength(3);
  for(const step of action.steps){
   const legal=[];expand(G.pieces,encode(G.pos),Array(G.pieces.length).fill(0),new Int8Array(N*N),(i,to)=>legal.push([i,to]),G.walls);
   expect(legal).toContainEqual([step.i,step.to]);G.pos[step.i]=step.to;
   expect(isValidState(G.pieces,G.pos,G.walls)).toBe(true);
  }
  expect(an.dist.get(encode(G.pos))).toBe(before-3);
 });
 it('se desactiva cuando quedan dos o menos pasos y no consume la carga',()=>{
  const G={...decodeBoard('h2.2.0'),n:10,moves:0,limit:10,hist:[]},r=run('van');
  expect(destinyPlan(G)).toBeNull();expect(beginPower(r,G)).toBeNull();expect(r.powerUsedLevel).toBeUndefined();
 });
 it('no activa una secuencia si quedan menos de tres turnos',()=>{
  const G={...decodeBoard(bank.ratings[29][0]),n:4,moves:9,limit:11,hist:[]};
  expect(powerState(run('van'),G)).toMatchObject({ok:false,reason:'Necesitas 3 turnos'});
 });
 it('ningún héroe recibe el poder del otro',()=>{
  expect(beginPower(run('lia'),rewindBoard(4))).toBeNull();
 });
});

describe('reserva de Lía antes de los turnos comprados',()=>{
 it('marca y consume solo su tramo, dejando la compra al final',()=>{
  const G={limit:16,bought:3,moves:9};expect(reserveState(G,3)).toEqual({start:10,end:13,left:3});
  G.moves=11;expect(reserveState(G,3).left).toBe(2);G.moves=14;expect(reserveState(G,3).left).toBe(0);
 });
});
