// セーブデータ（localStorage）と戦闘報酬の計算
import { REGIONS, enemyLevel, need } from '../data/prefectures.js';
import { START, walkable, castles } from './world.js';

const KEY = 'gotochi-ran-rpg-v2'; // 47県版（v1）とは城の id が違うので別のキーにする

// 地図を作り直したら数字を上げる。古い地図の位置は使えないので、最後に制覇した城の前から再開する
const MAP_VERSION = 3; // 3：離島をなくした地図

// 主人公の最初のレベル。開発中（npm run dev）だけは、北海道の城のボス（Lv3）に楽に勝てる Lv6 から始める
// 本番（npm run build / Vercel）では import.meta.env.DEV が false になるので、通常どおり Lv3
const START_LV = import.meta.env.DEV ? 6 : 3;

export const fresh = () => ({ heroLv: START_LV, exp: 0, cleared: [], party: [], learned: [], pos: { ...START }, dir: 'down', mapVer: MAP_VERSION });

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
      // 離島編をなくしたので、もう無い城（id が 7 以上）の制覇と仲間は消す
      o.cleared = o.cleared.filter((id) => id < REGIONS.length);
      o.party = (o.party || []).filter((id) => id < REGIONS.length);
      if (o.mapVer !== MAP_VERSION || !o.pos || !walkable(o.pos.x, o.pos.y)) {
        const last = o.cleared.length ? Math.max(...o.cleared) : -1;
        o.pos = { ...(last >= 0 && castles[last] ? castles[last].spawn : START) };
        o.mapVer = MAP_VERSION;
      }
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

/** 次に攻略する地方のid（全制覇なら REGIONS.length） */
export const nextOf = (s) => {
  for (let i = 0; i < REGIONS.length; i++) if (!s.cleared.includes(i)) return i;
  return REGIONS.length;
};

/** 勝ったときの経験値・レベルアップ・仲間加入を先に計算しておく */
export function rewardFor(save, foe) {
  const p = REGIONS[foe.pid];
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
