export const $=s=>document.querySelector(s);
export const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const option=(value,label=value,selected=false)=>`<option value="${esc(value)}" ${selected?'selected':''}>${esc(label)}</option>`;
export const value=(n,unit='')=>n==null?'Not established':esc(n)+(unit?' '+unit:'');
export const colours={H:'#eff8ff',C:'#61dadd',N:'#87aaff',O:'#ed9b91',F:'#90dfbd',Cl:'#8cd6a3',S:'#edcd80',P:'#c1a2f8'};
export const formulaText=text=>esc(text).replace(/\d/g,n=>'₀₁₂₃₄₅₆₇₈₉'[+n]);
let timer;export function toast(text){$('#toast').textContent=text;$('#toast').classList.add('show');clearTimeout(timer);timer=setTimeout(()=>$('#toast').classList.remove('show'),3000);}
