import {clamp} from './content.js';

// One pointer owns a gesture. A stationary hold arms the throw; movement before
// arming only aims, and movement after arming never changes the held power.
export class HoldThrowController {
  constructor({holdMs=320,chargeMs=1800,slop=10}={}){Object.assign(this,{holdMs,chargeMs,slop});this.gesture=null;}
  begin({id,x,y,time,aim,width,height}){
    if(this.gesture)return false;
    this.gesture={id,x,y,anchorX:x,anchorY:y,stableAt:time,phase:'look',aim:{...aim},startAim:{...aim},width,height,power:5,trail:[]};return true;
  }
  advance(time){
    const g=this.gesture;if(!g)return null;
    if(g.phase==='look'&&time-g.stableAt>=this.holdMs){g.phase='charge';g.chargeAt=g.stableAt+this.holdMs;g.chargeX=g.x;g.chargeY=g.y;g.lockedAim={...g.aim};}
    if(g.phase==='charge')g.power=clamp(5+(time-g.chargeAt)/this.chargeMs*95,5,100);
    return this.snapshot();
  }
  move({id,x,y,time}){
    const g=this.gesture;if(!g||id!==g.id)return null;
    this.advance(time);
    if(g.phase==='look'){
      g.aim.yaw=clamp(g.aim.yaw+(x-g.x)/g.width*62,-32,32);
      g.aim.pitch=clamp(g.aim.pitch-(y-g.y)/g.height*48,-16,17);
      if(Math.hypot(x-g.anchorX,y-g.anchorY)>this.slop){g.stableAt=time;g.anchorX=x;g.anchorY=y;}
    }else{
      if(g.phase==='charge'&&Math.hypot(x-g.chargeX,y-g.chargeY)>14){g.phase='swipe';g.lockedPower=g.power;}
      if(g.phase==='swipe'){g.trail.push([x,y]);g.trail=g.trail.slice(-28);}
    }
    g.x=x;g.y=y;return this.snapshot();
  }
  end({id,x,y,time}){
    const g=this.gesture;if(!g||g.id!==id)return null;
    this.move({id,x,y,time});
    let result={type:'look'};
    if(g.phase!=='look'){
      const dx=x-g.chargeX,dy=g.chargeY-y;
      if(dy>=26){
        const direction=Math.atan2(dx,dy)*180/Math.PI;
        result={type:'throw',aim:{...g.lockedAim,power:g.lockedPower??g.power},power:g.lockedPower??g.power,
          swipe:{x:clamp(direction*.42,-24,24),y:clamp((dy/g.height-.18)*40,-6,13),speed:0}};
      }else result={type:'cancel',reason:'no-forward-swipe'};
    }
    this.cancel();return result;
  }
  snapshot(){const g=this.gesture;return g?{id:g.id,phase:g.phase,aim:{...g.aim},power:g.lockedPower??g.power,x:g.x,y:g.y,chargeX:g.chargeX,chargeY:g.chargeY,trail:g.trail}:null;}
  cancel(){this.gesture=null;}
}
