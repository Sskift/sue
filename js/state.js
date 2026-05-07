// js/state.js — localStorage 状态管理
// 存储格式：lottery:drawn:v2 = [{ era, hex, prize, time }, ...]

(function (global) {
  'use strict';

  const KEY = 'lottery:drawn:v2';

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      console.error('state load failed', e);
      return [];
    }
  }

  function save(arr) {
    localStorage.setItem(KEY, JSON.stringify(arr));
  }

  function drawnSet() {
    const set = new Set();
    for (const r of load()) set.add(r.era + ':' + r.hex);
    return set;
  }

  function markDrawn(numbers, prize) {
    const list = Array.isArray(numbers) ? numbers : [numbers];
    const records = load();
    const time = new Date().toISOString();
    for (const n of list) records.push({ era: n.era, hex: n.hex, prize, time });
    save(records);
    return records;
  }

  function removeLast(count) {
    const records = load();
    records.splice(Math.max(0, records.length - count));
    save(records);
  }

  function remove(index) {
    const records = load();
    if (index < 0 || index >= records.length) return;
    records.splice(index, 1);
    save(records);
  }

  function reset() {
    localStorage.removeItem(KEY);
  }

  function count(prize) {
    if (!prize) return load().length;
    return load().filter(r => r.prize === prize).length;
  }

  function remaining() {
    return 1024 - load().length;
  }

  function toCSV() {
    const rows = [['序号', '奖项', '号码', '时间']];
    const records = load();
    records.forEach((r, i) => {
      const hex = '0x' + r.hex.toString(16).toUpperCase().padStart(3, '0');
      const era = r.era === 'BC' ? '公元前' : '公元后';
      rows.push([i + 1, r.prize, era + ' ' + hex + ' 纪元', r.time]);
    });
    return rows.map(row => row.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\n');
  }

  global.State = {
    load, save, drawnSet, markDrawn, removeLast, remove, reset, count, remaining, toCSV,
  };
})(window);
