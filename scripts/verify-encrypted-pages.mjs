import {readFile,readdir} from 'node:fs/promises';
import {decryptVault} from '../security/pages-vault.js';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {JSDOM} from 'jsdom';
import {SourceTextModule} from 'node:vm';
import assert from 'node:assert/strict';

const password=process.env.PAGES_ACCESS_PASSWORD;
assert(password,'PAGES_ACCESS_PASSWORD is required for the artifact check');
const files=await readdir('dist'),payload=files.find(file=>/^application-[a-f0-9]{16}\.bin$/.test(file));assert(payload);
const gate=await readFile('dist/index.html','utf8');assert(gate.includes('type="password"'));assert(!gate.includes('id="root"'));assert(!gate.includes('__APP_SCRIPT_HASHES__'));
const plaintext=await decryptVault(new Uint8Array(await readFile('dist/'+payload)),password);
const html=gunzipSync(plaintext).toString();plaintext.fill(0);
const dom=new JSDOM(html,{url:'https://pages-build.test/',runScripts:'outside-only',pretendToBeVisual:true});
try {
  const w=dom.window;w.ResizeObserver=class{observe(){}disconnect(){}};
  w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:()=>()=>{}});
  w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
  let modules=0;
  for(const script of w.document.querySelectorAll('script')){
    const hash=createHash('sha256').update(script.textContent).digest('base64');assert(gate.includes("'sha256-"+hash+"'"),'CSP must allow the decrypted script');
    const module=new SourceTextModule(script.textContent,{context:dom.getInternalVMContext(),identifier:'https://pages-build.test/decrypted-app',initializeImportMeta(meta){meta.url='about:srcdoc';}});
    await module.link(()=>{throw Error('Unexpected external application module');});await module.evaluate();modules++;
  }
  const wait=()=>new Promise(resolve=>setTimeout(resolve,150));await wait();
  const button=text=>[...w.document.querySelectorAll('button')].find(button=>button.textContent.trim()===text);
  assert(button('Explorer la démo D1'),'Compiled application must mount');button('Explorer la démo D1').click();await wait();
  assert(w.document.querySelector('.scene'));assert(button('Ajouter un mobilier'));button('Ajouter un mobilier').click();await wait();
  assert(w.document.querySelector('.catalog-card img')?.src.startsWith('data:image/webp;base64,'),'Catalogue images must be embedded');
  assert(button('Verrouiller'));assert(button('Visiter'));assert(modules>0);
  console.log('Encrypted artifact verified: decrypts, CSP hashes match, React mounts, demo and embedded images work; no external application modules.');
}finally{dom.window.close();}
