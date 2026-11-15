import {C,E,MSUN,PC,AU,YEAR} from '../physics/shared.mjs';
export const $=s=>document.querySelector(s),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const fmt=(v,digits=5)=>v===null||v===undefined||!Number.isFinite(v)?'—':v===0?'0':Math.abs(v)>=1e5||Math.abs(v)<.001?v.toExponential(Math.max(1,digits-2)):Number(v.toPrecision(digits)).toString();
export const option=(value,label,selected=false)=>`<option value="${esc(value)}"${selected?' selected':''}>${esc(label)}</option>`;
export const math=expression=>`<div class="math" role="math" aria-label="${esc(expression)}">${esc(expression)}</div>`;
export const kinds={A:'Quantitative simulation',B:'Analytical visualization',C:'Conceptual model'};
export const statuses={established:'Established within domain',approximation:'Scoped approximation',unconfirmed:'Unconfirmed framework',analogy:'Educational analogy','open-question':'Open research question'};
export const badge=status=>`<span class="status status-${esc(status)}">${esc(statuses[status]||status)}</span>`;
const units={m:[['m',1],['mm',.001],['μm',1e-6],['nm',1e-9],['km',1000],['AU',AU],['kpc',PC*1000]],s:[['s',1],['ms',.001],['μs',1e-6],['ns',1e-9],['fs',1e-15],['yr',YEAR]],kg:[['kg',1],['g',.001],['M☉',MSUN]],J:[['J',1],['eV',E],['MeV',E*1e6]],rad:[['rad',1],['°',Math.PI/180]],'°':[['°',1],['rad',180/Math.PI]],K:[['K',1],['°C',1,273.15]],Pa:[['Pa',1],['kPa',1000],['atm',101325]],Hz:[['Hz',1],['kHz',1000],['GHz',1e9]],'m/s':[['m/s',1],['km/s',1000],['c',C]]};
export const conversions=unit=>units[unit]||[[unit||'1',1]];
export const displayValue=(value,unit,index=0)=>{const u=conversions(unit)[index]||conversions(unit)[0];return (value-(u[2]||0))/u[1];};
export const scientificValue=(value,unit,index=0)=>{const u=conversions(unit)[index]||conversions(unit)[0];return value*u[1]+(u[2]||0);};
let timer;export function notify(message){const host=$('#notification');if(!host)return;host.textContent=message;host.hidden=false;clearTimeout(timer);timer=setTimeout(()=>host.hidden=true,7000);}
