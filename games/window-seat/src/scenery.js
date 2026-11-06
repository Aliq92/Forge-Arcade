'use strict';
(() => {
  const W=window.WS;
  W.hash=(n,seed=837219)=>{let t=(Math.imul(n|0,374761393)+seed)|0;t=Math.imul(t^(t>>>13),1274126177);return ((t^(t>>>16))>>>0)/4294967296;};
  W.rng=seed=>{let a=seed|0;return()=>{a=(a+0x6D2B79F5)|0;let t=Math.imul(a^(a>>>15),1|a);t^=t+Math.imul(t^(t>>>7),61|t);return ((t^(t>>>14))>>>0)/4294967296;};};
  class Scenery {
    constructor(seed) {this.seed=seed;this.cache=new Map();this.frame=0;this.maxSegments=96;this.objectCount=0;}
    segment(region,layer,index) {
      const key=`${region}:${layer}:${index}`;
      let seg=this.cache.get(key);
      if(!seg) {
        const r=W.rng(this.seed+index*7919+layer*104729+W.regions.indexOf(region)*5371);
        const objects=[],feature=r(),cluster=80+r()*240;
        const count=[3,7,10,12][layer];
        for(let i=0;i<count;i++) {const x=layer===2&&i<6?cluster+(r()-.5)*140:(i+r()*.65)*400/count;objects.push({x,y:r(),size:.7+r()*.7,type:r(),detail:r(),lean:r()-.5});}
        seg={objects,index,feature,used:this.frame};this.cache.set(key,seg);
      }
      seg.used=this.frame;return seg;
    }
    visible(region,layer,position,width) {
      const rates=[.045,.12,.32,1];const offset=position*rates[layer];
      const first=Math.floor(offset/400)-1,last=Math.ceil((offset+width)/400)+1;
      const list=[];
      for(let i=first;i<=last;i++)list.push({seg:this.segment(region,layer,i),x:i*400-offset});
      return list;
    }
    trim() {
      if(this.cache.size>this.maxSegments) {
        const oldest=[...this.cache.entries()].sort((a,b)=>a[1].used-b[1].used);
        for(let i=0;i<oldest.length-this.maxSegments;i++)this.cache.delete(oldest[i][0]);
      }
      this.objectCount=[...this.cache.values()].reduce((sum,s)=>sum+s.objects.length,0);
    }
    // Continuous terrain is sampled in world coordinates, never reset at segment boundaries.
    terrain(x,layer,region) {
      const high=region==='highlands';
      const base=(region==='coast'?[306,350,382,548]:[260,330,380,548])[layer];
      const amp=[high?105:region==='coast'?28:48,high?58:region==='coast'?18:26,9,8][layer];
      return base+Math.sin(x/[310,200,235,155][layer]+layer*2.1)*amp+Math.sin(x/[117,83,98,59][layer]+1.2)*amp*.24;
    }
  }
  W.Scenery=Scenery;
  const colors={
    day:{sky:'#b7d1cc',horizon:'#f0e5bf',far:'#93ada0',hill:'#738f76',hill2:'#597b65',land:'#a4b47f',grass:'#6f8b5a',near:'#455e42',tree:'#47694f',treeLight:'#64805a',water:'#90b9b0',ripple:'#dbe2bf',sand:'#d6c79e',wall:'#e6d7b1',roof:'#976a53',shadow:'#344e43',cloud:'#f5f0db',sun:'#fff1b5',window:'#f7df91'},
    dusk:{sky:'#b2a7b0',horizon:'#eabe96',far:'#9c9b9b',hill:'#7f8b80',hill2:'#5b766c',land:'#9a9f71',grass:'#7e8c62',near:'#465b45',tree:'#4a6651',treeLight:'#687957',water:'#a2b0a6',ripple:'#e7cbaa',sand:'#beab8d',wall:'#d6b991',roof:'#8d6456',shadow:'#3a5050',cloud:'#e6c4b6',sun:'#ffe0a8',window:'#ffe1a0'},
    night:{sky:'#263d51',horizon:'#677c86',far:'#526b74',hill:'#4a686b',hill2:'#3d5d5b',land:'#667e6b',grass:'#536b56',near:'#314c42',tree:'#304f46',treeLight:'#466354',water:'#4c7480',ripple:'#8fa6a1',sand:'#8b9583',wall:'#a3ac98',roof:'#596a68',shadow:'#273e43',cloud:'#6c8390',sun:'#eee8cb',window:'#f4cc86'}
  };
  W.rgb=hex=>hex.match(/\w\w/g).map(v=>parseInt(v,16));
  W.mix=(a,b,t)=>{const aa=W.rgb(a),bb=W.rgb(b);return '#'+aa.map((v,i)=>Math.round(v+(bb[i]-v)*t).toString(16).padStart(2,'0')).join('');};
  W.palette=light=>{const a=colors[W.times[Math.floor(light)]],b=colors[W.times[Math.min(2,Math.ceil(light))]],p={};for(const k in a)p[k]=W.mix(a[k],b[k],light%1);return p;};
})();
