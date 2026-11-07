// タイトル画面
import { useState } from 'react';
import { useInput } from '../game/input.js';

export default function Title({ hasSave, onNew, onContinue }) {
  const items = hasSave ? ['続きから', '最初から'] : ['最初から'];
  const [cur, setCur] = useState(0);
  const [confirm, setConfirm] = useState(false);
  const [confirmCur, setConfirmCur] = useState(1);

  function pick(j) {
    if (items[j] === '続きから') onContinue();
    else if (hasSave) setConfirm(true);
    else onNew();
  }

  useInput((k) => {
    if (confirm) {
      if (k === 'up' || k === 'down') setConfirmCur((v) => 1 - v);
      else if (k === 'a') (confirmCur === 0 ? onNew() : setConfirm(false));
      else if (k === 'b') setConfirm(false);
      return;
    }
    if (k === 'up') setCur((v) => Math.max(0, v - 1));
    else if (k === 'down') setCur((v) => Math.min(items.length - 1, v + 1));
    else if (k === 'a') pick(cur);
  });

  return (
    <div className="title">
      <div className="logo">
        ご当地キャラの<span className="ran">乱</span>
        <small>〜日本列島縦断〜</small>
      </div>
      {confirm ? (
        <div className="win static">
          <div style={{ marginBottom: '.3em' }}>冒険の書を消して始めますか？</div>
          {['はい', 'いいえ'].map((t, j) => (
            <button key={t} className={'opt' + (confirmCur === j ? ' sel' : '')} onClick={() => (j === 0 ? onNew() : setConfirm(false))}>
              {t}
            </button>
          ))}
        </div>
      ) : (
        <div className="win static">
          {items.map((t, j) => (
            <button key={t} className={'opt' + (cur === j ? ' sel' : '')} onClick={() => pick(j)}>
              {t}
            </button>
          ))}
        </div>
      )}
      <div className="press">Zキー / Aボタンで決定</div>
    </div>
  );
}
