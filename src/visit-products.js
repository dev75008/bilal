import {departments,normalize,feet} from './domain.js';

const rules=[
  [/sandal/,'sandals'],[/\b(?:heels?|talons?)\b/,'heels'],[/boots|bottes|bottines/,'boots'],[/slippers|chaussons/,'slippers'],[/tongs|flip flop/,'flipflops'],[/footwear accessories|accessoires chaussures|semelles/,'insoles'],[/flats|ballerines|chaussures plates/,'flats'],[/footwear|shoes|chaussures|baskets/,'trainers'],
  [/t shirt|tee shirt|jersey|sports tops|performancewear|fashion jersey/,'tshirt'],[/denim|jeans/,'jeans'],[/trousers|pantalon|casual bottoms/,'trousers'],[/shorts|swim|maillot/,'shorts'],[/outerwear|coats|formalwear|jacket|manteaux|vestes/,'jacket'],[/cardigan|knitwear|jumpers|pulls|maille/,'sweater'],[/shirts|chemises|blouses/,'shirt'],[/dresses|robes|skirts|jupes/,'dress'],[/pyjama|nightwear|loungewear|pj separates/,'pyjamas'],[/briefs|underwear|shapewear/,'briefs'],[/bras|soutien/,'bra'],[/camisoles|thermal|maternity/,'tshirt'],
  [/suitcase|luggage|valises/,'suitcase'],[/purses|portefeuilles/,'purse'],[/make up bags|trousses/,'purse'],[/backpacks|bags|sacs/,'bag'],[/belts|ceintures/,'belt'],[/jewellery|bijoux/,'jewellery'],[/sunglasses|reading glasses|lunettes/,'glasses'],[/umbrellas|parapluies/,'umbrella'],[/hats|chapeaux/,'hat'],[/gloves|gants/,'gloves'],[/scarves|echarpes/,'scarf'],[/hair|cheveux/,'hair'],[/hosiery|tights|opaques|collants/,'tights'],[/socks|footies|liners|chaussettes/,'socks'],
  [/cushion|coussins/,'cushion'],[/bedding|duvet|filled product|literie|couettes/,'bedding'],[/throws|towls|towels|serviettes|bathroom/,'towel'],[/storage|rangement/,'basket'],[/kitchen|cuisine/,'cup'],[/candles|bougies/,'candle'],[/lights|lampes/,'lamp'],
  [/cosmetic|nails|lashes|maquillage/,'cosmetic'],[/fragrance|hygiene|tanning|skincare|grooming|beauty|parfum/,'bottle'],[/electricals|technology|technologie/,'device'],[/paper|stationery|papier|papeterie/,'book'],[/toys|jouets|inflatables/,'toy'],[/food|alimentation/,'food'],[/travel/,'suitcase'],[/accessories|accessoires/,'bag'],
];
const defaults={'01':'bag','02':'socks','04':'briefs','05':'tshirt','06':'tshirt','07':'trainers','08':'tshirt','11':'basket','15':'tshirt','16':'briefs','23':'bottle','25':'gift'};

export function productForSection(category,section) {
  if(typeof section!=='string'||!section.trim()||/non affect|unassigned/i.test(normalize(section)))return null;
  const department=departments.find(dep=>dep.key===category);
  if(!department)return null;
  const code=section.match(/^(\d{2})\s+(\d{3})\b/);
  if(code&&(code[1]!==department.code||code[2]==='000'))return null;
  const official=code&&department.sections.find(entry=>entry.code===code[1]+' '+code[2]);
  const text=normalize(official?.label||section.replace(/^\d{2}\s+\d{3}\s*[—–-]?\s*/,'' )).replace(/[-_]/g,' ');
  let type=rules.find(([pattern])=>pattern.test(text))?.[1];
  if(department.code==='02')type=/hosiery|tights|opaques|collants/.test(text)?'tights':'socks';
  if(department.code==='16'&&/robes|peignoir/.test(text))type='robe';
  if(department.code==='04'&&/bra accessories/.test(text))type='bra';
  if(department.code==='23'&&/hair/.test(text))type='bottle';
  if(department.code==='07'&&/beach/.test(text))type='flipflops';
  if(department.code==='11'&&/accessories/.test(text))type='basket';
  if(!type&&!official)return null;
  type ||= defaults[department.code];
  let audience=['06','16'].includes(department.code)?'men':['05','15'].includes(department.code)?'children':'women';
  if(/baby|newborn|bebe/.test(text))audience='baby';
  return {type,audience,department:department.code,section:official?.code||section};
}

export function productForSlot(project,item,index,count) {
  const total=feet(item),secondaryRatio=item.second&&total>0?Math.max(0,Math.min(1,item.share/total)):0;
  const primaryCount=Math.round(count*(1-secondaryRatio));
  return productForSection(project.category,index<primaryCount?item.section:item.second);
}

export const hangingProducts=new Set(['tshirt','shirt','sweater','jacket','trousers','jeans','shorts','dress','pyjamas','robe','briefs','bra','tights','socks','scarf','gloves']);
export const railFamilies=new Set(['rail','singleRail','doubleRail','fourArm','wardrobe','featureRail','denimRail','wallRail','wallMixed','suspended']);
