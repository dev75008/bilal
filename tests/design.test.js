import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';

const css=readFileSync(new URL('../src/style.css',import.meta.url),'utf8');
const tokens=Object.fromEntries([...css.match(/:root\s*\{([\s\S]*?)\}/)[1].matchAll(/(--[\w-]+):([^;]+);/g)].map(match=>[match[1],match[2].trim()]));
function luminance(hex){const rgb=[1,3,5].map(index=>parseInt(hex.slice(index,index+2),16)/255).map(value=>value<=.04045?value/12.92:((value+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;}
function contrast(first,second){const [a,b]=[luminance(first),luminance(second)].sort((a,b)=>a-b);return (b+.05)/(a+.05);}

test('les paires principales de la charte atteignent un contraste de texte de 4,5:1',()=>{
  for(const [foreground,background] of [['--ink','--surface'],['--muted','--surface'],['--on-accent','--accent'],['--on-accent','--accent-hover'],['--focus','--accent-soft'],['--positive','--positive-soft'],['--warning','--warning-soft'],['--negative','--negative-soft'],['--disabled-text','--ground']]){
    const value=contrast(tokens[foreground],tokens[background]);assert(value>=4.5,`${foreground} sur ${background} : ${value.toFixed(2)}:1`);
  }
});
test('police locale, mouvements réduits et hiérarchie typographique cohérente',()=>{
  const fonts=[...css.matchAll(/src:url\('([^']+\.woff2)'\)/g)];assert.equal(fonts.length,2);
  for(const font of fonts)assert(existsSync(resolve('src',font[1])));
  assert(!css.includes('fonts.googleapis.com'));assert(css.includes('@media(prefers-reduced-motion:reduce)'));assert(css.includes('@media(hover:hover) and (pointer:fine)'));assert(!/transition\s*:\s*all\b/.test(css));
  const sizes=new Set([...css.matchAll(/font-size:(\d+)px/g)].map(match=>Number(match[1])));assert(sizes.size<=8);assert(Math.min(...sizes)>=12);
});
