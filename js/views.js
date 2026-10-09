/* ═══════════════════════════════════════════════════════════
   竹略 · 视图层（纯函数，只产出 HTML 字符串）
   ═══════════════════════════════════════════════════════════ */
;(function (global) {
'use strict';

var S = global.Store;
var esc = S.esc;

/* ── 小工具 ── */
function stChip(id) {
  var s = S.STATUS_MAP[id] || S.STATUS_MAP.idea;
  return '<span class="chip ' + s.cls + '"><i class="dot"></i>' + s.name + '</span>';
}
function prioText(p) { return S.PRIO[p] || '重要'; }
function fmtDate(d) { return d ? d.replace(/-/g, '.') : ''; }
function dateText(n) {
  if (!n.start && !n.due) return '';
  return (n.start ? fmtDate(n.start) : '—') + ' → ' + (n.due ? fmtDate(n.due) : '—');
}
function dueBadge(n) {
  if (!n.due || n.status === 'done') return '';
  var t = S.today(0), diff = S.dayDiff(t, n.due);
  if (diff < 0) return '<span class="m" style="color:var(--rose)">已逾期 ' + (-diff) + ' 天</span>';
  if (diff <= 14) return '<span class="m" style="color:var(--amber)">剩 ' + diff + ' 天</span>';
  return '';
}
function stepStat(n) {
  if (!n.steps.length) return '';
  var done = n.steps.filter(function (s) { return s.done; }).length;
  return '<span class="m">步骤 ' + done + '/' + n.steps.length + '</span>';
}
function tagText(n) {
  return n.tags.length ? '<span class="m">#' + n.tags.map(esc).join(' #') + '</span>' : '';
}
function emptyBox(title, hint, action) {
  return '<div class="empty"><b>' + esc(title) + '</b>' + esc(hint) +
    (action ? '<div style="margin-top:16px">' + action + '</div>' : '') + '</div>';
}

/* ══════════ 主页 ══════════ */
function home(opts) {
  var st = S.stats(), meta = S.state().meta;
  var H = [];

  H.push(
    '<section class="hero">' +
      '<div class="hero__bg"></div><div class="hero__veil"></div>' +
      '<div class="hero__inner">' +
        '<p class="hero__kicker">长期计划 · 实现分布</p>' +
        '<h1 class="brush brush--lg">竹略</h1>' +
        '<p class="brush brush--slogan">向下生发，向上坚韧</p>' +
        '<p class="hero__dash">—— 量变到质变的过程　需要的不是天赋　而是坚持和耐心</p>' +
      '</div>' +
      '<svg class="hero__seal" viewBox="0 0 60 60" aria-hidden="true">' +
        '<path d="M30 54V8" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" fill="none"/>' +
        '<path d="M30 19h11M30 29H19M30 39h9" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" fill="none" opacity=".75"/>' +
      '</svg>' +
    '</section>'
  );

  /* 概览 */
  H.push('<section class="sec"><div class="sec__head">' +
    '<h2 class="sec__title inkgold">总览</h2><span class="sec__line"></span>' +
    '<span class="sec__hint">数字不会撒谎</span></div>' +
    '<div class="statgrid">' +
      stat('整体进度', st.avg, '%', '所有节点进度的平均', 'var(--jade)') +
      stat('已成竹', st.by.done, '项', '累计落成的目标', 'var(--gold)') +
      stat('正在生长', st.by.active, '项', '当前推进中', 'var(--jade)') +
      stat('待破土', st.by.idea + st.by.hold, '项', '构想 ' + st.by.idea + ' · 暂歇 ' + st.by.hold, 'var(--slate)') +
      stat('层级深度', st.maxDepth + 1, '层', '从愿景到最细颗粒', 'var(--jade)') +
      stat('待复盘', st.overdue, '项', '已过截止未完成', st.overdue ? 'var(--rose)' : 'var(--slate)') +
    '</div></section>');

  /* 愿景 */
  H.push('<section class="sec"><div class="sec__head">' +
    '<h2 class="sec__title inkgold">愿景</h2><span class="sec__line"></span>' +
    '<span class="sec__hint">你要往哪去</span></div>' +
    '<div class="card card--pad vision">' +
      '<div class="vision__text' + (meta.vision ? '' : ' is-empty') + '" id="visionText">' +
        esc(meta.vision || '还没有写下愿景。点右侧按钮，用三五句话说清你想成为什么样的人、想做成什么样的事。') +
      '</div>' +
      '<button class="btn btn--ghost btn--sm" data-act="vision-edit">' + (meta.vision ? '修改' : '写下愿景') + '</button>' +
    '</div></section>');

  /* 当前聚焦 */
  var focus = S.all().filter(function (n) { return n.status === 'active'; })
    .sort(function (a, b) { return (a.prio - b.prio) || (b.progress - a.progress); })
    .slice(0, 3);
  H.push('<section class="sec"><div class="sec__head">' +
    '<h2 class="sec__title inkgold">当前聚焦</h2><span class="sec__line"></span>' +
    '<span class="sec__hint">同时只推进三件</span></div>');
  if (!focus.length) {
    H.push(emptyBox('还没有正在推进的目标', '把某个想法从「构想」拖到「生长」，它就会出现在这里。',
      '<button class="btn btn--solid btn--sm" data-act="new">＋ 新的想法</button>'));
  } else {
    H.push('<div class="focus">');
    focus.forEach(function (n) {
      var path = S.pathOf(n.id).slice(0, -1);
      H.push('<article class="fcard" data-act="open" data-id="' + n.id + '">' +
        '<p class="fcard__path">' + (path.length ? esc(path.join(' › ')) : '顶层愿景') + '</p>' +
        '<h3 class="fcard__title">' + esc(n.title) + '</h3>' +
        '<div class="bar"><i style="width:' + n.progress + '%"></i></div>' +
        '<div class="fcard__row" style="margin-top:10px">' + stChip(n.status) +
          '<span>' + n.progress + '%</span>' + dueBadge(n) + stepStat(n) + '</div>' +
      '</article>');
    });
    H.push('</div>');
  }
  H.push('</section>');

  /* 最近变动 */
  var recent = S.all().slice().sort(function (a, b) {
    return String(b.updated).localeCompare(String(a.updated));
  }).slice(0, 6);
  H.push('<section class="sec"><div class="sec__head">' +
    '<h2 class="sec__title inkgold">最近变动</h2><span class="sec__line"></span>' +
    '<span class="sec__hint">你最近动过的地方</span></div><div class="card card--pad">');
  if (!recent.length) {
    H.push('<div class="empty">还没有任何节点</div>');
  } else {
    H.push('<div class="feed">');
    recent.forEach(function (n) {
      var path = S.pathOf(n.id).slice(0, -1);
      H.push('<div class="feed__item" data-act="open" data-id="' + n.id + '">' +
        stChip(n.status) +
        '<div class="feed__t"><b>' + esc(n.title) + '</b><span>' +
          (path.length ? esc(path.join(' › ')) + ' · ' : '') + n.progress + '%</span></div>' +
        '<span style="font-size:.72rem;color:var(--ink-3);font-family:var(--font-num)">' +
          String(n.updated).slice(5, 10).replace('-', '.') + '</span>' +
      '</div>');
    });
    H.push('</div>');
  }
  H.push('</section>');

  return H.join('');
}

function stat(k, v, u, d, color) {
  return '<div class="stat" style="--accent:' + color + '">' +
    '<div class="stat__k">' + k + '</div>' +
    '<div class="stat__v">' + v + '<span class="stat__u">' + u + '</span></div>' +
    '<div class="stat__d">' + d + '</div></div>';
}

/* ══════════ 战略树 ══════════ */
function tree(opts) {
  opts = opts || {};
  var open = opts.open || new Set();
  var match = opts.match || null;
  var rs = S.roots();
  if (!rs.length) {
    return emptyBox('战略树还是空的', '先写下一个你最想实现的东西，然后一层层往下拆。',
      '<button class="btn btn--solid btn--sm" data-act="new">＋ 写下第一个想法</button>');
  }
  return '<div class="tree">' + rs.map(function (n) {
    return treeNode(n, 0, open, match);
  }).join('') + '</div>';
}

function treeNode(n, depth, open, match) {
  var kids = S.children(n.id);
  var isOpen = open.has(n.id);
  var st = S.STATUS_MAP[n.status];
  var dim = match && !match.has(n.id) && !hasMatchingDesc(n, match);
  var H = [];

  H.push('<div class="tnode' + (isOpen ? ' is-open' : '') + '" data-id="' + n.id + '"' +
    (dim ? ' style="opacity:.34"' : '') + '>');

  H.push('<div class="tnode__row">');
  H.push('<button class="tnode__twist' + (kids.length ? '' : ' is-leaf') + '" data-act="toggle" data-id="' + n.id +
    '" aria-label="展开">' +
    '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3.6 1.6 8.4 6l-4.8 4.4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button>');
  H.push('<span class="tnode__stem" style="--accent:' + st.color + '"></span>');
  H.push('<div class="tnode__main">');
  H.push('<h4 class="tnode__title inkgold" data-act="open" data-id="' + n.id + '">' + esc(n.title) +
    '<span class="lv">' + S.levelName(depth) + '</span>' +
    (n.prio === 1 ? '<span class="chip st-done">紧要</span>' : '') + '</h4>');
  if (n.note) H.push('<p class="tnode__note">' + esc(n.note) + '</p>');
  H.push('<div class="tnode__meta">' + stChip(n.status) +
    '<span class="m">' + n.progress + '%</span>' +
    (dateText(n) ? '<span class="m">' + dateText(n) + '</span>' : '') +
    dueBadge(n) + stepStat(n) + tagText(n) +
    (kids.length ? '<span class="m">' + kids.length + ' 个下钻</span>' : '') +
  '</div>');
  H.push('</div>');
  H.push('<div class="tnode__acts">' +
    '<button class="iconbtn" data-act="add" data-id="' + n.id + '" title="添加下级">＋</button>' +
    '<button class="iconbtn" data-act="up" data-id="' + n.id + '" title="上移">↑</button>' +
    '<button class="iconbtn" data-act="down" data-id="' + n.id + '" title="下移">↓</button>' +
    '<button class="iconbtn" data-act="edit" data-id="' + n.id + '" title="编辑">✎</button>' +
    '<button class="iconbtn danger" data-act="del" data-id="' + n.id + '" title="删除">✕</button>' +
  '</div>');
  /* 进度条铺在整行底边，当作这条分支的「生长线」 */
  H.push('<div class="tnode__pbar" style="--accent:' + st.color + '">' +
    '<div class="bar"><i style="width:' + n.progress + '%"></i></div></div>');
  H.push('</div>');

  if (kids.length) {
    H.push('<div class="tnode__kids">' + kids.map(function (k) {
      return treeNode(k, depth + 1, open, match);
    }).join('') + '</div>');
  }
  H.push('</div>');
  return H.join('');
}

function hasMatchingDesc(n, match) {
  return S.descendants(n.id).some(function (d) { return match.has(d.id); });
}

/* ══════════ 看板 ══════════ */
function board() {
  var H = ['<div class="board">'];
  S.STATUS.forEach(function (s) {
    var list = S.all().filter(function (n) { return n.status === s.id; });
    H.push('<section class="bcol" data-status="' + s.id + '">' +
      '<header class="bcol__head">' + stChip(s.id) +
        '<span class="name">' + s.name + '</span>' +
        '<span class="cnt">' + list.length + '</span></header>' +
      '<div class="bcol__body" data-drop="' + s.id + '">');
    if (!list.length) {
      H.push('<div class="empty" style="padding:26px 12px;font-size:.78rem">拖到这里</div>');
    } else {
      list.forEach(function (n) {
        var path = S.pathOf(n.id).slice(0, -1);
        H.push('<article class="bcard" draggable="true" data-id="' + n.id + '">' +
          '<p class="bcard__path">' + (path.length ? esc(path.join(' › ')) : '顶层愿景') + '</p>' +
          '<h4 class="bcard__title">' + esc(n.title) + '</h4>' +
          '<div class="bcard__foot">' +
            '<div class="bar' + (n.status === 'done' ? ' bar--gold' : '') + '"><i style="width:' + n.progress + '%"></i></div>' +
            '<span style="font-family:var(--font-num)">' + n.progress + '%</span>' +
          '</div>' +
          (n.due ? '<div class="bcard__foot" style="margin-top:7px">' + dueBadge(n) +
            '<span style="margin-left:auto">' + fmtDate(n.due) + '</span></div>' : '') +
        '</article>');
      });
    }
    H.push('</div></section>');
  });
  H.push('</div>');
  return H.join('');
}

/* ══════════ 时间线（甘特） ══════════ */
function gantt() {
  var rng = S.dateRange();
  var months = monthsBetween(rng.min, rng.max);
  var total = months.length;
  if (!total) return emptyBox('还没有可排期的目标', '给节点填上开始 / 截止日期，它们就会落到时间线上。');

  var rows = S.all().filter(function (n) { return n.start || n.due; })
    .sort(function (a, b) {
      var av = a.start || a.due, bv = b.start || b.due;
      return String(av).localeCompare(String(bv));
    });
  if (!rows.length) return emptyBox('还没有可排期的目标', '给节点填上开始 / 截止日期，它们就会落到时间线上。');

  var first = months[0];
  function posOf(d) {
    if (!d) return null;
    var dt = new Date(d + 'T00:00:00');
    var idx = (dt.getFullYear() - first.getFullYear()) * 12 + (dt.getMonth() - first.getMonth());
    var dim = new Date(dt.getFullYear(), dt.getMonth() + 1, 0).getDate();
    return idx + (dt.getDate() - 1) / dim;
  }
  var nowPos = posOf(S.today(0));
  var nowPct = nowPos == null ? -1 : nowPos / total * 100;

  var H = [];
  H.push('<div class="sec__head"><h2 class="sec__title inkgold">' + fmtDate(rng.min) + ' — ' + fmtDate(rng.max) +
    '</h2><span class="sec__line"></span><span class="sec__hint">共 ' + total + ' 个月 · ' + rows.length + ' 个已排期目标</span></div>');

  /* 列宽显式算出来，保证「月份刻度」和「进度条定位」用同一套坐标 */
  var MW = total > 36 ? 54 : (total > 20 ? 64 : 82);
  var innerW = 264 + total * MW;

  H.push('<div class="gantt"><div class="gantt__scroll">' +
    '<div class="gantt__inner" style="--mw:' + MW + 'px;width:' + innerW + 'px">');
  H.push('<div class="gantt__head"><div class="gantt__label">目标</div><div class="gantt__months">');
  months.forEach(function (m) {
    var isNow = m.getFullYear() === new Date().getFullYear() && m.getMonth() === new Date().getMonth();
    H.push('<div class="gantt__month' + (isNow ? ' is-now' : '') + '">' +
      (m.getMonth() === 0 || m === months[0] ? (m.getFullYear() + '·') : '') +
      (m.getMonth() + 1) + '月</div>');
  });
  H.push('</div></div>');

  rows.forEach(function (n) {
    var a = posOf(n.start || n.due), b = posOf(n.due || n.start);
    if (a > b) { var t = a; a = b; b = t; }
    var left = Math.max(0, a / total * 100);
    var width = Math.max((b - a) / total * 100, 100 / total * 0.9);
    var st = S.STATUS_MAP[n.status];
    H.push('<div class="gantt__row">' +
      '<div class="gantt__name" data-act="open" data-id="' + n.id + '">' +
        '<i style="--accent:' + st.color + '"></i><b>' + esc(n.title) + '</b></div>' +
      '<div class="gantt__track">' +
        (nowPct >= 0 ? '<span class="gantt__today" style="left:' + nowPct + '%"></span>' : '') +
        '<div class="gantt__bar' + (n.status === 'done' ? ' is-done' : '') + '" style="left:' + left + '%;width:' +
          Math.min(width, 100 - left) + '%" title="' + esc(n.title) + '　' + dateText(n) + '">' +
          (width > 12 ? n.progress + '%' : '') +
        '</div>' +
      '</div></div>');
  });
  H.push('</div></div></div>');
  return H.join('');
}

function monthsBetween(a, b) {
  var s = new Date(a + 'T00:00:00'); s.setDate(1);
  var e = new Date(b + 'T00:00:00'); e.setDate(1);
  var out = [], cur = new Date(s), guard = 0;
  while (cur <= e && guard++ < 240) { out.push(new Date(cur)); cur.setMonth(cur.getMonth() + 1); }
  return out;
}

/* ══════════ 复盘 ══════════ */
function review() {
  var st = S.stats(), levels = S.levelStats();
  var H = [];

  /* 环形分布 */
  var R = 62, C = 2 * Math.PI * R, acc = 0;
  var segs = S.STATUS.map(function (s) {
    var n = st.by[s.id] || 0;
    var frac = st.total ? n / st.total : 0;
    var seg = '<circle class="donut__seg" cx="80" cy="80" r="' + R + '" fill="none" stroke="' + s.color +
      '" stroke-width="17" stroke-dasharray="' + (frac * C) + ' ' + C + '" stroke-dashoffset="' + (-acc * C) + '"/>';
    acc += frac;
    return seg;
  }).join('');

  H.push('<div class="review">');
  H.push('<section class="card card--pad"><div class="sec__head">' +
    '<h2 class="sec__title inkgold">状态分布</h2><span class="sec__line"></span></div>' +
    '<div class="donut"><svg viewBox="0 0 160 160">' +
      '<circle cx="80" cy="80" r="' + R + '" fill="none" stroke="var(--line)" stroke-width="17"/>' + segs +
    '</svg><div class="donut__legend">' +
    S.STATUS.map(function (s) {
      return '<div class="donut__li"><span class="sw" style="background:' + s.color + '"></span>' +
        s.name + '<span style="color:var(--ink-3);font-size:.72rem">' + s.sub + '</span>' +
        '<span class="n">' + (st.by[s.id] || 0) + '</span></div>';
    }).join('') +
    '</div></div></section>');

  /* 各层进度 */
  H.push('<section class="card card--pad"><div class="sec__head">' +
    '<h2 class="sec__title inkgold">各层推进度</h2><span class="sec__line"></span></div>' +
    '<div class="levels">' + levels.map(function (l) {
      return '<div class="lvrow"><span class="nm">' + l.name + '</span>' +
        '<span class="bar"><i style="width:' + l.avg + '%"></i></span>' +
        '<span class="pc">' + l.avg + '%</span></div>';
    }).join('') + '</div></section>');

  /* 关键指标 */
  H.push('<section class="card card--pad"><div class="sec__head">' +
    '<h2 class="sec__title inkgold">关键指标</h2><span class="sec__line"></span></div>' +
    '<dl class="kv">' +
      '<dt>节点总数</dt><dd>' + st.total + '</dd>' +
      '<dt>已成竹</dt><dd>' + st.by.done + '（' + st.doneRate + '%）</dd>' +
      '<dt>正在生长</dt><dd>' + st.by.active + '（' + st.activeRate + '%）</dd>' +
      '<dt>最细颗粒</dt><dd>' + st.leaves + ' 项</dd>' +
      '<dt>层级深度</dt><dd>' + (st.maxDepth + 1) + ' 层</dd>' +
      '<dt>已排期</dt><dd>' + st.withDate + ' 项</dd>' +
      '<dt>逾期未成</dt><dd style="color:' + (st.overdue ? 'var(--rose)' : 'inherit') + '">' + st.overdue + ' 项</dd>' +
    '</dl></section>');
  H.push('</div>');

  /* 复盘记录 */
  H.push('<section class="sec" style="margin-top:26px"><div class="sec__head">' +
    '<h2 class="sec__title inkgold">复盘记录</h2><span class="sec__line"></span>' +
    '<span class="sec__hint">写下来才算复盘过</span></div>' +
    '<div class="card card--pad">' +
      '<textarea class="inp" id="journalInput" placeholder="这一周，什么在推进？什么卡住了？下一步砍掉什么？"></textarea>' +
      '<div style="display:flex;justify-content:flex-end;margin-top:12px">' +
        '<button class="btn btn--solid btn--sm" data-act="journal-add">记一笔</button></div>' +
    '</div>');
  var js = S.state().journal;
  H.push('<div class="journal" style="margin-top:14px">');
  if (!js.length) {
    H.push(emptyBox('还没有复盘记录', '每周写三五句就够。三个月后回头看，这是最值钱的东西。'));
  } else {
    js.forEach(function (j) {
      H.push('<div class="jitem"><button class="jitem__x" data-act="journal-del" data-id="' + j.id + '" title="删除">✕</button>' +
        '<div class="jitem__d">' + fmtDate(j.date) + '</div>' +
        '<div class="jitem__t">' + esc(j.text) + '</div></div>');
    });
  }
  H.push('</div></section>');
  return H.join('');
}

/* ══════════ 节点详情（抽屉） ══════════ */
function nodeDrawer(id) {
  var n = S.byId(id);
  if (!n) return '<p class="empty">节点不存在</p>';
  var path = S.pathOf(id).slice(0, -1);
  var kids = S.children(id);
  var H = [];

  H.push('<div class="sec__head" style="margin-bottom:14px">' + stChip(n.status) +
    '<span class="sec__hint">' + S.levelName(S.depthOf(n)) + '</span>' +
    '<span class="sec__line"></span>' +
    (path.length ? '<span class="sec__hint">' + esc(path.join(' › ')) + '</span>' : '') + '</div>');

  /* 注意：此处刻意不用书法字体 —— 节点标题是用户动态内容，
     而书法字体为控制体积做了子集化，动态字会缺字回退。 */
  H.push('<h2 class="inkgold" style="font-size:1.42rem;line-height:1.6;margin-bottom:16px">' + esc(n.title) + '</h2>');

  H.push('<div class="bar" style="height:7px"><i style="width:' + n.progress + '%"></i></div>' +
    '<div style="display:flex;justify-content:space-between;margin-top:7px;font-size:.74rem;color:var(--ink-3)">' +
    '<span>进度</span><span style="font-family:var(--font-num);color:var(--jade)">' + n.progress + '%</span></div>');

  H.push('<div class="seg" style="margin-top:16px">' + S.STATUS.map(function (s) {
    return '<button data-act="set-status" data-id="' + n.id + '" data-status="' + s.id + '"' +
      (n.status === s.id ? ' class="is-on"' : '') + '>' + s.name + '</button>';
  }).join('') + '</div>');

  H.push('<dl class="kv" style="margin-top:20px">' +
    '<dt>优先级</dt><dd>' + prioText(n.prio) + '</dd>' +
    '<dt>起止</dt><dd>' + (dateText(n) || '未排期') + '</dd>' +
    (n.due ? '<dt>剩余</dt><dd>' + (S.dayDiff(S.today(0), n.due) >= 0
      ? S.dayDiff(S.today(0), n.due) + ' 天' : '已逾期') + '</dd>' : '') +
    '<dt>标签</dt><dd>' + (n.tags.length ? '#' + n.tags.map(esc).join(' #') : '—') + '</dd>' +
    '<dt>下钻</dt><dd>' + kids.length + ' 个</dd>' +
    '<dt>创建</dt><dd>' + fmtDate(String(n.created).slice(0, 10)) + '</dd>' +
  '</dl>');

  if (n.note) {
    H.push('<div class="sec__head" style="margin:22px 0 8px"><h3 class="sec__title inkgold">说明</h3>' +
      '<span class="sec__line"></span></div>' +
      '<div style="font-size:.86rem;line-height:1.85;color:var(--ink-2);white-space:pre-wrap">' + esc(n.note) + '</div>');
  }

  if (n.steps.length) {
    H.push('<div class="sec__head" style="margin:22px 0 8px"><h3 class="sec__title inkgold">步骤</h3>' +
      '<span class="sec__line"></span></div><div class="steps">' +
      n.steps.map(function (s) {
        return '<label class="step"><input type="checkbox" data-act="step-toggle" data-id="' + n.id +
          '" data-step="' + s.id + '"' + (s.done ? ' checked' : '') + '>' +
          '<span class="st-inp" style="font-size:.85rem;' + (s.done ? 'text-decoration:line-through;color:var(--ink-3)' : '') +
          '">' + esc(s.text) + '</span></label>';
      }).join('') + '</div>');
  }

  if (kids.length) {
    H.push('<div class="sec__head" style="margin:22px 0 8px"><h3 class="sec__title inkgold">下钻</h3>' +
      '<span class="sec__line"></span></div><div style="display:flex;flex-direction:column;gap:8px">' +
      kids.map(function (k) {
        return '<div class="ditem" style="cursor:pointer" data-act="open" data-id="' + k.id + '">' +
          stChip(k.status) + '<div class="ditem__t"><b>' + esc(k.title) + '</b>' +
          '<span>' + k.progress + '%' + (k.due ? ' · ' + fmtDate(k.due) : '') + '</span></div></div>';
      }).join('') + '</div>');
  }

  H.push('<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:26px">' +
    '<button class="btn btn--solid btn--sm" data-act="add" data-id="' + n.id + '">＋ 添加下级</button>' +
    '<button class="btn btn--ghost btn--sm" data-act="edit" data-id="' + n.id + '">编辑</button>' +
    '<button class="btn btn--ghost btn--sm" data-act="focus" data-id="' + n.id + '">在树中定位</button>' +
    '<button class="btn btn--ghost btn--sm btn--danger" data-act="del" data-id="' + n.id + '">删除</button>' +
  '</div>');

  return H.join('');
}

/* ══════════ 节点编辑表单 ══════════ */
function nodeForm(node, opts) {
  opts = opts || {};
  var isNew = !node;
  var n = node || {
    id: '', title: '', note: '', status: 'idea', progress: 0, prio: 2,
    start: '', due: '', tags: [], steps: []
  };
  var exclude = opts.exclude || new Set();
  var parentId = isNew ? (opts.parentId || '') : (n.parent || '');

  /* 上级下拉：带缩进的完整树 */
  var options = ['<option value="">（顶层 · 愿景）</option>'];
  (function walk(pid, lv) {
    S.children(pid).forEach(function (c) {
      if (exclude.has(c.id)) return;
      options.push('<option value="' + c.id + '"' + (c.id === parentId ? ' selected' : '') + '>' +
        new Array(lv + 1).join('　　') + (lv ? '└ ' : '') + esc(c.title) + '</option>');
      walk(c.id, lv + 1);
    });
  })(null, 0);

  var H = [];
  H.push('<div class="modal__head"><h3>' + (isNew ? '新的想法' : '编辑节点') + '</h3>' +
    '<button class="xbtn" data-act="close-modal" aria-label="关闭">✕</button></div>');
  H.push('<div class="modal__body"><div class="form-grid">');

  H.push('<div class="fld fld--full"><label for="fTitle">标题</label>' +
    '<input class="inp" id="fTitle" value="' + esc(n.title) + '" placeholder="一句话说清这件事" maxlength="120"></div>');

  H.push('<div class="fld"><label for="fParent">上级节点</label>' +
    '<select class="inp" id="fParent">' + options.join('') + '</select></div>');

  H.push('<div class="fld"><label for="fPrio">优先级</label><div class="seg" id="fPrio">' +
    [1, 2, 3].map(function (p) {
      return '<button type="button" data-prio="' + p + '"' + (n.prio === p ? ' class="is-on"' : '') + '>' + S.PRIO[p] + '</button>';
    }).join('') + '</div></div>');

  H.push('<div class="fld fld--full"><label>状态</label><div class="seg" id="fStatus">' +
    S.STATUS.map(function (s) {
      return '<button type="button" data-status="' + s.id + '"' + (n.status === s.id ? ' class="is-on"' : '') + '>' +
        s.name + '<span style="opacity:.6;font-size:.9em"> · ' + s.sub + '</span></button>';
    }).join('') + '</div></div>');

  H.push('<div class="fld fld--full"><label for="fProgress">进度</label><div class="range">' +
    '<input type="range" id="fProgress" min="0" max="100" step="1" value="' + n.progress + '">' +
    '<output id="fProgressOut">' + n.progress + '%</output></div></div>');

  H.push('<div class="fld"><label for="fStart">开始</label><input class="inp" type="date" id="fStart" value="' + (n.start || '') + '"></div>');
  H.push('<div class="fld"><label for="fDue">截止</label><input class="inp" type="date" id="fDue" value="' + (n.due || '') + '"></div>');

  H.push('<div class="fld fld--full"><label for="fTags">标签（逗号分隔）</label>' +
    '<input class="inp" id="fTags" value="' + esc(n.tags.join(', ')) + '" placeholder="例：考试, 高频, 在做"></div>');

  H.push('<div class="fld fld--full"><label for="fNote">说明</label>' +
    '<textarea class="inp" id="fNote" placeholder="为什么做这件事？做到什么程度算完成？">' + esc(n.note) + '</textarea></div>');

  H.push('<div class="fld fld--full"><label>步骤清单</label><div class="steps" id="fSteps">');
  n.steps.forEach(function (s) {
    H.push('<div class="step" data-step="' + s.id + '">' +
      '<input type="checkbox"' + (s.done ? ' checked' : '') + '>' +
      '<input class="inp st-inp" value="' + esc(s.text) + '" placeholder="一个具体动作">' +
      '<button type="button" class="st-x" data-act="step-remove">✕</button></div>');
  });
  H.push('</div><div><button type="button" class="btn btn--ghost btn--sm" data-act="step-add" style="margin-top:10px">＋ 添加步骤</button></div></div>');

  H.push('</div></div>');
  H.push('<div class="modal__foot">' +
    (isNew ? '' : '<button class="btn btn--ghost btn--danger" data-act="del" data-id="' + n.id + '" style="margin-right:auto">删除此节点</button>') +
    '<button class="btn btn--ghost" data-act="close-modal">取消</button>' +
    '<button class="btn btn--solid" data-act="save-node" data-id="' + (n.id || '') + '">' +
      (isNew ? '创建' : '保存') + '</button></div>');
  return H.join('');
}

/* ══════════ 数据面板 ══════════ */
function dataPanel() {
  var st = S.stats();
  return '' +
  '<div class="sec__head"><h3 class="sec__title inkgold">数据与备份</h3><span class="sec__line"></span></div>' +
  '<p style="font-size:.82rem;color:var(--ink-3);line-height:1.8;margin-bottom:18px">' +
    '所有内容只保存在这台设备的浏览器里，不上传任何服务器。换设备、清缓存前请先导出备份。</p>' +
  '<dl class="kv" style="margin-bottom:20px">' +
    '<dt>节点总数</dt><dd>' + st.total + '</dd>' +
    '<dt>复盘记录</dt><dd>' + S.state().journal.length + ' 条</dd>' +
    '<dt>最后保存</dt><dd>' + String(S.state().meta.updated).slice(0, 16).replace('T', ' ') + '</dd>' +
  '</dl>' +
  '<div class="dlist">' +
    '<div class="ditem"><div class="ditem__t"><b>导出备份（JSON）</b><span>完整数据，可再次导入</span></div>' +
      '<button class="btn btn--ghost btn--sm" data-act="export-json">导出</button></div>' +
    '<div class="ditem"><div class="ditem__t"><b>导入备份（JSON）</b><span>会覆盖当前全部内容</span></div>' +
      '<button class="btn btn--ghost btn--sm" data-act="import-json">选择文件</button></div>' +
    '<div class="ditem"><div class="ditem__t"><b>导出战略书（Markdown）</b><span>可直接打印或粘进笔记软件</span></div>' +
      '<button class="btn btn--ghost btn--sm" data-act="export-md">导出</button></div>' +
    '<div class="ditem"><div class="ditem__t"><b>载入示例战略</b><span>用一份完整样例替换当前内容</span></div>' +
      '<button class="btn btn--ghost btn--sm" data-act="load-demo">载入</button></div>' +
    '<div class="ditem"><div class="ditem__t"><b>清空全部</b><span>不可撤销，请先导出备份</span></div>' +
      '<button class="btn btn--ghost btn--sm btn--danger" data-act="reset">清空</button></div>' +
  '</div>' +
  '<div class="sec__head" style="margin:26px 0 12px"><h3 class="sec__title inkgold">关于</h3><span class="sec__line"></span></div>' +
  '<p style="font-size:.8rem;color:var(--ink-3);line-height:1.9">' +
    '竹略 · 长期计划与实现分布<br>向下生发，向上坚韧<br>' +
    '<span style="opacity:.75">本地单页应用 · 零依赖 · 数据存于浏览器 localStorage</span></p>';
}

global.Views = {
  home: home, tree: tree, board: board, gantt: gantt, review: review,
  nodeDrawer: nodeDrawer, nodeForm: nodeForm, dataPanel: dataPanel,
  stChip: stChip, fmtDate: fmtDate
};

})(window);
