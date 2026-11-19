import * as T from 'three';
import {mesh,rand,type Parent} from './paint';
import {townRoads} from './townLayout';

export type LocalShade = {x:number;z:number;halfX:number;halfZ:number;feather:number;opacity:number;yaw?:number};
export function groundContact(parent:Parent, ground:(x:number,z:number)=>number, shapes:LocalShade[]){
  const positions:number[]=[], opacity:number[]=[], indices:number[]=[];
  const n=14;
  for(const {x,z,halfX,halfZ,feather,opacity:strength,yaw=0} of shapes){
    const start=opacity.length, cos=Math.cos(yaw), sin=Math.sin(yaw);
    for(let j=0;j<=n;j++)for(let i=0;i<=n;i++){
      const a=(i/n*2-1)*(halfX+feather),b=(j/n*2-1)*(halfZ+feather);
      const wx=x+a*cos+b*sin,wz=z-a*sin+b*cos;
      const distance=Math.hypot(Math.max(0,Math.abs(a)-halfX),Math.max(0,Math.abs(b)-halfZ));
      const noise=.90+.1*Math.sin(wx*9+wz*6)*Math.cos(wz*7);
      positions.push(wx,ground(wx,wz)+.085,wz);
      opacity.push(strength*noise*(1-T.MathUtils.smoothstep(distance,0,feather)));
      const k=start+j*(n+1)+i;
      if(i&&j)indices.push(k,k-n-1,k-1,k-1,k-n-1,k-n-2);
    }
  }
  const geo=new T.BufferGeometry();
  geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  geo.setAttribute('strength',new T.Float32BufferAttribute(opacity,1));geo.setIndex(indices);
  const material=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,
    polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-2,
    vertexShader:`attribute float strength;varying float ink;
      void main(){ink=strength;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`varying float ink;
      void main(){gl_FragColor=vec4(.065,.084,.135,ink);}`});
  mesh(parent,geo,material).renderOrder=1;
}

/** Paint intersecting streets into one world-space mask so the stone courses
 * stay continuous where paths meet and do not fight at coplanar joins. */
export function laySnowboundStreets(parent:Parent,height:(x:number,z:number)=>number,canal:(z:number)=>number){
  const west=-25,north=-25,span=52,resolution=768,scale=resolution/span;
  const stencil=document.createElement('canvas');
  stencil.width=stencil.height=resolution;
  const paint=stencil.getContext('2d')!;
  paint.fillStyle='black';paint.fillRect(0,0,resolution,resolution);
  paint.lineCap='round';paint.lineJoin='round';paint.globalCompositeOperation='lighten';
  for(const lane of townRoads){
    const path=new T.CatmullRomCurve3(lane.points.map(([x,z])=>new T.Vector3(x,0,z)));
    paint.beginPath();
    for(const {x,z} of path.getPoints(180))paint.lineTo((x-west)*scale,(z-north)*scale);
    for(let edge=9;edge>=0;edge--){
      const ink=255-edge*26;
      paint.strokeStyle=`rgb(${ink},${ink},${ink})`;
      paint.lineWidth=(lane.width+edge*.075)*scale;paint.stroke();
    }
  }
  const coverage=paint.getImageData(0,0,resolution,resolution);
  for(let j=0;j<resolution;j++){
    const z=north+j/scale,river=canal(z);
    for(let i=0;i<resolution;i++){
      const address=(j*resolution+i)*4,value=coverage.data[address];
      if(!value)continue;
      const x=west+i/scale;
      const clearRiver=T.MathUtils.smoothstep(Math.abs(x-river),2.31,2.83);
      const frost=.14*Math.sin(x*31+z*23)+.08*Math.cos(z*37-x*19);
      const a=T.MathUtils.clamp(value/255+frost*(1-value/255),0,1);
      coverage.data[address]=coverage.data[address+1]=coverage.data[address+2]=a*255*clearRiver;
    }
  }
  paint.putImageData(coverage,0,0);
  const mask=new T.CanvasTexture(stencil);
  mask.channel=1;mask.anisotropy=4;

  const step=108,geometry=new T.PlaneGeometry(span,span,step,step);
  geometry.rotateX(-Math.PI/2);
  geometry.translate(west+span/2,0,north+span/2);
  const position=geometry.attributes.position,uv=geometry.attributes.uv;
  geometry.setAttribute('uv1',uv.clone());
  const indices:number[]=[];
  const coarseMask=Math.round(resolution/step/2);
  for(let row=0;row<step;row++){
    for(let col=0;col<step;col++){
      const i=Math.floor((col+.5)*resolution/step),j=Math.floor((row+.5)*resolution/step);
      // Pad by half a cell so sparse feathered edges retain their triangles.
      let covered=false;
      for(let y=Math.max(j-coarseMask,0);y<Math.min(j+coarseMask+1,resolution)&&!covered;y++){
        for(let x=Math.max(i-coarseMask,0);x<Math.min(i+coarseMask+1,resolution);x++){
          if(coverage.data[(y*resolution+x)*4]>6){covered=true;break;}
        }
      }
      if(covered){
        const a=row*(step+1)+col,b=a+step+1;
        indices.push(a,b,a+1,b,b+1,a+1);
      }
    }
  }
  for(let i=0;i<position.count;i++){
    const x=position.getX(i),z=position.getZ(i);
    position.setY(i,height(x,z)+.077);
    uv.setXY(i,(x+.11*z)/3.31,(z-.11*x)/3.68);
  }
  geometry.setIndex(indices);geometry.computeVertexNormals();
  const paving=mesh(parent,geometry,paintedSetts(mask));
  paving.name='Snowbound streets';
  paving.receiveShadow=true;
}

function paintedSetts(mask:T.Texture){
  const size=512;
  function surface(){
    const canvas=document.createElement('canvas');
    canvas.width=canvas.height=size;
    return canvas.getContext('2d')!;
  }
  const pigment=surface(),relief=surface(),rng=rand(842);
  pigment.fillStyle='#697281';pigment.fillRect(0,0,size,size);
  relief.fillStyle='#515151';relief.fillRect(0,0,size,size);
  const palette=['#a7a6a1','#8f929d','#b3a9a0','#a29aa4','#90999e','#b5aea6'];
  const across=7,along=8,width=size/across,height=size/along;
  for(let row=0;row<along;row++){
    for(let col=-1;col<across;col++){
      const x=width*(col+(row%2)*.5),y=height*row,slant=(rng()-.5)*9;
      const block=new Path2D();
      block.moveTo(x+5,y+9);
      block.quadraticCurveTo(x+20,y+1,x+width-13,y+4+slant);
      block.quadraticCurveTo(x+width-2,y+5+slant,x+width-3,y+14);
      block.lineTo(x+width-3,y+height-15);
      block.quadraticCurveTo(x+width-5,y+height-3,x+width-17,y+height-4);
      block.lineTo(x+13,y+height-4+slant*.32);
      block.quadraticCurveTo(x+3,y+height-4+slant*.32,x+4,y+height-15);
      block.closePath();
      pigment.fillStyle=palette[Math.floor(rng()*palette.length)];pigment.fill(block);
      pigment.save();pigment.clip(block);
      const shading=pigment.createLinearGradient(x+18,y,x+45,y+height);
      shading.addColorStop(0,'#f0e7da80');shading.addColorStop(.15,'#e0d8c82a');
      shading.addColorStop(.68,'#34425300');shading.addColorStop(1,'#3f3b5280');
      pigment.fillStyle=shading;pigment.fillRect(x,y,width,height);
      for(let i=0;i<24;i++){
        pigment.fillStyle=i%3===0?'#e7d9c624':'#4a50601c';
        pigment.fillRect(x+rng()*width,y+rng()*height,4+rng()*21,.8+rng()*2);
      }
      pigment.restore();
      relief.fillStyle='#a9a9a9';relief.fill(block);
      relief.strokeStyle='#6d6d6d';relief.lineWidth=3;relief.stroke(block);
    }
  }
  // Small flecks of snow break up each painted face, including across seams.
  for(let i=0;i<3800;i++){
    const x=rng()*size,y=rng()*size;
    pigment.fillStyle=i%7?'#ebe8ed29':'#4b536121';
    pigment.fillRect(x,y,2+rng()*9,1+rng()*2);
  }
  const map=new T.CanvasTexture(pigment.canvas),bumpMap=new T.CanvasTexture(relief.canvas);
  map.colorSpace=T.SRGBColorSpace;
  for(const texture of [map,bumpMap]){
    texture.wrapS=texture.wrapT=T.RepeatWrapping;
    texture.anisotropy=4;
  }
  return new T.MeshStandardMaterial({map,bumpMap,alphaMap:mask,bumpScale:.024,roughness:.94,transparent:true,alphaTest:.04,depthWrite:true,side:T.DoubleSide});
}
