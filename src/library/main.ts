import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {catalog,type Asset} from './catalog';
import modelThumbnailIds from './model-thumbnails.json' with {type:'json'};
import {gameName} from '../storyIdentity';
import './style.css';

const base=import.meta.env.BASE_URL;
const pictures=base+'asset-library/';
const modelThumbnails=new Set(modelThumbnailIds);
const params=new URLSearchParams(location.search);
const requested=catalog.find(asset=>asset.id===params.get('asset'));
const isAholo=(asset:Asset)=>Boolean(asset.task||asset.relatedTasks?.length);
const firstAholo=catalog.find(asset=>asset.id==='aholo-workshop-carpenter')??catalog.find(isAholo);
const root=document.createElement('main');
root.className='asset-interface';
document.body.append(root);
root.innerHTML=`
<header class="mast"><a class="brand" href="${base}"><img src="${base}identity/night-moth.svg" width="28" height="28" alt=""> <strong>${gameName.zh}</strong></a><a class="back" href="${base}report/">作品报告</a></header>
<section class="intro"><div><h1>内容资产库</h1><p>查看游戏里的模型、实拍和制作来源。Aholo Lux3D 作品附有任务记录。</p></div></section>
<section class="feature" aria-label="当前资产">
  <div class="viewport">
    <div id="preview" aria-label="模型预览"></div>
    <div id="views" class="views"><button id="model-view">3D 模型</button><button id="game-view">游戏实拍</button></div>
    <button id="reset" class="reset" hidden>重置视角</button>
    <p id="hint" class="preview-hint" role="status"></p>
  </div>
  <div class="detail"><div id="status" class="tag"></div><h2 id="name"></h2><p id="description"></p>
    <dl><dt>游戏位置</dt><dd id="location"></dd><dt>资产类别</dt><dd id="kind"></dd><dt>制作来源</dt><dd id="source"></dd></dl>
    <a id="download" class="download" download>下载 GLB</a>
  </div>
</section>
<section class="library" aria-labelledby="library-title">
  <div class="section-head"><h2 id="library-title">浏览资产</h2><label><span class="sr">搜索资产</span><input id="search" type="search" placeholder="搜索名称、位置或任务号"></label></div>
  <div class="filters" id="filters" aria-label="筛选资产">
    <button data-filter="aholo">Aholo Lux3D</button><button data-filter="new">本轮新增</button><button data-filter="existing">已有模型</button><button data-filter="scene">场景构件</button><button data-filter="all">全部</button>
  </div>
  <div id="grid" class="grid"></div><p id="empty" hidden>没有找到匹配的资产。</p>
</section>
<footer>${gameName.en} <span>·</span> 模型预览使用独立照明。切换「游戏实拍」查看场景效果。</footer>`;

const element=<E extends HTMLElement>(id:string)=>root.querySelector<E>('#'+id)!;
const preview=element('preview'),hint=element('hint'),reset=element<HTMLButtonElement>('reset');
const modelView=element<HTMLButtonElement>('model-view'),gameView=element<HTMLButtonElement>('game-view');
const search=element<HTMLInputElement>('search'),download=element<HTMLAnchorElement>('download');
const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const scene=new T.Scene();
const camera=new T.PerspectiveCamera(34,1,.01,100);
const key=new T.DirectionalLight('#ffe2c2',2.5);key.position.set(-3,5,4);
const rim=new T.DirectionalLight('#9eafff',1.35);rim.position.set(3,3,-4);
scene.add(key,rim,new T.HemisphereLight('#d3d9ff','#6b423b',2.1));
let renderer:T.WebGLRenderer|undefined,controls:OrbitControls|undefined,current:T.Group|undefined;
let filter=params.get('source')==='aholo'?'aholo':requested?'all':'new';
let selection=requested??firstAholo??catalog[0];
let mode:'model'|'game'='model',revision=0;
const materials=new Set<T.Material>();
const textures=new Set<T.Texture>();
function dispose(asset:T.Object3D){
  materials.clear();textures.clear();
  asset.traverse(obj=>{
    if(!(obj instanceof T.Mesh))return;
    obj.geometry.dispose();
    for(const mat of Array.isArray(obj.material)?obj.material:[obj.material]){
      materials.add(mat);
      for(const value of Object.values(mat))if(value instanceof T.Texture)textures.add(value);
    }
    if(obj instanceof T.SkinnedMesh)obj.skeleton.dispose();
  });
  materials.forEach(mat=>mat.dispose());textures.forEach(texture=>texture.dispose());
}
function render(){if(mode==='model'&&current&&renderer)renderer.render(scene,camera);}
function frame(){
  camera.position.set(3.25,1.7,4.85);
  controls?.target.set(0,0,0);controls?.update();
  render();
}
function ensureRenderer(){
  if(renderer)return renderer;
  renderer=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
  renderer.outputColorSpace=T.SRGBColorSpace;
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
  renderer.domElement.setAttribute('aria-label','三维模型。拖动旋转，滚轮缩放');
  controls=new OrbitControls(camera,renderer.domElement);
  controls.enablePan=false;controls.minDistance=2.45;controls.maxDistance=11;
  controls.addEventListener('change',render);
  return renderer;
}
new ResizeObserver(()=>{
  if(!renderer||!preview.clientHeight)return;
  camera.aspect=preview.clientWidth/preview.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(preview.clientWidth,preview.clientHeight,false);
  render();
}).observe(preview);
function image(file:string,alt:string){
  const img=document.createElement('img');img.src=pictures+file;img.alt=alt;return img;
}
function modelThumbnail(asset:Asset){
  return asset.image??(modelThumbnails.has(asset.id)?'thumbnails/'+asset.id+'.jpg':undefined);
}
async function show(next:typeof mode){
  const asset=selection,version=++revision;
  mode=next;
  modelView.setAttribute('aria-pressed',String(mode==='model'));
  gameView.setAttribute('aria-pressed',String(mode==='game'));
  reset.hidden=true;
  if(current){scene.remove(current);dispose(current);current=undefined;}
  preview.replaceChildren();
  if(mode==='game'){
    if(asset.scene)preview.append(image(asset.scene,asset.name+'的游戏实拍'));
    hint.textContent=asset.scene?'游戏内实拍':'该模型暂无单独的游戏实拍。';
    return;
  }
  hint.textContent='正在载入 3D 模型…';
  const still=modelThumbnail(asset);
  if(still)preview.append(image(still,asset.name+'的模型预览'));
  try{
    const display=ensureRenderer();
    const {scene:assetScene}=await loader.loadAsync(base+'models/'+asset.file);
    if(version!==revision){dispose(assetScene);return;}
    const bounds=new T.Box3().setFromObject(assetScene),size=bounds.getSize(new T.Vector3());
    const center=bounds.getCenter(new T.Vector3()),scale=2.65/Math.max(size.x,size.y,size.z);
    const centered=new T.Group();centered.position.copy(center).multiplyScalar(-1);centered.add(assetScene);
    current=new T.Group();current.add(centered);current.scale.setScalar(scale);scene.add(current);
    preview.replaceChildren(display.domElement);
    camera.aspect=preview.clientWidth/preview.clientHeight;
    camera.updateProjectionMatrix();
    display.setSize(preview.clientWidth,preview.clientHeight,false);
    frame();reset.hidden=false;
    hint.textContent='拖动旋转 · 滚轮或双指缩放';
  }catch(error){
    if(version!==revision)return;
    console.warn('Asset preview',error);
    hint.textContent='3D 预览未能载入。可查看实拍或下载 GLB。';
  }
}
function select(asset:Asset,preferGame=false){
  selection=asset;
  const taskIds=asset.task?[asset.task]:asset.relatedTasks;
  const values={name:asset.name,status:(asset.batch==='new'?'本轮新增 · ':'')+asset.status,location:asset.location,
    kind:asset.kind,source:taskIds?'Aholo Lux3D · 任务 '+taskIds.join('、'):asset.file?'项目资产':'游戏场景',
    description:asset.description??''};
  for(const [id,value] of Object.entries(values))element(id).textContent=value;
  modelView.hidden=!asset.file;gameView.hidden=!asset.scene;
  download.hidden=!asset.file;
  if(asset.file){download.href=base+'models/'+asset.file;download.download=asset.file;}
  void show(asset.file&&(!preferGame||!asset.scene)?'model':'game');
  drawGrid();
}
function drawGrid(){
  root.querySelectorAll<HTMLButtonElement>('[data-filter]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.filter===filter)));
  const query=search.value.toLowerCase().trim();
  const filtered=catalog.filter(asset=>(filter==='aholo'?isAholo(asset):filter==='all'||(query&&filter==='new')||asset.batch===filter)&&
    [asset.name,asset.kind,asset.location,asset.file,asset.task,asset.relatedTasks].join(' ').toLowerCase().includes(query));
  element('empty').hidden=filtered.length>0;
  const grid=element('grid');grid.replaceChildren(...filtered.map(asset=>{
    const card=document.createElement('button');card.className='card';card.dataset.assetId=asset.id;card.setAttribute('aria-pressed',String(asset===selection));
    const art=document.createElement('div');art.className='card-media';
    const still=modelThumbnail(asset)??asset.scene;
    if(still){const img=image(still,'');img.loading='lazy';art.append(img);}
    else{art.textContent=asset.file?'3D':'场景';art.classList.add('card-placeholder');}
    const text=document.createElement('div');text.className='card-label';
    const name=document.createElement('strong');name.textContent=asset.name;
    const meta=document.createElement('span');meta.textContent=isAholo(asset)?'Aholo Lux3D · '+asset.status:asset.kind+' · '+asset.status;
    text.append(name,meta);card.append(art,text);
    card.addEventListener('click',()=>{
      select(asset);
      root.querySelector('.feature')?.scrollIntoView({block:'nearest'});
    });
    return card;
  }));
}
element('filters').addEventListener('click',event=>{
  const button=(event.target as HTMLElement).closest('button');
  if(button?.dataset.filter){filter=button.dataset.filter;drawGrid();}
});
search.addEventListener('input',drawGrid);
reset.onclick=frame;modelView.onclick=()=>void show('model');gameView.onclick=()=>void show('game');
select(selection,Boolean(requested)||filter==='aholo');
