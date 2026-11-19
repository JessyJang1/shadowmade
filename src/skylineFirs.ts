import * as T from 'three';
import { fitToFootprint } from './assetFit';

type Tree = {x:number;y:number;z:number;h:number;yaw:number;variant:number;aspect:number};

/** Instances use three distinct CC0 tree meshes and keep their base at the old tree position. */
export function skylineFirs(sources:readonly [T.Group,T.Group,T.Group], trees:Tree[]){
  const prototypes=[
    sources[0],
    sources[1].getObjectByName('PineTree_5')!,
    sources[1].getObjectByName('PineTree_3')!,
    sources[2],
  ];
  const grove=new T.Group();
  grove.name='Quaternius snowline grove';
  for(const [variant,prototype] of prototypes.entries()){
    if(!prototype)throw new Error('Snowline pine geometry is absent');
    const placements=trees.filter(tree=>tree.variant===variant);
    if(!placements.length)continue;
    const sample=prototype.clone();
    const normalized=new T.Group();
    normalized.add(sample);
    fitToFootprint(normalized,1,1,1);
    normalized.updateMatrixWorld(true);
    normalized.traverse(part=>{
      if(!(part instanceof T.Mesh)||Array.isArray(part.material))return;
      const geometry=part.geometry.clone().applyMatrix4(part.matrixWorld);
      const paint=(part.material as T.MeshStandardMaterial).clone();
      if(paint.transparent){
        // The source foliage uses alpha cards. Alpha testing keeps the needles and avoids sorting every tree.
        paint.transparent=false;
        paint.alphaTest=.46;
        paint.side=T.DoubleSide;
        paint.color.setRGB(.78,.87,.98);
        const position=geometry.getAttribute('position');
        const colors=[];
        for(let i=0;i<position.count;i++){
          const x=position.getX(i),y=position.getY(i),z=position.getZ(i);
          const frost=T.MathUtils.smoothstep(Math.sin(x*34+z*21+y*18)*.26+y,.23,.85);
          colors.push(.55+.45*frost,.66+.34*frost,.75+.25*frost);
        }
        geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));
        paint.vertexColors=true;
      }else if(paint.name==='Snow'){
        paint.color.set('#d7ddea');
      }
      const stand=new T.InstancedMesh(geometry,paint,placements.length);
      const pose=new T.Object3D();
      for(const [i,{x,y,z,h,yaw,aspect}] of placements.entries()){
        pose.position.set(x,y,z);
        pose.rotation.y=yaw;
        pose.scale.set(aspect*h,h,aspect*h);
        pose.updateMatrix();
        stand.setMatrixAt(i,pose.matrix);
      }
      stand.receiveShadow=true;
      stand.computeBoundingSphere();
      grove.add(stand);
    });
  }
  return grove;
}
