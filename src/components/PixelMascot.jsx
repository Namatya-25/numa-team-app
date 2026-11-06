// オリジナルご当地キャラのドット絵（SVGを小さく描いて、透明度を2値化してドット化）
import { useEffect, useRef, useState } from 'react';
import { ELEM } from '../data/prefectures.js';

function mascotSVG(p, ko) {
  const ink = '#1d1b18';
  const body = p ? p.color : '#f3eee2';
  const shape = p ? p.id % 3 : 0;
  const st = `fill="${body}" stroke="${ink}" stroke-width="5"`;
  const b =
    shape === 0
      ? `<circle cx="26" cy="32" r="10" ${st}/><circle cx="74" cy="32" r="10" ${st}/><circle cx="50" cy="60" r="34" ${st}/>`
      : shape === 1
        ? `<path d="M50 18 C64 18 92 68 88 82 C85 94 15 94 12 82 C8 68 36 18 50 18Z" ${st}/>`
        : `<rect x="14" y="27" width="72" height="65" rx="24" ${st}/>`;
  const eyes = ko
    ? `<path d="M32 52 L44 64 M44 52 L32 64 M56 52 L68 64 M68 52 L56 64" stroke="${ink}" stroke-width="5" stroke-linecap="round"/>`
    : `<path d="M29 44 L45 51 M71 44 L55 51" stroke="${ink}" stroke-width="6" stroke-linecap="round"/><ellipse cx="39" cy="59" rx="6" ry="7" fill="${ink}"/><ellipse cx="61" cy="59" rx="6" ry="7" fill="${ink}"/><circle cx="41" cy="56" r="2.2" fill="#fff"/><circle cx="63" cy="56" r="2.2" fill="#fff"/>`;
  const mouth = ko
    ? `<path d="M42 76 Q50 70 58 76" fill="none" stroke="${ink}" stroke-width="4"/>`
    : `<path d="M41 69 Q50 84 59 69 Z" fill="#7a1f1f" stroke="${ink}" stroke-width="4" stroke-linejoin="round"/>`;
  const badge = p
    ? `<circle cx="81" cy="21" r="12" fill="${ELEM[p.elem].col}" stroke="${ink}" stroke-width="4"/>`
    : `<path d="M10 36 L50 8 L90 36 Q50 44 10 36Z" fill="#c8a463" stroke="${ink}" stroke-width="5" stroke-linejoin="round"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-4 -4 108 108" width="108" height="108">${b}<ellipse cx="27" cy="71" rx="7" ry="4" fill="#e26a6a"/><ellipse cx="73" cy="71" rx="7" ry="4" fill="#e26a6a"/>${eyes}${mouth}${badge}</svg>`;
}

const imgCache = {};
function mascotImg(p, ko, onload) {
  const k = (p ? p.id : 'h') + (ko ? 'k' : '');
  let im = imgCache[k];
  if (!im) {
    im = new Image();
    im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(mascotSVG(p, ko));
    imgCache[k] = im;
  }
  if (im.complete && im.naturalWidth) return im;
  im.addEventListener('load', onload, { once: true });
  return null;
}

const N = 34; // ドットの解像度

export default function PixelMascot({ p, ko = false, width }) {
  const ref = useRef(null);
  const [, setLoaded] = useState(0);

  useEffect(() => {
    const im = mascotImg(p, ko, () => setLoaded((x) => x + 1));
    if (!im || !ref.current) return;
    const c = ref.current.getContext('2d');
    c.clearRect(0, 0, N, N);
    c.imageSmoothingEnabled = true;
    c.drawImage(im, 0, 0, N, N);
    try {
      const d = c.getImageData(0, 0, N, N);
      for (let i = 3; i < d.data.length; i += 4) d.data[i] = d.data[i] > 110 ? 255 : 0;
      c.putImageData(d, 0, 0);
    } catch {
      /* 取得できない環境ではそのまま */
    }
  });

  return <canvas ref={ref} width={N} height={N} style={{ width, height: width }} />;
}
