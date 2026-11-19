import * as T from 'three';

/** The snow marks follow the same collision-checked path as the map. */
export function createSnowTrail(scene:T.Scene,height:(x:number,z:number)=>number){
  const paper=document.createElement('canvas');
  paper.width=paper.height=128;
  const ink=paper.getContext('2d')!;
  const bloom=ink.createRadialGradient(64,64,9,64,64,61);
  bloom.addColorStop(0,'#ffd59985');
  bloom.addColorStop(.58,'#ffb76b24');
  bloom.addColorStop(1,'#ffc38100');
  ink.fillStyle=bloom;
  ink.fillRect(0,0,128,128);
  ink.beginPath();
  ink.moveTo(64,18);
  ink.quadraticCurveTo(72,53,101,67);
  ink.quadraticCurveTo(77,69,64,99);
  ink.quadraticCurveTo(51,69,27,67);
  ink.quadraticCurveTo(56,53,64,18);
  ink.closePath();
  ink.strokeStyle='#493643';ink.lineWidth=6;ink.stroke();
  ink.fillStyle='#ffce8e';ink.fill();
  ink.beginPath();
  ink.moveTo(64,26);ink.lineTo(72,64);ink.lineTo(64,84);ink.lineTo(56,64);ink.closePath();
  ink.fillStyle='#fff0ca';ink.fill();
  const map=new T.CanvasTexture(paper);
  map.colorSpace=T.SRGBColorSpace;
  const geometry=new T.PlaneGeometry(.68,.68);
  geometry.rotateX(-Math.PI/2);
  const material=new T.MeshBasicMaterial({map,transparent:true,depthWrite:false,toneMapped:false,alphaTest:.04});
  const trail=new T.InstancedMesh(geometry,material,9);
  const pose=new T.Object3D();
  trail.count=0;
  trail.frustumCulled=false;
  trail.renderOrder=2;
  trail.instanceMatrix.setUsage(T.DynamicDrawUsage);
  scene.add(trail);

  return {
    hide(){trail.visible=false;},
    update(from:T.Vector3,path:readonly T.Vector3[]){
      let x=from.x,z=from.z;
      let walked=0,nextMark=1.45,count=0;
      for(const point of path){
        const dx=point.x-x,dz=point.z-z,length=Math.hypot(dx,dz);
        while(nextMark<walked+length-.001&&count<trail.instanceMatrix.count){
          const along=(nextMark-walked)/length;
          const mx=x+dx*along,mz=z+dz*along;
          pose.position.set(mx,height(mx,mz)+.125,mz);
          pose.rotation.y=Math.atan2(-dx,-dz);
          pose.scale.setScalar(count<3?1:.82);
          pose.updateMatrix();
          trail.setMatrixAt(count++,pose.matrix);
          nextMark+=1.24;
        }
        if(count===trail.instanceMatrix.count)break;
        walked+=length;
        x=point.x;z=point.z;
      }
      trail.count=count;
      trail.visible=count>0;
      if(count)trail.instanceMatrix.needsUpdate=true;
      return count;
    },
  };
}
