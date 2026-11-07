const {load}=require('./harness.cjs');const fs=require('fs');
const rows=[];
for(const seed of [11,22,33]){
 const {game}=load({baseline:true,seed});let operational=0;
 game.world.ensureChunksAround(0,0,1);game.input.state={thrust:true};
 for(let i=0;i<180*60;i++){
  game.update(1/60);
  if(game.state==='upgrade'){game.skipUpgrade();}
  if(game.player.destroyed||(game.player.fuel<=0&&game.player.speed<8)){operational=i/60;break;}
 }
 rows.push({seed,seconds:operational||180,fuel:game.player.fuel,speed:game.player.speed,hull:game.player.hull,formalLoss:game.player.destroyed});
}
fs.mkdirSync('test-results/void-drifter',{recursive:true});fs.writeFileSync('test-results/void-drifter/baseline.json',JSON.stringify(rows,null,2));console.log(JSON.stringify(rows));
