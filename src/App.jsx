// 画面の切り替え（タイトル／フィールド／戦闘）と全体の状態管理
// ありがとう
import { useEffect, useRef, useState } from 'react';
import { REGIONS, HERO, mods, enemyLevel } from './data/prefectures.js';
import { castles, ownAt, DIRS, START } from './game/world.js';
import { fresh, hasSaved, loadSave, persist, nextOf, rewardFor } from './game/save.js';
import { KEYMAP, dispatch, held, press, release } from './game/input.js';
import Field from './components/Field.jsx';
import Battle from './components/Battle.jsx';
import Title from './components/Title.jsx';
import Menu from './components/Menu.jsx';
import Dialog from './components/Dialog.jsx';
import ControlPad from './components/ControlPad.jsx';

export default function App() {
  const [save, setSave] = useState(loadSave);
  const hadSave = useRef(hasSaved());
  const [mode, setMode] = useState('title'); // 'title' | 'field' | 'battle'
  const [dialog, setDialog] = useState(null);
  const dialogId = useRef(0);
  const [menu, setMenu] = useState(false);
  const [battle, setBattle] = useState(null);
  const [area, setArea] = useState(null);
  const lastArea = useRef(ownAt(save.pos.x, save.pos.y));
  const [narrow, setNarrow] = useState(() => window.innerWidth < 600);

  const vw = narrow ? 11 : 15; // 画面に映るタイル数
  const vh = 11;
  const nextId = nextOf(save);

  // オートセーブ
  useEffect(() => {
    if (mode !== 'title') persist(save);
  }, [save, mode]);

  // キーボード入力と画面幅
  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth < 600);
    const onKeyDown = (e) => {
      const k = KEYMAP[e.code];
      if (!k) return;
      e.preventDefault();
      if (DIRS[k]) press(k);
      dispatch(k);
    };
    const onKeyUp = (e) => {
      const k = KEYMAP[e.code];
      if (k && DIRS[k]) release(k);
    };
    const onBlur = () => {
      held.length = 0;
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  const talk = (lines, choices, onDone) => setDialog({ id: ++dialogId.current, lines, choices, onDone });

  function startBattle(foe) {
    setMenu(false);
    setBattle({ foe, key: Date.now(), reward: rewardFor(save, foe) });
    setMode('battle');
  }

  // 城に話しかけたとき：地域データを読み上げてからボス戦
  function onCastle(id) {
    const p = REGIONS[id];
    const m = mods(p);
    if (id > nextId) {
      talk([`${p.name}の城だ。`, `不思議な力で扉が開かない……\n先に${REGIONS[nextId].name}の城を制覇しよう。`]);
      return;
    }
    if (save.cleared.includes(id)) {
      talk([`${p.name}の城は制覇済みだ。`, `${p.chara}と手合わせしますか？\n（経験値 0.6倍）`], ['はい', 'いいえ'], (c) => {
        if (c === 0) startBattle({ pid: id, wild: false });
      });
      return;
    }
    talk(
      [
        `ここは${p.name}の城。`,
        `地形データ：最高峰 ${p.peak.toLocaleString()}m・森林率 ${p.forest}%\n→ 防御×${m.def.toFixed(2)}　素早さ×${m.spd.toFixed(2)}`,
        `名物「${p.food}」の力（グルメ指数 ${p.foodIdx}）\n→ HP×${m.hp.toFixed(2)}　必殺×${m.sk.toFixed(2)}`,
        `魅力度 ${REGIONS.length}エリア中 ${p.rank}位。${p.rank <= 2 ? '人気エリアの強敵だ！' : ''}（Lv+${m.lv}）`,
        `${p.chara}（Lv${enemyLevel(p)}・${p.elem}属性）が待ち構えている。\n挑みますか？`,
      ],
      ['はい', 'いいえ'],
      (c) => {
        if (c === 0) startBattle({ pid: id, wild: false });
      }
    );
  }

  function endBattle(result) {
    const { foe, reward } = battle;
    let ns = save;
    if (result === 'win') {
      ns = { ...save, heroLv: reward.lv, exp: reward.rest };
      if (reward.recruit) {
        ns.cleared = [...save.cleared, foe.pid];
        if (save.party.length < 2) ns.party = [...save.party, foe.pid];
      }
    } else if (result === 'lose') {
      // 最後に制覇した城の前へ戻る
      const last = save.cleared.length ? Math.max(...save.cleared) : -1;
      ns = { ...save, pos: { ...(last >= 0 ? castles[last].spawn : START) }, dir: 'down' };
    }
    setSave(ns);
    lastArea.current = ownAt(ns.pos.x, ns.pos.y);
    setBattle(null);
    setMode('field');

    if (result === 'lose') {
      const here = ownAt(ns.pos.x, ns.pos.y);
      talk([`……${HERO}は目を覚ました。`, `${here >= 0 ? REGIONS[here].name : '城'}まで戻されたようだ。\n仲間と経験を積んで、また挑もう。`]);
    } else if (result === 'win' && reward.recruit && ns.cleared.length === REGIONS.length) {
      talk([`ついに${REGIONS.length}の城をすべて制覇した！`, '日本列島縦断、達成！', '── おめでとう！ ──\nこれからも再戦で鍛えられる。']);
    } else if (result === 'win' && reward.recruit && ns.cleared.length === 1) {
      talk(['仲間ができた！', 'メニューの「仲間」で連れていく仲間を選べる。\n相性も考えよう。']);
    }
  }

  function onMove(x, y, dir) {
    setSave((s) => ({ ...s, pos: { x, y }, dir }));
    const o = ownAt(x, y);
    if (o >= 0 && o !== lastArea.current) {
      lastArea.current = o;
      setArea({ name: REGIONS[o].name, n: Date.now() });
    }
  }

  function newGame() {
    const f = fresh();
    setSave(f);
    persist(f);
    hadSave.current = true;
    lastArea.current = 0;
    setMode('field');
    talk([
      'ここは北海道。日本列島の北の果て。',
      '全国のご当地キャラたちが自分の土地を守るため、\n一斉に乱を起こした！',
      `旅人${HERO}よ。本土の7地方と離島、${REGIONS.length}の城を制覇し、\n日本のすみずみまで旅するのだ！`,
      '矢印キーで移動。Zキーで調べる・メニュー。\n城にぶつかると話しかけられる。',
    ]);
  }

  return (
    <div className="console">
      <div className="screen" style={{ aspectRatio: `${vw} / ${vh}` }}>
        {mode !== 'battle' && (
          <Field
            key={'f' + vw}
            save={save}
            vw={vw}
            vh={vh}
            onMove={onMove}
            onCastle={onCastle}
            onEncounter={(pid) => startBattle({ pid, wild: true })}
            onMenu={() => setMenu(true)}
          />
        )}
        {mode === 'battle' && battle && (
          <Battle key={battle.key} foe={battle.foe} save={save} reward={battle.reward} onEnd={endBattle} />
        )}
        {mode === 'title' && <Title hasSave={hadSave.current} onNew={newGame} onContinue={() => setMode('field')} />}
        {mode === 'field' && area && !dialog && !menu && (
          <div key={area.n} className="win area">
            {area.name}
          </div>
        )}
        {mode === 'field' && menu && <Menu save={save} setSave={setSave} onClose={() => setMenu(false)} />}
        {dialog && mode !== 'battle' && <Dialog key={dialog.id} d={dialog} onClose={() => setDialog(null)} />}
      </div>

      <div className="hud">
        <span>
          制覇 <b>{save.cleared.length} / {REGIONS.length}</b>
        </span>
        <span>
          次 <b>{nextId < REGIONS.length ? REGIONS[nextId].name + 'の城' : '完全制覇'}</b>
        </span>
        <span>
          {HERO} <b>Lv{save.heroLv}</b>
        </span>
      </div>

      <ControlPad />

      <p className="note">
        地域データ（最高峰・森林率・名物・魅力度順位）は参考値のサンプルです。登場キャラクターはすべてオリジナル。冒険の書（セーブ）はこのブラウザに自動保存されます。
      </p>
    </div>
  );
}
