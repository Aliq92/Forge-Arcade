var at=Object.defineProperty;var st=(n,t,i)=>t in n?at(n,t,{enumerable:!0,configurable:!0,writable:!0,value:i}):n[t]=i;var o=(n,t,i)=>st(n,typeof t!="symbol"?t+"":t,i);(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const a of document.querySelectorAll('link[rel="modulepreload"]'))e(a);new MutationObserver(a=>{for(const s of a)if(s.type==="childList")for(const r of s.addedNodes)r.tagName==="LINK"&&r.rel==="modulepreload"&&e(r)}).observe(document,{childList:!0,subtree:!0});function i(a){const s={};return a.integrity&&(s.integrity=a.integrity),a.referrerPolicy&&(s.referrerPolicy=a.referrerPolicy),a.crossOrigin==="use-credentials"?s.credentials="include":a.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function e(a){if(a.ep)return;a.ep=!0;const s=i(a);fetch(a.href,s)}})();const C=-.5,P=0,v=1.5,y=1e-8,ot=5e-8,rt=.01,ct=1e-4;class lt{constructor(){o(this,"centerX",C);o(this,"centerY",P);o(this,"scale",v);o(this,"targetCenterX",C);o(this,"targetCenterY",P);o(this,"targetScale",v);o(this,"moving",!1)}reset(t=!0){this.jumpTo(C,P,v,t)}jumpTo(t,i,e,a=!0){const s=FractalCore.limitScale(e);this.targetCenterX=t,this.targetCenterY=i,this.targetScale=s,a||(this.centerX=t,this.centerY=i,this.scale=s),this.moving=!0}stop(){this.targetCenterX=this.centerX;this.targetCenterY=this.centerY;this.targetScale=this.scale;this.moving=false}panInstant(t,i){this.centerX+=t,this.centerY+=i,this.targetCenterX=this.centerX,this.targetCenterY=this.centerY}zoomInstant(t,i,e){const a=O(this.scale/t),s=this.scale/a;this.centerX=i+(this.centerX-i)/s,this.centerY=e+(this.centerY-e)/s,this.scale=a,this.targetCenterX=this.centerX,this.targetCenterY=this.centerY,this.targetScale=this.scale}zoomTo(t,i,e){const a=O(this.targetScale/t),s=this.scale/a;this.targetCenterX=i+(this.centerX-i)/s,this.targetCenterY=e+(this.centerY-e)/s,this.targetScale=a,this.moving=!0}update(t){const i=1-Math.exp(-10*t);this.centerX+=(this.targetCenterX-this.centerX)*i,this.centerY+=(this.targetCenterY-this.centerY)*i,this.scale+=(this.targetScale-this.scale)*i;const e=ct*Math.max(this.scale,y),a=Math.hypot(this.targetCenterX-this.centerX,this.targetCenterY-this.centerY),s=Math.abs(this.targetScale-this.scale)/Math.max(this.scale,y);return a<e&&s<rt?(this.centerX=this.targetCenterX,this.centerY=this.targetCenterY,this.scale=this.targetScale,this.moving=!1,!1):(this.moving=!0,!0)}isAnimating(){return this.moving}screenToComplex(t,i,e){const a=this.scale,s=this.scale*(e.width/e.height),r=(t/e.width-.5)*2,l=(.5-i/e.height)*2;return{x:this.centerX+r*s,y:this.centerY+l*a}}getZoomDepth(){return v/this.scale}isNearPrecisionLimit(){return this.scale<=ot}atPrecisionFloor(){return this.scale<=y*1.0001}}function O(n){return FractalCore.limitScale(n)}function M(n){if(n<1e3)return`${n.toFixed(1)}×`;const t=Math.floor(Math.log10(n));return`${(n/Math.pow(10,t)).toFixed(2)}×10${dt(t)}`}const ht={0:"⁰",1:"¹",2:"²",3:"³",4:"⁴",5:"⁵",6:"⁶",7:"⁷",8:"⁸",9:"⁹","-":"⁻"};function dt(n){return String(n).split("").map(t=>ht[t]??t).join("")}function Y(n,t){const i=Math.max(0,Math.ceil(-Math.log10(t))),e=Math.min(17,Math.max(6,4+i));return n.toFixed(e)}const ut=5e3,mt=`#version 300 es
// Fullscreen triangle via gl_VertexID — no vertex buffer needed.
void main() {
  float x = float((gl_VertexID & 1) << 2) - 1.0;
  float y = float((gl_VertexID & 2) << 1) - 1.0;
  gl_Position = vec4(x, y, 0.0, 1.0);
}
`,pt=`#version 300 es
precision highp float;
precision highp int;

uniform vec2 u_centerX;   // (hi, lo)
uniform vec2 u_centerY;   // (hi, lo)
uniform float u_scale;    // half-height of viewport in complex-plane units
uniform float u_aspect;   // viewport width / height
uniform vec2 u_resolution;
uniform float u_maxIter;

uniform vec3 u_paletteA;
uniform vec3 u_paletteB;
uniform vec3 u_paletteC;
uniform vec3 u_paletteD;
uniform float u_paletteCycles;
uniform vec3 u_interior;

out vec4 fragColor;

// ---- double-single (df) helpers -------------------------------------

vec2 twoSum(float a, float b) {
  float s = a + b;
  float v = s - a;
  float e = (a - (s - v)) + (b - v);
  return vec2(s, e);
}

vec2 dfSplit(float a) {
  float c = 4097.0 * a; // Veltkamp split constant for float32 (2^12 + 1)
  float hi = c - (c - a);
  float lo = a - hi;
  return vec2(hi, lo);
}

vec2 twoProd(float a, float b) {
  float p = a * b;
  vec2 as = dfSplit(a);
  vec2 bs = dfSplit(b);
  float e = ((as.x * bs.x - p) + as.x * bs.y + as.y * bs.x) + as.y * bs.y;
  return vec2(p, e);
}

vec2 dfAdd(vec2 a, vec2 b) {
  vec2 s = twoSum(a.x, b.x);
  s.y += a.y + b.y;
  vec2 r = twoSum(s.x, s.y);
  return r;
}

vec2 dfSub(vec2 a, vec2 b) {
  return dfAdd(a, vec2(-b.x, -b.y));
}

vec2 dfMul(vec2 a, vec2 b) {
  vec2 p = twoProd(a.x, b.x);
  p.y += a.x * b.y + a.y * b.x;
  return twoSum(p.x, p.y);
}

vec2 dfAddF(vec2 a, float b) {
  vec2 s = twoSum(a.x, b);
  s.y += a.y;
  return twoSum(s.x, s.y);
}

// Strict interior tests avoid hundreds of iterations in the main cardioid
// and period-two bulb. Leave a margin at the boundary for float32 rounding.
bool knownInterior(float cx, float cy) {
  float x = cx - 0.25;
  float yy = cy * cy;
  float q = x * x + yy;
  float bulbX = cx + 1.0;
  return q * (q + x) < 0.25 * yy - 0.00001 ||
         bulbX * bulbX + yy < 0.0625 - 0.00001;
}

// ---- Mandelbrot core ---------------------------------------------------

void main() {
  vec2 normalized=(gl_FragCoord.xy/u_resolution-.5)*2.0;
  vec2 cr=dfAddF(u_centerX,normalized.x*u_scale*u_aspect);
  vec2 ci=dfAddF(u_centerY,normalized.y*u_scale);
  // Finite nonescape sentinel; UI never labels this a proof of membership.
  if(u_scale>=.001&&knownInterior(cr.x,ci.x)){fragColor=vec4(1.0,1.0,0.0,0.0);return;}
  vec2 zr=vec2(0.0),zi=vec2(0.0);
  float n=0.0,magnitude=0.0;bool escaped=false;
  for(int i=0;i<5000;i++){
    if(float(i)>=u_maxIter)break;
    vec2 rr=dfMul(zr,zr),ii=dfMul(zi,zi),ri=dfMul(zr,zi);
    zr=dfAdd(dfSub(rr,ii),cr);zi=dfAdd(dfAdd(ri,ri),ci);n+=1.0;
    vec2 r2=dfMul(zr,zr),i2=dfMul(zi,zi);
    magnitude=(r2.x+r2.y)+(i2.x+i2.y);
    if(magnitude>256.0){escaped=true;break;}
  }
  if(!escaped){fragColor=vec4(1.0,1.0,0.0,0.0);return;}
  float mu=n+1.0-log2(log2(sqrt(magnitude)));
  float packed=floor(clamp((mu+4.0)*16.0,0.0,65534.0)+.5);
  fragColor=vec4(floor(n/256.0),mod(n,256.0),floor(packed/256.0),mod(packed,256.0))/255.0;
}
`;function X(n){const t=Math.fround(n),i=Math.fround(n-t);return[t,i]}function F(n,t,i){const e=n.createShader(t);if(!e)throw new Error("Failed to create shader");if(n.shaderSource(e,i),n.compileShader(e),!n.getShaderParameter(e,n.COMPILE_STATUS)){const a=n.getShaderInfoLog(e);throw n.deleteShader(e),new Error(`Shader compile error: ${a}`)}return e}const gt=6,vt=400,yt=34,xt=2,bt=3.2,wt=2.6,B=200,H=1.35,S=.12;class Et{constructor(t,i,e){o(this,"canvas");o(this,"camera");o(this,"cb");o(this,"pointers",new Map);o(this,"dragStart",null);o(this,"dragLast",null);o(this,"dragMoved",!1);o(this,"pinchLastDist",0);o(this,"pinchLastMid",{x:0,y:0});o(this,"lastTapTime",0);o(this,"lastTapPos",{x:0,y:0});o(this,"interactionActiveCount",0);o(this,"interactionEndTimer",null);o(this,"boundHandlers",[]);o(this,"onPointerDown",t=>{if(t.pointerType==="mouse"&&t.button!==0)return;if((t.pointerType!=="mouse"||t.button===0)&&this.camera.stop(),this.canvas.setPointerCapture(t.pointerId),this.pointers.set(t.pointerId,{x:t.clientX,y:t.clientY,pointerType:t.pointerType}),this.markActive(),this.pointers.size===1)this.dragStart={x:t.clientX,y:t.clientY},this.dragLast={x:t.clientX,y:t.clientY},this.dragMoved=!1;else if(this.pointers.size===2){const i=Array.from(this.pointers.values());this.pinchLastDist=Math.hypot(i[0].x-i[1].x,i[0].y-i[1].y),this.pinchLastMid={x:(i[0].x+i[1].x)/2,y:(i[0].y+i[1].y)/2},this.dragMoved=!0}this.canvas.classList&&this.canvas.classList.add("dragging")});o(this,"onPointerMove",t=>{if(this.pointers.has(t.pointerId)){if(this.pointers.set(t.pointerId,{x:t.clientX,y:t.clientY,pointerType:t.pointerType}),this.pointers.size>=2){const i=Array.from(this.pointers.values()),e=Math.hypot(i[0].x-i[1].x,i[0].y-i[1].y),a={x:(i[0].x+i[1].x)/2,y:(i[0].y+i[1].y)/2};if(this.panByPixelDelta(this.pinchLastMid.x,this.pinchLastMid.y,a.x,a.y),this.pinchLastDist>0){const s=e/this.pinchLastDist;isFinite(s)&&s>0&&this.zoomAtPixel(a.x,a.y,s,!1)}this.pinchLastDist=e,this.pinchLastMid=a;return}if(this.dragLast&&this.dragStart){const i=t.clientX-this.dragStart.x,e=t.clientY-this.dragStart.y;!this.dragMoved&&Math.hypot(i,e)>gt&&(this.dragMoved=!0,this.dragLast={x:this.dragStart.x,y:this.dragStart.y}),this.dragMoved&&this.panByPixelDelta(this.dragLast.x,this.dragLast.y,t.clientX,t.clientY),this.dragLast={x:t.clientX,y:t.clientY}}}});o(this,"onPointerUp",t=>{if(!this.pointers.has(t.pointerId))return;const i=this.pointers.get(t.pointerId).pointerType;this.pointers.delete(t.pointerId);try{this.canvas.releasePointerCapture(t.pointerId)}catch{}if(this.markSettling(),this.pointers.size===1){const e=Array.from(this.pointers.values())[0];this.dragStart={x:e.x,y:e.y},this.dragLast={x:e.x,y:e.y},this.dragMoved=!0;return}this.pointers.size===0&&(this.canvas.classList.remove("dragging"),this.dragMoved||this.handleTap(t.clientX,t.clientY,i),this.dragStart=null,this.dragLast=null,this.dragMoved=!1)});o(this,"onWheel",t=>{t.preventDefault(),this.markActive(),this.markSettling();const i=Math.max(-B,Math.min(B,t.deltaY)),e=Math.pow(1.0025,-i);this.zoomAtPixel(t.clientX,t.clientY,e,!0)});o(this,"onKeyDown",t=>{if(t.metaKey||t.ctrlKey||t.altKey||["INPUT","SELECT","TEXTAREA","BUTTON"].includes(t.target?.tagName)||document.getElementById("intro").getAttribute("aria-hidden")!=="true")return;const i=this.cb.getViewport(),e=i.width/2,a=i.height/2;switch(t.key){case"+":case"=":this.markActive(),this.markSettling(),this.zoomAtPixel(e,a,H,!0);break;case"-":case"_":this.markActive(),this.markSettling(),this.zoomAtPixel(e,a,1/H,!0);break;case"ArrowUp":this.keyPan(0,i.height*S);break;case"ArrowDown":this.keyPan(0,-i.height*S);break;case"ArrowLeft":this.keyPan(i.width*S,0);break;case"ArrowRight":this.keyPan(-i.width*S,0);break;case"r":case"R":this.cb.onResetView();break;case"s":case"S":this.cb.onSaveLocation();break;case"d":case"D":this.cb.onRandomDive();break;case"[":this.cb.onIterationsDelta(-1);break;case"]":this.cb.onIterationsDelta(1);break;default:return}t.preventDefault()});this.canvas=t,this.camera=i,this.cb=e,this.attach()}on(t,i,e,a){t.addEventListener(i,e,a),this.boundHandlers.push([t,i,e,a])}attach(){this.on(this.canvas,"pointerdown",this.onPointerDown),this.on(window,"pointermove",this.onPointerMove),this.on(window,"pointerup",this.onPointerUp),this.on(window,"pointercancel",this.onPointerUp),this.on(this.canvas,"wheel",this.onWheel,{passive:!1}),this.on(this.canvas,"contextmenu",t=>t.preventDefault()),this.on(window,"keydown",this.onKeyDown)}dispose(){for(const[t,i,e,a]of this.boundHandlers)t.removeEventListener(i,e,a);this.boundHandlers=[],this.interactionEndTimer!==null&&window.clearTimeout(this.interactionEndTimer)}markActive(){this.interactionActiveCount++,this.interactionEndTimer!==null&&(window.clearTimeout(this.interactionEndTimer),this.interactionEndTimer=null),this.cb.onInteractionStart()}markSettling(){this.interactionActiveCount=Math.max(0,this.interactionActiveCount-1),this.interactionActiveCount===0&&(this.interactionEndTimer!==null&&window.clearTimeout(this.interactionEndTimer),this.interactionEndTimer=window.setTimeout(()=>this.cb.onInteractionEnd(),140))}zoomAtPixel(t,i,e,a){const s=this.cb.getViewport(),r=this.camera.screenToComplex(t,i,s);a?this.camera.zoomTo(e,r.x,r.y):this.camera.zoomInstant(e,r.x,r.y);this.cb.onViewChange()}panByPixelDelta(t,i,e,a){const s=this.cb.getViewport(),r=this.camera.screenToComplex(t,i,s),l=this.camera.screenToComplex(e,a,s);this.camera.panInstant(r.x-l.x,r.y-l.y),this.cb.onViewChange()}handleTap(t,i,e){const a=performance.now(),s=a-this.lastTapTime,r=Math.hypot(t-this.lastTapPos.x,i-this.lastTapPos.y),l=s<vt&&r<yt;e==="mouse"?this.zoomAtPixel(t,i,l?bt:xt,!0):l&&this.zoomAtPixel(t,i,wt,!0),l?this.lastTapTime=0:(this.lastTapTime=a,this.lastTapPos={x:t,y:i})}keyPan(t,i){this.markActive(),this.markSettling();const e=this.cb.getViewport(),a=e.width/2,s=e.height/2,r=this.camera.screenToComplex(a,s,e),l=this.camera.screenToComplex(a-t,s-i,e);this.camera.targetCenterX+=r.x-l.x,this.camera.targetCenterY+=r.y-l.y,this.cb.onViewChange()}}const w=FractalCore.palettes,St=w[0].id;function Lt(n){return w.find(t=>t.id===n)??w[0]}function Tt(n){const t=[];for(let e=0;e<=8;e++){const a=e/8*n.cycles,s=kt(n,a),r=e/8*100;t.push(`rgb(${s.map(l=>Math.round(l*255)).join(",")}) ${r}%`)}return`linear-gradient(90deg, ${t.join(", ")})`}function kt(n,t){const i=[0,0,0];for(let e=0;e<3;e++){const a=n.a[e]+n.b[e]*Math.cos(2*Math.PI*(n.c[e]*t+n.d[e]));i[e]=Math.min(1,Math.max(0,a))}return i}const U=[{name:"Main Set",x:-.5,y:0,scale:1.5,iterations:300},{name:"Seahorse Valley",x:-.75,y:.1,scale:.02,iterations:600},{name:"Elephant Valley",x:.275,y:0,scale:.045,iterations:600},{name:"Double Spiral",x:-.7453,y:.1127,scale:9e-4,iterations:1200},{name:"Mini Mandelbrot",x:-1.768778833,y:.001738996,scale:6e-5,iterations:1500},{name:"Needle Antenna",x:-1.999985,y:0,scale:25e-5,iterations:900}],_t=[...U.slice(1),{name:"Seahorse Tendrils",x:-.745428,y:.113009,scale:6e-4,iterations:1200},{name:"Valley Filament",x:-.16070135,y:1.0375665,scale:8e-4,iterations:900},{name:"Spiral Junction",x:-.77468065,y:-.1374168,scale:4e-4,iterations:1400},{name:"Cardioid Notch",x:-.748,y:.065,scale:.006,iterations:700},{name:"Antenna Bud",x:-1.7499,y:0,scale:.004,iterations:700},{name:"Feigenbaum Cascade",x:-1.401155,y:0,scale:15e-5,iterations:1600},{name:"Satellite Bloom",x:.3245046,y:.04855101,scale:.0015,iterations:900},{name:"Deep Seahorse",x:-.743643887037151,y:.13182590420533,scale:4e-6,iterations:2200},{name:"Lagoon Bud",x:-.10109636384562,y:.95628651080914,scale:.0012,iterations:900}];function Ct(n){const t=_t;return t[Math.floor(Math.random()*t.length)]}function c(n){const t=document.getElementById(n);if(!t)throw new Error(`Missing element #${n}`);return t}class Pt{constructor(t){o(this,"intro",c("intro"));o(this,"hud",c("hud"));o(this,"controls",c("controls"));o(this,"hudX",c("hud-x"));o(this,"hudY",c("hud-y"));o(this,"hudZoom",c("hud-zoom"));o(this,"hudIter",c("hud-iter"));o(this,"hudFps",c("hud-fps"));o(this,"hudPrecision",c("hud-precision"));o(this,"toast",c("toast"));o(this,"palettePanel",c("palette-panel"));o(this,"paletteList",c("palette-list"));o(this,"placesPanel",c("places-panel"));o(this,"presetsList",c("presets-list"));o(this,"bookmarksList",c("bookmarks-list"));o(this,"bookmarksEmpty",c("bookmarks-empty"));o(this,"toastTimer",null);o(this,"cb");this.cb=t,this.wireButtons(),this.renderPalettes(w[0].id),this.renderPresets()}wireButtons(){c("begin-dive").addEventListener("click",()=>this.cb.onBeginDive()),c("btn-zoom-in").addEventListener("click",()=>this.cb.onZoomIn()),c("btn-zoom-out").addEventListener("click",()=>this.cb.onZoomOut()),c("btn-reset").addEventListener("click",()=>this.cb.onReset()),c("btn-random-dive").addEventListener("click",()=>this.cb.onRandomDive()),c("btn-iter-down").addEventListener("click",()=>this.cb.onIterDelta(-1)),c("btn-iter-up").addEventListener("click",()=>this.cb.onIterDelta(1)),c("btn-save").addEventListener("click",()=>this.cb.onSaveLocation()),c("btn-palette").addEventListener("click",()=>this.togglePanel(this.palettePanel)),c("btn-places").addEventListener("click",()=>this.togglePanel(this.placesPanel)),document.querySelectorAll("[data-close]").forEach(t=>{t.addEventListener("click",()=>{const i=t.getAttribute("data-close");i&&(c(i).hidden=!0)})})}togglePanel(t){const i=t.hidden;this.palettePanel.hidden=!0,this.placesPanel.hidden=!0,t.hidden=!i}showExplorer(){this.intro.classList.add("hidden"),this.intro.inert=true,this.intro.setAttribute("aria-hidden","true"),this.hud.setAttribute("aria-hidden","false"),this.controls.setAttribute("aria-hidden","false")}setFaded(t){this.hud.classList.toggle("faded",t),this.controls.classList.toggle("faded",t)}updateHUD(t,i,e,a,s,r,l){this.hudX.textContent=Y(t,e),this.hudY.textContent=Y(i,e),this.hudZoom.textContent=M(a),this.hudIter.textContent=String(s);const f=r>0?Math.min(999,Math.round(1e3/r)):0;this.hudFps.textContent=`${r.toFixed(0)} ms elapsed`,this.hudPrecision.hidden=!l}showToast(t,i=2200){this.toast.textContent=t,this.toast.hidden=!1,this.toast.offsetWidth,this.toast.classList.add("show"),this.toastTimer!==null&&window.clearTimeout(this.toastTimer),this.toastTimer=window.setTimeout(()=>{this.toast.classList.remove("show"),window.setTimeout(()=>{this.toast.hidden=!0},350)},i)}renderPalettes(t){this.paletteList.innerHTML="";for(const i of w){const e=document.createElement("button");e.type="button";e.className="palette-swatch"+(i.id===t?" active":""),e.dataset.paletteId=i.id,e.innerHTML=`<span class="swatch-strip" style="background:${Tt(i)}"></span><span class="swatch-name">${i.name}</span>`,e.addEventListener("click",()=>{this.setActivePalette(i.id),this.cb.onSelectPalette(i.id),this.closePanels()}),this.paletteList.appendChild(e)}}setActivePalette(t){this.paletteList.querySelectorAll(".palette-swatch").forEach(i=>{i.classList.toggle("active",i.dataset.paletteId===t)})}renderPresets(){this.presetsList.innerHTML="";for(const t of U){const i=document.createElement("button");i.type="button";i.className="entry-item",i.innerHTML=`<div class="entry-main"><span class="entry-name">${Mt(t.name)}</span><span class="entry-meta">${M(1.5/t.scale)}</span></div>`,i.addEventListener("click",()=>this.cb.onSelectPreset(t)),this.presetsList.appendChild(i)}}renderBookmarks(t){this.bookmarksList.innerHTML="",this.bookmarksEmpty.hidden=t.length>0;for(const i of t){const e=document.createElement("div");e.className="entry-item";const a=document.createElement("button");a.type="button";a.className="entry-main",a.style.cursor="pointer";const s=document.createElement("span");s.className="entry-name",s.textContent=i.name;const r=document.createElement("span");r.className="entry-meta",r.textContent=`${M(1.5/i.scale)} · iter ${i.iterations}`,a.appendChild(s),a.appendChild(r),a.addEventListener("click",()=>this.cb.onSelectBookmark(i));const l=document.createElement("div");l.className="entry-actions";const f=document.createElement("button");f.textContent="✎",f.title="Rename",f.setAttribute("aria-label","Rename bookmark"),f.addEventListener("click",d=>{d.stopPropagation(),this.startRename(s,i)});const m=document.createElement("button");m.textContent="✕",m.title="Delete",m.setAttribute("aria-label","Delete bookmark"),m.addEventListener("click",d=>{d.stopPropagation(),this.cb.onDeleteBookmark(i.id)}),l.appendChild(f),l.appendChild(m),e.appendChild(a),e.appendChild(l),this.bookmarksList.appendChild(e)}}startRename(t,i){const e=document.createElement("input");e.type="text",e.value=i.name,e.style.cssText="width:100%;background:rgba(255,255,255,0.08);border:1px solid var(--panel-border);border-radius:4px;color:var(--ink);font-size:13px;padding:2px 4px;",t.replaceWith(e),e.focus(),e.select();const a=()=>{const s=e.value.trim()||i.name;this.cb.onRenameBookmark(i.id,s)};e.addEventListener("keydown",s=>{s.key==="Enter"&&e.blur(),s.key==="Escape"&&(e.value=i.name,e.blur())}),e.addEventListener("blur",a,{once:!0})}closePanels(){this.palettePanel.hidden=!0,this.placesPanel.hidden=!0}}function Mt(n){return n.replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[t])}const K="mandelbrot-explorer:bookmarks:v1";function _(){try{const n=localStorage.getItem(K);if(!n)return[];const t=JSON.parse(n);return Array.isArray(t)?t.filter(At):[]}catch{return[]}}function z(n){try{localStorage.setItem(K,JSON.stringify(n))}catch{}}function At(n){return FractalCore.validBookmark(n)}function legacyBookmarkValidation(n){if(typeof n!="object"||n===null)return!1;const t=n;return typeof t.id=="string"&&typeof t.name=="string"&&typeof t.x=="number"&&typeof t.y=="number"&&typeof t.scale=="number"&&typeof t.iterations=="number"&&typeof t.palette=="string"}function E(){return _().sort((n,t)=>t.createdAt-n.createdAt)}function It(n){const t={...n,id:`bm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`,createdAt:Date.now()},i=_();return i.push(t),z(i),t}function Dt(n,t){const i=_(),e=i.find(a=>a.id===n);e&&(e.name=t,z(i))}function Rt(n){z(_().filter(t=>t.id!==n))}