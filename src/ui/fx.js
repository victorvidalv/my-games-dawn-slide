import { $ } from '../dom.js';
import { numLocale } from '../i18n.js';
/* ============================ Partículas ============================ */
const cv=$('fx'),cx=cv.getContext('2d');let parts=[],raf=0;
function fit(){const d=devicePixelRatio||1;cv.width=innerWidth*d;cv.height=innerHeight*d;cx.setTransform(d,0,0,d,0,0)}
addEventListener('resize',fit);fit();
export function burst(x,y,n=40,cols=['#ffcf6b','#ff6a6a','#43e0c1','#6cb6ff','#b18cff','#ff9cc7'],sp=7){
  for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=sp*(.3+Math.random());
    parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-3,g:.22,life:60+Math.random()*40,max:100,c:cols[i%cols.length],r:2+Math.random()*4,rot:Math.random()*6,vr:(Math.random()-.5)*.4})}
  if(!raf) raf=requestAnimationFrame(tick);
}
/**
 * Chispas de luz: motas redondas que brillan (mezcla aditiva), se frenan solas y se apagan; sin gravedad ni papelitos.
 * `rect` opcional: nacen repartidas por el borde de ese rectángulo y se alejan de su centro (polvo de luz alrededor de una pieza).
 */
export function motes(x,y,n=12,cols=['#fff','#ffe9ad'],sp=3,rect=null){
  for(let i=0;i<n;i++){
    let px=x,py=y,a=Math.random()*Math.PI*2;
    if(rect){
      const t=Math.random(),side=Math.floor(Math.random()*4);
      px=side<2?rect.left+rect.width*t:(side===2?rect.left:rect.right);py=side<2?(side===0?rect.top:rect.bottom):rect.top+rect.height*t;
      a=Math.atan2(py-(rect.top+rect.height/2),px-(rect.left+rect.width/2))+(Math.random()-.5)*.6;
    }
    const s=sp*(.35+Math.random()*.9),life=16+Math.random()*18;
    parts.push({mote:1,x:px,y:py,vx:Math.cos(a)*s,vy:Math.sin(a)*s-.25,life,max:life,c:cols[i%cols.length],r:1.2+Math.random()*2.6});
  }
  if(!raf) raf=requestAnimationFrame(tick);
}
function tick(){
  cx.clearRect(0,0,innerWidth,innerHeight);
  parts=parts.filter(p=>p.life>0);
  for(const p of parts){
    if(p.mote){p.x+=p.vx;p.y+=p.vy;p.vx*=.9;p.vy*=.9;p.life--;const k=Math.max(0,p.life/p.max);
      cx.save();cx.globalCompositeOperation='lighter';cx.globalAlpha=k;cx.fillStyle=p.c;cx.shadowColor=p.c;cx.shadowBlur=10;
      cx.beginPath();cx.arc(p.x,p.y,p.r*(.5+k*.7),0,Math.PI*2);cx.fill();cx.restore();continue}
    p.x+=p.vx;p.y+=p.vy;p.vy+=p.g;p.vx*=.99;p.life--;p.rot+=p.vr;
    cx.save();cx.globalAlpha=Math.min(1,p.life/30);cx.translate(p.x,p.y);cx.rotate(p.rot);cx.fillStyle=p.c;cx.fillRect(-p.r,-p.r/2,p.r*2,p.r);cx.restore()}
  raf=parts.length?requestAnimationFrame(tick):0;
}
export function countUp(el,from,to,ms=900,fmt=v=>Math.round(v).toLocaleString(numLocale())){
  const t0=performance.now();(function f(t){const k=Math.min(1,(t-t0)/ms),e=1-Math.pow(1-k,3);el.textContent=fmt(from+(to-from)*e);if(k<1)requestAnimationFrame(f)})(t0);
}

