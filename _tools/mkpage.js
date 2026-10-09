/* 生成 / 清理本地验证用的探针页。产物不进仓库。
   用法：
     node _tools/mkpage.js build     生成 _verify.html 与 _shot.html
     node _tools/mkpage.js clean     删掉所有临时产物
   关键：每次都从 index.html 重新生成，避免用到过期的副本。 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PAGES = [
  { out: '_verify.html', script: '_tools/verify.js' },
  { out: '_shot.html',   script: '_tools/shot.js' },
];
const TEMP = ['_verify.html', '_shot.html', '_vdom.html'];

const mode = process.argv[2] || 'build';

if (mode === 'clean') {
  TEMP.forEach(function (f) {
    const p = path.join(ROOT, f);
    try { fs.unlinkSync(p); console.log('removed ' + f); } catch (e) {}
  });
  process.exit(0);
}

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
if (html.indexOf('</body>') < 0) {
  console.error('index.html 里没有 </body>');
  process.exit(1);
}
PAGES.forEach(function (p) {
  const out = html.replace('</body>', '<script src="' + p.script + '"></script>\n</body>');
  fs.writeFileSync(path.join(ROOT, p.out), out);
  console.log(p.out + ' 已生成, bytes=' + out.length);
});
