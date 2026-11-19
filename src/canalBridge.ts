import * as T from 'three';
import {group,mesh,rand,type Parent} from './paint';
import {storybookPBR} from './surfaces';

export const bridgeHalfSpan = 2.825;
export const bridgeDeckHeight = (across:number) =>
  .27 + 1.04 * Math.pow(Math.max(0, 1 - (across / bridgeHalfSpan) ** 2), 1.22);

const archRadius = 1.87;
const springY = -1.36;
const innerRise = 2.19;
const stone = ['#777781','#908385','#a1978b','#9b8271'].map(color => storybookPBR('bridge-stone',color));
const coping = storybookPBR('bridge-stone','#b1a393');
const keystone=storybookPBR('bridge-stone','#bb9b78');
for(const material of [...stone,coping,keystone]){
  material.normalScale.setScalar(.29);
  material.aoMapIntensity=.42;
}
const snow = storybookPBR('snow','#e0e4f4');
snow.normalScale.setScalar(.13);

type Point = [number,number];
function cutStone(parent:Parent, profile:Point[], front:number, depth:number, material:T.Material, bevel:number) {
  const shape = new T.Shape(profile.map(([x,y]) => new T.Vector2(x,y)));
  const geometry = new T.ExtrudeGeometry(shape,{
    depth, bevelEnabled:bevel>0, bevelSize:bevel, bevelThickness:bevel,
    bevelSegments:1, steps:1, curveSegments:3,
  });
  // Three.js extrusions use local distance for side UVs. Scale both the end
  // faces and the reveal so the brush scale remains consistent across blocks.
  const uv = geometry.attributes.uv;
  for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*1.60+.81*front,uv.getY(i)*1.60+.17*profile[0][0]);
  return mesh(parent,geometry,material,0,0,front);
}

function roofLine(a:number,b:number,height:(x:number)=>number,steps=2):Point[]{
  return Array.from({length:steps+1},(_,i)=>{
    const x=T.MathUtils.lerp(a,b,i/steps);
    return [x,height(x)];
  });
}

/** The old crossing has its own stone arch. The north bridge still rises from its puzzle. */
export function buildCanalBridge(parent:Parent, center:number,z:number) {
  const bridge = group(parent,center,0,z);
  const rng = rand(2397);
  const width = 1.14;
  const deck = bridgeDeckHeight;
  const stretch = (x:number) => Math.min(bridgeHalfSpan,Math.max(-bridgeHalfSpan,x));

  // Mortared core closes all joints while leaving a genuine opening under the deck.
  const crown = roofLine(-bridgeHalfSpan,bridgeHalfSpan,x=>deck(x)-.032,20);
  const intrados:Point[] = Array.from({length:41},(_,i)=>{
    const theta=i/40*Math.PI;
    return [archRadius*Math.cos(theta),springY+innerRise*Math.sin(theta)];
  });
  cutStone(bridge,[...crown,[bridgeHalfSpan,springY],...intrados,[-bridgeHalfSpan,springY]],-width,width*2,stone[0],0);

  for(const side of [-1,1]){
    const face = side>0?width:-width-.105;
    // Radiating voussoirs wrap the arch and reveal the masonry from either bank.
    for(let i=0;i<13;i++){
      const a=Math.PI*i/13+.007,b=Math.PI*(i+1)/13-.007;
      const ring = (theta:number, outer:boolean):Point => [
        (archRadius+(outer?.25:0))*Math.cos(theta),
        springY+(innerRise+(outer?.22:.014))*Math.sin(theta),
      ];
      const profile:Point[] = [ring(a,false),ring(a,true),ring((a+b)/2,true),ring(b,true),ring(b,false),ring((a+b)/2,false)];
      if(i===6)profile[2][1]+=.065;
      cutStone(bridge,profile,face-(i===6&&side<0?.04:0),i===6?.15:.105,
        i===6?keystone:stone[(i+1)%stone.length],.016);
    }
    // Fit the courses between the extrados and deck instead of stacking boxes over the arch.
    for(let row=0;row<6;row++){
      const bottom=springY+row*.40, top=bottom+.379;
      for(let i=0;i<13;i++){
        const a=stretch(-2.98+i*.49+(row%2)*.24),b=stretch(a+.46);
        if(b-a<.06)continue;
        const lower=(x:number)=>Math.max(bottom, Math.abs(x)<archRadius+.25
          ? springY+(innerRise+.23)*Math.sqrt(Math.max(0,1-(x/(archRadius+.25))**2))
          : springY);
        const upper=(x:number)=>Math.min(top,deck(x)-.024);
        const xs=Array.from({length:5},(_,k)=>T.MathUtils.lerp(a,b,k/4)).filter(x=>upper(x)-lower(x)>.045);
        if(xs.length<2)continue;
        const profile:Point[] = [...xs.map((x):Point=>[x,upper(x)]),...xs.reverse().map((x):Point=>[x,lower(x)])];
        cutStone(bridge,profile,face,.09,stone[Math.floor(rng()*stone.length)],.012);
      }
    }
    // Low parapets keep the crossing framed without occluding the player.
    for(let i=0;i<12;i++){
      const a=-bridgeHalfSpan+i*(2*bridgeHalfSpan/12)+.015,b=a+.44;
      const low=roofLine(a,b,x=>deck(x)-.08);
      const high=roofLine(a,b,x=>deck(x)+.46+(i===0||i===11?.07:0));
      const rail=side>0?.96:-1.21;
      cutStone(bridge,[...low,...high.reverse()],rail,.25,stone[(i+2)%4],.024);
      const lip=(x:number)=>deck(x)+.49+(i===0||i===11?.07:0);
      const cap=roofLine(a-.018,b+.018,x=>lip(x)+.043);
      const seat=roofLine(a-.018,b+.018,x=>lip(x)-.055);
      cutStone(bridge,[...cap,...seat.reverse()],rail-.025,.30,coping,.028);
    }
    for(const [a,b,peak] of [[-2.76,-1.72,.16],[-1.56,-.59,.098],[-.36,.48,.09],[.70,1.72,.095],[1.84,2.73,.15]]){
      const drift=roofLine(a,b,x=>{
        const u=(x-a)/(b-a);
        return deck(x)+.51+peak*Math.sin(Math.PI*u)*(.91+.16*Math.sin(u*9+side));
      },7);
      const underside=roofLine(a,b,x=>deck(x)+.46);
      cutStone(bridge,[...drift,...underside.reverse()],side>0?.94:-1.20,.25,snow,.042);
    }
  }

  // Three offset courses across the deck. Geometry follows the gameplay height.
  for(let row=0;row<3;row++){
    for(let i=0;i<13;i++){
      const a=stretch(-2.99+i*.47+(row%2)*.22),b=stretch(a+.435);
      if(b-a<.055)continue;
      const slab=roofLine(a,b,x=>deck(x)+(.014*Math.sin(i*7+row*4)));
      const bottom=roofLine(a,b,x=>deck(x)-.11);
      const width=.601+rng()*.010;
      cutStone(bridge,[...slab,...bottom.reverse()],-.94+row*.63+(rng()-.5)*.016,width,stone[(row+i)%4],.021);
    }
  }
  return bridge;
}
