/* 截图辅助：按 location.hash 指定视图 + 主题，并跳过门禁。
   hash 形如 #home / #tree / #board / #gantt / #review / #gate，加 -dark 走夜间。

   关键：主题必须在 app.js 的 boot() 之前就确定 —— 通过同步伪装
   window.matchMedia('(prefers-color-scheme: dark)') 实现，而不是靠 setTimeout 事后改属性。
   实测 --screenshot 的采样时机可能早于任何延时，事后改属性会拍出错误主题。 */
(function () {
  var raw = (location.hash || '#home').slice(1);
  var dark = /-dark$/.test(raw);
  var view = raw.replace(/-dark$/, '') || 'home';
  var isGate = view.indexOf('gate') === 0;

  if (!isGate) {
    try { localStorage.setItem('zhulue.session.v1', String(Date.now() + 86400000)); } catch (e) {}
  }

  var nativeMM = window.matchMedia ? window.matchMedia.bind(window) : null;
  function stub(q) {
    return {
      matches: dark, media: q, onchange: null,
      addEventListener: function () {}, removeEventListener: function () {},
      addListener: function () {}, removeListener: function () {},
      dispatchEvent: function () { return false; }
    };
  }
  window.matchMedia = function (q) {
    if (/prefers-color-scheme/.test(q)) return stub(q);
    return nativeMM ? nativeMM(q) : stub(q);
  };
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');

  var IDX = { home: 0, tree: 1, board: 2, gantt: 3, review: 4 };
  window.addEventListener('load', function () {
    setTimeout(function () {
      var i = IDX[view];
      if (i != null) {
        var b = document.querySelectorAll('#nav .navbtn')[i];
        if (b) b.click();
      }
      window.scrollTo(0, 0);
    }, 300);
  });
})();
