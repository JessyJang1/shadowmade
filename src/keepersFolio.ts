import * as T from 'three';
import {SVGLoader} from 'three/addons/loaders/SVGLoader.js';
import {box,group,mesh,rand,type Parent} from './paint';

// Both studies and the finished moth use the same ink block. Every mark in
// the joined silhouette can be traced back to one of the two leaf impressions.
const wingContour='M 0 4 C -18 -24 -69 -89 -166 -107 Q -178 -96 -153 -69 Q -173 -71 -151 -44 Q -164 -46 -143 -22 C -122 0 -87 11 -57 11 Q -102 17 -109 49 Q -94 44 -99 69 Q -83 58 -87 83 Q -64 77 -53 64 Q -57 85 -65 99 C -19 77 -9 41 0 13 Q 9 35 4 53 Q 19 32 8 5 L 4 -12 Q -2 -42 -20 -53 Q -8 -31 0 -8 Z';

function printWing(ctx:CanvasRenderingContext2D,x:number,y:number,scale:number,mirror:number,ink:string){
  ctx.save();
  ctx.translate(x,y);ctx.scale(scale*mirror,scale);
  const wing=new Path2D(wingContour);
  ctx.fillStyle=ink;ctx.fill(wing);ctx.save();ctx.clip(wing);
  ctx.strokeStyle='#e2b77e';ctx.lineWidth=2.8;
  for(const [a,b,c,d] of [[-82,-19,-162,-102],[-70,-13,-154,-57],[-55,-2,-133,-22],[-45,24,-95,63],[-28,37,-64,88]]){
    ctx.beginPath();ctx.moveTo(-5,7);ctx.quadraticCurveTo(a,b,c,d);ctx.stroke();
  }
  const scatter=rand(720);
  for(let i=0;i<460;i++){
    const px=-175+scatter()*190,py=-110+scatter()*220;
    ctx.fillStyle=i%3?'#f5dcb54a':'#251c3040';
    ctx.fillRect(px,py,2+scatter()*5,1+scatter()*1.5);
  }
  ctx.restore();ctx.restore();
}

function impression(){
  const c=document.createElement('canvas');c.width=1536;c.height=896;
  const a=c.getContext('2d')!,r=rand(1722);
  const wash=a.createLinearGradient(0,0,c.width,75);
  for(const [stop,color] of [[0,'#c5a581'],[.04,'#e0c9a2'],[.28,'#e9d5b1'],[.47,'#d9be95'],[.5,'#ac8c71'],
      [.53,'#d9c09c'],[.72,'#ecd8b9'],[.96,'#e3cba7'],[1,'#caaa88']] as const)wash.addColorStop(stop,color);
  a.fillStyle=wash;a.fillRect(0,0,c.width,c.height);
  for(let i=0;i<14500;i++){
    a.fillStyle=i%3?'#604c4212':'#fff6dc38';
    a.fillRect(r()*1536,r()*896,1+r()*10,.6+r()*1.5);
  }
  const type=(text:string,x:number,y:number,size:number,color='#49394a')=>{
    a.fillStyle=color;a.font=size+'px "Shadowmade Sans","PingFang SC",sans-serif';a.fillText(text,x,y);
  };
  const rule=(x:number,y:number,w:number)=>{
    a.strokeStyle='#977858';a.lineWidth=1.8;a.beginPath();a.moveTo(x,y);a.lineTo(x+w,y+1);a.stroke();
  };
  // A cut-pine fleuron is printed from one small block in all four corners.
  for(const x of [52,716,820,1484])for(const y of [49,839]){
    a.save();a.translate(x,y);a.scale(x===716||x===1484?-1:1,y===839?-1:1);
    a.strokeStyle='#7c705c';a.lineWidth=2;a.beginPath();a.moveTo(0,0);a.quadraticCurveTo(22,14,52,11);a.stroke();
    for(let i=0;i<5;i++){
      const sx=7+i*8,sy=3+i*1.4;
      for(const side of [-1,1]){
        a.fillStyle=i%2?'#728075':'#887561';a.beginPath();a.moveTo(sx,sy);
        a.quadraticCurveTo(sx+1,sy+side*7,sx+12,sy+side*10);
        a.quadraticCurveTo(sx+8,sy+side*2,sx,sy);a.fill();
      }
    }
    a.restore();
  }
  for(const x of [0,768]){
    a.strokeStyle='#94785a';a.lineWidth=2;a.strokeRect(x+34,31,699,828);
    rule(x+77,179,612);rule(x+77,737,612);
  }
  type('守 灯 人 手 记',84,99,32);type('两枚叶印',82,161,55);
  type('冬至夜 · 合影试印',850,106,38);
  type('夜蛾',848,163,51);
  // Ink trial on the left, register the same two impressions on the right.
  printWing(a,368,355,1.35,1,'#40525d');
  printWing(a,386,553,1.33,-1,'#955543');
  type('甲',123,469,36);type('乙',600,648,36);
  a.save();a.translate(1150,462);
  const night=a.createRadialGradient(0,0,16,0,0,282);
  night.addColorStop(0,'#ceaa7866');night.addColorStop(1,'#f0debd00');
  a.fillStyle=night;a.fillRect(-287,-286,574,572);
  a.lineWidth=1.3;a.strokeStyle='#998168';a.setLineDash([5,9]);
  for(const radius of [206,231]){a.beginPath();a.arc(0,0,radius,.10,Math.PI*1.93);a.stroke();}
  a.restore();
  type('先辨各自的影。',85,805,42);type('两道影，共同的心。',850,805,42);
  const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=4;
  return tex;
}

export function keepersFolio(parent:Parent,cover:T.Material){
  const book=group(parent,-.09,1.34,.08);
  book.rotation.y=.06;
  const atlas=impression();
  const cutEdges=new T.MeshStandardMaterial({vertexColors:true,roughness:1,side:T.DoubleSide});
  const leaf=new T.MeshStandardMaterial({map:atlas,color:'#ede2cd',roughness:.97,side:T.DoubleSide});
  const leather=box(book,cover,0,.008,0,1.30,.048,.92);leather.rotation.y=.006;
  const pageY=(x:number,z:number)=>.081+.072*Math.sin(Math.PI*Math.abs(x)**.8)+.018*x+
    .015*Math.sin(z*Math.PI*.9+x*2)*Math.abs(x)+.018*x*x;
  for(const side of [-1,1]){
    const vertices:number[]=[],uv:number[]=[],indices:number[]=[];
    const columns=16,rows=6;
    for(let j=0;j<=rows;j++)for(let i=0;i<=columns;i++){
      const u=i/columns,t=j/rows,x=side*(.004+.615*u),z=(t-.5)*.86;
      vertices.push(x,pageY(u*side,t),z+.009*Math.sin(u*Math.PI+t)*u);
      uv.push(.5+side*.5*u,1-t);
      if(i&&j){
        const k=j*(columns+1)+i;
        if(side>0)indices.push(k,k-columns-1,k-1,k-1,k-columns-1,k-columns-2);
        else indices.push(k,k-1,k-columns-1,k-1,k-columns-2,k-columns-1);
      }
    }
    const geo=new T.BufferGeometry();
    geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));
    geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();
    mesh(book,geo,leaf);
    // Match the sloping cut edges to the actual top sheet at every station.
    const edgePoints:number[]=[],edgeColors:number[]=[],edgeIndices:number[]=[];
    const outline:Array<[number,number]>=[];
    for(let i=0;i<=columns;i++)outline.push([i/columns,0]);
    for(let i=1;i<=rows;i++)outline.push([1,i/rows]);
    for(let i=1;i<=columns;i++)outline.push([1-i/columns,1]);
    const pale=new T.Color('#e4cbaa'),shadow=new T.Color('#9e826b');
    for(let station=0;station<outline.length;station++){
      const [u,t]=outline[station],top=pageY(u*side,t);
      for(let layer=0;layer<=10;layer++){
        const ridge=layer%2*.003;
        edgePoints.push(side*(.004+(.615+ridge)*u),.03+(top-.03)*layer/10,
          (t-.5)*(.86+ridge)+.009*Math.sin(u*Math.PI+t)*u);
        edgeColors.push(...(layer%2?pale:shadow).toArray());
        if(station&&layer){
          const k=station*11+layer;edgeIndices.push(k,k-1,k-11,k-1,k-12,k-11);
        }
      }
    }
    const edges=new T.BufferGeometry();
    edges.setAttribute('position',new T.Float32BufferAttribute(edgePoints,3));
    edges.setAttribute('color',new T.Float32BufferAttribute(edgeColors,3));
    edges.setIndex(edgeIndices);edges.computeVertexNormals();
    mesh(book,edges,cutEdges);
  }
  const ribbon=new T.MeshStandardMaterial({color:'#823e48',roughness:.93,side:T.DoubleSide});
  const strip=new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute([
    .11,.060,.32,.16,.060,.32,.18,.052,.46,.12,.052,.46,.18,-.012,.51,.13,-.029,.515,
  ],3));strip.setIndex([0,1,2,0,2,3,3,2,4,3,4,5]);strip.computeVertexNormals();mesh(book,strip,ribbon);
  // The paper halves are cut from the same outline as the two ink studies.
  // Their free edges rise about the joined spine, like the fold in a pop-up.
  const pattern=new SVGLoader().parse('<svg xmlns="http://www.w3.org/2000/svg"><path d="'+wingContour+'"/></svg>');
  const shape=SVGLoader.createShapes(pattern.paths[0])[0];
  const cut=new T.ExtrudeGeometry(shape,{depth:2,bevelEnabled:false,curveSegments:8});
  const pos=cut.attributes.position,uv=cut.attributes.uv;
  for(let i=0;i<pos.count;i++)uv.setXY(i,(pos.getX(i)+184)/220,1-(pos.getY(i)+115)/230);
  cut.scale(.0012,-.0012,.0012);
  const anchor=new T.Vector2(.275,.012);
  const rest=new T.Vector2(.365,.128),loose=rest.clone();
  const wings=[1,-1].map((mirror,i)=>{
    const c=document.createElement('canvas');c.width=440;c.height=460;
    const ink=c.getContext('2d')!;
    ink.fillStyle='#bf965f';ink.fillRect(0,0,440,460);
    printWing(ink,368,230,2,1,i?'#985236':'#304d61');
    ink.save();ink.translate(368,230);ink.scale(2,2);
    for(const [x,y,r] of [[-108,-52,12],[-70,42,7],[-135,-75,4]]){
      for(const [ratio,color] of [[1,'#d6aa6b'],[.69,'#493c42'],[.31,'#f3d3a1']] as const){
        ink.fillStyle=color;ink.beginPath();ink.ellipse(x,y,r*ratio,r*.68*ratio,.55,0,2*Math.PI);ink.fill();
      }
    }
    ink.restore();
    const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;
    const hinge=group(book);
    const plate=mesh(hinge,cut,new T.MeshStandardMaterial({map,roughness:.84,side:T.DoubleSide}));
    plate.rotation.x=-Math.PI/2;plate.scale.x=mirror;
    return {hinge,plate};
  });
  // Project each cut edge through the flame onto the curved right page.
  // Both wings share its surface equation; no cubemap shadow pass is needed.
  const shadows=wings.map(({plate})=>{
    const material=new T.ShaderMaterial({
      transparent:true,depthWrite:false,side:T.DoubleSide,forceSinglePass:true,
      uniforms:{wing:{value:new T.Matrix4()},flame:{value:new T.Vector3()}},
      vertexShader:`uniform mat4 wing; uniform vec3 flame; varying vec2 paper;
        float heightAt(vec2 p){
          float u=clamp((p.x-.004)/.615,0.,1.);
          float t=clamp(p.y/.86+.5,0.,1.);
          return .081+.072*sin(3.14159*pow(u,.8))+.018*u+
            .015*sin(t*3.14159*.9+u*2.)*u+.018*u*u;
        }
        void main(){
          vec3 edge=(wing*vec4(position,1.)).xyz;
          vec3 ray=edge-flame;
          vec2 q=edge.xz;
          for(int i=0;i<4;i++)q=flame.xz+ray.xz*((heightAt(q)-flame.y)/min(-.025,ray.y));
          paper=q;
          gl_Position=projectionMatrix*modelViewMatrix*vec4(q.x,heightAt(q)+.0025,q.y,1.);
        }`,
      fragmentShader:`varying vec2 paper;
        void main(){
          if(paper.x<.006||paper.x>.618||abs(paper.y)>.423)discard;
          gl_FragColor=vec4(.19,.105,.12,.30);
          #include <colorspace_fragment>
        }`,
    });
    const shadow=mesh(book,cut,material);
    shadow.frustumCulled=false;
    return {plate,material};
  });
  const invBook=new T.Matrix4();
  function setFlame(world:T.Vector3){
    const here=book.worldToLocal(world.clone());
    for(const {material} of shadows)material.uniforms.flame.value.copy(here);
  }
  const thorax=mesh(book,new T.SphereGeometry(1,12,8),new T.MeshStandardMaterial({color:'#62423b',roughness:.8}));
  thorax.scale.set(.011,.011,.046);
  let lift=0,active:number|null=null;
  const offset=new T.Vector2();
  const hitTest=new T.Raycaster(),localRay=new T.Ray(),plane=new T.Plane(new T.Vector3(0,1,0),-.188);
  function paperPoint(ray:T.Ray){
    localRay.copy(ray).applyMatrix4(book.matrixWorld.clone().invert());
    const p=localRay.intersectPlane(plane,new T.Vector3());
    return p?new T.Vector2(p.x,p.z):null;
  }
  function joined(){return loose.distanceTo(anchor)<.028;}
  function pose(time:number,dt:number){
    const proximity=1-T.MathUtils.smoothstep(loose.distanceTo(anchor),.012,.069);
    lift=T.MathUtils.damp(lift,proximity,9,dt);
    for(const [i,{hinge}] of wings.entries()){
      const pin=i?loose:anchor;
      hinge.position.set(pin.x,.188+lift*.041+i*.003,pin.y);
      hinge.rotation.z=(i?1:-1)*lift*(.86+.15*Math.sin(time*4));
    }
    invBook.copy(book.matrixWorld).invert();
    for(const {plate,material} of shadows){
      plate.updateWorldMatrix(true,false);
      material.uniforms.wing.value.multiplyMatrices(invBook,plate.matrixWorld);
    }
    thorax.visible=lift>.04;thorax.position.set(anchor.x,.193+lift*.043,anchor.y);
  }
  pose(0,0);
  return {book,joined,pose,setFlame,
    begin(id:number,ray:T.Ray){
      if(active!==null)return false;
      hitTest.ray.copy(ray);
      if(!hitTest.intersectObject(wings[1].plate,false).length)return false;
      const p=paperPoint(ray);if(!p)return false;
      active=id;offset.copy(loose).sub(p);return true;
    },
    move(id:number,ray:T.Ray){
      if(active!==id)return;
      const p=paperPoint(ray);if(!p)return;
      loose.copy(p.add(offset)).clamp(new T.Vector2(.13,-.19),new T.Vector2(.385,.21));
    },
    toggle(){loose.copy(joined()?rest:anchor);},
    release(){active=null;},
    grip(){return wings[1].plate.localToWorld(new T.Vector3(-.090,.035,.002));},
    solutionDelta(){return book.localToWorld(new T.Vector3(anchor.x-loose.x,.188,anchor.y-loose.y))
      .sub(book.localToWorld(new T.Vector3(0,.188,0)));},
  };
}

export function chamberstick(parent:Parent,bronze:T.Material){
  const base=group(parent,-.74,1.32,-.31);
  function spin(profile:number[][],material:T.Material){
    return mesh(base,new T.LatheGeometry(profile.map(([r,y])=>new T.Vector2(r,y)),24),material);
  }
  spin([[.012,.014],[.12,.012],[.157,.025],[.17,.046],[.163,.057],[.144,.048],[.080,.041],
    [.067,.069],[.052,.082],[.055,.114],[.066,.117],[.063,.128],[.045,.128]],bronze);
  const handle=mesh(base,new T.TorusGeometry(.070,.014,8,20),bronze,-.141,.103,0);
  handle.scale.y=.85;
  const wax=new T.MeshStandardMaterial({color:'#e9c696',roughness:.83});
  spin([[.051,.123],[.056,.144],[.050,.183],[.052,.247],[.050,.320],[.045,.328],[.031,.306],[.009,.303]],wax);
  for(const [angle,length] of [[.60,.065],[1.83,.090],[3.4,.040]]){
    const drip=mesh(base,new T.SphereGeometry(1,8,8),wax,.048*Math.cos(angle),.318-length*.5,.048*Math.sin(angle));
    drip.scale.set(.009,length*.53,.011);
  }
  const flame=spin([[.001,.321],[.020,.346],[.018,.375],[.008,.398],[0,.421]],
    new T.MeshBasicMaterial({color:'#ffecc2',toneMapped:false}));
  return {base,flame};
}
