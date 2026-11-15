const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const gameRoot=path.resolve(__dirname,'..'),workspaceRoot=path.resolve(gameRoot,'../..');
function serve(port=Number(process.env.AXIOM_PORT||8460),directory=gameRoot){
 const root=path.resolve(directory);
 const server=http.createServer((req,res)=>{let file;try{const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(name.split('/').some(p=>p.startsWith('.')&&p!==''))throw Error();file=path.resolve(root,'.'+name);if(file!==root&&!file.startsWith(root+path.sep))throw Error();if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');const body=fs.readFileSync(file);res.writeHead(200,{'Content-Type':({'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.md':'text/plain'})[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(body);}catch{res.writeHead(404);res.end('Not found');}});return new Promise(resolve=>server.listen(port,'127.0.0.1',()=>resolve(server)));
}
module.exports={serve};if(require.main===module)serve(Number(process.env.AXIOM_PORT||8460),workspaceRoot).then(s=>console.log('AXIOM preview: http://127.0.0.1:'+s.address().port+'/games/axiom/'));
