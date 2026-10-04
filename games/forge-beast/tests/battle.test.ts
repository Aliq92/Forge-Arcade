import test from 'node:test';
import assert from 'node:assert/strict';
import { Engine } from '../src/systems/Engine';
import { createCreature } from '../src/creatures/Creature';
import { createCombat } from '../src/battle/BattleState';
import { startBattle, resolveTurn, finishBattle, escapeChance, acknowledgeBattle } from '../src/battle/BattleSystem';
import { battleBeatDuration, battleFrame } from '../src/battle/BattlePresentation';
import { createEncounter, declineEncounter } from '../src/battle/EncounterSystem';
import { playerCombatant } from '../src/battle/Combatant';
import { resolveDamage } from '../src/battle/DamageResolver';
import { chooseEnemyAction } from '../src/battle/BattleAI';
import { battleReward } from '../src/battle/RewardSystem';
import { BattleNavigation } from '../src/components/BattleNavigation';
import { BATTLE } from '../src/data/battleBalance';
import { SKILLS } from '../src/data/skills';
import { OPPONENT_IDS, type OpponentId } from '../src/data/opponents';
import { PERSONALITY_IDS, type PersonalityId } from '../src/data/personalities';
import { Persistence, validState, migrateSave } from '../src/systems/Persistence';
import { newEggState } from '../src/systems/ResetFlow';
function baby(personality:PersonalityId='calm') { const e=new Engine(null,()=>.99);e.debugHatch();e.state.personality=personality;return e; }
function battle(id:OpponentId='flinthop',personality:PersonalityId='calm') { const e=baby(personality);e.debugBattle(id);ready(e);return e; }
function ready(e:Engine) { const active=e.state.combat.active!;e.advance(battleBeatDuration(active)+.1); }
function random(seed:number) { let value=seed;return ()=>{value=(Math.imul(value,1664525)+1013904223)>>>0;return value/4294967296;}; }
test('battle initialization derives two bounded combatants and records the encountered species once',()=>{
 const e=battle(),s=e.state,a=s.combat.active!;assert.equal(a.status,'ongoing');assert.equal(a.turn,0);assert.equal(a.player.hp,a.player.maxHP);assert.equal(a.enemy.hp,a.enemy.maxHP);
 assert.equal(s.combat.statistics.started,1);assert.equal(s.combat.discoveries.flinthop!.encountered,1);assert.equal(s.combat.encounter,null);assert.equal(validState(s),true);
});
test('egg, sleeping, depleted conditions, missing encounter and an existing battle prevent invalid entry',()=>{
 assert.equal(startBattle(createCreature()).success,false);
 for(const kind of ['sleep','health','energy','hunger','missing']){const e=baby();if(kind!=='missing')createEncounter(e.state,'flinthop');
 if(kind==='sleep')e.state.sleeping=true;if(kind==='health')e.state.stats.health=10;if(kind==='energy')e.state.stats.energy=5;if(kind==='hunger')e.state.stats.hunger=5;
 assert.equal(startBattle(e.state).success,false);assert.equal(e.state.combat.active,null);}
 const e=battle();const before=structuredClone(e.state);assert.equal(startBattle(e.state).success,false);assert.deepEqual(e.state,before);
});
test('attack uses no stamina, resolves independent enemy action and cannot resolve twice during feedback',()=>{
 const e=battle(),a=e.state.combat.active!,stamina=a.player.stamina,hp=a.enemy.hp;
 assert.equal(resolveTurn(e.state,'attack',()=>.5).success,true);assert.ok(a.enemy.hp<hp);assert.equal(a.player.stamina,stamina);assert.equal(a.turn,1);
 assert.ok(a.beats.some(b=>b.actor==='enemy'));const snapshot=structuredClone(e.state);
 assert.equal(resolveTurn(e.state,'attack',()=>.5).success,false);assert.deepEqual(e.state,snapshot);assert.equal(validState(e.state),true);
});
test('guard softens incoming damage in either speed order and recovers bounded stamina',()=>{
 const attack=battle('gloamfin'),guard=battle('gloamfin');guard.state.combat.active!.player.stamina=2;
 resolveTurn(attack.state,'attack',()=>.4);resolveTurn(guard.state,'guard',()=>.4);
 const a=attack.state.combat.active!,g=guard.state.combat.active!;assert.ok(g.player.hp>a.player.hp);assert.equal(g.player.stamina,2+BATTLE.guardRecovery);
 assert.ok(g.beats.some(b=>b.animation==='guard'));assert.ok(g.beats.some(b=>b.text.includes('Guard softened')));
});
test('every evolved skill is distinct, costs stamina and emits its named feedback',()=>{
 const names=new Set<string>();
 for(const species of ['cragox','zephlet','runewisp','bramblejaw'] as const){const e=baby();e.debugEvolve(species);e.debugBattle('tinspindle');ready(e);const a=e.state.combat.active!,before=a.player.stamina;
 assert.equal(resolveTurn(e.state,'skill',()=>.5).success,true);assert.equal(a.player.stamina,before-SKILLS[species].cost);
 assert.ok(a.beats.some(b=>b.text.includes(SKILLS[species].name)));names.add(SKILLS[species].name);assert.equal(validState(e.state),true);}
 assert.equal(names.size,4);
});
test('generic baby skill works; unavailable stamina rejects without losing a turn; fast pressure cannot invalidate an accepted skill',()=>{
 const e=battle('gloamfin'),a=e.state.combat.active!;a.player.stamina=SKILLS.pipkin.cost;
 assert.doesNotThrow(()=>resolveTurn(e.state,'skill',()=>.99));assert.equal(a.turn,1);assert.ok(a.beats.some(b=>b.text.includes('Spark Tap')));
 ready(e);a.player.stamina=0;const before=structuredClone(e.state);assert.equal(resolveTurn(e.state,'skill').success,false);assert.deepEqual(e.state,before);
});
test('damage is centralized: stronger attack, defense reduction, guard, controlled criticals and per-hit ceiling',()=>{
 const a=battle().state.combat.active!,roll=()=>.5;
 const plain=resolveDamage({...a.player},{...a.enemy},roll,{critical:false}).damage;
 const stronger=resolveDamage({...a.player,attack:a.player.attack+2},{...a.enemy},roll,{critical:false}).damage;
 const armored=resolveDamage({...a.player},{...a.enemy,defense:a.enemy.defense+3},roll,{critical:false}).damage;
 const guarded=resolveDamage({...a.player},{...a.enemy},roll,{critical:false,guard:BATTLE.guardReduction}).damage;
 const critical=resolveDamage({...a.player},{...a.enemy},roll,{critical:true});
 assert.ok(stronger>=plain);assert.ok(armored<plain);assert.ok(guarded<plain);assert.ok(critical.damage>=plain);assert.equal(critical.critical,true);
 const ceiling=resolveDamage({...a.player,attack:100},{...a.enemy},roll,{power:10,critical:true});assert.ok(ceiling.damage<=a.enemy.maxHP*BATTLE.maxHitFraction);assert.ok(ceiling.damage<a.enemy.maxHP);
});
test('dodge and temporary shielding are consumed by one incoming strike',()=>{
 const a=battle().state.combat.active!;
 const dodge={...a.enemy,dodgeBoost:.5};assert.equal(resolveDamage(a.player,dodge,()=>.1).dodged,true);assert.equal(dodge.dodgeBoost,0);
 const shield={...a.enemy,shield:.3};const hit=resolveDamage(a.player,shield,()=>.5,{critical:false});assert.equal(shield.shield,0);
 assert.ok(hit.damage<resolveDamage(a.player,{...a.enemy},()=>.5,{critical:false}).damage);
});
test('AI independently follows behavior, low health and stamina availability',()=>{
 const counts=(id:OpponentId,hp=1,stamina=20)=>{const a=battle(id).state.combat.active!;a.enemy.hp=a.enemy.maxHP*hp;a.enemy.stamina=stamina;const count={attack:0,guard:0,skill:0};for(let i=0;i<100;i++)count[chooseEnemyAction(a,()=>i/100)]++;return count;};
 assert.ok(counts('flinthop').attack>counts('flinthop').guard);assert.ok(counts('tinspindle',.2).guard>counts('tinspindle').guard);
 assert.ok(counts('gloamfin').skill>0);assert.ok(counts('thornmote').guard>0);assert.equal(counts('thornmote',1,0).skill,0);
});
test('care condition and training influence HP, stamina, attack and defense without extreme penalties',()=>{
 const good=baby().state;good.stats.health=100;good.stats.energy=100;good.stats.hunger=80;good.stats.mood=95;
 const poor=structuredClone(good);poor.stats.health=25;poor.stats.energy=15;poor.stats.hunger=10;poor.stats.mood=20;
 const well=playerCombatant(good)!,worn=playerCombatant(poor)!;assert.ok(well.maxHP>worn.maxHP);assert.ok(well.maxStamina>worn.maxStamina);assert.ok(well.attack>worn.attack);assert.ok(well.defense>worn.defense);
 assert.ok(worn.maxHP>well.maxHP*.7);good.stats.training=60;good.development.trainingSessions=5;assert.ok(playerCombatant(good)!.attack>well.attack);
});
test('Bold attacks harder, Calm guards better, Playful moves faster and mood matters more',()=>{
 const calm=baby('calm').state,bold=baby('bold').state,play=baby('playful').state;
 assert.ok(playerCombatant(bold)!.attack>playerCombatant(calm)!.attack);assert.ok(playerCombatant(play)!.speed>playerCombatant(calm)!.speed);
 const c=battle('flinthop','calm'),b=battle('flinthop','bold');resolveTurn(c.state,'guard',()=>.5);resolveTurn(b.state,'guard',()=>.5);
 assert.ok(c.state.combat.active!.player.hp>=b.state.combat.active!.player.hp);
 const moodEffect=(s:typeof calm)=>{s.stats.mood=100;const high=playerCombatant(s)!.attack;s.stats.mood=0;return high/playerCombatant(s)!.attack;};assert.ok(moodEffect(play)>moodEffect(calm));
});
test('Curious may gain a skill spark; Stubborn resists enemy stamina pressure',()=>{
 const curious=battle('flinthop','curious'),calm=battle('flinthop','calm');
 // AI attack draw, then skill spark, skill range, followed by noncritical hit draws.
 const rolls=()=>{let i=0;return ()=>[.4,.1,.5,.5,.5,.5,.5,.5,.5][i++]??.5;};
 resolveTurn(curious.state,'skill',rolls());resolveTurn(calm.state,'skill',rolls());
 assert.ok(curious.state.combat.active!.beats.some(b=>b.text.includes('curious spark')));assert.ok(curious.state.combat.active!.player.stamina>calm.state.combat.active!.player.stamina);
 const stubborn=battle('gloamfin','stubborn'),normal=battle('gloamfin','calm');resolveTurn(stubborn.state,'attack',()=>.99);resolveTurn(normal.state,'attack',()=>.99);
 assert.ok(stubborn.state.combat.active!.player.stamina>normal.state.combat.active!.player.stamina);
});
test('speed determines initiative; a lethal first strike prevents a defeated opponent responding',()=>{
 const e=battle('gloamfin');resolveTurn(e.state,'attack',()=>.4);assert.equal(e.state.combat.active!.beats[0].actor,'enemy');
 const fast=battle('flinthop');fast.state.combat.active!.enemy.hp=1;resolveTurn(fast.state,'attack',()=>.4);
 assert.equal(fast.state.combat.active!.status,'victory');assert.equal(fast.state.combat.active!.beats.some(b=>b.actor==='enemy'&&b.animation==='attack'),false);
});
test('victory awards bounded care gains, inventory and discovery statistics exactly once',()=>{
 const e=battle(),s=e.state;const training=s.stats.training;assert.equal(finishBattle(s,'victory',()=>0),true);
 assert.equal(s.stats.training,training+BATTLE.victory.training);assert.equal(s.combat.statistics.wins,1);assert.equal(s.combat.discoveries.flinthop!.defeated,1);assert.equal(s.exploration.inventory.snack,1);
 const snapshot=structuredClone(s);assert.equal(finishBattle(s,'victory',()=>0),false);assert.deepEqual(s,snapshot);assert.equal(validState(s),true);
 acknowledgeBattle(s);assert.equal(s.combat.active,null);assert.equal(s.combat.result,null);assert.equal(s.combat.history.length,1);
});
test('defeat is nonfatal and escape has gentle consequences, both persist a summary',()=>{
 for(const outcome of ['defeat','escape'] as const){const e=battle(),s=e.state,species=s.species,health=s.stats.health;finishBattle(s,outcome);
 assert.equal(s.species,species);assert.equal(s.stage,'baby');assert.equal(s.combat.history.at(-1)!.outcome,outcome);assert.equal(s.combat.result!.item,null);
 assert.equal(s.stats.health,outcome==='defeat'?health+BATTLE.defeat.health:health);assert.equal(validState(s),true);}
});
test('Run succeeds or fails independently; failed attempts grant the enemy a turn and improve retry odds',()=>{
 const e=battle(),a=e.state.combat.active!,before=escapeChance(a);resolveTurn(e.state,'run',()=>.99,{escape:false});
 assert.equal(a.status,'ongoing');assert.equal(a.failedRuns,1);assert.ok(a.beats.some(b=>b.actor==='enemy'));assert.ok(escapeChance(a)>before);
 ready(e);resolveTurn(e.state,'run',()=>.99,{escape:true});assert.equal(a.status,'escape');assert.equal(e.state.combat.statistics.escapes,1);
});
test('reward tables respect chance, rarity, item variety and full stacks',()=>{
 const e=battle(),a=e.state.combat.active!;assert.equal(battleReward(a,()=>.99),null);assert.equal(battleReward(a,()=>0),'snack');
 a.rare=true;let i=0;assert.equal(battleReward(a,()=>[.1,.99][i++]),'strange-fragment');
 e.state.exploration.inventory['strange-fragment']=99;i=0;finishBattle(e.state,'victory',()=>[.1,.99][i++]);
 assert.equal(e.state.combat.result!.stored,false);assert.match(e.state.combat.result!.message,/stack full/);assert.equal(e.state.exploration.inventory['strange-fragment'],99);
});
test('expedition outcomes create wild, rare, optional and hostile encounters with Battle/Run choices',()=>{
 for(const outcome of ['wild-encounter','rare-encounter','optional-battle','hostile-encounter'] as const){const e=baby();e.explore('dark-grove');e.debugCompleteExpedition(outcome);
 assert.ok(e.state.combat.encounter);assert.equal(e.state.combat.encounter!.rare,outcome==='rare-encounter');assert.equal(e.state.combat.encounter!.hostile,outcome==='hostile-encounter');
 assert.equal(validState(e.state),true);const inventory={...e.state.exploration.inventory};assert.equal(declineEncounter(e.state),true);assert.deepEqual(e.state.exploration.inventory,inventory);assert.equal(e.state.combat.statistics.declined,1);}
});
test('battle waiting freezes needs and prevents remote care, item use and expeditions',()=>{
 const e=battle(),before={...e.state.stats};e.advance(90);assert.deepEqual(e.state.stats,before);
 assert.equal(e.action('sleep').success,false);assert.equal(e.explore('greenfield').success,false);assert.equal(e.useItem('snack').success,false);
});
test('active turns reload as stable HP/stamina without rerunning effects, results cannot award rewards twice',()=>{
 const map=new Map<string,string>(),p=new Persistence({getItem:k=>map.get(k)??null,setItem:(k,v)=>{map.set(k,v);},removeItem:k=>{map.delete(k);}},'fight');
 const e=battle();resolveTurn(e.state,'skill',()=>.5);p.save(e.state);const a=structuredClone(e.state.combat.active!);
 const loaded=p.load()!;assert.deepEqual(loaded.combat.active!.player,a.player);assert.deepEqual(loaded.combat.active!.enemy,a.enemy);assert.equal(loaded.combat.active!.turn,1);assert.deepEqual(loaded.combat.active!.beats,[]);
 finishBattle(loaded,'victory',()=>0);p.save(loaded);const returned=p.load()!;const inv={...returned.exploration.inventory};assert.equal(finishBattle(returned,'victory',()=>0),false);assert.deepEqual(returned.exploration.inventory,inv);assert.equal(returned.combat.statistics.wins,1);
});
test('old V0.4 saves migrate combat fields only, and malformed combat state is rejected',()=>{
 const old:any=structuredClone(baby().state);delete old.combat;assert.deepEqual(migrateSave(old)!.combat,createCombat());
 assert.deepEqual(migrateSave(old)!.exploration,old.exploration);
 const a=battle().state;for(const mutate of [(s:typeof a)=>{s.combat.active!.player.hp=-1;},(s:typeof a)=>{s.combat.active!.enemy.stamina=1000;},(s:typeof a)=>{s.combat.statistics.wins=2;},(s:typeof a)=>{(s.combat.active as any).opponent='copyrighted-mon';}]){const copy=structuredClone(a);mutate(copy);assert.equal(migrateSave(copy),null);}
});
test('A/B/C navigates encounter, four actions and deliberate escape, locking input during animations',()=>{
 const e=baby(),nav=new BattleNavigation();createEncounter(e.state,'flinthop');nav.press(e.state,'select');assert.equal(nav.press(e.state,'confirm').retreat,true);
 nav.press(e.state,'select');assert.equal(nav.press(e.state,'confirm').enter,true);e.enterBattle();assert.deepEqual(nav.press(e.state,'confirm'),{});ready(e);
 assert.equal(nav.press(e.state,'confirm').action,'attack');nav.press(e.state,'select');assert.equal(nav.press(e.state,'confirm').action,'guard');nav.press(e.state,'select');assert.equal(nav.press(e.state,'confirm').action,'skill');nav.press(e.state,'back');assert.equal(nav.press(e.state,'confirm').action,'run');
 finishBattle(e.state,'escape');assert.equal(nav.press(e.state,'confirm').acknowledge,false);ready(e);assert.equal(nav.press(e.state,'confirm').acknowledge,true);
});
test('battle animation snapshots progress without changing resolved combat state',()=>{
 const e=battle();resolveTurn(e.state,'attack',()=>.4);const a=e.state.combat.active!,snapshot=structuredClone(a);let offset=0;
 for(const b of a.beats){assert.equal(battleFrame(a,a.beatStartedAge+offset+.001)!.beat.animation,b.animation);offset+=BATTLE.beatSeconds[b.animation];}
 assert.equal(battleFrame(a,a.beatStartedAge+offset+.01),null);assert.deepEqual(a,snapshot);
});
test('reset clears combat, discoveries and summaries while preserving player preferences',()=>{
 const e=battle();finishBattle(e.state,'victory',()=>0);e.state.muted=true;
 const fresh=newEggState(e.state,{keepSettings:true});assert.deepEqual(fresh.combat,createCombat());assert.equal(fresh.muted,true);
});
test('seeded normal encounters stay short and winnable across species and opponents without one-hit kills',()=>{
 const turns:number[]=[];let wins=0,total=0;
 for(const species of ['pipkin','cragox','zephlet','runewisp','bramblejaw'] as const)for(const id of OPPONENT_IDS)for(let seed=1;seed<=30;seed++){
  const e=baby(PERSONALITY_IDS[seed%5]);if(species!=='pipkin')e.debugEvolve(species);
  e.state.stats.health=90;e.state.stats.energy=85;e.state.stats.hunger=85;e.state.stats.mood=85;e.state.stats.training=20;
  e.debugBattle(id);ready(e);const rng=random(seed);const a=e.state.combat.active!;
  while(a.status==='ongoing'){resolveTurn(e.state,'attack',rng);ready(e);assert.ok(a.turn<=BATTLE.maxTurns);}
  turns.push(a.turn);if(a.status==='victory')wins++;total++;assert.ok(a.turn>=3);
 }
 const average=turns.reduce((n,v)=>n+v,0)/turns.length;
 assert.ok(average>=3&&average<=8,`average ${average}`);assert.ok(wins/total>.6,`win rate ${wins/total}`);
});
