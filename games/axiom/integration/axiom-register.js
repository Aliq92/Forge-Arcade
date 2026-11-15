'use strict';
// Prepared integration only: copy to root after approval, then load after existing registrations.
CARD_THUMBNAILS.add('axiom');
PIXEL_CARD_IDS.add('axiom');
GAMES.push({id:'axiom',title:'AXIOM',description:'Explore the laws, forces, and mysteries of the universe. Investigate 43 physics laboratories, connected lessons, equations and open scientific questions.',category:'Experiments',featured:true,tags:['Physics institute','Science + Education'],artId:'axiom',palette:['#78e6dc','#b7a4f2'],metadata:{category:'Physics / Education',orientation:'any',supportsPause:true,supportsPersistentSave:true}});
heroStatus.textContent=`${GAMES.filter(game=>!game.hidden).length} playable experiments`;
footerCount.textContent=String(GAMES.filter(game=>!game.hidden).length);
renderFeaturedCollection();render('All');
