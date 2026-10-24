import * as T from './vendor/three.module.js';
import {binAt,playerAt,personAt,windAt,BIN_HEIGHT} from './physics.js';

const palette={cream:0xf1e8d6,white:0xfaf6eb,green:0x477b60,dark:0x2c473c,orange:0xea7350,wood:0xc99e75,teal:0x8bb7a4};
const materials=new Map(), geometries=new Map();
function mat(color,extra={}) {const key=JSON.stringify([color,extra]);if(!materials.has(key))materials.set(key,new T.MeshStandardMaterial({color,roughness:.82,...extra}));return materials.get(key);}
function boxGeo(x,y,z){const key=`b${x},${y},${z}`;if(!geometries.has(key))geometries.set(key,new T.BoxGeometry(x,y,z));return geometries.get(key);}
function mesh(geo,color,parent,pos=[0,0,0],extra={}){const m=new T.Mesh(geo,mat(color,extra));m.position.set(...pos);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function box(parent,size,pos,color,extra){return mesh(boxGeo(...size),color,parent,pos,extra);}
function cyl(parent,r1,r2,h,pos,color,n=20,extra){return mesh(new T.CylinderGeometry(r1,r2,h,n),color,parent,pos,extra);}
function sphere(parent,r,pos,color,detail=1){return mesh(new T.IcosahedronGeometry(r,detail),color,parent,pos);}
function clearEnvironment(root){
  const sharedGeometry=new Set(geometries.values()),sharedMaterial=new Set(materials.values());
  const disposeGeometry=new Set(),disposeMaterial=new Set(),disposeTexture=new Set();
  root.traverse(o=>{if(o.geometry&&!sharedGeometry.has(o.geometry))disposeGeometry.add(o.geometry);for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[]){if(!sharedMaterial.has(m)){disposeMaterial.add(m);if(m.map)disposeTexture.add(m.map);}}});
  disposeTexture.forEach(t=>t.dispose());disposeMaterial.forEach(m=>m.dispose());disposeGeometry.forEach(g=>g.dispose());root.clear();
}
function textPlane(parent,text,w,h,pos,{bg='#f2e8d4',fg='#4c6e55',font=90,rotate=0}={}) {
  const c=document.createElement('canvas');c.width=1024;c.height=Math.round(1024*h/w);
  const ctx=c.getContext('2d');ctx.fillStyle=bg;ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle=fg;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`700 ${font}px Arial`;
  text.split('\n').forEach((line,i,arr)=>ctx.fillText(line,512,c.height/2+(i-(arr.length-1)/2)*(font*1.25)));
  const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;
  const m=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:tex}));m.position.set(...pos);m.rotation.y=rotate;parent.add(m);return m;
}
function plant(parent,x,z,scale=1){const g=new T.Group();g.position.set(x,0,z);g.scale.setScalar(scale);parent.add(g);cyl(g,.19,.14,.4,[0,.2,0],0xd3a07d);cyl(g,.17,.17,.025,[0,.405,0],0x645844);for(let i=0;i<7;i++){let a=i*2.399,h=.7+(i%3)*.15;const leaf=sphere(g,.22,[Math.cos(a)*.15,h,Math.sin(a)*.15],i%2?0x6f9564:0x416e50);leaf.scale.set(.6,1.7,.65);leaf.rotation.z=Math.cos(a)*.5;}}
function table(parent,x,z,rot=0){const g=new T.Group();parent.add(g);g.position.set(x,0,z);g.rotation.y=rot;box(g,[1.7,.1,.8],[0,.77,0],palette.wood);for(let i of [-1,1])for(let j of [-1,1])box(g,[.065,.75,.065],[i*.71,.37,j*.29],palette.dark);box(g,[.5,.32,.035],[0,1.02,-.12],palette.dark);box(g,[.46,.28,.038],[0,1.02,-.095],0x9ac6b1);box(g,[.53,.025,.24],[0,.84,.05],0x52675c);cyl(g,.06,.045,.14,[.52,.88,.10],palette.white);box(g,[.3,.025,.2],[-.51,.84,.08],palette.orange);}
function chair(parent,x,z,rot=0){const g=new T.Group();parent.add(g);g.position.set(x,0,z);g.rotation.y=rot;box(g,[.56,.09,.52],[0,.48,0],0x7b997b);box(g,[.57,.57,.075],[0,.81,.24],0x7b997b);for(let a of [-1,1])for(let b of [-1,1])box(g,[.045,.45,.045],[a*.22,.23,b*.20],palette.dark);}
function bench(parent,x,z,rot=0){const g=new T.Group();g.position.set(x,0,z);g.rotation.y=rot;parent.add(g);for(let i=0;i<4;i++)box(g,[1.9,.08,.11],[0,.48,i*.13-.2],palette.wood);for(let i=0;i<3;i++)box(g,[1.9,.12,.08],[0,.72+i*.15,.28],palette.wood);for(let s of [-1,1]){box(g,[.08,.48,.55],[s*.7,.24,0],palette.dark);box(g,[.06,.7,.06],[s*.7,.6,.28],palette.dark);}}
function tree(parent,x,z,s=1){const g=new T.Group();g.position.set(x,0,z);g.scale.setScalar(s);parent.add(g);cyl(g,.12,.19,2.3,[0,1.1,0],0x97785d,8);sphere(g,1.15,[0,2.8,0],0x72996e,1);sphere(g,.9,[.5,3.3,.12],0x9aae7f,1);sphere(g,.9,[-.55,2.75,.1],0x587d5d,1);}
function person(parent,i){const g=new T.Group();parent.add(g);const shirt=[0xd79c6b,0x7da9ac][i%2];const torso=box(g,[.47,.68,.34],[0,1.1,0],shirt);torso.rotation.z=.035;sphere(g,.185,[0,1.72,0],0xe4b495,2);const hair=sphere(g,.19,[0,1.80,-.025],0x554d43,1);hair.scale.y=.63;box(g,[.10,.15,.04],[.11,1.69,.155],0xe4b495);const limbs=[];for(let s of [-1,1]){let leg=box(g,[.15,.7,.16],[s*.13,.42,0],0x516375);leg.geometry=leg.geometry.clone();leg.geometry.translate(0,-.28,0);leg.position.y=.70;limbs.push(leg);box(g,[.17,.11,.29],[s*.13,.065,.06],0x3d4e45);let arm=box(g,[.13,.65,.14],[s*.32,1.13,0],shirt);arm.geometry=arm.geometry.clone();arm.geometry.translate(0,-.23,0);arm.position.y=1.39;limbs.push(arm);}return {g,limbs};}

export class View {
  constructor(canvas) {
    this.canvas=canvas;this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.65));
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;
    this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.28;
    this.scene=new T.Scene();this.scene.background=new T.Color(0xd6e3dc);this.scene.fog=new T.Fog(0xd6e3dc,17,46);
    this.camera=new T.PerspectiveCamera(53,innerWidth/innerHeight,.05,80);
    this.scene.add(new T.HemisphereLight(0xfff5db,0x94ab9b,2.7));
    this.sun=new T.DirectionalLight(0xffe3b5,3.2);this.sun.position.set(-6,10,3);this.sun.castShadow=true;
    this.sun.shadow.mapSize.set(1024,1024);Object.assign(this.sun.shadow.camera,{left:-12,right:12,top:12,bottom:-15,near:.5,far:35});this.sun.shadow.bias=-.0005;this.sun.shadow.normalBias=.03;this.scene.add(this.sun);
    this.environment=new T.Group();this.scene.add(this.environment);
    this.binGroup=new T.Group();this.scene.add(this.binGroup);
    this.hand=new T.Group();this.camera.add(this.hand);this.scene.add(this.camera);
    const arm=box(this.hand,[.12,.16,.39],[.26,-.32,-.47],0xd4a283);arm.rotation.x=-.2;arm.rotation.y=-.2;
    const sleeve=box(this.hand,[.16,.19,.35],[.29,-.37,-.28],0x6f907d);sleeve.rotation.x=-.2;
    const palm=sphere(this.hand,.1,[.24,-.24,-.66],0xe0ad8e,2);palm.scale.set(.8,.65,1.2);
    for(let i=0;i<4;i++){const finger=cyl(this.hand,.018,.02,.13,[.20+i*.027,-.22,-.72],0xe0ad8e,8);finger.rotation.x=1.3;}
    this.held=new T.Group();this.hand.add(this.held);this.held.position.set(.23,-.20,-.74);this.held.scale.setScalar(.67);
    this.trash=new T.Group();this.scene.add(this.trash);this.trash.visible=false;
    this.guide=new T.Group();this.scene.add(this.guide);
    this.dots=Array.from({length:12},(_,i)=>{const d=new T.Mesh(new T.SphereGeometry(.023,8,6),new T.MeshBasicMaterial({color:0xef8855,transparent:true,opacity:.75-i*.035,depthTest:false}));d.renderOrder=3;this.guide.add(d);return d;});
    this.particles=[];this.people=[];this.itemCache=new Map();this.windLines=new T.Group();this.scene.add(this.windLines);
    const geo=new T.BufferGeometry().setFromPoints([new T.Vector3(-.23,0,0),new T.Vector3(.23,0,0)]);
    for(let i=0;i<26;i++){let l=new T.Line(geo,new T.LineBasicMaterial({color:0xf5fae8,transparent:true,opacity:.6}));l.userData.seed=i*.739;this.windLines.add(l);}
    this.ringPulse=new T.Mesh(new T.TorusGeometry(1,.009,6,64),new T.MeshBasicMaterial({color:0xf5d58e,transparent:true,opacity:0}));this.ringPulse.rotation.x=-Math.PI/2;this.scene.add(this.ringPulse);
    this.shake=0;this.resize();addEventListener('resize',()=>this.resize());
  }
  resize(){this.renderer.setSize(innerWidth,innerHeight);this.camera.aspect=innerWidth/innerHeight;this.camera.updateProjectionMatrix();}
  makeItem(item,parent) {
    const g=new T.Group();parent.add(g);
    if(item.id==='paper'||item.id==='tissue'){
      const geo=new T.IcosahedronGeometry(item.radius,item.id==='paper'?1:2);const pos=geo.attributes.position;
      for(let i=0;i<pos.count;i++){let v=new T.Vector3().fromBufferAttribute(pos,i);v.multiplyScalar(.83+Math.sin(i*25.3)*.17);pos.setXYZ(i,v.x,v.y,v.z);}geo.computeVertexNormals();
      mesh(geo,item.color,g);if(item.id==='tissue'){g.scale.set(1.25,.75,1);for(let i=0;i<3;i++){let m=mesh(new T.PlaneGeometry(.13,.15,1,1),item.color,g,[.04*Math.cos(i*2),.055,.04*Math.sin(i*2)],{side:T.DoubleSide});m.rotation.set(.5+i*.6,i,0);}}
    }else if(item.id==='bottle'){
      cyl(g,.064,.063,.34,[0,-.03,0],0x9bd8ca,12,{metalness:.06,roughness:.27});cyl(g,.025,.064,.09,[0,.185,0],0xb1e5d7,12);cyl(g,.027,.027,.05,[0,.255,0],0xe9eaca,12);cyl(g,.065,.065,.10,[0,-.03,0],0x4b9e89,12);for(let y of [-.14,.07])cyl(g,.067,.067,.016,[0,y,0],0x8dc9bc,12);
    }else if(item.id==='can'){
      cyl(g,.07,.07,.285,[0,0,0],0xe57350,20,{metalness:.25});for(let y of [-.14,.14])cyl(g,.072,.072,.015,[0,y,0],0xb5bcb2,20,{metalness:.65,roughness:.3});textPlane(g,'POP',.107,.10,[0,0,.071],{bg:'#e57350',fg:'#fff2d9',font:240});const tab=mesh(new T.TorusGeometry(.015,.005,5,12),0x818e83,g,[0,.151,0]);tab.rotation.x=Math.PI/2;
    }else if(item.id==='cup'){
      mesh(new T.CylinderGeometry(.085,.057,.30,20,1,true),0xe7c586,g,[0,0,0],{side:T.DoubleSide});cyl(g,.081,.081,.01,[0,.146,0],0x866c47);const rim=mesh(new T.TorusGeometry(.085,.008,6,24),0xf5e8c6,g,[0,.15,0]);rim.rotation.x=Math.PI/2;cyl(g,.057,.057,.01,[0,-.15,0],0xf0d59b);textPlane(g,'DAY',.10,.10,[0,0,.076],{bg:'#e7c586',fg:'#6e784f',font:230});
    }else {box(g,[.24,.32,.13],[0,0,0],0xa39bcb);textPlane(g,'CRUNCH\nSNACKS',.21,.27,[0,0,.067],{bg:'#a39bcb',fg:'#fff5d4',font:135});box(g,[.245,.014,.135],[0,.16,0],0xcac1e3);}
    return g;
  }
  setItem(item){
    if(!this.itemCache.has(item.id))this.itemCache.set(item.id,this.makeItem(item,new T.Group()));
    const blueprint=this.itemCache.get(item.id);this.held.clear();this.trash.clear();this.held.add(blueprint.clone(true));this.trash.add(blueprint.clone(true));
  }
  setStage(stage,index) {
    this.stage=stage;this.stageIndex=index;clearEnvironment(this.environment);clearEnvironment(this.binGroup);this.people=[];
    const e=this.environment,r=stage.radius;
    const outdoor=stage.place!=='office',roof=stage.place==='roof';
    this.scene.background.set(outdoor?0xc3d8d7:0xdce7de);this.scene.fog.color.copy(this.scene.background);
    box(e,[32,.16,42],[0,-.09,-6],outdoor?(roof?0xc9c8b8:0xa6b98a):0xd6c6a8);
    if(!outdoor){
      // Warm, low-poly office. Open ceiling lets the light and high shots breathe.
      box(e,[.18,4,20],[-6.8,2,-5],0xe1e6d7);box(e,[.18,4,20],[6.8,2,-5],0xe7e4d3);box(e,[13.5,4,.18],[0,2,-13.2],0xe1e6d7);
      for(let x=-6;x<=6;x+=1.25)box(e,[.017,.008,25],[x,.003,-7],0xbdaf94);
      for(let z=-16;z<6;z+=1.25)box(e,[14,.007,.014],[0,.003,z],0xc1b297);
      for(let x of [-4.6,-2.3,0,2.3,4.6]){
        box(e,[1.98,1.93,.045],[x,2.12,-13.08],0xaec9bb,{roughness:.4});
        box(e,[2.09,.07,.10],[x,3.1,-13.02],palette.white);box(e,[2.09,.10,.22],[x,1.14,-12.99],palette.white);box(e,[.055,1.9,.1],[x,2.15,-13.0],palette.white);
        box(e,[.7,1.4,.05],[x-.25,1.85,-13.04],0xc8d8c9);
      }
      table(e,-4,-3,.15);table(e,4,-4,-.15);table(e,-3.8,-9);table(e,3.7,-9);
      chair(e,-4,-1.8,Math.PI);chair(e,4,-2.9,Math.PI);chair(e,-3.8,-7.8,Math.PI);chair(e,3.7,-7.8,Math.PI);
      plant(e,-5.6,-7.2,1.6);plant(e,5.5,-10,1.7);plant(e,2.7,-12,1.1);
      box(e,[.3,2.1,2.4],[6.45,1.05,-8.7],0xc8b58d);for(let y of [.15,.9,1.6])box(e,[.36,.055,2.5],[6.35,y,-8.7],palette.wood);
      for(let i=0;i<9;i++)box(e,[.21,.5,.13],[6.25,1.18,-9.6+i*.19],i%2?0x7d9c87:0xe0aa7a);
      textPlane(e,'LESS WASTE.\nMORE GOOD.',1.5,1.9,[-6.66,2.05,-6.2],{bg:'#eddbac',fg:'#497557',font:112,rotate:Math.PI/2});
      // Sun patches on floor, alongside real object shadows.
      for(let i=0;i<5;i++){const patch=box(e,[1.1,.004,3],[i*1.8-3.7,.005,-10],0xe7dbad);patch.rotation.y=-.45;patch.receiveShadow=true;}
    }else if(!roof){
      box(e,[4.7,.03,30],[0,.005,-8],0xdbcfaf);for(let z=3;z>-20;z-=1.45)box(e,[4.72,.012,.025],[0,.026,z],0xb7b89a);
      for(let side of [-1,1]){bench(e,side*4.1,-4,side<0?Math.PI/2:-Math.PI/2);bench(e,side*4.1,-12,side<0?Math.PI/2:-Math.PI/2);for(let i=0;i<5;i++)tree(e,side*(6.5+i%2),-i*4.5+1,.9+(i%3)*.16);}
      for(let i=0;i<18;i++)sphere(e,.12,[Math.sin(i*6)*8,.08,-i*1.3],i%2?0xdab77e:0x7e9872,0);
      textPlane(e,'TAKE A BREATH.',2.1,.5,[0,2.6,-15],{bg:'#809876',fg:'#f4edce',font:90});
    }else{
      for(let z=-20;z<4;z+=1.1)box(e,[26,.008,.015],[0,.006,z],0xb1b6a5);
      for(let x=-12;x<=12;x+=1.1)box(e,[.015,.008,26],[x,.006,-8],0xb5baaa);
      for(let side of [-1,1]){box(e,[.16,1.1,27],[side*8,.55,-7],0xb1beb2);for(let i=0;i<4;i++){cyl(e,.6,.55,.9,[side*6.4,.45,-i*3.8],0x9caea1);plant(e,side*6.4,-i*3.8,1.4);}}
      box(e,[16,1.1,.15],[0,.55,-19],0xb1beb2);
      for(let i=0;i<22;i++){let x=(i-11)*2.4,h=2+(i*7%9)*.7;box(e,[1.4,h,1.4],[x,h/2-2,-23-Math.abs(Math.sin(i))*8],i%2?0xb4c5be:0x9eb6b0);}
      bench(e,-5,-4,.12);box(e,[1.4,.7,1.0],[5,.35,-9],0xb3b9aa);for(let i=0;i<8;i++)box(e,[1.2,.012,.04],[5,.72,-9.35+i*.1],0x83968a);
    }
    // The render mesh and the compound collision body share the same bin dimensions.
    const binColor=outdoor?0x4d7961:0x6c8e78;
    const wall=new T.CylinderGeometry(r+.01,r-.06,BIN_HEIGHT,48,1,true);
    mesh(wall,binColor,this.binGroup,[0,BIN_HEIGHT/2,0],{side:T.DoubleSide});
    cyl(this.binGroup,r-.045,r-.045,.07,[0,.055,0],0x324e3d,36);
    const rim=mesh(new T.TorusGeometry(r,.045,10,64),0x2e5140,this.binGroup,[0,BIN_HEIGHT,0]);rim.rotation.x=Math.PI/2;
    const base=mesh(new T.TorusGeometry(r-.05,.023,8,48),0x365b45,this.binGroup,[0,.07,0]);base.rotation.x=Math.PI/2;
    for(let i=0;i<28;i++){const a=i/28*Math.PI*2;const slat=box(this.binGroup,[.018,.88,.015],[Math.cos(a)*(r-.006),.51,Math.sin(a)*(r-.006)],0x567b64);slat.rotation.y=-a;}
    textPlane(this.binGroup,'↗',.31,.31,[0,.61,r+.018],{bg:'#6c8e78',fg:'#e3eac2',font:420});
    const badge=new T.Mesh(new T.CircleGeometry(.20,24),mat(0xdce6b5));badge.position.set(0,.60,r+.01);this.binGroup.add(badge);textPlane(this.binGroup,'BIN',.27,.16,[0,.60,r+.024],{bg:'#dce6b5',fg:'#41664b',font:240});
    if(stage.binMove){const rail=box(e,[stage.binMove*2+1.6,.035,.08],[0,.025,-stage.distance],0x7e9a7b);for(let x of [-stage.binMove-1,stage.binMove+1])box(e,[.06,.03,.35],[x,.025,-stage.distance],palette.orange);}
    const startRing=mesh(new T.TorusGeometry(.55,.012,5,48),0xe5cf8f,e,[0,.012,.1]);startRing.rotation.x=-Math.PI/2;
    for(let i=0;i<(stage.people||0);i++)this.people.push(person(e,i));
    // Floor marking makes the target readable in every environment.
    const marking=mesh(new T.RingGeometry(r+.18,r+.195,64),0xedda9f,e,[0,.015,-stage.distance],{side:T.DoubleSide});marking.rotation.x=-Math.PI/2;
    this.updateEnvironment(0);this.particles.forEach(p=>this.scene.remove(p.m));this.particles=[];
  }
  updateEnvironment(t){
    const stage=this.stage,b=binAt(stage,t);this.binGroup.position.set(b.x,0,b.z);
    this.people.forEach((p,i)=>{const at=personAt(stage,t,i);p.g.position.set(at.x,0,at.z);const ahead=personAt(stage,t+.02,i);p.g.rotation.y=ahead.x>at.x?Math.PI/2:-Math.PI/2;p.limbs.forEach((limb,j)=>limb.rotation.x=Math.sin(t*6+i+j%2*Math.PI)*.45);});
    const wind=windAt(stage,t);this.windLines.visible=Math.hypot(wind.x,wind.z)>.8;
    this.windLines.children.forEach((l,i)=>{const s=l.userData.seed;l.position.set(((s*13+t*wind.x*.5)%16+16)%16-8,.5+(s*7%3.5),-((s*11+t*.8)%17));l.rotation.y=-Math.atan2(wind.z,wind.x);});
  }
  update({time,mode,aim,body,flight,home=false,replay=false,view=0}) {
    this.updateEnvironment(time);const p=playerAt(this.stage,time),b=binAt(this.stage,time);
    this.trash.visible=!!body;
    if(body){this.trash.position.copy(body.position);this.trash.quaternion.copy(body.quaternion);}
    this.hand.visible=mode==='aim'&&!home&&!replay;
    this.guide.visible=mode==='aim'&&!home&&!replay&&this.showGuide;
    if(home){
      const portrait=innerWidth<600&&innerHeight>innerWidth;
      this.camera.position.set(portrait?2.9:3.6,portrait?2.75:2.5,portrait?1.0:1.1);
      this.camera.lookAt(portrait?0:0.2,.8,portrait?-4:-4.6);
    }else if(replay&&view===0&&body){
      this.camera.position.set(b.x+2.5,2.1,b.z+2.5);this.camera.lookAt(body.position.x,Math.max(.45,body.position.y),body.position.z);
    }else{
      let y=1.67+(this.reduced?0:(this.stage.playerMove?Math.sin(time*3.2)*.018:Math.sin(time*.9)*.005));
      this.camera.position.set(p.x,y,0);
      if(replay){this.camera.lookAt(body.position.x,Math.max(.7,body.position.y),body.position.z);}
      else if(mode==='flight'||mode==='result'){
        const focus=body?.position||new T.Vector3(b.x,1,b.z);const blend=mode==='result'?.72:.50;
        this.camera.lookAt(p.x+(focus.x-p.x)*blend,1.25+(focus.y-1.25)*.37,b.z*.80);
      }else {
        this.camera.rotation.order='YXZ';this.camera.rotation.set(-.08+aim.pitch*.004,-aim.yaw*Math.PI/180,0);
        this.hand.rotation.set(0,0,-aim.spin*.001);this.hand.position.y=Math.sin(time*1.8)*.006;
      }
    }
    if(this.shake>0&&!this.reduced){this.camera.position.x+=(Math.random()-.5)*this.shake*.035;this.camera.position.y+=(Math.random()-.5)*this.shake*.035;this.shake*=.9;}
    this.camera.updateMatrixWorld();
  }
  setGuide(points){this.dots.forEach((d,i)=>{d.visible=!!points[i];if(points[i])d.position.copy(points[i]);});}
  burst(position,clean=true){
    this.shake=clean?.8:.35;
    for(let i=0;i<42;i++){
      const m=box(this.scene,[.045,.02,.075],[position.x,1.1,position.z],[0xeec262,0xec7953,0xc5dfa7,0xfff1b6][i%4]);
      m.castShadow=false;this.particles.push({m,v:new T.Vector3((Math.random()-.5)*3,1.5+Math.random()*2,(Math.random()-.5)*3),life:1.8+Math.random()*.8});
    }
    this.ringPulse.position.set(position.x,.045,position.z);this.pulse=1;
  }
  effects(dt){
    this.particles=this.particles.filter(p=>{p.life-=dt;p.v.y-=4*dt;p.m.position.addScaledVector(p.v,dt);p.m.rotation.x+=dt*3;p.m.rotation.z+=dt*4;p.m.scale.setScalar(Math.max(0,Math.min(1,p.life)));if(p.life<0){this.scene.remove(p.m);return false;}return true;});
    if(this.pulse>0){this.pulse=Math.max(0,this.pulse-dt*.8);this.ringPulse.scale.setScalar(1+(1-this.pulse)*2);this.ringPulse.material.opacity=this.pulse*.6;}
  }
  render(){this.renderer.render(this.scene,this.camera);}
}
