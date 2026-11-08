import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {buildFurnitureParts} from './furniture-models.js';
import {catalogById,sectionColor} from './domain.js';
import {createVisitMaterials,materialForPart} from './visit-materials.js';

function shirtGeometry() {
  const shape=new THREE.Shape();
  shape.moveTo(-.13,.32);shape.quadraticCurveTo(-.24,.31,-.32,.16);shape.lineTo(-.23,.08);shape.lineTo(-.17,.16);shape.lineTo(-.18,-.31);
  shape.quadraticCurveTo(0,-.34,.18,-.31);shape.lineTo(.17,.16);shape.lineTo(.23,.08);shape.lineTo(.32,.16);shape.quadraticCurveTo(.24,.31,.13,.32);
  shape.quadraticCurveTo(0,.2,-.13,.32);
  const geometry=new THREE.ExtrudeGeometry(shape,{depth:.025,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.012,bevelThickness:.012,curveSegments:6});
  const position=geometry.attributes.position;
  for(let index=0;index<position.count;index++){
    const x=position.getX(index),y=position.getY(index);
    position.setZ(index,position.getZ(index)+Math.sin(x*49)*.009*(.35-y)+Math.sin(y*14+x*9)*.004);
  }
  position.needsUpdate=true;geometry.computeVertexNormals();return geometry;
}

function label(text,color,width=512,height=128) {
  if(typeof document==='undefined')return null;
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const context=canvas.getContext('2d');if(!context)return null;
  context.fillStyle='#f5f3ed';context.fillRect(0,0,width,height);context.fillStyle=color;context.fillRect(0,height-7,width,7);
  context.fillStyle='#263c43';context.font='500 32px Segoe UI, sans-serif';context.textAlign='center';context.textBaseline='middle';
  context.fillText(text.length>39?text.slice(0,38)+'…':text,width/2,height/2,width-38);
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;return map;
}

export function createVisitScene(project) {
  const scene=new THREE.Scene();scene.background=new THREE.Color('#e7e7df');scene.fog=new THREE.Fog('#e7e7df',Math.max(project.width,project.depth)*1.2,Math.max(project.width,project.depth)*3);
  const resources=createVisitMaterials(project.width,project.depth),{materials}=resources;
  const geometries=new Set(),extraMaterials=new Set(),extraTextures=new Set(),batches=new Map(),transform=new THREE.Object3D();
  const keep=geometry=>{geometries.add(geometry);return geometry;};
  const box=keep(new THREE.BoxGeometry(1,1,1)),rounded=keep(new RoundedBoxGeometry(1,1,1,2,.055)),tube=keep(new THREE.CylinderGeometry(.5,.5,1,12)),shirts=keep(shirtGeometry());
  const ceilingHeight=Math.max(3.5,...project.items.map(item=>item.h+.8));
  const instance=(geometry,material,position,scale,rotation=new THREE.Euler(),dressing=false)=>{
    const key=geometry.uuid+material.uuid+(dressing?'d':'f');
    if(!batches.has(key))batches.set(key,{geometry,material,matrices:[],dressing});
    transform.position.copy(position);transform.scale.copy(scale);transform.rotation.copy(rotation);transform.updateMatrix();batches.get(key).matrices.push(transform.matrix.clone());
  };
  const addBox=(w,h,d,x,y,z,material,{shadow=true,name=''}={})=>{
    const mesh=new THREE.Mesh(box,material);mesh.scale.set(w,h,d);mesh.position.set(x,y,z);mesh.castShadow=shadow;mesh.receiveShadow=true;mesh.name=name;scene.add(mesh);return mesh;
  };
  addBox(project.width,.08,project.depth,0,-.04,0,materials.floor,{shadow:false,name:'Sol en grès'});
  addBox(project.width+.24,ceilingHeight,.12,0,ceilingHeight/2,-project.depth/2-.06,materials.wall);
  for(const side of [-1,1]){
    addBox(.12,ceilingHeight,project.depth,side*(project.width/2+.06),ceilingHeight/2,0,materials.wall);
    addBox(.035,.12,project.depth,side*(project.width/2-.02),.06,0,materials.trim,{shadow:false});
  }
  addBox(project.width,.12,.035,0,.06,-project.depth/2+.02,materials.trim,{shadow:false});
  addBox(project.width+.24,.1,project.depth+.24,0,ceilingHeight+.05,0,materials.ceiling,{shadow:false});
  const tileStep=1.2;
  for(let x=-project.width/2+tileStep;x<project.width/2;x+=tileStep)addBox(.004,.001,project.depth,x,.001,0,materials.grout,{shadow:false});
  for(let z=-project.depth/2+tileStep;z<project.depth/2;z+=tileStep)addBox(project.width,.001,.004,0,.001,z,materials.grout,{shadow:false});
  const panes=Math.max(1,Math.ceil(project.width/3));
  for(let index=0;index<=panes;index++)addBox(.04,ceilingHeight,.06,-project.width/2+index*project.width/panes,ceilingHeight/2,project.depth/2+.04,materials.trim,{shadow:false});
  addBox(project.width,ceilingHeight,.014,0,ceilingHeight/2,project.depth/2+.06,materials.glass,{shadow:false});
  addBox(project.width,.1,.06,0,ceilingHeight-.05,project.depth/2+.04,materials.trim,{shadow:false});
  const lights=[];
  const rowCount=Math.min(5,Math.max(2,Math.ceil(project.depth/4))),columns=Math.min(4,Math.max(1,Math.ceil(project.width/5)));
  for(let row=0;row<rowCount;row++)for(let column=0;column<columns;column++){
    const x=-project.width/2+(column+.5)*project.width/columns,z=-project.depth/2+(row+.5)*project.depth/rowCount;
    addBox(.68,.045,1.7,x,ceilingHeight-.055,z,materials.trim,{shadow:false});
    addBox(.58,.018,1.58,x,ceilingHeight-.086,z,materials.light,{shadow:false});
  }
  const fill=new THREE.HemisphereLight('#edf4ff','#a19684',1.1);scene.add(fill);
  const keyLight=new THREE.DirectionalLight('#fff3df',2.5);keyLight.position.set(project.width*.25,ceilingHeight+5,project.depth*.5+4);keyLight.target.position.set(0,0,-project.depth*.15);keyLight.castShadow=true;
  const extent=Math.max(project.width,project.depth)*.7;Object.assign(keyLight.shadow.camera,{left:-extent,right:extent,top:extent,bottom:-extent,near:.1,far:Math.max(40,extent*5)});
  keyLight.shadow.camera.updateProjectionMatrix();
  keyLight.shadow.mapSize.set(2048,2048);keyLight.shadow.bias=-.00008;keyLight.shadow.normalBias=.025;keyLight.shadow.radius=3;
  scene.add(keyLight,keyLight.target);lights.push(keyLight);
  for(const [x,z] of [[-project.width*.24,-project.depth*.23],[project.width*.24,project.depth*.23]]){
    const light=new THREE.RectAreaLight('#fff8eb',5,Math.max(2,project.width*.4),Math.max(2,project.depth*.4));light.position.set(x,ceilingHeight-.16,z);light.lookAt(x,0,z);scene.add(light);
  }
  const dressingGroup=new THREE.Group();dressingGroup.name='Articles de démonstration';scene.add(dressingGroup);
  const apparel=['#273c59','#d8c9b6','#ece7db','#a98075','#44544c','#918a7d'];
  const furnitureRoot=new THREE.Group();furnitureRoot.name='Mobilier du plan';scene.add(furnitureRoot);
  for(const [itemIndex,item] of project.items.entries()){
    const def=catalogById[item.type],angle=item.r*Math.PI/180;
    const world=(x,y,z)=>new THREE.Vector3(item.x+x*Math.cos(angle)-z*Math.sin(angle),y,item.z+x*Math.sin(angle)+z*Math.cos(angle));
    for(const part of buildFurnitureParts(item,def)){
      const material=materialForPart(part,materials);let geometry=rounded,scale,rotation=new THREE.Euler(0,-angle,0);
      if(part.cylinder){
        const topRatio=part.r>0?part.topRadius/part.r:1;
        const key='cylinder-'+topRatio.toFixed(4);if(!batches.has(key)){const geometry=keep(new THREE.CylinderGeometry(topRatio,1,1,24));batches.set(key,{sharedGeometry:geometry});}
        geometry=batches.get(key).sharedGeometry;scale=new THREE.Vector3(part.r,part.h,part.r);
      }else{
        scale=new THREE.Vector3(part.w,part.h,part.d);
        const dimensions=[part.w,part.h,part.d],largest=Math.max(...dimensions),axis=dimensions.indexOf(largest),thin=dimensions.filter((_,index)=>index!==axis);
        if(material===materials.metal&&Math.max(...thin)<.09&&largest>Math.max(...thin)*2){
          geometry=tube;const diameter=(thin[0]+thin[1])/2;scale.set(diameter,largest,diameter);
          const orientation=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),-angle);
          if(axis===0)orientation.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),Math.PI/2));
          if(axis===2)orientation.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),Math.PI/2));
          rotation.setFromQuaternion(orientation);
        }
      }
      instance(geometry,material,world(part.x,part.y+part.h/2,part.z),scale,rotation);
    }
    if(['rail','singleRail','doubleRail','fourArm','wardrobe','featureRail','denimRail','wallRail','wallMixed'].includes(def.family)&&item.h>.9){
      const count=Math.min(12,Math.max(3,Math.floor(item.l/.15)));
      for(let index=0;index<count;index++){
        const x=-item.l*.34+index*item.l*.68/Math.max(1,count-1),color=apparel[(itemIndex+Math.floor(index/3))%apparel.length];
        const railHeight=item.h*(def.family==='rail'?.9:.84),height=Math.min(.66,item.h*.48),scale=height/.64;
        instance(shirts,materials.fabric(color),world(x,railHeight-height*.5-.09,0),new THREE.Vector3(scale*.85,scale,scale),new THREE.Euler(0,-angle+Math.PI/2,0),true);
        // Indicative hangers sit below the rail; they do not change the fixture or its footage.
        const hanger=new THREE.Vector3(.22,.007,.007);
        instance(rounded,materials.wood,world(x,railHeight-.06,0),hanger,new THREE.Euler(0,-angle+Math.PI/2,0),true);
      }
    }else if(['table','woodTable','goalTable','denimTable','shelf','darkShelf','featureShelf','cubbyTable','stepTable','shoeTable','denimShelf'].includes(def.family)){
      const cols=Math.min(3,Math.max(1,Math.floor(item.l/.42))),layers=Math.min(2,Math.max(1,Math.floor(item.h/.6)));
      for(let level=0;level<layers;level++)for(let column=0;column<cols;column++)for(let stack=0;stack<3;stack++){
        const x=(column-(cols-1)/2)*Math.min(.45,item.l*.65/cols),top=item.h*(level===0?.94:.49),color=apparel[(itemIndex+column+stack)%apparel.length];
        instance(rounded,materials.fabric(color),world(x,top+.035+stack*.031,0),new THREE.Vector3(Math.min(.34,item.l*.75),.028,Math.min(.3,item.d*.7)),new THREE.Euler(0,-angle+(stack-1)*.015,0),true);
      }
    }
    // shortcut: cap label textures at 50 to bound memory; use an atlas if large plans need every label.
    if(itemIndex<50){
      const map=label(def.name+'   '+item.section.split(' — ')[0],sectionColor(item.section,project.category));
      if(map){extraTextures.add(map);const material=new THREE.MeshStandardMaterial({map,roughness:.8});extraMaterials.add(material);const sign=new THREE.Mesh(keep(new THREE.PlaneGeometry(.38,.095)),material);sign.position.copy(world(0,Math.max(.4,item.h*.9),item.d*.5+.015));sign.rotation.y=-angle;scene.add(sign);}
    }
  }
  for(const batch of batches.values()){
    if(!batch.matrices?.length)continue;
    const mesh=new THREE.InstancedMesh(batch.geometry,batch.material,batch.matrices.length);batch.matrices.forEach((matrix,index)=>mesh.setMatrixAt(index,matrix));mesh.instanceMatrix.needsUpdate=true;
    mesh.castShadow=batch.material!==materials.glass;mesh.receiveShadow=true;mesh.computeBoundingSphere();mesh.name=batch.dressing?'Articles indicatifs':'Éléments de mobilier';
    (batch.dressing?dressingGroup:furnitureRoot).add(mesh);
  }
  const brandMap=label('PRIMARK   /   '+project.name,'#007c9e',1024,128);
  if(brandMap){extraTextures.add(brandMap);const material=new THREE.MeshStandardMaterial({map:brandMap,roughness:.9});extraMaterials.add(material);const sign=new THREE.Mesh(keep(new THREE.PlaneGeometry(Math.min(project.width*.55,5),.62)),material);sign.position.set(0,ceilingHeight-.65,-project.depth/2+.014);scene.add(sign);}
  scene.environmentIntensity=.75;
  let disposed=false;
  return {scene,dressingGroup,keyLight,ceilingHeight,dispose(){
    if(disposed)return;disposed=true;
    scene.traverse(object=>{if(object.isInstancedMesh)object.dispose();});
    for(const light of lights)light.shadow.dispose();for(const geometry of geometries)geometry.dispose();for(const material of extraMaterials)material.dispose();for(const map of extraTextures)map.dispose();resources.dispose();scene.clear();
  }};
}
