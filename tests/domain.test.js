import {test} from 'node:test';
import assert from 'node:assert/strict';
import {catalog,catalogById,departments,newProject,createDemo,validDoc,feet,totals,sectionOptions,sectionColor,placeItem,parseImport,readProjects,isDirty,normalize} from '../src/domain.js';
import {buildFurnitureParts} from '../src/furniture-models.js';
const memory = () => {const data=new Map();return {getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value)};};

test('catalogue, départements et modèles conservés',()=>{
  assert.equal(catalog.length,223);assert.equal(departments.length,12);assert.equal(departments.reduce((sum,dep)=>sum+dep.sections.length-1,0),146);
  for(const definition of catalog){const item={id:1,type:definition.id,x:0,z:0,r:0,...definition.dimensions,section:'Non affecté'};assert(buildFurnitureParts(item,definition).length>0);assert(validDoc({...newProject(),items:[item]}));}
});
test('démo et calcul du footage, y compris partage et valeurs inconnues',()=>{
  const doc=createDemo();assert(validDoc(doc));assert.equal(doc.items.length,25);assert.equal(new Set(doc.items.map(item=>item.section)).size,13);assert.equal(doc.items.reduce((sum,item)=>sum+feet(item),0),244);assert.equal(totals(doc).reduce((sum,row)=>sum+row.value,0),244);
  const section=sectionOptions(doc.category)[1];doc.items=[{...doc.items[0],second:section,share:4}];assert(validDoc(doc));assert.equal(totals(doc).find(row=>row.section===section).value,4);assert.equal(totals(doc).reduce((sum,row)=>sum+row.value,0),10);
  doc.items[0].share=11;assert.equal(validDoc(doc),false);
  doc.items[0]={...doc.items[0],footageOverride:1.1,share:.55};assert(validDoc(doc));assert.equal(totals(doc).reduce((sum,row)=>sum+row.value,0),1.1);
});
test('positionnement respecte le plan après rotation et changement de grille',()=>{
  const doc=newProject(),item={id:1,type:'R1',...catalogById.R1.dimensions,x:0,z:0,r:90,section:'Non affecté'};
  const moved=placeItem(item,doc,99,-99,true,.1);assert(moved.x+item.d/2<=doc.width/2+1e-8);assert(moved.z-item.l/2>=-doc.depth/2-1e-8);
  assert.equal(placeItem(item,doc,1.37,-.62,true,.1).x,1.4);assert.equal(placeItem(item,doc,1.37,-.62,false).x,1.37);
  assert.throws(()=>placeItem({...item,l:10,d:10},{...doc,width:3,depth:3},0,0),/dépasse/);
});
test('imports v2, sauvegardes et brouillons de la version précédente',()=>{
  const doc=createDemo(),storage=memory();storage.setItem('atelier-footage-v2',JSON.stringify({version:2,departments:[doc],lastProjectId:doc.id}));
  const changed={...doc,items:doc.items.slice(0,-1)};storage.setItem('atelier-footage-recovery-v1',JSON.stringify({version:1,drafts:[changed]}));
  const loaded=readProjects(storage);assert.equal(loaded.saved[0].items.length,25);assert.equal(loaded.drafts[0].items.length,24);assert(isDirty(loaded.drafts[0],loaded.saved[0]));
  const imported=parseImport(JSON.stringify({version:2,departments:[doc]}))[0];assert.notEqual(imported.id,doc.id);assert.equal(imported.items.length,25);assert(validDoc(imported));
  assert.throws(()=>parseImport(JSON.stringify({version:2,departments:[{...doc,items:[{type:'unknown'}]}]})));
});
test('migration v1, sections historiques, données invalides et stockage refusé',()=>{
  const storage=memory(),item={id:1,type:'R1',...catalogById.R1.dimensions,x:0,z:0,r:0,section:'Cross body bags'};
  storage.setItem('atelier-footage-v1',JSON.stringify({'Sacs femmes':[item]}));assert.equal(readProjects(storage).saved[0].items[0].section,'Cross body bags');
  assert(sectionOptions('Sacs femmes',[item]).includes('Cross body bags'));assert(!sectionOptions('Sacs femmes').includes('Cross body bags'));
  storage.setItem('atelier-footage-v2','broken');assert(readProjects(storage).error);
  assert(readProjects({getItem(){throw Error('blocked');}}).error);
  const doc=newProject();assert.equal(validDoc({...doc,id:'<script>'}),false);assert.equal(validDoc({...doc,name:' '}),false);assert.equal(validDoc({...doc,width:Infinity}),false);
});
test('recherche accentuée et couleurs stables',()=>{
  assert.equal(normalize(' Été D1 '),'ete d1');const section=sectionOptions('Sacs femmes')[0];assert.equal(sectionColor(section,'Sacs femmes'),sectionColor(section,'Sacs femmes'));
});
