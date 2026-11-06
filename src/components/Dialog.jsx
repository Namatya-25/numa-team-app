// 会話ウィンドウ（1ページずつ文字送り。最後のページで「はい/いいえ」などの選択肢を出せる）
import { useEffect, useState } from 'react';
import { useInput } from '../game/input.js';

/** d = { lines: string[], choices?: string[], onDone?: (index) => void } */
export default function Dialog({ d, onClose }) {
  const [page, setPage] = useState(0);
  const [n, setN] = useState(0);
  const [choice, setChoice] = useState(0);

  const text = d.lines[page];
  const done = n >= text.length;
  const last = page === d.lines.length - 1;
  const showChoices = last && done && d.choices;

  useEffect(() => {
    setN(0);
    const id = setInterval(() => {
      setN((v) => {
        if (v >= text.length) {
          clearInterval(id);
          return v;
        }
        return v + 1;
      });
    }, 28);
    return () => clearInterval(id);
  }, [page, text]);

  function finish(x) {
    onClose();
    d.onDone?.(x);
  }

  function advance() {
    if (!done) setN(text.length);
    else if (!last) setPage(page + 1);
    else if (!d.choices) finish(-1);
  }

  useInput((k) => {
    if (showChoices) {
      if (k === 'up' || k === 'left') setChoice((v) => Math.max(0, v - 1));
      else if (k === 'down' || k === 'right') setChoice((v) => Math.min(d.choices.length - 1, v + 1));
      else if (k === 'a') finish(choice);
      else if (k === 'b') finish(d.choices.length - 1);
    } else if (k === 'a' || k === 'b') advance();
  });

  return (
    <>
      <div className="win dlg" onClick={advance} role="dialog" aria-live="polite">
        <p>{text.slice(0, n)}</p>
        {done && !showChoices && <span className="more">▼</span>}
      </div>
      {showChoices && (
        <div className="win choice">
          {d.choices.map((t, j) => (
            <button key={t} className={'opt' + (choice === j ? ' sel' : '')} onClick={() => finish(j)}>
              {t}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
