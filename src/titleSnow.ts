import * as T from 'three';
import {rand} from './paint';

export function createTitleSnow(scene:T.Scene){
  const random=rand(150931);
  const positions:number[]=[],traits:number[]=[];
  const layers=[
    {count:48,near:1.8,far:4.1,size:18,speed:.34,softness:1},
    {count:145,near:4.1,far:12,size:8,speed:.19,softness:.43},
    {count:182,near:12,far:37,size:3.5,speed:.10,softness:.14},
  ];
  for(const {count,near,far,size,speed,softness} of layers){
    for(let i=0;i<count;i++){
      positions.push(random(),random(),near+(far-near)*random());
      traits.push(size*(.49+random()*.51),speed*(.73+random()*.54),random()*6.283,softness);
    }
  }
  const geo=new T.BufferGeometry();
  geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));
  geo.setAttribute('flake',new T.Float32BufferAttribute(traits,4));
  const uniforms={
    elapsed:{value:0}, strength:{value:0}, pixelRatio:{value:1}, aperture:{value:new T.Vector2()},
  };
  const material=new T.ShaderMaterial({
    uniforms,transparent:true,depthWrite:false,
    vertexShader:`
      uniform float elapsed, strength, pixelRatio;
      uniform vec2 aperture;
      attribute vec4 flake;
      varying float opacity, softness, ember;
      void main(){
        float fall = elapsed * flake.y;
        float gust = sin(elapsed * .72 + flake.z) * .034
                   + sin(elapsed * .28 + flake.z * .54) * .033;
        vec2 cycle = fract(position.xy + vec2(-fall * .31 + gust, -fall));
        vec2 plane = (cycle * 2.0 - 1.0) * 1.30;
        vec4 eye = modelViewMatrix * vec4(plane * aperture * position.z, -position.z, 1);
        gl_Position = projectionMatrix * eye;
        gl_PointSize = clamp(flake.x * position.z / max(-eye.z, .7), 1.45, 22.) * pixelRatio;
        float edge = smoothstep(0., .075, cycle.y) * (1. - smoothstep(.92, 1., cycle.y));
        opacity = edge * strength * (.72 + .22 * sin(flake.z + elapsed * .68));
        softness = flake.w;
        ember = exp(-9. * dot(plane - vec2(.12,-.54), plane - vec2(.12,-.54))) * .42;
      }`,
    fragmentShader:`
      varying float opacity, softness, ember;
      void main(){
        vec2 fleck = (gl_PointCoord - .5) * 2.;
        fleck.x *= 1.12;
        float radius = length(fleck);
        float center = exp(-radius * radius * mix(7., 4., softness));
        float skirt = 1. - smoothstep(mix(.53,.22,softness),.98,radius);
        vec3 color = mix(vec3(.82,.91,1.), vec3(1.,.87,.65),ember);
        gl_FragColor = vec4(color,(center*.68 + skirt*.32) * opacity);
      }`,
    toneMapped:false,
  });
  const snow=new T.Points(geo,material);
  snow.name='Title scene snow';
  snow.frustumCulled=false;
  snow.visible=false;
  snow.matrixAutoUpdate=false;
  snow.renderOrder=5;
  scene.add(snow);
  return {
    frame(camera:T.PerspectiveCamera,scale:number){
      camera.updateMatrixWorld();
      snow.matrix.copy(camera.matrixWorld);
      snow.matrixWorldNeedsUpdate=true;
      const height=Math.tan(T.MathUtils.degToRad(camera.fov*.5));
      uniforms.aperture.value.set(height*camera.aspect,height);
      uniforms.pixelRatio.value=scale;
    },
    show(amount:number,time:number){
      snow.visible=amount>.001;
      uniforms.strength.value=amount;
      uniforms.elapsed.value=time;
    },
  };
}
