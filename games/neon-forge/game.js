import { getWave, isUpgradeWave } from './waves.js';
import { freshUpgrades, upgradeChoices, applyUpgrade } from './upgrades.js';

const STEP=1/120, TAU=Math.PI*2, ARC=50*Math.PI/180;
export const normalizeAngle=a=>Number.isFinite(a)?((a+Math.PI)%TAU+TAU)%TAU-Math.PI:0;
export const angleDistance=(a,b)=>Math.abs(normalizeAngle(a-b));
export function seededRandom(seed=1){let s=seed>>>0;return()=>{s=(s+0x6D2B79F5)>>>0;let t=s;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}

export class Game {
 constructor({seed=1}={}){this.seed=Number.isFinite(seed)?seed>>>0:1;this.mode='endless';this._reset();}
 _reset(){this.rng=seededRandom(this.seed);this.state='ready';this.time=0;this.waveNumber=1;this.completedLevels=0;this.intermissionRemaining=0;this._pausedState=null;this.wave=null;this.waveTime=0;this.targets=[];this.boss=null;this.player={angle:0,shields:3,maxShields:3,invulnerable:0,recovery:0,attack:null,keeperCharges:0};this.stats={score:0,attempts:0,successfulStrikes:0,hits:0,perfects:0,combo:0,bestCombo:0,misses:0,damage:0,survival:0,highestWave:1};this.upgrades=freshUpgrades();this.choices=[];this.stage=1;this.lastWave=null;this.events=[];this.echoes=[];this.pendingChildren=[];this.slowRemaining=0;this.slowCooldown=0;this._id=0;this._attackId=0;this._accumulator=0;this._rotation=0;this._spawnIndex=0;this._waveBest=0;}
 start(){if(this.state!=='ready')return false;this._beginWave();return true;}
 restart(){this._reset();return this.start();}
 _beginWave(){this.wave=getWave(this.waveNumber,this.mode,this.seed);if(!this.wave)return false;this.state='playing';this.waveTime=0;this._spawnIndex=0;this.targets=[];this.echoes=[];this.pendingChildren=[];this.player.attack=null;this.player.recovery=0;this.player.keeperCharges=this.upgrades.keeper||0;this._waveBest=this.stats.combo;this._waveStart={...this.stats};this.stats.highestWave=this.waveNumber;const bossHp=Math.min(18,10+2*Math.floor(this.waveNumber/10));this.boss=this.wave.boss?{hp:bossHp,maxHp:bossHp,phase:1,angle:0,r:250,vulnerable:false,telegraph:false,phaseTime:0,windowHits:0,cycle:-1}:null;this.intermissionRemaining=0;this._emit('level',{value:this.waveNumber,text:`LEVEL ${this.waveNumber}`});return true;}
 aim(a){if(Number.isFinite(a)&&(this.state==='playing'||this.state==='intermission'))this.player.angle=normalizeAngle(a);}
 setRotation(v){this._rotation=v===-1?-1:v===1?1:0;}
 strike(){if(this.state!=='playing'||this.player.recovery>1e-8||this.player.attack)return false;this.stats.attempts++;this.player.recovery=.32;this.player.attack={id:++this._attackId,angle:this.player.angle,remaining:.1,arc:ARC+(this.upgrades.wide||0)*10*Math.PI/180,reach:132,hitIds:new Set(),successful:false};this._emit('strike',{angle:this.player.angle,r:132});this._resolveAttack(this.player.attack);return true;}
 pause(){if(this.state==='playing'||this.state==='intermission'){this._pausedState=this.state;this.state='paused';this._rotation=0;}}
 resume(){if(this.state==='paused'){this.state=this._pausedState||'playing';this._pausedState=null;}}
 nextWave(){if(this.state!=='intermission')return false;if(isUpgradeWave(this.waveNumber,this.mode)){this.choices=upgradeChoices(this.upgrades,this.rng,this.player);this.state='upgrade';this._rotation=0;return true;}this.waveNumber++;return this._beginWave();}
 chooseUpgrade(id){if(this.state!=='upgrade'||!this.choices.some(c=>c.id===id))return false;const result=applyUpgrade(this.upgrades,this.player,id);if(!result.ok)return false;this.stats.score+=result.scoreBonus||0;this._emit('upgrade',{text:result.message||id});this.choices=[];this._rotation=0;this.waveNumber++;return this._beginWave();}
 advance(dt){if(!['playing','intermission'].includes(this.state)||!Number.isFinite(dt)||dt<=0)return;this._accumulator+=Math.min(.25,dt);let steps=0;while(this._accumulator+1e-10>=STEP&&steps++<31&&['playing','intermission'].includes(this.state)){this._accumulator-=STEP;if(this.state==='intermission')this._stepIntermission(STEP);else this._step(STEP);}if(!['playing','intermission'].includes(this.state))this._accumulator=0;}
 _stepIntermission(dt){this.time+=dt;this.stats.survival=this.time;this.player.angle=normalizeAngle(this.player.angle+this._rotation*3.5*dt);this.intermissionRemaining=Math.max(0,this.intermissionRemaining-dt);if(this.intermissionRemaining<=1e-8)this.nextWave();}
 _emit(type,data={}){if(this.events.length>=128)this.events.shift();this.events.push({type,...data});}
 drainEvents(){const events=this.events;this.events=[];return events;}
 _spawn(spec,extra={}){const hp=spec.type==='bulwark'?2:1;const t={id:++this._id,type:spec.type,angle:normalizeAngle(spec.angle),baseAngle:normalizeAngle(spec.angle),r:270,speed:Math.min(78,Math.max(1,spec.speed)),hp,maxHp:hp,radius:spec.type==='bulwark'?13:spec.type==='splinter'?11:9,cracked:false,age:0,...extra};this.targets.push(t);return t;}
 _step(dt){this.time+=dt;this.waveTime+=dt;this.stats.survival=this.time;const p=this.player;p.angle=normalizeAngle(p.angle+this._rotation*3.5*dt);p.invulnerable=Math.max(0,p.invulnerable-dt);p.recovery=Math.max(0,p.recovery-dt);this.slowCooldown=Math.max(0,this.slowCooldown-dt);this.slowRemaining=Math.max(0,this.slowRemaining-dt);
  while(this.pendingChildren.length&&this.targets.length<this.wave.maxTargets){const c=this.pendingChildren.shift();this._spawn(c.spec,c.extra);}
  while(this._spawnIndex<this.wave.spawns.length&&this.wave.spawns[this._spawnIndex].at<=this.waveTime+1e-8&&this.targets.length<this.wave.maxTargets)this._spawn(this.wave.spawns[this._spawnIndex++]);
  if(this.boss)this._stepBoss(dt);
  const slow=this.slowRemaining>0?.6:1;
  for(const t of this.targets){t.age+=dt;t.r-=t.speed*slow*dt;if(t.type==='drifter')t.angle=normalizeAngle((t.baseAngle??t.angle)+Math.sin(t.age*1.5)*.12);}
  if(p.attack){this._resolveAttack(p.attack);if(this.state!=='playing')return;p.attack.remaining-=dt;if(p.attack.remaining<=1e-8){if(!p.attack.successful){this.stats.misses++;this._mistake();}p.attack=null;}}
  if(this.state!=='playing')return;
  for(const e of this.echoes)e.delay-=dt;const due=this.echoes.filter(e=>e.delay<=0);this.echoes=this.echoes.filter(e=>e.delay>0);for(const e of due){this._emit('echo',{angle:e.angle,r:132});this._resolveAttack(e,true);if(this.state!=='playing')return;}
  for(const t of [...this.targets])if(t.r<=30){this.targets.splice(this.targets.indexOf(t),1);this.stats.misses++;this._mistake();if(p.invulnerable<=0){p.shields=Math.max(0,p.shields-1);p.invulnerable=.7;this.stats.damage++;this._emit('damage',{angle:t.angle,r:30,value:p.shields});if(p.shields===0){this.state='gameover';this._rotation=0;this._emit('gameover');break;}}}
  if(this.state==='playing'&&!this.boss&&this._spawnIndex===this.wave.spawns.length&&!this.targets.length&&!this.pendingChildren.length&&!p.attack&&!this.echoes.length)this._clearWave();
 }
 _mistake(){if(this.player.keeperCharges>0){this.player.keeperCharges--;this._emit('upgrade',{text:'Combo protected'});}else this.stats.combo=0;}
 _inside(a,t){return t.r<=a.reach+1e-8&&t.r>30&&angleDistance(a.angle,t.angle)<=a.arc/2+1e-8;}
 _resolveAttack(a,secondary=false){
  const primary=this.targets.filter(t=>t.hp>0&&!a.hitIds.has(t.id)&&t.bornAttack!==a.id&&this._inside(a,t));
  for(const t of primary){
   a.hitIds.add(t.id);
   const perfect=!secondary&&Math.abs(t.r-86)<=t.speed*.05+1e-8;
   this._hit(t,secondary?.5:1,perfect,a,secondary);
  }
  // Resolve the entire primary arc first. Chain adds victims rather than
  // spending its limited budget on targets the main pulse already hits.
  if(!secondary&&this.upgrades.chain){
   for(const t of primary)for(const other of [...this.targets]){
    if((a.chainCount||0)>=this.upgrades.chain)break;
    if(other.hp<=0||a.hitIds.has(other.id)||other.bornAttack===a.id)continue;
    const distance=Math.hypot(t.r*Math.cos(t.angle)-other.r*Math.cos(other.angle),t.r*Math.sin(t.angle)-other.r*Math.sin(other.angle));
    if(distance>90)continue;
    a.chainCount=(a.chainCount||0)+1;a.hitIds.add(other.id);
    this._hit(other,1,false,a,true);this._emit('chain',{angle:other.angle,r:other.r});
   }
  }
  const b=this.boss;if(b&&b.hp>0&&b.vulnerable&&b.windowHits<3&&!a.hitIds.has('boss')&&this._inside(a,b)){a.hitIds.add('boss');b.windowHits++;b.hp=Math.max(0,b.hp-(secondary?.5:1));this._reward(false,a,secondary);this._emit('hit',{angle:b.angle,r:b.r,targetType:'boss',value:b.hp});if(b.hp<=0)this._defeatBoss();}
 }
 _hit(t,damage,perfect,a,secondary){t.hp-=damage;t.cracked=t.hp<t.maxHp;this._reward(perfect,a,secondary);this._emit('hit',{angle:t.angle,r:t.r,targetType:t.type,perfect,value:damage});if(t.hp<=0){this.targets.splice(this.targets.indexOf(t),1);this._emit('destroy',{angle:t.angle,r:t.r,targetType:t.type,perfect});if(t.type==='splinter'&&!t.child){for(const sign of [-1,1]){const spec={type:'spark',angle:t.angle+sign*.14,speed:t.speed},extra={r:Math.max(154,t.r+65),radius:6,child:true,bornAttack:a.id};if(this.targets.length<this.wave.maxTargets)this._spawn(spec,extra);else this.pendingChildren.push({spec,extra});}}}}
 _reward(perfect,a,secondary){if(!secondary&&!a.successful){a.successful=true;this.stats.successfulStrikes++;}this.stats.hits++;this.stats.combo++;this.stats.bestCombo=Math.max(this.stats.bestCombo,this.stats.combo);this._waveBest=Math.max(this._waveBest,this.stats.combo);const c=this.stats.combo,m=c>=35?5:c>=20?4:c>=10?3:c>=5?2:1;this.stats.score+=(100+(perfect?100:0))*m;this.stage=Math.max(this.stage,c>=35?5:c>=22?4:c>=12?3:c>=5?2:1);if([5,10,20,35].includes(c))this._emit('combo',{value:c});if(perfect){this.stats.perfects++;this._emit('perfect',{angle:a.angle,r:86});if(this.upgrades.time&&this.slowCooldown<=0){this.slowRemaining=this.upgrades.time>=2?1.1:.8;this.slowCooldown=3;}if(this.upgrades.echo&&!a.echoScheduled){a.echoScheduled=true;this.echoes.push({id:`echo-${a.id}`,angle:a.angle,arc:a.arc,reach:a.reach,delay:.16,hitIds:new Set()});}}}
 _stepBoss(dt){const b=this.boss;b.phaseTime+=dt;const phase=b.hp<=b.maxHp/3?3:b.hp<=b.maxHp*2/3?2:1;if(phase!==b.phase){b.phase=phase;this._emit('bossPhase',{value:phase,text:phase===2?'Target Swarm':'Final Surge'});}const cycle=Math.floor(b.phaseTime/8),t=b.phaseTime%8;if(cycle!==b.cycle){b.cycle=cycle;b.windowHits=0;b.angle=normalizeAngle(cycle*1.7);b.swarm=0;}
  b.telegraph=t>=3.5&&t<5.2;b.vulnerable=t>=5.2&&t<7.1&&b.windowHits<3;b.r=b.vulnerable?104:250;
  const want=b.phase===3?(t>=1.15?2:t>=.15?1:0):b.phase===2&&t>=.15?1:0;
  while(b.swarm<want&&this.targets.length<this.wave.maxTargets){this._spawn({type:b.phase===3&&b.swarm===1?'drifter':'spark',angle:b.angle+(b.swarm===0?.8:-.8),speed:b.phase===3?56:44});b.swarm++;}
 }
 _clearWave(){const s=this.stats,w=this._waveStart;const attempts=s.attempts-w.attempts,bonus=250+this.waveNumber*50;this.lastWave={number:this.waveNumber,name:this.wave.name,score:s.score-w.score,accuracy:attempts?(s.successfulStrikes-w.successfulStrikes)/attempts:0,perfects:s.perfects-w.perfects,bestCombo:this._waveBest,bonus};s.score+=bonus;this.completedLevels=this.waveNumber;this.state='intermission';this.intermissionRemaining=.9;this.targets=[];this.pendingChildren=[];this.echoes=[];this.player.attack=null;this._emit('waveClear',{value:this.waveNumber});}
 _defeatBoss(){if(this.state!=='playing')return;const boss=this.boss;this.boss=null;this._clearWave();this.stage=5;this._emit('bossDefeat',{value:this.waveNumber,angle:boss.angle,r:boss.r});}
}
