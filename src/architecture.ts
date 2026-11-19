import * as T from 'three';
import {ball,beam,box,cylinder,glow,group,loop,mat,mesh,palette,rand,shapeMesh,starPoints,v,type Parent} from './paint';
import {woodenSign} from './townSigns';
import {streetFront,carvedWindow,clockSurround,coursedFooting,dressedRoof,hewnStone,mountClockDialHardware,paintedClockFace,routePlaster} from './routeArchitecture';
const dark=mat('#392c45','wood'), timber=mat('#78546a','wood'), trim=mat('#b68c86','wood'), snow=mat(palette.snowLight,'snow');
const u=glow('#ffad62',1.12), dim=glow('#f1a26a',.53), shade=mat('#544151');
const stones=['#72637e','#8a7789','#9c8591','#6b627f'].map(x=>mat(x,'stone'));
export function windowArch(p:Parent,x:number,y:number,z:number,w:number,h:number,bright=true){
  const g=group(p,x,y,z);
  const s=new T.Shape();s.moveTo(-w/2,0);s.lineTo(w/2,0);s.lineTo(w/2,h*.67);s.quadraticCurveTo(w/2,h*.93,0,h);s.quadraticCurveTo(-w/2,h*.93,-w/2,h*.67);s.closePath();
  const frame=mesh(g,new T.ShapeGeometry(s,10),trim,0,-.04,0);frame.scale.set(1.17,1.09,1);
  mesh(g,new T.ShapeGeometry(s,10),bright?u:dim,0,0,.017);
  box(g,dark,0,h*.46,.033,w*.057,h*.93,.055);
  box(g,dark,0,h*.53,.04,w,.050,.061);
  box(g,trim,0,-.045,.07,w*1.27,.12,.22);
  box(g,snow,0,.025,.107,w*1.19,.046,.18);
  return g;
}
type House = {featured?:boolean; x:number; y:number; z:number; ry?:number; w:number; d:number; h:number; r:number; wall:string; roof:string; seed:number; style:'post'|'shop'|'home'|'tower'|'inn'|'mill'};
export function house(parent:Parent,c:House){
  const {w,d,h,r,seed,style}=c, p=group(parent,c.x,c.y,c.z);p.rotation.y=c.ry??0;
  const glazing:T.MeshStandardMaterial[]=[];
  const window=(parent:Parent,x:number,y:number,z:number,w:number,h:number,bright=true)=>
    c.featured?carvedWindow(parent,x,y,z,w,h,bright,false,glazing):windowArch(parent,x,y,z,w,h,bright);
  const randf=rand(seed), wall=c.featured?routePlaster(c.wall):mat(c.wall), roof=mat(c.roof,'wood'), peak=(randf()-.5)*w*.36, bl=-w*.5, br=w*.5;
  const points=[[-w*.47,.24],[w*.48,.24],[br,h-.13],[peak,h+r],[bl,h+.13]].map(([x,y])=>new T.Vector2(x,y));
  shapeMesh(p,points,wall,d,0,0,-d/2,.045);
  box(p,stones[0],0,.24,0,w+.14,.55,d+.16);
  if(c.featured)coursedFooting(p,w,d,seed);
  else for(let i=0;i<19;i++){
    const z=d/2+.1, x=(randf()-.5)*w*.95, y=.12+randf()*.27;
    box(p,stones[i%4],x,y,z,.27+randf()*.36,.12+randf()*.11,.08).rotation.z=(randf()-.5)*.10;
  }
  dressedRoof(p,w,d,h,r,peak,c.roof,seed,style==='inn'?'gambrel':'gable',!c.featured);
  const f=d/2+.06;
  for(const x of [bl+.10,br-.10]){
    beam(p,timber,v(x,.48,f),v(x+Math.sign(x)*.06,h-.06,f),.17,.17);
    if(c.featured)beam(p,timber,v(x,h*.79,f),v(x*.88,h*.66,f),.108,.14);
    else beam(p,timber,v(x,h*.62,f),v(x*.53,h*.48,f),.13,.16);
  }
  box(p,timber,0,h-.11,f,w,.16,.17).rotation.z=-.025;
  for(const side of [-1,1]){
    const face=group(p,side*(w/2-.025),0,0);face.rotation.y=side*Math.PI/2;
    for(const sx of [-.28,.29]) window(face,sx*d,1.02,0,.54,.9,sx>0);
    box(face,timber,0,h-.23,.05,d,.14,.13);
    if(h>3.55)window(face,.13,h*.60,0,.72,.81);
  }
  const doorH=style==='tower'?1.82:1.37;
  const doorx=style==='post'?-.97:style==='shop'?.93:0;
  if(c.featured)carvedWindow(p,doorx,.49,f+.012,.84,doorH,false,true);
  else {
    window(p,doorx,.49,f+.012,.84,doorH,false);
    box(p,dark,doorx,.90,f+.052,.84,.79,.10);
    for(let i=0;i<5;i++) box(p,timber,doorx-.31+i*.153,.9,f+.113,.12,.74,.04);
    ball(p,glow('#ffe6a4',.38),doorx+.24,1.04,f+.16,.045,.046,.033);
  }
  for(let i=0;i<3;i++)box(p,stones[(i+1)%4],doorx,.08+(2-i)*.105,f+.20+i*.17,1.26+i*.10,.16,.38);
  if(style!=='tower'){
    const windows=style==='post'?[.78]:[-w*.28,w*.28].filter(t=>Math.abs(t-doorx)>.60);
    for(const x of windows)window(p,x,.98,f,style==='post'?1.37:.72,style==='post'?1.10:1.02);
    window(p,peak,h+.09,f+.015,.61,Math.min(.91,r*.51));
    if(h>3.25){window(p,-w*.24,h*.65,f,.64,.76);window(p,w*.22,h*.63,f,.64,.76,false);}
  }
  let clockwork: {face:T.MeshStandardMaterial; dial:T.Mesh; hands:T.Group[];socket:T.Group;key:T.Group;
    fittings:{mount:T.Group;fallback:T.Group;file:string}[]} | undefined;
  if(style==='tower'){
    for(const s of [-1,1]){
      const q = s*(w*.46);
      for(let j=0;j<11;j++){
        if(c.featured)hewnStone(p,q,.63+j*.395,f-.025,.31+(j%2)*.11,.33,.18,j+seed,stones[j%4]);
        else {
          const k=box(p,stones[j%4],q+(j%2?-.031:.036),.62+j*.40,f+.04,.26+(j%2)*.09,.25,.15);
          k.rotation.z=(j%3-1)*.034;
        }
      }
      const balcony=box(p,trim,q*.70,h*.50,f+.24,w*.22,.12,.46);balcony.rotation.z=s*.023;
      box(p,snow,q*.70,h*.50+.067,f+.31,w*.22,.042,.27);
    }
    box(p,trim,0,h*.49,f+.065,w*.89,.105,.14);
    box(p,trim,0,h*.84,f+.065,w*.86,.13,.14);
    const flanks=c.featured?.85:.40;
    window(p,-flanks,h*.24,f+.055,.41,.68,false);
    window(p,flanks,h*.24,f+.055,.41,.68);
    const face=c.featured?paintedClockFace():glow('#ad8c78',.19);
    const dialFront=f+(c.featured?.15:.08);
    const clock=mesh(p,new T.CircleGeometry(.64,c.featured?72:32),face,0,h*.69,dialFront);
    const clockPts=Array.from({length:24},(_,i)=>v(Math.sin(i/24*6.283)*.64,Math.cos(i/24*6.283)*.64+h*.69,f+.094));
    const dialMount=group(p,0,h*.69,f+.019),dialFallback=group(dialMount);
    if(c.featured)clockSurround(dialFallback,0,0);
    else loop(p,clockPts,dark,.066);
    if(c.featured)mountClockDialHardware(clock);
    else clock.rotation.z=.12;
    if(!c.featured)for(let i=0;i<12;i++){const q=i/12*6.283;beam(p,dark,v(Math.sin(q)*.46,h*.69+Math.cos(q)*.46,f+.106),v(Math.sin(q)*.56,h*.69+Math.cos(q)*.56,f+.106),.036);}
    const hands=Array.from({length:2},()=>group(p,0,h*.69,dialFront+.07));
    if(c.featured){
      // Each gilded lance keeps its own clockwork pivot and original bearing.
      for(const [i,[dx,dy]] of [[.38,.14],[-.13,.32]].entries()){
        const hand=group(hands[i],0,0,i*.026);hand.rotation.z=Math.atan2(dy,dx);
        const length=Math.hypot(dx,dy);
        const profile=[[ -.112,0],[-.082,-.036],[-.038,-.016],[length*.52,-.016],
          [length*.64,-.040],[length,-.002],[length*.65,.043],[length*.50,.017],[-.038,.016],[-.082,.036]];
        shapeMesh(hand,profile.map(([x,y])=>new T.Vector2(x,y)),dark,.014,0,0,0,.004);
        shapeMesh(hand,[[-.061,0],[length*.63,-.009],[length*.89,0],[length*.63,.009]].map(([x,y])=>new T.Vector2(x,y)),
          mat('#c89d64','wood-detail'),.006,0,0,.019);
        ball(hand,trim,0,0,.030,.047,.047,.023);
      }
    }else{
      beam(hands[0],dark,v(0,0,0),v(.38,.14,0),.052);
      beam(hands[1],dark,v(0,0,0),v(-.13,.32,0),.043);
    }
    const socket=group(p,0,h*.879,f+.131);
    const crest=starPoints(.41,.44);
    shapeMesh(socket,starPoints(.50,.52),trim,.055,0,0,0,.025);
    shapeMesh(socket,crest,mat('#49313f','wood-detail'),.020,0,0,.073);
    const key=group(socket,0,0,.105);
    shapeMesh(key,crest,glow('#d59b52',.82),.082,0,0,0,.021);
    shapeMesh(key,starPoints(.30,.44),glow('#ffe6ab',.95),.018,0,0,.083,.012);
    key.visible=false;
    const bellMount=group(p,0,h+.13,f+.072),bellFallback=group(bellMount);
    window(bellFallback,0,0,-.072,.60,.87,false);
    const crownMount=group(p,peak,h+r,0),crownFallback=group(crownMount);
    const spire=cylinder(crownFallback,roof,0,.78,0,.025,.43,1.80,6);
    spire.rotation.z=.075;
    shapeMesh(crownMount,starPoints(.22),dim,.07,-.062,1.81,0);
    clockwork={face,dial:clock,hands,socket,key,fittings:c.featured?[
      {mount:dialMount,fallback:dialFallback,file:'hero-clock-surround.glb'},
      {mount:crownMount,fallback:crownFallback,file:'hero-clock-cupola.glb'},
      {mount:bellMount,fallback:bellFallback,file:'clock-bronze-belfry.glb'},
    ]:[]};
  }
  if(style==='inn'){
    // A shallow oriel breaks the inn's footprint and shape from the shared roof kit.
    const b=group(p,-w*.28,0,f+.07);
    box(b,trim,0,1.58,.15,1.13,1.48,.46);
    for(const s of [-1,0,1])window(b,s*.337,1.08,.397,.26,.89,true);
    const aw=box(b,roof,-.013,2.37,.18,1.28,.115,.68);aw.rotation.x=.25;
    box(b,snow,0,2.427,.20,1.28,.069,.65).rotation.x=.25;
  }
  if(style==='shop'){
    const lanternHook=group(p,-w*.51,1.33,f+.18);
    beam(lanternHook,timber,v(0,.63,-.11),v(-.39,.66,.09),.079);
    lantern(lanternHook,-.37,.10,.07,.71,false);
    box(p,trim,-.70,.92,f+.19,1.42,.15,.43);
    box(p,snow,-.70,1.00,f+.24,1.39,.047,.30);
  }
  if(style==='inn'||style==='post'||style==='shop'){
    if(c.featured&&style==='post'){
      box(p,timber,0,h-.54,f+.079,w*.69,.46,.16);
      for(const side of [-1,1]){
        beam(p,trim,v(side*w*.36,h-.85,f+.009),v(side*w*.33,h-.56,f+.19),.09);
        ball(p,trim,side*w*.326,h-.53,f+.18,.051,.051,.027);
      }
    }
    if(c.featured)woodenSign(p,style==='post'?'workshop':style==='inn'?'inn':'bookshop',0,h-.28,f+.22,w*.62,.46);
    if(style!=='post'){
      const aw=box(p,mat(c.roof,'wood'),0,h-.94,f+.44,w*.9,.11,.95);aw.rotation.x=.22;
      const awSnow=box(p,snow,0,h-.865,f+.43,w*.92,.085,.96);awSnow.rotation.x=.22;
      for(let i=0;i<7;i++)ball(p,i%2?trim:roof,(i/6-.5)*w*.83,h-1.02,f+.88,w*.076,.14,.042);
    }
  }
  if(style==='mill'){
    const wheel=group(p,w*.51+.22,.94,0);wheel.rotation.y=Math.PI/2;
    loop(wheel,Array.from({length:24},(_,i)=>v(Math.sin(i*.262)*.94,Math.cos(i*.262)*.94,0)),timber,.074);
    for(let j=0;j<9;j++){const a=j/9*6.283;beam(wheel,dark,v(0,0,0),v(Math.sin(a)*.94,Math.cos(a)*.94,0),.079);}
  }
  if(c.featured)streetFront(p,style,w,h,f,d);
  const cx=w*(seed%2?.25:-.29), cz=-d*.19, cy=h+r*.70;
  box(p,dark,cx,cy,cz,.46,1.16,.49).rotation.z=(seed%2?.11:-.13);
  for(let j=0;j<5;j++)box(p,stones[j%4],cx+(j%2?.12:-.11),cy-.39+j*.20,cz+.25,.22,.13,.08);
  box(p,trim,cx-.03,cy+.58,cz,.62,.12,.63); box(p,snow,cx-.04,cy+.66,cz,.62,.075,.62);
  p.updateMatrixWorld(true);
  return {root:p,clockwork,glazing,smoke:p.localToWorld(v(cx-.04,cy+.72,cz))};
}

export function tree(p:Parent,x:number,y:number,z:number,h:number,seed:number,detail=true){
  const g=group(p,x,y,z),r=rand(seed);const bark=mat('#514555','wood'), greens=['#365255','#405660','#4b636b','#42565c'].map(a=>mat(a,'needles'));
  const sn=['#c7c2d8','#aeb6ce','#d6cfde'].map(a=>mat(a,'snow'));
  cylinder(g,bark,0,h*.20,0,h*.047,h*.073,h*.43,7).rotation.z=.06;
  for(let j=0;j<5;j++){
    const rad=h*(.235-j*.036)*(1+r()*.18),base=h*(.18+j*.145),height=h*(.40-j*.025), N=detail?13:8;
    const vs:number[]=[],us:number[]=[],ix:number[]=[];
    for(let k=0;k<3;k++)for(let i=0;i<=N;i++){
      const a=i/N*6.283185,sc=k===0?1:k===1?.61:.045;
      const edge=1+.15*Math.sin(a*5+j)+.12*Math.cos(a*3+j*4);
      vs.push(Math.cos(a)*rad*edge*sc+.05*j,base+height*k/2+(k===0?.09*h*Math.sin(a*4+j)*.57:0),Math.sin(a)*rad*edge*sc);us.push(i/N,k*.5);
      if(k&&i){const q=k*(N+1)+i;ix.push(q,q-N-1,q-1,q-1,q-N-1,q-N-2);}
    }
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(vs,3));geo.setAttribute('uv',new T.Float32BufferAttribute(us,2));geo.setIndex(ix);geo.computeVertexNormals();
    mesh(g,geo,greens[j%4]);
    const s=mesh(g,geo,sn[(j+seed)%3],.017,h*.066,.012);s.scale.set(.89,.96,.89);
    if(detail){for(let k=0;k<4;k++){const a=k*1.57+j*.83;const L=rad*(.67+r()*.1); const clump=ball(g,sn[(seed+j+k)%3],Math.cos(a)*L+.05*j,base+h*.095,Math.sin(a)*L,L*.30,h*.037,L*.27,true);clump.rotation.z=Math.sin(a)*.42;}}
  }
  g.rotation.z=(r()-.5)*.13;return g;
}
export function lantern(p:Parent,x:number,y:number,z:number,s=1,post=true){
  const g=group(p,x,y,z);g.scale.setScalar(s);const col=mat('#564057','wood'),metal=mat('#98745e');
  if(post){
    cylinder(g,col,0,.91,0,.062,.096,1.82,8);cylinder(g,metal,0,.14,0,.17,.23,.29,8);cylinder(g,metal,0,1.53,0,.101,.104,.08,8);
  }
  const offset=post?1.84:0;
  const b=cylinder(g,col,0,offset+.03,0,.19,.11,.14,4);b.rotation.y=Math.PI/4;
  const glass=box(g,glow('#f5b36f',1.6),0,offset+.22,0,.26,.33,.26);
  for(const dx of [-1,1])for(const dz of [-1,1]) beam(g,col,v(dx*.14,offset+.03,dz*.14),v(dx*.18,offset+.39,dz*.18),.034);
  const cap=cylinder(g,col,0,offset+.44,0,.067,.27,.18,4);cap.rotation.y=Math.PI/4;
  box(g,snow,0,offset+.535,0,.12,.048,.12);
  ball(g,metal,0,offset+.59,0,.055,.055,.055);
  return glass.material as T.MeshStandardMaterial;
}
