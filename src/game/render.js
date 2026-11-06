// フィールドのタイルと主人公をドット絵で描く（1タイル = 16px）
import { PREFS } from '../data/prefectures.js';
import { T, grid, own, inb, isSeaT, walkable, castleAt } from './world.js';

export const TILE = 16;
export const SC = 3; // canvas の内部解像度の倍率

export const GRASS_COL = { 山: '#4a9140', 海: '#5fa84a', 街: '#79b452' };

export function drawTile(ctx, mx, my, sx, sy, tick, cleared, nextId) {
  const r = (c, x, y, w, h) => {
    ctx.fillStyle = c;
    ctx.fillRect(sx + x, sy + y, w, h);
  };
  const t = inb(mx, my) ? grid[my][mx] : T.SEA;

  // 海と橋
  if (t === T.SEA || t === T.BRIDGE) {
    r('#23548f', 0, 0, 16, 16);
    const ph = (tick + mx + my) % 2;
    r('#3b74b5', ph ? 2 : 9, 4, 4, 1);
    r('#3b74b5', ph ? 9 : 2, 11, 4, 1);
    if (t === T.BRIDGE) {
      const hor = walkable(mx - 1, my) || walkable(mx + 1, my) || castleAt(mx - 1, my) >= 0 || castleAt(mx + 1, my) >= 0;
      if (hor) {
        r('#8b5a2b', 0, 3, 16, 10);
        for (let i = 0; i < 16; i += 4) r('#6b4220', i, 3, 1, 10);
        r('#5a3a1c', 0, 2, 16, 1);
        r('#5a3a1c', 0, 13, 16, 1);
      } else {
        r('#8b5a2b', 3, 0, 10, 16);
        for (let i = 0; i < 16; i += 4) r('#6b4220', 3, i, 10, 1);
        r('#5a3a1c', 2, 0, 1, 16);
        r('#5a3a1c', 13, 0, 1, 16);
      }
    }
    return;
  }

  // 地面（県の属性で色が変わる）＋砂浜
  const o = own[my][mx];
  const p = o >= 0 ? PREFS[o] : null;
  r(t === T.ROAD ? '#c9a86b' : p ? GRASS_COL[p.elem] : '#5fa84a', 0, 0, 16, 16);
  if (isSeaT(mx, my - 1)) r('#e3cf8c', 0, 0, 16, 2);
  if (isSeaT(mx, my + 1)) r('#e3cf8c', 0, 14, 16, 2);
  if (isSeaT(mx - 1, my)) r('#e3cf8c', 0, 0, 2, 16);
  if (isSeaT(mx + 1, my)) r('#e3cf8c', 14, 0, 2, 16);

  if (t === T.GRASS && (mx * 7 + my * 13) % 5 === 0) {
    r('rgba(0,0,0,.16)', 5, 7, 1, 2);
    r('rgba(0,0,0,.16)', 10, 4, 1, 2);
  }
  if (t === T.ROAD) {
    r('#a8874c', 4, 5, 1, 1);
    r('#a8874c', 11, 10, 1, 1);
  }
  if (t === T.FOREST) {
    r('#2f6b2a', 4, 2, 8, 8);
    r('#2f6b2a', 3, 4, 10, 5);
    r('#3f8a37', 5, 3, 4, 3);
    r('#6b4422', 7, 10, 2, 4);
  }
  if (t === T.MOUNT) {
    const snow = p && p.peak >= 2500;
    for (let i = 0; i < 11; i++) {
      const w = 2 + Math.floor(i * 1.3);
      r(i < 3 && snow ? '#f4f4f4' : '#8a7357', 8 - (w >> 1), 3 + i, w, 1);
      if (i >= 3) r('#6e5b44', 8, 3 + i, w >> 1, 1);
    }
  }
  if (t === T.TOWN) {
    r('#ebe4d4', 3, 8, 10, 6);
    r('#c33a28', 2, 6, 12, 3);
    r('#c33a28', 4, 4, 8, 2);
    r('#3b2a1a', 7, 11, 2, 3);
    r('#7da7d9', 4, 9, 2, 2);
    r('#7da7d9', 10, 9, 2, 2);
  }
  if (t === T.CASTLE) {
    r('#8e8e8e', 2, 11, 12, 5);
    r('#a9a9a9', 3, 11, 10, 1);
    r('#f2efe6', 4, 7, 8, 4);
    r('#2d3a4f', 2, 6, 12, 2);
    r('#f2efe6', 5, 4, 6, 2);
    r('#2d3a4f', 4, 3, 8, 1);
    r('#2d3a4f', 6, 1, 4, 2);
    r('#3b2a1a', 7, 9, 2, 2);
    // 旗：制覇済み=赤、次の目的地=金色に点滅、未到達=灰色
    const col = cleared.includes(o) ? '#e0482f' : o === nextId ? (tick % 2 ? '#f2c14e' : '#ffffff') : '#7a7f8c';
    r('#3b2a1a', 14, 0, 1, 8);
    r(col, 10, 0, 4, 3);
  }
}

export function drawHero(ctx, x, y, dir, fr) {
  const r = (c, a, b, w, h) => {
    ctx.fillStyle = c;
    ctx.fillRect(x + a, y + b, w, h);
  };
  r('rgba(0,0,0,.25)', 3, 14, 10, 2);
  r('#8b5a2b', dir === 'left' ? 2 : 13, 5, 1, 10); // 杖
  r('#2f4f8f', 4, 9, 8, 5); // 着物
  r('#e0482f', 4, 11, 8, 1); // 帯
  if (fr) {
    r('#1d1b18', 5, 14, 2, 2);
    r('#1d1b18', 9, 13, 2, 2);
  } else {
    r('#1d1b18', 5, 13, 2, 2);
    r('#1d1b18', 9, 14, 2, 2);
  }
  r('#f2d2b0', 5, 5, 6, 4); // 顔
  if (dir === 'up') r('#3a2a1c', 5, 5, 6, 3);
  else if (dir === 'down') {
    r('#1d1b18', 6, 6, 1, 2);
    r('#1d1b18', 9, 6, 1, 2);
  } else if (dir === 'left') r('#1d1b18', 6, 6, 1, 2);
  else r('#1d1b18', 9, 6, 1, 2);
  r('#c8a463', 1, 3, 14, 2); // 笠
  r('#c8a463', 4, 1, 8, 2);
  r('#8a6a33', 1, 4, 14, 1);
}
