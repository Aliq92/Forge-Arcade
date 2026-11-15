const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const THREE=require('../vendor/three.min.js');
function makeEnvironment(small=false){
 let paints=0;
 const context={fillRect(){paints++;},strokeRect(){},fillText(){},createLinearGradient(){return {addColorStop(){}}},createRadialGradient(){return {addColorStop(){}}}};
 const scope={window:{},document:{createElement(){return {width:0,height:0,getContext(){return context;}}}}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../environment.js'),'utf8'),scope);
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera();
 const env=scope.window.createHeroEnvironment(THREE,scene,camera,small);
 return {env,scene,camera,paints:()=>paints};
}
test('city decorations use at most 24 draw objects and batch repeated technology',()=>{
 const {env}=makeEnvironment();env.update(1/60,0,false,true);
 let draws=0;env.group.traverse(o=>{if(o.isMesh||o.isLine)draws++;});assert.ok(draws<=24,`${draws} decorative draw objects exceed budget`);
 for(const name of ['transit-lanes','reactor-cores','reactor-spines','city-billboards','aerial-traffic'])assert.equal(env.group.getObjectByName(name)?.isInstancedMesh,true,name);
});
test('low detail keeps traffic bounded and restores all instances on high',()=>{
 const {env}=makeEnvironment(true);const traffic=env.group.getObjectByName('aerial-traffic');
 assert.ok(traffic,'traffic batch exists');env.setLow(true);env.update(.1,0,false,true);assert.equal(traffic.count,3);assert.equal(env.layers[0].towers.visible,false);
 env.setLow(false);env.update(.1,0,false,true);assert.equal(traffic.count,8);assert.equal(env.layers[0].towers.visible,true);
});
test('sky is cached per mood and decorative updates never move the camera',()=>{
 const {env,camera,paints}=makeEnvironment();camera.position.set(3,2,-100);const before=camera.position.clone();env.update(.1,0,false,true);const first=paints();
 env.update(.1,0,false,true);assert.equal(paints(),first);assert.deepEqual(camera.position,before);assert.equal(env.group.position.z,-100);
 env.update(.1,3,false,true);assert.ok(paints()>first);assert.equal(env.mood,3);
});
test('reduced motion freezes portal and aircraft transforms',()=>{
 const {env}=makeEnvironment();env.update(.1,0,true,false);const portal=env.portals[0].rotation.z;const traffic=env.group.getObjectByName('aerial-traffic');assert.ok(traffic);const matrices=Array.from(traffic.instanceMatrix.array);
 env.update(10,0,true,false);assert.equal(env.portals[0].rotation.z,portal);assert.deepEqual(Array.from(traffic.instanceMatrix.array),matrices);
});
test('opaque city layers draw near-to-far and the sky fills uncovered pixels last',()=>{
 const {env}=makeEnvironment();
 assert.ok(env.layers[2].towers.renderOrder<env.layers[1].towers.renderOrder);
 assert.ok(env.layers[1].towers.renderOrder<env.layers[0].towers.renderOrder);
 const sky=env.group.getObjectByName('atmospheric-sky');assert.ok(sky);
 assert.ok(sky.renderOrder>env.layers[0].towers.renderOrder);assert.equal(sky.material.depthTest,true);
});
