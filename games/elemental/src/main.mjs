import {$,esc,option,value,toast} from './ui.mjs';import {setupPeriodic,renderCompare} from './periodic.mjs';import {AtomExplorer} from './atom.mjs';import {CHALLENGES,checkChallenge,loadProgress,completeChallenge} from './challenges.mjs';

async function start(){
 const [elements,isotopes,refs]=await Promise.all(['elements','isotopes','molecules'].map(async name=>{const response=await fetch(`src/data/${name}.json`);if(!response.ok)throw Error('Unable to load local scientific dataset '+name);return response.json();}));
 let storage;try{storage=localStorage;}catch{storage=null;}
 let progress=loadProgress(storage),activeChallenge=Math.min(progress.completed.length+1,12),module='table',selected=elements[5],builder=null,builderPromise=null,feedback='';
 const choose=e=>{selected=e;renderInfo();};
 const periodic=setupPeriodic(elements,e=>{choose(e);atom.select(e.z);});
 const atom=new AtomExplorer(elements,isotopes,choose);
 function renderInfo(){
  const e=selected;
  $('#science-info').innerHTML=`<div class="element-symbol">${e.symbol}</div><h2 class="element-name">${esc(e.name)}</h2><span class="badge">${esc(e.classification)}</span><dl><dt>ATOMIC NUMBER</dt><dd>${e.z} protons define this element</dd><dt>${e.weightKind==='mass-number'?'REPRESENTATIVE ISOTOPE MASS NUMBER':'STANDARD ATOMIC WEIGHT'}</dt><dd>${esc(e.weight)}${e.weightKind==='mass-number'?' · not a standard atomic weight':''}</dd><dt>PERIOD / GROUP</dt><dd>${e.period} / ${e.group??'Not assigned for detached f-block'}</dd><dt>ELECTRON CONFIGURATION · ${e.configurationStatus==='prediction'?'PREDICTED':'REFERENCE'}</dt><dd class="config">${esc(e.configuration)}</dd><dt>REPORTED OXIDATION STATES</dt><dd>${value(e.oxidationStates)}</dd><dt>ELECTRONEGATIVITY · PAULING</dt><dd>${value(e.electronegativity)}</dd><dt>VAN DER WAALS RADIUS</dt><dd>${value(e.radius,'pm')}</dd><dt>FIRST IONIZATION ENERGY</dt><dd>${value(e.ionization,'eV')}</dd><dt>DENSITY</dt><dd>${value(e.density,'g/cm³')}</dd><dt>MELTING / BOILING</dt><dd>${value(e.melting,'K')} / ${value(e.boiling,'K')}</dd></dl><p class="micro">${esc(e.propertyNote)} Oxidation states in the compilation are not proof that every isolated ion is stable.</p><button id="open-atom" class="wide primary">Explore this atom →</button><label class="micro">COMPARE WITH<select id="compare-element">${elements.map(b=>option(b.z,b.symbol+' · '+b.name,b.z===8)).join('')}</select></label><button id="compare" class="wide">Compare elements</button>`;
  $('#open-atom').onclick=()=>{atom.select(selected.z);show('atom');};$('#compare').onclick=()=>{renderCompare(selected,elements[+$('#compare-element').value-1]);show('table');$('#compare-panel').scrollIntoView({behavior:'smooth',block:'nearest'});};
 }
 function renderChallenges(){
  $('#progress-count').textContent=progress.completed.length+' / 12 discoveries';
  $('#challenge-grid').innerHTML=`<div class="challenge-list">${CHALLENGES.map(c=>`<button class="discovery" data-discovery="${c.id}" ${c.id>progress.completed.length+1?'disabled':''}><b>${progress.completed.includes(c.id)?'✓':String(c.id).padStart(2,'0')}</b><span>${esc(c.title)}<small>${progress.completed.includes(c.id)?'Completed · replay available':c.id===progress.completed.length+1?'Ready to discover':'Complete the earlier discovery to unlock'}</small></span></button>`).join('')}</div>`;
  for(const b of document.querySelectorAll('[data-discovery]'))b.onclick=()=>launch(+b.dataset.discovery);
  renderChallengeCard();
 }
 function renderChallengeCard(){
  const c=CHALLENGES[activeChallenge-1];let input='';
  if([1,5].includes(c.id))input=`<label>YOUR IDENTIFICATION<select id="challenge-answer">${option('','Choose an element…')+elements.map(e=>option(e.symbol,e.name+' · '+e.symbol)).join('')}</select></label>`;
  if(c.id===3)input=`<label>FIRST HYDROGEN ISOTOPE<select id="isotope-one">${[1,2,3].map(a=>option(a,'H-'+a+(a===3?' · radioactive':''))).join('')}</select></label><label>SECOND HYDROGEN ISOTOPE<select id="isotope-two">${[1,2,3].map(a=>option(a,'H-'+a+(a===3?' · radioactive':''))).join('')}</select></label>`;
  if(c.id===11)input=`<label>SHARED ELECTRON PAIRS<select id="challenge-answer">${option('','Choose an explanation…')+option('three-two','N₂: 3 pairs; O₂ Lewis model: 2 pairs')+option('two-three','N₂: 2 pairs; O₂: 3 pairs')+option('same','Both bonds share one pair')}</select></label>`;
  if(c.id===12)input=`<label>YOUR IDENTIFICATION<select id="challenge-answer">${option('','Choose a molecule…')+refs.map(m=>option(m.id,m.name+' · '+m.formula)).join('')}</select></label>`;
  $('#challenge-card').innerHTML=`<span class="eyebrow">DISCOVERY ${String(c.id).padStart(2,'0')} / 12</span><h3>${esc(c.title)}</h3><p>${esc(c.prompt)}</p>${input}<button id="check-challenge" class="wide primary">Check my understanding</button><button id="challenge-hint" class="wide">Show a hint</button><p id="challenge-feedback" class="feedback" aria-live="polite">${esc(feedback)}</p>${progress.completed.includes(c.id)?`<button id="next-challenge" class="wide">${c.id<12?'Next discovery →':'All twelve completed · Replay'}</button>`:''}<button id="challenge-workspace" class="wide">${c.id>=6&&c.id<=10?'Open molecule workspace':'Open learning workspace'}</button>`;
  $('#check-challenge').onclick=()=>{
   const state={answer:$('#challenge-answer')?.value,atom:atom.state(),graph:builder?.workspace.graph,isotopes:[{z:1,a:+($('#isotope-one')?.value||1),q:0},{z:1,a:+($('#isotope-two')?.value||1),q:0}]};
   const result=checkChallenge(c.id,state,refs);feedback=result.message;
   if(result.ok){progress=completeChallenge(progress,c.id,storage);toast('Discovery '+c.id+' · '+c.title);renderChallenges();}else $('#challenge-feedback').textContent=feedback;
  };
  $('#challenge-hint').onclick=()=>$('#challenge-feedback').textContent=c.hint;
  $('#challenge-workspace').onclick=()=>show(c.id>=6&&c.id<=10?'builder':[2,4].includes(c.id)?'atom':'table');
  if($('#next-challenge'))$('#next-challenge').onclick=()=>launch(c.id<12?c.id+1:1);
 }
 async function show(name){
  module=name;for(const section of document.querySelectorAll('main>section'))section.hidden=section.id!=='module-'+name;
  for(const button of document.querySelectorAll('[data-module]')){if(button.dataset.module===name)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');}
  builder?.view.setActive(name==='builder');
  if(name==='builder'){
   if(!builderPromise)builderPromise=import('./builder.mjs').then(({Builder})=>{builder=new Builder(refs,()=>{});return builder;});
   await builderPromise;builder.view.setActive(module==='builder');
  }
 }
 async function launch(id){
  if(id>progress.completed.length+1)return;activeChallenge=id;feedback='';renderChallengeCard();
  if(id>=6&&id<=10){await show('builder');builder.workspace.reset();builder.selection=[];builder.render();}
  else show([2,4].includes(id)?'atom':id===3?'atom':'table');
  if(innerWidth<850)$('#challenge-card').scrollIntoView({behavior:'smooth',block:'start'});
 }
 for(const button of document.querySelectorAll('[data-module]'))button.onclick=async()=>{await show(button.dataset.module);$('#workspace').scrollIntoView({block:'start'});};
 if(innerWidth<850)$('#element-details').open=false;
 document.addEventListener('visibilitychange',()=>builder?.view.setActive(!document.hidden&&module==='builder'));
 window.addEventListener('pagehide',event=>{if(event.persisted)builder?.view.setActive(false);else builder?.view.destroy();});
 window.addEventListener('pageshow',event=>{if(event.persisted)builder?.view.setActive(module==='builder');});
 renderInfo();renderChallenges();show('table');
 window.elementalDebug={elements,isotopes,refs,atom,get builder(){return builder;},get progress(){return progress;},get module(){return module;}};
}
start().catch(error=>{$('#app-error').hidden=false;$('#app-error').textContent='The local lab could not load. Serve this folder over HTTP and reload. '+error.message;});
