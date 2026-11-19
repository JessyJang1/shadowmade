import * as T from 'three';
import {ball,beam,box,cylinder,glow,group,mat,mesh,plaque,v} from './paint';
import {assessSpan,gap,spanHeightLimit,spanLandings,spanLight,spanPieces,spanPlankColors,spanPlankVertices,thinIce} from './laterOptics';
import {createReverseWorkshop} from './reverseWorkshop';
import {house,lantern,tree} from './architecture';
import {storybookPBR} from './surfaces';
import type {Vec} from './optics';

type Level=2|3;
const copper=mat('#a37b62','wood-detail');
const wood=mat('#674153','wood');
const ink=mat('#4a405c','wood');
const ice=mat('#748ba7');
const bright=glow('#fed192',1.32);

function stageBase(bridge=false,deep=false){
  const back=deep?-11.7:-6.7;
  const scene=new T.Scene();
  scene.background=new T.Color('#272945');
  scene.fog=new T.Fog('#292945',19,39);
  scene.add(new T.HemisphereLight('#bdc9fd','#725165',1.37));
  const fill=new T.DirectionalLight('#e6b99e',1.17);fill.position.set(6,7,4);scene.add(fill);
  const floorY=bridge?-.71:0;
  const flooring=['#594050','#6b4c55','#745458','#685164','#583e4c'].map(tint=>mat(tint,'wood'));
  const boardGeometry=new T.BoxGeometry(5.397,.125,deep?.947:.725);
  const boards=flooring.map(material=>new T.InstancedMesh(boardGeometry,material,15));
  const counts=flooring.map(()=>0);
  // Only the domed head of each small brass stud rises above the floorboards.
  const studHead=new T.SphereGeometry(1,8,3,0,Math.PI*2,0,Math.PI/2);
  const studs=new T.InstancedMesh(studHead,copper,48);
  const transform=new T.Object3D();
  let studCount=0;
  for(let i=0;i<23;i++)for(let j=-1;j<2;j++){
    const z=(deep?-11.1:-6.1)+i*(deep?.95:.73);
    const variant=(i+j+8)%5;
    transform.position.set(j*5.4,floorY-.07,z);
    transform.rotation.y=Math.sin(i*8.3+j)*.0017;
    transform.scale.setScalar(1);
    transform.updateMatrix();
    boards[variant].setMatrixAt(counts[variant]++,transform.matrix);
    if(i%3===0)for(const side of [-1,1]){
      transform.position.set(j*5.4+side*2.45,floorY+.002,z);
      transform.rotation.y=0;
      transform.scale.set(.029,.018,.029);
      transform.updateMatrix();
      studs.setMatrixAt(studCount++,transform.matrix);
    }
  }
  boards.forEach((batch,i)=>{batch.count=counts[i];batch.receiveShadow=true;scene.add(batch);});
  studs.count=studCount;
  scene.add(studs);
  const plaster=mat('#4d495f','plaster');
  box(scene,plaster,0,3.17,back,15.6,7.75,.26);
  for(const x of [-7.7,7.7]){
    box(scene,plaster,x,3.17,deep?-.4:1.8,.24,7.9,deep?22:17.2);
    box(scene,wood,x,5.61,deep?-.4:1.8,.34,.44,deep?22:17.1);
  }
  for(const x of [-6.7,-3.68,0,3.67,6.69]){
    box(scene,wood,x,3.45,back+.24,.24,6.87,.33).rotation.z=.035*Math.sin(x);
    box(scene,ink,x,bridge?8.16:6.71,1.15,.29,.42,16.5);
  }
  for(const y of [.23,1.44,5.79])box(scene,wood,0,y,back+.38,15.12,.17,.21);
  for(const x of [-5.72,5.45]){
    const bay=group(scene,x,1.83,back+.41);
    box(bay,ink,0,1.19,0,2.67,3.08,.32);
    const panel=mesh(bay,new T.PlaneGeometry(2.29,2.73),new T.MeshBasicMaterial({color:'#333b67'}),0,1.21,.182);
    panel.receiveShadow=false;
    ball(bay,new T.MeshBasicMaterial({color:'#c7b8d5'}),.36,2.06,.206,.23,.23,.024);
    const outside=group(bay,0,-.13,.255);outside.scale.setScalar(.17);
    for(let i=0;i<3;i++)house(outside,{x:(i-1)*3.15,y:0,z:-.15,w:2.62,d:.65,h:2.50,r:1.35,wall:'#756c8a',roof:'#403e64',seed:710+i,style:'home'});
    for(let i=0;i<2;i++)tree(outside,(i?1:-1)*5.95,0,zFor(i),4.35,631+i,false);
    for(const i of [-1,0,1])box(bay,copper,i*1.13,1.14,.358,.098,2.75,.13);
    for(const y of [-.19,1.22,2.54])box(bay,wood,0,y,.376,2.35,.098,.128);
    box(bay,wood,0,-.19,.41,2.61,.19,.39);
  }
  function zFor(index:number){return index?.27:1.13;}
  for(const [x,z] of [[-6.34,-3.44],[6.15,-2.98],[6.64,2.1]]){
    lantern(scene,x,floorY+.37,z,.84);
    const amber=new T.PointLight('#ffc08a',15,6,1.75);
    amber.position.set(x,2.35+floorY,z);scene.add(amber);
  }
  for(const sign of [-1,1]){
    const x=sign*5.36;
    for(let j=0;j<4;j++)box(scene,j%2===0?wood:ink,x,.50+j*.32,-3+j*.02,.67,.29,1.13).rotation.y=.18*j;
    for(let i=0;i<3;i++){
      const y=.28+i*.29,z=.95+i*.17;
      cylinder(scene,mat('#ccab87'),x,y,z,.13,.16,.24,12);
      ball(scene,bright,x,y+.19,z,.047,.085,.05);
    }
  }
  return scene;
}
function lightAt(scene:T.Scene,xyz:Vec,target:T.Vector3,angle:number,power:number){
  const lamp=new T.SpotLight('#ffc68b',power,22,angle,.42,1.34);
  lamp.position.set(...xyz);lamp.target.position.copy(target);scene.add(lamp,lamp.target);
  lamp.castShadow=true;lamp.shadow.mapSize.set(1536,1536);lamp.shadow.camera.near=.65;lamp.shadow.camera.far=17;
  lamp.shadow.normalBias=.006;lamp.shadow.bias=-.00012;lamp.shadow.camera.layers.set(2);
  return lamp;
}
function markCaster<TMesh extends T.Mesh>(caster:TMesh){caster.castShadow=true;caster.layers.enable(2);return caster;}
function snapshot(mesh:T.Mesh):Vec[]{
  const position=mesh.geometry.attributes.position;
  mesh.updateWorldMatrix(true,false);
  return Array.from({length:position.count},(_,i):Vec=>{
    const p=mesh.localToWorld(v(position.getX(i),position.getY(i),position.getZ(i)));
    return [p.x,p.y,p.z];
  });
}
function lanternModel(scene:T.Scene,light:T.SpotLight,vertical=false){
  const rig=group(scene);
  cylinder(rig,copper,0,0,0,.39,.34,.45,12);
  cylinder(rig,wood,0,.23,0,.32,.36,.09,12);
  ball(rig,bright,0,vertical?-.17:0,vertical?0:-.30,.245,.145,.16);
  rig.position.copy(light.position);
  return rig;
}
function bridgeStage(actions:Parameters<typeof createReverseWorkshop>[1]){
  const scene=stageBase(true);
  const board=box(scene,storybookPBR('aged-paint','#a6a8b1'),0,-.08,0,11.04,.155,5.18);board.receiveShadow=true;
  const frame=group(scene,0,0,-3.35);
  for(const x of [-4.92,4.92]){
    box(frame,wood,x,1.9,0,.29,3.8,.38);
    lantern(frame,x-.22,2.33,.48,.81,false);
    beam(frame,copper,v(x,2.65,.1),v(x*.82,3.56,.1),.12);
  }
  box(frame,ink,0,3.72,0,10.26,.29,.39);
  plaque(frame,'THE FROZEN CROSSING',2.82,.32,0,3.38,.22);
  for(const x of [-4.83,4.83])for(const z of [-1.94,1.94]){
    const foot=box(scene,wood,x,-.39,z,.26,.72,.29);
    foot.rotation.z=x*.011;
  }
  box(scene,wood,0,-.22,2.48,11.12,.27,.19);
  const river=box(scene,mat('#526980','paper'),0,.0005,0,gap*2,.027,4.91);
  river.receiveShadow=true;
  const pierMat=mat('#777289','stone-detail');
  const pier=box(scene,pierMat,0,.003,0,.75,.067,2.13);
  pier.receiveShadow=true;
  const landSills=spanLandings.map(({left,right,back,front},i)=>{
    const shore=i?right:left,landing=i?left:right,lane=(back+front)/2;
    const bank=box(scene,ice,Math.sign(shore)*(gap+1.175),-.013,0,2.35,.061,4.32);
    bank.receiveShadow=true;
    return [shore,landing].map(x=>{
      const enamel=glow('#e8b673',.39);
      box(scene,enamel,x,.044,lane,.092,.016,front-back+.18).receiveShadow=true;
      for(const z of [back-.08,front+.08]){
        box(scene,copper,x,.10,z,.12,.20,.13);
        box(scene,enamel,x,.205,z,.086,.046,.083);
      }
      return enamel;
    });
  });
  for(const dz of [-1.03,1.03]){
    box(scene,wood,0,.085,dz,.67,.18,.105);
    for(const x of [-.27,0,.27])box(scene,copper,x,.139,dz,.075,.081,.11);
  }
  const hazards=thinIce.map(({left,right,back,front})=>{
    const frost=glow('#839bb7',.135);
    const patch=box(scene,frost,(left+right)/2,.021,(back+front)/2,right-left,.006,front-back);
    patch.receiveShadow=true;
    for(let i=0;i<3;i++){
      const x=T.MathUtils.lerp(left,right,(i+1)/4),z=(back+front)/2;
      const crack=box(scene,ink,x,.027,z,Math.min((right-left)*.42,.18),.009,.023);
      crack.rotation.y=(i%2?1:-1)*.65;
    }
    return frost;
  });
  plaque(scene,'西岸',1.39,.28,-4.02,.16,1.81);
  plaque(scene,'河心石台',1.44,.23,0,.003,2.03);
  plaque(scene,'东岸',1.39,.28,4.02,.16,1.81);
  const lamp=lightAt(scene,spanLight,v(0,0,0),.65,265);
  lamp.shadow.camera.far=21;
  const lampRig=lanternModel(scene,lamp,true);
  const liftCenter=v(4.26,0,-2.08),liftBottom=2.62,liftTop=4.23;
  beam(scene,copper,v(liftCenter.x,liftBottom-.24,liftCenter.z),v(liftCenter.x,liftTop+.25,liftCenter.z),.064);
  beam(scene,wood,v(liftCenter.x,liftTop+.26,liftCenter.z),v(4.90,liftTop+.26,-3.33),.068);
  plaque(scene,'升降灯',1.14,.25,4.24,4.68,-2.09);
  const gripGlow=glow('#f0ae66',.50);
  const grip=ball(scene,gripGlow,liftCenter.x,liftTop,liftCenter.z,.39,.29,.18);
  function moveLamp(handleY:number){
    grip.position.y=T.MathUtils.clamp(handleY,liftBottom,liftTop);
    const slide=(grip.position.y-liftBottom)/(liftTop-liftBottom);
    lamp.position.y=T.MathUtils.lerp(spanHeightLimit[0],spanHeightLimit[1],slide);
    lamp.intensity=265*(lamp.position.y/spanHeightLimit[1])**1.16;
    lampRig.position.y=lamp.position.y;
  }
  const casters=spanPieces.map((p,i)=>{
    const g=group(scene,p.x,p.y,p.z);
    const material=new T.MeshStandardMaterial({vertexColors:true,color:i?'#ebc4b8':'#f6d5ae',roughness:.88});
    const geometry=new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(spanPlankVertices(i),3));
    geometry.setAttribute('color',new T.Float32BufferAttribute(spanPlankColors,3));
    geometry.computeVertexNormals();
    const solid=markCaster(mesh(g,geometry,material));
    for(let j=0;j<5;j++)box(g,i?ink:copper,(j-2)*p.w*.177,.119,0,.028,.013,p.d*.85);
    box(g,copper,0,.124,.37*p.d,.14,.025,.24);
    for(const z of [-.79,.79])beam(scene,ink,v(-3.53,p.y-.139,z),v(3.53,p.y-.139,z),.031);
    return {g,solid,material};
  });
  const journal=box(scene,mat('#dec59d','paper').clone(),-4.60,.82,2.32,1.22,.065,.88);
  journal.rotation.x=.32;journal.rotation.y=-.16;
  box(scene,wood,-4.60,.37,2.32,.16,.74,.18);
  const journalSign=plaque(scene,'渡河记录',2.55,.48,-4.60,1.33,2.30,95);
  const actionObjects=[journal,journalSign];
  const castSheets=group(scene);
  const castPaper=mat('#88664e','wood-detail'),castEdge=mat('#54485a','wood-detail');
  let winningFootprints:ReturnType<typeof assessSpan>['hulls']=[];
  return {
    scene,objects:[...casters.map(c=>c.solid),grip],actions:actionObjects,occluders:[],
    controlHints:['西侧桥板 · 拖动调整位置','东侧桥板 · 拖动调整位置','吊灯铜环 · 上下拖动'],
    actionHints:['点击阅读渡河记录','点击阅读渡河记录'],
    hoverAction(index:number|null){
      (journal.material as T.MeshStandardMaterial).emissive.set('#a87338');
      (journal.material as T.MeshStandardMaterial).emissiveIntensity=index===null?0:.18;
      (journalSign.material as T.MeshBasicMaterial).color.set(index===null?'#ffffff':'#ffe4ac');
    },
    action(_index:number){
      actions.inspect('断桥工位 · 守桥人的记录','影子不等于木板',[
        '昨日抬高吊灯，两块木板都没动，影子却缩回了岸边。靠近灯的那一块，变化更明显。',
        '河心石台能承重。两岸的旧铜条不在一条直线上，过河的人曾在石台上转过身。',
        '冰面会把灯映成红色，但红色裂纹下面没有桥墩。低灯铺开的影子，有时也压在这些裂纹上。',
      ]);
    },
    liftCastSheets(amount:number){
      if(!castSheets.children.length){
        for(const footprint of winningFootprints){
          const shape=new T.Shape(footprint.map(([x,z])=>new T.Vector2(x,-z)));
          const relief=new T.ExtrudeGeometry(shape,{depth:.20,bevelEnabled:false});
          relief.rotateX(-Math.PI/2);
          castSheets.add(new T.Mesh(relief,[castPaper,castEdge]));
        }
      }
      castSheets.position.y=.045;
      castSheets.scale.y=Math.max(.01,T.MathUtils.smoothstep(amount,.12,.78));
    },
    reset(){
      for(const sheet of [...castSheets.children]){
        castSheets.remove(sheet);(sheet as T.Mesh).geometry.dispose();
      }
      winningFootprints=[];

      casters.forEach(({g},i)=>g.position.set(spanPieces[i].x,spanPieces[i].y,spanPieces[i].z));
      moveLamp(liftTop);
    },
    camera:(aspect:number)=>({position:aspect<.85?v(4.1,9.1,14.4):v(3.75,8.15,9.25),target:v(0,1.72,0)}),
    move(index:number,at:T.Vector3){
      if(index===casters.length){moveLamp(at.y);return;}
      const {g}=casters[index];
      const {x,z}=at;
      g.position.x=T.MathUtils.clamp(x,index?.51:-2.65,index?2.65:-.51);
      g.position.z=T.MathUtils.clamp(z,-.72,.72);
    },
    select(index:number|null){
      casters.forEach(({material},i)=>{
        material.emissive.set('#9b6245');
        material.emissiveIntensity=index===i?.26:0;
      });
      gripGlow.emissiveIntensity=index===casters.length?1.4:.50;
    },
    apply(){
      const r=assessSpan(snapshot(casters[0].solid),snapshot(casters[1].solid),lamp.position.toArray());
      winningFootprints=r.matched?r.hulls:[];
      landSills.forEach(([bank,pier],i)=>{
        bank.emissiveIntensity=r.connections[i].bank?1.43:.32;
        pier.emissiveIntensity=r.connections[i].pier?1.43:.32;
      });
      hazards.forEach((material,i)=>{
        material.emissive.set(r.ice[i]?'#e57660':'#839bb7');
        material.emissiveIntensity=r.ice[i]?.70:.135;
      });
      const feedback=r.matched?'两段影路都接上了河心石台。'
        :r.connections.some(c=>c.short)?'桥影太短，还没有碰到承重铜条。木板本身的长度并没有改变。'
        :r.ice.some(Boolean)?'影子压住了红色裂冰；裂纹下面没有能承重的桥墩。'
        :'岸边与河心的铜条没有对齐。影子接住的铜条会发出暖光。';
      return {matched:r.matched,feedback};
    },
  };
}
export function createLateChapters(panel:HTMLElement,canvas:HTMLCanvasElement,camera:T.Camera,active:()=>boolean,won:(level:Level)=>void,actions:Parameters<typeof createReverseWorkshop>[1]){
  let bridge:ReturnType<typeof bridgeStage>|undefined;
  let dawn:ReturnType<typeof createReverseWorkshop>|undefined;
  const bridgeRoom=()=>bridge??=bridgeStage(actions);
  const dawnRoom=()=>{
    if(!dawn){dawn=createReverseWorkshop(stageBase(false,true),actions);dawn.reset();}
    return dawn;
  };
  let level:Level=2,result={matched:false,feedback:''},dwell=0;
  const solvedInSession=new Set<Level>();
  const currentStage=()=>level===2?bridgeRoom():dawnRoom();
  type Drag={id:number;index:number;plane:T.Plane;offset:T.Vector3};
  let drag:Drag|null=null;
  let guideMoving=false;
  const ray=new T.Raycaster(),pointer=new T.Vector2(),point=v(0,0,0);
  function refreshGuide(){
    if(level!==3)return;
    const room=dawnRoom(),guide=room.guide;
    panel.querySelector<HTMLElement>('#dawnView')!.textContent=guide.view;
    panel.querySelector<HTMLElement>('#dawnHint')!.textContent=guide.hint;
    guideMoving=room.travelling;
    panel.querySelectorAll<HTMLButtonElement>('[data-dawn-guide]').forEach((button,i)=>{
      const action=guide.actions[i];
      button.hidden=!action;
      button.disabled=guideMoving;
      if(action){
        button.textContent=action.label;
        button.dataset.dawnGuide=String(action.id);
      }
    });
  }
  function refresh(){
    result=currentStage().apply();dwell=0;
    panel.querySelector<HTMLElement>('#questFeedback')!.textContent=result.feedback;
  }
  function begin(next:Level){
    level=next;drag=null;canvas.style.cursor='';
    if(level===3)dawnRoom().stopTravel();
    const stage=currentStage();
    if(solvedInSession.delete(level))stage.reset();
    stage.select(null);
    panel.classList.toggle('dawn-guide',level===3);
    const orientation=level===3?'<strong id="dawnView"></strong>':'';
    const links=level===3?'<div class="dawn-actions"><button type="button" data-dawn-guide></button><button type="button" data-dawn-guide></button><details class="dawn-help"><summary>查看线索</summary><p id="dawnHint"></p></details></div>':'';
    panel.innerHTML=`<header>${orientation}<p id="questFeedback" role="status"></p><p id="questInteraction" class="quest-interaction" aria-live="polite"></p></header>${links}`;
    panel.querySelectorAll<HTMLButtonElement>('[data-dawn-guide]').forEach(button=>{
      button.onclick=()=>{
        if(active()&&!drag&&!dawnRoom().travelling)runAction(Number(button.dataset.dawnGuide));
      };
    });
    refreshGuide();
    refresh();
  }
  function runAction(index:number){
    currentStage().action(index);
    interaction('');
    refreshGuide();
    refresh();
  }
  function pointerRay(event:PointerEvent){
    const rect=canvas.getBoundingClientRect();
    pointer.set((event.clientX-rect.left)*2/rect.width-1,1-(event.clientY-rect.top)*2/rect.height);
    ray.setFromCamera(pointer,camera);
  }
  function picked(){
    const objects=currentStage().objects;
    const hit=ray.intersectObjects(objects,true)[0];
    if(!hit)return -1;
    if(level===3){
      const obstruction=ray.intersectObjects(dawnRoom().occluders,true)[0];
      if(obstruction&&obstruction.distance<hit.distance-.01)return -1;
    }
    for(let node:T.Object3D|null=hit.object;node;node=node.parent){
      const index=objects.findIndex(object=>object===node);
      if(index>=0)return index;
    }
    return -1;
  }
  function pickedAction(){
    const stage=currentStage(),hit=ray.intersectObjects(stage.actions,true)[0];
    if(!hit)return -1;
    const obstruction=ray.intersectObjects(stage.occluders,true)[0];
    if(obstruction&&obstruction.distance<hit.distance-.01)return -1;
    return stage.actions.findIndex(object=>object===hit.object||object===hit.object.parent);
  }
  canvas.addEventListener('pointerdown',event=>{
    if(!active()||drag||event.button!==0||level===3&&dawnRoom().travelling)return;
    pointerRay(event);
    const action=pickedAction();
    if(action>=0){runAction(action);return;}
    const index=picked();
    if(index<0)return;
    const stage=currentStage();
    const center=stage.objects[index].getWorldPosition(v(0,0,0));
    const plane=level===3||index===2?new T.Plane(v(0,0,1),-center.z):new T.Plane(v(0,1,0),-center.y);
    if(!ray.ray.intersectPlane(plane,point))return;
    drag={id:event.pointerId,index,plane,offset:center.sub(point)};
    interaction(stage.controlHints[index]+' · 松手放稳');
    stage.hoverAction(null);stage.select(index);canvas.style.cursor='grabbing';
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove',event=>{
    if(!active()||drag&&event.pointerId!==drag.id||level===3&&dawnRoom().travelling)return;
    pointerRay(event);
    const stage=currentStage();
    if(drag){
      if(!ray.ray.intersectPlane(drag.plane,point))return;
      stage.move(drag.index,point.add(drag.offset));refresh();
    }else{
      const index=picked();
      const action=pickedAction();stage.hoverAction(action<0?null:action);
      stage.select(index<0?null:index);canvas.style.cursor=index<0?(action<0?'':'pointer'):'grab';
      interaction(index>=0?stage.controlHints[index]:action>=0?stage.actionHints[action]:'');
    }
  });
  function interaction(text:string){
    const line=panel.querySelector<HTMLElement>('#questInteraction');
    if(line&&line.textContent!==text)line.textContent=text;
  }
  function cancelInput(){
    const pointerId=drag?.id;drag=null;
    if(pointerId!==undefined&&canvas.hasPointerCapture(pointerId))canvas.releasePointerCapture(pointerId);
    if(active()){currentStage().select(null);currentStage().hoverAction(null);interaction('');}
    canvas.style.cursor='';
  }
  window.addEventListener('blur',cancelInput);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelInput();});
  const release=(event:PointerEvent)=>{
    if(drag?.id!==event.pointerId)return;
    cancelInput();
  };
  canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);
  canvas.addEventListener('lostpointercapture',release);
  canvas.addEventListener('pointerleave',()=>{
    if(active()&&!drag){currentStage().select(null);currentStage().hoverAction(null);interaction('');canvas.style.cursor='';}
  });
  return {
    begin,
    stopTravel(){cancelInput();if(level===3)dawn?.stopTravel();},
    get dawnTravelling(){return dawn?.travelling??false;},
    get dawnHighlights(){return dawn?.highlights??[];},
    get questDragging(){return drag!==null;},
    get questActions(){return currentStage().actions;},
    get dawnArt(){return dawn?.artState??'not-created';},
    get scene(){return currentStage().scene;},
    liftBridgeShadow:(t:number)=>bridge?.liftCastSheets(t),
    get bridgePieces(){return level===2?(bridge?.objects??[]):[];},
    get dawnPieces(){return level===3?(dawn?.objects??[]):[];},
    get dawnActions(){return level===3?(dawn?.actions??[]):[];},
    get dawnObservation(){return dawn?.observation??'shore';},
    camera(aspect:number){return currentStage().camera(aspect);},
    update(dt:number){
      if(level===3){
        const room=dawnRoom();
        if(guideMoving!==room.travelling)refreshGuide();
      }
      if(!active()||!result.matched||drag){dwell=0;return;}
      dwell+=dt;
      if(dwell>.65){
        dwell=0;
        solvedInSession.add(level);
        won(level);
      }
    },
  };
}
