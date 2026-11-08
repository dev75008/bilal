import {buildFurnitureParts} from './furniture-models.js';
export function renderFurniture(target,m,def,projection,cameraYaw,sectionTint=null){
 const faces=[],a=m.r*Math.PI/180,co=Math.cos(a),si=Math.sin(a);
 const world=p=>[m.x+p[0]*co-p[2]*si,p[1],m.z+p[0]*si+p[2]*co];
 const add=(points,color,shade=1)=>{const worldPoints=points.map(world);faces.push({points:worldPoints.map(p=>projection(...p)),depth:worldPoints.reduce((s,p)=>s+(p[0]*Math.sin(cameraYaw)+p[2]*Math.cos(cameraYaw))*.85+p[1]*.52,0)/points.length,color:sectionTint||color,shade});};
 for(const part of buildFurnitureParts(m,def)){
  if(part.cylinder){const count=16,top=[],bottom=[];for(let i=0;i<count;i++){const ang=i*Math.PI*2/count;bottom.push([part.x+Math.cos(ang)*part.r,part.y,part.z+Math.sin(ang)*part.r]);top.push([part.x+Math.cos(ang)*part.topRadius,part.y+part.h,part.z+Math.sin(ang)*part.topRadius]);}for(let i=0;i<count;i++)add([bottom[i],bottom[(i+1)%count],top[(i+1)%count],top[i]],part.color,.8+.2*i/count);add(top,part.color,1.08);}
  else{const v=[];for(const y of [part.y,part.y+part.h])for(const z of [-1,1])for(const x of [-1,1])v.push([part.x+x*part.w/2,y,part.z+z*part.d/2]);for(const [ix,shade] of [[[0,1,5,4],.85],[[2,3,7,6],.95],[[0,2,6,4],.8],[[1,3,7,5],.9],[[4,5,7,6],1.06]])add(ix.map(i=>v[i]),part.color,shade);}
 }
 faces.sort((a,b)=>a.depth-b.depth);
 for(const face of faces){const hex=face.color.replace('#','');const rgb=[0,2,4].map(i=>Math.min(255,Math.round(parseInt(hex.slice(i,i+2),16)*face.shade)));target.beginPath();face.points.forEach((p,i)=>i?target.lineTo(...p):target.moveTo(...p));target.closePath();target.fillStyle='rgb('+rgb.join(',')+')';target.fill();target.strokeStyle='#52685b45';target.lineWidth=.45;target.stroke();}
}