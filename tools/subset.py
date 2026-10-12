# -*- coding: utf-8 -*-
"""字体子集化：扫描站点源文件里出现的字符，产出两个 woff2
  brush.woff2  <- MaShanZheng.ttf   （翠墨绿艺术字：站名、标语、空态）
  serif.woff2  <- ZCOOLXiaoWei.ttf  （黑金小标题与静态文案）
改过文案后必须重跑本脚本。
"""
import os
import sys

from fontTools.ttLib import TTFont
from fontTools import subset

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_DIR = os.path.join(ROOT, "..", "zhulue-source", "fonts")   # 字体源（整包，不入站点）
OUT_DIR = os.path.join(ROOT, "assets", "fonts")                # 子集产物（随站点发布）
SRC = [
    ("MaShanZheng.ttf", "brush.woff2"),
    ("ZCOOLXiaoWei.ttf", "serif.woff2"),
]
SCAN = ["index.html", "css/style.css", "js/store.js", "js/app.js"]

PUNCT = "　·—…“”‘’《》「」、。，；：？！（）【】％…～"


def collect():
    used = set()
    for rel in SCAN:
        p = os.path.join(ROOT, rel)
        with open(p, encoding="utf-8") as f:
            used |= set(f.read())
    return used


def build(src_name, out_name, used):
    src = os.path.join(SRC_DIR, src_name)
    out = os.path.join(OUT_DIR, out_name)
    cmap = TTFont(src).getBestCmap()
    keep = {c for c in used if ord(c) in cmap}
    keep |= {chr(c) for c in range(0x20, 0x7F) if c in cmap}
    keep |= {c for c in PUNCT if ord(c) in cmap}
    keep = {c for c in keep if ord(c) in cmap}
    subset.main([
        src,
        "--text=" + "".join(sorted(keep)),
        "--flavor=woff2",
        "--layout-features=*",
        "--no-hinting",
        "--desubroutinize",
        "--name-IDs=*",
        "--output-file=" + out,
    ])
    print("%-22s -> %-14s %5d 字  %6d KB" % (src_name, out_name, len(keep), os.path.getsize(out) // 1024))


if __name__ == "__main__":
    used = collect()
    print("源文件中出现的不同字符：%d 个" % len(used))
    for a, b in SRC:
        if not os.path.exists(os.path.join(SRC_DIR, a)):
            print("缺字体源：", os.path.join(SRC_DIR, a))
            sys.exit(1)
        build(a, b, used)
