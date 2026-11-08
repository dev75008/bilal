import {readFile,writeFile,mkdir,readdir,stat,cp,rm} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {build} from 'vite';
import sharp from 'sharp';

await rm('dist',{recursive:true,force:true});
await build({define:{'import.meta.env.VITE_PROTECTED':'true'},build:{outDir:'.protected-client'}});
const assets={};
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2','.txt':'text/plain; charset=utf-8','.json':'application/json'};
let total=0;
for(const relative of await readdir('.protected-client',{recursive:true})) {
  const filename='.protected-client/'+relative;
  if(!(await stat(filename)).isFile())continue;
  const ext=relative.slice(relative.lastIndexOf('.')).toLowerCase();
  let data=await readFile(filename),type=types[ext]||'application/octet-stream';
  // Optimise delivery copies only; keep the original product imagery in public/.
  if(ext==='.png'){data=await sharp(data).webp({quality:90,effort:6}).toBuffer();type='image/webp';}
  const compressed=gzipSync(data,{level:9});total+=compressed.length;
  assets['/'+relative.replaceAll('\\','/')]=[type,compressed.toString('base64')];
}
await mkdir('dist/server',{recursive:true});await mkdir('dist/.openai',{recursive:true});
await cp('server/access.js','dist/server/access.js');
await writeFile('dist/server/index.js',`import {createApp} from './access.js';\nconst assets=${JSON.stringify(assets)};\nexport default createApp(async request=>{const path=new URL(request.url).pathname;const entry=assets[path==='/'?'/index.html':path];if(!entry)return new Response('Introuvable',{status:404});const bytes=Uint8Array.from(atob(entry[1]),c=>c.charCodeAt(0));const headers={'Content-Type':entry[0]};return new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')),{headers});});\n`);
const hosting=JSON.parse(await readFile('.openai/hosting.json','utf8'));
if(hosting.static)throw new Error('Protected deployments must not use static hosting');
await writeFile('dist/.openai/hosting.json',JSON.stringify(hosting));
await cp('drizzle','dist/.openai/drizzle',{recursive:true});
await rm('.protected-client',{recursive:true});
console.log('Protected server generated; compressed assets:',total,'bytes. No public asset directory.');
