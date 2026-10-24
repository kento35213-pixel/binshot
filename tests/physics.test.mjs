import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {ITEMS,STAGES,STYLES,itemSequence} from '../dist/content.js';
import {Simulation,releaseFor,STEP,BIN_HEIGHT,playerAt,binAt,personAt} from '../dist/physics.js';

const baseAim={style:0,power:24,yaw:0,pitch:0,spin:0};
function toss(stage=STAGES[0],item=ITEMS[0],aim=baseAim,time=0){
  const sim=new Simulation(stage);sim.setTime(time);sim.launch(item,releaseFor(stage,time,aim,item));return sim;
}
function run(sim,seconds=4){for(let i=0;i<Math.round(seconds/STEP);i++)sim.tick();return sim;}

test('中心への投球は成功し、短い・強すぎる・左右がずれた投球は失敗する',()=>{
  assert.equal(run(toss()).scored,true);
  for(const aim of [{...baseAim,power:10},{...baseAim,power:60},{...baseAim,yaw:12}])assert.equal(run(toss(STAGES[0],ITEMS[0],aim)).scored,false);
});
test('1%の強さの差で、縁の近くの成功と失敗が変わる',()=>{
  assert.equal(run(toss(STAGES[0],ITEMS[0],{...baseAim,power:17})).scored,false);
  assert.equal(run(toss(STAGES[0],ITEMS[0],{...baseAim,power:18})).scored,true);
});
test('同じ入力と環境時刻なら、位置と回転と衝突結果が再現する',()=>{
  const a=run(toss(STAGES[5],ITEMS[1],{...baseAim,power:34,yaw:8,spin:12},1.2));
  const b=run(toss(STAGES[5],ITEMS[1],{...baseAim,power:34,yaw:8,spin:12},1.2));
  assert.deepEqual(a.snapshot(),b.snapshot());assert.equal(a.hits,b.hits);
});
test('軽いティッシュは空き缶より横風に強く流される',()=>{
  const stage={...STAGES[0],distance:20,wind:3};
  const tissue=run(toss(stage,ITEMS[3],{...baseAim,power:40}),.7);
  const can=run(toss(stage,ITEMS[2],{...baseAim,power:40}),.7);
  assert.ok(tissue.body.position.x>can.body.position.x*2);
  assert.ok(Math.abs(tissue.body.position.z-can.body.position.z)>.25);
});
test('回転入力が実際の横方向の軌道を変える',()=>{
  const stage={...STAGES[0],distance:20};
  const a=run(toss(stage,ITEMS[0],{...baseAim,power:50,spin:30}),1);
  const b=run(toss(stage,ITEMS[0],{...baseAim,power:50,spin:-30}),1);
  assert.ok(Math.abs(a.body.position.x-b.body.position.x)>.01);
  assert.notDeepEqual(a.body.quaternion.toArray(),b.body.quaternion.toArray());
});
test('投げ方でリリースの高さと速度ベクトルが変わる',()=>{
  const releases=STYLES.map((_,style)=>releaseFor(STAGES[0],0,{...baseAim,style},ITEMS[0]));
  assert.ok(releases[2].position.y<releases[0].position.y);
  assert.ok(releases[1].pitch>releases[0].pitch);
  assert.ok(releases[3].velocity.y<releases[0].velocity.y);
});
test('動くプレイヤーの速度がリリース速度に加わり、ゴミ箱は時間で動く',()=>{
  const stage=STAGES[9],p=playerAt(stage,0),release=releaseFor(stage,0,baseAim,ITEMS[0]);
  assert.ok(Math.abs(release.velocity.x-p.vx)<1e-12);
  assert.notEqual(binAt(stage,0).x,binAt(stage,1).x);
  const sim=run(toss(stage,ITEMS[0]),.5);
  assert.ok(Math.abs(sim.bin.position.x-binAt(stage,sim.time).x)<.02);
});
test('通行人との実衝突が発生する',()=>{
  const stage={...STAGES[3],wind:0};
  const sim=new Simulation(stage),person=personAt(stage,0,0);
  sim.launch(ITEMS[0],{position:{x:person.x,y:1.2,z:person.z+.6},velocity:{x:0,y:0,z:-7},angular:{x:0,y:0,z:0}});
  run(sim,.5);assert.equal(sim.humanHit,true);assert.ok(sim.hits>0);
});
test('縁で実際に跳ね返り、その後に箱へ入ることもある',()=>{
  const stage=STAGES[0],sim=new Simulation(stage);
  sim.launch(ITEMS[2],{position:{x:stage.radius,y:2,z:-stage.distance},velocity:{x:0,y:-2,z:0},angular:{x:1,y:0,z:0}});
  let bounce=false;
  for(let i=0;i<200;i++){sim.tick();if(sim.body.velocity.y>.2)bounce=true;}
  assert.equal(bounce,true);assert.ok(sim.hits>0);assert.equal(sim.scored,true);
});
test('箱の外側への接触だけでは成功にならない',()=>{
  const stage=STAGES[0],sim=new Simulation(stage);
  sim.launch(ITEMS[2],{position:{x:stage.radius+.12,y:2,z:-stage.distance},velocity:{x:0,y:-2,z:0},angular:{x:1,y:0,z:0}});
  run(sim,3);assert.equal(sim.scored,false);
});
test('底の高さにゴミがあっても、開口を通っていなければ成功にならない',()=>{
  const sim=new Simulation(STAGES[0]);
  sim.launch(ITEMS[0],{position:{x:0,y:.3,z:-STAGES[0].distance},velocity:{x:0,y:0,z:0},angular:{x:0,y:0,z:0}});
  run(sim,1);assert.equal(sim.scored,false);
});
test('スロー演出の予測は成功の前に反応し、成功の強制や再抽選をしない',()=>{
  const sim=toss();let anticipated=false,scores=0;sim.onScore=()=>scores++;
  for(let i=0;i<600;i++){anticipated ||=sim.nearBasket();sim.tick();}
  assert.equal(anticipated,true);assert.equal(scores,1);assert.equal(sim.scored,true);
});
test('リプレイ用の120Hzスナップショットは有限な位置・回転・時間を持つ',()=>{
  const sim=toss();const frames=[];
  for(let i=0;i<240;i++){sim.tick();frames.push(sim.snapshot());}
  assert.equal(frames.length,240);
  assert.ok(Math.abs(frames.at(-1).t-2)<1e-12);
  for(const f of frames){assert.equal(f.p.length,3);assert.equal(f.q.length,4);assert.ok([...f.p,...f.q,f.t].every(Number.isFinite));}
});
test('ゴミ選択で直前と同じ種類が選ばれない',()=>{
  for(let previous=0;previous<ITEMS.length;previous++)for(const r of [0,.1,.5,.999])assert.notEqual(itemSequence(previous,()=>r),previous);
});
const solutions=JSON.parse(fs.readFileSync(new URL('./solutions.json',import.meta.url)));
test('全12ステージ×6種類に物理的に成功する投球がある',async t=>{
  assert.equal(solutions.length,72);
  assert.equal(new Set(solutions.map(s=>`${s.stage}/${s.item}`)).size,72);
  for(const solution of solutions)await t.test(`${solution.stage+1}: ${ITEMS[solution.item].name}`,()=>{
    const sim=toss(STAGES[solution.stage],ITEMS[solution.item],solution.aim,solution.time);
    run(sim,6);assert.equal(sim.scored,true);
  });
});
