'use strict';

GAMES.push({
  id: 'dont-let-go',
  title: "Don't Let Go",
  description: 'Hold to fly, steer through real 3D space, thread glowing gates, and smash energy cubes without releasing the signal.',
  category: 'Games',
  featured: true,
  tags: ['Three.js flight', 'Touch + keyboard'],
  palette: ['#5fd8ff', '#ffb35c'],
});

heroStatus.textContent = `${GAMES.length} playable experiments`;
footerCount.textContent = String(GAMES.length);
renderFeaturedCollection();
render('All');

/* Hidden Forge Easter egg: decorative ember -> three interactions -> Memory Dream Hallway. */
(() => {
  const host = document.querySelector('.hero-mark');
  if (!host || document.getElementById('memory-dream-trigger')) return;

  const style = document.createElement('style');
  style.textContent = `
    .hero-mark{position:relative}
    #memory-dream-trigger{
      position:absolute; right:1%; bottom:3%; z-index:8;
      width:48px; height:48px; min-width:0; min-height:0; padding:0;
      border:0; border-radius:50%; cursor:pointer; appearance:none;
      background:transparent; opacity:1;
      -webkit-tap-highlight-color:transparent;
      touch-action:manipulation;
    }
    #memory-dream-trigger::after{
      content:''; position:absolute; left:50%; top:50%; width:15px; height:15px;
      transform:translate(-50%,-50%) scale(.86); border-radius:50%;
      background:radial-gradient(circle at 36% 32%,rgba(255,236,191,.9) 0 12%,rgba(226,112,58,.54) 16% 38%,rgba(226,112,58,.09) 58%,transparent 72%);
      box-shadow:0 0 10px rgba(226,112,58,.2); opacity:.42;
      transition:opacity .22s ease,transform .22s ease,filter .22s ease;
    }
    #memory-dream-trigger:hover::after{opacity:.62;transform:translate(-50%,-50%) scale(.96)}
    #memory-dream-trigger:focus{outline:none}
    #memory-dream-trigger.memory-pulse::after{animation:memoryEmberPulse .34s ease}
    #memory-dream-transition{
      position:fixed; inset:0; z-index:9999; pointer-events:none; opacity:0;
      background:#030506; transition:opacity .58s ease;
    }
    #memory-dream-transition::before{
      content:''; position:absolute; inset:0; opacity:0;
      background:repeating-linear-gradient(0deg,transparent 0 4px,rgba(180,240,255,.09) 5px 6px);
      mix-blend-mode:screen;
    }
    #memory-dream-transition.active{opacity:1}
    #memory-dream-transition.glitch::before{animation:memoryGlitch .42s steps(2,end)}
    @keyframes memoryEmberPulse{0%,100%{filter:none;transform:translate(-50%,-50%) scale(.86)}45%{filter:brightness(2);transform:translate(-50%,-50%) scale(1.16)}}
    @keyframes memoryGlitch{0%{opacity:0;transform:translateX(0)}25%{opacity:.8;transform:translateX(7px)}50%{opacity:.2;transform:translateX(-8px)}75%{opacity:.7;transform:translateX(3px)}100%{opacity:0;transform:translateX(0)}}
    @media (max-width:700px){#memory-dream-trigger{right:-2%;bottom:0}}
    @media (prefers-reduced-motion:reduce){#memory-dream-trigger.memory-pulse::after{animation:none}#memory-dream-transition.glitch::before{animation:none}}
  `;
  document.head.appendChild(style);

  const ember = document.createElement('button');
  ember.id = 'memory-dream-trigger';
  ember.type = 'button';
  ember.tabIndex = -1;
  ember.setAttribute('aria-label', '');
  ember.title = '';
  host.appendChild(ember);

  const transition = document.createElement('div');
  transition.id = 'memory-dream-transition';
  transition.setAttribute('aria-hidden', 'true');
  document.body.appendChild(transition);

  let interactions = 0;
  let locked = false;
  let resetTimer = 0;

  function pulse() {
    ember.classList.remove('memory-pulse');
    void ember.offsetWidth;
    ember.classList.add('memory-pulse');
  }

  function openHallway() {
    if (locked) return;
    locked = true;
    clearTimeout(resetTimer);
    transition.classList.add('glitch');
    requestAnimationFrame(() => transition.classList.add('active'));
    setTimeout(() => {
      window.location.href = 'games/memory-dream-hallway/index.html?from=forge';
    }, 610);
  }

  function interact(event) {
    event.preventDefault();
    event.stopPropagation();
    if (locked) return;
    interactions += 1;
    pulse();
    clearTimeout(resetTimer);
    if (interactions >= 3) openHallway();
    else resetTimer = window.setTimeout(() => { interactions = 0; }, 6000);
  }

  ember.addEventListener('click', interact);
})();
