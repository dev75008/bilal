'use strict';
// Normalized structural models, derived from the census illustrations. Dimensions remain estimates.
export const buildFurnitureParts=function(m,def){
 const parts=[],f=def.family,c='#e8ebe4',metal='#bdc7bf',wood='#cbb89a',dark='#52615a',glass='#d4e0dc';
 const B=(x,y,z,w,h,d,color=c)=>parts.push({x:x*m.l,y:y*m.h,z:z*m.d,w:w*m.l,h:h*m.h,d:d*m.d,color});
 const leg=(x,z,top=.85)=>B(x,0,z,.035,top,.045,metal);
 const base=(y=.03)=>B(0,y,0,1,.04,1);
 const posts=(h=.95)=>{for(const x of [-.46,.46])for(const z of [-.43,.43])leg(x,z,h);};
 const shelf=(y,w=1,d=1,color=c)=>B(0,y,0,w,.025,d,color);
 const shelves=(n=4,start=.12,end=.9,color=c)=>{for(let i=0;i<n;i++)shelf(start+(end-start)*i/Math.max(1,n-1),1,1,color);};
 const wheels=()=>{for(const x of [-.43,.43])for(const z of [-.4,.4])B(x,0,z,.055,.045,.09,dark);};
 const beam=(y=1)=>B(0,y,0,1,.03,.04,metal);
 const panel=(x=0,z=0,w=1,h=.9,depth=.025,col=c)=>B(x,.06,z,w,h,depth,col);
 const slats=(x,z,w,h=.85,rot=false)=>{for(let i=0;i<14;i++){const y=.1+i*h/14;if(rot)B(x,y,z,.02,.01,w,metal);else B(x,y,z,w,.01,.025,metal);}};
 const mesh=(x,z,w,h=.85,rot=false)=>{slats(x,z,w,h,rot);for(let i=0;i<=10;i++){if(rot)B(x,.08,z-w/2+i*w/10,.013,h,.01,metal);else B(x-w/2+i*w/10,.08,z,.01,h,.013,metal);}};
 const frame=(shelfCount=0)=>{base();for(const x of [-.46,.46]){B(x,.06,0,.035,.9,.04,metal);B(x,.03,0,.04,.025,.95,metal);}beam(.96);if(shelfCount)shelves(shelfCount,.1,.55);};
 const table=(levels=3,color=c)=>{posts(.92);shelves(levels,.12,.92,color);wheels();};
 const cyl=(x,y,z,r,h,color=c,topRadius=r)=>parts.push({x:x*m.l,y:y*m.h,z:z*m.d,r:r*Math.min(m.l,m.d),h:h*m.h,topRadius:topRadius*Math.min(m.l,m.d),color,cylinder:true});
 const family=f;
 if(['rail','singleRail','fourArm','suspended','doubleRail'].includes(f)){
  const modules=Math.max(1,def.modules||1);wheels();
  if(f==='fourArm'){base();B(0,.03,0,.04,.94,.04,metal);for(const y of [.54,.9]){B(0,y,0,.9,.025,.035,metal);B(0,y,0,.035,.025,.9,metal);}}
  else if(f==='singleRail'){if(def.column==='I'){B(0,.02,0,.035,.93,.04,metal);B(0,.94,0,.95,.025,.035,metal);B(0,.02,0,.035,.025,.9,metal);}else frame();}
  else if(f==='suspended'){base();for(const x of [-.46,.46]){B(x,.04,0,.025,.9,.025,metal);B(x,.87,0,.025,.025,.8,metal);}beam(.96);}
  else if(f==='doubleRail'){for(let j=0;j<(def.column>='DO'?3:2);j++){const x=-.45+j*.9/(def.column>='DO'?2:1);for(const z of [-.36,.36])B(x,.04,z,.035,.9,.035,metal);B(x,.9,0,.035,.025,.85,metal);}for(const z of [-.36,.36])B(0,.9,z,.95,.025,.035,metal);shelf(.45,.95,.7);}
  else{for(let j=0;j<=modules;j++){const x=-.32+j*.64/modules;B(x,.04,0,.035,.88,.035,metal);B(x,.04,0,.04,.03,.85,metal);}for(const y of [.5,.9]){B(0,y,0,.95,.028,.035,metal);const bars=Math.max(3,Math.round(((def.footage||10)+2)/4));for(let j=0;j<bars;j++)B(-.42+j*.84/(bars-1),y,0,.025,.025,.95,metal);}}
 }
 else if(['frame','frameShelf','panel','slat','peg','meshPanel','curvedPanel','column'].includes(f)){
  wheels();base();let modules=def.modules||1;
  for(let i=0;i<=modules;i++)B(-.46+i*.92/modules,.05,0,.025,.9,.04,metal);beam(.96);
  if(f==='frameShelf')shelves(2,.15,.5);
  if(f==='panel'){panel(0,0,.94,.85);slats(0,0,.92);}
  if(f==='slat'){panel(0,0,.95,.85);slats(0,.035,.95);slats(0,-.035,.95);for(const x of [-.47,.47]){B(x,.06,0,.025,.88,.9);slats(x,0,.9,.85,true);}}
  if(f==='peg'){panel(0,0,.95,.85);for(let x=-.4;x<=.41;x+=.16)for(let y=.2;y<.9;y+=.14)B(x,y,0,.015,.012,.85,metal);}
  if(f==='meshPanel')mesh(0,0,.95,.88);
  if(f==='curvedPanel'){for(let x=-.45;x<.5;x+=.3){panel(x,0,.28,.7+(.45-Math.abs(x))*.4);for(let y=.2;y<.8;y+=.15)B(x,y,.14,.12,.015,.28,metal);}}
  if(f==='column'){B(0,0,0,.7,1,.7);for(const z of [-.38,.38]){panel(0,z,.8,.95);slats(0,z,.8,.9);for(let y=.2;y<.9;y+=.17)B(0,y,z,.85,.025,.3);}}
 }
 else if(['table','woodTable','goalTable','shoeTable','cubbyTable','denimTable','stepTable','plinth','pedestal','luggage','collection'].includes(f)){
  if(f==='plinth'){if(def.column==='CH'||def.column==='CQ'){for(let i=0;i<3;i++)B(0,.03+i*.28,0,1-i*.12,.26,1-i*.12);}else B(0,0,0,1,.3,1,dark);}
  else if(f==='stepTable'){posts(.64);for(let i=0;i<3;i++){const width=1-i*.28,depth=1-i*.28,y=.09+i*.29;B(0,y,0,width,.025,depth);for(const x of [-width*.46,width*.46])for(const z of [-depth*.46,depth*.46])B(x,0,z,.025,y,.025,metal);}if(def.column==='EY')for(const x of [-.25,0,.25])B(x,.12,0,.02,.52,.9);if(def.column==='FL'||def.column==='FM')B(-.22,.72,0,.5,.2,.7);}
  else if(f==='luggage'){shelf(.1,1,1,wood);shelf(.8,.72,.75,wood);for(const x of [-.3,.3])for(const z of [-.3,.3])leg(x,z,.82);wheels();}
  else if(f==='pedestal'){posts(.9);shelf(.93);slats(-.47,0,.85,.8,true);}
  else if(f==='collection'){table(2,wood);B(-.28,.25,0,.45,.025,.95,wood);for(const x of [-.4,.4]){B(x,.02,-.43,.025,.95,.025,metal);slats(x,-.43,.85,.9,true);}B(0,.6,0,.65,.025,.6,wood);}
  else{table(f==='shoeTable'?2:3,f==='woodTable'||f==='denimTable'?wood:c);
   if(f==='goalTable'){for(const x of [-.4,.4])B(x,.8,0,.025,.2,.025,metal);beam(1);}
   if(f==='denimTable'){B(0,.64,-.35,.94,.34,.03,wood);}
   if(f==='cubbyTable'){for(const x of [-.25,0,.25])B(x,.12,0,.02,.79,.95);}
  }
 }
 else if(['shelf','darkShelf','beauty','discRack','tower','shoeTower','featureTable','featureShelf','featureRail','beautyDesk','wardrobe','display','denimRail','denimShelf','cubby','kitchen','woodTable'].includes(f)){
  let col=f==='darkShelf'?dark:c;
  if(f==='beautyDesk'){posts(.55);shelf(.55);panel(0,-.4,.9,.88);B(0,.6,-.38,.45,.26,.02,dark);}
  else if(f==='wardrobe'){for(const x of [-.46,.46])B(x,.03,0,.06,.94,1);base();shelf(.97);for(const y of [.5,.86])B(0,y,0,.9,.025,.025,metal);}
  else if(f==='display'){base();B(0,.03,0,.025,.95,.03,metal);for(let y=.35;y<.92;y+=.18)B(0,y,0,.8,.025,.08,metal);}
  else if(f==='denimRail'||f==='denimShelf'){base();panel(0,-.44,.95,.95,.025,wood);if(f==='denimRail'){B(0,.8,.05,.8,.02,.02,metal);posts(.8);}else shelves(f==='denimShelf'?5:2,.15,.7,wood);}
  else if(f==='featureRail'||f==='featureShelf'){posts(.95);shelf(.03);shelf(.97);if(f==='featureRail')beam(.8);else shelves(3,.25,.75);}
  else if(f==='discRack'){frame();for(let y=.15;y<.9;y+=.15)for(let x=-.38;x<.5;x+=.25){cyl(x,y,.25,.1,.025,c);cyl(x,y,-.25,.1,.025,c);}}
  else if(f==='cubby'){const count={'FI':3,'FJ':4,'FK':5}[def.column]||3;posts(.95);shelves(4,.06,.9);for(let j=0;j<=count;j++)B(-.5+j/count,.06,0,.018,.87,1);}
  else if(f==='kitchen'){posts(.8);shelves(4,.06,.7,wood);for(const x of [-.45,0,.45])B(x,.06,0,.025,.66,1,dark);B(0,.75,-.18,.8,.2,.04,dark);}
  else{posts(.96);shelves(f==='shoeTower'?8:f==='beauty'?5:f==='featureTable'?2:5,.08,.93,col);if(['tower','beauty','shelf'].includes(f))panel(0,0,.94,.87,.025,col);if(f==='beauty'){for(const x of [-.46,.46])B(x,.05,0,.03,.93,1,col);}if(f==='featureTable'){for(const z of [-.43,.43])B(0,.92,z,1,.08,.03,metal);}if(f==='shoeTower')B(0,.94,0,.65,.05,.8);wheels();}
 }
 else if(['cage','crate','dump','acrylicDump','rugRack','wrapBin','umbrella'].includes(f)){
  base();posts(f==='dump'||f==='acrylicDump'?.75:.95);wheels();
  if(f==='acrylicDump'){for(const z of [-.46,.46])B(0,.5,z,1,.36,.02,glass);for(const x of [-.46,.46])B(x,.5,0,.02,.36,1,glass);shelf(.5);}
  else if(f==='dump'){for(const z of [-.46,.46])mesh(0,z,.95,.42);for(const x of [-.46,.46])mesh(x,0,.95,.42,true);shelf(.45);}
  else if(f==='rugRack'){for(let x=-.45;x<=.5;x+=.09)B(x,.03,0,.018,.9,.9,metal);}
  else if(f==='wrapBin'){B(0,.03,0,.95,.22,.95,dark);panel(0,-.4,.95,.94);B(0,.6,.05,.95,.02,.7);}
  else if(f==='umbrella'){for(const y of [.2,.7]){for(const z of [-.4,.4])B(0,y,z,1,.025,.03,metal);for(let x=-.45;x<=.5;x+=.15)B(x,y,0,.018,.025,.9,metal);}}
  else{for(const z of [-.46,.46])mesh(0,z,.95,.87);for(const x of [-.46,.46])mesh(x,0,.95,.87,true);if(f==='crate')shelves(2,.35,.65);}
 }
 else if(f==='house'){posts(.7);shelves(3,.05,.65,wood);for(const x of [-.46,.46])for(const z of [-.4,.4])B(x,.7,z,.025,.12,.025,metal);for(const z of [-.4,.4]){for(let i=0;i<10;i++){const x=-.45+i*.1,y=.83+(.5-Math.abs(x))*.25;B(x,y,z,.1,.02,.02,metal);}}}
 else if(f==='showroom'||f==='bedroom'){base();panel(0,-.47,1,.95);B(-.47,.04,0,.03,.9,1);if(f==='bedroom'){B(0,.1,0,.7,.22,.8,wood);B(0,.32,0,.68,.08,.78,c);B(0,.4,-.3,.6,.25,.04,wood);}else{for(let x=-.4;x<.5;x+=.25)B(x,.05,-.32,.02,.9,.3);for(let y=.1;y<1;y+=.2)B(0,y,-.32,.95,.02,.3);}}
 else if(f==='roundTower'||f==='flower'){cyl(0,0,0,.45,.05,dark);cyl(0,.04,0,.07,.9,metal);for(let y=.2;y<.95;y+=.2){cyl(0,y,0,.4,.025,c);if(f==='flower')for(let a=0;a<6;a++){const x=Math.cos(a*Math.PI/3)*.3,z=Math.sin(a*Math.PI/3)*.3;cyl(x,y,z,.1,.13,c,.14);}}}
 else if(f==='bowl'){posts(.65);shelf(.68);for(const x of [-.34,0,.34]){cyl(x,.71,0,.12,.17,glass,.17);}}
 else if(['wallRail','wallShelf','wallMixed'].includes(f)){base();panel(0,-.4,1,.94);for(const x of [-.46,.46])B(x,.03,-.4,.025,.94,.025,metal);if(f!=='wallRail')for(let y=.15;y<.95;y+=.18)shelf(y,1,.9);if(f!=='wallShelf')for(const y of [.5,.84])B(0,y,.05,.9,.025,.035,metal);}
 else {frame();}
 return parts;
};
