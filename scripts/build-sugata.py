# 「社会生活統計指標」（統計でみる都道府県のすがた）から src/data/sugata.js を作る
#
# 元データ：総務省統計局「社会生活統計指標 －都道府県の指標－ 2026」
#           https://www.e-stat.go.jp/stat-search/files?page=1&layout=datalist&lid=000001477298
#
# 使い方:
#   1. 上のページから「A 人口・世帯」「B 自然環境」「C 経済基盤」「F 労働」「G 文化・スポーツ」「H 居住」の Excel を
#      1つのフォルダにダウンロードする（ファイル名は何でもよい。拡張子は .xls / .xlsx）
#   2. pip install xlrd==2.0.1   （古い Excel 形式を読むため）
#   3. python scripts/build-sugata.py <そのフォルダ>

import glob
import json
import os
import sys

import xlrd

# ゲームで使う指標：(指標コード, ゲームでの呼び方, 単位, 値の倍率, 小数の桁数)
ITEMS = [
    ('#B011001', '面積', 'km²', 100, 0),  # 元の単位は 100k㎡
    ('#B02101', '1年の平均気温', '℃', 1, 1),
    ('#B02401', '1年の日照時間', '時間', 1, 0),
    ('#B02402', '1年の降水量', 'mm', 1, 0),
    ('#H08101', '1人あたりの公園の広さ', '㎡', 1, 1),
    ('#H06121', '銭湯の数（人口10万人あたり）', 'か所', 1, 1),
    ('#H06306', '家の固定電話（人口千人あたり）', '台', 1, 0),
    ('#H01401', '一戸建ての家の割合', '%', 1, 1),
    ('#H01301', '持ち家の割合', '%', 1, 1),
    ('#H06117', '床屋・美容院の数（人口10万人あたり）', 'か所', 1, 0),
    ('#G01321', '体育館などの数（人口100万人あたり）', 'か所', 1, 0),
    ('#A06102', '1世帯の人数', '人', 1, 2),
    ('#B01202', '森林の割合', '%', 1, 1),
    ('#B02102', '夏の最高気温', '℃', 1, 1),
    ('#B01204', '自然公園の割合', '%', 1, 1),
    ('#G01107', '博物館の数（人口100万人あたり）', '館', 1, 1),
    ('#G01104', '図書館の数（人口100万人あたり）', '館', 1, 1),
    ('#H01405', '空き家の割合', '%', 1, 1),
    ('#C04105', '畑や田んぼの割合', '%', 1, 1),
    ('#H06130', '飲食店の数（人口千人あたり）', '店', 1, 2),
    # 人口
    ('#A011000', '人口', '万人', 1, 0),
    ('#A01601', '外国人の数（人口10万人あたり）', '人', 1, 0),
    ('#A01302', '昼の人口の割合（夜の人口を100としたとき）', '', 1, 1),
    ('#F01202', '工場や工事で働く人の割合', '%', 1, 1),
    ('#A01201', '人口密度（1km²あたり）', '人', 1, 0),
    ('#A03503', 'お年寄り（65歳以上）の割合', '%', 1, 1),
    ('#A03501', '子ども（15歳未満）の割合', '%', 1, 1),
    ('#A05111', '1年の人口の増え方（千人あたり）', '人', 1, 1),  # 元の単位は ‰（パーミル）
]


def pref_name(s):
    s = s.strip().replace('　', '')
    if s == '北海道':
        return s
    return s[:-1] if s[-1:] in '都府県' else s


def read(folder):
    found = {}
    for path in sorted(glob.glob(os.path.join(folder, '*.xls*'))):
        try:
            book = xlrd.open_workbook(path)
        except xlrd.XLRDError:
            continue
        for sh in book.sheets():
            pref_col = next((c for r in range(sh.nrows) for c in range(min(sh.ncols, 12))
                             if str(sh.cell_value(r, c)).strip() == '北海道'), None)
            if pref_col is None:
                continue
            rows = {}
            for r in range(12, sh.nrows):
                v = str(sh.cell_value(r, pref_col)).strip()
                if v and v != '全国':
                    rows[pref_name(v)] = r
            for c in range(pref_col + 1, sh.ncols):
                code = str(sh.cell_value(8, c)).strip()
                if not code.startswith('#'):
                    continue
                year = sh.cell_value(10, c)
                values = {p: sh.cell_value(r, c) for p, r in rows.items() if isinstance(sh.cell_value(r, c), float)}
                found[code] = {'year': int(year) if isinstance(year, float) else str(year), 'values': values}
    return found


def main(folder):
    found = read(folder)
    out = {}
    for code, label, unit, scale, digits in ITEMS:
        f = found.get(code)
        if not f or len(f['values']) != 47:
            sys.exit(f'指標 {code}（{label}）の47都道府県分のデータが見つからない')
        values = {p: round(v * scale, digits) if digits else round(v * scale) for p, v in f['values'].items()}
        out[code.lstrip('#')] = {'label': label, 'unit': unit, 'digits': digits, 'year': f['year'], 'values': values}

    lines = [
        '// このファイルは scripts/build-sugata.py で自動生成したもの。手で書き換えないこと。',
        '// 出典：総務省統計局「社会生活統計指標 －都道府県の指標－ 2026」（統計でみる都道府県のすがた）',
        '',
        'export const SUGATA_SOURCE = \'総務省「社会生活統計指標」2026\';',
        '',
        'export const SUGATA = ' + json.dumps(out, ensure_ascii=False, indent=2) + ';',
        '',
    ]
    dst = os.path.join(os.path.dirname(__file__), '..', 'src', 'data', 'sugata.js')
    with open(dst, 'w', encoding='utf-8', newline='\n') as fp:
        fp.write('\n'.join(lines))
    print(f'{len(out)} 指標を書き出した → {os.path.normpath(dst)}')


if __name__ == '__main__':
    if len(sys.argv) < 2:
        sys.exit('使い方: python scripts/build-sugata.py <社会生活統計指標の Excel を置いたフォルダ>')
    main(sys.argv[1])
