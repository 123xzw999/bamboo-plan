# -*- coding: utf-8 -*-
"""竹林素材流水线：原图 -> 缩到 1400px -> 按亮度抠 alpha -> WebP
亮景：白底 -> 透明，浓墨 -> 不透明（LIGHT_LUT）
暗景：黑底 -> 透明，发光竹体 -> 不透明（DARK_LUT）
"""
import os
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, "..", "..", "zhulue-source", "raw")
OUT = os.path.join(HERE, "..", "assets", "bamboo")
os.makedirs(OUT, exist_ok=True)

FLOOR = 24


def _floor(a):
    return 0 if a <= FLOOR else min(255, round((a - FLOOR) * 255 / (255 - FLOOR)))


LIGHT_LUT = [_floor(max(0, min(255, round(255 * (1 - (v / 255) ** 1.35))))) for v in range(256)]
DARK_LUT = [_floor(max(0, min(255, round(255 * ((v / 255) ** 0.80))))) for v in range(256)]

SCENES = [
    # (文件名关键字, 序号, 主题)
    ("春日清晨的竹林", "1", "light"),
    ("狂风中的劲竹", "2", "light"),
    ("月夜竹林_一轮淡月", "3", "light"),
    ("近景盘错的竹根", "4", "light"),
    ("春日深夜的竹林", "1", "dark"),
    ("风雨之夜的竹林", "2", "dark"),
    ("月夜竹林_墨黑天幕", "3", "dark"),
    ("夜色溪边盘错的竹根", "4", "dark"),
]


def process(src, num, theme):
    im = Image.open(src).convert("RGB")
    w, h = im.size
    if w > 1400:
        im = im.resize((1400, round(h * 1400 / w)), Image.LANCZOS)
    lut = LIGHT_LUT if theme == "light" else DARK_LUT
    alpha = im.convert("L").point(lut)
    out = im.convert("RGBA")
    out.putalpha(alpha)
    dst = os.path.join(OUT, "bamboo-%s-%s.webp" % (num, theme))
    out.save(dst, "WEBP", quality=88, method=6)
    print("%s -> %s  (%d KB)" % (os.path.basename(src)[:22], os.path.basename(dst),
                                 os.path.getsize(dst) // 1024))


for fn in sorted(os.listdir(RAW)):
    if not fn.lower().endswith(".png"):
        continue
    for key, num, theme in SCENES:
        if key in fn:
            process(os.path.join(RAW, fn), num, theme)
            break
    else:
        print("SKIP(no match):", fn[:30])
