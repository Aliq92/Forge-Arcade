'use strict';
// Prepared registration only: this file is not loaded by the live Arcade.
GAMES.push({id:'domino-disaster',title:'Domino Disaster',description:'Build colourful mechanical chain reactions using dominoes, marbles, ramps, gears and springs. One push starts the chaos.',category:'Games',featured:true,tags:['Physics puzzles','Keyboard + touch'],artId:'domino-disaster',palette:['#49dfd0','#ff7d83'],metadata:{category:'Puzzle / Physics',orientation:'any',supportsPause:true,supportsPersistentSave:true}});
heroStatus.textContent=`${GAMES.filter(game=>!game.hidden).length} playable experiments`;
footerCount.textContent=String(GAMES.filter(game=>!game.hidden).length);
renderFeaturedCollection();render('All');
