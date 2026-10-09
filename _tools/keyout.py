"""
把竹子装饰图的纯白底 / 纯黑底抠成 alpha 通道。

思路：用亮度当墨水浓度。
  亮色图（白底）：alpha = 255 * (1 - (L/255)^1.35)   —— 白 -> 全透明，浓墨 -> 不透明
  暗色图（黑底）：alpha = 255 * (L/255)^0.80        —— 黑 -> 全透明，亮竹 -> 不透明
RGB 原样保留，于是叠在任意底色上都是自然的水墨半透明质感，
不必依赖 mix-blend-mode（跨浏览器/跨合成层更稳）。
"""
import os
import sys
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.abspath(os.path.join(HERE, "..", "..", "_bamboo-src"))
OUT = os.path.abspath(os.path.join(HERE, "..", "assets"))

JOBS = [
    # 源文件,                    输出名,                      模式,    目标宽, 质量
    ("bamboo-bottom-light.png",         "bamboo-bottom-light.webp",         "light", 1400, 88),
    ("bamboo-bottom-light-corners.png", "bamboo-bottom-light-corners.webp", "light", 1400, 88),
    ("bamboo-bottom-dark.png",          "bamboo-bottom-dark.webp",          "dark",  1400, 88),
    ("bamboo-bottom-dark-gold.png",     "bamboo-bottom-dark-gold.webp",     "dark",  1400, 88),
    ("bamboo-branch-light.png",         "bamboo-branch-light.webp",         "light",  700, 90),
]

FLOOR = 24  # 低于此值的残雾直接砍成全透明，避免大面积半透明噪声（体积 + 视觉都更干净）


def _floor(a):
    if a <= FLOOR:
        return 0
    return min(255, round((a - FLOOR) * 255 / (255 - FLOOR)))


LIGHT_LUT = [_floor(max(0, min(255, round(255 * (1 - (v / 255) ** 1.35))))) for v in range(256)]
DARK_LUT = [_floor(max(0, min(255, round(255 * ((v / 255) ** 0.80))))) for v in range(256)]

os.makedirs(OUT, exist_ok=True)
for src, dst, mode, width, q in JOBS:
    sp, dp = os.path.join(SRC, src), os.path.join(OUT, dst)
    if not os.path.exists(sp):
        print(f"  ! 缺失 {src}")
        continue
    im = Image.open(sp).convert("RGB")
    if im.width > width:
        h = round(im.height * width / im.width)
        im = im.resize((width, h), Image.LANCZOS)
    alpha = im.convert("L").point(LIGHT_LUT if mode == "light" else DARK_LUT)
    out = im.convert("RGBA")
    out.putalpha(alpha)
    out.save(dp, "WEBP", quality=q, method=6)

    # 统计 alpha 分布，确认抠图没把主体一起干掉
    hist = alpha.histogram()
    solid = sum(hist[128:]) / (alpha.width * alpha.height) * 100
    clear = sum(hist[:16]) / (alpha.width * alpha.height) * 100
    print(f"  {dst:34s} {os.path.getsize(dp)/1024:6.0f}KB  实心{solid:5.1f}%  全透{clear:5.1f}%")

    # 生成预览：叠在亮底 / 暗底上，肉眼确认抠图效果
    for name, bg in (("preview-light", (246, 243, 234)), ("preview-dark", (10, 19, 16))):
        canvas = Image.new("RGB", out.size, bg)
        canvas.paste(out, (0, 0), out)
        canvas.save(os.path.join(HERE, f"_{name}-{os.path.splitext(dst)[0]}.jpg"), "JPEG", quality=80)

print("done")
