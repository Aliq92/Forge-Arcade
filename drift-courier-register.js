'use strict';
GAMES.unshift({id:'drift-courier',title:'Drift Courier',description:'Fly eight precious deliveries through drifting debris. Steer, brake, and bring your little ship home.',category:'Games',featured:true,tags:['Delivery arcade','Keyboard + touch'],palette:['#80f0c5','#ffd17d']});
heroStatus.textContent = `${GAMES.length} playable experiments`;
footerCount.textContent = String(GAMES.length);
renderFeaturedCollection();
render('All');
