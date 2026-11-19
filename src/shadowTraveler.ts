import * as T from 'three';
import {radialTexture} from './paint';

export const townSpawn = new T.Vector3(3.37,0,6.05);

type ShadowView = 'front' | 'side' | 'back';
const loader = new T.TextureLoader();
const artBase = import.meta.env.BASE_URL + 'identity/traveler/';
const load = (name:string) => loader.loadAsync(artBase + name + '.webp').then(texture => {
  texture.colorSpace = T.SRGBColorSpace;
  return texture;
});
let artwork:Promise<Record<ShadowView | 'sideMirror' | 'starlight',T.Texture>> | undefined;

export function createShadowTraveler(scene:T.Scene){
  const body = new T.Group();
  body.name = 'Shadow traveler';
  scene.add(body);
  const art = new T.Group();
  body.add(art);
  const paper = new T.PlaneGeometry(1,1,18,32);
  paper.translate(0,.5,0);
  const rest = new Float32Array(paper.attributes.position.array);
  const shadow = new T.Mesh(paper,new T.MeshBasicMaterial({transparent:true,alphaTest:.08,depthWrite:false,toneMapped:false}));
  const still = new T.PlaneGeometry(1,1);
  still.translate(0,.5,0);
  const starlight = new T.Mesh(still,new T.MeshBasicMaterial({transparent:true,alphaTest:.08,depthWrite:false,toneMapped:false}));
  for (const form of [shadow,starlight]){
    form.visible=false;
    form.frustumCulled=false;
    art.add(form);
  }
  starlight.renderOrder=1;
  const chest=new T.Sprite(new T.SpriteMaterial({map:radialTexture(),color:'#ffbc65',transparent:true,
    opacity:0,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false}));
  chest.scale.set(.19,.19,1);chest.position.set(0,1.02,.025);
  chest.renderOrder=3;art.add(chest);
  let images:Awaited<NonNullable<typeof artwork>>|undefined;
  artwork ??= Promise.all([load('shadow-front'),load('shadow-side'),load('shadow-back'),load('starlight')])
    .then(([front,side,back,starlight])=>{
      const sideMirror=side.clone();
      sideMirror.repeat.x=-1;
      sideMirror.offset.x=1;
      return {front,side,sideMirror,back,starlight};
    });
  const ready=artwork.then(parts=>{images=parts;}).catch(error=>console.warn('Traveler artwork unavailable',error));
  type TravelerMesh=typeof shadow;
  const eye=new T.Vector3();
  let stride=0, pace=0, glimmer=0;
  function dress(sprite:TravelerMesh,texture:T.Texture,height:number){
    if(sprite.material.map!==texture){
      sprite.material.map=texture;
      sprite.material.needsUpdate=true;
    }
    const image=texture.image as HTMLImageElement;
    const width=height*image.naturalWidth/image.naturalHeight;
    sprite.scale.set(width,height,1);
  }
  return {
    body,ready,
    reach(){glimmer=1;},
    pose(dt:number,motion:T.Vector3){
      const speed=motion.length();
      stride=(stride+speed*dt*Math.PI)% (Math.PI*2);
      pace=T.MathUtils.lerp(pace,Math.min(1,speed/2.2),1-Math.exp(-dt*14));
      glimmer=Math.max(0,glimmer-dt*3);
      if(motion.lengthSq()>.01){
        const bearing=Math.atan2(motion.x,motion.z);
        const angle=Math.atan2(Math.sin(bearing-body.rotation.y),Math.cos(bearing-body.rotation.y));
        body.rotation.y+=angle*(1-Math.exp(-dt*13));
      }
    },
    render(camera:T.Camera,light=0,reduced=false,chapters=0){
      if(!images)return;
      camera.getWorldPosition(eye).sub(body.position);
      const angle=Math.atan2(eye.x,eye.z)-body.rotation.y;
      const face=Math.cos(angle);
      const view=face>.53?'front':face<-.53?'back':'side';
      dress(shadow,images[view==='side'&&Math.sin(angle)>0?'sideMirror':view],1.72);
      dress(starlight,images.starlight,1.75);
      // The illustration stays vertical in world space. Feet pivot around the
      // actual ground position, and only the swinging leg leaves the ground.
      art.rotation.y=Math.atan2(eye.x,eye.z)-body.rotation.y;
      const gait=reduced?0:pace;
      const sway=Math.sin(stride);
      const vertices=paper.attributes.position;
      for(let i=0;i<vertices.count;i++){
        const j=i*3,x=rest[j],y=rest[j+1];
        const leg=1-T.MathUtils.smoothstep(y,.10,.27);
        const side=Math.tanh(x*16);
        const swing=Math.max(0,Math.cos(stride)*side);
        const cape=T.MathUtils.smoothstep(y,.24,.38)*(1-T.MathUtils.smoothstep(y,.47,.67))*Math.abs(x);
        vertices.setXY(i,x+gait*(side*sway*leg*.07-cape*.045*Math.sin(stride-.55)),
          y+gait*leg*swing*.022);
      }
      vertices.needsUpdate=true;
      shadow.material.color.setScalar(1+chapters*.045+glimmer*.035);
      chest.visible=view==='front'&&light<.99&&chapters>0;
      chest.material.opacity=(.085*chapters+glimmer*.035)*(1-light);
      shadow.material.depthWrite=light<.002;
      starlight.material.depthWrite=light>.998;
      shadow.material.opacity=1-light;
      starlight.material.opacity=light;
      shadow.visible=light<.998;
      starlight.visible=light>.002;
    }
  };
}
