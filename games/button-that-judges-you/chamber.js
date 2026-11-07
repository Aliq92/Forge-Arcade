(function(){
 'use strict';
 const $=id=>document.getElementById(id),C=JudgmentContent,{JudgmentGame,RecordStore}=JudgmentLogic;
 let storage;try{storage=localStorage;}catch{storage=null;}const store=new RecordStore(storage),loaded=store.read();
 const seed=crypto.getRandomValues(new Uint32Array(1))[0];
 let game=loaded.game||new JudgmentGame({seed,effects:!matchMedia('(prefers-reduced-motion: reduce)').matches});
 const canvas=$('room'),room=new JudgmentRoom(canvas),confetti=new ChamberEffects.Confetti(innerWidth,innerHeight),frameCosts=new Float32Array(240);
 let lastTs=performance.now(),rafId=null,frameIndex=0,down=false,toastUntil=0,lastMessage='',lastEvent='',lastCount=-1,warningShown=false;
 class ChamberAudio{
  constructor(){this.ctx=null;this.master=null;this.hum=null;this.humGain=null;}
  ensure(){if(!game.sound)return;try{if(!this.ctx){this.ctx=new(window.AudioContext||window.webkitAudioContext)();this.master=this.ctx.createGain();this.master.gain.value=.14;this.master.connect(this.ctx.destination);}if(this.ctx.state==='suspended')this.ctx.resume().catch(()=>{});}catch{this.ctx=null;}this.update();}
  update(){if(!this.ctx)return;const enabled=game.sound&&game.entered&&!game.paused&&!document.hidden;this.master.gain.setTargetAtTime(enabled?.14:0,this.ctx.currentTime,.025);if(enabled&&!this.hum){this.hum=this.ctx.createOscillator();this.hum.type='sine';this.hum.frequency.value=62;this.humGain=this.ctx.createGain();this.humGain.gain.value=.028;this.hum.connect(this.humGain);this.humGain.connect(this.master);this.hum.start();}if(!enabled&&this.hum){this.hum.stop();this.hum.disconnect();this.humGain.disconnect();this.hum=null;this.humGain=null;}}
  tone(freq,duration=.1,delay=0,volume=.16,end=null){if(!this.ctx||!game.sound||game.paused||document.hidden)return;const t=this.ctx.currentTime+delay,osc=this.ctx.createOscillator(),gain=this.ctx.createGain();osc.type='sine';osc.frequency.setValueAtTime(freq,t);if(end)osc.frequency.exponentialRampToValueAtTime(end,t+duration);gain.gain.setValueAtTime(.001,t);gain.gain.exponentialRampToValueAtTime(volume,t+.008);gain.gain.exponentialRampToValueAtTime(.001,t+duration);osc.connect(gain);gain.connect(this.master);osc.start(t);osc.stop(t+duration+.02);osc.onended=()=>{osc.disconnect();gain.disconnect();};}
  click(){this.tone(180,.065,0,.26,65);}
  celebrate(rare){this.tone(rare?493:440,.18,0,.15);this.tone(rare?622:660,.19,.07,.12);this.tone(rare?740:880,.2,.14,.08);}
 }
 const audio=new ChamberAudio();
 function showToast(text,duration=2.8){$('toast').textContent=text;$('toast').hidden=false;toastUntil=game.time+duration;}
 function persist(overwrite=false){const ok=store.save(game,overwrite);if(!ok&&!warningShown){showToast(store.warning||'The current record is protected. Reset can start a new one.',4);warningShown=true;}$('record-status').textContent=ok?'YOUR RECORD STAYS IN THIS BROWSER':'RECORD NOT SAVED · CHAMBER STILL OPEN';return ok;}
 function origin(){const r=$('the-button').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};}
 function flush(){const updates=game.drain();confetti.reduced=!game.effects;if(updates.confetti){confetti.burst(updates.confetti,origin());audio.celebrate(game.category==='rare');}if(updates.notices.length)showToast('DISCOVERED · '+updates.notices.join(' · '));}
 function renderNotes(){const p=C.legacy.placards[game.stage];$('placard-title').textContent=p.title;$('placard-medium').textContent=p.medium;$('placard-desc').textContent=p.desc;$('employee-id').textContent=game.employeeId?'LOCAL EXHIBIT RECORD · '+game.employeeId:'';$('discovery-count').textContent=game.achievements.size+' / '+C.achievements.length;
  $('discoveries').replaceChildren(...C.achievements.map((a,i)=>{const li=document.createElement('li');li.className=game.achievements.has(a.id)?'unlocked':'';li.textContent=game.achievements.has(a.id)?'✧ '+a.name:'◇ Undiscovered '+String(i+1).padStart(2,'0');return li;}));
 }
 const categoryNames={sarcastic:'UNSOLICITED OPINION',compliment:'UNEXPECTED KINDNESS',absurd:'OFFICIAL NONSENSE',mysterious:'ROOM TRANSMISSION',fourthwall:'VERY SELF-AWARE',rare:'RARE APPROVAL'};
 function sync(){if(game.count!==lastCount){$('count-num').textContent=game.count.toLocaleString();$('stage-tag').textContent=C.legacy.stages[game.stage].name;$('decoy').hidden=!game.decoy;lastCount=game.count;renderNotes();}
  if(game.message!==lastMessage){$('judgment').textContent=game.message;lastMessage=game.message;}$('category').textContent=categoryNames[game.category];
  const id=game.event?.id||'';if(id!==lastEvent){$('chamber').dataset.event=id;lastEvent=id;if(id==='lights')audio.tone(140,.08,0,.06);}
  const progress=game.event?1-game.event.remaining/game.event.duration:0,reduced=!game.effects;
  const escape=id==='escape'&&!reduced?Math.sin(progress*Math.PI)*(innerWidth<600?14:24):0;
  $('button-head').style.setProperty('--escape-x',escape+'px');$('button-head').style.setProperty('--escape-y',escape?'-5px':'0px');$('button-head').style.setProperty('--button-scale',reduced?'1':id==='shrink'?'.78':id==='grow'?'1.08':'1');
  $('chamber').style.setProperty('--press',down?'1':String(game.pressPulse));$('chamber').classList.toggle('reduced',reduced);
  $('button-label').textContent=id==='do-not-press'?'DO NOT PRESS':id==='break'?'A SMALL MINUTE':id==='golden'?'APPROVED':'PRESS';$('button-sub').textContent=id==='golden'?'AN UNLIKELY HONOUR':id==='closing'?'GALLERY HOURS ARE FLEXIBLE':id==='do-not-press'?'SERIOUSLY, PROBABLY':"IT'S RIGHT THERE";
  $('sound').textContent=game.sound?'♪':'♪̸';$('sound').setAttribute('aria-pressed',String(game.sound));$('sound').setAttribute('aria-label',game.sound?'Mute sound':'Enable sound');$('sound').title=game.sound?'Mute sound':'Enable sound';$('effects').setAttribute('aria-pressed',String(!game.effects));$('effects').setAttribute('aria-label',game.effects?'Use calm effects':'Use full effects');$('effects').title=game.effects?'Use calm effects':'Use full effects';
 }
 function modalOpen(){return $('notesDialog').open||$('resetDialog').open;}
 function activate(){if(modalOpen()||!game.entered||document.hidden)return;const result=game.press();if(!result.accepted)return;audio.ensure();audio.click();flush();sync();persist();}
 $('the-button').addEventListener('click',activate);
 $('the-button').addEventListener('pointerdown',e=>{if(!e.isPrimary||e.button!==0)return;down=true;sync();});
 function release(){if(down){down=false;sync();}}
 for(const type of ['pointerup','pointercancel','blur'])window.addEventListener(type,release);
 $('decoy').addEventListener('click',()=>{const before=game.count;activate();if(game.count>before)showToast('That was, in fact, the button.');});
 window.addEventListener('keydown',e=>{if(modalOpen()||!game.entered)return;if((e.key==='Enter'||e.code==='Space')&&(e.target===$('the-button')||e.target===document.body||e.target===$('chamber'))){e.preventDefault();if(e.repeat)return;down=true;activate();}});
 window.addEventListener('keyup',e=>{if(e.key==='Enter'||e.code==='Space')release();});
 $('enter').addEventListener('click',()=>{game.enter();$('chamber').classList.add('entered');$('startOverlay').hidden=true;document.querySelector('header').inert=false;document.querySelector('footer').inert=false;$('interaction').inert=false;lastTs=performance.now();audio.ensure();$('the-button').focus({preventScroll:true});if(loaded.warning){showToast(loaded.warning,4);warningShown=true;}sync();});
 $('sound').addEventListener('click',()=>{game.sound=!game.sound;if(game.sound)audio.ensure();audio.update();sync();persist();});
 $('effects').addEventListener('click',()=>{game.effects=!game.effects;confetti.clear();confetti.reduced=!game.effects;sync();persist();});
 function pauseForDialog(){down=false;game.paused=true;audio.update();sync();}
 function closeDialog(dialog){dialog.close();game.paused=document.hidden;lastTs=performance.now();audio.update();sync();}
 $('notes').addEventListener('click',()=>{renderNotes();pauseForDialog();$('notesDialog').showModal();});$('closeNotes').addEventListener('click',()=>closeDialog($('notesDialog')));
 $('reset').addEventListener('click',()=>{pauseForDialog();$('resetDialog').showModal();});$('cancelReset').addEventListener('click',()=>closeDialog($('resetDialog')));
 $('confirmReset').addEventListener('click',()=>{game.reset(true);confetti.clear();toastUntil=0;$('toast').hidden=true;lastCount=-1;lastEvent=null;warningShown=false;persist(true);closeDialog($('resetDialog'));sync();showToast('A clean record. The room has filed a fresh opinion.');});
 for(const id of ['notesDialog','resetDialog'])$(id).addEventListener('cancel',e=>{e.preventDefault();closeDialog($(id));});
 function resize(){room.resize(innerWidth,innerHeight);confetti.resize(innerWidth,innerHeight);sync();}
 window.addEventListener('resize',resize);
 function frame(ts){rafId=null;const start=performance.now(),dt=Math.max(0,Math.min(.1,(ts-lastTs)/1000));lastTs=ts;if(!game.paused){game.advance(dt);if(game.entered)confetti.advance(dt);}flush();sync();room.draw(game,confetti);if(!$('toast').hidden&&game.time>=toastUntil)$('toast').hidden=true;frameCosts[(frameIndex++)%240]=performance.now()-start;if(!document.hidden)rafId=requestAnimationFrame(frame);}
 document.addEventListener('visibilitychange',()=>{down=false;if(document.hidden){game.paused=true;if(rafId!==null)cancelAnimationFrame(rafId);rafId=null;}else{game.paused=modalOpen();lastTs=performance.now();if(rafId===null)rafId=requestAnimationFrame(frame);}audio.update();sync();});
 window.addEventListener('blur',()=>{down=false;sync();});
 document.querySelector('header').inert=true;document.querySelector('footer').inert=true;
 $('return-note').textContent=loaded.warning?'An unreadable record is being kept safe.':game.count?game.count.toLocaleString()+' presses on record. The room remembers.':'One button. Endless judgment.';
 resize();sync();if(loaded.warning)$('record-status').textContent='RECORD NOT SAVED · CHAMBER STILL OPEN';
 window.judgmentDebug={inspect:()=>({game,confetti,frameCosts,frameIndex,dpr:room.dpr,rafPending:rafId!==null,audioCreated:!!audio.ctx}),fire:id=>{const result=game.startEvent(id);flush();sync();renderNotes();persist();return result;},sync:()=>{flush();sync();renderNotes();}};
 rafId=requestAnimationFrame(frame);
})();
