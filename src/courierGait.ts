import * as T from 'three';

// The imported Leg pivot sits at the knee. Give the shin a thigh parent and
// give the boot its own ankle so the sole can stay flat during weight bearing.
export function articulateCourier(scene:T.Object3D){
  const skin=scene.getObjectByName('geometry_0');
  if(!(skin instanceof T.SkinnedMesh))return;
  const skeleton=skin.skeleton;
  const indices=skin.geometry.getAttribute('skinIndex');
  const weights=skin.geometry.getAttribute('skinWeight');
  const positions=skin.geometry.getAttribute('position');
  const joint=(name:string,parent:T.Object3D,x:number,y:number)=>{
    const bone=new T.Bone();
    bone.name=name;bone.position.set(x,y,0);parent.add(bone);
    skeleton.bones.push(bone);
    return bone;
  };
  for(let side=0;side<2;side++){
    const shin=skeleton.getBoneByName('Leg'+side)!;
    const oldIndex=skeleton.bones.indexOf(shin);
    const thigh=joint('Thigh'+side,shin.parent!,shin.position.x,.80);
    thigh.add(shin);shin.position.set(0,-.36,0);
    const ankle=joint('Ankle'+side,shin,0,-.35);
    const thighIndex=skeleton.bones.indexOf(thigh),ankleIndex=skeleton.bones.indexOf(ankle);
    for(let i=0;i<positions.count;i++){
      const y=positions.getY(i);
      for(let slot=0;slot<4;slot++){
        const weight=weights.getComponent(i,slot);
        if(weight<=0||indices.getComponent(i,slot)!==oldIndex)continue;
        const boot=1-T.MathUtils.smoothstep(y,.11,.23);
        const upper=T.MathUtils.smoothstep(y,.37,.48);
        const blend=Math.max(boot,upper);
        if(blend===0)continue;
        const target=boot>0?ankleIndex:thighIndex;
        if(blend===1){indices.setComponent(i,slot,target);continue;}
        for(let free=0;free<4;free++)if(weights.getComponent(i,free)===0){
          weights.setComponent(i,slot,weight*(1-blend));
          indices.setComponent(i,free,target);weights.setComponent(i,free,weight*blend);break;
        }
      }
    }
  }
  scene.updateMatrixWorld(true);
  // Rebuild the palette at bind pose before SkeletonUtils clones it for each scene.
  skin.bind(new T.Skeleton(skeleton.bones),skin.bindMatrix.clone());
}

export function poseCourierLeg(thigh:T.Object3D,shin:T.Object3D,ankle:T.Object3D,
  forward:number,lateral:number,lift:number,dip:number,bootPitch:number){
  const vertical=.71-dip-lift;
  const down=Math.hypot(vertical,lateral);
  const reach=T.MathUtils.clamp(Math.hypot(forward,down),.02,.71);
  const acos=(cos:number)=>Math.acos(T.MathUtils.clamp(cos,-1,1));
  const hip=-Math.atan2(forward,down)-acos((.36**2+reach**2-.35**2)/(.72*reach));
  const knee=Math.PI-acos((.36**2+.35**2-reach**2)/(.252));
  thigh.position.y=.80-dip;thigh.rotation.set(hip,0,Math.atan2(lateral,vertical),'ZYX');
  shin.rotation.x=knee;
  ankle.quaternion.copy(thigh.quaternion).multiply(shin.quaternion).invert();
  ankle.rotateX(bootPitch);
}
