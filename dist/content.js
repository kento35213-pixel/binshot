export const ITEMS = [
  { id: 'paper', name: '丸めた紙', en: 'PAPER BALL', mass: .012, area: .003, drag: .72, radius: .105, shape: 'sphere', bounce: .32, color: '#f5efe1', size: [.105], spin: 1.1, note: '素直な軌道。まずはこれで感覚を。' },
  { id: 'bottle', name: 'ペットボトル', en: 'PET BOTTLE', mass: .028, area: .004, drag: .72, radius: .09, shape: 'bottle', bounce: .4, color: '#89d8d0', size: [.067, .23, .067], spin: 1.5, note: '縦長で跳ねやすい。回転と縁に注意。' },
  { id: 'can', name: '空き缶', en: 'EMPTY CAN', mass: .018, area: .002, drag: .52, radius: .075, shape: 'cylinder', bounce: .52, color: '#f46b4e', size: [.07, .145, .07], spin: 1.25, note: '風に強め。縁に当たるとよく跳ねる。' },
  { id: 'tissue', name: 'ティッシュ', en: 'SOFT TISSUE', mass: .006, area: .0013, drag: 1.15, radius: .1, shape: 'sphere', bounce: .06, color: '#fff9ef', size: [.105], spin: .65, note: '軽くて風に流される。少し強めに。' },
  { id: 'cup', name: '紙コップ', en: 'PAPER CUP', mass: .016, area: .004, drag: .82, radius: .09, shape: 'cylinder', bounce: .22, color: '#e8be72', size: [.085, .16, .085], spin: 1.0, note: 'ふわっと減速。山なり投げも試そう。' },
  { id: 'carton', name: 'お菓子の空き箱', en: 'SNACK BOX', mass: .035, area: .007, drag: .9, radius: .12, shape: 'box', bounce: .24, color: '#a29cde', size: [.12, .16, .065], spin: 1.35, note: '面で風を受ける。姿勢でも軌道が変わる。' },
];
export const STAGES = [
  { name: 'あと一歩の距離', tag: 'THE FIRST TOSS', place: 'office', distance: 3.6, radius: .57, wind: 0, goal: 2, shots: 8, tip: '上の弧は最初の目安。左右を合わせて、強さを微調整。' },
  { name: '午後のオフィス', tag: 'A LITTLE FURTHER', place: 'office', distance: 4.7, radius: .54, wind: 0, goal: 2, shots: 8, tip: '距離が伸びた。投げる角度と強さを組み合わせよう。' },
  { name: '窓、開いてます', tag: 'CROSSWIND', place: 'office', distance: 4.9, radius: .54, wind: 2.3, goal: 2, shots: 9, tip: '矢印は風の向き。軽いゴミほど風上を狙おう。' },
  { name: 'ちょっと通ります', tag: 'EXCUSE ME', place: 'office', distance: 5.0, radius: .53, wind: .7, people: 1, goal: 2, shots: 9, tip: '人の動きを見て、投げる瞬間を選ぼう。' },
  { name: '公園の昼下がり', tag: 'OPEN AIR', place: 'park', distance: 5.8, radius: .53, wind: 3.2, gust: 1.3, goal: 2, shots: 9, tip: '風は少しずつ変わる。投げた後の風も軌道に効く。' },
  { name: '逃げるゴミ箱', tag: 'MOVING TARGET', place: 'park', distance: 5.6, radius: .52, wind: 1.1, binMove: 1.35, binRate: .8, goal: 2, shots: 9, tip: 'ゴミ箱の少し先へ。到着する瞬間の位置を読む。' },
  { name: '歩きながら失礼', tag: 'ON THE MOVE', place: 'park', distance: 5.5, radius: .52, wind: 1.6, playerMove: .95, goal: 2, shots: 10, tip: 'あなたも左右に移動中。投げた瞬間の移動速度も乗る。' },
  { name: '公園ラッシュ', tag: 'CROWDED AFTERNOON', place: 'park', distance: 6.2, radius: .51, wind: 2.3, people: 2, binMove: .8, binRate: .65, goal: 3, shots: 12, tip: '2人の間を狙うか、山なりで上を越えるか。' },
  { name: '屋上の向かい風', tag: 'ROOFTOP', place: 'roof', distance: 6.6, radius: .51, wind: 3.7, gust: 1.5, headwind: 2.3, goal: 2, shots: 10, tip: '向かい風は飛距離を削る。低く速い投げ方も有効。' },
  { name: 'すれ違う世界', tag: 'RELATIVE MOTION', place: 'roof', distance: 6.5, radius: .5, wind: 2.7, binMove: 1.4, binRate: .9, playerMove: 1.0, goal: 3, shots: 12, tip: '動く自分、動く箱。止まる瞬間を待つのも作戦。' },
  { name: '最後の一投の前に', tag: 'ALMOST IMPOSSIBLE', place: 'roof', distance: 7.2, radius: .48, wind: 4.0, gust: 1.7, people: 2, binMove: 1.2, binRate: .7, goal: 3, shots: 13, tip: '風・人・移動を一つずつ読む。投げ急がないこと。' },
  { name: 'ゴミ投げの美学', tag: 'THE PERFECT TOSS', place: 'roof', distance: 7.4, radius: .48, wind: 4.3, gust: 2, people: 2, binMove: 1.6, binRate: 1, playerMove: .9, goal: 3, shots: 14, tip: 'ここまでの感覚を、この一投に。' },
];
export const STYLES = [
  { name: 'オーバー', en: 'OVERHAND', angle: 44, release: 1.48, speed: 1, spin: 1, note: '標準。狙いと強さを素直に伝える。' },
  { name: '山なり', en: 'HIGH ARC', angle: 61, release: 1.42, speed: 1.05, spin: .7, note: '高い弧で人を越える。風には流されやすい。' },
  { name: 'アンダー', en: 'UNDERHAND', angle: 48, release: .92, speed: 1.05, spin: .6, note: '下からふわっと。低い位置から投げる。' },
  { name: 'ライナー', en: 'FASTBALL', angle: 22, release: 1.51, speed: 1.16, spin: 1.5, note: '低く速く。遠いゴミ箱には角度も足そう。' },
];
export const clamp = (x,a,b) => Math.max(a,Math.min(b,x));
export function itemSequence(previous, random = Math.random) {
  const pool = ITEMS.map((_,i)=>i).filter(i=>i!==previous);
  return pool[Math.floor(random()*pool.length)];
}
