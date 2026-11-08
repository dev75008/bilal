// This page reads only the current origin's storage, after a user visits it.
// Download actions are explicit; nothing is sent to the protected service.
const departmentKeys=/* DEPARTMENT_KEYS */[];
const migration=document.getElementById('migration'),downloads=document.getElementById('downloads'),status=document.getElementById('status');
try {
  const saved=JSON.parse(localStorage.getItem('atelier-footage-v2')||'null');
  const recovery=JSON.parse(localStorage.getItem('atelier-footage-recovery-v1')||'null');
  const legacy=!saved&&JSON.parse(localStorage.getItem('atelier-footage-v1')||'null');
  const oldDocuments=legacy?departmentKeys.flatMap((category,index)=>Array.isArray(legacy[category])&&legacy[category].length?[{id:'legacy-'+index,name:category+' — ancien plan',category,width:10,depth:8,items:legacy[category]}]:[]):[];
  const groups=[['sessions',saved?.departments||oldDocuments],['brouillons',recovery?.drafts||[]]];
  for(const [label,documents] of groups) {
    if(!Array.isArray(documents))throw Error('Invalid local data');
    for(let offset=0;offset<documents.length;offset+=100) {
      const data={version:2,departments:documents.slice(offset,offset+100)};
      const suffix=documents.length>100?'-'+(1+offset/100):'';
      const button=document.createElement('button');button.type='button';button.textContent='Télécharger mes '+label+(suffix?' · partie '+(1+offset/100):'');
      button.addEventListener('click',()=>{
        const href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
        const link=document.createElement('a');link.href=href;link.download='atelier-footage-'+label+suffix+'.json';link.click();
        setTimeout(()=>URL.revokeObjectURL(href),1000);status.textContent='Fichier téléchargé. Importez chaque fichier à la nouvelle adresse.';
      });
      downloads.append(button);migration.hidden=false;
    }
  }
  if(migration.hidden)location.replace('https://atelier-footage-primark.knitmouse1.chatgpt.site/');
}catch {
  migration.hidden=false;status.textContent='Les données locales sont indisponibles ou illisibles. Conservez cette adresse pour demander leur récupération.';
}
