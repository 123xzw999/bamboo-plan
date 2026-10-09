"""
本地端到端验证运行器：
  1) 起一个本地 HTTP 服务（比 file:// 更接近真实部署，且 localStorage 可用）
  2) 用 headless Chrome 打开注入过探针的 _verify.html
  3) dump-dom，抽出 #TESTOUT 里的断言结果
  4) 关服务、清理临时目录
"""
import http.server
import os
import re
import shutil
import socketserver
import subprocess
import sys
import tempfile
import threading

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
PORT = 8791
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
DUMP = os.path.join(ROOT, "_vdom.html")


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)


def main():
    if not os.path.exists(CHROME):
        sys.exit("找不到 Chrome：" + CHROME)
    if not os.path.exists(os.path.join(ROOT, "_verify.html")):
        sys.exit("先跑 mkverify.js 生成 _verify.html")

    httpd = socketserver.TCPServer(("127.0.0.1", PORT), Quiet)
    httpd.allow_reuse_address = True
    t = threading.Thread(target=httpd.serve_forever, daemon=True)
    t.start()

    url = "http://127.0.0.1:%d/_verify.html" % PORT
    print("打开 " + url)

    # 每次用全新的 profile：否则上一轮写入的登录态会让门禁直接跳过，断言就失去意义
    PROFILE = tempfile.mkdtemp(prefix="zhulue-verify-")
    try:
        p = subprocess.run(
            [CHROME, "--headless=new", "--disable-gpu", "--no-sandbox",
             "--no-first-run", "--disable-extensions", "--hide-scrollbars",
             "--user-data-dir=" + PROFILE,
             "--virtual-time-budget=45000",
             "--window-size=1440,900",
             "--dump-dom", url],
            capture_output=True, timeout=240,
        )
        dom = p.stdout.decode("utf-8", "replace")
    finally:
        httpd.shutdown()
        httpd.server_close()
        shutil.rmtree(PROFILE, ignore_errors=True)

    with open(DUMP, "w", encoding="utf-8") as f:
        f.write(dom)

    m = re.search(r"@@@BEGIN@@@(.*?)@@@END@@@", dom, re.S)
    if not m:
        print("\n!! 没拿到断言输出，DOM 长度 = %d" % len(dom))
        print(dom[:1500])
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
    print("\n" + ("全部通过" if fails == 0 else "存在 %d 项失败" % fails))

    sys.exit(0 if fails == 0 else 2)


if __name__ == "__main__":
    main()
