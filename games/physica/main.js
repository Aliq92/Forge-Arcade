import {App} from './app.js';
try{const app=new App();globalThis.physica=app;}catch(error){document.body.insertAdjacentHTML('beforeend','<p role="alert" style="padding:24px">The local laboratory could not start. Serve this folder over HTTP and reload.</p>');console.error(error);}
