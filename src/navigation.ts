import {Vector3} from 'three';

type Passable=(x:number,z:number)=>boolean;
const spacing=.34;
const slideAngles=[-Math.PI/3,Math.PI/3];

/** Find nearby free space only when a character is already in a collision. */
export function freeFooting(x:number,z:number,allowed:Passable){
  if(allowed(x,z))return null;
  for(let radius=.08;radius<=.84;radius+=.08){
    for(let direction=0;direction<16;direction++){
      const angle=direction*Math.PI/8;
      const nextX=x+radius*Math.cos(angle),nextZ=z+radius*Math.sin(angle);
      if(allowed(nextX,nextZ))return new Vector3(nextX,0,nextZ);
    }
  }
  return null;
}

/** Try the requested step first, then slide along the strongest free axis. */
export function walkStep(position:Vector3,dx:number,dz:number,allowed:Passable){
  if(allowed(position.x+dx,position.z+dz)){
    position.x+=dx;position.z+=dz;
    return;
  }
  const xFree=dx!==0&&allowed(position.x+dx,position.z);
  const zFree=dz!==0&&allowed(position.x,position.z+dz);
  if(xFree||zFree){
    if(xFree&&(!zFree||Math.abs(dx)>=Math.abs(dz)))position.x+=dx;
    else position.z+=dz;
    return;
  }
  const distance=Math.hypot(dx,dz);
  const heading=Math.atan2(dz,dx);
  for(const offset of slideAngles){
    const reduced=distance*.45;
    const x=position.x+Math.cos(heading+offset)*reduced,z=position.z+Math.sin(heading+offset)*reduced;
    if(allowed(x,z)){position.x=x;position.z=z;return;}
  }
}

export function route(from:Vector3,to:Vector3,allowed:Passable):Vector3[]{
  function clear(a:Vector3,b:Vector3){
    const steps=Math.ceil(Math.hypot(a.x-b.x,a.z-b.z)/.022);
    for(let i=1;i<=steps;i++){
      const t=i/steps;
      if(!allowed(a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t))return false;
    }
    return true;
  }
  if(allowed(to.x,to.z)&&clear(from,to))return [to.clone()];
  // The grid follows the same collision function as walking. Dijkstra's edge
  // cost and the A* heuristic are measured in grid cells.
  const cell=(x:number,z:number)=>new Vector3(x*spacing,0,z*spacing);
  function accessible(point:Vector3,withLine:boolean){
    let chosen:Vector3|undefined,best=Infinity;
    for(let dz=-5;dz<=5;dz++)for(let dx=-5;dx<=5;dx++){
      const x=Math.round(point.x/spacing)+dx,z=Math.round(point.z/spacing)+dz;
      const c=cell(x,z);
      const score=Math.hypot(c.x-point.x,c.z-point.z);
      if(score<best&&allowed(c.x,c.z)&&(!withLine||clear(point,c))){best=score;chosen=c;}
    }
    return chosen;
  }
  const origin=accessible(from,true),destination=accessible(to,false);
  if(!origin||!destination)return [];
  const sx=Math.round(origin.x/spacing),sz=Math.round(origin.z/spacing);
  const tx=Math.round(destination.x/spacing),tz=Math.round(destination.z/spacing);
  const key=(x:number,z:number)=>x+','+z;
  type Node={x:number;z:number;cost:number;rank:number;previous?:Node};
  const start:Node={x:sx,z:sz,cost:0,rank:0};
  const open=[start], seen=new Map([[key(sx,sz),0]]);
  while(open.length){
    open.sort((a,b)=>b.rank-a.rank);
    const n=open.pop()!;
    if(n.cost!==seen.get(key(n.x,n.z)))continue;
    if(n.x===tx&&n.z===tz){
      const points:Vector3[]=[];
      for(let cur:Node|undefined=n;cur;cur=cur.previous)points.unshift(cell(cur.x,cur.z));
      if(allowed(to.x,to.z)&&clear(destination,to))points.push(to.clone());
      const path:Vector3[]=[];
      let at=from;
      for(let i=0;i<points.length;i++){
        let next=i;
        while(next+1<points.length&&clear(at,points[next+1]))next++;
        path.push(points[next]);at=points[next];i=next;
      }
      return path;
    }
    for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
      const x=n.x+dx,z=n.z+dz, k=key(x,z),cost=n.cost+Math.hypot(dx,dz);
      if(cost>=(seen.get(k)??Infinity)||!clear(cell(n.x,n.z),cell(x,z)))continue;
      seen.set(k,cost);
      open.push({x,z,cost,rank:cost+Math.hypot(tx-x,tz-z),previous:n});
    }
  }
  return [];
}
