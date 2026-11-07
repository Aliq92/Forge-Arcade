(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ParticleLabMaterials=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function MaterialWorld(random=Math.random){
// ---------- material definitions ----------
  var EMPTY=0, SAND=1, WATER=2, OIL=3, STONE=4, WOOD=5, FIRE=6, SMOKE=7, ACID=8;

  var MATERIALS = [
    { id: SAND,  name:"Sand",  color:[212,168,86] },
    { id: WATER, name:"Water", color:[58,120,209] },
    { id: OIL,   name:"Oil",   color:[70,55,26] },
    { id: STONE, name:"Stone", color:[102,104,116] },
    { id: WOOD,  name:"Wood",  color:[122,79,42] },
    { id: FIRE,  name:"Fire",  color:[233,90,24] },
    { id: ACID,  name:"Acid",  color:[152,222,73] },
    { id: EMPTY, name:"Erase", color:[30,34,42] }
  ];

  var BG = [10,13,18];
  var SMOKE_COLOR = [120,122,132];
  var FIRE_HOT = [255,224,120];
  var FIRE_COOL = [220,50,16];

  var FIRE_LIFE_MIN=22, FIRE_LIFE_MAX=42;
  var SMOKE_LIFE_MIN=60, SMOKE_LIFE_MAX=120;

  // ---------- grid setup ----------
  var COLS = 200, ROWS = 120; // fixed internal resolution (5:3 aspect)
  var len = COLS*ROWS;
  var grid = new Uint8Array(len);
  var extra = new Uint16Array(len);
  var variance = new Int8Array(len);
  var moved = new Uint8Array(len);

  for (var vi=0; vi<len; vi++){
    variance[vi] = (random()*3|0) - 1; // -1,0,1
  }

  function idx(x,y){ return y*COLS+x; }

  // returns -1 for solid side/bottom walls, -2 for open top (void)
  function get(x,y){
    if (x<0 || x>=COLS || y>=ROWS) return -1;
    if (y<0) return -2;
    return grid[idx(x,y)];
  }

  function setCell(i, type, extraVal){
    grid[i] = type;
    extra[i] = extraVal || 0;
  }

  function swap(i,j){
    var t = grid[i]; grid[i]=grid[j]; grid[j]=t;
    var e = extra[i]; extra[i]=extra[j]; extra[j]=e;
    moved[j] = 1;
  }

  function randSign(){ return random()<0.5 ? -1 : 1; }

  // ---------- physics rules ----------
  function updateSand(x,y,i){
    var below = get(x,y+1);
    if (below===EMPTY || below===WATER || below===OIL){
      swap(i, idx(x,y+1)); return;
    }
    var d = randSign();
    var order = [d,-d];
    for (var k=0;k<2;k++){
      var nx=x+order[k], ny=y+1;
      var nb = get(nx,ny);
      if (nb===EMPTY || nb===WATER || nb===OIL){
        swap(i, idx(nx,ny)); return;
      }
    }
  }

  function updateLiquid(x,y,i,selfType){
    var below = get(x,y+1);
    if (below===EMPTY){ swap(i, idx(x,y+1)); return; }
    if (selfType===WATER && below===OIL){ swap(i, idx(x,y+1)); return; }
    if (selfType===WATER && below===ACID){ swap(i, idx(x,y+1)); return; }
    if (selfType===ACID){
      // acid dissolves sand, wood, and oil; water neutralizes it
      if (below===SAND || below===WOOD || below===OIL){
        if (random()<0.08){
          setCell(idx(x,y+1), EMPTY, 0);
          swap(i, idx(x,y+1));
        }
        return;
      }
      if (below===WATER){
        setCell(i, EMPTY, 0); moved[i]=1; return;
      }
    }

    var d = randSign();
    var order = [d,-d];
    for (var k=0;k<2;k++){
      var nx=x+order[k], ny=y+1;
      if (get(nx,ny)===EMPTY){ swap(i, idx(nx,ny)); return; }
    }
    for (var k2=0;k2<2;k2++){
      var nx2=x+order[k2];
      if (get(nx2,y)===EMPTY){ swap(i, idx(nx2,y)); return; }
    }
  }

  var NEIGH8 = [[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]];

  function updateWood(x,y,i){
    for (var n=0;n<8;n++){
      var nx=x+NEIGH8[n][0], ny=y+NEIGH8[n][1];
      if (get(nx,ny)===FIRE && random()<0.028){
        setCell(i, FIRE, FIRE_LIFE_MIN + (random()*(FIRE_LIFE_MAX-FIRE_LIFE_MIN)|0));
        return;
      }
    }
  }

  function updateFire(x,y,i){
    // water nearby extinguishes fire fast
    for (var n=0;n<8;n++){
      var nx=x+NEIGH8[n][0], ny=y+NEIGH8[n][1];
      var nt = get(nx,ny);
      if (nt===WATER){ extra[i] = Math.min(extra[i], 3); break; }
    }

    extra[i]--;
    if (extra[i]<=0){
      if (random()<0.55){
        setCell(i, SMOKE, SMOKE_LIFE_MIN + (random()*(SMOKE_LIFE_MAX-SMOKE_LIFE_MIN)|0));
      } else {
        setCell(i, EMPTY, 0);
      }
      moved[i]=1;
      return;
    }

    // ignite flammable neighbors
    for (var n2=0;n2<8;n2++){
      var nx2=x+NEIGH8[n2][0], ny2=y+NEIGH8[n2][1];
      if (nx2<0||nx2>=COLS||ny2<0||ny2>=ROWS) continue;
      var ni = idx(nx2,ny2);
      var nt2 = grid[ni];
      if (nt2===OIL && random()<0.16){
        setCell(ni, FIRE, FIRE_LIFE_MIN + (random()*(FIRE_LIFE_MAX-FIRE_LIFE_MIN)|0));
      } else if (nt2===WOOD && random()<0.03){
        setCell(ni, FIRE, FIRE_LIFE_MIN + (random()*(FIRE_LIFE_MAX-FIRE_LIFE_MIN)|0));
      }
    }

    // flicker upward occasionally
    if (random()<0.35){
      var dx = randSign();
      var ny3 = y-1, nx3 = x+dx;
      if (get(nx3,ny3)===EMPTY){
        swap(i, idx(nx3,ny3));
      }
    }
  }

  function updateSmoke(x,y,i){
    extra[i]--;
    if (extra[i]<=0){ setCell(i, EMPTY, 0); moved[i]=1; return; }

    var above = get(x,y-1);
    if (above===-2){ setCell(i, EMPTY, 0); moved[i]=1; return; }
    if (above===EMPTY){ swap(i, idx(x,y-1)); return; }

    var d = randSign();
    var order=[d,-d];
    for (var k=0;k<2;k++){
      var nx=x+order[k], ny=y-1;
      if (get(nx,ny)===EMPTY){ swap(i, idx(nx,ny)); return; }
    }
  }

  function step(){
    moved.fill(0);
    for (var y=ROWS-1; y>=0; y--){
      var leftToRight = (y % 2 === 0);
      for (var xi=0; xi<COLS; xi++){
        var x = leftToRight ? xi : (COLS-1-xi);
        var i = idx(x,y);
        if (moved[i]) continue;
        var t = grid[i];
        if (t===EMPTY || t===STONE) continue;
        if (t===SAND) updateSand(x,y,i);
        else if (t===WATER) updateLiquid(x,y,i,WATER);
        else if (t===OIL) updateLiquid(x,y,i,OIL);
        else if (t===ACID) updateLiquid(x,y,i,ACID);
        else if (t===WOOD) updateWood(x,y,i);
        else if (t===FIRE) updateFire(x,y,i);
        else if (t===SMOKE) updateSmoke(x,y,i);
      }
    }
  }


var currentMaterial=1,brushRadius=3;
function paintAt(gx, gy){
    var r = brushRadius;
    var r2 = r*r;
    for (var dy=-r; dy<=r; dy++){
      for (var dx=-r; dx<=r; dx++){
        if (dx*dx+dy*dy > r2) continue;
        var x = gx+dx, y = gy+dy;
        if (x<0||x>=COLS||y<0||y>=ROWS) continue;
        var i = idx(x,y);
        if (currentMaterial===EMPTY){
          setCell(i, EMPTY, 0);
        } else if (currentMaterial===FIRE){
          setCell(i, FIRE, FIRE_LIFE_MIN + (random()*(FIRE_LIFE_MAX-FIRE_LIFE_MIN)|0));
        } else {
          setCell(i, currentMaterial, 0);
        }
      }
    }
  }

  function paintLine(gx0,gy0,gx1,gy1){
    var dx = gx1-gx0, dy = gy1-gy0;
    var dist = Math.max(1, Math.round(Math.sqrt(dx*dx+dy*dy)));
    var steps = Math.min(dist, 64);
    for (var s=0; s<=steps; s++){
      var t = s/steps;
      paintAt(Math.round(gx0+dx*t), Math.round(gy0+dy*t));
    }
  }


// Read-only swept cell query for the new tracer layer; original material rules above are unchanged.
this.blocksSegment=(x0,y0,x1,y1,width,height)=>{
 const gx0=Math.max(0,Math.min(199,Math.floor(x0/width*200))),gy0=Math.max(0,Math.min(119,Math.floor(y0/height*120))),gx1=Math.max(0,Math.min(199,Math.floor(x1/width*200))),gy1=Math.max(0,Math.min(119,Math.floor(y1/height*120))),steps=Math.max(1,Math.abs(gx1-gx0),Math.abs(gy1-gy0));
 for(let k=0;k<=steps;k++){const x=Math.round(gx0+(gx1-gx0)*k/steps),y=Math.round(gy0+(gy1-gy0)*k/steps),type=grid[y*200+x];if(type===4||type===5)return true;}return false;
};
this.grid=grid;this.extra=extra;this.variance=variance;this.materials=MATERIALS;this.step=step;
this.paint=(x,y,type,r=3)=>{currentMaterial=type;brushRadius=r;paintAt(x,y);};
this.line=(a,b,c,d,type,r=3)=>{currentMaterial=type;brushRadius=r;paintLine(a,b,c,d);};
this.clear=()=>{grid.fill(0);extra.fill(0);};
this.counts=()=>{let total=0,counts=Array(9).fill(0);for(const t of grid){counts[t]++;if(t)total++;}return {total,counts};};
this.export=()=>({version:1,grid:[...grid],extra:[...extra]});
}
MaterialWorld.from=function(data){if(!data||data.version!==1||!Array.isArray(data.grid)||!Array.isArray(data.extra)||data.grid.length!==24000||data.extra.length!==24000||!data.grid.every(v=>Number.isInteger(v)&&v>=0&&v<=8)||!data.extra.every(v=>Number.isInteger(v)&&v>=0&&v<=65535))throw Error('Invalid material experiment');const w=new MaterialWorld();w.grid.set(data.grid);w.extra.set(data.extra);return w;};
return {MaterialWorld};
});
