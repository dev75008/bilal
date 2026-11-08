import {scryptAsync} from '@noble/hashes/scrypt.js';

// OWASP's 32 MiB scrypt profile; fixed parameters also bound server resource use.
export const PASSWORD_PROFILE=Object.freeze({N:32768,r:8,p:3,dkLen:32,maxmem:64*1024*1024,asyncTick:10});
const encode=bytes=>btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
const decode=value=>{
  if(typeof value!=='string'||!/^[A-Za-z0-9_-]+$/.test(value))throw Error('Invalid secret encoding');
  return Uint8Array.from(atob(value.replaceAll('-','+').replaceAll('_','/')),character=>character.charCodeAt(0));
};
export function validatePepper(pepper){
  const bytes=decode(pepper);if(bytes.length!==32)throw Error('Invalid password pepper');return bytes;
}
async function pepperKey(pepper){return crypto.subtle.importKey('raw',validatePepper(pepper),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);}
function parseVerifier(verifier){
  const value=JSON.parse(verifier);
  if(value.version!==2||value.algorithm!=='scrypt-hmac-sha256'||value.N!==PASSWORD_PROFILE.N||value.r!==PASSWORD_PROFILE.r||value.p!==PASSWORD_PROFILE.p||decode(value.salt).length!==16||decode(value.hash).length!==32)throw Error('Invalid password verifier');
  return value;
}
export async function createPasswordVerifier(password,pepper){
  if(typeof password!=='string'||!password||password.length>256)throw Error('Invalid password');
  const key=await pepperKey(pepper),salt=crypto.getRandomValues(new Uint8Array(16));
  const derived=await scryptAsync(password,salt,PASSWORD_PROFILE);
  try {
    const hash=new Uint8Array(await crypto.subtle.sign('HMAC',key,derived));
    return JSON.stringify({version:2,algorithm:'scrypt-hmac-sha256',N:PASSWORD_PROFILE.N,r:PASSWORD_PROFILE.r,p:PASSWORD_PROFILE.p,salt:encode(salt),hash:encode(hash)});
  }finally{derived.fill(0);}
}
export async function verifyPassword(password,verifier,pepper){
  const value=parseVerifier(verifier),key=await pepperKey(pepper);
  const derived=await scryptAsync(password,decode(value.salt),PASSWORD_PROFILE);
  try{return await crypto.subtle.verify('HMAC',key,decode(value.hash),derived);}
  finally{derived.fill(0);}
}
