export const ROBOT_START={x:0,z:2,dir:0,carrying:false,delivered:false};
export const ROBOT_PACKAGE={x:2,z:2};
export const ROBOT_TARGET={x:4,z:0};
export const ROBOT_OBSTACLE={x:3,z:1};
export const ROBOT_COMMANDS={forward:'Avanti',right:'Destra',left:'Sinistra',pick:'Prendi',drop:'Posa'};
export function simulateRobot(commands){
 let state={...ROBOT_START};const trace=[];let error='';
 if(!Array.isArray(commands)||commands.length>16||commands.some(c=>!Object.hasOwn(ROBOT_COMMANDS,c)))return {trace,success:false,error:'Programma non valido.'};
 for(const [index,command] of commands.entries()){
  const next={...state};
  if(command==='forward'){const directions=[[1,0],[0,1],[-1,0],[0,-1]],d=directions[next.dir];next.x+=d[0];next.z+=d[1];if(next.x<0||next.x>4||next.z<0||next.z>4){error='Il robot uscirebbe dalla griglia. Cambia direzione prima di avanzare.';break}if(next.x===ROBOT_OBSTACLE.x&&next.z===ROBOT_OBSTACLE.z){error='C’è un ostacolo su quella casella. Scegli un altro percorso.';break}}
  if(command==='right')next.dir=(next.dir+1)%4;
  if(command==='left')next.dir=(next.dir+3)%4;
  if(command==='pick'){if(next.carrying){error='Hai già il pacco nella pinza.';break}if(next.delivered||next.x!==ROBOT_PACKAGE.x||next.z!==ROBOT_PACKAGE.z){error='Per prendere il pacco devi raggiungere la casella dorata al centro.';break}next.carrying=true}
  if(command==='drop'){if(!next.carrying){error='Prima di posare devi prendere il pacco.';break}if(next.x!==ROBOT_TARGET.x||next.z!==ROBOT_TARGET.z){error='Porta il pacco sulla destinazione verde prima di posarlo.';break}next.carrying=false;next.delivered=true}
  trace.push({command,index,from:{...state},to:{...next}});state=next;if(next.delivered)break;
 }
 if(!error&&!state.delivered)error=commands.length?'Il programma termina qui. Aggiungi i comandi per prendere il pacco e posarlo sulla destinazione verde.':'Aggiungi almeno un comando.';
 return {trace,success:state.delivered,error,state};
}
