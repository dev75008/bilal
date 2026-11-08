import React, {useEffect,useRef} from 'react';
import {startVisit} from './visit-engine.js';

export function Visit({project,onExit,onError}) {
  const ref=useRef(null);
  useEffect(()=>startVisit(ref.current,project,onExit,onError),[project,onExit,onError]);
  return <div ref={ref} className="visit-overlay" role="dialog" aria-modal="true" aria-label="Visite en première personne">
    <header><strong>Visite du département</strong><button className="visit-exit" onClick={onExit}>Retour au plan</button></header>
    <canvas aria-label="Vue en première personne" />
    <p className="visit-help">Glissez pour regarder. Flèches ou ZQSD pour marcher. Échap pour quitter.<br/>Hauteur de vue : 1,65 m. Dimensions estimées.</p>
    <div className="visit-pad"><button data-move="forward" aria-label="Avancer">↑</button><div><button data-move="left" aria-label="Aller à gauche">←</button><button data-move="back" aria-label="Reculer">↓</button><button data-move="right" aria-label="Aller à droite">→</button></div></div>
  </div>;
}
