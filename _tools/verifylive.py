"""
线上验收：把 index.html 里的相对引用全部换成 github.io 绝对地址，
注入同一套断言脚本，用 headless Chrome 以 file:// 打开。

这样每一个 js / css / 字体 / 图片都真实来自线上 CDN，
等于在真实网络下验证「线上资源能否被浏览器加载并执行」。
本地目录不产生任何临时文件（跑完即删）。
"""
import os
import re
import shutil
import subprocess
import sys
import tempfile

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
BASE = "https://123xzw999.github.io/bamboo-plan/"
PROXY = "http://127.0.0.1:7890"


def main():
    html = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()

    # 相对路径 -> 线上绝对路径（整串替换，比逐个 replace 稳）
    n_css = html.count('"css/')
    n_js = html.count('"js/')
    n_asset = html.count('"assets/')
    html = ('"' + BASE + 'css/').join(html.split('"css/'))
    html = ('"' + BASE + 'js/').join(html.split('"js/'))
    html = ('"' + BASE + 'assets/').join(html.split('"assets/'))
    html = html.replace('</body>', '<script src="' + BASE + '_tools/verify.js"></script>\n</body>')
    print("已重写引用：css=%d js=%d assets=%d" % (n_css, n_js, n_asset))
    if n_css == 0 or n_js == 0:
        sys.exit("替换数量异常，检查 index.html 的引用写法")

    tmp = tempfile.mkdtemp(prefix="zhulue-live-")
    page = os.path.join(tmp, "live.html")
    open(page, "w", encoding="utf-8").write(html)

    url = "file:///" + page.replace("\\", "/")
    try:
        p = subprocess.run(
            [CHROME, "--headless=new", "--disable-gpu", "--no-sandbox",
             "--no-first-run", "--disable-extensions", "--hide-scrollbars",
             "--allow-file-access-from-files",
             "--proxy-server=" + PROXY,
             "--user-data-dir=" + os.path.join(tmp, "prof"),
             "--virtual-time-budget=60000",
             "--window-size=1440,1000",
             "--dump-dom", url],
            capture_output=True, timeout=300,
        )
        dom = p.stdout.decode("utf-8", "replace")
    finally:
        pass

    m = re.search(r"@@@BEGIN@@@(.*?)@@@END@@@", dom, re.S)
    if not m:
        print("!! 没拿到断言输出，DOM 长度 = %d" % len(dom))
        print(dom[:1200])
        shutil.rmtree(tmp, ignore_errors=True)
        sys.exit(1)

    body = m.group(1).strip()
    for line in body.splitlines():
        if line.startswith("FAIL"):
            print("  \033[31m" + line + "\033[0m")
        elif line.startswith("PASS"):
            print("  " + line)
        else:
            print(line)

    fails = len(re.findall(r"^FAIL", body, re.M))
    print("\n" + ("线上验收全部通过" if fails == 0 else "线上存在 %d 项失败" % fails))
    shutil.rmtree(tmp, ignore_errors=True)
    sys.exit(0 if fails == 0 else 2)


if __name__ == "__main__":
    main()
