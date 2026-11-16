(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ParticleLabMaterials=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const ID=Object.freeze({air:0,sand:1,water:2,stone:3,metal:4,wood:5,oil:6,lava:7,ice:8,steam:9,fire:10,smoke:11});
const rows=[
 ['Air','gas',0,20,.015,[10,16,28],'Empty space carries heat.'],
 ['Sand','powder',1.6,20,.12,[224,185,105],'Grains fall and slide into piles.'],
 ['Water','liquid',1,20,.32,[54,143,235],'Flows, boils and extinguishes fire.'],
 ['Stone','solid',3,20,.18,[119,128,147],'Stationary, heat-resistant construction.'],
 ['Metal','solid',5,20,.85,[173,193,211],'A durable conductor of heat.'],
 ['Wood','solid',.7,20,.10,[153,99,55],'Stationary construction; ignites when hot.'],
 ['Oil','liquid',.8,20,.12,[139,105,39],'Floats on water and burns readily.'],
 ['Lava','liquid',2.5,1100,.35,[255,91,29],'Slow hot liquid; cools into stone.'],
 ['Ice','solid',.9,-15,.38,[163,232,246],'Melts into water at 0°C.'],
 ['Steam','gas',.05,120,.06,[191,219,235],'Rises and condenses below 75°C.'],
 ['Fire','gas',.01,800,.24,[255,174,57],'Heats nearby fuel, then becomes smoke.'],
 ['Smoke','gas',.02,110,.04,[124,133,155],'Rises and eventually dissipates.']
];
const MATERIALS=Object.freeze(rows.map((r,id)=>Object.freeze({id,key:Object.keys(ID)[id],name:r[0],state:r[1],density:r[2],temp:r[3],temperature:r[3],conductivity:r[4],color:r[5],description:r[6],flammable:id===5||id===6,ignition:id===5?280:id===6?230:Infinity,...(id===8?{melting:0}:id===2?{boiling:100}:id===9?{condensation:75}:id===7?{solidification:650}:{})})));
const clamp=t=>Math.max(-100,Math.min(1500,t));
class World{
 constructor(width=96,height=64,seed=23){
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<2||height<2||width>256||height>256)throw Error('Invalid world dimensions');
  this.width=width;this.height=height;this.seed=seed>>>0;this.tick=0;const n=width*height;
  this.cells=new Uint8Array(n);this.temp=new Float32Array(n).fill(20);this.locked=new Uint8Array(n);this.origin=new Uint8Array(n);this.life=new Uint16Array(n);this.moved=new Uint8Array(n);this.delta=new Float32Array(n);this.stats={melted:0,boiled:0,condensed:0,cooled:0,ignited:0,extinguished:0};
 }
 inside(x,y){return Number.isInteger(x)&&Number.isInteger(y)&&x>=0&&y>=0&&x<this.width&&y<this.height;}
 get(x,y){return this.inside(x,y)?this.cells[y*this.width+x]:-1;}
 set(x,y,id,temp=MATERIALS[id]?.temp,locked=false){if(!this.inside(x,y)||!MATERIALS[id]||!Number.isFinite(temp))return false;const i=y*this.width+x;this.cells[i]=id;this.temp[i]=clamp(temp);this.locked[i]=locked?1:0;this.origin[i]=id;this.life[i]=id===ID.fire?45:id===ID.smoke?100:0;return true;}
 paint(x,y,id,radius=0,options={}){if(!MATERIALS[id]||![x,y,radius].every(Number.isFinite))return 0;radius=Math.min(20,Math.max(0,Math.floor(radius)));let n=0;for(let yy=Math.floor(y)-radius;yy<=Math.floor(y)+radius;yy++)for(let xx=Math.floor(x)-radius;xx<=Math.floor(x)+radius;xx++){if(!this.inside(xx,yy)||(xx-x)**2+(yy-y)**2>radius*radius)continue;const i=yy*this.width+xx;if(this.locked[i]||(!options.overwrite&&id!==ID.air&&this.cells[i]!==ID.air))continue;this.set(xx,yy,id);n++;}return n;}
 line(x1,y1,x2,y2,id,radius=0,options={}){if(![x1,y1,x2,y2,radius].every(Number.isFinite))return 0;x1=Math.round(Math.max(0,Math.min(this.width-1,x1)));x2=Math.round(Math.max(0,Math.min(this.width-1,x2)));y1=Math.round(Math.max(0,Math.min(this.height-1,y1)));y2=Math.round(Math.max(0,Math.min(this.height-1,y2)));const steps=Math.max(Math.abs(x2-x1),Math.abs(y2-y1));let n=0;for(let k=0;k<=steps;k++){const t=steps?k/steps:0;n+=this.paint(Math.round(x1+(x2-x1)*t),Math.round(y1+(y2-y1)*t),id,radius,options);}return n;}
 rect(x1,y1,x2,y2,id,filled=true,options={}){if(![x1,y1,x2,y2].every(Number.isFinite))return 0;let n=0;for(let y=Math.max(0,Math.min(y1,y2));y<=Math.min(this.height-1,Math.max(y1,y2));y++)for(let x=Math.max(0,Math.min(x1,x2));x<=Math.min(this.width-1,Math.max(x1,x2));x++)if(filled||x===x1||x===x2||y===y1||y===y2)n+=this.paint(x,y,id,0,options);return n;}
 heat(x,y,delta,radius=2){if(![x,y,delta,radius].every(Number.isFinite))return 0;let n=0;radius=Math.min(20,Math.max(0,Math.floor(radius)));for(let yy=y-radius;yy<=y+radius;yy++)for(let xx=x-radius;xx<=x+radius;xx++)if(this.inside(xx,yy)&&(xx-x)**2+(yy-y)**2<=radius*radius){const i=yy*this.width+xx;if(!this.locked[i]){this.temp[i]=clamp(this.temp[i]+delta);n++;}}return n;}
 count(id,rect){let n=0;for(let y=0;y<this.height;y++)for(let x=0;x<this.width;x++)if((!rect||(x>=rect.x&&y>=rect.y&&x<rect.x+rect.w&&y<rect.y+rect.h))&&this.cells[y*this.width+x]===id)n++;return n;}
 change(i,id,stat){this.cells[i]=id;this.life[i]=id===ID.fire?45:id===ID.smoke?100:0;if(stat)this.stats[stat]++;}
 step(){
  const w=this.width,h=this.height,n=this.cells.length;this.tick++;this.delta.fill(0);this.moved.fill(0);
  // Pairwise conservative diffusion; sum of the four exchanges stays bounded.
  for(let i=0;i<n;i++){if(this.cells[i]===ID.fire)this.temp[i]=Math.max(650,this.temp[i]);for(const j of [i%w<w-1?i+1:-1,i+w<n?i+w:-1])if(j>=0){const q=(this.temp[j]-this.temp[i])*Math.min(MATERIALS[this.cells[i]].conductivity,MATERIALS[this.cells[j]].conductivity)*.20;this.delta[i]+=q;this.delta[j]-=q;}}
  for(let i=0;i<n;i++)this.temp[i]=clamp(this.temp[i]+this.delta[i]);
  for(let i=0;i<n;i++){
   const id=this.cells[i],t=this.temp[i];
   if(id===ID.ice&&t>=0)this.change(i,ID.water,'melted');
   else if(id===ID.water&&t>=100)this.change(i,ID.steam,'boiled');
   else if(id===ID.steam&&t<=75)this.change(i,ID.water,'condensed');
   else if(id===ID.lava&&t<=650)this.change(i,ID.stone,'cooled');
   else if(MATERIALS[id].flammable&&t>=MATERIALS[id].ignition){this.change(i,ID.fire,'ignited');this.temp[i]=800;}
   else if(id===ID.fire){const x=i%w,y=(i/w)|0;let wet=false;for(const [dx,dy] of [[0,-1],[0,1],[-1,0],[1,0]])if(this.get(x+dx,y+dy)===ID.water)wet=true;if(wet){this.change(i,ID.smoke,'extinguished');this.temp[i]=100;}else if(--this.life[i]===0)this.change(i,ID.smoke);}
   else if(id===ID.smoke&&--this.life[i]===0)this.change(i,ID.air);
  }
  const swap=(i,j)=>{for(const arr of [this.cells,this.temp,this.origin,this.life]){const a=arr[i];arr[i]=arr[j];arr[j]=a;}this.moved[i]=this.moved[j]=1;};
  const move=(i,x,y,gas)=>{if(!this.inside(x,y))return false;const j=y*w+x;if(this.moved[j])return false;const a=MATERIALS[this.cells[i]],b=MATERIALS[this.cells[j]];if(b.id===ID.air||(gas?b.state==='gas'&&a.density<b.density:(b.state==='liquid'||b.state==='gas')&&a.density>b.density)){swap(i,j);return true;}return false;};
  for(let y=h-1;y>=0;y--)for(let k=0;k<w;k++){
   const x=this.tick%2?k:w-1-k,i=y*w+x,id=this.cells[i],m=MATERIALS[id];if(this.moved[i]||id===ID.air||m.state==='solid')continue;
   const gas=m.state==='gas',dy=gas?-1:1,dir=((this.tick+x+y+this.seed)&1)?1:-1;
   if(id===ID.lava&&this.tick%3!==0)continue;
   if(move(i,x,y+dy,gas)||move(i,x+dir,y+dy,gas)||move(i,x-dir,y+dy,gas))continue;
   if(m.state==='liquid'||gas){if(move(i,x+dir,y,gas))continue;move(i,x-dir,y,gas);}
  }
  return this;
 }
 export(){return {version:2,width:this.width,height:this.height,seed:this.seed,tick:this.tick,cells:Array.from(this.cells),temp:Array.from(this.temp),locked:Array.from(this.locked),origin:Array.from(this.origin),life:Array.from(this.life),stats:{...this.stats}};}
 clone(){return World.from(this.export());}
 static from(data){
  if(!data||data.version!==2)throw Error('Unsupported laboratory save');const world=new World(data.width,data.height,data.seed),n=world.cells.length;
  for(const [key,max] of [['cells',11],['temp',1500],['locked',1],['origin',11],['life',65535]]){const values=data[key];if(!Array.isArray(values)||values.length!==n||values.some(v=>!Number.isFinite(v)||v<(key==='temp'?-100:0)||v>max||(key!=='temp'&&!Number.isInteger(v))))throw Error('Invalid save '+key);world[key].set(values);}
  for(let i=0;i<n;i++)if((world.cells[i]===ID.fire||world.cells[i]===ID.smoke)&&world.life[i]===0)throw Error('Invalid reactive lifetime');
  if(!Number.isSafeInteger(data.tick)||data.tick<0)throw Error('Invalid save tick');world.tick=data.tick;for(const key of Object.keys(world.stats)){if(!Number.isSafeInteger(data.stats?.[key])||data.stats[key]<0)throw Error('Invalid save statistics');world.stats[key]=data.stats[key];}return world;
 }
}
return {World,MATERIALS,ID};
});
