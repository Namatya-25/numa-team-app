// データ図鑑とボスの「データ攻撃」（クイズ）
// 流れ：道ばたの看板を調べる → 図鑑に記録 → ボスがそのエリアのデータからクイズを出す
// データは src/data/kakei.js（総務省「家計調査」、scripts/build-kakei.py で生成）
import { KAKEI } from '../data/kakei.js';
import { PREF_TILES } from '../data/prefectures.js';

/** 看板の種類。col は看板の板の色 */
export const SIGN_KINDS = {
  食べもの: { col: '#d9b56e' },
  'おやつ・飲みもの': { col: '#f2a3b8' },
  くらし: { col: '#9cc7e8' },
};

/*
 * 看板に書いてあるデータ：県名 → 看板の種類 → 品目（KAKEI のキー）
 * 今は北海道・東北だけ。ほかのエリアもここに足せば、看板が立ってクイズが出るようになる。
 */
const FACTS = {
  北海道: {
    食べもの: ['米', 'さけ', 'ほたて貝', 'さんま'],
    'おやつ・飲みもの': ['メロン', '炭酸飲料'],
    くらし: ['灯油', 'プロパンガス'],
  },
  青森: {
    食べもの: ['りんご', 'ほたて貝', 'やきとり', 'カップ麺'],
    'おやつ・飲みもの': ['炭酸飲料', '果実・野菜ジュース'],
    くらし: ['灯油'],
  },
  岩手: {
    食べもの: ['中華麺', 'わかめ', '納豆', '豆腐'],
    'おやつ・飲みもの': ['ゼリー', 'ココア・ココア飲料'],
    くらし: ['プロパンガス'],
  },
  宮城: {
    食べもの: ['かまぼこ', 'わかめ', '中華そば'],
  },
  秋田: {
    食べもの: ['乾うどん・そば', 'さんま', 'ほうれんそう', 'だいこん漬'],
    'おやつ・飲みもの': ['清酒', 'メロン'],
  },
  山形: {
    食べもの: ['中華そば', 'こんにゃく', 'さといも', 'もやし'],
    'おやつ・飲みもの': ['チョコレート菓子', 'ｱｲｽｸﾘｰﾑ･ｼｬｰﾍﾞｯﾄ', 'せんべい'],
    くらし: ['上下水道料', '学校給食'],
  },
  福島: {
    食べもの: ['桃', '納豆', 'ハンバーグ'],
    'おやつ・飲みもの': ['ｱｲｽｸﾘｰﾑ･ｼｬｰﾍﾞｯﾄ', 'プリン', '乳飲料', '清酒'],
  },
};

/** 看板の一覧：[{ pref, kind }]。図鑑の記録は "県名/種類" の文字列で持つ */
export const SIGN_LIST = Object.entries(FACTS).flatMap(([pref, kinds]) => Object.keys(kinds).map((kind) => ({ pref, kind })));
export const signKey = (pref, kind) => `${pref}/${kind}`;

/** 品目ごとの順位表（支出の多い順）。[[県名, 円], ...] */
const RANKING = {};
const ranking = (item) => (RANKING[item] ||= Object.entries(KAKEI[item].values).sort((a, b) => b[1] - a[1]));
const rankOf = (item, pref) => ranking(item).findIndex(([p]) => p === pref) + 1;
const yenOf = (item, pref) => KAKEI[item].values[pref];
const yen = (n) => n.toLocaleString() + '円';

/** 看板・図鑑に出す1行。例：「りんご　8,246円（全国1位）」 */
export function factLine(pref, item) {
  const r = rankOf(item, pref);
  const top = ranking(item)[0][0];
  return `${KAKEI[item].label}　${yen(yenOf(item, pref))}（全国${r}位${r > 1 ? `・1位は${top}` : ''}）`;
}

/** 看板を調べたときの会話。isNew なら図鑑に記録したことも伝える */
export function signLines(pref, kind, isNew) {
  const items = FACTS[pref]?.[kind] || [];
  return [
    `〔${kind}の看板〕${pref}\n1世帯が1年に使うお金（県庁所在地）`,
    items.map((it) => '・' + factLine(pref, it)).join('\n'),
    ...(isNew ? [`${pref}の「${kind}」のデータを図鑑に記録した！`] : []),
  ];
}

/** 図鑑のページ：県ごとに、読んだ看板の行をまとめる */
export function zukanPages(learned) {
  return Object.entries(FACTS)
    .map(([pref, kinds]) => ({
      pref,
      groups: Object.entries(kinds)
        .filter(([kind]) => learned.includes(signKey(pref, kind)))
        .map(([kind, items]) => ({ kind, lines: items.map((it) => factLine(pref, it)) })),
      total: Object.keys(kinds).length,
    }))
    .filter((p) => p.groups.length);
}
export const ZUKAN_TOTAL = SIGN_LIST.length;

const shuffle = (a) => {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
};
const pickOne = (a) => a[Math.floor(Math.random() * a.length)];

/*
 * クイズの種類。どれも看板に書いてあることだけで答えられる。
 * 1問 = { type, q: 問題文, choices: [文字列...], answer: 正解の文字列, reveal: 正解の説明 }
 */
const QUIZ_TYPES = {
  // 1位当て：その県が1位の品目 → 選択肢は1〜4位の県
  top: ({ pref, item }) => {
    const rank = ranking(item);
    if (rank[0][0] !== pref) return null;
    return {
      q: `「${KAKEI[item].label}」にいちばんお金を使う県は？`,
      choices: shuffle(rank.slice(0, 4).map(([p]) => p)),
      answer: pref,
      reveal: `正解は${pref}！ 1年に${yen(rank[0][1])}で全国1位だ。`,
    };
  },
  // どっち：その県が2位以下の品目 → その県と1位の県の二択
  vs: ({ pref, item }) => {
    const [top, topYen] = ranking(item)[0];
    if (top === pref) return null;
    return {
      q: `「${KAKEI[item].label}」にお金を使うのは、${pref}と${top}のどっち？`,
      choices: shuffle([pref, top]),
      answer: top,
      reveal: `正解は${top}！ ${top}は${yen(topYen)}、${pref}は${yen(yenOf(item, pref))}。`,
    };
  },
  // 順位当て：その県は全国何位？
  rank: ({ pref, item }) => {
    const r = rankOf(item, pref);
    const pool = [1, 2, 3, 4, 5, 10, 20, 30, 47].filter((x) => x !== r);
    const near = pool.filter((x) => Math.abs(x - r) <= 3);
    const others = shuffle([...shuffle(near).slice(0, 1), ...shuffle(pool.filter((x) => !near.includes(x))).slice(0, 2)]);
    const choices = [r, ...others].slice(0, 4).sort((a, b) => a - b).map((x) => `${x}位`);
    return {
      q: `${pref}の「${KAKEI[item].label}」は、全国で何位？`,
      choices,
      answer: `${r}位`,
      reveal: `正解は${r}位！ 1年に${yen(yenOf(item, pref))}使っている。`,
    };
  },
  // 金額当て：1年にいくら使う？（本物と、半分・倍などのニセモノ）
  yen: ({ pref, item }) => {
    const v = yenOf(item, pref);
    // ニセモノも端数のある金額にして、本物だけ目立たないようにする
    const fakes = shuffle([0.3, 0.55, 1.8, 2.7]).slice(0, 3).map((k) => Math.round(v * k) + Math.floor(Math.random() * 9) - 4);
    const choices = [...new Set([v, ...fakes])].sort((a, b) => a - b).map(yen);
    if (choices.length < 4) return null;
    return {
      q: `${pref}の1世帯が、1年に「${KAKEI[item].label}」に使うお金は？`,
      choices,
      answer: yen(v),
      reveal: `正解は${yen(v)}！ 全国${rankOf(item, pref)}位だ。`,
    };
  },
};

// 本当の1位はどれ？：「県×品目」の組み合わせ4つから、本当に全国1位のものを選ぶ
function trueTop(facts) {
  const tops = facts.filter(({ pref, item }) => rankOf(item, pref) === 1);
  const fakes = facts.filter(({ pref, item }) => rankOf(item, pref) > 1);
  if (!tops.length || fakes.length < 3) return null;
  const t = pickOne(tops);
  const pairs = shuffle(fakes)
    .filter((f, i, a) => a.findIndex((g) => g.item === f.item) === i && f.item !== t.item)
    .slice(0, 3);
  if (pairs.length < 3) return null;
  const name = ({ pref, item }) => `${pref}の${KAKEI[item].label}`;
  return {
    q: '本当に全国1位なのはどれ？',
    choices: shuffle([t, ...pairs].map(name)),
    answer: name(t),
    reveal: `正解は「${name(t)}」！ ほかは ${pairs.map((f) => `${name(f)}が${rankOf(f.item, f.pref)}位`).join('、')}。`,
    wide: true,
  };
}

/**
 * エリアのボスが出すクイズの山。いろいろな種類が順番に出るように並べる。
 * そのエリアの看板に書いてあるデータだけを使う。
 */
export function quizFor(regionId) {
  const prefs = PREF_TILES.filter((t) => t.region === regionId && FACTS[t.name]).map((t) => t.name);
  const facts = [];
  for (const pref of prefs) {
    for (const items of Object.values(FACTS[pref])) {
      for (const item of items) if (!facts.some((f) => f.pref === pref && f.item === item)) facts.push({ pref, item });
    }
  }
  if (!facts.length) return [];

  // 種類ごとに問題を作って、種類が順番に回るように並べる
  const byType = Object.entries(QUIZ_TYPES).map(([type, make]) =>
    shuffle(facts)
      .map((f) => make(f))
      .filter(Boolean)
      .map((q) => ({ type, ...q })),
  );
  const tt = [0, 1, 2].map(() => trueTop(facts)).filter(Boolean).map((q) => ({ type: 'trueTop', ...q }));
  byType.push(tt);
  const lists = shuffle(byType.filter((l) => l.length));
  const out = [];
  for (let i = 0; out.length < 30 && lists.some((l) => l.length > i); i++) {
    for (const l of lists) if (l[i]) out.push(l[i]);
  }
  return out;
}
