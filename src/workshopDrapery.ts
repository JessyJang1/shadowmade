import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {group,mesh,v,type Parent} from './paint';

type Fabric=(u:number,t:number)=>T.Vector3;

function clothSurface(parent:Parent,point:Fabric,columns:number,rows:number,material:T.Material){
  const positions:number[]=[],uv:number[]=[],indices:number[]=[];
  for(let row=0;row<=rows;row++)for(let column=0;column<=columns;column++){
    const u=column/columns,t=row/rows;
    positions.push(...point(u,t));
    uv.push(u,t);
    if(row&&column){
      const i=row*(columns+1)+column;
      indices.push(i,i-1,i-columns-1,i-1,i-columns-2,i-columns-1);
    }
  }
  const shape=new T.BufferGeometry()
    .setAttribute('position',new T.Float32BufferAttribute(positions,3))
    .setAttribute('uv',new T.Float32BufferAttribute(uv,2))
    .setIndex(indices);
  shape.computeVertexNormals();
  mesh(parent,shape,material);
}

export function dressProjectionCloth(parent:Parent,cloth:T.MeshStandardMaterial,brass:T.Material){
  const velvet=cloth.clone();
  velvet.color.set('#863e51');
  velvet.side=T.DoubleSide;
  velvet.normalScale.setScalar(.24);
  const piping:T.BufferGeometry[]=[],thread:T.BufferGeometry[]=[];
  const flax=cloth.clone();
  flax.color.set('#c79e6d');
  const merge=(target:Parent,parts:T.BufferGeometry[],material:T.Material)=>{
    const merged=mergeGeometries(parts)!;
    parts.forEach(part=>part.dispose());
    mesh(target,merged,material);
    parts.length=0;
  };
  const cord=(points:T.Vector3[],radius:number,output=piping)=>{
    output.push(new T.TubeGeometry(new T.CatmullRomCurve3(points),points.length*2,radius,5,false));
  };
  const edge=(point:Fabric,t:number,samples:number)=>
    Array.from({length:samples+1},(_,i)=>point(i/samples,t).add(v(0,0,.012)));
  const valance:Fabric=(u,t)=>{
    const side=Math.abs(u-.5)*2;
    const hem=.235+.385*side**1.24+.10*Math.sin(6*Math.PI*u)**2;
    const fold=(.056*Math.cos(u*22*Math.PI+t*1.8)+.024*Math.sin(u*47+t*4))*(.55+.45*t);
    return v(-2.91+6.12*u,5.48-t*hem,.24+fold+.15*Math.sin(Math.PI*t*.84));
  };
  const valanceFallback=group(parent);
  clothSurface(valanceFallback,valance,72,14,velvet);
  cord(edge(valance,1,48),.022);
  cord(edge(valance,.83,48),.012);
  for(let i=0;i<42;i++){
    const u=(i+.5)/42;
    const stitch=[valance(u-.005,.91),valance(u,.94),valance(u+.006,.91)];
    cord(stitch.map(p=>p.add(v(0,0,.025))),.010,thread);
  }
  merge(valanceFallback,piping,brass);
  merge(valanceFallback,thread,flax);
  const panel=velvet.clone();
  const paintedPanel=new T.TextureLoader().load(import.meta.env.BASE_URL+"materials/wool/winter-stage.png");
  paintedPanel.colorSpace=T.SRGBColorSpace;
  paintedPanel.flipY=false;
  paintedPanel.anisotropy=4;
  panel.map=paintedPanel;
  panel.color.set("#ffffff");
  for(const side of [-1,1]){
    const width=side<0?.99:.85;
    const x=side<0?-2.95:3.10;
    const curtain:Fabric=(u,t)=>{
      const pinch=1-.51*Math.exp(-(((t-.58)*6)**2));
      const deep=.106*Math.sin(u*5.8*Math.PI+t*2.2)+.027*Math.sin(u*12*Math.PI-t*2);
      return v(x-side*u*width*pinch-side*t*.063,
        5.32-t*4.66+.086*Math.sin(u*6.5)+.040*Math.sin(u*9+t*3),
        .25+deep*(.48+.52*pinch)+.14*Math.sin(t*3.13));
    };
    clothSurface(parent,curtain,28,38,panel);
    cord(Array.from({length:35},(_,i)=>curtain(.98,i/34).add(v(0,0,.017))),.022);
    cord(edge(curtain,.984,20),.022);
    const knot=curtain(.78,.58).add(v(0,0,.08));
    for(const t of [.565,.606]){
      cord(Array.from({length:16},(_,i)=>curtain(i/15,t).add(v(0,0,.04))),.024);
    }
    for(const offset of [-.043,.063]){
      const end=knot.clone().add(v(offset,-.36, .025));
      cord([knot,knot.clone().lerp(end,.56).add(v(.025,0,.035)),end],.018);
      for(let strand=0;strand<6;strand++){
        const a=strand*Math.PI/3;
        const tip=end.clone().add(v(.044*Math.sin(a),-.135,.026*Math.cos(a)));
        cord([end,end.clone().lerp(tip,.42),tip],.011,thread);
      }
    }
  }
  // Whip stitching sits outside the flat receiver and its calibration outline.
  for(const side of [-1,1]){
    const y=2.83+side*2.28;
    for(let i=0;i<30;i++){
      const x=-2.42+i*.176;
      cord([v(x,y-side*.017,.024),v(x+.036,y,.034),v(x+.072,y+side*.015,.024)],.009,thread);
    }
  }
  merge(parent,piping,brass);
  merge(parent,thread,flax);
  return valanceFallback;
}
