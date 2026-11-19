import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {assessDawn,assessSpan,dawnFill,dawnLight,dawnPieces,dawnProfiles,spanHeightLimit,spanLight,spanPieces,spanPlankVertices} from '../src/laterOptics.ts';
import type {Vec} from '../src/optics.ts';
import sourceShutter from '../src/data/aholo-dawn-shutter.json' with {type:'json'};
const bridge=(a:number,b:number,westZ=0,eastZ=0)=>spanPieces.map(({y},i)=>{
  const vertices=spanPlankVertices(i);
  const world:Vec[]=[];
  for(let j=0;j<vertices.length;j+=3){
    world.push([(i?b:a)+vertices[j],y+vertices[j+1],(i?eastZ:westZ)+vertices[j+2]]);
  }
  return world;
});
test('staggered landings need two complete shadow lanes and a safe lamp height',()=>{
  const solved=bridge(-1.12,.99,-.51,.45) as [Vec[],Vec[]];
  assert.equal(assessSpan(...solved,[0,7.1,0]).matched,true);
  assert.equal(assessSpan(...solved,spanLight).matched,false);
  const tooHigh=assessSpan(...bridge(-1.22,1.12,-.56,.51) as [Vec[],Vec[]],spanLight);
  assert.ok(tooHigh.connections.every(c=>c.short), 'Both centered shadows fall short at maximum height');
  const low=assessSpan(...bridge(-1.03,.85,-.47,.39) as [Vec[],Vec[]],[0,spanHeightLimit[0],0]);
  assert.equal(low.matched,false);
  assert.ok(low.ice.some(Boolean),'Oversized shadows reach the warning ice');
  assert.equal(assessSpan(...bridge(-1.0,.91) as [Vec[],Vec[]],[0,7.1,0]).matched,false);
  assert.equal(assessSpan(...bridge(-1.52,.99,-.51,.45) as [Vec[],Vec[]],[0,7.1,0]).matched,false);
});
test('the sea face needs the correct shadow with the opposite beam physically covered',()=>{
  const geometries=dawnProfiles.map(points=>new T.ExtrudeGeometry(
    new T.Shape(points.map(([x,y])=>new T.Vector2(x,y))),
    {depth:.13,bevelEnabled:true,bevelThickness:.027,bevelSize:.027,bevelSegments:1,curveSegments:10},
  ));
  const casters=geometries.map(({attributes:{position}},i)=>Array.from({length:position.count},(_,j):Vec=>[
    dawnPieces[i].x+position.getX(j),dawnPieces[i].y+position.getY(j),dawnPieces[i].z+position.getZ(j),
  ]));
  function shutter(x:number):Vec[]{
    const {index,position}=sourceShutter;
    return index.map((i):Vec=>[x+position[i*3],3.41+position[i*3+1],5.3+position[i*3+2]]);
  }
  const closed=shutter(0),open=shutter(-1.55);
  assert.ok(assessDawn(casters,dawnLight,dawnFill,closed).matched);
  assert.ok(!assessDawn(casters,dawnLight,dawnFill,[]).matched);
  const bothBeams=assessDawn(casters,dawnLight,dawnFill,open);
  assert.ok(!bothBeams.matched&&bothBeams.washout>.8);
  assert.ok(!assessDawn(casters,[-.95,dawnLight[1],dawnLight[2]],dawnFill,closed).matched);
  assert.ok(!assessDawn([casters[0]],dawnLight,dawnFill,closed).matched);
  const wrongSide=casters.map(mesh=>mesh.map(([x,y,z]):Vec=>[x,y,-z]));
  assert.ok(!assessDawn(wrongSide,dawnLight,dawnFill,closed).matched);
});
