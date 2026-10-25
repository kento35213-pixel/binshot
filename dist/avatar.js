import * as T from './vendor/three.module.js';
import {throwPose} from './replay.js?v=1.1.0';
import {playerAt} from './physics.js';

// Original, stylized adventure-game character: oversized hands and sneakers,
// expressive brows, swept hair and softly faceted shapes. No external assets.
export class ThrowerAvatar {
  constructor(){
    this.root=new T.Group();this.root.name='BINSHOT thrower';
    this.materials={};
    for(const [name,color]of Object.entries({skin:0xe5af89,cheek:0xd69778,hair:0x694332,jacket:0x659789,shirt:0xe88a52,jeans:0x425b79,denim:0x607791,shoe:0xe9e4d2,sole:0xf9f4e6,dark:0x2c3934,white:0xfffbec,iris:0x7f9d8e}))this.materials[name]=new T.MeshStandardMaterial({color,roughness:.88});
    this.sphere=new T.SphereGeometry(1,14,10);this.cylinder=new T.CylinderGeometry(1,1,1,12);this.cube=new T.BoxGeometry(1,1,1);
    this.torso=new T.Group();this.torso.position.y=.96;this.root.add(this.torso);
    this.ellipsoid(this.torso,[.29,.36,.175],[0,.31,0],'jacket');
    this.block(this.torso,[.17,.40,.035],[0,.31,-.164],'shirt');
    for(const side of [-1,1]){const lapel=this.block(this.torso,[.075,.36,.035],[side*.105,.36,-.174],'jacket');lapel.rotation.z=side*-.12;this.ellipsoid(this.torso,[.045,.05,.025],[side*.18,.4,-.16],'denim');}
    for(let i=0;i<3;i++)this.ellipsoid(this.torso,[.015,.015,.012],[.11,.22+i*.1,-.19],'sole');
    this.ellipsoid(this.torso,[.098,.11,.10],[0,.68,0],'skin');
    this.head=new T.Group();this.head.position.set(0,.81,-.012);this.torso.add(this.head);
    this.ellipsoid(this.head,[.245,.285,.215],[0,0,0],'skin');this.ellipsoid(this.head,[.17,.13,.16],[0,-.17,-.045],'skin');
    for(const side of [-1,1]){
      this.ellipsoid(this.head,[.063,.09,.055],[side*.242,-.015,0],'skin');this.ellipsoid(this.head,[.033,.045,.025],[side*.272,-.015,-.02],'cheek');
      this.ellipsoid(this.head,[.073,.066,.026],[side*.093,.025,-.202],'white');this.ellipsoid(this.head,[.030,.038,.017],[side*.09,.02,-.228],'iris');this.ellipsoid(this.head,[.015,.025,.008],[side*.09,.02,-.244],'dark');this.ellipsoid(this.head,[.007,.01,.006],[side*.09-.008,.035,-.249],'white');
      const brow=this.ellipsoid(this.head,[.086,.019,.025],[side*.09,.115,-.205],'hair');brow.rotation.z=side*.13;
    }
    this.ellipsoid(this.head,[.052,.065,.085],[0,-.05,-.226],'skin');
    const smile=new T.Mesh(new T.TorusGeometry(.05,.007,5,14,Math.PI*.8),this.materials.cheek);smile.position.set(0,-.14,-.197);smile.rotation.set(0,0,Math.PI*1.1);this.head.add(smile);
    this.ellipsoid(this.head,[.237,.19,.20],[0,.18,.035],'hair');
    for(let i=0;i<6;i++){const hair=this.ellipsoid(this.head,[.10,.12,.14],[-.19+i*.066,.23+Math.sin(i*.6)*.045,-.10],'hair');hair.rotation.z=-.45;}
    this.ellipsoid(this.root,[.25,.14,.17],[0,.94,0],'jeans');
    this.legs=[];
    for(const side of [-1,1]){
      const leg=new T.Group();leg.position.set(side*.145,.89,0);this.root.add(leg);
      this.ellipsoid(leg,[.105,.38,.105],[0,-.33,0],'jeans');this.ellipsoid(leg,[.09,.10,.11],[0,-.40,-.02],'denim');
      this.ellipsoid(leg,[.13,.09,.205],[0,-.77,-.065],'shoe');this.block(leg,[.24,.055,.36],[0,-.835,-.055],'sole');
      for(let i=0;i<3;i++)this.block(leg,[.15,.014,.018],[0,-.70,-.08+i*.036],'white');this.legs.push(leg);
    }
    this.arms=[];
    for(const side of [-1,1]){
      const upper=new T.Mesh(this.cylinder,this.materials.jacket),lower=new T.Mesh(this.cylinder,this.materials.skin);upper.castShadow=lower.castShadow=true;this.root.add(upper,lower);
      const elbow=this.ellipsoid(this.root,[.079,.079,.079],[0,0,0],'skin');
      const hand=new T.Group();this.root.add(hand);this.ellipsoid(hand,[.090,.10,.065],[0,0,0],'skin');
      for(let i=0;i<4;i++)this.ellipsoid(hand,[.021,.063,.022],[-.057+i*.037,-.068,-.008],'skin');const thumb=this.ellipsoid(hand,[.027,.060,.027],[side*.086,-.018,-.007],'skin');thumb.rotation.z=side*-.55;
      this.arms.push({upper,lower,elbow,hand,side});
    }
    this.prop=new T.Group();this.root.add(this.prop);
    this.update({stage:{},time:0,elapsed:-.85,style:0,power:30,yaw:0});
  }
  ellipsoid(parent,size,position,material){const m=new T.Mesh(this.sphere,this.materials[material]);m.scale.set(...size);m.position.set(...position);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
  block(parent,size,position,material){const m=new T.Mesh(this.cube,this.materials[material]);m.scale.set(...size);m.position.set(...position);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
  segment(mesh,start,end,width){const delta=end.clone().sub(start);mesh.position.copy(start).addScaledVector(delta,.5);mesh.scale.set(width,delta.length(),width);mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());}
  armPose(arm,shoulder,target,hint){
    const s=new T.Vector3(...shoulder),w=new T.Vector3(...target),h=new T.Vector3(...hint),axis=w.clone().sub(s),distance=axis.length();
    axis.normalize();const bend=h.sub(s).addScaledVector(axis,-h.dot(axis));if(bend.lengthSq()<.0001)bend.set(arm.side,0,.4);bend.normalize();
    const length=Math.max(.36,distance/2+.001),elbow=s.clone().addScaledVector(axis,distance/2).addScaledVector(bend,Math.sqrt(Math.max(.002,length*length-distance*distance/4)));
    this.segment(arm.upper,s,elbow,.075);this.segment(arm.lower,elbow,w,.060);arm.elbow.position.copy(elbow);arm.hand.position.copy(w);
    arm.hand.quaternion.setFromUnitVectors(new T.Vector3(0,-1,0),w.clone().sub(elbow).normalize());
  }
  update({stage,time,elapsed,style,power,yaw}){
    const p=playerAt(stage,time),pose=throwPose(style,elapsed,power);
    this.root.position.set(p.x,0,0);this.root.rotation.y=-yaw*Math.PI/180;
    this.torso.rotation.z=pose.lean;this.torso.rotation.y=pose.twist;
    this.head.rotation.y=-pose.twist*.55;
    const right=new T.Vector3(.255,.48,0).applyEuler(this.torso.rotation).add(new T.Vector3(0,.96,0));
    const left=new T.Vector3(-.255,.48,0).applyEuler(this.torso.rotation).add(new T.Vector3(0,.96,0));
    this.armPose(this.arms[1],right.toArray(),pose.hand,pose.elbowHint);
    this.armPose(this.arms[0],left.toArray(),pose.leftHand,[-.6,1.15,.2]);
    const walk=stage.playerMove?Math.sin(time*4.5)*.15:0;
    this.legs.forEach((leg,i)=>{leg.rotation.z=walk*(i?-1:1);leg.rotation.x=elapsed>0&&elapsed<.8?(i?-.08:.08)*Math.sin(elapsed/.8*Math.PI):0;});
    this.prop.position.set(...pose.hand);this.prop.rotation.set(elapsed<-.22?.35:0,0,0);this.prop.visible=pose.gripping;
    this.root.updateMatrixWorld(true);return pose;
  }
  setItem(blueprint){this.prop.clear();this.prop.add(blueprint.clone(true));}
}
