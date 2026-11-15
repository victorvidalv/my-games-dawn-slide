/** Exact level/optional-objective verifier, sharing the real game's constructor. No probabilistic balance model. */
import { Worker, isMainThread, parentPort } from 'node:worker_threads';
import { readFileSync, writeFileSync } from 'node:fs';
import { cpus } from 'node:os';
import { buildAdventureLevel } from '../src/game/build-adventure.js';
import { SEAL_LEVELS, isSealLevel, planSeal, verifySealProof, maxSealAdjustment, sealReward, collectSeal } from '../src/game/seals.js';
import { heroLimit } from '../src/game/heroes.js';
import { encode, isValidState } from '../src/engine/board.js';
import { analyze, expand } from '../src/engine/solver.js';

if (!isMainThread) {
  const levels=JSON.parse(readFileSync(new URL('../src/data/levels.json',import.meta.url))).ratings;
  const special=JSON.parse(readFileSync(new URL('../src/data/special.json',import.meta.url)));
  parentPort.on('message',job=>{
    try {
      const t=performance.now(),run={...job,hero:'jean',mode:'c',adj:job.seed%3-1,score:0};
      const G=buildAdventureLevel(run,{levels,special,tips:{wall:true,gate:true,heavy:true,ice:true},withProof:true});
      const an=G.analysis||analyze(G.pieces,G.pos,600000,G.walls);
      if(!isValidState(G.pieces,G.pos,G.walls)||!an||an.dist.get(encode(G.pos))!==G.opt)throw Error('Invalid base level or minimum');
      let key=encode(G.pos),steps=0;
      while(key%8!==4){let next;const d=an.dist.get(key);expand(G.pieces,key,Array(G.pos.length).fill(0),new Int8Array(36),(i,to,k)=>{if(next===undefined&&an.dist.get(k)===d-1)next=k},G.walls);if(next===undefined)throw Error('No winning suffix');key=next;steps++;}
      if(steps!==G.opt)throw Error('Base exit minimum mismatch');
      let seals=0,adjusted=0,detours=0,covered=0,truncated=0,maxAdded=0;
      for(const hero of ['lia','jean','van']){
        const baseLimit=heroLimit(hero,G.opt,job.start,job.level,job.route==='brave');
        if(baseLimit<steps)throw Error('Base level exceeds hero allowance');
        if(!isSealLevel(job.level))continue;
        const planned=planSeal({...G,limit:baseLimit,level:job.level,seed:job.seed,analysis:an,withProof:true});
        if(!planned)throw Error('Scheduled seal missing');
        if(!verifySealProof(G,planned.seal,planned.proof,planned.limit))throw Error('Cannot collect seal and exit legally within limit');
        if(planned.limit>baseLimit+maxSealAdjustment(G.opt)||planned.seal.extraMoves<0)throw Error('Difficulty adjustment exceeds bound');
        const state={...G,pos:G.pos.slice(),seal:{...planned.seal},n:job.level};const r={...run,hero,score:0};let rewards=0;
        for(const step of planned.proof){const before=state.pos.slice();state.pos[step.i]=step.to;rewards+=collectSeal(r,state,before);}
        if(!state.seal.collected||rewards!==sealReward(r,planned.seal))throw Error('Collection event/reward differs from proof');
        const before=r.score;state.seal.collected=false;
        // Restore / redo / rewind can never award again even if the visual flag was stale.
        const old=G.pos.slice();const witness=planned.proof;
        for(const step of witness){const prev=old.slice();old[step.i]=step.to;collectSeal(r,{...state,pos:old.slice()},prev);}
        if(r.score!==before)throw Error('Seal reward duplicated');
        seals++;adjusted+=planned.limit>baseLimit?1:0;detours+=planned.seal.extraMoves>0?1:0;
        covered+=G.pieces.some((p,i)=>p.o==='h'?p.fix===planned.seal.cell[0]&&G.pos[i]<=planned.seal.cell[1]&&G.pos[i]+p.len>planned.seal.cell[1]:p.fix===planned.seal.cell[1]&&G.pos[i]<=planned.seal.cell[0]&&G.pos[i]+p.len>planned.seal.cell[0])?1:0;
        truncated+=planned.truncated?1:0;maxAdded=Math.max(maxAdded,planned.limit-baseLimit);
      }
      parentPort.postMessage({ok:true,job,family:G.family,seals,adjusted,detours,covered,truncated,maxAdded,ms:performance.now()-t});
    }catch(error){parentPort.postMessage({ok:false,job,error:error.stack})}
  });
} else {
  const args=process.argv.slice(2),full=args.includes('--full'),seeds=Number(args.find(s=>s.startsWith('--seeds='))?.split('=')[1]||2);
  const count=Math.max(1,Math.min(4,Number(process.env.TEST_THREADS)||Math.min(2,cpus().length)));
  const jobs=[];for(let s=0;s<seeds;s++)for(const start of [1,50,75])for(const route of ['normal','brave'])for(const level of full?Array.from({length:100},(_,i)=>i+1):SEAL_LEVELS){if(route==='brave'&&level<=10)continue;jobs.push({seed:46001+s*7919,start,route,level})}
  const report={version:46,mode:full?'full':'seal-levels',seeds,boards:jobs.length,heroChecks:0,seals:0,adjusted:0,detours:0,covered:0,truncated:0,maxAdded:0,maxMs:0,families:{},failures:[]};
  const workers=[];let next=0,done=0;const t0=performance.now();
  console.log(`Checking ${jobs.length} real boards across three difficulties, both routes and all heroes (${count} workers).`);
  await new Promise(resolve=>{
    function feed(w){if(next<jobs.length)w.postMessage(jobs[next++]);else if(done===jobs.length)resolve()}
    for(let i=0;i<count;i++){
      const w=new Worker(new URL(import.meta.url));workers.push(w);
      w.on('message',r=>{done++;if(!r.ok)report.failures.push(r);else{
        report.heroChecks+=3;for(const key of ['seals','adjusted','detours','covered','truncated'])report[key]+=r[key];
        report.maxAdded=Math.max(report.maxAdded,r.maxAdded);report.maxMs=Math.max(report.maxMs,r.ms);report.families[r.family]=(report.families[r.family]||0)+1;
      }if(done%20===0||done===jobs.length)console.log(`${done}/${jobs.length}: ${report.seals} seal routes verified, ${report.failures.length} failures`);feed(w)});
      w.on('error',error=>{report.failures.push({error:error.stack});done++;feed(w)});feed(w);
    }
  });
  await Promise.all(workers.map(w=>w.terminate()));report.seconds=Math.round((performance.now()-t0)/1000);
  writeFileSync(new URL('../seal-simulation-report.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
  if(report.failures.length)process.exitCode=1;
}
