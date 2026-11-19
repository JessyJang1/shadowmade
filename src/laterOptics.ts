import type {Vec} from './optics';
import plank from './data/aholo-span-plank.json' with {type:'json'};

export const gap=2.60;
export const spanLight:Vec=[0,9.9,0];
export const spanHeightLimit=[5.55,9.9] as const;
export const spanPieces=[
  {x:-2.05,y:1.66,z:.41,w:1.98,d:.80},
  {x:1.86,y:2.35,z:-.39,w:1.74,d:.71},
] as const;
export function spanPlankVertices(index:number):number[]{
  const {w,d}=spanPieces[index];
  const scale=[w,.23,d];
  return plank.position.map((value,i)=>Math.fround(value*scale[i%3]));
}
export const spanPlankColors=plank.color;
type FloorRect={left:number;right:number;back:number;front:number};
export const spanLandings:FloorRect[]=[
  {left:-2.69,right:-.26,back:-.97,front:-.37},
  {left:.26,right:2.69,back:.37,front:.97},
];
export const thinIce:FloorRect[]=[
  {left:-2.36,right:-.64,back:-1.68,front:-1.34},
  {left:-2.36,right:-.64,back:-.01,front:.24},
  {left:.64,right:2.36,back:-.24,front:.075},
  {left:.64,right:2.36,back:1.265,front:1.68},
  {left:-3.43,right:-2.99,back:-1.25,front:-.11},
  {left:2.99,right:3.43,back:.11,front:1.25},
];
export const dawnLight:Vec=[.78,3.62,-6.2];
export const dawnFill:Vec=[0,3.62,6.2];
export const dawnWall=0;
export const dawnPieces=[
  {x:-1.28,y:2.06,z:-1.96},
  {x:1.36,y:2.97,z:-3.04},
] as const;
export const dawnProfiles: [number,number][][]=[
  Array.from({length:10},(_,i)=>{
    const a=Math.PI/2+i*Math.PI/5,d=.47*(i%2?.63:1);
    return [Math.cos(a)*d,Math.sin(a)*d];
  }),
  [[-.44,-.40],[.45,-.40],[.45,.11],[.22,.11],[.01,.44],[-.23,.10],[-.44,.10]],
];
export const dawnSensors=[
  {x:-2.24,y:1.51,r:.16,shade:true},
  {x:1.94,y:1.89,r:.17,shade:true},
  {x:-2.25,y:2.38,r:.115,shade:false},
  {x:1.91,y:1.09,r:.11,shade:false},
  {x:3.06,y:1.96,r:.12,shade:false},
] as const;

export function shadowToY(point:Vec,source:Vec):Vec{
  const scale=source[1]/(source[1]-point[1]);
  return [source[0]+(point[0]-source[0])*scale,0,source[2]+(point[2]-source[2])*scale];
}
export function shadowToZ(point:Vec,source:Vec,wall=dawnWall):Vec{
  const scale=(wall-source[2])/(point[2]-source[2]);
  return [source[0]+(point[0]-source[0])*scale,source[1]+(point[1]-source[1])*scale,wall];
}
type FloorPoint=[x:number,z:number];

function silhouette(points:Vec[],light:Vec){
  const vertices=points.map(p=>shadowToY(p,light)).map(([x,,z]):FloorPoint=>[x,z]);
  vertices.sort(([x,z],[a,b])=>x-a||z-b);
  function edge(ordered:FloorPoint[]){
    const hull:FloorPoint[]=[];
    for(const p of ordered){
      while(hull.length>=2){
        const [a,b]=hull.slice(-2);
        if((b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0])>0)break;
        hull.pop();
      }
      hull.push(p);
    }
    hull.pop();return hull;
  }
  return [...edge(vertices),...edge(vertices.reverse())];
}

const corners=({left,right,back,front}:FloorRect):FloorPoint[]=>[
  [left,back],[right,back],[right,front],[left,front],
];
const cross=([a,b]:FloorPoint,[x,z]:FloorPoint,[u,v]:FloorPoint)=>(x-a)*(v-b)-(z-b)*(u-a);


function covers(hull:FloorPoint[],pts:FloorPoint[]){
  return hull.length>=3&&pts.every(p=>hull.every((a,i)=>cross(a,hull[(i+1)%hull.length],p)>=-.002));
}

function intersects(a:FloorPoint[],b:FloorPoint[]){
  // A positive overlap on every separating axis is a true area intersection.
  return [a,b].every(polygon=>polygon.every(([x,z],i)=>{
    const [aX,aZ]=polygon[(i+1)%polygon.length];
    const length=Math.hypot(aX-x,aZ-z);
    const axis=[(z-aZ)/length,(aX-x)/length];
    const first=a.map(([u,v])=>u*axis[0]+v*axis[1]);
    const second=b.map(([u,v])=>u*axis[0]+v*axis[1]);
    return Math.min(Math.max(...first),Math.max(...second))-
      Math.max(Math.min(...first),Math.min(...second))>.025;
  }));
}

export function assessSpan(left:Vec[],right:Vec[],light:Vec){
  const hulls=[silhouette(left,light),silhouette(right,light)];
  const connections=hulls.map((hull,i)=>{
    const pts=corners(spanLandings[i]),bank=i?[pts[1],pts[2]]:[pts[0],pts[3]];
    const pier=i?[pts[0],pts[3]]:[pts[1],pts[2]];
    const extent=Math.max(...hull.map(p=>p[0]))-Math.min(...hull.map(p=>p[0]));
    return {
      bank:covers(hull,bank),pier:covers(hull,pier),
      short:extent<spanLandings[i].right-spanLandings[i].left-.002,
    };
  });
  const ice=thinIce.map(rect=>hulls.some(hull=>hull.length>=3&&intersects(hull,corners(rect))));
  return {hulls,connections,ice,matched:connections.every(({bank,pier})=>bank&&pier)&&!ice.some(Boolean)};
}
type Triangle=[FloorPoint,FloorPoint,FloorPoint];

function wallTriangles(mesh:Vec[],lamp:Vec){
  const triangles:Triangle[]=[];
  for(let i=0;i+2<mesh.length;i+=3){
    const vertices=mesh.slice(i,i+3);
    // Only triangles between this lamp and the cloth can block this ray.
    const distance=dawnWall-lamp[2];
    if(!vertices.every(p=>(p[2]-lamp[2])*distance>0&&Math.abs(p[2]-lamp[2])<Math.abs(distance)))continue;
    const [a,b,c]=vertices.map(vertex=>shadowToZ(vertex,lamp)).map(([x,y]):FloorPoint=>[x,y]);
    if(Math.abs(cross(a,b,c))>1e-6)triangles.push([a,b,c]);
  }
  return triangles;
}
function blocks([x,y]:FloorPoint,mesh:Triangle[]){
  return mesh.some(([a,b,c])=>{
    const p:FloorPoint=[x,y],ab=cross(a,b,p),bc=cross(b,c,p),ca=cross(c,a,p);
    return Math.min(ab,bc,ca)>=-.0001||Math.max(ab,bc,ca)<=.0001;
  });
}

export function assessDawn(casters:Vec[][],seaLamp:Vec,shoreLamp:Vec,shutter:Vec[]){
  const seaMasks=casters.map(mesh=>wallTriangles(mesh,seaLamp));
  const shoreMasks=[...casters.map(mesh=>wallTriangles(mesh,shoreLamp)),wallTriangles(shutter,shoreLamp)];
  let washedSamples=0,darkSamples=0;
  const readings=dawnSensors.map(({x,y,r,shade},index)=>{
    const probes:FloorPoint[]=[[x,y]];
    for(let i=0;i<8;i++){
      const angle=i*Math.PI/4;
      probes.push([x+r*Math.cos(angle),y+r*Math.sin(angle)]);
    }
    if(shade){
      for(const probe of probes){
        darkSamples++;
        if(!shoreMasks.some(mask=>blocks(probe,mask)))washedSamples++;
      }
    }
    const matched=shade
      ?seaMasks[index]!==undefined&&probes.every(p=>blocks(p,seaMasks[index])&&shoreMasks.some(mask=>blocks(p,mask)))
      :probes.every(p=>!seaMasks.some(mask=>blocks(p,mask)));
    return {shade,matched};
  });
  return {readings,washout:washedSamples/Math.max(1,darkSamples),matched:readings.every(reading=>reading.matched)};
}
