/* ============================================================
   竹略 · 视图与交互
   账号：123456 ／ 口令：xiaoxiong666（本地门帘，非加密存储）
   ============================================================ */
(function () {
  "use strict";

  /* 门禁：名号与口令以 FNV-1a 双轮摘要存放，源码里不出现明文；
     但纯前端方案任何人都能绕过，它是「防误入」，不是真正的鉴权。 */
  const AUTH = {
    hUser: "0abcda9136997ee2",
    hPass: "1df111b2b4cf8be3",
    session: "zhulue.session.v1",
    keep: 7 * 24 * 3600 * 1000,
  };

  function fnv(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h >>> 0;
  }
  function hex8(n) { return ("00000000" + n.toString(16)).slice(-8); }
  function digest(s) {
    s = String(s);
    return hex8(fnv("zl|" + s + "|1")) + hex8(fnv(s.split("").reverse().join("") + "|2"));
  }
  function authActive() {
    try { return Number(localStorage.getItem(AUTH.session) || 0) > Date.now(); } catch (e) { return false; }
  }

  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.prototype.slice.call((el || document).querySelectorAll(s));

  const VIEW_META = {
    home: { label: "总览", scene: 1, motto: "根深方能叶茂" },
    strategy: { label: "战略", scene: 2, motto: "谋定而后动" },
    ideas: { label: "想法", scene: 3, motto: "风过竹林，留声" },
    dist: { label: "分布", scene: 4, motto: "因地制宜，因时制宜" },
  };

  let state = null;
  let modalCfg = null;

  /* ---------------- 小工具 ---------------- */
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  function fmtDate(ts) {
    const d = new Date(ts);
    return (d.getMonth() + 1) + "月" + d.getDate() + "日 " + pad(d.getHours()) + ":" + pad(d.getMinutes());
  }
  function fmtShort(iso) {
    if (!iso) return "";
    const p = String(iso).split("-");
    return (+p[1]) + "月" + (+p[2]) + "日";
  }
  function daysLeft(iso) {
    const t = new Date(iso + "T00:00:00");
    const n = new Date();
    n.setHours(0, 0, 0, 0);
    return Math.round((t - n) / 86400000);
  }
  function dlBadge(iso) {
    const d = daysLeft(iso);
    if (d < 0) return '<span class="dl dl--late">逾期' + (-d) + '天</span>';
    if (d === 0) return '<span class="dl dl--today">今日到期</span>';
    if (d <= 14) return '<span class="dl dl--soon">余' + d + '天</span>';
    return '<span class="dl">' + fmtShort(iso) + '</span>';
  }
  function save() { Store.save(state); }
  function log(text) { Store.addLog(state, text); }

  /* ---------------- 主题 ---------------- */
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  function themeNow() {
    const t = state.ui.theme || "auto";
    return t === "auto" ? (mq.matches ? "dark" : "light") : t;
  }
  function applyTheme() {
    const t = themeNow();
    document.documentElement.setAttribute("data-theme", t);
    $$(".theme-seg button").forEach(function (b) {
      b.classList.toggle("on", b.dataset.theme === (state.ui.theme || "auto"));
    });
    const meta = VIEW_META[state.ui.view] || VIEW_META.home;
    const band = document.querySelector(".bamboo");
    band.dataset.scene = String(meta.scene);
    band.dataset.t = t;
  }

  /* ---------------- 登录闸门 ---------------- */
  function initGate() {
    const gate = $("#gate");
    if (authActive()) {
      gate.classList.add("is-off");
      document.body.classList.remove("locked");
      return;
    }
    document.body.classList.add("locked");
    $("#gateForm").addEventListener("submit", function (e) {
      e.preventDefault();
      const u = $("#gateUser").value.trim();
      const p = $("#gatePass").value;
      if (digest(u) === AUTH.hUser && digest(p) === AUTH.hPass) {
        try { localStorage.setItem(AUTH.session, String(Date.now() + AUTH.keep)); } catch (err) {}
        gate.classList.add("is-off");
        document.body.classList.remove("locked");
        $("#gateErr").textContent = "";
        $("#gatePass").value = "";
      } else {
        $("#gateErr").textContent = "名号或口令不符";
        $("#gateForm").classList.add("shake");
        setTimeout(function () { $("#gateForm").classList.remove("shake"); }, 520);
      }
    });
  }
  function doLogout() {
    try { localStorage.removeItem(AUTH.session); } catch (e) {}
    location.reload();
  }

  /* ---------------- 视图：总览 ---------------- */
  function statTile(label, value, hint) {
    return '<div class="tile panel"><p class="tile__label">' + label + '</p>' +
      '<p class="tile__value">' + value + '</p>' +
      '<p class="tile__hint">' + hint + '</p></div>';
  }

  function viewHome() {
    const st = Store.stats(state);
    const areas = st.areas;
    const logs = state.log.slice(0, 8);
    return '' +
      '<section class="hero">' +
      '<p class="hero__label gold-title">竹 墨 题</p>' +
      '<h1 class="brush hero__title">竹略</h1>' +
      '<p class="brush hero__slogan">向下生发，向上坚韧</p>' +
      '<p class="hero__sub">长期计划 · 实现分布</p>' +
      '</section>' +
      '<div class="stat-row">' +
      statTile("总体实现", st.overall + "%", "总纲长势") +
      statTile("战略领域", st.areas.length + " 域", "一级分支") +
      statTile("推进中", st.doing + " 枝", "正在生长") +
      statTile("竹笺存量", st.ideaCount + " 笺", "待培育的想法") +
      '</div>' +
      '<div class="grid-2">' +
      '<div class="panel">' +
      '<h3 class="panel__title gold-title">总体长势</h3>' +
      '<div class="rootbar"><i style="width:' + st.overall + '%"></i></div>' +
      '<ul class="mini-areas">' +
      (areas.length ? areas.map(function (a) {
        return '<li><span class="mini-areas__name">' + esc(a.title) + '</span>' +
          '<span class="mini-areas__bar"><i style="width:' + a.progress + '%"></i></span>' +
          '<span class="mini-areas__pct">' + a.progress + '%</span></li>';
      }).join("") : '<li class="empty-line">尚未分枝</li>') +
      '</ul>' +
      '<p class="panel__hint">总体实现由各域进度层层汇总而来</p>' +
      '</div>' +
      '<div class="panel">' +
      '<h3 class="panel__title gold-title">近期动态</h3>' +
      '<ul class="timeline">' +
      (logs.length ? logs.map(function (l) {
        return '<li><span class="timeline__dot"></span><span class="timeline__time">' + fmtDate(l.ts) + '</span>' +
          '<span class="timeline__text">' + esc(l.text) + '</span></li>';
      }).join("") : '<li class="empty-line">尚无动静</li>') +
      '</ul>' +
      '</div>' +
      '</div>';
  }

  /* ---------------- 视图：战略 ---------------- */
  function nodeHtml(node, path) {
    const kids = node.children || [];
    const has = kids.length > 0;
    const open = state.ui.expanded[node.id] !== false;
    const p = Store.progressOf(node);
    const st = Store.statusOf(node);
    const row = '' +
      '<div class="node__row" data-id="' + node.id + '">' +
      (has
        ? '<button class="caret' + (open ? " is-open" : "") + '" data-act="toggle" data-id="' + node.id + '" aria-label="展开收起"></button>'
        : '<span class="caret caret--leaf"></span>') +
      '<span class="node__num">' + path.join(".") + '</span>' +
      '<button class="node__title" data-act="edit" data-id="' + node.id + '" title="点击修改此枝">' + esc(node.title) + '</button>' +
      (node.note ? '<span class="node__dot" title="' + esc(node.note) + '"></span>' : '') +
      (node.deadline ? dlBadge(node.deadline) : '') +
      '<span class="node__bar"><i style="width:' + p + '%"></i></span>' +
      '<span class="node__pct">' + p + '%</span>' +
      '<span class="chip chip--' + st + '">' + Store.STATUS_TEXT[st] + '</span>' +
      '</div>';
    const addRow = '<li class="ghost-row"><button class="ghost-add" data-act="add-child" data-id="' + node.id + '">＋ 添新枝</button></li>';
    const kidsHtml = has
      ? '<ul class="node__kids"' + (open ? "" : " hidden") + '>' +
        kids.map(function (c, i) { return nodeHtml(c, path.concat([i + 1])); }).join("") + addRow + '</ul>'
      : '<ul class="node__kids">' + addRow + '</ul>';
    return '<li class="node" data-id="' + node.id + '">' + row + kidsHtml + '</li>';
  }

  function viewStrategy() {
    const root = state.root;
    const st = Store.stats(state);
    const rp = Store.progressOf(root);
    const kids = root.children || [];
    return '' +
      '<div class="view-head">' +
      '<div><h2 class="gold-title">战略 · 谋定而后动</h2>' +
      '<p class="view-desc">由总纲而分支，由分支而细目，层层可生；进度自下而上汇总</p></div>' +
      '<div class="view-head__acts">' +
      '<button class="btn btn--ghost btn--sm" data-act="expand-all">全部展开</button>' +
      '<button class="btn btn--ghost btn--sm" data-act="collapse-all">全部收起</button>' +
      '</div>' +
      '</div>' +
      '<div class="panel trunk">' +
      '<div class="trunk__row">' +
      '<span class="seal seal--sm">竹</span>' +
      '<button class="trunk__name" data-act="edit" data-id="' + root.id + '">' + esc(root.title) + '</button>' +
      '<span class="trunk__bar"><i style="width:' + rp + '%"></i></span>' +
      '<span class="trunk__pct">' + rp + '%</span>' +
      '<button class="btn btn--jade btn--sm" data-act="add-child" data-id="' + root.id + '">＋ 添新枝</button>' +
      '</div>' +
      '<p class="panel__hint">共 ' + st.total + ' 枝 · 已成 ' + st.done + ' · 推进中 ' + st.doing +
      ' · 未开始 ' + st.fresh + ' · 最深 ' + st.depth + ' 层</p>' +
      '</div>' +
      (kids.length
        ? '<ul class="tree">' + kids.map(function (c, i) { return nodeHtml(c, [i + 1]); }).join("") + '</ul>'
        : '<div class="panel empty-block">' +
          '<p class="empty-block__line brush">尚无枝叶</p>' +
          '<p class="empty-block__hint">先立起第一支，再让它自然细分</p>' +
          '<div class="empty-block__acts">' +
          '<button class="btn btn--jade" data-act="add-child" data-id="' + root.id + '">＋ 起首支</button>' +
          '<button class="btn btn--ghost" data-act="load-sample">载入示例框架</button>' +
          '</div></div>');
  }

  /* ---------------- 视图：想法 ---------------- */
  function parentOptions() {
    const out = ['<option value="' + state.root.id + '">' + esc(state.root.title) + '（总纲）</option>'];
    (function rec(n, depth) {
      (n.children || []).forEach(function (c) {
        out.push('<option value="' + c.id + '">' + "　".repeat(depth) + esc(c.title) + '</option>');
        rec(c, depth + 1);
      });
    })(state.root, 1);
    return out.join("");
  }

  function viewIdeas() {
    const ideas = state.ideas;
    return '' +
      '<div class="view-head">' +
      '<div><h2 class="gold-title">想法 · 风过竹林，留声</h2>' +
      '<p class="view-desc">先记下，再培育成枝 —— 想法是竹鞭，落到树上才会生长</p></div>' +
      '</div>' +
      '<div class="panel capture">' +
      '<textarea id="ideaInput" rows="2" placeholder="风过竹林——有什么想法，先落到笺上……"></textarea>' +
      '<div class="capture__foot">' +
      '<span class="capture__hint">落笺后可随时「培育为枝」，挂到战略树的任意位置（Ctrl + Enter 快捷落笺）</span>' +
      '<button class="btn btn--jade" data-act="idea-add">落 笺</button>' +
      '</div>' +
      '</div>' +
      '<ul class="idea-list">' +
      (ideas.length ? ideas.map(function (i) {
        return '<li class="panel idea' + (i.grown ? " idea--grown" : "") + '" data-id="' + i.id + '">' +
          '<p class="idea__text">' + esc(i.text) + '</p>' +
          '<div class="idea__meta"><span>' + fmtDate(i.createdAt) + '</span>' +
          (i.grown ? '<span class="chip chip--done">已成枝</span>' : '<span class="chip chip--fresh">待培育</span>') +
          '</div>' +
          '<div class="idea__acts">' +
          (i.grown ? "" :
            '<span class="idea__grow"><span class="idea__grow-label">挂到</span>' +
            '<select class="idea__parent">' + parentOptions() + '</select>' +
            '<button class="btn btn--jade btn--sm" data-act="idea-grow" data-id="' + i.id + '">培育为枝</button></span>') +
          '<button class="btn btn--ghost btn--sm" data-act="idea-del" data-id="' + i.id + '">舍去</button>' +
          '</div></li>';
      }).join("") : '<li class="panel empty-block"><p class="empty-block__line brush">笺上空空</p>' +
        '<p class="empty-block__hint">想到什么，随手写下一句就好</p></li>') +
      '</ul>';
  }

  /* ---------------- 视图：分布 ---------------- */
  function donut(p) {
    const R = 54;
    const C = 2 * Math.PI * R;
    const on = (C * p) / 100;
    return '<svg class="donut" viewBox="0 0 132 132" role="img" aria-label="总体实现">' +
      '<defs><linearGradient id="jadeGrad" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0%" stop-color="var(--jade-2)"/><stop offset="100%" stop-color="var(--jade)"/>' +
      '</linearGradient></defs>' +
      '<circle class="donut__bg" cx="66" cy="66" r="' + R + '"/>' +
      '<circle class="donut__on" cx="66" cy="66" r="' + R + '" stroke-dasharray="' + on + " " + (C - on) +
      '" stroke-dashoffset="' + (C / 4) + '"/>' +
      '<text class="donut__num" x="66" y="64">' + p + '%</text>' +
      '<text class="donut__label" x="66" y="86">总体实现</text>' +
      '</svg>';
  }

  function viewDist() {
    const st = Store.stats(state);
    return '' +
      '<div class="view-head">' +
      '<div><h2 class="gold-title">分布 · 因地制宜，因时制宜</h2>' +
      '<p class="view-desc">实现分布于各域，期限见于纵深；哪一枝拖了后腿，一眼可见</p></div>' +
      '</div>' +
      '<div class="grid-2 grid-2--dist">' +
      '<div class="panel donut-panel">' + donut(st.overall) +
      '<div class="donut-side">' +
      '<p class="donut-side__line"><b>' + st.total + '</b> 枝在册</p>' +
      '<p class="donut-side__line"><b>' + st.done + '</b> 枝已成</p>' +
      '<p class="donut-side__line"><b>' + st.doing + '</b> 枝推进</p>' +
      '<p class="donut-side__line"><b>' + st.depth + '</b> 层纵深</p>' +
      '</div></div>' +
      '<div class="panel">' +
      '<h3 class="panel__title gold-title">各域实现</h3>' +
      '<ul class="area-list">' +
      (st.areas.length ? st.areas.map(function (a) {
        return '<li><div class="area-list__top"><span class="area-list__name">' + esc(a.title) + '</span>' +
          '<span class="area-list__pct">' + a.progress + '%</span></div>' +
          '<div class="area-list__bar"><i style="width:' + a.progress + '%"></i></div>' +
          '<div class="area-list__meta">' + a.done + " / " + a.total + ' 枝已成' +
          (a.deadline ? " · 期限 " + fmtShort(a.deadline) : "") + '</div></li>';
      }).join("") : '<li class="empty-line">尚未分枝</li>') +
      '</ul></div>' +
      '</div>' +
      '<div class="panel">' +
      '<h3 class="panel__title gold-title">时间纵深</h3>' +
      '<ul class="up-list">' +
      (st.upcoming.length ? st.upcoming.map(function (u) {
        return '<li><span class="up-list__date">' + fmtShort(u.deadline) + '</span>' +
          '<span class="up-list__title">' + esc(u.title) + '</span>' + dlBadge(u.deadline) + '</li>';
      }).join("") : '<li class="empty-line">尚未设定任何期限</li>') +
      '</ul>' +
      '<p class="panel__hint">在「战略」里点开任意一枝，可为它写下期限</p>' +
      '</div>';
  }

  const VIEWS = { home: viewHome, strategy: viewStrategy, ideas: viewIdeas, dist: viewDist };

  /* ---------------- 渲染 ---------------- */
  function render() {
    const v = VIEW_META[state.ui.view] ? state.ui.view : "home";
    $("#view").innerHTML = VIEWS[v]();
    $$(".nav__item").forEach(function (b) { b.classList.toggle("on", b.dataset.view === v); });
    const seg = $("#viewSeg");
    if (seg) seg.textContent = VIEW_META[v].motto;
  }

  function route() {
    const v = (location.hash || "#/home").replace(/^#\//, "") || "home";
    state.ui.view = VIEW_META[v] ? v : "home";
    save();
    render();
    applyTheme();
    window.scrollTo(0, 0);
  }
  function setView(v) { location.hash = "#/" + v; }

  /* ---------------- 弹窗：添枝 / 修枝 ---------------- */
  function openModal(cfg) {
    modalCfg = cfg;
    const isEdit = cfg.kind === "edit";
    const node = isEdit ? Store.findNode(state.root, cfg.id) : null;
    const hasKids = node && (node.children || []).length > 0;
    const p = node ? (hasKids ? Store.progressOf(node) : (node.p || 0)) : 0;
    const parent = isEdit ? Store.findParent(state.root, cfg.id) : Store.findNode(state.root, cfg.id);
    $("#modal").innerHTML = '' +
      '<div class="modal__mask" data-act="modal-close"></div>' +
      '<div class="modal__card" role="dialog" aria-modal="true">' +
      '<h3 class="modal__title gold-title">' + (isEdit ? "修枝" : "添新枝") + '</h3>' +
      (parent && parent.id !== (node && node.id) ? '<p class="modal__where">挂于「' + esc(parent.title) + '」之下</p>' : '') +
      '<label class="field"><span class="field__label">名称</span>' +
      '<input id="mTitle" type="text" maxlength="40" placeholder="这一枝叫什么" value="' + (node ? esc(node.title) : "") + '"></label>' +
      '<label class="field"><span class="field__label">备注</span>' +
      '<textarea id="mNote" rows="3" placeholder="想达成什么、怎么算做成（可留空）">' + (node ? esc(node.note || "") : "") + '</textarea></label>' +
      '<div class="field-row">' +
      '<label class="field"><span class="field__label">期限</span>' +
      '<input id="mDate" type="date" value="' + (node && node.deadline ? node.deadline : "") + '"></label>' +
      '<label class="field field--prog"><span class="field__label">进度</span>' +
      '<input id="mProg" type="range" min="0" max="100" step="5" value="' + p + '"' + (hasKids ? " disabled" : "") + '>' +
      '<span class="field__val" id="mProgVal">' + p + '%</span></label>' +
      '</div>' +
      (hasKids ? '<p class="modal__hint">此枝已分枝，进度由下级自动汇总，无需手填</p>' : '') +
      '<div class="modal__foot">' +
      '<div class="modal__foot-l">' +
      (isEdit
        ? '<button class="btn btn--ghost btn--sm" data-act="node-up">上移</button>' +
          '<button class="btn btn--ghost btn--sm" data-act="node-down">下移</button>' +
          '<button class="btn btn--danger btn--sm" data-act="node-del">舍去此枝</button>'
        : '') +
      '</div>' +
      '<div class="modal__foot-r">' +
      '<button class="btn btn--ghost" data-act="modal-close">取消</button>' +
      '<button class="btn btn--jade" data-act="modal-save">保存</button>' +
      '</div></div></div>';
    $("#modal").classList.add("is-open");
    const ti = $("#mTitle");
    if (ti) { ti.focus(); ti.select(); }
  }
  function closeModal() {
    $("#modal").classList.remove("is-open");
    $("#modal").innerHTML = "";
    modalCfg = null;
  }

  function saveModal() {
    if (!modalCfg) return;
    const title = $("#mTitle").value.trim();
    if (!title) { $("#mTitle").classList.add("is-bad"); $("#mTitle").focus(); return; }
    const note = $("#mNote").value.trim();
    const deadline = $("#mDate").value || null;
    const prog = +$("#mProg").value;
    if (modalCfg.kind === "child") {
      const parent = Store.findNode(state.root, modalCfg.id);
      parent.children = parent.children || [];
      parent.children.push({ id: Store.uid(), title: title, note: note, deadline: deadline, children: [], p: prog });
      Store.addLog(state, "在「" + parent.title + "」下新添「" + title + "」");
    } else {
      const node = Store.findNode(state.root, modalCfg.id);
      const hasKids = (node.children || []).length > 0;
      const oldTitle = node.title;
      const oldP = Store.progressOf(node);
      node.title = title;
      node.note = note;
      node.deadline = deadline;
      if (!hasKids) node.p = prog;
      const newP = Store.progressOf(node);
      if (oldTitle !== title) Store.addLog(state, "「" + oldTitle + "」更名为「" + title + "」");
      if (oldP !== newP) Store.addLog(state, "「" + title + "」进度 " + oldP + "% → " + newP + "%");
    }
    save();
    closeModal();
    render();
  }

  function delNode() {
    if (!modalCfg) return;
    const node = Store.findNode(state.root, modalCfg.id);
    if (!node) return;
    const parent = Store.findParent(state.root, node.id);
    if (!parent) return;
    const n = Store.countDesc(node);
    if (!window.confirm("舍去「" + node.title + "」" + (n ? "及其下 " + n + " 枝" : "") + "？此操作不可撤销。")) return;
    parent.children = parent.children.filter(function (c) { return c.id !== node.id; });
    Store.addLog(state, "舍去「" + node.title + "」" + (n ? "及其下 " + n + " 枝" : ""));
    save();
    closeModal();
    render();
  }

  function moveNode(dir) {
    if (!modalCfg) return;
    const node = Store.findNode(state.root, modalCfg.id);
    const parent = Store.findParent(state.root, node.id);
    if (!parent) return;
    const arr = parent.children;
    const i = arr.indexOf(node);
    const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    arr.splice(i, 1);
    arr.splice(j, 0, node);
    Store.addLog(state, "「" + node.title + "」" + (dir < 0 ? "上移" : "下移") + "一位");
    save();
    render();
    openModal({ kind: "edit", id: node.id });
  }

  /* ---------------- 想法 ---------------- */
  function addIdea() {
    const el = $("#ideaInput");
    const text = el.value.trim();
    if (!text) { el.focus(); return; }
    state.ideas.unshift({ id: Store.uid(), text: text, createdAt: Date.now(), grown: null });
    Store.addLog(state, "落下一笺：「" + text.slice(0, 18) + (text.length > 18 ? "…" : "") + "」");
    save();
    render();
    const again = $("#ideaInput");
    if (again) again.focus();
  }
  function growIdea(ideaId, btn) {
    const idea = state.ideas.filter(function (i) { return i.id === ideaId; })[0];
    if (!idea) return;
    const sel = btn.closest(".idea__grow").querySelector(".idea__parent");
    const parent = Store.findNode(state.root, sel.value);
    if (!parent) return;
    const title = idea.text.length > 20 ? idea.text.slice(0, 20) : idea.text;
    parent.children = parent.children || [];
    parent.children.push({ id: Store.uid(), title: title, note: idea.text, deadline: null, children: [], p: 0 });
    idea.grown = parent.id;
    Store.addLog(state, "把「" + title + "」培育成「" + parent.title + "」下的新枝");
    save();
    render();
  }
  function delIdea(id) {
    const idea = state.ideas.filter(function (i) { return i.id === id; })[0];
    if (!idea) return;
    if (!window.confirm("舍去这一笺想法？")) return;
    state.ideas = state.ideas.filter(function (i) { return i.id !== id; });
    Store.addLog(state, "舍去一笺想法");
    save();
    render();
  }

  /* ---------------- 导入导出 ---------------- */
  function doExport() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const d = new Date();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "竹略-备份-" + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + ".json";
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
  }
  function doImport(file) {
    const fr = new FileReader();
    fr.onload = function () {
      try {
        const obj = JSON.parse(fr.result);
        if (!obj || !obj.root) throw new Error("bad");
        if (!window.confirm("导入将覆盖当前全部内容，继续？")) return;
        state = obj;
        state.ideas = state.ideas || [];
        state.log = state.log || [];
        state.ui = Object.assign({ theme: "auto", view: "home", expanded: {} }, state.ui || {});
        Store.addLog(state, "导入了一份备份");
        save();
        route();
      } catch (e) {
        window.alert("这份备份读不出来，请确认是竹略导出的 JSON 文件。");
      }
    };
    fr.readAsText(file);
  }

  /* ---------------- 事件 ---------------- */
  function bind() {
    document.addEventListener("click", function (e) {
      const btn = e.target.closest("[data-act]");
      if (!btn) return;
      const act = btn.dataset.act;
      const id = btn.dataset.id;
      switch (act) {
        case "nav": setView(btn.dataset.view); break;
        case "theme": state.ui.theme = btn.dataset.theme; save(); applyTheme(); break;
        case "toggle": {
          const cur = state.ui.expanded[id] !== false;
          state.ui.expanded[id] = !cur;
          save(); render(); break;
        }
        case "expand-all": Store.walk(state.root, function (n) { state.ui.expanded[n.id] = true; }); save(); render(); break;
        case "collapse-all": Store.walk(state.root, function (n) { state.ui.expanded[n.id] = false; }); save(); render(); break;
        case "add-child": openModal({ kind: "child", id: id }); break;
        case "edit": openModal({ kind: "edit", id: id }); break;
        case "modal-close": closeModal(); break;
        case "modal-save": saveModal(); break;
        case "node-del": delNode(); break;
        case "node-up": moveNode(-1); break;
        case "node-down": moveNode(1); break;
        case "idea-add": addIdea(); break;
        case "idea-grow": growIdea(id, btn); break;
        case "idea-del": delIdea(id); break;
        case "export": doExport(); break;
        case "import": $("#importFile").click(); break;
        case "logout": doLogout(); break;
        case "load-sample":
          if (window.confirm("载入一份示例框架？当前内容会被覆盖。")) {
            const keepView = state.ui.view;
            state = Store.sample();
            state.ui.view = keepView;
            save();
            render();
          }
          break;
      }
    });

    document.addEventListener("input", function (e) {
      if (e.target.id === "mProg") $("#mProgVal").textContent = e.target.value + "%";
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && $("#modal").classList.contains("is-open")) closeModal();
      if (e.target.id === "ideaInput" && e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); addIdea(); }
      if ($("#modal").classList.contains("is-open") && e.key === "Enter" && e.target.id !== "mNote") {
        e.preventDefault(); saveModal();
      }
    });

    $("#importFile").addEventListener("change", function (e) {
      if (e.target.files && e.target.files[0]) doImport(e.target.files[0]);
      e.target.value = "";
    });
  }

  /* ---------------- 启动 ---------------- */
  function init() {
    state = Store.load();
    initGate();
    bind();
    window.addEventListener("hashchange", route);
    if (mq.addEventListener) {
      mq.addEventListener("change", function () { if ((state.ui.theme || "auto") === "auto") applyTheme(); });
    }
    if (!location.hash) location.hash = "#/" + (VIEW_META[state.ui.view] ? state.ui.view : "home");
    route();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
