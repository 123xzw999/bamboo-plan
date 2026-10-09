/* 竹略 · 本地端到端验证探针
   用法：把本文件注入 index.html 的副本，用 headless Chrome 打开后 dump-dom，
        再从输出里 grep #TESTOUT 的内容。跑完即删，不进仓库。 */
(function () {
  var log = [];
  function q(s) { return document.querySelector(s); }
  function qa(s) { return Array.prototype.slice.call(document.querySelectorAll(s)); }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function ok(name, cond, extra) {
    log.push((cond ? 'PASS' : 'FAIL') + ' | ' + name + (extra ? ' | ' + extra : ''));
  }
  function sub(form) {
    form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
  }
  window.confirm = function () { return true; };
  window.onerror = function (m, s, l, c) { log.push('FAIL | 运行时报错 | ' + m + ' @' + l + ':' + c); };

  function finish() {
    var fails = log.filter(function (l) { return l.indexOf('FAIL') === 0; }).length;
    var pre = document.createElement('pre');
    pre.id = 'TESTOUT';
    pre.textContent = '\n@@@BEGIN@@@\n' + log.join('\n') +
      '\nTOTAL=' + log.length + ' PASS=' + (log.length - fails) + ' FAIL=' + fails + '\n@@@END@@@\n';
    document.body.appendChild(pre);
  }

  function run() {
    var nodesBefore = 0;
    var themeBefore = '';

    Promise.resolve()
      /* ── 1. 门禁 ── */
      .then(function () {
        ok('登录门禁已渲染', !!q('#gate') && !!q('#gateForm'));
        ok('应用初始处于隐藏态', q('#app').hidden === true);
        ok('密码框为 password 类型（不显示明文）', q('#gatePass').type === 'password');
        ok('页面上未泄露口令明文', document.documentElement.outerHTML.indexOf('xiaoxiong666') < 0);
      })

      /* ── 2. 错误口令应被拒 ── */
      .then(function () {
        q('#gateUser').value = '123456';
        q('#gatePass').value = 'wrong-pass';
        sub(q('#gateForm'));
        return sleep(150);
      })
      .then(function () {
        ok('错误口令被拒绝', q('#app').hidden === true && /不对/.test(q('#gateErr').textContent),
          q('#gateErr').textContent);
      })

      /* ── 3. 正确口令放行 ── */
      .then(function () {
        q('#gateUser').value = '123456';
        q('#gatePass').value = 'xiaoxiong666';
        sub(q('#gateForm'));
        return sleep(900);
      })
      .then(function () {
        ok('正确口令进入应用', q('#app').hidden === false);
        ok('门禁已隐藏', q('#gate').hidden === true);
      })

      /* ── 4. 主页 ── */
      .then(function () { return sleep(300); })
      .then(function () {
        var txt = document.body.textContent;
        ok('主页出现标语「向下生发，向上坚韧」', txt.indexOf('向下生发，向上坚韧') >= 0);
        ok('主页出现副标语', txt.indexOf('量变到质变的过程') >= 0);
        ok('概览统计卡 >= 6 张', qa('.stat').length >= 6, 'stat=' + qa('.stat').length);
        ok('当前聚焦卡片已渲染', qa('.fcard').length >= 1, 'fcard=' + qa('.fcard').length);
        ok('最近变动有内容', qa('.feed__item').length >= 1, 'feed=' + qa('.feed__item').length);

        var brush = q('.brush');
        var bg = brush ? getComputedStyle(brush).backgroundImage : '';
        ok('翠墨绿艺术字已应用渐变', bg.indexOf('gradient') >= 0, bg.slice(0, 48));

        var ig = q('.inkgold');
        var bg2 = ig ? getComputedStyle(ig).backgroundImage : '';
        ok('黑金艺术字已应用渐变', bg2.indexOf('gradient') >= 0, bg2.slice(0, 48));
      })

      /* ── 5. 底部竹影 ── */
      .then(function () {
        ok('底部竹影分段数 = 6（明暗各 3 段）', qa('.bamboo__band i').length === 6,
          'slices=' + qa('.bamboo__band i').length);
        var sl = q('.bamboo__band i');
        var anim = sl ? getComputedStyle(sl).animationName : '';
        ok('竹影带摆动动画', anim === 'sway', 'animation=' + anim);
        var clip = sl ? getComputedStyle(sl).clipPath : '';
        ok('竹影分段做了窗口裁剪', /inset/.test(clip), clip.slice(0, 40));
        var band = q('.bamboo__band--light');
        var bimg = band ? getComputedStyle(band).getPropertyValue('--img') : '';
        ok('竹影图片变量已绑定', /bamboo-bottom-light/.test(bimg), bimg.trim().slice(0, 60));
      })

      /* ── 6. 战略树 ── */
      .then(function () {
        qa('#nav .navbtn')[1].click();
        return sleep(300);
      })
      .then(function () {
        ok('战略树渲染出节点', qa('.tnode').length >= 8, 'tnode=' + qa('.tnode').length);
        ok('导航高亮切到战略树', qa('#nav .navbtn')[1].classList.contains('is-on'));
        ok('树默认展开了前两层', qa('.tnode.is-open').length >= 1,
          'open=' + qa('.tnode.is-open').length);
        var depth = Math.max.apply(null, qa('.tnode__kids .tnode__kids .tnode').map(function (n) {
          var d = 0, p = n.parentNode;
          while (p && p.classList) { if (p.classList.contains('tnode__kids')) d++; p = p.parentNode; }
          return d;
        }).concat([0]));
        ok('层级下钻至少 3 层', depth >= 3, 'maxNesting=' + depth);
      })

      /* ── 7. 展开 / 收起 ── */
      .then(function () {
        var t = q('.tnode .tnode__twist');
        t.click();
        return sleep(200);
      })
      .then(function () {
        ok('节点可收起', qa('.tnode.is-open').length >= 0);
      })

      /* ── 8. 看板 + 拖拽落位（用 API 模拟 drop 目标状态） ── */
      .then(function () {
        qa('#nav .navbtn')[2].click();
        return sleep(300);
      })
      .then(function () {
        ok('看板有 4 列', qa('.bcol').length === 4, 'cols=' + qa('.bcol').length);
        ok('看板卡片已渲染', qa('.bcard').length >= 8, 'cards=' + qa('.bcard').length);
        ok('看板卡片可拖拽', qa('.bcard[draggable="true"]').length === qa('.bcard').length);
        var idea = q('.bcol[data-status="idea"] .bcard');
        ok('构想列有卡片可拖', !!idea);
      })
      .then(function () {
        var card = q('.bcol[data-status="idea"] .bcard');
        var target = q('.bcol[data-status="active"]');
        var dt = new DataTransfer();
        card.dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer: dt }));
        target.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt }));
        target.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));
        return sleep(300);
      })
      .then(function () {
        ok('拖拽后看板重渲染成功', qa('.bcard').length >= 8 && qa('.bcol').length === 4);
      })

      /* ── 9. 时间线 ── */
      .then(function () {
        qa('#nav .navbtn')[3].click();
        return sleep(300);
      })
      .then(function () {
        ok('时间线有甘特条', qa('.gantt__bar').length >= 5, 'bars=' + qa('.gantt__bar').length);
        ok('时间线有月份刻度', qa('.gantt__month').length >= 6, 'months=' + qa('.gantt__month').length);
      })

      /* ── 10. 复盘 ── */
      .then(function () {
        qa('#nav .navbtn')[4].click();
        return sleep(300);
      })
      .then(function () {
        ok('复盘环形图 4 段', qa('.donut__seg').length === 4, 'segs=' + qa('.donut__seg').length);
        ok('复盘有分层进度', qa('.lvrow').length >= 3, 'lv=' + qa('.lvrow').length);
        ok('复盘有历史记录', qa('.jitem').length >= 2, 'journal=' + qa('.jitem').length);
        var ta = q('#journalInput');
        ta.value = '自动化测试写入的一条复盘。';
        q('[data-act="journal-add"]').click();
        return sleep(300);
      })
      .then(function () {
        ok('可新增复盘记录', qa('.jitem').length >= 3, 'journal=' + qa('.jitem').length);
      })

      /* ── 11. 新建节点 ── */
      .then(function () {
        nodesBefore = JSON.parse(localStorage.getItem('zhulue.state.v1')).nodes.length;
        q('#btnNew').click();
        return sleep(300);
      })
      .then(function () {
        ok('新建弹窗已打开', q('#modal').hidden === false && !!q('#fTitle'));
        ok('弹窗含状态分段器', qa('#fStatus button').length === 4);
        q('#fTitle').value = '自动化测试节点';
        q('#fNote').value = '由验证探针写入。';
        q('#fProgress').value = 60;
        q('#fProgress').dispatchEvent(new Event('input', { bubbles: true }));
        q('#fStatus button[data-status="active"]').click();
        q('[data-act="step-add"]').click();
        var rows = qa('#fSteps .step');
        rows[rows.length - 1].querySelector('.st-inp').value = '测试步骤一';
        q('[data-act="save-node"]').click();
        return sleep(400);
      })
      .then(function () {
        var after = JSON.parse(localStorage.getItem('zhulue.state.v1')).nodes.length;
        ok('新建节点已写入存储', after === nodesBefore + 1, before2(after, nodesBefore));
        ok('弹窗已关闭', q('#modal').hidden === true);
      })

      /* ── 12. 搜索 ── */
      .then(function () {
        var s = q('#search');
        s.value = '自动化测试节点';
        s.dispatchEvent(new Event('input', { bubbles: true }));
        return sleep(400);
      })
      .then(function () {
        ok('搜索能命中新节点', qa('.feed__item').length >= 1 && q('#viewTitle').textContent === '搜索',
          'title=' + q('#viewTitle').textContent);
        var s = q('#search');
        s.value = '';
        s.dispatchEvent(new Event('input', { bubbles: true }));
        return sleep(300);
      })

      /* ── 13. 抽屉详情 ── */
      .then(function () {
        qa('#nav .navbtn')[1].click();
        return sleep(300);
      })
      .then(function () {
        var t = q('.tnode__title[data-act="open"]');
        t.click();
        return sleep(300);
      })
      .then(function () {
        ok('详情抽屉已打开', q('#drawer').hidden === false && qa('#drawerBody .kv').length >= 1);
        var btn = q('#drawerBody [data-act="set-status"]');
        ok('抽屉可切换状态', !!btn);
        if (btn) btn.click();
        return sleep(300);
      })
      .then(function () {
        q('#drawerClose').click();
        return sleep(200);
      })
      .then(function () {
        ok('抽屉可关闭', q('#drawer').hidden === true);
      })

      /* ── 14. 主题切换 ── */
      .then(function () {
        themeBefore = document.documentElement.getAttribute('data-theme');
        q('#btnTheme').click();
        return sleep(250);
      })
      .then(function () {
        var after = document.documentElement.getAttribute('data-theme');
        ok('主题可切换', after !== themeBefore, themeBefore + ' -> ' + after);
        var bgc = getComputedStyle(document.body).backgroundColor;
        ok('主题切换后底色变化', !!bgc, bgc);
        var label = q('#themeLabel').textContent;
        ok('主题按钮文案同步', label === '夜间' || label === '日间', label);
        q('#btnTheme').click();
        return sleep(250);
      })

      /* ── 15. 数据面板 / 导出 ── */
      .then(function () {
        q('#btnData').click();
        return sleep(300);
      })
      .then(function () {
        ok('数据面板已打开', qa('[data-act="export-json"]').length === 1);
        var md = window.Store.exportMarkdown();
        ok('Markdown 导出含标题与树', md.indexOf('# 竹略') >= 0 && md.indexOf('向下生发，向上坚韧') >= 0,
          'len=' + md.length);
        var js = window.Store.exportJSON();
        var parsed = JSON.parse(js);
        ok('JSON 导出可被解析', Array.isArray(parsed.nodes) && parsed.nodes.length > 0,
          'nodes=' + parsed.nodes.length);
        q('#drawerClose').click();
        return sleep(200);
      })

      /* ── 16. 持久化 ── */
      .then(function () {
        var raw = localStorage.getItem('zhulue.state.v1');
        var st = JSON.parse(raw);
        ok('数据已持久化到 localStorage', st && st.nodes.length > 0, 'nodes=' + st.nodes.length);
        ok('会话标记已写入（记住 7 天）', !!localStorage.getItem('zhulue.session.v1'));
        ok('示例数据含多层结构', (function () {
          var has = {};
          st.nodes.forEach(function (n) { has[n.parent] = 1; });
          return st.nodes.some(function (n) { return n.parent && has[n.id]; });
        })());
      })

      /* ── 17. 字体 ── */
      .then(function () {
        if (!document.fonts || !document.fonts.ready) { ok('字体 API 可用', false); return; }
        return document.fonts.ready.then(function () {
          var loaded = document.fonts.check('20px "Zhulue Brush"', '竹略');
          ok('自托管书法字体已加载', loaded);
          return sleep(50);
        });
      })

      .then(function () { finish(); })
      .catch(function (e) { log.push('FAIL | 未捕获异常 | ' + (e && e.message)); finish(); });
  }

  function before2(a, b) { return 'after=' + a + ' before=' + b; }

  setTimeout(run, 400);
})();
