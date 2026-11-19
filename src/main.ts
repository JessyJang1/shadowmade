import * as T from 'three';
import {canal,createWorld} from './world';
import {createWorkshop,flightWindow,roomEntry,type InspectId} from './workshop';
import {createShadowTraveler,townSpawn} from './shadowTraveler';
import {route} from './navigation';
import {createCamera,type Bookmark} from './camera';
import {clearViewPath,observationFrame} from './explorationViews';
import {createLateChapters} from './lateChapters';
import {createGift} from './gift';
import {landmarks,northBridgeZ} from './townLayout';
import {createTownMap} from './townMap';
import {chapters,gameName,places,routeAmber,townName} from './storyIdentity';
import {clearProgress,makeState,readProgress,saveProgress,type Phase} from './state';
import {castingSurfaces,lampAt,pieces,proofLight,restoredArrangement,starCenter,type Piece,type Placement} from './optics';
import {makeAudio} from './audio';
import {createTitleSnow} from './titleSnow';
import {glow,shapeMesh,starPoints,v} from './paint';
import './style.css';
import './homecoming.css';
import './storybook-ui.css';

const root=document.querySelector<HTMLElement>('#game')!;
root.style.setProperty('--route-amber',routeAmber);
root.innerHTML=`
  <div class="atmosphere"></div><div class="title-veil" aria-hidden="true"></div><div id="fade" aria-hidden="true"></div>
  <div class="top"><div class="stamp"><img class="emblem" src="${import.meta.env.BASE_URL}identity/moon-loom.svg" alt="" width="32" height="24"><span lang="en">${gameName.en}</span></div>
  <div class="top-actions"><button id="mapToggle" class="icon" data-glyph="map" aria-label="打开雪镇地图"></button><button id="journal" class="icon" aria-label="线索手记"></button><button id="sound" class="icon" aria-label="关闭声音" aria-pressed="false"></button><button id="pause" class="icon" aria-label="暂停或返回"></button></div></div>
  <section id="title" class="title"><h1 class="storybook-lockup"><img class="opening-logo" src="${import.meta.env.BASE_URL}identity/painted-title.webp" alt="${gameName.zh} ${gameName.en}"><span class="title-sparks" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span></h1><button id="start" disabled>开始</button><p id="loading" role="status">加载中…</p></section>
  <div id="chapter" class="chapter"><div class="eyebrow">${chapters[0].number}</div><h2>${chapters[0].title}</h2></div>
  <button id="skip" class="pill">跳过镜头</button>
  <div id="markers"></div>
  <p id="openingGuide" class="opening-guide" role="status" hidden></p>
  <button id="questExit" class="pill">离开机关 <small>Esc</small></button>
  <section id="questPanel" class="quest-panel" aria-label="光影机关"></section>
  <section id="giftPanel" class="gift-panel" aria-label="雪镇贺卡"></section><p id="giftCaption" class="gift-caption" tabindex="0"></p>
  <button id="minimap" hidden class="minimap" aria-label="打开雪镇地图" aria-describedby="mapBearing"><span><b id="mapBearing">雪镇地图</b> <small>M</small></span><canvas id="mapInset" width="268" height="203" aria-hidden="true"></canvas></button>
  <div id="mapPane" class="modal" role="dialog" aria-modal="true" aria-labelledby="mapTitle"><div class="map-sheet">
    <div class="map-top"><h2 id="mapTitle">雪镇地图</h2><button id="mapClose" aria-label="关闭地图">关闭</button></div>
    <canvas id="mapLarge" width="720" height="540" aria-label="雪镇地图，显示观察地点"></canvas>
    <div class="map-route"><p id="mapLegend"></p><button id="mapStory" hidden>跟随主线</button></div>
    <div class="map-destinations">${Object.entries(landmarks).map(([key,value])=>`<button data-destination="${key}" aria-pressed="false">${value.label}<small hidden></small></button>`).join('')}</div>
  </div></div>
  <nav id="viewActions" aria-label="场景操作"><button id="backView" class="pill">返回广场</button><button id="giftReopen" class="pill" data-glyph="gift">写贺卡</button><button id="rewardReopen" class="pill">查看旅人插画</button></nav>
  <button id="leaveBench" class="pill">离开光影台 <small>Esc</small></button>
  <div id="travelerPreview" class="modal" role="dialog" aria-modal="true" aria-labelledby="travelerPreviewTitle"><div class="paper-dialog">
    <h2 id="travelerPreviewTitle">影之旅人</h2>
    <img src="${import.meta.env.BASE_URL}identity/traveler/starlight.webp" alt="白发、星纹披风的影之旅人">
    <p>当最后一盏灯亮起，影子终于有了自己的模样。</p>
    <button id="closeTravelerPreview">返回雪镇</button>
  </div></div>
  <section id="benchHelp" class="bench-help" aria-label="光影台操作">
    <strong id="carvingName" hidden></strong><p id="feedback" role="status"></p>
    <button id="returnPiece" hidden>放回木工桌</button>
  </section>
  <canvas id="bridgeFrame" aria-hidden="true" hidden></canvas>
  <button id="skipScene" class="pill">跳过演出</button>
  <div id="solved" class="solved" role="status"><p id="solvedText"></p></div>
  <div id="note" class="modal" role="dialog" aria-modal="true" aria-labelledby="noteTitle"><div class="paper-dialog"><small class="eyebrow" id="noteKicker"></small><h2 id="noteTitle"></h2><div id="noteBody"></div><button id="closeNote">合上纸页</button></div></div>
  <div id="pausePane" class="modal" role="dialog" aria-modal="true" aria-labelledby="pauseTitle"><div>
    <div id="pauseActions"><h2 id="pauseTitle">冬夜小憩</h2><button id="resume">继续探索</button><button id="replay">重新开始整局</button></div>
    <div id="restartConfirm" hidden><h2 id="restartTitle">重新开始整局？</h2><p>三章进度与小镇复苏状态会清除。已导出的贺卡仍在你的设备上。</p>
      <p id="restartError" role="alert" hidden>当前浏览器无法清除存档，请允许本地存储后重试。</p>
      <button id="keepProgress">保留进度</button><button id="confirmReplay">清除进度并重开</button>
    </div></div></div>
  <div id="error" class="modal" role="alert"><div><h2>小镇暂未点亮</h2><p>请在支持 WebGL 2 的浏览器开启硬件加速。</p><button id="reloadGame" onclick="location.reload()">重新载入</button></div></div>
  <div id="screenStatus" class="sr" role="status" aria-live="polite"></div>`;

function byId<T extends HTMLElement=HTMLElement>(id:string){return document.getElementById(id) as T;}
const button=(id:string)=>byId<HTMLButtonElement>(id);
const show=(id:string,on:boolean)=>{byId(id).hidden=!on;};
const setText=(id:string,text:string)=>{if(byId(id).textContent!==text)byId(id).textContent=text;};

function assetStage(){
  let begin!:()=>void;
  const ready=new Promise<void>(resolve=>{begin=resolve;});
  return {ready,begin};
}

const notes={
  clock:{kicker:'钟楼门上的纸条',title:'停摆的指针',body:[
    '星星不见了，钟声也不再响起。',
    '来旧光影工坊找我。——守灯人',
  ]},
  ledger:{kicker:'旧光影工坊 · 书页',title:'守灯人的记录',body:[
    '点右页红叶，看两片翅膀怎样合出共同的心。也可以自己拖动。',
  ]},
  chart:{kicker:'旧光影工坊 · 墙上光路图',title:'灯轨试记',body:[
    '灯轨会横移。试记：我没动木雕，只挪了灯，靠灯的那道影子就滑得更远。两道影子错开时，可以试试这个办法。',
  ]},
};

function boot(){
  let renderer:T.WebGLRenderer;
  for(const id of ['chapter','pause','journal','sound','skip','feedback','benchHelp','minimap','mapPane','questPanel','questExit','giftPanel','giftCaption','giftReopen','leaveBench','skipScene','solved','note','pausePane','error','viewActions','backView','mapToggle','travelerPreview','rewardReopen'])show(id,false);
  const progress=readProgress();
  const state=makeState(root,updateHUD);
  try{renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'});}
  catch(error){console.warn(error);state.go('error');return;}
  renderer.outputColorSpace=T.SRGBColorSpace;
  renderer.toneMapping=T.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.10;
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=T.PCFShadowMap;
  const canvas=renderer.domElement;
  canvas.setAttribute('aria-label','雪镇和旧光影工坊');
  canvas.tabIndex=0;root.prepend(canvas);
  const audio=makeAudio();
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const townArt=assetStage(),workshopArt=assetStage();
  const townScene=new T.Scene(),town=createWorld(townScene,townArt.ready),room=createWorkshop(workshopArt.ready);
  const titleSnow=createTitleSnow(townScene);
  const map=createTownMap(byId<HTMLCanvasElement>('mapInset'),byId<HTMLCanvasElement>('mapLarge'),town.footprints,setMapTarget,key=>!!destinationLock(key));
  const traveler=createShadowTraveler(townScene);
  const workshopTraveler=createShadowTraveler(room.scene);
  const stageTraveler=createShadowTraveler(townScene);
  stageTraveler.body.removeFromParent();
  traveler.body.position.copy(townSpawn);
  traveler.body.position.y=town.height(townSpawn.x,townSpawn.z);
  workshopTraveler.body.position.copy(roomEntry);
  const rig=createCamera(innerWidth/innerHeight),{camera}=rig;
  let bridgeTime=0,bridgeOutside=false,returningFromBridge=false;
  let finaleTime=0,finaleOutside=false;
  let questReady=false,giftView=0,giftYaw=0,giftPitch=0;
  const late=createLateChapters(byId('questPanel'),canvas,camera,()=>state.phase==='quest'&&questReady&&!noteOpen,finishQuest,{
    fly:(frame,done)=>rig.fly(frame,reduced?.03:1.02,done),
    inspect:showNote,
  });
  const gift=createGift(byId('giftPanel'),card=>{
    if(giftView!==card.view){giftYaw=0;giftPitch=0;}
    giftView=card.view;town.setMood(card.warm);frameGift();
  });
  const markerRoot=byId('markers'), projected=v(0,0,0), ray=new T.Raycaster(), mouse=new T.Vector2();
  const viewProjection=new T.Matrix4();
  let readingClue:'ledger'|'chart'|null=null;
  let inside=false, noteOpen=false, pausedFrom:'town'|'workshop'='town';
  let mounts:(Placement|null)[]=[null,null],lampPosition=1,closeTone=false;
  let result=room.place(mounts,lampPosition),hold=0,flightTime=0,landTime=0,skipFlight=false,returningToPlaza=false;
  type Gesture=
    | {kind:'look';id:number;x:number;y:number;lastX:number;lastY:number;pinched:boolean;dragged:boolean}
    | {kind:'piece';id:number;piece:Piece;source:number|null;yaw:number;overTable:boolean;ghost:ReturnType<typeof room.proxy>;plane:T.Plane;liftPlane:T.Plane;offset:T.Vector3;liftOffset:T.Vector3;original:Placement|null;carry:T.Vector3;scale:number;restScale:number;startX:number;startY:number;moved:boolean;lifted:boolean}
    | {kind:'turn';id:number;mount:number;start:number;yaw:number}
    | {kind:'lamp';id:number;x:number;y:number;value:number};
  let gesture:Gesture|null=null;
  let gestureWidth=0,gestureHeight=0;
  const touches=new Map<number,{x:number;y:number}>();
  let aimingBench=false;
  let selectedPiece:Piece|null=null,selectedSurface:number|null=null;
  const benchNames=['后工作面','前工作面'];
  let mapOpen=false,mapTarget:keyof typeof landmarks|null=null,nextMapUpdate=0;
  const qa=new URLSearchParams(location.search).has('qa');
  // Fixed-camera asset inspections can explicitly wait for both scenes.
  if(qa&&new URLSearchParams(location.search).get('preload')==='all'){townArt.begin();workshopArt.begin();}
  const townMetrics=qa&&new URLSearchParams(location.search).has('townMetrics');
  if(qa)renderer.info.autoReset=false;
  let time=0,last=performance.now(),sample=0,frames=0;
  const streetWindow=v(-7.67,3.52,-2.30);
  const halfTurn=new T.Quaternion().setFromAxisAngle(v(0,1,0),Math.PI);
  // Both views share the same lens and depth. This transform joins the
  // workshop's local window opening to the street-facing side of the house.
  const toStreet=(p:T.Vector3)=>p.clone().sub(flightWindow).applyQuaternion(halfTurn).add(streetWindow);
  const toRoom=(p:T.Vector3)=>p.clone().sub(streetWindow).applyQuaternion(halfTurn).add(flightWindow);
  const townClip=new T.Plane(v(0,0,1),250);
  const townClipping=[townClip],noClipping:T.Plane[]=[];
  const up=v(0,1,0),starAxis=v(0,0,1),starView=new T.Matrix4();
  const facing=new T.Quaternion(),bank=new T.Quaternion();
  const landingTurn=town.clockTurn;
  const windowCamera=camera.clone();
  const flightScene=new T.Scene();
  flightScene.add(new T.HemisphereLight('#ffedc9','#392638',1.12));
  const flyingStar=room.cloneStar();
  flightScene.add(flyingStar);
  let flight:{star:T.CatmullRomCurve3;camera:T.CatmullRomCurve3;entryLook:T.Vector3;entryScale:T.Vector3;entryTurn:T.Quaternion}|null=null;
  const trail=Array.from({length:18},()=>shapeMesh(townScene,starPoints(.047),glow('#ffd189',1.45),.020));
  trail.forEach(point=>point.visible=false);

  let townRestored=progress.complete;
  town.setRestored(townRestored);
  town.setBridge(!!progress.bridge);town.setFinale(!!progress.finale);
  if(progress.composition){
    mounts=restoredArrangement.map(mount=>({...mount}));lampPosition=proofLight;
    result=room.place(mounts,lampPosition);
  }

  type Point={id:keyof typeof landmarks|'bench'|'streetLamp'|InspectId;label:string;p:T.Vector3;approach:T.Vector3};
  const townPoints:Point[]=[
    {id:'clock',label:places.clock,p:town.clockMarker,approach:v(-3.06,0,-7.1)},
    {id:'workshop',label:places.workshop,p:town.workshopMarker,approach:v(-7.78,0,-.95)},
    {id:'streetLamp',label:'广场路灯',p:v(3.44,2.58,3.65),approach:v(3.83,0,3.93)},
    {id:'plaza',label:landmarks.plaza.label,p:v(-.84,2.35,.10),approach:v(2.4,0,3.53)},
    {id:'bridge',label:'运河桥',p:v(10.9,1.6,4.1),approach:v(10.4,0,4.0)},
    ...(['market','lookout','pier','observatory'] as const).map(id=>{
      const {label,x,z}=landmarks[id];
      return {id,label,p:v(x,town.height(x,z)+1.85,z),approach:v(x,0,z)};
    }),
  ];
  const approaches={ledger:v(4.12,0,5.04),chart:v(-4.83,0,3.30),door:v(0,0,8.74)};
  const roomPoints:Point[]=Object.entries(room.markers).map(([id,data])=>({id:id as InspectId,...data,approach:approaches[id as InspectId]}));
  roomPoints.push({id:'bench',label:'使用光影台',p:v(.79,2.13,3.17),approach:v(-2.35,0,3.76)});
  const points=[...townPoints,...roomPoints];
  const markerActions:Partial<Record<Point['id'],string>>={
    clock:'查看纸条',workshop:'进入工坊',ledger:'翻开手记',chart:'查看光路图',
    bench:'使用光影台',door:'回到雪镇',pier:'操作断桥机关',observatory:'进入灯塔',
  };
  const markerSizes=new ResizeObserver(entries=>{
    for(const {target,borderBoxSize} of entries){
      const node=target as HTMLButtonElement;
      const box=borderBoxSize[0];
      if(box?.inlineSize)node.style.setProperty('--marker-half-width',box.inlineSize/2+'px');
    }
  });
  const markerButtons=new Map(points.map(point=>{
    const element=document.createElement('button');
    element.id='marker-'+point.id;element.className='world-marker';element.hidden=true;
    const name=document.createElement('span');
    name.className='marker-name';name.textContent=point.label;
    const action=document.createElement('span');
    action.className='marker-action';action.textContent=markerActions[point.id]??point.label;
    element.append(name,action);
    element.classList.add('touch-action-label');
    element.setAttribute('aria-label','前往'+point.label);
    element.addEventListener('click',()=>interact(point));markerRoot.append(element);markerSizes.observe(element);
    return [point.id,element];
  }));

  function exploration(){return state.phase==='town'||state.phase==='workshop';}
  function destinationLock(id:Point['id']){
    if(id==='workshop'&&!progress.clock)return '先调查钟楼';
    if(id==='pier'&&!progress.complete)return '先完成第一章';
    if(id==='observatory'&&!progress.bridge)return '先修复影桥';
    return '';
  }
  function available(point:Point){
    if(inside)return roomPoints.includes(point)&&(point.id!=='bench'||!progress.composition);
    return townPoints.includes(point)&&!destinationLock(point.id);
  }
  function screenPoint(world:T.Vector3){
    projected.copy(world).project(camera);
    const rect=canvas.getBoundingClientRect();
    return {x:rect.left+(projected.x+1)*rect.width/2,y:rect.top+(1-projected.y)*rect.height/2,z:projected.z};
  }
  type SceneView=Point['id']|'overview';
  let coverTime=0,entryTime=0,coverLight=-1;
  const coverPose={position:v(0,0,0),target:v(0,0,0)};
  function frameTitle(){
    const reveal=reduced?1:T.MathUtils.smootherstep(coverTime,0,3.1);
    const drift=reduced?0:Math.sin(Math.max(0,coverTime-3.1)*.35)*.13;
    const portrait=camera.aspect<.85;
    coverPose.position.set(8.45-1.12*reveal+drift,4.65-.65*reveal,14.32-1.31*reveal);
    coverPose.target.set(-2.52+(portrait?.38:0),3.50-.47*reveal,-2.52);
    rig.place(coverPose);
  }
  const plazaView:Bookmark={position:v(6.45,5.8,13.6),target:v(-.4,1.80,-1.85)};
  const roomOverview=():Bookmark=>({position:v(.55,4.05,8.2),target:v(-.45,2.25,.6)});
  let focusId:SceneView='overview',townFocus:SceneView='overview';
  let baseView=plazaView;
  let viewAzimuth=0,viewElevation=0,viewZoom=1,viewMoving=false,viewToken=0;
  function outdoorView(id:SceneView):Bookmark{
    if(id==='overview')return plazaView;
    if(id==='plaza')return {position:v(3.7,3.25,6.65),target:v(-.84,2.3,.10)};
    const p=townPoints.find(point=>point.id===id)!;
    if(id==='clock')return {position:v(-.8,3.3,-3.8),target:v(-3.15,2.7,-8.5)};
    if(id==='workshop')return {position:v(-6.1,2.75,3.1),target:v(-7.85,1.85,-2.30)};
    if(id==='observatory')return {position:v(20.5,7.8,-2.6),target:v(14.3,2.7,-11.9)};
    if(id==='pier')return {position:v(3.5,5.6,-4.2),target:v(7.35,.6,-10)};
    if(id==='bridge')return {position:v(9.7,6.2,11.4),target:v(10.15,.75,3.7)};
    if(id==='streetLamp')return {position:v(6,3.4,8),target:p.p.clone()};
    return {position:p.p.clone().add(v(2.8,2.9,4.6)),target:p.p.clone()};
  }
  type Crossing={points:T.Vector3[];length:number;distance:number;viewStarted:boolean;viewReady:boolean;destination:SceneView;frame:Bookmark|undefined;done:()=>void};
  let crossing:Crossing|undefined;
  const travelling=()=>viewMoving||!!crossing;
  const party=()=>inside?workshopTraveler:traveler;
  const passable=(x:number,z:number)=>inside?room.allowed(x,z):town.allowed(x,z);
  function crossTo(position:T.Vector3,destination:SceneView,frame:Bookmark|undefined,done:()=>void){
    const start=party().body.position;
    const path=route(start,position,passable);
    const end=path.at(-1);
    if(qa)root.dataset.routeProbe=JSON.stringify({start:start.toArray(),position:position.toArray(),from:passable(start.x,start.z),target:passable(position.x,position.z),path:path.map(p=>p.toArray())});
    if(!end||Math.hypot(end.x-position.x,end.z-position.z)>1.35){
      showNote('雪镇','路还没有通',['这段路暂时走不通。']);
      return;
    }
    let length=0,previous=start;
    for(const point of path){length+=Math.hypot(point.x-previous.x,point.z-previous.z);previous=point;}
    crossing={points:path,length,distance:0,viewStarted:false,viewReady:!frame,destination,frame,done};
    refreshViewActions();
  }
  const stepMotion=v(0,0,0);
  function updateCrossing(dt:number){
    const actor=party(),position=actor.body.position;
    const trip=crossing;
    stepMotion.set(0,0,0);
    if(trip){
      let budget=dt*(inside?2.65:4.45);
      while(trip.points.length&&budget>0){
        const target=trip.points[0],dx=target.x-position.x,dz=target.z-position.z;
        const distance=Math.hypot(dx,dz),step=Math.min(distance,budget);
        if(distance>0){
          const fraction=step/distance,x=position.x+dx*fraction,z=position.z+dz*fraction;
          if(!passable(x,z)){
            if(qa)root.dataset.routeFailure=JSON.stringify({blocked:[x,z],last:position.toArray()});
            crossing=undefined;refreshViewActions();
            showNote('雪镇','路还没有通',['这段路暂时走不通。']);
            break;
          }
          position.x=x;position.z=z;
          stepMotion.x+=dx*fraction;stepMotion.z+=dz*fraction;
          trip.distance+=step;
        }
        budget-=step;
        if(step>=distance)trip.points.shift();
      }
      position.y=inside?0:town.height(position.x,position.z);
      if(crossing&&trip.frame&&!trip.viewStarted&&(trip.distance>=trip.length*.44||!trip.points.length)){
        trip.viewStarted=true;
        travelView(trip.destination,trip.frame,()=>{trip.viewReady=true;});
      }
      if(crossing&&trip.viewReady&&!trip.points.length){
        crossing=undefined;
        refreshViewActions();
        trip.done();
      }
    }
    actor.pose(dt,stepMotion.multiplyScalar(1/Math.max(dt,.001)));
  }
  function setBaseView(id:SceneView,frame:Bookmark){
    focusId=id;
    if(!inside)townFocus=id;
    baseView=frame;
    viewAzimuth=0;viewElevation=0;viewZoom=1;
    refreshViewActions();
  }
  function viewBlocker(){return inside?room.cameraBlocked:town.cameraBlocked;}
  function peek(){
    if(travelling())return;
    const frame=observationFrame(baseView,viewAzimuth,viewElevation,viewZoom,viewBlocker());
    if(clearViewPath(camera.position,frame.position,viewBlocker()))rig.fly(frame,reduced?.03:.15,()=>{});
  }
  function travelView(id:SceneView,frame:Bookmark,done=()=>{}){
    const ticket=++viewToken;
    viewMoving=true;
    setBaseView(id,frame);
    const arrive=()=>{
      if(ticket!==viewToken)return;
      viewMoving=false;refreshViewActions();done();
    };
    if(reduced||!clearViewPath(camera.position,frame.position,viewBlocker())){
      if(!reduced)captureSceneDissolve();
      rig.cancel();rig.place(frame);
      if(reduced){arrive();return;}
      window.setTimeout(()=>{if(ticket===viewToken){clearBridgeFrame();arrive();}},490);
    }else rig.fly(frame,.76,arrive);
  }
  function refreshViewActions(){
    const phase=state.phase;
    show('viewActions',phase==='town'||phase==='workshop');
    show('backView',phase==='workshop'||phase==='town'&&focusId!=='overview');
    button('backView').disabled=travelling();
    setText('backView',phase==='workshop'?'回到街上':'返回广场');
    show('giftReopen',phase==='town'&&!!progress.finale);
    show('rewardReopen',phase==='town'&&!!progress.finale);
    setText('rewardReopen','旅人插画');
  }
  function markerAnchor(point:Point){
    return point.id==='clock'&&focusId!=='clock'
      ? town.clockDestination.clone().add(v(0,1.40,.34))
      : point.p;
  }
  let visitedWorkshop=progress.complete||progress.ledger||progress.chart;
  const openingGuide=byId('openingGuide');
  function updateMarkers(){
    const guide=state.phase==='town'&&!visitedWorkshop&&!progress.complete&&!noteOpen&&!mapOpen&&!travelling();
    if(openingGuide.hidden===guide)openingGuide.hidden=!guide;
    if(guide)setText('openingGuide',progress.clock?'点击旧光影工坊，跟上金色路标。':'点击钟楼，查看门上的纸条。');
    const primary=inside?(!progress.ledger?'ledger':!progress.chart?'chart':progress.composition?'door':'bench'):objective();
    const occupied:{x:number;y:number}[]=[];
    for(const point of [...points].sort((a,b)=>Number(b.id===primary)-Number(a.id===primary))){
      const node=markerButtons.get(point.id)!;
      const goal=point.id===primary;
      if(!exploration()||travelling()||mapOpen||noteOpen||!available(point)||guide&&!goal){node.hidden=true;continue;}
      if(!goal&&(point.id===focusId||!inside&&point.p.distanceToSquared(baseView.target)>145)){node.hidden=true;continue;}
      const anchor=markerAnchor(point);
      const at=screenPoint(anchor);
      const w=root.clientWidth,h=root.clientHeight;
      const onScreen=at.z>-1&&at.z<1&&at.x>w*.07&&at.x<w*.93&&at.y>h*.14&&at.y<h*.83;
      const obscured=!goal&&!clearViewPath(camera.position,camera.position.clone().lerp(anchor,.82),viewBlocker());
      if((!onScreen||obscured)&&!goal&&!(inside&&point.id==='bench'&&!progress.composition)){node.hidden=true;continue;}
      const x=T.MathUtils.clamp(at.z>=1?w-at.x:at.x,w*.10,w*.90);
      let y=onScreen?at.y:T.MathUtils.clamp(at.z>=1?h*.62:at.y,h*.19,h*.76);
      if(occupied.some(p=>Math.abs(p.x-x)<92&&Math.abs(p.y-y)<48))y=Math.min(h*.83,y+54);
      occupied.push({x,y});
      node.hidden=false;
      node.style.setProperty('--marker-x',x+'px');node.style.top=y+'px';
      node.classList.toggle('offscreen',!onScreen);
      const role=goal?'waypoint':'landmark';
      if(node.dataset.markerRole!==role)node.dataset.markerRole=role;
      node.setAttribute('aria-label',(markerActions[point.id]??point.label));
    }
  }
  function updateHUD(phase:Phase){
    const explore=phase==='town'||phase==='workshop';
    const cinematic=phase==='manifest'||phase==='restored'||phase==='bridgeReveal'||phase==='finaleReveal';
    const entering=phase==='intro';
    show('title',phase==='title'||phase==='boot'||entering);
    byId('title').inert=entering;
    show('chapter',phase==='workshop'||phase==='mechanism'||phase==='quest');
    show('skip',phase==='intro');show('journal',explore||phase==='mechanism');
    show('leaveBench',phase==='mechanism');
    show('pause',explore||phase==='paused');show('sound',!['boot','error'].includes(phase));
    show('markers',explore);
    show('feedback',phase==='mechanism');
    show('benchHelp',phase==='mechanism');show('mapToggle',phase==='town');
    show('questPanel',phase==='quest');show('questExit',phase==='quest');
    show('giftPanel',phase==='gift');show('giftCaption',phase==='gift');
    refreshViewActions();
    show('skipScene',cinematic);show('solved',cinematic);
    show('pausePane',phase==='paused');show('error',phase==='error');
    showSoundState();
    updateObjective();
  }
  function updateObjective(){
    const inRoom=state.phase==='workshop'||state.phase==='mechanism';
    root.classList.toggle('first-step',state.phase==='town'&&!progress.clock);
    const chapter=chapters[inRoom?0:progress.bridge?2:progress.complete?1:0];
    byId('chapter').querySelector('h2')!.textContent=chapter.title;
    byId('chapter').querySelector('.eyebrow')!.textContent=chapter.number;
  }

  function showNote(kicker:string,title:string,body:string[],clock=false){
    cancelInput();
    noteOpen=true;
    byId('note').classList.toggle('clock-note',clock);
    setText('closeNote',clock?'收起纸条':'合上纸页');
    setText('noteKicker',kicker);setText('noteTitle',title);
    byId('noteBody').replaceChildren(...body.map(text=>{const p=document.createElement('p');p.textContent=text;return p;}));
    show('note',true);button('closeNote').focus({preventScroll:true});
  }
  const paperOverlay=byId('note');
  let paperPress:{id:number;x:number;y:number;dragged:boolean}|null=null;
  function paperCaption(){
    setText('noteBody',room.folio.joined()?'两片叶子合成了夜蛾。再点红翼，就能展开。':notes.ledger.body[0]);
  }
  paperOverlay.addEventListener('pointerdown',e=>{
    if(readingClue!=='ledger'||e.target!==paperOverlay||e.button!==0)return;
    if(room.folio.begin(e.pointerId,rayAt(e))){
      paperPress={id:e.pointerId,x:e.clientX,y:e.clientY,dragged:false};
      paperOverlay.setPointerCapture(e.pointerId);
    }
  });
  paperOverlay.addEventListener('pointermove',e=>{
    if(paperPress?.id!==e.pointerId)return;
    if(Math.hypot(e.clientX-paperPress.x,e.clientY-paperPress.y)>6)paperPress.dragged=true;
    if(paperPress.dragged){room.folio.move(e.pointerId,rayAt(e));paperCaption();}
  });
  paperOverlay.addEventListener('pointerup',e=>{
    if(paperPress?.id!==e.pointerId)return;
    if(!paperPress.dragged)room.folio.toggle();
    paperCaption();
  });
  paperOverlay.addEventListener('lostpointercapture',()=>{paperPress=null;room.folio.release();});
  function closeNote(){
    const fromClue=!!readingClue;
    if(fromClue){paperPress=null;room.folio.release();rig.cancel();readingClue=null;root.classList.remove('reading-clue');}
    noteOpen=false;nextMapUpdate=0;show('note',false);
    if(fromClue)travelView('door',roomOverview());
    updateMarkers();
    canvas.focus();
  }
  function journal(){
    if(!byId('travelerPreview').hidden){hideTravelerPreview();return;}
    if(noteOpen){closeNote();return;}
    if((!exploration()&&state.phase!=='mechanism')||gesture)return;
    const collected=[
      ...(progress.clock?['钟楼纸条：星星不见了，钟声也不再响起。寻找旧光影工坊。']:[]),
      ...(progress.ledger?['书页：先观察每件物品的影。两道影重叠成共同的心，并从不同方向补足枝尖。']:[]),
      ...(progress.chart?['光路图：灯横移相同距离，靠灯木件的影子移得更远。']:[]),
    ];
    showNote('第一章','线索手记',collected.length?collected:['还没有发现线索。']);
  }
  function perform(point:Point){

    if(point.id==='streetLamp'){
      showNote('中央广场','守夜的路灯',[progress.complete?'钟楼恢复报时，沿街灯火都亮起来了。':'灯火还守在这里，钟楼却已经很久没有报时。']);
      return;
    }
    if(point.id==='workshop'||point.id==='door'){changeRoom(point.id==='workshop');return;}
    if(point.id==='bench'){enterBench();return;}
    if(point.id==='pier'||point.id==='observatory'){enterQuest(point.id==='pier'?2:3);return;}
    if(point.id==='clock'||point.id==='ledger'||point.id==='chart'){
      const note=notes[point.id];
      if(point.id==='clock'&&!progress.clock){
        mapTarget=null;nextMapUpdate=0;
        workshopArt.begin();
      }
      progress[point.id]=true;saveProgress(progress);
      if(point.id==='ledger'||point.id==='chart'){
        readingClue=point.id;
        root.classList.add('reading-clue');
        rig.fly(room.readingView(camera.aspect,readingClue),reduced?.04:.65,()=>{});
      }
      showNote(note.kicker,note.title,point.id==='ledger'&&room.folio.joined()?['两片叶子合成了夜蛾。再点红翼，就能展开。']:note.body,point.id==='clock');updateObjective();audio.cue('hint');
    }
  }
  function interact(point:Point){
    if(!exploration()||noteOpen||travelling()||!byId('travelerPreview').hidden||!available(point))return;
    const frame=inside||focusId===point.id?undefined:outdoorView(point.id);
    crossTo(point.approach,point.id,frame,()=>perform(point));
  }
  function cameraLens(bench:boolean,widen=0){
    const base=camera.aspect<.85?(bench?T.MathUtils.radToDeg(2*Math.atan(.53/camera.aspect)):63):54;
    camera.fov=T.MathUtils.lerp(base,Math.max(base,68),widen);
    camera.updateProjectionMatrix();
  }
  function enterBench(){
    if(state.phase!=='workshop'||progress.composition)return;
    gesture=null;touches.clear();
    aimingBench=true;room.setPortraitBench(camera.aspect<.85);cameraLens(true);state.go('mechanism');room.focus(true);room.lightSurfaces(null,false,selectedSurface);refreshBench();
    rig.fly(room.view(camera.aspect),reduced?.05:.43,()=>{aimingBench=false;});
    canvas.focus();
  }
  function leaveBench(){
    if(state.phase!=='mechanism')return;
    cancelInput();aimingBench=false;
    rig.cancel();cameraLens(false);room.setPortraitBench(false);room.focus(false);room.showHandle(null);room.highlight(null,null);room.lightSurfaces(null,false);selectedPiece=null;selectedSurface=null;hold=0;state.go('workshop');
    travelView('door',roomOverview());canvas.focus();
  }
  function fadeTo(done:()=>void){
    const node=byId('fade');
    node.classList.add('dark');
    window.setTimeout(()=>{
      done();requestAnimationFrame(()=>node.classList.remove('dark'));
    },reduced?35:255);
  }
  function changeRoom(toRoom:boolean){
    if(toRoom){visitedWorkshop=true;workshopArt.begin();}
    gesture=null;touches.clear();
    state.go('doorway');
    fadeTo(()=>{
      inside=toRoom;rig.reset();
      if(toRoom)workshopTraveler.body.position.copy(roomEntry);
      setBaseView(toRoom?'door':'workshop',toRoom?roomOverview():outdoorView('workshop'));
      rig.place(baseView);
      room.setPortraitBench(false);room.focus(false);
      state.go(toRoom?'workshop':'town');canvas.focus();audio.cue('enter');
    });
  }
  function objective():keyof typeof landmarks|null{
    if(progress.bridge&&!progress.finale)return 'observatory';
    if(progress.complete&&!progress.composition&&progress.clock)return 'workshop';
    if(progress.finale)return null;
    if(progress.complete)return 'pier';
    return progress.clock?'workshop':'clock';
  }
  function enterQuest(level:2|3){
    if(state.phase!=='town')return;

    mapTarget=null;gesture=null;touches.clear();questReady=false;
    late.begin(level);
    late.scene.add(stageTraveler.body);
    stageTraveler.body.position.copy(level===2?v(-4.75,0,3.65):v(4.65,0,4.30));
    state.go('quest');
    rig.place(late.camera(camera.aspect));questReady=true;
    audio.cue('enter');canvas.focus();
  }
  function leaveQuest(){
    if(state.phase!=='quest')return;
    questReady=false;canvas.style.cursor='';late.stopTravel();rig.cancel();rig.reset();state.go('town');canvas.focus();
    rig.place(baseView);
  }
  function finishQuest(level:2|3){
    if(state.phase!=='quest'||!questReady)return;
    questReady=false;
    if(level===2){
      const built=progress.bridge;
      progress.bridge=true;saveProgress(progress);
      if(built){
        leaveQuest();audio.cue('bridge');
        setText('screenStatus','两段影路已接通。镇里的桥仍可通行。');
      }else{
        bridgeTime=0;bridgeOutside=false;returningFromBridge=false;
        state.go('bridgeReveal');
        if(reduced){completeBridgeReveal();return;}
        setText('solvedText','两段影子接上了河心石台');
        const board=late.camera(camera.aspect);
        rig.fly({position:board.position.lerp(board.target,.12),target:board.target.add(v(0,-.55,0))},.90,()=>{});
        audio.cue('lock');
      }
      return;
    }
    const alreadyLit=progress.finale;
    progress.finale=true;
    saveProgress(progress);
    if(alreadyLit||reduced){
      town.setFinale(true);
      leaveQuest();
      if(!alreadyLit)showTravelerPreview();
      audio.cue('homecoming');
      return;
    }
    late.stopTravel();
    rig.cancel();
    finaleTime=0;
    finaleOutside=false;
    state.go('finaleReveal');
    setText('solvedText','归航图亮了');
    audio.cue('homecoming');
  }

  const finaleScreenHold=.72;
  const finaleFollowAt=2.80;
  function completeFinale(){
    clearBridgeFrame();
    town.setFinale(true);
    rig.cancel();
    const end=finaleOutside?rig.bookmark():outdoorFollowFrame();
    setBaseView(townFocus,end);
    rig.place(end);
    state.go('town');
    canvas.focus();
    setText('screenStatus','最后一盏灯亮起。影子拥有了形体。');
  }
  function revealFinaleOutside(){
    captureSceneDissolve();
    finaleOutside=true;
    rig.place({position:v(23,8.8,-3.8),target:v(15,2.8,-10.8)});
    rig.fly({position:v(20.5,8.1,.2),target:v(14.2,2.2,-9.2)},2.40,()=>{});
    setText('solvedText','北岸灯塔重新照亮河面');
  }
  function updateFinale(dt:number){
    const before=finaleTime-finaleScreenHold;
    finaleTime+=dt;
    if(!finaleOutside)return;
    const age=finaleTime-finaleScreenHold;
    if(age>=.46&&before<.46)clearBridgeFrame();
    if(age>=.92&&before<.92)setText('solvedText','灯火沿归航路依次亮起');
    town.setFinale(true,age);
    if(age>=finaleFollowAt&&before<finaleFollowAt){
      const focus=traveler.body.position.clone();
      const reveal={position:focus.clone().add(v(3.8,1.42,.10)),target:focus.clone().add(v(0,1.03,0))};
      setText('solvedText','影子终于有了自己的模样');
      // Keep the character framed during the reveal. Crossfade if the straight
      // camera path is blocked, since the spectator has no physical actor.
      if(clearViewPath(camera.position,reveal.position,town.cameraBlocked)){
        rig.fly(reveal,.9,()=>{});
      }else{
        captureSceneDissolve();rig.cancel();rig.place(reveal);
      }
    }
    if(age>=finaleFollowAt+1.72){
      clearBridgeFrame();
      completeFinale();
    }
  }
  const bridgeBoardHold=1.26;
  function clearBridgeFrame(){
    const cut=byId<HTMLCanvasElement>('bridgeFrame');
    if(cut.hidden)return;
    cut.hidden=true;
    cut.width=cut.height=1;
  }
  function captureSceneDissolve(){
    const cut=byId<HTMLCanvasElement>('bridgeFrame');
    cut.width=canvas.width;cut.height=canvas.height;
    cut.getContext('2d')?.drawImage(canvas,0,0);
    cut.classList.remove('dissolve');show('bridgeFrame',true);
    requestAnimationFrame(()=>requestAnimationFrame(()=>cut.classList.add('dissolve')));
  }
  function revealBridgeAtRiver(){
    captureSceneDissolve();
    bridgeOutside=true;
    const center=canal(northBridgeZ);
    const pullback=Math.max(1,Math.min(1.86,.87/camera.aspect));
    const view={position:v(center+4.2*pullback,6.65*pullback,northBridgeZ-5.7*pullback),target:v(center,.08,northBridgeZ)};
    rig.cancel();rig.place(view);
    rig.fly({position:v(center+3.65*pullback,5.15*pullback,northBridgeZ-5.08*pullback),target:v(center,.48,northBridgeZ)},3.0,()=>{});
    town.showBridgeFormation(0);
    setText('solvedText','影路倒映在河面上');
  }
  function outdoorFollowFrame(){return outdoorView(townFocus);}
  function completeBridgeReveal(end?:ReturnType<typeof rig.bookmark>){
    clearBridgeFrame();town.setBridge(true);
    const arrival=end??outdoorFollowFrame();
    returningFromBridge=false;bridgeOutside=false;
    setBaseView(townFocus,arrival);rig.cancel();rig.place(arrival);
    state.go('town');canvas.focus();
    setText('screenStatus','新桥已经成形。点击北岸灯塔继续。');
  }
  function updateBridgeReveal(dt:number){
    const before=bridgeTime-bridgeBoardHold;
    bridgeTime+=dt;
    if(!bridgeOutside){late.liftBridgeShadow(bridgeTime/bridgeBoardHold);return;}
    if(returningFromBridge)return;
    const age=Math.max(0,bridgeTime-bridgeBoardHold);
    if(age>=.46&&before<.46)clearBridgeFrame();
    if(age>=1.02&&before<1.02)setText('solvedText','两段桥面从影中升起');
    if(age>=2.34&&before<2.34||age>=2.59&&before<2.59)audio.cue('timber');
    town.showBridgeFormation(Math.min(1,age/3.16));
    if(age>=3.16&&before<3.16){
      town.setBridge(true);audio.cue('bridge');setText('solvedText','桥已落稳，可以过河了');
    }
    if(age<4.25)return;
    returningFromBridge=true;
    show('solved',false);
    const end=outdoorFollowFrame();
    rig.fly(end,1.28,()=>completeBridgeReveal(end));
  }
  function frameGift(){
    const bookmarks=[
      {position:v(10.2,6.2,16.4),target:v(-1.08,2.63,-3.2)},
      {position:v(9.8,4.71,12.65),target:v(-1.51,2.35,-.55)},
      {position:v(20,6.8,-6.8),target:v(14.97,2.65,-12.98)},
    ];
    const view=bookmarks[giftView];
    const offset=view.position.clone().sub(view.target).applyAxisAngle(T.Object3D.DEFAULT_UP,giftYaw);
    offset.y+=giftPitch;
    view.position.copy(view.target).add(offset);
    rig.place(view);
  }
  function enterGift(){
    if(state.phase!=='town'&&state.phase!=='quest')return;
    if(!progress.finale)return;
    rig.cancel();questReady=false;giftYaw=0;giftPitch=0;state.go('gift');
    gift.begin();
    button('giftExit').onclick=leaveGift;
    button('giftSave').onclick=()=>gift.capture(renderer,townScene,camera,resize);
  }
  function leaveGift(){
    if(state.phase!=='gift')return;
    town.setMood(false);rig.cancel();rig.place(baseView);state.go('town');canvas.focus();
  }
  button('questExit').onclick=leaveQuest;
  button('giftReopen').onclick=enterGift;
  let photoDrag:{id:number;x:number;y:number}|null=null;
  canvas.addEventListener('pointerdown',event=>{
    if(state.phase!=='gift'||event.button!==0)return;
    photoDrag={id:event.pointerId,x:event.clientX,y:event.clientY};
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove',event=>{
    if(state.phase!=='gift'||photoDrag?.id!==event.pointerId)return;
    giftYaw=T.MathUtils.clamp(giftYaw-(event.clientX-photoDrag.x)*.003,-.49,.49);
    giftPitch=T.MathUtils.clamp(giftPitch+(event.clientY-photoDrag.y)*.014,-2,4);
    photoDrag.x=event.clientX;photoDrag.y=event.clientY;frameGift();
  });
  const endPhoto=(event:PointerEvent)=>{if(photoDrag?.id===event.pointerId)photoDrag=null;};
  canvas.addEventListener('pointerup',endPhoto);canvas.addEventListener('pointercancel',endPhoto);
  canvas.addEventListener('lostpointercapture',endPhoto);
  function refreshBench(){
    const drag=gesture?.kind==='piece'?gesture:null;
    const casting=drag?.lifted?mounts.map((item,index)=>index===drag.source?null:item):mounts;
    result=room.place(casting,lampPosition,drag?.ghost.visible?drag.piece:null);hold=0;
    refreshBenchHelp();
  }
  function refreshBenchHelp(){
    const drag=gesture?.kind==='piece'?gesture:null;
    const casting=drag?.lifted?mounts.map((item,index)=>index===drag.source?null:item):mounts;
    const selected=drag?null:mounts.find(item=>item?.piece===selectedPiece);
    const index=selected?mounts.indexOf(selected):null;
    const name=pieces.find(item=>item.id===selected?.piece)?.label;
    show('carvingName',!!name);
    if(name)setText('carvingName',name);
    room.showHandle(index);
    show('returnPiece',!!selected);
    button('returnPiece').setAttribute('aria-label',name?'放回木工桌：'+name:'放回木工桌');
    const count=casting.filter(Boolean).length;
    room.highlight(null,selectedPiece);
    const close=count===2&&result.coverage>.83&&result.spill<.17;
    room.near(close);
    if(close&&!closeTone&&state.phase==='mechanism')audio.cue('hint');
    closeTone=close;
    let feedback='点木雕上台，看幕上的影子。';
    if(result.matched)feedback='两道影在星心合拢了。';
    else if(count===1 && (selected || selectedSurface===null || mounts[selectedSurface]))feedback='这一道影子还缺一部分。左右拖铜轮转动木雕，再选一件来补。';
    else if(count===2)feedback=selected?'左右拖铜轮旋转，拖木雕移动。看两道影子能否接上。':'看看幕上的缺口。点木雕可拖动和旋转，拖灯可以错开影子。';
    else if(selectedSurface!==null){
      feedback=benchNames[selectedSurface]+'已选，点桌上木雕'+(mounts[selectedSurface]?'换件。':'上台。');
    }
    if(close&&!selected&&!drag)feedback='星心亮了。沿幕上的缺口和越界处微调。';
    setText('feedback',feedback);
  }
  function setLamp(value:number){
    lampPosition=T.MathUtils.clamp(value,0,2);
    refreshBench();
  }
  function finishEntry(){
    state.go('town');
    nextMapUpdate=0;
    updateMap();
    updateMarkers();
    canvas.focus();
  }
  function skip(){
    if(state.phase!=='intro')return;
    rig.cancel();
    rig.place(baseView);
    finishEntry();
  }
  function start(){
    if(state.phase!=='title')return;
    entryTime=0;audio.start();audio.enter();audio.cue('overture');state.go('intro');
    rig.fly(plazaView,reduced?.13:1.78,finishEntry);
  }
  function confirmRestart(open:boolean){
    show('pauseActions',!open);show('restartConfirm',open);show('restartError',false);
    byId('pausePane').setAttribute('aria-labelledby',open?'restartTitle':'pauseTitle');
    button(open?'keepProgress':'replay').focus();
  }
  function pause(){
    if(travelling())return;
    if(mapOpen){closeMap();return;}
    if(state.phase==='quest'){leaveQuest();return;}
    if(state.phase==='gift'){leaveGift();return;}
    if(!byId('travelerPreview').hidden){hideTravelerPreview();return;}
    if(noteOpen){closeNote();return;}
    if(state.phase==='intro'){skip();return;}
    if(state.phase==='paused'){
      if(!byId('restartConfirm').hidden){confirmRestart(false);return;}
      state.go(pausedFrom);canvas.focus();return;
    }
    if(state.phase!=='town'&&state.phase!=='workshop')return;
    gesture=null;touches.clear();
    pausedFrom=state.phase;state.go('paused');button('resume').focus();
  }
  function manifest(){
    progress.complete=true;progress.composition=true;
    if(!saveProgress(progress))setText('screenStatus','本次游玩的变化已生效，当前浏览器无法保存进度。');
    gesture=null;flightTime=0;skipFlight=false;
    state.go('manifest');room.focus(false);room.showHandle(null);room.birth(0);
    setText('solvedText','星形拼好了');audio.cue('win');
    if(!reduced)rig.fly(revealFrame(),1.48,()=>{});
  }
  function revealFrame(){
    const frame=room.view(camera.aspect),focus=room.worldAt(...starCenter);
    return {position:frame.position.lerp(focus,.10),target:frame.target.lerp(focus,.43)};
  }
  const landingFrame={position:v(6.5,7.65,13.2),target:v(-.85,4.38,-.08)};
  const clockFrame={position:town.clockDestination.clone().add(v(3.13,1.30,6.66)),
    target:town.clockDestination.clone().add(v(0,-.28,0))};
  const landingHold=4.24;
  function launchStar(){
    const departure=room.departingStar(),frame=revealFrame();
    room.endBirth();room.openFlightView(true);rig.cancel();
    return {
      star:new T.CatmullRomCurve3([
        toStreet(departure.position),toStreet(v(-2.48,3.68,-.95)),streetWindow.clone(),
        v(-6.59,3.96,1.36),v(-4.53,4.47,2.91),v(-2.67,5.04,4.62),v(.28,5.87,4.42),v(2.80,6.68,1.81),
        v(1.15,7.72,-3.55),town.clockDestination.clone().add(v(.25,.27,1.56)),town.clockDestination.clone(),
      ]),
      camera:new T.CatmullRomCurve3([
        toStreet(frame.position),toStreet(v(-1.52,4.22,2.38)),toStreet(v(-4.12,3.54,-.60)),
        toStreet(v(-4.34,3.50,-3.65)),v(-9.06,5.60,.65),v(-8.91,7.04,5.22),
        v(-6.40,8.08,9.02),v(.75,8.10,12.04),v(5.32,8.30,9.42),
        v(4.68,7.69,3.42),v(2.72,7.46,.46),clockFrame.position.clone(),
      ]),
      entryLook:toStreet(frame.target),entryScale:departure.scale,
      entryTurn:new T.Quaternion().setFromEuler(departure.rotation).premultiply(halfTurn),
    };
  }
  function landStar(skip:boolean){
    flight=null;inside=false;cameraLens(false);room.endBirth();room.openFlightView(false);rig.cancel();
    setBaseView('workshop',outdoorView('workshop'));
    rig.place(reduced?landingFrame:clockFrame);
    trail.forEach(point=>point.visible=false);
    townRestored=true;town.setRestored(true,0);
    landTime=0;returningToPlaza=false;state.go('restored');
    setText('solvedText','星星归位了');
    if(skip)returnToTown();
    else audio.cue('lock');
  }
  function returnToTown(){
    returningToPlaza=false;
    town.setRestored(true);
    rig.cancel();rig.reset();rig.place(baseView);
    state.go('town');canvas.focus();
  }
  function returnToPlaza(){
    if(reduced){returnToTown();return;}
    returningToPlaza=true;
    show('solved',false);
    rig.reset();
    rig.fly(baseView,1.40,returnToTown);
  }
  function updateFlight(dt:number){
    if(skipFlight){landStar(true);return;}
    flightTime+=dt;
    const birthDuration=reduced?.85:1.55;
    if(!flight){
      const birth=Math.min(1,flightTime/birthDuration);
      room.birth(birth);
      if(birth>=.27)setText('solvedText','星星离开了幕布');
      if(birth<1)return;
      if(reduced){landStar(false);return;}
      flight=launchStar();
    }
    const shot=flight;
    const time=Math.min(1,(flightTime-birthDuration)/7.60);
    // Ease away from the still pose; ease back into the carousel's finial.
    const step=time*time*(3-2*time);
    flyingStar.position.copy(shot.star.getPoint(step));
    // Clear the sill before the first lamp lights, then open the shot down
    // toward the snow so the star and the lights can share the frame.
    const ahead=T.MathUtils.smoothstep(step,.17,.31)*(1-T.MathUtils.smoothstep(step,.50,.78));
    const streetFraming=T.MathUtils.smoothstep(step,.23,.37)*(1-T.MathUtils.smoothstep(step,.65,.88));
    const position=shot.camera.getPoint(step+.038*ahead);
    cameraLens(true,streetFraming);
    starView.lookAt(position,flyingStar.position,up);
    bank.setFromAxisAngle(starAxis,.22*Math.sin(step*11));
    facing.setFromRotationMatrix(starView).multiply(bank);
    flyingStar.quaternion.copy(shot.entryTurn).slerp(facing,T.MathUtils.smoothstep(step,0,.22));
    flyingStar.quaternion.slerp(landingTurn,T.MathUtils.smoothstep(step,.86,1));
    const scale=.41/1.15;
    flyingStar.scale.copy(shot.entryScale).lerp(v(scale,scale,.90),T.MathUtils.smoothstep(step,.48,1));
    const target=shot.entryLook.clone().lerp(flyingStar.position,T.MathUtils.smoothstep(step,0,.13));
    target.y-=1.38*streetFraming;
    target.lerp(clockFrame.target,T.MathUtils.smoothstep(step,.88,1));
    rig.place({position,target});
    trail.forEach((point,i)=>{
      const q=step-.006*(i+1);point.visible=q>=.25&&time<1;
      if(point.visible){
        point.position.copy(shot.star.getPoint(q));
        point.position.y+=.055*Math.cos(flightTime*6+i);
        point.scale.setScalar(1-.73*i/trail.length);
      }
    });
    if(time===1)landStar(false);
  }
  function renderTown(throughWindow=false){
    // Keep the same shader variant in exploration and during the shot. Only
    // the plane's distance changes, so crossing the window never compiles shaders.
    townClip.constant=throughWindow?-streetWindow.z:250;
    renderer.clippingPlanes=townClipping;
    town.prepareView(camera);
    renderer.render(townScene,camera);
    renderer.clippingPlanes=noClipping;
  }
  function renderStarFlight(){
    windowCamera.copy(camera);
    windowCamera.position.copy(toRoom(camera.position));
    windowCamera.quaternion.premultiply(halfTurn);
    windowCamera.updateMatrixWorld();
    // When inside, discard the town geometry behind the opening. The room
    // then writes into the same depth buffer, leaving the real street visible
    // between jambs and occluding the star correctly on either side.
    renderTown(camera.position.z<streetWindow.z);
    renderer.autoClear=false;
    if(windowCamera.position.z>flightWindow.z-.38){
      const background=room.scene.background;
      room.scene.background=null;
      renderer.render(room.scene,windowCamera);
      room.scene.background=background;
    }
    renderer.render(flightScene,camera);
    renderer.autoClear=true;
  }

  function rayAt(event:{clientX:number;clientY:number}){
    const bounds=canvas.getBoundingClientRect();
    mouse.set((event.clientX-bounds.left)*2/bounds.width-1,1-(event.clientY-bounds.top)*2/bounds.height);
    ray.setFromCamera(mouse,camera);
    return ray.ray;
  }
  const worldPosition=(obj:T.Object3D)=>obj.getWorldPosition(v(0,0,0));
  const shelfCenter=(obj:T.Mesh)=>obj.localToWorld(obj.geometry.boundingBox!.getCenter(v(0,0,0)));
  function hit<T>(event:PointerEvent,targets:{value:T;anchor:T.Object3D|T.Vector3;radius:number}[]){
    let best=Infinity,selected:T|null=null;
    for(const {value,anchor,radius} of targets){
      const p=screenPoint(anchor instanceof T.Vector3?anchor:worldPosition(anchor));
      const distance=Math.hypot(event.clientX-p.x,event.clientY-p.y);
      if(p.z<1&&distance<radius&&distance<best){selected=value;best=distance;}
    }
    return selected;
  }
  const pickRadius=()=>camera.aspect<.85?24:33;
  function tablePoint(event:PointerEvent,y:number){
    const plane=new T.Plane(v(0,1,0),-room.worldAt(0,y,0).y);
    return rayAt(event).intersectPlane(plane,v(0,0,0));
  }
  function workSurfaceAt(event:PointerEvent){
    const point=tablePoint(event,castingSurfaces[0].top);
    if(!point)return null;
    const {x,z}=room.toStage(point);
    const index=castingSurfaces.findIndex(surface=>Math.abs(x-surface.x)<surface.width/2+.03&&Math.abs(z-surface.z)<surface.depth/2+.03);
    return index<0?null:{index,x,z};
  }
  function dropTarget(event:PointerEvent,source:number|null){
    const surface=workSurfaceAt(event);
    if(surface&&surface.index!==source)return surface;
    const visible=mountedTargets().filter(target=>target.value!==source);
    rayAt(event);
    const mountedHit=ray.intersectObjects(visible.map(target=>target.anchor),false)[0]?.object;
    const mounted=visible.find(target=>target.anchor===mountedHit);
    if(!mounted){
      if(source!==null)return null;
      // Near misses belong to the closest felt edge. Measure in screen pixels
      // so the rear table and small windows get the same forgiveness.
      let closest=null,best=24;
      for(const [index,s] of castingSurfaces.entries()){
        const flat=tablePoint(event,s.top);
        if(!flat)continue;
        const p=room.toStage(flat);
        const x=T.MathUtils.clamp(p.x,s.x-s.width/2,s.x+s.width/2);
        const z=T.MathUtils.clamp(p.z,s.z-s.depth/2,s.z+s.depth/2);
        const edge=screenPoint(room.worldAt(x,s.top,z));
        const d=Math.hypot(edge.x-event.clientX,edge.y-event.clientY);
        if(d<best){best=d;closest={index,x,z};}
      }
      return closest;
    }
    const {x,z}=mounts[mounted.value]!;
    return {index:mounted.value,x,z};
  }
  function supported(index:number,placement:Placement){
    const {x,z,width,depth}=castingSurfaces[index];
    return {...placement,x:T.MathUtils.clamp(placement.x,x-width/2+.16,x+width/2-.16),
      z:T.MathUtils.clamp(placement.z,z-depth/2+.13,z+depth/2-.13)};
  }
  function touchesOther(index:number,placement:Placement,source:number|null=null){
    const other=source===1-index?null:mounts[1-index];
    if(!other)return false;
    const incoming=room.pieceBounds(index,placement).expandByScalar(.015);
    return incoming.intersectsBox(room.pieceBounds(1-index,other));
  }
  function placeOnSurface(index:number,piece:Piece,x:number,z:number,yaw:number,source:number|null=null){
    const placement=supported(index,{piece,x,z,yaw});
    if(touchesOther(index,placement,source))return false;
    if(source!==null)mounts[source]=null;
    mounts[index]=placement;
    selectedSurface=index;selectedPiece=piece;
    audio.cue('place');
    return true;
  }
  function clickShelf(piece:Piece,yaw:number){
    const empty=mounts[1]===null?1:mounts[0]===null?0:null;
    const index=selectedSurface!==null&&selectedPiece===null?selectedSurface:empty??selectedSurface;
    if(index===null)return '点一下要换件的台面，再点新木雕。';
    const old=mounts[index],center=castingSurfaces[index];
    const anchor=old??center;
    if(!placeOnSurface(index,piece,anchor.x,anchor.z,yaw) &&
      (!old||!placeOnSurface(index,piece,center.x,center.z,yaw))){
      return '两件木雕会相碰。可以移开另一件，或把新件拖到台面的空处。';
    }
    return old?'已换件。左右拖旁边的铜轮旋转。':'已上台。左右拖铜轮，看看影子怎么转。';
  }
  function selectWorkSurface(index:number){
    selectedSurface=index;selectedPiece=null;
    room.lightSurfaces(null,false,index);refreshBench();
  }
  function mountedTargets(){
    return room.holders.flatMap((h,index)=>h.rendered?[{value:index,anchor:h.rendered,radius:pickRadius()}]:[]);
  }
  function shelfTargets(){
    return [...room.inventory].flatMap(([piece,anchor])=>anchor.visible?[{value:piece,anchor,radius:pickRadius()}]:[]);
  }
  type BenchTarget={kind:'piece';piece:Piece;source:number|null}|{kind:'turn';mount:number}|{kind:'lamp'}|{kind:'surface';index:number};
  function pickBench(event:PointerEvent){
    const wheels=room.holders.flatMap((holder,index)=>holder.grip.visible
      ? [{anchor:holder.grip,radius:23,value:index}]:[]);
    const handle=hit(event,wheels);
    if(event.pointerType==='touch'){
      // The visible control centre must stay grabbable even against a nearby carving.
      const knob=hit<BenchTarget>(event,[
        ...wheels.map(w=>({anchor:w.anchor,radius:16,value:{kind:'turn' as const,mount:w.value}})),
        {anchor:room.lampGrip,radius:16,value:{kind:'lamp'}}
      ]);
      if(knob)return knob;
    }
    const candidates:{value:BenchTarget;anchor:T.Object3D;radius:number}[]=[
      ...mountedTargets().flatMap(({value,anchor,radius})=>{
        const target={kind:'piece' as const,piece:mounts[value]!.piece,source:value};
        return [{anchor,radius,value:target},{anchor:room.holders[value].rod,radius:0,value:target}];
      }),
      ...shelfTargets().map(({value,anchor,radius})=>({anchor,radius,value:{kind:'piece' as const,piece:value,source:null}})),
      {anchor:room.lampGrip,radius:27,value:{kind:'lamp'}},
      {anchor:room.lampObject,radius:29,value:{kind:'lamp'}},
    ];
    rayAt(event);
    const direct=ray.intersectObjects(candidates.filter(target=>target.anchor instanceof T.Mesh).map(target=>target.anchor),false)[0];
    const wheelHit=ray.intersectObjects(wheels.map(wheel=>wheel.anchor),true)[0];
    if(wheelHit&&(!direct||wheelHit.distance<direct.distance)){
      return {kind:'turn' as const,mount:wheels[0].value};
    }
    if(direct)return candidates.find(target=>target.anchor===direct.object)!.value;
    if(handle!==null)return {kind:'turn' as const,mount:handle};
    if(event.pointerType==='touch'){
      const shelf=hit(event,shelfTargets().map(({anchor,value})=>({anchor:shelfCenter(anchor),value,radius:24})));
      if(shelf!==null)return {kind:'piece' as const,piece:shelf,source:null};
    }
    const surface=workSurfaceAt(event);
    return surface?{kind:'surface' as const,index:surface.index}:hit(event,candidates);
  }
  function startPiece(event:PointerEvent,piece:Piece,source:number|null){
    audio.cue('lift');
    const original=source===null?room.inventory.get(piece)!:room.holders[source].rendered!;
    const origin=worldPosition(original);
    const current=source===null?null:{...mounts[source]!};
    const ghost=room.proxy(piece);
    ghost.position.copy(origin);
    ghost.rotation.copy(original.rotation);
    const yaw=current?.yaw??original.userData.placementYaw;
    if(current)ghost.rotation.y=yaw;
    const restScale=original.getWorldScale(v(0,0,0)).x;
    ghost.scale.setScalar(restScale);ghost.visible=false;
    const liftPlane=new T.Plane().setFromNormalAndCoplanarPoint(camera.getWorldDirection(v(0,0,0)),origin);
    const plane=new T.Plane(v(0,1,0),-origin.y);
    const ray=rayAt(event);
    const offset=origin.clone().sub(ray.intersectPlane(plane,v(0,0,0))??origin);
    const liftOffset=origin.clone().sub(ray.intersectPlane(liftPlane,v(0,0,0))??origin);
    gesture={kind:'piece',id:event.pointerId,piece,source,yaw,overTable:false,ghost,plane,liftPlane,offset,liftOffset,original:current,
      carry:origin.clone(),scale:restScale,restScale,startX:event.clientX,startY:event.clientY,moved:false,lifted:false};
    canvas.style.cursor='grabbing';
    if(source!==null){selectedSurface=source;selectedPiece=null;}
    room.lightSurfaces(null,true,selectedSurface);
    refreshBench();
  }
  function updatePiece(event:PointerEvent,action:Extract<Gesture,{kind:'piece'}>){
    if(!action.moved&&Math.hypot(event.clientX-action.startX,event.clientY-action.startY)<6)return;
    action.moved=true;
    const {source,piece,ghost}=action;
    const flat=rayAt(event).intersectPlane(action.plane,v(0,0,0));
    const point=flat?room.toStage(flat.add(action.offset)):null;
    if(source!==null&&point){
      const surface=castingSurfaces[source];
      // A little overtravel at the edge still means sliding on the felt.
      // Once lifted, the piece has to come back onto the felt before it lands.
      const margin=action.lifted?0:.19;
      const leaving=Math.abs(point.x-surface.x)>surface.width/2+margin||
        Math.abs(point.z-surface.z)>surface.depth/2+margin;
      if(leaving&&!action.lifted&&room.holders[source].rendered){
        ghost.position.copy(worldPosition(room.holders[source].rendered!));
      }
      action.lifted=leaving;
      if(!action.lifted){
        const pose=supported(source,{...mounts[source]!,x:point.x,z:point.z});
        if(!touchesOther(source,pose))mounts[source]=pose;
      }
    }
    const drop=dropTarget(event,source);
    action.overTable=!!drop&&drop.index!==source;
    const wasCarried=ghost.visible;
    ghost.visible=source===null||action.lifted;
    room.lightSurfaces(ghost.visible?drop?.index??null:source,true,selectedSurface);
    if(ghost.visible){
      if(drop&&drop.index!==source){
        const pose=supported(drop.index,{piece,x:drop.x,z:drop.z,yaw:action.yaw});
        action.carry.copy(room.worldAt(pose.x,room.castHeight(drop.index,piece),pose.z));
        action.scale=1;
      }else{
        const held=rayAt(event).intersectPlane(action.liftPlane,v(0,0,0));
        if(held)action.carry.copy(held.add(action.liftOffset));
        action.scale=action.restScale;
      }
    }
    if(ghost.visible)room.keepCarriedAboveFurniture(piece,ghost,action.carry);
    if(!ghost.visible||!wasCarried)refreshBench();
    if(action.lifted||source===null){
      if(drop&&drop.index!==source){
        setText('feedback',mounts[drop.index]?'松手替换这件木雕，原件会回木工桌。':'松手把木雕放到这个工作面。');
      }else if(action.lifted)setText('feedback','松手放回木工桌，或拖到另一个工作面。');
    }
  }
  function endPiece(event:PointerEvent|null,action:Extract<Gesture,{kind:'piece'}>){
    const {source,piece,ghost}=action;
    let feedback='';
    if(!event){if(source!==null)mounts[source]=action.original;}
    else if(!action.moved){
      if(source===null)feedback=clickShelf(piece,action.yaw);
      else selectedPiece=piece;
    }
    else if(action.moved&&(source===null||action.lifted)){
      const drop=dropTarget(event,source);
      if(drop&&drop.index!==source){
        const previous=mounts[drop.index];
        if(placeOnSurface(drop.index,piece,drop.x,drop.z,action.yaw,source)){
          if(previous)feedback='已换件。左右拖旁边的铜轮旋转。';
        }else{
          if(source!==null)mounts[source]=action.original;
          feedback='两件木雕在这里会相碰。试试把新件放到工作面的外侧。';
        }
      }else if(source!==null){
        mounts[source]=null;audio.cue('place');feedback='木雕已放回木工桌。';
      }
    }
    if(source!==null&&mounts[source]?.piece===piece){
      selectedPiece=piece;
      if(event && action.moved && !action.lifted)audio.cue('place');
    }
    room.releaseProxy(ghost);
    canvas.style.cursor='';
    room.lightSurfaces(null,false,selectedSurface);refreshBench();
    if(feedback)setText('feedback',feedback);
  }
  button('returnPiece').onclick=()=>{
    if(state.phase!=='mechanism'||gesture||noteOpen)return;
    const index=mounts.findIndex(pose=>!!pose&&pose.piece===selectedPiece);
    if(index<0)return;
    mounts[index]=null;selectedPiece=null;
    refreshBench();audio.cue('place');canvas.focus();
    setText('feedback','木雕已放回木工桌。');
  };
  function startTurn(event:PointerEvent,index:number){
    const pose=mounts[index];
    if(!pose)return;
    selectedSurface=index;selectedPiece=pose.piece;
    room.lightSurfaces(null,false,index);refreshBench();
    gesture={kind:'turn',id:event.pointerId,mount:index,start:event.clientX,yaw:pose.yaw};
    canvas.classList.add('turning');
  }
  function turnAt(event:PointerEvent,action:Extract<Gesture,{kind:'turn'}>){
    const candidate={...mounts[action.mount]!,yaw:action.yaw+(event.clientX-action.start)/72};
    if(touchesOther(action.mount,candidate))setText('feedback','两件木雕碰到了。先把其中一件移开一点。');
    else{mounts[action.mount]=candidate;refreshBench();}
  }
  function pinchDistance(){
    const [a,b]=touches.values();
    return a&&b?Math.hypot(a.x-b.x,a.y-b.y):null;
  }
  function scenePointAt(event:PointerEvent){
    return hit(event,points.filter(point=>available(point)&&!markerButtons.get(point.id)!.hidden).map(point=>({value:point,anchor:markerAnchor(point),radius:inside?38:70})));
  }
  let hoveredPoint:Point|null=null;
  function highlightScene(point:Point|null){
    if(hoveredPoint)markerButtons.get(hoveredPoint.id)?.classList.remove('scene-hover');
    hoveredPoint=point;
    if(point)markerButtons.get(point.id)?.classList.add('scene-hover');
  }
  canvas.addEventListener('pointerleave',()=>{
    highlightScene(null);
    if(state.phase==='mechanism'&&!gesture){refreshBenchHelp();canvas.style.cursor='';}
  });
  canvas.addEventListener('pointerdown',event=>{
    if((!exploration()&&state.phase!=='mechanism')||travelling()||aimingBench||mapOpen||noteOpen||event.button!==0)return;
    canvas.setPointerCapture(event.pointerId);
    touches.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if(gesture){if(gesture.kind==='look')gesture.pinched=true;return;}
    gestureWidth=canvas.clientWidth;gestureHeight=canvas.clientHeight;
    if(state.phase==='mechanism'){
      const target=pickBench(event);
      if(target?.kind==='lamp'){gesture={kind:'lamp',id:event.pointerId,x:event.clientX,y:event.clientY,value:lampPosition};canvas.style.cursor='grabbing';return;}
      if(target?.kind==='turn'){startTurn(event,target.mount);return;}
      if(target?.kind==='piece')startPiece(event,target.piece,target.source);
      else if(target?.kind==='surface')selectWorkSurface(target.index);
      return;
    }
    gesture={kind:'look',id:event.pointerId,x:event.clientX,y:event.clientY,lastX:event.clientX,lastY:event.clientY,pinched:false,dragged:false};
  });
  canvas.addEventListener('pointermove',event=>{
    if(!gesture){
      if(state.phase==='mechanism'&&!aimingBench){
        const target=pickBench(event);
        const named=target?.kind==='piece'?target.piece:selectedPiece;
        const controlName=target?.kind==='turn'?'铜轮 · 左右拖动':target?.kind==='lamp'?'灯轨 · 沿轨道拖动':'';
        if(target?.kind==='piece')setText('feedback',target.source===null?'点击上台　·　按住拖放':'拖木雕移位　·　左右拖铜轮旋转');
        else if(byId('feedback').dataset.hover==='piece')refreshBenchHelp();
        byId('feedback').dataset.hover=target?.kind==='piece'?'piece':'';
        show('carvingName',!!named||!!controlName);
        if(controlName)setText('carvingName',controlName);
        else if(named)setText('carvingName',pieces.find(p=>p.id===named)!.label);
        room.highlight(target?.kind==='piece'?target.piece:null,selectedPiece);
        room.lightSurfaces(target?.kind==='surface'?target.index:null,false,selectedSurface);
        canvas.style.cursor=target?.kind==='surface'?'pointer':target?'grab':'';
      }else{
        const point=exploration()&&!travelling()&&!noteOpen&&!mapOpen?scenePointAt(event):null;
        highlightScene(point);canvas.style.cursor=point?'pointer':'';
      }
      return;
    }
    const oldDistance=pinchDistance();
    if(touches.has(event.pointerId))touches.set(event.pointerId,{x:event.clientX,y:event.clientY});
    const newDistance=pinchDistance();
    if(gesture.kind==='look'&&oldDistance&&newDistance){viewZoom=T.MathUtils.clamp(viewZoom*oldDistance/newDistance,.84,1.20);peek();return;}
    if(gesture.id!==event.pointerId)return;
    if(canvas.clientWidth!==gestureWidth||canvas.clientHeight!==gestureHeight){cancelInput();return;}
    if(gesture.kind==='piece'){
      updatePiece(event,gesture);
    }else if(gesture.kind==='lamp'){
      const start=lampAt(0),end=lampAt(2);
      const a=screenPoint(room.worldAt(start[0],3.14,start[2]+.42));
      const b=screenPoint(room.worldAt(end[0],3.14,end[2]+.42));
      const dx=b.x-a.x,dy=b.y-a.y;
      setLamp(gesture.value+2*((event.clientX-gesture.x)*dx+(event.clientY-gesture.y)*dy)/Math.max(1,dx*dx+dy*dy));
    }else if(gesture.kind==='turn'){
      turnAt(event,gesture);
    }else if(!gesture.pinched){
      if(!gesture.dragged&&Math.hypot(event.clientX-gesture.x,event.clientY-gesture.y)<=6)return;
      gesture.dragged=true;
      const dx=event.clientX-gesture.lastX,dy=event.clientY-gesture.lastY;
      gesture.lastX=event.clientX;gesture.lastY=event.clientY;
      viewAzimuth=T.MathUtils.clamp(viewAzimuth-dx*.004,-.42,.42);
      viewElevation=T.MathUtils.clamp(viewElevation+dy*.003,-.20,.25);
      peek();
    }
  });
  function release(event:PointerEvent,cancelled=false){
    touches.delete(event.pointerId);
    if(!gesture||gesture.id!==event.pointerId)return;
    const action=gesture;
    cancelled ||= canvas.clientWidth!==gestureWidth||canvas.clientHeight!==gestureHeight;
    if(action.kind==='piece'&&!cancelled)updatePiece(event,action);
    gesture=null;
    if(action.kind==='piece'){endPiece(cancelled?null:event,action);return;}
    if(action.kind==='lamp'){if(cancelled)setLamp(action.value);canvas.style.cursor='';return;}
    if(action.kind==='turn'){
      canvas.classList.remove('turning');
      if(cancelled)mounts[action.mount]!.yaw=action.yaw;
      canvas.style.cursor='';refreshBench();
      if(!cancelled && Math.abs(mounts[action.mount]!.yaw-action.yaw)>.025)audio.cue('turn');return;
    }
    if(cancelled||action.pinched||action.dragged)return;
    const target=scenePointAt(event);
    if(target)interact(target);
  }
  canvas.addEventListener('pointerup',event=>release(event));
  canvas.addEventListener('pointercancel',event=>release(event,true));
  canvas.addEventListener('lostpointercapture',event=>release(event,true));
  canvas.addEventListener('wheel',event=>{
    if(!exploration()||gesture||mapOpen||noteOpen)return;
    event.preventDefault();viewZoom=T.MathUtils.clamp(viewZoom*Math.exp(event.deltaY*.001),.84,1.20);peek();
  },{passive:false});
  window.addEventListener('keydown',event=>{
    if(event.altKey||event.ctrlKey||event.metaKey)return;
    if(event.code==='Space'&&event.target instanceof HTMLButtonElement)return;
    const key=event.key.toLowerCase();
    if(mapOpen){
      if(['m','escape'].includes(key)){event.preventDefault();if(!event.repeat)closeMap();return;}
      return;
    }
    if(!event.repeat&&key==='m'&&state.phase==='town'&&!noteOpen){event.preventDefault();openMap();return;}
    if(noteOpen&&key==='escape'){
      event.preventDefault();if(!event.repeat)closeNote();return;
    }
    if(state.phase==='mechanism'){
      if(key==='escape'&&!event.repeat){event.preventDefault();leaveBench();}
      return;
    }
    if(key==='escape'&&!event.repeat){event.preventDefault();pause();return;}
  });
  function cancelInput(){
    const action=gesture;
    const captured=[...touches.keys()];
    gesture=null;touches.clear();
    for(const id of captured)if(canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);
    if(action?.kind==='piece')endPiece(null,action);
    if(action?.kind==='turn'){canvas.classList.remove('turning');mounts[action.mount]!.yaw=action.yaw;refreshBench();}
    if(action?.kind==='lamp')setLamp(action.value);
    canvas.style.cursor='';
  }
  function suspendInput(){
    cancelInput();
  }
  window.addEventListener('blur',suspendInput);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)suspendInput();});
  const destinationButtons=Array.from(root.querySelectorAll<HTMLButtonElement>('[data-destination]'));
  function openMap(){
    if(state.phase!=='town'||noteOpen||travelling()||!byId('travelerPreview').hidden)return;
    gesture=null;touches.clear();mapOpen=true;show('mapPane',true);
    const goal=mapTarget??objective();
    for(const control of destinationButtons){
      const key=control.dataset.destination as keyof typeof landmarks;
      const lock=destinationLock(key);
      const badge=control.querySelector('small')!;
      badge.textContent=lock;badge.hidden=!lock;
      control.disabled=!!lock;
      control.setAttribute('aria-pressed',String(key===goal));
    }
    show('mapStory',mapTarget!==null);
    nextMapUpdate=0;updateMap();
    button('mapClose').focus();
  }
  function closeMap(){
    mapOpen=false;nextMapUpdate=0;show('mapPane',false);canvas.focus();
  }
  function setMapTarget(key:keyof typeof landmarks|null){
    if(key&&destinationLock(key))return;
    mapTarget=key===objective()?null:key;
    closeMap();updateObjective();
    if(key){const point=townPoints.find(point=>point.id===key);if(point)interact(point);}
  }
  button('mapToggle').onclick=openMap;button('mapClose').onclick=closeMap;
  button('mapStory').onclick=()=>setMapTarget(null);
  destinationButtons.forEach(control=>{
    control.onclick=()=>setMapTarget(control.dataset.destination as keyof typeof landmarks);
  });
  function updateMap(){
    if(!mapOpen||state.phase!=='town'||time<nextMapUpdate)return;
    nextMapUpdate=time+.1;
    setText('mapLegend','白色箭头标出旅人。点选地标，旅人会沿街前往。');
    map.draw(traveler.body.position,Math.PI-traveler.body.rotation.y,[],mapTarget??objective(),true,!!progress.bridge);
  }
  function showTravelerPreview(){
    if(!progress.finale)return;
    show('travelerPreview',true);
    button('closeTravelerPreview').focus();
  }
  function hideTravelerPreview(){show('travelerPreview',false);canvas.focus();}
  button('closeTravelerPreview').onclick=hideTravelerPreview;
  button('rewardReopen').onclick=showTravelerPreview;
  button('backView').onclick=()=>{
    if(travelling()||noteOpen)return;
    if(inside){const door=roomPoints.find(point=>point.id==='door')!;interact(door);}
    else crossTo(townSpawn,'overview',plazaView,()=>{});
  };
  button('leaveBench').onclick=leaveBench;
  button('start').onclick=start;button('skip').onclick=skip;
  button('skipScene').onclick=()=>{
    if(state.phase==='bridgeReveal')completeBridgeReveal();
    else if(state.phase==='finaleReveal')completeFinale();
    else if(state.phase==='restored')returnToTown();
    else if(state.phase==='manifest')skipFlight=true;
  };
  button('journal').onclick=journal;button('closeNote').onclick=closeNote;
  button('pause').onclick=button('resume').onclick=pause;
  button('replay').onclick=()=>confirmRestart(true);
  button('keepProgress').onclick=()=>confirmRestart(false);
  button('confirmReplay').onclick=()=>{
    if(clearProgress())location.reload();
    else show('restartError',true);
  };
  function showSoundState(){
    const sound=button('sound');
    sound.setAttribute('aria-pressed',String(audio.muted));
    const label=audio.muted?'开启声音':state.phase==='title'&&!audio.requested?'播放序曲':'关闭声音';
    sound.setAttribute('aria-label',label);
    sound.title=label;
  }
  showSoundState();
  button('sound').onclick=()=>{
    if(audio.requested||audio.muted)audio.toggle();
    if(!audio.muted)audio.start();
    showSoundState();
  };
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();renderer.setAnimationLoop(null);state.go('error');});

  function resize(){
    const width=root.clientWidth,height=root.clientHeight;
    camera.aspect=width/Math.max(1,height);cameraLens(state.phase==='mechanism'||state.phase==='manifest'&&inside);
    // CSS and input keep their full size. Cap the GPU buffer on Retina and
    // large displays, where each render pass would otherwise shade extra pixels.
    const pixelBudget=2_400_000;
    const density=Math.min(devicePixelRatio,1.25,Math.sqrt(pixelBudget/Math.max(1,width*height)));
    renderer.setPixelRatio(density);renderer.setSize(width,height,false);
    if(state.phase==='mechanism'){cancelInput();room.setPortraitBench(camera.aspect<.85);rig.cancel();aimingBench=false;rig.place(room.view(camera.aspect));}
    if(state.phase==='quest'){late.stopTravel();rig.cancel();rig.place(late.camera(camera.aspect));}
    if(readingClue){rig.cancel();rig.place(room.readingView(camera.aspect,readingClue));}
    if(state.phase==='gift')frameGift();
    if(state.phase==='boot'||state.phase==='title'){
      frameTitle();
      titleSnow.frame(camera,density);
    }

  }
  resize();addEventListener('resize',resize);
  function recordTargets(){
    if(!qa)return;
    const position=party().body.position;
    root.dataset.position=position.x.toFixed(2)+','+position.z.toFixed(2);
    root.dataset.travelerPassable=String(passable(position.x,position.z));
    root.dataset.travelerWalking=String(!!crossing);
    root.dataset.camera=camera.position.toArray().map(n=>n.toFixed(3)).join(',');
    root.dataset.yaw=rig.yaw.toFixed(4);
    root.dataset.observation=focusId;
    root.dataset.viewMoving=String(travelling());
    root.dataset.benchReady=String(state.phase==='mechanism'&&!aimingBench);
    if(state.phase==='quest'){
      root.dataset.viewProjection=JSON.stringify(viewProjection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse).toArray());
      root.dataset.bridgePieces=JSON.stringify(late.bridgePieces.map(piece=>piece.getWorldPosition(v(0,0,0)).toArray()));
      root.dataset.dawnPieces=JSON.stringify(late.dawnPieces.map(piece=>piece.getWorldPosition(v(0,0,0)).toArray()));
      root.dataset.dawnActions=JSON.stringify(late.dawnActions.map(piece=>piece.getWorldPosition(v(0,0,0)).toArray()));
      root.dataset.dawnObservation=late.dawnObservation;
      root.dataset.dawnTravelling=String(late.dawnTravelling);
      root.dataset.questCamera=JSON.stringify(camera.position.toArray());
      root.dataset.dawnHighlights=JSON.stringify(late.dawnHighlights);
      root.dataset.questDragging=String(late.questDragging);
      root.dataset.questActions=JSON.stringify(late.questActions.map(object=>object.getWorldPosition(v(0,0,0)).toArray()));
      root.dataset.dawnArt=late.dawnArt;
    }
    if(!inside)return;
    root.dataset.viewProjection=JSON.stringify(viewProjection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse).toArray());
    const projectedTargets:Record<string,ReturnType<typeof screenPoint>>={};
    const supports:Partial<Record<Piece,number>>={};
    for(const [id,obj] of room.inventory){
      const point=screenPoint(shelfCenter(obj));
      supports[id]=obj.position.y+obj.userData.shelfBottom*obj.scale.y;
      projectedTargets[id+'Home']=point;
      if(obj.visible)projectedTargets[id]=point;
    }
    room.holders.forEach((h,i)=>{
      const surface=castingSurfaces[i];
      projectedTargets['surface'+i]=screenPoint(room.worldAt(surface.x,surface.top,surface.z));
      if(h.rendered){
        projectedTargets['held'+i]=screenPoint(worldPosition(h.rendered));
        if(h.grip.visible)projectedTargets['turn'+i]=screenPoint(worldPosition(h.grip));
      }
    });
    projectedTargets.lamp=screenPoint(worldPosition(room.lampGrip));
    root.dataset.targets=JSON.stringify(projectedTargets);
    root.dataset.shelfContact=JSON.stringify(supports);
    root.dataset.mounts=JSON.stringify(mounts);
    root.dataset.activeWorkSurface=String(selectedSurface??'');
    root.dataset.lamp=String(lampPosition);
    root.dataset.shadow=JSON.stringify(result);
  }
  function draw(now:number){
    if(qa)renderer.info.reset();
    const real=(now-last)/1000,elapsed=Math.max(0,real);
    const dt=Math.min(.06,elapsed),cinematicDt=Math.min(.13,elapsed);
    last=now;time+=dt;
    if(exploration()&&!mapOpen&&!noteOpen)updateCrossing(Math.min(elapsed,.13));
    if(gesture?.kind==='piece'&&gesture.ghost.visible){
      const blend=1-Math.exp(-dt*26);

      if(gesture.source===null){
        const shelf=room.inventory.get(gesture.piece)!.rotation;
        gesture.ghost.rotation.x=T.MathUtils.lerp(gesture.ghost.rotation.x,gesture.overTable?0:shelf.x,blend);
        const yawDelta=(gesture.overTable?gesture.yaw:shelf.y)-gesture.ghost.rotation.y;
        gesture.ghost.rotation.y+=Math.atan2(Math.sin(yawDelta),Math.cos(yawDelta))*blend;
        gesture.ghost.rotation.z=T.MathUtils.lerp(gesture.ghost.rotation.z,gesture.overTable?0:shelf.z,blend);
      }
      gesture.ghost.scale.setScalar(T.MathUtils.lerp(gesture.ghost.scale.x,gesture.scale,blend));
      room.keepCarriedAboveFurniture(gesture.piece,gesture.ghost,gesture.carry);
    }
    rig.update(state.phase==='intro'||state.phase==='manifest'||state.phase==='bridgeReveal'||state.phase==='finaleReveal'?cinematicDt:dt);
    if(inside)room.update(time);
    if(readingClue==='ledger'){
      room.folio.pose(reduced?0:time,dt);
      if(qa){
        const grip=room.folio.grip();
        root.dataset.paper=JSON.stringify({grip:screenPoint(grip),mate:screenPoint(grip.clone().add(room.folio.solutionDelta())),joined:room.folio.joined()});
      }
    }
    const outdoorScene=!inside&&state.phase!=='quest'&&(state.phase!=='bridgeReveal'||bridgeOutside)&&(state.phase!=='finaleReveal'||finaleOutside);
    if(outdoorScene||flight)town.update(time);
    if(state.phase==='title'){coverTime+=cinematicDt;frameTitle();}
    else if(state.phase==='intro')entryTime+=cinematicDt;
    const night=state.phase==='title'||state.phase==='boot'?1:state.phase==='intro'?
      1-T.MathUtils.smoothstep(entryTime,0,reduced?.13:1.78):0;
    if(coverLight!==night){coverLight=night;town.setTitleLight(night);}
    titleSnow.show(night*(reduced?.45:1),reduced?0:coverTime+entryTime);
    audio.update(state.phase==='title'?'title':['boot','paused','error'].includes(state.phase)?'quiet':'game');
    if(state.phase==='mechanism'){
      hold=result.matched&&!aimingBench&&!noteOpen&&!gesture?hold+dt:0;
      if(hold>.48)manifest();
    }else if(state.phase==='quest'&&questReady)late.update(dt);
    else if(state.phase==='manifest')updateFlight(cinematicDt);
    else if(state.phase==='bridgeReveal')updateBridgeReveal(cinematicDt);
    else if(state.phase==='finaleReveal')updateFinale(cinematicDt);
    else if(state.phase==='restored'&&!returningToPlaza){
      const before=landTime;
      landTime+=dt;
      town.setRestored(true,landTime);
      if(before<.37&&landTime>=.37){
        audio.cue('land');setText('solvedText','钟声归来，长街重新亮起');
      }
      if(!reduced&&before<1.12&&landTime>=1.12)rig.fly(landingFrame,1.86,()=>{});
      if(landTime>=landingHold)returnToPlaza();
    }
    if(qa&&state.phase==='town'&&root.dataset.artCamera){
      const values=root.dataset.artCamera.split(',').map(Number);
      if(values.length===6&&values.every(Number.isFinite)){
        camera.position.set(values[0],values[1],values[2]);
        camera.lookAt(values[3],values[4],values[5]);
        camera.updateMatrixWorld();
      }
    }
    camera.updateMatrixWorld();
    const chapterLights=Number(progress.complete)+Number(progress.bridge);
    const form=state.phase==='finaleReveal'
      ? T.MathUtils.smoothstep(finaleTime-finaleScreenHold,finaleFollowAt+.20,finaleFollowAt+1.25)
      : Number(!!progress.finale);
    traveler.render(camera,form,reduced,chapterLights);
    if(inside)workshopTraveler.render(camera,form,reduced,chapterLights);
    if(state.phase==='quest'||state.phase==='bridgeReveal'&&!bridgeOutside||state.phase==='finaleReveal'&&!finaleOutside){
      stageTraveler.render(camera,form,true,chapterLights);
    }
    if(qa)root.dataset.travelerForm=form>=1?'starlight':form>0?'forming':'shadow';
    updateMap();
    updateMarkers();
    recordTargets();
    if(flight)renderStarFlight();
    else if(state.phase==='quest'||state.phase==='bridgeReveal'&&!bridgeOutside||state.phase==='finaleReveal'&&!finaleOutside){
      renderer.render(late.scene,camera);
      if(state.phase==='bridgeReveal'&&bridgeTime>=bridgeBoardHold)revealBridgeAtRiver();
      if(state.phase==='finaleReveal'&&finaleTime>=finaleScreenHold)revealFinaleOutside();
    }
    else if(inside)renderer.render(room.scene,camera);
    else renderTown();
    if(real<.7){sample+=real;frames++;}
    if(sample>1.75){
      root.dataset.fps=Math.round(frames/sample).toString();
      if(qa){
        const info=renderer.info;
        if(townMetrics&&state.phase==='town'){
          const {opaque,transparent,transmissive}=renderer.renderLists.get(townScene,0);
          const totals:Record<string,{calls:number;triangles:number}>={};
          for(const {object,geometry,group} of [...opaque,...transparent,...transmissive]){
            if(!(object instanceof T.Mesh)||!geometry)continue;
            let label='Other town meshes';
            for(let node:T.Object3D|null=object;node&&node!==townScene;node=node.parent){
              if(node.name)label=node.name;
            }
            const count=group?.count??geometry.index?.count??geometry.attributes.position.count;
            const instances=object instanceof T.InstancedMesh?object.count:1;
            const entry=totals[label]??={calls:0,triangles:0};
            entry.calls++;entry.triangles+=count*instances/3;
          }
          root.dataset.townMetrics=JSON.stringify(totals);
        }
        root.dataset.renderStats=JSON.stringify({
          phase:state.phase,
          calls:info.render.calls,triangles:info.render.triangles,
          geometries:info.memory.geometries,textures:info.memory.textures,
          programs:info.programs?.length??0,
          drawingBuffer:[canvas.width,canvas.height],pixelRatio:renderer.getPixelRatio(),
        });
      }
      sample=0;frames=0;
    }
    root.dataset.restored=String(townRestored);
    if(qa){
      root.dataset.bridge=String(!!progress.bridge);
      root.dataset.finale=String(!!progress.finale);
      if(state.phase==='finaleReveal'||progress.finale)
        root.dataset.returnLights=JSON.stringify(town.returnLightLevels());
    }
  }
  root.dataset.webgl=renderer.getContext().getParameter(renderer.getContext().VERSION);
  if(qa)town.ridges.then(ok=>{root.dataset.cirque=ok?'blender-glb':'unavailable';});
  if(qa)town.fittings.then(ok=>{root.dataset.relief=ok?'blender-glb':'absent';});
  town.asset.then(ok=>{root.dataset.cottage=ok?'lux3d-8139422':'fallback';});
  town.lighthouse.then(ok=>{root.dataset.lighthouse=ok?'blender-glb':'fallback';});
  if(qa)town.plaza.drum.then(ok=>{root.dataset.lanternDrum=ok?'blender-glb':'fallback';});
  town.plaza.seatAsset.then(source=>{root.dataset.horses=source;});
  town.plaza.canopy.then(source=>{root.dataset.canopy=source;});
  room.assets.then(ok=>{root.dataset.workshop=ok?'blender-glb':'fallback';});
  room.cabinetAsset.then(ok=>{root.dataset.cabinet=ok?'blender-glb':'fallback';});
  if(qa){
    town.scenery.then(scenery=>{root.dataset.aholoScenery=scenery.join(',');});
    room.windowTown.then(source=>{root.dataset.windowTown=source;});
    room.lanternAsset.then(source=>{root.dataset.opticalHousing=source;});
    town.residents.then(residents=>{root.dataset.aholoResidents=residents.join(',');});
    town.plazaCat.then(source=>{root.dataset.plazaCat=source;});
    town.generatedFacades.then(facades=>{root.dataset.aholoFacades=facades.join(',');});
    town.woodenSigns.then(ready=>{root.dataset.woodenSigns=String(ready);});
    town.streetFittings.then(ok=>{root.dataset.streetFittings=ok?'blender-glb':'fallback';});
    room.heroFittings.then(ok=>{root.dataset.heroWorkshop=ok?'blender-glb':'fallback';});
    room.valance.then(ok=>{root.dataset.workshopValance=ok?'blender-glb':'fallback';});
    town.clockFittings.then(ok=>{root.dataset.heroClock=ok?'blender-glb':'fallback';});
    town.plaza.plinth.then(ok=>{root.dataset.heroPlaza=ok?'blender-glb':'fallback';});
  }
  function updateFrameLoop(){
    last=performance.now();
    renderer.setAnimationLoop(!document.hidden&&state.phase!=='error'?draw:null);
  }
  document.addEventListener('visibilitychange',updateFrameLoop);
  updateFrameLoop();
  void traveler.ready.then(()=>requestAnimationFrame(()=>requestAnimationFrame(()=>{
    if(state.phase!=='boot')return;
    setLamp(lampPosition);state.go('title');button('start').disabled=false;townArt.begin();
    setText('loading','');
  })));
}
// Canvas clues rasterize their lettering once when the world is created.
void document.fonts.load('500 16px "Shadowmade Sans"').catch(()=>[]).then(boot);
