/* ═══════════════════════════════════════════════════════════
   竹略 · 应用层：路由 / 主题 / 交互 / 竹影
   ═══════════════════════════════════════════════════════════ */
;(function (global) {
'use strict';

var S = global.Store, V = global.Views, A = global.Auth;
var q = function (s, r) { return (r || document).querySelector(s); };
var qa = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

var ROUTES = {
  home:   { title: '主页',   sub: '愿景 · 总览 · 当前聚焦',                     art: 'a' },
  tree:   { title: '战略树', sub: '愿景 → 战略 → 阶段 → 任务 → 子任务，可无限下钻', art: 'a' },
  board:  { title: '看板',   sub: '拖动卡片，改变它的生长状态',                  art: 'b' },
  gantt:  { title: '时间线', sub: '目标在时间轴上的分布与重叠',                  art: 'b' },
  review: { title: '复盘',   sub: '看清结构，才能调整结构',                      art: 'a' }
};

var current = 'home';
var openSet = new Set();
var query = '';
var dragId = null;
var seededOpen = false;

/* ══════════ 底部竹影：把一张图切成互相搭接的三段，各自异相摆动 ══════════ */
function buildBamboo() {
  var slices = [
    { l: 0,  r: 55, dur: '9.6s',  del: '0s',    amp: '0.55deg' },
    { l: 27, r: 28, dur: '11.4s', del: '-2.6s', amp: '0.78deg' },
    { l: 55, r: 0,  dur: '8.3s',  del: '-5.1s', amp: '0.62deg' }
  ];
  qa('.bamboo__band').forEach(function (band) {
    band.innerHTML = slices.map(function (s) {
      return '<i style="--l:' + s.l + '%;--r:' + s.r + '%;--dur:' + s.dur +
        ';--del:' + s.del + ';--amp:' + s.amp + '"></i>';
    }).join('');
  });
}

/* ══════════ 主题 ══════════ */
function effectiveTheme() {
  var t = S.state().ui.theme;
  if (t === 'light' || t === 'dark') return t;
  return global.matchMedia && global.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
function applyTheme() {
  var eff = effectiveTheme();
  document.documentElement.setAttribute('data-theme', eff);
  var label = q('#themeLabel');
  if (label) label.textContent = eff === 'dark' ? '夜间' : '日间';
  var icon = q('#btnTheme .ico');
  if (icon) icon.className = 'ico ' + (eff === 'dark' ? 'ico-sun' : 'ico-moon');
  var meta = q('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.appendChild(meta);
  }
  meta.content = eff === 'dark' ? '#07110d' : '#f4f1e8';
}
function toggleTheme() {
  S.setTheme(effectiveTheme() === 'dark' ? 'light' : 'dark');
  applyTheme();
}

/* ══════════ 渲染 ══════════ */
function render() {
  var view = q('#view');
  var el = q('.bamboo');

  if (query) {
    q('#viewTitle').textContent = '搜索';
    q('#viewSub').textContent = '「' + query + '」的结果';
    if (el) el.setAttribute('data-art', 'b');
    view.innerHTML = searchView(query);
    markNav(null);
    return;
  }

  var r = ROUTES[current] || ROUTES.home;
  q('#viewTitle').textContent = r.title;
  q('#viewSub').textContent = r.sub;
  if (el) el.setAttribute('data-art', r.art);

  if (current === 'tree') {
    if (!seededOpen) {
      seededOpen = true;
      S.roots().forEach(function (n) {
        openSet.add(n.id);
        S.children(n.id).forEach(function (c) { openSet.add(c.id); });
      });
    }
    view.innerHTML = V.tree({ open: openSet });
  } else {
    view.innerHTML = V[current]();
  }
  markNav(current);
  if (!q('#drawer').hidden) refreshDrawer();
}

function markNav(v) {
  qa('#nav .navbtn').forEach(function (b) {
    b.classList.toggle('is-on', b.getAttribute('data-view') === v);
  });
}

function searchView(text) {
  var res = S.search(text);
  if (!res.length) {
    return '<div class="empty"><b>没有找到「' + S.esc(text) + '」</b>换个词试试，或者直接新建一条。</div>';
  }
  var H = ['<div class="sec__head"><h2 class="sec__title inkgold">找到 ' + res.length + ' 条</h2>' +
    '<span class="sec__line"></span></div><div class="card card--pad"><div class="feed">'];
  res.forEach(function (n) {
    var path = S.pathOf(n.id).slice(0, -1);
    H.push('<div class="feed__item" data-act="open" data-id="' + n.id + '">' + V.stChip(n.status) +
      '<div class="feed__t"><b>' + S.esc(n.title) + '</b><span>' +
      (path.length ? S.esc(path.join(' › ')) + ' · ' : '') + n.progress + '%</span></div></div>');
  });
  H.push('</div></div>');
  return H.join('');
}

/* ══════════ 抽屉 / 弹窗 / 提示 ══════════ */
function openDrawer(id) {
  var d = q('#drawer');
  d.dataset.id = id;
  q('#drawerTitle').textContent = '节点详情';
  q('#drawerBody').innerHTML = V.nodeDrawer(id);
  d.hidden = false;
  q('#scrim').hidden = false;
}
function refreshDrawer() {
  var id = q('#drawer').dataset.id;
  if (id && S.byId(id)) q('#drawerBody').innerHTML = V.nodeDrawer(id);
}
function closeDrawer() {
  q('#drawer').hidden = true;
  q('#scrim').hidden = true;
}

function openModal(html, id) {
  var m = q('#modal');
  q('#modalCard').innerHTML = html;
  m.dataset.id = id || '';
  m.hidden = false;
  q('#scrim').hidden = false;
  var first = q('#modalCard input, #modalCard textarea');
  if (first) setTimeout(function () { first.focus(); }, 60);
}
function closeModal() { q('#modal').hidden = true; q('#scrim').hidden = true; }
function closeAll() { closeDrawer(); closeModal(); }

var toastTimer = null;
function toast(msg) {
  var t = q('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { t.hidden = true; }, 2200);
}

function download(name, text, mime) {
  var blob = new Blob([text], { type: mime || 'application/json;charset=utf-8' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 400);
}
function stamp() {
  var d = new Date(), p = function (n) { return ('0' + n).slice(-2); };
  return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes());
}

/* ══════════ 表单读写 ══════════ */
function segPick(sel) {
  var on = q(sel + ' .is-on');
  return on ? (on.getAttribute('data-status') || on.getAttribute('data-prio')) : null;
}
function saveNode() {
  var id = q('#modal').dataset.id;
  var title = (q('#fTitle').value || '').trim();
  if (!title) { toast('标题不能为空'); q('#fTitle').focus(); return; }

  var steps = qa('#fSteps .step').map(function (row) {
    var cb = q('input[type=checkbox]', row);
    var inp = q('.st-inp', row);
    return { id: row.getAttribute('data-step') || S.uid(), text: (inp.value || '').trim(), done: cb.checked };
  }).filter(function (s) { return s.text; });

  var parentVal = q('#fParent').value || null;
  if (id && parentVal === id) { toast('上级不能是自己'); return; }

  var patch = {
    title: title,
    parent: parentVal,
    status: segPick('#fStatus') || 'idea',
    progress: Number(q('#fProgress').value) || 0,
    prio: Number(segPick('#fPrio')) || 2,
    start: q('#fStart').value || '',
    due: q('#fDue').value || '',
    tags: (q('#fTags').value || '').split(/[,，;；\s]+/).map(function (s) { return s.trim(); }).filter(Boolean),
    note: (q('#fNote').value || '').trim(),
    steps: steps
  };

  if (id) { S.updateNode(id, patch); toast('已保存'); }
  else {
    var n = S.addNode(patch);
    if (patch.parent) openSet.add(patch.parent);
    toast('已创建');
    void n;
  }
  closeModal();
  render();
}

/* ══════════ 定位到树 ══════════ */
function locateInTree(id) {
  var node = S.byId(id);
  if (!node) return;
  var cur = node;
  var guard = 0;
  while (cur && cur.parent && guard++ < 200) { openSet.add(cur.parent); cur = S.byId(cur.parent); }
  openSet.add(id);
  query = '';
  q('#search').value = '';
  current = 'tree';
  closeAll();
  render();
  setTimeout(function () {
    var el = q('.tnode[data-id="' + id + '"] > .tnode__row');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.style.transition = 'background .4s';
      el.style.background = 'var(--jade-soft)';
      setTimeout(function () { el.style.background = ''; }, 1400);
    }
  }, 90);
}

/* ══════════ 事件 ══════════ */
function onAct(act, el, e) {
  var id = el.getAttribute('data-id');

  switch (act) {
    case 'toggle': {
      if (openSet.has(id)) openSet.delete(id); else openSet.add(id);
      render();
      return;
    }
    case 'open':
      openDrawer(id);
      return;
    case 'add':
      openModal(V.nodeForm(null, { parentId: id }), '');
      return;
    case 'edit': {
      var n = S.byId(id);
      if (!n) return;
      var ex = new Set([id]);
      S.descendants(id).forEach(function (d) { ex.add(d.id); });
      openModal(V.nodeForm(n, { exclude: ex }), id);
      return;
    }
    case 'del': {
      var node = S.byId(id);
      if (!node) return;
      var kids = S.descendants(id).length;
      var msg = '确定删除「' + node.title + '」？' + (kids ? '\n它下面的 ' + kids + ' 个子节点会一起删除。' : '') + '\n此操作不可撤销。';
      if (!global.confirm(msg)) return;
      S.removeNode(id);
      closeAll();
      render();
      toast('已删除');
      return;
    }
    case 'up':
      S.moveNode(id, -1); render(); return;
    case 'down':
      S.moveNode(id, 1); render(); return;
    case 'set-status':
      S.setStatus(id, el.getAttribute('data-status'));
      render();
      return;
    case 'step-toggle': {
      var nd = S.byId(id);
      if (!nd) return;
      var sid = el.getAttribute('data-step');
      nd.steps.forEach(function (s) { if (s.id === sid) s.done = el.checked; });
      var done = nd.steps.filter(function (s) { return s.done; }).length;
      var auto = Math.round(done / nd.steps.length * 100);
      S.updateNode(id, { steps: nd.steps, progress: auto });
      render();
      return;
    }
    case 'step-add': {
      var box = q('#fSteps');
      var row = document.createElement('div');
      row.className = 'step';
      row.innerHTML = '<input type="checkbox"><input class="inp st-inp" placeholder="一个具体动作">' +
        '<button type="button" class="st-x" data-act="step-remove">✕</button>';
      box.appendChild(row);
      q('.st-inp', row).focus();
      return;
    }
    case 'step-remove':
      el.parentNode.remove();
      return;
    case 'close-modal': closeModal(); return;
    case 'save-node': saveNode(); return;

    case 'vision-edit': {
      var cur = S.state().meta.vision;
      var txt = global.prompt('写下你的愿景（可以多行）：', cur);
      if (txt === null) return;
      S.setVision(txt.trim());
      render();
      toast('愿景已更新');
      return;
    }
    case 'journal-add': {
      var t = q('#journalInput');
      if (!t || !t.value.trim()) { toast('先写点什么'); return; }
      S.addJournal(t.value);
      render();
      toast('已记下');
      return;
    }
    case 'journal-del':
      S.removeJournal(id);
      render();
      return;

    case 'focus':
      locateInTree(id);
      return;

    case 'export-json':
      download('竹略-备份-' + stamp() + '.json', S.exportJSON());
      toast('已导出备份');
      return;
    case 'export-md':
      download('竹略-战略书-' + stamp() + '.md', S.exportMarkdown(), 'text/markdown;charset=utf-8');
      toast('已导出战略书');
      return;
    case 'import-json':
      importInput().click();
      return;
    case 'load-demo':
      if (!global.confirm('用示例战略替换当前全部内容？\n当前内容会被覆盖，建议先导出备份。')) return;
      S.loadDemo();
      openSet = new Set(); seededOpen = false;
      closeAll(); render(); toast('已载入示例');
      return;
    case 'reset':
      if (!global.confirm('清空全部内容？\n此操作不可撤销，请先导出备份。')) return;
      if (!global.confirm('再确认一次：真的要清空吗？')) return;
      S.resetAll(false);
      openSet = new Set(); seededOpen = false;
      closeAll(); render(); toast('已清空');
      return;

    case 'new':
      openModal(V.nodeForm(null, {}), '');
      return;
  }
}

document.addEventListener('click', function (e) {
  /* 分段选择器（弹窗内） */
  var seg = e.target.closest('#fStatus button, #fPrio button');
  if (seg) {
    qa('button', seg.parentNode).forEach(function (b) { b.classList.remove('is-on'); });
    seg.classList.add('is-on');
    return;
  }

  var el = e.target.closest('[data-act]');
  if (!el) {
    /* 点空白处关闭抽屉 */
    if (e.target.id === 'scrim') closeAll();
    return;
  }
  onAct(el.getAttribute('data-act'), el, e);
});

/* 侧栏导航 */
q('#nav').addEventListener('click', function (e) {
  var b = e.target.closest('.navbtn');
  if (!b) return;
  current = b.getAttribute('data-view');
  query = '';
  q('#search').value = '';
  render();
});

q('#btnTheme').addEventListener('click', toggleTheme);
q('#btnNew').addEventListener('click', function () { openModal(V.nodeForm(null, {}), ''); });
q('#drawerClose').addEventListener('click', closeDrawer);

q('#btnData').addEventListener('click', function () {
  var d = q('#drawer');
  d.dataset.id = '';
  q('#drawerTitle').textContent = '数据与备份';
  q('#drawerBody').innerHTML = V.dataPanel();
  d.hidden = false;
  q('#scrim').hidden = false;
});

/* 搜索 */
var searchTimer = null;
q('#search').addEventListener('input', function (e) {
  var v = e.target.value.trim();
  clearTimeout(searchTimer);
  searchTimer = setTimeout(function () {
    query = v;
    render();
  }, 160);
});

/* 进度滑块实时回显 */
q('#modal').addEventListener('input', function (e) {
  if (e.target.id === 'fProgress') {
    var out = q('#fProgressOut');
    if (out) out.textContent = e.target.value + '%';
  }
});

/* 导入文件：输入框按需创建（它只在数据面板里用得到，不放静态 DOM） */
var _importInput = null;
function importInput() {
  if (_importInput) return _importInput;
  var f = document.createElement('input');
  f.type = 'file';
  f.accept = 'application/json,.json';
  f.hidden = true;
  f.addEventListener('change', function () {
    var file = f.files && f.files[0];
    if (!file) return;
    var fr = new FileReader();
    fr.onload = function () {
      try {
        var n = S.importJSON(String(fr.result));
        openSet = new Set(); seededOpen = false;
        closeAll(); render();
        toast('已导入 ' + n + ' 个节点');
      } catch (err) {
        toast('导入失败：' + err.message);
      }
    };
    fr.readAsText(file, 'utf-8');
    f.value = '';
  });
  document.body.appendChild(f);
  _importInput = f;
  return f;
}

/* 看板拖拽 */
document.addEventListener('dragstart', function (e) {
  var card = e.target.closest ? e.target.closest('.bcard') : null;
  if (!card) return;
  dragId = card.getAttribute('data-id');
  card.classList.add('is-drag');
  try {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', dragId);
  } catch (err) {}
});
document.addEventListener('dragend', function (e) {
  var card = e.target.closest ? e.target.closest('.bcard') : null;
  if (card) card.classList.remove('is-drag');
  qa('.bcol.is-over').forEach(function (c) { c.classList.remove('is-over'); });
});
document.addEventListener('dragover', function (e) {
  var col = e.target.closest ? e.target.closest('.bcol') : null;
  if (!col) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  qa('.bcol.is-over').forEach(function (c) { if (c !== col) c.classList.remove('is-over'); });
  col.classList.add('is-over');
});
document.addEventListener('dragleave', function (e) {
  var col = e.target.closest ? e.target.closest('.bcol') : null;
  if (col && !col.contains(e.relatedTarget)) col.classList.remove('is-over');
});
document.addEventListener('drop', function (e) {
  var col = e.target.closest ? e.target.closest('.bcol') : null;
  if (!col) return;
  e.preventDefault();
  var id = dragId;
  try { id = id || e.dataTransfer.getData('text/plain'); } catch (err) {}
  qa('.bcol.is-over').forEach(function (c) { c.classList.remove('is-over'); });
  if (!id || !S.byId(id)) return;
  var to = col.getAttribute('data-status');
  if (S.byId(id).status === to) return;
  S.setStatus(id, to);
  render();
  toast('已移到「' + S.STATUS_MAP[to].name + '」');
});

/* 键盘 */
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') { closeAll(); return; }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    q('#search').focus();
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's' && !q('#modal').hidden) {
    e.preventDefault();
    saveNode();
  }
});

/* 系统主题变化 */
if (global.matchMedia) {
  var mq = global.matchMedia('(prefers-color-scheme: dark)');
  var onMq = function () { if (S.state().ui.theme === 'auto') applyTheme(); };
  if (mq.addEventListener) mq.addEventListener('change', onMq);
  else if (mq.addListener) mq.addListener(onMq);
}

/* ══════════ 登录门禁 ══════════ */
function boot() {
  buildBamboo();
  S.load();            /* 必须先载入数据：applyTheme / render 都依赖 state */
  applyTheme();

  if (A.active()) return enter();

  var form = q('#gateForm');
  var err = q('#gateErr');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var u = q('#gateUser').value.trim();
    var p = q('#gatePass').value;
    if (!u || !p) { fail('请输入账号与密码'); return; }
    if (!A.valid(u, p)) { fail('账号或密码不对'); return; }
    A.mark();
    enter();
  });
  function fail(msg) {
    err.textContent = msg;
    q('#gatePass').value = '';
    var g = q('#gate');
    g.classList.remove('shake');
    void g.offsetWidth;
    g.classList.add('shake');
  }
  setTimeout(function () { q('#gateUser').focus(); }, 200);
}

function enter() {
  var g = q('#gate');
  g.style.transition = 'opacity .45s ease';
  g.style.opacity = '0';
  setTimeout(function () { g.hidden = true; }, 460);

  q('#app').hidden = false;
  applyTheme();
  render();
  void V;
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();

})(window);
