// 都道府県の境界データ（GeoJSON）から、ゲーム用のマス目の日本地図 src/data/japanMap.js を作る
//
// 使い方:
//   1. https://github.com/dataofjapan/land の japan.geojson をダウンロードする
//   2. node scripts/build-map.mjs <japan.geojson のパス>
//
// 地図は 1 マス約 20km。沖縄本島は実際の位置だと地図が広くなりすぎるので、
// 拡大して九州の南の空いている海に「はめ込み図」として置く。北方領土は北海道の一部として実際の位置のまま。
// 八重山・宮古島・大東諸島・小笠原・奄美などの離島は省いている。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PREF_TILES } from '../src/data/prefectures.js';

const src = process.argv[2];
if (!src) {
  console.error('使い方: node scripts/build-map.mjs <japan.geojson>');
  process.exit(1);
}
const out = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/data/japanMap.js');

// ---- 設定 ----
const K = 5.2; // 本土の縮尺：緯度 1 度あたりのマス数
const MARGIN = 2; // まわりの海の幅
const MAIN = { lon0: 128.5, lon1: 149.0, lat0: 30.2, lat1: 45.6, cos: Math.cos((38 * Math.PI) / 180) };
const W = Math.ceil((MAIN.lon1 - MAIN.lon0) * MAIN.cos * K) + MARGIN * 2;
const MAIN_BOTTOM = Math.ceil((MAIN.lat1 - MAIN.lat0) * K) + MARGIN; // 本土の範囲の下端
const H = MAIN_BOTTOM + 12; // 下に沖縄のはめ込み図を置くぶん広げる

// はめ込み図：名前, 経度の範囲, 緯度の範囲, 拡大率, 置く位置（左上のマス）
const INSETS = [
  { name: '沖縄本島', lon: [127.0, 128.4], lat: [26.0, 26.95], zoom: 1.5, at: [MARGIN + 17, MAIN_BOTTOM + 1] },
];
for (const s of INSETS) {
  s.cos = Math.cos((((s.lat[0] + s.lat[1]) / 2) * Math.PI) / 180);
  s.k = K * s.zoom;
  s.w = Math.ceil((s.lon[1] - s.lon[0]) * s.cos * s.k);
  s.h = Math.ceil((s.lat[1] - s.lat[0]) * s.k);
}

// 県庁所在地。城と道の基準点になる。[緯度, 経度]
const CAPITAL = {
  北海道: [43.06, 141.35], 青森: [40.82, 140.74], 岩手: [39.7, 141.15], 宮城: [38.27, 140.87],
  秋田: [39.72, 140.1], 山形: [38.24, 140.36], 福島: [37.75, 140.47], 茨城: [36.34, 140.45],
  栃木: [36.57, 139.88], 群馬: [36.39, 139.06], 埼玉: [35.86, 139.65], 千葉: [35.61, 140.12],
  東京: [35.69, 139.69], 神奈川: [35.45, 139.64], 新潟: [37.9, 139.02], 富山: [36.7, 137.21],
  石川: [36.59, 136.63], 福井: [36.07, 136.22], 山梨: [35.66, 138.57], 長野: [36.65, 138.18],
  岐阜: [35.39, 136.72], 静岡: [34.98, 138.38], 愛知: [35.18, 136.91], 三重: [34.73, 136.51],
  滋賀: [35.0, 135.87], 京都: [35.02, 135.76], 大阪: [34.69, 135.52], 兵庫: [34.69, 135.18],
  奈良: [34.69, 135.83], 和歌山: [34.23, 135.17], 鳥取: [35.5, 134.24], 島根: [35.47, 133.05],
  岡山: [34.66, 133.93], 広島: [34.4, 132.46], 山口: [34.19, 131.47], 徳島: [34.07, 134.56],
  香川: [34.34, 134.04], 愛媛: [33.84, 132.77], 高知: [33.56, 133.53], 福岡: [33.61, 130.42],
  佐賀: [33.25, 130.3], 長崎: [32.74, 129.87], 熊本: [32.79, 130.74], 大分: [33.24, 131.61],
  宮崎: [31.91, 131.42], 鹿児島: [31.56, 130.56], 沖縄: [26.21, 127.68],
};

// ---- GeoJSON を読み、ポリゴンごとに県番号と座標系を決める ----
const idxOf = (name) => {
  const i = PREF_TILES.findIndex((p) => p.name === name);
  if (i < 0) throw new Error('県が見つからない: ' + name);
  return i;
};
const shortName = (ja) => (ja === '北海道' ? ja : ja.replace(/[都府県]$/, ''));

// 点を間引いて軽くする（0.01 度 ≒ 1km 未満の点は捨てる。1 マスは約 20km）
const simplify = (ring) => {
  const res = [ring[0]];
  for (const p of ring) {
    const q = res[res.length - 1];
    if (Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]) > 0.01) res.push(p);
  }
  return res;
};
const bboxOf = (ring) => {
  let a = 999, b = -999, c = 999, d = -999;
  for (const [x, y] of ring) {
    a = Math.min(a, x); b = Math.max(b, x); c = Math.min(c, y); d = Math.max(d, y);
  }
  return [a, b, c, d];
};
const inBox = (bb, lon, lat) => bb[0] >= lon[0] && bb[1] <= lon[1] && bb[2] >= lat[0] && bb[3] <= lat[1];

const geo = JSON.parse(fs.readFileSync(src, 'utf8'));
const polys = { main: [], 沖縄本島: [] };
for (const f of geo.features) {
  const pref = shortName(f.properties.nam_ja);
  const list = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
  for (const poly of list) {
    const rings = poly.map(simplify).filter((r) => r.length >= 3);
    if (!rings.length) continue;
    const bb = bboxOf(rings[0]);
    let set = 'main';
    let idx = idxOf(pref);
    if (pref === '沖縄') {
      const box = INSETS.find((s) => inBox(bb, s.lon, s.lat));
      if (!box) continue; // 八重山・宮古島・大東諸島などはめ込み図の外は省く
      set = box.name;
    } else if (pref === '東京' && bb[3] < 30) {
      continue; // 小笠原は省く
    } else if (pref === '鹿児島' && bb[3] < 30.0) {
      continue; // 奄美などは本土の範囲の外
    }
    polys[set].push({ idx, rings, bb });
  }
}

// ---- マス目に塗る ----
const inRing = (ring, x, y) => {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};
const lookup = (set, lon, lat) => {
  for (const p of polys[set]) {
    const bb = p.bb;
    if (lon < bb[0] || lon > bb[1] || lat < bb[2] || lat > bb[3]) continue;
    if (!inRing(p.rings[0], lon, lat)) continue;
    if (p.rings.slice(1).some((h) => inRing(h, lon, lat))) continue; // 穴（湖など）
    return p.idx;
  }
  return -1;
};

// マス座標 → [座標系, 経度, 緯度]
const unproject = (x, y) => {
  for (const s of INSETS) {
    const ix = x - s.at[0];
    const iy = y - s.at[1];
    if (ix >= 0 && iy >= 0 && ix < s.w && iy < s.h) return [s.name, s.lon[0] + ix / (s.cos * s.k), s.lat[1] - iy / s.k];
  }
  return ['main', MAIN.lon0 + (x - MARGIN) / (MAIN.cos * K), MAIN.lat1 - (y - MARGIN) / K];
};
// 経度・緯度 → マス座標
const project = (lat, lon) => {
  for (const s of INSETS) {
    if (lon >= s.lon[0] && lon <= s.lon[1] && lat >= s.lat[0] && lat <= s.lat[1]) {
      return [Math.floor(s.at[0] + (lon - s.lon[0]) * s.cos * s.k), Math.floor(s.at[1] + (s.lat[1] - lat) * s.k)];
    }
  }
  return [Math.floor(MARGIN + (lon - MAIN.lon0) * MAIN.cos * K), Math.floor(MARGIN + (MAIN.lat1 - lat) * K)];
};

// 1 マスを 3x3 点で調べ、3 点以上が陸ならそのマスは陸（いちばん多い県のもの）
const map = [...Array(H)].map(() => Array(W).fill(-1));
const N = 3;
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const count = new Map();
    let land = 0;
    for (let b = 0; b < N; b++) {
      for (let a = 0; a < N; a++) {
        const [set, lon, lat] = unproject(x + (a + 0.5) / N, y + (b + 0.5) / N);
        const i = lookup(set, lon, lat);
        if (i >= 0) {
          land++;
          count.set(i, (count.get(i) || 0) + 1);
        }
      }
    }
    if (land >= 3) map[y][x] = [...count].sort((p, q) => q[1] - p[1])[0][0];
  }
}

// ---- 城と道の基準点：県庁所在地にいちばん近い、その県のマス ----
const nodes = PREF_TILES.map((p, i) => {
  const [lat, lon] = CAPITAL[p.name];
  const [cx, cy] = project(lat, lon);
  let best = null;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (map[y][x] !== i) continue;
      const d = (x - cx) ** 2 + (y - cy) ** 2;
      if (!best || d < best[2]) best = [x, y, d];
    }
  }
  if (!best) {
    // 小さすぎてマスにならなかった島は、基準点のマスを陸にする
    map[cy][cx] = i;
    best = [cx, cy, 0];
    console.warn(`${p.name}: マスが無かったので (${cx}, ${cy}) を陸にした`);
  }
  return [best[0], best[1]];
});

// ---- 書き出し ----
// 1 文字 = 1 マス。'.' は海、それ以外は県番号（A=0, B=1, …, Z=25, a=26, …）
const CH = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const rows = map.map((r) => r.map((i) => (i < 0 ? '.' : CH[i])).join(''));
const body = `// このファイルは scripts/build-map.mjs で自動生成したもの。手で書き換えないこと。
// 元データ: 都道府県の境界データ（dataofjapan/land の japan.geojson）
// 1 文字 = 1 マス。'.' は海、それ以外は県番号（A=0, B=1, …, Z=25, a=26, …）。県番号は prefectures.js の RAW の並び。

export const MAP_CHARS = '${CH}';

export const MAP_ROWS = [
${rows.map((r) => `  '${r}',`).join('\n')}
];

/** 県ごとの城・道の基準点 [x, y]（県庁所在地にいちばん近いマス） */
export const NODES = ${JSON.stringify(nodes)};

/** はめ込み図の枠 [x, y, 幅, 高さ] */
export const INSET_FRAMES = ${JSON.stringify(INSETS.map((s) => [s.at[0], s.at[1], s.w, s.h]))};
`;
fs.writeFileSync(out, body);
console.log(`${W}x${H} マス → ${path.relative(process.cwd(), out)}`);
for (const [i, p] of PREF_TILES.entries()) {
  const n = map.flat().filter((v) => v === i).length;
  if (n < 4) console.warn(`  ${p.name}: ${n} マス`);
}
