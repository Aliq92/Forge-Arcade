const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const THREE=require('../vendor/three.min.js');
function makeEnvironment(small=false){
 let paints=0;
 const context={fillRect(){paints++;},createLinearGradient(){return {addColorStop(){}}},createRadialGradient(){return {addColorStop(){}}}};
 const scope={window:{},document:{createElement(){return {width:0,height:0,getContext(){return context;}}}}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../environment.js'),'utf8'),scope);
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera();
 const env=scope.window.createHighlandEnvironment(THREE,scene,camera,small);
 return {env,scene,camera,paints:()=>paints};
}
test('bounded landscape batches replace technology and leave flight corridor open',()=>{
 const {env}=makeEnvironment();env.update(1/60,0,false,true);let draws=0;
 env.group.traverse(o=>{if(o.isMesh||o.isLine)draws++;});assert.ok(draws<=11);
 for(const name of ['valley-pines','distant-waterfalls'])assert.equal(env.group.getObjectByName(name).isInstancedMesh,true);
 assert.equal(env.group.getObjectByName('city-billboards'),undefined);
 for(const l of env.layers){const mesh=l.root.children[0],p=mesh.geometry.attributes.position,n=mesh.geometry.attributes.normal;
  for(let i=0;i<p.count;i++){assert.ok(Number.isFinite(p.getY(i)));assert.ok(n.getY(i)>0,'terrain faces upward');if(Math.abs(p.getX(i)*l.root.scale.x)<18)assert.ok(p.getY(i)*l.root.scale.y+l.root.position.y<-30);}
 }
});
test('low detail bounds trees and removes optional effects; high restores them',()=>{
 const {env}=makeEnvironment(true),trees=env.group.getObjectByName('valley-pines');env.setLow(true);assert.equal(trees.count,40);assert.equal(env.group.getObjectByName('distant-waterfalls').visible,false);
 env.setLow(false);assert.equal(trees.count,80);assert.equal(env.group.getObjectByName('distant-waterfalls').visible,true);
});
test('sky is cached per mood and camera transforms are never modified',()=>{
 const {env,camera,paints}=makeEnvironment();camera.position.set(3,2,-100);camera.rotation.set(.1,.2,.3);const before=camera.position.clone(),rotation=camera.rotation.clone();env.update(.1,0,false,true);const first=paints();
 env.update(.1,0,false,true);assert.equal(paints(),first);assert.deepEqual(camera.position,before);assert.deepEqual(camera.rotation.toArray(),rotation.toArray());assert.equal(env.group.position.z,-100);
 env.update(.1,3,false,true);assert.ok(paints()>first);assert.equal(env.mood,3);
});
test('near ridges move faster than far ridges, and geometry is reused through long flight',()=>{
 const {env,camera}=makeEnvironment();env.update(.1,0,false,true);const geometry=env.layers.map(l=>l.root.children[0].geometry);
 camera.position.z=-10;env.update(.1,0,false,true);assert.deepEqual(Array.from(env.layers,l=>Math.round(l.root.position.z*10)/10),[1.2,3,6]);
 for(let i=1;i<200;i++){camera.position.z=-i*100;env.update(.016,i%4,false,true);env.layers.forEach((l,j)=>{assert.equal(l.root.children[0].geometry,geometry[j]);assert.ok(l.root.position.z>=0&&l.root.position.z<l.span);});}
});
test('periodic terrain seams match heights and frozen scenery has no GPU matrix uploads',()=>{
 const {env}=makeEnvironment();
 for(const l of env.layers){const p=l.root.children[0].geometry.attributes.position,start=new Map(),end=new Map();for(let i=0;i<p.count;i++){if(p.getZ(i)===0)start.set(p.getX(i),p.getY(i));if(p.getZ(i)===-480)end.set(p.getX(i),p.getY(i));}for(const [x,y] of start)assert.ok(Math.abs(y-end.get(x))<.0001);}
 env.update(.1,0,false,false);const trees=env.group.getObjectByName('valley-pines'),version=trees.instanceMatrix.version;env.update(.1,0,false,false);assert.equal(trees.instanceMatrix.version,version);
});
test('reduced motion freezes ambient movement and decorative parallax during flight',()=>{
 const {env,camera}=makeEnvironment();env.update(.1,0,true,false);const birds=env.group.getObjectByName('distant-birds'),pos=birds.position.clone(),time=env.visualTime;
 const trees=env.group.getObjectByName('valley-pines'),matrices=Array.from(trees.instanceMatrix.array);camera.position.z=-100;env.update(10,0,true,true);
 assert.equal(env.visualTime,time);assert.deepEqual(birds.position,pos);assert.deepEqual(Array.from(trees.instanceMatrix.array),matrices);assert.ok(env.layers.every(l=>l.root.position.z===0));
 env.update(.016,0,false,true);assert.ok(env.visualTime>time);
});
test('opaque landscape draws near-to-far; sky fills remaining pixels last',()=>{
 const {env}=makeEnvironment();assert.ok(env.layers[2].root.children[0].renderOrder<env.layers[0].root.children[0].renderOrder);
 const sky=env.group.getObjectByName('atmospheric-sky');assert.ok(sky.renderOrder>3);assert.equal(sky.material.depthTest,true);assert.equal(sky.material.depthWrite,false);
});

test('sky covers portrait, landscape and ultrawide viewports after resize',()=>{
 const {env,camera}=makeEnvironment();const sky=env.group.getObjectByName('atmospheric-sky');
 for(const aspect of [.46,1.6,2.16,3.56]){camera.aspect=aspect;env.resize();const required=2*590*Math.tan(72*Math.PI/360)*aspect;assert.ok(1500*sky.scale.x>=required+12);}
});

test('pines stay planted and travel toward the camera with their terrain',()=>{
 const {env,camera}=makeEnvironment();const trees=env.group.getObjectByName('valley-pines'),a=new THREE.Matrix4(),b=new THREE.Matrix4();
 env.update(.016,0,false,true);trees.getMatrixAt(1,a);camera.position.z=-10;env.update(.016,0,false,true);trees.getMatrixAt(1,b);
 assert.ok(Math.abs(b.elements[14]-a.elements[14]-6)<.001);assert.ok(Math.abs(b.elements[13]-a.elements[13])<.001);
});
