const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
test('clearing held controls releases old touch ownership so a new finger works after pause',()=>{
 const buttons={};const context=vm.createContext({window:{addEventListener(){}},document:{getElementById:id=>buttons[id]??=( {listeners:{},addEventListener(k,f){this.listeners[k]=f;},setAttribute(){},setPointerCapture(){}})}});
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/input.js'),'utf8')+'\nglobalThis.Input=InputManager;',context);
 const input=new context.Input(),button=buttons.touchThrust;
 button.listeners.pointerdown({pointerId:1,preventDefault(){}});assert.equal(input.touch.thrust,true);
 input.clearHeld();button.listeners.pointerdown({pointerId:2,preventDefault(){}});assert.equal(input.touch.thrust,true);
 button.listeners.pointercancel({pointerId:2});assert.equal(input.touch.thrust,false);
});
