// キーボード／タッチ入力の共通処理
// 画面（フィールド・会話・メニュー・戦闘）が重なったとき、一番上の画面だけが入力を受け取る
import { useEffect, useRef } from 'react';

const inputStack = [];

/** 押しっぱなしの方向キー（最後に押したものが優先） */
export const held = [];

export const KEYMAP = {
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  KeyZ: 'a', Enter: 'a', Space: 'a',
  KeyX: 'b', Escape: 'b', Backspace: 'b',
};

export function dispatch(k) {
  const h = inputStack[inputStack.length - 1];
  if (h) h.call(k);
}

export function press(dir) {
  if (!held.includes(dir)) held.push(dir);
}

export function release(dir) {
  const i = held.indexOf(dir);
  if (i >= 0) held.splice(i, 1);
}

/**
 * 入力を受け取るフック。マウントした順に積まれ、一番上だけが呼ばれる。
 * 戻り値の関数で「自分が一番上か」を確認できる。
 */
export function useInput(fn) {
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const handleRef = useRef(null);
  useEffect(() => {
    const h = { call: (k) => fnRef.current(k) };
    handleRef.current = h;
    inputStack.push(h);
    return () => {
      const i = inputStack.indexOf(h);
      if (i >= 0) inputStack.splice(i, 1);
    };
  }, []);
  return () => inputStack[inputStack.length - 1] === handleRef.current;
}
