import {productForSection,productForSlot,hangingProducts,railFamilies} from './visit-products.js';

export function productDisplay(project,item,definition,fixtureParts,modelFor,itemIndex=0) {
  const profiles=[productForSection(project.category,item.section),item.second?productForSection(project.category,item.second):null].filter(Boolean);
  if(!profiles.length||definition.id==='Mur')return {placements:[],supports:[]};
  const palette=profile=>profile.audience==='men'?['#263b55','#c5b9a3','#425044','#e0dfd8','#55565c']:profile.audience==='baby'?['#c1cfc7','#d4bdc4','#e6dfca']:['#dccbb9','#a77e73','#344b64','#727d6b','#e8e2d6'];
  const model=(profile,index)=>{const colors=palette(profile);return modelFor(profile,colors[(itemIndex+Math.floor(index/2))%colors.length]);};
  const supports=[],placements=[];
  if(railFamilies.has(definition.family)&&item.h>.7&&profiles.every(profile=>hangingProducts.has(profile.type))){
    const count=Math.min(12,Math.max(1,Math.floor(item.l/.14))),railHeight=item.h*(definition.family==='rail'?.9:.84);
    for(let index=0;index<count;index++){
      const profile=productForSlot(project,item,index,count);if(!profile)continue;
      const product=model(profile,index),scale=Math.min(1,(railHeight-.14)/product.height,item.d*.82/product.width,item.l/count*.75/product.depth);
      if(scale<=0)continue;
      const x=count===1?0:-item.l*.34+index*item.l*.68/(count-1);
      placements.push({profile,model:product,x,y:railHeight-.08-product.height*scale,z:0,scale,rx:0,ry:Math.PI/2});
      // Indicative hangers sit below the rail; they do not change the fixture or its footage.
      supports.push({x,y:railHeight-.045,z:0,w:.007,h:.007,d:Math.min(item.d*.75,product.width*scale*.7)});
    }
    return {placements,supports};
  }
  const surfaces=fixtureParts.filter(part=>!part.cylinder&&part.w>=item.l*.35&&part.d>=item.d*.35&&part.h<.13&&part.y+part.h>=.16).map(part=>({x:part.x,z:part.z,w:part.w,d:part.d,y:part.y+part.h})).sort((a,b)=>a.y-b.y);
  const shelves=surfaces.filter((surface,index)=>!index||surface.y-surfaces[index-1].y>.04).slice(-8);
  if(!shelves.length){
    const heights=item.h>.9?[item.h*.36,item.h*.72]:[item.h*.95];
    for(const y of heights){const surface={x:0,z:0,w:item.l*.8,d:item.d*.72,y};shelves.push(surface);supports.push({x:0,y:y-.012,z:0,w:surface.w,h:.024,d:surface.d});}
  }
  const widest=Math.max(...profiles.map(profile=>model(profile,0).width));
  const counts=shelves.map(surface=>Math.min(6,Math.max(1,Math.floor(surface.w/Math.max(.25,widest+.05))))),total=counts.reduce((sum,count)=>sum+count,0);
  let slot=0;
  for(const [row,surface] of shelves.entries()){
    const columns=counts[row],slotWidth=surface.w/columns;
    for(let column=0;column<columns;column++,slot++){
      const profile=productForSlot(project,item,slot,total);if(!profile)continue;
      const product=model(profile,column),clearance=shelves[row+1]?Math.max(.045,shelves[row+1].y-surface.y-.035):product.height+.03;
      const flat=product.clothing,scale=Math.min(1,slotWidth*.85/product.width,surface.d*.82/(flat?product.height:product.depth),clearance/(flat?product.depth:product.height));
      placements.push({profile,model:product,x:surface.x+(column-(columns-1)/2)*slotWidth,y:surface.y+.006+(flat?product.depth*scale*.6:0),z:surface.z+(flat?product.height*scale*.5:0),scale,rx:flat?-Math.PI/2:0,ry:0});
    }
  }
  return {placements,supports};
}
