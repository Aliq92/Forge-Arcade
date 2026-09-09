(() => {
"use strict";

/* =====================================================================
   UTILITIES
===================================================================== */
const clamp = (v,a,b)=>v<a?a:v>b?b:v;
const lerp = (a,b,t)=>a+(b-a)*t;
const TAU = Math.PI*2;

function mulberry32(seed){
  let a = seed >>> 0;
  return function(){
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function randRange(rng,min,max){ return min + rng()*(max-min); }
function pick(rng, arr){ return arr[Math.floor(rng()*arr.length)]; }
function hsla(h,s,l,a){ return `hsla(${h},${s}%,${l}%,${a})`; }

/* =====================================================================
   CANVAS SETUP
===================================================================== */
const canvas = document.getElementById('reef-canvas');
const ctx = canvas.getContext('2d');
let W=0, H=0, DPR=1;

function resize(){
  DPR = Math.min(window.devicePixelRatio||1, 2);
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = Math.floor(W*DPR);
  canvas.height = Math.floor(H*DPR);
  canvas.style.width = W+'px';
  canvas.style.height = H+'px';
  ctx.setTransform(DPR,0,0,DPR,0,0);
}
window.addEventListener('resize', resize);
resize();

/* =====================================================================
   SPECIES DEFINITIONS
===================================================================== */
const SPECIES = {
  glass_branch: {
    id:'glass_branch', name:'Glass Branch',
    hue:192, sat:35, light:78, matureTime:75,
    swayFreq:0.32, swayAmp:0.09,
    icon: iconGlassBranch
  },
  spiral_tube: {
    id:'spiral_tube', name:'Spiral Tube',
    hue:206, sat:60, light:62, matureTime:85,
    swayFreq:0.22, swayAmp:0.05,
    icon: iconSpiralTube
  },
  lumen_fan: {
    id:'lumen_fan', name:'Lumen Fan',
    hue:268, sat:55, light:60, matureTime:95,
    swayFreq:0.26, swayAmp:0.07,
    icon: iconLumenFan
  },
  pearl_bloom: {
    id:'pearl_bloom', name:'Pearl Bloom',
    hue:326, sat:42, light:72, matureTime:70,
    swayFreq:0.4, swayAmp:0.04,
    icon: iconPearlBloom
  },
  floating_polyp: {
    id:'floating_polyp', name:'Floating Polyp',
    hue:44, sat:70, light:66, matureTime:65,
    swayFreq:0.5, swayAmp:0.12,
    icon: iconFloatingPolyp
  },
  geometric_anemone: {
    id:'geometric_anemone', name:'Geometric Anemone',
    hue:174, sat:48, light:60, matureTime:80,
    swayFreq:0.3, swayAmp:0.08,
    icon: iconGeometricAnemone
  }
};
const SPECIES_LIST = Object.values(SPECIES);

const HYBRID_RULES = {
  'glass_branch+spiral_tube': {name:'translucent spiral fan', hue:212},
  'lumen_fan+spiral_tube':    {name:'glowing tubular flowers', hue:250},
  'glass_branch+floating_polyp': {name:'branching light nodes', hue:130},
  'pearl_bloom+lumen_fan':    {name:'radiant fan bloom', hue:300},
  'geometric_anemone+pearl_bloom': {name:'symmetric flowering star', hue:350},
  'floating_polyp+geometric_anemone': {name:'drifting star polyp', hue:90}
};
const RARE_FORMS = [
  {name:'Crown Coral', base:'geometric_anemone', hue:48},
  {name:'Ghost Fan', base:'lumen_fan', hue:0, ghost:true},
  {name:'Star Bloom', base:'pearl_bloom', hue:355},
  {name:'Glass Spiral', base:'spiral_tube', hue:200, ghost:true},
  {name:'Lantern Tree', base:'glass_branch', hue:38},
  {name:'Void Anemone', base:'geometric_anemone', hue:270, dark:true}
];

function pairKey(a,b){ return [a,b].sort().join('+'); }

/* =====================================================================
   STATE
===================================================================== */
const state = {
  organisms: [],
  creatures: [],
  snow: [],
  events: [],
  nextId: 1,
  selectedSpecies: 'glass_branch',
  selectedOrganism: null,
  sound:false,
  reducedMotion: window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  zen:false,
  autoGrow:false,
  firstPlantDone:false,
  currentAngle:0,
  currentTarget:0,
  bredPairs: new Map(), // pairKey -> last attempt time
  lastCross: 0,
  lastAutoGrow: 0,
  lastAmbient: 0,
  moodStart: Date.now(),
  time:0
};

const MOOD_ORDER = ['CLEAR BLUE','TWILIGHT','DEEP CURRENT','LUMINOUS NIGHT'];
const MOOD_DURATION = 210; // seconds each
const MOOD_TRANSITION = 30; // seconds crossfade

const MOOD_COLORS = {
  'CLEAR BLUE':      {top:[10,28,46],  bottom:[3,10,18],  bioBoost:0.7, rayAlpha:0.12},
  'TWILIGHT':         {top:[14,18,34],  bottom:[3,6,14],   bioBoost:1.0, rayAlpha:0.07},
  'DEEP CURRENT':     {top:[6,12,22],   bottom:[2,4,9],    bioBoost:1.15, rayAlpha:0.04},
  'LUMINOUS NIGHT':   {top:[4,8,18],    bottom:[1,3,7],    bioBoost:1.5, rayAlpha:0.02}
};

function currentMood(){
  const elapsed = ((Date.now()-state.moodStart)/1000) % (MOOD_DURATION*MOOD_ORDER.length);
  const idx = Math.floor(elapsed/MOOD_DURATION);
  const within = elapsed - idx*MOOD_DURATION;
  const a = MOOD_ORDER[idx];
  const b = MOOD_ORDER[(idx+1)%MOOD_ORDER.length];
  const tStart = MOOD_DURATION - MOOD_TRANSITION;
  let t = within>tStart ? (within-tStart)/MOOD_TRANSITION : 0;
  return {a,b,t};
}
function blendMoodColors(){
  const {a,b,t} = currentMood();
  const A = MOOD_COLORS[a], B = MOOD_COLORS[b];
  const top = A.top.map((v,i)=>Math.round(lerp(v,B.top[i],t)));
  const bottom = A.bottom.map((v,i)=>Math.round(lerp(v,B.bottom[i],t)));
  const bioBoost = lerp(A.bioBoost,B.bioBoost,t);
  const rayAlpha = lerp(A.rayAlpha,B.rayAlpha,t);
  const label = t>0.5?b:a;
  return {top,bottom,bioBoost,rayAlpha,label};
}

/* =====================================================================
   ORGANISM GEOMETRY GENERATORS (deterministic from seed)
===================================================================== */
function buildBranchNode(rng, depth, maxDepth, len){
  const node = { len, depth, children:[] };
  if(depth>=maxDepth) return node;
  const n = depth===0 ? 2 : (rng()<0.6?2:1);
  for(let i=0;i<n;i++){
    const side = i===0?1:-1;
    const spread = side*(0.35+rng()*0.55) + (rng()-0.5)*0.15;
    node.children.push({
      angleOffset: spread,
      ...buildBranchNode(rng, depth+1, maxDepth, len*(0.6+rng()*0.18))
    });
  }
  return node;
}

function buildGeo(speciesId, rng){
  switch(speciesId){
    case 'glass_branch':
      return { tree: buildBranchNode(rng,0,4,44+rng()*14) };
    case 'spiral_tube':
      return { turns: 2+rng()*1.6, twist: rng()<0.5?1:-1, height:70+rng()*30, baseR:6+rng()*4, tipR:16+rng()*8, glowNode: rng()<0.7 };
    case 'lumen_fan': {
      const ribCount = 5+Math.floor(rng()*4);
      const ribs=[];
      for(let i=0;i<ribCount;i++){
        const tt = ribCount===1?0:i/(ribCount-1);
        ribs.push({ angle:(tt-0.5)*1.5, len:52+rng()*30, curve:(rng()-0.5)*0.6, phase:rng()*TAU });
      }
      return { ribs };
    }
    case 'pearl_bloom': {
      const petalCount = 6+Math.floor(rng()*4);
      const petals=[];
      for(let i=0;i<petalCount;i++){
        petals.push({ angle:(i/petalCount)*TAU, size:14+rng()*9, phase:rng()*TAU, tilt: rng()*0.4 });
      }
      return { petals };
    }
    case 'floating_polyp': {
      const nodeCount = 3+Math.floor(rng()*4);
      const nodes=[];
      for(let i=0;i<nodeCount;i++){
        nodes.push({ h: 30+i*16+rng()*10, side:(rng()-0.5)*40, phase:rng()*TAU, r:4+rng()*3 });
      }
      return { nodes, stalkH: 20+rng()*10 };
    }
    case 'geometric_anemone': {
      const tCount = 8+Math.floor(rng()*7);
      const tent=[];
      for(let i=0;i<tCount;i++){
        tent.push({ angle:(i/tCount)*TAU, len:38+rng()*22, phase:rng()*TAU, curve:(rng()-0.5)*0.5 });
      }
      return { tent };
    }
  }
  return {};
}

/* =====================================================================
   ORGANISM FACTORY
===================================================================== */
function createOrganism(speciesId, x, y, opts={}){
  const seed = opts.seed!==undefined ? opts.seed : Math.floor(Math.random()*4294967295);
  const rng = mulberry32(seed);
  const o = {
    id: state.nextId++,
    species: speciesId,
    x, y,
    seed,
    geo: buildGeo(speciesId, mulberry32(seed)),
    growth: opts.growth!==undefined ? opts.growth : 0.02,
    age: opts.age||0,
    phase: rng()*TAU,
    scale: 0.85+rng()*0.35,
    isHybrid: !!opts.isHybrid,
    hybridHue: opts.hybridHue,
    hybridLabel: opts.hybridLabel,
    rare: opts.rare||null,
    hueJitter: (rng()-0.5)*10,
    selected:false,
    bloomPulse:0,
    createdAt: opts.createdAt || Date.now()
  };
  return o;
}

function speciesColor(o){
  if(o.rare){
    const def = RARE_FORMS.find(r=>r.name===o.rare);
    return { hue: def?def.hue:o.hybridHue||0, sat: def&&def.ghost?15:60, light: def&&def.dark?40:70 };
  }
  if(o.isHybrid){
    return { hue: o.hybridHue, sat:55, light:68 };
  }
  const sp = SPECIES[o.species];
  return { hue: sp.hue+o.hueJitter, sat: sp.sat, light: sp.light };
}

function baseSpeciesForDraw(o){
  if(o.rare){
    const def = RARE_FORMS.find(r=>r.name===o.rare);
    return def ? def.base : o.species;
  }
  return o.species;
}

/* =====================================================================
   DRAWING — per species renderers
   All draw relative to organism.x/y (seabed anchor), growing upward (-y)
===================================================================== */
function swayWiggle(o, sp, depth=0){
  const amp = sp.swayAmp * (state.reducedMotion?0.35:1);
  return Math.sin(state.time*sp.swayFreq + o.phase + depth*0.7) * amp + state.currentAngle*0.4;
}

function drawGlassBranch(o, col, growth, glow){
  const sp = SPECIES.glass_branch;
  ctx.save();
  ctx.translate(o.x,o.y);
  const maxDepth=4;
  function rec(node, x,y, baseAngle, depth){
    const reveal = clamp(growth*(maxDepth+1) - depth, 0, 1);
    if(reveal<=0) return;
    const wig = swayWiggle(o, sp, depth);
    const angle = baseAngle + (node.angleOffset||0) + wig*(depth*0.3+0.3);
    const len = node.len * (0.4+0.6*reveal) * o.scale;
    const x2 = x + Math.sin(angle)*len;
    const y2 = y - Math.cos(angle)*len;
    const a = 0.35+0.4*reveal;
    ctx.strokeStyle = hsla(col.hue, col.sat, col.light, a);
    ctx.lineWidth = Math.max(0.8, (maxDepth-depth)*1.1);
    ctx.beginPath();
    ctx.moveTo(x,y); ctx.lineTo(x2,y2); ctx.stroke();
    if(depth===maxDepth || node.children.length===0){
      ctx.beginPath();
      ctx.fillStyle = hsla(col.hue, col.sat, Math.min(92,col.light+15), glow*0.5*reveal);
      ctx.arc(x2,y2, 2.2, 0, TAU); ctx.fill();
    }
    (node.children||[]).forEach(c=>rec(c, x2,y2, angle, depth+1));
  }
  rec(o.geo.tree, 0,0, 0, 0);
  ctx.restore();
}

function drawSpiralTube(o, col, growth, glow){
  const sp = SPECIES.spiral_tube;
  const g = o.geo;
  ctx.save();
  ctx.translate(o.x,o.y);
  const wig = swayWiggle(o, sp);
  const n = 34;
  const visible = Math.max(2, Math.floor(n*growth));
  ctx.beginPath();
  for(let i=0;i<=visible;i++){
    const tt = i/n;
    const ang = tt*g.turns*TAU*g.twist + wig*1.4;
    const r = lerp(g.baseR, g.tipR, tt) * o.scale;
    const px = Math.sin(ang)*r*(1+wig*0.3);
    const py = -tt*g.height*o.scale;
    if(i===0) ctx.moveTo(px,py); else ctx.lineTo(px,py);
  }
  ctx.strokeStyle = hsla(col.hue, col.sat, col.light, 0.55);
  ctx.lineWidth = 4.5;
  ctx.lineCap='round';
  ctx.stroke();
  ctx.strokeStyle = hsla(col.hue, col.sat, Math.min(95,col.light+18), 0.3);
  ctx.lineWidth = 1.4;
  ctx.stroke();
  if(g.glowNode && growth>0.85){
    const tt=1;
    const ang = tt*g.turns*TAU*g.twist + wig*1.4;
    const r = g.tipR*o.scale;
    const px = Math.sin(ang)*r;
    const py = -tt*g.height*o.scale;
    const pulse = 0.5+0.5*Math.sin(state.time*0.8+o.phase);
    ctx.beginPath();
    ctx.fillStyle = hsla(col.hue, col.sat, 85, glow*0.6*pulse);
    ctx.arc(px,py,4+pulse*2,0,TAU); ctx.fill();
  }
  ctx.restore();
}

function drawLumenFan(o, col, growth, glow){
  const sp = SPECIES.lumen_fan;
  const g = o.geo;
  ctx.save();
  ctx.translate(o.x,o.y);
  const revealCount = growth*g.ribs.length;
  g.ribs.forEach((rib,i)=>{
    const reveal = clamp(revealCount-i,0,1);
    if(reveal<=0) return;
    const wig = swayWiggle(o, sp, i);
    const ang = rib.angle + wig;
    const len = rib.len*reveal*o.scale;
    const midx = Math.sin(ang)*len*0.5 + Math.sin(ang+rib.curve)*len*0.15;
    const midy = -len*0.5;
    const endx = Math.sin(ang)*len;
    const endy = -len;
    ctx.beginPath();
    ctx.moveTo(0,0);
    ctx.quadraticCurveTo(midx,midy,endx,endy);
    const vein = 0.4+0.35*Math.sin(state.time*0.6+rib.phase);
    ctx.strokeStyle = hsla(col.hue, col.sat, col.light, 0.22+vein*0.25);
    ctx.lineWidth = 2.2;
    ctx.stroke();
    ctx.beginPath();
    ctx.fillStyle = hsla(col.hue, col.sat, Math.min(95,col.light+20), glow*0.4*vein*reveal);
    ctx.arc(endx,endy,2,0,TAU); ctx.fill();
  });
  ctx.restore();
}

function drawPearlBloom(o, col, growth, glow){
  const sp = SPECIES.pearl_bloom;
  const g = o.geo;
  ctx.save();
  ctx.translate(o.x,o.y-6*o.scale);
  const breathe = growth>0.9 ? Math.sin(state.time*0.22+o.phase)*0.08 : 0;
  const openAmt = clamp(growth+breathe,0,1);
  g.petals.forEach(p=>{
    const wig = swayWiggle(o, sp, 1)*0.3;
    const dist = 4 + openAmt*p.size*0.9;
    const ang = p.angle+wig;
    const px = Math.sin(ang)*dist;
    const py = -Math.cos(ang)*dist*0.6 - dist*0.2;
    ctx.save();
    ctx.translate(px,py);
    ctx.rotate(ang*0.3+p.tilt*openAmt);
    ctx.scale(1, 0.6+openAmt*0.4);
    ctx.beginPath();
    ctx.fillStyle = hsla(col.hue, col.sat, col.light, 0.5*openAmt+0.1);
    ctx.ellipse(0,0, p.size*o.scale*(0.4+openAmt*0.6), p.size*o.scale*0.55,0,0,TAU);
    ctx.fill();
    ctx.restore();
  });
  ctx.beginPath();
  ctx.fillStyle = hsla(col.hue, col.sat, Math.min(95,col.light+15), glow*0.5);
  ctx.arc(0,0,3+openAmt*2,0,TAU); ctx.fill();
  ctx.restore();
}

function drawFloatingPolyp(o, col, growth, glow){
  const sp = SPECIES.floating_polyp;
  const g = o.geo;
  ctx.save();
  ctx.translate(o.x,o.y);
  const wig = swayWiggle(o, sp);
  const stalkTop = -g.stalkH*o.scale;
  ctx.strokeStyle = hsla(col.hue, col.sat, col.light-8, 0.5);
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(0,0);
  ctx.quadraticCurveTo(wig*6,stalkTop*0.6,wig*4,stalkTop);
  ctx.stroke();
  const visibleNodes = Math.floor(growth*g.nodes.length + 0.4);
  g.nodes.forEach((nd,i)=>{
    if(i>=visibleNodes) return;
    const reveal = clamp(growth*g.nodes.length - i,0,1);
    const bob = Math.sin(state.time*0.5+nd.phase)*6*(state.reducedMotion?0.4:1);
    const nx = wig*4 + nd.side*o.scale*reveal + wig*10;
    const ny = stalkTop - nd.h*o.scale*reveal + bob;
    ctx.beginPath();
    ctx.strokeStyle = hsla(col.hue, col.sat, col.light, 0.25*reveal);
    ctx.lineWidth = 1;
    ctx.moveTo(wig*4, stalkTop);
    ctx.lineTo(nx,ny);
    ctx.stroke();
    const pulse = 0.6+0.4*Math.sin(state.time*0.9+nd.phase);
    ctx.beginPath();
    ctx.fillStyle = hsla(col.hue, col.sat, Math.min(95,col.light+15), (0.4+0.4*pulse)*reveal);
    ctx.arc(nx,ny, nd.r*o.scale, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.fillStyle = hsla(col.hue, col.sat, Math.min(95,col.light+25), glow*0.5*pulse*reveal);
    ctx.arc(nx,ny, nd.r*o.scale*1.8, 0, TAU);
    ctx.fill();
  });
  ctx.restore();
}

function drawGeometricAnemone(o, col, growth, glow, darkMode){
  const sp = SPECIES.geometric_anemone;
  const g = o.geo;
  ctx.save();
  ctx.translate(o.x,o.y);
  const breathe = 1+ (growth>0.85 ? Math.sin(state.time*0.35+o.phase)*0.12 : 0);
  g.tent.forEach((t,i)=>{
    const reveal = clamp(growth*g.tent.length - i*0.4, 0, 1);
    if(reveal<=0) return;
    const wig = swayWiggle(o, sp, i*0.3);
    const ang = t.angle + wig*0.6;
    const len = t.len*reveal*o.scale*breathe;
    const midx = Math.sin(ang)*len*0.5 + Math.cos(ang)*t.curve*len*0.3;
    const midy = -len*0.5;
    const endx = Math.sin(ang)*len;
    const endy = -len*0.85;
    ctx.beginPath();
    ctx.moveTo(0,-4);
    ctx.quadraticCurveTo(midx,midy,endx,endy);
    ctx.strokeStyle = hsla(col.hue, col.sat, darkMode? col.light*0.5: col.light, 0.4*reveal);
    ctx.lineWidth = 2;
    ctx.stroke();
    const tipGlow = darkMode ? 0.9 : 0.5;
    ctx.beginPath();
    ctx.fillStyle = hsla(darkMode?0:col.hue, darkMode?0:col.sat, darkMode?95:Math.min(95,col.light+20), glow*tipGlow*reveal*(0.5+0.5*Math.sin(state.time*0.7+t.phase)));
    ctx.arc(endx,endy,2.4,0,TAU); ctx.fill();
  });
  ctx.beginPath();
  ctx.fillStyle = hsla(col.hue,col.sat,darkMode?30:col.light-5,0.6);
  ctx.arc(0,-4,7*o.scale,0,TAU); ctx.fill();
  ctx.restore();
}

const DRAW_FN = {
  glass_branch: drawGlassBranch,
  spiral_tube: drawSpiralTube,
  lumen_fan: drawLumenFan,
  pearl_bloom: drawPearlBloom,
  floating_polyp: drawFloatingPolyp,
  geometric_anemone: drawGeometricAnemone
};

function drawOrganism(o, mood){
  const col = speciesColor(o);
  const glow = 0.5*mood.bioBoost + (o.bloomPulse||0);
  const drawSpecies = baseSpeciesForDraw(o);
  const darkMode = o.rare==='Void Anemone';
  const fn = DRAW_FN[drawSpecies];
  if(!fn) return;

  if(o.isHybrid){
    // layered: faint echo of both parent forms, blended hue, smaller scale
    ctx.globalAlpha = 0.85;
  }
  fn(o, col, clamp(o.growth,0,1), glow, darkMode);
  ctx.globalAlpha = 1;

  if(o.selected){
    ctx.save();
    ctx.translate(o.x,o.y);
    const pulse = 0.5+0.5*Math.sin(state.time*3);
    ctx.beginPath();
    ctx.strokeStyle = hsla(190,60,80,0.35+pulse*0.25);
    ctx.lineWidth = 1.2;
    ctx.arc(0,-18,26,0,TAU);
    ctx.stroke();
    ctx.restore();
  }
}

/* =====================================================================
   SPECIES SELECTOR ICONS (small canvas-drawn SVG strings)
===================================================================== */
function svgWrap(inner){ return `<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">${inner}</svg>`; }
function iconGlassBranch(){ return svgWrap(`<path d="M20 36V20M20 20l-7-8M20 20l7-8M13 12l-4-5M13 12l4-4M27 12l4-5M27 12l-4-4"/>`); }
function iconSpiralTube(){ return svgWrap(`<path d="M20 36c0-4 8-3 8-8s-9-4-9-9 8-3 8-8"/>`); }
function iconLumenFan(){ return svgWrap(`<path d="M20 36V22M20 22L8 10M20 22l4-14M20 22l6-11M20 22l8 6"/>`); }
function iconPearlBloom(){ return svgWrap(`<circle cx="20" cy="18" r="4"/><ellipse cx="20" cy="9" rx="4" ry="6"/><ellipse cx="29" cy="14" rx="4" ry="6" transform="rotate(45 29 14)"/><ellipse cx="11" cy="14" rx="4" ry="6" transform="rotate(-45 11 14)"/><ellipse cx="29" cy="23" rx="4" ry="6" transform="rotate(135 29 23)"/><ellipse cx="11" cy="23" rx="4" ry="6" transform="rotate(-135 11 23)"/>`); }
function iconFloatingPolyp(){ return svgWrap(`<path d="M20 36V24"/><circle cx="14" cy="16" r="2.3"/><circle cx="22" cy="10" r="2.3"/><circle cx="27" cy="18" r="2.3"/><path d="M20 24l-6-8M20 24l2-14M20 24l7-6" stroke-width="1"/>`); }
function iconGeometricAnemone(){ return svgWrap(`<circle cx="20" cy="26" r="4"/><path d="M20 22V8M20 22l-9-11M20 22l9-11M20 22l-13-2M20 22l13-2M20 22l-11 8M20 22l11 8"/>`); }

/* =====================================================================
   CREATURES
===================================================================== */
const CREATURE_TYPES = ['fish','jelly','ray','shrimp','worm'];
function spawnCreature(){
  const type = pick(Math.random, CREATURE_TYPES);
  return {
    id: state.nextId++,
    type,
    x: Math.random()*W,
    y: H*0.2 + Math.random()*H*0.6,
    vx:(Math.random()-0.5)*10,
    vy:(Math.random()-0.5)*6,
    phase: Math.random()*TAU,
    hue: 170+Math.random()*80,
    size: type==='jelly'?7:(type==='ray'?10:3.5),
    wanderT: Math.random()*TAU
  };
}
function updateCreature(c, dt){
  c.wanderT += dt*0.6;
  c.vx += Math.cos(c.wanderT+c.phase)*4*dt;
  c.vy += Math.sin(c.wanderT*0.7)*2*dt;
  // gentle attraction to nearest glowing organism
  let near=null, nd=99999;
  for(const o of state.organisms){
    if(o.growth<0.5) continue;
    const dx=o.x-c.x, dy=(o.y-40)-c.y;
    const d=dx*dx+dy*dy;
    if(d<nd){nd=d; near=o;}
  }
  if(near && nd<250*250){
    const dx=near.x-c.x, dy=(near.y-40)-c.y;
    const d=Math.sqrt(nd)||1;
    c.vx += (dx/d)*3*dt;
    c.vy += (dy/d)*1.5*dt;
  }
  const maxV = 18;
  c.vx = clamp(c.vx,-maxV,maxV);
  c.vy = clamp(c.vy,-maxV*0.6,maxV*0.6);
  c.x += c.vx*dt; c.y += c.vy*dt;
  if(c.x<-20) c.x=W+20; if(c.x>W+20) c.x=-20;
  c.y = clamp(c.y, H*0.08, H*0.92);
}
function drawCreature(c){
  ctx.save();
  ctx.translate(c.x,c.y);
  const ang = Math.atan2(c.vy,c.vx);
  ctx.rotate(ang);
  const glow = 0.35+0.25*Math.sin(state.time*2+c.phase);
  ctx.fillStyle = hsla(c.hue,70,75,0.5+glow*0.3);
  if(c.type==='fish'){
    ctx.beginPath();
    ctx.ellipse(0,0,c.size*1.6,c.size*0.7,0,0,TAU);
    ctx.fill();
  } else if(c.type==='jelly'){
    ctx.beginPath();
    ctx.ellipse(0,0,c.size,c.size*0.8,0,0,TAU);
    ctx.fill();
    for(let i=-1;i<=1;i++){
      ctx.beginPath();
      ctx.strokeStyle = hsla(c.hue,60,80,0.3);
      ctx.lineWidth=1;
      ctx.moveTo(i*c.size*0.5,c.size*0.6);
      ctx.lineTo(i*c.size*0.5+Math.sin(state.time*2+i)*3, c.size*1.6);
      ctx.stroke();
    }
  } else if(c.type==='ray'){
    ctx.beginPath();
    ctx.moveTo(c.size*1.4,0);
    ctx.quadraticCurveTo(0,-c.size*1.1,-c.size*1.4,0);
    ctx.quadraticCurveTo(0,c.size*1.1,c.size*1.4,0);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(0,0,c.size*0.6,0,TAU);
    ctx.fill();
  }
  ctx.restore();
}

/* =====================================================================
   MARINE SNOW PARTICLES
===================================================================== */
function spawnSnow(){
  return {
    x: Math.random()*W, y: Math.random()*H,
    r: 0.6+Math.random()*1.4,
    vy: 4+Math.random()*8,
    drift: (Math.random()-0.5)*6,
    alpha: 0.1+Math.random()*0.25
  };
}
function initSnow(){
  const count = Math.min(70, Math.floor((W*H)/22000));
  for(let i=0;i<count;i++) state.snow.push(spawnSnow());
}

/* =====================================================================
   AMBIENT EVENTS
===================================================================== */
let lightBeam=null, shadowPass=null, currentBend=0, snowBoost=0;
function triggerAmbientEvent(){
  const kinds = ['fish_school','shadow','snow_burst','current_bend','light_beam'];
  const kind = pick(Math.random, kinds);
  if(kind==='fish_school'){
    const n = 5+Math.floor(Math.random()*5);
    const startY = H*0.2+Math.random()*H*0.4;
    const dir = Math.random()<0.5?1:-1;
    for(let i=0;i<n;i++){
      state.creatures.push({
        id: state.nextId++, type:'fish', temp:true,
        x: dir>0?-30-i*14:W+30+i*14, y: startY+Math.random()*20,
        vx: dir*(30+Math.random()*10), vy:(Math.random()-0.5)*2,
        phase: Math.random()*TAU, hue:190+Math.random()*40, size:3, wanderT:0
      });
    }
    showBanner('a school drifts by');
  } else if(kind==='shadow'){
    shadowPass = { x:-200, t:0 };
    showBanner('a shadow passes above');
  } else if(kind==='snow_burst'){
    snowBoost = 1;
    setTimeout(()=>{snowBoost=0;}, 12000);
  } else if(kind==='current_bend'){
    currentBend = (Math.random()<0.5?-1:1)*1.4;
    showBanner('the current bends the reef');
    setTimeout(()=>{currentBend=0;}, 8000);
  } else if(kind==='light_beam'){
    lightBeam = { x: W*0.2+Math.random()*W*0.6, t:0, life:14 };
    showBanner('a beam reaches the seabed');
  }
}
function showBanner(text){
  const el = document.getElementById('event-banner');
  el.textContent = text.toUpperCase();
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(()=>el.classList.remove('show'), 4200);
}

/* =====================================================================
   AUDIO (WebAudio, optional, lazy init)
===================================================================== */
let audioCtx=null, hum=null, humGain=null, noiseGain=null;
function initAudio(){
  if(audioCtx) return;
  try{
    audioCtx = new (window.AudioContext||window.webkitAudioContext)();
    hum = audioCtx.createOscillator();
    hum.type='sine'; hum.frequency.value=52;
    humGain = audioCtx.createGain(); humGain.gain.value=0.0;
    hum.connect(humGain); humGain.connect(audioCtx.destination);
    hum.start();

    const bufferSize = 2*audioCtx.sampleRate;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for(let i=0;i<bufferSize;i++) data[i]=(Math.random()*2-1)*0.5;
    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer; noise.loop=true;
    const filter = audioCtx.createBiquadFilter();
    filter.type='lowpass'; filter.frequency.value=300;
    noiseGain = audioCtx.createGain(); noiseGain.gain.value=0.0;
    noise.connect(filter); filter.connect(noiseGain); noiseGain.connect(audioCtx.destination);
    noise.start();
  }catch(e){ /* audio unavailable */ }
}
function setAudioOn(on){
  if(!audioCtx && on) initAudio();
  if(!audioCtx) return;
  const target = on?1:0;
  humGain.gain.linearRampToValueAtTime(on?0.02:0, audioCtx.currentTime+1.2);
  noiseGain.gain.linearRampToValueAtTime(on?0.015:0, audioCtx.currentTime+1.2);
}
function playChime(){
  if(!audioCtx || !state.sound) return;
  const o1 = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o1.type='sine'; o1.frequency.value=440+Math.random()*220;
  g.gain.value=0.0001;
  o1.connect(g); g.connect(audioCtx.destination);
  const t = audioCtx.currentTime;
  g.gain.exponentialRampToValueAtTime(0.05, t+0.4);
  o1.frequency.exponentialRampToValueAtTime(o1.frequency.value*1.8, t+1.6);
  g.gain.exponentialRampToValueAtTime(0.0001, t+2.2);
  o1.start(t); o1.stop(t+2.3);
}

/* =====================================================================
   PLANTING / TENDING / CROSSBREEDING
===================================================================== */
function plantAt(x,y){
  if(state.organisms.length>=70){ showBanner('the reef is full'); return; }
  const o = createOrganism(state.selectedSpecies, x, y);
  state.organisms.push(o);
  spawnPlacementBurst(x,y);
  if(!state.firstPlantDone){
    state.firstPlantDone = true;
    document.getElementById('hint').classList.add('gone');
  }
}

let bursts=[];
function spawnPlacementBurst(x,y){
  for(let i=0;i<10;i++){
    bursts.push({x,y,vx:(Math.random()-0.5)*30,vy:(Math.random()-0.5)*30-10,life:1,r:2+Math.random()*2});
  }
}
function updateBursts(dt){
  bursts.forEach(b=>{ b.x+=b.vx*dt; b.y+=b.vy*dt; b.life-=dt*1.4; });
  bursts = bursts.filter(b=>b.life>0);
}
function drawBursts(){
  bursts.forEach(b=>{
    ctx.beginPath();
    ctx.fillStyle = hsla(190,60,85,clamp(b.life,0,1)*0.5);
    ctx.arc(b.x,b.y,b.r,0,TAU);
    ctx.fill();
  });
}

function findOrganismAt(x,y){
  let best=null, bd=30*30;
  for(const o of state.organisms){
    const dx=o.x-x, dy=(o.y-30)-y;
    const d=dx*dx+dy*dy;
    if(d<bd){ bd=d; best=o; }
  }
  return best;
}

function selectOrganism(o){
  if(state.selectedOrganism) state.selectedOrganism.selected=false;
  state.selectedOrganism = o;
  if(o){
    o.selected=true;
    const panel = document.getElementById('inspect-panel');
    panel.classList.remove('hidden');
    const nameEl = document.getElementById('inspect-name');
    const detailEl = document.getElementById('inspect-detail');
    if(o.rare){ nameEl.textContent = o.rare.toUpperCase(); }
    else if(o.isHybrid){ nameEl.textContent = (o.hybridLabel||'hybrid form').toUpperCase(); }
    else nameEl.textContent = SPECIES[o.species].name.toUpperCase();
    const pct = Math.round(clamp(o.growth,0,1)*100);
    detailEl.textContent = pct<100 ? `growing · ${pct}%` : 'mature';
  } else {
    document.getElementById('inspect-panel').classList.add('hidden');
  }
}

function nurtureSelected(){
  const o = state.selectedOrganism;
  if(!o) return;
  o.growth = clamp(o.growth + 0.06, 0, 1);
  o.bloomPulse = 1;
}
function removeSelected(){
  const o = state.selectedOrganism;
  if(!o) return;
  state.organisms = state.organisms.filter(x=>x!==o);
  selectOrganism(null);
}
function clearReef(){
  state.organisms = [];
  state.creatures = [];
  selectOrganism(null);
}

function tryCrossbreed(dt){
  state.lastCross += dt;
  if(state.lastCross < 4) return;
  state.lastCross = 0;
  const mature = state.organisms.filter(o=>o.growth>=0.6 && !o.rare && !o.isHybrid);
  for(let i=0;i<mature.length;i++){
    for(let j=i+1;j<mature.length;j++){
      const a=mature[i], b=mature[j];
      if(a.species===b.species) continue;
      const dx=a.x-b.x, dy=a.y-b.y;
      const dist = Math.sqrt(dx*dx+dy*dy);
      if(dist>110) continue;
      const key = `${Math.min(a.id,b.id)}-${Math.max(a.id,b.id)}`;
      const last = state.bredPairs.get(key)||0;
      if(Date.now()-last < 90000) continue;
      state.bredPairs.set(key, Date.now());
      if(Math.random() < 0.16){
        spawnHybrid(a,b);
        return;
      }
    }
  }
}

function spawnHybrid(a,b){
  if(state.organisms.length>=70) return;
  const mx = (a.x+b.x)/2, my=(a.y+b.y)/2;
  const rareRoll = Math.random()<0.1;
  a.bloomPulse=1; b.bloomPulse=1;
  if(rareRoll){
    const def = pick(Math.random, RARE_FORMS);
    const o = createOrganism(def.base, mx, my, { rare: def.name, growth:0.15 });
    state.organisms.push(o);
    showBanner('NEW FORM · '+def.name);
    playChime();
    return;
  }
  const key = pairKey(a.species,b.species);
  const rule = HYBRID_RULES[key];
  const hue = rule ? rule.hue : Math.round((SPECIES[a.species].hue+SPECIES[b.species].hue)/2);
  const label = rule ? rule.name : 'hybrid bloom';
  // hybrid renders using one parent's structure, blended hue, small scale bonus
  const baseSpecies = Math.random()<0.5? a.species : b.species;
  const o = createOrganism(baseSpecies, mx, my, { isHybrid:true, hybridHue:hue, hybridLabel:label, growth:0.15 });
  state.organisms.push(o);
  showBanner('NEW FORM');
  playChime();
}

/* =====================================================================
   AUTO GROW
===================================================================== */
function updateAutoGrow(dt){
  if(!state.autoGrow) return;
  state.lastAutoGrow += dt;
  const interval = 30 + Math.random()*15;
  if(state.lastAutoGrow < interval) return;
  state.lastAutoGrow = 0;
  if(state.organisms.length>=60) return;
  const sp = pick(Math.random, SPECIES_LIST).id;
  let x,y;
  if(state.organisms.length===0){
    x = W*0.5; y = H*0.72;
  } else {
    const near = pick(Math.random, state.organisms);
    x = clamp(near.x + (Math.random()-0.5)*140, 30, W-30);
    y = clamp(near.y + (Math.random()-0.5)*40, H*0.55, H*0.86);
  }
  const o = createOrganism(sp,x,y);
  state.organisms.push(o);
}

/* =====================================================================
   INPUT
===================================================================== */
let pointerDownInfo=null;
canvas.addEventListener('pointerdown', (e)=>{
  pointerDownInfo = {x:e.clientX,y:e.clientY,t:Date.now()};
});
canvas.addEventListener('pointerup', (e)=>{
  if(!pointerDownInfo) return;
  const dx = e.clientX-pointerDownInfo.x, dy = e.clientY-pointerDownInfo.y;
  const moved = Math.sqrt(dx*dx+dy*dy);
  pointerDownInfo=null;
  if(moved>12) return; // treat as drag/scroll gesture, ignore
  const x = e.clientX, y = e.clientY;
  const hit = findOrganismAt(x,y);
  if(hit){
    selectOrganism(hit);
  } else if(y > H*0.35){
    plantAt(x,y);
    selectOrganism(null);
  }
});

/* =====================================================================
   UI WIRING
===================================================================== */
const speciesRow = document.getElementById('species-row');
SPECIES_LIST.forEach(sp=>{
  const btn = document.createElement('button');
  btn.className = 'species-btn'+(sp.id===state.selectedSpecies?' selected':'');
  btn.innerHTML = sp.icon();
  btn.title = sp.name;
  btn.setAttribute('role','option');
  btn.addEventListener('click', ()=>{
    state.selectedSpecies = sp.id;
    [...speciesRow.children].forEach(c=>c.classList.remove('selected'));
    btn.classList.add('selected');
  });
  speciesRow.appendChild(btn);
});

document.getElementById('btn-nurture').addEventListener('click', nurtureSelected);
document.getElementById('btn-remove').addEventListener('click', removeSelected);
document.getElementById('btn-clear').addEventListener('click', ()=>{
  if(state.organisms.length===0) return;
  clearReef();
});
const uiLayer = document.getElementById('ui-layer');
document.getElementById('btn-hideui').addEventListener('click', ()=>{
  state.zen = true;
  uiLayer.classList.add('zen');
  document.getElementById('btn-restore').classList.remove('hidden');
});
document.getElementById('btn-restore').addEventListener('click', ()=>{
  state.zen = false;
  uiLayer.classList.remove('zen');
  document.getElementById('btn-restore').classList.add('hidden');
});
const btnSound = document.getElementById('btn-sound');
btnSound.addEventListener('click', ()=>{
  state.sound = !state.sound;
  btnSound.setAttribute('aria-pressed', state.sound);
  setAudioOn(state.sound);
});
const btnMotion = document.getElementById('btn-motion');
btnMotion.addEventListener('click', ()=>{
  state.reducedMotion = !state.reducedMotion;
  btnMotion.setAttribute('aria-pressed', state.reducedMotion);
});
const btnAuto = document.getElementById('btn-autogrow');
btnAuto.addEventListener('click', ()=>{
  state.autoGrow = !state.autoGrow;
  btnAuto.setAttribute('aria-pressed', state.autoGrow);
});
document.getElementById('btn-save-image').addEventListener('click', saveImage);

function saveImage(){
  canvas.toBlob(blob=>{
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'impossible-reef.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 4000);
  }, 'image/png');
}

if(state.reducedMotion) btnMotion.setAttribute('aria-pressed','true');

/* =====================================================================
   PERSISTENCE
===================================================================== */
const SAVE_KEY = 'impossible_reef_save_v1';
function saveState(){
  try{
    const data = {
      v:1,
      organisms: state.organisms.map(o=>({
        species:o.species, x:o.x, y:o.y, seed:o.seed, growth:o.growth,
        isHybrid:o.isHybrid, hybridHue:o.hybridHue, hybridLabel:o.hybridLabel,
        rare:o.rare, createdAt:o.createdAt
      })),
      prefs:{ sound:state.sound, reducedMotion:state.reducedMotion, autoGrow:state.autoGrow, selectedSpecies:state.selectedSpecies },
      moodElapsed: (Date.now()-state.moodStart) % (MOOD_DURATION*1000*MOOD_ORDER.length),
      firstPlantDone: state.firstPlantDone
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  }catch(e){ /* storage unavailable */ }
}
function loadState(){
  try{
    const raw = localStorage.getItem(SAVE_KEY);
    if(!raw) return;
    const data = JSON.parse(raw);
    if(!data || !data.organisms) return;
    data.organisms.forEach(so=>{
      const o = createOrganism(so.species, so.x, so.y, {
        seed:so.seed, growth:so.growth, isHybrid:so.isHybrid,
        hybridHue:so.hybridHue, hybridLabel:so.hybridLabel, rare:so.rare, createdAt:so.createdAt
      });
      state.organisms.push(o);
    });
    if(data.prefs){
      state.sound = !!data.prefs.sound;
      state.reducedMotion = !!data.prefs.reducedMotion;
      state.autoGrow = !!data.prefs.autoGrow;
      if(data.prefs.selectedSpecies && SPECIES[data.prefs.selectedSpecies]) state.selectedSpecies = data.prefs.selectedSpecies;
    }
    if(typeof data.moodElapsed==='number') state.moodStart = Date.now()-data.moodElapsed;
    if(data.firstPlantDone){ state.firstPlantDone=true; document.getElementById('hint').classList.add('gone'); }
  }catch(e){ /* corrupt save, ignore */ }
}
loadState();
// reflect loaded prefs into UI
btnSound.setAttribute('aria-pressed', state.sound);
btnMotion.setAttribute('aria-pressed', state.reducedMotion);
btnAuto.setAttribute('aria-pressed', state.autoGrow);
[...speciesRow.children].forEach((c,i)=>c.classList.toggle('selected', SPECIES_LIST[i].id===state.selectedSpecies));
if(state.sound) setAudioOn(true);

setInterval(saveState, 6000);
window.addEventListener('visibilitychange', ()=>{ if(document.hidden) saveState(); });
window.addEventListener('pagehide', saveState);

/* =====================================================================
   BACKGROUND RENDER
===================================================================== */
function drawBackground(mood){
  const g = ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0, `rgb(${mood.top.join(',')})`);
  g.addColorStop(1, `rgb(${mood.bottom.join(',')})`);
  ctx.fillStyle = g;
  ctx.fillRect(0,0,W,H);

  // soft rays from above
  ctx.save();
  ctx.globalAlpha = mood.rayAlpha;
  for(let i=0;i<3;i++){
    const rx = W*(0.2+i*0.3) + Math.sin(state.time*0.05+i)*40;
    const rg = ctx.createLinearGradient(rx,0,rx+80,H*0.7);
    rg.addColorStop(0,'rgba(200,240,255,0.5)');
    rg.addColorStop(1,'rgba(200,240,255,0)');
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.moveTo(rx-40,0); ctx.lineTo(rx+90,0); ctx.lineTo(rx+40,H*0.75); ctx.lineTo(rx-70,H*0.75);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();

  // seabed silhouette
  ctx.save();
  ctx.fillStyle = 'rgba(1,4,8,0.9)';
  ctx.beginPath();
  ctx.moveTo(0,H);
  ctx.lineTo(0,H*0.9);
  for(let x=0;x<=W;x+=40){
    const y = H*0.9 + Math.sin(x*0.01+7)*6;
    ctx.lineTo(x,y);
  }
  ctx.lineTo(W,H);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawLightBeam(dt){
  if(!lightBeam) return;
  lightBeam.t += dt;
  const a = Math.sin((lightBeam.t/lightBeam.life)*Math.PI) * 0.18;
  ctx.save();
  ctx.globalAlpha = Math.max(0,a);
  const rg = ctx.createLinearGradient(lightBeam.x,0,lightBeam.x,H*0.8);
  rg.addColorStop(0,'rgba(220,245,255,0.8)');
  rg.addColorStop(1,'rgba(220,245,255,0)');
  ctx.fillStyle = rg;
  ctx.beginPath();
  ctx.moveTo(lightBeam.x-50,0); ctx.lineTo(lightBeam.x+60,0);
  ctx.lineTo(lightBeam.x+20,H*0.8); ctx.lineTo(lightBeam.x-90,H*0.8);
  ctx.closePath(); ctx.fill();
  ctx.restore();
  if(lightBeam.t>lightBeam.life) lightBeam=null;
}
function drawShadowPass(dt){
  if(!shadowPass) return;
  shadowPass.t += dt;
  shadowPass.x = -300 + (W+600)*(shadowPass.t/10);
  ctx.save();
  ctx.globalAlpha = 0.12;
  const rg = ctx.createRadialGradient(shadowPass.x,H*0.1,10,shadowPass.x,H*0.1,260);
  rg.addColorStop(0,'rgba(0,0,0,0.8)');
  rg.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle = rg;
  ctx.fillRect(0,0,W,H*0.4);
  ctx.restore();
  if(shadowPass.t>10) shadowPass=null;
}

/* =====================================================================
   MAIN LOOP
===================================================================== */
let lastT = performance.now();
initSnow();

function frame(now){
  let dt = (now-lastT)/1000;
  lastT = now;
  dt = Math.min(dt, 0.05);
  state.time += dt;

  // current drift
  state.currentTarget += (Math.random()-0.5)*0.02*dt*60;
  state.currentTarget = clamp(state.currentTarget,-1,1);
  state.currentAngle = lerp(state.currentAngle, state.currentTarget*0.3+currentBend*0.5, 0.02);

  // organism growth
  for(const o of state.organisms){
    const sp = SPECIES[o.species];
    const mt = sp ? sp.matureTime : 75;
    o.growth = clamp(o.growth + dt/mt, 0, 1);
    o.age += dt;
    if(o.bloomPulse>0) o.bloomPulse = Math.max(0, o.bloomPulse-dt*0.6);
  }

  tryCrossbreed(dt);
  updateAutoGrow(dt);
  updateBursts(dt);

  // creatures
  const matureCount = state.organisms.filter(o=>o.growth>0.5).length;
  const target = Math.min(22, Math.floor(matureCount/1.4));
  if(state.creatures.filter(c=>!c.temp).length < target && Math.random()<0.02){
    state.creatures.push(spawnCreature());
  }
  state.creatures.forEach(c=>updateCreature(c,dt));
  state.creatures = state.creatures.filter(c=> !(c.temp && (c.x<-60||c.x>W+60)) );

  // snow
  const snowMul = 1+snowBoost*1.6;
  state.snow.forEach(s=>{
    s.y += s.vy*dt*(state.reducedMotion?0.5:1);
    s.x += (s.drift + state.currentAngle*8)*dt;
    if(s.y>H){ s.y=-5; s.x=Math.random()*W; }
    if(s.x<0) s.x=W; if(s.x>W) s.x=0;
  });

  // ambient events
  state.lastAmbient += dt;
  const ambientInterval = 45+Math.random()*35;
  if(state.lastAmbient>ambientInterval){
    state.lastAmbient=0;
    triggerAmbientEvent();
  }

  // ---- RENDER ----
  const mood = blendMoodColors();
  document.getElementById('mood-label').textContent = mood.label;
  drawBackground(mood);

  // marine snow (behind organisms, subtle)
  ctx.save();
  state.snow.forEach(s=>{
    ctx.beginPath();
    ctx.fillStyle = `rgba(200,230,240,${s.alpha*snowMul*0.7})`;
    ctx.arc(s.x,s.y,s.r,0,TAU);
    ctx.fill();
  });
  ctx.restore();

  drawShadowPass(dt);

  // organisms sorted by y (depth ordering)
  const sorted = [...state.organisms].sort((a,b)=>a.y-b.y);
  sorted.forEach(o=>drawOrganism(o, mood));

  drawBursts();

  // creatures
  state.creatures.forEach(drawCreature);

  drawLightBeam(dt);

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

})();
