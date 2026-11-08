// Server-only authentication. No password or verifier is included in client assets.
import {verifyPassword,validatePepper} from './password.js';
const encoder = new TextEncoder();
const COOKIE = '__Host-footage_session';
const LIFETIME = 8 * 60 * 60;
const WINDOW = 15 * 60;
const encode = bytes => btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
const decode = value => Uint8Array.from(atob(value.replaceAll('-','+').replaceAll('_','/')), character => character.charCodeAt(0));
const security = {
  'Cache-Control':'private, no-store', 'X-Content-Type-Options':'nosniff',
  // Preserve Origin on native same-site form POSTs; disclose no referrer off-site.
  'Referrer-Policy':'same-origin', 'X-Frame-Options':'DENY',
  'Strict-Transport-Security':'max-age=31536000', 'X-Robots-Tag':'noindex, nofollow',
  'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; worker-src 'self' blob:; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
};
function response(body, status=200, headers={}) { return new Response(body,{status,headers:{...security,...headers}}); }
function login(message='', status=200, headers={}) {
  return response(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Accès privé · Atelier Footage</title><style>
  *{box-sizing:border-box}body{margin:0;background:#f5f5f7;color:#152d35;font:16px/1.6 system-ui,sans-serif}header{height:76px;display:flex;align-items:center;justify-content:space-between;padding:0 max(24px,calc((100vw - 1120px)/2));background:white;border-bottom:1px solid #e5e7e9;gap:24px}header b{font-size:24px;letter-spacing:-1px;font-weight:400;color:#007d96}header span{font-size:13px;color:#52666c}main{max-width:460px;margin:clamp(48px,12vh,120px) auto;padding:0 24px}small{font-size:13px;color:#52666c}h1{font-size:40px;letter-spacing:-1.5px;line-height:1.12;margin:16px 0}p{color:#52666c;margin:0 0 32px}label{display:block;font-size:14px;font-weight:600;margin-bottom:10px}input,button{width:100%;min-height:52px;border-radius:12px;font:inherit;padding:12px 16px}input{border:1px solid #b7c9cd;background:white;color:#152d35}button{border:0;margin-top:16px;background:#00b6d1;color:#073642;font-weight:600;cursor:pointer}input:focus-visible,button:focus-visible{outline:3px solid #006a80;outline-offset:4px}.error{color:#a82c32;margin:16px 0 0;font-size:14px}.privacy{margin-top:28px;font-size:13px}footer{margin-top:56px;border-top:1px solid #e5e7e9;padding-top:20px;color:#52666c;font-size:12px}@media(max-width:480px){h1{font-size:32px}header{padding:0 24px}header span{max-width:100px;text-align:right}input{font-size:16px}}@media(hover:hover){button:hover{background:#00adc7}}
  </style></head><body><header><b>PRIMARK</b><span>Atelier Footage</span></header><main><small>ESPACE DE TRAVAIL PRIVÉ</small><h1>Votre atelier.<br>En toute simplicité.</h1><p>Saisissez votre mot de passe pour retrouver vos implantations.</p><form method="post" action="/auth/login"><label for="password">Mot de passe</label><input id="password" name="password" type="password" autocomplete="current-password" required maxlength="256" autofocus aria-describedby="feedback"><div id="feedback" class="error" role="alert">${message}</div><button type="submit">Accéder à l’atelier</button></form><p class="privacy">Aucun compte ChatGPT nécessaire.<br>La session se ferme après huit heures.</p><footer>Vos projets restent enregistrés dans votre navigateur.</footer></main></body></html>`,status,{'Content-Type':'text/html; charset=utf-8',...headers});
}
async function sessionKey(env) {
  if (typeof env.ACCESS_SESSION_SECRET!=='string' || env.ACCESS_SESSION_SECRET.length<43) throw new Error('Missing session configuration');
  validatePepper(env.ACCESS_PASSWORD_PEPPER);
  return crypto.subtle.importKey('raw',encoder.encode(env.ACCESS_SESSION_SECRET+env.ACCESS_PASSWORD_HASH+env.ACCESS_PASSWORD_PEPPER),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);
}
export async function makeSession(env, now=Date.now()) {
  const payload=encode(encoder.encode(JSON.stringify([Math.floor(now/1000)+LIFETIME,encode(crypto.getRandomValues(new Uint8Array(16)))])));
  const signature=encode(new Uint8Array(await crypto.subtle.sign('HMAC',await sessionKey(env),encoder.encode(payload))));
  return payload+'.'+signature;
}
async function authenticated(request,env,now) {
  try {
    const cookies=(request.headers.get('Cookie')||'').split(';').map(part=>part.trim()).filter(part=>part.startsWith(COOKIE+'='));
    if(cookies.length!==1)return false;
    const value=cookies[0].slice(COOKIE.length+1);
    if(value.length>300)return false;
    const parts=value.split('.');if(parts.length!==2)return false;
    const [payload,signature]=parts;
    if(!await crypto.subtle.verify('HMAC',await sessionKey(env),decode(signature),encoder.encode(payload)))return false;
    const [expires,nonce]=JSON.parse(new TextDecoder().decode(decode(payload)));
    const seconds=Math.floor(now/1000);
    return Number.isInteger(expires)&&expires>seconds&&expires<=seconds+LIFETIME&&typeof nonce==='string'&&nonce.length===22;
  }catch{return false;}
}
async function reserve(db,key,now) {
  return db.prepare('INSERT INTO access_attempts (key, started, attempts) VALUES (?, ?, 1) ON CONFLICT(key) DO UPDATE SET attempts = CASE WHEN started <= ? THEN 1 ELSE attempts + 1 END, started = CASE WHEN started <= ? THEN excluded.started ELSE started END RETURNING attempts, started').bind(key,now,now-WINDOW,now-WINDOW).first();
}
async function boundedBody(request) {
  if(!request.headers.get('Content-Type')?.startsWith('application/x-www-form-urlencoded'))return null;
  const reader=request.body?.getReader();if(!reader)return null;
  const chunks=[];let length=0;
  while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>2048){await reader.cancel();return null;}chunks.push(value);}
  const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  const fields=new URLSearchParams(new TextDecoder().decode(bytes));
  return fields.getAll('password').length===1?fields.get('password'):null;
}
export function createApp(serveAsset) {
  let verifying=false;
  return {async fetch(request,env,ctx={waitUntil(){}}) {
    const url=new URL(request.url);
    if(url.protocol!=='https:'){url.protocol='https:';return response(null,308,{Location:url.href});}
    try {
      if(!env.ACCESS_PASSWORD_HASH || !env.DB)throw new Error('Missing access configuration');
      await sessionKey(env);
      const now=Math.floor(Date.now()/1000);
      if(url.pathname==='/auth/login' || url.pathname==='/auth/logout') {
        if(request.method==='GET'&&url.pathname==='/auth/login')return await authenticated(request,env,Date.now())?response(null,303,{Location:'/'}):login();
        if(request.method!=='POST')return response('Méthode non autorisée',405,{Allow:'POST'});
        if(request.headers.get('Origin')!==url.origin || request.headers.get('Sec-Fetch-Site')==='cross-site')return response('Requête refusée',403);
        if(url.pathname==='/auth/logout')return response(null,303,{Location:'/', 'Set-Cookie':`${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`});
        const password=await boundedBody(request);
        if(!password || password.length>256)return login('Saisie invalide.',400);
        const global=await reserve(env.DB,'global',now);
        if(global.attempts>30)return login('Trop de tentatives. Réessayez dans quinze minutes.',429,{'Retry-After':String(Math.max(1,global.started+WINDOW-now))});
        const ip=request.headers.get('CF-Connecting-IP')||'unknown';
        const ipKey=encode(new Uint8Array(await crypto.subtle.sign('HMAC',await sessionKey(env),encoder.encode(ip))));
        const attempt=await reserve(env.DB,ipKey,now);
        ctx.waitUntil(env.DB.prepare('DELETE FROM access_attempts WHERE started < ?').bind(now-WINDOW*2).run().catch(()=>{}));
        if(attempt.attempts>5)return login('Trop de tentatives. Réessayez dans quinze minutes.',429,{'Retry-After':String(Math.max(1,attempt.started+WINDOW-now))});
        // One memory-hard derivation per isolate prevents parallel logins exhausting RAM.
        if(verifying)return login('Une connexion est déjà en cours. Réessayez dans quelques secondes.',503,{'Retry-After':'2'});
        let matches;verifying=true;
        try{matches=await verifyPassword(password,env.ACCESS_PASSWORD_HASH,env.ACCESS_PASSWORD_PEPPER);}finally{verifying=false;}
        if(!matches)return login('Mot de passe incorrect.',401);
        await env.DB.prepare('DELETE FROM access_attempts WHERE key = ?').bind(ipKey).run();
        return response(null,303,{Location:'/', 'Set-Cookie':`${COOKIE}=${await makeSession(env)}; Path=/; Max-Age=${LIFETIME}; HttpOnly; Secure; SameSite=Strict`});
      }
      if(!['GET','HEAD'].includes(request.method))return response('Méthode non autorisée',405,{Allow:'GET, HEAD'});
      if(!await authenticated(request,env,Date.now()))return request.method==='HEAD'?response(null,401):login('',url.pathname==='/'?200:401);
      const asset=await serveAsset(request);
      const headers=new Headers(asset.headers);for(const [key,value] of Object.entries(security))headers.set(key,value);
      return new Response(request.method==='HEAD'?null:asset.body,{status:asset.status,headers});
    }catch{return response('Accès temporairement indisponible. Réessayez plus tard.',503,{'Content-Type':'text/plain; charset=utf-8'});}
  }};
}
