import { OPPONENTS, type OpponentId } from '../data/opponents';
/** Original tiny pixel matrices; no external artwork. */
export function opponentSprite(id:OpponentId) {
  const rows=OPPONENTS[id].pixels;let ink='',light='';
  rows.forEach((row,y)=>[...row].forEach((v,x)=>{if(v==='1')ink+=`M${x} ${y}h1v1h-1z`;if(v==='2')light+=`M${x} ${y}h1v1h-1z`;}));
  return `<svg class="fb-creature" viewBox="0 0 ${Math.max(...rows.map(r=>r.length))} ${rows.length}" role="img" aria-label="${OPPONENTS[id].name}" shape-rendering="crispEdges"><path fill="#b5cf85" d="${light}"/><path fill="#314a29" d="${ink}"/></svg>`;
}
