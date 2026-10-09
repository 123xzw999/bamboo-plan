"""
逐页截图，用肉眼验收真实渲染效果。
用法：python _tools/shots.py            -> 全部视图，日间 + 夜间
      python _tools/shots.py tree       -> 只截指定视图
"""
import http.server
import os
import shutil
import socketserver
import subprocess
import sys
import tempfile
import threading

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
PORT = 8792
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
OUT = os.path.join(ROOT, "_shots")
VIEWS = ["gate", "home", "tree", "board", "gantt", "review"]
W, H = 1440, 1000
# 需要额外跑一遍窄屏的视图
# 注意：headless=new 在 Windows 上会创建真实窗口，宽度被系统最小值钳到 ~504px，
# 所以窄屏不能设 430 —— 那样截图宽度和布局宽度会不一致。560 已能触发全部窄屏断点。
MOBILE = {"gate": (560, 900), "home": (560, 900), "tree": (560, 900), "board": (560, 900)}


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)


def main():
    want = sys.argv[1:] or VIEWS
    os.makedirs(OUT, exist_ok=True)

    httpd = socketserver.TCPServer(("127.0.0.1", PORT), Quiet)
    httpd.allow_reuse_address = True
    threading.Thread(target=httpd.serve_forever, daemon=True).start()

    profile = tempfile.mkdtemp(prefix="zhulue-shot-")
    shots = []
    try:
        jobs = []
        for v in want:
            for mode in ("light", "dark"):
                tag = v if mode == "light" else v + "-dark"
                jobs.append((tag, tag, W, H))
            if v in MOBILE:
                mw, mh = MOBILE[v]
                jobs.append((v + "-mobile", v, mw, mh))

        for name, hashv, w, h in jobs:
            png = os.path.join(OUT, name + ".png")
            url = "http://127.0.0.1:%d/_shot.html#%s" % (PORT, hashv)
            subprocess.run(
                [CHROME, "--headless=new", "--disable-gpu", "--no-sandbox",
                 "--no-first-run", "--disable-extensions", "--hide-scrollbars",
                 "--user-data-dir=" + profile,
                 "--virtual-time-budget=9000",
                 "--window-size=%d,%d" % (w, h),
                 "--screenshot=" + png, url],
                capture_output=True, timeout=120,
            )
            ok = os.path.exists(png)
            print(("  OK   " if ok else "  FAIL ") + name +
                  ("  %dKB" % (os.path.getsize(png) // 1024) if ok else ""))
            if ok:
                shots.append(png)
    finally:
        httpd.shutdown()
        httpd.server_close()
        shutil.rmtree(profile, ignore_errors=True)

    print("\n共 %d 张，输出目录：%s" % (len(shots), OUT))


if __name__ == "__main__":
    main()
