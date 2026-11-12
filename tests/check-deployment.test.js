import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {checkDeployment} from '../scripts/check-deployment.mjs';

const vault='application-0123456789abcdef.bin';
const portal=name=>`<!doctype html><html lang="fr"><head><title>Accès privé · Atelier Footage</title></head><body><form><input id="password" type="password"></form><script type="module" src="./assets/gate.js"></script></body></html>`;
const gate=`const vault='${vault}';`;

async function serve(handler){
  const server=createServer(handler);
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const {port}=server.address();
  return {url:'http://127.0.0.1:'+port+'/',close:()=>new Promise(resolve=>server.close(resolve))};
}

test('publication valide : portail, script et paquet chiffré joignables',async()=>{
  const site=await serve((request,response)=>{
    if(request.url==='/'||request.url==='/index.html'){response.writeHead(200,{'Content-Type':'text/html'});return response.end(portal());}
    if(request.url==='/assets/gate.js'){response.writeHead(200,{'Content-Type':'text/javascript'});return response.end(gate);}
    if(request.url==='/'+vault){response.writeHead(200,{'Content-Length':String(2*1024*1024),'Content-Type':'application/octet-stream'});return response.end();}
    response.writeHead(404);response.end();
  });
  try {
    const result=await checkDeployment(site.url,{attempts:1,log:()=>{}});
    assert.equal(result.vault,site.url+vault);
  } finally {await site.close();}
});

test('publication cassée : page de l’application en clair refusée',async()=>{
  const site=await serve((request,response)=>{
    response.writeHead(200,{'Content-Type':'text/html'});
    response.end('<!doctype html><html><body><div id="root"></div></body></html>');
  });
  try {
    await assert.rejects(()=>checkDeployment(site.url,{attempts:1,log:()=>{}}),/password portal/);
  } finally {await site.close();}
});

test('publication cassée : paquet chiffré manquant',async()=>{
  const site=await serve((request,response)=>{
    if(request.url==='/'){response.writeHead(200,{'Content-Type':'text/html'});return response.end(portal());}
    if(request.url==='/assets/gate.js'){response.writeHead(200,{'Content-Type':'text/javascript'});return response.end(gate);}
    response.writeHead(404);response.end();
  });
  try {
    await assert.rejects(()=>checkDeployment(site.url,{attempts:1,log:()=>{}}),/Encrypted payload status 404/);
  } finally {await site.close();}
});

test('domaine mort : erreur explicite sans blocage',async()=>{
  await assert.rejects(()=>checkDeployment('http://127.0.0.1:1/',{attempts:1,log:()=>{}}),/unreachable or incomplete/);
});
