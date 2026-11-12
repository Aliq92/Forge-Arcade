export const UPGRADES=Object.freeze([
  {id:'chain',name:'CHAIN LIGHTNING',icon:'↯',description:'Each strike arcs to 1 nearby target per level, within 90 units. Maximum 2 extra targets.',maxLevel:2},
  {id:'pulse',name:'PULSE SHIELD',icon:'⬡',description:'Add 1 shield capacity and repair 1 shield. Maximum 5 shields.',maxLevel:2},
  {id:'time',name:'TIME BEND',icon:'◷',description:'Perfect hits slow approaching targets to 60% for 0.8s (level 2: 1.1s). 3s cooldown.',maxLevel:2},
  {id:'wide',name:'WIDE ARC',icon:'⌁',description:'Increase the total strike arc by 10° per level, up to 70°.',maxLevel:2},
  {id:'echo',name:'ENERGY ECHO',icon:'◎',description:'Perfect hits repeat the same strike arc after 0.16s for 0.5 damage. Echoes cannot trigger abilities.',maxLevel:1},
  {id:'keeper',name:'COMBO KEEPER',icon:'◇',description:'Add 1 combo protection charge, up to 2. Owned charges refresh at each wave start.',maxLevel:2}
].map(Object.freeze));
const maintenance=Object.freeze([
  Object.freeze({id:'repair',name:'SHIELD REPAIR',icon:'+',description:'Repair 1 shield. If shields are full, gain 250 score.',maxLevel:1}),
  Object.freeze({id:'refresh',name:'COMBO CALIBRATION',icon:'◇',description:'Gain 250 score. Owned Combo Keeper charges refill before the next wave.',maxLevel:1}),
  Object.freeze({id:'salvage',name:'ENERGY SALVAGE',icon:'✦',description:'Convert spare forge energy into 500 score.',maxLevel:1})
]);
export function freshUpgrades() {return Object.fromEntries(UPGRADES.map(u=>[u.id,0]));}
const validLevels=levels=>levels&&UPGRADES.every(u=>Number.isInteger(levels[u.id])&&levels[u.id]>=0&&levels[u.id]<=u.maxLevel);
const validPlayer=player=>player&&Number.isFinite(player.shields)&&Number.isInteger(player.shields)&&Number.isInteger(player.maxShields)&&player.maxShields>=1&&player.maxShields<=5&&player.shields>=0&&player.shields<=player.maxShields;

export function upgradeChoices(levels,rng=Math.random,player) {
  if(!validLevels(levels)) return [];
  const available=UPGRADES.filter(u=>levels[u.id]<u.maxLevel && !(u.id==='pulse'&&player?.maxShields>=5));
  if(available.length<3) available.push(...maintenance);
  for(let i=available.length-1;i>0;i--) {
    const value=rng();
    const j=Math.min(i,Math.max(0,Math.floor((Number.isFinite(value)?value:0)*(i+1))));
    [available[i],available[j]]=[available[j],available[i]];
  }
  return available.slice(0,3).map(u=>({...u}));
}

export function applyUpgrade(levels,player,id) {
  if(!validLevels(levels)||!validPlayer(player)) return {ok:false,message:'Invalid upgrade or shield state.'};
  const u=UPGRADES.find(u=>u.id===id);
  if(u) {
    if(levels[id]>=u.maxLevel) return {ok:false,message:`${u.name} is already at maximum level.`};
    if(id==='pulse'&&player.maxShields>=5) return {ok:false,message:'Shield capacity is already at maximum.'};
    levels[id]++;
    if(id==='pulse') {player.maxShields=Math.min(5,player.maxShields+1);player.shields=Math.min(player.maxShields,player.shields+1);}
    if(id==='keeper') player.keeperCharges=Math.min(levels.keeper,Math.max(0,Number.isFinite(player.keeperCharges)?player.keeperCharges:0)+1);
    return {ok:true,message:`${u.name} · level ${levels[id]}`};
  }
  if(id==='repair') {
    if(player.shields<player.maxShields) {player.shields++;return {ok:true,message:'SHIELD REPAIR · restored 1 shield'};}
    return {ok:true,message:'SHIELD REPAIR · full shields, +250 score',scoreBonus:250};
  }
  if(id==='refresh') return {ok:true,message:'COMBO CALIBRATION · +250 score',scoreBonus:250};
  if(id==='salvage') return {ok:true,message:'ENERGY SALVAGE · +500 score',scoreBonus:500};
  return {ok:false,message:'Unknown upgrade.'};
}
