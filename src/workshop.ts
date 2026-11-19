import {lampTrialChart} from './lampTrialChart';
import {chamberstick,keepersFolio} from './keepersFolio';
import {batch} from './world';
import * as T from 'three';
import {fitToFootprint} from './assetFit';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {ball,beam,box,cylinder,glow,group,mat,mesh,painted,plaque,radialTexture,rand,shapeMesh,starPoints,v,type Parent} from './paint';
import {storybookPBR} from './surfaces';
import {dressProjectionCloth} from './workshopDrapery';
import {calibrationCloth} from './instrumentLacquer';
import displayPoses from './data/carving-display.json';
import carvings from './data/workshop-carvings.json';
import {lantern,tree,house} from './architecture';
import {castingSurfaces,emptyMask,evaluate,geometry,lamp,lampAt,lampStops,lux3dFanTip,lux3dOpticalMeshes,pieces,projection,star,starCenter,type Placement,type Piece,type Vec} from './optics';

const timber=mat('#563947','wood'), walnut=storybookPBR('carved-wood','#bc8b70',2);
const pale=mat('#b08c6e','wood'), orange=mat('#cc9e68','wood');
const dark=mat('#31283d','wood'), cloth=storybookPBR('wool','#a45365',2);
const paper=mat('#e8c9a0','paper'), snow=mat('#b5aed0','snow');
const lampGlow=glow('#ffc880',1.45);
const hammered=storybookPBR('aged-paint','#bd8b50',2);
hammered.metalness=.34;hammered.normalScale.setScalar(.19);
const blackened=storybookPBR('aged-paint','#48384b',2);
blackened.metalness=.42;
const colors=['#825563','#786786','#9c7468','#637371','#ae8564'].map(c=>mat(c,'cloth'));

const pieceRim=new T.MeshBasicMaterial({color:'#f5bf8d',side:T.BackSide});
const finishGeometry=new Map<Piece,T.BufferGeometry>();
type CarvingFinish={material:T.MeshStandardMaterial;rim:T.Mesh;refined:T.MeshStandardMaterial[]};
let refinements:Promise<T.Group|null>|undefined;
const finishes=new WeakMap<T.Mesh,CarvingFinish>();
function carvedGeometry(id:Piece){
  const cached=finishGeometry.get(id);
  if(cached)return cached;
  const detail=new T.BufferGeometry();
  const donor=lux3dOpticalMeshes[id];
  if(donor){
    detail.setAttribute('position',new T.Float32BufferAttribute(donor.position,3));
    detail.setAttribute('color',new T.Float32BufferAttribute(donor.color,3));
    detail.setIndex(donor.index);
    detail.computeVertexNormals();
    finishGeometry.set(id,detail);
    return detail;
  }
  const mesh=carvings[id];
  const bytes=(s:string)=>Uint8Array.from(atob(s),c=>c.charCodeAt(0)).buffer;
  const unpack=(s:string,scale:number)=>Float32Array.from(new Int16Array(bytes(s)),n=>n/scale);
  detail.setAttribute('position',new T.BufferAttribute(unpack(mesh.position,16384),3));
  detail.setAttribute('normal',new T.BufferAttribute(new Int8Array(bytes(mesh.normal)),3,true));
  detail.setAttribute('color',new T.BufferAttribute(new Uint16Array(bytes(mesh.color)),3,true));
  detail.setAttribute('uv',new T.BufferAttribute(unpack(mesh.uv,4096),2));
  detail.setIndex(new T.BufferAttribute(new Uint16Array(bytes(mesh.index)),1));
  finishGeometry.set(id,detail);
  return detail;
}
const fanTipGeometry=new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(lux3dFanTip.tip,3));
fanTipGeometry.computeVertexNormals();
const fanTipFinish=new T.MeshStandardMaterial({color:'#b88447',metalness:.42,roughness:.67,side:T.DoubleSide});
const [planeX,planeY,planeZ,planeW]=lux3dFanTip.plane;

function trimFanFinish(material:T.MeshStandardMaterial){
  material.onBeforeCompile=shader=>{
    shader.vertexShader='varying vec3 fanLocal;\n'+shader.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\nfanLocal = position;');
    shader.fragmentShader='varying vec3 fanLocal;\n'+shader.fragmentShader.replace('#include <clipping_planes_fragment>',
      `#include <clipping_planes_fragment>
if(dot(fanLocal, vec3(${planeX},${planeY},${planeZ})) + ${planeW} > 0.) discard;`);
  };
}

const opticalModels=new Map<Piece,Promise<T.BufferGeometry|null>>();
function opticalModel(id:Piece){
  let promise=opticalModels.get(id);
  if(!promise){
    promise=new GLTFLoader().loadAsync(import.meta.env.BASE_URL+'models/aholo-optical-'+id+'.glb').then(({scene})=>{
      const imported=scene.getObjectByProperty('isMesh',true) as T.Mesh|undefined;
      if(!imported)throw new Error('Empty optical GLB: '+id);
      const geometry=imported.geometry;
      const fallback=carvedGeometry(id);
      const pos=geometry.getAttribute('position').array,expected=fallback.getAttribute('position').array;
      if(pos.length!==expected.length||pos.some((value,i)=>value!==expected[i])||
         geometry.index?.count!==fallback.index!.count||
         geometry.index.array.some((value,i)=>value!==fallback.index!.array[i])){
        throw new Error('Optical GLB and runtime triangle data disagree: '+id);
      }
      geometry.computeVertexNormals();
      return geometry;
    }).catch(error=>{console.warn('Aholo optical cast',id,error);return null;});
    opticalModels.set(id,promise);
  }
  return promise;
}
// Support and clearance use both the caster and the visible carving.
const carvingsPoints=new Map<Piece,T.Vector3[]>();
function visiblePoints(id:Piece){
  const cached=carvingsPoints.get(id);
  if(cached)return cached;
  const points:T.Vector3[]=[];
  const add=(buffer:T.BufferGeometry,trim=false)=>{
    const positions=buffer.getAttribute('position');
    for(let i=0;i<positions.count;i++){
      const point=v(0,0,0).fromBufferAttribute(positions,i);
      if(!trim||planeX*point.x+planeY*point.y+planeZ*point.z+planeW<=0)points.push(point);
    }
  };
  add(carvedGeometry(id),id==='fan');
  if(id==='fan')add(fanTipGeometry);
  carvingsPoints.set(id,points);
  return points;
}
const casterPoints=Object.fromEntries(pieces.map(({id})=>[id,geometry[id].map(vertex=>v(...vertex))])) as Record<Piece,T.Vector3[]>;
function bodyBounds(id:Piece,rotation:T.Quaternion,scale=1,includeCaster=true){
  const bounds=new T.Box3(),point=v(0,0,0);
  for(const vertex of visiblePoints(id))bounds.expandByPoint(point.copy(vertex).applyQuaternion(rotation));
  if(includeCaster)for(const vertex of casterPoints[id])bounds.expandByPoint(point.copy(vertex).applyQuaternion(rotation));
  bounds.min.multiplyScalar(scale);bounds.max.multiplyScalar(scale);
  return bounds;
}
function syncFinish(finish:CarvingFinish){
  for(const material of finish.refined){
    material.emissive.copy(finish.material.emissive);
    material.emissiveIntensity=finish.material.emissiveIntensity;
  }
}

function pieceMesh(node:Parent,id:Piece){
  // Picking, real shadow depth and the solver all read the same triangle stream.
  // Lux3D pieces also take their visible geometry from that casting mesh.
  const buffer=new T.BufferGeometry();
  buffer.setAttribute('position',new T.Float32BufferAttribute(geometry[id].flat(),3));
  buffer.computeBoundingBox();
  const caster=new T.MeshBasicMaterial({side:T.DoubleSide,colorWrite:false,depthWrite:false});
  const model=mesh(node,buffer,caster);
  const donor=lux3dOpticalMeshes[id];
  const material=donor
    ?new T.MeshStandardMaterial({color:id==='bell'?'#ffe1ae':'#ffe6cf',metalness:id==='bell'?.27:.06,roughness:.69})
    :storybookPBR('carved-wood','#ffffff',1);
  material.vertexColors=true;
  material.side=T.DoubleSide;
  material.normalScale.setScalar(.17);
  material.aoMapIntensity=.14;
  const detail=carvedGeometry(id);
  if(id==='fan')trimFanFinish(material);
  const cap=id==='fan'?mesh(model,fanTipGeometry,fanTipFinish):null;
  const surface=mesh(model,detail,material);
  if(donor)void opticalModel(id).then(result=>{if(result)surface.geometry=result;});
  const rim=mesh(model,detail,pieceRim);
  rim.scale.setScalar(1.014);rim.visible=false;
  const finish:CarvingFinish={material,rim,refined:[]};
  finishes.set(model,finish);
  if(donor||cap){
    refinements??=new GLTFLoader().loadAsync(import.meta.env.BASE_URL+'models/aholo-casting-pieces-refined.glb')
      .then(({scene})=>scene).catch(error=>{console.warn('Aholo casting finish',error);return null;});
    void refinements.then(scene=>{
      const asset=scene?.getObjectByName(cap?'fan-tip':id)?.clone();
      if(!asset||!model.parent)return;
      asset.traverse(object=>{
        if(!(object instanceof T.Mesh))return;
        const materials=(Array.isArray(object.material)?object.material:[object.material]) as T.MeshStandardMaterial[];
        const copies=materials.map(source=>{
          const copy=source.clone();
          copy.side=T.DoubleSide;
          finish.refined.push(copy);
          return copy;
        });
        object.material=Array.isArray(object.material)?copies:copies[0];
      });
      syncFinish(finish);
      model.add(asset);
      (cap??surface).visible=false;
    });
  }
  return model;
}
// Resting shadows follow the individual knife-cut profile on the shared tabletop.
function restingShadow(shelf:T.Group,carving:T.Mesh,id:Piece){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=96;
  const ink=canvas.getContext('2d')!,span=1.24;
  ink.filter='blur(3px)';ink.fillStyle='#30202a';ink.beginPath();
  carving.updateMatrix();
  const local=v(0,0,0);
  const projected=geometry[id].map(vertex=>{
    local.set(...vertex).applyMatrix4(carving.matrix);
    return new T.Vector2(48+(local.x+.10*local.y)*96/span,48+(local.z+.10*local.y)*96/span);
  });
  for(let i=0;i<projected.length;i+=3){
    const a=projected[i],b=projected[i+1],c=projected[i+2];
    // Identical winding keeps overlapping front and back faces in the silhouette.
    const forward=(b.x-a.x)*(c.y-a.y)>(b.y-a.y)*(c.x-a.x);
    ink.moveTo(a.x,a.y);
    ink.lineTo(forward?b.x:c.x,forward?b.y:c.y);
    ink.lineTo(forward?c.x:b.x,forward?c.y:b.y);
    ink.closePath();
  }
  ink.fill();
  const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;
  const shadow=mesh(shelf,new T.PlaneGeometry(span,span),new T.MeshBasicMaterial({
    map,transparent:true,opacity:.37,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1
  }),0,.002,0);
  shadow.rotation.x=-Math.PI/2;
  return shadow;
}

function shelfBooks(parent:Parent,x:number,y:number,z:number,r:()=>number,amount=9){
  for(let j=0;j<amount;j++){
    const h=.25+r()*.32, w=.097+r()*.054;
    const book=group(parent,x+j*.16,y+h/2,z+r()*.045);book.rotation.z=(r()-.50)*.30;
    box(book,colors[j%5],0,0,0,w,h,.30);
    box(book,paper,0,0,.104,w*.77,h*.88,.087);
    for(const a of [-1,1])box(book,orange,0,a*h*.32,.154,w*.84,.015,.023);
  }
}
function hangingCloth(p:Parent,x:number,y:number,z:number,w:number,h:number,sign:number){
  const points:number[]=[],uv:number[]=[],indices:number[]=[];
  for(let i=0;i<=20;i++)for(let j=0;j<=14;j++){
    const t=i/20,u=j/14,fold=Math.sin(u*7*Math.PI+t*2);
    const pinch=1-.46*Math.exp(-Math.pow((t-.63)*5,2));
    points.push(x+sign*u*w*pinch+sign*t*.07,y-t*h+Math.sin(u*7)*.07,z+fold*.095+Math.sin(t*3)*.16);
    uv.push(u,t);
    if(i&&j){const k=i*15+j;indices.push(k,k-1,k-15,k-1,k-16,k-15);}
  }
  const geometry=new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(points,3)).setAttribute('uv',new T.Float32BufferAttribute(uv,2));
  geometry.setIndex(indices);geometry.computeVertexNormals();
  const m=cloth.clone();m.side=T.DoubleSide;
  mesh(p,geometry,m);
}
export type InspectId='ledger'|'chart'|'door';
export const roomEntry=v(.25,0,6.03);
export const flightWindow=v(-4.34,3.50,-2.93);
export function createWorkshop(loadArt:Promise<void>){
  const scene=new T.Scene();
  scene.background=new T.Color('#27233c');
  scene.fog=new T.FogExp2('#382938',.019);
  scene.add(new T.HemisphereLight('#bfd5ff','#84646a',1.02));
  const root=group(scene);
  const stage=group(root,0,0,-2.35);
  const heroLoader=new GLTFLoader();
  const loader=new GLTFLoader();
  const model=(name:string,source=loader)=>loadArt.then(()=>source.loadAsync(import.meta.env.BASE_URL+'models/'+name));
  function replaceFitting(name:string,parent:T.Group,fallback:T.Group){
    return model(name,heroLoader).then(({scene:asset})=>{
      parent.add(asset);fallback.removeFromParent();return true;
    }).catch(error=>{console.warn('Workshop fitting '+name,error);return false;});
  }
  const r=rand(2018);
  const curtainsGlow=new T.MeshBasicMaterial({color:'#d8a570'});
  const floor=['#78554e','#895d57','#997164','#71515a','#a57560'].map(c=>storybookPBR('carved-wood',c,2));
  for(let j=0;j<29;j++)for(let i=0;i<3;i++){
    const board=box(root,floor[(j+2*i)%5],(i-1)*4.50+(r()-.5)*.08,-.062,-2.89+j*.458,4.50,.16,.444);
    board.rotation.y=(r()-.5)*.012;
  }
  const wall=storybookPBR('plaster','#66576c',3), wallAlt=storybookPBR('plaster','#695966',3);
  // Leave a physical opening for the camera and starlight to pass through.
  for(const [x,y,width,height] of [[-6.29,3.25,.44,6.50],[1.375,3.25,10.27,6.50],
    [-4.92,.71,2.30,1.42],[-4.92,5.45,2.30,2.10]]){
    box(root,wall,x,y,-2.93,width,height,.40);
  }
  box(root,wall,-6.57,3.25,3.31,.38,6.5,12.8);
  box(root,wallAlt,6.57,3.25,3.31,.38,6.5,12.8);
  box(root,wallAlt,0,3.25,9.98,13.1,6.5,.36);
  box(root,dark,0,6.35,3.5,13.1,.24,12.7);
  for(const x of [-6.15,-3.48,3.47,6.15])box(root,timber,x,3.04,-2.57,.28,6.06,.49).rotation.z=r()*.05-.025;
  for(let i=0;i<7;i++){
    const x=(i-3)*2.10;
    box(root,walnut,x,5.89,3.35,.26,.43,12.48);
    for(const z of [-2.55,9.58])box(root,timber,x,5.52,z,.35,.65,.29);
  }
  for(const x of [-6.32,6.32]){
    box(root,timber,x,.31,3.45,.16,.61,12.45);
    box(root,walnut,x,2.03,3.48,.13,.108,12.47);
  }
  box(root,dark,0,.26,-2.62,12.8,.53,.34);

  const linen=new T.TextureLoader().load(import.meta.env.BASE_URL+'materials/atelier-linen/receiver.webp');
  linen.colorSpace=T.SRGBColorSpace;
  linen.anisotropy=4;
  const projectionCloth=new T.MeshStandardMaterial({map:linen,roughness:.96});
  // The cloth stays planar so the receiver and the geometry solver agree.
  const screen=mesh(stage,new T.PlaneGeometry(5.45,4.61),projectionCloth,.15,2.83,0);
  screen.receiveShadow=true;
  const frameMount=group(stage),frameFallback=group(frameMount);
  for(const x of [-2.73,2.98])box(frameFallback,walnut,x,2.78,-.05,.21,4.91,.31);
  for(const y of [.48,5.15])box(frameFallback,timber,.15,y,-.06,5.87,.23,.24);
  const frameAsset=replaceFitting('hero-shadow-frame.glb',frameMount,frameFallback);
  const wingsAsset=replaceFitting('workshop-winter-wings.glb',stage,group(stage));
  plaque(stage,'ATELIER DES OMBRES',2.01,.24,.12,5.40,.039);
  const valanceFallback=dressProjectionCloth(stage,cloth,hammered);
  const valanceAsset=replaceFitting('workshop-embroidered-valance.glb',stage,valanceFallback);
  // Mesh strips keep their designed thickness on WebGL and remain readable
  // whether a dash crosses bright parchment or the wood's deep shadow.
  function starStroke(width:number,z:number,dashed:boolean){
    const vertices:number[]=[];
    for(let i=0;i<star.length;i++){
      const [x,y]=star[i],[endX,endY]=star[(i+1)%star.length];
      const dx=endX-x,dy=endY-y,len=Math.hypot(dx,dy);
      const n=Math.ceil(len/(dashed?.14:.035));
      const nx=-dy/len*width/2,ny=dx/len*width/2;
      for(let j=0;j<n;j++){
        const from=j/n,to=(j+(dashed?.66:1))/n;
        const ax=x+dx*from,ay=y+dy*from,bx=x+dx*to,by=y+dy*to;
        vertices.push(ax+nx,ay+ny,z,ax-nx,ay-ny,z,bx+nx,by+ny,z,
          bx+nx,by+ny,z,ax-nx,ay-ny,z,bx-nx,by-ny,z);
      }
    }
    return new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(vertices,3));
  }
  const target=group(stage);
  const ink=new T.MeshBasicMaterial({color:'#372634',transparent:true,opacity:.92,depthWrite:false,side:T.DoubleSide});
  const guide=new T.MeshBasicMaterial({color:'#ffe9bc',transparent:true,opacity:.94,depthWrite:false,side:T.DoubleSide});
  mesh(target,starStroke(.074,.018,true),ink);
  mesh(target,starStroke(.032,.024,true),guide);
  target.visible=false;
  const sealMaterial=new T.MeshBasicMaterial({color:'#fff1c5',transparent:true,depthWrite:false,side:T.DoubleSide});
  const seal=mesh(stage,starStroke(.038,.035,false),sealMaterial);
  seal.visible=false;

  // A recessed blue window bay has real depth and miniature exterior silhouettes.
  const window=group(root,-4.92,1.92,-2.44);
  for(let i=0;i<3;i++){
    const r=.13+.07*(i%2),x=-1.01+i*.36,y=2.37+(i%2)*.17;
    beam(window,walnut,v(x,2.54,.38),v(x,y,.38),.016);
    shapeMesh(window,starPoints(r,.43),i===1?lampGlow:curtainsGlow,.047,x,y-.10,.36,.019);
  }
  const windowBackdrop=group(window);
  const blue=mesh(windowBackdrop,new T.PlaneGeometry(2.34,2.97),new T.MeshBasicMaterial({color:'#23264c'}),0,1.0,.008);
  blue.position.z=-.022;
  ball(windowBackdrop,glow('#b7bad7',.30),-.61,1.79,.02,.28,.29,.055);
  for(let i=0;i<23;i++)ball(windowBackdrop,new T.MeshBasicMaterial({color:'#bfacd6'}),(r()-.5)*2.17,.10+r()*2.58,.033,.014,.014,.014);
  const outside=group(windowBackdrop,0,-.52,.087);outside.scale.setScalar(.24);
  for(let j=0;j<5;j++){
    const a=(j-2)*1.45;
    house(outside,{x:a,z:(j%2)*.22,y:0,w:1.45,d:.43,h:1.72+r(),r:1+r()*.60,wall:'#6c6587',roof:'#504d7d',seed:62+j,style:'home'});
  }
  for(let j=0;j<3;j++)tree(outside,-3.99+j*3.68,.03,.99,2+r()*1.35,121+j);
  const windowTown=model('window-town.glb').then(({scene:town})=>{
    town.position.set(0,-.49,.07);
    windowBackdrop.add(town);
    outside.removeFromParent();
    return 'aholo-relief';
  }).catch(error=>{console.warn('Workshop window relief',error);return 'fallback';});
  box(window,walnut,0,-.47,.14,2.63,.19,.51);
  for(const x of [-1.15,0,1.15])box(window,timber,x,1.0,.18,.13,3.06,.17);
  for(const y of [-.50,.59,2.49])box(window,timber,0,y,.16,2.48,.13,.19);
  hangingCloth(window,-1.25,2.52,.26,.43,2.94,1);
  const moon=new T.SpotLight('#adbef4',98,12,.63,.89,1.2);
  moon.position.set(-5.35,3.86,-2.06);moon.target.position.set(-1.95,1.92,4.4);scene.add(moon,moon.target);

  const bench=group(stage,-1.20,0,3.56);
  const caseLeft=group(root,-5.89,0,.54);caseLeft.rotation.y=Math.PI*.48;
  const caseRight=group(root,4.89,0,-2.27);
  const fallback=box(bench,timber,0,2.14,0,4.75,.21,2.52);
  const benchAsset=model('hero-shadow-bench.glb').then(({scene})=>{
    bench.add(scene);fallback.removeFromParent();return true;
  }).catch(async error=>{
    console.warn('Workshop hero bench',error);
    const {scene}=await model('shadow-bench.glb');
    bench.add(scene);fallback.removeFromParent();return false;
  });
  const assets=Promise.all([
    benchAsset,
    model('workshop-bookcase.glb').then(({scene})=>{caseLeft.add(scene);caseRight.add(scene.clone());}),
  ]).then(()=>{batch(caseLeft);batch(caseRight);return true;}).catch(error=>{console.warn('Workshop GLBs:',error);return false;});
  for(const bookcase of [caseLeft,caseRight]){
    for(const y of [.37,1.30,2.30,3.32])shelfBooks(bookcase,-.82,y,.18,r,y>3?7:10);
    for(let i=0;i<5;i++){
      const h=.06+i*.094;
      box(bookcase,colors[i%5],.72,1.31+h,.14,.51,.075,.35).rotation.y=.18*Math.sin(i);
    }
  }
  const charts=group(root,-5.83,0,2.51);
  charts.rotation.y=Math.PI*.50;
  box(charts,timber,0,1.58,0,1.58,3.19,.16).rotation.z=.07;
  const chartInk=lampTrialChart();
  // Preserve the ink's light/dark separation in the window's unlit reveal.
  const chartPaper=new T.MeshStandardMaterial({map:chartInk,color:'#eee8d9',roughness:1,
    emissiveMap:chartInk,emissive:'#eee3d4',emissiveIntensity:.46});
  const chart=mesh(charts,new T.PlaneGeometry(1.28,1.58),chartPaper,0,1.91,.12);
  chart.rotation.z=.069;
  const desk=group(root,4.36,0,4.0);desk.rotation.y=-.36;
  for(const x of [-.69,.69])for(const z of [-.31,.31]) box(desk,walnut,x,.59,z,.16,1.19,.13).rotation.z=x*.04;
  box(desk,walnut,0,1.22,0,1.68,.18,.94);
  const folio=keepersFolio(desk,cloth),ledger=folio.book;
  for(let i=0;i<5;i++)box(desk,colors[i%5],.75,1.344+i*.068,-.35,.44,.068,.31).rotation.y=(r()-.5)*.48;
  const candle=chamberstick(desk,hammered);
  const reading=new T.PointLight('#ffc489',1.35,4,1.65);reading.position.set(0,.40,0);candle.base.add(reading);
  folio.setFlame(reading.getWorldPosition(v(0,0,0)));

  const display=group(root,.96,0,3.09);
  const inventory=new Map<Piece,T.Mesh>();
  const contacts=new Map<Piece,T.Mesh>();
  const shuffled=[...pieces];
  const options=new URLSearchParams(location.search);
  if(!(options.has('qa')&&options.has('artOrder'))){
    for(let i=shuffled.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      [shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];
    }
  }
  // One working surface. Irregular depth leaves each silhouette its own space.
  const shelfY=1.949;
  const restingX=[-2.22,-1.33,-.44,.45,1.34,2.23];
  const restingZ=[.03,.08,-.03,.06,-.04,.04];
  for(let i=0;i<shuffled.length;i++){
    const entry=shuffled[i];
    const shelf=group(display,restingX[i],shelfY,restingZ[i]);
    const piece=pieceMesh(shelf,entry.id);
    inventory.set(entry.id,piece);
    const [pitch,yaw,roll]=displayPoses[entry.id];
    piece.rotation.set(pitch,yaw,roll,'YXZ');
    // Turn the decorated faces on the shelf without changing their mounted poses.
    if(entry.id==='fan'||entry.id==='crook'){
      piece.rotateOnWorldAxis(v(0,0,1),entry.id==='fan'?.62:-.45);
    }
    const bounds=bodyBounds(entry.id,piece.quaternion,1,false);
    const size=bounds.getSize(v(0,0,0)),center=bounds.getCenter(v(0,0,0));
    const scale=Math.min(1.24,.77/size.x,.84/size.z,1.07/size.y);
    piece.scale.setScalar(scale);
    piece.userData.shelfBottom=bounds.min.y;
    piece.userData.placementYaw=.07*(i-2);
    piece.position.set(-center.x*scale,-bounds.min.y*scale,-center.z*scale);
    contacts.set(entry.id,restingShadow(shelf,piece,entry.id));
  }
  const benchFurniture=group(display);
  const roughBench=group(benchFurniture);
  const riser=box(display,walnut,0,2.095,-.52,3.36,.30,.96);
  riser.visible=false;
  function setPortraitBench(compact:boolean){
    display.position.set(compact?-.52:.96,0,compact?5.02:3.09);
    benchFurniture.scale.set(compact?.69:1,1,compact?1.92:1);
    riser.visible=compact;
    shuffled.forEach((entry,i)=>{
      const shelf=inventory.get(entry.id)!.parent!;
      const back=i<3;
      shelf.position.set(compact?(i%3-1)*1.13-(back?0:.34):restingX[i],
        shelfY+(compact&&back?.30:0),compact?(back?-.56:.53):restingZ[i]);
      shelf.scale.setScalar(compact?1.13:1);
    });
  }
  box(roughBench,timber,0,1.85,0,5.36,.17,1.26);
  for(const x of [-2.07,2.07])for(const z of [-.43,.43])box(roughBench,walnut,x,.88,z,.22,1.77,.19);
  const cabinetAsset=model('joiners-bench.glb').then(({scene:asset})=>{
    asset.traverse(node=>{
      if(!(node instanceof T.Mesh))return;
      node.receiveShadow=true;
      for(const material of Array.isArray(node.material)?node.material:[node.material]){
        if(material instanceof T.MeshStandardMaterial && /oak|grain/i.test(material.name)){
          material.map=painted('wood');
          material.needsUpdate=true;
        }else if(material instanceof T.MeshStandardMaterial && /linen|selvage/i.test(material.name)){
          const wool=storybookPBR('wool','#ffffff');
          material.map=wool.map;material.normalMap=wool.normalMap;material.normalScale.setScalar(.22);
          material.needsUpdate=true;
        }
      }
    });
    benchFurniture.add(asset);roughBench.removeFromParent();
    return true;
  }).catch(error=>{console.warn('Carver workbench:',error);return false;});
  for(const x of [-6.18,6.21]){
    lantern(root,x,2.23,6.36,.93,false);
    const candle=new T.PointLight('#ec9c6b',21,7,1.8);candle.position.set(x,2.69,6.45);scene.add(candle);
    for(let t=0;t<6;t++){
      box(root,colors[t%5],x-(x>0?.24:-.29),.16+t*.08,7.0,.66,.11,.41).rotation.y=r()*.75;
    }
  }
  const door=group(root,0,0,9.71);door.rotation.y=Math.PI;
  box(door,dark,0,1.62,.03,1.76,3.25,.22);
  for(let i=0;i<7;i++)box(door,i%2?timber:walnut,(i-3)*.22,1.41,.17,.216,2.78,.10);
  box(door,orange,0,1.50,.24,1.60,.12,.09);
  plaque(door,'雪镇广场',.98,.23,0,2.38,.274);
  ball(door,orange,.53,1.30,.31,.08,.08,.047);

  const projector=group(stage,...lamp);
  projector.lookAt(stage.localToWorld(v(...starCenter)));
  const lanternMount=group(projector),lanternFallback=group(lanternMount);
  for(const [z,rad,len] of [[-.43,.32,.29],[-.24,.345,.14],[-.03,.35,.27]]){
    const barrel=cylinder(lanternFallback,z===-.24?blackened:hammered,0,0,z,rad,rad*.89,len,40);
    barrel.rotation.x=Math.PI/2;
  }
  for(const [radius,tube,z] of [[.305,.026,.095],[.273,.020,.118],[.334,.024,-.16],[.315,.021,-.35]])
    mesh(lanternFallback,new T.TorusGeometry(radius,tube,10,48),hammered,0,0,z);
  const lens=ball(projector,lampGlow,0,0,.119,.234,.234,.047);
  lens.scale.z=.038;
  for(let i=0;i<12;i++){
    const a=i*Math.PI/6;
    const rail=beam(lanternFallback,blackened,v(Math.sin(a)*.325,Math.cos(a)*.325,-.42),v(Math.sin(a)*.356,Math.cos(a)*.356,-.17),.023);
    rail.castShadow=false;
  }
  for(let i=0;i<8;i++){
    const a=i*Math.PI/4;
    ball(lanternFallback,pale,Math.cos(a)*.30,Math.sin(a)*.30,.092,.037,.041,.033);
  }
  const lanternAsset=model('aholo-projector-refined.glb',heroLoader)
    .then(result=>({asset:result.scene,source:'aholo-8297001-blender-finish'}))
    .catch(()=>model('aholo-g1-lantern.glb',heroLoader).then(result=>({asset:result.scene,source:'aholo-8297001'})))
    .then(({asset,source})=>{
    fitToFootprint(asset,.75,.72,.56);
    asset.position.y-=.32;asset.position.z-=.19;
    lens.scale.x*=.70;lens.scale.y*=.70;
    lanternMount.add(asset);
    lanternFallback.removeFromParent();
    return source;
  }).catch(error=>{
    console.warn('Aholo projector housing',error);
    return replaceFitting('hero-shadow-lantern.glb',lanternMount,lanternFallback).then(ok=>ok?'blender-glb':'fallback');
  });
  const beamLength=Math.hypot(lamp[0]-starCenter[0],lamp[1]-starCenter[1],lamp[2]-starCenter[2]);
  const cone=new T.ConeGeometry(2.15,beamLength,40,1,true);
  cone.rotateX(-Math.PI/2);cone.translate(0,0,beamLength/2);
  mesh(projector,cone,new T.ShaderMaterial({
    side:T.DoubleSide,transparent:true,depthWrite:false,blending:T.AdditiveBlending,
    uniforms:{extent:{value:beamLength}},
    vertexShader:'varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'uniform float extent;varying vec3 p;void main(){float d=p.z/extent;float glow=smoothstep(.008,.055,d)*(1.-smoothstep(.11,.97,d));gl_FragColor=vec4(.93,.49,.19,glow*.067);}'
  }));
  const support=group(stage,lamp[0],0,lamp[2]+.14);
  box(stage,walnut,(lampStops[0]+lampStops[2])/2,3.022,lamp[2]+.31,1.18,.11,.46);
  for(const z of [lamp[2]+.20,lamp[2]+.43]){
    beam(stage,hammered,v(lampStops[0]-.14,3.09,z),v(lampStops[2]+.14,3.09,z),.029);
    for(const x of [lampStops[0]-.13,lampStops[2]+.13])ball(stage,blackened,x,3.099,z,.047,.032,.047);
  }
  support.rotation.y=.73;
  const standFallback=group(support);
  cylinder(standFallback,timber,0,.12,0,.50,.55,.23,12);
  cylinder(standFallback,walnut,0,1.54,0,.12,.21,2.95,12);
  cylinder(standFallback,orange,0,3.05,0,.23,.26,.14,13);
  const standAsset=replaceFitting('workshop-owl-lampstand.glb',support,standFallback);
  const spot=new T.SpotLight('#ffc687',248,14,.40,.43,1.40);
  spot.position.set(...lamp);
  spot.target.position.set(...starCenter);
  stage.add(spot,spot.target);
  spot.castShadow=true;
  spot.shadow.mapSize.set(1536,1536);spot.shadow.camera.near=.35;spot.shadow.camera.far=10.5;
  spot.shadow.bias=-.00023;spot.shadow.normalBias=.006;
  spot.shadow.camera.layers.set(2);
  const goldFill=new T.PointLight('#f0b58a',22,8,1.55);
  goldFill.position.set(.54,3.88,4.68);scene.add(goldFill);

  const brass=storybookPBR('aged-paint','#c88c49',1.5);
  brass.metalness=.37;
  const felt=storybookPBR('wool','#544658',2);
  const sheen=glow('#f4b474',.52);
  const trayAsset=model('inlaid-optical-tray.glb')
    .then(({scene})=>scene).catch(error=>{console.warn('Inlaid instrument tray',error);return null;});
  const holders=castingSurfaces.map(({x,z,top,width,depth},index)=>{
    const table=group(stage,x,top,z);
    const back=box(table,walnut,0,-.09,0,width+.10,.14,depth+.09);
    void trayAsset.then(asset=>{if(asset){table.add(asset.clone());back.removeFromParent();}});
    const feltSurface=felt.clone();
    feltSurface.color.set(0xd9c8bc);
    feltSurface.map=calibrationCloth(index);
    feltSurface.emissive.setHex(0xe8b36b);feltSurface.emissiveIntensity=0;
    box(table,feltSurface,0,-.018,0,width,.036,depth);
    const edges=[[-width/2,-depth/2],[width/2,-depth/2],[width/2,depth/2],[-width/2,depth/2]];
    const outline=new T.LineLoop(new T.BufferGeometry().setFromPoints(edges.map(([x,z])=>v(x,.008,z))),new T.LineBasicMaterial({color:'#eeb579',transparent:true,opacity:.42}));
    table.add(outline);
    for(const [x,z] of edges)ball(table,brass,x,.011,z,.028,.011,.028);
    const pivot=group(stage);
    const collar=cylinder(stage,brass,x,top+.031,z,.237,.279,.066,36);
    const ring=mesh(stage,new T.TorusGeometry(.356,.019,10,56),sheen);
    ring.rotation.x=-Math.PI/2;
    // The handwheel sits beside the felt. It never orbits under a wooden piece.
    const grip=group(stage,x+(index===0?1.03:-1.03),top+.23,z+.35);
    grip.visible=false;
    // The journal bearing grounds the turn control in the instrument.
    const bearing=group(grip);
    box(bearing,blackened,0,-.16,-.075,.135,.20,.13);
    const axle=cylinder(bearing,brass,0,0,-.085,.066,.075,.20,16);
    axle.rotation.x=Math.PI/2;
    const wheel=group(grip);
    wheel.scale.setScalar(1.35);
    mesh(wheel,new T.TorusGeometry(.16,.028,10,32),brass);
    for(const angle of [0,Math.PI/3,2*Math.PI/3]){
      const spoke=box(wheel,brass,0,0,0,.023,.29,.038);
      spoke.rotation.z=angle;
    }
    ball(wheel,sheen,0,0,.01,.062,.062,.035);
    const crankPin=cylinder(wheel,blackened,.126,.081,.062,.025,.027,.12,12);
    crankPin.rotation.x=Math.PI/2;
    ball(wheel,timber,.126,.081,.125,.049,.048,.068);
    const rod=cylinder(pivot,brass,0,0,0,.047,.056,1,14);
    const shapeMap=new Map(pieces.map(({id})=>{
      const o=pieceMesh(pivot,id);
      o.castShadow=true;o.layers.enable(2);o.visible=false;
      return [id,o];
    }));
    return {pivot,shapeMap,rod,feltSurface,outline,collar,ring,grip,wheel,rendered:null as T.Mesh|null,mounted:null as Placement|null};
  });
  const slider=ball(stage,sheen,0,0,0,.127,.057,.104);
  const sockets=new Map(pieces.map(({id})=>{
    const casterFloor=Math.min(...casterPoints[id].map(point=>point.y));
    const floor=bodyBounds(id,new T.Quaternion(),1,false).min.y;
    const contact=visiblePoints(id).reduce((best,point)=>{
      const distance=(p:T.Vector3)=>p.x*p.x+p.z*p.z;
      if(point.y<floor+.008&&(best.y>=floor+.008||distance(point)<distance(best)))return point;
      return best;
    });
    return [id,{casterFloor,floor,contact}];
  }));
  const castHeight=(index:number,id:Piece)=>{
    const {top,y}=castingSurfaces[index];
    const {casterFloor,floor}=sockets.get(id)!;
    return Math.max(y,top-casterFloor+.033,top-floor+.006);
  };
  function pieceBounds(index:number,pose:Placement){
    const rotation=new T.Quaternion().setFromAxisAngle(v(0,1,0),pose.yaw);
    return bodyBounds(pose.piece,rotation).translate(v(pose.x,castHeight(index,pose.piece),pose.z));
  }
  function keepCarriedAboveFurniture(id:Piece,ghost:T.Mesh,wanted:T.Vector3){
    const bounds=bodyBounds(id,ghost.quaternion,ghost.scale.x).translate(wanted);
    const current=bounds.min.y;
    const over=(x:number,z:number,width:number,depth:number)=>bounds.min.x<x+width/2&&
      bounds.max.x>x-width/2&&bounds.min.z<z+depth/2&&bounds.max.z>z-depth/2;
    let floor=current;
    const compact=riser.visible;
    if(over(display.position.x,display.position.z,compact?3.70:5.36,compact?2.42:1.26))
      floor=Math.max(floor,shelfY);
    if(compact&&over(display.position.x,display.position.z-.52,3.36,.96))
      floor=Math.max(floor,shelfY+.30);
    for(const surface of castingSurfaces)
      if(over(stage.position.x+surface.x,stage.position.z+surface.z,surface.width,surface.depth))
        floor=Math.max(floor,surface.top+.008);
    for(const [index,holder] of holders.entries()){
      if(!holder.mounted||holder.mounted.piece===id)continue;
      const other=pieceBounds(index,holder.mounted)
        .translate(stage.position);
      if(bounds.max.y>other.min.y&&bounds.min.x<other.max.x&&bounds.max.x>other.min.x&&
        bounds.min.z<other.max.z&&bounds.max.z>other.min.z)
        floor=Math.max(floor,other.max.y+.012);
    }
    ghost.position.copy(wanted);
    ghost.position.y+=floor-current;
  }
  function place(states:(Placement|null)[],rail=1,carried:Piece|null=null){
    spot.position.set(...lampAt(rail));
    projector.position.copy(spot.position);
    projector.lookAt(stage.localToWorld(v(...starCenter)));
    support.position.x=spot.position.x;
    slider.position.set(spot.position.x,3.14,lamp[2]+.42);
    inventory.forEach((o,id)=>{
      o.visible=id!==carried&&!states.some(state=>state?.piece===id);
      contacts.get(id)!.visible=o.visible;
    });
    holders.forEach((h,i)=>{
      const mount=states[i],{top}=castingSurfaces[i];
      h.mounted=mount;
      h.rendered=mount?h.shapeMap.get(mount.piece)!:null;
      h.shapeMap.forEach(o=>o.visible=o===h.rendered);
      h.rod.visible=h.collar.visible=h.ring.visible=!!mount;
      if(!mount)return;
      const height=castHeight(i,mount.piece);
      h.pivot.position.set(mount.x,height,mount.z);
      h.pivot.rotation.y=mount.yaw;
      const {contact}=sockets.get(mount.piece)!;
      const pinBase=top-height+.022;
      const length=Math.max(.005,contact.y-pinBase+.004);
      h.rod.position.set(contact.x,pinBase+length*.5,contact.z);
      h.rod.scale.y=length;
      const seat=v(contact.x,0,contact.z).applyQuaternion(h.pivot.quaternion);
      h.collar.position.set(mount.x+seat.x,top+.014,mount.z+seat.z);
      h.collar.scale.set(.58,.46,.58);
      h.ring.position.set(mount.x,top+.047,mount.z);
      h.wheel.rotation.z=-mount.yaw;
    });
    // Only two articulated casters move. Transform their vertices in stage space
    // without refreshing the whole workshop hierarchy for each pointer event.
    stage.updateWorldMatrix(true,false);
    const toStage=stage.matrixWorld.clone().invert();
    const light=spot.getWorldPosition(v(0,0,0)).applyMatrix4(toStage);
    const masks=holders.map(holder=>{
      const obj=holder.rendered;
      if(!obj)return emptyMask;
      obj.updateWorldMatrix(true,false);
      const localToStage=new T.Matrix4().multiplyMatrices(toStage,obj.matrixWorld);
      const meshPositions=obj.geometry.getAttribute('position');
      const vertex=v(0,0,0);
      const projectedVertices=Array.from({length:meshPositions.count},(_,i):Vec=>{
        vertex.fromBufferAttribute(meshPositions,i);
        vertex.applyMatrix4(localToStage);
        return [vertex.x,vertex.y,vertex.z];
      });
      return projection(projectedVertices,[light.x,light.y,light.z]);
    });
    return evaluate(masks[0],masks[1]);
  }
  const darkLeaf=new T.Color('#543424'),warmLeaf=new T.Color('#e6ad52');
  const goldLeaf=storybookPBR('carved-wood',warmLeaf,1.6);
  goldLeaf.normalScale.setScalar(.19);goldLeaf.metalness=.29;goldLeaf.roughness=.48;
  goldLeaf.emissive.set('#ff932e');goldLeaf.emissiveIntensity=.58;
  const silhouette=star.map(([x,y])=>v(x-starCenter[0],y-starCenter[1],0));
  const realStar=shapeMesh(stage,silhouette.map(p=>new T.Vector2(p.x,p.y)),goldLeaf,.13,0,0,0,.046);
  realStar.visible=false;
  const gilt=storybookPBR('carved-wood','#ffe4aa',1.4);
  gilt.normalScale.setScalar(.16);gilt.emissive.set('#f7b86c');gilt.transparent=true;gilt.opacity=0;gilt.depthWrite=false;
  const inset=shapeMesh(realStar,silhouette.map(p=>new T.Vector2(p.x*.77,p.y*.77)),gilt,.012,0,0,.159,.015);
  inset.rotation.z=.008;
  const starHalo=new T.Sprite(new T.SpriteMaterial({color:'#ffaf55',map:radialTexture(),transparent:true,opacity:0,
    depthWrite:false,blending:T.AdditiveBlending}));
  stage.add(starHalo);starHalo.visible=false;
  const dustPoints=[];
  for(let i=0;i<210;i++)dustPoints.push((r()-.5)*12,.2+r()*5.8,-2+r()*11);
  const dust=new T.Points(new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(dustPoints,3)),new T.PointsMaterial({color:'#eab587',size:.027,opacity:.31,transparent:true,depthWrite:false}));
  scene.add(dust);
  const markers:Record<InspectId,{p:T.Vector3;label:string;reach:number}>={
    ledger:{p:desk.localToWorld(v(-.09,1.45,.25)),label:'调查摊开的书页',reach:2.85},
    chart:{p:charts.localToWorld(v(0,1.97,.32)),label:'调查墙上的光路图',reach:2.65},
    door:{p:v(0,1.79,9.64),label:'回到小镇',reach:2.55},
  };
  const standBlocks=[[-3.7,1.39,-.02,2.45],[-1.20,3.14,2.70,3.48],[3.46,5.26,3.29,4.59],[-6.39,-5.46,-.79,1.71],[-6.39,-5.39,1.81,3.11]];
  return {
    heroFittings:Promise.all([benchAsset,frameAsset,lanternAsset.then(source=>source!=='fallback'),wingsAsset,standAsset]).then(status=>status.every(Boolean)).catch(()=>false),
    valance:valanceAsset,windowTown,
    scene, root, assets, cabinetAsset, lanternAsset, markers, holders, display, inventory, ledger, folio, chart, place,
    readingView(aspect:number,clue:'ledger'|'chart'){
      if(clue==='chart'){
        const depth=Math.max(1.92,1.57/aspect);
        return {target:chart.localToWorld(v(0,-.06,0)),position:chart.localToWorld(v(.04,.07,depth))};
      }
      const distance=Math.max(1.20,1.29/aspect);
      return {target:ledger.localToWorld(v(0,.11,.08)),
        position:ledger.localToWorld(v(0,.11+distance,.08+distance*.37))};
    },
    openFlightView(open:boolean){windowBackdrop.visible=!open;},
    cloneStar(){const copy=realStar.clone();copy.visible=true;return copy;},
    departingStar(){return {position:realStar.getWorldPosition(v(0,0,0)),scale:realStar.scale.clone(),rotation:realStar.rotation.clone()};},
    proxy(id:Piece){
      const carried=pieceMesh(scene,id);
      carried.castShadow=true;carried.layers.enable(2);
      const {material,rim}=finishes.get(carried)!;
      material.emissive.set('#ffba73');material.emissiveIntensity=.14;
      rim.visible=false;
      syncFinish(finishes.get(carried)!);
      return carried;
    },
    releaseProxy(proxy:ReturnType<typeof pieceMesh>){
      proxy.removeFromParent();
      proxy.geometry.dispose();
      proxy.material.dispose();
      const finish=finishes.get(proxy)!;
      finish.material.dispose();
      finish.refined.forEach(material=>material.dispose());
    },
    castHeight,
    pieceBounds,
    keepCarriedAboveFurniture,
    toStage(point:T.Vector3){return stage.worldToLocal(point);},
    worldAt(x:number,y:number,z:number){return stage.localToWorld(v(x,y,z));},
    showHandle(active:number|null){
      holders.forEach((h,i)=>{h.grip.visible=i===active&&!!h.rendered;});
    },
    lightSurfaces(over:number|null,carrying:boolean,selected:number|null=null){
      holders.forEach((h,i)=>{
        const active=i===selected,hover=i===over;
        h.outline.material.opacity=active||hover?.98:carrying?.54:.30;
        h.feltSurface.emissiveIntensity=active?.24:hover?.105:0;
      });
    },
    cameraBlocked(x:number,y:number,z:number){
      return x<=-6.24||x>=6.24||z<=-2.54||z>=9.64||y>6.05||y<.14||standBlocks.some(([left,right,back,front],i)=>
        x>left-.12&&x<right+.12&&z>back-.12&&z<front+.12&&y<[2.35,2.28,1.55,4.1,3.3][i]
      );
    },
    allowed(x:number,z:number){
      return x>-6.13&&x<6.13&&z>-2.41&&z<9.45&&!standBlocks.some(([left,right,back,front])=>x>left-.19&&x<right+.19&&z>back-.19&&z<front+.19);
    },
    setPortraitBench,
    view(aspect:number){
      if(aspect<.85)return {position:v(-2.15,5.24,9.12),target:v(-.94,2.68,1.50)};
      // Keep the sightline below the rafters as the bench framing widens.
      const narrow=1-T.MathUtils.smoothstep(aspect,.74,1.60);
      return {position:v(1.2-.68*narrow,4.12-.35*narrow,8.25+.80*narrow+1.05*(1-T.MathUtils.smoothstep(aspect,1.55,1.9))),
        target:v(-.72+.27*narrow,2.68-.12*narrow,.10+.50*narrow)};
    },
    highlight(hover:Piece|null,selected:Piece|null){
      const paint=(id:Piece,model:T.Mesh)=>{
        const {material,rim}=finishes.get(model)!;
        material.emissive.set(id===selected?'#ffba73':'#d1a98b');
        material.emissiveIntensity=id===selected?.19:id===hover?.12:0;
        rim.visible=(id===selected||id===hover)&&id!=='fan';
        syncFinish(finishes.get(model)!);
      };
      inventory.forEach((model,id)=>paint(id,model));
      holders.forEach(h=>h.shapeMap.forEach((model,id)=>paint(id,model)));
    },
    lampObject:projector,lampGrip:slider,
    focus(on:boolean){target.visible=on;},
    near(on:boolean){
      guide.color.set(on?'#fff0c2':'#ffe9bc');
      guide.opacity=on?1:.94;
    },
    endBirth(){realStar.visible=false;seal.visible=false;starHalo.visible=false;},
    update(t:number){dust.position.x=.08*Math.sin(t*.63);dust.position.y=.061*Math.cos(t*.77);const flicker=Math.sin(t*6.9)*.65+Math.sin(t*11.3)*.35;reading.intensity=1.35+.055*flicker;candle.flame.rotation.z=flicker*.025;},
    birth(t:number){
      const lift=T.MathUtils.smoothstep(t,.21,1);
      const bright=T.MathUtils.smoothstep(t,.13,.65);
      const traced=Math.min(1,t/.30);
      const count=seal.geometry.attributes.position.count;
      seal.geometry.setDrawRange(0,Math.floor(traced*count/6)*6);
      sealMaterial.opacity=(1-T.MathUtils.smoothstep(t,.55,.90))*.98;
      seal.visible=t>0&&t<.90;
      realStar.visible=t>=.10;
      goldLeaf.color.lerpColors(darkLeaf,warmLeaf,bright);
      goldLeaf.emissiveIntensity=.025+.55*bright;
      gilt.emissiveIntensity=.65*bright;gilt.opacity=T.MathUtils.smoothstep(t,.24,.64);
      realStar.position.set(starCenter[0]+.26*lift,starCenter[1]+.58*lift,.009+1.83*lift);
      realStar.rotation.set(-.12*lift,.54*lift,.22*lift);
      const size=1-.48*lift;
      realStar.scale.set(size,size,.006+.87*lift);
      starHalo.visible=t>=.24;
      starHalo.position.copy(realStar.position);starHalo.position.z-=.035;
      starHalo.scale.setScalar(2.7-1.0*lift);
      starHalo.material.opacity=.34*T.MathUtils.smoothstep(t,.23,.53);

    },
  };
}
