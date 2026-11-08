import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {Box3,Matrix4,Vector3} from 'three';
import {createDemo,catalog,newProject} from '../src/domain.js';
import {createVisitScene} from '../src/visit-scene.js';
import {canWalk,findVisitStart,moveVisitor,EYE_HEIGHT} from '../src/visit-navigation.js';
import {startVisit} from '../src/visit-engine.js';

test('scène 3D : volumes, matériaux physiques, ombres et articles indépendants du plan',()=>{
  const project=createDemo(),before=JSON.stringify(project),world=createVisitScene(project);
  let instances=0,transmission=false,wood=false,disposals=0;
  world.scene.traverse(object=>{
    if(object.isInstancedMesh)instances+=object.count;
    if(object.material?.transmission>.5)transmission=true;
    if(object.material?.map?.isDataTexture)wood=true;
    object.geometry?.addEventListener('dispose',()=>disposals++);
  });
  assert(instances>project.items.length);assert(transmission);assert(wood);assert(world.keyLight.castShadow);assert(world.dressingGroup.children.length>0);
  assert(world.scene.getObjectByName('Sol en grès'));assert(world.scene.getObjectByName('Mobilier du plan'));
  world.dressingGroup.visible=false;assert.equal(JSON.stringify(project),before);
  world.dispose();assert(disposals>0);assert.equal(world.scene.children.length,0);world.dispose();
});

test('toutes les références produisent des matrices finies et un volume visible',()=>{
  const project={...newProject('Sacs femmes',60,60),items:catalog.map((def,index)=>({id:index+1,type:def.id,...def.dimensions,x:(index%15-7)*3.7,z:(Math.floor(index/15)-7)*3.7,r:(index%4)*45,section:'Non affecté'}))};
  const world=createVisitScene(project),matrix=new Matrix4();let count=0;
  world.scene.traverse(object=>{if(object.isInstancedMesh)for(let index=0;index<object.count;index++){object.getMatrixAt(index,matrix);assert(matrix.elements.every(Number.isFinite));assert(Math.abs(matrix.determinant())>1e-12);count++;}});
  assert(count>catalog.length);assert(!new Box3().setFromObject(world.scene).isEmpty());world.dispose();
});

test('navigation : entrée libre, murs, meubles tournés et déplacement diagonal normalisé',()=>{
  const project=createDemo(),spawn=findVisitStart(project);assert(canWalk(project,spawn.x,spawn.z));assert.equal(EYE_HEIGHT,1.65);
  assert(!canWalk(project,project.width/2,0));const item=project.items[0];assert(!canWalk(project,item.x,item.z));
  const empty={...newProject(),items:[]},start={x:0,z:0,yaw:0,pitch:0};
  const straight=moveVisitor(empty,start,1,0,.05),diagonal=moveVisitor(empty,start,1,1,.05);assert(Math.abs(Math.hypot(diagonal.x,diagonal.z)-Math.abs(straight.z))<1e-9);
  const wall=moveVisitor(empty,{...start,x:empty.width/2-.23},0,1,1,100);assert(canWalk(empty,wall.x,wall.z));
  const blocked={...newProject(),items:[{x:0,z:0,l:10,d:8,r:45}]};assert.equal(findVisitStart({...blocked,items:[{x:0,z:0,l:20,d:20,r:0}]}),null);
});

test('cycle de vie WebGL : déplacement, qualité, reprise, perte de contexte et nettoyage',()=>{
  const dom=new JSDOM('<div id="visit"><button class="visit-exit">Retour</button><canvas></canvas><canvas data-fallback hidden></canvas><button data-move="forward">Avancer</button></div>',{pretendToBeVisual:true});
  globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.devicePixelRatio=2;
  let frame,rendered=0,disposed=0,exits=0,mode,position;
  globalThis.requestAnimationFrame=callback=>{frame=callback;return 1;};globalThis.cancelAnimationFrame=()=>{};
  globalThis.ResizeObserver=class{observe(){}disconnect(){}};
  dom.window.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:()=>()=>{}});
  const renderer={shadowMap:{},setPixelRatio(value){this.ratio=value;},setSize(){},render(){rendered++;},dispose(){disposed++;},forceContextLoss(){}};
  const project=createDemo(),panel=document.getElementById('visit'),instance=startVisit(panel,project,()=>exits++,text=>assert.fail(text),{createRenderer:()=>renderer,onReady:value=>mode=value.mode,onPosition:value=>position=value});
  assert.equal(mode,'webgl');assert.equal(renderer.ratio,1.75);assert.equal(document.body.style.overflow,'hidden');
  frame(100);assert.equal(rendered,1);frame(120);assert.equal(rendered,1,'idle does not redraw');
  const before={...position};window.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'z'}));frame(260);assert(position.z<before.z);window.dispatchEvent(new dom.window.KeyboardEvent('keyup',{key:'z'}));
  instance.setQuality('fluid');assert.equal(renderer.ratio,1.1);instance.setDressing(false);frame(400);assert(rendered>=3);instance.reset();assert.equal(position.z,before.z);
  Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});document.dispatchEvent(new dom.window.Event('visibilitychange'));const hiddenFrames=rendered;frame(420);assert.equal(rendered,hiddenFrames);
  Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});document.dispatchEvent(new dom.window.Event('visibilitychange'));frame(450);assert(rendered>hiddenFrames);
  panel.querySelector('canvas').dispatchEvent(new dom.window.Event('webglcontextlost',{cancelable:true}));assert.equal(mode,'fallback');assert.equal(disposed,1);assert.equal(panel.querySelector('[data-fallback]').hidden,false);
  instance.dispose();instance.dispose();assert.equal(document.body.style.overflow,'');assert.equal(disposed,1);window.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Escape'}));assert.equal(exits,0);dom.window.close();
});

test('WebGL indisponible : la visite simplifiée reste utilisable',()=>{
  const dom=new JSDOM('<div id="visit"><button class="visit-exit">Retour</button><canvas></canvas><canvas data-fallback hidden></canvas></div>',{pretendToBeVisual:true});
  globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=()=>{};
  dom.window.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:()=>()=>{}});
  let mode;const visit=startVisit(document.getElementById('visit'),createDemo(),()=>{},text=>assert.fail(text),{createRenderer(){throw new Error('WebGL unavailable');},onReady:value=>mode=value.mode});
  assert.equal(mode,'fallback');assert.equal(document.querySelector('canvas').hidden,true);assert.equal(document.querySelector('[data-fallback]').hidden,false);visit.dispose();assert.equal(document.body.style.overflow,'');dom.window.close();
});
