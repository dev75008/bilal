import {test} from 'node:test';
import assert from 'node:assert/strict';
import {scryptSync,createHmac,randomBytes} from 'node:crypto';
import {createPasswordVerifier,verifyPassword,PASSWORD_PROFILE} from '../server/password.js';

test('scrypt + pepper correspond à une implémentation native indépendante',async()=>{
  const pepper=randomBytes(32).toString('base64url'),password='test-only-password-for-reference';
  const verifier=await createPasswordVerifier(password,pepper),config=JSON.parse(verifier);
  assert.equal(config.version,2);assert.equal(config.algorithm,'scrypt-hmac-sha256');
  assert.equal(config.N,32768);assert.equal(config.r,8);assert.equal(config.p,3);
  const derived=scryptSync(password,Buffer.from(config.salt,'base64url'),32,{N:32768,r:8,p:3,maxmem:64*1024*1024});
  const expected=createHmac('sha256',Buffer.from(pepper,'base64url')).update(derived).digest('base64url');
  assert.equal(config.hash,expected);assert(!verifier.includes(password));assert(!verifier.includes(pepper));
  assert(await verifyPassword(password,verifier,pepper));
  assert.equal(await verifyPassword('incorrect',verifier,pepper),false);
  assert.equal(await verifyPassword(password,verifier,randomBytes(32).toString('base64url')),false);
  const second=JSON.parse(await createPasswordVerifier(password,pepper));assert.notEqual(second.salt,config.salt);assert.notEqual(second.hash,config.hash);
});
test('paramètres faibles, démesurés et anciens vérificateurs refusés avant dérivation',async()=>{
  const pepper=randomBytes(32).toString('base64url');
  const base={version:2,algorithm:'scrypt-hmac-sha256',N:PASSWORD_PROFILE.N,r:8,p:3,salt:randomBytes(16).toString('base64url'),hash:randomBytes(32).toString('base64url')};
  for(const overrides of [{N:1024},{N:2**30},{p:1},{r:1},{version:1},{algorithm:'PBKDF2'},{salt:'short'},{hash:'short'}]){
    await assert.rejects(verifyPassword('unused',JSON.stringify({...base,...overrides}),pepper),/Invalid/);
  }
  await assert.rejects(verifyPassword('unused',JSON.stringify({iterations:100000}),pepper),/Invalid/);
  await assert.rejects(createPasswordVerifier('test','invalid'),/Invalid/);
});
