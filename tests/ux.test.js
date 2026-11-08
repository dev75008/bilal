import {test} from 'node:test';
import assert from 'node:assert/strict';
import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
import {JSDOM} from 'jsdom';
import {createServer} from 'vite';
import {newProject,catalogById} from '../src/domain.js';

async function environment(run){
  const dom=new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>',{url:'https://example.test/'});
  for(const key of ['window','document','location','localStorage','HTMLElement','HTMLCanvasElement','FormData','Event','MouseEvent','KeyboardEvent'])globalThis[key]=dom.window[key];
  globalThis.IS_REACT_ACT_ENVIRONMENT=true;globalThis.devicePixelRatio=1;globalThis.ResizeObserver=class{observe(){}disconnect(){}};
  dom.window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};dom.window.HTMLDialogElement.prototype.close=function(){this.open=false;};
  dom.window.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:()=>()=>{}});dom.window.HTMLCanvasElement.prototype.setPointerCapture=()=>{};
  const server=await createServer({server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'}),root=createRoot(document.getElementById('root'));
  try{await run({dom,server,root});}finally{await act(async()=>root.unmount());await server.close();dom.window.close();}
}

test('accueil, aide et options : navigation accessible et raccourcis protégés',async()=>environment(async({dom,server,root})=>{
  const {default:App}=await server.ssrLoadModule('/src/App.jsx');await act(async()=>root.render(React.createElement(App)));
  const click=async text=>{const button=[...document.querySelectorAll('button')].find(button=>button.textContent.trim()===text);assert(button,text);await act(async()=>button.click());};
  assert.equal(document.querySelector('a.skip-link').getAttribute('href'),'#main-content');assert.equal(document.getElementById('main-content').tabIndex,-1);assert.match(document.querySelector('.demo-facts').textContent,/244/);
  for(const button of document.querySelectorAll('button'))assert(button.getAttribute('aria-label')||button.textContent.trim(),'Bouton sans nom accessible');
  await click('Explorer la démo D1');await act(async()=>document.querySelector('.furniture-list>button').click());
  const count=document.querySelector('.furniture-list').textContent;
  const help=document.querySelector('[aria-label="Aide et raccourcis"]');help.focus();await act(async()=>help.click());assert(document.querySelector('dialog').open);assert.match(document.querySelector('dialog').textContent,/Vos raccourcis/);
  await act(async()=>window.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Delete',bubbles:true})));assert.equal(document.querySelector('.furniture-list').textContent,count);
  await act(async()=>window.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'s',ctrlKey:true,bubbles:true})));assert.equal(document.querySelectorAll('dialog').length,1);
  await click('Fermer');assert.equal(document.activeElement,help);
  const menu=document.querySelector('.project-menu');menu.open=true;await click('Renommer');assert.equal(menu.open,false);assert(document.querySelector('dialog form input[name="name"]'));
  await click('Fermer');await click('Dupliquer');assert.match(document.querySelector('.app-status').textContent,/Plan modifié/);await click('Annuler');assert.match(document.querySelector('.app-status').textContent,/annulée/);
  await act(async()=>document.querySelector('.brand').click());assert.match(document.querySelector('h1').textContent,/atelier/);assert.equal(document.getElementById('main-content').tabIndex,-1);
}));

test('l’aperçu manipulable tourne sans sélectionner ni déplacer les meubles',async()=>environment(async({dom,server,root})=>{
  const {PlanCanvas}=await server.ssrLoadModule('/src/PlanCanvas.jsx');
  Object.defineProperty(dom.window.HTMLCanvasElement.prototype,'clientWidth',{configurable:true,get:()=>900});Object.defineProperty(dom.window.HTMLCanvasElement.prototype,'clientHeight',{configurable:true,get:()=>400});
  const project={...newProject(),items:[{id:1,type:'R1',...catalogById.R1.dimensions,x:0,z:0,r:0,section:'Non affecté'}]},before=JSON.stringify(project);let selected=0,moved=0;
  const render=orbitOnly=>React.createElement(PlanCanvas,{project,orbitOnly,onSelect:()=>selected++,onMove:()=>moved++});
  await act(async()=>root.render(render(true)));
  const pointer=async(type,x,y)=>{const event=new dom.window.Event(type,{bubbles:true});Object.assign(event,{clientX:x,clientY:y,pointerId:1});await act(async()=>document.querySelector('canvas').dispatchEvent(event));};
  await pointer('pointerdown',450,194);await pointer('pointermove',500,194);await pointer('pointerup',500,194);assert.equal(selected,0);assert.equal(moved,0);assert.equal(JSON.stringify(project),before);
  await act(async()=>root.render(render(false)));await pointer('pointerdown',450,194);assert.equal(selected,1,'le plan de travail conserve la sélection');await pointer('pointerup',450,194);
}));
