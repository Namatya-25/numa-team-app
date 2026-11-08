# 国土交通省 Project LINKS「観光統計データ（2025年度）」から src/data/links.js を作る
#
# 元データ：https://www.geospatial.jp/ckan/dataset/links_kankoutoukei_2025
#           の「01_syukuhakuryokoutoukeityousa.csv」（宿泊旅行統計調査を都道府県別にまとめたもの）
#
# 使い方（Python 3 の標準ライブラリだけで動く）:
#   1. 上のページから 01_syukuhakuryokoutoukeityousa.csv をダウンロードする
#   2. python scripts/build-links.py <その CSV>
#
# 2024年の合計（延べ宿泊者数 659,064,526人泊・外国人 164,462,594人泊）は、
# 観光庁「宿泊旅行統計調査 2024年 確定値」の全国の値（6億5906万人泊・1億6447万人泊）と一致することを確かめてある。

import csv
import json
import os
import sys

YEAR = '2024'
PREFS = ('北海道 青森 岩手 宮城 秋田 山形 福島 茨城 栃木 群馬 埼玉 千葉 東京 神奈川 新潟 富山 石川 福井 山梨 長野 '
         '岐阜 静岡 愛知 三重 滋賀 京都 大阪 兵庫 奈良 和歌山 鳥取 島根 岡山 広島 山口 徳島 香川 愛媛 高知 '
         '福岡 佐賀 長崎 熊本 大分 宮崎 鹿児島 沖縄').split()
COLUMNS = {'TOTAL_GUEST_COUNT': 'total', 'STAY_GUEST_COUNT_FOREIGN': 'foreign'}


def main(path):
    out = {v: {} for v in COLUMNS.values()}
    with open(path, encoding='utf-8-sig', newline='') as fp:
        for row in csv.DictReader(fp):
            if row['YEAR'] != YEAR:
                continue
            pref = PREFS[int(row['PREFECTURE_CODE']) - 1]
            for col, key in COLUMNS.items():
                out[key][pref] = int(row[col])
    for key, vals in out.items():
        if len(vals) != 47:
            sys.exit(f'{key} の47都道府県分のデータが見つからない')
    lines = [
        '// このファイルは scripts/build-links.py で自動生成したもの。手で書き換えないこと。',
        '// 出典：国土交通省 Project LINKS「観光統計データ（2025年度）」01_syukuhakuryokoutoukeityousa.csv',
        f'// {YEAR}年の延べ宿泊者数（人泊）。total = 日本人と外国人の合計、foreign = 外国人',
        '',
        f"export const LINKS_YEAR = {YEAR};",
        "export const LINKS_URL = 'https://www.geospatial.jp/ckan/dataset/links_kankoutoukei_2025';",
        "export const LINKS_FILE = '01_syukuhakuryokoutoukeityousa.csv';",
        "export const LINKS_SOURCE = '国土交通省 Project LINKS「観光統計データ」';",
        '',
        'export const LINKS = ' + json.dumps(out, ensure_ascii=False, indent=2) + ';',
        '',
    ]
    dst = os.path.join(os.path.dirname(__file__), '..', 'src', 'data', 'links.js')
    with open(dst, 'w', encoding='utf-8', newline='\n') as fp:
        fp.write('\n'.join(lines))
    print(f'書き出した → {os.path.normpath(dst)}')


if __name__ == '__main__':
    if len(sys.argv) < 2:
        sys.exit('使い方: python scripts/build-links.py <01_syukuhakuryokoutoukeityousa.csv>')
    main(sys.argv[1])
