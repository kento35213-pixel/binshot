import {ITEMS,STAGES,STYLES,clamp} from './content.js';
import {Simulation,STEP,releaseFor,previewArc,windAt,binAt,playerAt} from './physics.js';
import {View} from './scene.js';

const $=id=>document.getElementById(id);
const show=(id,yes=true)=>$(id).classList.toggle('hidden',!yes);
let saved={unlocked:0,best:{},sound:true,slow:true};
try{saved={...saved,...JSON.parse(localStorage.getItem('binshot-v1')||'{}')};}catch{}
saved.unlocked=clamp(Number(saved.unlocked)||0,0,STAGES.length-1);
function persist(){try{localStorage.setItem('binshot-v1',JSON.stringify(saved));}catch{}}
let audio;
function initAudio(){try{audio??=new (window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume();}catch{}}
function tone(freq,duration,type='sine',volume=.1,delay=0,end=freq){
  if(!saved.sound||!audio)return;
  const o=audio.createOscillator(),g=audio.createGain(),at=audio.currentTime+delay;
  o.type=type;o.frequency.setValueAtTime(freq,at);o.frequency.exponentialRampToValueAtTime(Math.max(10,end),at+duration);
  g.gain.setValueAtTime(.0001,at);g.gain.exponentialRampToValueAtTime(volume,at+.012);g.gain.exponentialRampToValueAtTime(.0001,at+duration);o.connect(g);g.connect(audio.destination);o.start(at);o.stop(at+duration+.03);
}
function scoreSound(){[523.25,659.25,783.99,1046.5].forEach((f,i)=>tone(f,.35,'sine',.12,i*.075));tone(70,.4,'triangle',.18,0,40);}
function toast(message){$('toast').textContent=message;show('toast');clearTimeout(toast.timer);toast.timer=setTimeout(()=>show('toast',false),2300);}
let view;
try{view=new View($('world'));}catch(e){$('loadMessage').textContent='3Dを起動できませんでした。WebGL対応のSafari / Chromeで開いてください。';throw e;}

const state={mode:'home',stageIndex:0,practice:false,config:null,sim:null,itemIndex:0,previousItem:-1,bag:[],aim:{style:0,power:30,yaw:0,pitch:0,spin:0},swipe:false,shots:0,makes:0,points:0,streak:0,record:[],lastRecord:null,slow:0,slowUsed:false,scoreAt:null,modal:false,gesture:null,replayTime:0,replayPlaying:true,replayView:0,practiceItem:'random',practiceWind:null,practiceMotion:true,practiceGuide:true};
function randomBag(){let a=ITEMS.map((_,i)=>i);for(let i=a.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}if(a[a.length-1]===state.previousItem)[a[0],a[a.length-1]]=[a[a.length-1],a[0]];return a;}
function nextItem(first=false){
  if(state.practice&&state.practiceItem!=='random')state.itemIndex=Number(state.practiceItem);
  else if(first&&!state.practice&&state.stageIndex===0)state.itemIndex=0;
  else{if(!state.bag.length)state.bag=randomBag();state.itemIndex=state.bag.pop();if(state.itemIndex===state.previousItem){if(!state.bag.length)state.bag=randomBag();state.itemIndex=state.bag.pop();}}
  state.previousItem=state.itemIndex;view.setItem(ITEMS[state.itemIndex]);
  $('trashNumber').textContent=String(state.itemIndex+1).padStart(2,'0');
  const item=ITEMS[state.itemIndex];$('trashEn').textContent=item.en;$('trashName').textContent=item.name;$('trashNote').textContent=item.note;$('trashWeight').textContent=`${Math.round(item.mass*1000)} g`;$('trashDrag').textContent=`空気抵抗 ${item.drag>.95?'大':item.drag>.7?'中':'小'}`;
}
function setMode(mode){state.mode=mode;document.body.classList.toggle('flight',mode==='flight');document.body.classList.toggle('result',mode==='result');document.body.classList.toggle('replaying',mode==='replay');show('home',mode==='home');show('hud',!['home','replay'].includes(mode));show('pause',mode!=='home');show('replayUI',mode==='replay');show('resultActions',mode==='result');$('throw').disabled=mode!=='aim';}
function aimUI(){
  const a=state.aim;for(let key of ['power','yaw','pitch','spin'])$(key).value=a[key];
  $('powerValue').textContent=Math.round(a.power);$('yawValue').textContent=`${a.yaw>0?'+':''}${a.yaw.toFixed(1)}°`;$('pitchValue').textContent=`${(STYLES[a.style].angle+a.pitch).toFixed(1)}°`;$('spinValue').textContent=`${a.spin>0?'+':''}${a.spin}`;
  [...$('styles').children].forEach((b,i)=>b.classList.toggle('active',a.style===i));$('styleNote').textContent=STYLES[a.style].note;
  $('inputMode').textContent=state.swipe?'操作：スワイプ':'操作：調整';
  $('aimHint').textContent=state.swipe?'画面を上向きスワイプして投げる。速さ・方向・長さが効く。':'画面をドラッグで照準 · 強さを調整して投げる';
}
STYLES.forEach((s,i)=>{const b=document.createElement('button');b.textContent=s.name;b.title=s.note;b.addEventListener('click',()=>{if(state.mode!=='aim')return;state.aim.style=i;aimUI();});$('styles').append(b);});
for(let key of ['power','yaw','pitch','spin'])$(key).addEventListener('input',e=>{state.aim[key]=Number(e.target.value);aimUI();});
$('inputMode').onclick=()=>{state.swipe=!state.swipe;aimUI();};
$('guide').onchange=()=>view.showGuide=$('guide').checked;
$('sound').onclick=()=>{saved.sound=!saved.sound;persist();updateSound();initAudio();if(saved.sound)tone(660,.1);};
function updateSound(){$('sound').textContent=saved.sound?'♪':'♩';$('sound').style.opacity=saved.sound?'1':'.5';$('sound').setAttribute('aria-label',saved.sound?'サウンドをオフ':'サウンドをオン');}
updateSound();
function loadStage(index,practice=false){
  closeModal();state.stageIndex=index;state.practice=practice;state.config={...STAGES[index]};
  if(practice){if(state.practiceWind!==null){state.config.wind=state.practiceWind;state.config.gust=0;state.config.headwind=0;}if(!state.practiceMotion){state.config.binMove=0;state.config.playerMove=0;state.config.people=0;}}
  state.sim=new Simulation(state.config);state.shots=0;state.makes=0;state.points=0;state.streak=0;state.bag=[];state.previousItem=-1;state.scoreAt=null;state.lastRecord=null;
  state.aim={style:0,power:Math.round(clamp(24+index*3.4,20,70)),yaw:0,pitch:0,spin:0};
  view.setStage(state.config,index);nextItem(true);view.trash.visible=false;view.showGuide=$('guide').checked;
  $('stageTag').textContent=STAGES[index].tag;$('stageName').textContent=STAGES[index].name;$('stageGoal').textContent=STAGES[index].tip;$('modeBadge').textContent=practice?'FREE PLAY':`STAGE ${String(index+1).padStart(2,'0')}`;
  $('goal').textContent=practice?'∞':state.config.goal;show('freeSettings',practice);show('throwMessage',false);show('slowTag',false);updateHUD();aimUI();setMode('aim');initAudio();
  if(!practice&&index===0&&!saved.helpSeen){saved.helpSeen=true;persist();setTimeout(()=>{if(state.mode==='aim')helpModal();},500);}
}
function updateHUD(){
  $('makes').textContent=state.makes;$('remaining').textContent=state.practice?'∞':Math.max(0,state.config.shots-state.shots);
  $('combo').textContent=state.streak>1?`${state.streak} IN A ROW · ${state.points} pts`:state.points?`${state.points} pts`:'';
}
function goHome(){closeModal();setMode('home');state.sim=new Simulation(STAGES[0]);state.config=STAGES[0];view.setStage(STAGES[0],0);view.setItem(ITEMS[0]);show('throwMessage',false);show('slowTag',false);state.gesture=null;$('gesturePath').setAttribute('d','');}
$('logo').onclick=()=>{if(state.mode==='home')return;pauseModal();};
$('start').onclick=()=>loadStage(saved.unlocked,false);
$('free').onclick=()=>freeModal(false);
$('chooseStage').onclick=()=>stageModal(false);
function launch(swipe){
  if(state.mode!=='aim'||state.modal)return;
  initAudio();const item=ITEMS[state.itemIndex],release=releaseFor(state.config,state.sim.time,state.aim,item,swipe);
  state.shots++;state.scoreAt=null;state.slow=0;state.slowUsed=false;state.record=[];state.release={...release};state.hitCount=0;state.success=false;state.clean=false;
  state.sim.launch(item,release);state.sim.onImpact=(strength,group)=>{state.hitCount++;if(strength>1)tone(group===2?360:110,.1,'triangle',Math.min(.11,strength*.012),0,group===2?190:50);};
  state.sim.onScore=()=>{
    state.success=true;state.clean=state.sim.hits===0;state.makes++;state.streak++;state.scoreAt=state.sim.flight;state.slow=0;
    const points=(state.clean?150:100)+(state.streak-1)*25;state.points+=points;view.burst(binAt(state.config,state.sim.time),state.clean);scoreSound();
    if(navigator.vibrate)navigator.vibrate([25,25,45]);
    $('impactFlash').style.opacity='.65';setTimeout(()=>$('impactFlash').style.opacity='0',220);
    show('slowTag',false);message(state.clean?'NOTHING BUT BIN.':'OFF THE RIM.','NICE SHOT!',`${state.clean?'ノータッチで、すっぽり。':'跳ね返りを制した。'} +${points} pts`,false);updateHUD();
  };
  state.record.push(state.sim.snapshot());show('throwMessage',false);show('slowTag',false);setMode('flight');updateHUD();tone(220,.13,'triangle',.05,0,480);
}
$('throw').onclick=()=>launch();
function message(eyebrow,title,detail,miss){$('throwEyebrow').textContent=eyebrow;$('throwTitle').textContent=title;$('throwDetail').textContent=detail;$('throwMessage').classList.toggle('miss',miss);show('throwMessage');}
function finish(){
  if(!state.success){state.streak=0;const b=state.sim.body,target=binAt(state.config,state.sim.time),miss=Math.hypot(b.position.x-target.x,b.position.z-target.z);
    let detail=state.sim.humanHit?'通行人にコツン。次はタイミングを変えよう。':miss<state.config.radius+1.1?'あと少し。狙いか強さを、ほんのちょっと。':b.position.z>target.z?'手前に落ちた。強さを上げるか、角度を変えよう。':'奥へ抜けた。強さを少し下げてみよう。';
    message('ONE MORE TRY.',state.sim.humanHit?'おっと、失礼。':miss<state.config.radius+1.1?'惜しい！':'もう一投。',detail,true);tone(170,.2,'sine',.04,0,125);updateHUD();
  }
  show('slowTag',false);state.lastRecord={frames:state.record.map(f=>({...f})),itemIndex:state.itemIndex,success:state.success,stage:{...state.config}};
  if(!state.practice&&state.makes>=state.config.goal){
    saved.unlocked=Math.min(STAGES.length-1,Math.max(saved.unlocked,state.stageIndex+1));
    saved.best[state.stageIndex]=Math.max(saved.best[state.stageIndex]||0,state.points);persist();
    $('nextThrow').innerHTML=state.stageIndex===11?'全ステージクリア <span>→</span>':'次のステージ <span>→</span>';
  }else if(!state.practice&&state.shots>=state.config.shots)$('nextThrow').innerHTML='もう一度挑戦 <span>↺</span>';
  else $('nextThrow').innerHTML='次のゴミへ <span>→</span>';
  setMode('result');
}
$('nextThrow').onclick=()=>{
  if(!state.practice&&state.makes>=state.config.goal){clearModal();return;}
  if(!state.practice&&state.shots>=state.config.shots){retryModal();return;}
  state.sim.onScore=null;state.sim.onImpact=null;state.sim.world.removeBody(state.sim.body);state.sim.body=null;state.sim.scored=false;state.sim.entered=false;
  nextItem();view.trash.visible=false;show('throwMessage',false);setMode('aim');aimUI();
};
function openModal(html){cancelGesture();$('modalContent').innerHTML=html;show('modal');$('modalContent').parentElement.scrollTop=0;state.modal=true;$('modalClose').focus();}
function closeModal(){show('modal',false);state.modal=false;}
$('modalClose').onclick=closeModal;$('modal').addEventListener('pointerdown',e=>{if(e.target===$('modal'))closeModal();});
function helpModal(){openModal(`<div class="eyebrow">HOW TO PLAY</div><h2 id="modalTitle">ちょっとの差が、気持ちいい。</h2><p>ゴミ箱の中へ、下向きに落とせば成功。縁に当たっても、そのまま入ればOKです。</p><div class="help-grid"><div><b>01 / 狙いを合わせる</b><p>画面を左右・上下にドラッグ。下の「左右」「角度」でも微調整できます。</p></div><div><b>02 / 強さを決める</b><p>POWERを調整して「投げる」。最初は24%前後から。手前なら強め、奥なら弱めに。</p></div><div><b>03 / 投げ方を変える</b><p>山なりで人を越える、ライナーで風を切る。回転を加えるとわずかに曲がります。</p></div><div><b>04 / 指先で投げる</b><p>「操作：スワイプ」に切り替えて、画面を上へ。速さで強さ、長さで角度、横ずれで方向が変わります。</p></div></div><p><span class="key">Space</span> 投げる　<span class="key">← →</span> 左右　<span class="key">↑ ↓</span> 角度　<span class="key">＋ −</span> 強さ　<span class="key">1〜4</span> 投げ方　<span class="key">R</span> リプレイ　<span class="key">Esc</span> 一時停止<br>短い点線は出だしだけの目安。風や回転、衝突は最後まで物理演算されます。練習では環境やゴミを固定できます。</p><div class="modal-actions"><button class="primary" id="helpDone">さあ、投げよう ↗</button><button class="secondary" id="deployGuide">公開手順を見る →</button></div>`);$('helpDone').onclick=closeModal;$('deployGuide').onclick=()=>openModal($('deployInstructions').innerHTML);}
$('help').onclick=helpModal;
function pauseModal(){openModal(`<div class="eyebrow">TAKE A BREATH</div><h2 id="modalTitle">ひと息、つこう。</h2><div class="setting-row"><span>入りそうなときのスローモーション</span><input id="slowSetting" type="checkbox" ${saved.slow?'checked':''}></div><div class="setting-row"><span>サウンド</span><input id="soundSetting" type="checkbox" ${saved.sound?'checked':''}></div><p>ゲームは一時停止中です。</p><div class="modal-actions"><button class="primary" id="resume">プレーを続ける ↗</button><button class="secondary" id="restart">このステージをやり直す</button><button class="secondary" id="backHome">タイトルへ</button></div>`);$('slowSetting').onchange=e=>{saved.slow=e.target.checked;persist();};$('soundSetting').onchange=e=>{saved.sound=e.target.checked;updateSound();persist();};$('resume').onclick=closeModal;$('restart').onclick=()=>loadStage(state.stageIndex,state.practice);$('backHome').onclick=goHome;}
$('pause').onclick=pauseModal;
function stageModal(practice){
  openModal(`<div class="eyebrow">${practice?'FREE PLAY':'STAGE SELECT'}</div><h2 id="modalTitle">今日は、どこで投げる？</h2><p>${practice?'練習では全ステージを選べます。':'クリアすると次のステージが開きます。練習なら全ステージを体験できます。'}</p><div class="stage-grid">${STAGES.map((s,i)=>`<button class="stage-option ${saved.best[i]?'completed':''}" data-stage="${i}" ${!practice&&i>saved.unlocked?'disabled':''}><span>${String(i+1).padStart(2,'0')} ${!practice&&i>saved.unlocked?'· LOCKED':saved.best[i]?'· CLEAR':''}</span><strong>${s.name}</strong><small>${s.distance.toFixed(1)} m / ${s.place==='office'?'OFFICE':s.place==='park'?'PARK':'ROOFTOP'}</small></button>`).join('')}</div>`);
  $('modalContent').querySelectorAll('[data-stage]').forEach(b=>b.onclick=()=>loadStage(Number(b.dataset.stage),practice));
}
function freeModal(inGame){
  openModal(`<div class="eyebrow">NO PRESSURE. JUST PRACTICE.</div><h2 id="modalTitle">気がすむまで、もう一投。</h2><p>球数もクリア条件もなし。苦手なゴミや、動くゴミ箱を繰り返し練習できます。</p><div class="free-options"><label>ステージ<select id="practiceStage">${STAGES.map((s,i)=>`<option value="${i}" ${state.stageIndex===i?'selected':''}>${String(i+1).padStart(2,'0')} · ${s.name}</option>`).join('')}</select></label><label>投げるゴミ<select id="practiceItem"><option value="random">毎回ランダム</option>${ITEMS.map((s,i)=>`<option value="${i}" ${String(state.practiceItem)===String(i)?'selected':''}>${s.name}</option>`).join('')}</select></label><label>風<select id="practiceWind"><option value="stage">ステージの風</option><option value="0">無風</option><option value="2">右向き 2 m/s</option><option value="-2">左向き 2 m/s</option><option value="4">右向き 4 m/s</option></select></label><label>人・ゴミ箱・自分の動き<select id="practiceMotion"><option value="on">ステージどおり</option><option value="off" ${!state.practiceMotion?'selected':''}>止めて練習する</option></select></label></div><div class="modal-actions"><button class="primary" id="beginFree">練習をはじめる ↗</button>${inGame?'<button class="secondary" id="keepFree">いまの練習に戻る</button>':''}</div>`);
  $('practiceWind').value=state.practiceWind===null?'stage':String(state.practiceWind);
  $('beginFree').onclick=()=>{state.practiceItem=$('practiceItem').value;state.practiceWind=$('practiceWind').value==='stage'?null:Number($('practiceWind').value);state.practiceMotion=$('practiceMotion').value==='on';loadStage(Number($('practiceStage').value),true);};if(inGame)$('keepFree').onclick=closeModal;
}
$('freeSettings').onclick=()=>freeModal(true);
function clearModal(){
  const all=state.stageIndex===11;
  openModal(`<div class="stage-result"><div class="eyebrow" style="justify-content:center">${all?'YOU HAVE MASTERED THE EVERYDAY SPORT.':'ONE SMALL TOSS. ONE BIG WIN.'}</div><h2 id="modalTitle">${all?'ALL CLEAR!':'STAGE CLEAR!'}</h2><p>${all?'ゴミ投げの美学、ここに極まる。':'いい一投だった。次は、もう少しだけ難しく。'}</p><div class="result-stats"><div><strong>${state.makes}/${state.shots}</strong><span>成功 / 投球</span></div><div><strong>${Math.round(state.makes/state.shots*100)}%</strong><span>成功率</span></div><div><strong>${state.points}</strong><span>POINTS</span></div></div><div class="modal-actions"><button class="primary" id="advance">${all?'タイトルへ':'次のステージへ'} →</button><button class="secondary" id="clearReplay">↺ 最後の一投を見る</button></div></div>`);
  $('advance').onclick=()=>all?goHome():loadStage(state.stageIndex+1,false);$('clearReplay').onclick=()=>{closeModal();startReplay();};
}
function retryModal(){openModal(`<div class="eyebrow">A LITTLE BETTER, EVERY TOSS.</div><h2 id="modalTitle">あと${Math.max(0,state.config.goal-state.makes)}個、届かなかった。</h2><p>${state.shots}投で${state.makes}回成功。ゴミの種類によって強さを変えるのがコツ。練習モードで同じゴミを固定して試すこともできます。</p><div class="modal-actions"><button id="tryAgain" class="primary">もう一度挑戦 ↗</button><button id="retryFree" class="secondary">このステージを練習</button></div>`);$('tryAgain').onclick=()=>loadStage(state.stageIndex,false);$('retryFree').onclick=()=>loadStage(state.stageIndex,true);}
function startReplay(){if(!state.lastRecord){toast('投げた後にリプレイできます');return;}closeModal();state.replayTime=0;state.replayPlaying=true;state.replayView=0;$('replayCamera').textContent='視点：ゴミ箱カメラ';$('replayPlay').textContent='Ⅱ';show('throwMessage',false);setMode('replay');}
$('replay').onclick=startReplay;$('replayClose').onclick=()=>{setMode('result');show('throwMessage');};
$('replayCamera').onclick=()=>{state.replayView=1-state.replayView;$('replayCamera').textContent=state.replayView?'視点：プレイヤー':'視点：ゴミ箱カメラ';};
$('replayPlay').onclick=()=>{state.replayPlaying=!state.replayPlaying;if(state.replayTime>=state.lastRecord.frames.length-1)state.replayTime=0;$('replayPlay').textContent=state.replayPlaying?'Ⅱ':'▶';};
$('replayProgress').oninput=e=>{state.replayTime=Number(e.target.value)/1000*(state.lastRecord.frames.length-1);};

function cancelGesture(){state.gesture=null;$('gesturePath').setAttribute('d','');}
$('world').addEventListener('pointerdown',e=>{
  if(state.mode!=='aim'||state.modal)return;
  $('world').setPointerCapture(e.pointerId);state.gesture={id:e.pointerId,x:e.clientX,y:e.clientY,start:performance.now(),yaw:state.aim.yaw,pitch:state.aim.pitch,points:[[e.clientX,e.clientY]]};
});
$('world').addEventListener('pointermove',e=>{
  const g=state.gesture;if(!g||e.pointerId!==g.id)return;
  if(!state.swipe){state.aim.yaw=clamp(g.yaw+(e.clientX-g.x)/innerWidth*42,-32,32);state.aim.pitch=clamp(g.pitch-(e.clientY-g.y)/innerHeight*28,-16,17);aimUI();}
  else{g.points.push([e.clientX,e.clientY]);$('gesturePath').setAttribute('d',g.points.map((p,i)=>(i?'L':'M')+p.join(' ')).join(' '));}
});
$('world').addEventListener('pointerup',e=>{
  const g=state.gesture;if(!g||e.pointerId!==g.id)return;
  if(state.swipe){const dy=g.y-e.clientY,dx=e.clientX-g.x,elapsed=Math.max(.08,(performance.now()-g.start)/1000);if(dy>30){const speed=dy/innerHeight/elapsed;launch({x:clamp(dx/innerWidth*26,-12,12),y:clamp((dy/innerHeight-.25)*27,-7,11),speed:clamp((speed-.65)*15,-12,26)});}else toast('画面を上向きにスワイプして投げよう');}
  cancelGesture();
});
$('world').addEventListener('pointercancel',cancelGesture);
addEventListener('keydown',e=>{
  if(e.target instanceof HTMLInputElement||e.target instanceof HTMLSelectElement)return;
  if(e.code==='Escape'){if(state.modal)closeModal();else if(state.mode==='replay')$('replayClose').click();else if(state.mode!=='home')pauseModal();return;}
  if(state.modal)return;
  if(e.code==='KeyR'&&state.mode==='result'){startReplay();return;}
  if(state.mode!=='aim')return;
  if(['Space','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.code))e.preventDefault();
  if(e.code==='Space'&&!e.repeat)launch();
  const d=e.shiftKey ? .2 : 1;
  if(e.code==='ArrowLeft')state.aim.yaw=clamp(state.aim.yaw-d,-32,32);
  if(e.code==='ArrowRight')state.aim.yaw=clamp(state.aim.yaw+d,-32,32);
  if(e.code==='ArrowUp')state.aim.pitch=clamp(state.aim.pitch+d,-16,17);
  if(e.code==='ArrowDown')state.aim.pitch=clamp(state.aim.pitch-d,-16,17);
  if(e.key==='+'||e.key==='=')state.aim.power=clamp(state.aim.power+d,5,100);
  if(e.key==='-')state.aim.power=clamp(state.aim.power-d,5,100);
  if(['1','2','3','4'].includes(e.key))state.aim.style=Number(e.key)-1;
  aimUI();
});
// Dialog focus trap; closing restores native game controls without pointer lock.
document.addEventListener('keydown',e=>{if(!state.modal||e.key!=='Tab')return;const list=[...$('modal').querySelectorAll('button:not([disabled]),input,select,a[href]')];if(!list.length)return;const first=list[0],last=list.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}});

let last=performance.now(),accumulator=0,lastHud=0,hiddenPause=false;
document.addEventListener('visibilitychange',()=>{if(document.hidden){hiddenPause=true;}else{last=performance.now();accumulator=0;hiddenPause=false;if(state.mode==='flight'&&!state.modal)pauseModal();}});
function frame(now){
  requestAnimationFrame(frame);
  const realDt=Math.min(.05,Math.max(0,(now-last)/1000));last=now;
  if(hiddenPause)return;
  const sim=state.sim;
  if(!sim)return;
  if(state.mode==='replay'){
    const frames=state.lastRecord.frames;
    if(!state.modal&&state.replayPlaying)state.replayTime+=realDt/STEP*Number($('replaySpeed').value);
    if(state.replayTime>=frames.length-1){state.replayTime=frames.length-1;state.replayPlaying=false;$('replayPlay').textContent='▶';}
    const i=Math.floor(state.replayTime),f=state.replayTime-i,a=frames[i],b=frames[Math.min(i+1,frames.length-1)];
    const body={position:{x:a.p[0]+(b.p[0]-a.p[0])*f,y:a.p[1]+(b.p[1]-a.p[1])*f,z:a.p[2]+(b.p[2]-a.p[2])*f},quaternion:{x:a.q[0],y:a.q[1],z:a.q[2],w:a.q[3]}};
    view.update({time:a.t+(b.t-a.t)*f,mode:'replay',aim:state.aim,body,replay:true,view:state.replayView});$('replayProgress').value=state.replayTime/(frames.length-1)*1000;
  }else{
    if(!state.modal){
      if(state.mode==='flight'){
        if(!state.slowUsed&&saved.slow&&sim.nearBasket()){state.slow=.85;state.slowUsed=true;show('slowTag');tone(90,.35,'sine',.04);}
        if(state.slow>0){state.slow-=realDt;if(state.slow<=0)show('slowTag',false);}
        const scale=state.slow>0?.26:1;
        accumulator+=realDt*scale;
        let ticks=0;
        while(accumulator>=STEP&&ticks++<12&&state.mode==='flight'){
          sim.tick();state.record.push(sim.snapshot());accumulator-=STEP;
          if((state.success&&sim.flight-state.scoreAt>.75)||(!state.success&&sim.settled()))finish();
        }
      }else if(state.mode!=='result'){
        // Environment clock advances while aiming; no projectile outcome is decided here.
        sim.setTime(sim.time+realDt);accumulator=0;
      }
    }
    view.update({time:sim.time,mode:state.mode,aim:state.aim,body:sim.body,flight:sim.flight,home:state.mode==='home'});
    if(state.mode==='aim')view.setGuide(previewArc(state.config,sim.time,ITEMS[state.itemIndex],releaseFor(state.config,sim.time,state.aim,ITEMS[state.itemIndex])));
  }
  if(!state.modal)view.effects(realDt);
  if(now-lastHud>120&&state.mode!=='home'&&state.mode!=='replay'){
    const w=windAt(state.config,sim.time),speed=Math.hypot(w.x,w.z);$('windValue').textContent=speed.toFixed(1);$('windArrow').style.transform=`rotate(${-Math.atan2(w.z,w.x)*180/Math.PI}deg)`;$('windLabel').textContent=speed<.5?'ほぼ無風':w.z>1?'横風 + 向かい風':w.x>0?'右へ流れる風':'左へ流れる風';
    $('motionLabel').textContent=[state.config.binMove?'ゴミ箱が移動中':'',state.config.playerMove?'自分も移動中':'',state.config.people?'通行人あり':''].filter(Boolean).join(' / ');
    const p=playerAt(state.config,sim.time),b=binAt(state.config,sim.time);$('distanceLabel').textContent=`${Math.hypot(p.x-b.x,p.z-b.z).toFixed(1)} m`;lastHud=now;
  }
  view.render();
}
goHome();aimUI();requestAnimationFrame(frame);
requestAnimationFrame(()=>{setTimeout(()=>{$('loading').style.display='none';},220);});

// Read-only diagnostics for reproducible physics checks and support.
window.binshot={version:'1.0.0',get status(){return {mode:state.mode,stage:state.stageIndex+1,item:ITEMS[state.itemIndex].id,shots:state.shots,makes:state.makes,physicsStep:STEP,body:state.sim?.body?.position.toArray(),rendererCalls:view.renderer.info.render.calls,recordedFrames:state.record.length};}};
