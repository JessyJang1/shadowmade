import * as T from 'three';
import {rand} from './paint';

/** A side elevation of two lamp trials, printed on the workshop's wall chart.
 *  Endpoints come from the same point-source / receiver-plane relationship as the bench. */
export function lampTrialChart(){
  const paper=document.createElement('canvas');paper.width=800;paper.height=960;
  const ctx=paper.getContext('2d')!,r=rand(1937);
  const ground=ctx.createLinearGradient(0,0,720,960);
  ground.addColorStop(0,'#415461');ground.addColorStop(.51,'#344653');ground.addColorStop(1,'#293b4a');
  ctx.fillStyle=ground;ctx.fillRect(0,0,800,960);
  for(let i=0;i<12000;i++){
    ctx.fillStyle=i%2?'#1c203322':'#e8cd9e18';
    ctx.fillRect(r()*800,r()*960,2+r()*10,.8+r()*2);
  }
  const line=(x:number,y:number,xx:number,yy:number,tint:string,width:number)=>{
    ctx.strokeStyle=tint;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(xx,yy);ctx.stroke();
  };
  const label=(s:string,x:number,y:number,size:number,color='#efdfba')=>{
    ctx.font=size+'px "Shadowmade Sans","PingFang SC",sans-serif';ctx.fillStyle=color;ctx.fillText(s,x,y);
  };
  const dot=(x:number,y:number,radius:number,color:string)=>{
    ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,radius,0,2*Math.PI);ctx.fill();
  };
  ctx.strokeStyle='#c2ae86';ctx.lineWidth=2;ctx.strokeRect(25,26,750,908);
  ctx.strokeStyle='#bda98a80';ctx.strokeRect(32,33,736,894);
  label('工坊观测簿',69,97,32);label('灯轨试记',66,168,62);
  line(66,194,730,194,'#bda98a',2);
  const cold='#bddde4',warm='#e6a373';
  function trial(top:number,fraction:number,name:string){
    const floor=top+226,wall=top+24,woodY=floor+fraction*(wall-floor);
    label(name,68,top+69,42);label('幕',691,wall+10,27);
    for(let y=wall+32;y<floor;y+=32)line(251,y,666,y,'#badbd326',1);
    line(240,wall,672,wall,'#e9d7af',4);line(267,floor,645,floor,'#cfb894',3);
    const peg=465;
    for(const [lamp,color,dashed] of [[428,cold,true],[502,warm,false]] as const){
      const shadow=lamp+(peg-lamp)/fraction;
      ctx.setLineDash(dashed?[8,6]:[]);line(lamp,floor,shadow,wall,color,4);ctx.setLineDash([]);
      ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(lamp,floor-9);
      ctx.lineTo(lamp-9,floor+9);ctx.lineTo(lamp+9,floor+9);ctx.closePath();ctx.fill();
      dot(shadow,wall,7,color);
    }
    // One wooden cross-section, fixed at the intersection of the two rays.
    ctx.fillStyle='#8a5747';ctx.strokeStyle='#eed7ac';ctx.lineWidth=3;
    ctx.beginPath();ctx.roundRect(peg-18,woodY-8,36,16,4);ctx.fill();ctx.stroke();
    const shift=37*(1/fraction-1);
    line(peg-shift,wall-13,peg+shift,wall-13,'#fff1cb',2);
    for(const x of [peg-shift,peg+shift])line(x,wall-18,x,wall-8,'#fff1cb',2);
    line(428,floor+28,502,floor+28,'#e4c6a3',2);line(502,floor+28,493,floor+22,'#e4c6a3',2);
  }
  trial(238,.32,'木件靠灯');trial(544,.72,'木件靠幕');
  label('灯行一寸，影行几何？',69,887,40);
  const texture=new T.CanvasTexture(paper);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;return texture;
}
