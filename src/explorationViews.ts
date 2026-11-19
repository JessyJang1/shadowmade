import * as T from 'three';
import type {Bookmark} from './camera';

type Blocked = (x:number,y:number,z:number)=>boolean;

export function clearViewPath(from:T.Vector3,to:T.Vector3,blocked:Blocked){
  const sample = new T.Vector3();
  const steps = Math.max(1,Math.ceil(from.distanceTo(to)/.22));
  for(let i=1;i<=steps;i++){
    sample.lerpVectors(from,to,i/steps);
    if(blocked(sample.x,sample.y,sample.z))return false;
  }
  return true;
}

export function observationFrame(base:Bookmark,azimuth:number,elevation:number,zoom:number,blocked:Blocked):Bookmark{
  const offset=base.position.clone().sub(base.target);
  const orbit=new T.Spherical().setFromVector3(offset);
  orbit.theta+=azimuth;
  orbit.phi=T.MathUtils.clamp(orbit.phi+elevation,.56,1.33);
  orbit.radius*=zoom;
  const position=new T.Vector3().setFromSpherical(orbit).add(base.target);
  if(!clearViewPath(base.position,position,blocked))return base;
  return {position,target:base.target.clone()};
}
