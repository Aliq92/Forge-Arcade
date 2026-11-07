const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
test('reward text clears without relying on a CSS animation, including reduced motion',()=>{
 const classes=new Set(),el={textContent:'',offsetWidth:1,classList:{remove:k=>classes.delete(k),add:k=>classes.add(k)}};const callbacks=[];
 const c=vm.createContext({document:{getElementById:()=>el},setTimeout:fn=>callbacks.push(fn),clearTimeout(){}});
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/ui.js'),'utf8')+'\nglobalThis.UI=UIManager;',c);
 c.UI.prototype.rewardFeedback.call({},'FULL REFUEL!');assert.equal(el.textContent,'FULL REFUEL!');assert.ok(callbacks.length>0);
 callbacks[0]();assert.equal(el.textContent,'');assert.equal(classes.has('show'),false);
});
