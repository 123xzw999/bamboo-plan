# -*- coding: utf-8 -*-
"""竹略 · 端到端验收（Selenium + headless Chrome 155）
覆盖：入园门帘 / 空态 / 示例框架 / 增枝改进度 / 想法培育 / 四视图 / 明暗双主题 / 持久化 / 退出
"""
import os
import time

os.environ["NO_PROXY"] = "localhost,127.0.0.1,::1,0.0.0.0"
os.environ["no_proxy"] = os.environ["NO_PROXY"]

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By

BASE = "http://127.0.0.1:8765/index.html"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHOTS = os.path.join(ROOT, "..", "zhulue-source", "shots")
DRIVER = r"C:\Users\PC\.cache\selenium\chromedriver\win64\155.0.8059.39\chromedriver.exe"
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

os.makedirs(SHOTS, exist_ok=True)
FAILS, TOTAL = [], [0]


def check(name, ok, extra=""):
    TOTAL[0] += 1
    print(("PASS  " if ok else "FAIL  ") + name + (("  | " + str(extra)) if extra else ""))
    if not ok:
        FAILS.append(name)


def alert_accept(d, timeout=3):
    end = time.time() + timeout
    while time.time() < end:
        try:
            d.switch_to.alert.accept()
            return True
        except Exception:
            time.sleep(0.15)
    return False


def wait_gate_off(d, timeout=6):
    end = time.time() + timeout
    while time.time() < end:
        if "is-off" in d.find_element(By.ID, "gate").get_attribute("class"):
            return True
        time.sleep(0.15)
    return False


def goto_view(d, view, wait=0.8):
    wait_gate_off(d)
    d.find_element(By.CSS_SELECTOR, '[data-act="nav"][data-view="%s"]' % view).click()
    time.sleep(wait)


opts = Options()
opts.binary_location = CHROME
opts.add_argument("--headless=new")
opts.add_argument("--window-size=1440,1120")
opts.add_argument("--proxy-server=direct://")
opts.add_argument("--proxy-bypass-list=*")
opts.add_argument("--hide-scrollbars")
opts.add_argument("--force-device-scale-factor=1")
opts.set_capability("unhandledPromptBehavior", "accept")
d = webdriver.Chrome(service=Service(DRIVER), options=opts)

try:
    # ---------- 1. 门帘 ----------
    d.get(BASE)
    time.sleep(1.6)
    check("入园门帘可见", d.find_element(By.ID, "gate").is_displayed())
    d.save_screenshot(os.path.join(SHOTS, "10-gate.png"))

    d.find_element(By.ID, "gateUser").send_keys("123456")
    d.find_element(By.ID, "gatePass").send_keys("bad-pass")
    d.find_element(By.CSS_SELECTOR, "#gateForm button[type=submit]").click()
    time.sleep(0.8)
    err = d.find_element(By.ID, "gateErr").text.strip()
    check("错误口令被拦并提示", err != "" and d.find_element(By.ID, "gate").is_displayed(), err)

    pw = d.find_element(By.ID, "gatePass")
    pw.clear()
    pw.send_keys("xiaoxiong666")
    d.find_element(By.CSS_SELECTOR, "#gateForm button[type=submit]").click()
    check("正确口令（123456 / xiaoxiong666）入园", wait_gate_off(d))

    # ---------- 2. 空态 ----------
    d.execute_script("localStorage.removeItem('zhulue.v1')")
    d.get(BASE)
    time.sleep(1.6)
    check("已入园状态免重复登录", wait_gate_off(d, 3))
    empty = d.find_element(By.CSS_SELECTOR, ".mini-areas .empty-line").text
    check("总览空态", empty == "尚未分枝", empty)
    goto_view(d, "strategy", 0.7)
    check("战略页空态", "尚无枝叶" in d.find_element(By.CSS_SELECTOR, ".empty-block__line").text)
    d.save_screenshot(os.path.join(SHOTS, "11-strategy-empty.png"))

    # ---------- 3. 示例框架 ----------
    d.execute_script("window.confirm=function(){return true};window.alert=function(){}")
    d.find_element(By.CSS_SELECTOR, '[data-act="load-sample"]').click()
    alert_accept(d)
    time.sleep(1.2)
    n = len(d.find_elements(By.CSS_SELECTOR, ".node"))
    check("载入示例框架", n >= 10, "节点 %d" % n)
    pct = d.find_element(By.CSS_SELECTOR, ".trunk__pct").text
    check("总纲进度自下而上汇总", pct.endswith("%") and pct != "0%", pct)

    # ---------- 4. 增枝 ----------
    d.find_element(By.CSS_SELECTOR, ".ghost-add").click()
    time.sleep(0.6)
    check("添枝弹窗打开", "is-open" in d.find_element(By.ID, "modal").get_attribute("class"))
    d.find_element(By.ID, "mTitle").send_keys("验收新枝")
    d.find_element(By.ID, "mNote").send_keys("验收脚本创建")
    d.find_element(By.CSS_SELECTOR, '[data-act="modal-save"]').click()
    time.sleep(0.8)
    titles = [e.text for e in d.find_elements(By.CSS_SELECTOR, ".node__title")]
    check("新枝入树", "验收新枝" in titles)
    d.save_screenshot(os.path.join(SHOTS, "12-strategy-new-node.png"))

    # 改进度 → 日志
    d.execute_script(
        "Array.prototype.find.call(document.querySelectorAll('.node__title'),"
        "function(e){return e.textContent==='验收新枝'}).click()"
    )
    time.sleep(0.6)
    d.execute_script("var r=document.getElementById('mProg');r.value=80;r.dispatchEvent(new Event('input',{bubbles:true}))")
    d.find_element(By.CSS_SELECTOR, '[data-act="modal-save"]').click()
    time.sleep(0.8)
    goto_view(d, "home", 0.9)
    logs = [e.text for e in d.find_elements(By.CSS_SELECTOR, ".timeline__text")]
    check("动态日志记录进度变更", any("80%" in x for x in logs), " | ".join(logs[:2]))

    # ---------- 5. 想法 ----------
    goto_view(d, "ideas", 0.8)
    d.find_element(By.ID, "ideaInput").send_keys("验收：把年度复盘做成刻度视图")
    d.find_element(By.CSS_SELECTOR, '[data-act="idea-add"]').click()
    time.sleep(0.9)
    ideas = [e.text for e in d.find_elements(By.CSS_SELECTOR, ".idea__text")]
    check("想法落笺", any("刻度视图" in x for x in ideas))
    d.save_screenshot(os.path.join(SHOTS, "13-ideas.png"))
    d.find_element(By.CSS_SELECTOR, '[data-act="idea-grow"]').click()
    time.sleep(1.0)
    goto_view(d, "strategy", 0.9)
    titles = [e.text for e in d.find_elements(By.CSS_SELECTOR, ".node__title")]
    check("想法培育为枝", any("刻度视图" in x for x in titles))

    # ---------- 6. 分布 ----------
    goto_view(d, "dist", 0.9)
    check("环形总览图存在", len(d.find_elements(By.CSS_SELECTOR, ".donut__on")) == 1)
    check("各域分布有条目", len(d.find_elements(By.CSS_SELECTOR, ".area-list li")) >= 4)
    d.save_screenshot(os.path.join(SHOTS, "14-dist.png"))

    # ---------- 7. 主题与样式 ----------
    d.find_element(By.CSS_SELECTOR, '.theme-seg button[data-theme="light"]').click()
    time.sleep(1.1)
    st = d.execute_script(
        "var b=document.querySelector('.brush'),cs=getComputedStyle(b),bm=document.querySelector('.bamboo');"
        "return {clip:cs.webkitBackgroundClip||cs.backgroundClip,theme:document.documentElement.getAttribute('data-theme'),"
        "img:getComputedStyle(document.querySelector('.bamboo__band i')).backgroundImage.slice(-24),"
        "z:[getComputedStyle(document.querySelector('.app')).zIndex,getComputedStyle(bm).zIndex],"
        "anim:getComputedStyle(document.querySelector('.bamboo__band i')).animationName}"
    )
    check("亮主题切换生效", st["theme"] == "light", st["theme"])
    check("亮主题艺术字裁切为 text", st["clip"] == "text", st["clip"])
    check("亮主题竹带用亮景素材", "light.webp" in st["img"], st["img"])
    check("正文层级高于竹带", int(st["z"][0]) > int(st["z"][1]), st["z"])
    check("竹带摆动动画生效", st["anim"] == "sway", st["anim"])
    d.save_screenshot(os.path.join(SHOTS, "16-dist-light-final.png"))

    d.find_element(By.CSS_SELECTOR, '.theme-seg button[data-theme="dark"]').click()
    time.sleep(1.1)
    st2 = d.execute_script(
        "var b=document.querySelector('.brush'),cs=getComputedStyle(b);"
        "return {clip:cs.webkitBackgroundClip||cs.backgroundClip,fill:cs.webkitTextFillColor,"
        "theme:document.documentElement.getAttribute('data-theme'),"
        "img:getComputedStyle(document.querySelector('.bamboo__band i')).backgroundImage.slice(-22),"
        "op:getComputedStyle(document.querySelector('.bamboo')).opacity}"
    )
    check("暗主题切换生效", st2["theme"] == "dark", st2["img"])
    check("暗主题艺术字仍为文字裁切（非色块）", st2["clip"] == "text", st2["clip"])
    check("暗主题填充透明", st2["fill"] in ("rgba(0, 0, 0, 0)", "transparent"), st2["fill"])
    check("暗主题竹带换夜竹素材", "dark.webp" in st2["img"], st2["img"])
    check("暗主题竹带更收敛", float(st2["op"]) <= 0.65, st2["op"])
    d.save_screenshot(os.path.join(SHOTS, "15-dist-dark.png"))

    # ---------- 8. 收起 / 展开 ----------
    goto_view(d, "strategy", 0.9)
    d.find_element(By.CSS_SELECTOR, '[data-act="collapse-all"]').click()
    time.sleep(0.8)
    hidden = len(d.find_elements(By.CSS_SELECTOR, ".node__kids[hidden]"))
    check("全部收起", hidden >= 1, "收起 %d 组" % hidden)
    d.find_element(By.CSS_SELECTOR, '[data-act="expand-all"]').click()
    time.sleep(0.8)
    check("全部展开", len(d.find_elements(By.CSS_SELECTOR, ".node__kids[hidden]")) == 0)

    # ---------- 9. 舍去节点 ----------
    before = len(d.find_elements(By.CSS_SELECTOR, ".node"))
    d.execute_script(
        "Array.prototype.find.call(document.querySelectorAll('.node__title'),"
        "function(e){return e.textContent==='验收新枝'}).click()"
    )
    time.sleep(0.6)
    d.find_element(By.CSS_SELECTOR, '[data-act="node-del"]').click()
    alert_accept(d)
    time.sleep(0.9)
    check("舍去节点生效", len(d.find_elements(By.CSS_SELECTOR, ".node")) == before - 1,
          "%d -> %d" % (before, len(d.find_elements(By.CSS_SELECTOR, ".node"))))

    # ---------- 10. 持久化 ----------
    d.refresh()
    time.sleep(1.8)
    check("刷新后数据仍在", len(d.find_elements(By.CSS_SELECTOR, ".node")) >= 10)
    check("刷新后主题保持暗色",
          d.execute_script("return document.documentElement.getAttribute('data-theme')") == "dark")

    # ---------- 11. 退出 ----------
    d.find_element(By.CSS_SELECTOR, '[data-act="logout"]').click()
    time.sleep(2.0)
    check("退出后回到门帘", d.find_element(By.ID, "gate").is_displayed())

    print("\n===== 验收：%d 项通过 / %d 项失败 =====" % (TOTAL[0] - len(FAILS), len(FAILS)))
    if FAILS:
        print("失败项：" + "；".join(FAILS))
finally:
    d.quit()
