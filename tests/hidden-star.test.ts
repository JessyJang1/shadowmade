import {test} from 'node:test';
import assert from 'node:assert/strict';
import {analyticPose,coverageLimit,emptyMask,evaluate,lampAt,lux3dFanTip,pieces,projection,proof,proofLight,spillLimit,type Mount} from '../src/optics.ts';

const stops=[0,1,2];
const poses=pieces.flatMap(({id:piece})=>stops.flatMap(slot=>stops.flatMap(depth=>
  stops.map(dial=>({piece,slot,depth,dial})))));
const solve=(a:Mount,b:Mount,light=proofLight)=>evaluate(
  projection(analyticPose(a,0),lampAt(light)),
  projection(analyticPose(b,1),lampAt(light)),
);

test('the workshop casting meshes make one star by overlap and separate contributions',()=>{
  const r=solve(proof[0],proof[1]);
  assert.ok(r.matched,JSON.stringify(r));
  assert.ok(r.overlap>.35);
  assert.ok(r.unique.every(x=>x>.17));
});
test('fixture grid rejects single pieces and wrong combinations at 201 lamp samples',()=>{
  let standardAccepted=false;
  let tolerantStandard=false;
  for(let tick=0;tick<=200;tick++){
    const light=tick/100;
    const plausible=(mount:number)=>poses.flatMap(pose=>{
      const mask=projection(analyticPose(pose,mount),lampAt(light));
      const {spill,coverage}=evaluate(mask,emptyMask);
      assert.ok(coverage<coverageLimit||spill>spillLimit,JSON.stringify({pose,mount,light,spill,coverage}));
      return spill<=spillLimit&&coverage>=.35?[{pose,mask}]:[];
    });
    const far=plausible(0),near=plausible(1);
    for(const a of far)for(const b of near){
      if(a.pose.piece===b.pose.piece||!evaluate(a.mask,b.mask).matched)continue;
      assert.equal(a.pose.piece,proof[0].piece,JSON.stringify({a:a.pose,b:b.pose,light}));
      assert.equal(b.pose.piece,proof[1].piece,JSON.stringify({a:a.pose,b:b.pose,light}));
      const canonical=[a.pose,b.pose].every((pose,index)=>
        pose.slot===proof[index].slot&&pose.depth===proof[index].depth&&pose.dial===proof[index].dial);
      if(canonical&&tick===200)standardAccepted=true;
      if(canonical&&tick>=180&&tick<200)tolerantStandard=true;
    }
  }
  assert.ok(standardAccepted);
  assert.ok(tolerantStandard);
});
test('valid composition tolerates small pose deviations, while moving the real light changes the result',()=>{
  // The disc origins can miss the calibrated pose by 2 cm on both axes
  // while leaving enough overlap for the shadow to read as a complete star.
  assert.ok(solve(
    {...proof[0],slot:2+.02/.25,depth:.02/.24,dial:2+.02/.62},
    {...proof[1],slot:-.02/.25,depth:2+.02/.24,dial:1-.02/.62},
  ).matched);
  assert.ok(!solve(proof[0],proof[1],0).matched);
  assert.ok(!solve({...proof[0],slot:1},proof[1]).matched);
  assert.ok(!solve(proof[0],{...proof[1],depth:1}).matched);
});

test('removing the clock-roof relief insert from the fan removes the upper star tip',()=>{
  const light=lampAt(proofLight);
  const crook=projection(analyticPose(proof[1],1),light);
  const fan=analyticPose(proof[0],0);
  const whole=evaluate(projection(fan,light),crook);
  const missingTip=evaluate(projection(fan.slice(0,lux3dFanTip.base.length/3),light),crook);
  assert.ok(whole.matched);
  assert.ok(!missingTip.matched);
  assert.ok(whole.coverage-missingTip.coverage>.09);
  assert.ok(missingTip.top<.90);
});
