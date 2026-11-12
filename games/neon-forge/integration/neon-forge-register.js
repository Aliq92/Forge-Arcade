'use strict';
// Reference copy; the root registration is active. This nested copy is not loaded.
GAMES.push({id:'neon-forge',title:'Neon Forge',description:'Aim, strike and chain perfect hits in a colour-charged endless arena. Rise through tougher levels and shatter the Forge Heart every ten levels.',category:'Games',featured:true,tags:['Precision combat','Keyboard + touch'],artId:'neon-forge',palette:['#22d3ee','#a855f7'],metadata:{category:'Arcade / Action',orientation:'any',supportsPause:true,supportsPersistentSave:true}});
heroStatus.textContent=`${GAMES.filter(game=>!game.hidden).length} playable experiments`;
footerCount.textContent=String(GAMES.filter(game=>!game.hidden).length);
renderFeaturedCollection();render('All');
