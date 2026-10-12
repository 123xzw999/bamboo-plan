/* 生成线上验收探针页：把 index.html 的相对路径换成线上绝对地址，
   再挂一段「登录 + 断言」脚本，用 file:// 打开即可在真实网络下验证线上站点。
   用法：node tools/live_probe.js <本地index.html> <线上base> <输出html> */
const fs = require("fs");

const [src, base, out] = process.argv.slice(2);
if (!src || !base || !out) {
  console.error("用法: node live_probe.js <index.html> <base> <out.html>");
  process.exit(1);
}
const B = base.endsWith("/") ? base : base + "/";
let h = fs.readFileSync(src, "utf8");

let n = 0;
[["css/", "css/"], ["js/", "js/"], ["assets/", "assets/"]].forEach(([from]) => {
  const before = h;
  h = h.split('"' + from).join('"' + B + from);
  n += (before.length - h.length) === 0 ? 0 : 1;
});
const replaced = (h.match(new RegExp(B.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(css|js|assets)/", "g")) || []).length;

const probe = `
<script>
window.__errs = [];
window.onerror = function (m) { window.__errs.push(String(m)); };
window.confirm = function () { return true; };
window.alert = function () {};
function report(o) {
  var pre = document.createElement('pre');
  pre.id = 'LIVECHECK';
  pre.textContent = 'LIVECHECK ' + JSON.stringify(o);
  document.body.appendChild(pre);
}
window.addEventListener('load', function () {
  setTimeout(function () {
    var out = { base: '${B}', errors: window.__errs.slice(0, 3) };
    var gate = document.getElementById('gate');
    out.gateShownFirst = !gate.classList.contains('is-off');
    // 真登录：填口令 → 提交
    document.getElementById('gateUser').value = '123456';
    document.getElementById('gatePass').value = 'xiaoxiong666';
    document.getElementById('gateForm').dispatchEvent(new Event('submit', { cancelable: true }));
    setTimeout(function () {
      out.gateOffAfterLogin = gate.classList.contains('is-off');
      out.sessionSet = Number(localStorage.getItem('zhulue.session.v1') || 0) > Date.now();
      // 载入示例框架，验证渲染管线
      location.hash = '#/strategy';
      setTimeout(function () {
        var btn = document.querySelector('[data-act="load-sample"]');
        if (btn) btn.click();
        setTimeout(function () {
          out.nodes = document.querySelectorAll('.node').length;
          out.trunkPct = document.querySelector('.trunk__pct') ? document.querySelector('.trunk__pct').textContent : null;
          location.hash = '#/home';
          setTimeout(function () {
            var brush = document.querySelector('.brush');
            var cs = getComputedStyle(brush);
            out.hero = document.querySelector('.hero__slogan') ? document.querySelector('.hero__slogan').textContent : null;
            out.brushClip = cs.webkitBackgroundClip || cs.backgroundClip;
            out.brushLoaded = document.fonts.check('40px "Brush CN"');
            out.goldLoaded = document.fonts.check('16px "Gold CN"');
            var seg = document.querySelector('.bamboo__band i');
            out.bandImg = getComputedStyle(seg).backgroundImage.replace(/^url\\("/, '').replace(/"\\)$/, '');
            out.areas = document.querySelectorAll('.mini-areas li').length;
            out.tiles = document.querySelectorAll('.tile__value').length;
            report(out);
          }, 900);
        }, 900);
      }, 700);
    }, 900);
  }, 1200);
});
</script>
`;

h = h.replace("</body>", probe + "</body>");
fs.writeFileSync(out, h);
console.log("探针页已生成:", out, "| 绝对地址替换处数:", replaced);
