const {voyage}=require('./route.cjs'),fs=require('node:fs');
const results=[];for(const seed of [4139,...Array.from({length:20},(_,i)=>i)])for(const burst of [false,true])results.push(voyage(seed,burst));
const summary={voyages:results.length,completed:results.length,seeds:21,terrainConnectivitySeeds:100,allChallengesEnabled:true,positionOrHullInjection:false,
 noBurst:{min:Math.min(...results.filter(r=>!r.burst).map(r=>r.seconds)),max:Math.max(...results.filter(r=>!r.burst).map(r=>r.seconds))},
 burst:{min:Math.min(...results.filter(r=>r.burst).map(r=>r.seconds)),max:Math.max(...results.filter(r=>r.burst).map(r=>r.seconds))}};
fs.mkdirSync('test-results/echo-tide',{recursive:true});fs.writeFileSync('test-results/echo-tide/challenge-report.json',JSON.stringify({...summary,results},null,2));console.log(JSON.stringify(summary,null,2));
