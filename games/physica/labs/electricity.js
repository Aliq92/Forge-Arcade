// Bounded, static DC modified nodal analysis. No rendering or external dependencies.
export const LAB_ID = 'electricity';
const clone = x => JSON.parse(JSON.stringify(x));
const own = (o,k) => Object.prototype.hasOwnProperty.call(o,k);
const plain = x => x !== null && typeof x === 'object' && !Array.isArray(x) && (Object.getPrototypeOf(x) === Object.prototype || Object.getPrototypeOf(x) === null);
const finite = (v,min,max) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
const safeId = x => typeof x === 'string' && /^[A-Za-z0-9_-]{1,32}$/.test(x) && !['__proto__','prototype','constructor'].includes(x);
const keys = (o,allowed) => Object.keys(o).every(k=>allowed.includes(k));
const number = (key,label,unit,min,max,step,value) => ({key,label,unit,min,max,step,default:value});
const voltage = value => number('voltage','Source voltage','V',0,24,.1,value);
const resistance = (value,key='resistance',label='Resistance') => number(key,label,'Ω',.1,1e6,.1,value);
const closed = {key:'closed',label:'Switch closed',unit:'',type:'boolean',default:true};
export const PARAMETERS = {
  ohm:[voltage(6),resistance(100),closed],
  series:[voltage(12),resistance(200,'resistance','Top resistance'),resistance(100,'resistance2','Bottom resistance'),closed],
  parallel:[voltage(12),resistance(100),resistance(200,'resistance2','Second resistance'),closed],
  power:[voltage(9),resistance(81,'resistance','Lamp fixed resistance'),closed],
  free:[]
};
const descriptor = (id,mode,title,objective,prediction,explanation,equations) => ({id,lab:LAB_ID,mode,title,objective,prediction,explanation,equations,assumptions:['Steady DC; ideal source, wires and meters.','Lamps are fixed linear resistances; no temperature or brightness calibration.'],defaults:Object.fromEntries(PARAMETERS[mode].map(p=>[p.key,p.default])),graph:{x:'voltage',y:'current'}});
export const EXPERIMENTS = [
  descriptor('E1','ohm',"Ohm’s Law",'Measure the relationship between voltage, resistance and current.','What happens to current when you double the resistance?', 'For a fixed resistance, current grows in proportion to the measured potential difference. The ammeter is in series and the voltmeter is connected across the load.',['V = IR','I = V/R']),
  descriptor('E2','series','Series Circuits','Measure equal branch currents and voltage division.','Which resistor receives the larger voltage drop?', 'The same current passes through both resistors. Each voltage drop is proportional to its resistance; the voltmeter reads the bottom resistor.',['I = V/(R₁ + R₂)','Vout = V R₂/(R₁ + R₂)']),
  descriptor('E3','parallel','Parallel Circuits','Compare branch currents and equivalent resistance.','Which parallel branch carries more current?', 'Each resistor is connected across the same two nodes. Their currents add at the junction; the lower resistance takes the larger current.',['I = V/R₁ + V/R₂','1/Req = 1/R₁ + 1/R₂']),
  descriptor('E4','power','Electrical Power','Compare source delivery and load dissipation.','How does doubling voltage change power in a fixed resistance?', 'The fixed-resistance lamp dissipates power as I²R. Doubling its voltage quadruples power in this linear model. Delivered source power equals the total resistor dissipation.',['P = VI = V²/R = I²R'])
];

export function validateCircuit(input) {
  const errors=[];
  const fail = message => { errors.push(message); return {ok:false,errors}; };
  if(!plain(input) || !keys(input,['nodes','components','ground']))return fail('Circuit must contain only nodes, components and a reference ground.');
  if(!Array.isArray(input.nodes)||input.nodes.length<1||input.nodes.length>12)return fail('Use 1–12 circuit nodes.');
  if(!Array.isArray(input.components)||input.components.length>24)return fail('Use at most 24 components.');
  const ids=new Set();
  for(const n of input.nodes) {
    if(!plain(n)||!keys(n,['id','x','y'])||!safeId(n.id)||ids.has(n.id)||!finite(n.x,0,10)||!finite(n.y,0,6))return fail('Each node needs a unique safe ID and diagram position x 0–10, y 0–6.');
    ids.add(n.id);
  }
  if(!safeId(input.ground)||!ids.has(input.ground))return fail('Select an existing reference ground node.');
  const componentIds=new Set();
  for(const c of input.components) {
    if(!plain(c)||!keys(c,['id','type','a','b','value','closed','x','y'])||!safeId(c.id)||componentIds.has(c.id))return fail('Each component needs a unique safe ID and supported fields.');
    componentIds.add(c.id);
    if(!['source','resistor','lamp','wire','switch','ammeter','voltmeter'].includes(c.type)||!ids.has(c.a)||!ids.has(c.b))return fail('Component type or terminal node is invalid.');
    if(c.type==='source'&&!finite(c.value,0,24))return fail('DC source voltage must be finite, from 0 to 24 V.');
    if(['resistor','lamp'].includes(c.type)&&!finite(c.value,.1,1e6))return fail('Resistance must be finite, from 0.1 to 1,000,000 Ω.');
    if(c.type==='switch'&&typeof c.closed!=='boolean')return fail('Switch closed state must be boolean.');
    if(own(c,'closed')&&typeof c.closed!=='boolean')return fail('Component closed state must be boolean.');
    if(own(c,'value')&&!finite(c.value,0,1e6))return fail('Component value must be finite and nonnegative.');
    if((own(c,'x')&&!finite(c.x,0,10))||(own(c,'y')&&!finite(c.y,0,6)))return fail('Component diagram position is outside the canvas.');
  }
  return {ok:true,config:clone(input),errors};
}

function invalid(errors) { return {valid:false,errors,warnings:[...errors],nodeVoltages:{},branchCurrents:{},branchPowers:{},meters:{},kclResidual:null,kvlResidual:null,powerResidual:null}; }
const ideal = c => ['source','wire','ammeter'].includes(c.type)||(c.type==='switch'&&c.closed);
const passive = c => c.type==='resistor'||c.type==='lamp';

// Scaled partial pivoting: retain row scales through elimination. MNA has
// zero source-current diagonal entries, so positive-definite-only solvers fail.
function linearSolve(matrix,rhs) {
  const n=rhs.length,a=matrix.map((row,i)=>[...row,rhs[i]]);
  const scales=matrix.map(row=>Math.max(...row.map(Math.abs)));
  for(let k=0;k<n;k++) {
    let pivot=k;
    for(let i=k+1;i<n;i++)if((scales[i]?Math.abs(a[i][k])/scales[i]:0)>(scales[pivot]?Math.abs(a[pivot][k])/scales[pivot]:0))pivot=i;
    if(!scales[pivot]||Math.abs(a[pivot][k])/scales[pivot]<1e-14)throw Error('Singular or numerically unstable circuit; check floating nodes and ideal loops.');
    [a[k],a[pivot]]=[a[pivot],a[k]];[scales[k],scales[pivot]]=[scales[pivot],scales[k]];
    for(let i=k+1;i<n;i++){const f=a[i][k]/a[k][k];a[i][k]=0;for(let j=k+1;j<=n;j++)a[i][j]-=f*a[k][j];}
  }
  const x=Array(n).fill(0);
  for(let i=n-1;i>=0;i--){let v=a[i][n];for(let j=i+1;j<n;j++)v-=a[i][j]*x[j];x[i]=v/a[i][i];}
  if(x.some(v=>!Number.isFinite(v)||Math.abs(v)>1e10))throw Error('Circuit solution exceeded safe numerical limits.');
  return x;
}

export function solveCircuit(input) {
  const checked=validateCircuit(input);
  if(!checked.ok)return invalid(checked.errors);
  const c=checked.config, constraints=c.components.filter(ideal);
  // A forest of ideal constraints has unique individual branch currents.
  // An extra edge in this forest is either inconsistent or current-indeterminate.
  const adj=new Map(c.nodes.map(n=>[n.id,[]]));
  for(const branch of constraints) {
    const value=branch.type==='source'?branch.value:0;
    const queue=[[branch.b,0]], seen=new Set();let previous=null;
    while(queue.length){const [id,v]=queue.shift();if(seen.has(id))continue;seen.add(id);if(id===branch.a){previous=v;break;}for(const [next,delta]of adj.get(id))queue.push([next,v+delta]);}
    if(previous!==null) return invalid([Math.abs(previous-value)>1e-10?'Conflicting or shorted ideal voltage source constraints.':'Redundant ideal wire/source/ammeter loop: individual branch currents are indeterminate. Remove one ideal connection.']);
    adj.get(branch.b).push([branch.a,value]);adj.get(branch.a).push([branch.b,-value]);
  }
  const connected=new Map(c.nodes.map(n=>[n.id,[]]));
  for(const branch of c.components.filter(b=>ideal(b)||passive(b))){connected.get(branch.a).push(branch.b);connected.get(branch.b).push(branch.a);}
  const visited=new Set(),queue=[c.ground];
  while(queue.length){const n=queue.shift();if(visited.has(n))continue;visited.add(n);queue.push(...connected.get(n));}
  if(visited.size!==c.nodes.length)return invalid(['Floating network: every node must connect to the reference through resistors or closed ideal branches. Voltmeters do not provide a current path.']);
  const unknown=c.nodes.filter(n=>n.id!==c.ground), index=new Map(unknown.map((n,i)=>[n.id,i]));
  const count=unknown.length+constraints.length, matrix=Array.from({length:count},()=>Array(count).fill(0)),rhs=Array(count).fill(0);
  const add=(a,b,value)=>{if(a!==undefined&&b!==undefined)matrix[a][b]+=value;};
  for(const branch of c.components.filter(passive)) {
    const a=index.get(branch.a),b=index.get(branch.b),g=1/branch.value;
    add(a,a,g);add(b,b,g);add(a,b,-g);add(b,a,-g);
  }
  constraints.forEach((branch,k)=>{
    const a=index.get(branch.a),b=index.get(branch.b),j=unknown.length+k;
    add(a,j,1);add(j,a,1);add(b,j,-1);add(j,b,-1);rhs[j]=branch.type==='source'?branch.value:0;
  });
  let solution;
  try { solution=linearSolve(matrix,rhs); }catch(error){return invalid([error.message]);}
  const nodeVoltages=Object.fromEntries(c.nodes.map(n=>[n.id,n.id===c.ground?0:solution[index.get(n.id)]]));
  const branchCurrents={},branchPowers={},meters={},kcl=Object.fromEntries(c.nodes.map(n=>[n.id,0]));
  const idealIndex=new Map(constraints.map((b,i)=>[b.id,unknown.length+i]));
  let kvlResidual=0;
  for(const branch of c.components) {
    const v=nodeVoltages[branch.a]-nodeVoltages[branch.b];
    const i=passive(branch)?v/branch.value:ideal(branch)?solution[idealIndex.get(branch.id)]:0;
    branchCurrents[branch.id]=i;branchPowers[branch.id]=v*i;kcl[branch.a]+=i;kcl[branch.b]-=i;
    if(branch.type==='voltmeter')meters[branch.id]=v;
    if(branch.type==='ammeter')meters[branch.id]=i;
    if(ideal(branch))kvlResidual=Math.max(kvlResidual,Math.abs(v-(branch.type==='source'?branch.value:0)));
  }
  const kclResidual=Math.max(...Object.values(kcl).map(Math.abs));
  const powerResidual=Math.abs(Object.values(branchPowers).reduce((a,b)=>a+b,0));
  const currentScale=Math.max(1,...Object.values(branchCurrents).map(Math.abs));
  const powerScale=Math.max(1,...Object.values(branchPowers).map(Math.abs));
  if(kclResidual>1e-8*currentScale||kvlResidual>1e-8||powerResidual>1e-8*powerScale)return invalid(['Numerical circuit residual is too large; simplify the network.']);
  return {valid:true,errors:[],warnings:[],nodeVoltages,branchCurrents,branchPowers,meters,kclResidual,kvlResidual,powerResidual};
}

function preset(mode,p) {
  const nodes=[{id:'0',x:1,y:5},{id:'p',x:1,y:1},{id:'a',x:3,y:1},{id:'q',x:5,y:1},{id:'load',x:8,y:1}];
  const components=[{id:'source',type:'source',a:'p',b:'0',value:p.voltage},{id:'ammeter',type:'ammeter',a:'p',b:'a'},{id:'switch',type:'switch',a:'a',b:'q',closed:p.closed},{id:'wire',type:'wire',a:'q',b:'load'}];
  let meterNode='load';
  if(mode==='series') {
    nodes.push({id:'mid',x:8,y:3});
    components.push({id:'top',type:'resistor',a:'load',b:'mid',value:p.resistance},{id:'bottom',type:'resistor',a:'mid',b:'0',value:p.resistance2});meterNode='mid';
  } else {
    components.push({id:mode==='power'?'lamp':'resistor',type:mode==='power'?'lamp':'resistor',a:'load',b:'0',value:p.resistance});
    if(mode==='parallel')components.push({id:'resistor2',type:'resistor',a:'load',b:'0',value:p.resistance2});
  }
  components.push({id:'voltmeter',type:'voltmeter',a:meterNode,b:'0'});
  return {nodes,components,ground:'0'};
}

export function normalizeConfig(mode,params={}) {
  const fail=message=>({ok:false,config:null,errors:[message]});
  if(!own(PARAMETERS,mode))return fail('Unknown electricity experiment mode.');
  if(!plain(params))return fail('Electricity parameters must be a plain object.');
  if(mode==='free') {
    if(!keys(params,['circuit']))return fail('Free electricity accepts only circuit configuration.');
    const checked=validateCircuit(own(params,'circuit')?params.circuit:preset('ohm',{voltage:6,resistance:100,closed:true}));
    return checked.ok?{ok:true,config:{circuit:checked.config},errors:[]}:fail(checked.errors.join(' '));
  }
  if(!keys(params,PARAMETERS[mode].map(p=>p.key)))return fail('Unknown electricity parameter.');
  const config={};
  for(const p of PARAMETERS[mode]) {
    const value=own(params,p.key)?params[p.key]:p.default;
    if(p.type==='boolean'?typeof value!=='boolean':!finite(value,p.min,p.max))return fail(`Invalid ${p.key}: use ${p.type==='boolean'?'true or false':`${p.min}–${p.max} ${p.unit}`}.`);
    config[p.key]=value;
  }
  return {ok:true,config,errors:[]};
}

export function createModel(mode,params={}) {
  const checked=normalizeConfig(mode,params);
  if(!checked.ok)throw Error(checked.errors.join(' '));
  const config=checked.config,circuit=mode==='free'?clone(config.circuit):preset(mode,config),result=solveCircuit(circuit);
  const model={lab:LAB_ID,mode,config,time:0,dt:.05,clockRate:1,valid:result.valid,complete:false,warnings:[...result.warnings],state:{circuit,result},theory:{},
    measurementMeta:{time:{label:'Time',unit:'s'},voltage:{label:'Source voltage',unit:'V'},current:{label:'Source current delivered',unit:'A'},outputVoltage:{label:'Output potential difference',unit:'V'},resistance:{label:'Equivalent resistance',unit:'Ω'},power:{label:'Load power',unit:'W'},sourcePower:{label:'Net source power delivered',unit:'W'},kclResidual:{label:'KCL residual',unit:'A'},kvlResidual:{label:'KVL residual',unit:'V'},powerResidual:{label:'Power balance residual',unit:'W'}},
    step(dt=this.dt){if(!finite(dt,0,1))throw Error('Circuit time step must be finite and between 0 and 1 second.');if(this.valid)this.time+=dt;},
    snapshot(){return clone(this.state);},
    measure(){
      const unavailable={time:this.time,voltage:null,current:null,outputVoltage:null,resistance:null,power:null,sourcePower:null,kclResidual:null,kvlResidual:null,powerResidual:null};
      if(!this.valid)return unavailable;
      const sources=circuit.components.filter(c=>c.type==='source'),source=sources[0],voltmeter=circuit.components.find(c=>c.type==='voltmeter');
      const voltage=source?source.value:null,current=source?-result.branchCurrents[source.id]:null;
      const sourcePower=-sources.reduce((sum,c)=>sum+result.branchPowers[c.id],0);
      const power=circuit.components.filter(passive).reduce((sum,c)=>sum+result.branchPowers[c.id],0);
      return {time:this.time,voltage,current,outputVoltage:voltmeter?result.meters[voltmeter.id]:null,resistance:current!==null&&current!==0?voltage/current:null,power,sourcePower,kclResidual:result.kclResidual,kvlResidual:result.kvlResidual,powerResidual:result.powerResidual};
    }
  };
  if(mode!=='free') {
    const equivalent=mode==='series'?config.resistance+config.resistance2:mode==='parallel'?1/(1/config.resistance+1/config.resistance2):config.resistance;
    model.theory={equivalentResistance:equivalent,current:config.closed?config.voltage/equivalent:0,power:config.closed?config.voltage**2/equivalent:0};
  }
  return model;
}
