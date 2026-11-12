import {decryptVault} from '../security/pages-vault.js';
import './style.css';

const form=document.getElementById('unlock-form'),input=document.getElementById('password'),button=document.getElementById('unlock-button'),feedback=document.getElementById('feedback'),page=document.getElementById('access-page');
let busy=false,frame=null;
function message(text,error=false){feedback.textContent=text;feedback.dataset.error=String(error);}
function lock(){
  frame?.remove();frame=null;document.body.classList.remove('unlocked');page.hidden=false;
  document.title='Accès privé · Atelier Footage';input.value='';message('');input.focus();
}
window.addEventListener('message',event=>{
  if(frame&&event.source===frame.contentWindow&&event.origin===location.origin&&event.data?.type==='atelier-footage:lock')lock();
});
form.addEventListener('submit',async event=>{
  event.preventDefault();if(busy||!form.reportValidity())return;
  if(!globalThis.crypto?.subtle||typeof DecompressionStream!=='function'){message('Utilisez un navigateur récent et une adresse HTTPS pour ouvrir l’atelier.',true);return;}
  busy=true;button.disabled=true;input.disabled=true;form.setAttribute('aria-busy','true');message('Déverrouillage de l’atelier…');
  let password=input.value;input.value='';
  try {
    const filename=import.meta.env.VITE_VAULT_FILE||'application.bin';
    const response=await fetch(new URL('./'+filename,document.baseURI),{cache:'no-store',credentials:'omit'});
    if(!response.ok)throw Error('download');
    const payload=new Uint8Array(await response.arrayBuffer());
    let decrypted;
    try{decrypted=await decryptVault(payload,password);}catch{throw Error('password');}finally{password='';}
    const html=await new Response(new Blob([decrypted]).stream().pipeThrough(new DecompressionStream('gzip'))).text();decrypted.fill(0);
    frame=document.createElement('iframe');frame.title='Atelier Footage';frame.setAttribute('sandbox','allow-scripts allow-same-origin allow-downloads allow-modals allow-forms');
    frame.addEventListener('load',()=>frame?.contentWindow?.focus(),{once:true});
    frame.srcdoc=html;document.body.append(frame);page.hidden=true;document.body.classList.add('unlocked');document.title='Atelier Footage · Primark';message('');
  }catch(error){message(error.message==='password'?'Mot de passe incorrect. Réessayez.':'L’atelier ne peut pas être chargé. Vérifiez votre connexion, puis rechargez la page.',true);input.focus();}
  finally{password='';busy=false;button.disabled=false;input.disabled=false;form.removeAttribute('aria-busy');if(!frame)input.focus();}
});
input.addEventListener('input',()=>{if(feedback.dataset.error==='true')message('');});
button.disabled=false;input.focus();
