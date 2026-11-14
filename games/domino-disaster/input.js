export class Input {
  constructor(canvas,renderer,hooks){this.canvas=canvas;this.renderer=renderer;this.hooks=hooks;this.points=new Map();this.drag=null;this.ghost=null;this.tool=null;
    canvas.addEventListener('pointerdown',e=>this.down(e));canvas.addEventListener('pointermove',e=>this.move(e));canvas.addEventListener('pointerup',e=>this.up(e));canvas.addEventListener('pointercancel',e=>{this.points.delete(e.pointerId);this.drag=null;this.ghost=null;});
    canvas.addEventListener('wheel',e=>{e.preventDefault();renderer.zoomAt(Math.exp(-e.deltaY*.001),e.clientX,e.clientY);},{passive:false});
    document.addEventListener('keydown',e=>{if(document.querySelector('dialog[open]')||/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;
      const key=e.key.toLowerCase();if(key===' '&&/BUTTON|A/.test(e.target.tagName))return;if((e.ctrlKey||e.metaKey)&&key==='z'){e.preventDefault();hooks.history(e.shiftKey?'redo':'undo');}
      else if(key==='delete'||key==='backspace'){e.preventDefault();hooks.remove();}else if(['q','e','r'].includes(key))hooks.rotate(key==='q'?-5:5);else if(key===' '){e.preventDefault();hooks.push();}else if(key==='p')hooks.pause();else if(key==='escape'){this.tool=null;this.ghost=null;hooks.select(null);}
    });
  }
  down(e){if(document.querySelector('dialog[open]'))return;e.preventDefault();this.canvas.setPointerCapture(e.pointerId);this.points.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(this.points.size===2){this.drag=null;this.ghost=null;this.pinch=this.distance();return;}
    const w=this.renderer.world(e.clientX,e.clientY);const o=this.renderer.hit(e.clientX,e.clientY,this.hooks.board());
    if(this.hooks.editable()&&this.tool){this.drag={kind:'place',start:w};this.ghost=this.hooks.spec(this.tool,w);}
    else if(o){this.hooks.select(o.id);if(this.hooks.editable()&&!o.locked)this.drag={kind:'move',object:structuredClone(o),dx:o.x-w.x,dy:o.y-w.y};}
    else{this.hooks.select(null);this.drag={kind:'pan',x:e.clientX,y:e.clientY};}
  }
  distance(){const [a,b]=[...this.points.values()];return Math.hypot(a.x-b.x,a.y-b.y);}
  move(e){if(!this.points.has(e.pointerId)){if(this.tool&&this.hooks.editable())this.ghost=this.hooks.spec(this.tool,this.renderer.world(e.clientX,e.clientY));return;}
    this.points.set(e.pointerId,{x:e.clientX,y:e.clientY});if(this.points.size===2){const d=this.distance(),p=[...this.points.values()];this.renderer.zoomAt(d/this.pinch,(p[0].x+p[1].x)/2,(p[0].y+p[1].y)/2);this.pinch=d;return;}
    if(!this.drag)return;const w=this.renderer.world(e.clientX,e.clientY);
    if(this.drag.kind==='pan'){this.renderer.pan(e.clientX-this.drag.x,e.clientY-this.drag.y);this.drag.x=e.clientX;this.drag.y=e.clientY;}
    else if(this.drag.kind==='place')this.ghost=this.hooks.spec(this.tool,w);
    else this.ghost={...this.drag.object,x:Math.round(w.x+this.drag.dx),y:Math.round(w.y+this.drag.dy)};
  }
  up(e){this.points.delete(e.pointerId);if(this.points.size){this.drag=null;this.ghost=null;return;}
    if(this.drag&&this.ghost){if(this.drag.kind==='place')this.hooks.act({type:'place',object:this.ghost});else if(this.drag.kind==='move')this.hooks.act({type:'move',id:this.drag.object.id,x:this.ghost.x,y:this.ghost.y});}
    this.drag=null;this.ghost=null;
  }
}
