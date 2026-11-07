// コマンド選択式のターン制バトル
// 流れ：全員のコマンドを選ぶ → 素早い順に行動 → 勝敗チェック → 次のターン
import { useEffect, useRef, useState } from 'react';
import { REGIONS, ELEM, HERO, elemMult } from '../data/prefectures.js';
import { initBattle } from '../game/battle.js';
import { useInput, dispatch } from '../game/input.js';
import PixelMascot from './PixelMascot.jsx';
import Typer from './Typer.jsx';

export default function Battle({ foe, save, reward, onEnd }) {
  const [, setTick] = useState(0);
  const rerender = () => setTick((x) => x + 1);

  // 戦闘中の状態は非同期処理の中から書き換えるので ref にまとめる
  const ref = useRef(null);
  if (!ref.current) ref.current = initBattle(foe, save);
  const b = ref.current;
  const gen = useRef(0);

  const allies = b.units.filter((u) => u.side === 'ally');
  const enemy = b.enemy;
  const P = REGIONS[foe.pid];

  useEffect(() => {
    // StrictMode で2回実行されても、古い方の進行は止まるようにする
    b.gen = ++gen.current;
    run();
    return () => {
      gen.current++;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sleep = (ms) =>
    new Promise((res, rej) => {
      const my = b.gen;
      setTimeout(() => (gen.current === my ? res() : rej(new Error('stopped'))), ms);
    });
  const waitA = () =>
    new Promise((res) => {
      b.waitA = res;
      rerender();
    });

  function say(t, clear) {
    if (clear) b.lines = [];
    b.lines.push(t);
    if (b.lines.length > 4) b.lines.shift();
    b.seq++;
    rerender();
  }

  const note = (e) => (e > 1 ? ' こうかは ばつぐんだ！' : e < 1 ? ' あまり きいていない…' : '');
  const nextAlive = (i) => {
    for (let j = i + 1; j < allies.length; j++) if (allies[j].hp > 0) return j;
    return -1;
  };
  const prevAlive = (i) => {
    for (let j = i - 1; j >= 0; j--) if (allies[j].hp > 0) return j;
    return -1;
  };
  const bentoLeft = () => b.bento - b.plans.filter((x) => x === 'bento').length;

  function hit(a, t, pow) {
    const e = elemMult(a.elem, t.elem);
    let d = (a.atk * pow - t.def * 0.5) * (0.9 + Math.random() * 0.2) * e;
    if (t.guard) d *= 0.5;
    d = Math.max(1, Math.round(d));
    t.hp = Math.max(0, t.hp - d);
    if (t.side === 'enemy') b.blink++;
    else b.shake++;
    return { d, e };
  }

  async function run() {
    try {
      say(foe.wild ? `${enemy.name}が あらわれた！` : `${P.name}の しゅご、${enemy.name}が たちはだかる！`, true);
      await sleep(1200);
      startInput();
    } catch {
      /* 中断 */
    }
  }

  function startInput() {
    b.phase = 'input';
    b.plans = [];
    b.idx = nextAlive(-1);
    b.cur = 0;
    rerender();
  }

  function commandItems() {
    const u = allies[b.idx];
    if (!u) return [];
    return [
      { k: 'atk', l: 'たたかう' },
      { k: 'sk', l: 'ひっさつ', dis: u.cd > 0 },
      { k: 'grd', l: 'ぼうぎょ' },
      { k: 'bento', l: 'べんとう' + bentoLeft(), dis: bentoLeft() <= 0 },
      { k: 'flee', l: 'にげる' },
    ];
  }

  function choose(k) {
    const it = commandItems().find((x) => x.k === k);
    if (!it || it.dis) return;
    if (k === 'flee') {
      b.phase = 'exec';
      rerender();
      doFlee();
      return;
    }
    b.plans[b.idx] = k;
    const n = nextAlive(b.idx);
    if (n < 0) {
      b.phase = 'exec';
      rerender();
      execRound();
    } else {
      b.idx = n;
      b.cur = 0;
      rerender();
    }
  }

  async function doFlee() {
    try {
      say(`${HERO}たちは にげだした！`, true);
      await sleep(800);
      if (Math.random() < (foe.wild ? 0.7 : 0.35)) {
        say('うまく にげきれた！');
        await sleep(900);
        onEnd('flee');
        return;
      }
      say('しかし まわりこまれてしまった！');
      await sleep(900);
      await enemyTurn();
      if (await checkEnd()) return;
      endRound();
      startInput();
    } catch {
      /* 中断 */
    }
  }

  async function allyTurn(u, plan) {
    if (plan === 'bento' && b.bento <= 0) plan = 'atk';
    if (plan === 'atk' || plan === 'sk') {
      const sk = plan === 'sk';
      say(sk ? `${u.name}の ${u.skill}！` : `${u.name}の こうげき！`, true);
      await sleep(450);
      const r = hit(u, enemy, sk ? 1.8 * u.sk : 1);
      if (sk) u.cd = 2;
      say(`${enemy.name}に ${r.d}の ダメージ！${note(r.e)}`);
      await sleep(850);
      if (enemy.hp <= 0) {
        say(`${enemy.name}を やっつけた！`);
        await sleep(800);
      }
    } else if (plan === 'grd') {
      say(`${u.name}は みを まもっている。`, true);
      await sleep(700);
    } else if (plan === 'bento') {
      const t = allies.filter((a) => a.hp > 0).sort((a, c) => a.hp / a.max - c.hp / c.max)[0];
      const h = Math.min(t.max - t.hp, Math.round(t.max * 0.45));
      t.hp += h;
      b.bento--;
      say(`${u.name}は ご当地べんとうを ひろげた！`, true);
      await sleep(450);
      say(`${t.name}の HPが ${h} かいふくした！`);
      await sleep(850);
    }
  }

  async function enemyTurn() {
    const u = enemy;
    const alive = allies.filter((a) => a.hp > 0);
    if (!alive.length || u.hp <= 0) return;
    const pick = (a) => a[Math.floor(Math.random() * a.length)];
    if (u.cd === 0 && Math.random() < 0.5) {
      u.cd = 2;
      if (Math.random() < 0.5) {
        say(`${u.name}の ${u.skillAll}！`, true);
        await sleep(500);
        for (const t of alive) {
          const r = hit(u, t, 0.75 * u.sk);
          say(`${t.name}に ${r.d}の ダメージ！`);
        }
        await sleep(950);
      } else {
        const t = pick(alive);
        say(`${u.name}の ${u.skill}！`, true);
        await sleep(500);
        const r = hit(u, t, 1.6 * u.sk);
        say(`${t.name}に ${r.d}の ダメージ！${note(r.e)}`);
        await sleep(900);
      }
    } else {
      const t = Math.random() < 0.4 ? [...alive].sort((a, c) => a.hp - c.hp)[0] : pick(alive);
      say(`${u.name}の こうげき！`, true);
      await sleep(450);
      const r = hit(u, t, 1);
      say(`${t.name}に ${r.d}の ダメージ！${note(r.e)}`);
      await sleep(850);
    }
    for (const t of alive) {
      if (t.hp <= 0) {
        say(`${t.name}は ちからつきた。`);
        await sleep(700);
      }
    }
  }

  async function execRound() {
    try {
      allies.forEach((u, i) => {
        u.guard = b.plans[i] === 'grd'; // ぼうぎょはターンの最初から有効
      });
      const order = b.units
        .filter((u) => u.hp > 0)
        .map((u) => ({ u, r: u.spd * (0.85 + Math.random() * 0.3) }))
        .sort((a, c) => c.r - a.r)
        .map((o) => o.u);
      for (const u of order) {
        if (u.hp <= 0 || enemy.hp <= 0 || allies.every((a) => a.hp <= 0)) continue;
        if (u.side === 'enemy') await enemyTurn();
        else await allyTurn(u, b.plans[allies.indexOf(u)]);
      }
      if (await checkEnd()) return;
      endRound();
      startInput();
    } catch {
      /* 中断 */
    }
  }

  function endRound() {
    b.units.forEach((u) => {
      u.guard = false;
      if (u.cd > 0) u.cd--;
    });
  }

  async function checkEnd() {
    if (enemy.hp <= 0) {
      b.phase = 'end';
      say(`けいけんち ${reward.exp}ポイントを かくとく！`, true);
      if (reward.up) say(`${HERO}の レベルが ${reward.lv}に あがった！`);
      await waitA();
      if (reward.recruit) {
        say(`${P.name}の しろを せいはした！`, true);
        say(`${P.chara}が なかまに くわわった！`);
        await waitA();
      }
      onEnd('win');
      return true;
    }
    if (allies.every((a) => a.hp <= 0)) {
      b.phase = 'end';
      say(`${HERO}たちは ぜんめつした……`, true);
      await waitA();
      onEnd('lose');
      return true;
    }
    return false;
  }

  useInput((k) => {
    if (b.waitA && (k === 'a' || k === 'b')) {
      const r = b.waitA;
      b.waitA = null;
      rerender();
      r();
      return;
    }
    if (b.phase !== 'input') return;
    const items = commandItems();
    const n = items.length;
    if (k === 'up') b.cur = Math.max(0, b.cur - 2);
    else if (k === 'down') b.cur = Math.min(n - 1, b.cur + 2);
    else if (k === 'left') b.cur = Math.max(0, b.cur - 1);
    else if (k === 'right') b.cur = Math.min(n - 1, b.cur + 1);
    else if (k === 'a') {
      choose(items[b.cur].k);
      return;
    } else if (k === 'b') {
      const p = prevAlive(b.idx);
      if (p >= 0) {
        b.idx = p;
        b.plans.length = p;
        b.cur = 0;
      }
    }
    rerender();
  });

  const items = commandItems();
  const actor = allies[b.idx];
  const lastLine = b.lines[b.lines.length - 1] || '';

  return (
    <div
      key={'s' + b.shake}
      className={'bt' + (b.shake ? ' shake' : '')}
      onClick={() => {
        if (b.waitA) dispatch('a');
      }}
    >
      <div className="status" style={{ gridTemplateColumns: `repeat(${allies.length}, minmax(0, 1fr))` }}>
        {allies.map((a, i) => (
          <div
            key={a.key}
            className={
              'win static st' +
              (a.hp <= 0 ? ' dead' : a.hp / a.max < 0.3 ? ' low' : '') +
              (b.phase === 'input' && i === b.idx ? ' act' : '')
            }
          >
            <div className="n">{a.name}</div>
            <div>H {a.hp}</div>
            <div
              className={'hpbar' + (a.hp / a.max < 0.3 ? ' low' : '')}
              role="progressbar"
              aria-label={`${a.name} HP`}
              aria-valuemin={0}
              aria-valuemax={a.max}
              aria-valuenow={a.hp}
            >
              <span className="hpbar-fill" style={{ width: `${(a.hp / a.max) * 100}%` }} />
            </div>
            <div>Lv {a.lv}</div>
          </div>
        ))}
      </div>

      <div className={'scene ' + ELEM[P.elem].cls}>
        <div key={'b' + b.blink} className={'foe' + (enemy.hp <= 0 ? ' gone' : b.blink ? ' blink' : '')}>
          <div
            className={'hpbar enemy-hp' + (enemy.hp / enemy.max < 0.3 ? ' low' : '')}
            role="progressbar"
            aria-label={`${enemy.name} HP`}
            aria-valuemin={0}
            aria-valuemax={enemy.max}
            aria-valuenow={enemy.hp}
          >
            <span className="hpbar-fill" style={{ width: `${(enemy.hp / enemy.max) * 100}%` }} />
          </div>
          <PixelMascot p={P} width={foe.wild ? '20cqw' : '30cqw'} />
        </div>
      </div>

      <div className="bottom">
        {b.phase === 'input' && actor ? (
          <div className="cmdwrap">
            <div className="win static who">{actor.name}</div>
            <div className="win static cmds">
              {items.map((it, j) => (
                <button
                  key={it.k}
                  className={'opt' + (b.cur === j ? ' sel' : '') + (it.dis ? ' dis' : '')}
                  onClick={(e) => {
                    e.stopPropagation();
                    b.cur = j;
                    rerender();
                    choose(it.k);
                  }}
                >
                  {it.l}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="win static msg" aria-live="polite">
            {b.lines.slice(0, -1).map((l, i) => (
              <p key={i}>{l}</p>
            ))}
            <p>
              <Typer key={b.seq} text={lastLine} speed={18} />
            </p>
            {b.waitA && <span className="more">▼</span>}
          </div>
        )}
      </div>
    </div>
  );
}
