/* Aegis City: decorative only. Never queried by the gameplay collision system. */
(function(){
'use strict';
window.createHeroEnvironment=function(THREE,scene,camera,small){
 const group=new THREE.Group();group.name='decorative-city';scene.add(group);
 const palette=[['#091d42','#665179','#e9a573','#ffd7a0'],['#050d2e','#342762','#3c8fbe','#8af0ff'],['#080d22','#252940','#686583','#a9baff'],['#100d35','#552c73','#b26699','#f1b0ff']];
 const skyCanvas=document.createElement('canvas');skyCanvas.width=1024;skyCanvas.height=512;
 const skyTexture=new THREE.CanvasTexture(skyCanvas);
 const sky=new THREE.Mesh(new THREE.PlaneGeometry(1500,900),new THREE.MeshBasicMaterial({map:skyTexture,fog:false,depthWrite:false}));sky.position.z=-580;sky.name='atmospheric-sky';sky.renderOrder=10;group.add(sky);
 function paintSky(mood){const ctx=skyCanvas.getContext('2d'),p=palette[mood];const grad=ctx.createLinearGradient(0,0,0,512);grad.addColorStop(0,p[0]);grad.addColorStop(.34,p[1]);grad.addColorStop(.62,p[2]);grad.addColorStop(1,p[0]);ctx.fillStyle=grad;ctx.fillRect(0,0,1024,512);
 const sun=ctx.createRadialGradient(220,252,2,220,252,210);sun.addColorStop(0,p[3]);sun.addColorStop(.08,p[3]+'cc');sun.addColorStop(.28,p[2]+'66');sun.addColorStop(1,p[2]+'00');ctx.fillStyle=sun;ctx.fillRect(0,0,1024,512);
 // Cached, sculpted cloud banks with a bright upper rim.
 for(let i=0;i<56;i++){const x=(i*137)%1100-40,y=80+(i*71)%230,r=35+(i*23)%80;const cloud=ctx.createRadialGradient(x,y,2,x,y,r);cloud.addColorStop(0,i%3===0?'#bab5e530':'#070e2a80');cloud.addColorStop(1,'#0b163000');ctx.fillStyle=cloud;ctx.fillRect(x-r,y-r,r*2,r*2);}
 skyTexture.needsUpdate=true;}
 let activeMood=-1;
 const facade=document.createElement('canvas');facade.width=128;facade.height=256;const fc=facade.getContext('2d');fc.fillStyle='#0d2242';fc.fillRect(0,0,128,256);
 for(let y=5;y<256;y+=12)for(let x=6;x<128;x+=12){fc.fillStyle=(x*7+y*3)%11<7?'#76bed0':'#203a58';fc.fillRect(x,y,3,6);}fc.fillStyle='#9deeff';fc.fillRect(1,0,2,256);
 const facadeTex=new THREE.CanvasTexture(facade);facadeTex.magFilter=THREE.NearestFilter;
 const box=new THREE.BoxGeometry(1,1,1),dummy=new THREE.Object3D();
 const layers=[];
 for(let l=0;l<3;l++){
  const n=small?24:40,mat=new THREE.MeshBasicMaterial({map:facadeTex,color:[0x657ba9,0x7d99bc,0xadc4dc][l],fog:false});
  const towers=new THREE.InstancedMesh(box,mat,n),roofs=new THREE.InstancedMesh(box,new THREE.MeshBasicMaterial({color:0x4b8ca5,fog:false}),n);group.add(towers,roofs);
  // Front-to-back opaque geometry lets depth testing reject hidden city pixels.
  towers.renderOrder=roofs.renderOrder=3-l;
  const data=[];for(let i=0;i<n;i++)data.push({x:(i%2?1:-1)*(l===0?95+(i*17)%125:l===1?45+(i*13)%65:22+(i*19)%37),z:-25-(i*37)%490,h:(l===0?32:23)+(i*31)%68,w:5+(i*7)%12});
  layers.push({towers,roofs,data,factor:[.12,.35,.75][l]});
 }
 const neon=new THREE.MeshBasicMaterial({color:0x59daf4,fog:false,transparent:true,opacity:.5});
 function placeInstance(mesh,index,x,y,z,rz=0){
  dummy.position.set(x,y,z);dummy.scale.set(1,1,1);dummy.rotation.set(0,0,rz);
  dummy.updateMatrix();mesh.setMatrixAt(index,dummy.matrix);
 }
 const lanes=new THREE.InstancedMesh(new THREE.BoxGeometry(.12,.12,470),neon,6);
 lanes.name='transit-lanes';group.add(lanes);
 for(let side=0;side<2;side++)for(let i=0;i<3;i++)placeInstance(lanes,side*3+i,(side?1:-1)*(16+i*9),-8-i*3,-240);
 const portalMat=new THREE.MeshBasicMaterial({color:0xc589ff,fog:false,transparent:true,opacity:.7});
 const portals=[];
 for(let i=0;i<2;i++){const portal=new THREE.Group();portal.position.set(i?105:-75,i?104:110,i?-330:-250);
  for(let j=0;j<3;j++){const ring=new THREE.Mesh(new THREE.TorusGeometry(18+j*2,.12+j*.07,5,j===1?6:72),portalMat);ring.rotation.z=j*.2;portal.add(ring);}
  const halo=new THREE.Mesh(new THREE.RingGeometry(17,25,72),new THREE.MeshBasicMaterial({color:0xa879f2,transparent:true,opacity:.09,fog:false,depthWrite:false,side:THREE.DoubleSide}));portal.add(halo);
  const marks=new THREE.InstancedMesh(box,portalMat,24);for(let k=0;k<24;k++){const a=k/24*Math.PI*2;dummy.position.set(Math.cos(a)*23,Math.sin(a)*23,0);dummy.scale.set(.7,2,.2);dummy.rotation.set(0,0,a);dummy.updateMatrix();marks.setMatrixAt(k,dummy.matrix);}portal.add(marks);group.add(portal);portals.push(portal);
 }
 // Repeated technology shares draw calls and GPU resources.
 const reactors=new THREE.InstancedMesh(new THREE.OctahedronGeometry(3,0),new THREE.MeshBasicMaterial({color:0x172d4c,fog:false}),6);
 reactors.name='reactor-cores';group.add(reactors);
 const spines=new THREE.InstancedMesh(new THREE.CylinderGeometry(.35,.35,12,5),neon,6);
 spines.name='reactor-spines';group.add(spines);
 for(let i=0;i<6;i++){
  const x=(i%2?1:-1)*(32+i*7),y=9+(i%3)*8,z=-100-i*61;
  placeInstance(reactors,i,x,y,z);placeInstance(spines,i,x,y,z);
 }
 const boardCanvas=document.createElement('canvas');boardCanvas.width=256;boardCanvas.height=128;const bc=boardCanvas.getContext('2d');bc.fillStyle='#092840';bc.fillRect(0,0,256,128);bc.strokeStyle='#63d9ff';bc.lineWidth=6;bc.strokeRect(4,4,248,120);bc.fillStyle='#9af4ff';bc.font='bold 25px sans-serif';bc.fillText('AEGIS / CITY',22,53);bc.font='14px monospace';bc.fillText('KEEP THE SIGNAL',25,86);
 const boardTex=new THREE.CanvasTexture(boardCanvas);
 const boards=new THREE.InstancedMesh(new THREE.PlaneGeometry(17,8.5),new THREE.MeshBasicMaterial({map:boardTex,fog:false,transparent:true,opacity:.8}),2);
 boards.name='city-billboards';group.add(boards);
 placeInstance(boards,0,-32,4,-100);placeInstance(boards,1,32,4,-100);
 const aircraft=new THREE.InstancedMesh(new THREE.ConeGeometry(.8,5,4),new THREE.MeshBasicMaterial({color:0xa7efff,fog:false}),8);
 aircraft.name='aerial-traffic';aircraft.instanceMatrix.setUsage(THREE.DynamicDrawUsage);group.add(aircraft);
 const lightning=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(120,130,-360),new THREE.Vector3(108,92,-360),new THREE.Vector3(119,96,-360),new THREE.Vector3(100,55,-360)]),new THREE.LineBasicMaterial({color:0xb7aeff,fog:false,transparent:true,opacity:0}));group.add(lightning);
 let visualTime=0,low=false;
 return {group,portals,layers, setLow(value){low=value;layers[0].towers.visible=!value;layers[0].roofs.visible=!value;},
 update(dt,mood,reduced,moving){if(mood!==activeMood){paintSky(mood);activeMood=mood;}group.position.z=camera.position.z;
  if(!reduced)visualTime+=dt;
  for(const layer of layers){layer.data.forEach((d,i)=>{const z=-20-(((-camera.position.z*layer.factor-d.z)%490+490)%490);dummy.position.set(d.x,d.h/2-42,z);dummy.rotation.set(0,0,0);dummy.scale.set(d.w,d.h,d.w*.8);dummy.updateMatrix();layer.towers.setMatrixAt(i,dummy.matrix);dummy.position.y+=d.h/2+2;dummy.scale.set(.4,4,.4);dummy.updateMatrix();layer.roofs.setMatrixAt(i,dummy.matrix);});layer.towers.instanceMatrix.needsUpdate=true;layer.roofs.instanceMatrix.needsUpdate=true;}
  portals.forEach((p,i)=>{p.rotation.z=reduced?0:visualTime*(i?-.07:.09);p.children[1].rotation.z=reduced?0:-visualTime*.13;});
  aircraft.count=low?3:8;
  for(let i=0;i<aircraft.count;i++)placeInstance(aircraft,i,reduced?-100+i*29:((visualTime*(3+i%3)+i*29)%240)-120,13+i*3,-90-i*35,-Math.PI/2);
  aircraft.instanceMatrix.needsUpdate=true;
  lightning.material.opacity=!reduced&&mood===2&&visualTime%9>7.8&&visualTime%9<8.2?.5:0;
 },get mood(){return activeMood;}};
};
})();
