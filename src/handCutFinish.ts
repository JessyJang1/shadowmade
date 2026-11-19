import * as T from 'three';

/** Paint wear only on actual creases. Positions, normals, UVs and shadow meshes stay intact. */
export function handCutFinish(geometry:T.BufferGeometry,material:T.MeshStandardMaterial){
  if(geometry.index)throw new Error('Hand-cut finish expects the calibrated, non-indexed cutter mesh');
  const position=geometry.attributes.position,faces:T.Vector3[]=[],edgeMap=new Map<string,number[]>();
  const edgeKeys:string[][]=[],heights:number[]=[];
  const point=(i:number)=>new T.Vector3(position.getX(i),position.getY(i),position.getZ(i));
  const key=(a:T.Vector3,b:T.Vector3)=>[a,b].map(v=>v.toArray().map(n=>n.toFixed(5)).join(',')).sort().join('|');
  for(let i=0;i<position.count;i+=3){
    const a=point(i),b=point(i+1),c=point(i+2);
    const cross=b.clone().sub(a).cross(c.clone().sub(a)),area=cross.length();
    const id=faces.length;faces.push(cross.normalize());
    const keys=[key(b,c),key(c,a),key(a,b)];edgeKeys.push(keys);
    for(const edge of keys){if(!edgeMap.has(edge))edgeMap.set(edge,[]);edgeMap.get(edge)!.push(id);}
    heights.push(area/Math.max(.00001,b.distanceTo(c)),area/Math.max(.00001,c.distanceTo(a)),area/Math.max(.00001,a.distanceTo(b)));
  }
  const bary:number[]=[],crease:number[]=[],altitude:number[]=[];
  faces.forEach((normal,id)=>{
    const edges=edgeKeys[id].map(edge=>{
      const adjacent=edgeMap.get(edge)!;
      return adjacent.length===1||adjacent.some(other=>normal.dot(faces[other])<.83)?1:0;
    });
    for(let vertex=0;vertex<3;vertex++){
      bary.push(vertex===0?1:0,vertex===1?1:0,vertex===2?1:0);
      crease.push(...edges);altitude.push(...heights.slice(id*3,id*3+3));
    }
  });
  geometry.setAttribute('edgeBary',new T.Float32BufferAttribute(bary,3));
  geometry.setAttribute('edgeCrease',new T.Float32BufferAttribute(crease,3));
  geometry.setAttribute('edgeAltitude',new T.Float32BufferAttribute(altitude,3));
  material.onBeforeCompile=shader=>{
    shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>
      attribute vec3 edgeBary;attribute vec3 edgeCrease;attribute vec3 edgeAltitude;
      varying vec3 wornBary;varying vec3 wornCrease;varying vec3 wornAltitude;varying vec3 wornLocal;`)
      .replace('#include <begin_vertex>',`#include <begin_vertex>
      wornBary=edgeBary;wornCrease=edgeCrease;wornAltitude=edgeAltitude;wornLocal=position;`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
      varying vec3 wornBary;varying vec3 wornCrease;varying vec3 wornAltitude;varying vec3 wornLocal;`)
      .replace('#include <map_fragment>',`#include <map_fragment>
      vec3 wear=(1.0-smoothstep(vec3(.003),vec3(.012),wornBary*wornAltitude))*wornCrease;
      float edgeWear=max(max(wear.x,wear.y),wear.z);
      float brush=.68+.32*sin(wornLocal.x*71.0+wornLocal.y*43.0+wornLocal.z*57.0);
      diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*1.16+vec3(.028,.020,.012),edgeWear*.52*brush);`);
  };
  material.customProgramCacheKey=()=> 'wishlight-hand-cut-paint-v1';
}
