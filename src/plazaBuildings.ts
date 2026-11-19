import * as T from 'three';
import {ball,beam,box,group,mat,mesh,shapeMesh,v,type Parent} from './paint';
import {lantern} from './architecture';
import {woodenSign} from './townSigns';
import {carvedWindow,coursedFooting,dressedRoof,routePlaster,storybookRoofHeight} from './routeArchitecture';
import {storybookPBR} from './surfaces';

type BuildingKind='inn'|'shop'|'home'|'mill';
type Building={x:number;y:number;z:number;ry:number;w:number;d:number;h:number;r:number;wall:string;roof:string;seed:number};
type Opening={x:number;y:number;w:number;h:number;door?:boolean};

const walnut=storybookPBR('carved-wood','#65443f');
const gilt=storybookPBR('aged-paint','#b49267');
const snow=storybookPBR('snow','#e1e5eb');
const stone=storybookPBR('stone','#93847d');

function wallWithOpenings(parent:Parent,width:number,height:number,surface:T.Material,openings:Opening[],glazing:T.MeshStandardMaterial[]){
  const left=-width/2,right=width/2;
  const edges=[left,right,...openings.flatMap(o=>[o.x-o.w*.49,o.x+o.w*.49])].sort((a,b)=>a-b);
  for(let i=1;i<edges.length;i++){
    const a=edges[i-1],b=edges[i],x=(a+b)/2;
    const holes=openings.filter(o=>Math.abs(x-o.x)<o.w*.49).sort((a,b)=>a.y-b.y);
    let base=.39;
    for(const o of holes){
      if(o.y>base)box(parent,surface,x,(base+o.y)/2,-.091,b-a,o.y-base,.18);
      base=o.y+o.h*1.04;
    }
    if(height>base)box(parent,surface,x,(height+base)/2,-.091,b-a,height-base,.18);
  }
  for(const o of openings){
    // The glass sits deeper than the plaster, with timber reveals along the jamb.
    box(parent,walnut,o.x,o.y+o.h*.51,-.143,o.w*1.05,o.h*1.07,.055);
    carvedWindow(parent,o.x,o.y,-.071,o.w,o.h,true,!!o.door,glazing);
    if(o.door){
      box(parent,stone,o.x,.31,.115,o.w*1.38,.15,.32);
      box(parent,stone,o.x,.175,.20,o.w*1.58,.12,.39);
      ball(parent,snow,o.x-o.w*.57,.24,.26,.16,.042,.18);
    }
  }
  for(const x of [left+.025,right-.025])beam(parent,walnut,v(x,.39,.014),v(x,height,.014),.128,.147);
  box(parent,walnut,0,height-.055,.017,width,.15,.14);
}

function fascia(parent:Parent,width:number,y:number,foot:number){
  box(parent,walnut,0,y,.04,width,.18,.19);
  box(parent,gilt,0,y+.095,.125,width,.045,.034);
  for(let i=0;i<5;i++){
    const x=width*(i/4-.5)*.86;
    beam(parent,walnut,v(x,y-.31,.015),v(x,y-.037,foot),.09);
  }
}

function gable(parent:Parent,w:number,d:number,h:number,r:number,peak:number,p:BuildingKind,surface:T.Material,face:number){
  if(p==='shop'){
    // The stepped parapet stands proud of the slate and reads above the street.
    const steps=[{w:w*.93,h:.61},{w:w*.68,h:1.02},{w:w*.42,h:1.43},{w:w*.20,h:1.75}];
    let base=h;
    for(const step of steps){
      const top=h+step.h;
      box(parent,surface,0,(base+top)/2,.06,step.w,top-base,.25);
      base=top;
      box(parent,stone,0,top,.07,step.w+.095,.067,.31);
      for(const x of [-step.w*.40,step.w*.40]){
        ball(parent,snow,x,top+.044,.075,step.w*.095,.031,.145);
      }
    }
    return;
  }
  const profile=p==='inn'?'gambrel':'gable';
  const crown=Array.from({length:19},(_,i)=>{
    const x=w*(.5-i/18),z=face*(d/2-.08);
    const y=storybookRoofHeight(w,h,r,peak,profile,face*x,z);
    return [x,y-.043];
  });
  const outline=[[-w/2,h-.16],[w/2,h-.16],...crown];
  shapeMesh(parent,outline.map(([x,y])=>new T.Vector2(x,y)),surface,.16,0,0,-.16);
  if(p==='home'){
    for(const side of [-1,1]){
      const x=side*w*.38;
      beam(parent,walnut,v(x,h+.04,.027),v(peak+(x-peak)*.45,h+r*.46,.023),.09);
    }
    beam(parent,walnut,v(peak,h+.05,.022),v(peak,h+r-.15,.018),.10);
  }
}

function canopy(parent:Parent,width:number,y:number,tint:string){
  const cover=group(parent,0,y,.27);
  const cloth=storybookPBR('wool',tint);
  // Visible sloping ribs and a shallow snow cap frame the doorway.
  for(let i=0;i<7;i++){
    const x=width*(i/6-.5);
    const panel=box(cover,cloth,x,0,0,width*.16,.065,.59);panel.rotation.x=.20;
    const crust=box(cover,snow,x,.040,-.036,width*.143,.041+.012*Math.sin(i*2),.46);crust.rotation.x=.20;
    if(i%3===0)beam(cover,walnut,v(x,-.30,-.21),v(x,-.04,.24),.072);
  }
}

export function plazaBuilding(parent:Parent,c:Building,kind:BuildingKind, name?:string){
  const {w,d,h,r}=c;
  const root=group(parent,c.x,c.y,c.z);root.rotation.y=c.ry;
  const facade=group(root,0,0,d/2),rear=group(root,0,0,-d/2);rear.rotation.y=Math.PI;
  const finish=routePlaster(c.wall),glazing:T.MeshStandardMaterial[]=[];
  const peak=kind==='home'?-w*.21:kind==='shop'?w*.05:kind==='mill'?w*.14:0;
  const windows:Opening[]=kind==='inn'
    ? [{x:-.73,y:.54,w:.64,h:1.50,door:true},{x:.65,y:.93,w:.83,h:1.02},{x:-.68,y:2.36,w:.62,h:.68},{x:.64,y:2.28,w:.66,h:.75}]
    : kind==='shop'
      ? [{x:.96,y:.52,w:.60,h:1.53,door:true},{x:-.50,y:.87,w:1.48,h:1.14},{x:.02,y:2.23,w:.65,h:.72}]
      : [{x:.73,y:.47,w:.66,h:1.40,door:true},{x:-.68,y:1.01,w:.70,h:.93},{x:-.58,y:2.36,w:.62,h:.58}];
  const fitHeadroom=(openings:Opening[])=>openings.map(o=>{
    const y=Math.min(o.y,h-o.h*1.12-.10);
    return {...o,y};
  });
  wallWithOpenings(facade,w,h,finish,fitHeadroom(windows),glazing);
  wallWithOpenings(rear,w,h,finish,fitHeadroom([{x:.53,y:1.11,w:.65,h:.94},{x:-.53,y:2.27,w:.54,h:.61}]),glazing);
  for(const sign of [-1,1]){
    const side=group(root,sign*w/2,0,0);side.rotation.y=sign*Math.PI/2;
    wallWithOpenings(side,d,h,finish,fitHeadroom([{x:-d*.25,y:.98,w:.47,h:.90},{x:d*.23,y:1.10,w:.49,h:.86},
      {x:0,y:2.30,w:.59,h:.69}]),glazing);
    fascia(side,d,h*.65,.15);
  }
  gable(facade,w,d,h,r,peak,kind,finish,1);
  gable(rear,w,d,h,r,peak,kind,finish,-1);
  coursedFooting(root,w,d,c.seed);
  const roofProfile=kind==='inn'?'gambrel':'gable';
  dressedRoof(root,w,d,h,r,peak,c.roof,c.seed,roofProfile);
  if(kind==='inn'){
    const dormerX=w*.38,dormerZ=d*.14;
    const dormerY=storybookRoofHeight(w,h,r,peak,'gambrel',dormerX,dormerZ);
    const dormer=group(root,dormerX,dormerY-.17,dormerZ);dormer.rotation.y=Math.PI/2;
    const cheek=[[-.47,0],[.47,0],[.47,.63],[0,1.04],[-.47,.63]];
    shapeMesh(dormer,cheek.map(([x,y])=>new T.Vector2(x,y)),finish,.73,0,0,-.61,.016);
    carvedWindow(dormer,0,.065,.139,.65,.57,true,false,glazing);
    for(const side of [-1,1]){
      const pitch=-side*.72;
      box(dormer,walnut,side*.254,.851,-.23,.72,.12,.96).rotation.z=pitch;
      box(dormer,snow,side*.25,.923,-.23,.70,.085,.93).rotation.z=pitch;
    }
    const oriel=group(facade,.62,0,.23);
    box(oriel,walnut,0,1.46,-.039,1.22,1.19,.22);
    for(const x of [-.34,.34])carvedWindow(oriel,x,.94,.095,.45,.97,true,false,glazing);
    for(const sign of [-1,1]){
      const flank=group(oriel,sign*.55,0,.02);flank.rotation.y=sign*.85;
      carvedWindow(flank,0,1.02,.02,.33,.81,true,false,glazing);
    }
    fascia(oriel,1.28,.86,.18);
    canopy(oriel,1.36,2.08,'#703b46');
    carvedWindow(facade,0,h+.18,.03,.78,.78,true,false,glazing);
    // A timber balcony wraps the paired upper windows. Projecting corbels carry
    // the sill, and the slotted railing keeps warm glazing visible from the square.
    const gallery=group(facade,0,2.21,.26);
    box(gallery,walnut,0,0,0,w*.88,.12,.56);
    box(gallery,snow,0,.073,.14,w*.86,.045,.24);
    for(const x of [-.85,0,.85])beam(gallery,walnut,v(x,-.37,-.20),v(x,-.06,.19),.1);
    for(let i=0;i<13;i++){
      const x=w*.40*(i/6-1);
      const slat=box(gallery,i%3?walnut:gilt,x,.26,.25,.05,.44,.052);
      slat.rotation.z=i%2?.12:-.12;
    }
    box(gallery,walnut,0,.48,.25,w*.86,.065,.092);
    box(gallery,snow,0,.529,.25,w*.84,.034,.091);
    woodenSign(facade,name==='渡灯客舍'?'guesthouse':'inn',-.67,2.14,.24,1.35,.38);
    lantern(facade,-1.16,1.21,.19,.48,false);
  }else if(kind==='shop'){
    fascia(facade,w*.90,2.08,.18);
    canopy(facade,w*.87,2.18,name?'#8b534c':'#526d6a');
    woodenSign(facade,name==='河岸茶铺'?'teahouse':'bookshop',-.55,2.42,.24,1.46,.43);
    carvedWindow(facade,0,h+.22,.210,.66,.79,true,false,glazing);
    lantern(facade,1.47,1.38,.24,.45,false);
    const ledge=group(facade,-.48,.90,.185);
    for(let i=0;i<7;i++){
      const o=box(ledge,i%2?gilt:walnut,(i-3)*.16,.105,0,.088,.18+i%3*.035,.13);
      o.rotation.z=(i%3-1)*.15;
    }
  }else if(kind==='mill'){
    const hoist=group(facade,0,h-.38,.13);
    box(hoist,walnut,0,0,.17,1.72,.19,.82);
    box(hoist,gilt,0,.067,.57,1.73,.09,.08);
    for(const x of [-.71,.71]){
      beam(hoist,walnut,v(x,-.62,.02),v(x,-.11,.54),.105);
      box(hoist,snow,x,.13,.26,.29,.05,.63);
    }
    const window=group(facade,peak,h+.59,.09);
    mesh(window,new T.RingGeometry(.235,.302,14),walnut);
    mesh(window,new T.CircleGeometry(.231,16),storybookPBR('frosted-glass','#d89961'),0,0,-.012);
    box(window,gilt,0,0,.013,.043,.47,.04);box(window,gilt,0,0,.013,.47,.043,.04);
    woodenSign(facade,'mill',.55,2.18,.25,1.34,.36);
    lantern(facade,-.58,2.18,.20,.56,false);
  }else{
    const awning=group(facade,.73,0,0);
    for(const side of [-1,1]){
      const x=side*.33;
      const pitch=side*-.39;
      const roof=box(awning,walnut,x,2.13,.20,.75,.095,.59);roof.rotation.z=pitch;
      const cap=box(awning,snow,x,2.19,.20,.72,.056,.55);cap.rotation.z=pitch;
      beam(awning,walnut,v(side*.54,1.69,.01),v(side*.54,1.99,.39),.084);
    }
    lantern(facade,1.20,1.20,.16,.49,false);
    carvedWindow(facade,peak,h+.23,.071,.48,.65,false,false,glazing);
    for(const sign of [-1,1]){
      const panel=box(facade,walnut,-.68+sign*.52,1.47,.066,.22,.89,.084);panel.rotation.y=-sign*.34;
      for(const y of [1.22,1.64])box(facade,gilt,-.68+sign*.52,y,.118,.19,.044,.028);
    }
  }
  const stackX=kind==='home'?w*.28:-w*.21,stackZ=-d*.24;
  const stackBase=storybookRoofHeight(w,h,r,peak,roofProfile,stackX,stackZ)-.19;
  const chimney=group(root,stackX,stackBase,stackZ);
  box(chimney,stone,0,.24,0,.48,1.37,.48);
  for(let i=0;i<5;i++)box(chimney,mat(i%2?'#887378':'#a28b82','stone'),(i%2-.5)*.19,-.22+i*.226,.249,.32,.12,.051);
  box(chimney,walnut,0,.91,0,.62,.13,.60);
  ball(chimney,snow,-.052,.997,0,.322,.071,.298);
  return {root,glazing,clockwork:undefined,smoke:chimney.localToWorld(v(0,1.09,0))};
}
