import { CATALOG, placementError, validateBoard } from './gadgets.js';
export const copy = value => structuredClone(value);
export class Editor {
  constructor(board) { this.initial=copy(board); this.board=copy(board); this.history=[]; this.future=[]; this.sequence=0; }
  get count(){return this.board.objects.filter(o=>!o.locked).length;}
  remaining(type){return Math.max(0,(this.board.inventory[type]||0)-this.board.objects.filter(o=>!o.locked&&o.type===type).length);}
  act(action){
    const before=copy(this.board), b=this.board, o=b.objects.find(o=>o.id===action.id);
    let message='';
    const fail=m=>{this.board=before;return {ok:false,message:m};};
    if(['move','rotate','delete','configure'].includes(action.type)&&(!o||o.locked)) return fail('This gadget is fixed.');
    switch(action.type){
      case 'place': {
        const s=copy(action.object); if(!s||!CATALOG[s.type])return fail('Choose a gadget.');
        s.id=s.id||`toy-${++this.sequence}`; s.angle??=0;s.locked=false;
        if(!this.remaining(s.type))return fail('No more of this gadget available.');
        if(b.objects.length>=b.maxObjects)return fail('The workshop is full.');
        if(b.objects.some(o=>o.id===s.id)||b.platforms.some(o=>o.id===s.id))return fail('Gadget name already exists.');
        message=placementError(b,s);if(message)return fail(message);b.objects.push(s);break;
      }
      case 'move':o.x=action.x;o.y=action.y;message=placementError(b,o,o.id);break;
      case 'rotate':o.angle=action.angle;message=placementError(b,o,o.id);break;
      case 'configure':o.settings={...o.settings,...copy(action.settings)};break;
      case 'delete':
        if(b.id!=='sandbox'&&b.objectives.required.includes(o.id))return fail('This objective must remain.');
        b.objects=b.objects.filter(s=>s.id!==o.id);b.links=b.links.filter(l=>l.from!==o.id&&l.to!==o.id);
        if(b.start?.id===o.id)b.start=null;b.objectives.required=b.objectives.required.filter(id=>id!==o.id);break;
      case 'link':
        if(!['gear','switch'].includes(b.objects.find(s=>s.id===action.from)?.type)||!['gear','spring'].includes(b.objects.find(s=>s.id===action.to)?.type)||action.from===action.to)return fail('Connect a gear or switch to a gear or spring.');
        if(b.links.some(l=>l.from===action.from&&l.to===action.to))return fail('Already connected.');
        b.links.push({from:action.from,to:action.to});break;
      case 'unlink':b.links=b.links.filter(l=>!(l.from===action.from&&l.to===action.to));break;
      case 'start':
        if(!['domino','marble','gear','spring'].includes(o?.type))return fail('Start with a domino, marble, gear or spring.');
        if(b.id!=='sandbox'&&b.start?.id!==o.id)return fail('This puzzle has a fixed starting trigger.');b.start={id:o.id};break;
      default:return fail('Unknown edit.');
    }
    if(message)return fail(message);
    // Incomplete builds may temporarily have no start. Full data validation still applies.
    const check=validateBoard({...b,id:'sandbox'});if(!check.ok)return fail(check.errors.join(' '));
    this.history.push(before);if(this.history.length>100)this.history.shift();this.future=[];return {ok:true,message:'Build updated.'};
  }
  undo(){if(!this.history.length)return false;this.future.push(copy(this.board));this.board=this.history.pop();return true;}
  redo(){if(!this.future.length)return false;this.history.push(copy(this.board));this.board=this.future.pop();return true;}
  reset(){this.history.push(copy(this.board));this.board=copy(this.initial);this.future=[];}
}
