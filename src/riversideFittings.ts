import * as T from 'three';
import {beam,cylinder,glow,group,mesh,v,type Parent} from './paint';
import {storybookPBR} from './surfaces';

const iron=storybookPBR('aged-paint','#465056');
const brass=storybookPBR('aged-paint','#aa7950');
const oak=storybookPBR('carved-wood','#85645a');
const endGrain=storybookPBR('carved-wood','#594b44');
const frost=storybookPBR('snow','#d8dfea');
const plinth=storybookPBR('bridge-stone','#928483');
// A pressed-glass pane in each of the six faces. The same image modulates
// the dormant sky reflection and the transmitted light after restoration.
function pressedGlass(){
  const pane=document.createElement('canvas');pane.width=96;pane.height=128;
  const ink=pane.getContext('2d')!;
  const bevel=ink.createLinearGradient(0,0,90,30);
  for(const [position,color] of [[0,'#808998'],[.10,'#c5cece'],[.26,'#9eacb5'],[.66,'#ece2ca'],[.90,'#bac5ce'],[1,'#788794']] as const){
    bevel.addColorStop(position,color);
  }
  ink.fillStyle=bevel;ink.fillRect(0,0,96,128);
  const trace=(points:number[][],color:string,width:number)=>{
    ink.strokeStyle=color;ink.lineWidth=width;ink.beginPath();
    points.forEach(([x,y],i)=>{if(i)ink.lineTo(x,y);else ink.moveTo(x,y);});ink.stroke();
  };
  trace([[3,13],[48,58],[93,13]],'#707987',2);
  trace([[3,17],[48,62],[93,17]],'#efe7d2',2);
  trace([[48,44],[58,62],[48,81],[38,62],[48,44]],'#fff5dc',3);
  trace([[12,105],[12,81],[21,71]],'#e5e7e3',2);
  const texture=new T.CanvasTexture(pane);texture.colorSpace=T.SRGBColorSpace;
  texture.wrapS=T.RepeatWrapping;texture.repeat.x=6;
  return texture;
}
const lit=glow('#f6bb73',1.12);
lit.map=lit.emissiveMap=pressedGlass();lit.roughness=.38;
const lathe=(profile:number[][],sides=10)=>
  new T.LatheGeometry(profile.map(([radius,y])=>new T.Vector2(radius,y)),sides);

const footing=lathe([[0,0],[.23,0],[.24,.056],[.20,.087],[.182,.18],[.144,.218],[0,.218]],8);
const pole=lathe([
  [0,.17],[.108,.17],[.108,.30],[.087,.35],[.075,.63],[.052,1.38],
  [.066,1.43],[.052,1.49],[.061,1.71],[.11,1.79],[0,1.79],
]);
const lampBody=lathe([[0,1.75],[.13,1.75],[.193,1.81],[.197,1.86],[.158,1.892],[0,1.892]],6);
const glassBottom=1.88,glassTop=2.19;
export const riversideGlassHeight=(glassBottom+glassTop)*.5;
const windows=lathe([[.131,glassBottom],[.192,glassTop]],6);
const crown=lathe([
  [0,2.18],[.22,2.18],[.244,2.21],[.235,2.24],[.168,2.27],[.118,2.33],[.067,2.40],
  [.074,2.427],[0,2.427],
],6);
const cap=lathe([[0,2.40],[.061,2.40],[.086,2.418],[.076,2.448],[.038,2.48],[0,2.483]],8);
const angles=Array.from({length:6},(_,i)=>i*Math.PI/3);

export function riversideLantern(parent:Parent,x:number,y:number,z:number,scale=1,dynamic=false){
  const root=group(parent,x,y,z);
  root.scale.setScalar(scale);
  const glass=dynamic?lit.clone():lit;
  mesh(root,footing,plinth);
  mesh(root,pole,iron);
  mesh(root,lampBody,iron);
  mesh(root,windows,glass);
  mesh(root,crown,iron);
  mesh(root,cap,frost);
  for(const [height,radius] of [[.32,.116],[1.39,.064],[1.735,.087],[2.416,.063]]){
    cylinder(root,brass,0,height,0,radius,radius,.034,8);
  }
  for(const angle of angles){
    const x=Math.sin(angle),z=Math.cos(angle);
    const bottom=v(.136*x,1.86,.136*z), top=v(.193*x,2.204,.193*z);
    beam(root,brass,bottom,top,.024);
  }
  return glass;
}

const pierPost=lathe([[0,0],[.094,0],[.098,.05],[.073,.15],[.067,.65],[.086,.73],[.057,.79],[0,.81]],8);
const postDrift=new T.SphereGeometry(1,8,5);
const approachPost=lathe([[0,0],[.075,0],[.076,.055],[.061,.14],[.056,.54],[.074,.61],[.048,.655],[0,.672]],8);

export function riversidePost(parent:Parent,x:number,y:number,z:number,index:number,bridge=false){
  const root=group(parent,x,y,z);
  root.rotation.y=index*.46;
  mesh(root,bridge?pierPost:approachPost,oak);
  const shoulder=bridge?.620:.523;
  cylinder(root,endGrain,0,.117,0,bridge?.085:.066,bridge?.086:.067,.078,8);
  cylinder(root,brass,0,shoulder,0,bridge?.080:.066,bridge?.081:.067,.036,8);
  const drift=mesh(root,postDrift,frost,.021,bridge?.785:.652,-.017);
  drift.scale.set(bridge?.081:.075,.041,.063);
}

export function riversideRail(parent:Parent,start:T.Vector3,end:T.Vector3,index:number,bridge=false){
  const w=bridge?.118:.088,depth=bridge?.155:.090;
  beam(parent,oak,start,end,w,depth);
  // A dark weathered underside and small intermittent ridges of packed snow.
  const a=start.clone(),b=end.clone();
  a.y-=w*.34;b.y-=w*.34;
  beam(parent,endGrain,a,b,w*.24,depth*.91);
  if(index%3!==1){
    a.lerp(end,.22);b.lerp(start,.18);
    a.y+=w*.76;b.y+=w*.76;
    beam(parent,frost,a,b,w*.29,depth*.53);
  }
}
