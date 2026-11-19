export type Phase='boot'|'title'|'intro'|'town'|'doorway'|'workshop'|'mechanism'|'manifest'|'restored'|'quest'|'bridgeReveal'|'finaleReveal'|'gift'|'paused'|'error';
const edges:Record<Phase,Phase[]>={
  boot:['title'],title:['intro'],intro:['town'],town:['doorway','quest','gift','paused'],
  doorway:['workshop','town'],workshop:['mechanism','doorway','paused'],mechanism:['workshop','manifest'],manifest:['restored'],restored:['town'],
  quest:['town','gift','bridgeReveal','finaleReveal'],bridgeReveal:['town'],finaleReveal:['town'],gift:['town'],paused:['town','workshop'],error:[]
};
export function makeState(root:HTMLElement,changed:(phase:Phase)=>void){
  let phase:Phase='boot';root.dataset.phase=phase;
  return {get phase(){return phase;},go(next:Phase){
    if(next!=='error'&&!edges[phase].includes(next))throw new Error('Invalid chapter transition '+phase+' → '+next);
    phase=next;root.dataset.phase=phase;changed(phase);
  }};
}
export const storageKey='wishlight-v3-chapter-one';
export type Progress={version:2;clock:boolean;ledger:boolean;chart:boolean;complete:boolean;composition?:boolean;bridge?:boolean;finale?:boolean};
export function readProgress():Progress{
  const blank:Progress={version:2,clock:false,ledger:false,chart:false,complete:false};
  try{
    const data=JSON.parse(localStorage.getItem(storageKey)??'null');
    if(data?.version!==2)return blank;
    return {version:2,clock:data.clock===true,ledger:data.ledger===true,chart:data.chart===true,complete:data.complete===true,composition:data.complete===true&&data.composition===true,bridge:data.complete===true&&data.bridge===true,finale:data.complete===true&&data.bridge===true&&data.finale===true};
  }catch{return blank;}
}
export function saveProgress(data:Progress){
  try{localStorage.setItem(storageKey,JSON.stringify(data));return true;}catch{return false;}
}
export function clearProgress(){try{localStorage.removeItem(storageKey);return true;}catch{return false;}}
