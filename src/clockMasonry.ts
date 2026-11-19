import * as T from 'three';
import {ball,box,group,mesh,rand,type Parent} from './paint';
import {carvedWindow} from './routeArchitecture';
import {storybookPBR} from './surfaces';

// The same cut nests both Aholo belfry LODs into the new coping.
export function retainClockBelfry(geometry:T.BufferGeometry){
  const height=(5.66-4.44)/.74;
  const positions=geometry.getAttribute('position');
  const index=geometry.index!;
  const kept:number[]=[];
  for(let i=0;i<index.count;i+=3){
    const a=index.getX(i),b=index.getX(i+1),c=index.getX(i+2);
    if(Math.max(positions.getY(a),positions.getY(b),positions.getY(c))>=height)kept.push(a,b,c);
  }
  geometry.setIndex(kept);
}

type Recess={x:number;bottom:number;width:number;head:number};
const stones=['#9b9da5','#b0aba8','#b8b4ad','#aaaeb6','#c0b9ac'].map(color=>{
  const stone=storybookPBR('bridge-stone',color,1.55);
  stone.normalScale.setScalar(.14);
  stone.roughness=.93;
  return stone;
});
const mortar=storybookPBR('plaster','#9b8e84',3);
const slate=storybookPBR('roof-slate','#526277',1.3);
const limestone=stones[4];
const coping=storybookPBR('bridge-stone','#a29891');
const snow=storybookPBR('snow','#dee7f3');
snow.normalScale.setScalar(.12);
const oak=storybookPBR('carved-wood','#684638',1.16);
const iron=storybookPBR('aged-paint','#403b42',1.3);

function fieldstone(parent:Parent,left:number,right:number,bottom:number,top:number,
  lower:(x:number)=>number,upper:(x:number)=>number,rng:()=>number){
  const width=right-left,height=top-bottom;
  const bevel=Math.min(width,height)*(.035+rng()*.033);
  const gap=bevel+.007;
  const x0=left+gap,x1=right-gap;
  const shift=(rng()-.5)*Math.min(.10,width*.27);
  const xLow=x0+Math.max(shift,0),xHigh=x1+Math.min(shift,0);
  const corner=()=>.046+rng()*.089;
  const outline=[
    [xLow+width*corner(),bottom+gap], [xHigh-width*corner(),bottom+gap],
    [xHigh,bottom+height*corner()+gap], [x1,top-height*corner()-gap],
    [x1-width*corner(),top-gap], [x0+width*corner(),top-gap],
    [x0,top-height*corner()-gap], [xLow,bottom+height*corner()+gap],
  ].map(([x,y])=>new T.Vector2(x,T.MathUtils.lerp(lower(x),upper(x),(y-bottom)/height)));
  const geometry=new T.ExtrudeGeometry(new T.Shape(outline),{
    depth:.061+rng()*.031,bevelEnabled:true,bevelSize:bevel,bevelThickness:bevel,bevelSegments:1,
  });
  const texture=geometry.getAttribute('uv');
  const offset=rng();
  for(let i=0;i<texture.count;i++)texture.setXY(i,texture.getX(i)+offset,texture.getY(i)+offset);
  mesh(parent,geometry,stones[Math.floor(rng()*stones.length)],0,0,-.033+(rng()-.5)*.018);
}

// Roughly level lifts support the wall. Tall bond stones bridge the short
// courses, while paired shim stones interrupt the joints around the reveals.
function courses(parent:Parent,width:number,bottom:number,top:number,seed:number,recesses:Recess[]=[]){
  const rng=rand(seed);
  const lifts=Math.round((top-bottom)/.48);
  const seams=Array.from({length:lifts+1},(_,index)=>{
    const y=T.MathUtils.lerp(bottom,top,index/lifts)+(index>0&&index<lifts?(rng()-.5)*.16:0);
    const phase=rng()*6.28;
    return {y,edge:(x:number)=>y+(index===0||index===lifts?0:.032*Math.sin(x*4.8+phase)+.021*Math.cos(x*9+phase))};
  });
  function spansFor(low:number,high:number){
    let spans:[number,number][]=[[-width/2,width/2]];
    for(const recess of recesses){
      if(high<=recess.bottom||low>=recess.head)continue;
      const radius=recess.width/2;
      const archY=Math.max(0,low-(recess.head-radius));
      const half=Math.sqrt(Math.max(0,radius*radius-archY*archY));
      spans=spans.flatMap(([left,right])=>{
        const a=Math.max(left,recess.x-half),b=Math.min(right,recess.x+half);
        return a<b?[[left,a],[b,right]]:[[left,right]];
      });
    }
    return spans;
  }
  function lay(low:typeof seams[number],high:typeof seams[number],bond:boolean){
    for(const [left,right] of spansFor(low.y-.027,high.y+.027)){
      for(let x=left;x<right-.084;){
        const preferred=.26+rng()*.51;
        const end=right-x<preferred+.17?right:x+preferred;
        if(bond&&end-x>.24&&rng()<.76){
          const split=.30+rng()*.31;
          const mid=T.MathUtils.lerp(low.y,high.y,split);
          const tilt=(rng()-.5)*.17;
          const ledge=(u:number)=>T.MathUtils.lerp(low.edge(u),high.edge(u),split)+(u-(x+end)/2)*tilt;
          const cut=x+(end-x)*(.35+rng()*.26);
          if(end-x>.56&&rng()<.72){
            fieldstone(parent,x,cut,low.y,mid,low.edge,ledge,rng);
            fieldstone(parent,cut,end,low.y,mid,low.edge,ledge,rng);
          }else fieldstone(parent,x,end,low.y,mid,low.edge,ledge,rng);
          fieldstone(parent,x,end,mid,high.y,ledge,high.edge,rng);
        }else fieldstone(parent,x,end,low.y,high.y,low.edge,high.edge,rng);
        x=end;
      }
    }
  }
  for(let i=0;i<lifts;i++){
    const low=seams[i],high=seams[i+1];
    if(recesses.some(recess=>high.y>recess.head-.32&&low.y<recess.head+.08)){
      const mid={y:(low.y+high.y)/2,edge:(x:number)=>(low.edge(x)+high.edge(x))/2};
      lay(low,mid,false);lay(mid,high,false);
    }else lay(low,high,true);
  }
}

function band(parent:Parent,y:number,width:number,depth:number){
  box(parent,limestone,0,y,-.08,width,.17,depth);
  box(parent,slate,0,y+.095,-.08,width+.12,.073,depth+.13);
  box(parent,stones[1],0,y-.103,-.08,width-.17,.066,depth-.14);
}

function belfryCoping(tower:Parent){
  const ledges:[number,number,number][]=[
    [5.39,1.22,1.66],[5.44,1.27,1.70],[5.49,1.28,1.72],
    [5.55,1.39,1.86],[5.59,1.42,1.89],[5.64,1.51,1.99],
    [5.70,1.54,2.02],[5.75,1.51,2.00],[5.77,1.24,1.76],
  ];
  const corners=[[-1,-1],[-1,1],[1,1],[1,-1],[-1,-1]];
  const rng=rand(619);
  for(let face=0;face<4;face++){
    const [x0,z0]=corners[face],[x1,z1]=corners[face+1];
    const edge=(u:number,y:number,w:number,d:number)=>{
      return new T.Vector3(T.MathUtils.lerp(x0*w,x1*w,u),y+Math.sin(u*Math.PI)*(.016*Math.sin(u*14+face)-.018),
        T.MathUtils.lerp(z0*d,z1*d,u)-.015);
    };
    loft(tower,coping,24,ledges.length-1,(u,v)=>edge(1-u,...ledges[Math.round(v*(ledges.length-1))]));
    const span=face%2===0?3.6:2.5;
    const corbels=face%2===0?8:6;
    for(let i=0;i<corbels;i++){
      const u=(i+.5)/corbels;
      const corbel=group(tower);
      corbel.position.copy(edge(u,5.43,1.196,1.65));
      corbel.rotation.y=[-Math.PI/2,0,Math.PI/2,Math.PI][face];
      const length=.17+rng()*.06;
      const shape=new T.Shape();
      shape.moveTo(-.06,-length);shape.lineTo(.01,-length);
      shape.quadraticCurveTo(.06,-length*.68,.09,-length*.30);
      shape.lineTo(.17,.003);shape.lineTo(.19,.105);shape.lineTo(-.06,.105);shape.closePath();
      const depth=span/corbels*(.29+rng()*.22);
      const stone=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSize:.019,bevelThickness:.018,bevelSegments:1,curveSegments:4});
      stone.rotateY(-Math.PI/2).translate(depth/2,0,0);
      mesh(corbel,stone,stones[i%3]);
    }
  }
}

// Sample the retained roof in its local tower coordinates when the GLB loads.
// The drifts keep the original tile pitch and roll down over the eave edge.
function eaveSnow(parent:Parent,roof:T.Group){
  roof.updateMatrixWorld(true);
  const ray=new T.Raycaster(new T.Vector3(),new T.Vector3(0,-1,0),0,1.5);
  for(const side of [-1,1]){
    const patches=side===1?[[-1.72,-.54],[-.44,.51],[.65,1.73]]:[[-1.75,-.91],[-.81,.58],[.71,1.70]];
    for(const [start,end] of patches)loft(parent,snow,16,5,(u,v)=>{
      const fraction=side===1?1-u:u;
      const z=T.MathUtils.lerp(start,end,fraction);
      const taper=Math.pow(Math.sin(Math.PI*fraction),.57);
      const rim=.83+.13*Math.sin(z*9+side)+.09*Math.sin(z*24);
      const outer=1.418+(rim*.065)*taper;
      const inner=1.417-(.19+.035*Math.cos(z*15))*taper;
      const x=T.MathUtils.lerp(inner,outer,v)*side;
      const sampleX=side*Math.min(Math.abs(x),1.424);
      ray.ray.origin.set(sampleX,7.02,z);
      const hit=ray.intersectObject(roof)[0]?.point.y??5.86+(1.44-Math.abs(sampleX))*.95;
      const crest=Math.sin(v*Math.PI)*taper*(.080+.035*Math.sin(z*13+side));
      const roll=Math.pow(v,5)*taper*.072;
      return new T.Vector3(x,hit+.010+crest-roll,z);
    });
  }
}

function loft(parent:Parent,material:T.Material,columns:number,rows:number,point:(u:number,v:number)=>T.Vector3){
  const geometry=new T.PlaneGeometry(1,1,columns,rows);
  const positions=geometry.getAttribute('position');
  const uv=geometry.getAttribute('uv');
  for(let i=0;i<positions.count;i++){
    const p=point(uv.getX(i),1-uv.getY(i));
    positions.setXYZ(i,p.x,p.y,p.z);
  }
  geometry.computeVertexNormals();
  mesh(parent,geometry,material);
}

function archStones(front:Parent,y:number,r:number){
  for(let i=0;i<9;i++){
    const from=i*Math.PI/9+.024,to=(i+1)*Math.PI/9-.024;
    const a=new T.Shape();
    a.absarc(0,0,r+.175,from,to,false);
    a.lineTo(Math.cos(to)*r,Math.sin(to)*r);
    a.absarc(0,0,r,to,from,true);a.closePath();
    const block=new T.ExtrudeGeometry(a,{depth:.133,bevelEnabled:true,bevelSize:.016,bevelThickness:.016,bevelSegments:1,curveSegments:3});
    mesh(front,block,i===4?limestone:stones[i%3],0,y,.021);
  }
}

function oakDoor(front:Parent,opening:Recess){
  const radius=opening.width*.505;
  const spring=opening.head-radius;
  const door=new T.Shape();
  door.moveTo(-radius,opening.bottom);door.lineTo(radius,opening.bottom);
  door.lineTo(radius,spring);door.absarc(0,spring,radius,0,Math.PI,false);door.closePath();
  const wood=new T.ExtrudeGeometry(door,{depth:.045,bevelEnabled:true,bevelSize:.009,bevelThickness:.008,bevelSegments:1,curveSegments:13});
  mesh(front,wood,oak,0,0,-.054);
  for(let i=-3;i<=3;i++){
    const x=i*.13;
    const top=spring+Math.sqrt(radius*radius-x*x)-.037;
    box(front,iron,x,(top+opening.bottom)/2,-.004,i===0?.022:.009,top-opening.bottom,.014);
  }
  for(const side of [-1,1]){
    for(const y of [.64,1.30]){
      box(front,iron,side*.28,y,.012,.36,.046,.023).rotation.z=side*.071;
      for(const offset of [-.12,.11])ball(front,limestone,side*.28+offset,y,.028,.014,.014,.009);
    }
  }
  ball(front,iron,.081,1.01,.015,.057,.071,.016);
  ball(front,limestone,.081,1.015,.042,.029,.026,.016);
}

export function buildClockMasonry(parent:Parent,roof:T.Group){
  const tower=group(parent);
  // The dark wall sits behind the face tiles. The reveals remain in front of
  // that backing, so the door and glass can be seen through the cut courses.
  box(tower,mortar,0,2.77,-.09,2.275,5.54,3.17);
  const front=group(tower,0,0,1.52);
  const doorway={x:0,bottom:.25,width:1.05,head:2.06};
  courses(front,2.55,.24,2.40,5,[doorway]);
  courses(front,2.39,2.55,5.44,72);
  oakDoor(front,doorway);
  archStones(front,doorway.head-doorway.width/2,doorway.width/2);
  for(const side of [-1,1]){
    const casing=group(tower,side*1.165,0,-.1);
    casing.rotation.y=side*Math.PI/2;
    const recess:Recess={x:side*.28,bottom:1.05,width:.49,head:1.85};
    const upper:Recess={x:-side*.28,bottom:3.62,width:.43,head:4.42};
    courses(casing,3.33,.24,2.40,71+side,[recess]);
    courses(casing,3.26,2.55,5.44,81+side,[upper]);
    for(const w of [recess,upper])carvedWindow(casing,w.x,w.bottom,-.065,w.width-.035,w.head-w.bottom-.035,w===upper);
  }
  const rear=group(tower,0,0,-1.70);rear.rotation.y=Math.PI;
  courses(rear,2.36,.24,2.40,43);courses(rear,2.33,2.55,5.44,44);
  band(tower,.22,2.67,3.44);
  band(tower,2.48,2.60,3.37);
  belfryCoping(tower);
  eaveSnow(tower,roof);
  for(let i=0;i<3;i++){
    box(tower,stones[i],0,.075+(2-i)*.09,1.70+i*.16,1.26+i*.11,.17,.38);
  }
  return tower;
}
