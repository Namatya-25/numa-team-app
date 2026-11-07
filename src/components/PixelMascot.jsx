// オリジナルご当地キャラのドット絵（SVGを小さく描いて、透明度を2値化してドット化）
import { useEffect, useRef, useState } from 'react';
import { ELEM } from '../data/prefectures.js';

// キャラクターの絵をSVG（文字で図形を指定する画像形式）として作る
// p はご当地キャラの情報、ko は目を閉じた表情にするかどうか
function mascotSVG(p, ko) {
  // 線の色と体の色を決める。p がない場合は主人公用の色を使う
  const ink = '#1d1b18';
  const body = p ? p.color : '#f3eee2';
  // キャラクターの番号から、丸・とがった形・四角のいずれかを選ぶ
  const shape = p ? p.id % 3 : 0;
  // 体の塗り色と輪郭線を、SVGの図形に共通して使える形にする
  const st = `fill="${body}" stroke="${ink}" stroke-width="5"`;
  // 選んだ形に合わせて、体の図形をSVGの文字列で作る
  const b =
    shape === 0
      ? `<circle cx="26" cy="32" r="10" ${st}/><circle cx="74" cy="32" r="10" ${st}/><circle cx="50" cy="60" r="34" ${st}/>`
      : shape === 1
        ? `<path d="M50 18 C64 18 92 68 88 82 C85 94 15 94 12 82 C8 68 36 18 50 18Z" ${st}/>`
        : `<rect x="14" y="27" width="72" height="65" rx="24" ${st}/>`;
  // ko が true なら目を閉じた顔、false なら通常の目を作る
  const eyes = ko
    ? `<path d="M32 52 L44 64 M44 52 L32 64 M56 52 L68 64 M68 52 L56 64" stroke="${ink}" stroke-width="5" stroke-linecap="round"/>`
    : `<path d="M29 44 L45 51 M71 44 L55 51" stroke="${ink}" stroke-width="6" stroke-linecap="round"/><ellipse cx="39" cy="59" rx="6" ry="7" fill="${ink}"/><ellipse cx="61" cy="59" rx="6" ry="7" fill="${ink}"/><circle cx="41" cy="56" r="2.2" fill="#fff"/><circle cx="63" cy="56" r="2.2" fill="#fff"/>`;
  // 目の状態に合わせて、口も通常時と目を閉じた時で描き分ける
  const mouth = ko
    ? `<path d="M42 76 Q50 70 58 76" fill="none" stroke="${ink}" stroke-width="4"/>`
    : `<path d="M41 69 Q50 84 59 69 Z" fill="#7a1f1f" stroke="${ink}" stroke-width="4" stroke-linejoin="round"/>`;
  // ご当地キャラには属性の色のバッジ、主人公には笠を付ける
  const badge = p
    ? `<circle cx="81" cy="21" r="12" fill="${ELEM[p.elem].col}" stroke="${ink}" stroke-width="4"/>`
    : `<path d="M10 36 L50 8 L90 36 Q50 44 10 36Z" fill="#c8a463" stroke="${ink}" stroke-width="5" stroke-linejoin="round"/>`;
  // 体、ほほ、目、口、バッジを1つのSVG画像にまとめて返す
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-4 -4 108 108" width="108" height="108">${b}<ellipse cx="27" cy="71" rx="7" ry="4" fill="#e26a6a"/><ellipse cx="73" cy="71" rx="7" ry="4" fill="#e26a6a"/>${eyes}${mouth}${badge}</svg>`;
}

// 一度作った画像を保存して、同じキャラクターの画像を何度も作らないようにする
const imgCache = {};
function mascotImg(p, ko, onload) {
  // キャラクター番号と表情を組み合わせて、画像を見分ける名前を作る
  const k = (p ? p.id : 'h') + (ko ? 'k' : '');
  let im = imgCache[k];
  if (!im) {
    // まだ画像がなければ、SVGの文字列から画像を作って保存する
    im = new Image();
    im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(mascotSVG(p, ko));
    imgCache[k] = im;
  }
  // 読み込み済みなら画像を返す。まだなら読み込み完了時の処理を登録する
  if (im.complete && im.naturalWidth) return im;
  im.addEventListener('load', onload, { once: true });
  return null;
}

const N = 34; // Canvas内の画像サイズ。小さく描くことでドット絵らしく見せる

export default function PixelMascot({ p, ko = false, width }) {
  // ref を使って、画面に表示するCanvas（絵を描く領域）を参照する
  const ref = useRef(null);
  // 画像の読み込みが終わった時に、描画処理をもう一度実行するための状態
  const [, setLoaded] = useState(0);

  // キャラクター情報や表情が変わった時に、Canvasへ絵を描く
  useEffect(() => {
    // 画像を取得し、読み込み完了時には state を更新して再描画する
    const im = mascotImg(p, ko, () => setLoaded((x) => x + 1));
    if (!im || !ref.current) return;
    // Canvasの2D描画機能を使い、前の絵を消してから画像を描く
    const c = ref.current.getContext('2d');
    c.clearRect(0, 0, N, N);
    c.imageSmoothingEnabled = true;
    c.drawImage(im, 0, 0, N, N);
    try {
      // 画像の各ピクセルを調べ、透明度を「見える／透明」の2段階にしてドット感を出す
      const d = c.getImageData(0, 0, N, N);
      for (let i = 3; i < d.data.length; i += 4) d.data[i] = d.data[i] > 110 ? 255 : 0;
      c.putImageData(d, 0, 0);
    } catch {
      /* 取得できない環境ではそのまま */
    }
  });

  // Canvasを画面に置く。内部は34x34で描き、表示サイズはwidthに合わせる
  return <canvas ref={ref} width={N} height={N} style={{ width, height: width }} />;
}
