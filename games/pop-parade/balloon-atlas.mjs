// Static balloon bodies are shared by color and special type. Strings, hover,
// compression, and frozen rings remain animated on the main canvas.
export const COLORS = ['#76d7ec', '#b39aee', '#ff927e', '#f4ce80', '#90dfbe'];
const channels = new Map();
export function rgba(color, alpha) {
  if(!channels.has(color)) channels.set(color,[1,3,5].map(i=>parseInt(color.slice(i,i+2),16)).join(','));
  return `rgba(${channels.get(color)},${alpha})`;
}
export class BalloonAtlas {
  constructor(dpr=1) { this.dpr=dpr; this.sprites=new Map(); }
  setDpr(dpr) { if(this.dpr!==dpr){this.dpr=dpr;this.sprites.clear();} }
  get(colorIndex,special) {
    const kind=['lightning','freeze','rainbow'].includes(special)?special:'';
    const key=`${colorIndex}:${kind}`;
    if(!this.sprites.has(key)) {
      const canvas=document.createElement('canvas');
      canvas.width=canvas.height=Math.round(112*this.dpr);
      const ctx=canvas.getContext('2d');ctx.scale(this.dpr,this.dpr);ctx.translate(56,56);
      paintBody(ctx,COLORS[colorIndex],kind,32);
      this.sprites.set(key,canvas);
    }
    return this.sprites.get(key);
  }
}
function paintBody(ctx,color,special,r) {
  const ry=r*1.14;
  const glow = ctx.createRadialGradient(0, 0, r * .4, 0, 0, r * 1.65);
  glow.addColorStop(0, rgba(color, special ? .1 : .045)); glow.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(0, 0, r * 1.65, 0, Math.PI * 2); ctx.fill();
  const fill = ctx.createRadialGradient(-r * .38, -ry * .45, 0, r * .1, ry * .1, r * 1.5);
  fill.addColorStop(0, rgba(color, .84)); fill.addColorStop(.32, rgba(color, .49));
  fill.addColorStop(.72, rgba(color, .23)); fill.addColorStop(1, rgba(color, .7));
  ctx.fillStyle = fill; ctx.strokeStyle = rgba(color, .68); ctx.lineWidth = .9;
  ctx.beginPath(); ctx.ellipse(0, 0, r, ry, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  // The lower inner rim and two soft highlights give the balloon translucent volume.
  ctx.beginPath(); ctx.ellipse(0, ry * .03, r * .91, ry * .94, 0, .18, 2.45);
  ctx.strokeStyle = rgba(color, .28); ctx.lineWidth = 1.4; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(-r * .32, -ry * .39, r * .14, ry * .27, .5, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,.34)'; ctx.fill();
  ctx.beginPath(); ctx.ellipse(-r * .1, -ry * .65, r * .07, ry * .05, -.35, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fill();
  ctx.beginPath(); ctx.moveTo(-3, ry + 4); ctx.lineTo(0, ry - 1); ctx.lineTo(3, ry + 4);
  ctx.closePath(); ctx.fillStyle = rgba(color, .65); ctx.fill();
  if (special) {
    ctx.save();ctx.translate(0,3);ctx.scale(r*.8,r*.8);
    ctx.fillStyle = '#f4f1e9';ctx.strokeStyle='#f4f1e9';ctx.lineWidth=.06;ctx.lineJoin='round';ctx.lineCap='round';
    if(special==='lightning'){
      ctx.beginPath();ctx.moveTo(.12,-.55);ctx.lineTo(-.35,.08);ctx.lineTo(-.02,.08);
      ctx.lineTo(-.12,.55);ctx.lineTo(.35,-.1);ctx.lineTo(.02,-.1);ctx.closePath();ctx.fill();
    }else{
      for(let i=0;i<(special==='freeze'?6:8);i++){
        ctx.save();ctx.rotate(i*Math.PI*2/(special==='freeze'?6:8));
        ctx.beginPath();ctx.moveTo(0,.13);ctx.lineTo(0,.49);
        if(special==='freeze'){ctx.moveTo(-.13,.3);ctx.lineTo(0,.4);ctx.lineTo(.13,.3);}
        ctx.stroke();ctx.restore();
      }
      ctx.beginPath();ctx.arc(0,0,.07,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
    if (special === 'rainbow') {
      for (let i=0;i<5;i++) {
        ctx.beginPath(); ctx.ellipse(0,0,r+2,ry+2,0,i*1.257,(i+1)*1.257);
        ctx.strokeStyle = rgba(COLORS[i], .85); ctx.lineWidth = 1.5; ctx.stroke();
      }
    }
  }
}
