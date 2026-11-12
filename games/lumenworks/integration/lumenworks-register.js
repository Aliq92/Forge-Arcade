'use strict';
// Reference copy of the active root registration. This nested copy is not loaded.
GAMES.push({id:'lumenworks',title:'Lumenworks',description:'Wake a miniature city one connection at a time. Solve thirteen power-network puzzles, then build a glowing city of your own.',category:'Games',featured:true,tags:['Network puzzle','Keyboard + touch'],artId:'lumenworks',palette:['#76e8cc','#ffd18b'],metadata:{category:'Puzzle',orientation:'any',supportsPause:true,supportsPersistentSave:true}});
heroStatus.textContent=`${GAMES.filter(game=>!game.hidden).length} playable experiments`;
footerCount.textContent=String(GAMES.filter(game=>!game.hidden).length);
renderFeaturedCollection();render('All');
