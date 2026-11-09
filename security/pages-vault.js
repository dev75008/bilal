import {scryptAsync} from '@noble/hashes/scrypt.js';

export const VAULT_PROFILE=Object.freeze({N:32768,r:8,p:3,dkLen:32,maxmem:64*1024*1024,asyncTick:10});
const magic=new TextEncoder().encode('AFPAGES1');
const HEADER_SIZE=36;
async function keyFor(password,salt,usage){
  if(typeof password!=='string'||!password||password.length>256)throw Error('Invalid password');
  const derived=await scryptAsync(password,salt,VAULT_PROFILE);
  try{return await crypto.subtle.importKey('raw',derived,'AES-GCM',false,[usage]);}
  finally{derived.fill(0);}
}
export async function encryptVault(plaintext,password){
  const header=new Uint8Array(HEADER_SIZE);header.set(magic);
  crypto.getRandomValues(header.subarray(8));
  const key=await keyFor(password,header.subarray(8,24),'encrypt');
  const encrypted=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv:header.subarray(24),additionalData:header,tagLength:128},key,plaintext));
  const output=new Uint8Array(HEADER_SIZE+encrypted.length);output.set(header);output.set(encrypted,HEADER_SIZE);return output;
}
export async function decryptVault(payload,password){
  if(!(payload instanceof Uint8Array)||payload.length<HEADER_SIZE+16||payload.length>32*1024*1024||magic.some((value,index)=>payload[index]!==value))throw Error('Invalid encrypted application');
  const header=payload.subarray(0,HEADER_SIZE);
  const key=await keyFor(password,header.subarray(8,24),'decrypt');
  return new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:header.subarray(24),additionalData:header,tagLength:128},key,payload.subarray(HEADER_SIZE)));
}
