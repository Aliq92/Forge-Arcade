'use strict';
// Secret physics institute: footer atom shortcut only, outside all card collections.
GAMES.push({id:'axiom',title:'AXIOM',description:'Explore the laws, forces, and mysteries of the universe in connected physics laboratories.',category:'Experiments',featured:false,hidden:true,tags:['Physics institute','Science + Education'],palette:['#78e6dc','#b7a4f2'],metadata:{category:'Physics / Education',orientation:'any',supportsPause:true,supportsPersistentSave:true}});
heroStatus.textContent=`${GAMES.filter(game=>!game.hidden).length} playable experiments`;
footerCount.textContent=String(GAMES.filter(game=>!game.hidden).length);
renderFeaturedCollection();render('All');
