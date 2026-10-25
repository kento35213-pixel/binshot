import {clamp,STYLES} from './content.js';
import {binAt,playerAt,STEP} from './physics.js';

export const REPLAY_LEAD=.85;
export const REPLAY_CAMERAS=[
  {id:'cinema',name:'シネマ：投げ姿 → ゴミ箱'},
  {id:'thrower',name:'投げ手の全身'},
  {id:'binfront',name:'ゴミ箱の正面'},
  {id:'binreverse',name:'ゴミ箱から投げ手'},
  {id:'follow',name:'ゴミを追尾'},
  {id:'overhead',name:'真上から俯瞰'},
  {id:'firstperson',name:'プレイヤーの視点'},
];
const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
const ease=x=>{x=clamp(x,0,1);return x*x*(3-2*x);};
export function throwPose(style,elapsed,power=40){
  const ready=[.29,1.20,-.16];
  const windups=[[.35,1.89,.27],[.22,2.03,.17],[.38,.61,.32],[.56,1.48,.40]];
  const endings=[[-.20,1.02,-.55],[-.05,1.76,-.55],[.15,1.43,-.59],[-.28,1.23,-.54]];
  const release=[0,STYLES[style].release,-.27];
  let hand;
  if(elapsed<-.22)hand=mix(ready,windups[style],ease((elapsed+REPLAY_LEAD)/(REPLAY_LEAD-.22)));
  else if(elapsed<0)hand=mix(windups[style],release,ease((elapsed+.22)/.22));
  else if(elapsed<.32)hand=mix(release,endings[style],ease(elapsed/.32));
  else hand=mix(endings[style],ready,ease((elapsed-.32)/.95));
  const active=elapsed<0?Math.sin(clamp((elapsed+REPLAY_LEAD)/REPLAY_LEAD,0,1)*Math.PI):Math.max(0,1-elapsed/1.1);
  return {hand,elbowHint:style===2?[.58,.94,.17]:[.64,1.47,.22],
    leftHand:style===1&&elapsed<-.06?[-.12,hand[1]-.10,hand[2]-.02]:[-.37,1.12+active*.14,-.13-active*.1],
    lean:([-.10,-.05,.12,-.15][style])*active*(.6+power/200),
    twist:([-.12,-.04,.04,-.28][style])*active,gripping:elapsed<0};
}
export function replayDuration(record){return REPLAY_LEAD+Math.max(0,record.frames.length-1)*STEP;}
export function replaySample(record,playhead){
  const elapsed=clamp(playhead,0,replayDuration(record))-REPLAY_LEAD;
  const launchTime=record.launchTime??record.frames[0].t;
  if(elapsed<0)return {elapsed,time:launchTime+elapsed,body:null};
  const frame=clamp(elapsed/STEP,0,record.frames.length-1),i=Math.floor(frame),f=frame-i;
  const a=record.frames[i],b=record.frames[Math.min(i+1,record.frames.length-1)];
  // Quaternion nlerp follows the shortest rotation and stays normalized.
  const dot=a.q.reduce((v,x,j)=>v+x*b.q[j],0),sign=dot<0?-1:1;
  const q=a.q.map((x,j)=>x+(b.q[j]*sign-x)*f),len=Math.hypot(...q)||1;
  return {elapsed,time:a.t+(b.t-a.t)*f,body:{position:{x:a.p[0]+(b.p[0]-a.p[0])*f,y:a.p[1]+(b.p[1]-a.p[1])*f,z:a.p[2]+(b.p[2]-a.p[2])*f},quaternion:{x:q[0]/len,y:q[1]/len,z:q[2]/len,w:q[3]/len}}};
}
export function replayCamera(id,stage,time,body,elapsed,aspect=1.5){
  const p=playerAt(stage,time),b=binAt(stage,time),ball=body?.position??{x:p.x,y:1.3,z:-.3};
  const portrait=aspect<.85;
  const front={position:[b.x,1.65,b.z+(portrait?3:2.35)],target:[b.x,.98,b.z]};
  const actorFactor=portrait?1.4:1;
  const actor={position:[p.x+2.75*actorFactor,1.63,-1.75*actorFactor],target:[p.x,1.07,-.08]};
  switch(id){
    case 'cinema':return elapsed<.48?actor:front;
    case 'thrower':return actor;
    case 'binfront':return front;
    case 'binreverse':return {position:[b.x,1.95,b.z-1.65],target:[p.x,1.07,-.12]};
    case 'follow':return {position:[ball.x+(portrait?3.8:2.8),ball.y+1.2,ball.z+2.6],target:[ball.x,ball.y,ball.z]};
    case 'overhead':return {position:[.15,Math.max(6.2,stage.distance*(portrait?1.35:1.05)),-stage.distance*.48],target:[0,.55,-stage.distance*.49]};
    case 'firstperson':return {position:[p.x,1.67,0],target:[ball.x,Math.max(.7,ball.y),Math.min(-.4,ball.z)]};
    default:return front;
  }
}
