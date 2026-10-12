# -*- coding: utf-8 -*-
"""验收用注入代理（只作用于浏览器收到的副本，不写入交付文件）：
在 </body> 前插入脚本 —— 预置 localStorage（入园态 + 可选主题 + 示例框架），
并在 load 后把一批计算样式断言写进 <pre id="selfcheck">，供 chrome --dump-dom 读取。
"""
import http.server
import os
import socketserver
import sys

ROOT = r"C:\Users\PC\WorkBuddy AI\2026-10-12-22-44-27\zhulue"
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8766

SEED_JS = r"""
(function(){
  var q = new URLSearchParams(location.search);
  var theme = q.get('theme') || 'auto';
  try{
    if(q.get('reset')==='1'){ localStorage.clear(); }
    localStorage.setItem('zhulue.auth','1');
    var raw = localStorage.getItem('zhulue.v1');
    var st = raw ? JSON.parse(raw) : null;
    if(!st){
      var uid = function(){ return 'n'+Math.random().toString(36).slice(2,9); };
      var t = function(title,p,children){
        return {id:uid(), title:title, note:'', deadline:null, children:children||[], p: children?null:(p||0)};
      };
      st = { v:1,
        root: t('战略总纲', null, [
          t('身心根骨', null, [t('作息归正', 40), t('体魄晨练', 20)]),
          t('学业进阶', null, [t('专业深造', null, [t('教材通读', 60), t('真题演练', 10)]), t('外语日课', 30)]),
          t('技艺修养', null, [t('书法日课', 50), t('代码手艺', null, [t('算法根基', 25), t('小品工具', 0)])]),
          t('财略经营', null, [t('记账复盘', 70), t('定投蓄水', 15)])
        ]),
        ideas: [
          {id:uid(), text:'想把每天的复盘整理成周记，月末归档', createdAt: Date.now()-86400000*2, grown:null},
          {id:uid(), text:'给竹略加一个年度纵深的刻度视图', createdAt: Date.now()-3600000*5, grown:null}
        ],
        log: [
          {id:uid(), ts: Date.now()-3600000*2, text:'载入示例框架，试舞新枝'},
          {id:uid(), ts: Date.now()-86400000, text:'「作息归正」进度 20% → 40%'}
        ],
        ui: { theme: theme, view: 'home', expanded: {} } };
    } else {
      st.ui = st.ui || {}; st.ui.theme = theme;
    }
    localStorage.setItem('zhulue.v1', JSON.stringify(st));
  }catch(e){}
})();
"""

CHECK_JS = r"""
window.addEventListener('load', function(){
  setTimeout(function(){
    var out = {};
    var brush = document.querySelector('.brush');
    if(brush){ var cs = getComputedStyle(brush);
      out.brushClip = cs.webkitBackgroundClip || cs.backgroundClip;
      out.brushFill = cs.webkitTextFillColor || cs.color;
      out.brushFont = (cs.fontFamily||'').slice(0,24);
      out.brushBg = (cs.backgroundImage||'').slice(0,72);
    }
    var gold = document.querySelector('.gold-title');
    if(gold){ var gs = getComputedStyle(gold);
      out.goldClip = gs.webkitBackgroundClip || gs.backgroundClip;
      out.goldFont = (gs.fontFamily||'').slice(0,24);
      out.goldBg = (gs.backgroundImage||'').slice(0,60);
    }
    var band = document.getElementById('bambooBand');
    if(band){ out.bandImg = getComputedStyle(band).getPropertyValue('--img').trim(); }
    var bam = document.querySelector('.bamboo'), app = document.querySelector('.app');
    if(bam && app){
      out.zApp = getComputedStyle(app).zIndex; out.zBamboo = getComputedStyle(bam).zIndex;
      out.bambooOpacity = getComputedStyle(bam).opacity;
      out.bambooMask = (getComputedStyle(bam).webkitMaskImage || getComputedStyle(bam).maskImage || '').slice(0,46);
      var seg = document.querySelector('.bamboo__band i'), scs = getComputedStyle(seg);
      out.segAnim = scs.animationName + ' ' + scs.animationDuration;
      out.segClip = scs.clipPath;
      out.segCount = document.querySelectorAll('.bamboo__band i').length;
      out.segBg = (scs.backgroundImage || '').slice(0, 70);
      out.segBgSize = scs.backgroundSize + ' / ' + scs.backgroundPosition;
      out.segMask = (scs.webkitMaskImage || scs.maskImage || 'none').slice(0, 34);
      out.bambooRect = (function(){ var r = bam.getBoundingClientRect();
        return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)].join(','); })();
      out.res = performance.getEntriesByType('resource')
        .filter(function(r){ return r.name.indexOf('bamboo-') > -1; })
        .map(function(r){ return r.name.split('/').pop() + '=' + Math.round(r.transferSize || 0) + 'B'; }).join(' ');
    }
    out.theme = document.documentElement.getAttribute('data-theme');
    out.bodyBg = getComputedStyle(document.body).backgroundColor;
    out.inkColor = getComputedStyle(document.body).color;
    out.nodes = document.querySelectorAll('.node').length;
    out.areas = document.querySelectorAll('.area-list li').length;
    out.miniAreas = document.querySelectorAll('.mini-areas li').length;
    out.gateOff = document.getElementById('gate').classList.contains('is-off');
    out.viewOn = document.querySelector('.nav__item.on') ? document.querySelector('.nav__item.on').textContent.replace(/\s+/g,' ').trim() : '';
    out.brushLoaded = document.fonts ? document.fonts.check('40px "Brush CN"') : null;
    out.goldLoaded = document.fonts ? document.fonts.check('16px "Gold CN"') : null;
    out.heroFontPx = brush ? getComputedStyle(brush).fontSize : '';
    var pre = document.createElement('pre'); pre.id = 'selfcheck';
    pre.textContent = 'SELFCHECK ' + JSON.stringify(out);
    document.body.appendChild(pre);
  }, 800);
});
"""

INJECT = "<script>" + SEED_JS + "</script>\n<script>" + CHECK_JS + "</script>\n"


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def do_GET(self):
        path = self.path.split("?")[0]
        if path in ("/", "/index.html"):
            with open(os.path.join(ROOT, "index.html"), encoding="utf-8") as f:
                html = f.read()
            html = html.replace("</body>", INJECT + "</body>")
            data = html.encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)
            return
        return super().do_GET()

    def log_message(self, *a):
        pass


socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(("127.0.0.1", PORT), Handler) as httpd:
    print("inject-server on %d" % PORT, flush=True)
    httpd.serve_forever()
