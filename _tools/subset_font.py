"""
把 MaShanZheng（马善政毛笔楷书）子集化到「站点静态文案实际用到的字符」，
输出 assets/fonts/brush.woff2。

为什么子集化：
  1) 完整 CJK 字体 5MB+，为了几个艺术字标题加载整包不划算；
  2) 自托管 -> 不依赖任何外部 CDN，离线 / 内网也能正常显示。

注意：书法字体只用于**静态**文案（站名、标语）。用户输入的动态标题一律走系统字体，
      因此这里按源文件取字集是安全的。若日后新增书法字标题，重跑本脚本即可。
"""
import os
import sys
from fontTools.ttLib import TTFont
from fontTools import subset

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, ".."))
FONT_SRC = os.path.abspath(os.path.join(ROOT, "..", "_fonts", "MaShanZheng.woff2"))
OUT_DIR = os.path.join(ROOT, "assets", "fonts")
OUT = os.path.join(OUT_DIR, "brush.woff2")

SOURCES = [
    "index.html",
    "css/style.css",
    "js/store.js",
    "js/auth.js",
    "js/views.js",
    "js/app.js",
]

if not os.path.exists(FONT_SRC):
    sys.exit("找不到源字体：" + FONT_SRC)

# ── 1. 收集源文件里出现的所有字符 ──
used = set()
for rel in SOURCES:
    p = os.path.join(ROOT, rel)
    if not os.path.exists(p):
        print("  ! 跳过缺失文件", rel)
        continue
    with open(p, encoding="utf-8") as f:
        used |= set(f.read())
print(f"源文件共出现 {len(used)} 个不同字符")

# ── 2. 只保留字体里真实存在的码位，并补上 ASCII 可打印区 ──
font = TTFont(FONT_SRC)
cmap = font.getBestCmap()
font.close()

keep = {c for c in used if ord(c) in cmap}
keep |= {chr(c) for c in range(0x20, 0x7F) if c in cmap}          # 拉丁 / 数字 / 半角标点
keep |= set("　·—…“”‘’《》〈〉「」『』、。，；：？！（）【】％")
keep = {c for c in keep if ord(c) in cmap}

text = "".join(sorted(keep))
cjk = [c for c in keep if ord(c) > 0x2E80]
print(f"保留 {len(keep)} 个字符（其中中日韩汉字 {len(cjk)} 个）")

# ── 3. 执行子集化 ──
os.makedirs(OUT_DIR, exist_ok=True)
args = [
    FONT_SRC,
    "--text=" + text,
    "--flavor=woff2",
    "--layout-features=*",
    "--no-hinting",
    "--desubroutinize",
    "--name-IDs=*",
    "--output-file=" + OUT,
]
subset.main(args)

before = os.path.getsize(FONT_SRC)
after = os.path.getsize(OUT)
print(f"\n{before/1024/1024:.2f}MB  ->  {after/1024:.0f}KB  (省 {100*(1-after/before):.1f}%)")
print("输出：" + OUT)
