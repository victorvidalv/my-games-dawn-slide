import { decodeBoard } from '../engine/board.js';
import { buildLevel, pickBoard, varyBoard } from '../engine/levels.js';
import { minMoves } from '../engine/solver.js';
import { hash32, mulberry32 } from '../engine/rng.js';
import { rateAt } from '../engine/difficulty.js';
import { levelPlan, tutorialFor } from './mechanics.js';
import { bossCapFor, bossRating, bossTimeFor } from './bosses.js';
import { heroLimit } from './heroes.js';
import { isSealLevel, planSeal, sealLimit } from './seals.js';

/** Shared by the real game and simulator. Saved boards are restored without introducing a new objective. */
export function buildAdventureLevel(run, { levels, special, tips = {}, withProof = false } = {}) {
  const level = run.level, plan = levelPlan(level), rate = bossRating(level, rateAt(run.start,level)), brave = run.route === 'brave';
  const saved = run.board?.level === level ? run.board : null, rescue = run.rescue?.level === level ? run.rescue : null;
  let G;
  if (saved || rescue) {
    const b = rescue || saved, opt = b.opt;
    G = { n:level, rate:b.rate, pieces:b.pieces.map(p=>({...p})), walls:(b.walls||[]).map(w=>w.slice()),
      doors:(b.doors||[]).map(d=>d.slice()),
      pos:(rescue?b.start:b.pos).slice(), start:b.start.slice(), opt,
      limit:rescue?heroLimit(run.hero,opt,run.start,level,brave,bossCapFor(level)):b.limit,
      moves:rescue?0:b.moves||0, hist:rescue?[]:(b.hist||[]).map(p=>p.slice()), bought:rescue?0:b.bought||0,
      tutorial:rescue?null:b.tutorial||null, family:b.family||plan.family, seal:b.seal?{...b.seal,cell:b.seal.cell.slice()}:null,
      colors:saved?.colors?.slice() };
    G.limit=sealLimit(G.seal,G.limit);
    G.timeLimit=run.mode!=='p'&&plan.boss&&!G.tutorial?(b.timeLimit??bossTimeFor(level,opt)):0;
    G.timeLeft=rescue?G.timeLimit:Math.min(G.timeLimit,b.timeLeft??G.timeLimit);
  } else {
    const tutorial = run.mode === 'p' ? null : tutorialFor(level,tips);
    let base, built;
    if (tutorial) {
      base=decodeBoard(tutorial.board);base.family=plan.family;
      built={...base,opt:minMoves(base.pieces,base.pos,base.walls,base.doors)};
    } else {
      base=pickBoard(levels,rate,run.seed,level,plan.family,special);
      const board=varyBoard(base,rate,hash32(run.seed,level,7));
      const boost=plan.boss?(level>=50?2:1):0;
      built=buildLevel(board,{rating:rate,adj:run.adj,brave,boost,rng:mulberry32(hash32(run.seed,level,31)),withAnalysis:isSealLevel(level)||withProof});
    }
    G={n:level,rate,pieces:built.pieces,pos:built.pos.slice(),walls:built.walls||[],doors:built.doors||[],start:built.pos.slice(),opt:built.opt,
      limit:heroLimit(run.hero,built.opt,run.start,level,brave,bossCapFor(level)),moves:0,hist:[],bought:0,family:base.family,tutorial:tutorial?.mech||null,seal:null};
    if(tutorial)G.limit=built.opt+40;                       // el tutorial no se puede perder
    G.timeLimit=run.mode!=='p'&&plan.boss&&!tutorial?bossTimeFor(level,built.opt):0;   // contrarreloj de los jefes que la tienen
    G.timeLeft=G.timeLimit;
    if(withProof)G.analysis=built.analysis;
    if (!tutorial && run.mode !== 'p' && isSealLevel(level)) {
      const result=planSeal({...G,level,seed:run.seed,analysis:built.analysis,withProof});
      if(result){G.seal=result.seal;G.limit=result.limit;if(withProof)G.sealProof=result.proof;G.sealSearch={visited:result.visited,truncated:result.truncated};}
    }
  }
  if(G.seal && Object.hasOwn(run.sealClaims||{},level))G.seal.collected=true;
  return {...G,done:false,els:[],plan};
}
