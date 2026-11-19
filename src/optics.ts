import asset from './data/shadow-composition.json' with {type:'json'};
import donorMeshes from './data/aholo-optical-casts.json' with {type:'json'};

export type Vec=readonly [number,number,number];
type Point=readonly [number,number];
export type Piece=keyof typeof asset.geometry;
type DonorMesh=typeof donorMeshes.bell;
export const lux3dOpticalMeshes:Partial<Record<Piece,DonorMesh>>={bell:donorMeshes.bell,fir:donorMeshes.fir};
export const lux3dFanTip=donorMeshes.fanTip;
export const pieces=(asset.pieces as {id:Piece;label:string;color:string}[]).map(piece=>({
  ...piece,label:piece.id==='bell'?'铸铜灯胆':piece.id==='fir'?'钟房木模':piece.label,
}));
export const starCenter=asset.center as unknown as Vec;
export const star=asset.star as unknown as Point[];
export const lamp=asset.restLight as unknown as Vec;
export const lampStops=asset.lightStops;
export const slotStep=asset.slotStep;
export const depthStep=asset.depthStep;
export const mounts=asset.trays;
export type Mount={piece:Piece|null;slot:number;depth:number;dial:number};

// The calibrated pose is only used for the offline fixture and the display
// after a previously achieved win. Neither projection nor evaluation reads it.
export const proof=asset.proof as Mount[];
export const proofLight=asset.proofLight;

export function centerAt(index:number,slot:number,depth=1):Vec{
  const [x,y,z]=mounts[index].position;
  return [x+(slot-1)*slotStep,y,z+(depth-1)*depthStep];
}
export function angleFor(dial:number){return (dial-1)*asset.dialStep;}
export function lampAt(rail:number):Vec{
  return [lampStops[0]+(lampStops[2]-lampStops[0])*rail/2,lamp[1],lamp[2]];
}
export const geometry=Object.fromEntries(pieces.map(({id})=>{
  const donor=lux3dOpticalMeshes[id];
  if(donor){
    const {position,index}=donor;
    const vertices:Vec[]=index.map(i=>[position[3*i],position[3*i+1],position[3*i+2]]);
    return [id,vertices];
  }
  const source=id==='fan'?[...lux3dFanTip.base,...lux3dFanTip.tip]:asset.geometry[id];
  const vertices:Vec[]=[];
  for(let i=0;i<source.length;i+=3)vertices.push([source[i],source[i+1],source[i+2]]);
  return [id,vertices];
})) as Record<Piece,Vec[]>;

export function analyticPose(mount:Mount,index:number):Vec[]{
  if(!mount.piece)return [];
  const [x,y,z]=centerAt(index,mount.slot,mount.depth);
  const yaw=angleFor(mount.dial),cos=Math.cos(yaw),sin=Math.sin(yaw);
  return geometry[mount.piece].map(([a,b,c])=>[x+a*cos+c*sin,y+b,z-a*sin+c*cos]);
}
const n=144,width=8.4,height=6.8,left=-4.20,bottom=-.45;
function raster(triangles:Point[]){
  const cells=new Uint8Array(n*n);
  const coordinate=(p:Point)=>[(p[0]-left)*n/width,(p[1]-bottom)*n/height];
  for(let i=0;i<triangles.length;i+=3){
    const [a,b,c]=triangles.slice(i,i+3).map(coordinate);
    const cross=(x:number,y:number,p:number[],q:number[])=>(q[0]-p[0])*(y-p[1])-(q[1]-p[1])*(x-p[0]);
    if(Math.abs(cross(c[0],c[1],a,b))<1e-8)continue;
    for(let y=Math.max(0,Math.floor(Math.min(a[1],b[1],c[1])));y<Math.min(n,Math.ceil(Math.max(a[1],b[1],c[1])));y++){
      for(let x=Math.max(0,Math.floor(Math.min(a[0],b[0],c[0])));x<Math.min(n,Math.ceil(Math.max(a[0],b[0],c[0])));x++){
        const u=cross(x+.5,y+.5,a,b),v=cross(x+.5,y+.5,b,c),w=cross(x+.5,y+.5,c,a);
        if((u>=0&&v>=0&&w>=0)||(u<=0&&v<=0&&w<=0))cells[y*n+x]=1;
      }
    }
  }
  return cells;
}
const target=raster(star.flatMap((a,i)=>[[starCenter[0],starCenter[1]] as Point,a,star[(i+1)%star.length]]));
export function projection(vertices:readonly Vec[],source:Vec=lamp){
  const plane:Point[]=[];
  for(let i=0;i<vertices.length;i+=3){
    const points=vertices.slice(i,i+3).map(p=>{
      const t=source[2]/(source[2]-p[2]);
      return t>=1&&Number.isFinite(t)?[source[0]+(p[0]-source[0])*t,source[1]+(p[1]-source[1])*t] as Point:null;
    });
    if(points.every((p):p is Point=>p!==null))plane.push(...points);
  }
  return raster(plane);
}
export const emptyMask=projection([]);
const fullArea=target.reduce((sum,n)=>sum+n,0);
export const coverageLimit=.94,spillLimit=.115;
export function evaluate(a:Uint8Array,b:Uint8Array){
  let filled=0,extra=0,shared=0,onlyA=0,onlyB=0,upper=0,upperHit=0,lower=0,lowerHit=0;
  for(let i=0;i<target.length;i++){
    const live=a[i]||b[i];
    if(!target[i]){if(live)extra++;continue;}
    if(live)filled++;
    if(a[i]&&b[i])shared++;
    else if(a[i])onlyA++;
    else if(b[i])onlyB++;
    if(bottom+(Math.floor(i/n)+.5)*height/n>=starCenter[1]){
      upper++;if(live)upperHit++;
    }else{lower++;if(live)lowerHit++;}
  }
  const coverage=filled/fullArea,spill=extra/fullArea,overlap=shared/fullArea;
  const unique=[onlyA/fullArea,onlyB/fullArea] as const;
  const top=upperHit/upper,base=lowerHit/lower;
  const matched=coverage>=coverageLimit&&spill<=spillLimit&&top>=.90&&base>=.90&&overlap>=.23&&Math.min(...unique)>=.12;
  return {coverage,spill,overlap,unique,top,base,matched};
}

export type Placement={piece:Piece; x:number; z:number; yaw:number};
export const castingSurfaces=mounts.map(({position:[x,y,z]})=>({x,y,z,width:1.50,depth:1.18,top:2.365}));
export const restoredArrangement=proof.map((mount,index):Placement=>{
  const [x,,z]=centerAt(index,mount.slot,mount.depth);
  return {piece:mount.piece!,x,z,yaw:angleFor(mount.dial)};
});
