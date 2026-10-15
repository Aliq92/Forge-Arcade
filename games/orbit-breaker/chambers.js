(function(root,factory){const v=factory();if(typeof module==='object'&&module.exports)module.exports=v;else root.OrbitChambers=v;})(globalThis,function(){
  const t=(x,y,type='normal',motion=0)=>({x,y,r:type==='ring'?29:20,type,motion});
  const o=(x,y,r=30,motion=0)=>({x,y,r,type:'bumper',motion});
  return [
    {name:'First attraction',set:'FOUNDATIONS',hint:'Pull toward the gold target. A gentle hold is enough.',start:[350,650,160,-80],targets:[t(570,380)],obstacles:[],wells:[]},
    {name:'Let it fly',set:'FOUNDATIONS',hint:'Bend toward a target, then release to carry your momentum.',start:[320,560,160,-120],targets:[t(400,300),t(690,530)],obstacles:[],wells:[]},
    {name:'Around the bend',set:'FOUNDATIONS',hint:'Hold beside the ball to curve around the central bumper.',start:[300,650,200,-30],targets:[t(690,360),t(650,680)],obstacles:[o(500,500,44)],wells:[]},
    {name:'Thread the light',set:'FOUNDATIONS',hint:'Pass through the coral ring, then break the gold target.',start:[340,680,190,-80],targets:[t(420,340,'ring'),t(690,470)],obstacles:[],wells:[]},
    {name:'A little resistance',set:'CONTROL',hint:'Bumpers redirect momentum. Use them to your advantage.',start:[280,570,180,-100],targets:[t(470,270),t(710,520),t(480,730)],obstacles:[o(460,450,38),o(570,600,32)],wells:[]},
    {name:'Moving constellation',set:'CONTROL',hint:'Meet the drifting targets. You have all the time you need.',start:[350,660,200,-60],targets:[t(350,350,'normal',25),t(680,400,'energy',22),t(610,700)],obstacles:[o(500,500,28)],wells:[]},
    {name:'The long curve',set:'CONTROL',hint:'Let a broad curve carry you between both sides of the arena.',start:[350,650,200,-100],targets:[t(270,400),t(710,340),t(680,650,'ring')],obstacles:[o(450,430,30),o(550,570,30)],wells:[]},
    {name:'Connected',set:'CONTROL',hint:'Violet targets share a link. Strike one to ignite its neighbor.',start:[400,720,170,-100],targets:[t(300,380,'chain'),t(470,290,'chain'),t(720,500,'energy'),t(500,700,'ring')],obstacles:[o(510,460,38)],wells:[]},
    {name:'A second gravity',set:'MASTERY',hint:'The violet well pulls gently. Work with its curve.',start:[350,690,200,-100],targets:[t(300,350),t(700,400),t(640,690,'ring')],obstacles:[o(540,540,30)],wells:[{x:460,y:430,strength:.22}]},
    {name:'Clockwork',set:'MASTERY',hint:'Watch the rotating bumpers. There is room around every route.',start:[300,640,180,-80],targets:[t(380,270),t(730,490),t(450,720,'energy')],obstacles:[o(410,500,26,65),o(590,500,26,-65)],wells:[{x:500,y:500,strength:.16}]},
    {name:'Between worlds',set:'MASTERY',hint:'Two wells, one orbit. Keep your holds short and deliberate.',start:[400,740,200,-70],targets:[t(290,410,'ring'),t(500,260),t(710,430,'chain'),t(650,660,'chain')],obstacles:[o(440,530,28),o(590,440,28,30)],wells:[{x:350,y:500,strength:.18},{x:650,y:500,strength:.18}]},
    {name:'Orbit breaker',set:'MASTERY',hint:'Everything you learned. Make space, build momentum, let go.',start:[350,710,200,-60],targets:[t(300,330,'chain'),t(470,260,'chain'),t(710,390,'ring'),t(700,650,'energy'),t(420,730)],obstacles:[o(440,460,26,45),o(570,560,30,-45)],wells:[{x:500,y:500,strength:.2}]}
  ];
});
