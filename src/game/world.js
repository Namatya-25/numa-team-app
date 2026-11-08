// ドット絵の日本列島マップを作る（実際の地図データから作ったマス目 + エリアごとの城・道・橋）
// 陸地の形と県の範囲は src/data/japanMap.js（scripts/build-map.mjs で生成）にある
import { REGIONS, PREF_TILES } from '../data/prefectures.js';
import { MAP_ROWS, MAP_CHARS, NODES } from '../data/japanMap.js';
import { SIGN_LIST } from './quiz.js';

export const MW = MAP_ROWS[0].length;
export const MH = MAP_ROWS.length;

export const T = { SEA: 0, GRASS: 1, FOREST: 2, MOUNT: 3, TOWN: 4, ROAD: 5, BRIDGE: 6, CASTLE: 7, SIGN: 8 };

// 座標から決まる疑似乱数（毎回同じ地形になる）
const rng = (x, y, s) => {
  let h = (x * 374761393 + y * 668265263 + s * 982451653) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

export const grid = [...Array(MH)].map(() => Array(MW).fill(T.SEA));
export const own = [...Array(MH)].map(() => Array(MW).fill(-1));
export const castles = [];

export const inb = (x, y) => x >= 0 && y >= 0 && x < MW && y < MH;
export const isSeaT = (x, y) => !inb(x, y) || grid[y][x] === T.SEA || grid[y][x] === T.BRIDGE;

export const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const STEPS = Object.values(DIRS);

// 1. 陸地と地形。マスの持ち主（own）はエリアの id。地形の傾向はエリアの属性で決まり、海から遠いほど山が多い
const pref = [...Array(MH)].map((_, y) => [...MAP_ROWS[y]].map((c) => (c === '.' ? -1 : MAP_CHARS.indexOf(c))));
const coastDist = (x, y) => {
  for (let d = 1; d <= 3; d++) {
    for (let dy = -d; dy <= d; dy++) {
      for (let dx = -d; dx <= d; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (!inb(nx, ny) || pref[ny][nx] < 0) return d;
      }
    }
  }
  return 4;
};
for (let y = 0; y < MH; y++) {
  for (let x = 0; x < MW; x++) {
    const p = pref[y][x];
    if (p < 0) continue;
    const region = PREF_TILES[p].region;
    const elem = REGIONS[region].elem;
    const inland = (coastDist(x, y) - 1) * 0.08;
    const r = rng(x, y, 1);
    own[y][x] = region;
    if (elem === '山') grid[y][x] = r < 0.14 + inland ? T.MOUNT : r < 0.4 + inland ? T.FOREST : T.GRASS;
    else if (elem === '街') grid[y][x] = r < 0.18 ? T.TOWN : r < 0.24 + inland ? T.MOUNT : r < 0.34 + inland ? T.FOREST : T.GRASS;
    else grid[y][x] = r < inland ? T.MOUNT : r < 0.24 + inland ? T.FOREST : T.GRASS;
  }
}

// 2. 城は 2x2 マス。x, y は左上のマスで、城を置く県の県庁所在地あたり
export const CASTLE_SIZE = 2;
REGIONS.forEach((r) => {
  const [x, y] = NODES[r.castlePref];
  castles[r.id] = { x, y };
  for (let dy = 0; dy < CASTLE_SIZE; dy++) {
    for (let dx = 0; dx < CASTLE_SIZE; dx++) {
      grid[y + dy][x + dx] = T.CASTLE;
      own[y + dy][x + dx] = r.id;
    }
  }
});

// 3. 道：県庁所在地どうしを北から順に、なるべく陸の上を通ってつなぐ（海を渡るところは橋）
const lay = (x, y) => {
  if (grid[y][x] === T.CASTLE) return;
  grid[y][x] = grid[y][x] === T.SEA || grid[y][x] === T.BRIDGE ? T.BRIDGE : T.ROAD;
};
const stepCost = (x, y) => {
  const t = grid[y][x];
  if (t === T.ROAD || t === T.BRIDGE) return 0.4; // できた道に合流しやすくする
  if (t === T.CASTLE) return 30; // 城の中はなるべく通らない
  if (t === T.SEA) return 8; // 橋はなるべく短く
  return t === T.MOUNT ? 1.6 : 1;
};
// ダイクストラ法で a → b のいちばん安い道順を探す
function route([ax, ay], [bx, by]) {
  const dist = new Float64Array(MW * MH).fill(Infinity);
  const prev = new Int32Array(MW * MH).fill(-1);
  const heap = [[0, ay * MW + ax]];
  dist[ay * MW + ax] = 0;
  const goal = by * MW + bx;
  while (heap.length) {
    // 小さい順に取り出す（マスの数が少ないので、単純な二分ヒープで十分）
    const [d, k] = heap[0];
    const last = heap.pop();
    if (heap.length) {
      heap[0] = last;
      for (let i = 0; ; ) {
        const l = i * 2 + 1;
        const r = l + 1;
        let m = i;
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
        if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
        if (m === i) break;
        [heap[i], heap[m]] = [heap[m], heap[i]];
        i = m;
      }
    }
    if (d > dist[k]) continue;
    if (k === goal) break;
    const x = k % MW;
    const y = (k / MW) | 0;
    for (const [dx, dy] of STEPS) {
      const nx = x + dx;
      const ny = y + dy;
      if (!inb(nx, ny)) continue;
      const nk = ny * MW + nx;
      const nd = d + (nk === goal ? 0 : stepCost(nx, ny));
      if (nd < dist[nk]) {
        dist[nk] = nd;
        prev[nk] = k;
        heap.push([nd, nk]);
        for (let i = heap.length - 1; i > 0; ) {
          const p = (i - 1) >> 1;
          if (heap[p][0] <= heap[i][0]) break;
          [heap[i], heap[p]] = [heap[p], heap[i]];
          i = p;
        }
      }
    }
  }
  const path = [];
  for (let k = goal; k >= 0; k = prev[k]) path.push(k);
  return path.reverse();
}
for (let i = 0; i < NODES.length - 1; i++) {
  for (const k of route(NODES[i], NODES[i + 1])) lay(k % MW, (k / MW) | 0);
}
// 城のまわりを一周する道（海の上は橋）。2x2 の城が道をふさいでも、まわりを通って先へ進める
castles.forEach((c) => {
  for (let dy = -1; dy <= CASTLE_SIZE; dy++) {
    for (let dx = -1; dx <= CASTLE_SIZE; dx++) {
      if (inb(c.x + dx, c.y + dy)) lay(c.x + dx, c.y + dy);
    }
  }
});

// 4. データの看板：県庁所在地から近い、道に面したマスに種類ごとに1本ずつ立てる（城と同じく通れない）
// 看板どうしは1マス以上あける
export const signs = []; // { x, y, pref, kind }
const nearSign = (x, y) => signs.some((s) => Math.abs(s.x - x) <= 1 && Math.abs(s.y - y) <= 1);
PREF_TILES.forEach((t, i) => {
  const kinds = SIGN_LIST.filter((s) => s.pref === t.name).map((s) => s.kind);
  if (!kinds.length || !NODES[i]) return;
  // 1回目は道に面したマス、それで足りなければ2回目は道から近い普通のマスに立てる
  for (const needRoad of [true, false]) placeSigns(i, t.name, kinds, needRoad);
});
function placeSigns(i, prefName, kinds, needRoad) {
  const [nx, ny] = NODES[i];
  const seen = new Set([ny * MW + nx]);
  const queue = [[nx, ny]];
  while (queue.length && kinds.length) {
    const [x, y] = queue.shift();
    const g = grid[y][x];
    const nextTo = STEPS.some(([dx, dy]) => {
      if (!inb(x + dx, y + dy)) return false;
      const n = grid[y + dy][x + dx];
      return needRoad ? n === T.ROAD : n >= T.GRASS && n <= T.BRIDGE;
    });
    if (pref[y][x] === i && g >= T.GRASS && g <= T.TOWN && nextTo && !nearSign(x, y)) {
      grid[y][x] = T.SIGN;
      signs.push({ x, y, pref: prefName, kind: kinds.shift() });
    }
    for (const [dx, dy] of STEPS) {
      const k = (y + dy) * MW + (x + dx);
      if (inb(x + dx, y + dy) && pref[y + dy][x + dx] >= 0 && !seen.has(k)) {
        seen.add(k);
        queue.push([x + dx, y + dy]);
      }
    }
  }
}

export const walkable = (x, y) => inb(x, y) && grid[y][x] >= T.GRASS && grid[y][x] <= T.BRIDGE;
export const castleAt = (x, y) => (inb(x, y) && grid[y][x] === T.CASTLE ? own[y][x] : -1);
/** そのマスの看板 { x, y, pref, kind }（看板でなければ null） */
export const signAt = (x, y) => (inb(x, y) && grid[y][x] === T.SIGN ? signs.find((s) => s.x === x && s.y === y) : null);
export const ownAt = (x, y) => (inb(x, y) ? own[y][x] : -1);
/** そのマスの県名（海なら null）。名前は prefectures.js の RAW の書き方 */
export const prefAt = (x, y) => (inb(x, y) && pref[y][x] >= 0 ? PREF_TILES[pref[y][x]].name : null);

// 城の前（復活地点）。下（正面）→ 左右 → 上の順に、城のまわりで歩けるマスを探す
const AROUND = [[0, 2], [1, 2], [-1, 0], [-1, 1], [2, 0], [2, 1], [0, -1], [1, -1]];
castles.forEach((c) => {
  for (const [dx, dy] of AROUND) {
    if (walkable(c.x + dx, c.y + dy)) {
      c.spawn = { x: c.x + dx, y: c.y + dy };
      break;
    }
  }
});

export const START = castles[0].spawn;
