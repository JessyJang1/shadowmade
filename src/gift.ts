import type {PerspectiveCamera,Scene,WebGLRenderer} from 'three';
import {gameName} from './storyIdentity';
type Card={name:string;wish:string;view:number;warm:boolean};
const defaults:Card={name:'',wish:'愿回家的路，一直有灯。',view:2,warm:true};
const key='wishlight-last-frame';
export function createGift(panel:HTMLElement,changed:(card:Card)=>void){
  let card:Card={...defaults};
  try{
    const data=JSON.parse(localStorage.getItem(key)??'null');
    if(data){
      card.name=typeof data.name==='string'?data.name.slice(0,26):'';
      card.wish=typeof data.wish==='string'?data.wish.slice(0,112):defaults.wish;
      card.view=[0,1,2].includes(data.view)?data.view:0;
      card.warm=data.warm!==false;
    }
  }catch{/* editor works with storage disabled */}
  function update(changeScene=true){
    const name=panel.querySelector<HTMLInputElement>('#giftName')!;
    const wish=panel.querySelector<HTMLTextAreaElement>('#giftWish')!;
    card.name=name.value;card.wish=wish.value;
    const preview=document.getElementById('giftCaption')!;
    preview.textContent=`致 ${card.name.trim()||'远方的朋友'}　·　${card.wish.trim()||defaults.wish}`;
    panel.querySelectorAll<HTMLButtonElement>('[data-frame],[data-mood]').forEach(button=>{
      const selected=button.dataset.frame!==undefined?Number(button.dataset.frame)===card.view:(button.dataset.mood==='warm')===card.warm;
      button.setAttribute('aria-pressed',String(selected));
    });
    try{localStorage.setItem(key,JSON.stringify(card));}catch{/* optional save */}
    if(changeScene)changed(card);
  }
  function begin(){
    panel.innerHTML=`<header><p class="gift-postmark">北岸灯塔 · 归航纪念</p><h2>寄一张雪镇贺卡</h2></header>
      <div class="gift-fields">
      <fieldset><legend>取景</legend><div class="gift-choices"><button data-frame="0">雪镇全景</button><button data-frame="1">长街灯火</button><button data-frame="2">北岸灯塔</button></div></fieldset>
      <fieldset><legend>灯色</legend><div class="gift-choices"><button data-mood="warm">壁炉暖光</button><button data-mood="blue">靛蓝雪夜</button></div></fieldset>
      <label>收件人<input id="giftName" maxlength="26" placeholder="远方的朋友"></label>
      <label>祝福语<textarea id="giftWish" maxlength="112" rows="2"></textarea></label>
      </div><footer><p id="giftStatus" role="status"></p>
      <div class="gift-choices"><button id="giftSave">保存贺卡 PNG</button><button id="giftExit">回到雪镇</button></div></footer>`;
    panel.querySelector<HTMLInputElement>('#giftName')!.value=card.name;
    panel.querySelector<HTMLTextAreaElement>('#giftWish')!.value=card.wish;
    panel.querySelectorAll<HTMLInputElement|HTMLTextAreaElement>('#giftName,#giftWish').forEach(field=>field.oninput=()=>update(false));
    panel.querySelectorAll<HTMLButtonElement>('[data-frame]').forEach(button=>button.onclick=()=>{card.view=Number(button.dataset.frame);update();});
    panel.querySelectorAll<HTMLButtonElement>('[data-mood]').forEach(button=>button.onclick=()=>{card.warm=button.dataset.mood==='warm';update();});
    update();
  }
  function capture(renderer:WebGLRenderer,scene:Scene,camera:PerspectiveCamera,restore:()=>void){
    const width=1920,height=1200;
    const message=panel.querySelector('#giftStatus')!;
    const save=panel.querySelector<HTMLButtonElement>('#giftSave')!;
    if(save.disabled)return;
    save.disabled=true;
    const layer=document.createElement('canvas');layer.width=width;layer.height=height;
    const ctx=layer.getContext('2d');
    if(!ctx){message.textContent='浏览器无法生成贺卡画布。';save.disabled=false;return;}
    try{
      camera.aspect=width/height;camera.updateProjectionMatrix();
      renderer.setPixelRatio(1);renderer.setSize(width,height,false);renderer.render(scene,camera);
      ctx.drawImage(renderer.domElement,0,0,width,height);
    }catch{
      message.textContent='导出失败，请重试。';save.disabled=false;return;
    }finally{restore();}
    const gradient=ctx.createLinearGradient(0,height*.59,0,height);
    gradient.addColorStop(0,'#22183300');gradient.addColorStop(1,'#231427ec');
    ctx.fillStyle=gradient;ctx.fillRect(0,height*.58,width,height*.42);
    ctx.strokeStyle='#f3d59ea8';ctx.lineWidth=3;ctx.strokeRect(40,40,width-80,height-80);
    ctx.textAlign='center';
    ctx.fillStyle='#ffecbd';ctx.font='38px "Shadowmade Sans","PingFang SC",sans-serif';
    ctx.letterSpacing='7px';ctx.fillText(gameName.en,width/2,109);ctx.letterSpacing='0px';
    ctx.font='600 62px "Shadowmade Sans","PingFang SC",sans-serif';
    ctx.fillText('致 '+(card.name.trim()||'远方的朋友'),width/2,865,1580);
    ctx.font='39px "Shadowmade Sans","PingFang SC",sans-serif';ctx.fillStyle='#ffefdc';
    const text=Array.from(card.wish.trim()||defaults.wish);
    for(let i=0;i<text.length;i+=33)ctx.fillText(text.slice(i,i+33).join(''),width/2,939+Math.floor(i/33)*48,1600);
    layer.toBlob(blob=>{
      save.disabled=false;
      if(!blob){message.textContent='导出失败，请重试。';return;}
      const url=URL.createObjectURL(blob);
      const a=document.createElement('a');a.href=url;a.download=`${gameName.zh}-雪镇贺卡.png`;a.click();
      setTimeout(()=>URL.revokeObjectURL(url),9000);
      message.textContent='已导出 1920 × 1200 PNG。';
    },'image/png');
  }
  return {begin,capture};
}
