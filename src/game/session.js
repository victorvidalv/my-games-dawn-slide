import { Music, setTensionFx } from '../audio/music.js';
import { sfx, tone } from '../audio/sound.js';
import { heroicPath } from './routes.js';
import { icon } from '../ui/icons.js';
import { HERO_TALK } from '../data/story.js';
import { LORE_PORTRAITS, WORLD, lorePortraitSrc } from '../data/lore.js';
import { ZONES, zoneIdx } from '../data/zones.js';
import { $ } from '../dom.js';
import { MAX_LEVEL } from '../engine/difficulty.js';
import { canStartAt, startHintsAt } from './starts.js';
import { playReviveEffect, playSkipEffect } from '../ui/turns.js';
import { startCoach } from '../ui/coach.js';
import { buildLevelAsync } from './level-builder.js';
import { baseScore, calcGain } from '../engine/scoring.js';
import { clearRewards } from './heroes.js';
import { DAILY_TARGETS, challengeById, currentStreak, dailyProgress, dayNumber, emptyDaily, recordDaily, streakHintBonus, writeDailyProgress } from './daily.js';
import { snapshotRescue } from './heroes.js';
import { showDailyResult } from '../ui/daily.js';
import { celebrate, countStat, markStat, pauseAchievementToasts } from '../ui/achievements.js';
import { boardStats } from './achievements.js';
import { canPaidRevive, hasRevive, payRevive, shopBoardKey, useFreeRetry, useRevive } from './shop.js';
import { S, gainNow, heroOf, persist, rkey, store } from '../state.js';
import { boardEl, buildPieces, fitBoard, layout, place, recLine, syncRouteStyle, updateHud } from '../ui/board.js';
import { isBonusLevel, showBonus } from '../ui/bonus.js';
import { showBossIntro } from '../ui/boss.js';
import { onBossTimeUp, preloadBossArt, syncBossPhase, syncBossTimer } from '../ui/boss-phase.js';
import { endRun } from '../ui/finale.js';
import { showResult } from '../ui/result.js';
import { chooseHero, showRescue, showReviveOffer, syncHero } from '../ui/heroes.js';
import { applyZone, renderStage, showMap } from '../ui/map.js';
import { openMenu } from '../ui/menu.js';
import { heroArt, storyFor } from '../ui/story.js';
import { numLocale } from '../i18n.js';
import { boardSwapDone, boardSwapOut, levelBanner, playLevelScenery, wipeIn, wipeOut } from '../ui/transitions.js';
export function saveRun(){
 if(S.run?.daily){
  const d=S.run.daily,G=S.G;
  if(G&&!G.done&&d.day===dayNumber()){
   d.attempt={index:d.index,pos:G.pos.slice(),moves:G.moves,hist:G.hist.map(p=>p.slice())};
   writeDailyProgress(store,d,{boards:d.boards,attempt:d.attempt});persist();
  }
  return;
 }
 if(S.run&&S.G&&!S.G.done&&S.G.n===S.run.level&&!S.run.pendingClear&&!S.run.rescue&&!S.run.pendingRevive){
  if(S.G.bought>0)S.run.turnPackBoard=shopBoardKey(S.G);
  S.run.board={level:S.G.n,rate:S.G.rate,pieces:S.G.pieces.map(p=>({...p})),walls:(S.G.walls||[]).map(w=>w.slice()),doors:(S.G.doors||[]).map(d=>d.slice()),pos:S.G.pos.slice(),start:S.G.start.slice(),opt:S.G.opt,limit:S.G.limit,bought:S.G.bought||0,timeLimit:S.G.timeLimit||0,timeLeft:Math.ceil(S.G.timeLeft||0),tutorial:S.G.tutorial||null,moves:S.G.moves,hist:S.G.hist.map(p=>p.slice()),colors:S.G.colors?.slice(),family:S.G.family,seal:S.G.seal?{...S.G.seal,cell:S.G.seal.cell.slice()}:null};
 }
 store.run=S.run&&{...S.run};persist();
}
export async function startRun(start,mode){
  mode='c';
  const picked=await chooseHero(start,mode);if(!picked){openMenu('adv');return}
  const chosen=picked.hero,from=canStartAt(store.paths['c'+start]?.level||0,picked.from)?picked.from:1;
  if(S.run) recordBest(true);                         // si abandonas, lo logrado cuenta
  const seed=Math.floor(Math.random()*2**31);
  const hints=startHintsAt(start,from)+streakHintBonus(currentStreak(store.daily,dayNumber()));
  S.G=null;
  S.run={seed,level:from,start,mode,hero:chosen,lifeUsed:false,revive:0,revivesBought:0,undoUsedAt:0,undoUsedLevel:0,undoUsedCount:0,vanAwardedAt:0,score:0,hints,adj:0,streak:0,recBroken:false,firstLevel:from};
  markStat('heroes',chosen);
  syncHero();syncRouteStyle();applyZone(zoneIdx(from));saveRun();
  S.run.route='normal';S.run.routeZone=zoneIdx(from);S.run.travelFrom=zoneIdx(from);saveRun();await resumeAdventure();
}
async function startLevel(){
  S.busy=true;
  const run=S.run;
  const G=await buildLevelAsync(run,store.tips||{});
  if(S.run!==run)return;                                // se salió mientras se preparaba
  const saved=run.daily?.attempt;
  if(saved && saved.index===run.daily.index && saved.moves<G.limit && saved.pos.length===G.pos.length){
   Object.assign(G,{pos:saved.pos.slice(),moves:saved.moves,hist:saved.hist.map(p=>p.slice())});
  }
  document.body.classList.toggle('daily-run',!!S.run.daily);
  // El telón dorado abre la presentación; entre tableros las piezas se disuelven en su sitio.
  const bossIntro=!!(G.plan?.boss&&!G.tutorial&&G.moves===0&&S.run.bossSeen!==G.n&&!S.run.rescue&&!S.run.pendingRevive);
  if(bossIntro)await wipeIn('gold');else await boardSwapOut();
  if(S.run!==run){wipeOut();boardSwapDone();return}
  S.G=G;
  S.G.colors ||= [0,1,2,3,4,5,6,7].sort(()=>Math.random()-.5);
  $('lvl').textContent=S.run.daily?`${challengeById(S.run.daily.id).name} · ${S.run.daily.index+1}/${DAILY_TARGETS.length}`:S.G.tutorial?`${S.G.n} · TUTORIAL`:S.G.n;$('mn').textContent=S.G.opt;$('base').textContent=S.run.mode==='p'?'—':baseScore(S.G.rate);
  applyZone(zoneIdx(S.G.n));renderStage();syncBossPhase();
  if(S.G.n%10>=7)preloadBossArt(Math.ceil(S.G.n/10)*10);                  // la ilustración del próximo jefe ya está lista cuando llegas
  const prac=S.run.mode==='p';
  $('score').textContent=prac?'—':S.run.score.toLocaleString(numLocale());recLine();
  $('lim').textContent=prac?'∞':S.G.limit;
  $('bUndo').disabled=!S.G.hist.length;
  $('msg').textContent=S.run.daily?'Reto diario: saca la llave roja con los menos movimientos posibles.':S.G.n===1?'Desliza los bloques y saca la llave roja ➜ Cada movimiento cuenta.':tipFor(S.G);
  buildPieces();boardSwapDone();updateHud();S.busy=true;
  fitBoard();Music.setLevel(S.G.n,S.run.hero);setTensionFx(0,false);Music.duck(1);Music.muffle(false);Music.start();
  if(S.run.rescue){wipeOut();showRescue();return}
  if(S.run.pendingRevive&&canPaidRevive(S.run,S.run.mode)){wipeOut();offerPaidRevive(S.run.pendingRevive);return}
  delete S.run.pendingRevive;
  if(S.G.plan?.boss&&!S.G.tutorial&&S.G.moves===0&&S.run.bossSeen!==S.G.n){
   S.run.bossSeen=S.G.n;saveRun();
   const intro=showBossIntro(S.G.n);wipeOut();              // la presentación aparece detrás del telón de alarma
   await intro;
   if(!S.run||S.G?.done)return;
  }else{
   wipeOut();sfx.levelIn();
   if(!S.G.moves)levelBanner(S.run.daily?'Reto diario':S.G.tutorial?'Tutorial':`${S.G.plan?.boss?'Jefe · ':''}Nivel ${S.G.n}`,S.run.daily?challengeById(S.run.daily.id).name:ZONES[zoneIdx(S.G.n)].n,!!S.G.plan?.boss);
  }
  playLevelScenery();
  S.busy=false;boardEl.classList.remove('board-lock');updateHud();saveRun();syncBossTimer();
  startCoach();                                        // avisos y guía de los primeros niveles / mecánicas nuevas
}
/** Retoma el tablero en curso, o abre el tablero que se eligió para mejorar la marca. */
export async function startDaily(id, index){
  const c=challengeById(id),day=dayNumber();
  const progress=dailyProgress(store,c.id,day);
  const boards=DAILY_TARGETS.map((_,i)=>progress?.boards?.[i]||null);
  const attempt=index===undefined?progress?.attempt:null;
  index??=attempt?.index??boards.findIndex((board)=>!board);
  if(index<0){showDailyResult({id:c.id,day});return}
  if(S.run&&!S.run.daily&&S.G&&!S.G.done)saveRun();
  if(S.G)S.G.done=true;
  S.G=null;
  S.run={daily:{id:c.id,day,index,boards,attempt},seed:day,level:c.level,start:1,mode:'c',hero:'none',score:0,hints:0,adj:0,streak:0,lifeUsed:true,revive:0,revivesBought:0,undoUsedAt:0,undoUsedLevel:0,undoUsedCount:0,vanAwardedAt:0,recBroken:false,route:'normal',routeZone:zoneIdx(c.level)};
  syncHero();syncRouteStyle();applyZone(zoneIdx(c.level));
  await startLevel();
}
/** Sale del reto diario sin tocar la partida guardada de la aventura. */
export function leaveDaily(){
  if(!S.run?.daily)return;
  saveRun();
  if(S.G)S.G.done=true;
  S.run=null;S.busy=false;document.body.classList.remove('daily-run');
  Music.stop(.2);setTensionFx(0,false);
}
function tipFor(g){
  if(heroOf().id==='jean')return 'Rebobinar devuelve varios movimientos. Un uso por tablero.';
  const t=['Piensa antes de mover: cada movimiento de más resta puntos.','Los bloques largos bloquean más: libéralos primero.','Un solo arrastre largo cuenta como 1 movimiento.','Cada héroe abre el camino a su manera.','La pista no cuesta movimientos, pero es limitada.'];
  return t[(g.n*7)%t.length];
}

function travelDialog(){
 if(!S.run?.pendingClear||S.run.pendingClear.level%10!==0||S.run.pendingClear.level>=100)return Promise.resolve();
 return new Promise(resolve=>{
  const session=S.run,modal=$('travel'),h=heroOf(),city=Math.min(9,Math.floor(S.run.pendingClear.level/10)),story=storyFor(h.id,city*10+1);
  const path=heroicPath(h.id);$('travelGuide').src=`backgrounds/${path.guide}`;$('travelGuide').alt=path.guideAlt;
  $('routeBraveIcon').innerHTML=icon(path.icon);$('routeBraveName').textContent=path.name;$('routePerk').textContent=path.benefit;
  $('travelScene').src=`backgrounds/zone-${city+1}.webp`;$('travelPortrait').src=heroArt(h.id,'story');$('travelPortrait').alt=h.name;
  $('travelTag').textContent=`THYES · AÑO ${WORLD.year} · CAPÍTULO ${city+1} DE 10 · NIVELES ${city*10+1}–${(city+1)*10}`;
  $('travelSeal').textContent=`Sello de ${story.seal}`;$('travelInscription').textContent=`«${story.inscription}»`;
  const citySpan=document.createElement('span');citySpan.className='travel-city';citySpan.textContent=ZONES[city].n;
  $('travelTitle').replaceChildren(citySpan);$('travelPlace').src=`backgrounds/zone-${city+1}.webp`;$('travelPlace').alt=ZONES[city].n;
  const portrait=LORE_PORTRAITS[city],loreBox=$('travelLore');loreBox.hidden=!portrait;
  if(portrait){$('travelLoreImg').src=lorePortraitSrc(portrait.id);$('travelLoreImg').alt=portrait.name;$('travelLoreName').textContent=portrait.name;$('travelLoreCap').textContent=portrait.caption}
  const chip=$('travelLoreChip'),chipLine=story.vhorn?`Vhorn: «${story.vhorn}»`:(story.cityLines?.[0]||story.body||'');
  chip.hidden=!portrait&&!chipLine;
  if(portrait){$('travelChipImg').src=lorePortraitSrc(portrait.id);$('travelChipImg').alt=portrait.name;$('travelChipName').textContent=`${portrait.name} · ${portrait.caption}`;}
  else{$('travelChipImg').removeAttribute('src');$('travelChipName').textContent=ZONES[city].n;}
  $('travelChipLine').textContent=chipLine;
  const lines=[...(story.cityLines||[story.body]),...(story.vhorn?[`Vhorn: «${story.vhorn}»`]:[])];
  $('travelText').replaceChildren(...lines.map(txt=>{const li=document.createElement('li');li.textContent=txt;return li}));
  $('travelHeroLine').textContent=`${h.name}: «${story.action}»`;
  $('routeSummary').textContent=`Nivel ${S.run.pendingClear?.level||S.run.level} superado · +${S.run.pendingClear?.gain||0} pts`;
  let chosen=false;const buttons=[$('routeNormal'),$('routeBrave')];buttons.forEach(b=>b.disabled=false);
  const key=e=>{
   if(e.key==='ArrowRight'||e.key==='ArrowDown'||e.key==='ArrowLeft'||e.key==='ArrowUp'){e.preventDefault();(document.activeElement===buttons[0]?buttons[1]:buttons[0]).focus();return}
   if(e.key!=='Tab')return;
   if(e.shiftKey&&document.activeElement===buttons[0]){e.preventDefault();buttons[1].focus()}else if(!e.shiftKey&&document.activeElement===buttons[1]){e.preventDefault();buttons[0].focus()}
  };
  const choose=choice=>{if(chosen||S.run!==session)return;chosen=true;buttons.forEach(b=>b.disabled=true);S.run.route=choice;S.run.routeZone=city;S.run.storyChapterSeen=city;S.run.storySeen=city*10+1;
   if(S.run.pendingClear)S.run.pendingClear.routeChosen=true;
   saveRun();modal.removeEventListener('keydown',key);
   const picked=buttons[choice==='brave'?1:0];picked.classList.add('picked');buttons.forEach(b=>b!==picked&&b.classList.add('unpicked'));sfx.routePick();
   setTimeout(async()=>{await wipeIn('gold');modal.classList.remove('show');buttons.forEach(b=>b.classList.remove('picked','unpicked'));wipeOut();resolve()},matchMedia('(prefers-reduced-motion: reduce)').matches?0:420);
  };
  buttons[0].onclick=()=>choose('normal');buttons[1].onclick=()=>choose('brave');
  wipeIn('gold').then(()=>{modal.classList.add('show');modal.addEventListener('keydown',key);buttons[0].focus();wipeOut()});
 });
}
let advancingClear=false;
export async function resumeAdventure(){
 if(!S.run)return;S.busy=true;
 if(S.run.enterPending){delete S.run.enterPending;S.run.route='normal';S.run.routeZone=0;S.run.travelFrom=0;saveRun()}
 if(S.run.level<=10&&!S.run.pendingClear?.routeChosen&&S.run.route!=='normal'){S.run.route='normal';S.run.routeZone=0;saveRun()}
 if(S.run.pendingClear){await advanceClear();return}
 if(S.run.bonus){await showBonus();saveRun()}
 if(S.run.travelFrom!==undefined){const from=S.run.travelFrom,to=zoneIdx(S.run.level);await showMap(from,to,{travel:from!==to});delete S.run.travelFrom;saveRun()}
 await startLevel();
}
async function advanceClear(){
 if(advancingClear||!S.run?.pendingClear)return;advancingClear=true;S.busy=true;
 const done=S.run.pendingClear,n=done.level,crossing=n<MAX_LEVEL&&n%10===0;
 if(crossing)pauseAchievementToasts(true);
 try{
  if(n>=MAX_LEVEL){endRun(true);S.busy=false;return}
  if(crossing&&!done.routeChosen)await travelDialog();
  S.run.level=n+1;if(crossing)S.run.travelFrom=zoneIdx(n);if(isBonusLevel(n))S.run.bonus=1;
  delete S.run.pendingClear;saveRun();await resumeAdventure();
 }finally{if(crossing)pauseAchievementToasts(false);advancingClear=false}
}
export function win(){                                  // la voz del héroe NO se corta al ganar: termina su frase aunque el nivel sea rápido
 if(S.G.done)return;S.G.done=true;S.busy=true;boardEl.classList.add('board-lock');
 if(S.G.tutorial){                                      // nivel extra de tutorial: sin puntos ni avance; después empieza el nivel real
  store.tips=store.tips||{};store.tips['tut_'+S.G.tutorial]=true;delete S.run.board;persist();
  setTensionFx(0,false);sfx.success();
  S.G.els[0].classList.add('exit');place(0,7);
  $('msg').textContent='¡Tutorial superado! Ahora, el nivel de verdad.';
  setTimeout(()=>{S.busy=false;startLevel()},1400);return;
 }
 if(S.run.daily){
  const run=S.run, G=S.G, d=run.daily;
  const gain=calcGain(G.rate,G.moves,G.opt,0);
  const previous=d.boards[d.index];
  if(!previous||G.moves<previous.moves) d.boards[d.index]={moves:G.moves,opt:G.opt,points:gain.total};
  d.attempt=null;
  const next=d.boards.findIndex((board)=>!board);
  let out;
  if(next<0){
   const moves=d.boards.reduce((sum,board)=>sum+board.moves,0);
   const opt=d.boards.reduce((sum,board)=>sum+board.opt,0);
   out=recordDaily(store.daily||=emptyDaily(),d.id,d.day,moves,opt,d.boards.slice());
  }
  writeDailyProgress(store,d,{boards:d.boards.slice(),attempt:null});persist();
  setTensionFx(0,false);Music.duck(.55);sfx.success();
  G.els[0].classList.add('exit');place(0,7);boardEl.classList.add('board-win');celebrate(G.els[0]);
  setTimeout(async()=>{
   if(S.run!==run)return;
   await showResult({gain,moves:G.moves,opt:G.opt});
   if(S.run!==run)return;
   if(out){showDailyResult(d,out);return}
   d.index=next;
   await startLevel();
  },matchMedia('(prefers-reduced-motion: reduce)').matches?100:450);
  return;
 }
 if(S.G.n<MAX_LEVEL&&S.G.n%10===0)pauseAchievementToasts(true);
 countStat(...boardStats(S.G,S.run));                // logros: perfectos, mecánicas, jefes, ciudad sin ayuda
 const gain=gainNow(),previous=S.run.score;
 S.run.score+=gain.total;S.run.cleared=(S.run.cleared||0)+1;S.run.streak=gain.eff>=.9?(S.run.streak||0)+1:0;
 S.run.adj=Math.max(-2,Math.min(S.run.level<10?1:2,S.run.adj+(gain.eff>=.9?1:gain.eff<.4?-1:0)));
 clearRewards(S.run,S.G.n);
 S.run.pendingClear={level:S.G.n,gain:gain.total,moves:S.G.moves,opt:S.G.opt,routeChosen:false};recordBest();saveRun();
 setTensionFx(0,false);Music.duck(.55);if(S.G.moves>S.G.opt)sfx.success();   // si es perfecto suena la fanfarria especial al mostrar el resultado
 S.G.els[0].classList.add('exit');place(0,7);boardEl.classList.add('board-win');celebrate(S.G.els[0]);   // las piezas celebran con una ola de saltos
 $('msg').textContent=`${S.G.moves<=S.G.opt?'Perfecto · ':''}+${gain.total} puntos · ${HERO_TALK[heroOf().id].win[S.G.n%3]}`;
 const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches,done=S.G;
 setTimeout(async()=>{                                   // la llave sale → puntaje rápido → siguiente nivel
  try{await showResult({level:done.n,gain,moves:done.moves,opt:done.opt,previous,total:S.run.score,streakMult:gain.mult})}
  catch(err){console.error(err)}                         // si la animación falla, el juego sigue igual
  advanceClear();
 },reduce?100:450);
}
/* ---------- Derrota ---------- */
/** Los jefes comparten el flujo de derrota para tiempo y turnos. */
onBossTimeUp(()=>fail('time'));
export function fail(why){
  if(S.G.done)return;
  finalFail(why);
}
/** Saltar nivel (tienda): sin puntos, sin racha; avanza como si se hubiera superado. */
export function skipLevel(){
  if(!S.G||S.G.done)return;
  S.G.done=true;S.busy=true;boardEl.classList.add('board-lock');
  S.run.streak=0;S.run.helpAt=S.G.n;S.run.pendingClear={level:S.G.n,gain:0,moves:S.G.moves,opt:S.G.opt,routeChosen:false,skipped:true};
  recordBest();saveRun();setTensionFx(0,false);
  $('msg').textContent='Nivel saltado. Sin puntos.';
  playSkipEffect().then(()=>advanceClear());
}
function triggerGameOver(why){
  S.G.done=true;S.busy=true;boardEl.classList.add('board-lock');Music.stop(.25);setTensionFx(0,false);tone(220,.25,'sine',.045);S.G.els.forEach(el=>el.style.opacity='.5');
  setTimeout(()=>{endRun(false,why);S.busy=false},400);
}
async function offerPaidRevive(why){
  const accepted=await showReviveOffer();
  if(!S.run||!S.G)return;
  delete S.run.pendingRevive;
  if(accepted){
    const r=payRevive(S.run);
    if(r.ok){
      S.G.pos=S.G.start.slice();S.G.moves=0;S.G.hist=[];S.G.done=false;S.G.limit-=S.G.bought||0;S.G.bought=0;S.G.timeLeft=S.G.timeLimit||0;
      $('score').textContent=S.run.score.toLocaleString(numLocale());$('lim').textContent=S.G.limit;recLine();
      saveRun();boardEl.classList.remove('board-lock');S.busy=false;$('bUndo').disabled=true;layout();updateHud();
      syncBossTimer();Music.duck(1);playReviveEffect('¡RENACER!',false);$('msg').textContent=`Renaciste (−${r.cost.toLocaleString(numLocale())} pts). ¡Este tablero empieza de nuevo!`;
      return;
    }
  }
  triggerGameOver(why);
}
function finalFail(why){
  if(S.G.done)return;
  if(S.run.daily){
   const d=S.run.daily;
   d.attempt={index:d.index,pos:S.G.start.slice(),moves:0,hist:[]};
   writeDailyProgress(store,d,{boards:d.boards,attempt:d.attempt});persist();
   S.run.rescue={...snapshotRescue(S.G),kind:'daily'};showRescue('daily');return
  }             // reto diario: se repite cuantas veces se quiera
  if(useFreeRetry(S.run,S.G,why)){saveRun();showRescue();return}
  if(hasRevive(S.run)){useRevive(S.run,S.G);saveRun();showRescue('revive');return}                           // compatibilidad con cargas antiguas
  if(canPaidRevive(S.run,S.run.mode)){S.run.pendingRevive=why||'limit';saveRun();offerPaidRevive(why);return}
  triggerGameOver(why);
}

export function recordBest(final){
  if(!S.run||S.run.daily)return;
  const k=rkey(), r=store.paths[k]||(store.paths[k]={score:0,level:0,runs:0});
  if(S.run.mode==='c'&&S.run.score>r.score){r.score=S.run.score;r.recordAt=Date.now();S.run.recBroken=true}
  if(S.run.level>r.level) r.level=S.run.level;
  if(final) r.runs++;
  persist();
}
