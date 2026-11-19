import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {ball,beam,box,group,mesh,rand,v,type Parent} from './paint';
import {storybookPBR} from './surfaces';

const shutter=storybookPBR('aged-paint','#6d5147');
const edge=storybookPBR('carved-wood','#937052',2);
const lining=storybookPBR('carved-wood','#594739');
const coldSnow=storybookPBR('snow','#e2e6f2',2);
const snowLip=storybookPBR('snow','#d2d9e5',2);
const hearth=storybookPBR('stone','#a1907d',2);
edge.normalScale.setScalar(.21);shutter.normalScale.setScalar(.155);
const tiles=new Map<string,T.Material[]>();

let plasterWash:T.CanvasTexture|undefined;
export function routePlaster(color:string){
  if(!plasterWash){
    const c=document.createElement('canvas');c.width=c.height=256;
    const context=c.getContext('2d')!, rng=rand(473);
    context.fillStyle='#e7dccc';context.fillRect(0,0,256,256);
    for(let i=0;i<5200;i++){
      const x=rng()*256,y=rng()*256,broad=i<320,length=(.5+rng())*(broad?26:7);
      const alpha=broad?.030+rng()*.044:.021+rng()*.076;
      const paint=i%3?'246,232,211':'113,87,83';
      context.strokeStyle=`rgba(${paint},${alpha.toFixed(3)})`;
      context.lineWidth=.36+rng()*(broad?7:2);
      context.lineCap='round';context.beginPath();context.moveTo(x,y);
      context.quadraticCurveTo(x+length*.45,y-2-rng()*4,x+length,y+length*.31);
      context.stroke();
    }
    plasterWash=new T.CanvasTexture(c);
    plasterWash.wrapS=plasterWash.wrapT=T.RepeatWrapping;
    plasterWash.repeat.setScalar(.59);plasterWash.anisotropy=4;plasterWash.colorSpace=T.SRGBColorSpace;
  }
  const material=storybookPBR('plaster',color,.66);
  material.map=plasterWash;material.normalScale.setScalar(.044);material.aoMapIntensity=.19;
  return material;
}

function arch(path:T.Path,w:number,h:number,bottom=0){
  path.moveTo(-w/2,bottom);path.lineTo(w/2,bottom);path.lineTo(w/2,bottom+h*.62);
  path.bezierCurveTo(w*.50,bottom+h*.83,w*.21,bottom+h*.96,0,bottom+h);
  path.bezierCurveTo(-w*.21,bottom+h*.96,-w*.50,bottom+h*.83,-w*.50,bottom+h*.62);
  path.closePath();
}
function warmGlass(color:string){
  const mat=storybookPBR('frosted-glass',color);
  mat.emissive.set(color);mat.emissiveIntensity=1.0;
  mat.normalScale.setScalar(.067);mat.aoMapIntensity=.21;
  const c=document.createElement('canvas');c.width=128;c.height=192;
  const ctx=c.getContext('2d')!,gradient=ctx.createRadialGradient(62,107,7,64,96,111);
  gradient.addColorStop(0,'#edc68b');gradient.addColorStop(.48,'#c69460');gradient.addColorStop(1,'#58404a');
  ctx.fillStyle=gradient;ctx.fillRect(0,0,128,192);
  // Painted curtain shadows sit behind the mottled glass, not on the building wall.
  ctx.fillStyle='#382c426b';
  for(const side of [-1,1]){
    ctx.save();if(side===1){ctx.translate(128,0);ctx.scale(-1,1);}
    ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(27,0);ctx.bezierCurveTo(39,43,29,109,7,164);ctx.lineTo(0,192);ctx.closePath();ctx.fill();ctx.restore();
  }
  const rng=rand(822);
  for(let i=0;i<900;i++){
    const x=rng()*128,y=rng()*192;
    ctx.strokeStyle=i%3?'#ffe7b12b':'#684a4627';ctx.lineWidth=.5+rng()*1.3;
    ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+1,y-3,x+3+rng()*6,y-5);ctx.stroke();
  }
  // An interior paper ornament reads as a small silhouette through the frost.
  ctx.strokeStyle='#69442d';ctx.lineWidth=1.3;ctx.beginPath();ctx.moveTo(72,0);ctx.lineTo(72,73);ctx.stroke();
  ctx.fillStyle='#875b36';ctx.beginPath();
  for(let i=0;i<10;i++){
    const angle=-Math.PI/2+i*Math.PI/5,r=i%2?6.2:14.5;
    const x=72+Math.cos(angle)*r,y=86+Math.sin(angle)*r;
    if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);
  }
  ctx.closePath();ctx.fill();
  for(let i=0;i<170;i++){
    const side=i%2,x=side?rng()*15:128-rng()*15,y=rng()*192;
    ctx.strokeStyle='#c9d8d23c';ctx.lineWidth=.6+rng()*1.3;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+(side?1:-1)*(3+rng()*6),y-3-rng()*6);ctx.stroke();
  }
  const glassMap=new T.CanvasTexture(c);glassMap.colorSpace=T.SRGBColorSpace;
  mat.map=glassMap;mat.emissiveMap=glassMap;
  return mat;
}
let goldenPane:T.Material|undefined, dimPane:T.Material|undefined;
export function carvedWindow(parent:Parent,x:number,y:number,z:number,w:number,h:number,bright=true,isDoor=false,glazing?:T.MeshStandardMaterial[]){
  const g=group(parent,x,y,z);
  const rim=new T.Shape(), inner=new T.Path();
  arch(rim,w*1.25,h*1.12,-h*.051);arch(inner,w,h,-.003);
  rim.holes.push(inner);
  mesh(g,new T.ExtrudeGeometry(rim,{depth:.103,curveSegments:7,bevelEnabled:true,bevelThickness:.018,bevelSize:.018,bevelSegments:1}),edge,0,0,0);
  const mouth=new T.Shape();arch(mouth,w*.99,h);
  const pane=new T.ShapeGeometry(mouth,11);
  const pos=pane.attributes.position,uv=pane.attributes.uv;
  for(let n=0;n<pos.count;n++)uv.setXY(n,pos.getX(n)/w+.5,pos.getY(n)/h);
  goldenPane??=warmGlass('#fed7a1');dimPane??=warmGlass('#c38153');
  const glass=bright?goldenPane:dimPane,index=bright?0:1;
  const material=glazing?(glazing[index]??=glass.clone() as T.MeshStandardMaterial):glass;
  mesh(g,pane,material,0,0,.027);
  if(isDoor){
    const door=new T.Shape();arch(door,w*.96,h*.65,-.06);
    const boards=mesh(g,new T.ExtrudeGeometry(door,{depth:.075,bevelEnabled:true,bevelThickness:.018,bevelSize:.012,bevelSegments:1,curveSegments:7}),shutter,0,0,.040);
    boards.rotation.z=.012;
    for(const i of [-2,-1,0,1,2]){
      box(g,lining,i*w*.165,h*.29,.122,.014,h*.59-Math.abs(i)*.04,.016);
    }
    box(g,edge,0,h*.14,.137,w*.91,.067,.035).rotation.z=-.043;
    ball(g,hearth,w*.26,h*.32,.183,.044,.044,.030);
    beam(g,lining,v(0,h*.65,.054),v(0,h*.974,.054),.047);
  }else{
    // Glazing is set behind the hand-planed mullions and carved surround.
    beam(g,lining,v(-.008,0,.051),v(.012,h*.987,.051),w*.046,.060);
    beam(g,edge,v(-w*.498,h*.48,.054),v(w*.50,h*.52,.054),.043,.061);
    for(const side of [-1,1]){
      beam(g,lining,v(side*w*.237,h*.51,.05),v(side*w*.355,h*.82,.05),.026,.037);
    }
    box(g,hearth,0,-.057,.11,w*1.33,.12,.30).rotation.z=-.017;
    ball(g,coldSnow,-w*.11,.003,.15,w*.62,.041,.113);
    ball(g,coldSnow,w*.39,-.001,.129,w*.25,.026,.103);
  }
  return g;
}

type Sample=(u:number,t:number)=>T.Vector3;
function surface(parent:Parent,material:T.Material,sample:Sample,across:number,down:number,region?:[number,number,number,number]){
  const ps:number[]=[],uv:number[]=[],indices:number[]=[];
  for(let j=0;j<=down;j++)for(let i=0;i<=across;i++){
    const u=i/across,t=j/down;
    ps.push(...sample(u,t));uv.push(region?region[0]+u*region[2]:u*2.75,region?region[1]+t*region[3]:t*1.8);
    if(i&&j){
      const k=j*(across+1)+i;
      indices.push(k,k-1,k-across-1,k-1,k-across-2,k-across-1);
    }
  }
  material.side=T.DoubleSide;
  const geo=new T.BufferGeometry();
  geo.setAttribute('position',new T.Float32BufferAttribute(ps,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
  geo.setIndex(indices);geo.computeVertexNormals();
  mesh(parent,geo,material);
}

export function storybookRoofPoint(w:number,h:number,rise:number,peak:number,profile:'gable'|'gambrel',side:number,z:number,t:number){
  const ridge=peak+.09*Math.sin(z*1.35);
  const end=side*(w*.5+.30+.060*Math.sin(z*2.35));
  const edgeY=h-.17-side*.07+.13*Math.cos(z*1.45);
  const fall=profile==='gambrel'?(t<.52?t*.73:.3796+(t-.52)*1.2925):t;
  const y=T.MathUtils.lerp(h+rise+.08*Math.cos(z*1.3),edgeY,fall)-Math.sin(t*Math.PI)*.235+.11*t**5;
  return v(T.MathUtils.lerp(ridge,end,t),y,z);
}

export function storybookRoofHeight(w:number,h:number,rise:number,peak:number,profile:'gable'|'gambrel',x:number,z:number){
  const ridge=storybookRoofPoint(w,h,rise,peak,profile,1,z,0).x;
  const side=x<ridge?-1:1;
  const edge=storybookRoofPoint(w,h,rise,peak,profile,side,z,1).x;
  return storybookRoofPoint(w,h,rise,peak,profile,side,z,(x-ridge)/(edge-ridge)).y;
}

export function dressedRoof(p:Parent,w:number,d:number,h:number,rise:number,peak:number,color:string,seed:number,profile:'gable'|'gambrel'='gable',distant=false){
  const rng=rand(seed);
  const driftCoverage=distant?.62+.18*rand(seed+838)():.81;
  let slates=tiles.get(color);
  if(!slates){
    slates=[-.08,-.027,.025,.076].map(light=>storybookPBR('valley-slate',new T.Color(color).offsetHSL(.015*light,0,light)));
    slates.forEach(material=>{(material as T.MeshStandardMaterial).normalScale.setScalar(.27);});
    tiles.set(color,slates);
  }
  const slope=(side:number,u:number,t:number,offset=0)=>{
    const z=(u-.5)*(d+.85);
    const point=storybookRoofPoint(w,h,rise,peak,profile,side,z,t);
    point.y+=offset;
    return point;
  };
  for(const side of [-1,1]){
    surface(p,slates[0],(u,t)=>slope(side,u,t),distant?10:15,distant?5:8);
    const columns=Math.ceil((d+.85)/.37), rows=Math.ceil((w*.5+rise)/.32);
    for(let j=0;!distant&&j<rows;j++){
      for(let i=0;i<columns;i++){
        const a=(i+(j%2)*.42)/columns;
        const b=Math.min(1,a+.98/columns);
        if(b-a<.012)continue;
        const e=(j+.96+rng()*.16)/rows, rise=.037+rng()*.031;
        const variant=(i*5+j+rng()*4|0)%4;
        // The thick snow cap covers these tiles at every point along the eave.
        if(e+.008<.62)continue;
        const region:[number,number,number,number]=[(variant%2)*.5+.02,Math.floor(variant/2)*.5+.02,.46,.46];
        const tile=(u:number,t:number)=>{
          const spread=t*t*.008*Math.sin(u*Math.PI);
          return slope(side,T.MathUtils.lerp(a,b,u),Math.min(1.025,T.MathUtils.lerp(j/rows,e,t)+spread),.013+rise*t+Math.sin(u*Math.PI)*.019);
        };
        surface(p,slates[variant],tile,3,2,region);
        // A finite fired-clay edge, not a floating zero-thickness card.
        surface(p,slates[variant],(u,t)=>tile(u,1).add(v(0,-t*.028,0)),3,1,region);
      }
    }
    const rim=(u:number)=>driftCoverage+.085*Math.sin(u*5.4+seed*.31)+.048*Math.sin(u*17+side)+.027*Math.sin(u*37+seed);
    const drift=(u:number,t:number)=>slope(side,u,T.MathUtils.lerp(-.008,rim(u),t),.075+(.17+.042*Math.sin(u*11+t*5)+.025*Math.cos(u*23-t*7))*Math.pow(Math.sin(Math.PI*(.18+t*.78)),.48));
    surface(p,coldSnow,drift,distant?18:40,distant?6:12);
    surface(p,snowLip,(u,t)=>{
      const top=drift(u,1),base=slope(side,u,rim(u)-.013,.043);
      return top.lerp(base,t).add(v(side*.034*Math.sin(t*Math.PI),.012*Math.sin(t*Math.PI*2),0));
    },distant?18:40,3);
    const eaves=Array.from({length:9},(_,i)=>slope(side,i/8,1,-.105));
    mesh(p,new T.TubeGeometry(new T.CatmullRomCurve3(eaves),14,.064,6,false),lining);
    for(const u of (distant?[1]:[0,1])){
      const points=Array.from({length:9},(_,i)=>slope(side,u,i/8,-.039));
      mesh(p,new T.TubeGeometry(new T.CatmullRomCurve3(points),16,.086,7,false),lining);
      points.forEach(point=>{point.y+=.106;});
      mesh(p,new T.TubeGeometry(new T.CatmullRomCurve3(points),16,.039,6,false),edge);
    }
  }
}

export function hewnStone(parent:Parent,x:number,y:number,z:number,w:number,h:number,depth:number,seed:number,material:T.Material){
  const rng=rand(seed), c=w*.11;
  const outline=[[-w/2+c,-h/2], [w/2-c,-h/2], [w/2,-h*.27],
    [w/2-c*.82,h/2],[-w/2+c*.62,h*.47],[-w/2,h*.20]]
    .map(([a,b])=>new T.Vector2(a+(rng()-.5)*.017,b+(rng()-.5)*.026));
  mesh(parent,new T.ExtrudeGeometry(new T.Shape(outline),{depth,bevelEnabled:true,bevelSize:.022,bevelThickness:.019,bevelSegments:1}),material,x,y,z);
}
const lime=storybookPBR('stone','#c3aa8b',3);
const bronze=storybookPBR('aged-paint','#bf9670');
export function clockSurround(parent:Parent,y:number,z:number){
  const frame=new T.Shape();frame.absarc(0,0,.775,0,Math.PI*2,false);
  const hole=new T.Path();hole.absarc(0,0,.632,0,Math.PI*2,true);frame.holes.push(hole);
  mesh(parent,new T.ExtrudeGeometry(frame,{depth:.115,bevelEnabled:true,bevelThickness:.026,bevelSize:.020,bevelSegments:2,curveSegments:18}),lime,0,y,z);
  for(let i=0;i<12;i++){
    const t=i*Math.PI/6;
    ball(parent,bronze,Math.cos(t)*.72,y+Math.sin(t)*.72,z+.133,.028,.028,.016);
  }
  hewnStone(parent,0,y+.79,z,.29,.22,.19,43,hearth);
}

let dialTexture:T.CanvasTexture|undefined;
/** The front hardware sits inside the imported tower's recess and shares the dial transform. */
export function mountClockDialHardware(dial:T.Mesh){
  const brass=storybookPBR('aged-paint','#bf965f',1.6);
  brass.normalScale.setScalar(.15);
  brass.metalness=.42;brass.roughness=.55;
  const rimProfile=[[.659,.004],[.652,.020],[.641,.022],[.630,.010],[.613,.016],[.597,.011],
    [.585,.014],[.577,.027],[.564,.024],[.556,.009]];
  const parts:T.BufferGeometry[]=[new T.LatheGeometry(rimProfile.map(([r,z])=>new T.Vector2(r,z)),72).rotateX(Math.PI/2)];
  for(let hour=0;hour<12;hour++){
    const angle=hour*Math.PI/6;
    const cardinal=hour%3===0;
    const tick=new T.BoxGeometry(cardinal?.017:.011,cardinal?.034:.021,.009);
    tick.rotateZ(-angle).translate(.539*Math.sin(angle),.539*Math.cos(angle),.008);
    parts.push(tick);
    const rivet=new T.SphereGeometry(cardinal?.012:.008,10,5);
    rivet.scale(1,1,.58).translate(.608*Math.sin(angle),.608*Math.cos(angle),.015);
    parts.push(rivet);
  }
  const metal=mergeGeometries(parts)!;
  for(const part of parts)part.dispose();
  mesh(dial,metal,brass).name='Clock enamel fittings';
}

/** Painted enamel stays part of the live clock material; the animated hands and socket are separate. */
export function paintedClockFace(){
  if(!dialTexture){
    const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
    const c=canvas.getContext('2d')!,rng=rand(931);
    const enamel=c.createRadialGradient(218,196,15,256,256,254);
    enamel.addColorStop(0,'#fff4d9');enamel.addColorStop(.62,'#efe0b9');enamel.addColorStop(1,'#a78c71');
    c.fillStyle=enamel;c.fillRect(0,0,512,512);
    for(let i=0;i<1500;i++){
      const x=rng()*512,y=rng()*512;
      c.strokeStyle=i%3?'#fff3d51c':'#69534617';c.lineWidth=.4+rng()*2.4;
      c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+4,y-5,x+7+rng()*17,y-2-rng()*4);c.stroke();
    }
    c.strokeStyle='#455a59';c.lineWidth=12;
    c.beginPath();c.arc(256,256,225,0,Math.PI*2);c.stroke();
    c.strokeStyle='#887256';c.lineWidth=1.75;
    for(const r of [153,147,215]){c.beginPath();c.arc(256,256,r,0,Math.PI*2);c.stroke();}
    c.textAlign='center';c.textBaseline='middle';c.font='bold 36px "Shadowmade Sans","PingFang SC",sans-serif';
    const hours=['XII','I','II','III','IV','V','VI','VII','VIII','IX','X','XI'];
    for(let i=0;i<60;i++){
      const a=i*Math.PI/30,major=i%5===0;
      if(major){c.fillStyle='#40383a';c.fillText(hours[i/5],256+Math.sin(a)*183,256-Math.cos(a)*183+2);}
      else{
        c.lineWidth=1.4;c.strokeStyle='#93795d';c.beginPath();
        c.moveTo(256+Math.sin(a)*204,256-Math.cos(a)*204);
        c.lineTo(256+Math.sin(a)*212,256-Math.cos(a)*212);c.stroke();
      }
    }
    c.strokeStyle='#a48864';c.lineWidth=1.5;
    for(let i=0;i<8;i++){
      c.save();c.translate(256,256);c.rotate(i*Math.PI/4);
      c.beginPath();c.moveTo(0,-31);c.quadraticCurveTo(18,-74,0,-128);c.quadraticCurveTo(-18,-74,0,-31);c.stroke();
      c.fillStyle='#a48864';c.beginPath();c.moveTo(0,-129);c.lineTo(5,-123);c.lineTo(0,-116);c.lineTo(-5,-123);c.closePath();c.fill();
      c.restore();
    }
    dialTexture=new T.CanvasTexture(canvas);dialTexture.colorSpace=T.SRGBColorSpace;dialTexture.anisotropy=4;
  }
  const material=storybookPBR('aged-paint','#fff2dc');material.map=dialTexture;
  material.emissiveMap=dialTexture;material.emissive.set('#efbe83');material.emissiveIntensity=.19;
  material.normalScale.setScalar(.06);material.roughness=.71;
  return material;
}

const footingMaterials=['#887b7c','#a18c83','#807880'].map(color=>storybookPBR('stone',color));
export function coursedFooting(parent:Parent,w:number,d:number,seed:number){
  const front=group(parent,0,0,d/2+.025);
  const sides=[-1,1].map(side=>{const face=group(parent,side*(w/2+.025),0,0);face.rotation.y=side*Math.PI/2;return face;});
  for(const [face,width] of [[front,w],...sides.map(face=>[face,d])] as [T.Group,number][]){
    const columns=Math.ceil(width/.53),step=width/columns;
    for(let row=0;row<2;row++)for(let i=0;i<columns;i++){
      const x=-width/2+step*(i+.5),id=seed+i*13+row*37;
      hewnStone(face,x,.12+row*.23,0,step*.93,.22,.18,id,footingMaterials[(i+row)%3]);
    }
  }
}

// Street-facing joinery. The gallery and clock porch sit on the existing
// facades; their projecting upper storeys leave the pedestrian lane open.
export function streetFront(parent:Parent,style:string,w:number,h:number,f:number,d:number){
  const slate=storybookPBR('roof-slate','#505969',1.4);
  const ivory=storybookPBR('stone','#c5ad92');
  const cap=(g:Parent,x:number,y:number,width:number,depth:number)=>{
    const board=box(g,slate,x,y,depth*.42,width,.10,depth);board.rotation.x=.16;
    const ice=box(g,coldSnow,x-.015,y+.068,depth*.41,width*.98,.045,depth*.96);ice.rotation.x=.16;
  };
  if(style==='tower'){
    const porch=group(parent,0,0,f+.04);
    for(const side of [-1,1]){
      for(let j=0;j<5;j++){
        hewnStone(porch,side*.83,.46+j*.29,.095,.31+(j%2)*.06,.27,.39,j+25,ivory);
      }
      box(porch,edge,side*.81,1.71,.12,.43,.11,.49);
    }
    for(let i=0;i<11;i++){
      const a=i*Math.PI/11+.009,b=(i+1)*Math.PI/11-.009;
      const outer=i===5?1.11:1.01;
      const band=new T.Shape([new T.Vector2(.67*Math.cos(a),.67*Math.sin(a)),
        new T.Vector2(outer*Math.cos(a),outer*Math.sin(a)),new T.Vector2(outer*Math.cos(b),outer*Math.sin(b)),
        new T.Vector2(.67*Math.cos(b),.67*Math.sin(b))]);
      mesh(porch,new T.ExtrudeGeometry(band,{depth:i===5?.47:.35,bevelEnabled:true,bevelThickness:.012,bevelSize:.012,bevelSegments:1}),i%3?ivory:hearth,0,1.74,0);
    }
    // A rose window can be read from the canal approach.
    const clock=group(parent,w*.50+.06,h*.73,-.08);clock.rotation.y=Math.PI/2;
    const ring=mesh(clock,new T.TorusGeometry(.56,.077,8,32),edge);ring.position.z=.05;
    const dial=mesh(clock,new T.CircleGeometry(.54,32),warmGlass('#d1b58c'));dial.position.z=.03;
    for(let i=0;i<8;i++){
      const angle=i*Math.PI/4,length=.54;
      beam(clock,lining,v(0,0,.067),v(length*Math.sin(angle),length*Math.cos(angle),.067),.034);
    }
    return;
  }
  if(style==='inn'){
    // An overhanging timber loft above the low inn awning, with a carved
    // king post and braces in the gable instead of a flat plaster triangle.
    const loft=group(parent,0,h-.19,f+.06);
    box(loft,lining,0,.04,.15,w*.98,.20,.38);
    for(const x of [-.98,-.5,0,.5,.98])beam(loft,edge,v(x,-.31,.02),v(x,.01,.31),.094);
    for(const side of [-1,1]){
      beam(loft,edge,v(side*w*.43,.17,.09),v(side*.32,1.07,.09),.095,.10);
      beam(loft,lining,v(side*w*.38,.17,.09),v(side*w*.38,.51,.09),.081);
    }
    return;
  }
  const workshop=style==='post';
  const bay=group(parent,workshop?.81:-.72,0,f+.04);
  const width=workshop?1.48:1.25;
  // A three-sided projecting leaded bay with a deep sill and cut brackets.
  for(const s of [-1,1]){
    beam(bay,lining,v(s*width*.37,.58,.015),v(s*width*.37,.96,.41),.12);
    beam(bay,edge,v(s*width*.47,1.02,.25),v(s*width*.47,2.04,.25),.095);
    const flank=group(bay,s*width*.49,.97,.23);flank.rotation.y=s*.78;
    carvedWindow(flank,0,0,0,.32,.88);
  }
  box(bay,lining,0,1.48,.15,width,1.13,.37);
  for(const s of [-1,1])carvedWindow(bay,s*width*.235,.99,.36,width*.39,.91);
  box(bay,edge,0,.93,.24,width*1.23,.14,.69);
  cap(bay,0,2.10,width*1.27,.80);
  if(!workshop)return;
  const porch=group(parent,-.97,2.00,f+.07);
  // Two swept, shingled slopes frame the workshop entrance.
  for(const side of [-1,1]){
    for(let row=0;row<4;row++){
      const x=side*(.11+row*.218),y=.43-.115*row+.011*row*row;
      const shingle=box(porch,slate,x,y,.30,.30,.09,.84+row*.02);
      shingle.rotation.z=-side*(.59-row*.065);
      const crust=box(porch,coldSnow,x-.016,y+.051,.31,.29,.048,.81);
      crust.rotation.z=shingle.rotation.z;
    }
    beam(porch,edge,v(0,.51,.75),v(side*.94,.10,.75),.085);
    beam(porch,lining,v(side*.73,-.34,.01),v(side*.73,.09,.62),.081);
  }
  // Timber-framed upper side gallery turns the corner towards the plaza.
  const side=group(parent,w*.5+.025,h-.70,0);side.rotation.y=Math.PI/2;
  box(side,lining,0,.29,.07,d*.86,.75,.27);
  for(let i=-1;i<=1;i++)carvedWindow(side,i*d*.265,.03,.22,.53,.62);
  cap(side,0,.83,d*.96,.53);
}
