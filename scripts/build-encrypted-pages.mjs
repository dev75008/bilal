import {build} from 'vite';
import {viteSingleFile} from 'vite-plugin-singlefile';
import {readFile,writeFile,rm,mkdir,readdir,cp} from 'node:fs/promises';
import {resolve,sep} from 'node:path';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {JSDOM} from 'jsdom';
import {encryptVault} from '../security/pages-vault.js';

const password=process.env.PAGES_ACCESS_PASSWORD;
if(!password||password.length>256)throw Error('PAGES_ACCESS_PASSWORD must be set as a private build secret. No unprotected build will be published.');
const appDir=resolve('.pages-app');
const distDir=resolve('dist'),projectDir=resolve('.')+sep;
if(!appDir.startsWith(projectDir)||!distDir.startsWith(projectDir))throw Error('Build outputs must stay inside the project');
await rm(distDir,{recursive:true,force:true});
const imageCache=new Map();
await build({define:{'import.meta.env.VITE_STATIC_LOCK':'true','import.meta.env.VITE_PROTECTED':'false'},publicDir:false,plugins:[{
  name:'embed-catalog-images',enforce:'pre',async transform(code,id){
    if(!id.replaceAll('\\','/').endsWith('/src/catalog.js'))return;
    const prefix='export const catalog =';const offset=code.indexOf('[');const items=JSON.parse(code.slice(offset).trim().replace(/;$/,''));
    for(const item of items)if(item.image){
      if(!imageCache.has(item.image)){const bytes=await sharp(await readFile(resolve('public',item.image))).webp({quality:90,effort:6}).toBuffer();imageCache.set(item.image,'data:image/webp;base64,'+bytes.toString('base64'));}
      item.image=imageCache.get(item.image);
    }
    return {code:prefix+JSON.stringify(items)+';',map:null};
  },
},viteSingleFile()],build:{outDir:appDir,sourcemap:false,assetsInlineLimit:100000000,chunkSizeWarningLimit:10000,rollupOptions:{output:{inlineDynamicImports:true}}}});
try {
  let html=await readFile(resolve(appDir,'index.html'),'utf8');
  html=html.replace(/<link[^>]*rel="icon"[^>]*>/g,'');
  const dom=new JSDOM(html),doc=dom.window.document;
  if(doc.querySelector('script[src],link[href],img[src]'))throw Error('Application has an external resource; refusing to publish plaintext assets.');
  for(const style of doc.querySelectorAll('style'))for(const match of style.textContent.matchAll(/url\(([^)]+)\)/g)){
    if(!match[1].trim().replace(/^['"]|['"]$/g,'').startsWith('data:'))throw Error('Application has an external CSS resource');
  }
  const hashes=[...doc.querySelectorAll('script')].map(script=>"'sha256-"+createHash('sha256').update(script.textContent).digest('base64')+"'");dom.window.close();
  if(!hashes.length)throw Error('The application script was not inlined');
  const payload=await encryptVault(gzipSync(Buffer.from(html),{level:9}),password);
  const filename='application-'+createHash('sha256').update(payload).digest('hex').slice(0,16)+'.bin';
  await build({configFile:false,root:resolve('gate'),base:'./',publicDir:false,define:{'import.meta.env.VITE_VAULT_FILE':JSON.stringify(filename)},build:{outDir:resolve('dist'),emptyOutDir:true,sourcemap:false}});
  const gate=await readFile('dist/index.html','utf8');await writeFile('dist/index.html',gate.replace('__APP_SCRIPT_HASHES__',hashes.join(' ')));
  await writeFile('dist/'+filename,payload);await cp('public/favicon.svg','dist/favicon.svg');await writeFile('dist/.nojekyll','');
  await mkdir('dist/licenses',{recursive:true});await cp('public/fonts/OFL-IBM-Plex-Sans.txt','dist/licenses/OFL-IBM-Plex-Sans.txt');
  for(const [path,name] of [['@noble/hashes/LICENSE','noble-hashes'],['react/LICENSE','react'],['react-dom/LICENSE','react-dom'],['three/LICENSE','three']])await cp('node_modules/'+path,'dist/licenses/LICENSE-'+name+'.txt');
  const files=await readdir('dist',{recursive:true});
  if(files.some(file=>file.includes('census')||file.endsWith('.map')))throw Error('Unexpected plaintext application resources');
  console.log('Encrypted GitHub Pages application generated:',payload.length,'bytes; no password or plaintext application assets in dist.');
}finally{await rm(appDir,{recursive:true,force:true});}
