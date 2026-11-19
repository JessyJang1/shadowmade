import * as T from 'three';
import {lantern} from './architecture';
import {ball,beam,box,cylinder,group,mesh,shapeMesh,v,type Parent} from './paint';
import {storybookPBR} from './surfaces';
import {woodenSign} from './townSigns';

const frame=storybookPBR('carved-wood','#69443a');
const brace=storybookPBR('aged-paint','#aa7c5c');
const copper=storybookPBR('aged-paint','#b18a5f');
const snow=storybookPBR('snow','#d5e1ed');
const canvas=storybookPBR('wool','#dfc3a0');
const pottery=storybookPBR('aged-paint','#53817b');
const clay=storybookPBR('stone','#a97659');

type Trade='bakery'|'pottery'|'parcel';
function awningPanel(){
  const across=8,down=6;
  const geometry=new T.PlaneGeometry(.249,1.31,across,down);
  const positions=geometry.attributes.position;
  for(let i=0;i<positions.count;i++){
    const x=positions.getX(i),z=-positions.getY(i);
    const s=z/1.31+.5;
    const rise=-.18*s-.074*Math.sin(s*Math.PI);
    positions.setXYZ(i,x,rise+.045*Math.cos(x/.249*Math.PI),z);
  }
  geometry.computeVertexNormals();
  return geometry;
}
const panel=awningPanel();
function jug(parent:Parent,x:number,z:number,s:number){
  const profile=[[0,0],[.38,0],[.49,.16],[.54,.37],[.46,.62],[.25,.81],[.26,.94],[.30,1.0],[.24,1.03],[.18,.94],[.16,.56]]
    .map(([radius,y])=>new T.Vector2(radius*s,y*s));
  mesh(parent,new T.LatheGeometry(profile,12),pottery,x,1.01,z);
}

export function riversideStall(parent:Parent,x:number,y:number,z:number,angle:number,tint:string,trade:Trade){
  const stall=group(parent,x,y,z);
  stall.rotation.y=angle;
  const painted=storybookPBR('aged-paint',tint), cloth=storybookPBR('wool',tint);
  cloth.side=T.DoubleSide;canvas.side=T.DoubleSide;
  box(stall,frame,0,.14,0,1.75,.22,1.0);
  box(stall,frame,0,.54,-.06,1.63,.79,.85);
  for(const s of [-1,1]){
    shapeMesh(stall,[[-.37,.28],[.37,.28],[.37,.76],[.25,.86],[-.27,.86],[-.37,.74]]
      .map(([x,y])=>new T.Vector2(x,y)),painted,.029,s*.41,0,.40);
    box(stall,brace,s*.41,.30,.43,.66,.033,.019);
    for(const back of [-1,1]){
      box(stall,frame,s*.81,1.23,back*.41,.10,2.44,.11);
      beam(stall,brace,v(s*.81,1.95,back*.41),v(s*.53,2.26,back*.41),.069);
    }
  }
  for(let board=0;board<5;board++)box(stall,brace,0,.96,(board-2)*.208,1.86,.101,.206);
  for(let j=0;j<8;j++){
    const cx=(j-3.5)*.245, cover=j%2?cloth:canvas;
    mesh(stall,panel,cover,cx,2.54,0);
    ball(stall,cover,cx,2.35,.665,.123,.12,.028);
    if(j<3||j===7)ball(stall,snow,cx,2.485,-.38,.147,.042,.21);
  }
  box(stall,frame,0,2.21,.44,1.68,.105,.12);
  woodenSign(stall,trade,0,2.21,.49,1.21,.28);
  lantern(stall,-.72,1.38,.46,.43,false);
  if(trade==='pottery'){
    for(const [xx,zz,s] of [[-.37,.07,.34],[.15,-.16,.49],[.48,.14,.27]])jug(stall,xx,zz,s);
  }else if(trade==='bakery'){
    for(const i of [-1,0,1]){
      cylinder(stall,clay,i*.32,1.034,.18,.132,.128,.047,9);
      ball(stall,copper,i*.32,1.11,.18,.117,.086,.095);
      for(const score of [-1,1])box(stall,brace,i*.32+score*.037,1.185,.18,.014,.012,.061).rotation.y=.32;
    }
  }else{
    for(const i of [-1,0,1]){
      const parcel=group(stall,i*.29,1.11,-.025+i*.09);
      parcel.rotation.y=.13*i;
      box(parcel,i%2?pottery:painted,0,0,0,.24,.20+i*.05,.23);
      box(parcel,copper,0,.103+i*.025,0,.051,.014,.233);
      box(parcel,copper,0,0,.116,.051,.20+i*.05,.012);
    }
  }
}
