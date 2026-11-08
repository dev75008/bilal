import React, {useEffect, useRef} from 'react';
import {catalogById, sectionColor, placeItem} from './domain.js';
import {renderFurniture} from './renderer.js';

export function PlanCanvas({project,view='3',selected,pending,snap=true,step=1,onSelect=()=>{},onPlace=()=>{},onMove=()=>{},onError=()=>{},interactive=true,orbitOnly=false}) {
  const ref = useRef(null), camera = useRef({yaw:-.65,zoom:1}), gesture = useRef(null), latest = useRef(null);
  latest.current = {project,view,selected,pending,snap,step,onSelect,onPlace,onMove,onError};
  const engine = useRef({});
  useEffect(() => {
    const canvas = ref.current, ctx = canvas.getContext('2d');
    if (!ctx) return;
    const draw = () => {
      const {project,view,selected,step} = latest.current;
      const width = canvas.clientWidth, height = canvas.clientHeight, ratio = Math.min(devicePixelRatio || 1,2);
      if (!width || !height) return;
      canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio); ctx.setTransform(ratio,0,0,ratio,0,0);
      const {yaw,zoom} = camera.current, scale = Math.min(width / (project.width + 5), height / (project.depth + 5)) * zoom;
      const projectPoint = (x,y,z) => [width / 2 + (x * Math.cos(yaw) - z * Math.sin(yaw)) * scale, height * .53 + ((x * Math.sin(yaw) + z * Math.cos(yaw)) * (view === '2' ? 1 : .52) - (view === '2' ? 0 : y * .85)) * scale];
      engine.current.ground = (x,y) => {const u=(x-width/2)/scale,v=(y-height*.53)/scale/(view==='2'?1:.52);return [u*Math.cos(yaw)+v*Math.sin(yaw),-u*Math.sin(yaw)+v*Math.cos(yaw)];};
      const poly = (points,fill,stroke) => {ctx.beginPath();points.forEach((point,i)=>i?ctx.lineTo(...point):ctx.moveTo(...point));ctx.closePath();ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle=stroke;ctx.stroke();};
      const rx=project.width/2, rz=project.depth/2;
      ctx.clearRect(0,0,width,height);poly([projectPoint(-rx,0,-rz),projectPoint(rx,0,-rz),projectPoint(rx,0,rz),projectPoint(-rx,0,rz)],'#f9fcfe','#b6cdd9');
      ctx.strokeStyle='#deebf1';ctx.lineWidth=1;
      for(let x=-rx;x<=rx+1e-8;x+=step){ctx.beginPath();ctx.moveTo(...projectPoint(x,0,-rz));ctx.lineTo(...projectPoint(x,0,rz));ctx.stroke();}
      for(let z=-rz;z<=rz+1e-8;z+=step){ctx.beginPath();ctx.moveTo(...projectPoint(-rx,0,z));ctx.lineTo(...projectPoint(rx,0,z));ctx.stroke();}
      const list=project.items.map(item=>gesture.current?.preview?.id===item.id?gesture.current.preview:item).sort((a,b)=>(a.x-b.x)*Math.sin(yaw)+(a.z-b.z)*Math.cos(yaw));
      engine.current.polygons=[];
      for(const item of list){
        const angle=item.r*Math.PI/180,corners=[[-item.l/2,-item.d/2],[item.l/2,-item.d/2],[item.l/2,item.d/2],[-item.l/2,item.d/2]].map(([x,z])=>projectPoint(item.x+x*Math.cos(angle)-z*Math.sin(angle),0,item.z+x*Math.sin(angle)+z*Math.cos(angle)));
        const color=sectionColor(item.section,project.category);ctx.lineWidth=item.id===selected?2.5:1;poly(corners,color+'55',item.id===selected?'#007b9d':'#92aab4');
        if(view==='3')renderFurniture(ctx,item,catalogById[item.type],projectPoint,yaw,color);
        const center=projectPoint(item.x,view==='3'?item.h+.2:0,item.z);
        ctx.font='600 12px sans-serif';ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='#fffffff0';ctx.strokeText(catalogById[item.type].name,center[0],center[1]-5);ctx.fillStyle='#244757';ctx.fillText(catalogById[item.type].name,center[0],center[1]-5);
        engine.current.polygons.push({id:item.id,corners,center:projectPoint(item.x,view==='3'?item.h*.5:0,item.z)});
      }
    };
    engine.current.draw=draw;
    const observer=new ResizeObserver(draw);observer.observe(canvas);draw();return()=>observer.disconnect();
  },[]);
  useEffect(()=>{engine.current.draw?.();},[project,view,selected,pending,step]);
  const point=event=>{const bounds=ref.current.getBoundingClientRect();return [event.clientX-bounds.left,event.clientY-bounds.top];};
  const down=event=>{
    if(!interactive)return;
    const [x,y]=point(event),world=engine.current.ground?.(x,y);if(!world)return;
    if(pending){if(Math.abs(world[0])<=project.width/2&&Math.abs(world[1])<=project.depth/2)onPlace(...world);return;}
    const inside=(points)=>{let hit=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;};
    const hit=!orbitOnly&&[...(engine.current.polygons||[])].reverse().find(p=>inside(p.corners)||Math.hypot(x-p.center[0],y-p.center[1])<20);
    if(hit){const item=project.items.find(item=>item.id===hit.id);onSelect(hit.id);gesture.current={kind:'move',item,dx:item.x-world[0],dz:item.z-world[1],start:[x,y]};}
    else gesture.current={kind:'orbit',x,yaw:camera.current.yaw};
    ref.current.setPointerCapture(event.pointerId);
  };
  const move=event=>{
    const drag=gesture.current;if(!drag)return;const [x,y]=point(event);
    if(drag.kind==='orbit'){if(view==='3')camera.current.yaw=drag.yaw+(x-drag.x)*.008;}
    else if(Math.hypot(x-drag.start[0],y-drag.start[1])>5){const world=engine.current.ground(x,y);try{drag.preview=placeItem(drag.item,project,world[0]+drag.dx,world[1]+drag.dz,snap,step);}catch{/* A rejected preview leaves the item in its last valid position. */}}
    engine.current.draw?.();
  };
  const up=()=>{const drag=gesture.current;gesture.current=null;if(drag?.preview)onMove(drag.preview);engine.current.draw?.();};
  return <div className="plan-surface">
    <canvas ref={ref} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={()=>{gesture.current=null;engine.current.draw?.();}} aria-label={interactive?'Plan du département. Les meubles sont aussi accessibles dans la liste sous le plan.':'Aperçu du plan'} />
    {interactive&&<div className="zoom-controls"><button type="button" aria-label="Réduire le zoom" onClick={()=>{camera.current.zoom=Math.max(.4,camera.current.zoom-.15);engine.current.draw();}}>−</button><button type="button" onClick={()=>{camera.current={yaw:-.65,zoom:1};engine.current.draw();}}>Recentrer</button><button type="button" aria-label="Augmenter le zoom" onClick={()=>{camera.current.zoom=Math.min(2.5,camera.current.zoom+.15);engine.current.draw();}}>+</button></div>}
  </div>;
}
