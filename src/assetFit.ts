import {Box3, Vector3, type Object3D} from 'three';

/** Fit an unattached asset into an existing scene footprint with its feet at y=0. */
export function fitToFootprint(asset:Object3D,width:number,height:number,depth:number){
  const bounds=new Box3().setFromObject(asset);
  const size=bounds.getSize(new Vector3());
  const center=bounds.getCenter(new Vector3());
  if(Math.min(size.x,size.y,size.z)<=0)throw new Error('Asset has an empty footprint');
  const fit=new Vector3(width/size.x,height/size.y,depth/size.z);
  asset.scale.multiply(fit);
  asset.position.set(
    (asset.position.x-center.x)*fit.x,
    (asset.position.y-bounds.min.y)*fit.y,
    (asset.position.z-center.z)*fit.z,
  );
}
