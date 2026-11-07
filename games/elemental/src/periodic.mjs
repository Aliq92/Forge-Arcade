import {$,esc,option,value} from './ui.mjs';
const categories={'Nonmetal':'#80dcb8','Noble gas':'#b59aef','Alkali metal':'#eca296','Alkaline earth metal':'#dfc58d','Metalloid':'#83cce2','Halogen':'#9ec9f4','Transition metal':'#74c6ce','Post-transition metal':'#abc0d8','Lanthanide':'#c9abe9','Actinide':'#e8a7cb'};
export function setupPeriodic(elements,onSelect){
 const classes=[...new Set(elements.map(e=>e.classification))];
 $('#periodic-controls').innerHTML=`<label>FIND AN ELEMENT<input id="element-search" type="search" placeholder="Name, symbol or number" autocomplete="off"></label><label>CLASSIFICATION<select id="category-filter">${option('all','All families')+classes.map(c=>option(c)).join('')}</select></label><label>COLOUR BY<select id="trend">${[['family','Element family'],['radius','van der Waals radius / pm'],['electronegativity','Electronegativity / Pauling'],['ionization','First ionization / eV']].map(([v,l])=>option(v,l)).join('')}</select></label><label class="check"><input type="checkbox" id="list-view" ${innerWidth<850?'checked':''}>List layout</label>`;
 let selected=6;
 const render=()=>{
  const search=$('#element-search').value.trim().toLowerCase(),category=$('#category-filter').value,trend=$('#trend').value,list=$('#list-view').checked,nums=elements.map(e=>e[trend]).filter(Number.isFinite),min=Math.min(...nums),max=Math.max(...nums);let matches=0;
  $('#periodic-table').classList.toggle('list',list);
  $('#periodic-table').innerHTML=elements.map(e=>{
   const match=(!search||e.name.toLowerCase().includes(search)||e.symbol.toLowerCase()===search||String(e.z)===search)&&(category==='all'||category===e.classification);if(match)matches++;
   const missing=trend!=='family'&&e[trend]===null,color=trend==='family'?categories[e.classification]||'#aebfd0':missing?'#708594':`hsl(${210-(e[trend]-min)/(max-min||1)*160} 65% 68%)`;
   const weightLabel=e.weightKind==='standard'&&e.weight.startsWith('[')?'interval':e.weight.length>9?'see notes':e.weight;
   return `<button class="element-cell ${match?'':'dim'} ${missing?'missing':''}" data-z="${e.z}" style="grid-column:${e.column};grid-row:${e.row};--cell-color:${color}" aria-pressed="${e.z===selected}" aria-label="${esc(e.name)}, ${e.symbol}, atomic number ${e.z}, ${esc(e.classification)}${missing?', value not established':''}" title="${esc(e.name+' · '+e.classification+' · '+e.weight)}"><span class="z">${e.z}</span><strong>${e.symbol}</strong><small>${trend==='family'?esc(weightLabel):missing?'—':esc(e[trend])}</small>${list?'<small>'+esc(e.name)+'</small>':''}</button>`;
  }).join('');
  const trendNote=trend==='radius'?'Many radius measures tend to grow down a group; this van der Waals dataset has definition-dependent exceptions.':trend==='electronegativity'?'Electronegativity often grows across a period; many noble-gas entries are unavailable.':trend==='ionization'?'First ionization energy generally grows across a period and falls down a group, with subshell and pairing exceptions.':'';
  $('#periodic-count').textContent=`${matches} matching elements · Nonmatches are dimmed to retain table shape. ${trend==='family'?'Select any tile to inspect.':`${nums.length} values supplied; ${118-nums.length} missing. Blue → mint: ${min} → ${max}. Dark stripes: no value. ${trendNote}`}`;
  for(const button of $('#periodic-table').querySelectorAll('button'))button.onclick=()=>{selected=+button.dataset.z;render();onSelect(elements[selected-1]);};
 };
 for(const id of ['element-search','category-filter','trend','list-view'])$('#'+id).addEventListener(id==='element-search'?'input':'change',render);
 render();return {select(z){selected=z;render();}};
}
export function renderCompare(a,b){
 const props=[['Atomic number','z',''],['Standard weight / [A]','weight',''],['Classification','classification',''],['Configuration','configuration',''],['Electronegativity','electronegativity','Pauling'],['van der Waals radius','radius','pm'],['First ionization','ionization','eV']];
 $('#compare-panel').innerHTML=`<h2>Side by side</h2><table class="comparison"><thead><tr><th>Property</th><th>${a.symbol}</th><th>${b.symbol}</th></tr></thead><tbody>${props.map(([l,p,u])=>`<tr><td>${l}</td><td>${value(a[p],u)}</td><td>${value(b[p],u)}</td></tr>`).join('')}</tbody></table>`;
}
