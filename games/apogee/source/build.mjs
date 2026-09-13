import { build } from 'vite';
import { cp,mkdir,readdir,rm,realpath } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const source=fileURLToPath(new URL('.',import.meta.url));
await build({configFile:false,root:source,base:'./',build:{outDir:'dist',emptyOutDir:true,rollupOptions:{output:{manualChunks:{phaser:['phaser']}}}}});
const target=await realpath(path.resolve(source,'..'));
if(path.basename(target)!=='apogee')throw new Error('Unexpected deployment target');
const assets=path.resolve(target,'assets');
if(!assets.startsWith(target+path.sep))throw new Error('Invalid asset path');
await mkdir(assets,{recursive:true});
// Remove only generated asset files owned by APOGEE. Source remains untouched.
for(const name of await readdir(assets)){if(/^(index|phaser)-[\w-]+\.(js|css)$/.test(name)){const file=path.resolve(assets,name);if(path.dirname(file)!==assets)throw new Error('Invalid generated asset');await rm(file);}}
await cp(path.join(source,'dist','assets'),assets,{recursive:true});
await cp(path.join(source,'dist','index.html'),path.join(target,'index.html'));
console.log('APOGEE production page deployed to games/apogee');
