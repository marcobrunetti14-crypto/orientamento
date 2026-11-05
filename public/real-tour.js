import tourLinks from '/tour-config.js';

const origin='37.205545,14.504148';
const towns=['Caltagirone','Castel di Iudica','Grammichele','Licodia Eubea','Mazzarrone','Militello in Val di Catania','Mineo','Mirabella Imbaccari','Palagonia','Raddusa','Ramacca','San Cono','San Michele di Ganzaria','Scordia','Vizzini'];
const schools=[
 {id:'industriale',name:'Industriale · ITI Euclide',icon:'⚙',address:'Via Mario Scelba 1, Caltagirone',description:'Informatica, Elettrotecnica, Meccatronica e Grafica.',place:'ITI Euclide',coordinates:'37.21133775,14.512260526212497'},
 {id:'alberghiero',name:'Alberghiero',icon:'✦',address:'Via Aldo Moro s.n., San Michele di Ganzaria',description:'Enogastronomia, Sala e vendita, Accoglienza. Sede di San Michele di Ganzaria.',place:'Istituto Alberghiero'},
 {id:'geometra',name:'Geometra · CAT',icon:'▱',address:'Via Mario Scelba 3/5, Caltagirone',description:'Costruzioni, Ambiente e Territorio. Sede centrale.',place:'Geometra CAT'},
 {id:'agrario',name:'Agrario',icon:'❀',address:'Via Balatazze 32, Caltagirone',description:'Agraria, Agroalimentare e Agroindustria.',place:'Istituto Agrario'}
];
const hotelBranch={id:'alberghiero_caltagirone',name:'Alberghiero · sede Caltagirone',address:'Via Mario Scelba 3/5, Caltagirone',place:'Alberghiero Caltagirone'};
const safeTour=value=>{try{const url=new URL(value);return url.protocol==='https:'&&/^(?:[a-z0-9-]+\.)?realsee\.ai$/i.test(url.hostname)?url.href:null}catch{return null}};
const originAddress=()=>dialog.querySelector('.earth-origin').value==='SP178'?origin:`${dialog.querySelector('.earth-origin').value}, CT, Italia`;
const directions=school=>`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(originAddress())}&destination=${encodeURIComponent(school.address+', Italia')}&travelmode=driving`;
const panorama=point=>`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${encodeURIComponent(point)}`;
const mapSearch=value=>`https://maps.google.com/maps?q=${encodeURIComponent(value)}&output=embed`;
const mapRoute=school=>`https://maps.google.com/maps?saddr=${encodeURIComponent(originAddress())}&daddr=${encodeURIComponent(school.address+', Italia')}&output=embed`;
const osmStart=`https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent('14.5013,37.2036,14.5071,37.2075')}&layer=mapnik&marker=${encodeURIComponent(origin)}`;
const osmIti=`https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent('14.5093,37.2091,14.5153,37.2135')}&layer=mapnik&marker=${encodeURIComponent(schools[0].coordinates)}`;
let dialog,school=null,active=0;

function choose(id){
 school=id===hotelBranch.id?hotelBranch:schools.find(item=>item.id===id);
 if(!school)return;
 active=0;
 dialog.querySelector('.earth-choose').hidden=true;
 dialog.querySelector('.earth-journey').hidden=false;
 dialog.querySelector('.earth-tour-head h2').textContent=school.name;
 dialog.setAttribute('aria-label',`Viaggio verso ${school.name}`);
 dialog.querySelector('.earth-map').removeAttribute('src');
 dialog.querySelector('.earth-stage-label').textContent='';
 dialog.querySelector('.earth-stage-title').textContent='Seleziona il tuo comune di partenza.';
 dialog.querySelector('.earth-stage-copy').textContent='Scegli “Da dove vieni?” per vedere il percorso verso questa sede.';
 dialog.querySelector('.earth-map-badge').textContent='SCEGLI IL COMUNE PER VISUALIZZARE LA MAPPA';
 dialog.querySelector('.earth-stage-list').hidden=true;
 dialog.querySelector('.earth-stage-actions').hidden=true;
 dialog.querySelector('.earth-real-links').hidden=true;
 dialog.querySelector('.earth-end').hidden=true;
 dialog.querySelector('.earth-progress').hidden=true;
 dialog.querySelector('.earth-map-placeholder').hidden=false;
 if(dialog.querySelector('.earth-origin').value)showStage(1);
}
function showStage(index){
 if(!dialog.querySelector('.earth-origin').value)return;
 active=Math.max(0,Math.min(2,index));
 const arrival=active===2;
 const town=dialog.querySelector('.earth-origin').value==='SP178'?'SP178':dialog.querySelector('.earth-origin').value;
 const labels=[`Partenza · ${town}`,`Da ${town} alla scuola`,`Arrivo · ${school.place}`];
 dialog.querySelector('.earth-stage-label').textContent=labels[active];
 dialog.querySelector('.earth-stage-title').textContent=active===0?`Partiamo da ${town}.`:active===1?`Da ${town} verso ${school.place}.`:'Eccoci alla tua scuola.';
 dialog.querySelector('.earth-stage-copy').textContent=active===0?'La partenza è dal centro del comune selezionato. Usa le indicazioni per scegliere il tuo indirizzo preciso.':active===1?`La destinazione è ${school.address}. Google Maps calcola il percorso stradale aggiornato dalla tua partenza.`:`Sei arrivato alla sede di ${school.place}: ${school.address}.`;
 const map=dialog.querySelector('.earth-map');
 map.src=active===0?(town==='SP178'?osmStart:mapSearch(originAddress())):active===1?mapRoute(school):school.id==='industriale'?osmIti:mapSearch(school.address+', Italia');
 map.title=`Mappa: ${labels[active]}`;
 dialog.querySelector('.earth-map-badge').textContent=active===0&&town==='SP178'||school.id==='industriale'&&arrival?'MAPPA REALE · DATI © OPENSTREETMAP':active===1?'PERCORSO · GOOGLE MAPS':'MAPPA · GOOGLE MAPS';
 dialog.querySelector('.earth-map-placeholder').hidden=true;
 dialog.querySelector('.earth-stage-list').hidden=false;
 dialog.querySelector('.earth-stage-actions').hidden=false;
 dialog.querySelector('.earth-real-links').hidden=false;
 dialog.querySelector('.earth-progress').hidden=false;
 dialog.querySelector('.earth-progress-fill').style.width=`${(active+1)/3*100}%`;
 dialog.querySelectorAll('[data-stage]').forEach((button,i)=>{
  button.querySelector('span').textContent=labels[i];
  button.classList.toggle('active',i===active);
  button.setAttribute('aria-current',i===active?'step':'false');
 });
 dialog.querySelector('.earth-back').disabled=active===0;
 dialog.querySelector('.earth-next').textContent=arrival?'Ricomincia il viaggio ↺':active===0?'Partiamo →':'Arriviamo alla scuola →';
 dialog.querySelector('.earth-directions').href=directions(school);
 const street=dialog.querySelector('.earth-street');street.hidden=active===1||active===0&&town!=='SP178'||arrival&&!school.coordinates;
 if(!street.hidden)street.href=panorama(active===0?origin:school.coordinates);
 dialog.querySelector('.earth-end').hidden=!arrival;
 if(arrival){
  const url=safeTour(tourLinks[school.id]);
  dialog.querySelector('.earth-end strong').textContent=`Siamo arrivati: ${school.name}.`;
  dialog.querySelector('.earth-end p').textContent=url?'Apri il tour Realsee degli ambienti acquisiti. Puoi visitarlo anche dal browser del visore.':'Il tour immersivo di questa sede non è stato ancora acquisito. Puoi vedere la posizione e aprire le indicazioni stradali; aggiungeremo il tour VR di questa scuola quando sarà disponibile.';
  const link=dialog.querySelector('.earth-vr-link');link.hidden=!url;
  if(url)link.href=url;
 }
}
function reset(){
 school=null;
 dialog.querySelector('.earth-choose').hidden=false;
 dialog.querySelector('.earth-journey').hidden=true;
 dialog.querySelector('.earth-tour-head h2').textContent='Quale scuola vuoi visitare?';
 dialog.setAttribute('aria-label','Scegli la scuola da visitare');
}
function create(){
 dialog=document.createElement('dialog');dialog.className='real-tour-dialog earth-tour-dialog';
 dialog.innerHTML=`<div class="earth-tour-shell"><div class="earth-tour-head"><div><span>CUCUZZA–EUCLIDE · ANDIAMO A SCUOLA</span><h2>Quale scuola vuoi visitare?</h2></div><button class="real-tour-close" aria-label="Chiudi">×</button></div><div class="earth-choose"><p>Seleziona la scuola: il viaggio ti porta alla sua sede. Dove è disponibile, da lì puoi entrare nel tour VR.</p><div class="earth-school-grid">${schools.map(item=>`<button class="earth-school-card" data-school="${item.id}"><span class="earth-school-icon" aria-hidden="true">${item.icon}</span><strong>${item.name}</strong><small>${item.description}</small><span class="earth-school-address">${item.address}</span><b>${tourLinks[item.id]?'Tour VR disponibile ↗':'Esplora la sede ↗'}</b></button>`).join('')}</div><div class="earth-branch"><p>L’Alberghiero ha anche una sede a Caltagirone.</p><button data-school="alberghiero_caltagirone">Vai alla sede Alberghiero di Caltagirone ↗</button></div></div><div class="earth-journey" hidden><button class="earth-change">← Cambia scuola</button><label class="earth-origin-label" for="earth-origin">Da dove vieni?</label><select class="earth-origin" id="earth-origin"><option value="">Seleziona il tuo comune</option>${towns.map(town=>`<option value="${town}">${town}</option>`).join('')}<option value="SP178">Punto condiviso · SP178</option></select><p class="earth-origin-hint">Il viaggio parte dal centro del comune. Per partire da casa tua potrai modificare l’indirizzo in Google Maps.</p><div class="earth-progress" aria-hidden="true"><span class="earth-progress-fill"></span></div><div class="earth-tour-body"><div class="earth-map-wrap"><iframe class="earth-map" title="Mappa del viaggio" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe><div class="earth-map-placeholder">Scegli il comune di partenza per vedere la mappa →</div><span class="earth-map-badge"></span></div><div class="earth-tour-panel"><p class="eyebrow earth-stage-label"></p><h3 class="earth-stage-title"></h3><p class="earth-stage-copy"></p><div class="earth-stage-list" aria-label="Tappe del viaggio">${[0,1,2].map(i=>`<button data-stage="${i}"><small>0${i+1}</small><span></span><b>↗</b></button>`).join('')}</div><div class="earth-stage-actions"><button class="earth-back">← Indietro</button><button class="earth-next">Partiamo →</button></div><div class="earth-real-links"><a class="earth-directions" target="_blank" rel="noopener noreferrer">Apri il percorso su Google Maps ↗</a><a class="earth-street" target="_blank" rel="noopener noreferrer">Guarda Street View ↗</a></div><div class="earth-end" hidden><strong></strong><p></p><a class="earth-vr-link" target="_blank" rel="noopener noreferrer">Entra nella scuola in VR ↗</a></div></div></div><p class="earth-disclaimer">Google Maps calcola il percorso stradale dal centro del comune alla sede selezionata. Il viaggio esterno è una guida su mappa; il tour VR è disponibile soltanto per le sedi già acquisite.</p></div></div>`;
 document.body.append(dialog);
 dialog.querySelector('.real-tour-close').onclick=()=>dialog.close();
 dialog.querySelector('.earth-change').onclick=reset;
 dialog.querySelector('.earth-origin').onchange=()=>{
  if(!school)return;
  if(!dialog.querySelector('.earth-origin').value){choose(school.id);return}
  showStage(1);
 };
 dialog.querySelectorAll('[data-school]').forEach(button=>button.onclick=()=>choose(button.dataset.school));
 dialog.querySelectorAll('[data-stage]').forEach(button=>button.onclick=()=>showStage(Number(button.dataset.stage)));
 dialog.querySelector('.earth-back').onclick=()=>showStage(active-1);
 dialog.querySelector('.earth-next').onclick=()=>showStage(active===2?0:active+1);
 reset();
}
function open(){if(!dialog)create();document.querySelectorAll('dialog[open]').forEach(d=>d.close());reset();dialog.showModal()}
document.addEventListener('click',event=>{if(event.target.closest('[data-school-tour]'))open()});
if(new URLSearchParams(location.search).get('tour')==='scuola')open();
