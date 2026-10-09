/* ═══════════════════════════════════════════════════════════
   竹略 · 数据层
   无限层级的目标树 + 本地持久化 + 导入导出
   ═══════════════════════════════════════════════════════════ */
;(function (global) {
'use strict';

var KEY = 'zhulue.state.v1';

/* 状态：以竹的生长节律命名 */
var STATUS = [
  { id:'idea',   name:'构想', sub:'种子', cls:'st-idea',   color:'var(--slate)' },
  { id:'active', name:'生长', sub:'破土', cls:'st-active', color:'var(--jade)'  },
  { id:'hold',   name:'暂歇', sub:'蓄势', cls:'st-hold',   color:'var(--amber)' },
  { id:'done',   name:'成竹', sub:'成器', cls:'st-done',   color:'var(--gold)'  }
];
var STATUS_MAP = {};
STATUS.forEach(function (s) { STATUS_MAP[s.id] = s; });

var PRIO = { 1:'紧要', 2:'重要', 3:'寻常' };
var LEVEL_NAME = ['愿景','战略','阶段','任务','子任务','细节','颗粒','微末','更细'];

/* ── 工具 ── */
function uid() {
  return 'n' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
function today(offsetDays) {
  var d = new Date();
  if (offsetDays) d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}
function iso() { return new Date().toISOString(); }
function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function dayDiff(a, b) {
  if (!a || !b) return null;
  return Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000);
}

/* ══════════ 示例战略（首次进入时载入，让界面不空） ══════════ */
function seed() {
  var T = today(0);
  var N = [], order = 0;
  function add(parent, title, note, status, progress, prio, s, d, tags, steps) {
    var n = {
      id: uid(), parent: parent, title: title, note: note || '',
      status: status, progress: progress, prio: prio || 2,
      start: s || '', due: d || '', tags: tags || [], steps: [],
      created: iso(), updated: iso(), order: order++
    };
    (steps || []).forEach(function (t) {
      n.steps.push({ id: uid(), text: t, done: false });
    });
    N.push(n);
    return n.id;
  }

  var root = add(null, '成为一个能持续把想法变成作品的人',
    '不追求爆发，追求复利。每年至少完成一件能拿出来给人看的东西。',
    'active', 42, 1, today(-420), today(1500), ['长期']);

  /* —— 会计职称 —— */
  var acc = add(root, '会计职称：初级 → 中级',
    '以考带学，把准则体系真正吃透，而不是只求过线。',
    'active', 55, 1, today(-380), today(420), ['考试', '专业'],
    ['初级会计实务 + 经济法基础 已通过', '中级三门：实务 / 财管 / 经济法', '每年一次报考窗口，别错过']);

  var mid = add(acc, '中级会计实务',
    '分值最重、最难的一门，先啃长投与合并报表。',
    'active', 48, 1, today(-90), today(200), ['主攻'],
    ['长期股权投资', '合并财务报表', '收入 / 所得税', '差错更正与资产负债表日后事项']);

  add(mid, '长期股权投资',
    '成本法与权益法的转换是每年必考，画一遍分录再做题。',
    'active', 65, 1, today(-60), today(40), ['高频'],
    ['区分控制 / 重大影响 / 无重大影响', '成本法转权益法的追溯调整', '真题：近 5 年该章节全过一遍']);
  add(mid, '合并财务报表',
    '先搭框架：调整分录 → 抵销分录 → 少数股东权益。',
    'active', 30, 1, today(-40), today(90), ['难点'],
    ['合并范围的判断', '内部交易抵销', '连续编制时的年初未分配利润处理']);

  add(acc, '经济法',
    '背得住的只有理解了的，先理逻辑再记条文。',
    'idea', 10, 2, today(30), today(320), ['记忆'],
    ['公司法与合伙企业法', '合同法与担保', '票据与支付结算']);

  add(acc, '初级会计（已通过）',
    '第一块基石，已落成。',
    'done', 100, 3, today(-380), today(-260), ['里程碑'], ['实务 88 分', '经济法 84 分']);

  /* —— 英语 —— */
  var en = add(root, '英语能力：能读、能听、能写',
    '把词汇从「认识」推进到「用得出」。',
    'active', 38, 2, today(-300), today(300), ['语言'],
    ['六级词汇一词多用：160 词 / 480 义项 / 504 例句', '四六级真题各 46 套，按套计时训练', '听力精听：先裸听 → 再对文本']);

  add(en, '六级词汇 · 一词多用',
    '一个词的多义项放进同一个生活场景里记，比背释义牢。',
    'active', 72, 1, today(-120), today(60), ['词汇', '在做'],
    ['每周 20 词 / 60 义项', '每个义项配一句自造例句', '每月回滚一次旧词']);
  add(en, '真题精练 · 计时训练',
    '真题不是拿来刷的，是拿来复盘错因的。',
    'active', 44, 2, today(-100), today(150), ['真题'],
    ['四级 46 套（2020—2026）', '六级 46 套（2020—2026）', '每套错题归因：词汇 / 逻辑 / 速度']);
  add(en, '口语与表达',
    '先敢说，再谈准确。',
    'idea', 5, 3, today(90), today(500), ['长期'], []);

  /* —— 创作 —— */
  var w = add(root, '写作与创作：把想清楚的东西写出来',
    '写作是思考的显影液。',
    'active', 33, 2, today(-260), today(700), ['创作'],
    ['思想文库：书籍 → 章节 → 页签 三级创作', '每月至少一篇成稿', '不追求日更，追求不烂尾']);

  add(w, '思想文库 · 长期收录',
    '给每个想法一个可以长大的位置。',
    'active', 46, 2, today(-200), today(600), ['在做'],
    ['搭好三级结构：书籍 / 章节 / 页签', '累计 12 万字', '封面与版式统一']);
  add(w, '每月一篇成稿',
    '写完比写好重要。',
    'active', 58, 2, today(-240), today(365), ['习惯'],
    ['每月 25 日前完成初稿', '发布前至少改两遍', '年末挑 12 篇结集']);

  /* —— 身心 —— */
  var body = add(root, '身心与节律：把身体当作长期资产',
    '所有长期计划的底层是睡眠。',
    'active', 50, 1, today(-300), today(1000), ['健康'],
    ['23:30 前放下手机', '每周三次运动', '每年一次体检']);

  add(body, '作息 · 23:30 熄灯',
    '睡不够的时候，所有计划都会变形。',
    'active', 62, 1, today(-200), today(500), ['习惯'], ['连续 21 天打卡', '卧室不放充电器']);
  add(body, '运动 · 每周三次',
    '不用很猛，要很久。',
    'hold', 35, 2, today(-180), today(500), ['习惯'], ['跑步 / 力量交替', '每次不少于 30 分钟']);

  return {
    v: 1,
    meta: {
      vision: '用十年时间，把「会学习、能写作、懂专业」这三件事，做成别人可以信任的样子。\n不追求一夜之间的改变，只追求每天都在同一条路上多走一步。',
      created: iso(), updated: iso()
    },
    nodes: N,
    journal: [
      { id: uid(), date: today(-14), text: '复盘：这个月的最大问题不是没时间，而是任务切得太碎。下周开始每天只锁定一件「必须推进」的事。' },
      { id: uid(), date: today(-3),  text: '把「中级会计实务」拆到章节以后，明显感觉压力小了很多——原来怕的不是难，是模糊。' }
    ],
    ui: { theme: 'auto' }
  };
}

/* ══════════ 状态容器 ══════════ */
var state = null;
var listeners = [];

function blank() {
  return { v: 1, meta: { vision: '', created: iso(), updated: iso() }, nodes: [], journal: [], ui: { theme: 'auto' } };
}

function normalize(s) {
  if (!s || typeof s !== 'object') return blank();
  s.v = s.v || 1;
  s.meta = s.meta || { vision: '', created: iso(), updated: iso() };
  s.nodes = Array.isArray(s.nodes) ? s.nodes : [];
  s.journal = Array.isArray(s.journal) ? s.journal : [];
  s.ui = s.ui || { theme: 'auto' };
  s.nodes.forEach(function (n, i) {
    n.id = n.id || uid();
    n.parent = n.parent || null;
    n.title = n.title || '未命名';
    n.note = n.note || '';
    n.status = STATUS_MAP[n.status] ? n.status : 'idea';
    n.progress = clamp(Number(n.progress) || 0, 0, 100);
    n.prio = clamp(Number(n.prio) || 2, 1, 3);
    n.start = n.start || ''; n.due = n.due || '';
    n.tags = Array.isArray(n.tags) ? n.tags : [];
    n.steps = Array.isArray(n.steps) ? n.steps : [];
    n.created = n.created || iso(); n.updated = n.updated || iso();
    if (typeof n.order !== 'number') n.order = i;
  });
  return s;
}

function load() {
  var raw = null;
  try { raw = global.localStorage.getItem(KEY); } catch (e) { raw = null; }
  if (raw) {
    try { state = normalize(JSON.parse(raw)); }
    catch (e) { state = blank(); }
  } else {
    state = seed();
    persist();
  }
  return state;
}

function persist() {
  try {
    state.meta.updated = iso();
    global.localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) { /* 隐私模式 / 配额满，静默降级为内存态 */ }
}

function commit() { persist(); listeners.forEach(function (fn) { fn(state); }); }
function subscribe(fn) { listeners.push(fn); }

/* ══════════ 查询 ══════════ */
function all() { return state.nodes; }
function byId(id) {
  for (var i = 0; i < state.nodes.length; i++) if (state.nodes[i].id === id) return state.nodes[i];
  return null;
}
function children(pid) {
  return state.nodes.filter(function (n) { return (n.parent || null) === (pid || null); });
}
function roots() { return children(null); }
function descendants(id) {
  var out = [], stack = [id];
  while (stack.length) {
    var cur = stack.pop();
    state.nodes.forEach(function (n) {
      if (n.parent === cur) { out.push(n); stack.push(n.id); }
    });
  }
  return out;
}
function depthOf(n) {
  var d = 0, cur = n, guard = 0;
  while (cur && cur.parent && guard++ < 200) { cur = byId(cur.parent); d++; }
  return d;
}
function pathOf(id) {
  var out = [], cur = byId(id), guard = 0;
  while (cur && guard++ < 200) { out.unshift(cur.title); cur = cur.parent ? byId(cur.parent) : null; }
  return out;
}
function levelName(d) { return LEVEL_NAME[Math.min(d, LEVEL_NAME.length - 1)]; }

function stats() {
  var by = { idea: 0, active: 0, hold: 0, done: 0 };
  var sum = 0, leaves = 0, overdue = 0, maxDepth = 0, withDate = 0;
  var t = today(0);
  state.nodes.forEach(function (n) {
    by[n.status] = (by[n.status] || 0) + 1;
    sum += n.progress;
    if (!state.nodes.some(function (m) { return m.parent === n.id; })) leaves++;
    if (n.due && n.due < t && n.status !== 'done') overdue++;
    if (n.start || n.due) withDate++;
    var d = depthOf(n); if (d > maxDepth) maxDepth = d;
  });
  var total = state.nodes.length;
  return {
    total: total, by: by, leaves: leaves, maxDepth: maxDepth,
    withDate: withDate, overdue: overdue,
    avg: total ? Math.round(sum / total) : 0,
    doneRate: total ? Math.round(by.done / total * 100) : 0,
    activeRate: total ? Math.round(by.active / total * 100) : 0
  };
}

function levelStats() {
  var buckets = {};
  state.nodes.forEach(function (n) {
    var d = depthOf(n);
    (buckets[d] = buckets[d] || { d: d, n: 0, sum: 0, done: 0 });
    buckets[d].n++; buckets[d].sum += n.progress;
    if (n.status === 'done') buckets[d].done++;
  });
  return Object.keys(buckets).map(function (k) {
    var b = buckets[k];
    return { depth: b.d, name: levelName(b.d), count: b.n, avg: Math.round(b.sum / b.n), done: b.done };
  }).sort(function (a, b) { return a.depth - b.depth; });
}

function dateRange() {
  var min = null, max = null;
  state.nodes.forEach(function (n) {
    [n.start, n.due].forEach(function (v) {
      if (!v) return;
      if (!min || v < min) min = v;
      if (!max || v > max) max = v;
    });
  });
  if (!min) { min = today(-30); max = today(180); }
  if (min === max) { max = today(dayDiff(today(0), max) + 60); }
  return { min: min, max: max };
}

function search(q) {
  q = String(q || '').trim().toLowerCase();
  if (!q) return [];
  return state.nodes.filter(function (n) {
    return (n.title + ' ' + n.note + ' ' + n.tags.join(' ')).toLowerCase().indexOf(q) >= 0;
  });
}

/* ══════════ 变更 ══════════ */
function addNode(patch) {
  patch = patch || {};
  var n = {
    id: uid(), parent: patch.parent || null,
    title: patch.title || '未命名', note: patch.note || '',
    status: patch.status || 'idea', progress: clamp(Number(patch.progress) || 0, 0, 100),
    prio: clamp(Number(patch.prio) || 2, 1, 3),
    start: patch.start || '', due: patch.due || '',
    tags: patch.tags || [], steps: patch.steps || [],
    created: iso(), updated: iso(),
    order: state.nodes.length
  };
  state.nodes.push(n);
  commit();
  return n;
}

function updateNode(id, patch) {
  var n = byId(id);
  if (!n) return null;
  Object.keys(patch).forEach(function (k) {
    if (k === 'id' || k === 'created') return;
    n[k] = patch[k];
  });
  n.progress = clamp(Number(n.progress) || 0, 0, 100);
  if (n.progress >= 100 && n.status !== 'done') n.status = 'done';
  if (n.status === 'done' && n.progress < 100) n.progress = 100;
  n.updated = iso();
  commit();
  return n;
}

function removeNode(id) {
  var doomed = [id].concat(descendants(id).map(function (n) { return n.id; }));
  state.nodes = state.nodes.filter(function (n) { return doomed.indexOf(n.id) < 0; });
  commit();
  return doomed.length;
}

/* 在兄弟节点中上移 / 下移 */
function moveNode(id, dir) {
  var n = byId(id);
  if (!n) return false;
  var sib = children(n.parent);
  var i = sib.indexOf(n);
  var j = i + dir;
  if (j < 0 || j >= sib.length) return false;
  var a = sib[i], b = sib[j];
  var ao = a.order, bo = b.order;
  a.order = bo; b.order = ao;
  var ia = state.nodes.indexOf(a), ib = state.nodes.indexOf(b);
  state.nodes[ia] = b; state.nodes[ib] = a;
  commit();
  return true;
}

function setStatus(id, status) {
  var n = byId(id);
  if (!n) return;
  n.status = status;
  if (status === 'done') n.progress = 100;
  n.updated = iso();
  commit();
}

function setVision(text) {
  state.meta.vision = text;
  commit();
}

function addJournal(text) {
  text = String(text || '').trim();
  if (!text) return null;
  var j = { id: uid(), date: today(0), text: text };
  state.journal.unshift(j);
  commit();
  return j;
}
function removeJournal(id) {
  state.journal = state.journal.filter(function (j) { return j.id !== id; });
  commit();
}

function setTheme(t) {
  state.ui.theme = t;
  commit();
}

function replaceAll(obj) {
  state = normalize(obj);
  commit();
}
function resetAll(withSeed) {
  state = withSeed ? seed() : blank();
  commit();
}
function loadDemo() { state = seed(); commit(); }

/* ══════════ 导入导出 ══════════ */
function exportJSON() {
  return JSON.stringify(state, null, 2);
}

function exportMarkdown() {
  var L = [];
  var st = stats();
  L.push('# 竹略 · 长期计划与实现分布');
  L.push('');
  L.push('> 向下生发，向上坚韧');
  L.push('');
  L.push('- 导出时间：' + new Date().toLocaleString('zh-CN'));
  L.push('- 节点总数：' + st.total + '　平均进度：' + st.avg + '%　已成竹：' + st.by.done + ' 项');
  L.push('');
  if (state.meta.vision) {
    L.push('## 愿景');
    L.push('');
    L.push(state.meta.vision);
    L.push('');
  }
  L.push('## 战略树');
  L.push('');
  function walk(pid, lv) {
    children(pid).forEach(function (n) {
      var pad = new Array(lv + 1).join('  ');
      var mark = n.status === 'done' ? 'x' : ' ';
      L.push(pad + '- [' + mark + '] **' + n.title + '**　`' + STATUS_MAP[n.status].name + '`　' + n.progress + '%');
      if (n.note) L.push(pad + '  ' + n.note.replace(/\n/g, ' '));
      if (n.start || n.due) L.push(pad + '  <sub>' + (n.start || '?') + ' → ' + (n.due || '?') + '</sub>');
      if (n.tags.length) L.push(pad + '  <sub>#' + n.tags.join(' #') + '</sub>');
      n.steps.forEach(function (s) { L.push(pad + '  - [' + (s.done ? 'x' : ' ') + '] ' + s.text); });
      walk(n.id, lv + 1);
    });
  }
  walk(null, 0);
  if (state.journal.length) {
    L.push('');
    L.push('## 复盘记录');
    L.push('');
    state.journal.forEach(function (j) { L.push('- **' + j.date + '**　' + j.text.replace(/\n/g, ' ')); });
  }
  L.push('');
  return L.join('\n');
}

function importJSON(text) {
  var obj = JSON.parse(text);
  if (!obj || !Array.isArray(obj.nodes)) throw new Error('文件格式不对：缺少 nodes 字段');
  replaceAll(obj);
  return state.nodes.length;
}

/* ══════════ 导出接口 ══════════ */
global.Store = {
  STATUS: STATUS, STATUS_MAP: STATUS_MAP, PRIO: PRIO,
  uid: uid, today: today, esc: esc, dayDiff: dayDiff, clamp: clamp,
  load: load, subscribe: subscribe, persist: persist, commit: commit,
  state: function () { return state; },
  all: all, byId: byId, children: children, roots: roots,
  descendants: descendants, depthOf: depthOf, pathOf: pathOf, levelName: levelName,
  stats: stats, levelStats: levelStats, dateRange: dateRange, search: search,
  addNode: addNode, updateNode: updateNode, removeNode: removeNode,
  moveNode: moveNode, setStatus: setStatus, setVision: setVision,
  addJournal: addJournal, removeJournal: removeJournal, setTheme: setTheme,
  replaceAll: replaceAll, resetAll: resetAll, loadDemo: loadDemo,
  exportJSON: exportJSON, exportMarkdown: exportMarkdown, importJSON: importJSON
};

})(window);
