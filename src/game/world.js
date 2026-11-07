// ドット絵の日本列島マップを自動生成（47県のタイル配置・7地方の城・道・橋）
// 地形は県タイル単位で作り、マスの持ち主（own）は地方の id にする
import { REGIONS, PREF_TILES } from '../data/prefectures.js';

const S = 4; // 1県 = 4x4 タイル
const M = 3; // 周囲の海の幅
export const MW = 13 * S + M * 2;
export const MH = 12 * S + M * 2;

export const T = { SEA: 0, GRASS: 1, FOREST: 2, MOUNT: 3, TOWN: 4, ROAD: 5, BRIDGE: 6, CASTLE: 7 };

// 海峡を作るために削る辺（北海道・四国・九州・沖縄を島にする）
const TRIM = {
  0: { b: 1 },
  35: { t: 1, r: 1 },
  36: { t: 1 },
  39: { t: 1 },
  40: { t: 1 },
  43: { r: 1 },
  46: { l: 1, r: 1 },
};

// 座標から決まる疑似乱数（毎回同じ地形になる）
const rng = (x, y, s) => {
  let h = (x * 374761393 + y * 668265263 + s * 982451653) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

export const grid = [...Array(MH)].map(() => Array(MW).fill(T.SEA));
export const own = [...Array(MH)].map(() => Array(MW).fill(-1));
export const castles = [];
const boxes = []; // 県ごとの範囲と中心

export const inb = (x, y) => x >= 0 && y >= 0 && x < MW && y < MH;
export const isSeaT = (x, y) => !inb(x, y) || grid[y][x] === T.SEA || grid[y][x] === T.BRIDGE;

// 1. 陸地と地形（地形の傾向は地方の属性で決まる）
PREF_TILES.forEach((p, id) => {
  const big = id === 0;
  const tr = TRIM[id] || {};
  const elem = REGIONS[p.region].elem;
  const x0 = M + p.x * S + (tr.l || 0);
  const y0 = M + p.y * S + (tr.t || 0);
  const x1 = M + p.x * S + (big ? 8 : 4) - (tr.r || 0);
  const y1 = M + p.y * S + (big ? 8 : 4) - (tr.b || 0);
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      own[y][x] = p.region;
      const r = rng(x, y, 1);
      if (elem === '山') grid[y][x] = r < 0.26 ? T.MOUNT : r < 0.48 ? T.FOREST : T.GRASS;
      else if (elem === '街') grid[y][x] = r < 0.18 ? T.TOWN : r < 0.28 ? T.FOREST : T.GRASS;
      else grid[y][x] = r < 0.24 ? T.FOREST : T.GRASS;
    }
  }
  boxes[id] = {
    x: x0 + Math.floor((x1 - x0 - 1) / 2),
    y: y0 + Math.floor((y1 - y0 - 1) / 2),
    box: [x0, y0, x1, y1],
  };
});
REGIONS.forEach((r) => {
  const b = boxes[r.castlePref];
  castles[r.id] = { x: b.x, y: b.y };
});

// 2. 海岸の角を削って自然な形にする
boxes.forEach((c) => {
  const [x0, y0, x1, y1] = c.box;
  if (x1 - x0 <= 2) return;
  [[x0, y0], [x1 - 1, y0], [x0, y1 - 1], [x1 - 1, y1 - 1]].forEach(([x, y], i) => {
    const seaN = [[0, 1], [1, 0], [0, -1], [-1, 0]].filter(([dx, dy]) => isSeaT(x + dx, y + dy)).length;
    if (seaN >= 2 && rng(x, y, i + 3) < 0.6) {
      grid[y][x] = T.SEA;
      own[y][x] = -1;
    }
  });
});

// 3. 城
castles.forEach((c) => {
  grid[c.y][c.x] = T.CASTLE;
});

// 4. 県の中心どうしを北から順に道でつなぐ（海の上は橋）。城のない県や島にも歩いて行ける
const lay = (x, y) => {
  if (grid[y][x] === T.CASTLE) return;
  grid[y][x] = grid[y][x] === T.SEA || grid[y][x] === T.BRIDGE ? T.BRIDGE : T.ROAD;
};
for (let i = 0; i < boxes.length - 1; i++) {
  const a = boxes[i];
  const b = boxes[i + 1];
  const sx = Math.sign(b.x - a.x);
  for (let x = a.x; x !== b.x; x += sx) if (x !== a.x) lay(x, a.y);
  const sy = Math.sign(b.y - a.y);
  for (let y = a.y; y !== b.y; y += sy) if (!(b.x === a.x && y === a.y)) lay(b.x, y);
}

export const walkable = (x, y) => inb(x, y) && grid[y][x] >= T.GRASS && grid[y][x] <= T.BRIDGE;
export const castleAt = (x, y) => (inb(x, y) && grid[y][x] === T.CASTLE ? own[y][x] : -1);
export const ownAt = (x, y) => (inb(x, y) ? own[y][x] : -1);

export const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

// 城の前（復活地点）
castles.forEach((c) => {
  for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) {
    if (walkable(c.x + dx, c.y + dy)) {
      c.spawn = { x: c.x + dx, y: c.y + dy };
      break;
    }
  }
});

export const START = castles[0].spawn;
