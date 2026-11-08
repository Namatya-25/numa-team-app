// 戦闘の初期化（味方と敵のステータスを作る）
import { REGIONS, HERO, enemyLevel, stats } from '../data/prefectures.js';

const makeUnit = (key, name, p, s, side, lv, skill, skillAll) => ({
  key, name, p, elem: p ? p.elem : null, side, lv,
  max: s.hp, hp: s.hp, atk: s.atk, def: s.def, spd: s.spd, sk: s.sk,
  cd: 0, guard: false, skill, skillAll,
});

/** foe = { pid: 地方id, wild: 雑魚戦かどうか } */
export function initBattle(foe, save) {
  const p = REGIONS[foe.pid];
  const L = save.heroLv;
  const units = [makeUnit('hero', HERO, null, stats(L, null, 1.2), 'ally', L, '縦断斬り')];
  save.party.forEach((id) => {
    const q = REGIONS[id];
    units.push(makeUnit('a' + id, q.chara, q, stats(L, q, 0.85), 'ally', L, q.food + '乱舞'));
  });

  const n = units.length;
  let enemy;
  if (foe.wild) {
    const el = Math.max(1, enemyLevel(p) - 3);
    const s = stats(el, p, 0.75);
    s.hp = Math.round(s.hp * (1 + 0.4 * (n - 1)));
    enemy = makeUnit('enemy', p.chara + 'の手下', p, s, 'enemy', el, p.food + '乱舞', p.food + 'の嵐');
  } else {
    const el = enemyLevel(p);
    const s = stats(el, p, 1);
    s.hp = Math.round(s.hp * (1 + 0.6 * (n - 1))); // 仲間が多いほど敵のHPも増える
    enemy = makeUnit('enemy', p.chara, p, s, 'enemy', el, p.food + '乱舞', p.food + 'の嵐');
  }
  units.push(enemy);

  return {
    units, enemy,
    lines: [], seq: 0, // メッセージ
    blink: 0, shake: 0, // 演出
    bento: 3,
    fleeTries: 0, // 「逃げる」を選んだ回数（2回目は必ず成功）
    phase: 'intro', // intro → input → exec → (input …) → end
    idx: 0, cur: 0, plans: [],
    waitA: null,
    gen: 0,
  };
}
