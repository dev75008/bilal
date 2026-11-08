import {catalog} from './catalog.js';
import {departments} from './departments.js';
import {demo} from './demo.js';

export {catalog, departments};
export const catalogById = Object.fromEntries(catalog.map(entry => [entry.id, entry]));
export const colors = ['#72967a','#bcaa84','#a0b4c0','#b792a3','#a1a175','#85a4a2','#b88d71','#9a99b7','#99af77','#81a4bb','#c1a273','#ab8c96','#7f9e7c','#a8b391','#8fabb0','#b5a9bf','#c0ac9a','#8fb0a1','#af9d7d','#9bafbc'];
const legacy = {'Département 04':['04 034 — Robes'], 'Sacs femmes':['Cross body bags','Tote bags','Backpacks'], 'Chaussures femmes':['07 002 — Heels.','Baskets','Bottes','Chaussures plates']};
export const uid = () => 'dep-' + crypto.randomUUID();
export const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('fr').trim();
export const knownFootage = item => Number.isFinite(item.footageOverride) || Number.isFinite(catalogById[item.type]?.footage) || Number.isFinite(catalogById[item.type]?.perMetre);
export const feet = item => Number.isFinite(item.footageOverride) ? item.footageOverride : catalogById[item.type]?.perMetre ? Math.round(item.l * catalogById[item.type].perMetre * 10) / 10 : catalogById[item.type]?.footage ?? 0;
export const round = value => Math.round(value * 10) / 10;
export function sectionOptions(category, items = [], includeLegacy = false) {
  const official = departments.find(dep => dep.key === category)?.sections.filter(section => !section.code.endsWith(' 000')).map(section => section.code + ' — ' + section.label) || [];
  const used = new Set(items.flatMap(item => [item.section,item.second]));
  return [...official,...(legacy[category] || []).filter(section => includeLegacy || used.has(section)), 'Non affecté'];
}
export function sectionColor(section, category) {
  return section === 'Non affecté' ? '#a3b2b9' : colors[Math.max(0,sectionOptions(category, [], true).indexOf(section)) % colors.length];
}
export function validDoc(doc) {
  if (!doc || typeof doc.id !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(doc.id) || typeof doc.name !== 'string' || !doc.name.trim() || doc.name.length > 80 || !departments.some(dep => dep.key === doc.category) || !['width','depth'].every(key => Number.isFinite(doc[key]) && doc[key] >= 3 && doc[key] <= 60) || !Array.isArray(doc.items) || doc.items.length > 300) return false;
  const allowed = sectionOptions(doc.category, [], true);
  return new Set(doc.items.map(item => item?.id)).size === doc.items.length && doc.items.every(item => item && Number.isFinite(item.id) && Object.hasOwn(catalogById,item.type) && ['x','z','r','l','d','h'].every(key => Number.isFinite(item[key])) && Math.abs(item.x) <= 60 && Math.abs(item.z) <= 60 && item.r >= 0 && item.r < 360 && item.l >= .1 && item.l <= 10 && item.d >= .1 && item.d <= 10 && item.h >= .1 && item.h <= 5 && allowed.includes(item.section) && (item.footageOverride === undefined || Number.isFinite(item.footageOverride) && item.footageOverride >= 0 && item.footageOverride <= 10000) && (!item.second || allowed.includes(item.second) && item.second !== item.section && Number.isFinite(item.share) && item.share >= 0 && item.share <= feet(item)));
}
export function snapshot(doc) { const {id,name,category,width,depth,items} = doc; return JSON.stringify({id,name,category,width,depth,items}); }
export const isDirty = (doc, saved) => !!doc && (!saved || snapshot(doc) !== snapshot(saved));
export function newProject(category = departments[0].key, width = 10, depth = 8) {
  const dep = departments.find(entry => entry.key === category);
  return {id:uid(),name:'D' + Number(dep.code),category,width,depth,items:[]};
}
export function createDemo() {
  const project = {...newProject(demo.category,demo.width,demo.depth),name:demo.name};
  project.items = demo.fixtures.map(([type,section,x,z,r], index) => ({id:index + 1,type,x,z,r,...catalogById[type].dimensions,section:sectionOptions(demo.category).find(value => value.startsWith('01 ' + section))}));
  return project;
}
export function totals(project) {
  const rows = new Map();
  for (const item of project.items) {
    for (const [section,value] of [[item.section, feet(item) - (item.second ? item.share : 0)], ...(item.second ? [[item.second,item.share]] : [])]) {
      const row = rows.get(section) || {section,value:0,unknown:0};
      row.value += value; if (!knownFootage(item)) row.unknown++; rows.set(section,row);
    }
  }
  return [...rows.values()].map(row => ({...row,value:Number(row.value.toFixed(2))}));
}
export function placeItem(item, project, x, z, snap = true, step = 1) {
  const angle = item.r * Math.PI / 180;
  const extentX = (Math.abs(Math.cos(angle)) * item.l + Math.abs(Math.sin(angle)) * item.d) / 2;
  const extentZ = (Math.abs(Math.sin(angle)) * item.l + Math.abs(Math.cos(angle)) * item.d) / 2;
  const fit = (value, half, extent) => {
    const min = -half + extent, max = half - extent;
    if (min > max + 1e-8) throw new Error('Ce mobilier dépasse les dimensions du département.');
    if (!snap) return Math.max(min, Math.min(max,value));
    const first = Math.ceil((min + half) / step - 1e-9), last = Math.floor((max + half) / step + 1e-9);
    if (first > last) return Math.max(min, Math.min(max,value));
    return Number((-half + Math.max(first, Math.min(last, Math.round((value + half) / step))) * step).toFixed(6));
  };
  return {...item,x:fit(x,project.width / 2,extentX),z:fit(z,project.depth / 2,extentZ)};
}
export function readProjects(storage) {
  const result = {saved:[],drafts:[],lastProjectId:null,error:''};
  try {
    const raw = storage.getItem('atelier-footage-v2');
    if (raw) {
      const data = JSON.parse(raw);
      if (data.version !== 2 || !Array.isArray(data.departments) || data.departments.length > 100 || !data.departments.every(validDoc) || new Set(data.departments.map(doc => doc.id)).size !== data.departments.length) throw Error();
      result.saved = data.departments; result.lastProjectId = data.lastProjectId;
    } else {
      const old = JSON.parse(storage.getItem('atelier-footage-v1') || 'null');
      if (old) for (const dep of departments) { const doc = {...newProject(dep.key),name:dep.key + ' — ancien plan',items:old[dep.key]}; if (validDoc(doc) && doc.items.length) result.saved.push(doc); }
    }
  } catch {result.error = 'Les sauvegardes locales sont indisponibles ou illisibles. Importez un export pour restaurer vos projets.';}
  try {
    const data = JSON.parse(storage.getItem('atelier-footage-recovery-v1') || 'null');
    if (data?.version === 1 && Array.isArray(data.drafts) && data.drafts.length <= 100 && data.drafts.every(validDoc)) result.drafts = data.drafts.filter(doc => isDirty(doc,result.saved.find(saved => saved.id === doc.id)));
  } catch {result.error ||= 'La récupération locale est indisponible. Enregistrez ou exportez votre travail.';}
  return result;
}
export function parseImport(text) {
  const data = JSON.parse(text);
  let docs;
  if (data?.version === 2) docs = data.departments;
  else if (data?.version === 1 && data.plans) docs = ['Sacs femmes','Chaussures femmes'].map(category => ({...newProject(category),items:data.plans[category]}));
  if (!Array.isArray(docs) || !docs.length || docs.length > 100 || !docs.every(validDoc)) throw new Error('Fichier incompatible. Choisissez un export Atelier Footage valide.');
  return docs.map(doc => ({...doc,id:uid(),name:doc.name.slice(0,70) + ' (importé)'}));
}
