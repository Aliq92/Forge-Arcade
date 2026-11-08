// Presentation-only themes and bounded water-light effects. No gameplay RNG or forces.
window.RR=window.RR||{};
RR.Chromatic=(function(){
 const U=RR.Utils,keys=['aqua','violet','coral','night'];
 const THEMES={
  aqua:{name:'Aqua Dawn',bgTop:'#105561',bgBottom:'#112c45',water1:'rgba(81,209,206,.15)',water2:'rgba(81,209,206,0)',ripple:'136,244,235',rippleCore:'226,255,244',secondary:'201,179,245',orb:'156,241,230',orbCore:'246,255,242',goal:'255,213,145',moon:'rgba(255,216,160,.08)',vignette:'rgba(3,18,35,.26)',lily:'rgba(111,196,153,.30)',reed:'rgba(139,211,166,.38)',koi:'rgba(246,195,157,.11)',firefly:'253,221,157',accent:'#a2eee0'},
  violet:{name:'Violet Twilight',bgTop:'#38275d',bgBottom:'#171f3e',water1:'rgba(175,139,221,.15)',water2:'rgba(175,139,221,0)',ripple:'199,173,255',rippleCore:'247,225,255',secondary:'244,168,210',orb:'208,193,255',orbCore:'255,247,245',goal:'255,214,157',moon:'rgba(243,182,220,.07)',vignette:'rgba(8,7,28,.32)',lily:'rgba(155,162,202,.28)',reed:'rgba(180,165,204,.32)',koi:'rgba(243,173,196,.10)',firefly:'248,189,223',accent:'#d1baf3'},
  coral:{name:'Coral Dream',bgTop:'#18445b',bgBottom:'#182840',water1:'rgba(238,159,154,.10)',water2:'rgba(238,159,154,0)',ripple:'255,179,178',rippleCore:'255,237,219',secondary:'126,224,226',orb:'158,233,234',orbCore:'245,255,248',goal:'255,211,141',moon:'rgba(255,193,151,.08)',vignette:'rgba(8,16,34,.27)',lily:'rgba(104,171,162,.30)',reed:'rgba(155,191,173,.34)',koi:'rgba(255,165,148,.14)',firefly:'255,211,156',accent:'#f0b3aa'},
  night:{name:'Luminous Night',bgTop:'#101e3b',bgBottom:'#080f22',water1:'rgba(103,127,203,.13)',water2:'rgba(103,127,203,0)',ripple:'127,225,246',rippleCore:'221,247,255',secondary:'192,158,244',orb:'172,233,255',orbCore:'249,253,255',goal:'249,211,150',moon:'rgba(198,194,246,.09)',vignette:'rgba(1,4,19,.36)',lily:'rgba(88,135,149,.27)',reed:'rgba(99,157,166,.32)',koi:'rgba(188,146,222,.09)',firefly:'179,191,255',accent:'#9cd7ee'}
 };
 function alias(key){return key==='day'?'aqua':keys.includes(key)?key:'night';}
 function levelTheme(index){return keys[Math.floor(Math.max(0,index)/4)%keys.length];}
 function activeTheme(game){const choice=game.settings.visualTheme;if(keys.includes(choice))return choice;if(game.zenActive)return alias(game.zen.theme);if(game.level&&!['title','levelSelect','howto','settings'].includes(game.state))return levelTheme(game.currentLevelIndex);return 'aqua';}
 function preferences(s){return {visualTheme:['auto',...keys].includes(s.visualTheme)?s.visualTheme:'auto',glowIntensity:Number.isFinite(s.glowIntensity)?U.clamp(s.glowIntensity,0,1):.65,particleEffects:typeof s.particleEffects==='boolean'?s.particleEffects:true};}
 class ParticlePool{
  constructor(){this.active=[];this.free=Array.from({length:240},()=>({}));this.seed=79009;this.reduced=false;}
  random(){this.seed=(Math.imul(this.seed,1664525)+1013904223)>>>0;return this.seed/4294967296;}
  burst(x,y,count,theme){for(let i=0;i<(this.reduced?Math.min(8,count):count)&&this.active.length<(this.reduced?32:240);i++){const p=this.free.pop();if(!p)break;const a=this.random()*Math.PI*2,speed=18+this.random()*65;Object.assign(p,{x,y,vx:this.reduced?0:Math.cos(a)*speed,vy:this.reduced?0:Math.sin(a)*speed-14,size:1.1+this.random()*1.7,life:this.reduced?.55:.65+this.random()*.65,maxLife:1.3,color:i%3?theme.ripple:theme.goal});this.active.push(p);}}
  update(dt){let write=0;for(const p of this.active){p.life-=dt;if(p.life<=0){this.free.push(p);continue;}p.x+=p.vx*dt;p.y+=p.vy*dt;const drag=Math.exp(-dt*1.7);p.vx*=drag;p.vy*=drag;this.active[write++]=p;}this.active.length=write;}
  clear(){while(this.active.length)this.free.push(this.active.pop());}
 }
 return {keys,THEMES,alias,levelTheme,activeTheme,preferences,ParticlePool};
})();
