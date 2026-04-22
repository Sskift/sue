// js/roller.js — 数字滚动控制器
// 两种 reel：
//   - EraReel：在「前 / 后」之间垂直翻滚
//   - HexReel：单位 0-F 在一列中垂直翻滚
// 每个 reel 是独立实例，支持 start() / stopAt(target)

(function (global) {
  'use strict';

  // ---- EraReel ----
  // DOM 结构：
  //   <div class="era-reel"><div class="strip">前<br>后<br>前<br>后...</div></div>
  function EraReel(el) {
    this.el = el;
    this.strip = document.createElement('div');
    this.strip.className = 'era-strip';
    // 重复多次避免滚动时露馅
    const chars = ['前', '后'];
    let html = '';
    for (let i = 0; i < 40; i++) html += '<span>' + chars[i % 2] + '</span>';
    this.strip.innerHTML = html;
    this.el.innerHTML = '';
    this.el.appendChild(this.strip);

    this.itemH = 0;
    this.offset = 0;
    this.speed = 0;
    this.running = false;
    this.raf = null;
  }

  EraReel.prototype._measure = function () {
    const first = this.strip.firstElementChild;
    if (!first) return;
    this.itemH = first.getBoundingClientRect().height;
    if (!this.itemH) {
      // fallback: 父容器高度
      this.itemH = this.el.getBoundingClientRect().height;
    }
  };

  EraReel.prototype.start = function () {
    if (this.running) return;
    this._measure();
    this.running = true;
    this.speed = 25 + Math.random() * 10; // px per frame
    const tick = () => {
      if (!this.running) return;
      this.offset += this.speed;
      if (this.itemH > 0) {
        const total = this.itemH * 2;
        this.offset = this.offset % total;
      }
      this.strip.style.transform = 'translateY(' + (-this.offset) + 'px)';
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  };

  // target: 'BC'(前) or 'AD'(后); delay: 延迟多少 ms 再定格
  EraReel.prototype.stopAt = function (target, delay) {
    delay = delay || 0;
    return new Promise(resolve => {
      setTimeout(() => {
        this.running = false;
        if (this.raf) cancelAnimationFrame(this.raf);
        this._measure();
        // 计算最终偏移：让对应字符停在视窗中央
        // strip 里模式是 [前,后,前,后,...]，所以想停在「前」就用偶数 index，「后」用奇数
        const targetChar = (target === 'BC') ? '前' : '后';
        // 找到当前 offset 附近、字符匹配且 >= offset 的下一个 index
        const currentIdx = Math.ceil(this.offset / this.itemH);
        let idx = currentIdx;
        const wantOdd = (targetChar === '后');
        while (true) {
          const charHere = (idx % 2 === 0) ? '前' : '后';
          if (charHere === targetChar && idx >= currentIdx + 6) break;
          idx++;
        }
        const finalOffset = idx * this.itemH;
        // 缓动过去
        const startOffset = this.offset;
        const dur = 900;
        const startTs = performance.now();
        const ease = t => 1 - Math.pow(1 - t, 3);
        const animate = (now) => {
          const t = Math.min(1, (now - startTs) / dur);
          const cur = startOffset + (finalOffset - startOffset) * ease(t);
          this.strip.style.transform = 'translateY(' + (-cur) + 'px)';
          if (t < 1) requestAnimationFrame(animate);
          else {
            this.offset = finalOffset;
            this.el.classList.add('locked');
            resolve(target);
          }
        };
        requestAnimationFrame(animate);
      }, delay);
    });
  };

  // ---- HexReel ----
  // 一列 0-F，始终显示为大写字符。
  // 可选 initialDigit（0-15）指定初始定格显示的值（默认 0）。
  function HexReel(el, initialDigit) {
    this.el = el;
    this.strip = document.createElement('div');
    this.strip.className = 'hex-strip';
    const chars = '0123456789ABCDEF';
    let html = '';
    for (let i = 0; i < 64; i++) html += '<span>' + chars[i % 16] + '</span>';
    this.strip.innerHTML = html;
    this.el.innerHTML = '';
    this.el.appendChild(this.strip);

    this.itemH = 0;
    this.offset = 0;
    this.speed = 0;
    this.running = false;
    this.raf = null;

    // 延迟到布局完成后把 strip 位移到 initialDigit
    if (typeof initialDigit === 'number' && initialDigit > 0) {
      requestAnimationFrame(() => {
        this._measure();
        if (this.itemH > 0) {
          this.offset = initialDigit * this.itemH;
          this.strip.style.transform = 'translateY(' + (-this.offset) + 'px)';
        }
      });
    }
  }

  HexReel.prototype._measure = function () {
    const first = this.strip.firstElementChild;
    if (!first) return;
    this.itemH = first.getBoundingClientRect().height;
    if (!this.itemH) this.itemH = this.el.getBoundingClientRect().height;
  };

  HexReel.prototype.start = function (baseSpeed) {
    if (this.running) return;
    this._measure();
    this.running = true;
    this.speed = (baseSpeed || 30) + Math.random() * 12;
    const tick = () => {
      if (!this.running) return;
      this.offset += this.speed;
      if (this.itemH > 0) {
        const total = this.itemH * 16;
        this.offset = this.offset % total;
      }
      this.strip.style.transform = 'translateY(' + (-this.offset) + 'px)';
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  };

  // targetDigit: 0-15; delay ms
  HexReel.prototype.stopAt = function (targetDigit, delay) {
    delay = delay || 0;
    return new Promise(resolve => {
      setTimeout(() => {
        this.running = false;
        if (this.raf) cancelAnimationFrame(this.raf);
        this._measure();
        const currentIdx = Math.ceil(this.offset / this.itemH);
        // 找下一个 idx，使 idx % 16 === targetDigit 且 idx >= currentIdx + 8（至少再转半圈）
        let idx = currentIdx + 8;
        while (idx % 16 !== targetDigit) idx++;
        const finalOffset = idx * this.itemH;
        const startOffset = this.offset;
        const dur = 1100;
        const startTs = performance.now();
        const ease = t => 1 - Math.pow(1 - t, 3);
        const animate = (now) => {
          const t = Math.min(1, (now - startTs) / dur);
          const cur = startOffset + (finalOffset - startOffset) * ease(t);
          this.strip.style.transform = 'translateY(' + (-cur) + 'px)';
          if (t < 1) requestAnimationFrame(animate);
          else {
            this.offset = finalOffset;
            this.el.classList.add('locked');
            resolve(targetDigit);
          }
        };
        requestAnimationFrame(animate);
      }, delay);
    });
  };

  /** 归零动画：重新滚动然后缓停到指定目标 digit（默认 0）。 */
  HexReel.prototype.reset = function (delay, targetDigit) {
    delay = delay || 0;
    const target = (typeof targetDigit === 'number') ? targetDigit : 0;
    return new Promise(resolve => {
      setTimeout(() => {
        this.el.classList.remove('locked');
        // 先快速滚起来
        this._measure();
        const spinSpeed = 28;
        let spinning = true;
        const tick = () => {
          if (!spinning) return;
          this.offset += spinSpeed;
          const total = this.itemH * 16;
          if (this.itemH > 0) this.offset = this.offset % total;
          this.strip.style.transform = 'translateY(' + (-this.offset) + 'px)';
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);

        // 250ms 后缓停到目标
        setTimeout(() => {
          spinning = false;
          const currentIdx = Math.ceil(this.offset / this.itemH);
          let idx = currentIdx + 6;
          while (idx % 16 !== target) idx++;
          const finalOffset = idx * this.itemH;
          const startOffset = this.offset;
          const dur = 900;
          const startTs = performance.now();
          const ease = t => 1 - Math.pow(1 - t, 3);
          const animate = (now) => {
            const t = Math.min(1, (now - startTs) / dur);
            const cur = startOffset + (finalOffset - startOffset) * ease(t);
            this.strip.style.transform = 'translateY(' + (-cur) + 'px)';
            if (t < 1) requestAnimationFrame(animate);
            else {
              this.offset = finalOffset;
              resolve(target);
            }
          };
          requestAnimationFrame(animate);
        }, 250);
      }, delay);
    });
  };

  /** 归零动画：EraReel 也滚一下然后停回默认（展示「前」）。 */
  EraReel.prototype.reset = function (delay) {
    delay = delay || 0;
    return new Promise(resolve => {
      setTimeout(() => {
        this.el.classList.remove('locked');
        this._measure();
        const spinSpeed = 22;
        let spinning = true;
        const tick = () => {
          if (!spinning) return;
          this.offset += spinSpeed;
          const total = this.itemH * 2;
          if (this.itemH > 0) this.offset = this.offset % total;
          this.strip.style.transform = 'translateY(' + (-this.offset) + 'px)';
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);

        setTimeout(() => {
          spinning = false;
          // 停回「前」（偶数 index）
          const currentIdx = Math.ceil(this.offset / this.itemH);
          let idx = currentIdx + 4;
          while (idx % 2 !== 0) idx++;
          const finalOffset = idx * this.itemH;
          const startOffset = this.offset;
          const dur = 800;
          const startTs = performance.now();
          const ease = t => 1 - Math.pow(1 - t, 3);
          const animate = (now) => {
            const t = Math.min(1, (now - startTs) / dur);
            const cur = startOffset + (finalOffset - startOffset) * ease(t);
            this.strip.style.transform = 'translateY(' + (-cur) + 'px)';
            if (t < 1) requestAnimationFrame(animate);
            else {
              this.offset = finalOffset;
              resolve();
            }
          };
          requestAnimationFrame(animate);
        }, 250);
      }, delay);
    });
  };

  // ---- 工具 ----
  /** 分解一个 hex number 为三位 0-15 数组 [高,中,低]。 */
  function hexDigits(h) {
    return [(h >> 8) & 0xF, (h >> 4) & 0xF, h & 0xF];
  }

  /** 归零过渡：让所有 reel 反向滚动到目标值，完成后 resolve。
   *  tasks: [{ reel, target? }, ...]；target 未传则为 0；EraReel 无需 target。
   *  返回 Promise，等所有 reel 归位后再由调用方继续下一步，避免页面 reload 闪屏。 */
  function resetReels(tasks) {
    const promises = (tasks || []).map((t, i) => {
      const delay = i * 40;
      if (typeof t.target === 'number') return t.reel.reset(delay, t.target);
      return t.reel.reset(delay);
    });
    return Promise.all(promises);
  }

  global.Roller = { EraReel, HexReel, hexDigits, resetReels };
})(window);
