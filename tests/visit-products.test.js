import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Matrix4,Vector3} from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {catalog,catalogById,departments,newProject,feet} from '../src/domain.js';
import {productForSection,productForSlot} from '../src/visit-products.js';
import {createVisitScene} from '../src/visit-scene.js';
import {createVisitMaterials} from '../src/visit-materials.js';
import {createProductModels} from '../src/visit-product-models.js';
import {productDisplay} from '../src/visit-product-layout.js';
import {buildFurnitureParts} from '../src/furniture-models.js';

const section=(code,number)=>{const dep=departments.find(dep=>dep.code===code),entry=dep.sections.find(entry=>entry.code===code+' '+number);return entry.code+' — '+entry.label;};
const fixture=(code,number,type='R1')=>({id:1,type,...catalogById[type].dimensions,x:0,z:0,r:0,section:section(code,number)});

test('D6 : T-shirts, chemises, maille, vestes, jeans, pantalons et shorts pour homme',()=>{
  const expected={'003':'jacket','007':'shirt','009':'shirt','011':'sweater','019':'tshirt','021':'tshirt','023':'jacket','024':'tshirt','025':'jeans','027':'trousers','029':'shorts','031':'shorts','040':'tshirt'};
  for(const [number,type] of Object.entries(expected)){const profile=productForSection('Département 06',section('06',number));assert.equal(profile.type,type);assert.equal(profile.audience,'men');}
  assert.equal(productForSection('Département 06','T-shirts').type,'tshirt');assert.equal(productForSection('Département 06','Pantalons').type,'trousers');
});

test('D7 : modèles distincts pour talons, chaussures plates, bottes, sandales, plage et chaussons',()=>{
  const expected={'002':'heels','004':'flats','008':'boots','010':'sandals','012':'flipflops','018':'trainers','020':'slippers','023':'insoles'};
  for(const [number,type] of Object.entries(expected)){const profile=productForSection('Chaussures femmes',section('07',number));assert.equal(profile.type,type);assert.equal(profile.audience,'women');}
  for(const [name,type] of [['Sandales','sandals'],['Baskets','trainers'],['Bottes','boots'],['Chaussures plates','flats'],['07 002 — Heels.','heels']])assert.equal(productForSection('Chaussures femmes',name).type,type);
});

test('sections officielles, tailles enfants/bébé et catégories historiques reconnues',()=>{
  let count=0;
  for(const dep of departments)for(const entry of dep.sections.slice(1)){const profile=productForSection(dep.key,entry.code+' — '+entry.label);assert(profile,entry.code);count++;}
  assert.equal(count,146);assert.equal(productForSection('Département 05',section('05','003')).audience,'baby');assert.equal(productForSection('Département 15',section('15','031')).audience,'children');
  assert.equal(productForSection('Sacs femmes','Cross body bags').type,'bag');assert.equal(productForSection('Sacs femmes',section('01','010')).type,'suitcase');assert.equal(productForSection('Département 11',section('11','011')).type,'cushion');
  assert.equal(productForSection('Département 06','Non affecté'),null);assert.equal(productForSection('Chaussures femmes','07 000 — UNASSIGNED D7'),null);assert.equal(productForSection('Chaussures femmes',section('06','019')),null);assert.equal(productForSection('Sacs femmes','Section inconnue'),null);
});

test('partage de mobilier : articles affectés à chaque section, y compris 0 % et 100 %',()=>{
  const item={...fixture('06','019'),second:section('06','027'),share:5},project=newProject('Département 06');
  assert.equal(feet(item),10);assert.deepEqual(Array.from({length:4},(_,index)=>productForSlot(project,item,index,4).type),['tshirt','tshirt','trousers','trousers']);
  assert.equal(productForSlot(project,{...item,share:0},3,4).type,'tshirt');assert.equal(productForSlot(project,{...item,share:10},0,4).type,'trousers');
});

test('toutes les sections produisent des modèles 3D finis ; les produits tiennent sur le mobilier',()=>{
  const resources=createVisitMaterials(10,8),geometries=new Set(),keep=geometry=>{geometries.add(geometry);return geometry;};
  const rounded=keep(new RoundedBoxGeometry(1,1,1,2,.05)),modelFor=createProductModels(keep,rounded,rounded,resources.materials);
  try{
    for(const dep of departments)for(const entry of dep.sections.slice(1)){
      const profile=productForSection(dep.key,entry.code+' — '+entry.label),model=modelFor(profile,'#40536b');assert(model.parts.length,entry.code);assert([model.width,model.height,model.depth].every(value=>Number.isFinite(value)&&value>0));
      for(const part of model.parts){assert([part.x,part.y,part.z,part.sx,part.sy,part.sz].every(Number.isFinite));assert(part.sx>0&&part.sy>0&&part.sz>0);}
    }
    const shoes=catalog.find(def=>def.family==='shoeTable');
    for(const [code,number,type] of [['06','019','R1'],['06','027','R1'],['07','010',shoes.id],['07','008','R1']]){
      const project=newProject(departments.find(dep=>dep.code===code).key),item=fixture(code,number,type),display=productDisplay(project,item,catalogById[type],buildFurnitureParts(item,catalogById[type]),modelFor);
      assert(display.placements.length);for(const placement of display.placements){assert(placement.scale>0&&placement.scale<=1);assert(Math.abs(placement.x)+placement.model.width*placement.scale*(placement.ry?0:.5)<=item.l/2+.02);assert(placement.y>=0);}
    }
  }finally{for(const geometry of geometries)geometry.dispose();resources.dispose();}
});

test('la scène utilise les sections de chaque meuble et conserve le plan et son footage',()=>{
  const matrix=new Matrix4();
  for(const [code,number,expected] of [['06','019','tshirt'],['06','027','trousers'],['07','010','sandals'],['07','008','boots']]){
    const project={...newProject(departments.find(dep=>dep.code===code).key),items:[fixture(code,number)]},before=JSON.stringify(project),world=createVisitScene(project);
    try{const types=new Set();for(const mesh of world.dressingGroup.children){if(mesh.userData.productType)types.add(mesh.userData.productType);for(let index=0;index<mesh.count;index++){mesh.getMatrixAt(index,matrix);assert(matrix.elements.every(Number.isFinite));assert(new Vector3().setFromMatrixScale(matrix).length()>0);}}
      assert.deepEqual([...types],[expected]);assert.equal(JSON.stringify(project),before);assert.equal(feet(project.items[0]),10);
    }finally{world.dispose();}
  }
  const project={...newProject('Département 06'),items:[{...fixture('06','019'),second:section('06','027'),share:5}]},world=createVisitScene(project);
  try{assert.deepEqual(new Set(world.dressingGroup.children.map(mesh=>mesh.userData.productType).filter(Boolean)),new Set(['tshirt','trousers']));}finally{world.dispose();}
});
