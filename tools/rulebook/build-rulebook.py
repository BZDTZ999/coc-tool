#!/usr/bin/env python3
"""把规则书 PDF 抽成网页可用的数据文件（assets/rulebook/coc7.js）。

用法：
    python3 tools/rulebook/build-rulebook.py [PDF 路径] [输出路径]

产物是**普通 JS 文件**（`window.__COC_RULEBOOK = {...}`），不是 JSON：
这样离线单文件版可以内联、在线版可以用 <script> 懒加载，
file:// 直接双击打开也能用（fetch 在 file:// 下会被浏览器拦，script 不会）。

数据结构：
    { v:1, title, pageCount, pages:[[段落,段落,…],…], toc:[[层级,标题,页码],…] }
    pages 下标 = 页码-1，段落已去掉页眉页脚与纯页码。
维护：换了规则书 PDF 后重跑本脚本（需要 pip install pymupdf），再 npm run build:all。
"""
import json
import re
import sys
import os

try:
    import pymupdf as fitz
except ImportError:                                    # 老版本包名
    import fitz

DEFAULT_PDF = '/Users/krisaneich/Documents/跑团/规则书/COC7th核心规则书.pdf'
DEFAULT_OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
                           'assets', 'rulebook', 'coc7.js')

# 页眉页脚：书名行、纯页码行、以及“第N章 xxx 页码”这类页眉
DROP = [
    re.compile(r'^Call of Cthulhu\s*7TH Edition$', re.I),
    re.compile(r'^核心规则书$'),
    re.compile(r'^\d{1,3}$'),
    re.compile(r'^[·•—\-\s]+$'),
]


def clean_block(text):
    t = text.replace('\u3000', ' ').strip()
    t = re.sub(r'[ \t]+', ' ', t)
    t = re.sub(r'\n{2,}', '\n', t)
    return t.strip()


def keep(text, page_no):
    if not text:
        return False
    if any(rx.match(text) for rx in DROP):
        return False
    return True


def main():
    pdf = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_PDF
    out = sys.argv[2] if len(sys.argv) > 2 else DEFAULT_OUT
    doc = fitz.open(pdf)
    pages = []
    for i in range(doc.page_count):
        blocks = []
        for b in doc[i].get_text('blocks'):
            raw = str(b[4] or '')
            t = clean_block(raw)
            if not keep(t, i + 1):
                continue
            blocks.append(t)
        pages.append(blocks)
    toc = []
    for lv, title, page in doc.get_toc():
        toc.append([int(lv), str(title).strip(), int(page)])
    data = {
        'v': 1,
        'title': 'COC7th 核心规则书',
        'pageCount': doc.page_count,
        'pages': pages,
        'toc': toc,
    }
    js = 'window.__COC_RULEBOOK=' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n'
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, 'w', encoding='utf-8') as f:
        f.write(js)
    print('pages', doc.page_count, 'toc', len(toc), 'chars', sum(len(''.join(b)) for b in pages),
          '->', out, os.path.getsize(out), 'bytes')


if __name__ == '__main__':
    main()
