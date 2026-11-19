import * as T from 'three';
import {v} from './paint';

type Collision=(x:number,y:number,z:number)=>boolean;

export type Bookmark={position:T.Vector3;target:T.Vector3};
export function createCamera(aspect:number){
  const camera=new T.PerspectiveCamera(aspect<.85?63:54,aspect,.105,220);
  const opening:Bookmark={position:v(7.8,4.7,12.6),target:v(-2.55,2.56,-2.50)};
  const look=v(0,0,0);
  function place(bookmark:Bookmark){
    camera.position.copy(bookmark.position);
    look.copy(bookmark.target);camera.lookAt(look);
  }
  place(opening);
  const bookmark=():Bookmark=>({position:camera.position.clone(),target:look.clone()});
  let tween:{duration:number;elapsed:number;from:Bookmark;to:Bookmark;done:()=>void}|undefined;
  let yaw=0,elevation=.35,zoom=1,heading:number|null=null;
  function perspective(player:T.Vector3,inside:boolean):Bookmark{
    const distance=(inside?4.05:5.30)*zoom;
    const back=v(Math.sin(yaw),0,Math.cos(yaw));
    const target=player.clone().add(v(0,inside?1.80:1.24,0));
    const position=player.clone().addScaledVector(back,distance);
    position.y+=inside?2.24+elevation*1.78:(2.64+elevation*2.70)*zoom;
    if(inside){
      target.addScaledVector(back,-1.53);
      position.x=T.MathUtils.clamp(position.x,-6.1,6.1);
      position.z=T.MathUtils.clamp(position.z,-2.40,9.42);
    }
    return {position,target};
  }
  const probe=v(0,0,0);
  function clearFraction(from:T.Vector3,to:T.Vector3,blocked:Collision){
    const distance=from.distanceTo(to);
    const steps=Math.max(1,Math.ceil(distance/.095));
    for(let i=1;i<=steps;i++){
      probe.lerpVectors(from,to,i/steps);
      const {x,y,z}=probe;
      const radius=.17*Math.min(1,i/steps*distance/.62);
      if(blocked(x,y,z)||blocked(x+radius,y,z)||blocked(x-radius,y,z)||
        blocked(x,y,z+radius)||blocked(x,y,z-radius)||blocked(x,y+radius,z)||blocked(x,y-radius,z)){
        return Math.max(0,(i-2)/steps);
      }
    }
    return 1;
  }
  return {camera,opening,place,perspective,bookmark,
    get yaw(){return yaw;},
    reset(angle=0){yaw=angle;elevation=.35;zoom=1;heading=null;},
    aim(from:T.Vector3,target:T.Vector3){heading=Math.atan2(from.x-target.x,from.z-target.z);},
    cancelAim(){heading=null;},
    zoom(delta:number){zoom=T.MathUtils.clamp(zoom*Math.exp(delta),.79,1.5);},
    rotate(dx:number,dy:number){heading=null;yaw-=dx*.005;elevation=T.MathUtils.clamp(elevation-dy*.005,-.27,.92);},
    follow(player:T.Vector3,inside:boolean,dt:number,blocked:Collision,focus?:T.Vector3,guideEye?:(actor:T.Vector3,eye:T.Vector3)=>void){
      if(heading!==null){
        const angle=Math.atan2(Math.sin(heading-yaw),Math.cos(heading-yaw));
        yaw+=angle*(1-Math.exp(-dt*4));
        if(Math.abs(angle)<.015)heading=null;
      }
      const next=perspective(player,inside);
      guideEye?.(player,next.position);
      const pivot=player.clone().add(v(0,1.42,0));
      const fraction=clearFraction(pivot,next.position,blocked);
      next.position.lerpVectors(pivot,next.position,fraction);
      if(next.position.distanceTo(pivot)<1.65){
        // Tight corners can block both the requested boom and its raised
        // equivalent. Find a shoulder with enough room to keep the actor.
        let best=next.position.distanceTo(pivot)-.75;
        for(const offset of [0,.61,-.61,1.22,-1.22,1.88,-1.88,Math.PI]){
          const heading=yaw+offset;
          const candidate=pivot.clone().add(v(Math.sin(heading)*2.90,inside?1.06:1.57,Math.cos(heading)*2.90));
          candidate.lerpVectors(pivot,candidate,clearFraction(pivot,candidate,blocked));
          const score=candidate.distanceTo(pivot)-Math.abs(offset)*.18-candidate.distanceTo(camera.position)*.16;
          if(score>best){next.position.copy(candidate);best=score;}
        }
      }
      // Recheck the interpolated boom as well. An unobstructed destination can
      // still cross the corner of a building while the player orbits.
      const pending=camera.position.clone().lerp(next.position,1-Math.exp(-dt*(fraction<1?19:8)));
      const safe=clearFraction(pivot,pending,blocked);
      if(safe<1)pending.lerpVectors(pivot,pending,safe);
      if(pending.distanceTo(pivot)<1.18&&next.position.distanceTo(pivot)>pending.distanceTo(pivot)+.35)pending.copy(next.position);
      camera.position.copy(pending);
      if(fraction<.55)next.target.lerp(pivot,.83);
      if(focus&&focus.distanceTo(pivot)<3.2&&clearFraction(pivot,focus,blocked)>.76&&clearFraction(pending,focus,blocked)>.76){
        next.target.lerp(focus,.22);
      }
      look.lerp(next.target,1-Math.exp(-dt*(fraction<.55?29:11)));camera.lookAt(look);
    },
    fly(to:Bookmark,duration:number,done:()=>void){
      tween={to,from:bookmark(),duration,elapsed:0,done};
    },
    cancel(){tween=undefined;},
    update(dt:number){
      if(!tween)return;
      const t=tween;
      t.elapsed+=dt;
      const a=Math.min(1,t.elapsed/t.duration),s=a*a*(3-2*a);
      camera.position.lerpVectors(t.from.position,t.to.position,s);
      look.lerpVectors(t.from.target,t.to.target,s);camera.lookAt(look);
      if(a===1){tween=undefined;t.done();}
    }
  };
}
