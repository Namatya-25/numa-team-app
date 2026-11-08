// データ図鑑とボスの「データ攻撃」（クイズ）
// 流れ：道ばたの看板を調べる → 図鑑に記録 → ボスがそのエリアのデータからクイズを出す
// データ：src/data/kakei.js（総務省「家計調査」）と src/data/sugata.js（総務省「社会生活統計指標」）
import { KAKEI, KAKEI_SOURCE } from '../data/kakei.js';
import { SUGATA, SUGATA_SOURCE } from '../data/sugata.js';
import { PREF_TILES } from '../data/prefectures.js';

/** 看板の種類。col は看板の板の色、note は看板の見出しに出す説明 */
const MONEY = '1世帯が1年に使うお金（県庁所在地）';
export const SIGN_KINDS = {
  食べもの: { col: '#d9b56e', note: MONEY },
  くらし: { col: '#9cc7e8', note: MONEY },
  'しぜん・まち': { col: '#8fd17a', note: '都道府県のデータ（気温・雨・日照は県庁所在地）' },
  人口: { col: '#c3a6f0', note: '都道府県のデータ' },
};
export const SOURCES = [KAKEI_SOURCE, SUGATA_SOURCE];

/*
 * クイズと看板で使うデータ。1品目 = {
 *   label, unit, digits（小数の桁）, values: { 県名: 値 },
 *   order: 'desc'（大きいほど上位）か 'asc'（小さいほど上位）,
 *   most / least: 「〇〇県は？」の〇〇（いちばん上位／いちばん下位）, more: 「〇〇のは、AとBのどっち？」の〇〇,
 *   amountQ: 値を当てる問題の問題文, fake: 値当てのニセモノの作り方（'mul' 倍率 / 数値なら足し引きの幅）
 * }
 */
const DATA = {};
for (const [k, v] of Object.entries(KAKEI)) {
  DATA[k] = {
    label: v.label,
    unit: '円',
    digits: 0,
    values: v.values,
    order: 'desc',
    most: `「${v.label}」にいちばんお金を使う`,
    least: `「${v.label}」にいちばんお金を使わない`,
    more: `「${v.label}」にお金を多く使う`,
    amountQ: (p) => `${p}の1世帯が、1年に「${v.label}」に使うお金は？`,
    fake: 'mul',
  };
}
const sugata = (code, o) => {
  const v = SUGATA[code];
  DATA[code] = {
    label: v.label,
    unit: v.unit,
    digits: v.digits,
    values: v.values,
    order: 'desc',
    most: `「${v.label}」がいちばん多い`,
    least: `「${v.label}」がいちばん少ない`,
    more: `「${v.label}」が多い`,
    amountQ: (p) => `${p}の「${v.label}」は？`,
    fake: 'mul',
    ...o,
  };
};
sugata('B011001', { most: '面積がいちばん広い', least: '面積がいちばんせまい', more: '面積が広い' });
sugata('B02101', { order: 'asc', most: '1年の平均気温がいちばん低い', least: '1年の平均気温がいちばん高い', more: '平均気温が低い', fake: 2 });
sugata('B02401', { least: '1年の日照時間がいちばん短い', most: '1年の日照時間がいちばん長い', more: '日照時間が長い' });
sugata('B02402', { least: '1年の降水量がいちばん少ない', most: '1年の降水量がいちばん多い', more: '降水量が多い' });
sugata('H08101', { most: '1人あたりの公園がいちばん広い', least: '1人あたりの公園がいちばんせまい', more: '1人あたりの公園が広い' });
sugata('H06121', { most: '人口あたりの銭湯がいちばん多い', least: '人口あたりの銭湯がいちばん少ない', more: '人口あたりの銭湯が多い' });
sugata('H06306', { most: '人口あたりの家の固定電話がいちばん多い', least: '人口あたりの家の固定電話がいちばん少ない', more: '家の固定電話が多い' });
sugata('H01401', { most: '一戸建ての家の割合がいちばん高い', least: '一戸建ての家の割合がいちばん低い', more: '一戸建ての割合が高い', fake: 12 });
sugata('H01301', { most: '持ち家の割合がいちばん高い', least: '持ち家の割合がいちばん低い', more: '持ち家の割合が高い', fake: 12 });
sugata('H06117', { most: '人口あたりの床屋・美容院がいちばん多い', least: '人口あたりの床屋・美容院がいちばん少ない', more: '床屋・美容院が多い' });
sugata('G01321', { most: '人口あたりの体育館などがいちばん多い', least: '人口あたりの体育館などがいちばん少ない', more: '体育館などが多い' });
sugata('A06102', { most: '1世帯の人数がいちばん多い', least: '1世帯の人数がいちばん少ない', more: '1世帯の人数が多い', fake: 0.35 });
sugata('A011000', { most: '人口がいちばん多い', least: '人口がいちばん少ない', more: '人口が多い' });
sugata('A01201', { most: '人口密度がいちばん高い', least: '人口密度がいちばん低い', more: '人口密度が高い', lastNote: '全国でいちばん低い' });
sugata('A03503', { most: 'お年寄り（65歳以上）の割合がいちばん高い', least: 'お年寄り（65歳以上）の割合がいちばん低い', more: 'お年寄りの割合が高い', fake: 4 });
sugata('A03501', { most: '子ども（15歳未満）の割合がいちばん高い', least: '子ども（15歳未満）の割合がいちばん低い', more: '子どもの割合が高い', fake: 2, lastNote: '全国でいちばん低い' });
sugata('A05111', { most: '人口がいちばん増えている', least: '人口がいちばん減っている', more: '人口が増えている', fake: 6, lastNote: '全国でいちばん減っている' });

/*
 * 看板に書いてあるデータ：県名 → 看板の種類 → 品目（DATA のキー）
 * 今は北海道・東北だけ。ほかのエリアもここに足せば、看板が立ってクイズが出るようになる。
 */
const FACTS = {
  北海道: {
    食べもの: ['米', 'さけ', 'ほたて貝', 'さんま'],
    くらし: ['灯油', 'プロパンガス'],
    'しぜん・まち': ['B011001', 'B02101', 'H08101'],
    人口: ['A011000', 'A01201'],
  },
  // 東北は県が多いので、1県2枚にしぼる（4種類の看板はエリア全体でそろう）
  青森: {
    食べもの: ['りんご', 'ほたて貝', 'やきとり', 'カップ麺'],
    'しぜん・まち': ['H06121', 'H06306', 'B02101'],
  },
  岩手: {
    食べもの: ['中華麺', 'わかめ', '納豆', 'ゼリー'],
    'しぜん・まち': ['B011001', 'H06306', 'H06117'],
  },
  宮城: {
    食べもの: ['かまぼこ', 'わかめ', '中華そば'],
    'しぜん・まち': ['B02402', 'H08101'],
  },
  秋田: {
    食べもの: ['乾うどん・そば', 'さんま', 'ほうれんそう', 'だいこん漬'],
    人口: ['A03503', 'A03501', 'A05111'],
  },
  山形: {
    食べもの: ['中華そば', 'こんにゃく', 'さといも', 'もやし'],
    くらし: ['上下水道料', '学校給食'],
  },
  福島: {
    食べもの: ['桃', '納豆', 'ｱｲｽｸﾘｰﾑ･ｼｬｰﾍﾞｯﾄ', 'プリン'],
    'しぜん・まち': ['B011001', 'B02402'],
  },
};

/** 看板の一覧：[{ pref, kind }]。図鑑の記録は "県名/種類" の文字列で持つ */
export const SIGN_LIST = Object.entries(FACTS).flatMap(([pref, kinds]) => Object.keys(kinds).map((kind) => ({ pref, kind })));
export const signKey = (pref, kind) => `${pref}/${kind}`;

// ---- 順位と表示 ----
const better = (d, a, b) => (d.order === 'asc' ? a < b : a > b);
/** 上位から並べた [[県名, 値], ...] */
const RANKING = {};
const ranking = (item) => {
  const d = DATA[item];
  return (RANKING[item] ||= Object.entries(d.values).sort((a, b) => (d.order === 'asc' ? a[1] - b[1] : b[1] - a[1])));
};
/** 順位（同じ値は同じ順位） */
const rankOf = (item, pref) => {
  const d = DATA[item];
  const v = d.values[pref];
  return 1 + Object.values(d.values).filter((x) => better(d, x, v)).length;
};
const LAST = 47;
const valueOf = (item, pref) => DATA[item].values[pref];
const fmt = (item, v) => {
  const d = DATA[item];
  return v.toLocaleString('ja-JP', { minimumFractionDigits: d.digits, maximumFractionDigits: d.digits }) + d.unit;
};
const topPref = (item) => ranking(item)[0][0];
const unique = (item, r) => ranking(item).filter(([p]) => rankOf(item, p) === r).length === 1;

/** 看板・図鑑に出す1行。例：「りんご　8,246円（全国1位）」「1年の降水量　1,028mm（全国でいちばん少ない）」 */
export function factLine(pref, item) {
  return `${DATA[item].label}　${fmt(item, valueOf(item, pref))}（${factNote(pref, item)}）`;
}
/** 順位の説明。例：「全国1位」「全国3位・1位は北海道」「全国でいちばん少ない」 */
function factNote(pref, item) {
  const r = rankOf(item, pref);
  const asc = DATA[item].order === 'asc';
  if (r === 1) return asc ? '低い方から全国1位' : '全国1位';
  if (r === LAST) return DATA[item].lastNote || (asc ? '全国でいちばん高い' : '全国でいちばん少ない');
  return asc ? `低い方から${r}位・いちばん低いのは${topPref(item)}` : `全国${r}位・1位は${topPref(item)}`;
}

/** 看板を調べたときの会話。isNew なら図鑑に記録したことも伝える */
export function signLines(pref, kind, isNew) {
  const items = FACTS[pref]?.[kind] || [];
  return [
    `〔${kind}の看板〕${pref}\n${SIGN_KINDS[kind].note}`,
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

// ---- クイズ ----
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
 * 1問 = { q: 問題文, choices: [文字列...], answer: 正解の文字列, reveal: 正解の説明, wide?: 選択肢を1列にする }
 */
const QUIZ_TYPES = {
  // 1位当て：その県が1位の品目 → 選択肢は1〜4位の県
  top: ({ pref, item }) => {
    if (rankOf(item, pref) !== 1 || !unique(item, 1)) return null;
    return {
      q: `${DATA[item].most}県は？`,
      choices: shuffle(ranking(item).slice(0, 4).map(([p]) => p)),
      answer: pref,
      reveal: `正解は${pref}！ ${fmt(item, valueOf(item, pref))}で、${DATA[item].most}県だ。`,
    };
  },
  // 最下位当て：その県が47位の品目 → 選択肢は下から4県
  bottom: ({ pref, item }) => {
    if (rankOf(item, pref) !== LAST || !unique(item, LAST)) return null;
    return {
      q: `${DATA[item].least}県は？`,
      choices: shuffle(ranking(item).slice(-4).map(([p]) => p)),
      answer: pref,
      reveal: `正解は${pref}！ ${fmt(item, valueOf(item, pref))}で、${DATA[item].least}県だ。`,
    };
  },
  // どっち：その県が2位以下の品目 → その県と1位の県の二択
  vs: ({ pref, item }) => {
    const top = topPref(item);
    if (top === pref || valueOf(item, top) === valueOf(item, pref)) return null;
    return {
      q: `${DATA[item].more}のは、${pref}と${top}のどっち？`,
      choices: shuffle([pref, top]),
      answer: top,
      reveal: `正解は${top}！ ${top}は${fmt(item, valueOf(item, top))}、${pref}は${fmt(item, valueOf(item, pref))}。`,
    };
  },
  // 順位当て：その県は全国何位？
  rank: ({ pref, item }) => {
    const r = rankOf(item, pref);
    const pool = [1, 2, 3, 4, 5, 10, 20, 30, 47].filter((x) => x !== r);
    const near = pool.filter((x) => Math.abs(x - r) <= 3);
    // 近い順位を1つ（あれば）と、離れた順位を足して、いつも4択にする
    const nearOne = shuffle(near).slice(0, 1);
    const others = [...nearOne, ...shuffle(pool.filter((x) => !nearOne.includes(x))).slice(0, 3 - nearOne.length)];
    const choices = [r, ...others].sort((a, b) => a - b).map((x) => `${x}位`);
    const asc = DATA[item].order === 'asc';
    return {
      q: `${pref}の「${DATA[item].label}」は、${asc ? '低い方から' : '全国で'}何位？`,
      choices,
      answer: `${r}位`,
      reveal: `正解は${r}位！ ${pref}は${fmt(item, valueOf(item, pref))}。`,
    };
  },
  // 値当て：本物の値と、ニセモノ3つ
  amount: ({ pref, item }) => {
    const d = DATA[item];
    const v = valueOf(item, pref);
    const k = 10 ** d.digits;
    const round = (x) => Math.round(x * k) / k;
    let fakes;
    if (d.fake === 'mul') {
      // ニセモノも端数のある値にして、本物だけ目立たないようにする
      fakes = shuffle([0.3, 0.55, 1.8, 2.7]).slice(0, 3).map((m) => round(v * m + (Math.floor(Math.random() * 9) - 4) / k));
    } else {
      fakes = shuffle([-2, -1, 1, 2]).slice(0, 3).map((m) => round(v + m * d.fake + (Math.random() - 0.5) * d.fake * 0.3));
    }
    // 本物が0以上なら、ニセモノもマイナスにはしない（人口の増え方のようにマイナスもある値はそのまま）
    const choices = [...new Set([v, ...fakes].filter((x) => v < 0 || x >= 0))].sort((a, b) => a - b).map((x) => fmt(item, x));
    if (choices.length < 4) return null;
    return {
      q: d.amountQ(pref),
      choices,
      answer: fmt(item, v),
      reveal: `正解は${fmt(item, v)}！ ${factNote(pref, item)}だ。`,
    };
  },
};

// 本当の1位はどれ？：「県の〇〇」4つから、本当に全国1位のものを選ぶ（低い方が上位の品目は使わない）
function trueTop(facts) {
  const usable = facts.filter(({ item }) => DATA[item].order === 'desc');
  const tops = usable.filter(({ pref, item }) => rankOf(item, pref) === 1 && unique(item, 1));
  const fakes = usable.filter(({ pref, item }) => rankOf(item, pref) > 1);
  if (!tops.length) return null;
  const t = pickOne(tops);
  const pairs = shuffle(fakes)
    .filter((f, i, a) => a.findIndex((g) => g.item === f.item) === i && f.item !== t.item)
    .slice(0, 3);
  if (pairs.length < 3) return null;
  const name = ({ pref, item }) => `${pref}の${DATA[item].label}`;
  const rk = (f) => (rankOf(f.item, f.pref) === LAST ? '最下位' : `${rankOf(f.item, f.pref)}位`);
  return {
    q: '本当に全国1位なのはどれ？',
    choices: shuffle([t, ...pairs].map(name)),
    answer: name(t),
    reveal: `正解は「${name(t)}」！ ほかは ${pairs.map((f) => `${name(f)}が${rk(f)}`).join('、')}。`,
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
  byType.push([0, 1, 2].map(() => trueTop(facts)).filter(Boolean).map((q) => ({ type: 'trueTop', ...q })));
  const lists = shuffle(byType.filter((l) => l.length));
  const out = [];
  for (let i = 0; out.length < 40 && lists.some((l) => l.length > i); i++) {
    for (const l of lists) if (l[i]) out.push(l[i]);
  }
  return out;
}
