import { validateBoard } from './gadgets.js';

const types = ['domino','marble','ramp','spring','gear','seesaw','switch','finish'];
const obj = (id,type,x,y,extra={}) => ({id,type,x,y,angle:0,locked:true,...extra});
const place = object => ({type:'place',object:{...object,locked:false}});
const floor = (y=550,w=1000,x=w/2,id='floor') => ({id,x,y:y+18,w,h:36,angle:0});
const base = (id,title,tutorial,hint) => ({version:1,id,title,width:1000,height:620,gravity:800,seed:id,platforms:[floor()],objects:[],links:[],start:null,inventory:Object.fromEntries(types.map(t=>[t,0])),forbidden:[],maxObjects:64,timeLimit:25,objectives:{required:['goal']},starBudget:{two:8,three:6},tutorial,hint,solution:[]});
const finish = (x,y=525) => obj('goal','finish',x,y,{settings:{accept:'any'}});
const domino = (id,x,y=522) => obj(id,'domino',x,y);
const marble = (id,x,y=540) => obj(id,'marble',x,y);
function addSolution(b,specs){ b.solution.push(...specs.map(place)); for(const s of specs)b.inventory[s.type]++; const n=specs.length;b.starBudget={two:n+2,three:n};return b; }

const one=base(1,'First Fall','Fill the break with dominoes. Place, PUSH, then return to Build to adjust.','A falling domino reaches farther than its width. Leave about 30 pixels between centers.');
one.objects=[domino('start',130),domino('end-a',250),domino('end-b',280),finish(320)];one.start={id:'start'};addSolution(one,[domino('bridge-a',160),domino('bridge-b',190),domino('bridge-c',220)]);

const two=base(2,'The Gap','A marble carries momentum across a break in the domino line.','Place the marble just beyond the starter. Keep its path to the next domino clear.');
two.objects=[domino('start',130),domino('end-a',225),domino('end-b',255),finish(300)];two.start={id:'start',impulse:{x:120,y:0}};addSolution(two,[marble('bridge-ball',170)]);

const three=base(3,'Rolling Start','Rotate a ramp so gravity guides the marble into the dominoes.','The gold ball needs a shallow downhill runway, then a clean landing.');
three.objects=[marble('start',155,330),domino('end-a',300),domino('end-b',330),domino('end-c',360),finish(405)];three.start={id:'start',impulse:{x:0,y:0}};addSolution(three,[obj('runway','ramp',185,355,{angle:.28})]);

const four=base(4,'Spring Fever','The spring fires once. Aim its arrow across the open gap.','Load the marble in front of the spring, and send the starting domino into its back.');
four.platforms=[floor(440,300,150,'launch-ledge'),floor(550,540,730,'landing-ledge')];four.objects=[domino('start',170,412),obj('launcher','spring',220,422,{angle:-.35,settings:{strength:520}}),finish(600)];four.start={id:'start'};addSolution(four,[marble('cargo',250,430)]);

const five=base(5,'Tipping Point','A falling marble rocks the seesaw. Use its slope to send the marble to the flag.','Land to the left of the pivot; the loaded end tips down and rolls the ball left.');
five.objects=[marble('start',450,290),obj('rocker','seesaw',490,430),finish(330,485)];five.start={id:'start',impulse:{x:0,y:0}};five.objectives.required=['rocker','goal'];addSolution(five,[obj('catch-ramp','ramp',395,495,{angle:-.25})]);

const six=base(6,'Gear Up','Link the two gears. Their opposite rotation trips the loaded spring.','Select a gear, choose its output, and connect it to the next gear. Springs need a nearby marble.');
six.objects=[obj('start','gear',135,430),obj('output-gear','gear',190,430),obj('launcher','spring',280,532,{settings:{strength:420}}),marble('cargo',310),finish(580)];six.links=[{from:'output-gear',to:'launcher'}];six.start={id:'start'};six.objectives.required=['output-gear','launcher','goal'];six.solution=[{type:'link',from:'start',to:'output-gear'}];six.starBudget={two:2,three:0};

const seven=base(7,'Double Trouble','Both lanes must strike their switches. The lower lane also reaches the finish.','One turning gear can feed two springs. Connect the missing output, then bridge the lower lane.');
seven.platforms=[floor(),floor(350,720,480,'upper-lane')];seven.objects=[obj('start','gear',100,260),obj('upper-spring','spring',200,332,{settings:{strength:380}}),marble('upper-ball',230,340),obj('upper-switch','switch',450,345),obj('lower-spring','spring',200,532,{settings:{strength:420}}),marble('lower-ball',230),obj('lower-switch','switch',450,545),finish(610)];seven.links=[{from:'start',to:'upper-spring'}];seven.start={id:'start'};seven.objectives.required=['upper-switch','lower-switch','goal'];seven.solution=[{type:'link',from:'start',to:'lower-spring'}];seven.starBudget={two:2,three:0};

const eight=base(8,'The Long Way Round','Build above the striped no-build zone, then drop the reaction onto the lower table.','Placement obstacles are striped. Use an elevated ramp to carry the marble over them.');
eight.objects=[marble('start',200,280),domino('end-a',520),domino('end-b',550),finish(595)];eight.start={id:'start',impulse:{x:100,y:0}};eight.forbidden=[{x:300,y:400,w:160,h:150}];addSolution(eight,[obj('overpass-a','ramp',250,315,{angle:.2}),obj('overpass-b','ramp',350,335,{angle:.2}),obj('overpass-c','ramp',450,355,{angle:.2})]);

const nine=base(9,'Marble Mayhem','Carry a marble through two spring stages and a ramp landing.','Catch the first marble on a ramp and return it to the floor switch. Load the second spring before PUSH.');
nine.objects=[obj('start','spring',130,332,{angle:0,settings:{strength:420}}),marble('first-ball',160,340),obj('handoff','switch',400,545),obj('second-spring','spring',740,532,{settings:{strength:420}}),finish(930)];nine.platforms=[floor(),floor(350,350,175,'upper-lane')];nine.links=[{from:'handoff',to:'second-spring'}];nine.start={id:'start'};nine.objectives.required=['handoff','second-spring','goal'];addSolution(nine,[marble('second-ball',770),obj('landing-ramp','ramp',500,420,{angle:.4})]);

const ten=base(10,'The Clockwork Room','The seesaw delivers a ball to a switch. A gear relay then releases the final spring.','Connect the switch to the relay. The flag waits for the seesaw, switch and gear to work.');
ten.objects=[marble('start',450,290),obj('rocker','seesaw',490,430),obj('handoff','switch',280,545),obj('relay','gear',600,430),obj('launcher','spring',680,532,{settings:{strength:360}}),marble('cargo',710),finish(880)];ten.links=[{from:'relay',to:'launcher'}];ten.start={id:'start',impulse:{x:0,y:0}};ten.objectives.required=['rocker','handoff','relay','launcher','goal'];ten.solution=[{type:'link',from:'handoff',to:'relay'}];addSolution(ten,[obj('catch-ramp','ramp',395,495,{angle:-.25})]);

const eleven=base(11,'Cascade City','Connect the city from its rooftop chain to the lower street.','The rooftop dominoes hit a switch. Its spring sends the street marble through the final chain.');
eleven.platforms=[floor(),floor(330,440,220,'rooftop')];eleven.objects=[domino('start',100,302),domino('roof-end',280,302),obj('roof-switch','switch',325,325),obj('launcher','spring',460,532,{settings:{strength:520}}),marble('cargo',490),domino('street-a',690),domino('street-b',716),domino('street-c',742),domino('street-d',768),finish(804)];eleven.links=[{from:'roof-switch',to:'launcher'}];eleven.start={id:'start'};eleven.objectives.required=['roof-switch','launcher','goal'];addSolution(eleven,[domino('roof-a',130,302),domino('roof-b',160,302),domino('roof-c',190,302),domino('roof-d',220,302),domino('roof-e',250,302)]);

const twelve=base(12,'Total Domino Disaster','Every mechanism has a job: falling marble, rocking seesaw, switch, gears, spring and final dominoes.','Guide the left-hand seesaw exit to the switch. Complete the relay and bridge the final domino break.');
twelve.platforms.push({id:'return-stop',x:10,y:500,w:20,h:100,angle:0});twelve.objects=[marble('start',250,220),obj('rocker','seesaw',290,360),obj('handoff','switch',50,545),obj('relay-a','gear',410,390),obj('relay-b','gear',465,390),obj('launcher','spring',560,532,{settings:{strength:540}}),marble('cargo',590),domino('street-a',760),domino('street-d',838),finish(877)];twelve.links=[{from:'handoff',to:'relay-a'},{from:'relay-b',to:'launcher'}];twelve.start={id:'start',impulse:{x:0,y:0}};twelve.objectives.required=['rocker','handoff','relay-a','relay-b','launcher','goal'];twelve.solution=[{type:'link',from:'relay-a',to:'relay-b'}];addSolution(twelve,[obj('catch-ramp','ramp',195,445,{angle:-.25}),domino('street-b',786),domino('street-c',812)]);

export const LEVELS=[one,two,three,four,five,six,seven,eight,nine,ten,eleven,twelve];
export function validateLevels(){ const errors=[];if(LEVELS.length!==12)errors.push('Expected twelve puzzles.');for(const b of LEVELS){const v=validateBoard(b);errors.push(...v.errors.map(e=>`${b.id}: ${e}`));if(!b.tutorial||!b.hint||!Array.isArray(b.solution)||!b.solution.length)errors.push(`${b.id}: missing teaching text or reference solution.`);}return {ok:errors.length===0,errors}; }
export function createSandbox(){const b=base('sandbox','Free-Build Workshop','Build a little chaos. Select the starting gadget before PUSH.','Save your workshop before experimenting.');b.seed=1;b.inventory=Object.fromEntries(types.map(t=>[t,120]));b.maxObjects=120;b.timeLimit=60;b.objectives={required:[]};b.objects=[domino('start',160),domino('workshop-a',190),domino('workshop-b',220),domino('workshop-c',250)].map(o=>({...o,locked:false}));b.start={id:'start'};b.solution=[];return b;}
