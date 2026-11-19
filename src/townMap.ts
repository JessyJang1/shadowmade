import {CatmullRomCurve3,Vector3} from 'three';
import {canal} from './world';
import {routeAmber} from './storyIdentity';
import {landmarks,northBridgeZ,northDeckHalfSpan,northDeckOffset,townBounds,townRoads} from './townLayout';

type Footprint={x:number;z:number;w:number;d:number;ry?:number};
type Landmark=keyof typeof landmarks;
const {west,east,north,south}=townBounds;
const margin=16;
const shadowBridge=[-northDeckHalfSpan,-1.60,1.60,northDeckHalfSpan].map(across=>
  [canal(northBridgeZ)+across,northBridgeZ+northDeckOffset(across)] as const);

const illustratedLandmarks = {
  clock: 82,
  workshop: 77,
  bridge: 83,
  observatory: 89,
  plaza: 78,
  lookout: 57,
} as const;
type IllustratedLandmark = keyof typeof illustratedLandmarks;
const keyLandmarks = new Set<Landmark>(['clock', 'workshop', 'bridge', 'observatory']);

function mapImage(name:string){
  const image = new Image();
  image.src = import.meta.env.BASE_URL + 'identity/town-map/' + name + '.webp';
  return image;
}

function makeDrawing(canvas:HTMLCanvasElement,footprints:readonly Footprint[],isLocked:(key:Landmark)=>boolean,paper:HTMLImageElement,icons:Record<IllustratedLandmark,HTMLImageElement>){
  const ctx=canvas.getContext('2d')!;
  const background=document.createElement('canvas');
  const base=background.getContext('2d')!;
  function project(x:number,z:number){
    const scale=Math.min((canvas.width-margin*2)/(east-west),(canvas.height-margin*2)/(south-north));
    return [canvas.width/2+(x-(west+east)/2)*scale,canvas.height/2+(z-(north+south)/2)*scale,scale] as const;
  }
  function stroke(pen:CanvasRenderingContext2D,points:readonly (readonly [number,number])[]){
    pen.beginPath();
    for(const [x,z] of points){const [sx,sz]=project(x,z);pen.lineTo(sx,sz);}
    pen.stroke();
  }
  const roads=townRoads.map(lane=>({
    ...lane, sampled:new CatmullRomCurve3(lane.points.map(([x,z])=>new Vector3(x,0,z))).getPoints(64)
      .map(({x,z})=>[x,z] as const),
  }));
  function spriteBounds(key:IllustratedLandmark){
    const sprite=icons[key];
    if(!sprite.naturalWidth)return;
    const p=landmarks[key];
    const [x,y,scale]=project(p.x,p.z);
    const size=illustratedLandmarks[key]*scale/15.4;
    const ratio=sprite.naturalWidth/sprite.naturalHeight;
    const width=ratio>1?size:size*ratio,height=ratio>1?size/ratio:size;
    const floor=key==='bridge'?.50:key==='lookout'?.57:.87;
    return {x:x-width/2,y:y-height*floor,width,height};
  }
  function build(){
    background.width=canvas.width;background.height=canvas.height;
    const [,,scale]=project(0,0);
    const w=canvas.width,h=canvas.height;
    base.fillStyle='#ead8b4';base.fillRect(0,0,w,h);
    if(paper.naturalWidth)base.drawImage(paper,0,0,w,h);
    const river=Array.from({length:76},(_,i)=>{const z=north-4+i*(south-north+8)/75;return [canal(z),z] as const;});
    base.lineCap='round';base.lineJoin='round';
    const riverWash=base.createLinearGradient(0,0,w,h);
    riverWash.addColorStop(0,'#aab8bf');riverWash.addColorStop(.56,'#647b9c');riverWash.addColorStop(1,'#879bb1');
    base.strokeStyle='#f5eddb';base.lineWidth=6.1*scale;stroke(base,river);
    base.strokeStyle='#a5a8b2';base.lineWidth=5.05*scale;stroke(base,river);
    base.strokeStyle=riverWash;base.lineWidth=4.27*scale;stroke(base,river);
    base.strokeStyle='#b5c0cf88';base.lineWidth=.10*scale;
    for(const offset of [-1.51,1.38])stroke(base,river.map(([x,z])=>[x+offset,z] as const));
    for(const lane of roads){
      base.strokeStyle='#fcf1dca8';base.lineWidth=lane.width*scale*.93;stroke(base,lane.sampled);
      base.strokeStyle='#9a765e80';base.lineWidth=lane.width*scale*.61;stroke(base,lane.sampled);
      base.strokeStyle='#e5c798';base.lineWidth=lane.width*scale*.44;stroke(base,lane.sampled);
    }
    // The lower crossing is always available. The north crossing is drawn from saved world state.
    base.strokeStyle='#796060';base.lineWidth=1.95*scale;
    stroke(base,[[canal(4)-2.5,4],[canal(4)+2.5,4]]);
    base.strokeStyle='#d8b589';base.lineWidth=1.65*scale;
    stroke(base,[[canal(4)-2.5,4],[canal(4)+2.5,4]]);
    for(const {x,z,w,d,ry=0} of footprints){
      const [sx,sz]=project(x,z);
      base.save();base.translate(sx,sz);base.rotate(-ry);
      const l=-w*scale/2,t=-d*scale/2,r=-l,b=-t;
      base.fillStyle='#8a67525a';
      base.beginPath();base.moveTo(l+1,t+2);base.lineTo(r+3,t+3);base.lineTo(r+4,b+3);base.lineTo(l+2,b+2);base.closePath();base.fill();
      base.fillStyle='#86778d';
      base.beginPath();base.moveTo(l,t+1);base.lineTo(r-1,t);base.lineTo(r,b-1);base.lineTo(l+1,b);base.closePath();base.fill();
      base.fillStyle='#b1a1a7';
      base.beginPath();base.moveTo(l,t+1);base.lineTo(r-1,t);base.lineTo(r,0);base.lineTo(l+.5,1);base.closePath();base.fill();
      base.strokeStyle='#f7ece2c0';base.lineWidth=Math.max(.55,.11*scale);
      base.beginPath();base.moveTo(l,t+1);base.lineTo(r-1,t);base.moveTo(l+.5,1);base.lineTo(r,0);base.stroke();
      base.restore();
    }
    for(const key of Object.keys(illustratedLandmarks) as IllustratedLandmark[]){
      const box=spriteBounds(key);
      if(box)base.drawImage(icons[key],box.x,box.y,box.width,box.height);
    }
  }
  let dirty=true;
  for(const image of [paper,...Object.values(icons)]){
    image.addEventListener('load',()=>{dirty=true;},{once:true});
  }
  return {
    hit(e:MouseEvent){
      const rect=canvas.getBoundingClientRect();
      const scale=Math.min(rect.width/canvas.width,rect.height/canvas.height);
      const x=(e.clientX-rect.left-(rect.width-canvas.width*scale)/2)/scale;
      const y=(e.clientY-rect.top-(rect.height-canvas.height*scale)/2)/scale;
      let key:Landmark|undefined,best=20;
      for(const [id,p] of Object.entries(landmarks)){
        const [sx,sy]=project(p.x,p.z);
        const distance=Math.hypot(x-sx,y-sy);
        if(distance<best){key=id as Landmark;best=distance;}
      }
      if(key)return key;
      return (Object.keys(illustratedLandmarks) as IllustratedLandmark[]).find(id=>{
        const box=spriteBounds(id);
        return box&&x>=box.x&&x<=box.x+box.width&&y>=box.y&&y<=box.y+box.height;
      });
    },
    draw(pos:Vector3,yaw:number,trail:Vector3[],goal:Landmark|null,bridgeOpen:boolean){
      if(dirty){build();dirty=false;}
      ctx.drawImage(background,0,0);
      const full=canvas.width>400;
      const labelSize=full?Math.max(17,Math.ceil(12.5*canvas.width/Math.max(canvas.clientWidth,1))):13;
      ctx.font=labelSize+'px "Shadowmade Sans","PingFang SC",sans-serif';
      ctx.textBaseline='middle';
      if(bridgeOpen){
        ctx.lineCap='round';ctx.lineJoin='round';
        ctx.strokeStyle='#6d5247';ctx.lineWidth=full?13:6;stroke(ctx,shadowBridge);
        ctx.strokeStyle='#ecd0a4';ctx.lineWidth=full?8:3;stroke(ctx,shadowBridge);
      }
      if(trail.length){
        const points=[[pos.x,pos.z] as const,...trail.map(p=>[p.x,p.z] as const)];
        ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
        ctx.setLineDash(full?[7,6]:[3,3]);
        ctx.strokeStyle='#4e3a55';ctx.lineWidth=full?5:3;stroke(ctx,points);
        ctx.strokeStyle=routeAmber;ctx.lineWidth=full?2.3:1.2;stroke(ctx,points);
        ctx.restore();
      }
      for(const [id,p] of Object.entries(landmarks)){
        const [x,y]=project(p.x,p.z);
        const key=id as Landmark;
        const active=id===goal;
        const locked=isLocked(key);
        if(locked&&!full)continue;
        const r=active?(full?8:5):full?3.8:2.3;
        ctx.beginPath();
        if(active){
          ctx.moveTo(x,y-r);ctx.lineTo(x+r,y);ctx.lineTo(x,y+r);ctx.lineTo(x-r,y);ctx.closePath();
        }else{
          ctx.arc(x,y,r,0,Math.PI*2);
        }
        ctx.strokeStyle='#594251';ctx.lineWidth=active?2.5:1.4;ctx.stroke();
        if(!locked||active){ctx.fillStyle=active?routeAmber:'#fae5b3';ctx.fill();}
        if(!full||canvas.clientWidth<480&&!active&&!keyLandmarks.has(key))continue;
        const labelHeight=labelSize+6;
        const labelY=y+labelHeight/2+(key==='bridge'?21:5);
        ctx.textAlign='center';
        const labelWidth=ctx.measureText(p.label).width+labelSize*.8;
        ctx.beginPath();ctx.roundRect(x-labelWidth/2,labelY-labelHeight/2,labelWidth,labelHeight,4);
        ctx.fillStyle=active?'#51364d':'#f7e7c6';ctx.fill();
        ctx.strokeStyle=active?'#a9713b':'#a2856d';ctx.lineWidth=1;ctx.stroke();
        ctx.fillStyle=active?'#ffdf95':locked?'#644e60':'#39263e';
        ctx.fillText(p.label,x,labelY);
      }
      const [x,y]=project(pos.x,pos.z);
      ctx.save();ctx.translate(x,y);ctx.rotate(-yaw);
      const size=full?10:7;
      ctx.beginPath();ctx.moveTo(0,-size);ctx.lineTo(size*.65,size*.65);ctx.lineTo(0,size*.27);ctx.lineTo(-size*.65,size*.65);ctx.closePath();
      ctx.fillStyle='#fff4ed';ctx.strokeStyle='#2b4567';ctx.lineWidth=2.5;ctx.stroke();ctx.fill();ctx.restore();
      if(full){
        const northX=canvas.width-35;
        ctx.textAlign='center';ctx.fillStyle='#553d56';
        ctx.fillText('北',northX,18);
        ctx.beginPath();ctx.moveTo(northX,29);ctx.lineTo(northX-5,45);ctx.lineTo(northX,41);ctx.lineTo(northX+5,45);ctx.closePath();ctx.fill();
      }
    },
  };
}

export function createTownMap(mini:HTMLCanvasElement,large:HTMLCanvasElement,footprints:readonly Footprint[],onPlace:(key:Landmark)=>void,isLocked:(key:Landmark)=>boolean){
  const paper=mapImage('snow-paper');
  const icons=Object.fromEntries(Object.keys(illustratedLandmarks).map(key=>[key,mapImage(key)])) as Record<IllustratedLandmark,HTMLImageElement>;
  const inset=makeDrawing(mini,footprints,isLocked,paper,icons), expanded=makeDrawing(large,footprints,isLocked,paper,icons);
  large.addEventListener('click',event=>{const key=expanded.hit(event);if(key)onPlace(key);});
  return {
    draw(pos:Vector3,yaw:number,path:Vector3[],goal:Landmark|null,open:boolean,bridgeOpen:boolean){
      (open?expanded:inset).draw(pos,yaw,path,goal,bridgeOpen);
    },
  };
}
