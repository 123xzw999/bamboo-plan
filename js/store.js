/* ============================================================
   竹略 · 数据层
   结构：root（战略总纲）为唯一树干，children 递归细分
   进度规则：叶子节点手动记 p（0-100），分支节点由下级自动汇总
   ============================================================ */
(function (global) {
  "use strict";

  const KEY = "zhulue.v1";
  const MAX_LOG = 300;

  const uid = () => "n" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  function blank() {
    return {
      v: 1,
      root: { id: uid(), title: "战略总纲", note: "", deadline: null, children: [] },
      ideas: [],
      log: [],
      ui: { theme: "auto", view: "home", expanded: {} },
    };
  }

  /* 示例框架（仅在空状态下由用户主动载入，可随时清空） */
  function sample() {
    const t = (title, p, children) => ({ id: uid(), title: title, note: "", deadline: null, children: children || [], p: children ? null : (p || 0) });
    const st = blank();
    st.root = t("战略总纲", null, [
      t("身心根骨", null, [t("作息归正", 40), t("体魄晨练", 20)]),
      t("学业进阶", null, [
        t("专业深造", null, [t("教材通读", 60), t("真题演练", 10)]),
        t("外语日课", 30),
      ]),
      t("技艺修养", null, [t("书法日课", 50), t("代码手艺", null, [t("算法根基", 25), t("小品工具", 0)])]),
      t("财略经营", null, [t("记账复盘", 70), t("定投蓄水", 15)]),
    ]);
    st.ideas = [
      { id: uid(), text: "想把每天的复盘整理成周记，月末归档", createdAt: Date.now() - 86400000 * 2, grown: null },
      { id: uid(), text: "给竹略加一个年度纵深的刻度视图", createdAt: Date.now() - 3600000 * 5, grown: null },
    ];
    st.log = [
      { id: uid(), ts: Date.now() - 86400000 * 2, text: "载入示例框架，试舞新枝" },
    ];
    return st;
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return blank();
      const st = JSON.parse(raw);
      if (!st || !st.root) return blank();
      st.ideas = st.ideas || [];
      st.log = st.log || [];
      st.ui = Object.assign({ theme: "auto", view: "home", expanded: {} }, st.ui || {});
      return st;
    } catch (e) {
      return blank();
    }
  }

  function save(st) {
    try {
      localStorage.setItem(KEY, JSON.stringify(st));
    } catch (e) { /* 隐私模式下静默失败 */ }
  }

  /* ---------- 遍历 ---------- */
  function walk(node, fn, depth) {
    fn(node, depth || 1);
    (node.children || []).forEach((c) => walk(c, fn, (depth || 1) + 1));
  }

  function progressOf(node) {
    const kids = node.children || [];
    if (kids.length) {
      let s = 0;
      kids.forEach((c) => { s += progressOf(c); });
      return Math.round(s / kids.length);
    }
    return node.p == null ? 0 : node.p;
  }

  function statusOf(node) {
    const p = progressOf(node);
    if (p >= 100) return "done";
    if (p <= 0) return "fresh";
    return "doing";
  }

  const STATUS_TEXT = { done: "已成", doing: "推进中", fresh: "未开始" };

  function findParent(root, id) {
    let hit = null;
    (function rec(n) {
      (n.children || []).forEach((c) => {
        if (c.id === id) hit = n;
        else rec(c);
      });
    })(root);
    return hit;
  }

  function findNode(root, id) {
    let hit = null;
    walk(root, (n) => { if (n.id === id) hit = n; });
    return hit;
  }

  function countDesc(node) {
    let n = 0;
    (node.children || []).forEach((c) => walk(c, () => { n++; }));
    return n;
  }

  /* ---------- 派生统计 ---------- */
  function stats(st) {
    let total = 0, done = 0, doing = 0, fresh = 0, depth = 0;
    walk(st.root, (n, d) => {
      if (d === 1) return; // 不计总根本身
      total++;
      if (d > depth) depth = d;
      const s = statusOf(n);
      if (s === "done") done++;
      else if (s === "doing") doing++;
      else fresh++;
    }, 1);
    const areas = (st.root.children || []).map((c) => ({
      id: c.id,
      title: c.title,
      progress: progressOf(c),
      total: countDesc(c) + 1,
      done: (function () { let x = 0; walk(c, (n) => { if (statusOf(n) === "done") x++; }); return x; })(),
      deadline: c.deadline,
    }));
    const upcoming = [];
    walk(st.root, (n, d) => {
      if (d > 1 && n.deadline) upcoming.push({ id: n.id, title: n.title, deadline: n.deadline, depth: d });
    });
    upcoming.sort((a, b) => a.deadline < b.deadline ? -1 : 1);
    return {
      overall: progressOf(st.root),
      total: total, done: done, doing: doing, fresh: fresh,
      depth: depth,
      areas: areas,
      upcoming: upcoming.slice(0, 6),
      ideaCount: st.ideas.length,
    };
  }

  /* ---------- 变更 ---------- */
  function addLog(st, text) {
    st.log.unshift({ id: uid(), ts: Date.now(), text: text });
    if (st.log.length > MAX_LOG) st.log.length = MAX_LOG;
  }

  const Store = {
    KEY: KEY,
    uid: uid,
    blank: blank,
    sample: sample,
    load: load,
    save: save,
    walk: walk,
    progressOf: progressOf,
    statusOf: statusOf,
    STATUS_TEXT: STATUS_TEXT,
    findParent: findParent,
    findNode: findNode,
    countDesc: countDesc,
    stats: stats,
    addLog: addLog,
  };

  global.Store = Store;
})(window);
