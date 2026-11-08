import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {createApp,makeSession} from '../server/access.js';

const password='test-only-long-password';
const bytes=value=>Buffer.from(value).toString('base64url');
const salt=crypto.getRandomValues(new Uint8Array(16));
const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);
const hash=await crypto.subtle.deriveBits({name:'PBKDF2',salt,iterations:100000,hash:'SHA-256'},key,256);
const verifier=JSON.stringify({iterations:100000,salt:bytes(salt),hash:bytes(hash)});
function setup(){
  const db=new DatabaseSync(':memory:');db.exec(readFileSync(new URL('../drizzle/0000_loving_joshua_kane.sql',import.meta.url),'utf8'));
  const DB={prepare(sql){return {bind(...args){return {async first(){return db.prepare(sql).get(...args);},async run(){return db.prepare(sql).run(...args);}};}};}};
  const env={DB,ACCESS_PASSWORD_HASH:verifier,ACCESS_SESSION_SECRET:bytes(crypto.getRandomValues(new Uint8Array(32)))};
  let served=0;
  const app=createApp(async()=>{served++;return new Response('private-asset',{headers:{'Content-Type':'text/javascript'}});});
  return {env,db,app,get served(){return served;}};
}
const get=(path='/',cookie)=>new Request('https://atelier.test'+path,{headers:cookie?{Cookie:cookie}:{}});
const post=(path,value=password,origin='https://atelier.test',ip='192.0.2.1')=>new Request('https://atelier.test'+path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/x-www-form-urlencoded','CF-Connecting-IP':ip},body:new URLSearchParams({password:value})});

test('le formulaire natif préserve son origine et permet la connexion',async()=>{
  const s=setup();
  const page=await s.app.fetch(get(),s.env);
  // Fetch's append-a-request-origin-header algorithm serializes Origin as null
  // for a native POST navigation under no-referrer. Same-origin preserves it.
  const policy=page.headers.get('Referrer-Policy');
  const formOrigin=policy==='no-referrer'?'null':'https://atelier.test';
  const submitted=await s.app.fetch(post('/auth/login',password,formOrigin),s.env);
  assert.equal(submitted.status,303,'La politique de la page ne doit pas bloquer son propre formulaire');
  assert.equal(policy,'same-origin');
  const cookie=submitted.headers.get('Set-Cookie').split(';')[0];
  assert.equal((await s.app.fetch(get('/auth/login',cookie),s.env)).status,303);
  assert.equal((await s.app.fetch(get('/auth/login',cookie),s.env)).headers.get('Location'),'/');
  assert.equal((await s.app.fetch(post('/auth/login',password,'null'),s.env)).status,403);
  s.db.close();
});

test('le serveur bloque HTML et accès directs aux images et scripts sans cookie',async()=>{
  const s=setup();
  for(const path of ['/','/index.html','/assets/app.js','/images/catalog.png','/favicon.svg']){
    const result=await s.app.fetch(get(path),s.env);assert.equal(result.status,path==='/'?200:401);
    const html=await result.text();assert(html.includes('type="password"'));assert(!html.includes(verifier));assert(!html.includes(password));assert.equal(result.headers.get('Cache-Control'),'private, no-store');
  }
  assert.equal(s.served,0);s.db.close();
});
test('connexion, cookie sécurisé, accès aux assets et déconnexion',async()=>{
  const s=setup();
  const denied=await s.app.fetch(post('/auth/login','incorrect'),s.env);assert.equal(denied.status,401);assert.equal(denied.headers.get('Set-Cookie'),null);
  const logged=await s.app.fetch(post('/auth/login'),s.env);assert.equal(logged.status,303);
  const cookie=logged.headers.get('Set-Cookie');for(const flag of ['HttpOnly','Secure','SameSite=Strict','Path=/','Max-Age=28800'])assert(cookie.includes(flag));
  assert.equal(await (await s.app.fetch(get('/assets/app.js',cookie.split(';')[0]),s.env)).text(),'private-asset');assert.equal(s.served,1);
  const logout=await s.app.fetch(post('/auth/logout'),s.env);assert.equal(logout.status,303);assert(logout.headers.get('Set-Cookie').includes('Max-Age=0'));s.db.close();
});
test('cookies falsifiés, expirés ou signés avant rotation refusés',async()=>{
  const s=setup();
  const valid=await makeSession(s.env),expired=await makeSession(s.env,Date.now()-9*3600000);
  for(const cookie of ['__Host-footage_session=forged','__Host-footage_session='+expired,'__Host-footage_session='+valid.slice(0,-8)+'AAAAAAAA'])assert.equal((await s.app.fetch(get('/index.html',cookie),s.env)).status,401);
  const rotated={...s.env,ACCESS_PASSWORD_HASH:s.env.ACCESS_PASSWORD_HASH+' '};
  assert.equal((await s.app.fetch(get('/index.html','__Host-footage_session='+valid),rotated)).status,401);s.db.close();
});
test('contrôle d’origine, méthodes et taille de formulaire',async()=>{
  const s=setup();
  assert.equal((await s.app.fetch(post('/auth/login',password,'https://other.test'),s.env)).status,403);
  assert.equal((await s.app.fetch(post('/auth/logout',password,''),s.env)).status,403);
  assert.equal((await s.app.fetch(new Request('https://atelier.test/auth/login',{method:'PUT'}),s.env)).status,405);
  assert.equal((await s.app.fetch(post('/auth/login','x'.repeat(2200)),s.env)).status,400);
  assert.equal((await s.app.fetch(new Request('http://atelier.test/'),s.env)).status,308);s.db.close();
});
test('limites persistantes et atomiques par adresse, limite globale et reprise après fenêtre',async()=>{
  const s=setup();
  for(let i=0;i<5;i++)assert.equal((await s.app.fetch(post('/auth/login','wrong'),s.env)).status,401);
  const limited=await s.app.fetch(post('/auth/login'),s.env);assert.equal(limited.status,429);assert(Number(limited.headers.get('Retry-After'))>0);
  // The SQL updates an existing window, rather than relying on isolate memory.
  s.db.exec('UPDATE access_attempts SET started=0');
  assert.equal((await s.app.fetch(post('/auth/login'),s.env)).status,303);
  s.db.prepare('UPDATE access_attempts SET attempts=30 WHERE key=?').run('global');
  assert.equal((await s.app.fetch(post('/auth/login',password,'https://atelier.test','192.0.2.2'),s.env)).status,429);s.db.close();
});
test('configuration et stockage indisponibles : aucun accès à l’application',async()=>{
  const s=setup();
  for(const env of [{},{...s.env,DB:null},{...s.env,ACCESS_SESSION_SECRET:'short'}])assert.equal((await s.app.fetch(get(),env)).status,503);
  const broken={...s.env,DB:{prepare(){throw Error('offline');}}};assert.equal((await s.app.fetch(post('/auth/login'),broken)).status,503);assert.equal(s.served,0);s.db.close();
});
