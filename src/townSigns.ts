import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {group,plaque,type Parent} from './paint';
import names from './data/town-signs.json';

export type TownSign=keyof typeof names;
let source:Promise<T.Group|null>|undefined;
function signAsset(){
  source??=new GLTFLoader().loadAsync(import.meta.env.BASE_URL+'models/aholo-wooden-signs.glb')
    .then(({scene})=>scene).catch(error=>{console.warn('Wooden town signs',error);return null;});
  return source;
}
export async function townSignsReady(){
  const asset=await signAsset();
  return !!asset?.getObjectByName('board')&&Object.keys(names).every(name=>!!asset.getObjectByName('lettering-'+name));
}

export function woodenSign(parent:Parent,name:TownSign,x:number,y:number,z:number,width:number,height:number){
  const sign=group(parent,x,y,z);
  sign.name='Woodcut sign · '+names[name];
  void signAsset().then(asset=>{
    const board=asset?.getObjectByName('board');
    const letters=asset?.getObjectByName('lettering-'+name);
    if(!board||!letters){
      plaque(sign,names[name],width,height,0,0,.075,47);
      return;
    }
    sign.scale.set(width/2.52,height/.72,Math.min(1,width/2.52));
    sign.add(board.clone(),letters.clone());
  });
  return sign;
}
