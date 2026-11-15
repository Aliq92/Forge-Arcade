'use strict';
const TRIAL_SAVE_KEY='apogee_trials_v1';
let trialProgress=ApogeeTrials.fresh(),selectedTrial=null,trialRun=null,paused=false,trialResult=false;
try{trialProgress=ApogeeTrials.sanitize(JSON.parse(localStorage.getItem(TRIAL_SAVE_KEY)))}catch(_){}
function persistTrials(){try{localStorage.setItem(TRIAL_SAVE_KEY,JSON.stringify(trialProgress));$('trialSaveStatus').textContent='Progress saved on this device'}catch(_){$('trialSaveStatus').textContent='Storage unavailable — progress lasts this session'}}
function flightSpec(key){return selectedTrial?selectedTrial.spec[key]:save[key]}
function updateTrialsUI(){
  $('trialList').innerHTML=ApogeeTrials.tiers.map((tier,i)=>'<fieldset><legend>TIER '+(i+1)+' / '+tier.toUpperCase()+'</legend>'+ApogeeTrials.trials.filter(c=>c.tier===i+1).map(c=>{const r=trialProgress.records[c.id],open=ApogeeTrials.unlocked(c,trialProgress);return '<button class="trial-card clickable '+(selectedTrial?.id===c.id?'selected':'')+'" data-trial="'+c.id+'" '+(open?'':'disabled')+'><b>'+ (r?'✓ ':'')+c.name+'</b><span>'+c.category+' • '+(open?ApogeeTrials.goalText(c):'Clear any 3 trials in the previous tier')+'</span><small>'+ (r?'Best '+r.best.toFixed(1)+'s • Insignia earned • '+(r.mission?'★ Mission earned':'☆ Mission available'):'Reward: '+c.reward)+'</small></button>'}).join('')+'</fieldset>').join('');
  const c=selectedTrial;$('trialBrief').textContent=c?c.name+' — '+ApogeeTrials.goalText(c)+'. '+ApogeeTrials.limitText(c)+'. Optional: '+c.mission+'. Fixed loaner rocket; career upgrades and payouts stay in career flights.':'Select a trial. Clear any three in a tier to open the next. Each insignia can be equipped on your rocket; optional missions earn a gold star.';
  $('startTrialBtn').disabled=!c;$('trialCount').textContent=Object.keys(trialProgress.records).length+' / 12 INSIGNIA';
  $('insigniaSelect').innerHTML='<option value="">No flight insignia</option>'+ApogeeTrials.trials.filter(c=>trialProgress.records[c.id]).map(c=>'<option value="'+c.id+'">'+c.name+(trialProgress.records[c.id].mission?' ★':'')+'</option>').join('');$('insigniaSelect').value=trialProgress.equipped;
}
function openTrials(){if(state!==STATE.MENU&&state!==STATE.RESULTS)return;paused=false;state=STATE.MENU;setScreen('menu');$('trialsScreen').classList.remove('hidden');$('trialsScreen').scrollTop=0;updateTrialsUI();$('closeTrialsBtn').focus()}
function startTrial(){if(!selectedTrial||!ApogeeTrials.unlocked(selectedTrial,trialProgress))return;$('trialsScreen').classList.add('hidden');ensureAudio();initFlight()}
function initTrial(){
  document.activeElement?.blur();
  paused=false;trialResult=false;$('pauseOverlay').classList.add('hidden');$('pauseBtn').textContent='II';$('flightActions').classList.remove('hidden');$('trialReport').classList.add('hidden');
  trialRun=selectedTrial?ApogeeTrials.create(selectedTrial):null;
  $('trialTracker').classList.toggle('hidden',!trialRun);$('pauseTrialsBtn').classList.toggle('hidden',!trialRun);
  if(trialRun&&selectedTrial.scenario==='coast'){flight.activeStage=1;flight.alt=DEEP_SPACE_KM*100;flight.vel=6500;flight.deepSpaceAnnounced=false}
  if(trialRun){audio.tone(520,'triangle',.15,.1);toast(selectedTrial.name.toUpperCase());updateTrialTracker()}
}
function updateTrialTracker(){if(!trialRun)return;const c=selectedTrial,s=trialRun;$('trialTracker').textContent=c.name+' • '+Object.entries(c.goals).map(([k,n])=>Math.min(n,Math.floor(s[k]))+'/'+n+' '+({perfects:'PERFECT',quality:'handoffs',chain:'chain',alt:'KM',seconds:'sec',beacons:'signals',gates:'gates'}[k])).join(' · ')+' | '+s.impacts+'/'+(c.limits.impacts??'∞')+' impacts • '+ApogeeTrials.limitText(c);$('trialTracker').title=ApogeeTrials.limitText(c)}
function recordTrialSeparation(ratio){if(!trialRun)return;trialRun.perfects=flight.perfects;if(ratio<=.07)trialRun.lowFuelPerfects++;trialRun.chain=Math.max(trialRun.chain,flight.maxChain);if(ratio<.30)trialRun.quality++;if(ratio>=.58)trialRun.early++}
function updateTrial(dt){
  if(!trialRun||state!==STATE.FLIGHT)return;const c=selectedTrial,s=trialRun;s.elapsed+=dt;s.alt=Math.max(s.alt,flight.alt/100);s.impacts=flight.impacts;
  if(flight.deepSpaceActive){s.seconds+=dt;const lane=flight.x/Math.max(34,W*.38);
    // Survey signals linger for 3.5 seconds, with a visible approach ring.
    for(let i=0;i<4;i++){const b=ApogeeTrials.signal(i);if(s.seconds>=b.at&&s.seconds<=b.at+b.duration&&!s.seen.includes('b'+i)&&Math.abs(lane-b.lane)<.24){s.seen.push('b'+i);s.beacons++;audio.tone(880,'sine',.1,.08);spawnParticles(rocketScreenX(),rocketScreenY(),'#62f5db',12,3,2);toast('SIGNAL '+s.beacons+' RECOVERED')}}
    if(c.pattern!=='open')for(let i=0;i<5;i++){const g=ApogeeTrials.gate(c,i,s.seconds);if(g.warning&&!s.seen.includes('w'+i)){s.seen.push('w'+i);audio.tone(220,'sine',.12,.06)}if(g.active&&Math.abs(lane-g.center)+16/Math.max(34,W*.38)>g.gap&&!s.seen.includes('h'+i)){s.seen.push('h'+i);impactHazard({x:W/2+g.center*W*.38,y:rocketScreenY(),hit:false});s.impacts=flight.impacts}if(g.passed&&!s.seen.includes('g'+i)){s.seen.push('g'+i);if(!s.seen.includes('h'+i))s.gates++}}
  }
  updateTrialTracker();const result=ApogeeTrials.assess(c,s);if(result!=='active'){finishTrial(result==='complete');return}
  if(s.elapsed>100){s.failed='Flight window closed — retry the route';finishTrial(false)}
}
function finishTrial(success=false){
  if(!trialRun||trialRun.done)return;trialRun.done=true;paused=false;audio.engine(false);$('flightActions').classList.add('hidden');$('trialTracker').classList.add('hidden');$('pauseOverlay').classList.add('hidden');
  const c=selectedTrial,s=trialRun;trialResult=true;state=STATE.RESULTS;resultsReady=true;setScreen('results');$('trialReport').classList.remove('hidden');$('careerReport').classList.add('hidden');
  if(success){const a=ApogeeTrials.award(c,s,trialProgress);persistTrials();audio.perfect();spawnConfetti(W/2,H*.5,42);$('trialOutcome').textContent='TRIAL COMPLETE';$('trialReward').textContent=c.reward+' earned'+(ApogeeTrials.optional(c,s)?' • ★ Optional mission earned':' • Optional mission still available')+(a.first?' • Progress updated':' • Progress saved')}
  else{$('trialOutcome').textContent='TRY AGAIN';$('trialReward').textContent=s.failed||(flight.endedByExplosion?'Stage burnout — separate before fuel runs out':'Apogee reached before all objectives were met');audio.bad()}
  $('trialResultName').textContent=c.name;$('trialResultStats').textContent=s.elapsed.toFixed(1)+'s • '+s.perfects+' PERFECT • '+s.beacons+' signals • '+s.impacts+' impacts';const next=ApogeeTrials.trials[ApogeeTrials.trials.indexOf(c)+1];$('nextTrialBtn').disabled=!success||!next||!ApogeeTrials.unlocked(next,trialProgress);updateTrialsUI();$('retryTrialBtn').focus()
}
function setPaused(value){if(![STATE.FLIGHT,STATE.PAUSED].includes(state))return;paused=value;state=value?STATE.PAUSED:STATE.FLIGHT;flight.pointerSteer=false;flight.steerDir=0;audio.engine(!value&&flight.fuel>0);$('pauseOverlay').classList.toggle('hidden',!value);$('pauseBtn').textContent=value?'▶':'II';if(value)$('resumeBtn').focus();else document.activeElement?.blur()}
function restartFlight(){if(![STATE.FLIGHT,STATE.PAUSED,STATE.RESULTS].includes(state))return;ensureAudio();initFlight()}
function leaveFlight(){paused=false;audio.engine(false);trialRun=null;selectedTrial=null;state=STATE.MENU;$('pauseOverlay').classList.add('hidden');$('flightActions').classList.add('hidden');$('trialTracker').classList.add('hidden');$('careerReport').classList.remove('hidden');$('trialReport').classList.add('hidden');setScreen('menu');updateAllUI()}
function drawTrial(){
  if(trialRun&&[STATE.FLIGHT,STATE.PAUSED].includes(state)&&flight.deepSpaceActive){const c=selectedTrial,t=trialRun.seconds,rx=rocketScreenY(),edge=Math.max(34,W*.38);ctx.save();
    for(let i=0;i<4;i++){const b=ApogeeTrials.signal(i),age=t-b.at;if(age< -1||age>b.duration||trialRun.seen.includes('b'+i))continue;const x=W/2+b.lane*edge;ctx.strokeStyle=age<0?'#8793a8':'#62f5db';ctx.lineWidth=3;ctx.beginPath();ctx.arc(x,rx,22,0,Math.PI*2);ctx.stroke();ctx.font='bold 11px sans-serif';ctx.textAlign='center';ctx.fillStyle='#ffffff';ctx.fillText('SIGNAL '+(i+1),x,rx-32)}
    if(c.pattern!=='open')for(let i=0;i<5;i++){const g=ApogeeTrials.gate(c,i,t);if(!g.warning&&!g.active)continue;const left=W/2+(g.center-g.gap)*edge,right=W/2+(g.center+g.gap)*edge;ctx.fillStyle=g.warning?'#ffbd4a44':'#ff5b6e88';ctx.fillRect(0,rx-18,left,36);ctx.fillRect(right,rx-18,W-right,36);ctx.strokeStyle=g.warning?'#ffbd4a':'#ff5b6e';ctx.lineWidth=2;ctx.strokeRect(left,rx-24,right-left,48);ctx.fillStyle='#fff';ctx.font='bold 11px sans-serif';ctx.textAlign='center';ctx.fillText(g.warning?'GATE IN '+Math.ceil(2-g.age)+'s — ALIGN WITH GAP':'ANOMALY GATE — STAY IN GAP',W/2,rx-90)}ctx.restore()
  }
  if(trialProgress.equipped&&state!==STATE.EXPLODING){ctx.save();const star=trialProgress.records[trialProgress.equipped]?.mission;ctx.fillStyle='hsl('+(160+ApogeeTrials.trials.findIndex(c=>c.id===trialProgress.equipped)*29)+' 85% 70%)';ctx.translate(rocketScreenX(),rocketScreenY()-18);ctx.beginPath();ctx.moveTo(0,-5);ctx.lineTo(5,0);ctx.lineTo(0,5);ctx.lineTo(-5,0);ctx.closePath();ctx.fill();if(star){ctx.strokeStyle='#ffbd4a';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,8,0,Math.PI*2);ctx.stroke()}ctx.restore()}
}
$('trialsBtn').onclick=openTrials;$('closeTrialsBtn').onclick=()=>{$('trialsScreen').classList.add('hidden');selectedTrial=null;$('trialsBtn').focus()};
$('trialList').onclick=e=>{const b=e.target.closest('[data-trial]');if(!b||b.disabled)return;selectedTrial=ApogeeTrials.trials.find(c=>c.id===b.dataset.trial);updateTrialsUI();$('startTrialBtn').focus()};$('startTrialBtn').onclick=startTrial;
$('insigniaSelect').onchange=e=>{trialProgress.equipped=e.target.value;persistTrials()};
$('pauseTrialsBtn').onclick=()=>{leaveFlight();openTrials()};
$('pauseBtn').onclick=()=>setPaused(!paused);$('resumeBtn').onclick=()=>setPaused(false);$('retryFlightBtn').onclick=restartFlight;$('pauseRestartBtn').onclick=restartFlight;$('leaveFlightBtn').onclick=leaveFlight;
$('retryTrialBtn').onclick=restartFlight;$('trialSelectionBtn').onclick=()=>{leaveFlight();openTrials()};$('nextTrialBtn').onclick=()=>{selectedTrial=ApogeeTrials.trials[ApogeeTrials.trials.indexOf(selectedTrial)+1];startTrial()};
addEventListener('keydown',e=>{if(e.code==='Escape'||e.code==='KeyP'){e.preventDefault();if([STATE.FLIGHT,STATE.PAUSED].includes(state))setPaused(!paused)}else if(e.code==='KeyR'&&[STATE.FLIGHT,STATE.PAUSED].includes(state)){e.preventDefault();restartFlight()}});
addEventListener('blur',()=>{if(state===STATE.FLIGHT)setPaused(true)});document.addEventListener('visibilitychange',()=>{if(document.hidden&&state===STATE.FLIGHT)setPaused(true)});
