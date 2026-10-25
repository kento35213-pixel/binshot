import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.module.js';
import {HoldThrowController} from '../dist/controls.js';
import {REPLAY_LEAD,REPLAY_CAMERAS,throwPose,replayDuration,replaySample,replayCamera} from '../dist/replay.js';
import {ThrowerAvatar} from '../dist/avatar.js';
import {releaseFor,STEP,BIN_HEIGHT} from '../dist/physics.js';
import {STAGES,ITEMS,STYLES} from '../dist/content.js';

const aim={style:0,power:24,yaw:0,pitch:0,spin:0};
function begin(){const c=new HoldThrowController();c.begin({id:1,x:200,y:600,time:0,aim,width:400,height:800});return c;}
const event=(x,y,time,id=1)=>({id,x,y,time});
test('短いタップでは投げず、長押し前のドラッグは照準だけを変える',()=>{
 const c=begin();let s=c.move(event(240,520,140));assert.equal(s.phase,'look');assert.ok(s.aim.yaw>0);assert.ok(s.aim.pitch>0);
 assert.equal(c.end(event(250,500,200)).type,'look');assert.equal(c.gesture,null);
});
test('ドラッグ中は長押しにならず、止めた場所で長押しが始まる',()=>{
 const c=begin();for(let t=100;t<=900;t+=100)c.move(event(200+t*.12,600,t));
 assert.equal(c.snapshot().phase,'look');assert.equal(c.advance(1219).phase,'look');assert.equal(c.advance(1220).phase,'charge');
 assert.equal(c.snapshot().chargeX,308);
});
test('押している時間で5〜100%までためられる',()=>{
 const c=begin();assert.equal(c.advance(319).phase,'look');assert.equal(c.advance(320).power,5);
 assert.ok(Math.abs(c.advance(1220).power-52.5)<1e-10);assert.equal(c.advance(3000).power,100);
});
test('スワイプ開始時にパワーを固定し、その後の指の速さで増えない',()=>{
 const c=begin();c.advance(800);const locked=c.move(event(210,550,900));
 assert.equal(locked.phase,'swipe');const power=locked.power;c.move(event(240,450,1400));
 const r=c.end(event(260,400,2000));assert.equal(r.type,'throw');assert.equal(r.power,power);assert.equal(r.swipe.speed,0);assert.ok(r.swipe.x>0);
});
test('斜めスワイプの方向と長さが投球方向に反映される',()=>{
 const right=begin(),left=begin();right.advance(900);left.advance(900);
 const a=right.end(event(270,420,950)),b=left.end(event(130,420,950));
 assert.equal(a.power,b.power);assert.equal(a.swipe.x,-b.swipe.x);assert.ok(a.swipe.x>0);
 const high=begin(),low=begin();high.advance(900);low.advance(900);
 assert.ok(high.end(event(200,280,950)).swipe.y>low.end(event(200,550,950)).swipe.y);
});
test('長押しだけで離す・下へスワイプ・ポインター中断では投げない',()=>{
 for(const y of [600,650]){const c=begin();c.advance(1000);assert.equal(c.end(event(200,y,1100)).type,'cancel');}
 const c=begin();c.advance(1000);c.cancel();assert.equal(c.end(event(200,400,1100)),null);
});
test('2本目の指は最初のジェスチャーを上書きしない',()=>{
 const c=begin();assert.equal(c.begin({id:2,x:10,y:10,time:600,aim,width:400,height:800}),false);
 assert.equal(c.move(event(100,100,600,2)),null);assert.equal(c.end(event(100,100,700,2)),null);assert.equal(c.gesture.id,1);
});
test('長押しによる実投球は短押しより強く、出力は物理エンジンの入力範囲に収まる',()=>{
 function release(at){const c=begin();c.advance(at);const r=c.end(event(200,456,at+10));return releaseFor(STAGES[0],2,r.aim,ITEMS[0],r.swipe);}
 const weak=release(700),strong=release(1700);assert.ok(strong.speed>weak.speed);assert.ok(strong.power<=100);assert.ok(weak.power>=5);
});

const frames=Array.from({length:121},(_,i)=>({t:2+i*STEP,p:[0,1+i*.01,-i*.02],q:[0,0,0,1],scored:false}));
const record={frames,launchTime:2,aim,power:24,yaw:0};
test('リプレイは投球前から始まり、リリース後の軌道は記録を使う',()=>{
 assert.equal(replayDuration(record),REPLAY_LEAD+1);assert.equal(replaySample(record,0).body,null);
 const start=replaySample(record,REPLAY_LEAD);assert.ok(Math.hypot(start.body.position.x,start.body.position.y-1,start.body.position.z)<1e-12);
 const mid=replaySample(record,REPLAY_LEAD+.5);assert.ok(Math.abs(mid.body.position.y-1.6)<1e-10);assert.ok(Math.abs(mid.time-2.5)<1e-10);
 assert.deepEqual(replaySample(record,100).body.position,{x:0,y:2.2,z:-2.4});
});
test('7視点があり、正面カメラはゴミ箱の正面と同じX軸に固定される',()=>{
 assert.equal(REPLAY_CAMERAS.length,7);assert.equal(new Set(REPLAY_CAMERAS.map(c=>c.id)).size,7);
 const stage=STAGES[5],front=replayCamera('binfront',stage,1,null,.5,.46);
 assert.equal(front.position[0],front.target[0]);assert.ok(front.position[1]>BIN_HEIGHT);assert.ok(front.position[2]>front.target[2]);
 const reverse=replayCamera('binreverse',stage,1,null,.5);assert.ok(reverse.position[2]<reverse.target[2]);
});
test('シネマ視点は投げ姿からゴミ箱正面へ切り替わる',()=>{
 assert.deepEqual(replayCamera('cinema',STAGES[0],1,null,-.2),replayCamera('thrower',STAGES[0],1,null,-.2));
 assert.deepEqual(replayCamera('cinema',STAGES[0],2,null,.8),replayCamera('binfront',STAGES[0],2,null,.8));
});
test('4つの投法の振りかぶりが異なり、リリース時の手の高さは実投球と一致する',()=>{
 assert.equal(new Set(STYLES.map((_,i)=>JSON.stringify(throwPose(i,-.22).hand))).size,4);
 for(let style=0;style<4;style++){assert.equal(throwPose(style,0).hand[1],STYLES[style].release);assert.equal(throwPose(style,-.01).gripping,true);assert.equal(throwPose(style,0).gripping,false);}
});
test('デフォルメモデルの手と実際の発射位置にずれがなく、全身カメラに全身が収まる',()=>{
 const avatar=new ThrowerAvatar();const meshCount=(()=>{let n=0;avatar.root.traverse(o=>{if(o.isMesh)n++;});return n;})();assert.ok(meshCount>=40);
 for(let style=0;style<4;style++)for(const yaw of [-25,0,25]){
  const stage=STAGES[9],time=3.4,release=releaseFor(stage,time,{...aim,style,yaw},ITEMS[0]);
  avatar.update({stage,time,style,yaw,power:24,elapsed:0});
  const wrist=avatar.arms[1].hand.getWorldPosition(new T.Vector3());assert.ok(wrist.distanceTo(new T.Vector3(...Object.values(release.position)))<1e-8);
 }
 for(let style=0;style<4;style++)for(const elapsed of [-.85,-.22,0,.32,1.3]){
  avatar.update({stage:STAGES[0],time:1,style,yaw:0,power:80,elapsed});
  const bounds=new T.Box3().setFromObject(avatar.root),shot=replayCamera('thrower',STAGES[0],1,null,elapsed,.46);
  const camera=new T.PerspectiveCamera(53,.46,.05,80);camera.position.set(...shot.position);camera.lookAt(...shot.target);camera.updateMatrixWorld();
  for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){const screen=new T.Vector3(x,y,z).project(camera);assert.ok(Math.abs(screen.y)<1&&Math.abs(screen.x)<1,`pose ${style}/${elapsed} clipped at ${screen.x}/${screen.y}`);}
 }
});
