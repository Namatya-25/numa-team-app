// フィールドのメニュー（つよさ・なかま・ちず・データ）
import { useEffect, useRef, useState } from 'react';
import { REGIONS, HERO, mods, enemyLevel, stats, need } from '../data/prefectures.js';
import { MW, MH, T, grid, own, castles, ownAt } from '../game/world.js';
import { GRASS_COL } from '../game/render.js';
import { nextOf } from '../game/save.js';
import { useInput } from '../game/input.js';

const ROOT = ['強さ', '仲間', '地図', 'データ', '閉じる'];

function MiniMap({ save }) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current.getContext('2d');
    const s = 4;
    const nid = nextOf(save);
    for (let y = 0; y < MH; y++) {
      for (let x = 0; x < MW; x++) {
        const t = grid[y][x];
        const o = own[y][x];
        c.fillStyle =
          t === T.SEA ? '#1c3f73' : t === T.BRIDGE ? '#8b5a2b' : t === T.ROAD ? '#c9a86b' : o >= 0 ? GRASS_COL[REGIONS[o].elem] : '#5fa84a';
        c.fillRect(x * s, y * s, s, s);
      }
    }
    castles.forEach((k, i) => {
      c.fillStyle = save.cleared.includes(i) ? '#e0482f' : i === nid ? '#f2c14e' : '#ffffff';
      c.fillRect(k.x * s - 1, k.y * s - 1, s * 2 + 2, s * 2 + 2); // 城は 2x2 マス
    });
    c.fillStyle = '#000';
    c.fillRect(save.pos.x * s - 2, save.pos.y * s - 2, s + 4, s + 4);
    c.fillStyle = '#fff';
    c.fillRect(save.pos.x * s - 1, save.pos.y * s - 1, s + 2, s + 2);
  }, [save]);
  return <canvas ref={ref} width={MW * 4} height={MH * 4} />;
}

function DataView({ p }) {
  const m = mods(p);
  return (
    <div>
      <h3>
        {p.name}の城　{p.chara}
      </h3>
      <div style={{ marginBottom: '.4em' }}>
        Lv{enemyLevel(p)}・{p.elem}属性{p.rank <= 2 ? '・強敵' : ''}
      </div>
      <div className="tbl">
        <span>最高峰</span><span>{p.peak.toLocaleString()}m</span><span className="eff">防御×{m.def.toFixed(2)}</span>
        <span>森林率</span><span>{p.forest}%</span><span className="eff">素早さ×{m.spd.toFixed(2)}</span>
        <span>名物</span><span>{p.food}（{p.foodIdx}）</span><span className="eff">HP×{m.hp.toFixed(2)}</span>
        <span></span><span>{p.food}乱舞</span><span className="eff">必殺×{m.sk.toFixed(2)}</span>
        <span>魅力度</span><span>{REGIONS.length}エリア中 {p.rank}位</span><span className="eff">Lv+{m.lv}</span>
      </div>
      <p className="hint" style={{ color: '#fff' }}>山は街に、街は海に、海は山に強い（1.5倍）</p>
    </div>
  );
}

export default function Menu({ save, setSave, onClose }) {
  const [view, setView] = useState(null);
  const [cur, setCur] = useState(0);
  const [partyCur, setPartyCur] = useState(0);
  const [hint, setHint] = useState('');
  const mates = [...save.cleared].sort((a, b) => a - b);

  function toggle(id) {
    if (save.party.includes(id)) {
      setSave((s) => ({ ...s, party: s.party.filter((x) => x !== id) }));
      setHint('');
    } else if (save.party.length >= 2) {
      setHint('連れていける仲間は2人まで。');
    } else {
      setSave((s) => ({ ...s, party: [...s.party, id] }));
      setHint('');
    }
  }

  function open(j) {
    if (ROOT[j] === '閉じる') onClose();
    else {
      setView(ROOT[j]);
      setPartyCur(0);
      setHint('');
    }
  }

  useInput((k) => {
    if (!view) {
      if (k === 'up') setCur((v) => (v + ROOT.length - 1) % ROOT.length);
      else if (k === 'down') setCur((v) => (v + 1) % ROOT.length);
      else if (k === 'a') open(cur);
      else if (k === 'b') onClose();
    } else if (view === '仲間' && mates.length) {
      if (k === 'up' || k === 'left') setPartyCur((v) => Math.max(0, v - 1));
      else if (k === 'down' || k === 'right') setPartyCur((v) => Math.min(mates.length - 1, v + 1));
      else if (k === 'a') toggle(mates[partyCur]);
      else if (k === 'b') setView(null);
    } else if (k === 'a' || k === 'b') setView(null);
  });

  const here = ownAt(save.pos.x, save.pos.y);
  const nid = nextOf(save);
  const dataPref = REGIONS[here >= 0 ? here : Math.min(nid, REGIONS.length - 1)];

  let body = null;
  if (view === '強さ') {
    const list = [
      { n: HERO, s: stats(save.heroLv, null, 1.2), e: 'なし' },
      ...save.party.map((id) => ({ n: REGIONS[id].chara, s: stats(save.heroLv, REGIONS[id], 0.85), e: REGIONS[id].elem })),
    ];
    body = (
      <div>
        <h3>
          強さ　Lv{save.heroLv}　次のレベルまで {need(save.heroLv) - save.exp}
        </h3>
        <div className="rows">
          {list.map((u) => (
            <div key={u.n} className="row">
              <span>{u.n}（{u.e}）</span>
              <span>HP{u.s.hp} 攻{u.s.atk} 防{u.s.def} 速{u.s.spd}</span>
            </div>
          ))}
        </div>
        <p className="hint" style={{ color: '#fff' }}>
          制覇 {save.cleared.length}/{REGIONS.length}　仲間は主人公と同じLvで戦う。
        </p>
      </div>
    );
  } else if (view === '仲間') {
    body = (
      <div>
        <h3>仲間（★＝連れていく・2人まで）</h3>
        {mates.length ? (
          <div className="mates">
            {mates.map((id, j) => (
              <button
                key={id}
                className={'opt' + (partyCur === j ? ' sel' : '')}
                onClick={() => {
                  setPartyCur(j);
                  toggle(id);
                }}
              >
                {save.party.includes(id) ? '★' : '　'}
                {REGIONS[id].chara}（{REGIONS[id].elem}）
              </button>
            ))}
          </div>
        ) : (
          <p style={{ margin: 0 }}>まだ仲間がいない。城を制覇すると、そのエリアのキャラが仲間になる。</p>
        )}
        <p className="hint">{hint}</p>
      </div>
    );
  } else if (view === '地図') {
    body = (
      <div className="mapbox">
        <MiniMap save={save} />
        <div className="rows">
          <div><span className="sw" style={{ background: '#e0482f' }} />制覇済み</div>
          <div><span className="sw" style={{ background: '#f2c14e' }} />次の目的地</div>
          <div><span className="sw" style={{ background: '#fff' }} />未到達</div>
          <div style={{ marginTop: '.5em' }}>次：{nid < REGIONS.length ? REGIONS[nid].name : '完全制覇！'}</div>
        </div>
      </div>
    );
  } else if (view === 'データ') {
    body = <DataView p={dataPref} />;
  }

  return (
    <>
      {!view && (
        <div className="win menu-root">
          {ROOT.map((t, j) => (
            <button
              key={t}
              className={'opt' + (cur === j ? ' sel' : '')}
              onClick={() => {
                setCur(j);
                open(j);
              }}
            >
              {t}
            </button>
          ))}
        </div>
      )}
      {view && (
        <div className="win panel" onClick={() => view !== '仲間' && setView(null)}>
          {body}
        </div>
      )}
    </>
  );
}
