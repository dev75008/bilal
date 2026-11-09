import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {JSDOM} from 'jsdom';
import {createServer} from 'vite';
import {encryptVault} from '../security/pages-vault.js';

test('Pages : refus du mauvais mot de passe, ouverture sur la même adresse et verrouillage',async()=>{
  const dom=new JSDOM(readFileSync('gate/index.html','utf8'),{url:'https://example.test/bilal/'});
  for(const key of ['window','document','location'])globalThis[key]=dom.window[key];
  dom.window.focus=()=>{};
  dom.window.localStorage.setItem('existing-project-check','kept');
  const append=document.body.append.bind(document.body);document.body.append=(...nodes)=>{append(...nodes);for(const node of nodes)if(node.tagName==='IFRAME')node.contentWindow.focus=()=>{};};
  const password='test-only-pages-ui',plain='<!doctype html><html><body><div id="root">Atelier privé</div></body></html>';
  const payload=await encryptVault(gzipSync(plain),password);
  const originalFetch=globalThis.fetch;let fetchedUrl=null;
  globalThis.fetch=async url=>{fetchedUrl=String(url);return new Response(payload);};
  const server=await createServer({server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'});
  const waitFor=async predicate=>{for(let i=0;i<400;i++){if(predicate())return;await new Promise(resolve=>setTimeout(resolve,20));}throw Error('UI did not settle');};
  try {
    await server.ssrLoadModule('/gate/unlock.js');
    const form=document.getElementById('unlock-form'),input=document.getElementById('password');
    const submit=()=>form.dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}));
    input.value='incorrect';submit();await waitFor(()=>!form.hasAttribute('aria-busy'));
    assert.match(document.getElementById('feedback').textContent,/incorrect/);assert.equal(document.querySelector('iframe'),null);assert.equal(input.value,'');
    input.value=password;submit();await waitFor(()=>!!document.querySelector('iframe'));
    const frame=document.querySelector('iframe');frame.contentWindow.focus=()=>{};
    assert.equal(frame.srcdoc,plain);assert.equal(fetchedUrl,'https://example.test/bilal/application.bin');
    assert.equal(location.href,'https://example.test/bilal/');assert.equal(document.getElementById('access-page').hidden,true);
    assert.equal(dom.window.localStorage.getItem('existing-project-check'),'kept');assert.equal(frame.contentWindow.localStorage.getItem('existing-project-check'),'kept');assert.equal(dom.window.sessionStorage.length,0);
    window.dispatchEvent(new dom.window.MessageEvent('message',{source:frame.contentWindow,origin:'https://attacker.test',data:{type:'atelier-footage:lock'}}));assert(document.querySelector('iframe'));
    window.dispatchEvent(new dom.window.MessageEvent('message',{source:frame.contentWindow,origin:location.origin,data:{type:'atelier-footage:lock'}}));
    assert.equal(document.querySelector('iframe'),null);assert.equal(document.getElementById('access-page').hidden,false);assert.equal(input.value,'');
    assert.equal(dom.window.localStorage.getItem('existing-project-check'),'kept');
  }finally{globalThis.fetch=originalFetch;await server.close();dom.window.close();}
});
