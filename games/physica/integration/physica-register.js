'use strict';
// Hidden laboratory: open the footer atom symbol, outside the game listings.
GAMES.push({id:'physica',title:'PHYSICA',description:'Explore gravity, motion, waves and circuits in four scientific laboratories.',category:'Simulations',featured:false,hidden:true,tags:['Physics laboratory','Keyboard + touch'],palette:['#6be2ce','#b6a0ff'],metadata:{category:'Education / Physics',orientation:'any',supportsPause:true,supportsPersistentSave:true}});
heroStatus.textContent=`${GAMES.filter(game=>!game.hidden).length} playable experiments`;
footerCount.textContent=String(GAMES.filter(game=>!game.hidden).length);
renderFeaturedCollection();render('All');
