import * as THREE from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {RectAreaLightUniformsLib} from 'three/addons/lights/RectAreaLightUniformsLib.js';
import {createVisitScene} from './visit-scene.js';
import {EYE_HEIGHT,findVisitStart,moveVisitor} from './visit-navigation.js';
import {startFallbackVisit} from './visit-fallback.js';

export function startVisit(panel,project,onExit,onError,options={}) {
  const spawn=findVisitStart(project);
  if(!project.items.length||!spawn){onError(!project.items.length?'Ajoutez au moins un mobilier pour visiter votre département.':'Aucun passage disponible pour commencer la visite.');return {dispose(){}};}
  const screen=panel.querySelector('canvas:not([data-fallback])'),fallbackScreen=panel.querySelector('[data-fallback]');
  let renderer,world,environment,raf=0,last=0,position={...spawn},pointer=null,invalidated=true,disposed=false,fallbackCleanup=null,lastPositionUpdate=-Infinity,lastReported={...spawn};
  const keys=new Set(),listeners=[],camera=new THREE.PerspectiveCamera(66,1,.04,Math.max(80,project.width+project.depth));
  camera.rotation.order='YXZ';
  const oldOverflow=document.body.style.overflow;document.body.style.overflow='hidden';
  const listen=(target,type,handler,settings)=>{target.addEventListener(type,handler,settings);listeners.push(()=>target.removeEventListener(type,handler,settings));};
  let observer;
  const releaseWebGL=()=>{
    cancelAnimationFrame(raf);observer?.disconnect();listeners.splice(0).forEach(remove=>remove());
    world?.dispose();environment?.dispose();
    if(renderer){renderer.dispose();renderer.forceContextLoss?.();renderer=null;}
  };
  const fallback=()=>{
    if(disposed||fallbackCleanup)return;
    releaseWebGL();screen.hidden=true;if(fallbackScreen)fallbackScreen.hidden=false;
    options.onReady?.({mode:'fallback'});
    fallbackCleanup=startFallbackVisit(panel,project,onExit,onError);
  };
  const syncCamera=()=>{camera.position.set(position.x,EYE_HEIGHT,position.z);camera.rotation.set(position.pitch,position.yaw,0,'YXZ');};
  const resize=()=>{
    if(!renderer||disposed)return;
    const width=Math.max(1,screen.clientWidth),height=Math.max(1,screen.clientHeight);
    renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();invalidated=true;
  };
  const setQuality=value=>{
    if(!renderer)return;
    const high=value!=='fluid';renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio||1,high?1.75:1.1));
    const light=world.keyLight,size=high?2048:1024;
    if(light.shadow.mapSize.x!==size){light.shadow.map?.dispose();light.shadow.map=null;light.shadow.mapSize.set(size,size);}
    renderer.shadowMap.needsUpdate=true;resize();
  };
  const reset=()=>{position={...spawn};lastReported={...position};keys.clear();pointer=null;invalidated=true;options.onPosition?.({...position});};
  const frame=now=>{
    if(disposed||!renderer)return;
    if(document.visibilityState==='hidden'){keys.clear();last=0;raf=0;return;}
    const dt=last?Math.min(.05,(now-last)/1000):0;last=now;
    const forward=Number(keys.has('forward'))-Number(keys.has('back')),side=Number(keys.has('right'))-Number(keys.has('left'));
    if(forward||side){position=moveVisitor(project,position,forward,side,dt,keys.has('fast')?3.3:2);invalidated=true;}
    try{
      if(invalidated){syncCamera();renderer.render(world.scene,camera);invalidated=false;}
      if(now-lastPositionUpdate>120&&(Math.hypot(position.x-lastReported.x,position.z-lastReported.z)>.03||Math.abs(position.yaw-lastReported.yaw)>.02)){options.onPosition?.({...position});lastReported={...position};lastPositionUpdate=now;}
      raf=requestAnimationFrame(frame);
    }catch{fallback();}
  };
  try{
    renderer=(options.createRenderer||((canvas)=>new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'})))(screen);
    renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.AgXToneMapping;renderer.toneMappingExposure=1.1;
    if(renderer.debug)renderer.debug.onShaderError=()=>{throw new Error('Le pilote graphique ne peut pas compiler la scène.');};
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;renderer.transmissionResolutionScale=.5;
    world=createVisitScene(project);
    if(renderer.isWebGLRenderer){
      RectAreaLightUniformsLib.init();
      const room=new RoomEnvironment(),generator=new THREE.PMREMGenerator(renderer);
      try{environment=generator.fromScene(room,.04);world.scene.environment=environment.texture;}finally{room.dispose();generator.dispose();}
    }
    screen.hidden=false;if(fallbackScreen)fallbackScreen.hidden=true;
    setQuality(options.quality||'high');syncCamera();
    const mapping={ArrowUp:'forward',z:'forward',w:'forward',ArrowDown:'back',s:'back',ArrowLeft:'left',q:'left',a:'left',ArrowRight:'right',d:'right',Shift:'fast'};
    listen(window,'keydown',event=>{
      if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();onExit();return;}
      if(event.target.closest?.('input,select,textarea,summary'))return;
      const key=mapping[event.key]||mapping[event.key.toLowerCase()];if(key){event.preventDefault();keys.add(key);}
    },true);
    listen(window,'keyup',event=>{const key=mapping[event.key]||mapping[event.key.toLowerCase()];if(key){keys.delete(key);event.preventDefault();}},true);
    listen(window,'blur',()=>{keys.clear();pointer=null;});
    listen(document,'visibilitychange',()=>{
      keys.clear();pointer=null;last=0;
      if(document.visibilityState==='hidden'){cancelAnimationFrame(raf);raf=0;}
      else if(!raf){invalidated=true;raf=requestAnimationFrame(frame);}
    });
    listen(screen,'pointerdown',event=>{pointer={id:event.pointerId,x:event.clientX,y:event.clientY};screen.setPointerCapture(event.pointerId);});
    listen(screen,'pointermove',event=>{
      if(!pointer||pointer.id!==event.pointerId)return;
      position.yaw-=(event.clientX-pointer.x)*.004;position.pitch=Math.max(-1.1,Math.min(1.1,position.pitch-(event.clientY-pointer.y)*.003));pointer.x=event.clientX;pointer.y=event.clientY;invalidated=true;
    });
    for(const type of ['pointerup','pointercancel','lostpointercapture'])listen(screen,type,()=>{pointer=null;});
    for(const button of panel.querySelectorAll('[data-move]')){
      listen(button,'pointerdown',event=>{event.preventDefault();button.setPointerCapture(event.pointerId);keys.add(button.dataset.move);});
      for(const type of ['pointerup','pointercancel','lostpointercapture'])listen(button,type,()=>keys.delete(button.dataset.move));
      listen(button,'keydown',event=>{if(event.key===' '||event.key==='Enter'){event.preventDefault();keys.add(button.dataset.move);}});
      listen(button,'keyup',event=>{if(event.key===' '||event.key==='Enter'){event.preventDefault();keys.delete(button.dataset.move);}});
      listen(button,'blur',()=>keys.delete(button.dataset.move));
    }
    listen(screen,'webglcontextlost',event=>{event.preventDefault();fallback();});
    observer=new ResizeObserver(resize);observer.observe(screen);resize();
    options.onReady?.({mode:'webgl'});options.onPosition?.({...position});raf=requestAnimationFrame(frame);
  }catch{fallback();}
  return {
    reset,setQuality,
    setDressing(value){if(!world||!renderer)return;world.dressingGroup.visible=value;renderer.shadowMap.needsUpdate=true;invalidated=true;},
    dispose(){if(disposed)return;disposed=true;fallbackCleanup?.();releaseWebGL();document.body.style.overflow=oldOverflow;},
  };
}
