import * as THREE from 'three';

const clothing=new Set(['tshirt','shirt','sweater','jacket','trousers','jeans','shorts','dress','pyjamas','robe','briefs','bra','tights','socks','scarf','gloves']);
const footwear=new Set(['trainers','flats','heels','boots','sandals','flipflops','slippers','insoles']);

export function createProductModels(keep,rounded,tube,materials) {
  const cache=new Map(),shapes=new Map();
  const sphere=keep(new THREE.SphereGeometry(1,16,10)),torus=keep(new THREE.TorusGeometry(1,.1,6,24)),handle=keep(new THREE.TorusGeometry(1,.1,6,16,Math.PI));
  const cylinder=keep(new THREE.CylinderGeometry(.5,.5,1,16)),shade=keep(new THREE.CylinderGeometry(.4,1,1,20,1,true)),dome=keep(new THREE.SphereGeometry(1,16,8,0,Math.PI*2,0,Math.PI/2));
  const silhouette=(type)=>{
    if(shapes.has(type))return shapes.get(type);
    const shape=new THREE.Shape();
    let points;
    if(['trousers','jeans','tights','shorts','briefs'].includes(type)){
      const h=type==='shorts'?.4:type==='briefs'?.2:.87,leg=type==='briefs'?.05:h*.45;
      points=[[-.17,h],[.17,h],[.19,h*.6],[.15,0],[.025,0],[0,leg],[-.025,0],[-.15,0],[-.19,h*.6]];
    }else if(type==='dress'||type==='robe')points=[[-.12,.92],[-.25,.79],[-.18,.7],[-.12,.74],[-.1,.57],[-.3,0],[.3,0],[.1,.57],[.12,.74],[.18,.7],[.25,.79],[.12,.92],[0,.85]];
    else if(type==='socks')points=[[-.065,.3],[.065,.3],[.065,.09],[.15,.06],[.15,0],[-.065,0]];
    else if(type==='scarf')points=[[-.09,.65],[.09,.65],[.1,0],[-.08,.02]];
    else if(type==='gloves')points=[[-.06,0],[.06,0],[.065,.1],[.1,.15],[.085,.17],[.05,.14],[.05,.24],[.03,.25],[.02,.17],[.01,.27],[-.01,.27],[-.015,.17],[-.04,.25],[-.055,.24],[-.045,.14],[-.07,.21],[-.085,.2],[-.06,.09]];
    else if(type==='bra')points=[[-.18,.2],[-.16,.32],[-.14,.32],[-.13,.2],[-.04,.2],[0,.14],[.04,.2],[.13,.2],[.14,.32],[.16,.32],[.18,.2],[.2,.04],[.1,0],[0,.07],[-.1,0],[-.2,.04]];
    else{
      const long=type!=='tshirt'&&type!=='pyjamas';
      points=[[-.12,.64],[-.23,.59],[-(long?.32:.3),long?.12:.45],[-(long?.24:.22),long?.09:.39],[-.17,.46],[-.17,0],[.17,0],[.17,.46],[(long?.24:.22),long?.09:.39],[(long?.32:.3),long?.12:.45],[.23,.59],[.12,.64],[.06,.59],[-.06,.59]];
    }
    points.forEach(([x,y],index)=>index?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();
    const geometry=new THREE.ExtrudeGeometry(shape,{depth:.018,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.006,bevelThickness:.006,curveSegments:5});
    geometry.translate(0,0,-.009);const position=geometry.attributes.position;
    for(let index=0;index<position.count;index++){const x=position.getX(index),y=position.getY(index);position.setZ(index,position.getZ(index)+Math.sin(x*42)*.006+Math.sin(y*13+x*8)*.004);}
    geometry.computeVertexNormals();shapes.set(type,keep(geometry));return geometry;
  };
  const sole=()=>{
    if(shapes.has('sole'))return shapes.get('sole');
    const shape=new THREE.Shape();shape.moveTo(-.036,-.12);shape.quadraticCurveTo(-.05,-.04,-.052,.07);shape.quadraticCurveTo(-.048,.145,0,.145);shape.quadraticCurveTo(.054,.14,.052,.065);shape.quadraticCurveTo(.047,-.04,.036,-.12);shape.quadraticCurveTo(0,-.14,-.036,-.12);
    const geometry=new THREE.ExtrudeGeometry(shape,{depth:.018,bevelEnabled:true,bevelSize:.003,bevelThickness:.003,bevelSegments:2,steps:1,curveSegments:8});geometry.rotateX(Math.PI/2);geometry.translate(0,.022,0);shapes.set('sole',keep(geometry));return geometry;
  };
  return (profile,color)=>{
    const key=profile.type+profile.audience+color;if(cache.has(key))return cache.get(key);
    const type=profile.type,parts=[],fabric=materials.fabric(type==='jeans'?'#324b6a':color),size=profile.audience==='baby'?.5:profile.audience==='children'?.72:profile.audience==='men'?1.04:.94;
    const add=(geometry,material,x,y,z,sx,sy,sz,rx=0,ry=0,rz=0)=>parts.push({geometry,material,x,y,z,sx,sy,sz,rx,ry,rz});
    const block=(x,y,z,w,h,d,material=fabric)=>add(rounded,material,x,y,z,w,h,d);
    const ball=(x,y,z,w,h,d,material=fabric)=>add(sphere,material,x,y,z,w,h,d);
    let width=.3,height=.3,depth=.2;
    if(clothing.has(type)){
      const garment=type==='pyjamas'?'shirt':type;
      const geometry=silhouette(garment);geometry.computeBoundingBox();const bounds=geometry.boundingBox.getSize(new THREE.Vector3());
      width=bounds.x;height=bounds.y;depth=.045;add(geometry,fabric,0,0,0,1,1,1);
      if(['shirt','jacket','robe'].includes(type)){
        block(0,height*.47,.019,.007,height*.78,.004,materials.white);
        for(let index=0;index<4;index++)ball(0,.13+index*.105,.023,.006,.006,.004,materials.dark);
      }
      if(type==='pyjamas'){const bottom=silhouette('shorts');add(bottom,fabric,.26,0,.01,.6,.6,.6);width+=.3;}
    }else if(footwear.has(type)){
      width=.27;depth=.29;height=type==='boots'?.34:type==='heels'?.16:.12;
      for(const side of [-1,1]){
        const x=side*.07;add(sole(),type==='insoles'?fabric:materials.dark,x,type==='heels'?.05:0,0,1,1,1);
        if(type==='insoles')continue;
        if(['sandals','flipflops'].includes(type)){
          block(x,.05,.065,.108,.014,.025);block(x,.055,-.025,.105,.014,.023);
          if(type==='sandals'){block(x,.073,-.095,.09,.014,.018);block(x-.042,.049,-.08,.012,.06,.05);block(x+.042,.049,-.08,.012,.06,.05);}
        }else{
          ball(x,.062,.017,.047,.041,.105);block(x,.095,-.047,.042,.018,.075);
          if(type==='trainers')for(let lace=0;lace<4;lace++)block(x,.108,-.065+lace*.02,.047,.004,.004,materials.white);
          if(type==='boots')add(cylinder,fabric,x,.224,-.065,.095,.21,.09);
          if(type==='heels'){block(x,.045,-.09,.021,.09,.025,materials.dark);block(x,.085,-.09,.083,.035,.04);}
        }
      }
    }else if(['bag','purse','suitcase','basket','gift','food','book','device'].includes(type)){
      width=type==='purse'?.17:.27;height=type==='suitcase'?.45:type==='purse'?.12:.25;depth=type==='book'?.035:.14;
      block(0,height/2,0,width,height,depth,type==='device'?materials.dark:fabric);
      if(['bag','basket','suitcase'].includes(type))add(handle,materials.dark,0,height,0,width*.28,width*.28,width*.28);
      if(type==='suitcase')for(const side of [-1,1])ball(side*.09,.015,0,.023,.023,.03,materials.dark);
      if(type==='gift'){block(0,height/2,depth/2+.002,.025,height,.004,materials.white);block(0,height+.003,0,width,.006,.024,materials.white);}
      if(type==='food')block(0,height*.55,depth/2+.003,width*.65,height*.45,.003,materials.white);
      if(type==='device')block(0,height*.53,depth/2+.003,width*.84,height*.78,.004,materials.glass);
    }else if(type==='hat'){
      width=depth=.28;height=.12;add(cylinder,fabric,0,.008,0,.28,.014,.28);add(dome,fabric,0,.014,0,.1,.1,.1);
    }else if(['belt','jewellery','hair'].includes(type)){
      width=.2;height=.2;depth=.025;add(torus,type==='jewellery'?materials.metal:fabric,0,.1,0,.09,.09,.09);if(type==='belt')block(.085,.1,.01,.025,.036,.02,materials.metal);
    }else if(type==='glasses'){
      width=.17;height=.07;depth=.08;for(const side of [-1,1]){add(torus,materials.dark,side*.042,.035,0,.035,.026,.026);block(side*.075,.034,-.035,.004,.004,.07,materials.dark);}block(0,.035,0,.024,.005,.005,materials.metal);
    }else if(type==='umbrella'){
      width=depth=.32;height=.62;add(tube,materials.metal,0,.3,0,.008,.6,.008);add(dome,fabric,0,.5,0,.16,.11,.16);
    }else if(['bedding','towel','cushion'].includes(type)){
      width=.34;height=type==='cushion'?.11:.12;depth=.27;
      if(type==='cushion')ball(0,.07,0,.17,.065,.135);
      else for(let layer=0;layer<3;layer++)block(0,.02+layer*.035,0,width,.034,depth);
    }else if(['bottle','cosmetic','candle','cup','lamp'].includes(type)){
      width=depth=.12;height=type==='lamp'?.36:type==='bottle'?.22:.13;
      add(cylinder,type==='cup'?materials.white:fabric,0,height*.4,0,.105,height*.8,.105);
      if(type==='bottle'||type==='cosmetic')block(0,height*.88,0,.06,height*.22,.06,materials.dark);
      if(type==='candle')block(0,height*.83,0,.004,.014,.004,materials.dark);
      if(type==='cup')add(torus,materials.white,.06,.07,0,.035,.035,.035);
      if(type==='lamp'){add(cylinder,materials.metal,0,.014,0,.15,.025,.15);block(0,.15,0,.012,.26,.012,materials.metal);add(shade,materials.white,0,.3,0,.12,.12,.12);width=depth=.25;}
    }else if(type==='toy'){
      width=.22;height=.3;depth=.13;ball(0,.11,0,.07,.1,.055);ball(0,.24,0,.065,.065,.055);for(const side of [-1,1]){ball(side*.045,.287,0,.027,.027,.025);ball(side*.075,.13,0,.03,.06,.03);ball(side*.045,.024,.02,.035,.025,.05);}
    }else throw new Error('Produit de démonstration non pris en charge : '+type);
    const bounds=new THREE.Box3(),matrix=new THREE.Matrix4();
    for(const part of parts){
      if(!part.geometry.boundingBox)part.geometry.computeBoundingBox();
      matrix.compose(new THREE.Vector3(part.x,part.y,part.z),new THREE.Quaternion().setFromEuler(new THREE.Euler(part.rx,part.ry,part.rz)),new THREE.Vector3(part.sx,part.sy,part.sz));
      bounds.union(part.geometry.boundingBox.clone().applyMatrix4(matrix));
    }
    const dimensions=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
    const model={width:dimensions.x*size,height:dimensions.y*size,depth:dimensions.z*size,clothing:clothing.has(type),parts:parts.map(part=>({...part,x:(part.x-center.x)*size,y:(part.y-bounds.min.y)*size,z:(part.z-center.z)*size,sx:part.sx*size,sy:part.sy*size,sz:part.sz*size}))};
    cache.set(key,model);return model;
  };
}
