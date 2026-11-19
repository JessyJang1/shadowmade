import * as T from 'three';
import {makeNorthCrossing} from './northBridge';
import {dressBeacon} from './beaconFinish';
import {lampSightline} from './lampSightline';
import {carouselJoinery} from './carouselJoinery';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {clone as cloneRig} from 'three/addons/utils/SkeletonUtils.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {fitToFootprint} from './assetFit';
import {plazaBuilding} from './plazaBuildings';
import {house,lantern,tree,windowArch} from './architecture';
import {riversideStall} from './marketStalls';
import {riversideLantern,riversidePost,riversideRail} from './riversideFittings';
import {skylineFirs} from './skylineFirs';
import {ridgeCottage} from './ridgeCottages';
import {canalLanterns,canalSurface,canalWaterLevel} from './canalWater';
import {bankDrift,buildRiverBanks,laySnowLedge,type BankStone} from './riverBanks';
import {buildClockMasonry,retainClockBelfry} from './clockMasonry';
import {storybookPBR} from './surfaces';
import {bridgeDeckHeight,buildCanalBridge} from './canalBridge';
import {laySnowboundStreets,groundContact} from './routeGround';
import {townSignsReady,woodenSign} from './townSigns';
import {marketPass,northBridgeZ,northDeckHalfSpan,northDeckHalfWidth,northDeckHeight,northDeckOffset,stoneDeckHalfWidth,townBounds} from './townLayout';
import {ball,beam,box,cylinder,glow,group,loop,mat,mesh,palette,painted,pool,radialTexture,rand,v,type Parent} from './paint';

export const canal=(z:number)=>9.65+Math.sin(z*.19)*1.37+.082*z;
const maxGroundHeight=.24+.20+1.65+.28;
export function ground(x:number,z:number){
  const rise=.24*Math.sin(x*.21+z*.17)+.20*Math.cos(z*.32-x*.09)+
    1.65*Math.exp(-((x+8)**2/129+(z+12)**2/47))+.28*Math.exp(-((x+12)**2/24+(z-5)**2/84));
  const cut=1-T.MathUtils.smoothstep(Math.abs(x-canal(z)),1.27,2.45);
  return rise*(1-cut)-2.04*cut;
}
const snow=mat('#c9c6dd','snow'), stone=mat('#81748c','stone'), wood=mat('#745168','wood'), dark=mat('#523c53','wood'), gold=mat('#c49676');
const cozy=glow('#ffd399',1.16), merry=glow('#f9b983',1.5);
function terrain(p:Parent){
  const segments=200,tileSize=25;
  const g=new T.PlaneGeometry(160,160,segments,segments);g.rotateX(-Math.PI/2);
  const a=g.attributes.position,uv=g.attributes.uv;const colors=[];
  const c=new T.Color(),base=new T.Color(),wet=new T.Color('#666f7c');
  for(let i=0;i<a.count;i++){
    const localX=a.getX(i)-9.6, sign=Math.sign(localX), field=Math.abs(localX);
    const nearBank=1-T.MathUtils.smoothstep(field,7,14);
    const z=a.getZ(i)+T.MathUtils.lerp(.18,.035,nearBank)*Math.cos(i*2.31);
    const channel=canal(z);
    // Redistribute the existing vertices onto the curved channel without adding triangles.
    let x=a.getX(i);
    if(field<24){
      x=field<=10 ? channel+localX*.32
        : T.MathUtils.lerp(channel+sign*3.2,9.6+sign*24,(field-10)/14);
    }
    x-=T.MathUtils.lerp(.19,.023,nearBank)*Math.sin(i*1.73);
    const offset=Math.abs(x-channel);
    const height=ground(x,z)+bankDrift(offset,z,Math.sign(x-channel));
    const grain=T.MathUtils.lerp(.043,.018,nearBank)*Math.sin(z*5.2+x*2)*Math.sin(x*4.8);
    a.setXYZ(i,x,height+grain,z);uv.setXY(i,x*.20,z*.2);
    const m=.044*Math.sin(x*.8+z*.5)+.041*Math.cos(z*1.5-x*1.8)+.024*Math.sin(x*4.3+z*.95);
    const local=(1-T.MathUtils.smoothstep(Math.abs(x+2),10,15))*(1-T.MathUtils.smoothstep(Math.abs(z+3),11,17));
    base.set('#d5d3de').lerp(c.set('#f5f4f2'),local);
    const damp=(1-T.MathUtils.smoothstep(height,canalWaterLevel+.16,-.21))
      *(1-T.MathUtils.smoothstep(offset,1.87,2.39));
    const seam=.89+.07*Math.sin(z*2.8+offset*8)+.04*Math.sin(z*5.3+offset*6);
    base.lerp(wet,damp*seam*.86);
    c.copy(base).offsetHSL(.009*Math.sin(i),0,m);
    colors.push(c.r,c.g,c.b);
  }
  g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.computeVertexNormals();
  const surface=storybookPBR('snow','#f3f8ff',1.55);
  surface.vertexColors=true;surface.normalScale.setScalar(.22);surface.aoMapIntensity=.19;
  // Keep identical vertices, normals and topology, with bounds per patch so
  // the camera frustum can reject snow and terrain behind it.
  const source=g.index!.array;
  const point=new T.Vector3();
  for(let row=0;row<segments;row+=tileSize){
    for(let column=0;column<segments;column+=tileSize){
      const patch=new T.BufferGeometry();
      for(const key of Object.keys(g.attributes))patch.setAttribute(key,g.attributes[key]);
      const indices=new Uint16Array(tileSize*tileSize*6);
      const bounds=new T.Box3();
      for(let y=0;y<tileSize;y++){
        const start=((row+y)*segments+column)*6;
        indices.set(source.subarray(start,start+tileSize*6),y*tileSize*6);
      }
      for(let y=row;y<=row+tileSize;y++){
        for(let x=column;x<=column+tileSize;x++){
          bounds.expandByPoint(point.fromBufferAttribute(a,y*(segments+1)+x));
        }
      }
      patch.setIndex(new T.BufferAttribute(indices,1));
      patch.boundingBox=bounds;
      patch.boundingSphere=bounds.getBoundingSphere(new T.Sphere());
      const land=mesh(p,patch,surface);land.name="Snow terrain";land.receiveShadow=true;
    }
  }
}
function ribbon(p:Parent,coords:T.Vector3[],width:number,m:T.Material,y:(x:number,z:number)=>number,steps=140){
  const g=new T.CatmullRomCurve3(coords),ps:number[]=[],us:number[]=[],ix:number[]=[];
  for(let i=0;i<=steps;i++){
    const t=i/steps, c=g.getPoint(t),d=g.getTangent(t);
    for(let j=0;j<=4;j++){
      const side=(j/4-.5)*width*(1+.08*Math.sin(i*.47)+.07*Math.cos(i*.11));
      const x=c.x+d.z*side,z=c.z-d.x*side;
      ps.push(x,y(x,z),z);us.push(j/4,i*.12);
      if(i&&j){const k=i*5+j;ix.push(k,k-5,k-1,k-1,k-5,k-6);}
    }
  }
  const geo=new T.BufferGeometry();
  geo.setAttribute('position',new T.Float32BufferAttribute(ps,3));geo.setAttribute('uv',new T.Float32BufferAttribute(us,2));geo.setIndex(ix);geo.computeVertexNormals();
  // Both sides for ribbons; paths can run in either direction.
  m.side=T.DoubleSide;mesh(p,geo,m);return g;
}
function makeHorse(p:Parent,color:string){
  const g=group(p),c=mat(color),m=mat('#77525d','wood');
  ball(g,c,0,.54,0,.41,.23,.17);ball(g,c,.24,.73,0,.19,.33,.143).rotation.z=-.34;
  ball(g,c,.43,.94,0,.23,.13,.108).rotation.z=.20;
  ball(g,m,.39,1.085,-.07,.041,.13,.037).rotation.z=.14;
  ball(g,m,.32,1.08,.061,.034,.12,.039).rotation.z=-.11;
  ball(g,m,.47,.973,.094,.031,.031,.014);
  for(const s of [-1,1]){
    beam(g,c,v(s*.26,.48,.108),v(s*.44,.245,.108),.085);
    beam(g,c,v(s*.44,.245,.108),v(s*.37,.102,.108),.075);
    beam(g,c,v(s*.24,.46,-.108),v(s*.35,.14,-.108),.084);
  }
  beam(g,m,v(-.32,.61,0),v(-.59,.34,0),.095);
  ball(g,m,-.06,.73,0,.22,.072,.184);
  box(g,mat('#a85e74'),-.07,.60,.149,.28,.19,.055);
  return g;
}
const entryAngle=.53;
function stairTop(x:number,z:number){
  const dx=x+.84,dz=z-.10;
  const along=dx*Math.sin(entryAngle)+dz*Math.cos(entryAngle);
  const side=Math.abs(dx*Math.cos(entryAngle)-dz*Math.sin(entryAngle));
  if(along>=3.39&&along<3.89&&side<1.145)return .47;
  if(along>=3.89&&along<4.355&&side<1.24)return .32;
  if(along>=4.355&&along<=4.835&&side<1.36)return .18;
  return -Infinity;
}
function makeCarousel(p:Parent,sightline:ReturnType<typeof lampSightline>){
  const x=-.84,z=.10,y=ground(x,z),g=group(p,x,y,z);
  const deck=group(g), trim=group(deck), fallbackCanopy=group(deck), fallbackBase=group(g);
  const ivory=mat('#ead4bf','cloth'), red=mat('#a05d73','cloth');
  cylinder(fallbackBase,stone,0,.11,0,3.69,3.78,.26,48);
  cylinder(fallbackBase,wood,0,.30,0,3.43,3.63,.22,48);
  const plinth=new GLTFLoader().loadAsync(import.meta.env.BASE_URL+'models/hero-carousel-plinth.glb').then(({scene})=>{
    sightline.apply(scene);g.add(scene);fallbackBase.removeFromParent();return true;
  }).catch(error=>{console.warn('Carousel plinth unavailable',error);return false;});
  let landingReady=false;
  const glassMaterials=new Set<T.MeshStandardMaterial>();
  const loadEntry=(name:string,parent:T.Group)=>new GLTFLoader().loadAsync(import.meta.env.BASE_URL+'models/'+name+'.glb').then(({scene})=>{
    sightline.apply(scene);
    scene.traverse(o=>{
      if(!(o instanceof T.Mesh))return;
      o.receiveShadow=true;
      if(o.material.name.startsWith('Bluestone ashlar'))o.material.color.set('#928a98');
      if(o.material.name==='Amber milk glass'){
        o.material.emissiveIntensity=.36+wake;glassMaterials.add(o.material);
      }
    });
    parent.add(scene);return scene;
  });
  void loadEntry('carousel-swept-landing',g).then(scene=>{scene.rotation.y=entryAngle;landingReady=true;}).catch(e=>console.warn('Carousel landing',e));
  void loadEntry('carousel-beam-pendants',deck).catch(e=>console.warn('Canopy lamps',e));
  carouselJoinery(trim,fallbackCanopy);
  const spindle=cylinder(deck,wood,0,1.78,0,.38,.53,2.68,12);
  let printedSilk:T.MeshStandardMaterial|undefined;
  let wake=0;
  const drum=new GLTFLoader().loadAsync(import.meta.env.BASE_URL+'models/story-lantern.glb').then(({scene})=>{
    sightline.apply(scene);
    scene.traverse(part=>{
      if(!(part instanceof T.Mesh))return;
      part.receiveShadow=true;
      if(part.material.name==='Block printed lantern silk'){
        printedSilk=part.material as T.MeshStandardMaterial;
        printedSilk.emissiveIntensity=.24+.86*wake;
      }
    });
    deck.add(scene);spindle.removeFromParent();return true;
  }).catch(error=>{console.warn('Carousel story lantern',error);return false;});
  for(let i=0;i<12;i++){
    const a=i/12*6.283185;const stripe=i%2===0?red:ivory;
    const points:number[]=[],uv:number[]=[],idx:number[]=[];
    for(let j=0;j<=11;j++)for(let k=0;k<=8;k++){
      const t=j/11,s=k/8,angle=a+s*Math.PI/6,rad=.14+t*3.19;
      const d=Math.sin(s*Math.PI)*Math.pow(t,7)*.21;
      points.push(Math.cos(angle)*(rad+d*.25),5.11-1.62*t+.40*Math.sin(t*Math.PI)-d,Math.sin(angle)*(rad+d*.25));uv.push(s,t);
      if(j&&k){const n=j*9+k;idx.push(n,n-1,n-9,n-1,n-10,n-9);}
    }
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(points,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(idx);geo.computeVertexNormals();
    stripe.side=T.DoubleSide;mesh(fallbackCanopy,geo,stripe);
    const aa=a+Math.PI/12;
    if(i%2===0){cylinder(trim,gold,Math.cos(a)*2.97,2.06,Math.sin(a)*2.97,.033,.044,3.18,7);}
    ball(fallbackCanopy,gold,Math.cos(aa)*3.34,3.27,Math.sin(aa)*3.34,.09,.16,.09);
    const garland=Array.from({length:6},(_,j)=>{const s=j/5,aa=a+s*Math.PI/6;return v(Math.cos(aa)*3.35,3.47-Math.sin(s*Math.PI)*.31,Math.sin(aa)*3.35);});
    mesh(fallbackCanopy,new T.TubeGeometry(new T.CatmullRomCurve3(garland),15,.039,5),mat('#61525e','needles'));
    for(let j=1;j<5;j++){const p=garland[j];ball(fallbackCanopy,j%2?mat('#9f5e72'):merry,p.x,p.y-.025,p.z,.039,.046,.039);}
    if(i%2===0)lantern(trim,Math.cos(aa)*2.21,2.84,Math.sin(aa)*2.21,.55,false);
    if(i%3===0){
      const cx=Math.cos(a)*2.5,cz=Math.sin(a)*2.5;
      loop(fallbackCanopy,[v(cx-.4,4.1,cz-.18),v(cx+.14,4.18,cz+.14),v(cx+.32,4.06,cz+.38),v(cx-.22,3.99,cz+.19)],snow,.06);
    }
  }
  cylinder(fallbackCanopy,gold,0,5.11,0,.09,.25,.36,12);
  const useAholoCanopy=new URLSearchParams(location.search).has('aholoCanopy');
  const canopyLoader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const canopy=canopyLoader.loadAsync(import.meta.env.BASE_URL+'models/'+
    (useAholoCanopy?'aholo-carousel-canopy.glb':'aholo-g1-canopy.glb')).then(({scene})=>{
    scene.name=useAholoCanopy?'Aholo canopy 8213579':'Aholo canopy 8294287';
    if(useAholoCanopy){
      scene.scale.set(8.4,5.0,8.4);
      scene.position.y=4.23;
    }else{
      scene.scale.set(3.77,2.19,3.77);
      scene.position.y=4.64;
    }
    scene.traverse(o=>{
      if(!(o instanceof T.Mesh))return;
      o.receiveShadow=true;
      if(useAholoCanopy&&o.material instanceof T.MeshStandardMaterial){
        o.material.color.set('#edc8ac');
        o.material.metalness*=.52;
      }
    });
    sightline.apply(scene);deck.add(scene);fallbackCanopy.removeFromParent();
    if(!useAholoCanopy)finial.visible=false;
    return useAholoCanopy?'aholo-8213579':'aholo-8294287';
  }).catch(e=>{console.warn('Carousel canopy unavailable',e);return 'fallback';});
  const lights=new T.InstancedMesh(new T.SphereGeometry(.057,8,6),new T.MeshBasicMaterial({color:'#694d64'}),36);
  const tmp=new T.Matrix4();
  for(let i=0;i<36;i++){
    const a=i/36*2*Math.PI;lights.setMatrixAt(i,tmp.makeTranslation(Math.cos(a)*3.10,3.42,Math.sin(a)*3.10));
  }
  deck.add(lights);
  const horses=Array.from({length:6},(_,i)=>{
    const a=i/6*Math.PI*2;
    const pole=cylinder(trim,gold,Math.cos(a)*2.05,2.00,Math.sin(a)*2.05,.022,.025,2.91,6);pole.rotation.z=.011;
    const horse=makeHorse(deck,['#ede1cc','#c2a1a9','#d6c4b3'][i%3]);
    horse.position.set(pole.position.x,.76,pole.position.z);horse.rotation.y=-a+Math.PI*.5;horse.scale.setScalar(1.16);
    batch(horse,false);
    return horse;
  });
  const horseLoader=new GLTFLoader();
  const seatAsset=horseLoader.loadAsync(import.meta.env.BASE_URL+'models/nightwatch-horse.glb')
    .then(gltf=>({scene:gltf.scene,source:'aholo-8355224'}))
    .catch(error=>{
      console.warn('Nightwatch carousel mount',error);
      return horseLoader.loadAsync(import.meta.env.BASE_URL+'models/carved-canter-horse.glb')
        .then(gltf=>({scene:gltf.scene,source:'carved-canter-horse'}));
    }).then(({scene,source})=>{
      scene.traverse(part=>{if(part instanceof T.Mesh)part.receiveShadow=true;});
      sightline.apply(scene);
      for(const mount of horses){
        mount.clear();
        mount.add(scene.clone());
      }
      return source;
    }).catch(error=>{console.warn('Carousel seat fallback',error);return 'fallback';});
  sightline.apply(trim);batch(trim,false);
  sightline.apply(fallbackCanopy);
  for(const horse of horses)sightline.apply(horse);
  const finial=group(g,0,5.61,0);
  const globe=glow('#ffbd6d',1.22);
  ball(finial,globe,0,0,0,.22,.22,.22);
  cylinder(finial,gold,0,-.16,0,.18,.22,.12,12);
  const light=new T.PointLight('#ffab57',39,12,1.65);light.position.set(0,1.62,0);g.add(light);
  const floorLight=pool(p,x,y+.065,z,5.7,'#f5a768',.24);
  const unlitBulbs=new T.Color('#624459'),warmBulbs=new T.Color('#ffd383');
  return {g,canopy,plinth,drum,seatAsset,get landingReady(){return landingReady;},setLit(amount:number){
    wake=amount;
    for(const glass of glassMaterials)glass.emissiveIntensity=.36+amount;
    if(printedSilk)printedSilk.emissiveIntensity=.24+.86*amount;
    light.intensity=14+84*amount;
    floorLight.material.opacity=.08+.28*amount;
    globe.emissiveIntensity=.04+1.18*amount;
    lights.material.color.lerpColors(unlitBulbs,warmBulbs,amount);
  },update(t:number){
    deck.rotation.y=t*.084;
    horses.forEach((o,i)=>o.position.y=.73+.115*Math.sin(t*1.7+i*1.78));
  }};

}
export type Carousel=ReturnType<typeof makeCarousel>;

// Share the paint and skinned geometry while giving each walker independent joints.
const residentSources=new Map<string,Promise<T.Group>>();
function residentSource(name:string){
  let source=residentSources.get(name);
  if(!source){
    source=new GLTFLoader().loadAsync(import.meta.env.BASE_URL+'models/'+name+'.glb').then(gltf=>gltf.scene);
    residentSources.set(name,source);
  }
  return source;
}

function person(p:Parent,coat:string,hat:string,scale=1,asset:{name:string;lamplighter?:boolean}){
  const root=group(p),g=group(root),c=mat(coat,'cloth'),a=mat(hat,'cloth'),face=mat('#d8b698'),boot=mat('#544259','wood');
  cylinder(g,c,0,.50,0,.145,.234,.50,10).rotation.z=-.06;
  ball(g,face,.022,.91,0,.132,.16,.13);
  ball(g,a,.014,1.027,0,.147,.091,.147);
  ball(g,a,-.021,1.117,-.035,.053,.065,.054);
  cylinder(g,a,.018,.777,0,.167,.168,.075,10);
  box(g,a,-.143,.69,-.023,.074,.22,.10).rotation.z=-.51;
  const arms=Array.from({length:2},(_,i)=>box(g,c,(i?1:-1)*.171,.514,0,.092,.29,.11));
  const feet=Array.from({length:2},(_,i)=>box(g,boot,(i?1:-1)*.10,.13,.02,.106,.242,.125));
  root.scale.setScalar(scale);
  g.visible=false;
  const resident={g:root,feet:feet as T.Object3D[],arms:arms as T.Object3D[],ready:Promise.resolve('fallback')};
  resident.ready=residentSource(asset.name).then(source=>{
    const scene=cloneRig(source);
    const bones=['Leg0','Leg1','Arm0','Arm1'].map(name=>scene.getObjectByName(name));
    if(bones.some(b=>!b))throw new Error('Resident joints are incomplete');
    const [leftFoot,rightFoot,leftArm,rightArm]=bones as T.Object3D[];
    leftArm.rotation.z=.28;rightArm.rotation.z=-.28;
    resident.feet=[leftFoot,rightFoot];resident.arms=[leftArm,rightArm];
    if(asset.lamplighter){
      const hand=group(rightArm,.13,-.34,.12);
      const bail=new T.Mesh(new T.TorusGeometry(.092,.012,6,20),mat('#a07a4a'));
      hand.add(bail);
      lantern(hand,0,-.39,0,.53,false);
      batch(hand,false);
    }
    scene.scale.setScalar(.83);
    g.removeFromParent();root.add(scene);
    return asset.lamplighter?'plaza-lamplighter':asset.name;
  }).catch(error=>{g.visible=true;console.warn('Resident',error);return 'fallback';});
  return resident;
}
function cat(p:Parent,load:()=>ReturnType<GLTFLoader['loadAsync']>){
  const g=group(p);
  const contact=pool(g,0,.005,0,.31,'#332a40',.36);
  contact.scale.x=.63;
  g.visible=false;
  let mixer:T.AnimationMixer|undefined;
  const ready=load().then(({scene,animations})=>{
    const walk=T.AnimationClip.findByName(animations,'Walk');
    if(!walk)throw new Error('Plaza cat walking clip is missing');
    scene.scale.setScalar(1.35);
    g.add(scene);g.visible=true;
    mixer=new T.AnimationMixer(scene);
    mixer.clipAction(walk).play();
    return 'polyfork-cat';
  }).catch(error=>{console.warn('Plaza cat',error);return 'unavailable';});
  return {g,ready,update:(delta:number,speed:number)=>mixer?.update(delta*speed/.56)};
}
function sky(scene:T.Scene){
  scene.fog=new T.FogExp2('#4c5874',.0178);
  const sky=mesh(scene,new T.SphereGeometry(122,48,32),new T.ShaderMaterial({side:T.BackSide, depthWrite:false,
    vertexShader:`varying vec3 dir;void main(){dir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`varying vec3 dir;
      void main(){vec3 d=normalize(dir);float s=smoothstep(-.02,.70,d.y);
      float haze=exp(-abs(d.y-.09)*9.)*pow(max(0.,dot(normalize(vec3(-.65,.13,-.74)),d)),3.);
      vec3 c=mix(vec3(.207,.259,.393),vec3(.039,.059,.134),s)+haze*vec3(.16,.078,.064);
      float x=atan(d.x,-d.z), y=d.y;
      float w=sin(x*4.2+1.4*sin(y*18.))+sin(x*11.+y*25.)*.48+sin(x*29.+y*37.)*.21;
      float a=(y-.16+sin(x*2.4)*.036)*12.; float streak=exp(-a*a)*smoothstep(.35,1.38,w);
      float b=(y-.29+sin(x*3.)*.045)*16.; float curl=exp(-b*b)*smoothstep(.48,1.2,-w);
      c+=streak*vec3(.113,.056,.058)+curl*vec3(.058,.029,.042);
      float noise=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453);
      gl_FragColor=vec4(c+(noise-.5)*.021,1.);}`}));
  // Draw the procedural sky after opaque geometry so covered pixels
  // can fail the depth test before running its fragment shader.
  sky.renderOrder=100;
  const moonPos=v(-35,26,-103);
  const halo=pool(scene,moonPos.x,moonPos.y,moonPos.z,21,'#ffdcaf',.22);halo.rotation.set(0,0,0);halo.lookAt(v(0,5,10)); halo.material.fog=false;
  const moon=mesh(scene,new T.CircleGeometry(7.4,80),new T.MeshBasicMaterial({color:'#fff4dc',map:painted('moon'),fog:false,toneMapped:false}),moonPos.x,moonPos.y,moonPos.z);moon.lookAt(v(0,5,10));
  const r=rand(823), a=[];
  for(let i=0;i<410;i++){const angle=r()*6.283,el=.20+r()*1.1;
    a.push(95*Math.cos(angle)*Math.cos(el),95*Math.sin(el),95*Math.sin(angle)*Math.cos(el));}
  const g=new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(a,3));
  scene.add(new T.Points(g,new T.PointsMaterial({color:'#f6d6b9',size:.13,opacity:.72,transparent:true,fog:false,depthWrite:false})));
}
export function batch(root:T.Group,staticShadows=true,zoneHeavyMeshes=false){
  root.updateWorldMatrix(true,true);
  const inverse=new T.Matrix4().copy(root.matrixWorld).invert();
  const groups=new Map<T.Material,{geometry:T.BufferGeometry;source:T.Mesh}[]>();
  const transform=new T.Matrix4();
  root.traverse(obj=>{
    if(!(obj instanceof T.Mesh)||Array.isArray(obj.material)||obj.material.transparent) return;
    const single=obj.geometry.clone();
    for(const key of Object.keys(single.attributes))if(!['position','normal','uv'].includes(key))single.deleteAttribute(key);
    if(!single.attributes.normal)single.computeVertexNormals();
    if(!single.attributes.uv)single.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(single.attributes.position.count*2),2));
    if(!single.index)single.setIndex(Array.from({length:single.attributes.position.count},(_,i)=>i));
    single.applyMatrix4(transform.multiplyMatrices(inverse,obj.matrixWorld));
    if(!groups.has(obj.material))groups.set(obj.material,[]);
    groups.get(obj.material)!.push({geometry:single,source:obj});
  });
  const merged=group(root);
  for(const [material,all] of groups){
    // Split only expensive, geographically dispersed materials. In particular
    // a sidewalk stone on the far bank need not send every stone in town.
    const zones=new Map<string,typeof all>();
    if(zoneHeavyMeshes&&all.reduce((n,p)=>n+p.geometry.index!.count,0)>45000){
      for(const part of all){
        part.geometry.computeBoundingSphere();
        const {x,z}=part.geometry.boundingSphere!.center;
        const key=Math.floor((x+9)/18)+','+Math.floor((z+9)/18);
        if(!zones.has(key))zones.set(key,[]);
        zones.get(key)!.push(part);
      }
    }else zones.set('all',all);
    for(const parts of zones.values()){
      const g=mergeGeometries(parts.map(part=>part.geometry));
      if(!g)continue;
      const combined=mesh(merged,g,material);
      combined.matrixAutoUpdate=false;
      if(staticShadows){
        combined.castShadow=true;
        combined.layers.enable(1);
        combined.receiveShadow=material.userData.staticReceiveShadow!==false;
      }
      // The merged mesh now owns these triangles. Leaving the original
      // nodes hidden still costs a recursive world-matrix update each frame.
      for(const {source} of parts){
        const parent=source.parent;
        source.removeFromParent();
        let empty=parent;
        while(empty instanceof T.Group&&empty!==root&&empty.children.length===0){
          const ancestor=empty.parent;
          empty.removeFromParent();
          empty=ancestor;
        }
      }
    }
  }
}
export function createWorld(scene:T.Scene,loadTownDetail:Promise<void>){
  const lampView=lampSightline();
  sky(scene);
  const skyLight=new T.HemisphereLight('#bbd1ed','#3d4654',.88);scene.add(skyLight);
  const moon=new T.DirectionalLight('#bcd4ff',1.70);moon.position.set(-10,21,-15);scene.add(moon);
  moon.castShadow=true;moon.shadow.mapSize.set(2048,2048);moon.shadow.camera.layers.set(1);moon.shadow.camera.left=-25;moon.shadow.camera.right=25;moon.shadow.camera.top=22;moon.shadow.camera.bottom=-22;moon.shadow.camera.far=64;moon.shadow.bias=-.00045;moon.shadow.normalBias=.021;moon.shadow.intensity=.76;moon.shadow.autoUpdate=false;moon.shadow.needsUpdate=true;
  const air=scene.fog as T.FogExp2;
  const townAir=air.color.clone(),titleAir=new T.Color('#415578');
  const bounce=new T.DirectionalLight('#d3cde4',.23);bounce.position.set(12,5,9);scene.add(bounce);
  // Retain the established scenery sequence after removing individual road stones.
  const staticWorld=group(scene),life=group(scene),r=rand(885714791), smokes:T.Vector3[]=[];
  terrain(scene);
  laySnowboundStreets(scene,ground,canal);
  const water=canalSurface(ground);
  ribbon(scene,Array.from({length:12},(_,i)=>v(canal(i*6-33),0,i*6-33)),5.55,water,()=>canalWaterLevel,145);
  staticWorld.name='Town static';
  const oldBridge=buildCanalBridge(scene,canal(4),4);
  oldBridge.name='Stone bridge';oldBridge.scale.z=stoneDeckHalfWidth/.94;batch(oldBridge);
  const newBridge=group(scene);
  const formNorthBridge=makeNorthCrossing(newBridge,scene,canal(northBridgeZ),northBridgeZ);
  newBridge.visible=false;
  const pier=v(canal(northBridgeZ)-2.94,0,northBridgeZ+northDeckOffset(-2.94));
  const broken=group(staticWorld,pier.x,ground(pier.x,pier.z),pier.z);
  box(broken,wood,0,.34,0,.36,.66,.42);
  box(broken,dark,.18,.25,0,.31,.47,1.41);
  lantern(broken,-.31,.26,.64,.58,false);
  woodenSign(broken,'pier',0,.78,.34,1.02,.37);
  const beacon=group(scene,14.97,ground(14.97,-12.98),-12.98);
  const lanternScaffold=group(beacon);
  cylinder(lanternScaffold,stone,0,.48,0,1.17,1.38,.97,11);
  cylinder(lanternScaffold,mat('#8d7187','stone-detail'),0,2.18,0,.64,.95,3.43,8);
  cylinder(lanternScaffold,wood,0,3.90,0,.83,.74,.25,10);
  cylinder(lanternScaffold,mat('#735b77','wood'),0,5.17,0,.13,.99,1.59,10);
  cylinder(lanternScaffold,snow,0,5.31,0,.095,.89,1.35,10);
  for(let i=0;i<8;i++){
    const a=i*Math.PI/4;
    box(lanternScaffold,dark,Math.cos(a)*.66,4.43,Math.sin(a)*.66,.11,1.02,.11);
  }
  const beaconLoader=new GLTFLoader();
  const modelRoot=import.meta.env.BASE_URL+'models/';
  const lighthouse=Promise.all([
    beaconLoader.loadAsync(modelRoot+'homeward-lighthouse.glb'),
    beaconLoader.loadAsync(modelRoot+'north-bank-fittings.glb').catch(()=>null),
  ]).then(([{scene:asset},fittings])=>{
    if(fittings)dressBeacon(asset,fittings.scene,beaconLight.position);
    asset.traverse(object=>{
      if(object instanceof T.Mesh){
        object.castShadow=true;
        object.layers.enable(1);
      }
    });
    beacon.add(asset);
    lanternScaffold.visible=false;
    moon.shadow.needsUpdate=true;
    return true;
  }).catch(error=>{console.warn('Homeward lighthouse unavailable',error);return false;});
  for(let i=0;i<4;i++)box(beacon,stone,-.01,.10+i*.15,1.51-i*.19,1.15,.22,.32);
  const beaconGlow=ball(scene,glow('#edbc75',.12),14.97,ground(14.97,-12.98)+4.44,-12.98,.23,.29,.23);
  const beaconLight=new T.PointLight('#ffbf7e',0,16,1.62);
  beaconLight.position.copy(beaconGlow.position);scene.add(beaconLight);
  for(const {x,z,scale} of canalLanterns)lampView.build(staticWorld,post=>riversideLantern(post,x,ground(x,z),z,scale));
  pool(scene,4.10,ground(4.10,-11.84)+.085,-11.84,1.65,'#eeb37e',.19);
  const passageGate=group(scene,marketPass.x,ground(marketPass.x,marketPass.z),marketPass.z);
  box(passageGate,wood,0,.54,0,2*marketPass.halfWidth,.15,.19);
  for(const side of [-1,1])box(passageGate,dark,side*marketPass.halfWidth,.43,0,.16,.91,.18);
  for(let i=0;i<31;i++){
    const x=12.1+i*.45,z=-7.25+.09*Math.sin(i*1.6),y=ground(x,z);
    if(Math.abs(x-marketPass.x)<marketPass.halfWidth+.21)continue;
    const block=box(staticWorld,stone,x,y+.29,z,.47,.63,.62);block.rotation.y=.12*Math.sin(i*.8);
    ball(staticWorld,snow,x,y+.60,z,.245,.084,.35,true);
  }
  // The final signal gives the opposite bank a visible route home.
  const returnPosts=group(scene);
  const returnRoute=[
    [10.50,-9.36],[12.1,-9.96],[13.27,-10.80],[15.45,-8.10],
    [16.7,-5.40],[17.44,-2.30],[18.13,.45],[19.16,3.42],
  ].map(([x,z])=>{
    const glowMat=lampView.build(returnPosts,post=>riversideLantern(post,x,ground(x,z),z,.80,true));
    const halo=pool(scene,x,ground(x,z)+.11,z,2.10,'#f4b273',0);
    glowMat.emissiveIntensity=.025;
    return {glowMat,halo};
  });
  batch(returnPosts,false);
  const signal=group(scene,14.97,ground(14.97,-12.98)+4.44,-12.98);
  const signalMaterial=new T.MeshBasicMaterial({color:'#d5bd8e',transparent:true,opacity:.035,
    side:T.DoubleSide,depthWrite:false,blending:T.AdditiveBlending});
  const cone=mesh(signal,new T.ConeGeometry(1.15,15,24,1,true),signalMaterial,0,0,7.5);
  cone.rotation.x=-Math.PI/2;signal.visible=false;
  const finalePools=[
    [4.5,-10.2,2.6],[12.35,-10,2.4],[17.95,3.80,3.2],[-8.76,-16.17,2.3],[-.25,5.45,3.05],
  ].map(([x,z,range])=>pool(scene,x,ground(x,z)+.126,z,range,'#f6aa71',0));
  const finaleLamplights=[[17.95,3.80],[-8.76,-16.17]].map(([x,z])=>{
    const light=new T.PointLight('#ffbf8c',0,9,1.72);
    light.position.set(x,ground(x,z)+2.35,z);
    scene.add(light);return light;
  });
  let bridgeOpen=false,ending=false;

  const banks:BankStone[]=[];
  for(let i=0;i<175;i++){
    // Preserve the street seed sequence while rebuilding the original bank dressing.
    const z=(r()-.5)*63,side=r()<.5?-1:1,offset=1.71+r()*.58;
    if(Math.abs(z-4)<1.36||Math.abs(z-northBridgeZ)<2.1)continue;
    const width=.14+r()*.35,height=.14+r()*.18;
    if(i%3!==0)continue;
    banks.push({z,side,offset,width:width*.93,height:height*1.08,seed:i});
    if(i%4===0)banks.push({z:z+.28,side,offset:offset-.13,width:width*.63,height:height*.77,seed:i+1});
  }
  const exposedBanks=[
    {side:-1,z:6.65,size:.47},{side:-1,z:8.95,size:.38},
    {side:1,z:6.58,size:.55},{side:1,z:8.10,size:.38},{side:1,z:10.35,size:.49},
    {side:-1,z:-7.4,size:.45},{side:1,z:-8.1,size:.41},
  ];
  exposedBanks.forEach(({side,z,size},i)=>{
    banks.push({side,z,offset:1.87,width:size,height:size*.83,seed:420+i});
    banks.push({side,z:z+.29,offset:2.09,width:size*.74,height:size*.59,seed:431+i});
    banks.push({side,z:z+.52,offset:1.95,width:size*.43,height:size*.37,seed:443+i});
  });
  buildRiverBanks(staticWorld,canal,ground,banks);
  const specs=[
    {featured:true,x:-7,z:-4.42,w:4.22,d:3.35,h:3.05,r:2.10,wall:'#cca781',roof:'#805649',seed:41,style:'post',ry:.14},
    {featured:true,x:-3.15,z:-10.0,w:2.95,d:2.88,h:5.57,r:2.36,wall:'#c3b298',roof:'#4e5d77',seed:5,style:'tower',ry:-.10},
    {featured:true,x:1.37,z:-9.65,w:3.66,d:3.57,h:3.11,r:1.73,wall:'#83a1a2',roof:'#4e5269',seed:36,style:'shop',ry:.12},
    {featured:true,x:6.40,z:-5.90,w:2.98,d:2.65,h:3.35,r:1.56,wall:'#c19988',roof:'#654b57',seed:3,style:'inn',ry:-.18},
    {x:15.99,z:-.62,w:2.82,d:3.05,h:2.96,r:1.66,wall:'#ad929c',roof:'#5f617a',seed:39,style:'mill',ry:-.22},
    {x:-12.1,z:-9.4,w:3.23,d:3.02,h:3.0,r:1.69,wall:'#86849f',roof:'#6b516d',seed:54,style:'home',ry:.44},
    {x:19.45,z:-1.48,w:4.15,d:3.32,h:3.18,r:1.55,wall:'#bd9175',roof:'#695875',seed:140,style:'shop',ry:-.39},
    {x:22.4,z:1.2,w:3.24,d:2.45,h:3.17,r:1.8,wall:'#74848c',roof:'#637381',seed:141,style:'home',ry:-.48},
    {x:21.10,z:10.69,w:3.8,d:2.60,h:2.7,r:1.50,wall:'#ae8496',roof:'#75546d',seed:142,style:'inn',ry:2.88},
    {x:-10.85,z:-12.75,w:3.38,d:2.20,h:2.52,r:1.80,wall:'#9c8799',roof:'#6a6384',seed:143,style:'home',ry:.49},
    {x:-2.85,z:-15.1,w:3.1,d:2.10,h:2.6,r:1.6,wall:'#829597',roof:'#67556c',seed:144,style:'home',ry:.28},
  ] as const;
  const loader=new GLTFLoader();
  const townModel=(file:string)=>loader.loadAsync(import.meta.env.BASE_URL+'models/'+file);
  const scenerySources=new Map<string,Promise<T.Group>>();
  function scenerySource(file:string){
    let source=scenerySources.get(file);
    if(!source){
      const model=(file.startsWith('winterbank-fir')||file==='aholo-g1-market')?townModel(file+'.glb'):loadTownDetail.then(()=>townModel(file+'.glb'));
      source=model.then(({scene})=>scene);
      scenerySources.set(file,source);
    }
    return source;
  }
  const distantMeshes:{mesh:T.Mesh;near:T.BufferGeometry;far:T.BufferGeometry;focus:T.Vector3;distance:number}[]=[];
  function registerDistanceMesh(asset:T.Group,file:string,distance:number,suffix='-distance',prepare?:(geometry:T.BufferGeometry)=>void){
    void scenerySource(file+suffix).then(source=>{
      const findMesh=(root:T.Group)=>{
        let result:T.Mesh|undefined;
        root.traverse(o=>{if(o instanceof T.Mesh)result=o;});
        return result;
      };
      const mesh=findMesh(asset), far=findMesh(source);
      if(!mesh||!far)throw new Error(file+' missing its distance geometry');
      prepare?.(far.geometry);
      const focus=new T.Box3().setFromObject(asset).getCenter(v(0,0,0));
      distantMeshes.push({mesh,near:mesh.geometry,far:far.geometry,focus,distance});
    }).catch(error=>console.warn('Distance mesh '+file,error));
  }
  const relief=group(scene);
  let clockwork:NonNullable<ReturnType<typeof house>['clockwork']>|undefined;
  const clockFittings:Promise<boolean>[]=[];
  const generatedFacades:Promise<string>[]=[];
  const streetFittings:Promise<boolean>[]=[];
  const district:T.MeshStandardMaterial[][]=[];
  const titleWindows:{pane:T.MeshStandardMaterial;intensity:number}[]=[];
  const signs:Partial<Record<number,string>>={3:'冬夜旅店',6:'河岸茶铺',8:'渡灯客舍'};
  for(const [index,a] of specs.entries()){
    const position={...a,y:ground(a.x,a.z)-.16};
    const mayReplace=index<3;
    // Batch each replaceable building separately so a model swap never hides
    // unrelated scenery or independently mounted clockwork.
    const buildingParent=mayReplace?group(scene):staticWorld;
    const h=a.style==='shop'||a.style==='inn'||a.style==='home'||a.style==='mill'
      ? plazaBuilding(buildingParent,position,a.style,signs[index])
      : house(buildingParent,position);
    smokes.push(h.smoke);
    if(h.clockwork){
      clockwork=h.clockwork;
      scene.attach(h.clockwork.dial);
      scene.attach(h.clockwork.socket);
      for(const moving of [...h.clockwork.hands,h.clockwork.key])scene.attach(moving);
      for(const {mount,fallback,file} of h.clockwork.fittings){
        scene.attach(mount);
        clockFittings.push(loader.loadAsync(import.meta.env.BASE_URL+'models/'+file).then(({scene:asset})=>{
          asset.traverse(object=>{
            if(object instanceof T.Mesh){object.castShadow=true;object.receiveShadow=true;object.layers.enable(1);}
          });
          mount.add(asset);fallback.removeFromParent();moon.shadow.needsUpdate=true;return true;
        }).catch(error=>{console.warn('Belfry fitting '+file,error);return false;}));
      }
    }
    if(h.glazing.length&&index<4)district.push(h.glazing);
    else if(h.glazing[0])titleWindows.push({pane:h.glazing[0],intensity:h.glazing[0].emissiveIntensity});
    if(a.style==='post'){
      relief.position.copy(h.root.localToWorld(v(0,a.h+.03,a.d/2+.24)));
      relief.rotation.y=a.ry;relief.scale.setScalar(.64);
    }
    if(mayReplace){
      batch(buildingParent);
      const role=index===0?'workshop':index===1?'clock':'bookshop';
      const generated=group(scene,a.x,position.y,a.z);generated.name=role;generated.rotation.y=a.ry;
      const file=role==='workshop'?'aholo-workshop-carpenter.glb':'aholo-g1-'+role+'.glb';
      const facade=townModel(file);
      generatedFacades.push(facade.then(({scene:asset})=>{
        if(role==='workshop'){
          woodenSign(generated,'workshop',-.05,2.83,1.58,2.35,.55);
          for(const x of [-.88,.78])beam(generated,dark,v(x,2.84,1.20),v(x,2.84,1.61),.077);
          const lamp=group(generated,-1.42,1.89,1.49);
          beam(lamp,dark,v(0,.23,-.13),v(0,.23,.23),.050);
          lantern(lamp,0,-.49,.26,.60,false);
        }else if(role==='clock'){
          asset.scale.set(.97,.74,1.47);
          asset.position.set(0,4.44,.235);
          asset.traverse(object=>{if(object instanceof T.Mesh)retainClockBelfry(object.geometry);});
          batch(buildClockMasonry(generated,asset));
          woodenSign(generated,'clock',0,2.37,1.74,.87,.25);
          const panel=h.clockwork!;
          for(const fitting of panel.fittings)fitting.mount.visible=false;
        }else{
          asset.scale.set(.83,.80,.94);
          asset.position.set(0,2.38,0);
          box(generated,storybookPBR('carved-wood','#66432d'),.22,1.99,1.79,2.67,.30,.08);
          woodenSign(generated,'bookshop',.21,2.02,1.82,2.64,.52);
        }
        asset.traverse(o=>{
          if(o instanceof T.Mesh){o.castShadow=true;o.receiveShadow=true;o.layers.enable(1);}
        });
        generated.add(asset);buildingParent.visible=false;moon.shadow.needsUpdate=true;
        if(role!=='workshop')registerDistanceMesh(asset,'aholo-g1-'+role,role==='clock'?24:17,'-distance',role==='clock'?retainClockBelfry:undefined);
        return role;
      }).catch(error=>{console.warn('Aholo '+role,error);return 'fallback';}));
    }
    if(!('featured' in a)){
      const px=a.x+.40,pz=a.z+a.d/2+1;
      pool(scene,px,ground(px,pz)+.10,pz,2.1,'#fbb472',.20);
    }
  }
  const cottage=group(scene,-11.38,ground(-11.38,-.18)-.16,-.18);
  const cottageFallback=group(cottage);
  cottageFallback.rotation.y=.30;
  house(cottageFallback,{x:0,y:0,z:0,w:3,d:3,h:2.6,r:1.7,wall:'#8e778c',roof:'#6c5871',seed:76,style:'home'});
  batch(cottageFallback);
  const fittings=loader.loadAsync(import.meta.env.BASE_URL+'models/workshop-relief.glb').then(glb=>{
    glb.scene.traverse(obj=>{
      if(obj instanceof T.Mesh){obj.castShadow=true;obj.receiveShadow=true;obj.layers.enable(1);}
    });
    relief.add(glb.scene);moon.shadow.needsUpdate=true;return true;
  }).catch(error=>{console.warn('Workshop relief unavailable',error);return false;});
  const asset=loadTownDetail.then(()=>townModel('storybook-cottage.glb')).then(glb=>{
    const model=glb.scene;model.traverse(o=>{if(o instanceof T.Mesh){o.castShadow=true;o.layers.enable(1);o.receiveShadow=true;}});moon.shadow.needsUpdate=true;const bounds=new T.Box3().setFromObject(model),size=bounds.getSize(v(0,0,0)),mid=bounds.getCenter(v(0,0,0)),s=4.4/size.y;
    model.scale.setScalar(s);model.position.set(-mid.x*s,-bounds.min.y*s,-mid.z*s);
    cottageFallback.removeFromParent();cottage.add(model);cottage.rotation.y=.30;return true;
  }).catch(e=>{ console.warn('Lux3D cottage unavailable',e);
    return false;});
  const ridge=group(scene);ridge.name='North ridge cottages';
  for(let j=0;j<10;j++){
    const x=-25+j*5.7,z=-22-r()*9;
    ridgeCottage(ridge,{x,y:ground(x,z)-.05,z,w:2.5+r()*2,d:2.2+r()*2,h:2.25+r()*2.15,r:1.36+r(),ry:(r()-.5)*.6},j);
  }
  batch(ridge,true,true);
  function replaceScenery(file:string,mount:T.Group,width:number,height:number,depth:number,yaw:number){
    return scenerySource(file).then(source=>{
      const asset=source.clone();
      fitToFootprint(asset,width,height,depth);
      asset.traverse(object=>{
        if(object instanceof T.Mesh){object.castShadow=true;object.receiveShadow=true;object.layers.enable(1);}
      });
      lampView.apply(asset);
      mount.clear();mount.name=file;mount.rotation.y=yaw;mount.add(asset);moon.shadow.needsUpdate=true;
      if(file==='aholo-g1-market')registerDistanceMesh(asset,file,13);
      if(file==='aholo-g1-fir')registerDistanceMesh(asset,file,14,'-mid');
      return file;
    }).catch(error=>{console.warn('Scenery '+file,error);return 'fallback';});
  }
  const nearTrees=[[-12.0,12.6,6.7],[-14.6,11.6,5.3],[15.4,12.0,5.5],[-14,5,5.8],[-10.8,7,4.1],[-12.3,-5,5.3],[-11.4,-13,4.9],[-6,-11.9,5.1],[3.2,-13,5.2],[7.6,-9,4.5],[17.35,-4.95,4.3],[16,-5.7,5.5],[17.2,6.1,4.6],[15.6,9.7,6],[17.9,10.5,4.0],[-6.8,11,3.3],[-17,-3,7.1],[12.6,10.9,4.9],[-2.4,-3.9,2.55],[4.8,-13.8,4.6],[4.30,-2.97,3.35],[3.6,-3.40,1.75]];
  type FirPlacement={x:number;y:number;z:number;h:number;width:number;yaw:number;lean:number};
  type FirPatch={fallback:T.Group;placements:FirPlacement[]};
  function addFir(patches:Map<string,FirPatch>,cellSize:number,x:number,y:number,z:number,h:number,seed:number,near=false){
    const cell=`${Math.floor(x/cellSize)},${Math.floor(z/cellSize)}`;
    let patch=patches.get(cell);
    if(!patch){patch={fallback:group(scene),placements:[]};patches.set(cell,patch);}
    const rng=rand(seed);
    patch.placements.push({x,y,z,h,width:h*(.41+rng()*.14),yaw:rng()*Math.PI*2,lean:(rng()-.5)*.10});
    tree(patch.fallback,x,y,z,h,seed,near);
  }
  function firGeometry(source:T.Group){
    const model=source.clone();
    let mesh:T.Mesh|undefined;
    model.traverse(o=>{if(o instanceof T.Mesh)mesh=o;});
    if(!mesh)throw new Error('Fir geometry unavailable');
    fitToFootprint(model,1,1,1);
    model.updateMatrixWorld(true);
    return mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
  }
  const paintedFrost=new T.MeshStandardMaterial({vertexColors:true,roughness:.96});
  const paintedBough=storybookPBR('snow','#fff');
  paintedBough.vertexColors=true;
  paintedBough.normalScale.setScalar(.19);
  const firDetail:{near:T.InstancedMesh;far:T.InstancedMesh;center:T.Vector3}[]=[];
  function mountFirPatches(lod:'mid'|'distant',patches:FirPatch[]){
    const name=lod==='mid'?'winterbank-fir-near':'winterbank-fir';
    return Promise.all([scenerySource(name),scenerySource('winterbank-fir')]).then(([source,distant])=>{
      const geometry=firGeometry(source);
      const distantGeometry=lod==='mid'?firGeometry(distant):undefined;
      const pose=new T.Object3D();
      for(const {fallback,placements} of patches){
        const stand=new T.InstancedMesh(geometry,lod==='mid'?paintedBough:paintedFrost,placements.length);
        for(const [index,{x,y,z,h,width,yaw,lean}] of placements.entries()){
          pose.position.set(x,y,z);pose.rotation.set(0,yaw,lean);pose.scale.set(width,h,width*.92);
          pose.updateMatrix();stand.setMatrixAt(index,pose.matrix);
        }
        stand.name=name;stand.computeBoundingSphere();stand.receiveShadow=true;stand.castShadow=lod==='mid';
        if(stand.castShadow)stand.layers.enable(1);
        scene.add(stand);
        if(distantGeometry){
          const far=new T.InstancedMesh(distantGeometry,paintedFrost,placements.length);
          far.name='winterbank-fir';far.instanceMatrix=stand.instanceMatrix;
          far.receiveShadow=true;far.visible=false;
          far.boundingSphere=stand.boundingSphere;
          scene.add(far);
          firDetail.push({near:stand,far,center:stand.boundingSphere!.center});
        }
        fallback.removeFromParent();
        fallback.traverse(o=>{if(o instanceof T.Mesh)o.geometry.dispose();});
      }
      moon.shadow.needsUpdate=true;
      return name;
    }).catch(error=>{console.warn('Scenery '+name,error);return 'fallback';});
  }
  // Keep the original Aholo tree at the workshop corner. The river and
  // hillside use the painted cedar family with matching distance silhouettes.
  const firIndex=18;
  const scenery:Promise<string>[]=[];
  const midFir=new Map<string,FirPatch>();
  const edgeFirs:{x:number;y:number;z:number;h:number;yaw:number;variant:number;aspect:number}[]=[];
  const edgeFallback=group(scene);
  const edgeTrees=new Map([[0,1],[1,0],[3,2],[4,0],[5,3],[6,2],[8,1],[10,3],[12,0],[13,1],[14,2],[16,1],[19,3]]);
  nearTrees.forEach(([x,z,h],i)=>{
    const y=ground(x,z);
    if(i===firIndex||i>=20){
      const mount=group(scene,x,y,z);
      tree(mount,0,0,0,h,i*31+11,true);
      scenery.push(replaceScenery('aholo-g1-fir',mount,h*.52,h,h*.52,i===firIndex?0:.78*i));
    }else if(edgeTrees.has(i)){
      const variant=edgeTrees.get(i)!;
      edgeFirs.push({x,y,z,h,yaw:.87*i,variant,aspect:[.61,.36,.51,.46][variant]});
      tree(edgeFallback,x,y,z,h,31*i+11,true);
    }else{
      addFir(midFir,8,x,y,z,h,i*31+11,true);
    }
  });
  batch(edgeFallback);
  scenery.push(Promise.all((['skyline-snow-pine','skyline-pine','skyline-uneven-pine'] as const)
    .map(file=>townModel(file+'.glb'))).then(([snowFir,pines,leaningFir])=>{
      scene.add(skylineFirs([snowFir.scene,pines.scene,leaningFir.scene],edgeFirs));
      edgeFallback.removeFromParent();
      edgeFallback.traverse(o=>{if(o instanceof T.Mesh)o.geometry.dispose();});
      moon.shadow.needsUpdate=true;
      return 'quaternius-snowline';
    }).catch(error=>{console.warn('Snowline trees unavailable',error);return 'fallback';}));
  // A pair of pruned specimen firs frame the workshop and bookseller's yards.
  // Reuse the Aholo mid-distance crown and its original paint for both trees.
  void Promise.all([scenerySource('aholo-g1-fir'),scenerySource('aholo-g1-fir-mid')]).then(([paintedFir,low])=>{
    const paint=paintedFir.getObjectByProperty('isMesh',true) as T.Mesh;
    for(const [x,z,h,yaw] of [[-10.05,-2.57,3.70,.73],[3.74,-7.54,3.17,2.08]]){
      const fir=low.clone();
      fir.traverse(o=>{if(o instanceof T.Mesh){o.material=paint.material;o.receiveShadow=true;}});
      lampView.apply(fir);
      fitToFootprint(fir,h*.46,h,h*.47);
      const roots=group(scene,x,ground(x,z)-.035,z);roots.rotation.y=yaw;roots.add(fir);
    }
  }).catch(error=>console.warn('Workshop street firs',error));
  const forest=new Map<string,FirPatch>();
  for(let i=0;i<145;i++){
    const a=.03+r()*Math.PI*2,rad=22+r()*32,x=Math.cos(a)*rad,z=Math.sin(a)*rad;
    if(x>14&&x<26&&z> -7&&z<13)continue;
    const height=2.0+r()*5.3;
    const clearing=Math.sin(a*11+.6)+.35*Math.cos(a*23);
    if(rad>29&&clearing<-.45&&i%3!==0)continue;
    addFir(forest,24,x,ground(x,z)-.13,z,height*(.88+.2*Math.cos(a*7+rad*.11)),i+181);
  }
  for(const patch of forest.values())batch(patch.fallback,false);
  scenery.push(mountFirPatches('distant',[...forest.values()]));
  // Retain the original distribution of downstream street props.
  for(let i=0;i<80;i++)r();
  const ridges=townModel('teton-skyline.glb').catch(()=>townModel('alpine-cirque.glb')).then(({scene:massif})=>{
    const wash=new T.MeshBasicMaterial({vertexColors:true,fog:false,toneMapped:false,side:T.DoubleSide});
    massif.traverse(part=>{if(part instanceof T.Mesh)part.material=wash;});
    scene.add(massif);
    return true;
  }).catch(error=>{console.warn('Alpine horizon unavailable',error);return false;});
  const plazaPools:ReturnType<typeof pool>[]=[];
  for(const [x,z] of [[-5.5,4.4],[-2.5,6.2],[3.44,3.65],[6.87,4.9],[13.48,5.3],[3.16,-5.1],[-5.88,-7.2],[-7.88,2.85],[-11.1,9.35]]){
    const y=ground(x,z);
    if(x===3.44&&z===3.65){
      const fixture=group(scene,x,y,z);
      const proxy=group(fixture);
      lampView.build(proxy,post=>lantern(post,0,0,0,.89));
      scenery.push(townModel('plaza-carved-lantern.glb').then(({scene:model})=>{
        const bounds=new T.Box3().setFromObject(model);
        const scale=2.56/(bounds.max.y-bounds.min.y);
        const centre=bounds.getCenter(v(0,0,0));
        model.scale.multiplyScalar(scale);
        model.position.set(-centre.x*scale,-bounds.min.y*scale,-centre.z*scale);
        lampView.apply(model);
        model.traverse(o=>{if(o instanceof T.Mesh){o.castShadow=true;o.receiveShadow=true;o.layers.enable(1);}});
        fixture.add(model);proxy.removeFromParent();moon.shadow.needsUpdate=true;
        return 'plaza-lantern';
      }).catch(()=> 'fallback'));
    }else if(!canalLanterns.some(light=>light.x===x&&light.z===z))lampView.build(staticWorld,post=>lantern(post,x,y,z,.89));
    plazaPools.push(pool(scene,x,y+.09,z,2.45,'#efad72',.28));
  }
  const plazaLights=[[-4.5,2.8,35],[3.48,3.65,35],[13.35,5.28,36],[-1.53,-6.69,19]].map(([x,z,power])=>{
    const light=new T.PointLight('#ffb16e',power,8,1.68);
    light.position.set(x,ground(x,z)+1.85,z);scene.add(light);
    return {light,power};
  });
  // Short rail and snowbank lead the eye from the approach into the square.
  const lowObstacles:{x:number;z:number;halfX:number;halfZ:number;top:number;angle:number}[]=[];
  const lowObstacle=(x:number,z:number,halfX:number,halfZ:number,top:number,angle=0)=>
    lowObstacles.push({x,z,halfX,halfZ,top,angle});
  for(let i=0;i<13;i++){
    const x=-8.2+i*.56,z=8.05+.18*Math.cos(i*.49),y=ground(x,z);
    riversidePost(staticWorld,x,y,z,i);
    lowObstacle(x,z,.087,.091,y+.70);
    if(i){
      const a=x-.56,b=8.05+.18*Math.cos((i-1)*.49),startY=ground(a,b)+.44;
      riversideRail(staticWorld,v(a,startY,b),v(x,y+.47,z),i);
      lowObstacle((a+x)/2,(b+z)/2,Math.hypot(x-a,z-b)/2,.062,Math.max(startY,y+.47)+.045,-Math.atan2(z-b,x-a));
    }
    if(i%2===0)laySnowLedge(staticWorld,x+.16,y-.05,z+.25,.65,.19,.41,i);
  }
  // The side lane gets a watcher, a pile of firewood and benches rather than a snow void.
  const streetProps=group(staticWorld,-5.3,ground(-5.3,7.18),7.18);
  streetProps.rotation.y=-.27;
  for(const k of [-.59,.61]){
    box(streetProps,stone,k,.20,0,.15,.44,.36);box(streetProps,dark,k,.52,-.17,.10,.53,.11);
  }
  box(streetProps,wood,0,.41,0,1.64,.095,.33);box(streetProps,wood,0,.71,-.19,1.60,.12,.072);
  box(streetProps,snow,0,.454,-.09,1.63,.048,.14);
  const benchFloor=streetProps.position.y;
  lowObstacle(-5.30,7.18,.82,.18,benchFloor+.48,-.27);
  lowObstacle(-5.25,7.00,.81,.057,benchFloor+.77,-.27);
  for(let i=0;i<12;i++){
    const xx=-8.95+(i%4)*.22,zz=2.04+.1*Math.sin(i),y=ground(xx,zz)+.10+Math.floor(i/4)*.14;
    const log=cylinder(staticWorld,i%3?dark:wood,xx,y,zz,.091+(i%3)*.015,.10,.41,7);log.rotation.x=Math.PI/2+(i%4-2)*.12;
    const end=cylinder(staticWorld,gold,xx,y,zz+.21,.061,.07,.016,7);end.rotation.x=Math.PI/2;
  }
  lowObstacle(-8.62,2.04,.45,.30,ground(-8.62,2.04)+.49);
  const flicker=lampView.build(life,post=>lantern(post,2.97,ground(2.97,-2.97),-2.97,.86));
  for(let i=0;i<38;i++){
    const x=(r()-.5)*33,z=(r()-.5)*26;
    if(x*x+z*z<37||Math.abs(x-canal(z))<2.6||(z<2&&z>-7&&x<-4&&x>-11))continue;
    const width=.38+r()*.85,rise=.13+r()*.23,depth=.4+r()*.6;
    const base=ground(x,z);
    laySnowLedge(staticWorld,x,base-.07,z,width,rise,depth,i);
  }
  const stallBounds:{x:number;z:number;cos:number;sin:number;front:number}[]=[];
  function mountGiftStall(stall:T.Group,yaw:number,shades:readonly string[]){
    scenery.push(replaceScenery('aholo-g1-market',stall,1.72,2.15,1.15,yaw).then(source=>{
      if(source==='fallback')return source;
      for(const [i,shade] of shades.entries()){
        const w=[.22,.28,.17][i];
        const parcel=group(stall,(i-1)*.33,.78+w*.43,.24);
        parcel.rotation.y=(i-1)*.22;
        box(parcel,mat(shade,'cloth'),0,0,0,w,w*.80,w*.75);
        box(parcel,gold,0,w*.405,0,w*.19,.014,w*.75);
        box(parcel,gold,0,0,w*.375,w*.19,w*.81,.011);
      }
      moon.shadow.needsUpdate=true;
      return source;
    }));
  }
  for(const [x,z,angle,shades] of [
    [3.6,-1.92,.46,['#667880','#a2595d','#6c7860']],
    [-4.48,-3.35,.94,['#b68f58','#55777d','#a97065']],
  ] as const){
    stallBounds.push({x,z,cos:Math.cos(angle),sin:Math.sin(angle),front:x>0?1.26:.74});
    const stall=group(scene,x,ground(x,z),z);stall.rotation.y=angle;
    box(stall,wood,0,.44,0,1.42,.78,.83);
    box(stall,wood,0,.82,.03,1.53,.091,.99);
    for(const s of [-1,1])for(const k of [-1,1])box(stall,dark,s*.67,1.18,k*.40,.072,2.21,.072);
    box(stall,mat('#80697f','cloth'),0,2.02,0,1.67,.13,1.13).rotation.x=.12;
    box(stall,snow,0,2.101,0,1.71,.065,1.13).rotation.x=.12;
    if(x>0){
      scenery.push(Promise.all([replaceScenery('aholo-g1-market',stall,1.72,2.15,1.15,angle),townModel('plaza-winter-bookseller.glb')]).then(([, {scene:model}])=>{
        model.position.set(0,.04,.63);lampView.apply(model);stall.add(model);
        model.traverse(o=>{if(o instanceof T.Mesh)o.receiveShadow=true;});
        moon.shadow.needsUpdate=true;return 'bookseller';
      }).catch(e=>{console.warn('Plaza bookseller',e);return 'fallback';}));
    }else mountGiftStall(stall,angle,shades);
  }
  const parcel=group(staticWorld,-6.68,ground(-6.68,1.89),1.89);
  for(let i=0;i<4;i++){
    const a=group(parcel,i%2*.44,.22+Math.floor(i/2)*.35,i%2*.13);a.rotation.y=i*.36;
    box(a,mat(i%2?'#859092':'#a16880','cloth'),0,0,0,.44,.35,.38);
    box(a,gold,0,0,.195,.057,.36,.021);box(a,gold,0,.18,0,.058,.024,.39);
  }
  // Each stall has its own trade and recognizable counter dressing.
  for(const [x,z,rotation,shade,trade] of [
    [16.8,1.65,-.13,'#86576a','bakery'],
    [19.1,5.95,3.25,'#4d7778','pottery'],
    [22.32,5.73,3.04,'#935b57','parcel'],
  ] as const){
    riversideStall(staticWorld,x,ground(x,z),z,rotation,shade,trade);
  }
  const garland=new T.CatmullRomCurve3([
    v(17.01,ground(17.01,2.25)+3,2.25),v(18.98,ground(18.98,3.7)+2.64,3.7),v(21.15,ground(21.15,5.42)+3.18,5.42),
  ]);
  mesh(staticWorld,new T.TubeGeometry(garland,24,.022,6,false),dark);
  for(let i=0;i<11;i++){
    const p=garland.getPoint(i/10);
    const lamp=mat(i%3===0?'#b98f83':'#be9b6b','cloth');
    ball(staticWorld,lamp,p.x,p.y-.15,p.z,.118,.161,.102);
    ball(staticWorld,cozy,p.x,p.y-.135,p.z+.073,.055,.074,.034);
  }
  for(const [x,z,angle] of [[17.6,5.77,.3],[23.4,3.0,-.22],[17.46,2.29,.21],[-10.3,-16.54,-.22],[-7.13,-16.80,.1]]){
    const base=group(staticWorld,x,ground(x,z),z);base.rotation.y=angle;
    if(x>0)lampView.build(base,post=>riversideLantern(post,0,0,0,1.01));
    else lampView.build(base,post=>lantern(post,0,0,0,1.01));
    pool(scene,x,ground(x,z)+.14,z,2.35,'#efae7d',.27);
  }
  for(let i=0;i<11;i++){
    const x=16.26+i*.29,z=6.2+.19*Math.cos(i*.6),y=ground(x,z);
    box(staticWorld,wood,x,y+.23,z,.26,.47,.41).rotation.y=.19*Math.sin(i*2.1);
    if(i%3===0)box(staticWorld,gold,x,y+.52,z,.21,.23,.31).rotation.y=-.15;
  }
  // A small ridge pavilion gives the player a lookout distinct from the town squares.
  const hill=group(staticWorld,-9.58,ground(-9.58,-17.53),-17.53);
  cylinder(hill,stone,0,.10,0,1.55,1.74,.36,9);
  cylinder(hill,wood,0,.31,0,1.44,1.48,.16,9);
  for(let i=0;i<6;i++){
    const a=i*Math.PI/3,x=Math.cos(a)*1.22,z=Math.sin(a)*1.22;
    box(hill,dark,x,1.47,z,.14,2.57,.14).rotation.y=a;
    if(i!==1&&i!==2)box(hill,wood,x*.77,.71,z*.77,.48,.13,.18).rotation.y=-a+Math.PI/2;
  }
  cylinder(hill,mat('#776385','wood'),0,2.89,0,.26,1.68,.73,6);
  cylinder(hill,snow,0,3.02,0,.235,1.58,.51,6);
  lantern(hill,.51,1.99,.16,.66,false);
  for(let i=0;i<8;i++){
    const x=-14.5+i*1.10,z=-18.8+.64*Math.sin(i*2.1);
    addFir(midFir,8,x,ground(x,z),z,3.65+.81*Math.sin(i*1.6),303+i,true);
  }
  const marketSign=group(staticWorld,16.24,ground(16.24,5.07),5.07);
  box(marketSign,dark,0,.88,0,.10,1.75,.11);
  woodenSign(marketSign,'market',0,1.56,.065,1.20,.38);
  const ridgeSign=group(staticWorld,-7.35,ground(-7.35,-14.07),-14.07);
  box(ridgeSign,dark,0,.85,0,.10,1.70,.10);
  woodenSign(ridgeSign,'ridge',0,1.50,.060,1.03,.36);
  const plaza=makeCarousel(scene,lampView);
  // The workshop keeps its own local amber spill. The clock street shares an existing lamp.
  const workshopSpill=new T.PointLight('#ffc08a',10.5,4.8,1.8);
  workshopSpill.position.set(-6.47,ground(-6.47,-2.17)+1.56,-2.17);
  scene.add(workshopSpill);
  for(const [x,z,size] of [[-3.13,-7.52,1.25],[-7.81,-2.12,1.53]]){
    pool(scene,x,ground(x,z)+.114,z,size,'#f3c295',.34);
  }
  groundContact(scene,ground,[
    ...specs.slice(0,4).map(a=>({x:a.x,z:a.z,halfX:a.w/2-.02,halfZ:a.d/2,feather:.79,opacity:.51,yaw:a.ry})),
    {x:-11.38,z:-.18,halfX:1.52,halfZ:1.34,feather:.68,opacity:.43,yaw:.30},
    {x:-.84,z:.10,halfX:2.60,halfZ:2.58,feather:.62,opacity:.52},
    ...[[-5.5,4.4],[-2.5,6.2],[3.44,3.65],[6.87,4.9],[3.16,-5.1],[-5.88,-7.2],[-7.88,2.85],[-2.4,-3.9]]
      .map(([x,z])=>({x,z,halfX:.16,halfZ:.14,feather:.48,opacity:.46})),
  ]);
  batch(staticWorld,true,true);
  const walkers=[
    person(life,'#aa6677','#d7bdad',1,{name:'aholo-g1-resident-a'}),
    person(life,'#697d9e','#9d665d',.96,{name:'aholo-g1-resident-b'}),
    person(life,'#707d77','#e4bd95',.86,{name:'aholo-g1-resident-b',lamplighter:true}),
  ];
  const pets=cat(life,()=>townModel('plaza-cat.glb'));
  const paths=[
    new T.CatmullRomCurve3([v(-5.8,0,5.5),v(-2,0,5.15),v(2.8,0,5),v(5.3,0,2.4),v(4.1,0,-3),v(.5,0,-5.8),v(-4.9,0,-5.9),v(-5.7,0,.5)],true),
    new T.CatmullRomCurve3([v(3,0,5.3),v(5.5,0,3.8),v(canal(4)-2.8,0,4),v(canal(4)+2.8,0,4),v(15,0,4.3),v(16,0,4.6)]),
  ];
  const smoke=smokes.slice(0,5).flatMap((p,i)=>Array.from({length:5},(_,j)=>{
    const o=new T.Sprite(new T.SpriteMaterial({map:radialTexture(),color:'#a1aecb',transparent:true,depthWrite:false}));
    life.add(o);return {p,i,j,o};
  }));
  const snowData=Array.from({length:390},()=>[(r()-.5)*57,r()*18,(r()-.5)*49,r()]);
  const pos=new Float32Array(snowData.length*3),sg=new T.BufferGeometry().setAttribute('position',new T.BufferAttribute(pos,3));
  for(const patch of midFir.values())batch(patch.fallback);
  scenery.push(mountFirPatches('mid',[...midFir.values()]));
  const snowflakes=new T.Points(sg,new T.PointsMaterial({color:'#e7ddeb',size:.065,transparent:true,opacity:.68,depthWrite:false}));snowflakes.frustumCulled=false;scene.add(snowflakes);
  const streetPosts=group(scene);
  const restoration=[
    [-6.59,1.36],[-4.53,2.91],[-2.67,4.62],[.28,4.42],[2.80,1.81],
  ].map(([x,z])=>{
    const y=ground(x,z);
    const glass=lampView.build(streetPosts,post=>riversideLantern(post,x,y,z,.88,true));
    const warmth=pool(scene,x,y+.065,z,2.15,'#ffb86a',0);
    return {glass,warmth,position:v(x,y+1.65,z)};
  });
  batch(streetPosts,false);
  const lampDark=new T.Color('#9aa9b9'),lampWarm=new T.Color('#ffd193');
  const routeDelay=[1.34,1.65,1.96,2.22,1.77];
  function lightStreet(elapsed:number){
    restoration.forEach(({glass,warmth},i)=>{
      const glow=T.MathUtils.smoothstep(elapsed,routeDelay[i],routeDelay[i]+.46);
      glass.color.lerpColors(lampDark,lampWarm,glow);
      glass.emissiveIntensity=.025+glow*2.19;warmth.material.opacity=glow*.59;
    });
  }
  function lightWindows(elapsed:number){
    const delays=[1.23,.47,.86,1.57]; // Bell tower, bookshop, workshop, inn.
    district.forEach((panes,i)=>{
      const glow=T.MathUtils.smoothstep(elapsed,delays[i],delays[i]+.52);
      panes.forEach(pane=>{pane.emissiveIntensity=.035+glow*1.12;});
    });
  }
  const clockDim=new T.Color('#a48b83'),clockWarm=new T.Color('#ffd095');
  const clockLight=new T.PointLight('#ffac61',0,9,1.7);
  clockLight.position.set(-3.14,4.92,-7.72);scene.add(clockLight);
  const clockMarker=v(-3.1,ground(-3.1,-8.42)+2.35,-8.42);
  const workshopMarker=v(-7.85,ground(-7.85,-2.36)+1.72,-2.36);
  let prior=0,spin=0,clockTime=0,residentTime=0,clockRunning=false,plazaWake=0;
  if(!clockwork)throw new Error('The bell tower needs a star socket');
  const clock=clockwork;
  const clockDestination=clock.key.getWorldPosition(v(0,0,0));
  const clockTurn=clock.key.getWorldQuaternion(new T.Quaternion());
  // The camera sweeps the boom at many points per frame. These obstacles
  // never move, so evaluate their heights and rotations once.
  const carouselBase=ground(-.84,.10),cottageTop=ground(-11.38,-.18)+4.45;
  const roofBounds=specs.map(b=>({
    x:b.x,z:b.z,halfWidth:b.w/2,halfDepth:b.d/2,
    eaves:ground(b.x,b.z)+b.h,rise:b.r,sin:Math.sin(b.ry),cos:Math.cos(b.ry),
  }));
  const treeBounds=nearTrees.filter((_,i)=>i!==firIndex&&i<20).map(([x,z,h])=>({x,z,h,base:ground(x,z)}));
  const bridgeBounds=[4,northBridgeZ].map(z=>({x:canal(z),z,halfWidth:z===4?stoneDeckHalfWidth:northDeckHalfWidth}));
  const obstacles=lowObstacles.map(o=>({...o,cos:Math.cos(o.angle),sin:Math.sin(o.angle)}));
  function lowSurface(x:number,z:number,below:number,above=Infinity){
    let surface=-Infinity;
    for(const o of obstacles){
      if(o.top>below||o.top<=above)continue;
      const dx=x-o.x,dz=z-o.z;
      if(Math.abs(dx*o.cos-dz*o.sin)<o.halfX+.065&&Math.abs(dx*o.sin+dz*o.cos)<o.halfZ+.065)
        surface=Math.max(surface,o.top);
    }
    return surface;
  }
  function bridgeBlocksCamera(bridge:typeof bridgeBounds[number],x:number,y:number,z:number){
    const across=x-bridge.x;
    if(Math.abs(across)>=(bridge.z===northBridgeZ?northDeckHalfSpan:2.80))return false;
    const dz=Math.abs(z-bridge.z-(bridge.z===northBridgeZ?northDeckOffset(across):0));
    if(dz>=bridge.halfWidth+.41)return false;
    const deck=bridge.z===northBridgeZ?northDeckHeight(across):bridgeDeckHeight(across);
    return y<deck+.08||(dz>bridge.halfWidth&&y<deck+.67);
  }
  return {plaza,asset,fittings,ridges,woodenSigns:townSignsReady(),scenery:Promise.all(scenery),residents:Promise.all(walkers.map(walker=>walker.ready)),plazaCat:pets.ready,generatedFacades:Promise.all(generatedFacades),streetFittings:Promise.all(streetFittings).then(results=>results.every(Boolean)),clockMarker,workshopMarker,footprints:specs,
    clockFittings:Promise.all(clockFittings).then(results=>results.length>0&&results.every(Boolean)),
    guideOutdoorEye(actor:T.Vector3,eye:T.Vector3){
      // Stay on the street side of the turntable. Keep the tangential part of
      // the orbit so the camera can round the canopy without diving below it.
      const dx=actor.x+.84,dz=actor.z-.10,r=Math.hypot(dx,dz);
      if(r>.01&&r<12.5){
        const nx=dx/r,nz=dz/r;
        const clearance=(eye.x+.84)*nx+(eye.z-.10)*nz-4.02;
        if(clearance<.42){
          const push=clearance<=-.42?-clearance:(.42-clearance)**2/1.68;
          eye.x+=nx*push;eye.z+=nz*push;
          // At the bookseller corner the boom used to lose nearly all its
          // horizontal length. Carry the view along the approach to the
          // workshop before the turntable forces it over the player's head.
          const street=T.MathUtils.smoothstep(-nz,.12,.78)
            *T.MathUtils.smoothstep(dx,-1.4,.75)
            *T.MathUtils.smoothstep(push,.25,2.65);
          eye.x=T.MathUtils.lerp(eye.x,actor.x+3.75,street);
          eye.z=T.MathUtils.lerp(eye.z,actor.z+.62,street);
          eye.y+=Math.min(push*.32,1.1)*(1-street)-.35*street;
        }
      }
      // Ease along the workshop frontage before the collision probe reaches
      // the lintel. A turn at the corner should pan along the wall.
      const shop=roofBounds[0];
      const ax=actor.x-shop.x,az=actor.z-shop.z;
      const side=ax*shop.cos-az*shop.sin,front=ax*shop.sin+az*shop.cos;
      const nearSide=1-T.MathUtils.smoothstep(Math.abs(side),shop.halfWidth+.8,shop.halfWidth+3.2);
      const outside=T.MathUtils.smoothstep(front,shop.halfDepth-.5,shop.halfDepth+.1);
      const eyeFront=(eye.x-shop.x)*shop.sin+(eye.z-shop.z)*shop.cos;
      const push=Math.max(0,shop.halfDepth+.94-eyeFront)*nearSide*outside;
      eye.x+=shop.sin*push;eye.z+=shop.cos*push;
    },
    cameraBlocked(x:number,y:number,z:number){
      if(y<maxGroundHeight+.24&&y<ground(x,z)+.24)return true;
      for(const b of roofBounds){
        const dx=x-b.x,dz=z-b.z;
        const lx=Math.abs(dx*b.cos-dz*b.sin),lz=Math.abs(dx*b.sin+dz*b.cos);
        if(lx<b.halfWidth+.33&&lz<b.halfDepth+.43&&
          y<b.eaves+b.rise*(1.10-lx/(b.halfWidth+.35)))return true;
      }
      if(Math.abs(x+11.38)<1.93&&Math.abs(z+.18)<1.77&&y<cottageTop)return true;
      for(const tree of treeBounds){
        const height=y-tree.base;
        if(height>=tree.h)continue;
        const radius=Math.max(.17,tree.h*.22-height*.20);
        const dx=x-tree.x,dz=z-tree.z;
        if(dx*dx+dz*dz<radius*radius)return true;
      }
      return bridgeBlocksCamera(bridgeBounds[0],x,y,z)||
        (bridgeOpen&&bridgeBlocksCamera(bridgeBounds[1],x,y,z));
    },
    showBridgeFormation(progress:number){
      newBridge.visible=true;formNorthBridge(progress);
    },
    setBridge(open:boolean){
      bridgeOpen=open;newBridge.visible=open;passageGate.visible=!open;
      if(open)formNorthBridge(1);
    },
    returnLightLevels:()=>returnRoute.map(({glowMat})=>glowMat.emissiveIntensity),
    setFinale(done:boolean,elapsed=4){
      const beacon=done?T.MathUtils.smoothstep(elapsed,.18,.70):0;
      ending=done&&elapsed>=3.5;
      signal.visible=beacon>0;
      signalMaterial.opacity=.035*beacon;
      returnRoute.forEach(({glowMat,halo},i)=>{
        const onset=.60+i*.19;
        const light=done?T.MathUtils.smoothstep(elapsed,onset,onset+.32):0;
        glowMat.emissiveIntensity=.025+1.625*light;
        halo.material.opacity=.30*light;
      });
      (beaconGlow.material as T.MeshStandardMaterial).emissiveIntensity=.18+1.87*beacon;
      beaconLight.visible=beacon>0;beaconLight.intensity=28*beacon;
      const rest=done?T.MathUtils.smoothstep(elapsed,1.6,2.45):0;
      finalePools.forEach(light=>{light.material.opacity=.35*rest;});
      finaleLamplights.forEach(light=>{light.visible=rest>0;light.intensity=40*rest;});
    },
    setMood(warm:boolean){
      skyLight.color.set(warm?'#c9c6ec':'#a7baff');
      bounce.color.set(warm?'#ffc187':'#ec9f86');
    },
    allowed(x:number,z:number,feet=-Infinity){
      if(x<townBounds.west||x>townBounds.east||z<townBounds.north||z>townBounds.south)return false;
      if((x+9.58)**2+(z+17.53)**2<1.60**2)return false;
      if([[16.8,1.65],[19.1,5.95],[22.32,5.73]].some(([a,b])=>Math.abs(x-a)<.99&&Math.abs(z-b)<.70))return false;
      if((x+.84)**2+(z-.10)**2<3.84**2&&(!plaza.landingReady||!Number.isFinite(stairTop(x,z))))return false;
      const northAcross=x-canal(northBridgeZ);
      const northCrossing=bridgeOpen&&Math.abs(northAcross)<northDeckHalfSpan+.10&&
        Math.abs(z-northBridgeZ-northDeckOffset(northAcross))<northDeckHalfWidth;
      if(Math.abs(x-canal(z))<2.45&&Math.abs(z-4)>stoneDeckHalfWidth&&!northCrossing)return false;
      if(!bridgeOpen&&z< -7.22&&x>=canal(z)+2.45)return false;
      // Retaining bank separates the eastern market from the elevated observatory.
      if(Math.abs(z-marketPass.z)<.37&&x>canal(z)+2.40&&
        (!bridgeOpen||Math.abs(x-marketPass.x)>=marketPass.halfWidth))return false;
      if((x-14.97)**2+(z+12.98)**2<1.38**2)return false;
      if(roofBounds.some(b=>{
        const dx=x-b.x,dz=z-b.z;
        return Math.abs(dx*b.cos-dz*b.sin)<b.halfWidth+.16&&Math.abs(dx*b.sin+dz*b.cos)<b.halfDepth+.16;
      }))return false;
      if(Math.abs(x+11.38)<1.8&&Math.abs(z+.18)<1.64)return false;
      for(const stall of stallBounds){
        const dx=x-stall.x,dz=z-stall.z;
        const across=dx*stall.cos-dz*stall.sin,depth=dx*stall.sin+dz*stall.cos;
        if(Math.abs(across)<1.04&&depth>-.74&&depth<stall.front)return false;
      }
      return !nearTrees.some(([a,b,h])=>(x-a)**2+(z-b)**2<(h*.061+.15)**2)&&
        lowSurface(x,z,Infinity,feet+.014)===-Infinity;
    },
    lowSupport(x:number,z:number,feet:number){return lowSurface(x,z,feet+.014,-Infinity);},
    height(x:number,z:number){
      const step=plaza.landingReady?stairTop(x,z):-Infinity;
      if(Number.isFinite(step))return Math.max(ground(x,z),carouselBase+step);
      const northAcross=x-canal(northBridgeZ);
      const north=bridgeOpen&&Math.abs(northAcross)<northDeckHalfSpan+.10&&
        Math.abs(z-northBridgeZ-northDeckOffset(northAcross))<northDeckHalfWidth+.08;
      if(north)return Math.max(ground(x,z),northDeckHeight(northAcross));
      const d=Math.abs(x-canal(4));
      if(d<2.84&&Math.abs(z-4)<stoneDeckHalfWidth+.04)return Math.max(ground(x,z),bridgeDeckHeight(d));
      return ground(x,z);
    },
    prepareView(camera:T.Camera,actorFeet?:T.Vector3){
      lampView.update(camera,actorFeet);
      for(const {mesh,near,far,focus,distance} of distantMeshes){
        const threshold=mesh.geometry===near?distance+1:distance;
        mesh.geometry=camera.position.distanceToSquared(focus)<threshold*threshold?near:far;
      }
      for(const {near,far,center} of firDetail){
        const visible=camera.position.distanceToSquared(center)<(near.visible?17*17:16*16);
        near.visible=visible;
        far.visible=!visible;
      }
    },
    clockDestination,clockTurn,lighthouse,
    setTitleLight(amount:number){
      skyLight.intensity=.88-.43*amount;
      moon.intensity=1.70-.55*amount;
      bounce.intensity=.23-.08*amount;
      air.color.lerpColors(townAir,titleAir,amount);
      air.density=.0178+.006*amount;
      titleWindows.forEach(({pane,intensity})=>{pane.emissiveIntensity=intensity+.48*amount;});
      plazaPools.forEach(light=>{light.material.opacity=.28+.16*amount;});
      plazaLights.forEach(({light,power})=>{light.intensity=power*(1+.38*amount);});
    },
    setRestored(lit:boolean,elapsed=4){
      const age=lit?elapsed:-1;
      clock.key.visible=lit;
      clockRunning=age>=.14;
      plazaWake=T.MathUtils.smoothstep(age,2.12,3.06);
      plaza.setLit(plazaWake);
      lightStreet(age);lightWindows(age);
      const dawn=T.MathUtils.smoothstep(age,.14,.69);
      clockLight.position.copy(clockDestination);clockLight.position.z+=1.12;
      clockLight.visible=dawn>0;clockLight.intensity=dawn*13;
      clock.face.color.lerpColors(clockDim,clockWarm,dawn);
      clock.face.emissiveIntensity=.12+dawn*.56;
    },
    update(t:number){
    const delta=Math.min(.06,t-prior);prior=t;spin+=delta*1.40*plazaWake;
    clockTime+=clockRunning?delta:0;
    residentTime+=delta*plazaWake;
    plaza.update(spin);water.uniforms.time.value=t;
    clock.hands[0].rotation.z=-clockTime*.23;clock.hands[1].rotation.z=-clockTime*.075;
    if(ending)beaconLight.intensity=28+2*Math.sin(t*2.1);
    const period=residentTime*.036;
    walkers.forEach(({g,feet,arms},i)=>{
      const path=paths[i===0?1:0];
      const tri=(period*.65+.16)%2, tt=i===0?(tri>1?2-tri:tri):((period+i*.4)%1);
      const p=path.getPointAt(tt),dir=path.getTangentAt(tt).multiplyScalar(i===0&&tri>1?-1:1);
      let y=ground(p.x,p.z);
      const d=Math.abs(p.x-canal(4));if(d<2.84 && Math.abs(p.z-4)<1) y=bridgeDeckHeight(d);
      g.position.set(p.x,y+.03+Math.abs(Math.sin(residentTime*5+i))*.032*plazaWake,p.z);g.rotation.y=Math.atan2(dir.x,dir.z);
      feet.forEach((f,j)=>f.rotation.x=Math.sin(residentTime*10+i+j*Math.PI)*.49*plazaWake);arms.forEach((f,j)=>f.rotation.x=Math.sin(residentTime*10+i+j*Math.PI)*-.28*plazaWake);
    });
    const angle=.4+t*.44,x=-4.9+Math.cos(angle)*1.28,z=4.15+Math.sin(angle)*.55;
    const dx=-Math.sin(angle)*1.28,dz=Math.cos(angle)*.55;
    pets.g.position.set(x,ground(x,z)+.021,z);
    pets.g.rotation.y=Math.atan2(dx,dz);
    pets.update(delta,.44*Math.hypot(dx,dz));
    smoke.forEach(({o,p,i,j})=>{const d=(t*.38+j/5+i*.08)%1;
      o.position.set(p.x+d*1.33+.12*Math.sin(t+i+d*3),p.y+d*2.08,p.z-d*.30);
      o.scale.set(.36+d*.91,.28+d*.73,1);o.material.rotation=d*.61;
      o.material.opacity=Math.sin(d*Math.PI)*.22;});
    snowData.forEach(([x,y,z,k],i)=>{pos[i*3]=x+Math.sin(t*.42+k*4)*.38;pos[i*3+1]=(y+18-(t*(.25+k*.2))%18)%18;pos[i*3+2]=z+Math.sin(t*.31+k*3)*.41;});
    sg.attributes.position.needsUpdate=true;
    flicker.emissiveIntensity=1.51+.19*Math.sin(t*5.6)+.12*Math.sin(t*7.8);
  }};
}
