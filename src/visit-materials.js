import * as THREE from 'three';

function texture(size,pixel,colorSpace=THREE.NoColorSpace,repeat=1) {
  const data=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const rgb=pixel(x,y),index=(y*size+x)*4;
    data[index]=rgb[0];data[index+1]=rgb[1];data[index+2]=rgb[2];data[index+3]=255;
  }
  const map=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);
  map.colorSpace=colorSpace;map.wrapS=map.wrapT=THREE.RepeatWrapping;map.repeat.set(repeat,repeat);
  map.magFilter=THREE.LinearFilter;map.minFilter=THREE.LinearMipmapLinearFilter;map.generateMipmaps=true;map.needsUpdate=true;
  return map;
}
const noise=(x,y)=>{const value=Math.sin(x*127.1+y*311.7)*43758.5453;return value-Math.floor(value);};

export function createVisitMaterials(width,depth) {
  const maps=[];
  const keep=map=>{maps.push(map);return map;};
  const stone=keep(texture(256,(x,y)=>{const value=214+noise(x,y)*12+Math.sin(x*.045)*Math.sin(y*.06)*3;return [value,value-1,value-4];},THREE.SRGBColorSpace));
  stone.repeat.set(width/1.2,depth/1.2);
  const stoneBump=keep(texture(128,(x,y)=>{const value=124+noise(x,y)*20;return [value,value,value];}));stoneBump.repeat.copy(stone.repeat);
  const oak=keep(texture(256,(x,y)=>{const grain=Math.sin(x*.35+Math.sin(y*.025)*2.5)*7+noise(x,y)*9;return [179+grain,145+grain,106+grain];},THREE.SRGBColorSpace));
  oak.repeat.set(2,1);
  const woodBump=keep(texture(128,(x,y)=>{const value=125+Math.sin(x*.6+Math.sin(y*.04))*13;return [value,value,value];}));
  const fabricBump=keep(texture(128,(x,y)=>{const value=125+((x%4<2?1:-1)+(y%4<2?1:-1))*15;return [value,value,value];},THREE.NoColorSpace,5));
  const materials={
    floor:new THREE.MeshPhysicalMaterial({map:stone,bumpMap:stoneBump,bumpScale:.006,roughness:.32,metalness:0,clearcoat:.18,clearcoatRoughness:.4}),
    white:new THREE.MeshPhysicalMaterial({color:'#edece7',roughness:.38,metalness:.04,clearcoat:.2,clearcoatRoughness:.35}),
    metal:new THREE.MeshStandardMaterial({color:'#aeb9bd',metalness:.94,roughness:.2}),
    wood:new THREE.MeshStandardMaterial({map:oak,bumpMap:woodBump,bumpScale:.002,roughness:.5,metalness:0}),
    dark:new THREE.MeshStandardMaterial({color:'#343b3c',roughness:.65,metalness:.22}),
    glass:new THREE.MeshPhysicalMaterial({color:'#edf6f4',roughness:.08,metalness:0,transmission:.82,thickness:.012,ior:1.49,transparent:true,opacity:.65,side:THREE.DoubleSide}),
    wall:new THREE.MeshStandardMaterial({color:'#e9e7e1',roughness:.9}),
    ceiling:new THREE.MeshStandardMaterial({color:'#f2f0e9',roughness:.86}),
    grout:new THREE.MeshStandardMaterial({color:'#aaa99e',roughness:.9}),
    light:new THREE.MeshStandardMaterial({color:'#fff9ed',emissive:'#fff1cf',emissiveIntensity:4,roughness:.3,toneMapped:false}),
    trim:new THREE.MeshStandardMaterial({color:'#263438',roughness:.42,metalness:.55}),
    fabricBump,
  };
  const fabric=new Map();
  materials.fabric=color=>{
    if(!fabric.has(color))fabric.set(color,new THREE.MeshPhysicalMaterial({color,roughness:.96,metalness:0,bumpMap:fabricBump,bumpScale:.006,sheen:.7,sheenColor:new THREE.Color(color),sheenRoughness:.9,side:THREE.DoubleSide}));
    return fabric.get(color);
  };
  return {materials,dispose(){for(const value of Object.values(materials))if(value?.isMaterial)value.dispose();for(const value of fabric.values())value.dispose();for(const map of maps)map.dispose();}};
}

export function materialForPart(part,materials) {
  return ({'#bdc7bf':materials.metal,'#cbb89a':materials.wood,'#52615a':materials.dark,'#d4e0dc':materials.glass})[part.color]||materials.white;
}
