/* The Quiet Highlands. Decorative geometry never enters collision queries. */
(function(){
'use strict';
window.createHighlandEnvironment=function(THREE,scene,camera,small){
 const group=new THREE.Group();group.name='decorative-highlands';scene.add(group);
 const palettes=[['#193d50','#789b9b','#dfcaa0'],['#254956','#94b1a4','#f1d4a2'],['#344557','#969eac','#e1bfa6'],['#192e45','#657f91','#a3aeb8']];
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=512;
 const texture=new THREE.CanvasTexture(canvas);
 const sky=new THREE.Mesh(new THREE.PlaneGeometry(1500,950),new THREE.MeshBasicMaterial({map:texture,fog:false,depthWrite:false}));
 sky.name='atmospheric-sky';sky.position.set(0,0,-590);sky.renderOrder=10;group.add(sky);
 function resize(){sky.scale.x=Math.max(1,camera.aspect/1.55);}
 resize();
 function paintSky(mood){
  const c=canvas.getContext('2d'),p=palettes[mood],g=c.createLinearGradient(0,0,0,512);
  g.addColorStop(0,p[0]);g.addColorStop(.53,p[1]);g.addColorStop(.72,p[2]);g.addColorStop(1,p[0]);c.fillStyle=g;c.fillRect(0,0,1024,512);
  const sun=c.createRadialGradient(300,205,0,300,205,160);sun.addColorStop(0,'#ffe9bc90');sun.addColorStop(.12,'#ffe9bc50');sun.addColorStop(1,'#ffe9bc00');c.fillStyle=sun;c.fillRect(140,45,320,320);
  const disc=c.createRadialGradient(300,205,4,300,205,9);disc.addColorStop(0,'#ffe8b9');disc.addColorStop(.65,'#ffe8b9c0');disc.addColorStop(1,'#ffe8b900');c.fillStyle=disc;c.fillRect(291,196,18,18);
  // Cloud banks are cached; their soft, elongated forms leave the corridor quiet.
  for(let i=0;i<28;i++){const x=(i*173)%1100-40,y=90+(i*47)%140,r=28+(i*13)%50;const cloud=c.createRadialGradient(x,y,0,x,y,r);cloud.addColorStop(0,'#d9e5db18');cloud.addColorStop(1,'#d9e5db00');c.fillStyle=cloud;c.fillRect(x-r,y-r,r*2,r*2);}
  texture.needsUpdate=true;
 }
 const material=new THREE.MeshBasicMaterial({vertexColors:true,fog:false});
 const layers=[];
 // Periodic longitudinal terrain makes the recycled seam identical. Geometry,
 // normals and sun-facing facet colours are computed once, never during flight.
 function height(x,z,layer){
  const ridge=Math.max(0,Math.min(1,(Math.abs(x)-18)/95));
  const wave=Math.sin(z/480*Math.PI*2+layer*.9+x*.017)*16+Math.cos(z/480*Math.PI*6+x*.031)*8;
  return -58+ridge*(46+wave+layer*13)+Math.sin(x*.025+layer)*ridge*17;
 }
 function terrain(layer){
  const positions=[],colors=[],indices=[],nx=20,nz=40;
  for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){
   const x=(i/nx*2-1)*440,z=j/nz*480,side=Math.abs(x);
   const y=height(x,z,layer);
   positions.push(x,y,-z);
  }
  for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const a=j*(nx+1)+i,b=a+nx+1;indices.push(a,a+1,b,b,a+1,b+1);}
  let geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setIndex(indices);geo=geo.toNonIndexed();geo.computeVertexNormals();
  const normal=geo.attributes.normal,pos=geo.attributes.position;
  const base=new THREE.Color([0x819ca0,0x527e7b,0x315b56][layer]);
  for(let i=0;i<pos.count;i++){
   const light=.7+.3*Math.max(0,normal.getX(i)*-.5+normal.getY(i)*.8+normal.getZ(i)*.3);
   const c=base.clone().multiplyScalar(light);if(pos.getY(i)>25)c.lerp(new THREE.Color(0xb2baac),.25);colors.push(c.r,c.g,c.b);
  }
  geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));return geo;
 }
 for(let l=0;l<3;l++){
  const root=new THREE.Group(),geo=terrain(l);root.name='ridge-'+l;group.add(root);
  for(let tile=0;tile<2;tile++){const mesh=new THREE.Mesh(geo,material);mesh.position.z=-tile*480;mesh.renderOrder=3-l;root.add(mesh);}
  root.position.y=l===0?12:l===1?-4:-24;root.scale.setScalar([1.25,1,.72][l]);
  layers.push({root,factor:[.12,.3,.6][l],span:480*root.scale.z});
 }
 // A quiet river sits over fifty world units below the flight envelope.
 const waterVertices=[],waterIndices=[];
 for(let i=0;i<=48;i++){const z=-i*12,centre=Math.sin(i*.14)*4;waterVertices.push(centre-3.5,-55,z,centre+3.5,-55,z);if(i<48){const a=i*2;waterIndices.push(a,a+1,a+2,a+2,a+1,a+3);}}
 const waterGeo=new THREE.BufferGeometry();waterGeo.setAttribute('position',new THREE.Float32BufferAttribute(waterVertices,3));waterGeo.setIndex(waterIndices);
 const river=new THREE.Mesh(waterGeo,new THREE.MeshBasicMaterial({color:0x6baba6,fog:false}));river.name='valley-river';group.add(river);
 const dummy=new THREE.Object3D();
 const trees=new THREE.InstancedMesh(new THREE.ConeGeometry(1,1,5),new THREE.MeshBasicMaterial({color:0x244e49,fog:false}),small?80:140);trees.name='valley-pines';group.add(trees);
 const treeData=Array.from({length:trees.count},(_,i)=>({x:(i%2?1:-1)*(26+(i*17)%100),y:-30-(i*7)%12,z:(i*47)%470,h:3+(i*13)%8}));
 // Thin falls sit well outside the steering range, below the playable corridor.
 const falls=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({color:0xa5d5cf,transparent:true,opacity:.34,fog:false,depthWrite:false,side:THREE.DoubleSide}),4);falls.name='distant-waterfalls';layers[1].root.add(falls);
 for(let i=0;i<4;i++){const x=(i%2?1:-1)*(65+i*8),z=-130-i*105;dummy.position.set(x,height(x,-z,1)-17.5,z);dummy.scale.set(1.3,35,1);dummy.updateMatrix();falls.setMatrixAt(i,dummy.matrix);}
 const birdsGeo=new THREE.BufferGeometry();const verts=[];
 for(let i=0;i<7;i++){const x=-65+i*18,y=27+(i%3)*4,z=-180-i*24;verts.push(x-1.3,y+.4,z,x,y,z,x,y,z,x+1.3,y+.4,z);}
 birdsGeo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
 const birds=new THREE.LineSegments(birdsGeo,new THREE.LineBasicMaterial({color:0x45616b,fog:false}));birds.name='distant-birds';group.add(birds);
 let activeMood=-1,time=0,lastZ=NaN,lastReduced=null;
 function layout(reduced){
  for(const l of layers){l.root.position.z=reduced?0:((-camera.position.z*l.factor)%l.span+l.span)%l.span;}
  treeData.forEach((d,i)=>{const span=layers[2].span,z=(((reduced?0:-camera.position.z*.6)-d.z)%span+span)%span-span;
   const localZ=-(z-layers[2].root.position.z)/.72;
   dummy.position.set(d.x,height(d.x/.72,localZ,2)*.72-24+d.h/2,z);dummy.scale.set(d.h*.55,d.h, d.h*.55);dummy.rotation.set(0,i*.7,0);dummy.updateMatrix();trees.setMatrixAt(i,dummy.matrix);});trees.instanceMatrix.needsUpdate=true;
 }
 return {group,layers,resize,setLow(value){trees.count=value?Math.min(40,treeData.length):treeData.length;falls.visible=!value;birds.visible=!value;},
 update(dt,mood,reduced,moving){
  mood=Math.max(0,Math.min(3,mood|0));if(mood!==activeMood){paintSky(mood);activeMood=mood;}
  group.position.z=camera.position.z;
  if(lastZ!==camera.position.z||lastReduced!==reduced){layout(reduced);lastZ=camera.position.z;lastReduced=reduced;}
  if(!reduced){time+=Math.min(dt,.05);birds.position.x=Math.sin(time*.06)*14;birds.position.y=Math.sin(time*.3)*.6;falls.material.opacity=.32+Math.sin(time*1.5)*.025;}
 },get mood(){return activeMood;},get visualTime(){return time;}};
};
})();
