import * as T from 'three';

export type Parent = T.Object3D;
export const palette = {snow:'#c2bfd7', snowLight:'#dfd9e4', wood:'#563c50', timber:'#805568', dark:'#312a46', stone:'#817085', gold:'#e8ae61', cream:'#eee6d6', pine:'#344b4b', berry:'#a76677', blue:'#607296'};
export function rand(seed: number) {
  return () => {seed = (Math.imul(seed,1664525)+1013904223) >>> 0; return seed/4294967296;};
}
const maps = new Map<string,T.CanvasTexture>();
export function painted(kind = 'plaster') {
  const known = maps.get(kind); if(known) return known;
  const canvas = document.createElement('canvas'); canvas.width=canvas.height=256;
  const c=canvas.getContext('2d')!, r=rand(4302+kind.length);
  c.fillStyle='#e6dee1'; c.fillRect(0,0,256,256);
  for(let i=0;i<9500;i++){
    const x=r()*256,y=r()*256,a=r()*(kind==='paper'?.064:.136);
    c.fillStyle=r()<.48?'rgba(60,40,72,'+a+')':'rgba(255,250,233,'+a+')';
    c.beginPath(); c.ellipse(x,y, .4+r()*(kind==='wood'?19:5), .3+r()*1.8, kind==='wood'?.06:-.6+r()*.8,0,Math.PI*2); c.fill();
  }
  if(kind==='stone'||kind==='plaster'||kind==='paper'){
    for(let i=0;i<310;i++){
      const x=r()*256,y=r()*256, length=2+r()*19, width=.35+r()*1.43;
      c.strokeStyle=r()<.49?'rgba(92,60,75,.045)':'rgba(255,234,197,.078)';
      c.lineWidth=width;c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+length*.35,y-2.5,x+length,y-3.2+r()*3.9);c.stroke();
    }
  }
  if(kind==='wood') for(let j=0;j<30;j++){
    c.lineWidth=r()*.8+.25; c.strokeStyle='rgba(75,54,74,.18)'; c.beginPath();
    const y=r()*256;c.moveTo(0,y);c.bezierCurveTo(68,y+r()*11,176,y-r()*11,256,y);c.stroke();
  }
  if(kind==='moon'){
    // Overlapping pigment washes describe the maria at a distance; light
    // catches the upper lip of a few bowls instead of outlining every crater.
    const wash=c.createRadialGradient(88,68,10,138,142,150);
    wash.addColorStop(0,'#fff2ce');wash.addColorStop(.69,'#ebd8b9');wash.addColorStop(1,'#c8beb8');
    c.fillStyle=wash;c.fillRect(0,0,256,256);
    for(const [cx,cy,rx,ry] of [[71,105,43,29],[117,81,28,37],[170,97,35,23],[192,130,20,16],[95,157,20,24]]){
      for(let i=0;i<100;i++){
        const a=r()*Math.PI*2,d=Math.sqrt(r());
        c.fillStyle='rgba(95,96,119,.045)';c.beginPath();
        c.ellipse(cx+rx*d*Math.cos(a),cy+ry*d*Math.sin(a),4+r()*11,2+r()*5,-.55,0,Math.PI*2);c.fill();
      }
    }
    for(let i=0;i<180;i++){
      const x=r()*256,y=r()*256,size=1+r()**3*8;
      c.fillStyle='rgba(138,128,128,.16)';c.beginPath();c.ellipse(x,y,size,size*.72,-.35,0,Math.PI*2);c.fill();
      c.strokeStyle='rgba(255,250,214,.5)';c.beginPath();c.ellipse(x,y,size,size*.72,-.35,.15,2.55);c.stroke();
    }
  }
  const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.anisotropy=4;
  maps.set(kind,tex);return tex;
}
const mats=new Map<string,T.MeshStandardMaterial>();
export function mat(color:string,kind='plaster'){
  const k=color+kind;
  if(!mats.has(k)){
    const carved=kind.endsWith('-detail');
    const surface=kind.replace(/-detail$/,'');
    const map=painted(surface);
    mats.set(k,new T.MeshStandardMaterial({
      color,map,roughness:surface==='wood'?.88:.95,
      bumpMap:carved?map:null,bumpScale:surface==='wood'?.028:.016,
    }));
  }
  return mats.get(k)!;
}
export const glow=(color:string,intensity=1)=>new T.MeshStandardMaterial({color,emissive:color,emissiveIntensity:intensity,roughness:.65});
export function mesh<M extends T.Material|T.Material[]>(p:Parent,g:T.BufferGeometry,m:M,x=0,y=0,z=0){
  const o=new T.Mesh(g,m);o.position.set(x,y,z);p.add(o);return o;
}
const cube=new T.BoxGeometry(1,1,1), ballGeo=new T.SphereGeometry(1,12,8), lowball=new T.IcosahedronGeometry(1,1);
export const box=(p:Parent,m:T.Material,x:number,y:number,z:number,w:number,h:number,d:number)=>{
  const o=mesh(p,cube,m,x,y,z);o.scale.set(w,h,d); return o;
};
export const ball=(p:Parent,m:T.Material,x:number,y:number,z:number,w:number,h:number,d:number,facets=false)=>{
  const o=mesh(p,facets?lowball:ballGeo,m,x,y,z);o.scale.set(w,h,d);return o;
};
export function group(p:Parent,x=0,y=0,z=0){const g=new T.Group();g.position.set(x,y,z);p.add(g);return g;}
export function beam(p:Parent,m:T.Material,a:T.Vector3,b:T.Vector3,w=.12,depth=w){
  const d=b.clone().sub(a), mid=a.clone().addScaledVector(d,.5);
  const o=box(p,m,mid.x,mid.y,mid.z,w,d.length(),depth);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());return o;
}
export const v=(x:number,y:number,z:number)=>new T.Vector3(x,y,z);
export function cylinder(p:Parent,m:T.Material,x:number,y:number,z:number,top:number,bottom:number,h:number,n=16){
  return mesh(p,new T.CylinderGeometry(top,bottom,h,n),m,x,y,z);
}
export function shapeMesh(p:Parent,points:T.Vector2[],m:T.Material,depth:number,x=0,y=0,z=0,bevel=0){
  const shape=new T.Shape(points);
  return mesh(p,new T.ExtrudeGeometry(shape,{depth,bevelEnabled:bevel>0,bevelThickness:bevel,bevelSize:bevel,bevelSegments:1,curveSegments:10}),m,x,y,z);
}
export function starPoints(r:number,inner=.44){
  return Array.from({length:10},(_,i)=>{const a=Math.PI/2+i*Math.PI/5,d=r*(i%2?inner:1); return new T.Vector2(Math.cos(a)*d,Math.sin(a)*d);});
}
export function loop(p:Parent,points:T.Vector3[],m:T.Material,r=.02){
  return mesh(p,new T.TubeGeometry(new T.CatmullRomCurve3(points,true,'catmullrom',.1),points.length*5,r,5,true),m);
}
let lightMap:T.CanvasTexture;
export function radialTexture(){
  if(!lightMap){
    const c=document.createElement('canvas');c.width=c.height=128;const a=c.getContext('2d')!,g=a.createRadialGradient(64,64,0,64,64,64);
    g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.35,'rgba(255,255,255,.53)');g.addColorStop(1,'rgba(255,255,255,0)');
    a.fillStyle=g;a.fillRect(0,0,128,128);lightMap=new T.CanvasTexture(c);
  }
  return lightMap;
}
export function pool(p:Parent,x:number,y:number,z:number,r:number,color:string,opacity=.25){
  const o=mesh(p,new T.PlaneGeometry(r*2,r*2),new T.MeshBasicMaterial({color,map:radialTexture(),transparent:true,opacity,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-3}),x,y,z);
  o.rotation.x=-Math.PI/2;return o;
}
export function plaque(p:Parent,label:string,w:number,h:number,x:number,y:number,z:number,fontSize=36){
  const c=document.createElement('canvas');c.width=640;c.height=128;const a=c.getContext('2d')!;
  a.fillStyle='#34293b';a.fillRect(0,0,640,128);a.strokeStyle='#b58d75';a.lineWidth=5;a.strokeRect(10,10,620,108);
  a.fillStyle='#f3d9a8';a.textAlign='center';a.textBaseline='middle';a.font=`${fontSize}px "Shadowmade Sans","PingFang SC",sans-serif`;a.fillText(label,320,65);
  const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace; return mesh(p,new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map}),x,y,z);
}
