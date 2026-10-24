import * as C from './vendor/cannon-es.js';
import { STYLES, clamp } from './content.js';

export const STEP = 1/120;
export const BIN_HEIGHT = 1.04;
export function playerAt(stage,t) {
  const a=stage.playerMove||0;
  return {x:a*Math.sin(t*.63),y:0,z:0,vx:a*.63*Math.cos(t*.63)};
}
export function binAt(stage,t) {
  const a=stage.binMove||0,w=stage.binRate||.8;
  return {x:a*Math.sin(t*w),y:0,z:-stage.distance,vx:a*w*Math.cos(t*w)};
}
export function windAt(stage,t) {
  return {x:(stage.wind||0)+Math.sin(t*.71)*(stage.gust||0),y:0,z:(stage.headwind||0)+Math.cos(t*.43)*(stage.gust||0)*.35};
}
export function personAt(stage,t,i) {
  const distance=stage.distance*(.48+i*.16);
  return {x:Math.sin(t*(.64+i*.13)+i*2.7)*3.35,y:0,z:-distance};
}
export function releaseFor(stage,time,aim,item,swipe={x:0,y:0,speed:0}) {
  const s=STYLES[aim.style],p=playerAt(stage,time);
  const yaw=(aim.yaw+swipe.x)*Math.PI/180;
  const pitch=clamp(s.angle+aim.pitch+swipe.y,10,78)*Math.PI/180;
  const power=clamp(aim.power+swipe.speed,5,100);
  const speed=(3.0+power*.15)*s.speed;
  return {
    position:{x:p.x+Math.sin(yaw)*.27,y:s.release,z:-Math.cos(yaw)*.27},
    velocity:{x:Math.sin(yaw)*Math.cos(pitch)*speed+p.vx,y:Math.sin(pitch)*speed,z:-Math.cos(yaw)*Math.cos(pitch)*speed},
    angular:{x:-7*s.spin*item.spin,y:aim.spin*.2,z:-aim.spin*.08},
    speed,power,pitch:pitch*180/Math.PI,yaw:yaw*180/Math.PI
  };
}
// Quadratic air drag, relative to moving air; face exposure depends on body orientation.
export function airAcceleration(item,velocity,wind,angular={x:0,y:0,z:0},orientation=null) {
  const x=wind.x-velocity.x,y=wind.y-velocity.y,z=wind.z-velocity.z;
  const speed=Math.hypot(x,y,z), axis=orientation ? new C.Vec3() : null;
  let exposure=1;
  if(axis && item.shape!=='sphere') {
    orientation.vmult(new C.Vec3(0,1,0),axis);
    exposure=.65+.5*(1-Math.abs((x*axis.x+y*axis.y+z*axis.z)/(speed||1)));
  }
  const k=.5*1.225*item.drag*item.area*exposure/item.mass;
  // Small Magnus force: spin is a fine adjustment, never a homing force.
  const magnus=.0014;
  return {x:x*speed*k+(angular.y*velocity.z-angular.z*velocity.y)*magnus,
    y:y*speed*k+(angular.z*velocity.x-angular.x*velocity.z)*magnus,
    z:z*speed*k+(angular.x*velocity.y-angular.y*velocity.x)*magnus};
}
export class Simulation {
  constructor(stage) {
    this.stage=stage; this.time=0; this.flight=0; this.body=null; this.scored=false; this.entered=false; this.hits=0; this.humanHit=false;
    this.world=new C.World({gravity:new C.Vec3(0,-9.81,0)});
    this.world.broadphase=new C.SAPBroadphase(this.world);
    this.world.solver.iterations=14;
    this.world.allowSleep=true;
    this.wallMaterial=new C.Material('environment');
    this.itemMaterial=new C.Material('trash');
    this.contact=new C.ContactMaterial(this.wallMaterial,this.itemMaterial,{friction:.38,restitution:.3,contactEquationStiffness:1e8,contactEquationRelaxation:4});
    this.world.addContactMaterial(this.contact);
    const ground=new C.Body({mass:0,shape:new C.Plane(),material:this.wallMaterial});
    ground.quaternion.setFromEuler(-Math.PI/2,0,0); ground.collisionFilterGroup=1; this.world.addBody(ground);
    this.bin=new C.Body({mass:0,type:C.Body.KINEMATIC,material:this.wallMaterial});
    this.bin.collisionFilterGroup=2;
    const r=stage.radius,n=24;
    for(let i=0;i<n;i++) {
      const a=i/n*Math.PI*2, q=new C.Quaternion(); q.setFromEuler(0,-a,0);
      const offset=new C.Vec3(Math.cos(a)*r,BIN_HEIGHT/2,Math.sin(a)*r);
      this.bin.addShape(new C.Box(new C.Vec3(.033,BIN_HEIGHT/2,r*Math.tan(Math.PI/n)+.006)),offset,q);
      this.bin.addShape(new C.Sphere(.047),new C.Vec3(Math.cos(a)*r,BIN_HEIGHT,Math.sin(a)*r));
    }
    this.bin.addShape(new C.Cylinder(r-.025,r-.025,.07,24),new C.Vec3(0,.055,0));
    this.world.addBody(this.bin);
    this.people=[];
    for(let i=0;i<(stage.people||0);i++) {
      const b=new C.Body({mass:0,type:C.Body.KINEMATIC,material:this.wallMaterial});
      b.collisionFilterGroup=4;
      b.addShape(new C.Box(new C.Vec3(.23,.48,.17)),new C.Vec3(0,1.0,0));
      b.addShape(new C.Sphere(.19),new C.Vec3(0,1.71,0));
      b.addShape(new C.Box(new C.Vec3(.20,.28,.14)),new C.Vec3(0,.30,0));
      this.people.push(b); this.world.addBody(b);
    }
    this.syncEnvironment();
  }
  syncEnvironment() {
    const b=binAt(this.stage,this.time);
    this.bin.position.set(b.x,0,b.z); this.bin.velocity.set(b.vx,0,0); this.bin.aabbNeedsUpdate=true;
    this.people.forEach((body,i)=>{
      const p=personAt(this.stage,this.time,i),next=personAt(this.stage,this.time+STEP,i);
      body.position.set(p.x,0,p.z); body.velocity.set((next.x-p.x)/STEP,0,0); body.aabbNeedsUpdate=true;
    });
  }
  setTime(t){this.time=t;this.syncEnvironment();}
  launch(item,release) {
    if(this.body)this.world.removeBody(this.body);
    this.item=item;this.flight=0;this.scored=false;this.entered=false;this.hits=0;this.humanHit=false;
    const b=new C.Body({mass:item.mass,material:this.itemMaterial,linearDamping:.002,angularDamping:.15});
    b.collisionFilterGroup=16;
    if(item.shape==='sphere')b.addShape(new C.Sphere(item.radius));
    else if(item.shape==='box')b.addShape(new C.Box(new C.Vec3(...item.size)));
    else {
      b.addShape(new C.Cylinder(item.size[0],item.size[0],item.size[1]*2,12));
      if(item.shape==='bottle')b.addShape(new C.Sphere(.04),new C.Vec3(0,item.size[1],0));
    }
    b.position.copy(release.position);b.velocity.copy(release.velocity);b.angularVelocity.copy(release.angular);
    b.quaternion.setFromEuler(.12,.12,0); b.allowSleep=false;
    this.contact.restitution=item.bounce;
    b.addEventListener('collide',e=>{
      const impact=Math.abs(e.contact.getImpactVelocityAlongNormal());
      if(impact>.4){this.hits++;if(e.body.collisionFilterGroup===4)this.humanHit=true;this.onImpact?.(impact,e.body.collisionFilterGroup);}
    });
    this.body=b;this.world.addBody(b);return b;
  }
  tick() {
    this.syncEnvironment();
    const b=this.body;
    const previous=b?b.position.clone():null;
    if(b) {
      const a=airAcceleration(this.item,b.velocity,windAt(this.stage,this.time),b.angularVelocity,b.quaternion);
      b.force.set(a.x*this.item.mass,a.y*this.item.mass,a.z*this.item.mass);
    }
    this.world.step(STEP);this.time+=STEP;
    if(b) {
      this.flight+=STEP;
      const target=binAt(this.stage,this.time);
      const d=Math.hypot(b.position.x-target.x,b.position.z-target.z);
      const inner=this.stage.radius-.04;
      if(previous.y>=BIN_HEIGHT-.10 && b.position.y<BIN_HEIGHT-.10 && b.velocity.y<0 && d<inner-this.item.radius*.5)this.entered=true;
      if(this.entered && b.position.y<BIN_HEIGHT-.32 && d<inner-this.item.radius*.45 && !this.scored){this.scored=true;this.onScore?.();}
    }
  }
  settled(){return !!this.body && (this.flight>6 || this.body.position.y<-.3 || (this.flight>.9 && this.body.position.y<.38 && this.body.velocity.length()<.55));}
  nearBasket() {
    if(!this.body || this.scored || this.flight<.25 || this.humanHit)return false;
    const p=this.body.position,v=this.body.velocity;
    if(p.y<BIN_HEIGHT-.1 || v.y>2)return false;
    const discriminant=v.y*v.y+2*9.81*(p.y-BIN_HEIGHT);
    const t=(v.y+Math.sqrt(Math.max(0,discriminant)))/9.81;
    if(t<0 || t>.43)return false;
    const target=binAt(this.stage,this.time+t);
    return Math.hypot(p.x+v.x*t-target.x,p.z+v.z*t-target.z)<this.stage.radius+.24;
  }
  snapshot(){return {t:this.time,p:this.body?[...this.body.position.toArray()]:null,q:this.body?[...this.body.quaternion.toArray()]:null,scored:this.scored};}
}
// A short dotted release guide. No collision prediction; it intentionally stops early.
export function previewArc(stage,time,item,release) {
  const p={...release.position},v={...release.velocity},points=[];
  const q=new C.Quaternion();q.setFromEuler(.12,.12,0);
  for(let i=0;i<24;i++){
    const dt=.028,a=airAcceleration(item,v,windAt(stage,time+i*dt),release.angular,q);
    v.x+=a.x*dt;v.y+=(a.y-9.81)*dt;v.z+=a.z*dt;
    p.x+=v.x*dt;p.y+=v.y*dt;p.z+=v.z*dt;
    if(i%2===0)points.push({...p});
    if(p.y<0)break;
  }
  return points;
}
