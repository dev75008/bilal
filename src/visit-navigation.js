export const EYE_HEIGHT = 1.65;
export const BODY_RADIUS = .22;

export function canWalk(project,x,z) {
  if(!Number.isFinite(x)||!Number.isFinite(z)||Math.abs(x)>project.width/2-BODY_RADIUS||Math.abs(z)>project.depth/2-BODY_RADIUS)return false;
  return !project.items.some(item=>{
    const angle=item.r*Math.PI/180,dx=x-item.x,dz=z-item.z;
    const localX=dx*Math.cos(angle)+dz*Math.sin(angle),localZ=-dx*Math.sin(angle)+dz*Math.cos(angle);
    return Math.abs(localX)<item.l/2+BODY_RADIUS&&Math.abs(localZ)<item.d/2+BODY_RADIUS;
  });
}

export function findVisitStart(project) {
  const front=project.depth/2-.55;
  for(let z=front;z>-project.depth/2+BODY_RADIUS;z-=.4){
    for(let offset=0;offset<project.width/2-BODY_RADIUS;offset+=.4){
      for(const x of offset===0?[0]:[offset,-offset])if(canWalk(project,x,z))return {x,z,yaw:Math.atan2(x,z),pitch:0};
    }
  }
  return null;
}

export function moveVisitor(project,position,forward,side,seconds,speed=2) {
  const length=Math.hypot(forward,side)||1,distance=Math.min(.05,Math.max(0,seconds))*speed;
  const dx=(-Math.sin(position.yaw)*forward+Math.cos(position.yaw)*side)*distance/length;
  const dz=(-Math.cos(position.yaw)*forward-Math.sin(position.yaw)*side)*distance/length;
  const next={...position},steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.08));
  for(let index=0;index<steps;index++){
    if(canWalk(project,next.x+dx/steps,next.z))next.x+=dx/steps;
    if(canWalk(project,next.x,next.z+dz/steps))next.z+=dz/steps;
  }
  return next;
}
