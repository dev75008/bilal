import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {createDemo,parseImport,departments} from '../src/domain.js';
const source=readFileSync(new URL('../scripts/migration.js',import.meta.url),'utf8').replace('/* DEPARTMENT_KEYS */[]',JSON.stringify(departments.map(dep=>dep.key)));
function setup(values){
  const dom=new JSDOM('<section id="migration" hidden><div id="downloads"></div><p id="status"></p></section>',{url:'https://old.test/',runScripts:'outside-only'});
  const downloads=[];
  dom.window.URL.createObjectURL=blob=>{downloads.push(blob);return 'blob:local';};dom.window.URL.revokeObjectURL=()=>{};
  dom.window.Blob=class {constructor(parts){this.text=parts.join('');}};
  dom.window.HTMLAnchorElement.prototype.click=function(){};dom.window.setTimeout=()=>0;
  for(const [key,value] of Object.entries(values))dom.window.localStorage.setItem(key,value);
  dom.window.eval(source);return {dom,downloads,buttons:[...dom.window.document.querySelectorAll('button')]};
}
test('transition : sauvegardes et brouillons séparés, téléchargés explicitement et importables',()=>{
  const demo=createDemo(),draft={...demo,name:'Brouillon'};
  const s=setup({'atelier-footage-v2':JSON.stringify({version:2,departments:[demo]}),'atelier-footage-recovery-v1':JSON.stringify({version:1,drafts:[draft]})});
  assert.equal(s.downloads.length,0);assert.equal(s.buttons.length,2);
  s.buttons[0].click();s.buttons[1].click();
  assert.equal(parseImport(s.downloads[0].text)[0].name,demo.name+' (importé)');assert.equal(parseImport(s.downloads[1].text)[0].name,'Brouillon (importé)');s.dom.window.close();
});
test('transition : lots de cent et reprise des anciennes implantations v1',()=>{
  const demo=createDemo();
  const s=setup({'atelier-footage-v2':JSON.stringify({version:2,departments:Array.from({length:101},(_,i)=>({...demo,id:'project-'+i}))})});
  assert.equal(s.buttons.length,2);s.buttons[0].click();s.buttons[1].click();assert.equal(parseImport(s.downloads[0].text).length,100);assert.equal(parseImport(s.downloads[1].text).length,1);s.dom.window.close();
  const old=setup({'atelier-footage-v1':JSON.stringify({[demo.category]:demo.items})});assert.equal(old.buttons.length,1);old.buttons[0].click();assert.equal(parseImport(old.downloads[0].text).length,1);old.dom.window.close();
});
test('transition : une sauvegarde illisible conserve la page de récupération',()=>{
  const s=setup({'atelier-footage-v2':'broken'});assert.equal(s.dom.window.document.getElementById('migration').hidden,false);assert.match(s.dom.window.document.getElementById('status').textContent,/illisibles/);assert.equal(s.downloads.length,0);s.dom.window.close();
});
