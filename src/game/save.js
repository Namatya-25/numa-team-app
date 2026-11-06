// セーブデータ（localStorage）と戦闘報酬の計算
import { PREFS, enemyLevel, need } from '../data/prefectures.js';
import { START, walkable } from './world.js';

const KEY = 'gotochi-ran-rpg-v1';

export const fresh = () => ({ heroLv: 3, exp: 0, cleared: [], party: [], pos: { ...START }, dir: 'down' });

export function hasSaved() {
  try {
    return !!localStorage.getItem(KEY);
  } catch {
    return false;
  }
}

export function loadSave() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && Array.isArray(s.cleared)) {
      const o = { ...fresh(), ...s };
      if (!o.pos || !walkable(o.pos.x, o.pos.y)) o.pos = { ...START };
      return o;
    }
  } catch {
    /* 壊れたセーブは無視 */
  }
  return fresh();
}

export function persist(s) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* 保存できない環境では何もしない */
  }
}

/** 次に攻略する県のid（全制覇なら 47） */
export const nextOf = (s) => {
  for (let i = 0; i < PREFS.length; i++) if (!s.cleared.includes(i)) return i;
  return PREFS.length;
};

/** 勝ったときの経験値・レベルアップ・仲間加入を先に計算しておく */
export function rewardFor(save, foe) {
  const p = PREFS[foe.pid];
  const rematch = save.cleared.includes(foe.pid);
  const exp = foe.wild
    ? Math.max(1, enemyLevel(p) - 3) * 6
    : Math.round(enemyLevel(p) * 12 * (rematch ? 0.6 : 1));
  let lv = save.heroLv;
  let e = save.exp + exp;
  while (e >= need(lv)) {
    e -= need(lv);
    lv++;
  }
  return { exp, lv, rest: e, up: lv - save.heroLv, recruit: !foe.wild && !rematch };
}
