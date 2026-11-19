import * as T from 'three';
import {painted} from './paint';

// The solid gallery floor occludes the lantern for the masonry below it.
// Only mask this lamp on the stone shell; moonlight, street lights and shore keep their lighting.
function shieldMasonry(material:T.MeshStandardMaterial,lamp:T.Vector3){
  const sample='getPointLightInfo( pointLight, geometryPosition, directLight );';
  const lights=T.ShaderChunk.lights_fragment_begin.replace(sample,sample+
    '\n if(distance(pointLight.position,(viewMatrix*vec4(beaconCentre,1.)).xyz)<.02) directLight.color*=.08;');
  material.onBeforeCompile=shader=>{
    shader.uniforms.beaconCentre={value:lamp};
    shader.fragmentShader='uniform vec3 beaconCentre;\n'+shader.fragmentShader
      .replace('#include <lights_fragment_begin>',lights);
  };
}
export function dressBeacon(original:T.Object3D,joinery:T.Object3D,lamp:T.Vector3){
  original.traverse(node=>{
    if(!(node instanceof T.Mesh))return;
    const material=node.material as T.MeshStandardMaterial;
    if(material.name==='Worn copper trim')node.visible=false;
    if(material.name.includes('limestone'))shieldMasonry(material,lamp);
    if(material.name==='Wind packed snow'){
      material.map=painted('snow');material.color.set('#d9dce1');
    }
  });
  joinery.traverse(node=>{
    if(!(node instanceof T.Mesh))return;
    const material=node.material as T.MeshStandardMaterial;
    if(material.name.startsWith('Hewn stone')||material.name==='Buff ledge'){
      material.map=painted('stone');
      shieldMasonry(material,lamp);
    }
  });
  original.add(joinery);
}
