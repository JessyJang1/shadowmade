import * as T from 'three';
import {rand} from './paint';

/** Paired painted instrument beds, with perimeter scales outside the working centre. */
export function calibrationCloth(index:number){
  const canvas=document.createElement('canvas');
  canvas.width=768;canvas.height=600;
  const c=canvas.getContext('2d')!, random=rand(727+index);
  const wash=c.createLinearGradient(0,0,768,600);
  wash.addColorStop(0,index?'#717f82':'#696e89');
  wash.addColorStop(.53,index?'#596968':'#545970');
  wash.addColorStop(1,index?'#485859':'#4c4e63');
  c.fillStyle=wash;c.fillRect(0,0,768,600);
  for(let i=0;i<11000;i++){
    const x=random()*768,y=random()*600;
    c.strokeStyle=i%3?'#dccda51b':'#33293c24';
    c.beginPath();c.moveTo(x,y);c.lineTo(x+1+random()*12,y+random()*3);c.stroke();
  }
  c.translate(384,300);
  c.strokeStyle='#c6ab80';c.lineWidth=2;
  for(const inset of [0,9]){
    const x=362-inset,y=279-inset,b=29;
    c.beginPath();c.moveTo(-x+b,-y);
    for(const p of [[x-b,-y],[x,-y+b],[x,y-b],[x-b,y],[-x+b,y],[-x,y-b],[-x,-y+b],[-x+b,-y]])c.lineTo(p[0],p[1]);
    c.stroke();
  }
  for(const sign of [-1,1]){
    for(let i=-15;i<=15;i++){
      const x=i*20;c.beginPath();c.moveTo(x,sign*266);c.lineTo(x,sign*(i%5?257:247));c.stroke();
    }
  }
  c.strokeStyle='#d5c19b90';
  for(const r of [78,153]){
    c.beginPath();c.arc(0,0,r,0,Math.PI*2);c.stroke();
  }
  for(let i=0;i<16;i++){
    const a=i*Math.PI/8;
    c.save();c.rotate(a);c.beginPath();c.moveTo(0,-151);c.lineTo(0,i%4?-142:-126);c.stroke();
    if(i%2===0){
      const length=i%4?50:96;
      c.fillStyle='#aa9f87';c.beginPath();c.moveTo(0,-length);c.lineTo(-9,-15);c.lineTo(0,-21);c.fill();
      c.fillStyle='#bfb095';c.beginPath();c.moveTo(0,-length);c.lineTo(9,-15);c.lineTo(0,-21);c.fill();
    }
    c.restore();
  }
  const texture=new T.CanvasTexture(canvas);
  texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;
  return texture;
}
