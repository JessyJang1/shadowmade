import * as T from 'three';

type Surface = 'carved-wood' | 'aged-paint' | 'plaster' | 'wool' | 'snow' | 'stone' | 'frosted-glass' | 'roof-slate' | 'valley-slate' | 'bridge-stone';
type Maps = Pick<T.MeshStandardMaterialParameters,'map'|'normalMap'|'roughnessMap'|'aoMap'>;
const maps = new Map<Surface, Maps>();
const loader = new T.TextureLoader();

function load(surface:Surface, name:string) {
  const file = surface === 'snow' && name === 'normal' ? 'snow-02-normal.webp' : name + (surface === 'valley-slate' ? '.webp' : '.png');
  const texture = loader.load(import.meta.env.BASE_URL + 'materials/' + surface + '/' + file);
  texture.colorSpace = name === 'base-color' ? T.SRGBColorSpace : T.NoColorSpace;
  texture.wrapS = texture.wrapT = T.RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
}

export function storybookPBR(surface:Surface, color:T.ColorRepresentation, repeats=1) {
  let textures = maps.get(surface);
  if (!textures) {
    textures = {map:load(surface,'base-color'), normalMap:load(surface,'normal'),
      roughnessMap:load(surface,'roughness'), aoMap:load(surface,'ao')};
    maps.set(surface,textures);
  }
  if (repeats !== 1) {
    const tiled = {...textures};
    for (const key of ['map','normalMap','roughnessMap','aoMap'] as const) {
      const texture = textures[key]!.clone();
      texture.repeat.setScalar(repeats);
      tiled[key] = texture;
    }
    textures = tiled;
  }
  return new T.MeshStandardMaterial({
    ...textures, color, roughness:1, metalness:0,
    normalScale:new T.Vector2(.34,.34), aoMapIntensity:.36,
  });
}
