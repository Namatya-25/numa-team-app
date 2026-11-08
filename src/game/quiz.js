// データ図鑑とボスの「データ攻撃」（クイズ）
// 流れ：道ばたの看板を調べる → 図鑑に記録 → ボスがそのエリアのデータからクイズを出す
// データ：src/data/kakei.js（総務省「家計調査」）と src/data/sugata.js（総務省「社会生活統計指標」）
import { KAKEI, KAKEI_SOURCE } from '../data/kakei.js';
import { SUGATA, SUGATA_SOURCE } from '../data/sugata.js';
import { PREF_TILES } from '../data/prefectures.js';
import { LINKS, LINKS_URL, LINKS_FILE, LINKS_YEAR, LINKS_SOURCE, LINKS_ROWS, LINKS_COLS } from '../data/links.js';

/** 看板の種類。col は看板の板の色、note は看板の見出しに出す説明 */
const MONEY = '1世帯が1年に使うお金（県庁所在地）';
export const SIGN_KINDS = {
  食べもの: { col: '#d9b56e', note: MONEY },
  くらし: { col: '#9cc7e8', note: MONEY },
  'しぜん・まち': { col: '#8fd17a', note: '都道府県のデータ（気温・雨・日照は県庁所在地）' },
  人口: { col: '#c3a6f0', note: '都道府県のデータ' },
};
export const SOURCES = [KAKEI_SOURCE, SUGATA_SOURCE, LINKS_SOURCE];

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
    lastNote: v.unit === '%' ? '全国でいちばん低い' : undefined, // 割合は「少ない」より「低い」
    ...o,
  };
};
sugata('B011001', { most: '面積がいちばん広い', least: '面積がいちばんせまい', more: '面積が広い', lastNote: '全国でいちばんせまい' });
sugata('B02101', { order: 'asc', most: '1年の平均気温がいちばん低い', least: '1年の平均気温がいちばん高い', more: '平均気温が低い', fake: 2 });
sugata('B02401', { least: '1年の日照時間がいちばん短い', most: '1年の日照時間がいちばん長い', more: '日照時間が長い', lastNote: '全国でいちばん短い' });
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
sugata('B01202', { most: '森林の割合がいちばん高い', least: '森林の割合がいちばん低い', more: '森林の割合が高い', fake: 15, lastNote: '全国でいちばん低い' });
sugata('B02102', { most: '夏の最高気温がいちばん高い', least: '夏の最高気温がいちばん低い', more: '夏の最高気温が高い', fake: 1.5, lastNote: '全国でいちばん低い' });
sugata('B01204', { most: '自然公園の割合がいちばん高い', least: '自然公園の割合がいちばん低い', more: '自然公園の割合が高い', fake: 6, lastNote: '全国でいちばん低い' });
sugata('G01107', { most: '人口あたりの博物館がいちばん多い', least: '人口あたりの博物館がいちばん少ない', more: '博物館が多い' });
sugata('G01104', { most: '人口あたりの図書館がいちばん多い', least: '人口あたりの図書館がいちばん少ない', more: '図書館が多い' });
sugata('H01405', { most: '空き家の割合がいちばん高い', least: '空き家の割合がいちばん低い', more: '空き家の割合が高い', fake: 4, lastNote: '全国でいちばん低い' });
sugata('C04105', { most: '畑や田んぼの割合がいちばん高い', least: '畑や田んぼの割合がいちばん低い', more: '畑や田んぼの割合が高い', fake: 6, lastNote: '全国でいちばん低い' });
sugata('H06130', { most: '人口あたりの飲食店がいちばん多い', least: '人口あたりの飲食店がいちばん少ない', more: '飲食店が多い' });
sugata('A01601', { most: '人口あたりの外国人がいちばん多い', least: '人口あたりの外国人がいちばん少ない', more: '外国人が多い' });
sugata('A01302', { most: '昼の人口の割合がいちばん高い', least: '昼の人口の割合がいちばん低い', more: '昼の人口の割合が高い', fake: 8, lastNote: '全国でいちばん低い' });
sugata('F01202', { most: '工場や工事で働く人の割合がいちばん高い', least: '工場や工事で働く人の割合がいちばん低い', more: '工場や工事で働く人の割合が高い', fake: 5, lastNote: '全国でいちばん低い' });

/*
 * 看板に書いてあるデータ：県名 → 看板の種類 → 品目（DATA のキー）
 * 九州（沖縄を含む）まで。1県1枚（北海道だけ2枚）。離島編のエリアにはまだ看板がない。
 * 「くらし」の看板は今は使っていない（SIGN_KINDS には残してある）。
 */
const FACTS = {
  // 北海道
  北海道: {
    食べもの: ['米', 'さけ', 'ほたて貝', 'さんま'],
    'しぜん・まち': ['B011001', 'B02101', 'H08101'],
  },
  // 東北
  青森: {
    食べもの: ['りんご', 'ほたて貝', 'やきとり', 'カップ麺'],
  },
  岩手: {
    食べもの: ['中華麺', 'わかめ', '納豆', 'ゼリー'],
  },
  宮城: {
    食べもの: ['かまぼこ', 'わかめ', '中華そば'],
  },
  秋田: {
    人口: ['A03503', 'A03501', 'A05111'],
  },
  山形: {
    食べもの: ['中華そば', 'こんにゃく', 'さといも', 'もやし'],
  },
  福島: {
    食べもの: ['桃', '納豆', 'ｱｲｽｸﾘｰﾑ･ｼｬｰﾍﾞｯﾄ', 'プリン'],
  },
  // 関東
  茨城: {
    食べもの: ['メロン', 'せんべい', 'ヨーグルト', '納豆'],
  },
  栃木: {
    食べもの: ['いちご', 'ぎょうざ', 'プリン', '茶飲料'],
  },
  群馬: {
    食べもの: ['乳酸菌飲料', 'あさり', 'きゅうり', 'こんにゃく'],
  },
  埼玉: {
    人口: ['A01302', 'A05111'],
  },
  千葉: {
    食べもの: ['干しあじ', 'ようかん', 'キウイフルーツ', 'オレンジ'],
  },
  東京: {
    人口: ['A011000', 'A01201', 'A03503'],
  },
  神奈川: {
    食べもの: ['しゅうまい', 'ピーマン', 'かぼちゃ', 'ジャム'],
  },
  // 中部
  新潟: {
    食べもの: ['塩さけ', '豚肉', 'さやまめ', '米'],
  },
  富山: {
    人口: ['F01202', 'A06102'],
  },
  石川: {
    食べもの: ['すし（外食）', 'れんこん', 'ぶり', 'もち'],
  },
  福井: {
    食べもの: ['油揚げ・がんもどき', 'カツレツ', 'ようかん', 'もち'],
  },
  山梨: {
    食べもの: ['ぶどう', 'まぐろ', 'あさり', '干しあじ'],
  },
  長野: {
    'しぜん・まち': ['G01107', 'G01104', 'G01321'],
  },
  岐阜: {
    食べもの: ['柿', 'ケチャップ', '和食'],
  },
  静岡: {
    食べもの: ['緑茶', 'まぐろ', 'しらす干し'],
  },
  愛知: {
    食べもの: ['喫茶代', 'ケチャップ', 'すし（外食）'],
  },
  // 近畿
  三重: {
    食べもの: ['小麦粉', 'ソーセージ', 'カステラ'],
  },
  滋賀: {
    'しぜん・まち': ['B01204', 'H06306'],
  },
  京都: {
    食べもの: ['牛肉', 'うなぎのかば焼き', 'バター', 'なす'],
  },
  大阪: {
    食べもの: ['たこ', 'はくさい', 'えび'],
  },
  兵庫: {
    食べもの: ['食パン', 'たこ', 'マーガリン', 'ソース'],
  },
  奈良: {
    食べもの: ['柿', '牛乳', 'すし（弁当）', 'たまねぎ'],
  },
  和歌山: {
    食べもの: ['梅干し', 'みかん', 'えび', 'かに'],
  },
  // 中国・四国
  鳥取: {
    人口: ['A011000'],
  },
  島根: {
    食べもの: ['しじみ', 'いわし', 'キャベツ'],
  },
  岡山: {
    食べもの: ['桃', 'ぶどう', '焼肉'],
  },
  広島: {
    食べもの: ['かき（貝）', 'ソース'],
  },
  山口: {
    食べもの: ['スポーツドリンク', 'あじ', 'ふりかけ'],
  },
  徳島: {
    食べもの: ['さつまいも', 'ちくわ', '干しのり'],
  },
  香川: {
    食べもの: ['日本そば・うどん', '生うどん・そば', '乾うどん・そば', 'かき（貝）'],
  },
  愛媛: {
    食べもの: ['ちくわ', 'ソース', 'たい', 'みかん'],
  },
  高知: {
    'しぜん・まち': ['B01202', 'B02401', 'H06130'],
  },
  // 九州
  福岡: {
    食べもの: ['たらこ', '鶏肉', '風味調味料'],
  },
  佐賀: {
    食べもの: ['干しのり', 'ごぼう', 'スナック菓子'],
  },
  長崎: {
    食べもの: ['カステラ', 'あじ', 'かまぼこ'],
  },
  熊本: {
    'しぜん・まち': ['B02102'],
  },
  大分: {
    食べもの: ['干ししいたけ', '焼肉', 'ハンバーガー'],
  },
  宮崎: {
    食べもの: ['ぎょうざ', 'キャベツ', '緑茶'],
  },
  鹿児島: {
    食べもの: ['揚げかまぼこ', 'さば', '干ししいたけ'],
  },
  沖縄: {
    食べもの: ['かつお節・削り節', 'ハンバーガー', 'ミネラルウォーター', '豆腐'],
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

// ---- 特別データ攻撃（国土交通省 Project LINKS のサイトで調べないと解けない問題） ----
// 各地方のボス戦で1回だけ出る。正解はデータから計算するので、データを作り直しても正解はずれない。
const LINKS_METRIC = {
  total: { col: 'TOTAL_GUEST_COUNT', name: '延べ宿泊者数（日本人と外国人の合計）' },
  foreign: { col: 'STAY_GUEST_COUNT_FOREIGN', name: '外国人の延べ宿泊者数' },
};
// 地方ごとの問題：metric = どの列を見るか、choices = 選択肢の県（正解はこの中でいちばん多い県）
const LINKS_Q = {
  0: { metric: 'foreign', amount: '北海道' },
  1: { metric: 'foreign', ask: '東北で', choices: ['宮城', '青森', '岩手', '福島'] },
  2: { metric: 'total', ask: '関東で、東京をのぞいて', choices: ['千葉', '神奈川', '栃木', '群馬'] },
  3: { metric: 'foreign', ask: '中部で', choices: ['愛知', '静岡', '長野', '山梨'] },
  4: { metric: 'foreign', ask: '近畿で、大阪と京都をのぞいて', choices: ['兵庫', '和歌山', '奈良', '滋賀'] },
  5: { metric: 'foreign', ask: '中国・四国で、広島をのぞいて', choices: ['香川', '岡山', '愛媛', '山口'] },
  6: { metric: 'total', ask: '九州・沖縄で', choices: ['沖縄', '福岡', '鹿児島', '熊本'] },
};
const man = (n) => {
  const m = Math.round(n / 10000);
  return m >= 10000 ? `約${Math.floor(m / 10000)}億${m % 10000 ? (m % 10000).toLocaleString() + '万' : ''}人泊` : `約${m.toLocaleString()}万人泊`;
};

/** その地方の特別データ攻撃の問題（なければ null） */
export function linksQuizFor(regionId) {
  const spec = LINKS_Q[regionId];
  if (!spec) return null;
  const m = LINKS_METRIC[spec.metric];
  const vals = LINKS[spec.metric];
  // 表計算ソフトで開いたときの場所：列（C列など）と、県ごとの行番号
  const col = LINKS_COLS[spec.metric];
  const at = (p) => `${p}は${LINKS_ROWS[p]}行目`;
  const base = {
    link: LINKS_URL,
    hint: `「${LINKS_FILE}」をダウンロードして表計算ソフトで開き、${col.letter}列（左から${col.index}番目の ${col.name}＝${m.name}）を見よう。`,
    wide: false,
    special: true,
  };
  if (spec.amount) {
    // 値当て：本物と、0.1倍・3倍・10倍のニセモノ
    const v = vals[spec.amount];
    const choices = [v, v * 0.1, v * 3, v * 10].sort((a, b) => a - b).map(man);
    return {
      ...base,
      q: `${LINKS_YEAR}年に${spec.amount}に泊まった外国人は、のべ何人泊？`,
      hint: base.hint + `${LINKS_YEAR}年の${at(spec.amount)}。`,
      choices,
      answer: man(v),
      reveal: `正解は${man(v)}！（${v.toLocaleString()}人泊）`,
    };
  }
  const sorted = [...spec.choices].sort((a, b) => vals[b] - vals[a]);
  if (vals[sorted[0]] === vals[sorted[1]]) return null;
  return {
    ...base,
    q: `${LINKS_YEAR}年、${spec.ask}${m.name}がいちばん多い県は？`,
    // 正解がわからないように、行番号の順に並べる
    hint: base.hint + `${LINKS_YEAR}年の行は、${[...spec.choices].sort((a, b) => LINKS_ROWS[a] - LINKS_ROWS[b]).map(at).join('、')}。`,
    choices: shuffle(spec.choices),
    answer: sorted[0],
    reveal: `正解は${sorted[0]}！ ${sorted.map((p) => `${p} ${man(vals[p])}`).join('、')}。`,
  };
}
