// levels.js — structured level data. Rooms are plain data so new ones are easy to add.
const floor = (x, y, w, h = 60) => ({ x, y, w, h });
const plate = (id, x, y, w = 60, h = 10, allow = 'any') => ({ id, x, y, w, h, allow });
const swi = (id, x, y, w = 24, h = 50, allow = 'any') => ({ id, x, y, w, h, allow });
const doorDef = (id, x, y, w, h, opts = {}) =>
  Object.assign({ id, x, y, w, h, links: [], startOpen: false, requireAll: false }, opts);
const laserDef = (id, x, y, w, h, opts = {}) => Object.assign({ id, x, y, w, h }, opts);
const mpDef = (id, x1, y1, w, h, x2, y2, speed = 90, waitTicks = 25) => ({
  id, w, h, points: [{ x: x1, y: y1 }, { x: x2, y: y2 }], speed, waitTicks,
});
const crumbleDef = (id, x, y, w, h, delaySec = 0.45) => ({ id, x, y, w, h, crumbleDelayTicks: Math.round(delaySec * 60) });
const spike = (x, y, w, h) => ({ type: 'spike', x, y, w, h });

export const CHAPTERS = [
  { id: 'repeat', title: 'CHAPTER I', subtitle: 'REPEAT', accent: '#7fd7ff' },
  { id: 'overlap', title: 'CHAPTER II', subtitle: 'OVERLAP', accent: '#b79bff' },
  { id: 'interference', title: 'CHAPTER III', subtitle: 'INTERFERENCE', accent: '#ff9bd6' },
  { id: 'convergence', title: 'CHAPTER IV', subtitle: 'CONVERGENCE', accent: '#ffd27f' },
  { id: 'resonance', title: 'CHAPTER V', subtitle: 'RESONANCE', accent: '#73f4d4' },
];

const FRAGMENTS = {
  overlap: 'Memory does not disappear.',
  interference: 'It repeats.',
  convergence: 'Sometimes escape requires becoming your own past.',
};

export const LEVELS = [
  // ---------------------------------------------------------------- CHAPTER I
  {
    id: 1, name: 'First Steps', chapter: 'repeat', maxEchoes: 0, recordingTime: 10,
    width: 960, height: 540, spawn: { x: 60, y: 440 },
    tiles: [floor(0, 480, 960, 60)],
    exit: { x: 880, y: 420, w: 40, h: 60 },
    hints: [{ text: 'A / D — MOVE', showOn: 'enter' }, { text: 'REACH THE GLOWING CORE', showOn: 'enter', delay: 2.5 }],
  },
  {
    id: 2, name: 'The Gap', chapter: 'repeat', maxEchoes: 0, recordingTime: 10,
    width: 960, height: 540, spawn: { x: 60, y: 440 },
    tiles: [
      floor(0, 480, 300, 60),
      floor(340, 420, 280, 60),
      floor(720, 480, 240, 60),
    ],
    hazards: [spike(300, 488, 40, 40), spike(620, 488, 100, 40)],
    exit: { x: 880, y: 440, w: 40, h: 40 },
    hints: [{ text: 'SPACE / W / ↑ — JUMP', showOn: 'enter' }, { text: 'SPIKES RESET YOUR ATTEMPT — VOID DOES TOO', showOn: 'enter', delay: 3 }],
  },
  {
    id: 3, name: 'Recording', chapter: 'repeat', maxEchoes: 1, parEchoes: 1, recordingTime: 12,
    width: 960, height: 540, spawn: { x: 60, y: 440 },
    tiles: [floor(0, 480, 960, 60)],
    plates: [plate('p1', 180, 480, 70)],
    doors: [doorDef('d1', 500, 360, 20, 160, { links: ['p1'] })],
    exit: { x: 880, y: 440, w: 40, h: 40 },
    hints: [
      { text: 'PRESS R — RECORD YOUR MOVEMENTS', showOn: 'enter' },
      { text: 'WALK ONTO THE PLATE, THEN STOP THERE', showOn: 'firstRecord' },
      { text: 'PRESS R AGAIN — YOUR ECHO WILL REPEAT THIS', showOn: 'firstRecord', delay: 3.5 },
      { text: 'NOW CROSS THE DOOR WHILE YOUR ECHO HOLDS THE PLATE', showOn: 'firstEcho' },
    ],
  },
  {
    id: 4, name: 'The Detour', chapter: 'repeat', maxEchoes: 1, parEchoes: 1, recordingTime: 14,
    width: 960, height: 540, spawn: { x: 60, y: 440 },
    tiles: [
      floor(0, 480, 620, 60),
      floor(360, 410, 120, 20),
      floor(620, 480, 340, 60),
    ],
    plates: [plate('p1', 390, 410, 60)],
    doors: [doorDef('d1', 700, 360, 20, 160, { links: ['p1'] })],
    exit: { x: 880, y: 440, w: 40, h: 40 },
    hints: [
      { text: 'RECORD A PATH THAT REACHES THE HIGH PLATE', showOn: 'enter' },
      { text: 'YOUR ECHO TAKES THE DETOUR — YOU DON’T HAVE TO', showOn: 'firstEcho' },
    ],
  },
  {
    id: 5, name: 'A Brief Window', chapter: 'repeat', maxEchoes: 1, parEchoes: 1, recordingTime: 14,
    width: 960, height: 540, spawn: { x: 60, y: 440 },
    tiles: [floor(0, 480, 960, 60)],
    switches: [swi('s1', 200, 430)],
    doors: [doorDef('d1', 700, 360, 20, 160, { links: ['s1'], timedTicks: 300 })],
    exit: { x: 880, y: 440, w: 40, h: 40 },
    hints: [
      { text: 'PRESS E TO USE A SWITCH', showOn: 'enter' },
      { text: 'RECORD YOURSELF HITTING THE SWITCH, THEN STOP', showOn: 'firstRecord' },
      { text: 'THE DOOR ONLY STAYS OPEN BRIEFLY — REACH IT YOURSELF', showOn: 'firstEcho' },
    ],
  },
  {
    id: 6, name: 'Timing', chapter: 'repeat', maxEchoes: 1, recordingTime: 14,
    width: 960, height: 540, spawn: { x: 60, y: 440 },
    tiles: [floor(0, 480, 300, 60), floor(620, 480, 340, 60)],
    movingPlatforms: [mpDef('mp1', 310, 440, 90, 16, 560, 440, 110, 70)],
    hazards: [spike(300, 488, 320, 40)],
    exit: { x: 880, y: 440, w: 40, h: 40 },
    hints: [
      { text: 'WAIT FOR THE PLATFORM, THEN JUMP ON', showOn: 'enter' },
      { text: 'LET IT CARRY YOU — WALK OFF ONCE IT’S CLOSE', showOn: 'enter', delay: 3 },
    ],
  },

  // --------------------------------------------------------------- CHAPTER II
  {
    id: 7, name: 'Second Self', chapter: 'overlap', maxEchoes: 2, parEchoes: 2, recordingTime: 16,
    width: 960, height: 540, spawn: { x: 60, y: 440 },
    tiles: [floor(0, 480, 960, 60)],
    plates: [plate('pa', 220, 480, 60), plate('pb', 460, 480, 60)],
    doors: [doorDef('d1', 760, 360, 20, 160, { links: ['pa', 'pb'], requireAll: true })],
    exit: { x: 880, y: 440, w: 40, h: 40 },
    fragment: FRAGMENTS.overlap,
    hints: [
      { text: 'THIS DOOR NEEDS BOTH PLATES HELD AT ONCE', showOn: 'enter' },
      { text: 'RECORD A SECOND ECHO — IT JOINS THE FIRST', showOn: 'firstEcho' },
    ],
  },
  {
    id: 8, name: 'Two Locks', chapter: 'overlap', maxEchoes: 2, parEchoes: 2, recordingTime: 20,
    width: 960, height: 540, spawn: { x: 60, y: 440 },
    tiles: [floor(0, 480, 960, 60)],
    plates: [plate('pa', 220, 480, 60), plate('pb', 600, 480, 60)],
    switches: [swi('gsw', 430, 430)],
    doors: [
      doorDef('gate', 465, 360, 20, 160, { links: ['gsw'] }),
      doorDef('d1', 800, 360, 20, 160, { links: ['pa', 'pb'], requireAll: true }),
    ],
    exit: { x: 880, y: 440, w: 40, h: 40 },
    hints: [{ text: 'THE FAR PLATE IS GATED — USE THE SWITCH ALONG THE WAY', showOn: 'enter' }],
  },

  // ------------------------------------------------------------- CHAPTER III
  {
    id: 9, name: 'Beams', chapter: 'interference', maxEchoes: 2, parEchoes: 2, recordingTime: 20,
    width: 960, height: 540, spawn: { x: 60, y: 440 },
    tiles: [floor(0, 480, 960, 60)],
    plates: [plate('pa', 200, 480, 60), plate('pb', 620, 480, 60)],
    lasers: [
      laserDef('la', 350, 380, 14, 140, { disableLinks: ['pa'] }),
      laserDef('lb', 760, 380, 14, 140, { disableLinks: ['pb'] }),
    ],
    exit: { x: 880, y: 440, w: 40, h: 40 },
    fragment: FRAGMENTS.interference,
    hints: [{ text: 'LASERS ARE LETHAL — A HELD PLATE DISABLES ONE', showOn: 'enter' }],
  },
  {
    id: 10, name: 'Only Memory', chapter: 'interference', maxEchoes: 2, parEchoes: 1, recordingTime: 16,
    width: 960, height: 540, spawn: { x: 60, y: 440 },
    tiles: [floor(0, 480, 960, 60)],
    plates: [plate('pe', 260, 480, 60, 10, 'echo')],
    switches: [swi('sp', 560, 430, 24, 50, 'player')],
    doors: [doorDef('d1', 800, 360, 20, 160, { links: ['pe', 'sp'], requireAll: true })],
    exit: { x: 880, y: 440, w: 40, h: 40 },
    hints: [
      { text: 'THAT PLATE ONLY RESPONDS TO AN ECHO', showOn: 'enter' },
      { text: 'THIS SWITCH ONLY RESPONDS TO YOU', showOn: 'enter', delay: 3 },
    ],
  },
  {
    id: 11, name: 'One Crossing', chapter: 'interference', maxEchoes: 2, parEchoes: 1, recordingTime: 18,
    width: 960, height: 540, spawn: { x: 60, y: 440 },
    tiles: [
      floor(0, 480, 240, 60),
      floor(390, 480, 570, 60),
      floor(150, 400, 450, 16),
    ],
    crumblingFloors: [crumbleDef('cf1', 240, 480, 150, 60, 0.9)],
    plates: [plate('pa', 430, 480, 60)],
    doors: [doorDef('d1', 760, 360, 20, 160, { links: ['pa'] })],
    exit: { x: 880, y: 440, w: 40, h: 40 },
    hints: [
      { text: 'THAT BRIDGE ONLY SURVIVES ONE CROSSING', showOn: 'enter' },
      { text: 'YOUR ECHO CAN AFFORD TO BREAK IT — FIND ANOTHER WAY YOURSELF', showOn: 'enter', delay: 3.5 },
    ],
  },
  {
    id: 12, name: 'Convergent Systems', chapter: 'interference', maxEchoes: 2, parEchoes: 2, recordingTime: 20,
    width: 960, height: 540, spawn: { x: 60, y: 440 },
    tiles: [floor(0, 480, 960, 60)],
    switches: [swi('s1', 150, 430)],
    doors: [doorDef('d1', 250, 360, 20, 160, { links: ['s1'], timedTicks: 300 })],
    plates: [plate('pp', 450, 480, 60)],
    lasers: [laserDef('ll', 650, 380, 14, 140, { disableLinks: ['pp'] })],
    exit: { x: 880, y: 440, w: 40, h: 40 },
    hints: [{ text: 'THE DOOR STAYS OPEN BRIEFLY. THE LASER NEEDS THE PLATE HELD.', showOn: 'enter' }],
  },

  // -------------------------------------------------------------- CHAPTER IV
  {
    id: 13, name: 'Three', chapter: 'convergence', maxEchoes: 3, parEchoes: 3, recordingTime: 20,
    width: 960, height: 540, spawn: { x: 60, y: 440 },
    tiles: [floor(0, 480, 960, 60)],
    plates: [plate('pa', 200, 480, 60), plate('pb', 400, 480, 60), plate('pc', 600, 480, 60)],
    doors: [doorDef('d1', 800, 360, 20, 160, { links: ['pa', 'pb', 'pc'], requireAll: true })],
    exit: { x: 880, y: 440, w: 40, h: 40 },
    fragment: FRAGMENTS.convergence,
    hints: [{ text: 'THREE PLATES. THREE ECHOES. BUILD THEM ONE AT A TIME.', showOn: 'enter' }],
  },
  {
    id: 14, name: 'Convergence', chapter: 'convergence', maxEchoes: 3, parEchoes: 3, recordingTime: 24,
    width: 1400, height: 540, spawn: { x: 60, y: 440 },
    tiles: [floor(0, 480, 300, 60), floor(650, 480, 750, 60)],
    movingPlatforms: [mpDef('mp1', 320, 440, 90, 16, 600, 440, 100, 75)],
    plates: [plate('pa', 700, 480, 60), plate('pb', 950, 480, 60)],
    lasers: [laserDef('ll', 1080, 380, 14, 140, { disableLinks: ['pb'] })],
    switches: [swi('s1', 1150, 430)],
    doors: [
      doorDef('d1', 850, 360, 20, 160, { links: ['pa'] }),
      doorDef('d2', 1250, 360, 20, 160, { links: ['s1'], timedTicks: 300 }),
    ],
    exit: { x: 1340, y: 440, w: 40, h: 40 },
    hints: [{ text: 'THE FINAL CHAMBER. EVERYTHING YOU HAVE LEARNED.', showOn: 'enter' }],
  },
  // --------------------------------------------------------------- CHAPTER V
  {
    id:15,name:'First Contact',chapter:'resonance',maxEchoes:1,parEchoes:1,recordingTime:16,
    width:960,height:540,spawn:{x:60,y:440},tiles:[floor(0,480,960)],
    plates:[plate('memory',190,480,80,10,'echo')],
    doors:[doorDef('passage',540,340,24,140,{links:['memory']})],
    exit:{x:880,y:420,w:40,h:60},
    hints:[{text:'VIOLET PLATES NEED AN ECHO. RECORD A WALK, THEN STAND STILL.',showOn:'enter'},{text:'YOUR PAST HOLDS THE PASSAGE. YOUR PRESENT CAN CROSS.',showOn:'firstEcho'}],
  },
  {
    id:16,name:'The Moving Line',chapter:'resonance',maxEchoes:1,parEchoes:1,recordingTime:20,
    width:960,height:540,spawn:{x:60,y:440},
    tiles:[floor(0,480,470),floor(470,320,490,220)],
    plates:[plate('anchor',170,480,80,10,'echo')],
    movingPlatforms:[mpDef('lift',350,440,100,16,350,290,50,180)],
    doors:[doorDef('upper',700,160,24,160,{links:['anchor']})],
    exit:{x:880,y:260,w:40,h:60},
    hints:[{text:'LEAVE AN ECHO ON THE PLATE. BOARD THE LIFT DURING ITS LONG PAUSE.',showOn:'enter'},{text:'RIDE UP, THEN WALK RIGHT ONTO THE HIGH LEDGE.',showOn:'firstEcho'}],
  },
  {
    id:17,name:'Double Exposure',chapter:'resonance',maxEchoes:2,parEchoes:2,recordingTime:20,
    width:960,height:540,spawn:{x:60,y:440},tiles:[floor(0,480,960)],
    plates:[plate('near',190,480,70,10,'echo'),plate('far',460,480,70,10,'echo')],
    doors:[doorDef('double',770,320,26,160,{links:['near','far'],requireAll:true})],
    exit:{x:880,y:420,w:40,h:60},
    hints:[{text:'TWO VIOLET PLATES. RECORD EACH ECHO FROM THE SAME START.',showOn:'enter'},{text:'STOP THE SECOND RECORDING ON THE FAR PLATE, THEN TAKE YOUR OWN ROUTE.',showOn:'firstEcho'}],
  },
  {
    id:18,name:'Fractured Timing',chapter:'resonance',maxEchoes:1,parEchoes:1,recordingTime:20,
    width:960,height:540,spawn:{x:60,y:440},tiles:[floor(0,480,960)],
    switches:[swi('pulse',200,430,30,50,'echo')],
    doors:[doorDef('window',760,320,24,160,{links:['pulse'],timedTicks:480})],
    movingHazards:[mpDef('shifter',540,448,20,32,650,448,35,70)],
    exit:{x:880,y:420,w:40,h:60},
    hints:[{text:'RECORD E AT THE VIOLET SWITCH. YOUR ECHO OPENS AN EIGHT-SECOND WINDOW.',showOn:'enter'},{text:'JUMP THE MOVING MAGENTA FIELD. THE DOOR TIMER IS NOT A TOGGLE.',showOn:'firstEcho'}],
  },
  {
    id:19,name:'The Final Echo',chapter:'resonance',maxEchoes:2,parEchoes:2,recordingTime:24,
    width:1400,height:540,spawn:{x:60,y:440},
    tiles:[floor(0,480,650),floor(960,480,440)],
    plates:[plate('origin',190,480,70,10,'echo'),plate('relay',490,480,70,10,'echo')],
    movingPlatforms:[mpDef('crossing',660,440,100,16,890,440,80,240)],
    hazards:[spike(650,500,310,40)],
    switches:[swi('present',1100,430,30,50,'player')],
    doors:[doorDef('memoryGate',1020,320,24,160,{links:['origin','relay'],requireAll:true}),doorDef('finalWindow',1240,320,24,160,{links:['present'],timedTicks:300})],
    exit:{x:1330,y:420,w:45,h:60},
    fragment:'Your past holds the way. Your future takes the final step.',
    hints:[{text:'TWO ECHOES HOLD THE RELAYS. THE CROSSING PAUSES FOR FOUR SECONDS.',showOn:'enter'},{text:'RIDE THE CROSSING. USE E AT THE CYAN SWITCH, THEN REACH THE FINAL CORE.',showOn:'firstEcho'}],
  },
];

export function levelById(id) {
  return LEVELS.find((l) => l.id === id);
}

export function chapterOf(level) {
  return CHAPTERS.find((c) => c.id === level.chapter);
}
