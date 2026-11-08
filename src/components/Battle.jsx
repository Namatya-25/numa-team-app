// コマンド選択式のターン制バトル
// 流れ：全員のコマンドを選ぶ → 素早い順に行動 → 勝敗チェック → 次のターン
import { useEffect, useRef, useState } from 'react';
import { REGIONS, ELEM, HERO, elemMult } from '../data/prefectures.js';
import { initBattle } from '../game/battle.js';
import { useInput, dispatch } from '../game/input.js';
import PixelMascot from './PixelMascot.jsx';
import Typer from './Typer.jsx';
import { sfx } from '../game/sound.js';

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
  const isLargeBossArt = (P.id === 0 || P.id === 1 || P.id === 2 || P.id === 3 || P.id === 4 || P.id === 5) && !foe.wild;

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

  const note = (e) => (e > 1 ? ' 効果は抜群だ！' : e < 1 ? ' あまり効いていない…' : '');
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
    if (t.side === 'enemy') {
      b.blink++;
      (e > 1 ? sfx.crit : sfx.hit)();
    } else {
      b.shake++;
      (t.guard ? sfx.guard : sfx.damage)();
    }
    return { d, e };
  }

  async function run() {
    try {
      (foe.wild ? sfx.encounter : sfx.boss)();
      say(foe.wild ? `${enemy.name}が現れた！` : `${P.name}の守護、${enemy.name}が立ちはだかる！`, true);
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
      { k: 'atk', l: '戦う' },
      { k: 'sk', l: '必殺', dis: u.cd > 0 },
      { k: 'grd', l: '防御' },
      { k: 'bento', l: '弁当' + bentoLeft(), dis: bentoLeft() <= 0 },
      { k: 'flee', l: '逃げる' },
    ];
  }

  function choose(k) {
    const it = commandItems().find((x) => x.k === k);
    if (!it || it.dis) {
      if (it) sfx.ng();
      return;
    }
    sfx.select();
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
      say(`${HERO}たちは逃げ出した！`, true);
      await sleep(800);
      // 1回目は確率で成功、2回目は必ず逃げ切れる
      b.fleeTries += 1;
      if (b.fleeTries >= 2 || Math.random() < (foe.wild ? 0.7 : 0.35)) {
        sfx.flee();
        say('うまく逃げ切れた！');
        await sleep(900);
        onEnd('flee');
        return;
      }
      say('しかし回り込まれてしまった！');
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
      if (sk) sfx.skill();
      say(sk ? `${u.name}の${u.skill}！` : `${u.name}の攻撃！`, true);
      await sleep(450);
      const r = hit(u, enemy, sk ? 1.8 * u.sk : 1);
      if (sk) u.cd = 2;
      say(`${enemy.name}に ${r.d}の ダメージ！${note(r.e)}`);
      await sleep(850);
      if (enemy.hp <= 0) {
        sfx.defeat();
        say(`${enemy.name}をやっつけた！`);
        await sleep(800);
      }
    } else if (plan === 'grd') {
      sfx.guard();
      say(`${u.name}は身を守っている。`, true);
      await sleep(700);
    } else if (plan === 'bento') {
      const t = allies.filter((a) => a.hp > 0).sort((a, c) => a.hp / a.max - c.hp / c.max)[0];
      const h = Math.min(t.max - t.hp, Math.round(t.max * 0.45));
      t.hp += h;
      b.bento--;
      say(`${u.name}はご当地弁当を広げた！`, true);
      await sleep(450);
      sfx.heal();
      say(`${t.name}のHPが${h}回復した！`);
      await sleep(850);
    }
  }

  async function enemyTurn() {
    const u = enemy;
    const alive = allies.filter((a) => a.hp > 0);
    if (!alive.length || u.hp <= 0) return;
    const pick = (a) => a[Math.floor(Math.random() * a.length)];
    // 敵の行動の順番
    // ・ボス：通常攻撃 → データ攻撃 → 特別データ攻撃（1回だけ） → 通常攻撃 → データ攻撃 → … とくり返す
    // ・雑魚敵：データ攻撃 → 通常攻撃 → データ攻撃 → … とくり返す
    const n = b.enemyTurns++;
    let act = 'normal';
    if (foe.wild) {
      if (b.quiz.length && n % 2 === 0) act = 'quiz';
    } else if (n === 2 && b.links) act = 'links';
    else if (b.quiz.length && n % 2 === 1) act = 'quiz';
    if (act === 'links') {
      const lq = b.links;
      b.links = null;
      await linksTurn(u, alive, lq);
    } else if (act === 'quiz') await quizTurn(u, alive);
    // 必殺技は、最初の番（かならず通常攻撃）のあとから
    else if (n > 0 && u.cd === 0 && Math.random() < 0.5) {
      u.cd = 2;
      if (Math.random() < 0.5) {
        sfx.skill();
        say(`${u.name}の${u.skillAll}！`, true);
        await sleep(500);
        for (const t of alive) {
          const r = hit(u, t, 0.75 * u.sk);
          say(`${t.name}に ${r.d}の ダメージ！`);
        }
        await sleep(950);
      } else {
        const t = pick(alive);
        sfx.skill();
        say(`${u.name}の ${u.skill}！`, true);
        await sleep(500);
        const r = hit(u, t, 1.6 * u.sk);
        say(`${t.name}に ${r.d}の ダメージ！${note(r.e)}`);
        await sleep(900);
      }
    } else {
      const t = Math.random() < 0.4 ? [...alive].sort((a, c) => a.hp - c.hp)[0] : pick(alive);
      say(`${u.name}の攻撃！`, true);
      await sleep(450);
      const r = hit(u, t, 1);
      say(`${t.name}に ${r.d}の ダメージ！${note(r.e)}`);
      await sleep(850);
    }
    for (const t of alive) {
      if (t.hp <= 0) {
        sfx.down();
        say(`${t.name}は力尽きた。`);
        await sleep(700);
      }
    }
  }

  // クイズを出して、選んだ県名が返ってくるまで待つ
  const askQuiz = (qz) =>
    new Promise((res) => {
      b.ask = { ...qz, res };
      b.phase = 'quiz';
      b.cur = 0;
      rerender();
    });

  function answer(choice) {
    if (!b.ask) return;
    const r = b.ask.res;
    b.ask = null;
    b.phase = 'exec';
    rerender();
    r(choice);
  }

  // データ攻撃：正解なら跳ね返して敵にダメージ、不正解なら味方全員に大ダメージ
  async function quizTurn(u, alive) {
    const qz = b.quiz[b.qi++ % b.quiz.length];
    sfx.skill();
    say(`${u.name}のデータ攻撃！`, true);
    await sleep(800);
    const choice = await askQuiz(qz);
    if (choice === qz.answer) {
      sfx.select();
      say('見切った！ データ攻撃を跳ね返した！', true);
      await sleep(500);
      const d = Math.max(1, Math.round(u.max * 0.15));
      u.hp = Math.max(0, u.hp - d);
      b.blink++;
      sfx.crit();
      say(`${u.name}に ${d}の ダメージ！`);
      await sleep(800);
    } else {
      sfx.ng();
      say('ハズレ！ データの力が襲いかかる！', true);
      await sleep(500);
      for (const t of alive) {
        const r = hit(u, t, 1.1 * u.sk);
        say(`${t.name}に ${r.d}の ダメージ！`);
      }
      await sleep(900);
    }
    say(qz.reveal, true);
    await waitA();
    if (u.hp <= 0) {
      sfx.defeat();
      say(`${u.name}をやっつけた！`, true);
      await sleep(800);
    }
  }

  // 特別データ攻撃：本物のオープンデータのサイトで調べて答える。時間制限なし。
  // 正解なら、調べた力で敵の体力を半分まで削る。外してもダメージは受けない（調べられない人も先へ進めるように）
  async function linksTurn(u, alive, qz) {
    sfx.boss();
    say(`${u.name}の特別データ攻撃！`, true);
    await sleep(700);
    say('国土交通省「Project LINKS」のデータを調べないと答えられない！\n正解すれば、敵の体力を半分まで削れるぞ！');
    await waitA();
    const choice = await askQuiz(qz);
    if (choice === qz.answer) {
      sfx.select();
      say('調べて見切った！ データの力で反撃だ！', true);
      await sleep(600);
      // 敵の体力を最大HPの半分まで削る。もう半分より少なければ、残りの半分を削る
      const half = Math.round(u.max / 2);
      const d = Math.max(1, u.hp > half ? u.hp - half : Math.ceil(u.hp / 2));
      u.hp = Math.max(0, u.hp - d);
      b.blink++;
      sfx.crit();
      say(`会心の一撃！ ${u.name}に ${d}の ダメージ！`);
      await sleep(900);
    } else {
      sfx.ng();
      say('ざんねん！ でも調べたことはムダにならない。', true);
      await sleep(900);
    }
    say(qz.reveal, true);
    say(`出典：${qz.source}`);
    await waitA();
    if (u.hp <= 0) {
      sfx.defeat();
      say(`${u.name}をやっつけた！`, true);
      await sleep(800);
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
      sfx.win();
      say(`経験値${reward.exp}ポイントを獲得！`, true);
      if (reward.up) {
        setTimeout(sfx.levelup, 1300);
        say(`${HERO}のレベルが${reward.lv}に上がった！`);
      }
      await waitA();
      if (reward.recruit) {
        sfx.recruit();
        say(`${P.name}の城を制覇した！`, true);
        say(`${P.chara}が仲間に加わった！`);
        await waitA();
      }
      onEnd('win');
      return true;
    }
    if (allies.every((a) => a.hp <= 0)) {
      b.phase = 'end';
      sfx.lose();
      say(`${HERO}たちは全滅した……`, true);
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
      sfx.cursor();
      rerender();
      r();
      return;
    }
    if (b.phase === 'quiz' && b.ask) {
      const n = b.ask.choices.length;
      const before = b.cur;
      if (k === 'up') b.cur = Math.max(0, b.cur - 2);
      else if (k === 'down') b.cur = Math.min(n - 1, b.cur + 2);
      else if (k === 'left') b.cur = Math.max(0, b.cur - 1);
      else if (k === 'right') b.cur = Math.min(n - 1, b.cur + 1);
      else if (k === 'a') {
        answer(b.ask.choices[b.cur]);
        return;
      } else if (k === 'b' && b.ask.link) {
        // 特別データ攻撃：Bボタン（X キー）でデータのサイトを別のタブで開く
        window.open(b.ask.link, '_blank', 'noopener,noreferrer');
        return;
      }
      if (b.cur !== before) sfx.cursor();
      rerender();
      return;
    }
    if (b.phase !== 'input') return;
    const items = commandItems();
    const n = items.length;
    const before = b.cur;
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
        sfx.cancel();
      }
    }
    if (b.cur !== before) sfx.cursor();
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
            <div>
              HP {a.hp}/{a.max}
            </div>
            <div
              className={'hpbar ally-hp' + (a.hp / a.max < 0.3 ? ' low' : a.hp / a.max < 0.5 ? ' mid' : '')}
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
        <div
          key={'b' + b.blink}
          className={'foe' + (enemy.hp <= 0 ? ' gone' : b.blink ? ' blink' : '') + (isLargeBossArt ? ' foe-large-art' : '')}
        >
          <div
            className={'hpbar enemy-hp' + (enemy.hp / enemy.max < 0.3 ? ' low' : enemy.hp / enemy.max < 0.5 ? ' mid' : '')}
            role="progressbar"
            aria-label={`${enemy.name} HP`}
            aria-valuemin={0}
            aria-valuemax={enemy.max}
            aria-valuenow={enemy.hp}
          >
            <span className="hpbar-fill" style={{ width: `${(enemy.hp / enemy.max) * 100}%` }} />
          </div>
          {/* 一部の城ボスは専用PNGに差し替え、野生戦では従来のSVGを表示する */}
          {isLargeBossArt ? (
            <img
              className="enemy-mascot"
              src={P.id === 0 ? '/hokkaido-bear-mascot.png' : P.id === 1 ? '/tohoku-gyutan-monster.png' : P.id === 2 ? '/kanto-boss.png' : P.id === 3 ? '/chubu-boss.png' : P.id === 4 ? '/kinki-boss.png' : '/chugoku-shikoku-boss.png'}
              alt={P.chara}
              style={{ width: '130cqw' }}
            />
          ) : (
            <PixelMascot p={P} width={foe.wild ? '20cqw' : '30cqw'} />
          )}
        </div>
      </div>

      <div className="bottom">
        {b.phase === 'quiz' && b.ask ? (
          <div className="cmdwrap">
            <div className={'win static msg quiz-q' + (b.ask.special ? ' special' : '')} aria-live="polite">
              <p className="quiz-tag">{b.ask.special ? '特別データ攻撃（Project LINKS）' : 'データ攻撃'}</p>
              <p>{b.ask.q}</p>
              {b.ask.special && (
                <>
                  <p className="quiz-hint">
                    ヒント：
                    {b.ask.hint.split(/«(.+?)»/).map((t, i) =>
                      i % 2 ? (
                        <span key={i} className="quiz-mark">
                          {t}
                        </span>
                      ) : (
                        t
                      ),
                    )}
                  </p>
                  <a
                    className="quiz-link"
                    href={b.ask.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    データのサイトを開く ↗（Bボタン）
                  </a>
                </>
              )}
            </div>
            <div className={'win static cmds quiz-opts' + (b.ask.wide ? ' wide' : '')}>
              {b.ask.choices.map((c, j) => (
                <button
                  key={c}
                  className={'opt' + (b.cur === j ? ' sel' : '')}
                  onClick={(e) => {
                    e.stopPropagation();
                    b.cur = j;
                    answer(c);
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        ) : b.phase === 'input' && actor ? (
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
