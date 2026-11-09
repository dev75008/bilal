import {test} from 'node:test';
import assert from 'node:assert/strict';
import {scryptSync,createDecipheriv} from 'node:crypto';
import {encryptVault,decryptVault} from '../security/pages-vault.js';

test('le paquet Pages est chiffré, authentifié et compatible avec les primitives natives',async()=>{
  const password='test-only-pages-password',plain=new TextEncoder().encode('<html>application privée</html>');
  const first=await encryptVault(plain,password),second=await encryptVault(plain,password);
  assert.notDeepEqual(first,second);assert.equal(new TextDecoder().decode(first.subarray(0,8)),'AFPAGES1');
  assert(!Buffer.from(first).includes(Buffer.from(password)));assert(!Buffer.from(first).includes(Buffer.from(plain)));
  assert.deepEqual(await decryptVault(first,password),plain);
  const header=first.subarray(0,36),key=scryptSync(password,header.subarray(8,24),32,{N:32768,r:8,p:3,maxmem:64*1024*1024});
  const cipher=createDecipheriv('aes-256-gcm',key,header.subarray(24));cipher.setAAD(header);cipher.setAuthTag(first.subarray(-16));
  assert.deepEqual(Buffer.concat([cipher.update(first.subarray(36,-16)),cipher.final()]),Buffer.from(plain));
  await assert.rejects(decryptVault(first,'incorrect'));
  const changed=first.slice();changed[40]^=1;await assert.rejects(decryptVault(changed,password));
  const changedSalt=first.slice();changedSalt[10]^=1;await assert.rejects(decryptVault(changedSalt,password));
});
test('un format non reconnu et une configuration vide sont refusés',async()=>{
  await assert.rejects(decryptVault(new Uint8Array(60),'test'),/Invalid encrypted/);
  await assert.rejects(encryptVault(new Uint8Array([1]),''),/Invalid password/);
});
