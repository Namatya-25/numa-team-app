// 効果音（Web Audio API で音を合成するので、音声ファイルは使わない）
// ブラウザは「ユーザーが操作するまで音を鳴らせない」ので、最初のキー入力・タップで有効にする

let ctx = null;
let master = null;

function getCtx() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.25;
  master.connect(ctx.destination);
  return ctx;
}

function unlock() {
  const c = getCtx();
  if (c && c.state === 'suspended') c.resume();
}
if (typeof window !== 'undefined') {
  ['pointerdown', 'keydown', 'touchstart'].forEach((ev) =>
    window.addEventListener(ev, unlock, { passive: true }),
  );
}

/** 1音鳴らす。f0→f1 へ周波数を変化させられる */
function tone({ type = 'square', f0, f1 = f0, at = 0, dur = 0.1, vol = 0.5 }) {
  const c = getCtx();
  if (!c || c.state !== 'running') return;
  const t = c.currentTime + at;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

/** ノイズ（打撃音・爆発音用） */
function noise({ at = 0, dur = 0.15, vol = 0.5, freq = 1200 }) {
  const c = getCtx();
  if (!c || c.state !== 'running') return;
  const t = c.currentTime + at;
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = freq;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t);
}

/** 音符を順に鳴らす（ジングル用） notes = [[周波数, 長さ秒], ...] 0 は休符 */
function melody(notes, { type = 'square', vol = 0.35, gap = 0 } = {}) {
  let at = 0;
  for (const [f, d] of notes) {
    if (f) tone({ type, f0: f, at, dur: d * 0.95, vol });
    at += d + gap;
  }
}

// 音名 → 周波数
const N = { C4: 262, D4: 294, E4: 330, F4: 349, G4: 392, A4: 440, B4: 494, C5: 523, D5: 587, E5: 659, F5: 698, G5: 784, A5: 880, C6: 1047 };

export const sfx = {
  cursor: () => tone({ f0: 880, dur: 0.04, vol: 0.25 }),
  select: () => tone({ f0: 660, f1: 990, dur: 0.07, vol: 0.3 }),
  cancel: () => tone({ f0: 440, f1: 300, dur: 0.07, vol: 0.3 }),
  ng: () => tone({ type: 'sawtooth', f0: 150, dur: 0.12, vol: 0.3 }),
  encounter: () => {
    for (let i = 0; i < 6; i++) tone({ f0: 300 + i * 120, at: i * 0.05, dur: 0.05, vol: 0.3 });
  },
  boss: () => melody([[N.C4, 0.12], [N.C4, 0.12], [196, 0.12], [185, 0.4]], { type: 'sawtooth', vol: 0.3 }),
  // 味方の攻撃が当たった
  hit: () => {
    noise({ dur: 0.12, vol: 0.6, freq: 2500 });
    tone({ f0: 400, f1: 120, dur: 0.1, vol: 0.4 });
  },
  // 効果は抜群
  crit: () => {
    noise({ dur: 0.2, vol: 0.7, freq: 4000 });
    tone({ f0: 900, f1: 200, dur: 0.18, vol: 0.4 });
    tone({ f0: 1200, f1: 1600, at: 0.12, dur: 0.1, vol: 0.25 });
  },
  // 必殺技の溜め
  skill: () => {
    for (let i = 0; i < 5; i++) tone({ f0: 500 + i * 160, at: i * 0.05, dur: 0.06, vol: 0.25 });
  },
  // 味方がダメージを受けた
  damage: () => {
    noise({ dur: 0.25, vol: 0.6, freq: 800 });
    tone({ type: 'sawtooth', f0: 220, f1: 60, dur: 0.22, vol: 0.4 });
  },
  guard: () => {
    tone({ type: 'triangle', f0: 300, dur: 0.08, vol: 0.4 });
    tone({ type: 'triangle', f0: 450, at: 0.06, dur: 0.12, vol: 0.35 });
  },
  heal: () => melody([[N.C5, 0.07], [N.E5, 0.07], [N.G5, 0.07], [N.C6, 0.18]], { type: 'triangle', vol: 0.35 }),
  defeat: () => {
    for (let i = 0; i < 4; i++) noise({ at: i * 0.09, dur: 0.12, vol: 0.5, freq: 1500 - i * 250 });
    tone({ f0: 600, f1: 80, dur: 0.45, vol: 0.35 });
  },
  down: () => tone({ type: 'triangle', f0: 300, f1: 80, dur: 0.4, vol: 0.4 }),
  flee: () => {
    for (let i = 0; i < 4; i++) tone({ f0: 900 - i * 150, at: i * 0.06, dur: 0.06, vol: 0.25 });
  },
  win: () =>
    melody([[N.G4, 0.1], [N.C5, 0.1], [N.E5, 0.1], [N.G5, 0.2], [N.E5, 0.1], [N.G5, 0.45]], { vol: 0.3 }),
  levelup: () => melody([[N.C5, 0.08], [N.D5, 0.08], [N.E5, 0.08], [N.F5, 0.08], [N.G5, 0.08], [N.A5, 0.08], [N.C6, 0.3]], { vol: 0.3 }),
  recruit: () =>
    melody([[N.E5, 0.12], [N.G5, 0.12], [N.C6, 0.12], [0, 0.06], [N.A5, 0.12], [N.C6, 0.4]], { type: 'triangle', vol: 0.4 }),
  lose: () => melody([[N.E4, 0.25], [N.D4, 0.25], [N.C4, 0.25], [196, 0.7]], { type: 'triangle', vol: 0.4 }),
};
