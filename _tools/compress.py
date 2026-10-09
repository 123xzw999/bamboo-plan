"""把生成的竹子 PNG 素材压缩为 WebP，控制站点体积。"""
import os
from PIL import Image

ASSETS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets")
ASSETS = os.path.abspath(ASSETS)

# (源文件, 输出名, 目标宽度, 质量)
JOBS = [
    ("bamboo-hero-light.png",        "bamboo-hero-light.webp",        1600, 80),
    ("bamboo-hero-dark.png",         "bamboo-hero-dark.webp",         1600, 80),
    ("bamboo-bottom-light.png",      "bamboo-bottom-light.webp",      1400, 86),
    ("bamboo-bottom-light-corners.png", "bamboo-bottom-light-corners.webp", 1400, 86),
    ("bamboo-bottom-dark.png",       "bamboo-bottom-dark.webp",       1400, 86),
    ("bamboo-bottom-dark-gold.png",  "bamboo-bottom-dark-gold.webp",  1400, 86),
    ("bamboo-branch-light.png",      "bamboo-branch-light.webp",       700, 86),
]

total_in = total_out = 0
for src, dst, width, q in JOBS:
    sp = os.path.join(ASSETS, src)
    dp = os.path.join(ASSETS, dst)
    if not os.path.exists(sp):
        print(f"  ! 缺失 {src}")
        continue
    im = Image.open(sp).convert("RGB")
    if im.width > width:
        h = round(im.height * width / im.width)
        im = im.resize((width, h), Image.LANCZOS)
    im.save(dp, "WEBP", quality=q, method=6)
    a, b = os.path.getsize(sp), os.path.getsize(dp)
    total_in += a
    total_out += b
    print(f"  {src:36s} {a/1024:8.0f}KB -> {dst:34s} {b/1024:7.0f}KB")

print(f"\n合计 {total_in/1024/1024:.2f}MB -> {total_out/1024/1024:.2f}MB "
      f"(省 {100*(1-total_out/total_in):.0f}%)")
