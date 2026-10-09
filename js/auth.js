/* ═══════════════════════════════════════════════════════════
   竹略 · 登录门禁
   说明：这是「防误入」的前端门禁，不是服务端鉴权。
   口令以 FNV-1a 摘要形式存放，源码里不出现明文；
   但纯前端方案任何人都能绕过，敏感资料请勿只依赖它。
   ═══════════════════════════════════════════════════════════ */
;(function (global) {
'use strict';

var H_USER = '0abcda9136997ee2';
var H_PASS = '1df111b2b4cf8be3';
var SESSION = 'zhulue.session.v1';
var KEEP_MS = 7 * 24 * 3600 * 1000;   /* 记住 7 天 */

function fnv(str) {
  var h = 0x811c9dc5;
  for (var i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}
function hex8(n) { return ('00000000' + n.toString(16)).slice(-8); }

/* 双轮摘要：正向 + 反向，避免单轮 32 位哈希过弱 */
function digest(s) {
  s = String(s);
  return hex8(fnv('zl|' + s + '|1')) + hex8(fnv(s.split('').reverse().join('') + '|2'));
}

function valid(u, p) {
  return digest(u) === H_USER && digest(p) === H_PASS;
}
function mark() {
  try { global.localStorage.setItem(SESSION, String(Date.now() + KEEP_MS)); } catch (e) {}
}
function active() {
  try { return Number(global.localStorage.getItem(SESSION) || 0) > Date.now(); }
  catch (e) { return false; }
}
function clear() {
  try { global.localStorage.removeItem(SESSION); } catch (e) {}
}

global.Auth = { valid: valid, mark: mark, active: active, clear: clear, digest: digest };

})(window);
