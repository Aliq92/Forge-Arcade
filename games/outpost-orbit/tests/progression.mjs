import {create,step,place} from '../simulation.js';
import {buyUpgrade,claimMission,mission} from '../frontier.js';
import {writeFile,mkdir} from 'node:fs/promises';
const results=[];
for(let seed=0;seed<100;seed++){
 const s=create(seed),missions=[];let ticks=0;
 while(!s.frontier.completed&&ticks++<18000){
  for(const type of ['habitat','garden','energy','workshop','research','storage'])if(!s.buildings.some(b=>b.type===type)){
   let done=false;for(let y=-180;y<=180&&!done;y+=60)for(let x=-240;x<=240&&!done;x+=60)done=place(s,type,x,y);
  }
  for(const id of ['cargo','energy','engine','scanner','station'])if(s.frontier.upgrades[id]<(id==='station'?2:1))buyUpgrade(s,id);
  if(claimMission(s))missions.push({mission:s.frontier.mission,seconds:Math.round(s.frontier.elapsed)});
  step(s,.2);
 }
 if(!s.frontier.completed)throw Error(`Seed ${seed} blocked at ${mission(s).title}`);
 results.push({seed,seconds:Math.round(s.frontier.elapsed),missions,discoveries:s.discoveries.filter(d=>d.found).length,deliveries:s.frontier.deliveries,upgrades:s.frontier.upgrades});
}
const seconds=results.map(r=>r.seconds).sort((a,b)=>a-b),summary={seeds:100,completed:results.length,noResourceInjection:true,activeSeconds:{min:seconds[0],median:seconds[50],p95:seconds[95],max:seconds.at(-1)},results};
await mkdir('test-results/outpost-orbit',{recursive:true});await writeFile('test-results/outpost-orbit/progression-report.json',JSON.stringify(summary,null,2));console.log(JSON.stringify({...summary,results:undefined},null,2));
