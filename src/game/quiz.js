// データ図鑑とボスの「データ攻撃」（クイズ）
// 流れ：県に初めて入る → その県のデータを図鑑に記録 → ボスがそのエリアのデータからクイズを出す
// データは src/data/kakei.js（総務省「家計調査」、scripts/build-kakei.py で生成）
import { KAKEI } from '../data/kakei.js';
import { PREF_TILES } from '../data/prefectures.js';

/*
 * 県に入ったときに覚えるデータ：県名 → 品目（KAKEI のキー）
 * 今は北海道・東北だけ。ほかのエリアもここに足せばクイズが出るようになる。
 */
const FACTS = {
  北海道: ['さけ', 'ほたて貝', 'さんま'],
  青森: ['りんご', 'ほたて貝', 'こんにゃく'],
  岩手: ['中華麺', 'わかめ', '納豆'],
  宮城: ['かまぼこ', 'わかめ', '中華そば'],
  秋田: ['清酒', '乾うどん・そば', 'さんま'],
  山形: ['中華そば', 'こんにゃく', '中華麺'],
  福島: ['桃', '納豆', '清酒'],
};

/** 品目ごとの順位表（支出の多い順）。[[県名, 円], ...] */
const ranking = (item) => Object.entries(KAKEI[item].values).sort((a, b) => b[1] - a[1]);
const rankOf = (item, pref) => ranking(item).findIndex(([p]) => p === pref) + 1;
const yen = (n) => n.toLocaleString() + '円';

/** 県の名前で、図鑑に載るデータがあるか */
export const hasFacts = (pref) => !!FACTS[pref];

/** 図鑑・会話に出す1行。例：「りんご　8,246円（全国1位）」 */
export function factLine(pref, item) {
  const r = rankOf(item, pref);
  const top = ranking(item)[0][0];
  return `${KAKEI[item].label}　${yen(KAKEI[item].values[pref])}（全国${r}位${r > 1 ? `・1位は${top}` : ''}）`;
}

/** 県に初めて入ったときの会話 */
export function learnLines(pref) {
  const items = FACTS[pref] || [];
  return [
    `〔データ図鑑〕${pref}のデータを記録した！\n1世帯が1年に使うお金（県庁所在地）`,
    items.map((it) => '・' + factLine(pref, it)).join('\n'),
  ];
}

/** 図鑑のページ：記録した県ごとに行をまとめる */
export function zukanPages(learned) {
  return Object.keys(FACTS)
    .filter((p) => learned.includes(p))
    .map((p) => ({ pref: p, lines: FACTS[p].map((it) => factLine(p, it)) }));
}
export const ZUKAN_TOTAL = Object.keys(FACTS).length;

const shuffle = (a) => {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
};

/**
 * エリアのボスが出すクイズ。{ q: 問題文, choices: [県名...], answer: 県名, reveal: 正解の説明 }
 * - その県が1位の品目 → 「いちばん多いのは？」（選択肢は1〜4位の県）
 * - その県が2位以下の品目 → 「〇〇と1位の県、多いのはどっち？」
 */
export function quizFor(regionId) {
  const prefs = PREF_TILES.filter((t) => t.region === regionId && FACTS[t.name]).map((t) => t.name);
  const facts = prefs.flatMap((pref) => FACTS[pref].map((item) => ({ pref, item })));
  // エリア内に1位の県がある品目は「いちばん多いのは？」の1問だけにする
  const tops = new Set(facts.filter(({ pref, item }) => ranking(item)[0][0] === pref).map((f) => f.item));
  const seen = new Set();
  const qs = [];
  for (const { pref, item } of facts) {
    const rank = ranking(item);
    const label = KAKEI[item].label;
    const [top, topYen] = rank[0];
    if (seen.has(item) || (top !== pref && tops.has(item))) continue;
    seen.add(item);
    if (top === pref) {
      qs.push({
        q: `「${label}」にいちばんお金を使う県は？`,
        choices: shuffle(rank.slice(0, 4).map(([p]) => p)),
        answer: top,
        reveal: `正解は${top}！ 1年に${yen(topYen)}で全国1位だ。`,
      });
    } else {
      qs.push({
        q: `「${label}」にお金を使うのは、${pref}と${top}のどっち？`,
        choices: shuffle([pref, top]),
        answer: top,
        reveal: `正解は${top}！ ${top}は${yen(topYen)}、${pref}は${yen(KAKEI[item].values[pref])}。`,
      });
    }
  }
  return shuffle(qs);
}
