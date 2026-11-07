// 開発者用ボタン。npm run dev のときだけ表示される（本番ビルドには出ない）
import { REGIONS } from '../data/prefectures.js';
import { castles, START } from '../game/world.js';
import { fresh, nextOf } from '../game/save.js';

export default function DevPanel({ save, setSave, mode, encounter, setEncounter, onWarp }) {
  const inGame = mode === 'field';
  const nid = nextOf(save);
  const done = nid >= REGIONS.length;

  const levelUp = (n) => setSave((s) => ({ ...s, heroLv: Math.max(1, s.heroLv + n), exp: 0 }));

  // 次の城の前（なければスタート地点）へ移動
  const warpNext = () => {
    const pos = { ...(done ? START : castles[nid].spawn) };
    setSave((s) => ({ ...s, pos, dir: 'up' }));
    onWarp();
  };

  // 次の城を制覇済みにする（仲間が 2 人未満なら仲間にも加える）
  const clearNext = () =>
    setSave((s) => {
      const id = nextOf(s);
      if (id >= REGIONS.length) return s;
      return { ...s, cleared: [...s.cleared, id], party: s.party.length < 2 ? [...s.party, id] : s.party };
    });

  const reset = () => {
    if (!window.confirm('セーブを消して最初の状態に戻しますか？')) return;
    setSave(fresh());
    onWarp();
  };

  // ボタンにフォーカスが残ると、Enter / Space でもう一度押されてしまうので外す
  const btn = (label, onClick, disabled = false) => (
    <button
      type="button"
      disabled={disabled}
      onClick={(e) => {
        e.currentTarget.blur();
        onClick();
      }}
    >
      {label}
    </button>
  );

  return (
    <div className="dev">
      <span className="dev-title">開発者用</span>
      {btn('Lv+1', () => levelUp(1))}
      {btn('Lv+5', () => levelUp(5))}
      {btn('Lv-1', () => levelUp(-1))}
      {btn(done ? 'スタートへ移動' : `次の城へ移動（${REGIONS[nid].name}）`, warpNext, !inGame)}
      {btn('次の城を制覇済みにする', clearNext, done || mode === 'battle')}
      {btn(`雑魚敵：${encounter ? 'あり' : 'なし'}`, () => setEncounter((v) => !v))}
      {btn('セーブを消す', reset, mode === 'battle')}
    </div>
  );
}
