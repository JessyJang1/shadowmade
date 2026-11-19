import * as T from 'three';
import {fitToFootprint} from './assetFit';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {assessDawn,dawnFill,dawnLight,dawnPieces,dawnProfiles,dawnSensors,dawnWall} from './laterOptics';
import {ball,beam,box,cylinder,glow,group,mat,mesh,painted,plaque,shapeMesh,v} from './paint';
import dawnShutter from './data/aholo-dawn-shutter.json';
import {homewardChart} from './homewardChart';
import {storybookPBR} from './surfaces';
import type {Vec} from './optics';
import type {Bookmark} from './camera';

type Actions={
  fly:(frame:Bookmark,done:()=>void)=>void;
  inspect:(kicker:string,title:string,body:string[])=>void;
};
function triangles(object:T.Mesh):Vec[]{
  object.updateWorldMatrix(true,false);
  const {attributes,index}=object.geometry;
  const position=attributes.position;
  const point=v(0,0,0);
  const transformed=Array.from({length:position.count},(_,i):Vec=>{
    point.fromBufferAttribute(position,i).applyMatrix4(object.matrixWorld);
    return point.toArray();
  });
  return index?Array.from(index.array,i=>transformed[i]):transformed;
}

export function createReverseWorkshop(scene:T.Scene,actions:Actions){
  const wood=mat('#674153','wood'),copper=mat('#ae8567','wood-detail');
  const frame=group(scene),scaffold=group(frame);
  const cloth=new T.MeshLambertMaterial({color:'#d7bd99',map:homewardChart(),bumpMap:painted('paper'),bumpScale:.012,side:T.DoubleSide});
  // A thin transmission screen shows both incident beams. Each spotlight's
  // real shadow map still modulates its own contribution to the woven sheet.
  cloth.onBeforeCompile=shader=>{
    shader.fragmentShader=shader.fragmentShader.replace('#include <lights_lambert_pars_fragment>',
      T.ShaderChunk.lights_lambert_pars_fragment.replace(
        'saturate( dot( geometryNormal, directLight.direction ) )',
        'abs( dot( geometryNormal, directLight.direction ) )'));
    shader.fragmentShader=shader.fragmentShader.replace(
      'reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance',
      '( reflectedLight.directDiffuse + reflectedLight.indirectDiffuse * 0.18 ) * 0.62 + totalEmissiveRadiance');
  };
  const sheet=mesh(frame,new T.PlaneGeometry(9.5,5.05),cloth,0,2.83,dawnWall);
  sheet.receiveShadow=true;
  for(const x of [-4.83,4.83]){
    box(scaffold,wood,x,2.8,0,.17,5.35,.22);
    box(scaffold,wood,x,.13,0,.52,.25,1.28);
  }
  for(const y of [.24,5.44])box(scaffold,wood,0,y,0,9.82,.17,.22);
  let artState='loading';
  new GLTFLoader().loadAsync(import.meta.env.BASE_URL+'models/night-screen-frame.glb').then(asset=>{
    asset.scene.traverse(object=>{if(object instanceof T.Mesh){object.castShadow=false;object.receiveShadow=true;}});
    scene.add(asset.scene);scaffold.visible=false;artState='blender-glb';
  }).catch(error=>{artState='fallback';console.warn('Screen frame unavailable',error);});
  const rims=[glow('#d1a777',.28),glow('#d1a777',.28)];
  const goalInk=mat('#77636c','wood');
  const marks=dawnSensors.map(({x,y,r,shade})=>{
    const sides=shade?4:24;
    mesh(frame,new T.RingGeometry(r*.91,r*1.55,sides),
      new T.MeshBasicMaterial({color:shade?'#324352':'#694a35',side:T.DoubleSide}),x,y,-.016);
    const ring=mesh(frame,new T.RingGeometry(r*1.02,r*1.40,sides),
      new T.MeshBasicMaterial({color:shade?'#7a9aad':'#e6bf80',side:T.DoubleSide}),x,y,-.018);
    if(!shade)ball(frame,glow('#ffe3a3',.12),x,y,-.028,r*.11,r*.11,.005);
    return ring;
  });
  // A directional gable and entry distinguish the reversed front view.
  const houseOutline=new T.BufferGeometry().setFromPoints([
    v(1.36,1.24,-.02),v(2.52,1.24,-.02),v(2.52,2.14,-.02),
    v(1.94,2.70,-.02),v(1.36,2.14,-.02),v(1.36,1.24,-.02),
  ]);
  scene.add(new T.Line(houseOutline,new T.LineBasicMaterial({color:'#9a897c',transparent:true,opacity:.44})));
  const lintel=box(scene,goalInk,2.42,2.22,-.024,.10,.44,.015);
  lintel.rotation.z=.03;

  function lamp(position:Vec,color:string){
    const source=new T.SpotLight(color,88,20,.91,.20,1.3);
    source.position.set(...position);source.target.position.set(0,2.50,0);
    source.castShadow=true;source.shadow.mapSize.set(1024,1024);
    source.shadow.camera.near=.15;source.shadow.camera.far=15;
    source.shadow.bias=-.00008;source.shadow.normalBias=.001;
    source.shadow.autoUpdate=false;source.shadow.needsUpdate=true;
    source.shadow.camera.layers.set(2);
    scene.add(source,source.target);
    const stand=group(scene,...position);
    cylinder(stand,copper,0,-1.62,0,.045,.075,3.22,8);
    cylinder(stand,wood,0,-3.40,0,.39,.49,.21,10);
    const housing=new T.MeshStandardMaterial({color:'#394456',metalness:.42,roughness:.52});
    const brass=new T.MeshStandardMaterial({color:'#bf955b',metalness:.56,roughness:.40});
    const sleeve=group(stand);
    const body=mesh(sleeve,new T.CylinderGeometry(.31,.34,.48,24),housing);
    // Field projector with a brass lens barrel and a visible swivelling yoke.
    const inward=position[2]>0?-1:1;
    for(const end of [-1,1]){
      mesh(sleeve,new T.TorusGeometry(.318,.032,8,28),brass,0,0,end*.218);
      box(stand,brass,end*.385,-.18,0,.047,.45,.083);
      ball(stand,brass,end*.356,0,0,.055,.09,.09);
    }
    box(stand,housing,0,-.39,0,.79,.09,.11);
    for(let i=-2;i<=2;i++){
      const y=i*.079;
      box(sleeve,brass,0,y,-inward*.251,Math.sqrt(.079-y*y)*1.75,.024,.022);
    }
    body.rotation.x=Math.PI/2;
    ball(stand,glow(color,.8),0,0,position[2]>0?-.26:.26,.25,.19,.085);
    return {source,stand,sleeve};
  }
  const shore=lamp(dawnFill,'#ffd09a'),sea=lamp(dawnLight,'#b8d7ee');
  const lampLoader=new GLTFLoader();
  const models=import.meta.env.BASE_URL+'models/';
  void lampLoader.loadAsync(models+'aholo-projector-refined.glb')
    .catch(()=>lampLoader.loadAsync(models+'aholo-g1-lantern.glb')).then(({scene:model})=>{
    fitToFootprint(model,.73,.69,.53);
    model.position.y-=.36;
    model.position.z-=.05;
    sea.stand.add(model);sea.sleeve.removeFromParent();
  }).catch(error=>console.warn('Lux3D sea projector housing',error));
  const carriage=group(scene,-1.55,3.41,5.30);
  // The same source-derived relief blocks the spotlight and supplies the CPU triangle test.
  const shutterGeometry=new T.BufferGeometry();
  shutterGeometry.setAttribute('position',new T.Float32BufferAttribute(dawnShutter.position,3));
  shutterGeometry.setAttribute('color',new T.Float32BufferAttribute(dawnShutter.color,3));
  shutterGeometry.setIndex(dawnShutter.index);
  shutterGeometry.computeVertexNormals();
  const shutter=mesh(carriage,shutterGeometry,new T.MeshStandardMaterial({
    vertexColors:true,color:'#8b675a',roughness:.91,side:T.DoubleSide,
  }));
  shutter.castShadow=true;
  shutter.layers.enable(2);
  const shutterFallback=group(carriage);
  for(const x of [-.47,.47]){
    box(shutterFallback,copper,x,0,.072,.105,.18,.15);
    ball(shutterFallback,rims[0],x,0,.158,.052,.052,.025);
  }
  // The pull clears the guide rail and is mounted in world-scale coordinates.
  beam(shutterFallback,rims[0],v(-.47,0,.156),v(-.35,-.21,.255),.067);
  beam(shutterFallback,rims[0],v(.47,0,.156),v(.35,-.21,.255),.067);
  beam(shutterFallback,rims[0],v(-.36,-.21,.255),v(.36,-.21,.255),.086);
  void lampLoader.loadAsync(models+'aholo-shutter-refined.glb').then(({scene:model})=>{
    if(!model.getObjectByName('Opaque_oak_panel_·_Lux3D_relief'))
      throw new Error('The refined shutter is missing the opaque panel');
    carriage.add(model);
    shutterFallback.removeFromParent();
    // Keep the calibrated physical occluder in the spotlight's depth pass and
    // in the pointer raycast. The finish has no role in the optical mask.
    shutter.material.colorWrite=false;
    shutter.material.depthWrite=false;
  }).catch(error=>console.warn('Lux3D refined shutter',error));
  const seaGrip=mesh(sea.stand,new T.TorusGeometry(.265,.048,8,24),rims[1],0,0,-.39);
  for(let i=0;i<3;i++){
    const angle=i*2*Math.PI/3;
    beam(seaGrip,copper,v(0,0,0),v(.24*Math.cos(angle),.24*Math.sin(angle),0),.035);
  }
  ball(seaGrip,rims[1],0,0,0,.085,.085,.06);
  plaque(scene,'岸灯 · 遮光片',2.15,.33,-.85,4.43,5.37,80);
  const seaSign=plaque(scene,'海灯 · 铜环',1.95,.34,0,4.37,-6.34,80);seaSign.rotation.y=Math.PI;
  beam(scene,copper,v(-2.0,3.41,5.36),v(1.3,3.41,5.36),.041);
  beam(scene,copper,v(-1.80,3.69,-6.25),v(1.80,3.69,-6.25),.045);

  const objects=dawnPieces.map((p,i)=>{
    const profile=dawnProfiles[i].map(([x,y])=>new T.Vector2(x,y));
    const object=shapeMesh(scene,profile,storybookPBR('carved-wood',i?'#9f7384':'#b18b64'),.13,p.x,p.y,p.z,.027);
    object.castShadow=true;object.layers.enable(2);
    cylinder(scene,copper,p.x,p.y/2,p.z,.031,.045,p.y,8);
    cylinder(scene,wood,p.x,.09,p.z,.22,.28,.17,10);
    return object;
  });
  const fixtures=objects.map(triangles);
  const frontFoot=mesh(scene,new T.CircleGeometry(.37,24),new T.MeshBasicMaterial({color:'#bda986',transparent:true,opacity:.62}),5.69,.028,1.3);
  frontFoot.rotation.x=-Math.PI/2;
  const rearFoot=frontFoot.clone();rearFoot.material=frontFoot.material.clone();rearFoot.position.set(5.69,.028,-1.3);scene.add(rearFoot);
  Array.from({length:11},(_,i)=>{
    const angle=-Math.PI*.28+i*Math.PI*.056;
    const footprint=box(scene,mat('#bfa993'),5.40+.65*Math.cos(angle),.014,-.72+i*.16,.10,.015,.20);
    footprint.rotation.y=-angle;return footprint;
  });
  const frontWalk=plaque(scene,'沿脚印绕幕',2.15,.43,5.23,1.90,1.07,80);
  const rearWalk=plaque(scene,'回到岸侧',2.15,.43,5.23,1.90,-1.07,80);rearWalk.rotation.y=Math.PI;
  // A two-faced sign has one destination per direction of travel.
  const onwardFace=plaque(rearWalk,'通往海侧',2.15,.43,0,0,-.008,80);
  onwardFace.rotation.y=Math.PI;
  onwardFace.removeFromParent();
  for(const z of [1.07,-1.07])box(scene,wood,5.23,.94,z,.07,1.86,.07);
  const note=box(scene,mat('#d2bc99','paper').clone(),-3.13,1.03,2.28,1.12,.05,.82);
  note.rotation.x=.40;note.rotation.y=.18;
  const noteLabel=plaque(scene,'守灯人的纸页',2.12,.31,-3.13,1.54,2.34,78);
  box(scene,wood,-3.13,.47,2.10,.19,.94,.20);
  let aspect=16/9,seenSea=false;
  let side:'shore'|'edge'|'sea'='shore',travelling=false,journey=0;
  const controlObjects=[carriage,sea.stand];
  const clickables=[frontWalk,frontFoot,rearWalk,rearFoot,note,noteLabel];
  const frontView=()=>({position:aspect<.85?v(-5.5,6.0,12):v(-6.7,5.25,10.7),target:v(.10,2.55,.15)});
  const rearView=()=>({position:aspect<.85?v(4.7,5.25,-11.1):v(5.8,4.75,-10.5),target:v(.0,2.65,-.12)});
  const edgeView={position:v(7.0,6.5,6.0),target:v(2.0,1.7,-1.0)};
  const view=()=>side==='shore'?frontView():side==='sea'?rearView():edgeView;
  function stopTravel(){travelling=false;journey++;}
  function travel(to:'shore'|'edge'|'sea'){
    const from=side,token=++journey;
    side=to;travelling=true;
    if(to==='edge')rearWalk.add(onwardFace);
    else onwardFace.removeFromParent();
    if(to==='sea')seenSea=true;
    const opposite=from==='sea'&&to==='shore'||from==='shore'&&to==='sea';
    const arrive=()=>{if(token===journey)travelling=false;};
    // Returning uses the same visible passage. A straight tween crosses the cloth.
    if(opposite){
      actions.fly(edgeView,()=>{if(token===journey)actions.fly(view(),arrive);});
    }else actions.fly(view(),arrive);
  }

  return {
    scene,objects:controlObjects,actions:clickables,occluders:[sheet],
    controlHints:['岸灯遮光片 · 抓住板面沿铜杆拖动','海灯铜环 · 沿灯轨左右拖动'],
    get actionHints(){return [side==='shore'?'沿脚印走到幕边':'沿脚印回到岸侧',side==='shore'?'沿脚印走到幕边':'沿脚印回到岸侧',side==='sea'?'沿脚印回到岸侧':'沿脚印走向海侧',side==='sea'?'沿脚印回到岸侧':'沿脚印走向海侧','点击阅读守灯人的纸页','点击阅读守灯人的纸页'];},
    reset(){stopTravel();carriage.position.x=-1.55;sea.stand.position.x=-.95;side='shore';onwardFace.removeFromParent();seenSea=false;},
    stopTravel,
    get travelling(){return travelling;},
    get guide(){
      if(side==='shore')return {
        view:'岸侧 · 暖色岸灯',
        hint:seenSea?'沿铜杆拖动岸灯遮光片，观察遮光片怎样改变透过幕布的暖光。':'先看幕上的字，读守灯人的信，再沿脚印走到幕边。',
        actions:[{label:'读守灯人的信',id:5},{label:seenSea?'回海侧看投影':'沿脚印走到幕边',id:seenSea?2:0}],
      };
      if(side==='edge')return {
        view:'幕边 · 两侧都有灯',
        hint:'幕布会透光。到另一面看看字的方向，以及影子在哪一边有记号。',
        actions:[{label:'继续走向海侧',id:2},{label:'回到岸侧',id:0}],
      };
      return {
        view:'海侧 · 蓝色海灯',
        hint:'蓝色菱形要落在影子里，金色圆点要保持透光。左右拖海灯铜环会移动影子。',
        actions:[{label:'绕回岸侧',id:2}],
      };
    },
    camera(ratio:number){aspect=ratio;return view();},
    hoverAction(index:number|null){
      for(const [sign,at] of [[frontWalk,0],[rearWalk,2],[noteLabel,5]] as const){
        (sign.material as T.MeshBasicMaterial).color.set(index===at?'#ffe4ac':'#ffffff');
      }
      (onwardFace.material as T.MeshBasicMaterial).color.set(index===2?'#ffe4ac':'#ffffff');
      (frontFoot.material as T.MeshBasicMaterial).opacity=index===1?.96:.62;
      (rearFoot.material as T.MeshBasicMaterial).opacity=index===3?.96:.62;
      (note.material as T.MeshStandardMaterial).emissive.set('#a87338');
      (note.material as T.MeshStandardMaterial).emissiveIntensity=index!==null&&index>=4?.18:0;
    },
    action(index:number){
      if(travelling)return;
      if(index>=4){
        actions.inspect('北岸灯塔 · 守灯人的纸页','朝海写的信',[
          '这封信写给海上归来的人。岸上读来，连字也是反的。',
          '我在海侧画了两个蓝菱形，让星和屋的影子盖住它们。三个金色圆点是归航灯，要留亮。',
          '岸上的灯照透纸背，把影子照得泛白了。我绕过幕边，才看清两盏灯各照哪一面。',
        ]);
        return;
      }
      // Each footprint denotes its own bank, rather than advancing a global cycle.
      const to=index<2?(side==='shore'?'edge':'shore'):(side==='sea'?'shore':'sea');
      travel(to);
    },
    move(index:number,at:T.Vector3){
      if(index===0)carriage.position.x=T.MathUtils.clamp(at.x,-1.65,.75);
      else sea.stand.position.x=T.MathUtils.clamp(at.x,-1.75,1.75);
    },
    select(index:number|null){
      rims.forEach((material,i)=>material.emissiveIntensity=index===i?1.02:.28);
    },
    apply(){
      sea.source.position.copy(sea.stand.position);
      sea.source.shadow.needsUpdate=true;shore.source.shadow.needsUpdate=true;
      const result=assessDawn(fixtures,sea.source.position.toArray(),shore.source.position.toArray(),triangles(shutter));
      marks.forEach(({material},i)=>{
        const {shade,matched}=result.readings[i];
        material.color.set(shade?(matched?'#b2ddf5':'#7a9aad'):(matched?'#efc171':'#ad7d50'));
      });
      const dark=result.readings.filter(reading=>reading.shade&&reading.matched).length;
      const lit=result.readings.filter(reading=>!reading.shade&&reading.matched).length;
      const observation=side==='edge'
        ?'从幕边能看到，暖灯和蓝灯分别照着幕布的两面。'
        :side==='shore'
        ?seenSea?(result.washout>.05?'岸灯的光仍透到海侧，影子会泛白。':'岸灯的暖光已被挡住。回海侧看看影子。')
          :'归航图的字左右相反。画里的帆船正往哪里去？'
        :result.washout>.05
          ?'字读正了。影子仍泛白，幕布另一面透来的暖光还在。'
          :!result.matched
            ?dark<2?`暗部清楚了，星与屋还没接住全部记号。蓝菱形 ${dark}/2，金圆点 ${lit}/3。`
              :`两块影子都到位了，还有金圆点被挡住。金圆点 ${lit}/3。`
             :'海侧的星与屋接住了归航图，三点灯火穿过暗部。';
      return {...result,feedback:observation};
    },
    get observation(){return side;},
    get artState(){return artState;},
    get highlights(){return rims.map(material=>material.emissiveIntensity);},
  };
}
