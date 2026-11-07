import {colours,esc} from '../ui.mjs';
export class MoleculeView{
 constructor(host){this.host=host;this.active=false;this.destroyed=false;this.points=[];this.graph={atoms:[],bonds:[]};this.yaw=1.2;this.pitch=.25;this.targetYaw=1.2;this.targetPitch=.25;this.zoom=5;this.pointer=new Map();this.listeners=[];this.frame=0;this.labels=[];this.lost=false;this.fallback=true;this.ready=this.init();}
 listen(el,type,fn,options){el.addEventListener(type,fn,options);this.listeners.push(()=>el.removeEventListener(type,fn,options));}
 async init(){
  this.svg=document.createElementNS('http://www.w3.org/2000/svg','svg');this.svg.setAttribute('aria-label','Molecular schematic fallback');this.svg.tabIndex=0;this.host.append(this.svg);
  try{
   if(new URLSearchParams(location.search).get('renderer')==='svg')throw Error('SVG inspection selected');
   const canvas=document.createElement('canvas'),gl=canvas.getContext('webgl2',{antialias:true,alpha:true});if(!gl)throw Error('WebGL2 unavailable');
   const T=await import('../../vendor/package/build/three.module.min.js');if(this.destroyed)return;this.T=T;
   this.renderer=new T.WebGLRenderer({canvas,context:gl,antialias:true,alpha:true});this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));this.renderer.setClearColor(0x000000,0);
   this.scene=new T.Scene();this.scene.add(new T.AmbientLight(0xc0e6ff,1.8));const key=new T.DirectionalLight(0xffffff,3);key.position.set(3,4,6);this.scene.add(key);const rim=new T.DirectionalLight(0x70dedb,2);rim.position.set(-4,-1,-3);this.scene.add(rim);
   this.camera=new T.PerspectiveCamera(40,1,.1,100);this.group=new T.Group();this.scene.add(this.group);this.sphere=new T.SphereGeometry(1,20,14);this.cylinder=new T.CylinderGeometry(1,1,1,10);this.materials=new Map();this.bondMaterial=new T.MeshStandardMaterial({color:0x91a9bd,roughness:.6});this.host.append(canvas);this.canvas=canvas;canvas.tabIndex=0;canvas.setAttribute('aria-label','3D molecule: drag to rotate, pinch or wheel to zoom');this.fallback=false;this.svg.setAttribute('hidden','');
   this.listen(canvas,'webglcontextlost',e=>{e.preventDefault();this.lost=true;this.fallback=true;canvas.hidden=true;this.svg.removeAttribute('hidden');this.status('WebGL context lost · SVG view remains usable');this.draw();});
   this.listen(canvas,'webglcontextrestored',()=>{this.lost=false;this.fallback=false;canvas.hidden=false;this.svg.setAttribute('hidden','');this.status('3D restored · Drag to rotate');this.draw();});
  }catch(error){this.status('SVG fallback · Drag to inspect');}
  this.status(this.fallback?'SVG fallback · Drag to inspect':'3D · Drag / pinch / wheel');
  this.listen(this.host,'pointerdown',e=>{this.pointer.set(e.pointerId,{x:e.clientX,y:e.clientY});this.host.setPointerCapture(e.pointerId);e.preventDefault();});
  this.listen(this.host,'pointermove',e=>{const p=this.pointer.get(e.pointerId);if(!p)return;if(this.pointer.size===1){this.targetYaw+=(e.clientX-p.x)*.012;this.targetPitch=Math.max(-1.4,Math.min(1.4,this.targetPitch+(e.clientY-p.y)*.012));}else{const other=[...this.pointer.entries()].find(([id])=>id!==e.pointerId)?.[1];if(other){const before=Math.hypot(p.x-other.x,p.y-other.y),after=Math.hypot(e.clientX-other.x,e.clientY-other.y);if(after>0)this.zoom=Math.max(3,Math.min(18,this.zoom*before/after));}}this.pointer.set(e.pointerId,{x:e.clientX,y:e.clientY});this.draw();});
  const release=e=>this.pointer.delete(e.pointerId);this.listen(this.host,'pointerup',release);this.listen(this.host,'pointercancel',release);
  this.listen(this.host,'wheel',e=>{e.preventDefault();this.zoom=Math.max(3,Math.min(18,this.zoom+e.deltaY*.006));this.draw();},{passive:false});
  this.listen(this.host,'keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();this.targetYaw+=(e.key==='ArrowRight'?.15:e.key==='ArrowLeft'?-.15:0);this.targetPitch+=(e.key==='ArrowDown'?.1:e.key==='ArrowUp'?-.1:0);this.draw();}});
  this.resizeObserver=new ResizeObserver(()=>this.draw());this.resizeObserver.observe(this.host);this.setGraph(this.graph,this.validation);
 }
 status(text){document.getElementById('render-status').textContent=text;}
 setActive(active){this.active=active;const generation=this.generation=(this.generation||0)+1;cancelAnimationFrame(this.frame);this.frame=0;if(active)this.ready.then(()=>{if(this.generation===generation&&this.active&&!this.destroyed)this.tick();});else this.pointer.clear();}
 tick(){if(!this.active||this.destroyed)return;this.yaw+=(this.targetYaw-this.yaw)*.18;this.pitch+=(this.targetPitch-this.pitch)*.18;this.draw();this.frame=requestAnimationFrame(()=>this.tick());}
 changeZoom(delta){this.zoom=Math.max(3,Math.min(18,this.zoom+delta));this.draw();}
 reset(){this.yaw=this.targetYaw=1.2;this.pitch=this.targetPitch=.25;this.zoom=5;this.draw();}
 setGraph(graph,validation){
  this.graph=graph;this.validation=validation;const reference=validation?.reference;
  this.points=graph.atoms.map((a,i)=>{if(reference){const id=validation.mapping?.get(a.id)||a.id;return [...reference.atoms.find(r=>r.id===id).position];}const angle=i*2*Math.PI/Math.max(1,graph.atoms.length);return [Math.cos(angle)*1.4,Math.sin(angle)*1.4,0];});
  if(this.points.length){const center=[0,1,2].map(k=>this.points.reduce((n,p)=>n+p[k],0)/this.points.length);this.points=this.points.map(p=>p.map((v,k)=>v-center[k]));}
  for(const label of this.labels)label.remove();this.labels=[];
  if(this.group){this.group.clear();const T=this.T;for(const [i,a]of graph.atoms.entries()){
   if(!this.materials.has(a.symbol))this.materials.set(a.symbol,new T.MeshStandardMaterial({color:colours[a.symbol]||'#aabbcc',roughness:.35,metalness:.1}));const mesh=new T.Mesh(this.sphere,this.materials.get(a.symbol));mesh.scale.setScalar(a.symbol==='H'?.18:.27);mesh.position.fromArray(this.points[i]);this.group.add(mesh);
   const label=document.createElement('span');label.className='atom-label';label.textContent=a.symbol;this.host.append(label);this.labels.push(label);
  }
  for(const b of graph.bonds){const ai=graph.atoms.findIndex(a=>a.id===b.a),bi=graph.atoms.findIndex(a=>a.id===b.b);if(ai<0||bi<0)continue;const a=new T.Vector3().fromArray(this.points[ai]),end=new T.Vector3().fromArray(this.points[bi]),dir=end.clone().sub(a),length=dir.length();if(length<.001)continue;const perpendicular=new T.Vector3().crossVectors(dir,new T.Vector3(0,0,1));if(perpendicular.length()<.01)perpendicular.crossVectors(dir,new T.Vector3(0,1,0));perpendicular.normalize();for(let n=0;n<b.order;n++){const mesh=new T.Mesh(this.cylinder,this.bondMaterial);mesh.scale.set(.045,length,.045);mesh.position.copy(a).add(end).multiplyScalar(.5).addScaledVector(perpendicular,(n-(b.order-1)/2)*.15);mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),dir.clone().normalize());this.group.add(mesh);}}
  }
  this.draw();
 }
 draw(){
  if(!this.svg||this.destroyed)return;const width=Math.max(1,this.host.clientWidth),height=Math.max(1,this.host.clientHeight);
  if(this.fallback){
   this.labels.forEach(l=>l.hidden=true);this.svg.setAttribute('viewBox',`0 0 ${width} ${height}`);const points=this.points.map(p=>{const x=p[0]*Math.cos(this.yaw)+p[2]*Math.sin(this.yaw),z=-p[0]*Math.sin(this.yaw)+p[2]*Math.cos(this.yaw),y=p[1]*Math.cos(this.pitch)-z*Math.sin(this.pitch);return [width/2+x*height/this.zoom,height/2-y*height/this.zoom];});
   this.svg.innerHTML=this.graph.bonds.map(b=>{const a=points[this.graph.atoms.findIndex(a=>a.id===b.a)],c=points[this.graph.atoms.findIndex(a=>a.id===b.b)];if(!a||!c)return '';const d=Math.hypot(c[0]-a[0],c[1]-a[1])||1,px=-(c[1]-a[1])/d,py=(c[0]-a[0])/d;return Array.from({length:b.order},(_,n)=>{const o=(n-(b.order-1)/2)*6;return `<line x1="${a[0]+px*o}" y1="${a[1]+py*o}" x2="${c[0]+px*o}" y2="${c[1]+py*o}" stroke="#98aebe" stroke-width="4"/>`;}).join('');}).join('')+this.graph.atoms.map((a,i)=>`<g><circle cx="${points[i][0]}" cy="${points[i][1]}" r="${a.symbol==='H'?14:20}" fill="${colours[a.symbol]}" stroke="#c9d9e6" stroke-opacity=".3"/><text x="${points[i][0]}" y="${points[i][1]+4}" fill="#0b2027" font-size="12" text-anchor="middle">${esc(a.symbol)}</text></g>`).join('');
   return;
  }
  if(!this.renderer||this.lost)return;this.labels.forEach(l=>l.hidden=false);if(this.lastWidth!==width||this.lastHeight!==height){this.renderer.setSize(width,height,false);this.lastWidth=width;this.lastHeight=height;}this.camera.aspect=width/height;this.camera.position.z=this.zoom;this.camera.updateProjectionMatrix();this.group.rotation.set(this.pitch,this.yaw,0);this.renderer.render(this.scene,this.camera);
  this.points.forEach((p,i)=>{const v=new this.T.Vector3().fromArray(p).applyMatrix4(this.group.matrixWorld).project(this.camera);this.labels[i].style.left=(v.x*.5+.5)*width+'px';this.labels[i].style.top=(-v.y*.5+.5)*height+'px';});
 }
 destroy(){this.destroyed=true;cancelAnimationFrame(this.frame);this.resizeObserver?.disconnect();this.listeners.forEach(off=>off());this.sphere?.dispose();this.cylinder?.dispose();this.materials?.forEach(m=>m.dispose());this.bondMaterial?.dispose();this.renderer?.dispose();this.host.replaceChildren();}
}
