const fs=require('node:fs');const path=require('node:path');
const root=path.resolve(__dirname,'..'),dest=path.join(root,'dist');
fs.rmSync(dest,{recursive:true,force:true});fs.mkdirSync(dest,{recursive:true});
for(const name of ['index.html','style.css','src','vendor'])fs.cpSync(path.join(root,name),path.join(dest,name),{recursive:true});
console.log('Static build ready: dist/index.html (all runtime dependencies bundled)');
