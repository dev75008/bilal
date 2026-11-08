import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createDemo} from '../src/domain.js';
import {startFallbackVisit} from '../src/visit-fallback.js';

test('visite : démarrage, dessin, sortie et nettoyage des écouteurs',()=>{
  const dom=new JSDOM('<div id="visit"><button class="visit-exit">Retour</button><canvas></canvas><button data-move="forward">Avancer</button></div>');
  globalThis.window=dom.window;globalThis.document=dom.window.document;
  let frame,draws=0,exits=0,cancelled=false;
  globalThis.requestAnimationFrame=callback=>{frame=callback;return 1;};globalThis.cancelAnimationFrame=()=>{cancelled=true;};
  dom.window.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:(_,key)=>key==='fill'?()=>draws++:()=>{}});
  const cleanup=startFallbackVisit(document.getElementById('visit'),createDemo(),()=>exits++,text=>assert.fail(text));
  assert.equal(document.body.style.overflow,'hidden');frame(16);assert(draws>0);
  window.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Escape'}));assert.equal(exits,1);cleanup();assert.equal(document.body.style.overflow,'');assert(cancelled);
  window.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Escape'}));assert.equal(exits,1);dom.window.close();
});
