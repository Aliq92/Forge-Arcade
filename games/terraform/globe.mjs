import {regionHabitability} from './simulation.mjs';

// An orthographic sphere. The camera basis below is shared by drawing and picking.
const PI = Math.PI;
const TAU = PI * 2;
const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));
const wrap = n => ((n + PI) % TAU + TAU) % TAU - PI;
const overlays = ['surface', 'temperature', 'moisture', 'elevation', 'habitability'];
const vertex = `
attribute vec2 position;
void main() { gl_Position = vec4(position, 0., 1.); }
`;
const fragment = `
precision highp float;
uniform vec2 size;
uniform float radius;
uniform vec4 camera;
uniform float day;
uniform float phase;
uniform float blendTime;
uniform float overlay;
uniform vec2 grid;
uniform vec2 offset;
uniform sampler2D geo;
uniform sampler2D bio;
uniform sampler2D sky;
uniform sampler2D oldGeo;
uniform sampler2D oldBio;
uniform sampler2D oldSky;
uniform sampler2D detail;
uniform vec3 selection;
uniform float showSelection;

vec3 gradient(float x,vec3 a,vec3 b,vec3 c){
  return mix(mix(a,b,smoothstep(0.,.54,x)),c,smoothstep(.49,1.,x));
}
void main() {
  vec2 p=(gl_FragCoord.xy-size*.5)/radius;
  float r=length(p);
  float aa=1./radius;
  vec2 key=vec2(-.77,.52);
  float litLimb=clamp(.52+dot(p,key)*.52,0.,1.);
  if(r>1.+aa){
    float glow=(.28*exp(-40.*(r-1.))+.058*exp(-9.*(r-1.)))*(.27+.73*litLimb);
    if(glow<.002) discard;
    gl_FragColor=vec4(vec3(.24,.76,.80),glow);
    return;
  }
  float z=sqrt(max(0.,1.-dot(p,p)));
  vec3 n=vec3(p,z);
  vec3 east=vec3(camera.y,0.,-camera.x);
  vec3 north=vec3(-camera.x*camera.z,camera.w,-camera.y*camera.z);
  vec3 forward=vec3(camera.x*camera.w,camera.z,camera.y*camera.w);
  vec3 w=normalize(p.x*east+p.y*north+z*forward);
  vec2 uv=vec2(atan(w.x,w.z)/6.2831853+.5,.5-asin(clamp(w.y,-1.,1.))/3.14159265);
  vec2 map=vec2((fract(uv.x)*grid.x+1.)/(grid.x+2.),clamp(uv.y,0.,1.));
  vec2 sampleAt=uv+offset;
  vec4 rock=texture2D(detail,sampleAt);
  vec4 g=mix(texture2D(oldGeo,map),texture2D(geo,map),blendTime);
  vec4 b=mix(texture2D(oldBio,map),texture2D(bio,map),blendTime);
  vec4 s=mix(texture2D(oldSky,map),texture2D(sky,map),blendTime);
  float relief=rock.g-.5, grit=rock.b-.48;
  float h=g.r+(rock.r-.5)*.108;
  float temp=g.g*140.-70.;
  float wet=g.b;
  float depth=g.a*.72-(rock.r-.50)*.12;
  float shore=smoothstep(.032,.053,depth);
  float sand=1.-smoothstep(.016,.068,abs(depth-.034));
  float peaks=smoothstep(.53,.85,h+(.7-rock.r)*.05);
  vec3 land=gradient(clamp((wet*.52+rock.r*.52+grit*.21),0.,1.),
    vec3(.42,.25,.16),vec3(.64,.46,.285),vec3(.42,.44,.32));
  land=mix(land,vec3(.48,.385,.30)+grit*.24,peaks*.8);
  land=mix(land,vec3(.74,.62,.40),sand*.48);
  float grass=smoothstep(.02,.52,b.r+(rock.b-.5)*.13);
  float trees=smoothstep(.025,.63,b.g+(rock.r-.5)*.14);
  land=mix(land,vec3(.36,.49,.23)+grit*.35,grass*.90);
  land=mix(land,vec3(.10,.31,.205)+grit*.32,trees*.93);
  land+=relief*(.22+.23*peaks)+grit*.12;
  vec3 sea=gradient(clamp((depth-.025)*3.9,0.,1.),
    vec3(.15,.50,.50),vec3(.052,.265,.335),vec3(.025,.115,.20));
  sea+=grit*.055+relief*.023;
  vec3 surface=mix(land,sea,shore);
  float ice=smoothstep(.012,.09,b.b*.75+(.48-rock.r)*.033);
  float snow=smoothstep(1.5,16.,-temp+peaks*12.+relief*3.+grit*9.)
    *smoothstep(.01,.17,wet+ice*.45)*(1.-shore);
  surface=mix(surface,vec3(.76,.84,.80)+relief*.23+grit*.11,max(ice,snow)*.96);
  surface=mix(surface,vec3(.30,.22,.18),smoothstep(.12,.52,b.a)*.79);
  float embers=smoothstep(.18,.62,b.a)*smoothstep(.46,.65,rock.r+relief*.27);
  float vapor=texture2D(detail,vec2(sampleAt.x+phase*.00014,sampleAt.y)).a;
  float clouds=smoothstep(.12,.70,s.r)*smoothstep(.31,.70,vapor)*.88;
  float storm=smoothstep(.003,.033,s.g*.16);
  surface=mix(surface,vec3(.79,.83,.8),clouds*(.83+.17*storm));
  float life=s.b;
  float lightDot=dot(n,normalize(vec3(-.77+sin(day*.48)*.10,.48,.68)));
  float sunlight = dot(w,normalize(vec3(-sin(day),.27,-cos(day))));
  float light=smoothstep(-.48,.81,lightDot)*(.61+.39*smoothstep(-.42,.58,sunlight));
  vec3 color=surface*(.40+.69*light)+vec3(-.009,.006,.019)*(1.-light);
  if(overlay>.5){
    vec3 o;
    if(overlay<1.5) o=gradient(clamp((temp+30.)/80.,0.,1.),vec3(.19,.47,.76),vec3(.88,.77,.45),vec3(.85,.24,.18));
    else if(overlay<2.5) o=gradient(wet,vec3(.72,.49,.26),vec3(.25,.65,.58),vec3(.17,.37,.72));
    else if(overlay<3.5) o=gradient(h,vec3(.13,.30,.47),vec3(.40,.56,.39),vec3(.84,.79,.66));
    else o=gradient(s.a,vec3(.54,.29,.31),vec3(.71,.61,.32),vec3(.23,.72,.50));
    color=mix(color,(o+relief*.15)*(.50+.55*light),.88);
  } else {
    color+=vec3(1.,.32,.04)*embers*.68;
    float waterGlint=pow(max(0.,dot(n,normalize(vec3(-.45,.27,.84)))),23.);
    color+=vec3(.32,.36,.32)*waterGlint*shore*(1.-ice)*(.45+rock.r*.55)*(1.-clouds);
    // Small silver trails follow rain-bearing cloud cover.
    float streak=pow(max(0.,sin(uv.x*1370.+uv.y*451.+phase*1.3)),21.);
    color+=vec3(.13,.21,.22)*streak*storm*clouds;
    float movement=sin(uv.y*1850.+sin(uv.x*860.+phase*.5)*3.+phase);
    color+=vec3(.16,.21,.10)*step(.99,movement)*smoothstep(.12,.7,life)*(1.-clouds);
  }
  float rim=pow(1.-z,3.1);
  color=mix(color,vec3(.36,.68,.70),rim*(.22+.49*litLimb));
  color+=vec3(.30,.60,.58)*pow(1.-z,9.)*(.20+.8*litLimb);
  // Geodesic selection ring keeps its position and foreshortens toward the limb.
  float dist=length(w-selection);
  float stroke=(1.-smoothstep(.003,.009,abs(dist-.050)))*showSelection;
  color=mix(color,vec3(.79,1.,.78),stroke*.9);
  gl_FragColor=vec4(color,1.-smoothstep(1.-aa,1.+aa,r));
}
`;

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw Error(gl.getShaderInfoLog(shader));
  }
  return shader;
}

function cameraBasis(lon, lat) {
  return [Math.sin(lon), Math.cos(lon), Math.sin(lat), Math.cos(lat)];
}

function direction(lon, lat) {
  const a = Math.cos(lat);
  return [Math.sin(lon)*a, Math.sin(lat), Math.cos(lon)*a];
}

function normalToCoords(x, y, z, [sl, cl, sp, cp]) {
  return [Math.atan2(cl*x-sl*sp*y+sl*cp*z,-sl*x-cl*sp*y+cl*cp*z),
    Math.asin(clamp(cp*y+sp*z, -1, 1))];
}

function seedOffset(seed) {
  let h = 2166136261;
  for (const letter of String(seed)) h = Math.imul(h ^ letter.charCodeAt(0),16777619);
  return [(h & 65535)/65536,(h >>> 16)/65536];
}

function createTexture(gl, unit, repeat = false) {
  const tex = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  for (const axis of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T]) {
    gl.texParameteri(gl.TEXTURE_2D, axis, repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE);
  }
  for (const filter of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER]) {
    gl.texParameteri(gl.TEXTURE_2D, filter, gl.LINEAR);
  }
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([128,128,128,128]));
  return tex;
}

class SurfaceGPU {
  constructor(gl) {
    this.gl = gl;
    const program = this.program = gl.createProgram();
    for (const [type, source] of [[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,fragment]]) {
      const shader = compile(gl,type,source);
      gl.attachShader(program,shader);
      gl.deleteShader(shader);
    }
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program,gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(program));
    gl.useProgram(program);
    this.buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
    const pos = gl.getAttribLocation(program,'position');
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
    this.uniforms = {};
    for (const name of ['size','radius','camera','day','phase','blendTime','overlay','grid','offset','selection','showSelection']) {
      this.uniforms[name] = gl.getUniformLocation(program,name);
    }
    this.textures = ['geo','bio','sky','oldGeo','oldBio','oldSky','detail'].map((name, unit) => {
      gl.uniform1i(gl.getUniformLocation(program,name),unit);
      return createTexture(gl,unit,unit === 6);
    });
  }

  image(image) {
    const gl=this.gl;
    gl.activeTexture(gl.TEXTURE6);
    gl.bindTexture(gl.TEXTURE_2D,this.textures[6]);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
  }

  update(view,reset) {
    const gl=this.gl, {width,height,cells}=view.world;
    const data=Array.from({length:3},()=> new Uint8ClampedArray((width+2)*height*4));
    for (let y=0; y<height; y++) for (let x=-1; x<=width; x++) {
      const c=cells[y*width+(x+width)%width], i=4*(y*(width+2)+x+1);
      const suitability = regionHabitability(c,view.world);
      data[0].set([c.elevation*255,(c.temperature+70)*255/140,c.moisture*255,c.water*255/.72],i);
      data[1].set([c.grass*255,c.forest*255,c.ice*255/.75,Math.max(c.heat,c.fire)*255],i);
      data[2].set([c.cloud*255,c.rain*255/.16,
        Math.max(c.herbivores,c.predators,c.aquatic)*255,suitability*255],i);
    }
    const previous = reset || !this.data ? data : this.data;
    this.data=data;
    [...data,...previous].forEach((pixels,unit)=>{
      gl.activeTexture(gl.TEXTURE0+unit);
      gl.bindTexture(gl.TEXTURE_2D,this.textures[unit]);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,width+2,height,0,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
    });
  }

  draw(view,now) {
    const gl=this.gl, u=this.uniforms, {width,height}=view.canvas;
    const world=view.world;
    gl.viewport(0,0,width,height);
    gl.clearColor(0,0,0,0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(u.size,width,height);
    gl.uniform1f(u.radius,view.radius);
    gl.uniform4fv(u.camera,cameraBasis(view.longitude,view.latitude));
    gl.uniform1f(u.day,-world.tick*TAU/96);
    gl.uniform1f(u.phase,world.tick);
    gl.uniform1f(u.blendTime,clamp((now-view.updated)/165));
    gl.uniform1f(u.overlay,Math.max(0,overlays.indexOf(view.overlay)));
    gl.uniform2f(u.grid,world.width,world.height);
    gl.uniform2fv(u.offset,view.offset);
    gl.uniform3fv(u.selection,view.selectedDirection);
    gl.uniform1f(u.showSelection,view.selected>=0?1:0);
    gl.drawArrays(gl.TRIANGLES,0,3);
  }

  destroy() {
    for (const tex of this.textures) this.gl.deleteTexture(tex);
    this.gl.deleteBuffer(this.buffer);
    this.gl.deleteProgram(this.program);
  }
}

// Low-memory software renderer for browsers with WebGL disabled or unavailable.
class SurfaceCanvas {
  constructor(canvas) {
    this.ctx=canvas.getContext('2d');
  }
  image(image) {
    const atlas=document.createElement('canvas');
    atlas.width=image.width;
    atlas.height=image.height;
    const ctx=atlas.getContext('2d',{willReadFrequently:true});
    ctx.drawImage(image,0,0);
    this.detail=ctx.getImageData(0,0,atlas.width,atlas.height);
  }
  update() {}
  draw(view) {
    const {ctx,detail}=this, {canvas,world,radius}=view;
    const cx=canvas.width/2, cy=canvas.height/2;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    const halo=ctx.createRadialGradient(cx,cy,radius*.96,cx,cy,radius*1.17);
    halo.addColorStop(0,'rgba(88,196,202,.30)');
    halo.addColorStop(.32,'rgba(88,196,202,.075)');
    halo.addColorStop(1,'rgba(88,196,202,0)');
    ctx.fillStyle=halo;
    ctx.fillRect(0,0,canvas.width,canvas.height);
    const basis=cameraBasis(view.longitude,view.latitude);
    const side=Math.min(540,Math.ceil(radius*2));
    if(!this.surface || this.surface.width!==side) {
      this.surface=document.createElement('canvas');
      this.surface.width=this.surface.height=side;
      this.raster=this.surface.getContext('2d');
      this.pixels=this.raster.createImageData(side,side);
    }
    const pixels=this.pixels.data, {width,height,cells}=world;
    for(let row=0;row<side;row++) for(let col=0;col<side;col++){
      const i=(row*side+col)*4, px=(col+.5)*2/side-1, py=1-(row+.5)*2/side;
      const z2=1-px*px-py*py;
      if(z2<=0){pixels[i+3]=0;continue;}
      const z=Math.sqrt(z2),[lon,lat]=normalToCoords(px,py,z,basis);
      const u=lon/TAU+.5, v=.5-lat/PI;
      const gx=u*width-.5,gy=clamp(v*height-.5,0,height-1), left=Math.floor(gx),top=Math.floor(gy), tx=gx-left,ty=gy-top;
      const a=cells[top*width+(left+width)%width], b=cells[top*width+(left+1)%width],
        c=cells[Math.min(top+1,height-1)*width+(left+width)%width],d=cells[Math.min(top+1,height-1)*width+(left+1)%width];
      const sample=key=>(a[key]*(1-tx)+b[key]*tx)*(1-ty)+(c[key]*(1-tx)+d[key]*tx)*ty;
      let rock=.5, relief=0, cloudShape=.45;
      if(detail){
        const ix=Math.floor((u+view.offset[0])%1*detail.width);
        const iy=Math.floor((v+view.offset[1])%1*detail.height);
        const k=4*(iy*detail.width+ix);
        rock=detail.data[k]/255; relief=detail.data[k+1]/255-.5; cloudShape=detail.data[k+3]/255;
      }
      const depth=sample('water')-(rock-.5)*.12, wet=sample('moisture'),temperature=sample('temperature');
      let r=152+(rock-.5)*47, g=108+wet*18,bv=74+wet*15;
      if(depth>.04){
        const deep=clamp((depth-.04)*4);
        r=12+30*(1-deep);g=42+81*(1-deep);bv=62+69*(1-deep);
      } else {
        const green=clamp(sample('grass')+sample('forest')*1.6);
        r-=105*green;g+=13*green;bv-=26*green;
      }
      const snow=clamp(sample('ice')*13+clamp((-temperature+relief*4)/12)*wet*2.2);
      r+=(202-r)*snow;g+=(217-g)*snow;bv+=(213-bv)*snow;
      if(view.overlay!=='surface'){
        const f=view.overlay==='temperature'?clamp((temperature+30)/80):
          view.overlay==='elevation'?sample('elevation'):view.overlay==='moisture'?wet:regionHabitability(a,world);
        const cold=view.overlay==='temperature'?[59,137,194]:[129,95,67];
        const warm=view.overlay==='temperature'?[227,114,67]:[70,181,160];
        r=cold[0]+(warm[0]-cold[0])*f;g=cold[1]+(warm[1]-cold[1])*f;bv=cold[2]+(warm[2]-cold[2])*f;
      } else {
        const cloud=clamp((sample('cloud')-.09)*1.7)*clamp((cloudShape-.24)*2.2);
        r+=(204-r)*cloud;g+=(215-g)*cloud;bv+=(210-bv)*cloud;
        r+=sample('heat')*70+sample('fire')*94;
      }
      const reliefLight=relief*(depth>.04?12:89);
      const solar=.7+.3*clamp(.5+.8*Math.cos(lon+PI+world.tick*TAU/96));
      const light=.36+.77*clamp((-.68*px+.44*py+.63*z+.42)/1.36)*solar;
      const rim=(1-z)**3*(.35+.32*clamp(.5-.7*px+.4*py));
      pixels[i]=(r+reliefLight)*light*(1-rim)+122*rim;
      pixels[i+1]=(g+reliefLight)*light*(1-rim)+207*rim;
      pixels[i+2]=(bv+reliefLight)*light*(1-rim)+209*rim;
      pixels[i+3]=Math.min(255,z2*side*155);
    }
    this.raster.putImageData(this.pixels,0,0);
    ctx.drawImage(this.surface,cx-radius,cy-radius,2*radius,2*radius);
    if(view.selected>=0){
      const [x,y,z]=view.selectedDirection,[sl,cl,sp,cp]=basis;
      const front=x*sl*cp+y*sp+z*cl*cp;
      if(front>0){
        ctx.beginPath();ctx.arc(cx+(x*cl-z*sl)*radius,cy-(-x*sl*sp+y*cp-z*cl*sp)*radius,Math.max(4,.045*radius),0,TAU);
        ctx.strokeStyle='#cdffd7';ctx.lineWidth=1.5;ctx.stroke();
      }
    }
  }
  destroy() {}
}

const contextOptions={alpha:true,premultipliedAlpha:false,antialias:false,depth:false,stencil:false,powerPreference:'low-power'};

export class Globe {
  constructor(canvas,callbacks={}) {
    this.canvas=canvas;
    this.callbacks=callbacks;
    this.longitude=-2.16;this.latitude=.24;this.zoom=1;
    this.selected=-1;this.selectedDirection=[0,0,0];this.overlay='surface';
    this.pointers=new Map();
    this.listeners=new AbortController();
    const gl=canvas.getContext('webgl',contextOptions);
    this.painter=gl ? new SurfaceGPU(gl) : new SurfaceCanvas(canvas);
    this.gpu=Boolean(gl);
    this.canvas.dataset.renderer=this.gpu?'webgl':'canvas';
    this.texture=new Image();
    this.texture.onload=()=>{
      if(this.destroyed||this.lost) return;
      this.painter.image(this.texture);this.requestDraw();
    };
    this.texture.src=new URL('./surface-detail.webp',import.meta.url).href;
    this.resizeObserver=new ResizeObserver(()=>this.resize());
    this.resizeObserver.observe(canvas);
    this.bind();
    this.resize();
  }

  bind() {
    const canvas=this.canvas;
    const listen=(name,fn,optional={})=>canvas.addEventListener(name,fn,{signal:this.listeners.signal,...optional});
    listen('webglcontextlost',event=>{
      event.preventDefault();
      this.lost=true;
      cancelAnimationFrame(this.frame);this.frame=0;
    });
    listen('webglcontextrestored',()=>{
      this.painter=new SurfaceGPU(canvas.getContext('webgl',contextOptions));
      this.lost=false;
      if(this.texture.naturalWidth) this.painter.image(this.texture);
      if(this.world) this.painter.update(this,true);
      this.requestDraw();
    });
    listen('pointerdown',event=>{
      if(event.button!==0 || this.pointers.has(event.pointerId)) return;
      const point={x:event.clientX,y:event.clientY,startX:event.clientX,startY:event.clientY,drag:false};
      this.pointers.set(event.pointerId,point);
      canvas.setPointerCapture(event.pointerId);
      canvas.focus({preventScroll:true});
      if(this.pointers.size>1){
        for(const p of this.pointers.values()) p.drag=true;
      }
    });
    listen('pointermove',event=>{
      const p=this.pointers.get(event.pointerId);
      if(!p) return;
      const dx=event.clientX-p.x,dy=event.clientY-p.y;
      if(this.pointers.size===2){
        const other=Array.from(this.pointers.values()).find(point=>point!==p);
        const before=Math.hypot(other.x-p.x,other.y-p.y);
        const after=Math.hypot(other.x-event.clientX,other.y-event.clientY);
        if(before>3&&after>3) this.zoomBy(after/before);
      } else if(this.pointers.size===1){
        const moved=Math.hypot(event.clientX-p.startX,event.clientY-p.startY);
        if(p.drag || moved>=4) {
          const scale=1/Math.max(1,this.radius/this.scale);
          this.rotate(-(p.drag?dx:event.clientX-p.startX)*scale,(p.drag?dy:event.clientY-p.startY)*scale);
          p.drag=true;
        }
      }
      p.x=event.clientX;p.y=event.clientY;
    });
    listen('pointerup',event=>{
      const point=this.pointers.get(event.pointerId);
      this.pointers.delete(event.pointerId);
      if(point && !point.drag && Math.hypot(event.clientX-point.startX,event.clientY-point.startY)<8) {
        this.pick(this.indexAt(event.clientX,event.clientY));
      }
    });
    const cancel=event=>this.pointers.delete(event.pointerId);
    listen('lostpointercapture',cancel);
    listen('pointercancel',cancel);
    listen('wheel',event=>{
      event.preventDefault();
      const amount=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?canvas.clientHeight:1);
      this.zoomBy(Math.exp(-clamp(amount,-270,270)*.00155));
    },{passive:false});
    listen('keydown',event=>{
      if(!this.world) return;
      const xStep=TAU/this.world.width,yStep=PI/this.world.height;
      switch(event.key){
        case 'ArrowLeft':this.rotate(-xStep,0);break;
        case 'ArrowRight':this.rotate(xStep,0);break;
        case 'ArrowUp':this.rotate(0,yStep);break;
        case 'ArrowDown':this.rotate(0,-yStep);break;
        case '+':case '=':this.zoomBy(1.15);break;
        case '-':this.zoomBy(1/1.15);break;
        case 'Enter':case ' ':
          if(!event.repeat) this.pick(this.coordinateIndex(this.longitude,this.latitude));
          break;
        default:return;
      }
      event.preventDefault();
    });
  }

  resize() {
    const {width,height}=this.canvas.getBoundingClientRect();
    if(!width||!height) return;
    const ratio=Math.min(window.devicePixelRatio||1,1.8,(this.gpu?1350:800)/Math.max(width,height));
    const w=Math.max(1,Math.round(width*ratio)),h=Math.max(1,Math.round(height*ratio));
    if(this.canvas.width!==w || this.canvas.height!==h) {
      this.canvas.width=w; this.canvas.height=h;
    }
    this.scale=w/width;
    this.radius=.41*Math.min(w,h)*this.zoom;
    this.canvas.dataset.zoom=this.zoom.toFixed(3);
    this.canvas.dataset.camera=[this.longitude,this.latitude].map(n=>n.toFixed(4)).join(',');
    this.requestDraw();
  }

  rotate(dx,dy) {
    this.longitude=wrap(this.longitude+dx);
    this.latitude=clamp(this.latitude+dy,-PI/2,PI/2);
    this.canvas.dataset.camera=[this.longitude,this.latitude].map(n=>n.toFixed(4)).join(',');
    this.callbacks.onRotate?.();
    this.requestDraw();
  }

  zoomBy(factor) {
    if(!Number.isFinite(factor)||factor<=0) return;
    const value=clamp(this.zoom*factor,.62,1.75);
    if(value===this.zoom) return;
    this.zoom=value;
    this.resize();this.callbacks.onZoom?.(value);
  }

  resetCamera() {
    this.zoom=1;this.latitude=.24;this.longitude=-2.16;
    this.resize();
  }

  coordinateIndex(longitude,latitude) {
    if(!this.world) return -1;
    const {width,height}=this.world;
    const x=Math.floor((wrap(longitude)/TAU+.5)*width)%width;
    const y=clamp(Math.floor((.5-latitude/PI)*height),0,height-1);
    return y*width+x;
  }

  indexAt(clientX,clientY) {
    const rect=this.canvas.getBoundingClientRect();
    const x=(clientX-rect.left-rect.width/2)*this.scale/this.radius;
    const y=(rect.top+rect.height/2-clientY)*this.scale/this.radius;
    const z2=1-x*x-y*y;
    if(z2<0||!Number.isFinite(z2)) return -1;
    return this.coordinateIndex(...normalToCoords(x,y,Math.sqrt(z2),cameraBasis(this.longitude,this.latitude)));
  }

  mark(index) {
    if(!this.world || !Number.isInteger(index) || !this.world.cells[index]) return false;
    this.selected=index;
    this.canvas.dataset.region=String(index);
    const lon=TAU*((index%this.world.width+.5)/this.world.width-.5);
    const lat=PI*(.5-(Math.floor(index/this.world.width)+.5)/this.world.height);
    this.selectedDirection=direction(lon,lat);
    return {lon,lat};
  }

  pick(index) {
    if(!this.mark(index)) return;
    this.requestDraw();this.callbacks.onSelect?.(index);
  }

  select(index) {
    const position=this.mark(index);
    if(!position) return;
    this.longitude=position.lon;this.latitude=position.lat;
    this.resize();
  }

  setOverlay(id) {
    if(!overlays.includes(id)) return;
    this.overlay=id;this.requestDraw();
  }

  setWorld(world) {
    this.world=world;this.offset=seedOffset(world.seed);
    this.selected=-1;this.selectedDirection=[0,0,0];
    delete this.canvas.dataset.region;
    this.resetCamera();
    if(!this.lost) this.painter.update(this,true);
    this.updated=performance.now()-200;
    this.requestDraw();
  }

  update() {
    if(!this.world || this.lost) return;
    this.painter.update(this,false);
    this.updated=performance.now();
    this.requestDraw();
  }

  requestDraw() {
    if(!this.world || this.frame || this.lost || this.destroyed) return;
    this.frame=requestAnimationFrame(now=>{
      this.frame=0;
      if(this.canvas.width<1 || !this.radius) return;
      this.painter.draw(this,now);
      if(this.gpu && now-this.updated<170) this.requestDraw();
    });
  }

  destroy() {
    this.destroyed=true;this.texture.onload=null;
    cancelAnimationFrame(this.frame);
    this.resizeObserver.disconnect();this.listeners.abort();this.pointers.clear();
    if(!this.lost) this.painter.destroy();
  }
}
