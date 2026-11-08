// 画面下の十字キーとA/Bボタン（スマホ・マウス用）
import { dispatch, press, release } from '../game/input.js';

function DirButton({ dir, label }) {
  return (
    <button
      aria-label={label}
      onPointerDown={(e) => {
        e.preventDefault();
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          /* 未対応なら無視 */
        }
        press(dir);
        dispatch(dir);
      }}
      onPointerUp={() => release(dir)}
      onPointerCancel={() => release(dir)}
    >
      {label}
    </button>
  );
}

export default function ControlPad() {
  return (
    <div className="pad">
      <div className="dpad">
        <span />
        <DirButton dir="up" label="▲" />
        <span />
        <DirButton dir="left" label="◀" />
        <span className="c" />
        <DirButton dir="right" label="▶" />
        <span />
        <DirButton dir="down" label="▼" />
        <span />
      </div>
      <div className="keys">
        移動：矢印 / WASD
        <br />
        決定・調べる：Z / Enter
        <br />
        メニュー・戻る：X / Esc
      </div>
      <div className="ab">
        <button className="b" aria-label="Bボタン" onPointerDown={(e) => { e.preventDefault(); dispatch('b'); }}>
          B
        </button>
        <button className="a" aria-label="Aボタン" onPointerDown={(e) => { e.preventDefault(); dispatch('a'); }}>
          A
        </button>
      </div>
    </div>
  );
}
