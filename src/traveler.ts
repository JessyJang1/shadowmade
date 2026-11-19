import * as T from 'three';
import {clone as cloneRig} from 'three/addons/utils/SkeletonUtils.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {articulateCourier,poseCourierLeg} from './courierGait';
import {storybookPBR} from './surfaces';

let courier:ReturnType<GLTFLoader['loadAsync']>|undefined;
let fittedScarf:ReturnType<GLTFLoader['loadAsync']>|undefined;
const wool=storybookPBR('wool','#e4ccab',1.8);
const redWool=storybookPBR('wool','#b04a64',1.2);
wool.normalScale.setScalar(.16);
redWool.normalScale.setScalar(.12);
import {ball,box,cylinder,group,mat,mesh,starPoints,shapeMesh,v,type Parent} from './paint';

export function createTraveler(parent:Parent){
  const body=group(parent), fallback=group(body);
  let torso:T.Object3D=group(fallback);
  let softRig=false;
  const cream=mat('#bda99b','cloth'), fur=mat('#dfd0b8','cloth'), red=mat('#9d536c','cloth');
  const boots=mat('#514052','wood'), skin=mat('#d2a484'), hair=mat('#dfcba0');
  const coat=cylinder(torso,cream,0,.74,0,.185,.34,.71,12);
  coat.scale.z=.76;
  ball(torso,fur,0,.46,0,.333,.085,.265);
  ball(torso,skin,0,1.36,.035,.223,.247,.215);
  for(const x of [-.196,.196])ball(torso,skin,x,1.36,0,.059,.078,.057);
  ball(torso,hair,0,1.51,-.03,.244,.177,.216);
  for(let i=0;i<8;i++){
    const a=i/8*6.283;
    const tuft=ball(torso,i%3?hair:fur,Math.sin(a)*.13,1.59+Math.sin(a*3)*.035,Math.cos(a)*.12+.004,.091,.088,.163);
    tuft.rotation.set(-Math.cos(a)*.41,a+.27,.18*Math.sin(a));
  }
  for(const x of [-.076,.076])ball(torso,boots,x,1.389,.219,.019,.024,.013);
  cylinder(torso,red,0,1.117,0,.237,.252,.11,15);
  let scarf:T.Object3D=group(torso,-.074,1.12,-.211);
  const tail=box(scarf,red,-.048,-.207,-.056,.227,.46,.048);
  tail.rotation.z=-.23;
  const pin=shapeMesh(scarf,starPoints(.061),mat('#e5ae73'),.008,-.065,-.19,-.09);
  pin.rotation.y=Math.PI;
  let arms:T.Object3D[]=[-1,1].map(s=>{
    const shoulder=group(torso,s*.198,1.02,.018);
    const sleeve=cylinder(shoulder,cream,s*.052,-.197,0,.067,.084,.37,10);
    sleeve.rotation.z=s*.24;
    ball(shoulder,red,s*.093,-.375,.017,.055,.077,.062);return shoulder;
  });
  let legs:T.Object3D[]=[-1,1].map(s=>{
    const leg=group(fallback,s*.117,.45,0);
    cylinder(leg,boots,0,-.17,0,.065,.075,.32,9);
    ball(leg,boots,0,-.329,.055,.083,.102,.139);return leg;
  });
  const contact=mesh(body,new T.CircleGeometry(.27,18),new T.MeshBasicMaterial({color:'#46324a',opacity:.23,transparent:true,depthWrite:false}),0,.015,0);
  contact.scale.set(1.17,.84,1);contact.rotation.x=-Math.PI/2;
  const loader=new GLTFLoader(),base=import.meta.env.BASE_URL+'models/';
  courier??=loader.loadAsync(base+'aholo-g1-courier.glb')
    .then(result=>{articulateCourier(result.scene);return result;})
    .catch(()=>loader.loadAsync(base+'winter-courier.glb'));
  let scarfAttached=false;
  let gait:{thigh:T.Object3D;ankle:T.Object3D}[]=[];
  const ready=courier.then(async ({scene})=>{
    const artwork=cloneRig(scene);
    const joints=['Torso','Scarf','Arm0','Arm1','Leg0','Leg1'].map(name=>artwork.getObjectByName(name));
    if(joints.some(joint=>!joint))throw new Error('Winter courier is missing a named pivot');
    const [rigTorso,rigScarf,leftArm,rightArm,leftLeg,rightLeg]=joints as T.Object3D[];
    torso=rigTorso;scarf=rigScarf;
    arms=[leftArm,rightArm];legs=[leftLeg,rightLeg];
    artwork.traverse(object=>{
      if(!(object instanceof T.Mesh))return;
      if(object.material.name==='Oat wool')object.material=wool;
      if(object.material.name==='Rose wool'&&object.geometry.hasAttribute('uv'))object.material=redWool;
    });
    body.add(artwork);fallback.removeFromParent();
    softRig=!!artwork.getObjectByName('AholoCourier');
    if(artwork.getObjectByName('Thigh0'))gait=[0,1].map(i=>({
      thigh:artwork.getObjectByName('Thigh'+i)!,ankle:artwork.getObjectByName('Ankle'+i)!
    }));
    if(softRig){
      fittedScarf??=loader.loadAsync(base+'courier-wool-scarf.glb');
      try{
        const accessory=(await fittedScarf).scene.clone(true);
        // Pivot at the collar seam, with the ribbon's sewn edge inside the collar.
        scarf.position.set(-.062,1.28,-.12);
        accessory.position.set(.062,-.134,.105);
        accessory.traverse(object=>{
          if(object instanceof T.Mesh&&!Array.isArray(object.material)&&object.material.name==='Cranberry wool')object.material=redWool;
        });
        scarf.add(accessory);scarfAttached=true;
      }catch(error){console.warn('Winter courier scarf unavailable',error);}
    }
    return softRig?'aholo-8294271':'blender-glb';
  }).catch(error=>{console.warn('Winter courier unavailable',error);return 'fallback';});
  let pace=0,phase=0,reaching=0,run=0,idleTime=0;
  const feet=[0,1].map(()=>({locked:false,x:0,z:0,forward:0,lateral:0,lift:0,pitch:0}));
  const scarfReady=ready.then(()=>scarfAttached);
  return {body, contactShadow:contact, ready, scarfReady, reach(){reaching=1;}, pose(dt:number,motion:T.Vector3,airborne=false,groundAt?:(x:number,z:number)=>number){
    reaching=Math.max(0,reaching-dt*2.7);
    const speed=motion.length();
    pace=T.MathUtils.lerp(pace,Math.min(1,speed/1.6),1-Math.exp(-dt*11));
    run=T.MathUtils.lerp(run,T.MathUtils.clamp((speed-2.05)/2.4,0,1),1-Math.exp(-dt*10));
    if(!airborne)phase+=dt*speed*Math.PI/(2*(.245+run*.075));
    idleTime+=dt;
    if(speed>.001){
      const angle=Math.atan2(motion.x,motion.z);
      body.rotation.y+=Math.atan2(Math.sin(angle-body.rotation.y),Math.cos(angle-body.rotation.y))*(1-Math.exp(-dt*16));
    }
    const cos=Math.cos(body.rotation.y),sin=Math.sin(body.rotation.y);
    let groundDip=0;
    for(let i=0;i<gait.length;i++){
      const foot=feet[i],cycle=(phase/(2*Math.PI)+i*.5)%1;
      const swing=Math.max(0,(cycle-.5)*2);
      const stride=.245+.075*run;
      const forward=airborne?(cycle<.5?.16:-.14):pace*stride*(cycle<.5?1-4*cycle:-Math.cos(Math.PI*swing));
      const x=gait[i].thigh.position.x;
      const wx=body.position.x+x*cos+forward*sin,wz=body.position.z-x*sin+forward*cos;
      // Lock the support foot in world space while the hips advance or turn.
      const bearing=!airborne&&cycle<.5&&pace>.14;
      if(!foot.locked||!bearing||Math.hypot(foot.x-wx,foot.z-wz)>.36){
        foot.x=wx;foot.z=wz;
      }
      foot.locked=bearing;
      const dx=foot.x-body.position.x,dz=foot.z-body.position.z;
      foot.forward=dx*sin+dz*cos;foot.lateral=dx*cos-dz*sin-x;
      const height=groundAt&&!airborne?groundAt(foot.x,foot.z):body.position.y;
      const offset=T.MathUtils.clamp(height-body.position.y,-.24,.24);
      groundDip=Math.max(groundDip,-offset);
      foot.lift=offset+(airborne?.14:pace*(.105+.055*run)*Math.sin(Math.PI*swing)**2);
      foot.pitch=.16*Math.sin(Math.PI*swing)*pace;
    }
    const dip=groundDip+(gait.length?(.066+.032*run+.016*Math.cos(phase)**2)*pace:0);
    torso.position.y=-dip+.021*Math.abs(Math.sin(phase))*pace+.008*Math.sin(idleTime*2.7)*(1-pace);
    torso.rotation.z=Math.sin(phase)*.045*pace;
    if(scarfAttached){
      const lift=.045+pace*.22+run*.15+(airborne?.12:0);
      scarf.rotation.x=T.MathUtils.lerp(scarf.rotation.x,lift+.055*Math.sin(phase),1-Math.exp(-dt*9));
      scarf.rotation.z=.10*pace*Math.sin(phase*.5)+.029*Math.sin(idleTime*2.1);
    }else scarf.rotation.x=-.32-pace*.35+.14*Math.sin(phase)*pace;
    for(let i=0;i<2;i++){
      const stride=Math.sin(phase+i*Math.PI)*pace;
      const cycle=(phase/(2*Math.PI)+i*.5)%1;
      if(gait[i])poseCourierLeg(gait[i].thigh,legs[i],gait[i].ankle,feet[i].forward,feet[i].lateral,feet[i].lift,dip,feet[i].pitch);
      else legs[i].rotation.x=stride*.58;
      arms[i].rotation.x=gait[i]?Math.cos(cycle*2*Math.PI)*pace*.30:-stride*.39;
      if(softRig)arms[i].rotation.z=(i===0?1:-1)*(.43-pace*.08);
    }
    if(airborne){
      if(!gait.length){legs[0].rotation.x=-.51;legs[1].rotation.x=.34;}
      arms[0].rotation.x=-.48;arms[1].rotation.x=.30;
    }
    const reach=Math.sin(reaching*Math.PI);
    arms[1].rotation.x-=reach*1.52;
    torso.rotation.x=reach*.17+run*.11;

  }};
}

export const townSpawn=v(3.37,0,6.05);
