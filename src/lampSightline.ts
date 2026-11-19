import * as T from 'three';

// Operates on lamp fragments only. Shared uniforms survive static batching.
// Clip from the colour pass, leaving the lamp's shadows and light animation intact.
export function lampSightline(){
  const bottom={value:new T.Vector3()},top={value:new T.Vector3()},enabled={value:0};
  const variants=new Map<T.MeshStandardMaterial,T.MeshStandardMaterial>();
  function shade(source:T.MeshStandardMaterial){
    let material=variants.get(source);
    if(material)return material;
    material=source.clone();
    material.onBeforeCompile=shader=>{
      Object.assign(shader.uniforms,{lampCutBottom:bottom,lampCutTop:top,lampCutEnabled:enabled});
      shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`
        #include <common>
        uniform vec3 lampCutBottom;
        uniform vec3 lampCutTop;
        uniform float lampCutEnabled;
      `).replace('#include <clipping_planes_fragment>',`
        #include <clipping_planes_fragment>
        if(lampCutEnabled > .5){
          // Perspective-project both ends of the actor capsule to a common
          // plane. At the nearest point compare depths before cutting the pole.
          vec2 a=lampCutBottom.xy/lampCutBottom.z;
          vec2 b=lampCutTop.xy/lampCutTop.z;
          vec2 ray=vViewPosition.xy/vViewPosition.z;
          vec2 axis=b-a;
          float t=clamp(dot(ray-a,axis)/max(dot(axis,axis),.00001),0.,1.);
          float depth=1./mix(1./lampCutBottom.z,1./lampCutTop.z,t);
          float gap=length(ray-mix(a,b,t))*depth;
          float cut=(1.-smoothstep(.39,.64,gap))*smoothstep(.0,.25,depth-vViewPosition.z);
          float pattern=fract(dot(floor(gl_FragCoord.xy),vec2(.75487767,.5698403)));
          if(cut > 0. && pattern < cut) discard;
        }
      `);
    };
    variants.set(source,material);return material;
  }
  function apply(root:T.Object3D){
    const wrap=(material:T.Material)=>material instanceof T.MeshStandardMaterial?shade(material):material;
    root.traverse(o=>{
      if(o instanceof T.Mesh)o.material=Array.isArray(o.material)?o.material.map(wrap):wrap(o.material);
    });
  }
  function build(parent:T.Object3D,draw:(root:T.Group)=>T.MeshStandardMaterial){
    const root=new T.Group();parent.add(root);
    const glass=draw(root);
    apply(root);
    return shade(glass);
  }
  function update(camera:T.Camera,feet?:T.Vector3){
    enabled.value=feet?1:0;
    if(!feet)return;
    bottom.value.copy(feet);bottom.value.y+=.18;
    top.value.copy(feet);top.value.y+=1.84;
    // vViewPosition points back towards the eye.
    bottom.value.applyMatrix4(camera.matrixWorldInverse).negate();
    top.value.applyMatrix4(camera.matrixWorldInverse).negate();
    if(Math.min(bottom.value.z,top.value.z)<.15)enabled.value=0;
  }
  return {build,apply,update};
}
