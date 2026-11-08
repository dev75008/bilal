import {test} from 'node:test';
import assert from 'node:assert/strict';
import React, {act} from 'react';
import {createRoot} from 'react-dom/client';
import {JSDOM} from 'jsdom';
import {createServer} from 'vite';

test('parcours React : démo, modification, annulation, sauvegarde et rechargement',async()=>{
  const dom=new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>',{url:'https://example.test/'});
  for(const key of ['window','document','location','localStorage','HTMLElement','HTMLCanvasElement','FormData','Event','MouseEvent','KeyboardEvent'])globalThis[key]=dom.window[key];
  globalThis.IS_REACT_ACT_ENVIRONMENT=true;globalThis.devicePixelRatio=1;globalThis.ResizeObserver=class{observe(){}disconnect(){}};
  dom.window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};dom.window.HTMLDialogElement.prototype.close=function(){this.open=false;};
  dom.window.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:()=>()=>{}});
  const server=await createServer({server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'});
  let root;
  try {
    const {default:App}=await server.ssrLoadModule('/src/App.jsx');root=createRoot(document.getElementById('root'));
    await act(async()=>root.render(React.createElement(App)));
    const click=async text=>{const button=[...document.querySelectorAll('button')].find(button=>button.textContent.trim()===text);assert(button,'Bouton absent : '+text);await act(async()=>button.click());};
    assert.match(document.body.textContent,/Aucun compte nécessaire/);
    await click('Explorer la démo D1');assert.match(document.body.textContent,/25 mobiliers/);assert.match(document.body.textContent,/244/);
    const list=document.querySelector('.furniture-list');await act(async()=>list.querySelector('button').click());await click('Dupliquer');assert.match(list.textContent,/26/);
    await click('Annuler');assert.match(list.textContent,/25/);await click('Rétablir');assert.match(list.textContent,/26/);await click('Annuler');
    await click('Enregistrer');const form=document.querySelector('dialog form');assert(form);form.elements.namedItem('name').value='D1 — React';await act(async()=>form.dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true})));
    assert.equal(JSON.parse(localStorage.getItem('atelier-footage-v2')).departments[0].name,'D1 — React');assert.equal(JSON.parse(localStorage.getItem('atelier-footage-v2')).departments[0].items.length,25);
    await click('Accueil');assert.match(document.querySelector('.saved-grid').textContent,/D1 — React/);
    await act(async()=>root.unmount());root=createRoot(document.getElementById('root'));await act(async()=>root.render(React.createElement(App)));
    await click('Reprendre la session');assert.match(document.querySelector('.editor-toolbar h1').textContent,/D1 — React/);assert.match(document.body.textContent,/25 mobiliers/);
    await click('Accueil');await act(async()=>document.querySelector('.home-action').click());
    const departmentForm=document.querySelector('dialog form');assert(departmentForm);await act(async()=>departmentForm.dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true})));
    const sections=document.querySelector('.inspector select');sections.value=sections.options[1].value;await act(async()=>sections.dispatchEvent(new dom.window.Event('change',{bubbles:true})));
    const r1=[...document.querySelectorAll('.catalog-card')].find(card=>card.querySelector('h3').textContent==='R1');await act(async()=>[...r1.querySelectorAll('button')].find(button=>button.textContent==='Placer').click());
    await click('Placer au centre');assert.match(document.querySelector('.furniture-list').textContent,/1/);assert.match(document.querySelector('.allocation-heading').textContent,/10/);
    await click('Tourner +90°');await click('Dupliquer');assert.match(document.querySelector('.furniture-list').textContent,/2/);
    await act(async()=>window.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'z',ctrlKey:true,bubbles:true})));assert.match(document.querySelector('.furniture-list').textContent,/\(1\)/);
    await click('Enregistrer');const secondForm=document.querySelector('dialog form');secondForm.elements.namedItem('name').value='Nouvelle session React';await act(async()=>secondForm.dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true})));
    await click('Accueil');await act(async()=>[...document.querySelectorAll('.home-action')].find(button=>button.textContent.startsWith('Continuer')).click());assert.equal(document.querySelector('.editor-toolbar h1').textContent,'Nouvelle session React');
    const originalSet=dom.window.Storage.prototype.setItem;dom.window.Storage.prototype.setItem=()=>{throw Error('quota');};await click('Enregistrer');assert.match(document.querySelector('.app-status').textContent,/Enregistrement impossible/);dom.window.Storage.prototype.setItem=originalSet;
    assert.equal(document.querySelectorAll('iframe').length,0);assert.equal(document.querySelector('button')?.textContent.includes('ChatGPT'),false);
  } finally {if(root)await act(async()=>root.unmount());await server.close();dom.window.close();}
});
