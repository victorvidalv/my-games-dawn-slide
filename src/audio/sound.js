import { Music } from './music.js';
import { SCALES } from './themes.js';
import { S } from '../state.js';
import { $ } from '../dom.js';
/* ============================ Sonido y vibración ============================ */
/** Ganchos que la app conecta, para que el audio no dependa del resto del juego. */
export const hooks={onSuspend:null};
export let AC=null,audioNeedsRecovery=false,audioRecoveryTimer=0,audioPageHidden=false;
export function ctx(){
 if(!AC||AC.state==='closed'){
  const previous=AC,owner=AC=new (window.AudioContext||window.webkitAudioContext)();
  if(previous)audioNeedsRecovery=true;
  if(owner.state==='running')queueMicrotask(()=>completeAudioRecovery(owner));
  owner.addEventListener('statechange',()=>handleAudioState(owner));
 }
 if(!document.hidden&&!audioPageHidden&&(AC.state==='suspended'||AC.state==='interrupted')){
  audioNeedsRecovery=true;const owner=AC;
  try{Promise.resolve(owner.resume()).then(()=>completeAudioRecovery(owner)).catch(()=>queueAudioRecoveryHint())}catch(_){}
 }
 return AC;
}
export let muted=localStorage.getItem('desbloquea.mute')==='1';
/* Los efectos suenan en la tonalidad del tema que toca la música (acordes de su tónica), así nunca desentonan con ella. */
let key={root:55,scale:SCALES.maj};
export const setSfxKey=(th)=>{key={root:th.root,scale:SCALES[th.sc]}};
const TRIAD=[0,2,4];   // fundamental, tercera y quinta de la escala
/** Frecuencia de la nota `i` del arpegio de la tónica (0,1,2 = fundamental, 3ª, 5ª; 3,4,5 = la octava de arriba…) `oct` octavas por encima de la tónica. */
export function keyHz(i=0,oct=1){
  const n=key.scale.length,deg=TRIAD[((i%3)+3)%3]+n*Math.floor(i/3);
  return 440*Math.pow(2,(key.root+12*oct+key.scale[deg%n]+12*Math.floor(deg/n)-69)/12);
}
let noiseBuf=null,noiseOwner=null;
function out(f,t,v,d,lp){   // cadena común: ataque corto (sin clics), caída exponencial y filtro paso bajo opcional
  const g=AC.createGain();g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0002,v),t+.006);g.gain.exponentialRampToValueAtTime(.001,t+d);
  let n=g;if(f){const q=AC.createBiquadFilter();q.type=lp?'lowpass':'bandpass';q.frequency.value=f;if(!lp)q.Q.value=1.2;q.connect(g);n=q}
  g.connect(AC.destination);return n;
}
export function tone(f,d=.1,type='sine',v=.12,delay=0,slide=0,lp=0){
  if(muted||document.hidden||audioPageHidden) return;
  try{
    ctx();
    const t=AC.currentTime+delay,o=AC.createOscillator();
    o.type=type;o.frequency.setValueAtTime(f,t); if(slide) o.frequency.exponentialRampToValueAtTime(Math.max(30,f+slide),t+d);
    o.connect(out(lp,t,v,d,true));o.start(t);o.stop(t+d+.02);
  }catch(e){}
}
/** Ráfaga de ruido filtrado (madera, metal, soplo): `type` es el filtro ('lowpass' golpe sordo, 'bandpass' roce, 'highpass' brillo). */
export function noise(d=.05,v=.1,freq=1200,type='lowpass',delay=0,sweep=0){
  if(muted||document.hidden||audioPageHidden) return;
  try{
    ctx();
    if(noiseOwner!==AC){noiseOwner=AC;noiseBuf=AC.createBuffer(1,AC.sampleRate,AC.sampleRate);const b=noiseBuf.getChannelData(0);for(let i=0;i<b.length;i++)b[i]=Math.random()*2-1}
    const t=AC.currentTime+delay,s=AC.createBufferSource(),q=AC.createBiquadFilter(),g=AC.createGain();
    s.buffer=noiseBuf;q.type=type;q.frequency.setValueAtTime(freq,t);if(sweep)q.frequency.exponentialRampToValueAtTime(Math.max(60,freq+sweep),t+d);
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0002,v),t+.004);g.gain.exponentialRampToValueAtTime(.001,t+d);
    s.connect(q);q.connect(g);g.connect(AC.destination);s.start(t);s.stop(t+d+.02);
  }catch(e){}
}
export const sfx={
  // Pieza deslizante: golpecito de madera (ruido sordo + cuerpo grave) y una nota de la tónica del tema que sube un poco cada vez
  move:()=>{noise(.05,.12,700,'lowpass');tone(keyHz(Math.floor(Math.random()*3),0),.12,'sine',.09,0,-30,900);tone(keyHz(2,1),.1,'triangle',.03,.02,0,2400)},
  /** Marca de casilla al arrastrar: pizzicato suave en la escala del tema (cada casilla una nota distinta). */
  tick:(c=0)=>{tone(keyHz(c,1),.07,'triangle',.045,0,0,2600)},
  // Poder de Jean (rebobinar): barrido de ruido hacia abajo y arpegio que desciende; poder de Juth (destino): hacia arriba, con brillo de runas
  power:(up)=>{
    noise(.9,.05,up?500:3200,'bandpass',0,up?3200:-2600);
    [0,1,2,3,4,5].forEach((k,i)=>{const j=up?i:5-i;tone(keyHz(j,1),.5,'sine',.06,i*.07,0,3200);tone(keyHz(j,2),.35,'triangle',.025,i*.07+.03,0,4200)});
    tone(keyHz(0,0),.9,'triangle',.09,0,up?30:-20,500);
  },
  /** Cada paso del poder: nota del arpegio de la tónica (sube con Destino, baja con Rebobinar) y un tintineo. */
  powerStep:(n,up)=>{const j=up?n:Math.max(0,6-n);tone(keyHz(j,1),.3,'sine',.07,0,0,3600);tone(keyHz(j+3,1),.18,'triangle',.03,.03,0,4200);noise(.07,.03,5200,'highpass')},
  /* Jefe: el golpe de la presentación y el salto al tablero */
  thunder:()=>{noise(.9,.16,180,'lowpass',0);tone(48,1,'sawtooth',.1,.02,-18);tone(36,1.3,'triangle',.12,.08,-10);noise(.4,.08,900,'bandpass',.3)},
  bossGo:()=>{noise(.55,.13,500,'bandpass',0,3600);tone(keyHz(0,0),.7,'sawtooth',.07,0,-20,520);tone(keyHz(2,1),.45,'triangle',.05,.06,0,2400);noise(.25,.1,300,'lowpass',.32)},
  powerEnd:(up)=>{[0,1,2,3].forEach((k,i)=>tone(keyHz(up?i:3-i,2),.5,'sine',.045,i*.06,0,4200));tone(keyHz(0,1),.8,'triangle',.05,0,0,1500)},
  win:()=>[523,659,784,1047,1319].forEach((f,i)=>tone(f,.28,'sine',.13,i*.08)),
  // Nivel superado (no perfecto): arpegio suave y agradable.
  success:()=>{[523,659,784,1047].forEach((f,i)=>tone(f,.4,'sine',.07,i*.1));tone(262,.6,'triangle',.04,0);tone(1568,.3,'sine',.03,.42)},
  perfect:()=>{[523,659,784,1047,1319,1568,2093].forEach((f,i)=>tone(f,.35,'sine',.12,i*.07));
    [1760,2349,2637,3136].forEach((f,i)=>tone(f,.18,'triangle',.05,.5+i*.09));tone(196,.5,'sine',.05,0,30)},
  fail:()=>{tone(260,.7,'triangle',.07,0,-140);tone(130,.8,'sine',.05,.1,-50)},
  hint:()=>{tone(880,.2,'sine',.1);tone(1320,.3,'sine',.08,.08)},
  gateMove:()=>{noise(.03,.07,3600,'bandpass');tone(keyHz(2,2),.07,'square',.03,0,0,2600);tone(keyHz(0,1),.12,'triangle',.06,.05,0,1600);noise(.1,.04,1800,'bandpass',.02,-900)},          // metal: clic de cerradura y deslizar
  heavyMove:()=>{noise(.12,.16,380,'lowpass');tone(keyHz(0,-1),.26,'sine',.16,0,-18,400);tone(keyHz(0,0),.14,'triangle',.05,.02,0,700)},                  // golpe sordo y grave
  iceMove:()=>{noise(.18,.045,2600,'highpass',0,2600);[2,3,4,5].forEach((k,i)=>tone(keyHz(k,2),.16,'sine',.04,i*.045,0,5200))},     // desliz cristalino sobre hielo
  unlock:()=>{[523,784,1047,1568].forEach((f,i)=>tone(f,.16,'triangle',.09,i*.05));tone(1976,.3,'sine',.06,.2)},
  locked:()=>{tone(150,.18,'square',.06);tone(120,.22,'square',.05,.1)},
  doorOpen:()=>{[659,988,1319].forEach((f,i)=>tone(f,.18,'sine',.085,i*.04));tone(1976,.22,'triangle',.04,.12)},
  doorDeny:()=>{tone(180,.14,'sawtooth',.06);tone(135,.18,'triangle',.07,.07,-35)},
  bump:()=>{noise(.04,.07,420,'lowpass');tone(130,.08,'sine',.07,0,-20)},
  bossIntro:()=>{tone(82,.9,'triangle',.14,0,-10);tone(123,.8,'sawtooth',.045,.04,-8);[246,329,493].forEach((f,i)=>tone(f,.5,'sine',.06,.08+i*.09))},
  plate:()=>{tone(330,.1,'triangle',.08);tone(494,.14,'triangle',.07,.07)},
  start:()=>{tone(330,.12,'triangle',.08);tone(494,.18,'triangle',.08,.08)},
  revive:()=>{
    tone(130.8,.85,'triangle',.15,0,130.8);tone(196,.75,'triangle',.1,.06);
    [261.6,329.6,392,523.2,659.3,784,1046.5].forEach((f,i)=>tone(f,.45,'sine',.11,i*.065));
    [1318.5,1568,2093].forEach((f,i)=>tone(f,.55,'triangle',.06,.38+i*.06));
  },
  warn:()=>tone(220,.16,'sine',.04),
  // Don Dublón: su «voz» es un balbuceo de notas graves (más larga la frase, más dura) y tintineos de caja
  merchantCoin:()=>{[1568,2093,2637,3136].forEach((f,i)=>tone(f,.16,'sine',.06,i*.05));tone(880,.3,'triangle',.04,.05)},
  merchantNope:()=>{tone(196,.3,'sawtooth',.055,0,-70);tone(147,.4,'sawtooth',.05,.2,-50)},
  merchantBell:()=>{[1319,1760,2093].forEach((f,i)=>tone(f,.5,'sine',.05,i*.08));tone(660,.6,'triangle',.03,.02)},
  // ruleta del destino: arranque con soplo ascendente, «tac» de madera y oro por sector y campanada de cierre
  fateSpin:()=>{tone(150,1.1,'sawtooth',.025,0,420);tone(300,1.1,'triangle',.035,.05,800);[392,523,659].forEach((f,i)=>tone(f,.5,'sine',.05,.1+i*.07))},
  fateTick:(k=0)=>{const n=k%6;tone(1600+n*70,.03,'square',.03);tone(520+n*34,.07,'triangle',.075);tone(2400,.02,'sine',.03,.005)},
  fateLand:()=>{tone(110,1.6,'sine',.11,0,-30);[523,784,1047,1568].forEach((f,i)=>tone(f,1,'sine',.075,.04+i*.085));tone(2093,.7,'sine',.035,.32);tone(2637,.5,'triangle',.02,.4)},
  fanfare:()=>{[523,659,784,1047,1319,1568,2093].forEach((f,i)=>tone(f,.45,'sine',.12,i*.11));[523,659,784,1047].forEach(f=>tone(f,1.6,'triangle',.07,.85))},
  journey:()=>{[392,494,587,784].forEach((f,i)=>tone(f,.5,'sine',.08,i*.35));tone(98,1.6,'triangle',.06,0,40);[1175,1568].forEach((f,i)=>tone(f,.4,'sine',.05,2+i*.12))},
};

/* Aplausos sintetizados: cientos de palmadas de ruido filtrado con una envolvente que sube y baja */
export const vib=p=>{try{navigator.vibrate&&navigator.vibrate(p)}catch(e){}};
export function soundLabel(){
 const button=$('pSound');if(!button)return;
 const label=muted?'Activar sonido':'Desactivar sonido';
 const extra=muted?'<path d="m21 11 5 6m0-6-5 6"/>':'<path d="M21 10q6 4 0 8m3-11q9 7 0 14"/>';
 button.innerHTML=`<span>${label}</span><svg class="pause-icon" viewBox="0 0 30 28" aria-hidden="true"><path d="M4 11h5l7-6v18l-7-6H4Z"/>${extra}</svg>`;
 button.setAttribute('aria-pressed',String(!muted));button.setAttribute('aria-label',label);
}
export function toggleSound(){
  muted=!muted;localStorage.setItem('desbloquea.mute',muted?'1':'0');soundLabel();
  if(muted)Music.stop(.2);
  else{
    unlockAudio();
    if(S.G&&!S.G.done){Music.start();Music.muffle($('menu').classList.contains('show')||$('pause').classList.contains('show'))}
    else Music.scene($('heroSelect')?.classList.contains('show')?'heroes':'menu');     // sin partida: vuelve la música del menú
  }
  document.dispatchEvent(new Event('soundstate'));
}
/** ¿El audio del navegador está realmente sonando? (puede estar suspendido hasta un toque, o interrumpido en iOS) */
export const audioRunning=()=>!!AC&&AC.state==='running';
/**
 * Desbloquea el audio dentro de un gesto del usuario: crea/reanuda el contexto y reproduce un búfer mudo (truco de iOS/Safari),
 * y vuelve a arrancar la música si estaba parada. Devuelve una promesa que se cumple cuando el audio ya suena.
 */
export function unlockAudio(){
  if(muted)return Promise.resolve(false);
  try{
    const c=ctx(),b=c.createBuffer(1,1,22050),src=c.createBufferSource();
    src.buffer=b;src.connect(c.destination);src.start(0);
    return Promise.resolve(c.state==='running'?true:c.resume()).then(()=>{
      audioNeedsRecovery=true;completeAudioRecovery(c);
      document.dispatchEvent(new Event('soundstate'));
      return c.state==='running';
    }).catch(()=>false);
  }catch(_){return Promise.resolve(false)}
}
soundLabel();

/* Safari may return from background as "interrupted", not just "suspended".
   Retry resume directly inside every trusted gesture; never await before it. */
export function clearAudioRecoveryHint(){clearTimeout(audioRecoveryTimer);audioRecoveryTimer=0;const hint=$('audioRecover');if(hint)hint.hidden=true}
function queueAudioRecoveryHint(){
 // Ya no se muestra un aviso aparte: el botón de sonido (un solo icono) indica y arregla el estado del audio
}
function completeAudioRecovery(owner=AC){
 if(owner!==AC||!owner||owner.state!=='running'||document.hidden||audioPageHidden||muted)return;
 const needed=audioNeedsRecovery;audioNeedsRecovery=false;clearAudioRecoveryHint();
 if(needed&&Music.playing)Music.recover();
}
function handleAudioState(owner){
 if(owner!==AC)return;
 document.dispatchEvent(new Event('soundstate'));
 if(owner.state==='running'){completeAudioRecovery(owner);return}
 audioNeedsRecovery=true;Music.background();
 if(!document.hidden&&!audioPageHidden&&!muted&&owner.state!=='closed')recoverPageAudio();
}
function recoverPageAudio(fromGesture=false){
 if(fromGesture&&!document.hidden)audioPageHidden=false;
 if(document.hidden||audioPageHidden||muted){clearAudioRecoveryHint();return}
 if(!AC){if(!fromGesture)return;try{ctx()}catch(_){return}}
 if(AC.state==='running'&&!audioNeedsRecovery)return;
 audioNeedsRecovery=true;
 try{
  if(AC.state==='closed')ctx();
  const owner=AC;
  if(owner.state==='running'){completeAudioRecovery(owner);return}
  // Must be called synchronously from touch/pointer/key handlers on iOS.
  Promise.resolve(owner.resume()).then(()=>completeAudioRecovery(owner)).catch(()=>queueAudioRecoveryHint());
 }catch(_){queueAudioRecoveryHint()}
 queueAudioRecoveryHint();
}
function suspendPageAudio(){
 audioPageHidden=true;
 hooks.onSuspend?.();                       // la app guarda la partida (se asigna en main.js)
 clearAudioRecoveryHint();Music.background();
 if(!AC)return;audioNeedsRecovery=true;
 if(AC.state==='running'){try{Promise.resolve(AC.suspend()).catch(()=>{})}catch(_){}}
}
addEventListener('pagehide',suspendPageAudio);
addEventListener('pageshow',()=>{audioPageHidden=false;recoverPageAudio()});
addEventListener('focus',()=>{if(!document.hidden)audioPageHidden=false;recoverPageAudio()});
document.addEventListener('visibilitychange',()=>{if(document.hidden)suspendPageAudio();else{audioPageHidden=false;recoverPageAudio()}});
for(const event of ['pointerdown','touchstart','touchend','click','keydown'])addEventListener(event,()=>{recoverPageAudio(true);if(!muted&&AC&&AC.state!=='running')unlockAudio()},{capture:true,passive:true});
$('audioRecover').onclick=()=>recoverPageAudio(true);
