const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../src/data'),sources=path.join(root,'sources');
const read=f=>fs.readFileSync(path.join(sources,f),'utf8');
const clean=s=>s.replace(/<[^>]*>/g,'').replace(/&nbsp;|&#160;/g,' ').replace(/&minus;/g,'-').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
const rows=html=>[...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(r=>[...r[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(c=>clean(c[1])));
const weights=new Map(rows(read('ciaaw-weights.html')).filter(r=>/^\d+$/.test(r[0])&&r.length>=4&&/^[\d\[]/.test(r[3])).map(r=>[+r[0],r[3]]));
const radioactive=new Map(rows(read('ciaaw-radioactive.html')).filter(r=>/^\d+$/.test(r[0])&&r.length>=4).map(r=>[+r[0],+r[3]]));
const raw=JSON.parse(fs.readFileSync(path.join(root,'pubchem-periodic-table.json'),'utf8'));
const cols=raw.Table.Columns.Column;
const periods=[2,10,18,36,54,86,118];
const groups=[[1,18],[1,2,13,14,15,16,17,18],[1,2,13,14,15,16,17,18],Array.from({length:18},(_,i)=>i+1),Array.from({length:18},(_,i)=>i+1)];
const elements=raw.Table.Row.map(row=>{
 const d=Object.fromEntries(cols.map((k,i)=>[k,row.Cell[i]])),z=+d.AtomicNumber,period=periods.findIndex(n=>z<=n)+1,start=period===1?1:periods[period-2]+1,offset=z-start;
 let group=period<=5?groups[period-1][offset]:offset<2?offset+1:offset<=16?null:offset-13;
 // Detached f-block layout is a convention; group 3 membership remains debated.
 const f=period>=6&&z>=start+2&&z<=start+16;
 const numeric=k=>d[k]&&Number.isFinite(+d[k])?+d[k]:null;
 let weight=weights.get(z),weightKind='standard';if(!weight){if(!radioactive.has(z))throw Error('Missing CIAAW mass '+z);weight='['+radioactive.get(z)+']';weightKind='mass-number';}
 // PubChem snapshot retains the older 6d1 assignment for Lr. NIST Elemental Data Index gives 7p1.
 if(z===103)d.ElectronConfiguration='[Rn]5f14 7s2 7p1';
 if(/calculated/i.test(d.ElectronConfiguration))d.ElectronConfiguration=d.ElectronConfiguration.replace(/calculated/ig,'predicted (calculated)');
 return {z,symbol:d.Symbol,name:d.Name,weight,weightKind,classification:d.GroupBlock,period,group,column:f?z-(period===6?57:89)+3:group,row:f?period+2:period,configuration:d.ElectronConfiguration,configurationStatus:z>=104||/predicted/i.test(d.ElectronConfiguration)?'prediction':'reference',oxidationStates:d.OxidationStates||null,electronegativity:numeric('Electronegativity'),radius:numeric('AtomicRadius'),ionization:numeric('IonizationEnergy'),density:numeric('Density'),melting:numeric('MeltingPoint'),boiling:numeric('BoilingPoint'),propertyNote:z>103?'Heavy-element properties may be predicted; not experimentally established in this snapshot.':'PubChem compiled values; source-dependent conditions and uncertainties are not supplied by the summary endpoint.',source:'PubChem snapshot + CIAAW 2024 weights'};
});
if(elements.length!==118||weights.size<80)throw Error('Incomplete source parsing');
fs.writeFileSync(path.join(root,'elements.json'),JSON.stringify(elements,null,2));
const definitions={H2:['Hydrogen','linear',[[0,1,1]],{}],O2:['Oxygen','linear',[[0,1,2]],{O:2}],N2:['Nitrogen','linear',[[0,1,3]],{N:1}],H2O:['Water','bent',[[0,1,1],[0,2,1]],{O:2}],CO2:['Carbon dioxide','linear',null,{O:2}],NH3:['Ammonia','trigonal pyramidal',null,{N:1}],CH4:['Methane','tetrahedral',null,{}],C2H4:['Ethene','planar around each carbon',null,{}],C2H2:['Ethyne','linear',null,{}]};
const molecules=Object.entries(definitions).map(([id,[name,geometry,bonds,lp]])=>{
 const html=read('molecule-'+id+'.html'),section=html.slice(html.search(/>Cartesians/i));const table=section.match(/<table\b[\s\S]*?<\/table>/i)?.[0];
 const coordinates=rows(table||'').filter(r=>/^[A-Z][a-z]?\d+$/.test(r[0])&&r.length===4).map((r,i)=>({id:'a'+i,symbol:r[0].replace(/\d/g,''),lonePairs:lp[r[0].replace(/\d/g,'')]||0,unpaired:0,position:r.slice(1).map(Number)}));
 if(coordinates.length<2||coordinates.some(a=>a.position.some(v=>!Number.isFinite(v))))throw Error('No geometry '+id);
 if(!bonds){
  const connectivity=html.slice(html.search(/<h[23][^>]*>\s*Connectivity/i));
  // Curated connectivity is assigned by element roles, checked against the NIST source snapshot.
  const heavy=coordinates.map((a,i)=>a.symbol!=='H'?i:-1).filter(i=>i>=0),H=coordinates.map((a,i)=>a.symbol==='H'?i:-1).filter(i=>i>=0);
  if(id==='CO2'){const c=coordinates.findIndex(a=>a.symbol==='C');bonds=heavy.filter(i=>i!==c).map(i=>[c,i,2]);}
  else if(['NH3','CH4'].includes(id))bonds=H.map(i=>[heavy[0],i,1]);
  else{bonds=[[heavy[0],heavy[1],id==='C2H4'?2:3]];for(const h of H){const nearest=heavy.reduce((a,b)=>Math.hypot(...coordinates[h].position.map((v,k)=>v-coordinates[a].position[k]))<Math.hypot(...coordinates[h].position.map((v,k)=>v-coordinates[b].position[k]))?a:b);bonds.push([nearest,h,1]);}}
 }
 const cas={H2:'1333740',O2:'7782447',N2:'7727379',H2O:'7732185',CO2:'124389',NH3:'7664417',CH4:'74828',C2H4:'74851',C2H2:'74862'}[id];
 return {id,name,formula:id,geometry,atoms:coordinates,bonds:bonds.map(([a,b,order])=>({a:'a'+a,b:'a'+b,order})),charge:0,geometryStatus:'NIST CCCBDB experimental reference geometry; rounded Cartesian coordinates in angstrom',source:'https://cccbdb.nist.gov/exp2x.asp?casno='+cas+'&charge=0',caveat:id==='O2'?'The paired-electron Lewis drawing omits the two unpaired electrons in oxygen’s triplet ground state. It cannot explain oxygen’s paramagnetism.':null};
});
fs.writeFileSync(path.join(root,'molecules.json'),JSON.stringify(molecules,null,2));
console.log('Normalized',elements.length,'elements and',molecules.length,'reference geometries');

