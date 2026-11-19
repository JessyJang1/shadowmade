import * as T from 'three';
import {mesh,rand,type Parent} from './paint';
import {storybookPBR} from './surfaces';

type Height=(x:number,z:number)=>number;
type Channel=(z:number)=>number;
export type BankStone={z:number;side:number;offset:number;width:number;height:number;seed:number};

const crust=storybookPBR('snow','#dce2ed');
crust.normalScale.setScalar(.15);
const shale=['#696878','#847e82','#827b79'].map(color=>storybookPBR('bridge-stone',color));
for(const surface of shale)surface.normalScale.setScalar(.22);

export function bankDrift(offset:number,z:number,side:number){
  const apron=T.MathUtils.smoothstep(offset,1.62,1.93)*(1-T.MathUtils.smoothstep(offset,2.07,2.70));
  return apron*(.066+.038*Math.sin(z*1.7+side)+.017*Math.cos(z*4.66-side));
}

function ledge(seed:number){
  const rng=rand(seed),n=8;
  const footprint=Array.from({length:n},(_,i)=>{
    const a=i/n*Math.PI*2+(rng()-.5)*.26,r=.80+rng()*.26;
    return {x:Math.cos(a)*r,z:Math.sin(a)*r,notch:rng()};
  });
  function rings(profile:readonly (readonly [number,number])[]){
    const positions:number[]=[],uv:number[]=[],indices:number[]=[];
    for(const [row,[width,height]] of profile.entries()){
      for(const [i,{x,z,notch}] of footprint.entries()){
        const vx=x*width+height*.13,vz=z*width-.08*height;
        const vy=height+z*.19+x*.13+(notch-.5)*.23;
        positions.push(vx,vy,vz);uv.push(vx*.47+.5,vz*.43+.5);
        if(row){
          const a=(row-1)*n+i,b=(row-1)*n+(i+1)%n;
          indices.push(a,a+n,b,b,a+n,b+n);
        }
      }
    }
    const last=(profile.length-1)*n;
    for(let i=1;i<n-1;i++)indices.push(last,last+i+1,last+i);
    const geometry=new T.BufferGeometry();
    geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
    geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
    geometry.setIndex(indices);geometry.computeVertexNormals();
    return geometry;
  }
  return {
    stone:rings([[.80,-.59],[1,-.24],[.77,.35],[.61,.47]]),
    snow:rings([[.80,.31],[.73,.43],[.61,.51],[.29,.54]]),
  };
}
const burialVariation=(seed:number)=>.12*(.5+.5*Math.sin(seed*1.59));
const profiles=Array.from({length:5},(_,i)=>ledge(372+i*17));

export function buildRiverBanks(rocks:Parent,channel:Channel,ground:Height,sites:BankStone[]){
  const tilt=new T.Quaternion(),turn=new T.Quaternion();
  const up=new T.Vector3(0,1,0);
  const surface=new T.Vector3();
  for(const {z,side,offset,width,height,seed} of sites){
    const x=channel(z)+side*offset;
    const rng=rand(seed*73+187);
    const geom=profiles[seed%profiles.length];
    const depth=width*(.97+rng()*.78);
    const waterSlope=ground(x+.17,z)-ground(x-.17,z);
    const runSlope=ground(x,z+.18)-ground(x,z-.18);
    surface.set(-waterSlope,.53,-runSlope).normalize();
    tilt.setFromUnitVectors(up,surface);
    turn.setFromAxisAngle(up,(rng()-.5)*.95);
    const y=ground(x,z)+bankDrift(offset,z,side)-height*(.22+burialVariation(seed));
    const stone=mesh(rocks,geom.stone,shale[seed%shale.length],x,y,z);
    stone.scale.set(width*.86,height,depth);
    stone.quaternion.multiplyQuaternions(tilt,turn);
    // The angular ledge stays partly buried. The matching cap drapes over its lip.
    if(offset>1.88&&seed%5!==2){
      const cap=mesh(rocks,geom.snow,crust,x,y+.010,z);
      cap.scale.copy(stone.scale);
      cap.quaternion.copy(stone.quaternion);
    }
  }
}

/** Wind carries the snow past the lee edge while the upstream lip stays exposed. */
export function laySnowLedge(parent:Parent,x:number,y:number,z:number,width:number,height:number,depth:number,seed:number){
  const profile=profiles[seed%profiles.length], yaw=seed*2.43;
  const stone=mesh(parent,profile.stone,shale[seed%shale.length],x,y,z);
  stone.scale.set(width,height,depth);stone.rotation.y=yaw;
  const snow=mesh(parent,profile.snow,crust,x+.06*width,y+.015,z);
  snow.scale.set(width*(1.1+.09*Math.sin(seed)),height,depth*1.08);snow.rotation.y=yaw;
}
