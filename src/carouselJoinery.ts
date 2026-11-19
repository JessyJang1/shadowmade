import * as T from 'three';
import {beam,cylinder,group,mat,mesh,shapeMesh,starPoints,v,type Parent} from './paint';

// The radial joints follow the moving turntable, while the stepped foundation stays still.
export function carouselJoinery(parent:Parent,legacyCanopy:Parent){
  const oak=mat('#a7744d','wood'),ash=mat('#ceb38a','wood'),walnut=mat('#51383a','wood');
  const brass=mat('#c8a369'),lacquer=mat('#713f42','wood');
  const tau=Math.PI*2;
  const pivot=(r:number,y:number,a:number)=>v(r*Math.cos(a),y,r*Math.sin(a));
  function band(inner:number,outer:number,y:number,angle:number,width:number,surface:T.Material){
    const g=new T.RingGeometry(inner,outer,8,1,-angle-width,width);
    g.rotateX(-Math.PI/2);
    mesh(parent,g,surface,0,y,0);
  }
  cylinder(parent,walnut,0,.53,0,3.32,3.37,.22,80);
  cylinder(parent,brass,0,.622,0,3.335,3.335,.026,80);
  cylinder(parent,brass,0,.452,0,3.372,3.372,.022,80);
  for(let i=0;i<32;i++){
    const a=i*tau/32,w=tau/32;
    band(.72,3.31,.646,a+.002,w-.004,i%3?oak:ash);
    band(2.81,2.845,.649,a,w,walnut);
    band(3.13,3.165,.649,a,w,ash);
    const mid=a+w/2;
    const panel=group(parent,3.34*Math.cos(mid),.537,3.34*Math.sin(mid));
    panel.rotation.y=Math.PI/2-mid;
    const lozenge=new T.Shape();
    lozenge.moveTo(-.17,0);lozenge.lineTo(0,.049);lozenge.lineTo(.17,0);lozenge.lineTo(0,-.049);lozenge.closePath();
    mesh(panel,new T.ShapeGeometry(lozenge),i%2?brass:lacquer);
  }
  for(let i=0;i<12;i++){
    const a=i*tau/12;
    const surface=i%2?lacquer:walnut;
    if(i%2===0){
      const crest=group(legacyCanopy,3.39*Math.cos(a),3.83,3.39*Math.sin(a));
      crest.rotation.y=Math.PI/2-a;
      const outline=[[-.47,-.015],[-.31,.075],[-.19,.09],[-.11,.21],[0,.30],[.11,.21],[.19,.09],[.31,.075],[.47,-.015],[.22,-.055],[0,-.18],[-.22,-.055]];
      shapeMesh(crest,outline.map(([x,y])=>new T.Vector2(x,y)),brass,.025,0,0,0,.011);
      shapeMesh(crest,outline.map(([x,y])=>new T.Vector2(x*.85,y*.81)),lacquer,.018,0,0,.031,.007);
      shapeMesh(crest,starPoints(.103,.37),ash,.011,0,.041,.057,.003);
    }
    beam(parent,surface,pivot(.70,3.44,a),pivot(3.14,3.43,a),.085,.12);
    if(i%2)continue;
    const column=group(parent,2.97*Math.cos(a),0,2.97*Math.sin(a));
    for(const [y,lo,hi,h] of [[.75,.115,.091,.22],[.88,.098,.077,.05],[3.04,.065,.112,.16],[3.19,.126,.126,.065]]){
      cylinder(column,brass,0,y,0,hi,lo,h,12);
    }
    // Paired bentwood brackets span away from the column in the eave plane.
    for(const side of [-1,1]){
      const curve=new T.CatmullRomCurve3([pivot(2.97,2.92,a),pivot(2.97,3.18,a+side*.035),pivot(2.99,3.36,a+side*.12),pivot(3.02,3.42,a+side*.19)]);
      mesh(parent,new T.TubeGeometry(curve,10,.045,6,false),surface);
    }
  }
}
