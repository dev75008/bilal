import React, {useCallback,useEffect,useRef,useState} from 'react';
import './visit.css';

export function Visit({project,onExit,onError}) {
  const ref=useRef(null),controller=useRef(null);
  const [mode,setMode]=useState('loading'),[quality,setQuality]=useState('high'),[dressing,setDressing]=useState(true),[position,setPosition]=useState(null);
  const ready=useCallback(({mode})=>setMode(mode),[]);
  useEffect(()=>{
    const previous=document.activeElement;let cancelled=false;
    ref.current.querySelector('.visit-exit').focus();
    import('./visit-engine.js').then(({startVisit})=>{
      if(cancelled)return;
      controller.current=startVisit(ref.current,project,onExit,onError,{onReady:ready,onPosition:setPosition});
    }).catch(()=>{if(!cancelled)onError('La visite n’a pas pu être chargée. Vérifiez votre connexion et réessayez.');});
    return()=>{cancelled=true;controller.current?.dispose();controller.current=null;previous?.focus?.();};
  },[project,onExit,onError,ready]);
  const focusTrap=event=>{
    if(event.key!=='Tab')return;
    const controls=[...ref.current.querySelectorAll('button,input,select,summary')].filter(element=>!element.disabled&&!element.closest('[hidden]')&&(!element.closest('details')||element.tagName==='SUMMARY'||element.closest('details').open));
    const first=controls[0],last=controls[controls.length-1];
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
  };
  return <div ref={ref} className="visit-overlay realistic-visit" role="dialog" aria-modal="true" aria-label="Visite immersive du département" onKeyDown={focusTrap}>
    <header className="visit-header"><div><strong>{project.name}</strong><span>{project.width} × {project.depth} m · hauteur de vue 1,65 m</span></div><button className="visit-exit" onClick={onExit}>Retour au plan</button></header>
    <canvas className="visit-render" aria-label="Scène 3D immersive. Utilisez le clavier ou les commandes de déplacement pour parcourir le département." />
    <canvas className="visit-render" data-fallback hidden={mode!=='fallback'} aria-label="Vue 3D simplifiée de secours" />
    {mode==='loading'&&<div className="visit-loading" role="status"><strong>Préparation de la visite</strong><span>Éclairage, matériaux et mobilier…</span></div>}
    {mode==='fallback'&&<p className="visit-fallback-notice" role="status">Mode simplifié : le rendu avancé est indisponible sur cet appareil. Vous pouvez poursuivre la visite.</p>}
    <div className="visit-tools">
      <details className="visit-instructions"><summary>Se déplacer</summary><p>Glissez la scène pour regarder autour de vous. Utilisez les flèches ou ZQSD pour marcher, Maj pour accélérer. Échap pour revenir au plan.</p></details>
      {mode==='webgl'&&<><label>Qualité<select value={quality} onChange={event=>{setQuality(event.target.value);controller.current?.setQuality(event.target.value);}}><option value="high">Élevée</option><option value="fluid">Fluide</option></select></label><label className="visit-dressing"><input type="checkbox" checked={dressing} onChange={event=>{setDressing(event.target.checked);controller.current?.setDressing(event.target.checked);}}/>Articles de démonstration</label><button onClick={()=>controller.current?.reset()}>Revenir à l’entrée</button></>}
    </div>
    {mode==='webgl'&&position&&<figure className="visit-minimap"><svg viewBox={`${-project.width/2-.4} ${-project.depth/2-.4} ${project.width+.8} ${project.depth+.8}`} role="img" aria-label="Votre position dans le département"><rect x={-project.width/2} y={-project.depth/2} width={project.width} height={project.depth} fill="#f2f4f2" stroke="#697b7d" strokeWidth=".06"/>{project.items.map(item=><rect key={item.id} x={item.x-item.l/2} y={item.z-item.d/2} width={item.l} height={item.d} rx=".04" transform={`rotate(${item.r} ${item.x} ${item.z})`} fill="#a6b2b1"/>)}<g transform={`translate(${position.x} ${position.z}) rotate(${-position.yaw*180/Math.PI})`}><path d="M0,-.5 L-.24,.24 L0,.12 L.24,.24 Z" fill="#007c9e" stroke="#fff" strokeWidth=".05"/></g></svg><figcaption>Vous êtes ici</figcaption></figure>}
    <div className="visit-pad" aria-label="Commandes de déplacement"><button data-move="forward" aria-label="Avancer"><Arrow/></button><div><button data-move="left" aria-label="Aller à gauche"><Arrow rotate={-90}/></button><button data-move="back" aria-label="Reculer"><Arrow rotate={180}/></button><button data-move="right" aria-label="Aller à droite"><Arrow rotate={90}/></button></div></div>
    <p className="visit-disclaimer">{mode==='webgl'&&dressing?'Articles indicatifs. ':''}Modèles et dimensions estimés. Votre plan et son footage restent inchangés.</p>
  </div>;
}

function Arrow({rotate=0}) {return <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true" style={{transform:`rotate(${rotate}deg)`}}><path d="m5 12 7-7 7 7M12 5v15"/></svg>;}
