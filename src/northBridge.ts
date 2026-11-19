import * as T from 'three';
import {beam,box,group,mat,mesh,v,type Parent} from './paint';
import {storybookPBR} from './surfaces';
import {riversidePost,riversideRail} from './riversideFittings';
import {northDeckHalfSpan as half,northDeckHeight as deck,northDeckOffset as lane} from './townLayout';
import {canalWaterLevel} from './canalWater';

function shadowLane(parent:Parent,side:number){
  const segments=32,vertices:number[]=[],indices:number[]=[];
  for(let i=0;i<=segments;i++){
    const t=i/segments,x=side*(2.45-2.45*t),width=.80+t*.18;
    vertices.push(x,0,lane(x)-width,x,0,lane(x)+width);
    if(i<segments){const j=i*2;indices.push(j,j+1,j+2,j+2,j+1,j+3);}
  }
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);
  const ink=new T.MeshBasicMaterial({color:'#18283c',transparent:true,side:T.DoubleSide,depthWrite:false});
  const strip=new T.Mesh(geometry,ink);strip.position.y=canalWaterLevel+.022;strip.renderOrder=1;parent.add(strip);
  // The narrow leading reflection follows the edge that is actually on the water.
  const edge=box(parent,new T.MeshBasicMaterial({color:'#a3b6b7',transparent:true,opacity:.70,depthWrite:false}),0,strip.position.y+.008,0,.045,.012,1.75);
  edge.renderOrder=2;
  return (progress:number)=>{
    const reach=T.MathUtils.smoothstep(progress,.005,.29);
    geometry.setDrawRange(0,Math.floor(segments*reach)*6);
    ink.opacity=.84*(1-T.MathUtils.smoothstep(progress,.56,.84));
    strip.visible=ink.opacity>.005;edge.visible=reach>0&&reach<1;
    edge.position.x=side*2.45*(1-reach);edge.position.z=lane(edge.position.x);
  };
}

export function makeNorthCrossing(parent:T.Group,fixed:Parent,cx:number,cz:number){
  const roots=group(parent,cx,0,cz),banks=group(fixed,cx,0,cz);
  const timber=['#8f6577','#bc896d','#957366'].map(t=>storybookPBR('carved-wood',t,1.65));
  const oak=mat('#705441','wood-detail'),endgrain=mat('#aa8565','wood-detail');
  const masonry=storybookPBR('bridge-stone','#9b948b'),bearing=mat('#af8e60','aged-paint');
  const snow=mat('#ccd0dc','snow');
  const pier=group(roots);
  box(pier,masonry,0,-.58,0,1.02,3.12,2.34);
  box(pier,masonry,0,1.00,0,1.38,.23,2.82);
  box(pier,endgrain,0,1.135,0,.76,.14,2.94);
  const seam=box(roots,bearing,0,deck(0)-.035,0,.086,.075,2.49);
  const spans=[-1,1].map(side=>{
    const x0=half*side,z0=lane(x0),h0=deck(x0);
    for(const edge of [-1,1]){
      const z=z0+edge*1.13;
      box(banks,masonry,x0,-.22,z,.86,.81,.54);
      box(banks,masonry,x0,.144,z,.94,.13,.63);
      box(banks,bearing,x0-side*.14,.194,z,.43,.09,.36);
    }
    const hinge=group(roots,x0,h0,z0);
    const leaf=group(hinge,-x0,-h0,-z0);
    for(let i=0;i<16;i++){
      const x=side*half*(i+.5)/16;
      const board=box(leaf,timber[i%3],x,deck(x)-.10,lane(x),half/16-.005,.20,2.54);
      board.rotation.z=Math.atan((deck(x+.01)-deck(x-.01))/.02);board.receiveShadow=true;
      if(i%6===1)box(leaf,snow,x,deck(x)+.005,lane(x)+side*1.16,.18,.035,.18);
    }
    for(const edge of [-1,1]){
      for(let i=0;i<4;i++){
        const x=side*half*i/4,next=side*half*(i+1)/4;
        const p=(a:number,down:number)=>v(a,deck(a)-down,lane(a)+edge*1.16);
        beam(leaf,oak,p(x,.24),p(next,.24),.21,.26);
        beam(leaf,endgrain,p(x,.38),p(next,.38),.095,.28);
        if(i===0||i===3)beam(leaf,oak,p(i===0?x:next,.69),p(i===0?next:x,.27),.14,.14);
        riversideRail(leaf,p(x,-.51),p(next,-.51),i,true);
        if(i||side<0)riversidePost(leaf,x,deck(x)-.085,lane(x)+edge*1.19,i,true);
      }
      riversidePost(leaf,x0,h0-.085,z0+edge*1.19,4,true);
    }
    const ink=shadowLane(roots,side),start=side<0?.32:.40;
    return (progress:number)=>{
      ink(progress);
      const rise=T.MathUtils.smoothstep(progress,start,start+.42);
      hinge.visible=rise>0;hinge.position.y=h0-.62*(1-rise);
      hinge.rotation.z=side*.32*(1-rise);
    };
  });
  return (progress:number)=>{
    const support=T.MathUtils.smoothstep(progress,.21,.47);
    pier.visible=support>0;pier.position.y=-2.55*(1-support);
    spans.forEach(animate=>animate(progress));
    const lock=T.MathUtils.smoothstep(progress,.82,1);
    seam.visible=lock>0;seam.position.y=deck(0)-.035+.16*(1-lock);
  };
}
