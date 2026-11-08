import React, {useCallback,useEffect,useRef,useState} from 'react';
import {catalog, catalogById, departments, feet, knownFootage, normalize, newProject, createDemo, readProjects, validDoc, snapshot, isDirty, sectionOptions, sectionColor, totals, round, placeItem, parseImport} from './domain.js';
import {PlanCanvas} from './PlanCanvas.jsx';
import {Visit} from './Visit.jsx';
import {Home} from './Home.jsx';
import {Icon} from './Icon.jsx';

function bootstrap() {
  let data;
  try {data=readProjects(localStorage);} catch {data={saved:[],drafts:[],error:'Le stockage local est indisponible. Exportez vos projets pour les conserver.'};}
  const documents=[...data.saved];
  for(const draft of data.drafts){const index=documents.findIndex(doc=>doc.id===draft.id);if(index>=0)documents[index]=draft;else documents.push(draft);}
  if(new URLSearchParams(location.search).get('demo')==='d1'){const project=createDemo();documents.push(project);return {...data,documents,activeId:project.id,screen:'editor',demoSnapshot:snapshot(project)};}
  return {...data,documents,activeId:null,screen:'home'};
}
function Modal({title,onClose,children}) {
  const ref=useRef(null);
  useEffect(()=>{const previous=document.activeElement,dialog=ref.current;dialog.showModal();return()=>{dialog.close();previous?.focus?.();};},[]);
  return <dialog ref={ref} aria-labelledby="modal-title" onCancel={event=>{event.preventDefault();onClose();}}><div className="modal-heading"><h2 id="modal-title">{title}</h2><button type="button" onClick={onClose}>Fermer</button></div>{children}</dialog>;
}
function DepartmentForm({project,onSubmit}) {
  const [category,setCategory]=useState(project?.category||departments[0].key);
  return <form onSubmit={event=>{event.preventDefault();const data=new FormData(event.currentTarget);onSubmit({category,width:Number(data.get('width')),depth:Number(data.get('depth'))});}}>
    <label>Département<select name="category" value={category} onChange={event=>setCategory(event.target.value)}>{departments.map(dep=><option key={dep.key} value={dep.key}>{dep.title}</option>)}</select></label>
    <p className="note">{sectionOptions(category).length-1} sections commerciales disponibles.</p>
    {project&&category!==project.category&&<p className="notice">Changer de département réaffectera tous les meubles à « Non affecté ».</p>}
    <div className="field-pair"><label>Longueur du plan (m)<input name="width" type="number" min="3" max="60" step=".5" required defaultValue={project?.width||10}/></label><label>Profondeur du plan (m)<input name="depth" type="number" min="3" max="60" step=".5" required defaultValue={project?.depth||8}/></label></div>
    <p className="note">Les modèles sont simplifiés. Les dimensions du mobilier restent ajustables.</p><button className="primary" type="submit">{project?'Appliquer les dimensions':'Créer la session'}</button>
  </form>;
}
function Allocation({project}) {
  const rows=totals(project),total=round(project.items.reduce((sum,item)=>sum+feet(item),0)),unknown=project.items.filter(item=>!knownFootage(item)).length;
  return <section className="allocation-panel" aria-label="Footage par section"><div className="allocation-heading"><h2>Footage du département</h2><div><strong>{total.toLocaleString('fr-FR')}</strong> pieds{unknown?' connus':''}</div></div><p className="note">{project.items.length} mobilier{project.items.length>1?'s':''}{unknown?` · ${unknown} footage(s) à compléter`:''}</p>
    <div className="allocation-bar" aria-hidden="true">{rows.map(row=><span key={row.section} style={{width:(total?row.value/total*100:0)+'%',background:sectionColor(row.section,project.category)}}/>)}</div>
    {!rows.length?<p className="note">Ajoutez un mobilier pour calculer le footage de chaque section.</p>:<ul className="section-legend">{rows.map(row=><li key={row.section}><span className="swatch" style={{background:sectionColor(row.section,project.category)}}/><span>{row.section}</span><b>{row.value.toLocaleString('fr-FR')} pieds{row.unknown>0&&<small>{row.unknown} à compléter</small>}</b></li>)}</ul>}
  </section>;
}

export default function App() {
  const [initial]=useState(bootstrap),[documents,setDocuments]=useState(initial.documents),[saved,setSaved]=useState(initial.saved),[activeId,setActiveId]=useState(initial.activeId),[screen,setScreen]=useState(initial.screen),[lastSavedId,setLastSavedId]=useState(initial.lastProjectId);
  const [selected,setSelected]=useState(null),[panel,setPanel]=useState('catalog'),[panelOpen,setPanelOpen]=useState(false),[section,setSection]=useState(''),[pending,setPending]=useState(null),[view,setView]=useState('3'),[snap,setSnap]=useState(true),[step,setStep]=useState(1),[message,setMessage]=useState(initial.error||'Vos projets restent sur cet appareil. Exportez une copie pour les partager.'),[storageError,setStorageError]=useState('');
  const [modal,setModal]=useState(null),[preview,setPreview]=useState(null),[visiting,setVisiting]=useState(false),[expanded,setExpanded]=useState(false),[foldersOpen,setFoldersOpen]=useState(false),[helpOpen,setHelpOpen]=useState(false);
  const [query,setQuery]=useState(''),[sort,setSort]=useState('recent'),[catalogQuery,setCatalogQuery]=useState(''),[group,setGroup]=useState(''),[catalogLimit,setCatalogLimit]=useState(24);
  const histories=useRef(new Map()),importRef=useRef(null),demoBaseline=useRef(initial.demoSnapshot||null);
  const project=documents.find(doc=>doc.id===activeId),item=project?.items.find(entry=>entry.id===selected),savedDoc=saved.find(doc=>doc.id===activeId);
  const draftDocuments=documents.filter(doc=>isDirty(doc,saved.find(entry=>entry.id===doc.id))&&snapshot(doc)!==demoBaseline.current);
  useEffect(()=>{
    const keyboard=event=>{if(!['Shift','Control','Alt','Meta'].includes(event.key))document.documentElement.dataset.modality='keyboard';};
    const pointer=()=>{document.documentElement.dataset.modality='pointer';};
    window.addEventListener('keydown',keyboard,true);window.addEventListener('pointerdown',pointer,true);
    return()=>{window.removeEventListener('keydown',keyboard,true);window.removeEventListener('pointerdown',pointer,true);};
  },[]);
  useEffect(()=>{
    const write=()=>{try{localStorage.setItem('atelier-footage-recovery-v1',JSON.stringify({version:1,drafts:draftDocuments.slice(-100)}));setStorageError('');}catch{setStorageError('La copie de secours est indisponible. Exportez votre projet pour le conserver.');}};
    write();const hidden=()=>{if(document.visibilityState==='hidden')write();};window.addEventListener('pagehide',write);document.addEventListener('visibilitychange',hidden);
    return()=>{window.removeEventListener('pagehide',write);document.removeEventListener('visibilitychange',hidden);};
  },[documents,saved]);
  useEffect(()=>{const warn=event=>{if(draftDocuments.length){event.preventDefault();event.returnValue='';}};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[documents,saved]);
  const open=doc=>{setActiveId(doc.id);setScreen('editor');setSelected(null);setPending(null);setSection('');setPanelOpen(false);setExpanded(false);setFoldersOpen(false);};
  const change=useCallback(next=>{
    if(!project||!validDoc(next)){setMessage('Modification refusée : vérifiez les valeurs du mobilier ou du département.');return false;}
    if(snapshot(next)===snapshot(project))return true;
    const history=histories.current.get(project.id)||{undo:[],redo:[]};history.undo.push(project);if(history.undo.length>40)history.undo.shift();history.redo=[];histories.current.set(project.id,history);
    setDocuments(docs=>docs.map(doc=>doc.id===next.id?next:doc));setMessage('Plan modifié. Enregistrez votre session pour conserver cette version.');return true;
  },[project]);
  const undo=useCallback((redo=false)=>{if(!project)return;const history=histories.current.get(project.id),from=history?.[redo?'redo':'undo'],to=history?.[redo?'undo':'redo'];if(!from?.length)return;to.push(project);const next=from.pop();setDocuments(docs=>docs.map(doc=>doc.id===next.id?next:doc));setSelected(null);setPending(null);setMessage(redo?'Modification rétablie.':'Dernière modification annulée.');},[project]);
  const editItem=patch=>{
    if(!item)return;
    try{let next={...item,...patch};if(next.second===next.section){delete next.second;delete next.share;}if(next.second){if(!knownFootage(next)){delete next.second;delete next.share;}else next.share=Math.min(next.share,feet(next));}
      if(['l','d','r'].some(key=>Object.hasOwn(patch,key)))next=placeItem(next,project,next.x,next.z,snap,step);
      change({...project,items:project.items.map(entry=>entry.id===item.id?next:entry)});
    }catch(error){setMessage(error.message);}
  };
  const removeItem=useCallback(()=>{if(!project||selected===null)return;change({...project,items:project.items.filter(entry=>entry.id!==selected)});setSelected(null);setMessage('Mobilier supprimé. Vous pouvez annuler cette action.');},[project,selected,change]);
  const saveProject=useCallback(name=>{
    if(!project)return;
    const next={...project,name:(name||project.name).trim(),savedAt:new Date().toISOString()};
    if(!validDoc(next)){setMessage('Choisissez un nom de 1 à 80 caractères.');return;}
    const proposed=[...saved.filter(doc=>doc.id!==next.id),next];if(proposed.length>100){setMessage('Limite de 100 sauvegardes. Exportez et supprimez une ancienne session.');return;}
    try{localStorage.setItem('atelier-footage-v2',JSON.stringify({version:2,departments:proposed,lastProjectId:next.id}));setSaved(proposed);setLastSavedId(next.id);setDocuments(docs=>docs.map(doc=>doc.id===next.id?next:doc));setModal(null);setMessage('Session « '+next.name+' » enregistrée sur cet appareil.');}
    catch{setMessage('Enregistrement impossible. Exportez votre projet pour le conserver.');}
  },[project,saved]);
  useEffect(()=>{
    const handle=event=>{
      if(modal||preview||visiting||helpOpen)return;
      if(event.key==='Escape'){setPending(null);setExpanded(false);return;}
      if(screen!=='editor'||event.target.closest?.('input,select,textarea,[contenteditable="true"]'))return;
      if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='s'){event.preventDefault();if(savedDoc)saveProject();else setModal('save');}
      if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='z'){event.preventDefault();undo(event.shiftKey);}
      if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='y'){event.preventDefault();undo(true);}
      if(event.key==='Delete'||event.key==='Backspace'){event.preventDefault();removeItem();}
    };window.addEventListener('keydown',handle);return()=>window.removeEventListener('keydown',handle);
  },[screen,modal,preview,visiting,helpOpen,savedDoc,saveProject,undo,removeItem]);
  const create=values=>{if(documents.length>=100){setMessage('Limite de 100 sessions. Exportez et supprimez une ancienne session.');return;}const next=newProject(values.category,values.width,values.depth);if(!validDoc(next))return;setDocuments(docs=>[...docs,next]);setModal(null);open(next);setPanelOpen(true);setMessage('Choisissez une section, puis le mobilier à placer.');};
  const showDemo=()=>{const existing=documents.find(doc=>snapshot(doc)===demoBaseline.current);if(existing){open(existing);return;}if(documents.length>=100){setMessage('Limite de 100 sessions. Exportez et supprimez une ancienne session.');return;}const next=createDemo();demoBaseline.current=snapshot(next);setDocuments(docs=>[...docs,next]);open(next);setStep(.5);setMessage('Démonstration fictive : 25 meubles, 13 sections, 244 pieds.');};
  const addFurniture=(x=0,z=0,type=pending)=>{
    if(!type||!section)return;
    if(project.items.length>=300){setMessage('Limite de 300 meubles par département.');return;}
    try{const next=placeItem({id:Math.max(0,...project.items.map(entry=>entry.id))+1,type,...catalogById[type].dimensions,x,z,r:0,section},project,x,z,snap,step);if(change({...project,items:[...project.items,next]})){setSelected(next.id);setPending(null);setPanel('selection');setPanelOpen(true);setMessage('Mobilier ajouté à '+section+'.');}}
    catch(error){setMessage(error.message);}
  };
  const duplicate=()=>{
    if(!item)return;if(project.items.length>=300){setMessage('Limite de 300 meubles par département.');return;}
    try{const next=placeItem({...item,id:Math.max(0,...project.items.map(entry=>entry.id))+1},project,item.x+.5,item.z+.5,snap,step);if(change({...project,items:[...project.items,next]}))setSelected(next.id);}catch(error){setMessage(error.message);}
  };
  const exportProjects=()=>{
    if(!documents.length){setMessage('Créez ou importez un projet avant de l’exporter.');return;}
    const url=URL.createObjectURL(new Blob([JSON.stringify({version:2,departments:documents},null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='atelier-footage-'+new Date().toISOString().slice(0,10)+'.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setMessage('Export téléchargé. Conservez ce fichier pour restaurer ou transférer vos projets.');
  };
  const importProjects=async event=>{
    const file=event.target.files[0];event.target.value='';if(!file)return;
    try{if(file.size>5_000_000)throw new Error('Le fichier dépasse la limite de 5 Mo.');const docs=parseImport(await file.text());if(documents.length+docs.length>100)throw new Error('Limite de 100 sessions ouvertes. Fermez une ancienne session avant d’importer.');setDocuments(current=>[...current,...docs]);open(docs[0]);setMessage(docs.length+' session(s) importée(s). Enregistrez les projets à conserver.');}
    catch(error){setMessage(error instanceof SyntaxError?'Le fichier ne contient pas un export JSON valide.':error.message);}
  };
  const deleteProject=()=>{
    const proposed=saved.filter(doc=>doc.id!==project.id);
    try{localStorage.setItem('atelier-footage-v2',JSON.stringify({version:2,departments:proposed}));localStorage.setItem('atelier-footage-recovery-v1',JSON.stringify({version:1,drafts:draftDocuments.filter(doc=>doc.id!==project.id)}));}
    catch{setMessage('Suppression impossible : le stockage local est indisponible.');return;}
    setSaved(proposed);setDocuments(docs=>docs.filter(doc=>doc.id!==project.id));histories.current.delete(project.id);setActiveId(null);setScreen('home');setModal(null);setMessage('Session supprimée de cet appareil.');
  };
  const exitVisit=useCallback(()=>setVisiting(false),[]),visitError=useCallback(text=>{setMessage(text);setVisiting(false);},[]);
  const history=histories.current.get(project?.id),projects=[...saved].filter(doc=>normalize(doc.name+' '+doc.category).includes(normalize(query))).sort(sort==='name'?(a,b)=>a.name.localeCompare(b.name,'fr',{numeric:true}):(a,b)=>(Date.parse(b.savedAt)||0)-(Date.parse(a.savedAt)||0));
  const recent=saved.find(doc=>doc.id===lastSavedId)||[...saved].sort((a,b)=>(Date.parse(b.savedAt)||0)-(Date.parse(a.savedAt)||0))[0];
  const matches=catalog.filter(entry=>(!group||entry.group===group)&&normalize(entry.name+' '+entry.label+' '+entry.group).includes(normalize(catalogQuery)));
  const options=project?sectionOptions(project.category,project.items):[];
  const choose=entry=>{if(!section){setMessage('Choisissez d’abord une section commerciale.');setPanel('catalog');setPanelOpen(true);return;}setPending(entry.id);setPreview(null);setMessage('Cliquez sur le plan pour placer '+entry.name+', ou utilisez « Placer au centre ».');};

  return <>
    <input ref={importRef} type="file" accept="application/json,.json" hidden onChange={importProjects}/>
    <a className="skip-link" href="#main-content">Aller au contenu</a>
    <header className="app-header"><button className="brand" aria-label="Atelier Footage, revenir à l’accueil" onClick={()=>{setScreen('home');setPending(null);setExpanded(false);}}><strong>PRIMARK</strong><span>Atelier Footage</span></button><div className="app-location"><Icon name={screen==='home'?'folder':'cube'}/><span>{screen==='home'?'Mes implantations':'Atelier de création'}</span></div><nav aria-label="Actions générales">{screen==='editor'&&<button onClick={()=>{setScreen('home');setPending(null);setExpanded(false);}}><Icon name="home"/>Accueil</button>}<button onClick={()=>importRef.current.click()}><Icon name="download"/>Importer</button><button onClick={exportProjects} disabled={!documents.length}><Icon name="upload"/>Exporter</button><button className="help-trigger" aria-label="Aide et raccourcis" onClick={()=>setHelpOpen(true)}><Icon name="help"/><span>Aide</span></button>{import.meta.env.VITE_PROTECTED&&<form className="logout-form" method="post" action="/auth/logout"><button type="submit">Se déconnecter</button></form>}</nav></header>
    {storageError&&<p className="storage-error" role="alert">{storageError}</p>}
    {screen==='home'?<Home documents={documents} saved={saved} projects={projects} recent={recent} drafts={draftDocuments} query={query} sort={sort} onQuery={setQuery} onSort={setSort} onNew={()=>setModal('new')} onDemo={showDemo} onOpen={open}/>:project&&<div className={'editor-shell'+(foldersOpen?' folders-open':'')}>
      <aside className="session-rail"><h2>Sessions ouvertes</h2><button className="rail-new" onClick={()=>setModal('new')}><Icon name="plus"/>Nouvelle session</button>{documents.map(doc=><button className={'session-link'+(doc.id===activeId?' active':'')} key={doc.id} onClick={()=>open(doc)} aria-pressed={doc.id===activeId}><span className="session-icon"><Icon name="folder"/></span><span className="session-copy"><b>{doc.name}</b><small>{doc.items.length} meubles · {isDirty(doc,saved.find(entry=>entry.id===doc.id))?'Brouillon':'Enregistré'}</small></span></button>)}<p className="note">Les copies de secours restent sur cet appareil.</p></aside>
      <main className="editor-main" id="main-content" tabIndex={-1}><div className="editor-toolbar"><div><button className="mobile-sessions" onClick={()=>setFoldersOpen(value=>!value)} aria-expanded={foldersOpen}>Sessions</button><h1>{project.name}</h1><span className={'doc-state'+(isDirty(project,savedDoc)?'':' saved')}>{isDirty(project,savedDoc)?'Modifications non enregistrées':'Enregistré'}</span></div><div className="toolbar-actions"><button onClick={()=>setModal('edit')} title="Modifier le département et les dimensions"><Icon name="ruler"/>{project.width} × {project.depth} m</button><button onClick={()=>undo()} disabled={!history?.undo.length} title="Ctrl+Z"><Icon name="undo"/>Annuler</button><button onClick={()=>undo(true)} disabled={!history?.redo.length} title="Ctrl+Maj+Z"><Icon name="redo"/>Rétablir</button><button className="primary" onClick={()=>savedDoc?saveProject():setModal('save')} title="Ctrl+S"><Icon name="save"/>Enregistrer</button><details className="project-menu"><summary aria-label="Options de la session"><Icon name="more"/></summary><div><button onClick={event=>{event.currentTarget.closest('details').open=false;setModal('save');}}>Renommer</button><button className="danger" onClick={event=>{event.currentTarget.closest('details').open=false;setModal('delete');}}><Icon name="trash"/>Supprimer la session</button></div></details></div></div>
      {project.name.includes('DÉMO')&&<p className="notice">Démonstration fictive. Les dimensions ne représentent pas un magasin réel.</p>}
      <section className={'workspace'+(panelOpen?' with-panel':'')+(expanded?' expanded':'')}><div className="scene"><div className="scene-toolbar"><div className="segments" aria-label="Vue du plan"><button aria-pressed={view==='3'} onClick={()=>setView('3')}>3D</button><button aria-pressed={view==='2'} onClick={()=>setView('2')}>2D</button></div><button onClick={()=>{setPanelOpen(value=>!value);setPanel('catalog');setPending(null);}} aria-expanded={panelOpen}><Icon name="plus"/>Ajouter un mobilier</button><button onClick={()=>setVisiting(true)} className="visit-action" disabled={!project.items.length}><Icon name="walk"/>Visiter</button><button aria-pressed={expanded} onClick={()=>setExpanded(value=>!value)}><Icon name="expand"/>{expanded?'Réduire':'Agrandir'}</button></div>
        <div className="grid-controls"><button aria-pressed={snap} onClick={()=>setSnap(value=>!value)}><Icon name="grid"/>{snap?'Aimant activé':'Placement libre'}</button><label>Grille<select value={step} onChange={event=>setStep(Number(event.target.value))}><option value="1">1 m</option><option value="0.5">50 cm</option><option value="0.1">10 cm</option></select></label></div>
        <PlanCanvas key={project.id} project={project} view={view} selected={selected} pending={pending} snap={snap} step={step} onSelect={id=>{setSelected(id);setPanel('selection');setPanelOpen(true);}} onPlace={addFurniture} onMove={next=>change({...project,items:project.items.map(entry=>entry.id===next.id?next:entry)})}/>
        {!project.items.length&&!pending&&<div className="canvas-empty"><h2>Votre espace de travail</h2><p>Choisissez une section et un mobilier pour commencer.</p></div>}
        {pending?<div className="placement-bar"><span>Placer {catalogById[pending].name} dans {section}</span><button onClick={()=>addFurniture()}>Placer au centre</button><button onClick={()=>setPending(null)}>Annuler</button></div>:<p className="canvas-hint">{view==='3'?'Glissez le fond pour tourner la vue. ':''}Sélectionnez un meuble pour le déplacer ou le modifier.</p>}
      </div>
      {panelOpen&&<aside className="inspector"><div className="inspector-tabs"><button aria-pressed={panel==='catalog'} onClick={()=>{setPanel('catalog');setPending(null);}}>Catalogue</button><button aria-pressed={panel==='selection'} disabled={!item} onClick={()=>setPanel('selection')}>Sélection</button><button onClick={()=>setPanelOpen(false)} aria-label="Fermer le panneau"><Icon name="close" size={16}/></button></div>
        {panel==='catalog'?<><h2>Ajouter un mobilier</h2><label>Section commerciale<select value={section} onChange={event=>{setSection(event.target.value);setPending(null);}}><option value="">Choisir une section</option>{options.map(value=><option key={value}>{value}</option>)}</select></label><label>Rechercher une référence<input type="search" placeholder="R1, table, portant…" value={catalogQuery} onChange={event=>{setCatalogQuery(event.target.value);setCatalogLimit(24);}}/></label><label>Famille<select value={group} onChange={event=>{setGroup(event.target.value);setCatalogLimit(24);}}><option value="">Toutes les familles</option>{[...new Set(catalog.map(entry=>entry.group))].map(value=><option key={value}>{value}</option>)}</select></label><p className="note" role="status">{matches.length} référence(s){!section?' · choisissez une section pour placer un meuble':''}</p>
        <div className="catalog-list">{matches.slice(0,catalogLimit).map(entry=><article className="catalog-card" key={entry.id}>{entry.image?<img src={entry.image} alt={entry.label} loading="lazy" width="72" height="66"/>:<div className="no-image">Mur</div>}<div><h3>{entry.name}</h3><p>{entry.label}</p><small>{entry.perMetre?entry.perMetre+' pieds/m':entry.footage===null||entry.footage===undefined?'Footage à compléter':entry.footage+' pieds'}</small></div><div className="catalog-actions"><button onClick={()=>setPreview(entry)}>Aperçu</button><button onClick={()=>choose(entry)} disabled={!section}>Placer</button></div></article>)}</div>
        {!matches.length&&<p className="notice">Aucune référence. Essayez un autre nom ou une autre famille.</p>}{matches.length>catalogLimit&&<button className="load-more" onClick={()=>setCatalogLimit(value=>value+24)}>Afficher plus de références</button>}<p className="note">Census AW24. Modèles simplifiés ; dimensions estimées et modifiables.</p></>:item&&<><h2>{catalogById[item.type].name}</h2><p className="item-footage">{knownFootage(item)?feet(item)+' pieds':'Footage à compléter'}</p><label>Section commerciale<select value={item.section} onChange={event=>editItem({section:event.target.value})}>{options.map(value=><option key={value}>{value}</option>)}</select></label>
          <div className="field-pair"><button onClick={()=>editItem({r:(item.r+270)%360})}>Tourner −90°</button><button onClick={()=>editItem({r:(item.r+90)%360})}>Tourner +90°</button></div><label>Angle : {item.r}°<input type="range" min="0" max="359" step="1" value={item.r} onChange={event=>editItem({r:Number(event.target.value)})}/></label><div className="field-pair"><button onClick={duplicate}>Dupliquer</button><button className="danger" onClick={removeItem}>Supprimer</button></div>
          <details><summary>Dimensions et position</summary><div className="field-pair">{[['l','Longueur (m)',10],['d','Profondeur (m)',10],['h','Hauteur (m)',5]].map(([key,label,max])=><label key={key}>{label}<input type="number" min=".1" max={max} step=".05" value={item[key]} onChange={event=>editItem({[key]:Number(event.target.value)})}/></label>)}</div><div className="field-pair">{['x','z'].map(key=><label key={key}>Position {key.toUpperCase()} (m)<input type="number" min="-60" max="60" step={step} value={item[key]} onChange={event=>{try{const next=placeItem(item,project,key==='x'?Number(event.target.value):item.x,key==='z'?Number(event.target.value):item.z,snap,step);change({...project,items:project.items.map(entry=>entry.id===item.id?next:entry)});}catch(error){setMessage(error.message);}}}/></label>)}</div><p className="note">{catalogById[item.type].note}</p></details>
          <details><summary>Footage et partage entre sections</summary><label>Footage personnalisé<input type="number" min="0" max="10000" step=".5" value={item.footageOverride??''} placeholder="Valeur du census" onChange={event=>editItem({footageOverride:event.target.value===''?undefined:Number(event.target.value)})}/></label><p className="note">{catalogById[item.type].footageSource}</p><label className="checkbox"><input type="checkbox" checked={!!item.second} disabled={!knownFootage(item)} onChange={event=>editItem(event.target.checked?{second:options.find(value=>value!==item.section),share:feet(item)/2}:{second:undefined,share:undefined})}/>Partager entre deux sections</label>{item.second&&<><label>Deuxième section<select value={item.second} onChange={event=>editItem({second:event.target.value})}>{options.filter(value=>value!==item.section).map(value=><option key={value}>{value}</option>)}</select></label><label>Pieds pour cette section<input type="number" min="0" max={feet(item)} step=".5" value={item.share} onChange={event=>editItem({share:Number(event.target.value)})}/></label></>}</details><button className="load-more" onClick={()=>setPreview(catalogById[item.type])}>Voir la référence et le modèle 3D</button>
        </>}
      </aside>}
      </section>
      <Allocation project={project}/>
      <details className="furniture-list"><summary>Liste des mobiliers ({project.items.length})</summary><p className="note">Sélectionnez un mobilier pour ajuster sa position au clavier dans le panneau de détails.</p>{project.items.map((entry,index)=><button aria-pressed={entry.id===selected} key={entry.id} onClick={()=>{setSelected(entry.id);setPanel('selection');setPanelOpen(true);}}><b>{index+1}. {catalogById[entry.type].name}</b><span>{entry.section}</span><span>{knownFootage(entry)?feet(entry)+' pieds':'À compléter'}</span></button>)}</details>
      </main>
    </div>}
    <footer className="app-status"><p role="status" aria-live="polite"><Icon name="info" size={16}/>{message}</p><span>Atelier Footage</span></footer>
    {modal&&<Modal title={modal==='new'?'Nouvelle session':modal==='edit'?'Département et dimensions':modal==='delete'?'Supprimer cette session ?':'Enregistrer la session'} onClose={()=>setModal(null)}>
      {(modal==='new'||modal==='edit')?<DepartmentForm project={modal==='edit'?project:null} onSubmit={values=>{if(modal==='new')create(values);else{try{const next={...project,...values};next.items=project.items.map(entry=>placeItem(values.category===project.category?entry:{...entry,section:'Non affecté',second:undefined,share:undefined},next,entry.x,entry.z,snap,step));if(change(next)){setSection('');setModal(null);}}catch(error){setMessage(error.message);}}}}/>:modal==='delete'?<><p>Supprimer « {project.name} » et sa sauvegarde de cet appareil ? Exportez une copie avant de continuer. Cette suppression ne peut pas être annulée.</p><div className="field-pair"><button onClick={()=>setModal(null)}>Conserver la session</button><button className="danger" onClick={deleteProject}>Supprimer définitivement</button></div></>:<form onSubmit={event=>{event.preventDefault();saveProject(new FormData(event.currentTarget).get('name'));}}><label>Nom de la session<input name="name" required maxLength="80" defaultValue={project.name}/></label><p className="note">La session sera enregistrée dans ce navigateur.</p><button type="submit" className="primary">Enregistrer</button></form>}
      <p className="note" role="status">{message}</p>
    </Modal>}
    {preview&&<Modal title={preview.name+' — modèle et référence'} onClose={()=>setPreview(null)}><div className="preview-model"><PlanCanvas project={{id:'preview',name:preview.name,category:project.category,width:Math.max(6,preview.dimensions.l+3),depth:Math.max(6,preview.dimensions.d+3),items:[{id:1,type:preview.id,x:0,z:0,r:0,...preview.dimensions,section:section||'Non affecté'}]}} interactive={true}/></div>{preview.image&&<img className="reference-image" src={preview.image} alt={preview.label}/>}<p>{preview.label}</p><p className="note">{preview.note}</p><p className="note">Source : {preview.source} · {preview.footageSource}</p><button className="primary" onClick={()=>choose(preview)} disabled={!section}>Choisir ce mobilier</button>{!section&&<p className="note">Choisissez une section dans le catalogue avant de placer le mobilier.</p>}</Modal>}
    {helpOpen&&<Modal title="Bien démarrer dans l’atelier" onClose={()=>setHelpOpen(false)}><ol className="help-steps"><li><b>Choisissez votre département.</b><p>Créez une session et indiquez les dimensions du plan.</p></li><li><b>Affectez une section et placez vos mobiliers.</b><p>Le catalogue propose les références du census. Le footage est calculé à partir de votre implantation.</p></li><li><b>Vérifiez le plan et explorez la visite.</b><p>Alternez entre 2D et 3D, puis ouvrez « Visiter ». Les articles de démonstration suivent les sections affectées.</p></li></ol><div className="shortcut-list"><h3>Vos raccourcis</h3><p><span>Enregistrer</span><kbd>Ctrl / ⌘ + S</kbd></p><p><span>Annuler</span><kbd>Ctrl / ⌘ + Z</kbd></p><p><span>Rétablir</span><kbd>Ctrl / ⌘ + Maj + Z</kbd></p><p><span>Annuler un placement</span><kbd>Échap</kbd></p></div><p className="note">Vos sessions restent dans ce navigateur. Exportez une copie pour les sauvegarder ailleurs ou les transférer sur un autre appareil.</p></Modal>}
    {visiting&&project&&<Visit project={project} onExit={exitVisit} onError={visitError}/>}
  </>;
}
