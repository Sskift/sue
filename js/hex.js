// js/hex.js — 号码池生成与格式化
// 号码池：公元前 0x001 ~ 0x200 + 公元后 0x001 ~ 0x200，共 1024 个

(function (global) {
  'use strict';

  const MAX = 0x200; // 每侧最大值

  /** 生成全部号码，按固定顺序（方便调试）。 */
  function allNumbers() {
    const list = [];
    for (let i = MAX; i >= 1; i--) list.push({ era: 'BC', hex: i });
    for (let i = 1; i <= MAX; i++) list.push({ era: 'AD', hex: i });
    return list;
  }

  /** 号码 -> 唯一字符串 key，便于存入 Set。 */
  function keyOf(n) {
    return n.era + ':' + n.hex;
  }

  /** key 字符串 -> 号码对象。 */
  function fromKey(k) {
    const [era, hexStr] = k.split(':');
    return { era, hex: parseInt(hexStr, 10) };
  }

  /** 三位大写 hex，如 0x001 / 0x1A3。 */
  function formatHex(h) {
    return '0x' + h.toString(16).toUpperCase().padStart(3, '0');
  }

  /** 完整中文格式。 */
  function formatFull(n) {
    return (n.era === 'BC' ? '公元前 ' : '公元后 ') + formatHex(n.hex) + ' 纪元';
  }

  /** 从剩余号码池（排除已抽集合）中等概率抽一个。 */
  function pickOne(drawnSet) {
    const pool = allNumbers().filter(n => !drawnSet.has(keyOf(n)));
    if (pool.length === 0) return null;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  /** 批量抽 count 个（内部已去重）。 */
  function pickMany(drawnSet, count) {
    const pool = allNumbers().filter(n => !drawnSet.has(keyOf(n)));
    if (pool.length < count) return null;
    // 洗牌前 count 个
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, count);
  }

  /** 从已排除 + 已分配集合中抽一个方向。 */
  function pickEra(drawnSet) {
    const hasBC = allNumbers().some(n => n.era === 'BC' && !drawnSet.has(keyOf(n)));
    const hasAD = allNumbers().some(n => n.era === 'AD' && !drawnSet.has(keyOf(n)));
    if (hasBC && hasAD) return Math.random() < 0.5 ? 'BC' : 'AD';
    if (hasBC) return 'BC';
    if (hasAD) return 'AD';
    return null;
  }

  /** 在指定方向内抽一个号码。 */
  function pickHexInEra(drawnSet, era) {
    const pool = allNumbers().filter(n => n.era === era && !drawnSet.has(keyOf(n)));
    if (pool.length === 0) return null;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  global.Hex = {
    MAX,
    allNumbers,
    keyOf,
    fromKey,
    formatHex,
    formatFull,
    pickOne,
    pickMany,
    pickEra,
    pickHexInEra,
  };
})(window);
