import * as T from 'three';
import {beam,box,group,shapeMesh,v,type Parent} from './paint';
import {windowArch} from './architecture';
import {dressedRoof,routePlaster} from './routeArchitecture';
import {storybookPBR} from './surfaces';

type Cottage={x:number;y:number;z:number;w:number;d:number;h:number;r:number;ry:number};
const walls=['#909294','#8f7c86','#9a8c83'].map(routePlaster);
const roofColors=['#535d76','#754c52','#4c6869'];
const snow=storybookPBR('snow','#dbe1e9');
const oak=storybookPBR('carved-wood','#655258');
const stone=storybookPBR('stone','#867880');

export function ridgeCottage(parent:Parent,c:Cottage,variant:number){
  const {w,d,h,r}=c;
  const root=group(parent,c.x,c.y,c.z);
  root.rotation.y=c.ry;
  const kind=variant%3;
  const wall=walls[kind];
  const peak=kind===0?-w*.17:kind===1?w*.08:0;
  const profile=kind===1
    ? [[-w/2,h-.09],[-w*.32,h+r*.68],[peak,h+r],[w*.33,h+r*.65],[w/2,h-.12]]
    : [[-w/2,h-.13],[peak,h+r],[w/2,h-.19]];
  shapeMesh(root,[[ -w/2,.18],[w/2,.18],...profile.slice().reverse()]
    .map(([x,y])=>new T.Vector2(x,y)),wall,d,0,0,-d/2,.018);
  box(root,stone,0,.24,0,w+.12,.50,d+.16);

  dressedRoof(root,w,d,h,r,peak,roofColors[kind],variant+265,kind===1?'gambrel':'gable',true);

  const front=d/2+.025;
  const secondStory=Math.max(1.55,h*.54);
  for(const side of [-1,1]){
    beam(root,oak,v(side*w*.48,.44,front),v(side*w*.48,h-.14,front),.12);
    windowArch(root,side*w*.26,.98,front,.55,.85,side>0||kind===1);
    if(h>3.0)windowArch(root,side*w*.23,secondStory+.42,front,.48,.65,side<0);
  }
  box(root,oak,0,secondStory+.30,front,w,.10,.13);
  windowArch(root,peak,h+.06,front,.52,Math.min(r*.55,.69),variant%4!==3);
  if(kind===2){
    // Stone crowsteps outline the silhouette from the valley.
    let bottom=h-.09;
    for(const [width,lift] of [[w*.92,.31],[w*.68,.44],[w*.42,.44],[w*.19,.36]]){
      box(root,wall,0,bottom+lift*.5,d/2-.08,width,lift,.24);
      bottom+=lift;
      box(root,snow,0,bottom+.035,d/2-.08,width+.035,.075,.29);
    }
  }
  box(root,oak,0,.80,front,.57,1.08,.14);
  const stackX=peak+(variant%2?-.31:.29);
  box(root,stone,stackX,h+r-.27,-d*.24,.37,1.13,.41);
  box(root,snow,stackX,h+r+.35,-d*.24,.46,.11,.47);
  return root;
}
