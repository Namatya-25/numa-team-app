# 家計調査の「品目別都道府県庁所在市ランキング」から src/data/kakei.js を作る
#
# 元データ：総務省統計局「家計調査（二人以上の世帯）品目別都道府県庁所在市及び政令指定都市ランキング
#           （2023年～2025年平均）」 https://www.stat.go.jp/data/kakei/5.html
#
# 使い方（Python 3 の標準ライブラリだけで動く）:
#   1. 上のページの Excel（rank01.xlsx 〜 rank14.xlsx）を1つのフォルダにダウンロードする
#   2. python scripts/build-kakei.py <そのフォルダ>
#
# 県庁所在市以外の政令指定都市（川崎・相模原・浜松・堺・北九州）は使わない。

import json
import os
import re
import sys
import zipfile
import xml.etree.ElementTree as ET

# ゲームで使う品目：(Excel の品目名, ゲームでの呼び方)。金額（円）の列を使う
ITEMS = [
    ('さけ', '鮭'),
    ('ほたて貝', 'ほたて'),
    ('さんま', 'さんま'),
    ('りんご', 'りんご'),
    ('中華麺', '生のラーメン麺'),
    ('わかめ', 'わかめ'),
    ('かまぼこ', 'かまぼこ'),
    ('清酒', '日本酒'),
    ('乾うどん・そば', '乾めん（うどん・そば）'),
    ('中華そば', '外食のラーメン'),
    ('こんにゃく', 'こんにゃく'),
    ('桃', '桃'),
    ('納豆', '納豆'),
]

# 県庁所在市 → 県名（prefectures.js の RAW と同じ書き方）
CITY = {
    '札幌市': '北海道', '青森市': '青森', '盛岡市': '岩手', '仙台市': '宮城', '秋田市': '秋田',
    '山形市': '山形', '福島市': '福島', '水戸市': '茨城', '宇都宮市': '栃木', '前橋市': '群馬',
    'さいたま市': '埼玉', '千葉市': '千葉', '東京都区部': '東京', '横浜市': '神奈川', '新潟市': '新潟',
    '富山市': '富山', '金沢市': '石川', '福井市': '福井', '甲府市': '山梨', '長野市': '長野',
    '岐阜市': '岐阜', '静岡市': '静岡', '名古屋市': '愛知', '津市': '三重', '大津市': '滋賀',
    '京都市': '京都', '大阪市': '大阪', '神戸市': '兵庫', '奈良市': '奈良', '和歌山市': '和歌山',
    '鳥取市': '鳥取', '松江市': '島根', '岡山市': '岡山', '広島市': '広島', '山口市': '山口',
    '徳島市': '徳島', '高松市': '香川', '松山市': '愛媛', '高知市': '高知', '福岡市': '福岡',
    '佐賀市': '佐賀', '長崎市': '長崎', '熊本市': '熊本', '大分市': '大分', '宮崎市': '宮崎',
    '鹿児島市': '鹿児島', '那覇市': '沖縄',
}

M = '{http://schemas.openxmlformats.org/spreadsheetml/2006/main}'


def col_index(col):
    n = 0
    for ch in col:
        n = n * 26 + ord(ch) - 64
    return n


def col_name(n):
    s = ''
    while n:
        n, r = divmod(n - 1, 26)
        s = chr(65 + r) + s
    return s


def read_cells(path):
    z = zipfile.ZipFile(path)
    strings = [''.join(t.text or '' for t in si.iter(M + 't'))
               for si in ET.fromstring(z.read('xl/sharedStrings.xml')).findall(M + 'si')]
    cells = {}
    for c in ET.fromstring(z.read('xl/worksheets/sheet1.xml')).iter(M + 'c'):
        v = c.find(M + 'v')
        if v is None:
            continue
        col, row = re.match(r'([A-Z]+)(\d+)', c.get('r')).groups()
        cells[(col, int(row))] = strings[int(v.text)] if c.get('t') == 's' else v.text
    return cells


def main(folder):
    found = {}
    for f in sorted(os.listdir(folder)):
        if not re.fullmatch(r'rank\d+\.xlsx', f):
            continue
        cells = read_cells(os.path.join(folder, f))
        for (col, row), name in cells.items():
            if row != 3 or '金' not in cells.get((col, 4), ''):
                continue
            name = name.strip()
            vcol = col_name(col_index(col) + 1)
            values = {}
            for r in range(6, 60):
                city = (cells.get((col, r)) or '').strip()
                if city in CITY and (vcol, r) in cells:
                    values[CITY[city]] = round(float(cells[(vcol, r)]))
            found.setdefault(name, values)

    out = {}
    for name, label in ITEMS:
        values = found.get(name)
        if not values or len(values) != 47:
            sys.exit(f'品目「{name}」の47都道府県分のデータが見つからない')
        out[name] = {'label': label, 'values': values}

    lines = [
        '// このファイルは scripts/build-kakei.py で自動生成したもの。手で書き換えないこと。',
        '// 出典：総務省統計局「家計調査（二人以上の世帯）品目別都道府県庁所在市ランキング（2023年～2025年平均）」',
        '// 値は 1世帯あたりの年間支出金額（円）。県の値＝その県の県庁所在市の値（北海道は札幌市、東京は東京都区部）。',
        '',
        'export const KAKEI_SOURCE = \'総務省「家計調査」2023〜2025年平均\';',
        '',
        'export const KAKEI = ' + json.dumps(out, ensure_ascii=False, indent=2) + ';',
        '',
    ]
    dst = os.path.join(os.path.dirname(__file__), '..', 'src', 'data', 'kakei.js')
    with open(dst, 'w', encoding='utf-8', newline='\n') as fp:
        fp.write('\n'.join(lines))
    print(f'{len(out)} 品目を書き出した → {os.path.normpath(dst)}')


if __name__ == '__main__':
    if len(sys.argv) < 2:
        sys.exit('使い方: python scripts/build-kakei.py <rank01〜14.xlsx を置いたフォルダ>')
    main(sys.argv[1])
