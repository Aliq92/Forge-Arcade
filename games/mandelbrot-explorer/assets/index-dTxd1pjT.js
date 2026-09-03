var at=Object.defineProperty;var st=(n,t,i)=>t in n?at(n,t,{enumerable:!0,configurable:!0,writable:!0,value:i}):n[t]=i;var o=(n,t,i)=>st(n,typeof t!="symbol"?t+"":t,i);(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const a of document.querySelectorAll('link[rel="modulepreload"]'))e(a);new MutationObserver(a=>{for(const s of a)if(s.type==="childList")for(const r of s.addedNodes)r.tagName==="LINK"&&r.rel==="modulepreload"&&e(r)}).observe(document,{childList:!0,subtree:!0});function i(a){const s={};return a.integrity&&(s.integrity=a.integrity),a.referrerPolicy&&(s.referrerPolicy=a.referrerPolicy),a.crossOrigin==="use-credentials"?s.credentials="include":a.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function e(a){if(a.ep)return;a.ep=!0;const s=i(a);fetch(a.href,s)}})();const C=-.5,P=0,v=1.5,y=8e-15,ot=4e-13,rt=.01,ct=1e-4;class lt{constructor(){o(this,"centerX",C);o(this,"centerY",P);o(this,"scale",v);o(this,"targetCenterX",C);o(this,"targetCenterY",P);o(this,"targetScale",v);o(this,"moving",!1)}reset(t=!0){this.jumpTo(C,P,v,t)}jumpTo(t,i,e,a=!0){const s=Math.max(e,y);this.targetCenterX=t,this.targetCenterY=i,this.targetScale=s,a||(this.centerX=t,this.centerY=i,this.scale=s),this.moving=!0}panInstant(t,i){this.centerX+=t,this.centerY+=i,this.targetCenterX=this.centerX,this.targetCenterY=this.centerY}zoomInstant(t,i,e){const a=O(this.scale/t),s=this.scale/a;this.centerX=i+(this.centerX-i)/s,this.centerY=e+(this.centerY-e)/s,this.scale=a,this.targetCenterX=this.centerX,this.targetCenterY=this.centerY,this.targetScale=this.scale}zoomTo(t,i,e){const a=O(this.targetScale/t),s=this.targetScale/a;this.targetCenterX=i+(this.targetCenterX-i)/s,this.targetCenterY=e+(this.targetCenterY-e)/s,this.targetScale=a,this.moving=!0}update(t){const i=1-Math.exp(-10*t);this.centerX+=(this.targetCenterX-this.centerX)*i,this.centerY+=(this.targetCenterY-this.centerY)*i,this.scale+=(this.targetScale-this.scale)*i;const e=ct*Math.max(this.scale,y),a=Math.hypot(this.targetCenterX-this.centerX,this.targetCenterY-this.centerY),s=Math.abs(this.targetScale-this.scale)/Math.max(this.scale,y);return a<e&&s<rt?(this.centerX=this.targetCenterX,this.centerY=this.targetCenterY,this.scale=this.targetScale,this.moving=!1,!1):(this.moving=!0,!0)}isAnimating(){return this.moving}screenToComplex(t,i,e){const a=this.scale,s=this.scale*(e.width/e.height),r=(t/e.width-.5)*2,l=(.5-i/e.height)*2;return{x:this.centerX+r*s,y:this.centerY+l*a}}getZoomDepth(){return v/this.scale}isNearPrecisionLimit(){return this.scale<=ot}atPrecisionFloor(){return this.scale<=y*1.0001}}function O(n){return Math.max(n,y)}function M(n){if(n<1e3)return`${n.toFixed(1)}×`;const t=Math.floor(Math.log10(n));return`${(n/Math.pow(10,t)).toFixed(2)}×10${dt(t)}`}const ht={0:"⁰",1:"¹",2:"²",3:"³",4:"⁴",5:"⁵",6:"⁶",7:"⁷",8:"⁸",9:"⁹","-":"⁻"};function dt(n){return String(n).split("").map(t=>ht[t]??t).join("")}function Y(n,t){const i=Math.max(0,Math.ceil(-Math.log10(t))),e=Math.min(17,Math.max(6,4+i));return n.toFixed(e)}const ut=5e3,mt=`#version 300 es
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

// ---- Mandelbrot core ---------------------------------------------------

void main() {
  vec2 fragCoord = gl_FragCoord.xy;
  float nx = (fragCoord.x / u_resolution.x - 0.5) * 2.0;
  float ny = (fragCoord.y / u_resolution.y - 0.5) * 2.0;

  float halfHeight = u_scale;
  float halfWidth = u_scale * u_aspect;

  float dx = nx * halfWidth;
  float dy = ny * halfHeight;

  vec2 cr = dfAddF(u_centerX, dx);
  vec2 ci = dfAddF(u_centerY, dy);

  vec2 zr = cr;
  vec2 zi = ci;

  bool escaped = false;
  float n = 0.0;
  float zr2f = 0.0;
  float zi2f = 0.0;

  for (int i = 0; i < ${ut}; i++) {
    if (float(i) >= u_maxIter) break;

    vec2 zrzr = dfMul(zr, zr);
    vec2 zizi = dfMul(zi, zi);
    zr2f = zrzr.x;
    zi2f = zizi.x;

    if (zr2f + zi2f > 256.0) {
      escaped = true;
      break;
    }

    vec2 zrzi = dfMul(zr, zi);
    vec2 newZr = dfAdd(dfSub(zrzr, zizi), cr);
    vec2 newZi = dfAdd(dfAdd(zrzi, zrzi), ci);
    zr = newZr;
    zi = newZi;
    n += 1.0;
  }

  if (!escaped) {
    fragColor = vec4(u_interior, 1.0);
    return;
  }

  // Smooth iteration count (continuous escape colouring).
  float logZn = log(zr2f + zi2f) * 0.5;
  float nu = log(logZn / log(2.0)) / log(2.0);
  float smoothN = n + 1.0 - nu;

  // Colour frequency is scaled relative to the iteration cap (rather than
  // a fixed per-iteration rate) so that chaotic boundary regions — where
  // adjacent pixels can differ by many iterations — don't alias into
  // rainbow noise as max iterations grows with zoom depth.
  float t = (smoothN / u_maxIter) * u_paletteCycles;
  vec3 col = u_paletteA + u_paletteB * cos(6.28318530718 * (u_paletteC * t + u_paletteD));

  // Subtle ordered dither to avoid banding on 8-bit output.
  float dither = (fract(sin(dot(fragCoord, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;
  col += dither;

  fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;function X(n){const t=Math.fround(n),i=Math.fround(n-t);return[t,i]}function F(n,t,i){const e=n.createShader(t);if(!e)throw new Error("Failed to create shader");if(n.shaderSource(e,i),n.compileShader(e),!n.getShaderParameter(e,n.COMPILE_STATUS)){const a=n.getShaderInfoLog(e);throw n.deleteShader(e),new Error(`Shader compile error: ${a}`)}return e}class ft{constructor(t,i={}){o(this,"gl");o(this,"program");o(this,"uniforms");o(this,"canvas");o(this,"backingWidth",0);o(this,"backingHeight",0);o(this,"maxDpr");this.canvas=t,this.maxDpr=i.maxDpr??2;const e=t.getContext("webgl2",{alpha:!1,antialias:!1,depth:!1,stencil:!1,powerPreference:"high-performance",preserveDrawingBuffer:!1});if(!e)throw new Error("WebGL2 is not available in this browser.");this.gl=e,t.addEventListener("webglcontextlost",m=>m.preventDefault());const a=F(e,e.VERTEX_SHADER,mt),s=F(e,e.FRAGMENT_SHADER,pt),r=e.createProgram();if(!r)throw new Error("Failed to create WebGL program");if(e.attachShader(r,a),e.attachShader(r,s),e.linkProgram(r),!e.getProgramParameter(r,e.LINK_STATUS)){const m=e.getProgramInfoLog(r);throw new Error(`Program link error: ${m}`)}e.deleteShader(a),e.deleteShader(s),this.program=r;const l=["u_centerX","u_centerY","u_scale","u_aspect","u_resolution","u_maxIter","u_paletteA","u_paletteB","u_paletteC","u_paletteD","u_paletteCycles","u_interior"];this.uniforms={};for(const m of l)this.uniforms[m]=e.getUniformLocation(r,m);const f=e.createVertexArray();e.bindVertexArray(f)}resize(t,i,e){const a=Math.min(window.devicePixelRatio||1,this.maxDpr),s=Math.max(1,Math.round(t*a*e)),r=Math.max(1,Math.round(i*a*e));(s!==this.backingWidth||r!==this.backingHeight)&&(this.canvas.width=s,this.canvas.height=r,this.backingWidth=s,this.backingHeight=r)}draw(t,i){const e=this.gl,a=this.canvas.clientWidth||window.innerWidth,s=this.canvas.clientHeight||window.innerHeight;this.resize(a,s,i.resolutionScale),e.viewport(0,0,this.backingWidth,this.backingHeight),e.useProgram(this.program);const[r,l]=X(t.centerX),[f,m]=X(t.centerY);e.uniform2f(this.uniforms.u_centerX,r,l),e.uniform2f(this.uniforms.u_centerY,f,m),e.uniform1f(this.uniforms.u_scale,t.scale),e.uniform1f(this.uniforms.u_aspect,this.backingWidth/this.backingHeight),e.uniform2f(this.uniforms.u_resolution,this.backingWidth,this.backingHeight),e.uniform1f(this.uniforms.u_maxIter,i.iterations);const d=i.palette;e.uniform3f(this.uniforms.u_paletteA,d.a[0],d.a[1],d.a[2]),e.uniform3f(this.uniforms.u_paletteB,d.b[0],d.b[1],d.b[2]),e.uniform3f(this.uniforms.u_paletteC,d.c[0],d.c[1],d.c[2]),e.uniform3f(this.uniforms.u_paletteD,d.d[0],d.d[1],d.d[2]),e.uniform1f(this.uniforms.u_paletteCycles,d.cycles),e.uniform3f(this.uniforms.u_interior,d.interior[0],d.interior[1],d.interior[2]),e.drawArrays(e.TRIANGLES,0,3)}dispose(){this.gl.deleteProgram(this.program)}}const gt=6,vt=400,yt=34,xt=2,bt=3.2,wt=2.6,B=200,H=1.35,S=.12;class Et{constructor(t,i,e){o(this,"canvas");o(this,"camera");o(this,"cb");o(this,"pointers",new Map);o(this,"dragStart",null);o(this,"dragLast",null);o(this,"dragMoved",!1);o(this,"pinchLastDist",0);o(this,"pinchLastMid",{x:0,y:0});o(this,"lastTapTime",0);o(this,"lastTapPos",{x:0,y:0});o(this,"interactionActiveCount",0);o(this,"interactionEndTimer",null);o(this,"boundHandlers",[]);o(this,"onPointerDown",t=>{if(this.canvas.setPointerCapture(t.pointerId),this.pointers.set(t.pointerId,{x:t.clientX,y:t.clientY,pointerType:t.pointerType}),this.markActive(),this.pointers.size===1)this.dragStart={x:t.clientX,y:t.clientY},this.dragLast={x:t.clientX,y:t.clientY},this.dragMoved=!1;else if(this.pointers.size===2){const i=Array.from(this.pointers.values());this.pinchLastDist=Math.hypot(i[0].x-i[1].x,i[0].y-i[1].y),this.pinchLastMid={x:(i[0].x+i[1].x)/2,y:(i[0].y+i[1].y)/2},this.dragMoved=!0}this.canvas.classList&&this.canvas.classList.add("dragging")});o(this,"onPointerMove",t=>{if(this.pointers.has(t.pointerId)){if(this.pointers.set(t.pointerId,{x:t.clientX,y:t.clientY,pointerType:t.pointerType}),this.pointers.size>=2){const i=Array.from(this.pointers.values()),e=Math.hypot(i[0].x-i[1].x,i[0].y-i[1].y),a={x:(i[0].x+i[1].x)/2,y:(i[0].y+i[1].y)/2};if(this.panByPixelDelta(this.pinchLastMid.x,this.pinchLastMid.y,a.x,a.y),this.pinchLastDist>0){const s=e/this.pinchLastDist;isFinite(s)&&s>0&&this.zoomAtPixel(a.x,a.y,s,!1)}this.pinchLastDist=e,this.pinchLastMid=a;return}if(this.dragLast&&this.dragStart){const i=t.clientX-this.dragStart.x,e=t.clientY-this.dragStart.y;!this.dragMoved&&Math.hypot(i,e)>gt&&(this.dragMoved=!0),this.dragMoved&&this.panByPixelDelta(this.dragLast.x,this.dragLast.y,t.clientX,t.clientY),this.dragLast={x:t.clientX,y:t.clientY}}}});o(this,"onPointerUp",t=>{if(!this.pointers.has(t.pointerId))return;const i=this.pointers.get(t.pointerId).pointerType;this.pointers.delete(t.pointerId);try{this.canvas.releasePointerCapture(t.pointerId)}catch{}if(this.markSettling(),this.pointers.size===1){const e=Array.from(this.pointers.values())[0];this.dragStart={x:e.x,y:e.y},this.dragLast={x:e.x,y:e.y},this.dragMoved=!0;return}this.pointers.size===0&&(this.canvas.classList.remove("dragging"),this.dragMoved||this.handleTap(t.clientX,t.clientY,i),this.dragStart=null,this.dragLast=null,this.dragMoved=!1)});o(this,"onWheel",t=>{t.preventDefault(),this.markActive(),this.markSettling();const i=Math.max(-B,Math.min(B,t.deltaY)),e=Math.pow(1.0025,-i);this.zoomAtPixel(t.clientX,t.clientY,e,!0)});o(this,"onKeyDown",t=>{if(t.metaKey||t.ctrlKey||t.altKey)return;const i=this.cb.getViewport(),e=i.width/2,a=i.height/2;switch(t.key){case"+":case"=":this.markActive(),this.markSettling(),this.zoomAtPixel(e,a,H,!0);break;case"-":case"_":this.markActive(),this.markSettling(),this.zoomAtPixel(e,a,1/H,!0);break;case"ArrowUp":this.keyPan(0,i.height*S);break;case"ArrowDown":this.keyPan(0,-i.height*S);break;case"ArrowLeft":this.keyPan(i.width*S,0);break;case"ArrowRight":this.keyPan(-i.width*S,0);break;case"r":case"R":this.cb.onResetView();break;case"s":case"S":this.cb.onSaveLocation();break;case"d":case"D":this.cb.onRandomDive();break;case"[":this.cb.onIterationsDelta(-1);break;case"]":this.cb.onIterationsDelta(1);break;default:return}t.preventDefault()});this.canvas=t,this.camera=i,this.cb=e,this.attach()}on(t,i,e,a){t.addEventListener(i,e,a),this.boundHandlers.push([t,i,e,a])}attach(){this.on(this.canvas,"pointerdown",this.onPointerDown),this.on(window,"pointermove",this.onPointerMove),this.on(window,"pointerup",this.onPointerUp),this.on(window,"pointercancel",this.onPointerUp),this.on(this.canvas,"wheel",this.onWheel,{passive:!1}),this.on(this.canvas,"contextmenu",t=>t.preventDefault()),this.on(window,"keydown",this.onKeyDown)}dispose(){for(const[t,i,e,a]of this.boundHandlers)t.removeEventListener(i,e,a);this.boundHandlers=[],this.interactionEndTimer!==null&&window.clearTimeout(this.interactionEndTimer)}markActive(){this.interactionActiveCount++,this.interactionEndTimer!==null&&(window.clearTimeout(this.interactionEndTimer),this.interactionEndTimer=null),this.cb.onInteractionStart()}markSettling(){this.interactionActiveCount=Math.max(0,this.interactionActiveCount-1),this.interactionActiveCount===0&&(this.interactionEndTimer!==null&&window.clearTimeout(this.interactionEndTimer),this.interactionEndTimer=window.setTimeout(()=>this.cb.onInteractionEnd(),140))}zoomAtPixel(t,i,e,a){const s=this.cb.getViewport(),r=this.camera.screenToComplex(t,i,s);a?this.camera.zoomTo(e,r.x,r.y):this.camera.zoomInstant(e,r.x,r.y)}panByPixelDelta(t,i,e,a){const s=this.cb.getViewport(),r=this.camera.screenToComplex(t,i,s),l=this.camera.screenToComplex(e,a,s);this.camera.panInstant(r.x-l.x,r.y-l.y)}handleTap(t,i,e){const a=performance.now(),s=a-this.lastTapTime,r=Math.hypot(t-this.lastTapPos.x,i-this.lastTapPos.y),l=s<vt&&r<yt;e==="mouse"?this.zoomAtPixel(t,i,l?bt:xt,!0):l&&this.zoomAtPixel(t,i,wt,!0),l?this.lastTapTime=0:(this.lastTapTime=a,this.lastTapPos={x:t,y:i})}keyPan(t,i){this.markActive(),this.markSettling();const e=this.cb.getViewport(),a=e.width/2,s=e.height/2,r=this.camera.screenToComplex(a,s,e),l=this.camera.screenToComplex(a-t,s-i,e);this.camera.targetCenterX+=r.x-l.x,this.camera.targetCenterY+=r.y-l.y}}const w=[{id:"classic",name:"Classic",a:[.5,.5,.55],b:[.5,.5,.5],c:[1,1,1],d:[0,.1,.2],cycles:5,interior:[.01,.01,.02]},{id:"ember",name:"Ember",a:[.5,.35,.25],b:[.5,.35,.25],c:[1,.9,.7],d:[0,.08,.2],cycles:4.5,interior:[.03,.01,0]},{id:"ocean",name:"Ocean",a:[.2,.35,.5],b:[.25,.35,.45],c:[.8,.9,1],d:[.35,.25,.1],cycles:5,interior:[0,.01,.03]},{id:"monochrome",name:"Monochrome",a:[.55,.55,.57],b:[.45,.45,.46],c:[1,1,1],d:[0,0,.02],cycles:2.5,interior:[0,0,0]},{id:"spectrum",name:"Spectrum",a:[.5,.5,.5],b:[.5,.5,.5],c:[1,1,1],d:[0,.333,.667],cycles:7,interior:[.02,0,.02]}],St=w[0].id;function Lt(n){return w.find(t=>t.id===n)??w[0]}function Tt(n){const t=[];for(let e=0;e<=8;e++){const a=e/8*n.cycles,s=kt(n,a),r=e/8*100;t.push(`rgb(${s.map(l=>Math.round(l*255)).join(",")}) ${r}%`)}return`linear-gradient(90deg, ${t.join(", ")})`}function kt(n,t){const i=[0,0,0];for(let e=0;e<3;e++){const a=n.a[e]+n.b[e]*Math.cos(2*Math.PI*(n.c[e]*t+n.d[e]));i[e]=Math.min(1,Math.max(0,a))}return i}const U=[{name:"Main Set",x:-.5,y:0,scale:1.5,iterations:300},{name:"Seahorse Valley",x:-.75,y:.1,scale:.02,iterations:600},{name:"Elephant Valley",x:.275,y:0,scale:.045,iterations:600},{name:"Double Spiral",x:-.7453,y:.1127,scale:9e-4,iterations:1200},{name:"Mini Mandelbrot",x:-1.768778833,y:.001738996,scale:6e-5,iterations:1500},{name:"Needle Antenna",x:-1.999985,y:0,scale:25e-5,iterations:900}],_t=[...U.slice(1),{name:"Seahorse Tendrils",x:-.745428,y:.113009,scale:6e-4,iterations:1200},{name:"Valley Filament",x:-.16070135,y:1.0375665,scale:8e-4,iterations:900},{name:"Spiral Junction",x:-.77468065,y:-.1374168,scale:4e-4,iterations:1400},{name:"Cardioid Notch",x:-.748,y:.065,scale:.006,iterations:700},{name:"Antenna Bud",x:-1.7499,y:0,scale:.004,iterations:700},{name:"Feigenbaum Cascade",x:-1.401155,y:0,scale:15e-5,iterations:1600},{name:"Satellite Bloom",x:.3245046,y:.04855101,scale:.0015,iterations:900},{name:"Deep Seahorse",x:-.743643887037151,y:.13182590420533,scale:4e-6,iterations:2200},{name:"Lagoon Bud",x:-.10109636384562,y:.95628651080914,scale:.0012,iterations:900}];function Ct(n){const t=_t;return t[Math.floor(Math.random()*t.length)]}function c(n){const t=document.getElementById(n);if(!t)throw new Error(`Missing element #${n}`);return t}class Pt{constructor(t){o(this,"intro",c("intro"));o(this,"hud",c("hud"));o(this,"controls",c("controls"));o(this,"hudX",c("hud-x"));o(this,"hudY",c("hud-y"));o(this,"hudZoom",c("hud-zoom"));o(this,"hudIter",c("hud-iter"));o(this,"hudFps",c("hud-fps"));o(this,"hudPrecision",c("hud-precision"));o(this,"toast",c("toast"));o(this,"palettePanel",c("palette-panel"));o(this,"paletteList",c("palette-list"));o(this,"placesPanel",c("places-panel"));o(this,"presetsList",c("presets-list"));o(this,"bookmarksList",c("bookmarks-list"));o(this,"bookmarksEmpty",c("bookmarks-empty"));o(this,"toastTimer",null);o(this,"cb");this.cb=t,this.wireButtons(),this.renderPalettes(w[0].id),this.renderPresets()}wireButtons(){c("begin-dive").addEventListener("click",()=>this.cb.onBeginDive()),c("btn-zoom-in").addEventListener("click",()=>this.cb.onZoomIn()),c("btn-zoom-out").addEventListener("click",()=>this.cb.onZoomOut()),c("btn-reset").addEventListener("click",()=>this.cb.onReset()),c("btn-random-dive").addEventListener("click",()=>this.cb.onRandomDive()),c("btn-iter-down").addEventListener("click",()=>this.cb.onIterDelta(-1)),c("btn-iter-up").addEventListener("click",()=>this.cb.onIterDelta(1)),c("btn-save").addEventListener("click",()=>this.cb.onSaveLocation()),c("btn-palette").addEventListener("click",()=>this.togglePanel(this.palettePanel)),c("btn-places").addEventListener("click",()=>this.togglePanel(this.placesPanel)),document.querySelectorAll("[data-close]").forEach(t=>{t.addEventListener("click",()=>{const i=t.getAttribute("data-close");i&&(c(i).hidden=!0)})})}togglePanel(t){const i=t.hidden;this.palettePanel.hidden=!0,this.placesPanel.hidden=!0,t.hidden=!i}showExplorer(){this.intro.classList.add("hidden"),this.hud.setAttribute("aria-hidden","false"),this.controls.setAttribute("aria-hidden","false")}setFaded(t){this.hud.classList.toggle("faded",t),this.controls.classList.toggle("faded",t)}updateHUD(t,i,e,a,s,r,l){this.hudX.textContent=Y(t,e),this.hudY.textContent=Y(i,e),this.hudZoom.textContent=M(a),this.hudIter.textContent=String(s);const f=r>0?Math.min(999,Math.round(1e3/r)):0;this.hudFps.textContent=`${f} fps · ${r.toFixed(1)} ms`,this.hudPrecision.hidden=!l}showToast(t,i=2200){this.toast.textContent=t,this.toast.hidden=!1,this.toast.offsetWidth,this.toast.classList.add("show"),this.toastTimer!==null&&window.clearTimeout(this.toastTimer),this.toastTimer=window.setTimeout(()=>{this.toast.classList.remove("show"),window.setTimeout(()=>{this.toast.hidden=!0},350)},i)}renderPalettes(t){this.paletteList.innerHTML="";for(const i of w){const e=document.createElement("div");e.className="palette-swatch"+(i.id===t?" active":""),e.dataset.paletteId=i.id,e.innerHTML=`<span class="swatch-strip" style="background:${Tt(i)}"></span><span class="swatch-name">${i.name}</span>`,e.addEventListener("click",()=>{this.setActivePalette(i.id),this.cb.onSelectPalette(i.id),this.closePanels()}),this.paletteList.appendChild(e)}}setActivePalette(t){this.paletteList.querySelectorAll(".palette-swatch").forEach(i=>{i.classList.toggle("active",i.dataset.paletteId===t)})}renderPresets(){this.presetsList.innerHTML="";for(const t of U){const i=document.createElement("div");i.className="entry-item",i.innerHTML=`<div class="entry-main"><span class="entry-name">${Mt(t.name)}</span><span class="entry-meta">${M(1.5/t.scale)}</span></div>`,i.addEventListener("click",()=>this.cb.onSelectPreset(t)),this.presetsList.appendChild(i)}}renderBookmarks(t){this.bookmarksList.innerHTML="",this.bookmarksEmpty.hidden=t.length>0;for(const i of t){const e=document.createElement("div");e.className="entry-item";const a=document.createElement("div");a.className="entry-main",a.style.cursor="pointer";const s=document.createElement("span");s.className="entry-name",s.textContent=i.name;const r=document.createElement("span");r.className="entry-meta",r.textContent=`${M(1.5/i.scale)} · iter ${i.iterations}`,a.appendChild(s),a.appendChild(r),a.addEventListener("click",()=>this.cb.onSelectBookmark(i));const l=document.createElement("div");l.className="entry-actions";const f=document.createElement("button");f.textContent="✎",f.title="Rename",f.setAttribute("aria-label","Rename bookmark"),f.addEventListener("click",d=>{d.stopPropagation(),this.startRename(s,i)});const m=document.createElement("button");m.textContent="✕",m.title="Delete",m.setAttribute("aria-label","Delete bookmark"),m.addEventListener("click",d=>{d.stopPropagation(),this.cb.onDeleteBookmark(i.id)}),l.appendChild(f),l.appendChild(m),e.appendChild(a),e.appendChild(l),this.bookmarksList.appendChild(e)}}startRename(t,i){const e=document.createElement("input");e.type="text",e.value=i.name,e.style.cssText="width:100%;background:rgba(255,255,255,0.08);border:1px solid var(--panel-border);border-radius:4px;color:var(--ink);font-size:13px;padding:2px 4px;",t.replaceWith(e),e.focus(),e.select();const a=()=>{const s=e.value.trim()||i.name;this.cb.onRenameBookmark(i.id,s)};e.addEventListener("keydown",s=>{s.key==="Enter"&&e.blur(),s.key==="Escape"&&(e.value=i.name,e.blur())}),e.addEventListener("blur",a,{once:!0})}closePanels(){this.palettePanel.hidden=!0,this.placesPanel.hidden=!0}}function Mt(n){return n.replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[t])}const K="mandelbrot-explorer:bookmarks:v1";function _(){try{const n=localStorage.getItem(K);if(!n)return[];const t=JSON.parse(n);return Array.isArray(t)?t.filter(At):[]}catch{return[]}}function z(n){try{localStorage.setItem(K,JSON.stringify(n))}catch{}}function At(n){if(typeof n!="object"||n===null)return!1;const t=n;return typeof t.id=="string"&&typeof t.name=="string"&&typeof t.x=="number"&&typeof t.y=="number"&&typeof t.scale=="number"&&typeof t.iterations=="number"&&typeof t.palette=="string"}function E(){return _().sort((n,t)=>t.createdAt-n.createdAt)}function It(n){const t={...n,id:`bm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`,createdAt:Date.now()},i=_();return i.push(t),z(i),t}function Dt(n,t){const i=_(),e=i.find(a=>a.id===n);e&&(e.name=t,z(i))}function Rt(n){z(_().filter(t=>t.id!==n))}const zt=64,Ot=4e3,j=.3,G=4,N=1.3,Yt=.55,Xt=400,W=1.6,T=document.getElementById("fractal-canvas"),h=new lt;let b=1,k=St,I=!1,x=!0,$=1,V=!1,A=0,g=null,D=performance.now(),Z=16.7;function p(){x=!0}function q(n){return 110+42*Math.log2(n+1)}function L(){const n=q(h.getZoomDepth());return Math.round(Math.min(Ot,Math.max(zt,n*b)))}function R(n,t){const i=Math.max(1,q(v/n));b=Math.max(j,Math.min(G,t/i))}let J;try{J=new ft(T)}catch(n){throw Ft("WebGL2 is required","Your browser does not support WebGL2, which this experience needs to render the fractal. Try a recent version of Chrome, Firefox, Edge, or Safari."),n}function Ft(n,t){const i=document.getElementById("intro");i&&(i.innerHTML=`<div class="intro-content"><h1 class="intro-title">${n}</h1><p class="intro-tagline">${t}</p></div>`)}const Bt={onBeginDive:()=>{u.showExplorer(),p()},onZoomIn:()=>{h.zoomTo(W,h.targetCenterX,h.targetCenterY),p()},onZoomOut:()=>{h.zoomTo(1/W,h.targetCenterX,h.targetCenterY),p()},onReset:()=>{h.reset(!0),p(),u.showToast("View reset")},onRandomDive:()=>tt(),onIterDelta:n=>et(n),onSaveLocation:()=>Q(),onSelectPalette:n=>{k=n,p()},onSelectPreset:n=>{h.jumpTo(n.x,n.y,n.scale,!0),R(n.scale,n.iterations),p(),u.showToast(`Traveling to ${n.name}`),u.closePanels()},onSelectBookmark:n=>{h.jumpTo(n.x,n.y,n.scale,!0),R(n.scale,n.iterations),k=n.palette,u.setActivePalette(n.palette),p(),u.showToast(`Revisiting "${n.name}"`),u.closePanels()},onRenameBookmark:(n,t)=>{Dt(n,t),u.renderBookmarks(E())},onDeleteBookmark:n=>{Rt(n),u.renderBookmarks(E())}},u=new Pt(Bt);u.renderBookmarks(E());const Ht={getViewport:()=>({width:T.clientWidth||window.innerWidth,height:T.clientHeight||window.innerHeight}),onInteractionStart:()=>{I=!0,u.setFaded(!0),p()},onInteractionEnd:()=>{I=!1,u.setFaded(!1),p()},onResetView:()=>{h.reset(!0),p(),u.showToast("View reset")},onSaveLocation:()=>Q(),onRandomDive:()=>tt(),onIterationsDelta:n=>et(n)};new Et(T,h,Ht);function Q(){const n=`Bookmark ${E().length+1}`;It({name:n,x:h.centerX,y:h.centerY,scale:h.scale,iterations:L(),palette:k}),u.renderBookmarks(E()),u.showToast("Location saved")}function tt(){const n=Ct();h.jumpTo(n.x,n.y,n.scale,!0),R(n.scale,n.iterations),p(),u.showToast(`Random dive: ${n.name}`)}function et(n){b=Math.max(j,Math.min(G,n>0?b*N:b/N)),p()}function it(){g===null&&(D=performance.now(),g=requestAnimationFrame(nt))}function nt(n){g=null;const t=Math.min(.2,Math.max(0,(n-D)/1e3));D=n;const e=h.update(t)||I,a=e?Yt:1;if(e&&(x=!0),a!==$&&(x=!0),x){const s=performance.now(),r=e?Math.min(L(),Xt):L();J.draw(h,{iterations:r,palette:Lt(k),resolutionScale:a}),$=a,Z=performance.now()-s,x=!1}if(A+=t,A>.2){A=0;const s=h.isNearPrecisionLimit();u.updateHUD(h.centerX,h.centerY,h.scale,h.getZoomDepth(),L(),Z,s),h.atPrecisionFloor()&&!V&&(V=!0,u.showToast("Precision limit reached — this is as deep as floating-point math can resolve.",3400))}g=requestAnimationFrame(nt)}document.addEventListener("visibilitychange",()=>{document.hidden?g!==null&&(cancelAnimationFrame(g),g=null):it()});window.addEventListener("resize",()=>p());window.addEventListener("orientationchange",()=>p());it();
