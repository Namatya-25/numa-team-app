// フィールド：Canvasにマップを描き、主人公の移動・城への接触・エンカウントを処理する
import { useEffect, useRef } from 'react';
import { T, MW, MH, grid, own, walkable, castleAt, DIRS, START } from '../game/world.js';
import { drawTile, drawHero, TILE, SC } from '../game/render.js';
import { nextOf } from '../game/save.js';
import { held, useInput } from '../game/input.js';

const STEP = 150; // 1マス進むのにかかる時間(ms)

export default function Field({ save, vw, vh, onMove, onCastle, onEncounter, onMenu }) {
  const canvasRef = useRef(null);

  // 毎フレーム書き換える値は state ではなく ref に持つ
  const st = useRef(null);
  if (!st.current) {
    const p = save.pos || START;
    st.current = { x: p.x, y: p.y, px: p.x, py: p.y, fx: p.x, fy: p.y, dir: save.dir || 'down', moving: false, t0: 0, fr: 0, steps: 0, lock: false };
  }
  const saveRef = useRef(save);
  saveRef.current = save;
  const cb = useRef({});
  cb.current = { onMove, onCastle, onEncounter, onMenu };

  const isTop = useInput((k) => {
    const s = st.current;
    if (s.moving) return;
    if (k === 'a') {
      const [dx, dy] = DIRS[s.dir];
      const c = castleAt(s.x + dx, s.y + dy);
      if (c >= 0) cb.current.onCastle(c);
      else cb.current.onMenu();
    } else if (k === 'b') cb.current.onMenu();
  });

  useEffect(() => {
    const ctx = canvasRef.current.getContext('2d');
    let raf;

    function afterStep() {
      const s = st.current;
      s.steps++;
      cb.current.onMove(s.x, s.y, s.dir);
      const tile = grid[s.y][s.x];
      const o = own[s.y][s.x];
      if (o < 0 || tile === T.ROAD || tile === T.BRIDGE) return; // 道と橋では敵が出ない
      const rate = tile === T.FOREST || tile === T.MOUNT ? 1 / 12 : 1 / 20;
      if (s.steps > 5 && Math.random() < rate) {
        s.steps = 0;
        s.lock = true;
        cb.current.onEncounter(o);
      }
    }

    function update(t) {
      const s = st.current;
      if (!held.length) s.lock = false;
      if (s.moving) {
        const k = (t - s.t0) / STEP;
        if (k >= 1) {
          s.moving = false;
          s.px = s.x;
          s.py = s.y;
          afterStep();
        } else {
          s.px = s.fx + (s.x - s.fx) * k;
          s.py = s.fy + (s.y - s.fy) * k;
        }
      }
      if (!s.moving && !s.lock && isTop() && held.length) {
        const d = held[held.length - 1];
        s.dir = d;
        const [dx, dy] = DIRS[d];
        const nx = s.x + dx;
        const ny = s.y + dy;
        const c = castleAt(nx, ny);
        if (c >= 0) {
          s.lock = true; // キーを離すまで再度話しかけない
          cb.current.onCastle(c);
          return;
        }
        if (!walkable(nx, ny)) return;
        s.fx = s.x;
        s.fy = s.y;
        s.x = nx;
        s.y = ny;
        s.moving = true;
        s.t0 = t;
        s.fr ^= 1;
      }
    }

    function draw(t) {
      const s = st.current;
      const tick = Math.floor(t / 420) % 2;
      const sv = saveRef.current;
      const nid = nextOf(sv);
      ctx.setTransform(SC, 0, 0, SC, 0, 0);
      ctx.imageSmoothingEnabled = false;
      const camX = Math.min(Math.max(s.px - (vw - 1) / 2, 0), MW - vw);
      const camY = Math.min(Math.max(s.py - (vh - 1) / 2, 0), MH - vh);
      const x0 = Math.floor(camX);
      const y0 = Math.floor(camY);
      const ox = Math.round((camX - x0) * TILE * SC) / SC;
      const oy = Math.round((camY - y0) * TILE * SC) / SC;
      for (let ty = 0; ty <= vh; ty++) {
        for (let tx = 0; tx <= vw; tx++) drawTile(ctx, x0 + tx, y0 + ty, tx * TILE - ox, ty * TILE - oy, tick, sv.cleared, nid);
      }
      const hx = Math.round((s.px - camX) * TILE * SC) / SC;
      const hy = Math.round((s.py - camY) * TILE * SC) / SC;
      const bob = s.moving && (t - s.t0) / STEP < 0.5 ? -1 : 0;
      drawHero(ctx, hx, hy + bob, s.dir, s.moving ? s.fr : 0);
    }

    const loop = (t) => {
      update(t);
      draw(t);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // isTop は毎回同じ働きをする関数なので依存に入れない
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vw, vh]);

  return <canvas ref={canvasRef} className="field" width={vw * TILE * SC} height={vh * TILE * SC} aria-label="フィールドマップ" />;
}
