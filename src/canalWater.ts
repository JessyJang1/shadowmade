import * as T from 'three';
import {riversideGlassHeight} from './riversideFittings';

export const canalWaterLevel=-1.16;
export const canalLanterns=[
  {x:6.87,z:4.9,scale:.89},
  {x:13.48,z:5.3,scale:.89},
  {x:4.10,z:-11.84,scale:.77},
  {x:12.20,z:-11.42,scale:.80},
] as const;

export function canalSurface(ground:(x:number,z:number)=>number){
  const lights=canalLanterns.map(({x,z,scale})=>new T.Vector3(x,ground(x,z)+riversideGlassHeight*scale,z));
  return new T.ShaderMaterial({
    name:'Canal · disturbed lantern reflections',
    uniforms:{time:{value:0},lanterns:{value:lights}},
    side:T.DoubleSide,
    clipping:true,
    vertexShader:`
      #include <clipping_planes_pars_vertex>
      varying vec3 onCanal;
      void main(){
        onCanal=(modelMatrix*vec4(position,1.)).xyz;
        vec4 mvPosition=modelViewMatrix*vec4(position,1.);
        gl_Position=projectionMatrix*mvPosition;
        #include <clipping_planes_vertex>
      }`,
    fragmentShader:`
      #include <clipping_planes_pars_fragment>
      uniform float time;
      uniform vec3 lanterns[${lights.length}];
      varying vec3 onCanal;

      void main(){
        #include <clipping_planes_fragment>
        vec2 q=onCanal.xz;
        float broad=sin(q.y*9.3+q.x*1.7-time*1.42+sin(q.x*2.6-q.y*.42)*.55);
        float running=sin(q.x*10.8+q.y*18.2-time*2.67+sin(q.y*2.8+q.x)*.65);
        float crossWave=sin(q.x*20.3-q.y*31.4+time*2.22);
        vec3 eye=normalize(cameraPosition-onCanal);
        vec3 normal=normalize(vec3(broad*.031+crossWave*.016,1.,running*.057+broad*.019));
        vec3 bounce=reflect(-eye,normal);
        float grazing=pow(1.-max(0.,eye.y),2.0);
        float mid=9.65+sin(q.y*.19)*1.37+.082*q.y;
        float edge=smoothstep(1.10,1.96,abs(q.x-mid)+broad*.035);
        vec3 deep=mix(vec3(.014,.032,.057),vec3(.050,.095,.15),grazing);
        deep=mix(deep,vec3(.025,.050,.063),edge*.60);
        float thread=smoothstep(.70,1.,broad*.40+running*.60);
        deep+=vec3(.024,.035,.054)*thread*(.36+grazing*.28)*(.58+.42*crossWave);
        deep*=mix(.72,1.,smoothstep(.40,1.49,abs(q.y-4.)));
        float lamps=0.;
        for(int i=0;i<${lights.length};++i){
          vec3 delta=lanterns[i]-onCanal;
          if(abs(delta.z)<10.){
            float squared=dot(delta,delta);
            float miss=max(0.,1.-dot(bounce,delta*inversesqrt(squared)));
            float plates=smoothstep(-.37,.77,running*.72+crossWave*.28);
            float glare=exp2(-152.*miss)*(.32+.68*plates);
            float bloom=exp2(-39.*miss)*(.34+.28*broad);
            lamps+=(glare*.90+bloom*.44)/(1.+.045*squared);
          }
        }
        vec3 color=deep+vec3(1.17,.55,.15)*lamps;
        float distanceToEye=length(cameraPosition-onCanal);
        color=mix(color,vec3(.076,.103,.161),1.-exp(-.00024*distanceToEye*distanceToEye));
        gl_FragColor=vec4(color,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
}
