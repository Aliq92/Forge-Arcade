const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
module.exports=function load(original=false){
 const file=path.join(__dirname,original?'fixtures/original/game.js':'../game.js');
 const source=fs.readFileSync(file,'utf8').replace(/const game=new Game\(\);[\s\S]*?\}\)\(\);\s*$/,'globalThis.Core={CONFIG,State,World,Simulation,Renderer,Input,AudioSystem};})();');
 const context={};vm.runInNewContext(source,context,{filename:file});return context.Core;
};
